/**
 * Test retro 1960s newspaper illustration style on 5 different subjects.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const STYLE = "1960s newspaper editorial illustration, pen and ink stipple engraving, fine hatching lines, black ink on aged yellowed newsprint paper, vintage press illustration style, hand-engraved look, crosshatching shading technique, retro journalistic illustration, wide 16:9";

const SUBJECTS: Record<string, string> = {
  "retro-refinery": `Oil refinery industrial complex with smokestacks and pipes. ${STYLE}`,
  "retro-gold": `Gold bullion bars stacked in a vault. ${STYLE}`,
  "retro-fed": `Federal Reserve building neoclassical facade with columns. ${STYLE}`,
  "retro-trading": `Busy stock exchange trading floor with traders and ticker tape. ${STYLE}`,
  "retro-port": `Cargo port with container ships and cranes at harbor. ${STYLE}`,
};

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) { console.error("Missing env"); process.exit(1); }

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-retro-test");
  fs.mkdirSync(outDir, { recursive: true });

  const items = Object.entries(SUBJECTS).map(([id, prompt]) => ({ id, prompt }));
  console.log(`Generating ${items.length} retro press illustrations...`);

  const results = await client.generateBatch(items, outDir, 2);

  console.log(`\nDone: ${results.size}/${items.length}`);
  for (const [id, p] of results) {
    console.log(`  ${id}: ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
