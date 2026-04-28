import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-office-seedream-v2.png");
const OUTPUT = path.join(ROOT, "data", "owl-office-final.png");

const EDIT_PROMPT = `Preserve the entire image exactly as it is. Do not redraw or restyle anything. Do not move the owl, the armchair, the windows, the ceiling, the walls, the bookshelves, the chart, the ticker, the lamp, the chandelier, the skyline, or the coffee table. Keep every line, every stipple, every color, every shadow, every detail intact.

The ONLY change is on the broadsheet newspaper that is laid flat on the walnut coffee table in the foreground.

Remove every object that currently sits on top of the newspaper: the gold Bitcoin coin is removed from the newspaper surface, the crystal whiskey tumbler that sits on the newspaper is removed from the newspaper surface, any pen or small object on the newspaper is removed. The surface of the newspaper is now completely clear, nothing on top of it.

The masthead "OWL STREET JOURNAL" that was partially hidden by the Bitcoin coin is now fully visible, fully legible, with every letter correctly formed in bold Old English blackletter typography, pitch-black ink on cream newsprint. The subheadline "MARKETS CLOSE MIXED AS FED HOLDS RATES" below the masthead stays readable and sharp. The body text columns below the subheadline remain.

You may place the crystal whiskey tumbler on the bare wooden table surface BESIDE the newspaper, not on top of it. The Bitcoin coin can stay on the bare table surface to the side of the newspaper, not on it.

Every other pixel of the image remains unchanged.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "seedream-v2.png", {
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
    throw new Error("nano-banana edit returned no image");
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
