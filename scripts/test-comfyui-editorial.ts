/**
 * Test new editorial narrative prompts from C7 refonte.
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

  // Pick 5 diverse narrative beats
  const picks = [
    allBeats.find((b: any) => b.id === "beat_001"),   // hook - gold ingot close-up
    allBeats.find((b: any) => b.id === "beat_006"),   // thread - blackboard SMA 200
    allBeats.find((b: any) => b.id === "beat_041"),   // seg_1 - Strait of Hormuz
    allBeats.find((b: any) => b.id === "beat_057"),   // seg_2 - Fed banker silhouette
    allBeats.find((b: any) => b.id === "beat_112"),   // closing - safe with bill replacing gold
  ].filter(Boolean);

  console.log(`Generating ${picks.length} editorial narrative images...`);
  picks.forEach((b: any) => console.log(`  ${b.id} [${b.emotion}] ${b.segmentId}`));

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-editorial-test");
  fs.mkdirSync(outDir, { recursive: true });

  const results = await client.generateBatch(
    picks.map((b: any) => ({ id: b.id, prompt: b.imagePrompt })),
    outDir,
    2,
  );

  console.log(`\nDone: ${results.size}/${picks.length} images`);
  for (const [id, p] of results) {
    console.log(`  ${id}: ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
