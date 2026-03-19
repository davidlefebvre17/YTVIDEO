import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

interface ComfyUIClientConfig {
  apiUrl: string;
  apiKey?: string;
}

interface GenerateImageResult {
  imagePath: string;
  promptId: string;
  durationMs: number;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 min max per image
const MAX_RETRIES = 2;

export class ComfyUIClient {
  private apiUrl: string;
  private headers: Record<string, string>;
  private workflow: Record<string, unknown>;

  constructor(config: ComfyUIClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
    };

    const workflowPath = path.join(__dirname, 'workflow-flux-txt2img.json');
    this.workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
  }

  private buildWorkflow(prompt: string, seed?: number): Record<string, unknown> {
    const wf = JSON.parse(JSON.stringify(this.workflow));
    (wf as any)['2'].inputs.text = prompt;
    if (seed !== undefined) {
      (wf as any)['4'].inputs.seed = seed;
    } else {
      (wf as any)['4'].inputs.seed = Math.floor(Math.random() * 2147483647);
    }
    return wf;
  }

  async generateImage(prompt: string, outputPath: string): Promise<GenerateImageResult> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const clientId = randomUUID();
        const workflow = this.buildWorkflow(prompt);

        const submitRes = await fetch(`${this.apiUrl}/prompt`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ prompt: workflow, client_id: clientId }),
        });

        if (!submitRes.ok) {
          throw new Error(`Submit failed: ${submitRes.status} ${await submitRes.text().catch(() => '')}`);
        }

        const { prompt_id } = await submitRes.json() as { prompt_id: string };

        for (let poll = 0; poll < MAX_POLL_ATTEMPTS; poll++) {
          await sleep(POLL_INTERVAL_MS);

          const statusRes = await fetch(`${this.apiUrl}/history/${prompt_id}`, {
            headers: this.headers,
          });

          if (!statusRes.ok) continue;

          const history = await statusRes.json() as Record<string, any>;
          const job = history[prompt_id];

          if (!job) continue;

          if (job.status?.completed || job.outputs) {
            const outputs = job.outputs;
            const saveNode = Object.values(outputs).find((o: any) => o.images?.length > 0) as any;

            if (!saveNode?.images?.[0]) {
              throw new Error('No image in output');
            }

            const img = saveNode.images[0];
            const imageUrl = `${this.apiUrl}/view?filename=${encodeURIComponent(img.filename)}&type=${img.type || 'output'}&subfolder=${img.subfolder || ''}`;

            const imageRes = await fetch(imageUrl, { headers: this.headers });
            if (!imageRes.ok) throw new Error(`Image download failed: ${imageRes.status}`);

            const buffer = Buffer.from(await imageRes.arrayBuffer());
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, buffer);

            return {
              imagePath: outputPath,
              promptId: prompt_id,
              durationMs: Date.now() - start,
            };
          }

          if (job.status?.status_str === 'error') {
            throw new Error(`ComfyUI job error: ${JSON.stringify(job.status).slice(0, 200)}`);
          }
        }

        throw new Error('Timeout: image generation exceeded max poll attempts');
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          console.warn(`    Retry ${attempt + 1}/${MAX_RETRIES}: ${lastError.message.slice(0, 80)}`);
          await sleep(3000 * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Unknown ComfyUI error');
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
