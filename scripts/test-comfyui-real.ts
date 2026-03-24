/**
 * Test ComfyUI with REAL C7/C8 prompts from beat-test-props.json
 */
import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import { ComfyUIClient } from "@yt-maker/ai";

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) {
    console.error("Missing COMFYUI_API_URL or COMFYUI_API_KEY");
    process.exit(1);
  }

  // Load real beats
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "beat-test-props.json"), "utf-8"));
  const beats = (data.beats as any[]).filter((b: any) => b.imagePrompt && b.imagePrompt.length > 10);
  console.log(`Loaded ${beats.length} beats with prompts`);

  // Pick beat_005 (oil refinery)
  const beat = beats.find((b: any) => b.id === "beat_005") || beats[4];
  console.log(`\nUsing: ${beat.id} [${beat.emotion}]`);
  console.log(`Prompt: ${beat.imagePrompt.slice(0, 120)}...`);

  const outPath = path.join(process.cwd(), "data", `comfyui-real-${beat.id}.png`);
  const client = new ComfyUIClient({ apiUrl, apiKey });

  console.log("\nGenerating...");
  try {
    const result = await client.generateImage(beat.imagePrompt, outPath);
    console.log(`\nDone in ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log(`Saved: ${result.imagePath}`);
    console.log(`Size: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error(`\nFailed:`, (err as Error).message);
    process.exit(1);
  }
}

main();
