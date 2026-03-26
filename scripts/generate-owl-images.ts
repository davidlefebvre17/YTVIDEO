import "dotenv/config";
import { ComfyUIClient } from "@yt-maker/ai";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const promptsPath = path.join(ROOT, "data", "owl-prompts.json");
const outputDir = path.join(ROOT, "packages", "remotion-app", "public", "owl");

async function main() {
  const prompts = JSON.parse(fs.readFileSync(promptsPath, "utf-8"));
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Generating ${prompts.length} owl images via ComfyUI...`);
  console.log(`Output: ${outputDir}`);

  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL!,
    apiKey: process.env.COMFYUI_API_KEY,
  });
  const items = prompts.map((p: any) => ({ id: p.id, prompt: p.prompt }));
  const results = await client.generateBatch(items, outputDir, 2);

  console.log(`\nDone! ${results.size} images generated`);
  for (const [id, imgPath] of results) {
    const size = fs.statSync(imgPath).size;
    console.log(`  ${id}: ${Math.round(size / 1024)}KB`);
  }
}

main().catch(err => { console.error("FAILED:", err); process.exit(1); });
