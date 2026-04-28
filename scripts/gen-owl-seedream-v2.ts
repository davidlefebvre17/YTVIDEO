import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "owl-office-seedream-v2.png");

const PROMPT = `A youthful anthropomorphic great horned owl trader is the clear focal subject of this wide cinematic editorial illustration, rendered in WSJ hedcut stipple pen-and-ink style on aged cream paper with fine crosshatching and dense dot shading, black ink dominant, selective warm color accents only on a gold Bitcoin coin and on small green-and-red candlestick charts.

The owl: young adult, soft silver-brown feathered plumage with a crisp white facial disc, bright amber eyes, round tortoiseshell glasses, clean pointed ear tufts. He wears an impeccable navy pinstripe three-piece suit with a gold pocket-watch chain, a silk burgundy bow tie, crisp white shirt cuffs, polished oxford shoes. He sits deep and composed in a deep emerald-green tufted leather Chesterfield wingback armchair, three-quarters to camera. His legs are casually crossed and BOTH of his feathered shoed feet are propped up on a low walnut Art Deco coffee table directly in front of him.

On the coffee table, laid perfectly flat and clearly facing the camera, occupying a large portion of the foreground, a broadsheet newspaper. The masthead must be rendered with extreme typographic clarity and correct spelling: the top of the newspaper displays the title "OWL STREET JOURNAL" in very large, bold, pitch-black Old English blackletter typography, the letters O W L  S T R E E T  J O U R N A L forming two words on one single line, each letter correctly formed and legible at a glance. Directly under the masthead a thick black horizontal rule. Under the rule, one bold serif sub-headline in pure black capitals reads "MARKETS CLOSE MIXED AS FED HOLDS RATES". Under that subheadline, two columns of fine legible serif body text in real English. The newspaper is printed in crisp pitch-black ink on warm aged cream newsprint, high contrast, broadsheet quality. Typography is the visual hero of the newspaper — no gibberish, no melted letters.

Beside the newspaper on the table: a crystal tumbler with amber whiskey, a single gold Bitcoin coin stamped with a ₿ symbol catching the lamplight, a brass fountain pen.

Setting: a luxurious corner office on an upper floor of a 1920s New York Art Deco skyscraper. Two walls of floor-to-ceiling arched steel-framed windows wrap the corner, gridded mullions, revealing the Manhattan skyline at dusk with the Chrysler Building spire fading into atmospheric haze. Double-height coffered plaster ceiling with stepped Art Deco sunburst moldings and a brass Art Deco pendant chandelier. Polished herringbone parquet floor. Walnut panelled walls. Strong sense of vertical space and open air above and behind the owl.

Trading references placed tastefully around the room: on the far back wall a large framed candlestick price chart with green up-candles and red down-candles, a tall mahogany bookshelf holding leather-bound ledgers and a vintage brass stock-ticker tape machine with a long curling printed paper tape spilling onto the parquet, a walnut credenza displaying under a glass dome a single gold Bitcoin coin on velvet and a silver Ethereum medallion, a framed NYSE listing certificate and a framed NASDAQ plaque on the wall, a shadow-box mounting a NVIDIA microchip, a polished brass terrestrial globe, a small Art Deco bronze bull sculpture on the credenza. In the deep background beside the windows, a walnut executive desk with two vintage CRT monitors displaying faint green candlestick charts.

Lighting: warm amber pool from the chandelier and a bronze banker's desk lamp with green glass shade, cool blue dusk light from the skyline windows, long directional shadows across the parquet, cinematic chiaroscuro.

Composition: wide 16:9 establishing shot from a slight low angle with a wide-angle lens, the owl framed in the near-midground with deep negative space extending back toward the windows to convey spaciousness and ceiling height. Editorial engraving aesthetic, quiet confident old-money Wall Street atmosphere.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Prompt: ${PROMPT.length} chars`);
  console.log("Submitting to fal-ai/bytedance/seedream/v4...");

  const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/text-to-image", {
    input: {
      prompt: PROMPT,
      image_size: { width: 2048, height: 1152 },
      num_images: 1,
      enable_safety_checker: false,
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log("  [seedream]", log.message);
        }
      }
    },
  });

  const image = (result.data as { images?: Array<{ url: string }> }).images?.[0];
  if (!image?.url) throw new Error("no image");

  console.log(`\nImage URL: ${image.url}`);
  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUT, buf);
  console.log(`Saved: ${OUT} (${Math.round(buf.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
