import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-office-nano-banana.png");
const OUTPUT = path.join(ROOT, "data", "owl-office-seedream-edit.png");

const EDIT_PROMPT = `Preserve the entire image exactly as it is: the owl, his pose, his suit, the emerald-green armchair, his feet on the coffee table, the coffee table itself, the arched Art Deco windows, the New York skyline, the bookshelves, the framed chart on the wall, the stock ticker machine, the bronze lamp, the chandelier, the coffered ceiling, the herringbone parquet, the walnut panelled walls, the lighting, the colors, the WSJ hedcut stipple illustration style. Do not move, redraw, or restyle any of these elements.

The ONLY change is to the broadsheet newspaper laid flat on the walnut coffee table in the foreground.

1. Remove every object that currently sits on top of the newspaper: no coin, no pen, no glass, no cup, no whiskey tumbler, nothing covers the newspaper surface. The newspaper's face is completely clear and fully visible. Move the whiskey tumbler to the side of the newspaper on the bare table surface, do not place it on the paper.

2. On the now-empty surface of the newspaper, print a fully legible masthead and body:
   - Top of the newspaper, filling the full width: the title "OWL STREET JOURNAL" in very large, very bold, pitch-black Old English blackletter typography. Each letter correctly formed, correctly spaced, correctly spelled. Two words: "OWL STREET JOURNAL" on a single line.
   - Directly below the masthead, a thick black horizontal rule line.
   - Below the rule, a bold black serif all-caps sub-headline reading exactly: "MARKETS CLOSE MIXED AS FED HOLDS RATES".
   - Below that, two narrow columns of fine legible serif body text in real English.
   - The newspaper is printed in pitch-black ink on warm aged cream newsprint. High contrast, crisp broadsheet typography. No melted letters, no gibberish, no fake characters.

Every letterform must be pixel-sharp and accurately spelled. Typography is the hero of this edit. Match the perspective and lighting of the original newspaper plane.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "nano-banana.png", {
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
  if (!image?.url) {
    console.error("no image:", JSON.stringify(result.data));
    throw new Error("seedream edit returned no image");
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
