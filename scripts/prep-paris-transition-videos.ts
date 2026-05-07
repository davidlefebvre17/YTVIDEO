import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "packages", "remotion-app", "public", "owl-video");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = (require("ffmpeg-static") as string);

interface Clip {
  id: string;
  srcVideo: string;
}

const CLIPS: Clip[] = [
  { id: "paris_v5", srcVideo: path.join(ROOT, "data", "owl-paris-V5-K2-K3.mp4") },
  { id: "paris_v6", srcVideo: path.join(ROOT, "data", "owl-paris-V6-walk-to-cam.mp4") },
  { id: "paris_v7", srcVideo: path.join(ROOT, "data", "owl-paris-V7-stop-hands.mp4") },
  { id: "paris_v8", srcVideo: path.join(ROOT, "data", "owl-paris-V8-walk-to-left-table.mp4") },
  { id: "paris_v9", srcVideo: path.join(ROOT, "data", "owl-paris-V9-sit-down.mp4") },
  { id: "paris_outro", srcVideo: path.join(ROOT, "data", "owl-paris-OUTRO-10s.mp4") },
];

function extractFrame(input: string, output: string, atEnd: boolean): void {
  const args = atEnd
    ? ["-y", "-sseof", "-0.1", "-i", input, "-vframes", "1", "-q:v", "2", output]
    : ["-y", "-i", input, "-vframes", "1", "-q:v", "2", output];
  execFileSync(FFMPEG, args, { stdio: "inherit" });
}

function copyFile(src: string, dst: string): void {
  fs.copyFileSync(src, dst);
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) throw new Error(`Missing ${PUBLIC_DIR}`);

  for (const clip of CLIPS) {
    if (!fs.existsSync(clip.srcVideo)) {
      console.error(`SKIP: missing ${clip.srcVideo}`);
      continue;
    }
    const dstVideo = path.join(PUBLIC_DIR, `${clip.id}.mp4`);
    const dstStart = path.join(PUBLIC_DIR, `${clip.id}_start.png`);
    const dstEnd = path.join(PUBLIC_DIR, `${clip.id}_end.png`);

    console.log(`\n[${clip.id}] copying video → ${dstVideo}`);
    copyFile(clip.srcVideo, dstVideo);

    console.log(`[${clip.id}] extracting start frame → ${dstStart}`);
    extractFrame(clip.srcVideo, dstStart, false);

    console.log(`[${clip.id}] extracting end frame → ${dstEnd}`);
    extractFrame(clip.srcVideo, dstEnd, true);
  }

  console.log("\nDone.");
}

main();
