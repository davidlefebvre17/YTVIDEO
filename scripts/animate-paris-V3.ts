import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PREV_VIDEO = path.join(ROOT, "data", "paris-V2-stand-up.mp4");
const LAST_FRAME = path.join(ROOT, "data", "paris-V2-last-frame.png");
const END_FRAME = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const OUTPUT = path.join(ROOT, "data", "paris-V3-walk-to-window.mp4");

const FFMPEG = path.join(
  ROOT,
  "node_modules",
  "@remotion",
  "compositor-win32-x64-msvc",
  "ffmpeg.exe",
);

const VIDEO_PROMPT = `Throughout the entire 10-second clip, the owl is talking continuously: his beak opens and closes regularly and rhythmically without pause from the very first frame to the very last frame. The lip-sync motion never stops.

During the clip, the owl walks calmly and confidently from his standing position next to the armchair toward the glass curtain wall in the background. As he walks, he gradually pushes both of his hands deep into his trouser pockets, until they are fully in his pockets when he reaches the glass wall. He turns his back to the camera as he approaches the window. By the end of the clip, he is standing still in front of the glass wall, his back fully to the camera, both hands deep in his trouser pockets, looking out at the Eiffel Tower in the Paris dawn skyline. He keeps speaking throughout — even while walking and turning, his beak continues to open and close.

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
  if (!fs.existsSync(END_FRAME)) throw new Error(`Missing ${END_FRAME}`);
  fal.config({ credentials: process.env.FAL_KEY });

  extractLastFrame();

  console.log(`\nUploading start frame ${LAST_FRAME}...`);
  const startFile = new File([fs.readFileSync(LAST_FRAME)], "paris-V2-last.png", {
    type: "image/png",
  });
  const startUrl = await fal.storage.upload(startFile);
  console.log(`Start: ${startUrl}`);

  console.log(`Uploading end frame ${END_FRAME}...`);
  const endFile = new File([fs.readFileSync(END_FRAME)], "owl-paris-K2.png", {
    type: "image/png",
  });
  const endUrl = await fal.storage.upload(endFile);
  console.log(`End: ${endUrl}`);

  console.log("\nSubmitting to fal-ai/kling-video/v2.5-turbo/pro/image-to-video (10s, with tail_image)...");
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: startUrl,
        tail_image_url: endUrl,
        duration: "10",
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
