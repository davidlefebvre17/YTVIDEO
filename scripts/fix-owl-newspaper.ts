import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-office-nano-banana.png");
const OUTPUT = path.join(ROOT, "data", "owl-office-kontext-fixed.png");

const EDIT_PROMPT = `Preserve every single element of the image exactly: the owl, his pose, suit, chair, ceiling, chandelier, windows, New York skyline, bookshelves, wall frames, ticker, lamps, parquet floor, coffee table, whiskey glass. Do not move or redraw any of these.

ONLY replace the newspaper lying flat on the walnut coffee table with a new newspaper, same position, same perspective, same size, same paper texture. On this new newspaper:

- The top quarter of the newspaper is entirely occupied by a single HUGE MASTHEAD reading exactly 'OWL STREET JOURNAL', in very large, very bold, pitch-black Old English blackletter typography, filling the full width of the newspaper so the text is clearly legible at arm's length. Every letter must be correctly formed, correctly spelled, no garbled characters, no melted shapes, no random symbols. Letters O-W-L  S-T-R-E-E-T  J-O-U-R-N-A-L separated into two words on one single line.
- Below the masthead, a thick horizontal black rule.
- Below the rule, one sharp serif subheadline reading 'MARKETS CLOSE MIXED AS FED HOLDS RATES' in clean black capital serifs.
- Below that, two narrow columns of fine legible serif body text (real English words, not gibberish).
- Paper color: warm aged cream. Ink: pitch black. Printing: crisp, high-contrast, broadsheet newspaper quality.

The typography is the hero of this edit. Prioritize typographic correctness and legibility above all else on the newspaper. Keep everything else in the image pixel-identical.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-office.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log(`\nEditing via fal-ai/flux-pro/kontext/max...`);
  const result = await fal.subscribe("fal-ai/flux-pro/kontext/max", {
    input: {
      prompt: EDIT_PROMPT,
      image_url: imageUrl,
      num_images: 1,
      output_format: "png",
      guidance_scale: 4.5,
      aspect_ratio: "16:9",
    },
    logs: true,
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS") {
        for (const log of u.logs ?? []) {
          if (log.message) console.log("  [nano]", log.message);
        }
      }
    },
  });

  const image = (result.data as { images?: Array<{ url: string }> }).images?.[0];
  if (!image?.url) {
    console.error("no image:", JSON.stringify(result.data));
    throw new Error("fal.ai returned no image");
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
