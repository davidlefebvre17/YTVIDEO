/**
 * Generate ALL beat images for the episode using ComfyUI Cloud.
 * Skips beats with imageReuse and beats that already have images in the output folder.
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
  const allBeats = data.beats as any[];

  const outDir = path.join(process.cwd(), "packages", "remotion-app", "public", "editorial");
  fs.mkdirSync(outDir, { recursive: true });

  // Filter: only beats with prompts, no reuse, and not already generated
  const toGenerate = allBeats.filter((b: any) => {
    if (!b.imagePrompt || b.imagePrompt.length < 20) return false;
    if (b.imageReuse) return false;
    const outPath = path.join(outDir, `${b.id}.png`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
      return false; // Already generated
    }
    return true;
  });

  const alreadyDone = allBeats.length - toGenerate.length - allBeats.filter((b: any) => b.imageReuse).length;
  console.log(`=== Beat Image Generation ===`);
  console.log(`Total beats: ${allBeats.length}`);
  console.log(`With reuse (skip): ${allBeats.filter((b: any) => b.imageReuse).length}`);
  console.log(`Already generated: ${alreadyDone}`);
  console.log(`To generate: ${toGenerate.length}`);
  console.log(`Output: ${outDir}`);
  console.log(`Estimated time: ~${Math.ceil(toGenerate.length / 2 * 25 / 60)} min`);
  console.log();

  const client = new ComfyUIClient({ apiUrl, apiKey });

  const items = toGenerate.map((b: any) => ({ id: b.id, prompt: b.imagePrompt }));
  const results = await client.generateBatch(items, outDir, 2);

  // Update beat props with real image paths
  for (const beat of allBeats) {
    const imgPath = path.join(outDir, `${beat.id}.png`);
    if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
      beat.imagePath = `editorial/${beat.id}.png`;
    }
    // Handle reuse
    if (beat.imageReuse) {
      const reuseId = beat.imageReuse.replace('same_as:', '');
      const reusePath = path.join(outDir, `${reuseId}.png`);
      if (fs.existsSync(reusePath)) {
        beat.imagePath = `editorial/${reuseId}.png`;
      }
    }
  }

  // Save updated props
  const propsPath = path.join(process.cwd(), "data", "beat-test-props.json");
  fs.writeFileSync(propsPath, JSON.stringify(data, null, 2));

  // Also update Remotion fixture
  const fixturePath = path.join(process.cwd(), "packages", "remotion-app", "src", "fixtures", "real-beats.json");
  fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2));

  const succeeded = results.size;
  const failed = toGenerate.length - succeeded;
  console.log(`\n=== Done ===`);
  console.log(`Generated: ${succeeded}/${toGenerate.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  console.log(`Props updated: ${propsPath}`);
  console.log(`Fixture updated: ${fixturePath}`);
  console.log(`\nRefresh Remotion Studio to see all images.`);
}

main().catch(err => { console.error(err); process.exit(1); });
