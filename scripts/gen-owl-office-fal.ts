import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OUTDIR = path.join(ROOT, "data");

const PROMPT = `A youthful anthropomorphic great horned owl trader is the clear focal subject of this wide cinematic editorial illustration, rendered in WSJ hedcut stipple pen-and-ink style on aged cream paper with fine crosshatching and dense dot shading, black ink dominant, selective warm color accents only on a gold Bitcoin coin and on small green-and-red candlestick charts.

The owl: young adult, soft silver-brown feathered plumage with a crisp white facial disc, bright alert amber eyes, round tortoiseshell glasses low on his beak, clean pointed ear tufts, feathered hands with clearly drawn talons. He wears an impeccable navy pinstripe three-piece suit with a gold pocket-watch chain across the waistcoat, a silk burgundy bow tie, crisp white shirt cuffs, polished oxford shoes. He sits deep and composed in a deep emerald-green tufted leather Chesterfield wingback armchair, positioned three-quarters to camera. His legs are casually crossed at the ankles and BOTH of his feathered shoed feet are propped up on top of a low walnut Art Deco coffee table directly in front of him.

On the coffee table, laid perfectly flat and clearly visible facing the camera, a broadsheet newspaper with the readable masthead 'OWL STREET JOURNAL' in blackletter type and two columns of mock headline text. Beside the newspaper on the table: a crystal tumbler with amber whiskey, a single gold Bitcoin coin stamped with a ₿ symbol catching the lamplight, a brass fountain pen.

Setting: a luxurious corner office on an upper floor of a 1920s New York Art Deco skyscraper. Two walls of floor-to-ceiling arched steel-framed windows wrap the corner, gridded mullions, revealing the Manhattan skyline at dusk with the Chrysler Building spire and distant skyscrapers fading into atmospheric haze. Double-height coffered plaster ceiling with stepped Art Deco sunburst moldings and a brass Art Deco pendant chandelier hanging from high above. Polished herringbone parquet floor. Walnut panelled walls. Strong sense of vertical space and open air above and behind the owl.

Trading and Wall Street references placed tastefully around the room, clearly visible: on the far back wall a large framed candlestick price chart with green up-candles and red down-candles, a tall mahogany bookshelf holding leather-bound ledgers dated by year and a vintage brass stock-ticker tape machine with a long curling printed paper tape spilling onto the parquet, a walnut credenza displaying under a glass dome a single gold Bitcoin coin on velvet and a silver Ethereum medallion on a stand, a framed NYSE listing certificate and a framed NASDAQ plaque on the wall, a shadow-box mounting a NVIDIA microchip, a polished brass terrestrial globe on a stand, a small Art Deco bronze bull sculpture on the credenza. In the deep background beside the windows, a walnut executive desk with two vintage CRT monitors displaying faint green candlestick charts.

Lighting: warm amber pool of light from the chandelier and a bronze banker's desk lamp with green glass shade, cool blue dusk light spilling in from the skyline windows, long directional shadows across the parquet, cinematic chiaroscuro.

Composition: wide 16:9 establishing shot from a slight low angle with a wide-angle lens, the owl framed in the near-midground with deep negative space extending behind him toward the windows, conveying the spaciousness and ceiling height of the office. Editorial engraving aesthetic, quiet confident old-money Wall Street atmosphere.`;

const MODELS: Array<{
  id: string;
  slug: string;
  input: Record<string, unknown>;
}> = [
  {
    id: "nano-banana",
    slug: "fal-ai/nano-banana",
    input: {
      prompt: PROMPT,
      num_images: 1,
      output_format: "png",
      aspect_ratio: "16:9",
    },
  },
];

async function generate(m: (typeof MODELS)[number]): Promise<void> {
  console.log(`\n[${m.id}] submitting to ${m.slug}...`);
  const result = await fal.subscribe(m.slug, {
    input: m.input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        for (const log of update.logs ?? []) {
          if (log.message) console.log(`  [${m.id}]`, log.message);
        }
      }
    },
  });

  const image = (result.data as { images?: Array<{ url: string }> }).images?.[0];
  if (!image?.url) {
    console.error(`[${m.id}] no image:`, JSON.stringify(result.data));
    return;
  }
  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(OUTDIR, `owl-office-${m.id}.png`);
  fs.writeFileSync(out, buf);
  console.log(`[${m.id}] saved ${out} (${Math.round(buf.length / 1024)} KB)`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Prompt: ${PROMPT.length} chars`);
  console.log(`Running ${MODELS.length} models in parallel...`);

  const results = await Promise.allSettled(MODELS.map(generate));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[${MODELS[i].id}] FAILED:`, r.reason);
    }
  });
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
