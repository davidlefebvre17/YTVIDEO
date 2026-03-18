import * as fs from "fs";
import * as path from "path";
import { flagAssets } from "../packages/ai/src/pipeline/p1-flagging";

const dates = process.argv.slice(2);
if (!dates.length) { console.log("Usage: npx tsx scripts/rank-compare.ts 2026-03-16 2026-03-17"); process.exit(1); }

for (const date of dates) {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve("data", `snapshot-${date}.json`), "utf-8"));
  const oldPath = path.resolve("data", "pipeline", date, "snapshot_flagged.json");
  if (!fs.existsSync(oldPath)) { console.log(`\n  No old data for ${date}, skipping`); continue; }
  const oldFlagged = JSON.parse(fs.readFileSync(oldPath, "utf-8"));
  const newFlagged = flagAssets(snapshot);

  const oldRank = new Map<string, number>(oldFlagged.assets.map((a: any, i: number) => [a.symbol, i + 1]));

  console.log(`\n═══ ${date} — Ranking avant/après ═══`);
  console.log("  #   Symbol              Avant  Après   Δ rang    Score avant → après");
  console.log("  ──  ──────────────────  ─────  ─────  ────────  ─────────────────────");

  for (const [i, asset] of newFlagged.assets.entries()) {
    const nr = i + 1;
    const or = oldRank.get(asset.symbol);
    const oldAsset = oldFlagged.assets.find((a: any) => a.symbol === asset.symbol);
    const oldScore = oldAsset ? oldAsset.materialityScore.toFixed(1) : "?";
    const newScore = asset.materialityScore.toFixed(1);

    let arrow = "   =";
    if (or != null) {
      const delta = or - nr;
      if (delta > 0) arrow = `  ▲${String(delta).padStart(2)}`;
      else if (delta < 0) arrow = `  ▼${String(Math.abs(delta)).padStart(2)}`;
    }

    console.log(
      `  ${String(nr).padStart(2)}  ${asset.symbol.padEnd(18)}  ${String(or ?? "?").padStart(4)}   ${String(nr).padStart(4)}  ${arrow.padEnd(8)}  ${oldScore.padStart(4)} → ${newScore}`
    );
  }
}
console.log("");
