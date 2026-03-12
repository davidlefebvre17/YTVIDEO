/**
 * Compare legacy monolith vs new C1→C5 pipeline on the same snapshot.
 *
 * Usage:
 *   npx tsx scripts/compare-pipelines.ts
 *   npx tsx scripts/compare-pipelines.ts --data ./data/snapshot-2026-03-10.json
 *   npx tsx scripts/compare-pipelines.ts --fetch --date 2026-03-10
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fetchMarketSnapshot } from "@yt-maker/data";
import {
  generateScript,
  getNextEpisodeNumber,
  NewsMemoryDB,
  initTagger,
  tagArticleAuto,
  buildThemesDuJour,
} from "@yt-maker/ai";
import { runPipeline, toEpisodeScript } from "@yt-maker/ai";
import type { DailySnapshot, Language } from "@yt-maker/core";
import type { PrevContext, PrevEntry } from "@yt-maker/ai";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace("--", "");
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    }
  }
  return opts;
}

function prevDay(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function loadHistory(dataDir: string, snapshotDate: string): PrevContext | undefined {
  const entries: PrevEntry[] = [];
  let searchDate = snapshotDate;
  for (let i = 0; i < 10 && entries.length < 5; i++) {
    searchDate = prevDay(searchDate);
    const snapPath = path.join(dataDir, `snapshot-${searchDate}.json`);
    if (!fs.existsSync(snapPath)) continue;
    const scriptPath = path.join(dataDir, `script-${searchDate}.json`);
    entries.unshift({
      snapshot: JSON.parse(fs.readFileSync(snapPath, "utf-8")),
      script: fs.existsSync(scriptPath) ? JSON.parse(fs.readFileSync(scriptPath, "utf-8")) : undefined,
    });
  }
  return entries.length > 0 ? { entries } : undefined;
}

function summarizeScript(script: any, label: string): string {
  const sections = script.sections ?? [];
  const segments = sections.filter((s: any) => s.type === "segment");
  const totalWords = sections.reduce((sum: number, s: any) => {
    return sum + (s.narration?.split(/\s+/).filter(Boolean).length ?? 0);
  }, 0);

  let text = `\n${"═".repeat(60)}\n`;
  text += `  ${label}\n`;
  text += `${"═".repeat(60)}\n`;
  text += `Titre: "${script.title}"\n`;
  text += `Durée: ${script.totalDurationSec}s (${(script.totalDurationSec / 60).toFixed(1)} min)\n`;
  text += `Sections: ${sections.length} total, ${segments.length} segments\n`;
  text += `Mots: ~${totalWords}\n`;
  text += `Thread: "${script.threadSummary ?? 'N/A'}"\n\n`;

  for (const section of sections) {
    const words = section.narration?.split(/\s+/).filter(Boolean).length ?? 0;
    const depth = section.depth ?? section.data?.depth ?? "";
    const depthStr = depth ? ` [${String(depth).toUpperCase()}]` : "";
    text += `── ${section.type}${depthStr}: ${section.title} (${section.durationSec}s, ~${words}w)\n`;
    if (section.narration && section.type === "segment") {
      text += `   "${section.narration.slice(0, 150)}${section.narration.length > 150 ? "..." : ""}"\n`;
    }
  }
  text += "\n";
  return text;
}

async function main() {
  const opts = parseArgs();
  const lang: Language = (opts.lang as Language) || "fr";
  const dataDir = path.resolve(__dirname, "..", "data");

  let snapshot: DailySnapshot;
  let snapshotPath: string;

  // ── Get snapshot ──────────────────────────────────────
  if (opts.data) {
    // Use existing snapshot
    snapshotPath = path.resolve(opts.data as string);
    console.log(`Loading existing snapshot: ${snapshotPath}`);
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  } else {
    // Fetch fresh
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = (opts.date as string) || yesterday.toISOString().split("T")[0];
    console.log(`\n=== Fetching fresh snapshot for ${date} ===\n`);
    snapshot = await fetchMarketSnapshot(date);
    snapshotPath = path.join(dataDir, `snapshot-${date}.json`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot saved: ${snapshotPath}`);
  }

  // ── Init tagger + NewsMemory ──────────────────────────
  console.log("\nInitializing tagger + NewsMemory...");
  try { initTagger(); } catch { /* ok */ }
  const dbPath = path.join(dataDir, "news-memory.db");
  let newsDb: NewsMemoryDB | undefined;
  try {
    newsDb = new NewsMemoryDB(dbPath);
    // Tag current news
    const articles = snapshot.news.map(n => ({
      article: {
        title: n.title, source: n.source, url: n.url,
        published_at: n.publishedAt, summary: n.summary,
        category: n.category, lang: n.lang, snapshot_date: snapshot.date,
      },
      tags: tagArticleAuto({ title: n.title, summary: n.summary || "", source: n.source }),
    }));
    newsDb.storeArticles(articles);
  } catch (err) {
    console.warn(`  NewsMemory: ${(err as Error).message.slice(0, 80)}`);
  }

  // ── Build themes if needed ────────────────────────────
  if (!snapshot.themesDuJour) {
    snapshot.themesDuJour = buildThemesDuJour(snapshot, snapshot.news, lang);
  }

  // ── Load history ──────────────────────────────────────
  const prevContext = loadHistory(dataDir, snapshot.date);
  if (prevContext) {
    console.log(`History: ${prevContext.entries.length} days loaded`);
  }

  const episodeNumber = getNextEpisodeNumber();

  // ── Run LEGACY pipeline ───────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  RUNNING LEGACY (monolithe)");
  console.log("=".repeat(60));
  const t0Legacy = Date.now();
  let legacyScript;
  try {
    legacyScript = await generateScript(snapshot, {
      type: "daily_recap",
      lang,
      episodeNumber,
      prevContext,
      newsDb,
    });
    const legacyDuration = ((Date.now() - t0Legacy) / 1000).toFixed(1);
    console.log(`Legacy done in ${legacyDuration}s`);
  } catch (err) {
    console.error(`Legacy FAILED: ${(err as Error).message}`);
  }

  // ── Run NEW pipeline C1→C5 ────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  RUNNING PIPELINE C1→C5");
  console.log("=".repeat(60));
  const t0Pipeline = Date.now();
  let pipelineScript;
  let pipelineResult;
  try {
    pipelineResult = await runPipeline({
      snapshot,
      lang,
      episodeNumber,
      newsDb,
      prevContext,
    });
    pipelineScript = toEpisodeScript(pipelineResult.directedEpisode, episodeNumber, lang);
    const pipelineDuration = ((Date.now() - t0Pipeline) / 1000).toFixed(1);
    console.log(`Pipeline done in ${pipelineDuration}s — ${pipelineResult.stats.llmCalls} LLM calls, ${pipelineResult.stats.retries} retries`);
  } catch (err) {
    console.error(`Pipeline FAILED: ${(err as Error).message}`);
    console.error((err as Error).stack?.slice(0, 500));
  }

  // ── Save both outputs ─────────────────────────────────
  const compareDir = path.join(dataDir, "compare", snapshot.date);
  if (!fs.existsSync(compareDir)) fs.mkdirSync(compareDir, { recursive: true });

  if (legacyScript) {
    fs.writeFileSync(path.join(compareDir, "legacy.json"), JSON.stringify(legacyScript, null, 2));
  }
  if (pipelineScript) {
    fs.writeFileSync(path.join(compareDir, "pipeline.json"), JSON.stringify(pipelineScript, null, 2));
  }
  if (pipelineResult) {
    fs.writeFileSync(path.join(compareDir, "pipeline-directed.json"), JSON.stringify(pipelineResult.directedEpisode, null, 2));
    fs.writeFileSync(path.join(compareDir, "pipeline-intermediates.json"), JSON.stringify(pipelineResult.intermediates, null, 2));
  }

  // ── Print comparison ──────────────────────────────────
  console.log("\n\n" + "█".repeat(60));
  console.log("  COMPARISON");
  console.log("█".repeat(60));

  if (legacyScript) {
    console.log(summarizeScript(legacyScript, "LEGACY (monolithe — 1 appel LLM)"));
  } else {
    console.log("\n  LEGACY: FAILED\n");
  }

  if (pipelineScript) {
    console.log(summarizeScript(pipelineScript, `PIPELINE C1→C5 (${pipelineResult?.stats.llmCalls ?? '?'} appels LLM)`));
  } else {
    console.log("\n  PIPELINE: FAILED\n");
  }

  console.log(`\nOutputs saved in: ${compareDir}/`);
  console.log(`  legacy.json — script monolithe`);
  console.log(`  pipeline.json — script C1→C5 (EpisodeScript)`);
  console.log(`  pipeline-directed.json — DirectedEpisode complet (arc, transitions, mood)`);
  console.log(`  pipeline-intermediates.json — tous les intermédiaires (flagged, editorial, analysis, draft, validation)`);

  // Cleanup
  try { newsDb?.close(); } catch { /* ok */ }
}

main().catch((err) => {
  console.error("Compare failed:", err);
  process.exit(1);
});
