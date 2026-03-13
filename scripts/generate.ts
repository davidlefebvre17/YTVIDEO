/**
 * Full pipeline: fetch data → generate script via Claude → (TTS) → render → save episode
 *
 * Usage:
 *   npm run generate -- --type daily_recap --lang fr
 *   npm run generate -- --type daily_recap --lang en --skip-tts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fetchMarketSnapshot, updateAllMarketMemory, isWeeklyJobDay, applyHaikuEnrichment, loadMemory } from "@yt-maker/data";
import type { ZoneEvent, HaikuEnrichmentResult } from "@yt-maker/data";
import { generateScript, getNextEpisodeNumber, appendToManifest, getMarketMemoryHaikuPrompt, generateStructuredJSON, NewsMemoryDB, initTagger, tagArticleAuto } from "@yt-maker/ai";
import { runPipeline, toEpisodeScript } from "@yt-maker/ai";
import type { PrevContext } from "@yt-maker/ai";

/**
 * Load recent episodes from episodes/ into PrevContext.
 * Each episode file has { script: EpisodeScript, snapshot: DailySnapshot }.
 * Orders oldest→newest so entries[last] = J-1.
 */
function loadPrevContextFromEpisodes(currentDate: string, maxEntries = 15): PrevContext {
  const manifestPath = path.resolve(__dirname, "..", "episodes", "manifest.json");
  if (!fs.existsSync(manifestPath)) return { entries: [] };

  const manifest: Array<{ date: string; filePath: string }> = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const relevant = manifest
    .filter(e => e.date < currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxEntries);

  const entries: PrevContext["entries"] = [];
  for (const entry of relevant) {
    if (!fs.existsSync(entry.filePath)) continue;
    const data = JSON.parse(fs.readFileSync(entry.filePath, "utf-8"));
    if (data.snapshot && data.script) {
      entries.push({ snapshot: data.snapshot, script: data.script });
    }
  }
  return { entries };
}
import { runWeeklyJob } from "@yt-maker/ai";
import type { EpisodeType, Language, EpisodeManifestEntry } from "@yt-maker/core";

// Parse CLI args
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

async function main() {
  const opts = parseArgs();
  const type = (opts.type as EpisodeType) || "daily_recap";
  const lang = (opts.lang as Language) || "fr";
  const skipTts = !!opts["skip-tts"];
  // Default to yesterday — videos are morning recaps of the previous trading day
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = (opts.date as string) || yesterday.toISOString().split("T")[0];

  console.log("=== Trading YouTube Maker ===");
  console.log(`Type: ${type} | Lang: ${lang} | Date: ${date} | TTS: ${skipTts ? "SKIP" : "ON"}`);

  // Initialize News Memory tagger (one-time at boot)
  console.log("\n--- Initializing News Memory tagger ---");
  try {
    initTagger();
  } catch (err) {
    console.warn(`  Tagger initialization warning: ${(err as Error).message}`);
  }

  // 1. Fetch market data
  console.log("\n--- Step 1: Fetching market data ---");
  const snapshot = await fetchMarketSnapshot(date);

  // Save snapshot
  const dataDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const snapshotPath = path.join(dataDir, `snapshot-${date}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot saved: ${snapshotPath}`);

  // 1a. Tag & store news in SQLite (D2)
  console.log("\n--- Step 1a: Tagging and storing news (D2 News Memory) ---");
  const newsDb = new NewsMemoryDB(path.join(dataDir, "news-memory.db"));
  try {
    const articles = snapshot.news.map((n) => ({
      article: {
        title: n.title,
        source: n.source,
        url: n.url,
        published_at: n.publishedAt,
        summary: n.summary,
        category: n.category,
        lang: n.lang,
        snapshot_date: date,
      },
      tags: tagArticleAuto({
        title: n.title,
        summary: n.summary || "",
        source: n.source,
      }),
    }));

    const stored = newsDb.storeArticles(articles);
    console.log(`  NewsMemory: ${stored} articles tagged and stored`);

    // Sync economic events if available
    if (snapshot.events && snapshot.events.length > 0) {
      const ecoEvents = snapshot.events.map((e) => ({
        id: `${date}-${e.name}`,
        name: e.name,
        currency: e.currency,
        event_date: date,
        strength: (e.impact === "high" ? "Strong" : e.impact === "medium" ? "Moderate" : "Weak") as "Strong" | "Moderate" | "Weak",
        forecast: e.forecast ? Number(e.forecast) : undefined,
        previous: e.previous ? Number(e.previous) : undefined,
        actual: e.actual ? Number(e.actual) : undefined,
        outcome: "pending" as const,
        source: "forexfactory",
      }));
      newsDb.syncEconomicEvents(ecoEvents);
      console.log(`  Economic events synced: ${ecoEvents.length} events`);
    }
  } catch (err) {
    console.warn(`  NewsMemory error: ${(err as Error).message.slice(0, 100)}`);
  }

  // 1b. Update MarketMemory (D3)
  console.log("\n--- Step 1b: Updating MarketMemory ---");
  const memoryUpdates = await updateAllMarketMemory(date);
  const triggeredAssets = memoryUpdates.filter((u) => u.events.length > 0);
  if (triggeredAssets.length > 0) {
    console.log(`  Zone events on: ${triggeredAssets.map((u) => u.symbol).join(", ")}`);
  }

  // Weekly Sonnet job (Monday only)
  if (isWeeklyJobDay(date)) {
    console.log("  Monday detected — running weekly Sonnet job...");
    const weeklyResult = await runWeeklyJob();
    console.log(`  Weekly job: ${weeklyResult.success ? "OK" : "FAILED"} (${weeklyResult.assets_processed} assets)`);
  }

  // Haiku enrichment for triggered assets
  if (triggeredAssets.length > 0) {
    console.log(`  Haiku enrichment for ${triggeredAssets.length} triggered assets...`);
    const enrichments: HaikuEnrichmentResult[] = [];

    for (const update of triggeredAssets) {
      const memory = loadMemory(update.symbol);
      if (!memory) continue;

      try {
        const { system, user } = getMarketMemoryHaikuPrompt(memory, update.events);
        const result = await generateStructuredJSON<HaikuEnrichmentResult>(system, user, { role: "fast" });
        enrichments.push(result);
        console.log(`    ${update.symbol}: ${result.tactical_note}`);
      } catch (err) {
        console.warn(`    ${update.symbol}: Haiku failed — ${(err as Error).message.slice(0, 60)}`);
      }
    }

    if (enrichments.length > 0) {
      applyHaikuEnrichment(enrichments);
      console.log(`  ${enrichments.length} assets enriched by Haiku`);
    }
  }

  // 2. Generate script via Claude
  console.log("\n--- Step 2: Generating script ---");
  const episodeNumber = getNextEpisodeNumber();
  const useLegacy = !!opts["legacy"];

  const prevContext = loadPrevContextFromEpisodes(date);
  console.log(`  PrevContext: ${prevContext.entries.length} épisodes précédents chargés`);

  let script;
  if (useLegacy) {
    // Legacy monolith (single LLM call)
    console.log("  Mode: LEGACY (monolithe)");
    script = await generateScript(snapshot, { type, lang, episodeNumber, newsDb, prevContext });
  } else {
    // New pipeline C1→C5
    console.log("  Mode: PIPELINE C1→C5");
    const result = await runPipeline({
      snapshot,
      lang,
      episodeNumber,
      newsDb,
      prevContext,
    });
    script = toEpisodeScript(result.directedEpisode, episodeNumber, lang);
    console.log(`  Pipeline stats: ${result.stats.llmCalls} LLM calls, ${result.stats.retries} retries, ${(result.stats.totalDurationMs / 1000).toFixed(1)}s`);
  }

  // 3. TTS (Phase 3 — skipped for now)
  if (!skipTts) {
    console.log("\n--- Step 3: TTS (not yet implemented — Phase 3) ---");
    console.log("Skipping TTS generation...");
  }

  // 4. Save episode JSON
  console.log("\n--- Step 4: Saving episode ---");
  const yearDir = path.resolve(__dirname, "..", "episodes", date.slice(0, 4));
  if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
  const episodePath = path.join(yearDir, `${date.slice(5)}.json`);

  const episodeData = {
    script,
    snapshot,
  };
  fs.writeFileSync(episodePath, JSON.stringify(episodeData, null, 2));
  console.log(`Episode saved: ${episodePath}`);

  // Update manifest
  const manifestEntry: EpisodeManifestEntry = {
    episodeNumber,
    date,
    type,
    lang,
    title: script.title,
    filePath: episodePath,
    predictions: (script.sections.find((s) => s.type === "predictions")?.data as any)?.predictions,
  };
  appendToManifest(manifestEntry);
  console.log("Manifest updated");

  // 5. Render
  console.log("\n--- Step 5: Rendering video ---");
  const outDir = path.resolve(__dirname, "..", "out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `episode-${date}.mp4`);

  // Write props file for Remotion
  const propsPath = path.join(dataDir, `props-${date}.json`);
  const remotionProps = {
    script,
    assets: snapshot.assets,
    news: snapshot.news,
  };
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps, null, 2));

  const remotionEntry = path.resolve(__dirname, "..", "packages", "remotion-app", "src", "index.ts");
  const cmd = `npx remotion render "${remotionEntry}" DailyRecap "${outPath}" --codec=h264 --crf=18 --props="${propsPath}"`;

  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
    console.log(`\nVideo rendered: ${outPath}`);
  } catch (err) {
    console.error("Render failed:", err);
    process.exit(1);
  }

  // Close NewsMemory DB
  try {
    newsDb.close();
  } catch (err) {
    console.warn(`  NewsMemory close warning: ${(err as Error).message}`);
  }

  console.log("\n=== Done! ===");
  console.log(`Episode #${episodeNumber}: "${script.title}"`);
  console.log(`Duration: ${script.totalDurationSec}s (${(script.totalDurationSec / 60).toFixed(1)} min)`);
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
