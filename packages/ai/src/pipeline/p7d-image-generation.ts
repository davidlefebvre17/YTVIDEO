import * as fs from "fs";
import * as path from "path";
import type { ImagePromptResult, C7DirectionResult } from "./types";
import { ComfyUIClient } from "../comfyui/comfyui-client";

const PLACEHOLDER_DIR = path.resolve(__dirname, '..', '..', '..', 'remotion-app', 'public', 'placeholders');
const PLACEHOLDERS = [
  'trading-floor.png', 'skyline-dawn.png', 'gold-bars.png',
  'oil-tanker.png', 'port-aerial.png', 'office-desk.png',
];

function assignPlaceholders(prompts: ImagePromptResult[]): Map<string, string> {
  const results = new Map<string, string>();
  const toAssign = prompts.filter(p => !p.skip);
  for (let i = 0; i < toAssign.length; i++) {
    const placeholder = PLACEHOLDERS[i % PLACEHOLDERS.length];
    results.set(toAssign[i].beatId, path.join(PLACEHOLDER_DIR, placeholder));
  }
  return results;
}

export async function runImageGeneration(
  prompts: ImagePromptResult[],
  directions: C7DirectionResult,
  date: string,
  options: { skipImages?: boolean } = {},
): Promise<Map<string, string>> {
  const toGenerate = prompts.filter(p => !p.skip);
  const skipped = prompts.filter(p => p.skip);

  if (options.skipImages || !process.env.COMFYUI_API_URL) {
    console.log(`  P7d: skip-images mode → using ${PLACEHOLDERS.length} placeholders (round-robin)`);
    const results = assignPlaceholders(prompts);

    for (const s of skipped) {
      const reuseDir = directions.directions.find(d => d.beatId === s.beatId);
      if (reuseDir?.imageReuse) {
        const sourceId = reuseDir.imageReuse.replace('same_as:', '');
        const sourcePath = results.get(sourceId);
        if (sourcePath) results.set(s.beatId, sourcePath);
      }
    }

    return results;
  }

  const outputDir = path.resolve('data', 'images', `ep-${date}`);
  console.log(`  P7d: generating ${toGenerate.length} images via ComfyUI Cloud...`);

  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL,
    apiKey: process.env.COMFYUI_API_KEY,
  });

  const items = toGenerate.map(p => ({
    id: p.beatId,
    prompt: p.imagePrompt,
  }));

  const results = await client.generateBatch(items, outputDir);

  for (const s of skipped) {
    const reuseDir = directions.directions.find(d => d.beatId === s.beatId);
    if (reuseDir?.imageReuse) {
      const sourceId = reuseDir.imageReuse.replace('same_as:', '');
      const sourcePath = results.get(sourceId);
      if (sourcePath) results.set(s.beatId, sourcePath);
    }
  }

  console.log(`  P7d: ${results.size}/${prompts.length} images ready (${toGenerate.length} generated, ${skipped.length} reused)`);
  return results;
}
