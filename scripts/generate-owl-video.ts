/**
 * Generate owl video using the OFFICIAL Wan 2.2 workflow JSON,
 * modified to use available models. Sends the full workflow format.
 *
 * Usage: npx tsx scripts/generate-owl-video.ts owl_recul "Zoom In"
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const OWL_DIR = path.join(ROOT, "packages", "remotion-app", "public", "owl-imagen");
const OUT_DIR = path.join(ROOT, "packages", "remotion-app", "public", "owl-video");
const WF_PATH = path.join(ROOT, "packages", "ai", "src", "comfyui", "workflow-wan22-camera.json");
const API_URL = process.env.COMFYUI_API_URL!;
const API_KEY = process.env.COMFYUI_API_KEY!;

async function uploadImage(imagePath: string): Promise<string> {
  const axios = (await import("axios")).default;
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath));
  form.append("overwrite", "true");
  const res = await axios.post(`${API_URL}/api/upload/image`, form, {
    headers: { ...(API_KEY ? { "X-API-Key": API_KEY } : {}), ...form.getHeaders() },
    maxContentLength: 50 * 1024 * 1024,
  });
  return res.data.name || res.data.filename;
}

function buildApiWorkflow(imageName: string, cameraType: string, prompt: string): Record<string, any> {
  // Load official workflow and convert to API format
  const wf = JSON.parse(fs.readFileSync(WF_PATH, "utf-8"));

  // Build node inputs from links
  const linkMap = new Map<string, Array<[number, number, number, string]>>();
  for (const [linkId, srcNode, srcSlot, tgtNode, tgtSlot, type] of wf.links) {
    const key = `${tgtNode}`;
    if (!linkMap.has(key)) linkMap.set(key, []);
    linkMap.get(key)!.push([srcNode, srcSlot, tgtSlot, type]);
  }

  // Use only the FAST pipeline (4-step, nodes 71-90) — less VRAM
  // Nodes: 75(UNET hi), 72(UNET lo), 85(CLIP), 86(VAE), 79(LoadImage),
  //        87(CameraEmbed), 80(WanCamI2V), 74(neg prompt), 81(pos prompt),
  //        76(ModelSampling hi), 77(ModelSampling lo),
  //        88(LoRA hi), 90(LoRA lo),
  //        71(KSampler1), 78(KSampler2), 82(VAEDecode), 83(CreateVideo), 73(SaveVideo)

  const api: Record<string, any> = {
    // CLIP
    "85": { class_type: "CLIPLoader", inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan" } },
    // VAE
    "86": { class_type: "VAELoader", inputs: { vae_name: "wan_2.1_vae.safetensors" } },
    // UNET (single model for Wan 2.1 standard I2V)
    "75": { class_type: "UNETLoader", inputs: { unet_name: "wan2.1_i2v_720p_14B_fp8_scaled.safetensors", weight_dtype: "default" } },
    "72": { class_type: "UNETLoader", inputs: { unet_name: "wan2.1_i2v_720p_14B_fp8_scaled.safetensors", weight_dtype: "default" } },
    // ModelSampling
    "76": { class_type: "ModelSamplingSD3", inputs: { shift: 8.0, model: ["75", 0] } },
    "77": { class_type: "ModelSamplingSD3", inputs: { shift: 8.0, model: ["72", 0] } },
    // Positive prompt
    "81": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["85", 0] } },
    // Negative prompt
    "74": { class_type: "CLIPTextEncode", inputs: {
      text: "blurry, distorted, low quality, overexposed, static, watermark, deformed, worst quality",
      clip: ["85", 0]
    }},
    // Load image
    "79": { class_type: "LoadImage", inputs: { image: imageName } },
    // I2V conditioning (no camera control — standard Wan 2.1)
    "80": { class_type: "WanImageToVideo", inputs: {
      width: 832, height: 480, length: 81, batch_size: 1,
      positive: ["81", 0], negative: ["74", 0], vae: ["86", 0],
      start_image: ["79", 0]
    }},
    // KSampler pass 1
    "71": { class_type: "KSamplerAdvanced", inputs: {
      add_noise: "enable", seed: Math.floor(Math.random() * 1e15),
      control_after_generate: "randomize", steps: 20, cfg: 3.0,
      sampler_name: "euler", scheduler: "simple",
      start_at_step: 0, end_at_step: 10, return_with_leftover_noise: "enable",
      model: ["76", 0], positive: ["80", 0], negative: ["80", 1], latent_image: ["80", 2]
    }},
    // KSampler pass 2
    "78": { class_type: "KSamplerAdvanced", inputs: {
      add_noise: "disable", seed: 0, control_after_generate: "fixed",
      steps: 20, cfg: 3.0, sampler_name: "euler", scheduler: "simple",
      start_at_step: 10, end_at_step: 10000, return_with_leftover_noise: "disable",
      model: ["77", 0], positive: ["80", 0], negative: ["80", 1], latent_image: ["71", 0]
    }},
    // VAE Decode
    "82": { class_type: "VAEDecode", inputs: { samples: ["78", 0], vae: ["86", 0] } },
    // Create + Save video
    "83": { class_type: "CreateVideo", inputs: { frame_rate: 16, images: ["82", 0] } },
    "73": { class_type: "SaveVideo", inputs: { filename_prefix: "owl", format: "auto", codec: "auto", video: ["83", 0] } },
  };

  return api;
}

async function main() {
  const owlId = process.argv[2] || "owl_recul";
  const cameraType = process.argv[3] || "Zoom In";
  const prompt = process.argv[4] || "Anthropomorphic owl in tweed suit at desk, subtle head movement, blinking, warm light. Camera " + cameraType.toLowerCase() + " slowly.";

  const imagePath = path.join(OWL_DIR, owlId + ".png");
  if (!fs.existsSync(imagePath)) { console.error("Not found:", imagePath); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Video: ${owlId} | Camera: ${cameraType}`);
  console.log(`Model: wan2.1_fun_InP_14B_fp8_scaled`);

  // Upload
  console.log("Uploading...");
  const imgName = await uploadImage(imagePath);
  console.log("Uploaded:", imgName);

  // Submit
  const workflow = buildApiWorkflow(imgName, cameraType, prompt);
  console.log("Submitting workflow (" + Object.keys(workflow).length + " nodes)...");
  const res = await fetch(`${API_URL}/api/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Submit failed:", res.status, err.slice(0, 400));
    process.exit(1);
  }
  const { prompt_id } = await res.json() as any;
  console.log("Job:", prompt_id);

  // Wait via WebSocket
  console.log("Waiting (~5-10 min)...");
  const WebSocket = (await import("ws")).default;
  const wsUrl = API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws";

  const outputFilename = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => { ws.close(); reject(new Error("Timeout 15min")); }, 900000);
    const ws = new WebSocket(wsUrl, { headers: { "X-API-Key": API_KEY } });
    ws.on("message", (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "progress") {
          process.stdout.write(`\r  Progress: ${msg.data?.value}/${msg.data?.max}`);
        } else if (msg.type === "execution_error") {
          clearTimeout(timeout); ws.close();
          reject(new Error("Error: " + JSON.stringify(msg.data?.exception_message || msg.data).slice(0, 300)));
        } else if (msg.type === "executed" && msg.data?.prompt_id === prompt_id) {
          clearTimeout(timeout); ws.close();
          const outputs = msg.data.output || {};
          const allFiles: any[] = [];
          for (const val of Object.values(outputs)) {
            const arr = Array.isArray(val) ? val : [val];
            for (const item of arr) { if (item?.filename) allFiles.push(item); }
          }
          console.log("\n  Output:", allFiles.map((f: any) => f.filename));
          if (allFiles.length > 0) resolve(allFiles[0].filename);
          else reject(new Error("No output"));
        } else if (msg.type !== "status") {
          console.log("\n  WS:", msg.type, JSON.stringify(msg.data || {}).slice(0, 150));
        }
      } catch {}
    });
    ws.on("error", (e: any) => { clearTimeout(timeout); reject(e); });
  });

  // Download
  const outPath = path.join(OUT_DIR, `${owlId}.mp4`);
  console.log("Downloading...");
  const dlRes = await fetch(`${API_URL}/api/view?filename=${encodeURIComponent(outputFilename)}&type=output`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!dlRes.ok) throw new Error("Download failed: " + dlRes.status);
  fs.writeFileSync(outPath, Buffer.from(await dlRes.arrayBuffer()));
  console.log(`Done! ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
