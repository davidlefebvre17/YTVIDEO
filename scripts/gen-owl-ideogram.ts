import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "data", "owl-office-ideogram-v3.png");

const PROMPT = `A youthful anthropomorphic great horned owl trader is the clear focal subject of this wide cinematic editorial illustration, rendered in WSJ hedcut stipple pen-and-ink style on aged cream paper with fine crosshatching and dense dot shading, black ink dominant, selective warm color accents only on a gold Bitcoin coin and on small green-and-red candlestick charts.

The owl: young adult, soft silver-brown plumage with a crisp white facial disc, bright amber eyes, round tortoiseshell glasses, clean pointed ear tufts. He wears an impeccable navy pinstripe three-piece suit with a gold pocket-watch chain, a silk burgundy bow tie, crisp white shirt cuffs, polished oxford shoes. He sits deep and composed in a deep emerald-green tufted leather Chesterfield wingback armchair, three-quarters to camera. His legs are casually crossed and BOTH of his feathered shoed feet are propped up on a low walnut Art Deco coffee table directly in front of him.

On the coffee table, laid perfectly flat and clearly facing the camera, a broadsheet newspaper. The newspaper masthead, centered across the top and occupying the full width in very large bold Old English blackletter typography, reads exactly: "OWL STREET JOURNAL". Below the masthead a thick horizontal rule, then a bold serif sub-headline reading "MARKETS CLOSE MIXED AS FED HOLDS RATES", and two narrow columns of legible serif body text beneath. Every letter must be correctly formed, sharp, pitch-black ink on warm cream newsprint. Beside the newspaper on the table: a crystal tumbler with amber whiskey, a single gold Bitcoin coin, a brass fountain pen.

Setting: a luxurious corner office on an upper floor of a 1920s New York Art Deco skyscraper. Two walls of floor-to-ceiling arched steel-framed windows wrap the corner revealing the Manhattan skyline at dusk with the Chrysler Building spire fading into atmospheric haze. Double-height coffered plaster ceiling with stepped Art Deco moldings and a brass Art Deco pendant chandelier. Polished herringbone parquet floor. Walnut panelled walls. Strong sense of vertical space.

Trading references placed tastefully around the room: on the far wall a large framed candlestick chart with green up-candles and red down-candles, a tall mahogany bookshelf holding leather-bound ledgers and a vintage brass stock-ticker tape machine with curling printed tape spilling onto the floor, a walnut credenza with a single gold Bitcoin coin on velvet under glass and a silver Ethereum medallion, a framed NYSE certificate, a small Art Deco bronze bull sculpture, a polished brass globe. In the deep background beside the windows, a walnut executive desk with two vintage CRT monitors showing faint green candlestick charts.

Lighting: warm amber pool from the chandelier and a bronze banker's desk lamp with green glass shade, cool blue dusk light from the skyline windows, long directional shadows, cinematic chiaroscuro.

Composition: wide 16:9 establishing shot from a slight low angle, the owl framed in the near-midground with deep negative space extending back toward the windows, spacious ceiling height, quiet confident old-money Wall Street atmosphere.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Prompt: ${PROMPT.length} chars`);
  console.log("Submitting to fal-ai/ideogram/v3...");

  const result = await fal.subscribe("fal-ai/ideogram/v3", {
    input: {
      prompt: PROMPT,
      image_size: { width: 2048, height: 1152 },
      num_images: 1,
      rendering_speed: "QUALITY",
      style: "DESIGN",
      expand_prompt: false,
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log("  [ideogram]", log.message);
        }
      }
    },
  });

  const image = (result.data as { images?: Array<{ url: string }> }).images?.[0];
  if (!image?.url) {
    console.error("no image:", JSON.stringify(result.data));
    throw new Error("ideogram returned no image");
  }

  console.log(`\nImage URL: ${image.url}`);
  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUTPUT, buf);
  console.log(`Saved: ${OUTPUT} (${Math.round(buf.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
