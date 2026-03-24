/**
 * Test retro press style v2 — stricter consistency.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const STYLE = "black and white pen and ink engraving on aged yellowed newspaper, fine crosshatching and stipple shading only, no color whatsoever, 1960s editorial press illustration, hand-engraved vintage print, uniform hatching density, no photographic elements, no borders, no frames, clean edges, wide 16:9 composition";

const SUBJECTS: Record<string, string> = {
  "v2-refinery": `Industrial oil refinery with smokestacks and storage tanks, ${STYLE}`,
  "v2-gold": `Stack of gold bullion bars inside a bank vault, ${STYLE}`,
  "v2-fed": `Federal Reserve building facade with neoclassical columns, ${STYLE}`,
  "v2-trading": `Stock exchange trading floor with traders and ticker boards, ${STYLE}`,
  "v2-port": `Cargo port with container ships and loading cranes, ${STYLE}`,
};

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) { console.error("Missing env"); process.exit(1); }

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-retro-v2");
  fs.mkdirSync(outDir, { recursive: true });

  const items = Object.entries(SUBJECTS).map(([id, prompt]) => ({ id, prompt }));
  console.log(`Generating ${items.length} retro v2 illustrations...`);

  const results = await client.generateBatch(items, outDir, 2);

  console.log(`\nDone: ${results.size}/${items.length}`);
  for (const [id, p] of results) {
    console.log(`  ${id}: ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
