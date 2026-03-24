/**
 * Generate 5 real beat images from the new C7 prompts to compare quality.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) { console.error("Missing env"); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "beat-test-props.json"), "utf-8"));
  const allBeats = data.beats.filter((b: any) => b.imagePrompt?.length > 10 && !b.imageReuse);

  // Pick 5 diverse beats
  const picks = [
    allBeats.find((b: any) => b.id === "beat_001"),   // hook - gold bar close-up
    allBeats.find((b: any) => b.id === "beat_005"),   // thread - oil terminal
    allBeats.find((b: any) => b.id === "beat_043"),   // seg_2 - gold bars
    allBeats.find((b: any) => b.id === "beat_073"),   // seg_3 - data center
    allBeats.find((b: any) => b.id === "beat_111"),   // closing - port at dusk
  ].filter(Boolean);

  console.log(`Generating ${picks.length} images...`);

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-batch-test");
  fs.mkdirSync(outDir, { recursive: true });

  const results = await client.generateBatch(
    picks.map((b: any) => ({ id: b.id, prompt: b.imagePrompt })),
    outDir,
    2, // 2 concurrent
  );

  console.log(`\nDone: ${results.size}/${picks.length} images`);
  for (const [id, p] of results) {
    const size = fs.statSync(p).size;
    console.log(`  ${id}: ${(size / 1024).toFixed(0)} KB → ${p}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
