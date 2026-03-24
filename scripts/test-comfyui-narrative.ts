/**
 * Test narrative editorial illustrations — WSJ hedcut style with storytelling.
 * Based on episode 03-20: "L'or perd 9% en pleine guerre — le refuge a changé de camp"
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ComfyUIClient } from "@yt-maker/ai";

const STYLE = "Wall Street Journal hedcut stipple illustration style, detailed pen and ink pointillism, black ink on cream paper, editorial newspaper illustration, fine dot shading, precise linework, 16:9 wide composition";

const SCENES: Record<string, string> = {
  // Scene 1: Trump "winding down" vs Iraq force majeure — the contradiction
  "scene-01-contradiction": `Split composition: on the left, a confident Donald Trump at a podium gesturing peace, on the right, oil tankers blocked in the Strait of Hormuz with military ships. A crack runs down the middle dividing the two realities. ${STYLE}`,

  // Scene 2: Oil surging despite peace talks — refinery workers watching ticker
  "scene-02-oil-surge": `Oil traders on a trading floor looking up at a massive screen showing crude oil price spiking upward, expressions of disbelief, barrels of oil stacked in the foreground, tension in the room. ${STYLE}`,

  // Scene 3: Gold collapsing in wartime — the paradox
  "scene-03-gold-paradox": `Gold bars tumbling down stairs while in the background through a window, military jets fly over burning oil fields. A banker watches helplessly. The safe haven crumbling during war — visual irony. ${STYLE}`,

  // Scene 4: Powell trapped — stagflation
  "scene-04-powell-trapped": `Jerome Powell sitting at his desk, head in hands, surrounded by two giant arrows: one labeled INFLATION pointing up, one labeled GROWTH pointing down. He is squeezed between them, visibly stuck. A chess board with no valid moves on his desk. ${STYLE}`,

  // Scene 5: Bitcoin resilient — old finance vs new
  "scene-05-bitcoin-stands": `A crumbling classical bank building with columns falling, while next to it a glowing digital Bitcoin symbol stands firm on a modern steel pedestal. Old bankers in suits look shocked. A CFTC stamp of approval visible. ${STYLE}`,

  // Scene 6: Continuity — the hierarchy of havens reshuffled
  "scene-06-new-order": `A podium with three positions: the US Dollar standing tall on first place, Bitcoin surprisingly on second, and Gold knocked down to third looking dented and scratched. A newspaper headline visible reading 'The Refuge Has Changed'. ${STYLE}`,
};

async function main() {
  const apiUrl = process.env.COMFYUI_API_URL;
  const apiKey = process.env.COMFYUI_API_KEY;
  if (!apiUrl || !apiKey) { console.error("Missing env"); process.exit(1); }

  const client = new ComfyUIClient({ apiUrl, apiKey });
  const outDir = path.join(process.cwd(), "data", "comfyui-narrative-test");
  fs.mkdirSync(outDir, { recursive: true });

  const items = Object.entries(SCENES).map(([id, prompt]) => ({ id, prompt }));
  console.log(`Generating ${items.length} narrative editorial illustrations...`);

  const results = await client.generateBatch(items, outDir, 2);

  console.log(`\nDone: ${results.size}/${items.length}`);
  for (const [id, p] of results) {
    console.log(`  ${id}: ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
