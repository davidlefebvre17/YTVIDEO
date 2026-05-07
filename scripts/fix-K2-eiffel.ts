import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const OUT = path.join(ROOT, "data", "owl-paris-K2-back-window.png");

const EDIT_PROMPT = `Add the Eiffel Tower back into the Paris skyline visible through the glass wall behind the standing owl. The Eiffel Tower must be clearly visible in the middle distance through the glass, slightly off-center, the same way it appeared in the original master image. Keep absolutely everything else in the image identical: same owl pose, same armchair, same coffee table, same sculpture, same Bitcoin frame, same olive tree, same lamp, same walls, same floor, same lighting, same composition.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-K2-no-eiffel.png", {
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
  if (!image?.url) throw new Error("nano-banana/edit returned no image");

  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUT, buf);
  console.log(`Saved: ${OUT} (${Math.round(buf.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
