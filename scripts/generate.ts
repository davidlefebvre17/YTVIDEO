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
import { fetchMarketSnapshot } from "@yt-maker/data";
import { generateScript, getNextEpisodeNumber, appendToManifest } from "@yt-maker/ai";
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

  // 1. Fetch market data
  console.log("\n--- Step 1: Fetching market data ---");
  const snapshot = await fetchMarketSnapshot(date);

  // Save snapshot
  const dataDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const snapshotPath = path.join(dataDir, `snapshot-${date}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot saved: ${snapshotPath}`);

  // 2. Generate script via Claude
  console.log("\n--- Step 2: Generating script via Claude ---");
  const episodeNumber = getNextEpisodeNumber();
  const script = await generateScript(snapshot, { type, lang, episodeNumber });

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

  console.log("\n=== Done! ===");
  console.log(`Episode #${episodeNumber}: "${script.title}"`);
  console.log(`Duration: ${script.totalDurationSec}s (${(script.totalDurationSec / 60).toFixed(1)} min)`);
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
