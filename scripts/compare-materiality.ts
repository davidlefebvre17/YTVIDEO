/**
 * Compare old vs new materialityScore on real snapshots.
 * Usage: npx tsx scripts/compare-materiality.ts [date]
 */
import * as fs from "fs";
import * as path from "path";
import { flagAssets } from "../packages/ai/src/pipeline/p1-flagging";
import type { DailySnapshot } from "@yt-maker/core";

const date = process.argv[2] ?? "2026-03-17";
const snapshotPath = path.resolve("data", `snapshot-${date}.json`);
const oldFlaggedPath = path.resolve("data", "pipeline", date, "snapshot_flagged.json");

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath}`);
  process.exit(1);
}

const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

// Run new flagging
const newFlagged = flagAssets(snapshot);

// Load old flagged if exists
let oldAssets: Array<{ symbol: string; name: string; materialityScore: number; flags: string[] }> = [];
if (fs.existsSync(oldFlaggedPath)) {
  const old = JSON.parse(fs.readFileSync(oldFlaggedPath, "utf-8"));
  oldAssets = old.assets ?? [];
}

// Compare
console.log(`\n═══ MaterialityScore Comparison — ${date} ═══\n`);

if (oldAssets.length) {
  console.log("  Symbol              Old    New   Δ     Old Flags → New Flags");
  console.log("  ──────────────────  ─────  ────  ────  ─────────────────────");
} else {
  console.log("  (No old flagged data — showing new scores only)\n");
  console.log("  Symbol              Score  Flags");
  console.log("  ──────────────────  ─────  ─────");
}

for (const asset of newFlagged.assets) {
  const sym = asset.symbol.padEnd(18);
  const newScore = asset.materialityScore.toFixed(1).padStart(5);
  const newFlags = asset.flags;

  if (oldAssets.length) {
    const old = oldAssets.find(a => a.symbol === asset.symbol);
    const oldScore = old ? old.materialityScore.toFixed(1).padStart(5) : "  N/A";
    const delta = old ? (asset.materialityScore - old.materialityScore) : 0;
    const deltaStr = delta === 0 ? "   =" : (delta > 0 ? `  +${delta.toFixed(1)}` : `  ${delta.toFixed(1)}`);

    // Highlight new flags
    const oldFlagSet = new Set(old?.flags ?? []);
    const flagDisplay = newFlags.map(f => oldFlagSet.has(f) ? f : `*${f}*`).join(', ');

    console.log(`  ${sym}${oldScore}  ${newScore} ${deltaStr}  ${flagDisplay}`);
  } else {
    console.log(`  ${sym}${newScore}  ${newFlags.join(', ')}`);
  }
}

// Summary
const newFlagTypes = new Set(newFlagged.assets.flatMap(a => a.flags));
const addedFlags = ['POLITICAL_TRIGGER', 'MACRO_SURPRISE', 'EARNINGS_TODAY', 'NEWS_CLUSTER', 'CAUSAL_CHAIN', 'COT_DIVERGENCE'];
console.log(`\n═══ New flags detected ═══`);
for (const flag of addedFlags) {
  const count = newFlagged.assets.filter(a => a.flags.includes(flag as any)).length;
  const assets = newFlagged.assets.filter(a => a.flags.includes(flag as any)).map(a => a.symbol);
  console.log(`  ${flag.padEnd(20)} ${count > 0 ? `${count} assets: ${assets.join(', ')}` : '—'}`);
}

// Top 10 ranking comparison
if (oldAssets.length) {
  console.log(`\n═══ Top 10 Ranking Change ═══`);
  const oldTop10 = oldAssets.slice(0, 10).map(a => a.symbol);
  const newTop10 = newFlagged.assets.slice(0, 10).map(a => a.symbol);
  console.log(`  OLD: ${oldTop10.join(', ')}`);
  console.log(`  NEW: ${newTop10.join(', ')}`);
  const entered = newTop10.filter(s => !oldTop10.includes(s));
  const exited = oldTop10.filter(s => !newTop10.includes(s));
  if (entered.length) console.log(`  ENTERED top 10: ${entered.join(', ')}`);
  if (exited.length) console.log(`  EXITED top 10: ${exited.join(', ')}`);
}

console.log('');
