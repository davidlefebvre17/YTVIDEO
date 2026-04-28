import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "owl-office-end-frame.png");

const PROMPT = `A wide cinematic editorial illustration rendered in WSJ hedcut stipple pen-and-ink style on aged cream paper, fine crosshatching and dense dot shading, black ink dominant, selective warm color accents only on small green-and-red candlestick charts and on a single gold Bitcoin coin on the credenza.

Very wide pulled-back establishing shot of a luxurious corner office on an upper floor of a 1920s New York Art Deco skyscraper. The camera is positioned deep inside the room, far from the window, giving a strong sense of space and volume. The composition is framed so that a tall arched steel-framed Art Deco window occupies the entire right side of the frame, its gridded mullions clearly visible, revealing the Manhattan skyline at dusk with distant skyscrapers and the Chrysler Building spire fading into atmospheric haze.

Standing right in front of that right-side window, seen clearly from behind, is the young anthropomorphic great horned owl trader: we see only his back, his two pointed ear tufts on top of his head, the back of his silver-brown feathered head, his shoulders in an impeccable navy pinstripe three-piece suit jacket, his arms relaxed at his sides. He is not in the chair, he is standing and looking out the window, his silhouette backlit by the dusk light from the skyline.

In the left-and-center foreground of the wide shot: the emerald-green tufted leather Chesterfield wingback armchair is clearly visible but completely empty — no one is sitting in it, no feet on the coffee table. Directly in front of the empty armchair, the low walnut Art Deco coffee table with the broadsheet OWL STREET JOURNAL newspaper laid flat on it, the crystal whiskey tumbler sitting beside the newspaper on the bare wood. A brass fountain pen beside it.

Around the room and visible in the wide framing: the coffered plaster ceiling with stepped Art Deco sunburst moldings and a brass Art Deco pendant chandelier hanging from high above, the polished herringbone parquet floor extending across the frame, walnut panelled walls, a tall mahogany bookshelf on the left holding leather-bound ledgers, a vintage brass stock-ticker tape machine with a long curling printed paper tape spilling onto the parquet, a walnut credenza displaying a single gold Bitcoin coin on velvet under a glass dome and a silver Ethereum medallion on a stand, a framed NYSE listing certificate, a small Art Deco bronze bull sculpture, a framed candlestick price chart with green up-candles and red down-candles on the far wall, a polished brass terrestrial globe on a stand, a walnut executive desk with two vintage CRT monitors showing faint green candlestick charts.

Lighting: warm amber pool from the chandelier and a bronze banker's desk lamp with green glass shade, cool blue dusk light spilling in from the right-side skyline window silhouetting the owl, long directional shadows across the parquet, cinematic chiaroscuro, strong sense of depth.

Composition: wide 16:9 establishing shot from a slight low angle, deep negative space throughout the room, conveying the spaciousness and ceiling height of the office. Quiet confident old-money Wall Street atmosphere. The owl's back and the right-side arched window are the clear focal anchor on the right, the empty armchair and coffee table anchor the left-center foreground.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Prompt: ${PROMPT.length} chars`);
  console.log("Submitting to fal-ai/bytedance/seedream/v4/text-to-image...");

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

  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUT, buf);
  console.log(`Saved: ${OUT} (${Math.round(buf.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
