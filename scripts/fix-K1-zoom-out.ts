import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-K1-clean.png");
const OUT = path.join(ROOT, "data", "owl-paris-K1-clean.png");

const EDIT_PROMPT = `Zoom out and pull the camera further back so the owl appears noticeably smaller in the frame and we see more of the room around him. The composition expands: more concrete ceiling visible above the owl, more polished marble floor visible in the foreground in front of the coffee table, the side walls fully visible left and right. The owl is now in correct proportion with the architectural space — small relative to the high ceiling and the wide room. Keep every existing element exactly the same (armchair, coffee table, brass bull sculpture, framed Bitcoin artwork, olive tree, brass floor lamp, glass wall, Eiffel Tower, walls, floor, lighting, dawn sky) — just frame them all wider with the owl sitting smaller in the middle of the wider frame.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-K1-tight.png", {
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
