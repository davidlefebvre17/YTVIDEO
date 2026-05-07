import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-paris-K1-clean.png");
const OUTPUT = path.join(ROOT, "data", "paris-V1-talk-uncross.mp4");

const VIDEO_PROMPT = `Throughout the entire 5-second clip, the owl is talking continuously: his beak opens and closes regularly and rhythmically without pause from the very first frame to the very last frame, like delivering a market commentary. The lip-sync motion never stops.

While talking, he gestures naturally with both of his hands — small expressive hand movements in front of his chest as if explaining points, hands moving the whole clip.

In the second half of the clip, he naturally uncrosses his legs on the coffee table while still talking and gesturing.

CRITICAL FRAMING: The framing must stay IDENTICAL to the source input image throughout the entire clip — exact same crop, same field of view, same composition. The owl must remain the EXACT SAME SIZE in the frame as he is in the source image — do not zoom in on him, do not enlarge him, do not push the camera in. The whole room composition must stay fully visible at all times exactly as in the source. Camera is completely static and locked off, no camera movement, no zoom, no push-in, no crop change.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT_IMAGE}...`);
  const file = new File([fs.readFileSync(INPUT_IMAGE)], "owl-paris-K1.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting to fal-ai/kling-video/v2.5-turbo/pro/image-to-video (5s)...");
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: imageUrl,
        duration: "5",
        negative_prompt:
          "camera movement, camera pan, camera zoom, camera shake, dolly, scene change, cut, blurry, distorted, low quality, warped face, deformed hands, melting, morphing, different character, different style, extra limbs, extra leg, extra hand",
        cfg_scale: 0.6,
      },
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") {
          for (const log of u.logs ?? []) {
            if (log.message) console.log("  [kling-turbo]", log.message);
          }
        }
      },
    },
  );

  const videoUrl = (result.data as { video?: { url: string } }).video?.url;
  if (!videoUrl) {
    console.error("no video:", JSON.stringify(result.data));
    throw new Error("kling-turbo returned no video");
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
