import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-office-final.png");
const VIDEO_RAW = path.join(ROOT, "data", "owl-office-raw.mp4");
const LAST_FRAME = path.join(ROOT, "data", "owl-office-last-frame.png");
const OUTPUT = path.join(ROOT, "data", "owl-office-18s.mp4");

const FFMPEG = path.join(
  ROOT,
  "node_modules",
  "@remotion",
  "compositor-win32-x64-msvc",
  "ffmpeg.exe",
);

const VIDEO_PROMPT = `The young anthropomorphic great horned owl trader speaks to the camera: his beak opens and closes regularly and naturally throughout the whole shot as if delivering a market commentary, soft lip-sync rhythm, slight subtle head movements, he occasionally blinks his amber eyes behind the tortoiseshell glasses. Both of his feathered hands gesture calmly and regularly while he talks: one hand lifts off the armrest and makes small expressive pointing and open-palm gestures in front of his chest as if explaining, the other hand rests relaxed on the armrest and occasionally moves too. His feet stay propped up on the walnut coffee table, his posture remains seated and composed in the emerald-green Chesterfield armchair. Ambient life: a very subtle flicker of the green banker's lamp, a faint drift of the tickertape in the background.

Camera: slow gentle push-in dolly for the first seven seconds, drifting closer to the owl and slightly to the right, very calm cinematic breathing, no shake. Then in the final three seconds the camera gracefully tilts down and dives forward onto the broadsheet newspaper lying flat on the coffee table, accelerating smoothly, zooming in until the OWL STREET JOURNAL masthead fills the entire frame and the newspaper occupies the screen. End on a held close-up of the newspaper masthead, fully readable, crisp, still. No cuts. Cinematic chiaroscuro lighting unchanged. Do not warp or deform the owl, keep his face and suit on-model.`;

async function generateVideo(): Promise<void> {
  console.log(`Uploading ${INPUT_IMAGE}...`);
  const file = new File([fs.readFileSync(INPUT_IMAGE)], "owl-office.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting to fal-ai/kling-video/v2.1/master/image-to-video (10s)...");
  const result = await fal.subscribe(
    "fal-ai/kling-video/v2.1/master/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: imageUrl,
        duration: "10",
        negative_prompt:
          "blurry, distorted, low quality, warped face, deformed hands, melting, morphing, scene change, cut, camera shake, different character, different style",
        cfg_scale: 0.7,
      },
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") {
          for (const log of u.logs ?? []) {
            if (log.message) console.log("  [kling]", log.message);
          }
        }
      },
    },
  );

  const videoUrl = (result.data as { video?: { url: string } }).video?.url;
  if (!videoUrl) {
    console.error("no video:", JSON.stringify(result.data));
    throw new Error("kling returned no video");
  }

  console.log(`\nVideo URL: ${videoUrl}`);
  const res = await fetch(videoUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(VIDEO_RAW, buf);
  console.log(`Saved raw video: ${VIDEO_RAW} (${Math.round(buf.length / 1024)} KB)`);
}

function extractLastFrame(): void {
  console.log("\nExtracting last frame via ffmpeg...");
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-sseof", "-0.1",
      "-i", VIDEO_RAW,
      "-frames:v", "1",
      "-q:v", "2",
      LAST_FRAME,
    ],
    { stdio: "inherit" },
  );
  console.log(`Saved: ${LAST_FRAME}`);
}

function buildFinalVideo(): void {
  console.log("\nBuilding 18s video: 10s kling + 8s freeze...");
  execFileSync(
    FFMPEG,
    [
      "-y",
      "-i", VIDEO_RAW,
      "-loop", "1",
      "-t", "8",
      "-i", LAST_FRAME,
      "-filter_complex",
      "[0:v]fps=30,format=yuv420p,setsar=1[v0];" +
        "[1:v]fps=30,scale=w=iw:h=ih,format=yuv420p,setsar=1[v1];" +
        "[v0][v1]concat=n=2:v=1:a=0[outv]",
      "-map", "[outv]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "18",
      "-preset", "medium",
      "-movflags", "+faststart",
      OUTPUT,
    ],
    { stdio: "inherit" },
  );
  console.log(`Saved: ${OUTPUT}`);
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  if (!fs.existsSync(FFMPEG)) throw new Error(`Missing ffmpeg at ${FFMPEG}`);
  fal.config({ credentials: process.env.FAL_KEY });

  await generateVideo();
  extractLastFrame();
  buildFinalVideo();

  const sizeMB = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(1);
  console.log(`\n Final: ${OUTPUT} (${sizeMB} MB, 18s @ 30fps)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
