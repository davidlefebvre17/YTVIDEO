import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-v6-nano-banana-c.png");
const OUT = path.join(ROOT, "data", "owl-paris-K1-clean.png");

const EDIT_PROMPT = `Remove the espresso cup and saucer entirely from the image — from the owl's hand and from the coffee table. Both of the owl's arms must be clearly visible: one arm resting on the armrest of the chair, the other arm resting on his thigh, both hands empty. Both of his legs must be clearly visible on the coffee table, ankles crossed, two black oxford shoes side by side and visible. Keep absolutely everything else in the image identical.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-paris-K1-with-cup.png", {
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
