import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const OUT = path.join(ROOT, "data", "owl-paris-K2-back-window.png");

const EDIT_PROMPT = `Add a small white porcelain espresso cup placed on its matching white porcelain saucer on top of the coffee table, next to the folded newspaper. The cup is small, elegant, with a tiny brass spoon resting on the saucer. Keep absolutely everything else in the image identical.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-K2-no-cup.png", {
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
