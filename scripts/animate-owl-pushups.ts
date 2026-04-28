import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-seg2-last-frame.png");
const OUTPUT = path.join(ROOT, "data", "owl-pushups.mp4");

const VIDEO_PROMPT = `The young anthropomorphic great horned owl trader, in his navy pinstripe three-piece suit, is standing with his back to the camera in front of the tall arched Art Deco window overlooking the Manhattan skyline at dusk. He pulls both of his feathered hands out of his trouser pockets, takes a small step back from the window, then without hesitation he drops into a push-up position on the herringbone parquet floor and begins doing push-ups with perfect form, going down and up in a steady rhythm. He completes several full push-ups during the clip, his body lowering and rising, his suit jacket stretching on each rep. Camera stays fixed on a medium-wide shot of him doing push-ups, slight cinematic breathing, no cuts. Preserve the WSJ hedcut stipple editorial illustration style, the lighting, the Art Deco office architecture unchanged. Do not warp the owl, keep him on-model.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT_IMAGE}...`);
  const file = new File([fs.readFileSync(INPUT_IMAGE)], "owl-seg2-last.png", {
    type: "image/png",
  });
  const imageUrl = await fal.storage.upload(file);
  console.log(`Uploaded: ${imageUrl}`);

  console.log("\nSubmitting pushups (5s, 1080p, no audio)...");
  const result = await fal.subscribe(
    "bytedance/seedance-2.0/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: imageUrl,
        duration: "5",
        resolution: "1080p",
        aspect_ratio: "16:9",
        generate_audio: false,
      },
      logs: true,
      onQueueUpdate: (u) => {
        if (u.status === "IN_PROGRESS") {
          for (const log of u.logs ?? []) {
            if (log.message) console.log("  [seedance]", log.message);
          }
        }
      },
    },
  );

  const videoUrl = (result.data as { video?: { url: string } }).video?.url;
  if (!videoUrl) throw new Error("seedance returned no video");

  console.log(`\nVideo URL: ${videoUrl}`);
  const res = await fetch(videoUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(OUTPUT, buf);
  const sizeMB = (buf.length / (1024 * 1024)).toFixed(1);
  console.log(`Saved: ${OUTPUT} (${sizeMB} MB)`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
