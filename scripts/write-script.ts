/**
 * Generate script via Claude from an existing snapshot JSON.
 *
 * Usage:
 *   npm run script -- --data ./data/snapshot-2026-02-19.json --lang fr
 */

import * as fs from "fs";
import * as path from "path";
import { generateScript, getNextEpisodeNumber } from "@yt-maker/ai";
import type { DailySnapshot, EpisodeType, Language } from "@yt-maker/core";

async function main() {
  const args = process.argv.slice(2);
  let dataPath = "";
  let lang: Language = "fr";
  let type: EpisodeType = "daily_recap";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data" && args[i + 1]) {
      dataPath = args[i + 1];
      i++;
    } else if (args[i] === "--lang" && args[i + 1]) {
      lang = args[i + 1] as Language;
      i++;
    } else if (args[i] === "--type" && args[i + 1]) {
      type = args[i + 1] as EpisodeType;
      i++;
    }
  }

  if (!dataPath) {
    // Default to most recent snapshot
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

  const episodeNumber = getNextEpisodeNumber();
  console.log(`Generating ${type} script #${episodeNumber} in ${lang}...`);

  const script = await generateScript(snapshot, { type, lang, episodeNumber });

  const outPath = dataPath.replace("snapshot-", "script-");
  fs.writeFileSync(outPath, JSON.stringify(script, null, 2));
  console.log(`\nScript saved: ${outPath}`);
  console.log(`Title: "${script.title}"`);
  console.log(`Sections: ${script.sections.length}`);
  console.log(`Duration: ${script.totalDurationSec}s`);
}

main().catch((err) => {
  console.error("Script generation failed:", err);
  process.exit(1);
});
