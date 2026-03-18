/**
 * Comprehensive news matching quality test.
 * Compares P1 flagging (snapshot.news) vs NewsMemory DB (historical) for all assets.
 *
 * Usage: npx tsx scripts/test-news-quality.ts [date]
 */
import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import type { DailySnapshot } from "@yt-maker/core";
import { flagAssets } from "../packages/ai/src/pipeline/p1-flagging";
import { NewsMemoryDB } from "../packages/ai/src/memory/news-db";
import { initTagger, tagArticleAuto } from "../packages/ai/src/memory/news-tagger";

const date = process.argv[2] || "2026-03-16";
const snapshotPath = path.resolve("data", `snapshot-${date}.json`);
if (!fs.existsSync(snapshotPath)) {
  const files = fs.readdirSync("data").filter(f => f.startsWith("snapshot-") && f.endsWith(".json"));
  console.error(`Snapshot not found. Available: ${files.slice(-5).join(", ")}`);
  process.exit(1);
}

const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
console.log(`=== NEWS QUALITY AUDIT — ${date} ===`);
console.log(`Snapshot: ${snapshot.assets.length} assets, ${snapshot.news?.length ?? 0} news articles\n`);

// ── 1. P1 Flagging: NEWS_LINKED flag (snapshot.news matching) ──
const flagged = flagAssets(snapshot);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  PART 1: P1 NEWS_LINKED (snapshot.news → asset matching)   ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const newsLinked = flagged.assets.filter(a => a.flags.includes("NEWS_LINKED"));
const noNews = flagged.assets.filter(a => !a.flags.includes("NEWS_LINKED"));

console.log(`NEWS_LINKED: ${newsLinked.length}/${flagged.assets.length} assets\n`);

// Show which assets got NEWS_LINKED and a sample article
for (const asset of newsLinked) {
  const symbolUp = asset.symbol.toUpperCase();
  const nameUp = asset.name.toUpperCase();
  // Find a matching article
  const sample = snapshot.news?.find(n => {
    const t = n.title.toUpperCase();
    return t.includes(symbolUp) || t.includes(nameUp);
  });
  console.log(`  ✓ ${asset.symbol.padEnd(12)} (${asset.name})`);
  if (sample) {
    console.log(`    Sample: "${sample.title.slice(0, 100)}"`);
  }
}

console.log(`\n  ✗ No NEWS_LINKED (${noNews.length}):`);
for (const asset of noNews) {
  console.log(`    ${asset.symbol.padEnd(12)} ${asset.name} (${asset.changePct >= 0 ? "+" : ""}${asset.changePct.toFixed(1)}%)`);
}

// ── 2. News clusters (hors watchlist) ──
console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  PART 2: NEWS CLUSTERS (stocks hors watchlist)             ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

if (flagged.newsClusters.length) {
  for (const c of flagged.newsClusters) {
    console.log(`  ${c.symbol.padEnd(10)} ${c.name.padEnd(20)} ${c.articleCount} articles${c.changePct !== undefined ? ` (${c.changePct > 0 ? "+" : ""}${c.changePct.toFixed(1)}%)` : ""}`);
    for (const t of c.titles.slice(0, 2)) {
      console.log(`    "${t.slice(0, 100)}"`);
    }
  }
} else {
  console.log("  Aucun cluster détecté.");
}

// ── 3. NewsMemory DB: historical articles per asset ──
console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  PART 3: NewsMemory DB — articles historiques (Layer 1)    ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const dbPath = path.resolve("data", "news-memory.db");
if (!fs.existsSync(dbPath)) {
  console.error("DB not found");
  process.exit(1);
}
const db = new NewsMemoryDB(dbPath);

// Test all 38 assets
const results: Array<{
  symbol: string;
  name: string;
  changePct: number;
  dbArticlesL1: number;
  dbArticlesAll: number;
  sampleTitles: string[];
  falsePositives: string[];
}> = [];

const rawDb = new Database(dbPath);

for (const asset of snapshot.assets) {
  // Layer 1 only (our new method)
  const l1Articles = db.searchByAssetBefore(asset.symbol, date, { days: 30, limit: 20 });

  // All layers (for comparison)
  const allArticles = rawDb.prepare(`
    SELECT DISTINCT a.title, aa.source_layer, a.published_at
    FROM articles a
    JOIN article_assets aa ON a.id = aa.article_id
    WHERE aa.asset_symbol = ?
      AND a.published_at < ?
      AND a.published_at > datetime(?, '-30 days')
    ORDER BY a.published_at DESC
    LIMIT 20
  `).all(asset.symbol, date, date) as any[];

  // Check for false positives in L1
  const falsePositives: string[] = [];
  for (const a of l1Articles.slice(0, 10)) {
    const titleLow = a.title.toLowerCase();
    const nameLow = asset.name.toLowerCase();
    const tickerClean = asset.symbol.replace(/\..+$/, "").toLowerCase();
    const firstName = nameLow.split(/\s+/)[0];

    const hasName = titleLow.includes(nameLow) || (firstName.length >= 4 && titleLow.includes(firstName));
    const hasTicker = tickerClean.length >= 3 && (` ${titleLow} `).includes(` ${tickerClean} `);

    if (!hasName && !hasTicker) {
      falsePositives.push(a.title.slice(0, 80));
    }
  }

  results.push({
    symbol: asset.symbol,
    name: asset.name,
    changePct: asset.changePct,
    dbArticlesL1: l1Articles.length,
    dbArticlesAll: allArticles.length,
    sampleTitles: l1Articles.slice(0, 3).map(a => {
      const d = a.published_at.split("T")[0];
      return `[${d}] ${a.title.slice(0, 90)}`;
    }),
    falsePositives,
  });
}

// Sort by L1 count desc
results.sort((a, b) => b.dbArticlesL1 - a.dbArticlesL1);

// Summary table
console.log("Symbol       Name                  Chg%    L1  All  FP  Status");
console.log("─".repeat(75));
for (const r of results) {
  const status = r.falsePositives.length > 0
    ? `⚠ ${r.falsePositives.length} FP`
    : r.dbArticlesL1 === 0
      ? "∅ empty"
      : "✓ ok";
  console.log(
    `${r.symbol.padEnd(13)}${r.name.slice(0, 20).padEnd(22)}${(r.changePct >= 0 ? "+" : "") + r.changePct.toFixed(1) + "%"}`.padEnd(45) +
    `${String(r.dbArticlesL1).padStart(3)}  ${String(r.dbArticlesAll).padStart(3)}  ${String(r.falsePositives.length).padStart(2)}  ${status}`
  );
}

// Show false positives detail
const withFP = results.filter(r => r.falsePositives.length > 0);
if (withFP.length > 0) {
  console.log(`\n── FALSE POSITIVES DETAIL (${withFP.length} assets) ──\n`);
  for (const r of withFP) {
    console.log(`${r.symbol} (${r.name}):`);
    for (const fp of r.falsePositives) {
      console.log(`  ✗ "${fp}"`);
    }
  }
}

// Show assets with good coverage
const wellCovered = results.filter(r => r.dbArticlesL1 >= 3 && r.falsePositives.length === 0);
console.log(`\n── WELL COVERED (${wellCovered.length} assets, ≥3 L1 articles, 0 FP) ──\n`);
for (const r of wellCovered) {
  console.log(`${r.symbol} (${r.name}) — ${r.dbArticlesL1} articles L1:`);
  for (const t of r.sampleTitles) {
    console.log(`  ${t}`);
  }
}

// Show empty assets
const empty = results.filter(r => r.dbArticlesL1 === 0);
console.log(`\n── NO HISTORICAL ARTICLES (${empty.length} assets) ──\n`);
for (const r of empty) {
  console.log(`  ${r.symbol.padEnd(13)} ${r.name} (all layers: ${r.dbArticlesAll})`);
}

// ── 4. News clusters: historical check ──
console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  PART 4: CLUSTERS — historical context quality             ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

for (const c of flagged.newsClusters.slice(0, 8)) {
  const articles = db.searchByAssetBefore(c.symbol, date, { days: 30, limit: 10 });
  // Relevance filter
  const relevant = articles.filter(a => {
    const titleLow = a.title.toLowerCase();
    const nameLow = c.name.toLowerCase();
    const tickerClean = c.symbol.replace(/\..+$/, "").toLowerCase();
    const firstName = nameLow.split(/\s+/)[0];
    if (tickerClean.length >= 3 && (` ${titleLow} `).includes(` ${tickerClean} `)) return true;
    if (titleLow.includes(nameLow)) return true;
    if (firstName.length >= 5 && titleLow.includes(firstName)) return true;
    return false;
  });

  const noise = articles.length - relevant.length;
  console.log(`${c.symbol.padEnd(10)} ${c.name.padEnd(20)} DB:${articles.length} relevant:${relevant.length} noise:${noise}`);
  for (const a of relevant.slice(0, 3)) {
    const d = a.published_at.split("T")[0];
    console.log(`  ✓ [${d}] "${a.title.slice(0, 90)}"`);
  }
  if (noise > 0) {
    const noisy = articles.filter(a => !relevant.includes(a));
    for (const a of noisy.slice(0, 2)) {
      console.log(`  ✗ [${a.published_at.split("T")[0]}] "${a.title.slice(0, 90)}" (FP)`);
    }
  }
  console.log();
}

db.close();
rawDb.close();

console.log("=== AUDIT COMPLETE ===");
