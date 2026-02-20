/**
 * Fetch market data + news only. Saves DailySnapshot JSON.
 *
 * Usage:
 *   npm run fetch -- --date 2026-02-19
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fetchMarketSnapshot } from "@yt-maker/data";

async function main() {
  const args = process.argv.slice(2);
  // Default to yesterday — videos are morning recaps of the previous trading day
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let date = yesterday.toISOString().split("T")[0];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++;
    }
  }

  console.log(`Fetching market snapshot for ${date}...`);
  const snapshot = await fetchMarketSnapshot(date);

  const dataDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outPath = path.join(dataDir, `snapshot-${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nSaved: ${outPath}`);
  console.log(`Assets: ${snapshot.assets.length}`);
  console.log(`News: ${snapshot.news.length}`);
  console.log(`Events: ${snapshot.events.length}`);
}

main().catch((err) => {
  console.error("Fetch failed:", err);
  process.exit(1);
});
