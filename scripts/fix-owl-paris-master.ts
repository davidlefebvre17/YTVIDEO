import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "owl-paris-v3-nano-banana-c.png");
const OUT = path.join(ROOT, "data", "owl-paris-master.png");

const EDIT_PROMPT = `Keep this image pixel-identical: same WSJ hedcut stipple pen-and-ink illustration style, same aged cream paper texture, same crosshatching, same color palette, same modern Parisian trading office, same anthropomorphic great horned owl trader character with the exact same face, plumage, glasses, suit, tie, and shoes, same glass-and-steel executive desk, same sleek black ergonomic high-back chair, same coffered concrete ceiling with black steel I-beams, same back glass curtain wall opening on Paris at dawn with the Eiffel Tower, same golden Bitcoin coin chandelier centered overhead, same dramatic bronze bull-and-bear combat sculpture on the left, same wall-mounted command-center monitor grid on the right, same mahogany bookshelf with leather ledgers, same brass globe, same framed certificates, same banker's lamp with green glass shade, same parquet floor, same dawn lighting and chiaroscuro. Do NOT change the camera angle, the framing, the composition, or any object positions.

Only fix these THREE specific issues:

1. ANATOMY FIX — LEGS: The owl must have exactly TWO feathered legs and exactly TWO black oxford shoes, and nothing else. Both legs are clearly propped up on the desk top, ankles crossed casually, the two shoes pointing toward the camera. Remove any extra leg, any leg passing through the desk, any chair leg or chair wheel visible in front of or through the desk. The front of the desk is a clean solid opaque panel that completely hides whatever is underneath: no chair base, no wheels, no extra limbs visible below the desk surface. Anatomy must be perfectly correct: 2 legs, 2 feet, 2 shoes, 2 hands, 2 arms, one head — nothing more.

2. ADD A NEWSPAPER on the desk: laid perfectly flat on the desk surface in front of the owl, between his feet and the front edge of the desk, a folded broadsheet newspaper rendered in the same WSJ stipple style. The newspaper masthead and body must show ONLY abstract editorial column blocks and stippled patterns suggesting newsprint at distance — NO readable text, NO words, NO letters, NO masthead title, just abstract dark-and-light stipple patterns evoking a newspaper page. The newspaper sits flat, occupies a modest portion of the desk surface, and does not cover the owl's feet or any other desk objects.

3. SCULPTURE: The bronze sculpture on the left must clearly show TWO animals locked in combat — a charging bull with its head down and horns forward, AND a rearing bear with its claws raised, the two animals visibly fighting and intertwined on a single plinth. Make the bear clearly identifiable next to the bull.

Do not change anything else in the image. Do not restyle, do not re-color, do not move the camera, do not redraw the room.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT}...`);
  const file = new File([fs.readFileSync(INPUT)], "owl-paris-source.png", {
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
