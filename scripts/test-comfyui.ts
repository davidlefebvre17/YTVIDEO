/**
 * Test ComfyUI Cloud — génère une seule image pour valider la connexion.
 *
 * Usage:
 *   npx tsx scripts/test-comfyui.ts
 *   npx tsx scripts/test-comfyui.ts "custom prompt here"
 *
 * Requires in .env:
 *   COMFYUI_API_URL=https://cloud.comfy.org
 *   COMFYUI_API_KEY=your-key
 */
import "dotenv/config";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const DEFAULT_PROMPT =
  "Aerial view of a modern trading floor at sunset, warm golden light streaming through large windows, clean minimalist architecture, editorial photography style, soft natural lighting, wide angle 16:9 composition";

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing COMFYUI_API_URL or COMFYUI_API_KEY in .env");
    process.exit(1);
  }

  const prompt = process.argv[2] || DEFAULT_PROMPT;
  const outputPath = path.join(process.cwd(), "data", "comfyui-test.png");

  console.log("=== ComfyUI Cloud Test (Flux 1 Dev FP8) ===");
  console.log(`API: ${apiUrl}`);
  console.log(`Prompt: ${prompt.slice(0, 80)}...`);
  console.log(`Output: ${outputPath}`);
  console.log();

  const client = new ComfyUIClient({ apiUrl, apiKey });

  console.log("Submitting workflow...");
  const start = Date.now();

  try {
    const result = await client.generateImage(prompt, outputPath);
    console.log(`\nImage generated in ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log(`Prompt ID: ${result.promptId}`);
    console.log(`Saved to: ${result.imagePath}`);
  } catch (err) {
    console.error(`\nFailed after ${((Date.now() - start) / 1000).toFixed(1)}s`);
    console.error((err as Error).message);
    process.exit(1);
  }
}

main();
