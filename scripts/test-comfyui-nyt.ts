import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const STYLES: Record<string, string> = {
  "nyt-oped": "Oil refinery at dusk, industrial silhouette against warm sky, small flares at horizon. New York Times editorial illustration style, textured paper background, restrained color palette of grays and warm ochre, subtle grain, hand-rendered feel with digital precision, sophisticated understated composition, wide 16:9",
  "nyt-sketch": "Oil refinery at dusk, industrial silhouette, flares visible. Loose editorial sketch style inspired by New York Times Opinion illustrations, visible pencil and charcoal strokes on off-white paper, limited palette of burnt sienna and slate gray, atmospheric, reportage drawing, wide 16:9",
  "nyt-collage": "Oil refinery at dusk, industrial silhouette. Mixed media editorial collage style, torn paper textures, muted vintage tones, layered photographic and illustrated elements, New York Times Magazine aesthetic, sophisticated and restrained, wide 16:9",
};

async function main() {
  const client = new ComfyUIClient({ apiUrl: process.env.COMFYUI_API_URL!, apiKey: process.env.COMFYUI_API_KEY! });
  const outDir = path.join(process.cwd(), "data", "comfyui-nyt-test");
  fs.mkdirSync(outDir, { recursive: true });
  const items = Object.entries(STYLES).map(([id, prompt]) => ({ id, prompt }));
  console.log("Generating " + items.length + " NYT style variants...");
  const results = await client.generateBatch(items, outDir, 2);
  console.log("Done: " + results.size + "/" + items.length);
  for (const [id, p] of results) console.log("  " + id + ": " + (fs.statSync(p).size / 1024).toFixed(0) + " KB");
}
main().catch(err => { console.error(err); process.exit(1); });
