/**
 * Generate script via Claude from an existing snapshot JSON.
 *
 * Usage:
 *   npm run script -- --data ./data/snapshot-2026-02-19.json --lang fr
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { generateScript, getNextEpisodeNumber } from "@yt-maker/ai";
import type { DailySnapshot, EpisodeScript, EpisodeType, Language } from "@yt-maker/core";
import type { PrevContext } from "@yt-maker/ai";

async function main() {
  const args = process.argv.slice(2);
  let dataPath = "";
  let prevDataPath = "";
  let prevScriptPath = "";
  let lang: Language = "fr";
  let type: EpisodeType = "daily_recap";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data" && args[i + 1]) {
      dataPath = args[i + 1]; i++;
    } else if (args[i] === "--prev-data" && args[i + 1]) {
      prevDataPath = args[i + 1]; i++;
    } else if (args[i] === "--prev-script" && args[i + 1]) {
      prevScriptPath = args[i + 1]; i++;
    } else if (args[i] === "--lang" && args[i + 1]) {
      lang = args[i + 1] as Language; i++;
    } else if (args[i] === "--type" && args[i + 1]) {
      type = args[i + 1] as EpisodeType; i++;
    }
  }

  if (!dataPath) {
    const dataDir = path.resolve(__dirname, "..", "data");
    const files = fs.readdirSync(dataDir).filter((f) => f.startsWith("snapshot-"));
    if (files.length === 0) {
      console.error("No snapshot found. Run 'npm run fetch' first.");
      process.exit(1);
    }
    dataPath = path.join(dataDir, files[files.length - 1]);
  }

  console.log(`Loading snapshot: ${dataPath}`);
  const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Auto-detect history: look back up to 10 calendar days, collect up to 5 available sessions
  const dataDir = path.dirname(path.resolve(dataPath));
  const snapshotDate = (JSON.parse(fs.readFileSync(dataPath, "utf-8")) as DailySnapshot).date;
  const entries: import("@yt-maker/ai").PrevEntry[] = [];
  const MAX_SESSIONS = 5;
  const MAX_LOOKBACK = 10; // calendar days to search

  let searchDate = snapshotDate;
  for (let i = 0; i < MAX_LOOKBACK && entries.length < MAX_SESSIONS; i++) {
    searchDate = prevDay(searchDate);
    const snapPath = path.join(dataDir, `snapshot-${searchDate}.json`);
    if (!fs.existsSync(snapPath)) continue;
    const scriptPath = path.join(dataDir, `script-${searchDate}.json`);
    entries.unshift({
      snapshot: JSON.parse(fs.readFileSync(snapPath, "utf-8")),
      script: fs.existsSync(scriptPath) ? JSON.parse(fs.readFileSync(scriptPath, "utf-8")) : undefined,
    });
  }

  const prevContext: PrevContext | undefined = entries.length > 0
    ? { entries }
    : undefined;

  if (prevContext) {
    const dates = entries.map((e) => e.snapshot.date);
    const withScript = entries.filter((e) => e.script).length;
    console.log(`History loaded: [${dates.join(", ")}] (${withScript}/${dates.length} with predictions)`);
  } else {
    console.log("History: none (first episode or no prior snapshots found)");
  }

  const episodeNumber = getNextEpisodeNumber();
  console.log(`Generating ${type} script #${episodeNumber} in ${lang}...`);

  const script = await generateScript(snapshot, { type, lang, episodeNumber, prevContext });

  const outPath = dataPath.replace("snapshot-", "script-");
  fs.writeFileSync(outPath, JSON.stringify(script, null, 2));
  console.log(`\nScript saved: ${outPath}`);
  console.log(`Title: "${script.title}"`);
  console.log(`Sections: ${script.sections.length}`);
  console.log(`Duration: ${script.totalDurationSec}s`);
}

function prevDay(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

main().catch((err) => {
  console.error("Script generation failed:", err);
  process.exit(1);
});
