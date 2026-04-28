import "dotenv/config";
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INPUT_IMAGE = path.join(ROOT, "data", "owl-seg1-last-frame.png");
const OUTPUT = path.join(ROOT, "data", "owl-seg2-seedance.mp4");

const VIDEO_PROMPT = `The shot opens on the young anthropomorphic great horned owl trader standing near the tall arched Art Deco window, mid-gesture with one feathered hand raised. He immediately lowers his hand, turns so his back faces the camera, and continues walking slowly and calmly toward the tall arched window, his back to the camera. He continues to speak as he walks: his head moves slightly as if talking, even though we see him only from behind. For the entire clip we see him only from behind: the back of his great-horned owl head with the two pointed ear tufts, his navy pinstripe three-piece suit, his shoulders, his confident stride.

As he reaches the window area, still talking, he slowly puts both of his feathered hands into the pockets of his suit trousers, settling into a relaxed contemplative posture. He stops at the window, looking out at the Manhattan skyline at dusk, both hands now resting in his pockets, his back fully to the camera, in a calm reflective pose. The clip ends held gently on this back-shot of the owl standing at the window, hands in pockets, head slightly tilted as if still speaking softly.

Camera behaviour: slow, steady, cinematic. A very gentle slow dolly-out during the whole clip, calm and breathing, no shake, no whip, no cuts. Preserve the WSJ hedcut stipple editorial illustration style, the lighting, the colors, the Art Deco office architecture, every object in the room. Do not warp or morph the owl, keep his silhouette on-model from behind throughout.`;

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!fs.existsSync(INPUT_IMAGE)) throw new Error(`Missing ${INPUT_IMAGE}`);
  fal.config({ credentials: process.env.FAL_KEY });

  console.log(`Uploading ${INPUT_IMAGE}...`);
  const startFile = new File([fs.readFileSync(INPUT_IMAGE)], "owl-seg1-last.png", {
    type: "image/png",
  });
  const startUrl = await fal.storage.upload(startFile);
  console.log(`Start: ${startUrl}`);

  console.log("\nSubmitting seg2 to bytedance/seedance-2.0/image-to-video (10s, 1080p, no audio)...");
  const result = await fal.subscribe(
    "bytedance/seedance-2.0/image-to-video",
    {
      input: {
        prompt: VIDEO_PROMPT,
        image_url: startUrl,
        duration: "10",
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
  if (!videoUrl) {
    console.error("no video:", JSON.stringify(result.data));
    throw new Error("seedance returned no video");
  }

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
