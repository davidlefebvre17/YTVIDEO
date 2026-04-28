import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-office-final.png");
const OUT = path.join(ROOT, "data", "owl-office-end-frame.png");

const EDIT_PROMPT = `Keep this exact image: same WSJ hedcut stipple pen-and-ink illustration style, same aged cream paper texture, same crosshatching, same color palette, same luxurious 1920s New York Art Deco corner office, same young anthropomorphic great horned owl trader character (same navy pinstripe three-piece suit, same burgundy bow tie, same tortoiseshell glasses, same white facial disc and silver-brown plumage), same emerald-green Chesterfield wingback armchair, same low walnut Art Deco coffee table with the OWL STREET JOURNAL newspaper flat on it, same tall arched Art Deco steel-framed window on the right side showing the Manhattan skyline at dusk with the Chrysler Building spire, same coffered ceiling, same Art Deco pendant chandelier, same herringbone parquet, same walnut panelling, same bookshelf with leather ledgers, same stock-ticker tape machine, same framed candlestick chart, same gold Bitcoin coin on velvet, same silver Ethereum medallion, same NYSE certificate, same bronze bull sculpture, same bronze banker's lamp with green glass shade, same walnut desk with CRT monitors.

Only change these three things:
1. Pull the camera back significantly so the view is much wider and further away, revealing more of the room's floor and ceiling, with a strong sense of depth and open volume.
2. The owl is no longer sitting in the armchair. He is now standing up in front of the tall arched window on the right side of the frame, his back turned to the camera. We see only his back: the back of his great-horned owl head with the two ear tufts, the shoulders of his navy pinstripe suit jacket, his arms relaxed at his sides. He is silhouetted by the dusk light from the skyline.
3. The emerald-green Chesterfield armchair is now completely empty, no owl in it, no feet on the coffee table. The armchair stays in its same position with the coffee table and newspaper in front of it.

Do not change any other object, do not restyle, do not re-color, do not replace the owl character with a different one. Keep everything consistent with the source illustration.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-office-final.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting to fal-ai/bytedance/seedream/v4/edit...");
  const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
    input: {
      prompt: EDIT_PROMPT,
      image_urls: [imageUrl],
      image_size: { width: 2048, height: 1152 },
      num_images: 1,
      enable_safety_checker: false,
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log("  [seedream-edit]", log.message);
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
