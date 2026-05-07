import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PREV_VIDEO = path.join(ROOT, "data", "paris-V1-talk-uncross.mp4");
const LAST_FRAME = path.join(ROOT, "data", "paris-V1-last-frame.png");
const OUTPUT = path.join(ROOT, "data", "paris-V2-stand-up.mp4");

const FFMPEG = path.join(
  ROOT,
  "node_modules",
  "@remotion",
  "compositor-win32-x64-msvc",
  "ffmpeg.exe",
);

const VIDEO_PROMPT = `Throughout the entire 5-second clip, the owl is talking continuously: his beak opens and closes regularly and rhythmically without pause from the very first frame to the very last frame. The lip-sync motion never stops.

While talking, he gestures naturally with both of his hands — small expressive hand movements as if explaining points.

During the clip, he naturally stands up from the lounge armchair: he lifts his feet off the coffee table, plants them on the floor, and rises gracefully from the chair into a standing position, his back straight, all while continuing to speak and gesture with his hands the whole time.

Camera is completely static, no camera movement.`;

function extractLastFrame(): void {
  if (!fs.existsSync(FFMPEG)) throw new Error(`Missing ffmpeg at ${FFMPEG}`);
  if (!fs.existsSync(PREV_VIDEO)) throw new Error(`Missing ${PREV_VIDEO}`);
  console.log(`Extracting last frame of ${PREV_VIDEO}...`);
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-sseof", "-0.1",
      "-i", PREV_VIDEO,
      "-frames:v", "1",
      "-q:v", "2",
      LAST_FRAME,
    ],
    { stdio: "inherit" },
  );
  console.log(`Saved last frame: ${LAST_FRAME}`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  fal.config({ credentials: process.env.FAL_KEY });

  extractLastFrame();

  console.log(`\nUploading ${LAST_FRAME}...`);
  const file = new File([fs.readFileSync(LAST_FRAME)], "paris-V1-last.png", {
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
