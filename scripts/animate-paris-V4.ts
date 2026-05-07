import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const START_FRAME = path.join(ROOT, "data", "owl-paris-K2-back-window.png");
const RAW_VIDEO = path.join(ROOT, "data", "paris-V4-dive-newspaper-5s.mp4");
const OUTPUT = path.join(ROOT, "data", "paris-V4-dive-newspaper.mp4");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = (require("ffmpeg-static") as string);

const VIDEO_PROMPT = `Pure camera-only motion: the entire scene is completely static and pixel-frozen, nothing in the room moves. The newspaper on the marble coffee table stays exactly where it is, in its exact position, never lifted, never floating, never duplicated. The owl, the armchair, the sculpture, the framed Bitcoin artwork, the olive tree, the lamp, all walls, the Eiffel Tower in the window — every object stays perfectly still and locked in place.

Only the camera moves: the camera quickly rises upward over the room, then plunges sharply downward and forward toward the existing newspaper on the coffee table, accelerating into a tight close-up of that newspaper. By the end of the clip the camera has dived so close to the newspaper that the frame fades and goes fully black.

Do NOT create or add any new newspaper. Do NOT make the existing newspaper move, lift, fly, slide, rotate, or duplicate. The only motion is the camera's rise-and-dive trajectory ending in a black fade-out.`;

async function generateVideo(): Promise<void> {
  console.log("[1/2] Generating Kling camera dive (no end frame)...");

  const file = new File([fs.readFileSync(START_FRAME)], "owl-paris-K2.png", {
    type: "image/png",
  });
  const startUrl = await fal.storage.upload(file);
  console.log(`Start: ${startUrl}`);

  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: startUrl,
        duration: "5",
        negative_prompt:
          "newspaper moving, newspaper floating, newspaper flying, newspaper lifting, new newspaper appearing, duplicate newspaper, scene change, scene cut, jump cut, blurry, distorted, low quality, warped face, deformed hands, melting, morphing, different character, different style, extra limbs, objects moving, room shaking",
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
  fs.writeFileSync(RAW_VIDEO, buf);
  console.log(`Saved raw 5s: ${RAW_VIDEO} (${(buf.length / (1024 * 1024)).toFixed(1)} MB)`);
}

function trimAndFadeBlack(): void {
  console.log("\n[2/2] Trimming to 3s and fading to black at the end...");
  // Trim to 3s, add a 0.5s fade-to-black at the end (from 2.5s to 3.0s).
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-i", RAW_VIDEO,
      "-t", "3",
      "-vf", "fade=t=out:st=2.5:d=0.5:c=black",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "18",
      "-preset", "medium",
      "-movflags", "+faststart",
      OUTPUT,
    ],
    { stdio: "inherit" },
  );
  const sizeMB = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
  console.log(`Saved: ${OUTPUT} (${sizeMB} MB, 3s with fade-to-black)`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(START_FRAME)) throw new Error(`Missing ${START_FRAME}`);
  fal.config({ credentials: process.env.FAL_KEY });

  await generateVideo();
  trimAndFadeBlack();
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
