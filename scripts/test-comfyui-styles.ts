/**
 * Test different illustration styles on the same subject to find the best visual direction.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const SUBJECT = "Oil refinery at dusk, industrial silhouette, small flares at horizon, wide 16:9";

const STYLES: Record<string, string> = {
  // Journal / Editorial illustration styles
  "ink-editorial": `${SUBJECT}, editorial ink illustration, fine crosshatch shading, black ink on cream paper, newspaper style, hand-drawn, The Economist illustration style`,
  "watercolor-journal": `${SUBJECT}, loose watercolor illustration, muted earth tones, editorial journal style, visible brushstrokes, sepia and ochre palette, documentary sketch`,
  "linocut": `${SUBJECT}, linocut print illustration, bold black lines, limited color palette, woodblock print aesthetic, editorial print style, vintage newspaper`,
  "pencil-editorial": `${SUBJECT}, detailed pencil sketch, architectural rendering style, fine graphite lines, subtle shading, cream paper texture, editorial documentary illustration`,
  "monochrome-digital": `${SUBJECT}, monochrome digital illustration, single warm accent color, clean vector-like lines, minimal shading, Bloomberg editorial style, modern infographic aesthetic`,
};

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) { console.error("Missing env"); process.exit(1); }

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-style-test");
  fs.mkdirSync(outDir, { recursive: true });

  const items = Object.entries(STYLES).map(([id, prompt]) => ({ id, prompt }));
  console.log(`Generating ${items.length} style variants...`);

  const results = await client.generateBatch(items, outDir, 2);

  console.log(`\nDone: ${results.size}/${items.length} images`);
  for (const [id, p] of results) {
    const size = fs.statSync(p).size;
    console.log(`  ${id}: ${(size / 1024).toFixed(0)} KB`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
