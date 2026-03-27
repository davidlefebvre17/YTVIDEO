/**
 * Live test: run Knowledge RAG matching on a real snapshot WITHOUT LLM calls.
 * Shows what chunks would be selected and what briefing would be assembled.
 *
 * Usage: npx tsx scripts/test-knowledge-rag-live.ts [--data ./data/snapshot-2026-03-25.json]
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot } from "@yt-maker/core";
import { flagAssets } from "@yt-maker/ai/src/pipeline/p1-flagging";
import { matchChunks, detectActiveThemes } from "../packages/ai/src/knowledge/knowledge-matcher";
import type { SnapshotFlagged, EditorialPlan } from "@yt-maker/ai/src/pipeline/types";
import { rankChunksWithLLM } from "../packages/ai/src/knowledge/knowledge-ranker";

async function main() {
// ── Parse args ──
const args = process.argv.slice(2);
let dataPath = "./data/snapshot-2026-03-25.json";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--data" && args[i + 1]) dataPath = args[i + 1];
}

// ── Load snapshot ──
console.log(`\nLoading: ${dataPath}`);
const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
console.log(`Date: ${snapshot.date} | Assets: ${snapshot.assets.length} | News: ${snapshot.news.length} | Events: ${(snapshot as any).events?.length ?? 0}`);

// ── P1: Flag assets ──
console.log("\n── P1 Flagging ──");
let flagged: SnapshotFlagged;
try {
  flagged = flagAssets(snapshot);
} catch (e) {
  console.error("Flagging failed:", (e as Error).message);
  process.exit(1);
}

const topAssets = flagged.assets.slice(0, 8);
console.log("Top 8 assets by materiality:");
for (const a of topAssets) {
  console.log(`  ${a.symbol.padEnd(12)} ${(a.changePct >= 0 ? "+" : "") + a.changePct.toFixed(2)}% | score: ${a.materialityScore.toFixed(1)} | flags: ${a.flags.join(", ")}`);
}

// ── Simulate P2 editorial (no LLM) ──
console.log("\n── Simulated P2 Editorial ──");
const top5 = topAssets.slice(0, 5);
const editorial: EditorialPlan = {
  date: snapshot.date,
  dominantTheme: `Top movers: ${top5.map(a => a.symbol).join(", ")}`,
  threadSummary: "Simulated editorial for RAG test",
  moodMarche: (flagged.sentiment as any)?.value < 30 ? "risk-off"
    : (flagged.sentiment as any)?.value > 70 ? "risk-on"
    : "incertain",
  coldOpenFact: `${top5[0]?.symbol} ${top5[0]?.changePct >= 0 ? "+" : ""}${top5[0]?.changePct.toFixed(1)}%`,
  closingTeaser: "...",
  segments: [
    { id: "seg_1", topic: "DEEP", depth: "DEEP" as const, assets: top5.slice(0, 2).map(a => a.symbol), angle: "...", justification: "..." },
    { id: "seg_2", topic: "FOCUS", depth: "FOCUS" as const, assets: top5.slice(2, 4).map(a => a.symbol), angle: "...", justification: "..." },
    { id: "seg_3", topic: "FLASH", depth: "FLASH" as const, assets: top5.slice(4, 5).map(a => a.symbol), angle: "...", justification: "..." },
  ],
  skippedAssets: [],
  deepCount: 1,
  flashCount: 1,
  totalSegments: 3,
};
console.log(`Mood: ${editorial.moodMarche}`);
console.log(`Segments: ${editorial.segments.map(s => `${s.depth}(${s.assets.join("+")})`).join(", ")}`);

// ── Theme detection ──
console.log("\n── Active Themes ──");
const actors = flagged.newsClusters?.length ? [] : []; // no political triggers in sim
const themes = detectActiveThemes(flagged, editorial, actors);
console.log(`${themes.length} themes: ${themes.sort().join(", ")}`);

// ── Chunk matching ──
console.log("\n── Chunk Matching (top 35 candidates) ──");
const candidates = matchChunks(flagged, editorial, snapshot);
console.log(`Total candidates: ${candidates.length}`);

const always = candidates.filter(c => c.score >= 100);
const scored = candidates.filter(c => c.score < 100);

if (always.length > 0) {
  console.log(`\n  ALWAYS-INJECT (score >= 100): ${always.length}`);
  for (const c of always) {
    console.log(`    ${c.id.padEnd(40)} score=${c.score} | ${c.reasons.filter(r => r !== "always_if_symbol" && r !== "always_if_theme").slice(0, 2).join(", ")}`);
  }
}

console.log(`\n  SCORED (by relevance): ${scored.length}`);
for (const c of scored.slice(0, 20)) {
  console.log(`    ${c.id.padEnd(40)} score=${c.score.toString().padStart(2)} | ${c.reasons.slice(0, 3).join(", ")}`);
}

// ── Haiku Ranking (real LLM call) ──
console.log("\n── Haiku Ranking (real LLM call) ──");

const CHUNKS_DIR = path.resolve(__dirname, "..", "packages", "ai", "src", "knowledge", "chunks");
const index = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, "index.json"), "utf-8"));
const metaMap = new Map<string, any>(index.chunks.map((c: any) => [c.id, c]));

// Build snapshot summary (same as knowledge-briefing.ts)
const topMovers = [...flagged.assets].sort((a, b) => b.materialityScore - a.materialityScore).slice(0, 5);
const summaryLines = [
  `Date: ${flagged.date}`,
  `Top movers: ${topMovers.map(a => `${a.symbol} ${a.changePct >= 0 ? "+" : ""}${a.changePct.toFixed(1)}% [${a.flags.join(",")}]`).join(" | ")}`,
  `Mood: ${editorial.moodMarche} | Thème: ${editorial.dominantTheme}`,
  `Segments: ${editorial.segments.map(s => `${s.id}(${s.depth},${s.assets.join("+")})`).join(", ")}`,
];
const highEvents = (flagged.events || []).filter((e: any) => e.impact === "high" || e.impact === "medium");
if (highEvents.length > 0) {
  summaryLines.push(`Events: ${highEvents.slice(0, 5).map((e: any) => `${e.name} (${e.impact})`).join(", ")}`);
}
const snapshotSummary = summaryLines.join("\n");
console.log("Summary sent to Haiku:");
console.log(snapshotSummary);
console.log(`\nCandidates sent: ${candidates.length} (${candidates.map(c => c.id).join(", ")})`);

const startTime = Date.now();
const rankedIds = await rankChunksWithLLM(candidates, index.chunks, snapshotSummary);
const elapsed = Date.now() - startTime;

console.log(`\nHaiku returned ${rankedIds.length} chunks in ${(elapsed / 1000).toFixed(1)}s:`);
for (let i = 0; i < rankedIds.length; i++) {
  const id = rankedIds[i];
  const meta = metaMap.get(id);
  const candidate = candidates.find(c => c.id === id);
  console.log(`  ${(i + 1).toString().padStart(2)}. ${id.padEnd(40)} score=${candidate?.score ?? "?"} | ${meta?.title ?? "?"}`);
}

// ── Assemble briefing from Haiku selection ──
console.log("\n── Final Briefing (Haiku-selected) ──");
let briefing = "";
let tokens = 0;
const TOKEN_BUDGET = 3500;
let included = 0;

for (const id of rankedIds) {
  const filePath = path.join(CHUNKS_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) continue;
  const raw = fs.readFileSync(filePath, "utf-8");
  const content = raw.slice(raw.indexOf("---", 3) + 3).trim();
  const chunkTokens = Math.ceil(content.split(/\s+/).length * 1.3);
  if (tokens + chunkTokens > TOKEN_BUDGET && included >= 8) break;
  const meta = metaMap.get(id);
  briefing += `### ${meta?.title ?? id}\n${content}\n\n`;
  tokens += chunkTokens;
  included++;
}

console.log(`Briefing: ${included} chunks, ${tokens} tokens, ${briefing.length} chars`);

// Compare: what Haiku kept vs what it dropped
const dropped = candidates.filter(c => !rankedIds.includes(c.id));
console.log(`\nDropped by Haiku (${dropped.length}):`);
for (const c of dropped.slice(0, 10)) {
  const meta = metaMap.get(c.id);
  console.log(`  ✗ ${c.id.padEnd(40)} | ${meta?.title ?? "?"}`);
}

// Show briefing content
console.log("\n── Briefing content ──");
console.log(briefing);

console.log("\n✓ Knowledge RAG live test complete (with Haiku)");
}

main().catch(console.error);
