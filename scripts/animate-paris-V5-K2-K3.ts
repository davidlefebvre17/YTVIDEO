import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_FRAME = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const END_FRAME = path.join(ROOT, "data", "owl-paris-K3-right-facing.png");
const OUTPUT = path.join(ROOT, "data", "owl-paris-V5-K2-K3.mp4");

const VIDEO_PROMPT = `The owl turns to face the camera while walking slowly to the right along the glass wall, ending standing on the right side near the window facing us. Throughout the entire 5-second clip his beak opens and closes regularly and rhythmically as if speaking continuously, with small natural hand-out-of-pocket gestures. Camera completely static, only the owl moves, the room and Eiffel Tower view stay perfectly still.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(START_FRAME)) throw new Error(`Missing ${START_FRAME}`);
  if (!fs.existsSync(END_FRAME)) throw new Error(`Missing ${END_FRAME}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading start ${START_FRAME}...`);
  const startFile = new File([fs.readFileSync(START_FRAME)], "K2.png", {
    type: "image/png",
  });
  const startUrl = await fal.storage.upload(startFile);
  console.log(`Start: ${startUrl}`);

  console.log(`Uploading end ${END_FRAME}...`);
  const endFile = new File([fs.readFileSync(END_FRAME)], "K3.png", {
    type: "image/png",
  });
  const endUrl = await fal.storage.upload(endFile);
  console.log(`End: ${endUrl}`);

  console.log("\nSubmitting to fal-ai/kling-video/v2.5-turbo/pro/image-to-video (5s, with tail_image)...");
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: startUrl,
        tail_image_url: endUrl,
        duration: "5",
        negative_prompt:
          "camera movement, camera pan, camera zoom, camera shake, scene change, cut, blurry, distorted, low quality, warped face, deformed hands, melting, morphing, different character, different style, extra limbs, room moving, eiffel tower moving",
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
  if (!videoUrl) throw new Error("kling-turbo returned no video");

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
