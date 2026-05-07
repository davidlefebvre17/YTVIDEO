import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-v6-nano-banana-c.png");
const OUT = path.join(ROOT, "data", "owl-paris-K2-back-window.png");

const EDIT_PROMPT = `Only move the owl himself: he is no longer sitting in the armchair. He is now standing far in the background near the glass wall, with his back to the camera, both hands deep in his trouser pockets, looking at the Eiffel Tower through the glass. The owl appears smaller in the frame because he is further from the camera.

The armchair stays in EXACTLY its original position, original orientation, original size and original appearance — do not move it, do not rotate it, do not resize it, do not redraw it. The armchair is simply empty now.

The Eiffel Tower stays in EXACTLY its original position within the Paris skyline view through the glass — do not move it, do not resize it, do not redraw it. The whole Paris skyline view through the glass must remain pixel-identical to the original.

Keep absolutely everything else in the image identical: same coffee table, same newspaper, same sculpture, same Bitcoin frame, same olive tree, same lamp, same walls, same floor, same lighting, same Paris skyline composition.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-paris-K1-master.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting to fal-ai/nano-banana/edit...");
  const result = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: {
      prompt: EDIT_PROMPT,
      image_urls: [imageUrl],
      num_images: 1,
      output_format: "png",
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log("  [nano-edit]", log.message);
        }
      }
    },
  });

  const image = (result.data as { images?: Array<{ url: string }> }).images?.[0];
  if (!image?.url) {
    console.error("no image:", JSON.stringify(result.data));
    throw new Error("nano-banana/edit returned no image");
  }

  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUT, buf);
  console.log(`Saved: ${OUT} (${Math.round(buf.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
