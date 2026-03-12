/**
 * Backfill news-memory.db from existing data sources.
 *
 * Implements D2-NEWS-MEMORY-SPEC.md § 9 (Backfill):
 *   1. Extract news from existing data/snapshot-*.json files
 *   2. Tag articles using tagArticleAuto()
 *   3. Store in SQLite with deduplication
 *   4. Optional: Finnhub company-news historical fetch (--finnhub flag)
 *   5. Optional: Marketaux 30-day backfill (--marketaux flag)
 *
 * Usage:
 *   npm run backfill-news                            # snapshots only
 *   npm run backfill-news -- --finnhub               # + Finnhub company-news
 *   npm run backfill-news -- --marketaux             # + Marketaux 30d (quota-limited)
 *   npm run backfill-news -- --finnhub --marketaux   # all sources
 *
 * Rate limits:
 *   - Snapshots: read-only, instant
 *   - Finnhub: 60 req/min (1s delay between symbols)
 *   - Marketaux: 100 req/day (use sparingly, ~90 reqs for 30 days)
 */

import * as fs from "fs";
import * as path from "path";
import "dotenv/config";
import { NewsMemoryDB, initTagger, tagArticleAuto } from "../packages/ai/src/memory";
import type { DailySnapshot, NewsItem } from "../packages/core/src/types";
import { DEFAULT_ASSETS, fetchFinnhubCompanyNews, fetchMarketauxNews } from "../packages/data/src/index";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "news-memory.db");

// ═════════════════════════════════════════════════════════════════════════════
// Argument parsing
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    finnhub: args.includes("--finnhub"),
    marketaux: args.includes("--marketaux"),
    verbose: args.includes("--verbose"),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 1: Backfill from existing snapshots (§ 9.1)
// ═════════════════════════════════════════════════════════════════════════════

async function backfillFromSnapshots(db: NewsMemoryDB, verbose: boolean): Promise<{
  snapshotCount: number;
  articlesProcessed: number;
  articlesAdded: number;
}> {
  console.log("\n=== Step 1: Backfill from existing snapshots ===\n");

  const dataDir = DATA_DIR;
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
    .sort();

  let totalProcessed = 0;
  let totalAdded = 0;

  for (const filename of files) {
    const snapshotPath = path.join(dataDir, filename);
    let snapshot: DailySnapshot;

    try {
      const content = fs.readFileSync(snapshotPath, "utf-8");
      snapshot = JSON.parse(content);
    } catch (err) {
      console.warn(`  ⚠️  ${filename}: parse error, skipping`);
      continue;
    }

    if (!snapshot.news || snapshot.news.length === 0) {
      if (verbose) console.log(`  ○ ${filename}: no news items`);
      continue;
    }

    const snapshotDate = snapshot.date || filename.match(/snapshot-(.+?)\.json/)?.[1] || "unknown";

    for (const article of snapshot.news) {
      totalProcessed++;

      // Tag the article
      const tags = tagArticleAuto(article);

      // Store in DB (dedup via URL)
      const stored = db.storeArticle(
        {
          title: article.title,
          source: article.source,
          url: article.url,
          published_at: article.publishedAt,
          summary: article.summary,
          lang: article.lang,
          category: article.category,
          snapshot_date: snapshotDate,
        },
        tags,
      );

      if (stored) totalAdded++;
    }

    console.log(`  ✓ ${filename}: processed ${snapshot.news.length} articles`);
  }

  console.log(
    `\nSnapshots: ${files.length} files | Articles: ${totalProcessed} processed | ${totalAdded} new (dedup ${totalProcessed - totalAdded})`,
  );

  return {
    snapshotCount: files.length,
    articlesProcessed: totalProcessed,
    articlesAdded: totalAdded,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 2: Backfill from Finnhub company-news (§ 9.2) — OPTIONAL
// ═════════════════════════════════════════════════════════════════════════════

async function backfillFromFinnhub(db: NewsMemoryDB, verbose: boolean): Promise<{
  symbolsProcessed: number;
  articlesProcessed: number;
  articlesAdded: number;
}> {
  console.log("\n=== Step 2: Backfill from Finnhub company-news ===\n");

  if (!process.env.FINNHUB_API_KEY) {
    console.warn("  ⚠️  FINNHUB_API_KEY not set, skipping");
    return { symbolsProcessed: 0, articlesProcessed: 0, articlesAdded: 0 };
  }

  // Filter to equity symbols only (skip indices ^, futures =F, forex =X, crypto -USD)
  // DEFAULT_ASSETS is array of {symbol, name}, so extract symbols
  const equitySymbols = DEFAULT_ASSETS.filter((asset) => {
    const sym = asset.symbol;
    const isIndex = sym.startsWith("^");
    const isFuture = sym.includes("=F");
    const isForex = sym.includes("=X");
    const isCrypto = sym.endsWith("-USD");
    return !isIndex && !isFuture && !isForex && !isCrypto;
  }).map((a) => a.symbol);

  console.log(`  Processing ${equitySymbols.length} equity symbols (6-month window)...\n`);

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  let totalProcessed = 0;
  let totalAdded = 0;
  let symbolsProcessed = 0;

  // Process in batches of 10 symbols for efficiency
  for (let i = 0; i < equitySymbols.length; i += 10) {
    const batch = equitySymbols.slice(i, i + 10);

    try {
      // Fetch company news for this batch
      const articles = await fetchFinnhubCompanyNews(batch, endDate);

      for (const article of articles) {
        totalProcessed++;

        // Tag the article
        const tags = tagArticleAuto(article);

        // Store in DB
        const stored = db.storeArticle(
          {
            title: article.title,
            source: article.source,
            url: article.url,
            published_at: article.publishedAt,
            summary: article.summary,
            lang: article.lang,
            category: article.category,
            snapshot_date: endDate,
          },
          tags,
        );

        if (stored) totalAdded++;
      }

      if (verbose || symbolsProcessed % 10 === 0) {
        console.log(`  ✓ Batch ${Math.floor(i / 10) + 1}: ${articles.length} articles`);
      }

      symbolsProcessed += batch.length;

      // Rate limit: 500ms delay between batches (60 req/min max)
      if (i + 10 < equitySymbols.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.warn(`  ⚠️  Batch ${Math.floor(i / 10) + 1}: error fetching company news`);
      symbolsProcessed += batch.length;
    }
  }

  console.log(
    `\nFinnhub: ${symbolsProcessed} symbols | Articles: ${totalProcessed} processed | ${totalAdded} new`,
  );

  return { symbolsProcessed, articlesProcessed: totalProcessed, articlesAdded: totalAdded };
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 3: Backfill from Marketaux (30-day window, optional)
// ═════════════════════════════════════════════════════════════════════════════

async function backfillFromMarketaux(db: NewsMemoryDB, verbose: boolean): Promise<{
  daysProcessed: number;
  articlesProcessed: number;
  articlesAdded: number;
}> {
  console.log("\n=== Step 3: Backfill from Marketaux (30-day window) ===\n");

  if (!process.env.MARKETAUX_API_KEY) {
    console.warn("  ⚠️  MARKETAUX_API_KEY not set, skipping");
    return { daysProcessed: 0, articlesProcessed: 0, articlesAdded: 0 };
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalProcessed = 0;
  let totalAdded = 0;
  let daysProcessed = 0;

  const startStr = thirtyDaysAgo.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  console.log(`  Window: ${startStr} → ${todayStr}`);
  console.log(`  Budget: ~90 requests for 30 days (100 req/day limit)\n`);

  const current = new Date(thirtyDaysAgo);
  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];

    try {
      // Marketaux: fetch news for this date
      const articles = await fetchMarketauxNews(dateStr, { maxPages: 1 });

      for (const article of articles) {
        totalProcessed++;

        const tags = tagArticleAuto(article);
        const stored = db.storeArticle(
          {
            title: article.title,
            source: article.source || "Marketaux",
            url: article.url,
            published_at: article.publishedAt,
            summary: article.summary,
            lang: article.lang,
            category: article.category,
            snapshot_date: dateStr,
          },
          tags,
        );

        if (stored) totalAdded++;
      }

      if (verbose || daysProcessed % 5 === 0) {
        console.log(`  ✓ ${dateStr}: ${articles.length} articles`);
      }

      daysProcessed++;
      current.setDate(current.getDate() + 1);

      // Rate limit: 500ms delay between days
      if (current <= today) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.warn(`  ⚠️  ${dateStr}: error fetching Marketaux news`);
      daysProcessed++;
      current.setDate(current.getDate() + 1);
    }
  }

  console.log(`\nMarketaux: ${daysProcessed} days | Articles: ${totalProcessed} processed | ${totalAdded} new`);

  return { daysProcessed, articlesProcessed: totalProcessed, articlesAdded: totalAdded };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  const flags = parseArgs();

  const sources = ["snapshots"];
  if (flags.finnhub) sources.push("finnhub");
  if (flags.marketaux) sources.push("marketaux");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║             News Memory Database Backfill (D2)                 ║");
  console.log("║                                                                ║");
  console.log(`║  Sources:  ${sources.join(" + ")} ${" ".repeat(38 - sources.join(" + ").length)}║`);
  console.log(`║  DB:       ${DB_PATH.substring(DB_PATH.length - 40)} ${" ".repeat(Math.max(0, 40 - DB_PATH.length))}║`);
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // Initialize tagger
  console.log("\nInitializing tagger...");
  initTagger();

  // Initialize DB
  console.log("Initializing database...");
  const db = new NewsMemoryDB(DB_PATH);

  // Backfill from snapshots (always)
  const step1 = await backfillFromSnapshots(db, flags.verbose);

  // Backfill from Finnhub (optional)
  let step2 = { symbolsProcessed: 0, articlesProcessed: 0, articlesAdded: 0 };
  if (flags.finnhub) {
    step2 = await backfillFromFinnhub(db, flags.verbose);
  }

  // Backfill from Marketaux (optional)
  let step3 = { daysProcessed: 0, articlesProcessed: 0, articlesAdded: 0 };
  if (flags.marketaux) {
    step3 = await backfillFromMarketaux(db, flags.verbose);
  }

  // Final stats
  const stats = db.getStats();

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                     BACKFILL COMPLETE                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  let report = `
Total articles backfilled:
  • From snapshots:   ${step1.articlesAdded} new
`;

  if (flags.finnhub) {
    report += `  • From Finnhub:    ${step2.articlesAdded} new\n`;
  }

  if (flags.marketaux) {
    report += `  • From Marketaux:  ${step3.articlesAdded} new\n`;
  }

  report += `
Database stats:
  • Articles:         ${stats.totalArticles}
  • Asset tags:       ${stats.totalAssetTags}
  • Theme tags:       ${stats.totalThemeTags}
  • Economic events:  ${stats.totalEcoEvents}

✓ Database ready for use
  → Import in generateScript() with buildResearchContext()
  → Run: npm run typecheck
`;

  console.log(report);

  db.close();
}

main().catch((err) => {
  console.error("\n❌ Error during backfill:", err);
  process.exit(1);
});
