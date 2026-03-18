/**
 * Run P1 + P2 only to see what C1 Haiku selects with new scoring.
 * Usage: npx tsx scripts/test-editorial.ts [date]
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { flagAssets } from "../packages/ai/src/pipeline/p1-flagging";
import { runNewsDigest } from "../packages/ai/src/pipeline/p1b-news-digest";
import { runC1Editorial } from "../packages/ai/src/pipeline/p2-editorial";
import { buildBriefingPack } from "../packages/ai/src/pipeline/helpers/briefing-pack";
import { buildEpisodeSummaries } from "../packages/ai/src/pipeline/helpers/episode-summary";
import type { DailySnapshot } from "@yt-maker/core";
import { NewsMemoryDB } from "../packages/ai/src/memory";
import { buildResearchContext } from "../packages/ai/src/memory/research-context";

const date = process.argv[2] ?? "2026-03-17";
const snapshotPath = path.resolve("data", `snapshot-${date}.json`);

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath}`);
  process.exit(1);
}

async function main() {
  const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

  console.log(`\n═══ P1 Flagging — ${date} ═══`);
  const flagged = flagAssets(snapshot);

  // Show top 15
  console.log("\nTop 15:");
  for (const [i, a] of flagged.assets.slice(0, 15).entries()) {
    const tag = a.promoted ? " [PROMU]" : "";
    console.log(`  ${String(i + 1).padStart(2)}. ${a.symbol.padEnd(14)} ${a.materialityScore.toFixed(1).padStart(5)}  ${a.flags.join(', ')}${tag}`);
  }

  // P1.5 — News digest
  const calendarHighlights = (snapshot.events ?? [])
    .filter(e => e.impact === 'high')
    .map(e => `${e.time ?? '?'} ${e.name} (${e.currency}) forecast:${e.forecast ?? '?'} actual:${e.actual ?? '?'}`);
  const newsDigest = await runNewsDigest(snapshot.news ?? [], calendarHighlights);

  console.log(`\n═══ P1.5 News Digest ═══`);
  for (const event of newsDigest.events) {
    const icon = event.importance === 'game_changer' ? '🔴' : event.importance === 'significant' ? '🟠' : '🟡';
    const headline = event.headline || (event as any).title || '?';
    console.log(`  ${icon} [${event.category}] ${headline}`);
    console.log(`     assets: ${(event.linkedAssets || []).join(', ') || '—'}`);
  }

  console.log(`\n═══ P2 Sonnet — sélection éditoriale ═══`);
  const briefingPack = buildBriefingPack(flagged, snapshot);

  // Research context
  let researchContext = "";
  try {
    const newsDb = new NewsMemoryDB();
    researchContext = buildResearchContext(snapshot, newsDb, flagged.newsClusters ?? []);
  } catch { /* no news db */ }

  const episodeSummaries = buildEpisodeSummaries(undefined, 5);

  const editorial = await runC1Editorial({
    flagged,
    episodeSummaries,
    researchContext,
    weeklyBrief: "",
    briefingPack,
    newsDigest,
    lang: "fr",
  });

  console.log(`\nThème dominant: ${editorial.dominantTheme}`);
  console.log(`Mood: ${editorial.moodMarche}`);
  console.log(`Fil conducteur: ${editorial.threadSummary}`);
  console.log(`Cold open: ${editorial.coldOpenFact}`);
  console.log(`\nSegments:`);
  for (const seg of editorial.segments) {
    const assets = seg.assets.join(", ");
    const promoted = flagged.assets.filter(a => seg.assets.includes(a.symbol) && a.promoted);
    const promoTag = promoted.length ? " [PROMU]" : "";
    console.log(`  ${seg.id} ${seg.depth.padEnd(5)} ${seg.topic.padEnd(30)} assets:[${assets}]${promoTag}`);
    console.log(`         angle: ${seg.angle}`);
    if (seg.trigger) console.log(`         trigger: ${seg.trigger.actor} / ${seg.trigger.action}`);
  }

  console.log(`\nSkipped: ${editorial.skippedAssets?.map(s => `${s.symbol}(${s.reason})`).join(', ') || 'none'}`);
  console.log(`Closing teaser: ${editorial.closingTeaser}`);

  // Save
  const outDir = path.resolve("data", "pipeline", date);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "editorial_v2_test.json"), JSON.stringify(editorial, null, 2));
  console.log(`\nSaved to ${outDir}/editorial_v2_test.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
