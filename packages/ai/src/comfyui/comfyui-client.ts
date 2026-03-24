import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import WebSocket from "ws";

interface ComfyUIClientConfig {
  apiUrl: string;
  apiKey?: string;
}

interface GenerateImageResult {
  imagePath: string;
  promptId: string;
  durationMs: number;
}

const JOB_TIMEOUT_MS = 300_000; // 5 min max per image
const MAX_RETRIES = 2;

export class ComfyUIClient {
  private apiUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;
  private workflow: Record<string, unknown>;

  constructor(config: ComfyUIClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
    };

    const workflowPath = path.join(__dirname, 'workflow-flux-txt2img.json');
    this.workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
  }

  private buildWorkflow(prompt: string, seed?: number): Record<string, unknown> {
    const wf = JSON.parse(JSON.stringify(this.workflow));
    // Node 2 = CLIPTextEncode (positive prompt), Node 4 = KSampler (seed)
    (wf as any)['2'].inputs.text = prompt;
    if (seed !== undefined) {
      (wf as any)['4'].inputs.seed = seed;
    } else {
      (wf as any)['4'].inputs.seed = Math.floor(Math.random() * 2147483647);
    }
    return wf;
  }

  private wsUrl(): string {
    const base = this.apiUrl.replace(/^http/, 'ws');
    return `${base}/ws`;
  }

  /**
   * Connect WebSocket, submit workflow, wait for 'executed' message with image filenames,
   * then download via /api/view.
   */
  async generateImage(prompt: string, outputPath: string): Promise<GenerateImageResult> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this._generateOnce(prompt, outputPath, start);
        return result;
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          console.warn(`    Retry ${attempt + 1}/${MAX_RETRIES}: ${lastError.message.slice(0, 120)}`);
          await sleep(3000 * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Unknown ComfyUI error');
  }

  private async _generateOnce(prompt: string, outputPath: string, start: number): Promise<GenerateImageResult> {
    const clientId = randomUUID();
    const workflow = this.buildWorkflow(prompt);

    // Step 1: Connect WebSocket to capture outputs
    const wsHeaders: Record<string, string> = {};
    if (this.apiKey) wsHeaders['X-API-Key'] = this.apiKey;

    const imageInfo = await new Promise<{ filename: string; subfolder: string; type: string }>((resolve, reject) => {
      const wsUrl = `${this.wsUrl()}?clientId=${clientId}`;
      const ws = new WebSocket(wsUrl, { headers: wsHeaders });
      let promptId: string | undefined;
      let submitted = false;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout: image generation exceeded 5 minutes'));
      }, JOB_TIMEOUT_MS);

      ws.on('error', (err: Error) => {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`WebSocket error: ${err.message}`));
      });

      ws.on('open', async () => {
        // Step 2: Submit prompt after WS is connected
        try {
          const submitRes = await fetch(`${this.apiUrl}/api/prompt`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ prompt: workflow, client_id: clientId }),
          });

          if (!submitRes.ok) {
            const body = await submitRes.text().catch(() => '');
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Submit failed: ${submitRes.status} ${body.slice(0, 200)}`));
            return;
          }

          const data = await submitRes.json() as { prompt_id: string };
          promptId = data.prompt_id;
          submitted = true;
          console.log(`    Job submitted: ${promptId}`);
        } catch (err) {
          clearTimeout(timeout);
          ws.close();
          reject(err);
        }
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(raw.toString());

          // 'executed' message contains outputs with image filenames
          if (msg.type === 'executed' && msg.data?.prompt_id === promptId) {
            const outputs = msg.data.output;
            if (outputs?.images?.[0]) {
              clearTimeout(timeout);
              ws.close();
              resolve(outputs.images[0]);
              return;
            }
          }

          // 'execution_error' message
          if (msg.type === 'execution_error' && msg.data?.prompt_id === promptId) {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Execution error: ${JSON.stringify(msg.data).slice(0, 300)}`));
            return;
          }

          // 'status' with queue empty after we submitted = done without output
          if (msg.type === 'status' && submitted && msg.data?.status?.exec_info?.queue_remaining === 0) {
            // Wait a bit more — 'executed' might come after 'status'
          }
        } catch {
          // ignore non-JSON messages
        }
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        if (!submitted) {
          reject(new Error('WebSocket closed before submit'));
        }
        // If already resolved/rejected, this is a no-op
      });
    });

    // Step 3: Download image via /api/view
    const imageUrl = `${this.apiUrl}/api/view?filename=${encodeURIComponent(imageInfo.filename)}&type=${imageInfo.type || 'output'}&subfolder=${imageInfo.subfolder || ''}`;

    const imageRes = await fetch(imageUrl, {
      headers: { ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}) },
      redirect: 'follow',
    });

    if (!imageRes.ok) {
      throw new Error(`Image download failed: ${imageRes.status} ${await imageRes.text().catch(() => '')}`);
    }

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    return {
      imagePath: outputPath,
      promptId: imageInfo.filename,
      durationMs: Date.now() - start,
    };
  }

  async generateBatch(
    items: Array<{ id: string; prompt: string }>,
    outputDir: string,
    concurrency = 4,
  ): Promise<Map<string, string>> {
    fs.mkdirSync(outputDir, { recursive: true });
    const results = new Map<string, string>();
    let completed = 0;

    const queue = [...items];
    const workers: Promise<void>[] = [];

    for (let w = 0; w < Math.min(concurrency, queue.length); w++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const item = queue.shift()!;
          const outputPath = path.join(outputDir, `${item.id}.png`);
          try {
            const result = await this.generateImage(item.prompt, outputPath);
            results.set(item.id, result.imagePath);
            completed++;
            console.log(`    Image ${completed}/${items.length} generated (${item.id}) [${(result.durationMs / 1000).toFixed(1)}s]`);
          } catch (err) {
            console.warn(`    Image FAILED (${item.id}): ${(err as Error).message.slice(0, 80)}`);
            completed++;
          }
        }
      })());
    }

    await Promise.all(workers);
    return results;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
