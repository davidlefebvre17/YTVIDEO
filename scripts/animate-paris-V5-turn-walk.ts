import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const OUTPUT_VIDEO = path.join(ROOT, "data", "owl-paris-V5-turn-walk.mp4");
const OUTPUT_START = path.join(ROOT, "data", "owl-paris-V5-start.png");
const OUTPUT_END = path.join(ROOT, "data", "owl-paris-V5-end.png");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = (require("ffmpeg-static") as string);

const VIDEO_PROMPT = `The owl is standing in front of the glass wall with his back to the camera, hands in pockets. In the first half of the clip he makes a calm quarter-turn to his left so his body ends up in profile facing the right side of the frame. As he turns his head goes slightly further than his body so he is briefly looking directly at the camera, his beak opening and closing rhythmically as if speaking continuously. In the second half of the clip he begins walking slowly to the right along the glass wall, body in profile, still talking, occasionally glancing at the camera. The Eiffel Tower view through the glass behind him stays in the same exact place. Camera is completely static, only the owl moves.`;

async function generateVideo(): Promise<void> {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT_IMAGE}...`);
  const file = new File([fs.readFileSync(INPUT_IMAGE)], "owl-paris-K2.png", {
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
  fs.writeFileSync(OUTPUT_VIDEO, buf);
  console.log(`Saved: ${OUTPUT_VIDEO} (${(buf.length / (1024 * 1024)).toFixed(1)} MB)`);
}

function extractFrames(): void {
  console.log("\nExtracting first frame...");
  execFileSync(
    FFMPEG,
    ["-y", "-i", OUTPUT_VIDEO, "-vframes", "1", "-q:v", "2", OUTPUT_START],
    { stdio: "inherit" },
  );
  console.log(`Saved: ${OUTPUT_START}`);

  console.log("\nExtracting last frame...");
  execFileSync(
    FFMPEG,
    ["-y", "-sseof", "-0.1", "-i", OUTPUT_VIDEO, "-vframes", "1", "-q:v", "2", OUTPUT_END],
    { stdio: "inherit" },
  );
  console.log(`Saved: ${OUTPUT_END}`);
}

async function main() {
  await generateVideo();
  extractFrames();
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
