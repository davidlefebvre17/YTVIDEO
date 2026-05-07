import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PREV_VIDEO = path.join(ROOT, "data", "owl-paris-V5-K2-K3.mp4");
const LAST_FRAME = path.join(ROOT, "data", "owl-paris-V5-last-frame.png");
const OUTPUT = path.join(ROOT, "data", "owl-paris-V6-walk-to-cam.mp4");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = (require("ffmpeg-static") as string);

const VIDEO_PROMPT = `The owl walks slowly and confidently toward the camera, growing larger in the frame as he approaches. His beak opens and closes regularly as if speaking continuously throughout the clip. Camera completely static, only the owl moves, the room and Eiffel Tower view stay perfectly still.`;

function extractLastFrame(): void {
  console.log(`Extracting last frame of ${PREV_VIDEO}...`);
  execFileSync(
    FFMPEG,
    ["-y", "-sseof", "-0.1", "-i", PREV_VIDEO, "-vframes", "1", "-q:v", "2", LAST_FRAME],
    { stdio: "inherit" },
  );
  console.log(`Saved: ${LAST_FRAME}`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(PREV_VIDEO)) throw new Error(`Missing ${PREV_VIDEO}`);
  fal.config({ credentials: process.env.FAL_KEY });

  extractLastFrame();

  console.log(`\nUploading ${LAST_FRAME}...`);
  const file = new File([fs.readFileSync(LAST_FRAME)], "owl-V5-last.png", {
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
          "camera movement, camera pan, camera zoom, camera shake, scene change, cut, blurry, distorted, low quality, warped face, deformed hands, melting, morphing, different character, different style, extra limbs, room moving, table moving, furniture moving",
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
