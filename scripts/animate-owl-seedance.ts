import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-office-final.png");
const OUTPUT = path.join(ROOT, "data", "owl-seg1-seedance.mp4");

const VIDEO_PROMPT = `The young anthropomorphic great horned owl trader speaks to the camera throughout the entire shot. His beak opens and closes regularly and naturally with a soft steady rhythm as if he is delivering a market commentary. Small natural head movements, slow blinks of his amber eyes behind the tortoiseshell glasses. Both of his feathered hands gesture calmly and regularly while he talks: one hand lifts off the armrest and makes expressive pointing and open-palm gestures in front of his chest, the other hand occasionally gestures too. His feet stay propped up on the walnut coffee table for the first half of the clip.

Around the middle of the clip, he keeps speaking without any pause, lowers his feet from the coffee table to the herringbone parquet floor, stands up gracefully from the emerald-green Chesterfield wingback armchair, adjusts his navy pinstripe three-piece suit with a calm gesture, and walks slowly and confidently a few steps toward the tall arched Art Deco window overlooking the New York skyline. His beak keeps moving the whole time as if he continues his commentary. End the clip as he reaches the window area, still speaking, one feathered hand raised mid-gesture.

Camera: very calm, steady, cinematic. A subtle slow push-in for the first few seconds, then a gentle follow pan as the owl stands and walks, keeping him framed. No shake, no snap zooms, no cuts. Preserve the existing WSJ hedcut stipple editorial illustration style, the lighting, the colors, the coffered ceiling, the Art Deco chandelier, the bookshelves, the Manhattan skyline, every object in the room. Do not warp or morph the owl, keep his face, glasses, bow tie and suit perfectly on-model throughout.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT_IMAGE}...`);
  const file = new File([fs.readFileSync(INPUT_IMAGE)], "owl-office.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting to bytedance/seedance-2.0/image-to-video (10s, 1080p, no audio)...");
  const result = await fal.subscribe(
    "bytedance/seedance-2.0/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: imageUrl,
        duration: "10",
        resolution: "1080p",
        aspect_ratio: "16:9",
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") {
          for (const log of u.logs ?? []) {
            if (log.message) console.log("  [seedance]", log.message);
          }
        }
      },
    },
  );

  const videoUrl = (result.data as { video?: { url: string } }).video?.url;
  if (!videoUrl) {
    console.error("no video:", JSON.stringify(result.data));
    throw new Error("seedance returned no video");
  }

  console.log(`\nVideo URL: ${videoUrl}`);
  const res = await fetch(videoUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUTPUT, buf);
  const sizeMB = (buf.length / (1024 * 1024)).toFixed(1);
  console.log(`\nSaved: ${OUTPUT} (${sizeMB} MB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
