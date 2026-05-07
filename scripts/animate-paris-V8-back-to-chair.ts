import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PREV_VIDEO = path.join(ROOT, "data", "owl-paris-V7-stop-hands.mp4");
const LAST_FRAME = path.join(ROOT, "data", "owl-paris-V7-last-frame.png");
const END_FRAME = path.join(ROOT, "data", "owl-paris-K4-standing-left-table.png");
const OUTPUT = path.join(ROOT, "data", "owl-paris-V8-walk-to-left-table.mp4");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = (require("ffmpeg-static") as string);

const VIDEO_PROMPT = `The owl walks calmly toward the foreground, walking AROUND the marble coffee table (not through it) to reach a standing position to the left of the table, ending facing the camera. He keeps speaking continuously throughout the ENTIRE 5-second clip — his beak opens and closes regularly and rhythmically without ever stopping, from the very first frame to the very last frame. Hands gesture naturally while walking. Camera completely static, only the owl moves, the room stays perfectly still.`;

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

  if (!fs.existsSync(END_FRAME)) throw new Error(`Missing ${END_FRAME}`);

  console.log(`\nUploading start ${LAST_FRAME}...`);
  const startFile = new File([fs.readFileSync(LAST_FRAME)], "owl-V7-last.png", {
    type: "image/png",
  });
  const startUrl = await fal.storage.upload(startFile);
  console.log(`Start: ${startUrl}`);

  console.log(`Uploading end ${END_FRAME}...`);
  const endFile = new File([fs.readFileSync(END_FRAME)], "owl-K1.png", {
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
          "camera movement, camera pan, camera zoom, camera shake, scene change, cut, blurry, distorted, low quality, warped face, deformed hands, melting, morphing, different character, different style, extra limbs, room moving, furniture moving, walking through table, clipping through furniture, owl stops talking, beak closed",
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
