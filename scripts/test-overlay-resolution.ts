import { resolveOverlayData } from "../packages/ai/src/pipeline/p7a-beat-generator";
import * as fs from "fs";

const ep = JSON.parse(fs.readFileSync("episodes/2026/03-20.json", "utf-8"));
const assets = ep.snapshot.assets;

// Simulate a sequence of beats in seg_1 (CL=F, ^GSPC, ^VIX)
// The narration goes: VIX → S&P → "le prix" (should resolve to S&P, not CL=F)
const segAssets = ["CL=F", "^GSPC", "^VIX"];

const sequence = [
  { chunk: "Le VIX bondit de onze pour cent à 26 virgule 78", type: "stat" as const },
  { chunk: "Le S&P cède un virgule cinquante et un pour cent à 6506.", type: "stat" as const },
  { chunk: "Le prix est désormais sous sa moyenne mobile 200 jours à 6624", type: "chart" as const },
  { chunk: "Hier, elle a cédé. Le RSI à 30, c'est la zone de survente", type: "stat" as const },
  { chunk: "Maintenant, le pétrole. Le WTI clôture à 98 dollars 23", type: "stat" as const },
  { chunk: "Le RSI du WTI à 71 — zone de surachat.", type: "stat" as const },
  { chunk: "Le spread entre le Brent et le WTI dépasse les 20 dollars", type: "comparison" as const },
];

console.log("=== Sequence test (context carry within segment) ===\n");

let lastMentioned: string | undefined;

for (const t of sequence) {
  const result = resolveOverlayData(t.chunk, t.type, assets, segAssets, ep.snapshot, lastMentioned);

  // Track resolved asset
  const resolved = (result as any).symbol ?? (result as any).label;
  if (resolved) {
    const match = assets.find((a: any) => a.symbol === resolved || a.name === resolved);
    if (match) lastMentioned = match.symbol;
  }

  const label = (result as any).label ?? (result as any).symbol ?? (result as any).name ?? "?";
  const value = (result as any).value ?? (result as any).price ?? "?";
  console.log(`Chunk: ${t.chunk.slice(0, 65)}`);
  console.log(`  → ${label} = ${typeof value === 'number' ? value.toFixed(2) : value} (lastMentioned: ${lastMentioned})`);
  console.log();
}
