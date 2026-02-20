/**
 * Backfill news for historical snapshot files using Marketaux API.
 *
 * Reads existing snapshot-DATE.json files, fetches historical news from Marketaux
 * for each date, deduplicates against existing articles, and saves the enriched snapshot.
 *
 * Usage:
 *   npm run backfill-news                         # last 7 days
 *   npm run backfill-news -- --days 30            # last 30 days
 *   npm run backfill-news -- --date 2026-02-13    # single date
 *   npm run backfill-news -- --from 2026-02-01 --to 2026-02-13
 *
 * Rate limit: Marketaux free tier = 100 req/day, this uses 2 req per date (FR + EN).
 * Max safe: 50 dates per run on free tier.
 */

import * as fs from "fs";
import * as path from "path";
import { fetchMarketauxNews } from "../packages/data/src/marketaux";
import type { DailySnapshot, NewsItem } from "../packages/core/src/types";
import "dotenv/config";

const DATA_DIR = path.join(process.cwd(), "data");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const date = get("--date");
  const from = get("--from");
  const to = get("--to");
  const days = parseInt(get("--days") ?? "7", 10);

  if (date) return [date];

  const endDate = to ?? new Date().toISOString().split("T")[0];
  const startDate = from ?? offsetDate(endDate, -days + 1);
  return dateRange(startDate, endDate);
}

function offsetDate(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = offsetDate(current, 1);
  }
  return dates;
}

async function backfillDate(date: string): Promise<void> {
  const snapshotPath = path.join(DATA_DIR, `snapshot-${date}.json`);

  if (!fs.existsSync(snapshotPath)) {
    console.log(`  ${date}: no snapshot found, skipping`);
    return;
  }

  console.log(`\nBackfilling ${date}...`);
  const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const existingUrls = new Set(snapshot.news.map((n) => n.url));
  const before = snapshot.news.length;

  // Fetch Marketaux news for this date — more pages in backfill mode (budget: 10 req/date)
  const newArticles = await fetchMarketauxNews(date, { maxPages: 5 });

  // Merge — only articles not already present
  const toAdd = newArticles.filter((n) => !existingUrls.has(n.url));

  if (toAdd.length === 0) {
    console.log(`  ${date}: no new articles to add (${before} existing)`);
    return;
  }

  // Merge and sort by date desc
  const merged: NewsItem[] = [...snapshot.news, ...toAdd].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  snapshot.news = merged;
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  const targetDate = toAdd.filter((n) => n.publishedAt.startsWith(date)).length;
  console.log(
    `  ${date}: +${toAdd.length} articles added (${targetDate} from target date). Total: ${merged.length}`,
  );
}

async function main() {
  const dates = parseArgs();

  if (!process.env.MARKETAUX_API_KEY) {
    console.error("Error: MARKETAUX_API_KEY not set in .env");
    process.exit(1);
  }

  console.log(`Backfilling news for ${dates.length} date(s): ${dates[0]} → ${dates[dates.length - 1]}`);
  console.log(`Rate: 2 Marketaux requests per date (FR + EN)\n`);

  let totalAdded = 0;
  for (const date of dates) {
    const snapshotPath = path.join(DATA_DIR, `snapshot-${date}.json`);
    if (!fs.existsSync(snapshotPath)) {
      console.log(`  ${date}: no snapshot, skipping`);
      continue;
    }

    const before = JSON.parse(fs.readFileSync(snapshotPath, "utf8")).news.length;
    await backfillDate(date);
    const after = JSON.parse(fs.readFileSync(snapshotPath, "utf8")).news.length;
    totalAdded += after - before;

    // Delay between dates to avoid hammering the API
    if (dates.indexOf(date) < dates.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone. Total articles added across all dates: ${totalAdded}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
