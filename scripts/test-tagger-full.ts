/**
 * Full tagger audit: tag ALL articles (DB + snapshot), show ALL matched symbols.
 * Verifies the unified tagger (DIRECT_MATCH_RULES + causal + metadata) across 700+ stocks.
 *
 * Usage: npx tsx scripts/test-tagger-full.ts [date] [--snapshot-only]
 */
import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import type { DailySnapshot } from "@yt-maker/core";
import { initTagger, tagArticleAuto } from "../packages/ai/src/memory/news-tagger";
import { normalizeText } from "../packages/ai/src/memory/tagging-rules";

const date = process.argv[2] || "2026-03-16";
const snapshotOnly = process.argv.includes("--snapshot-only");

initTagger();

// ── Load articles: DB (all) or snapshot only ──
interface Article { title: string; source: string; summary?: string }
const articles: Article[] = [];

if (snapshotOnly) {
  const snapshotPath = path.resolve("data", `snapshot-${date}.json`);
  if (!fs.existsSync(snapshotPath)) {
    const files = fs.readdirSync("data").filter(f => f.startsWith("snapshot-") && f.endsWith(".json"));
    console.error(`Snapshot not found. Available: ${files.slice(-5).join(", ")}`);
    process.exit(1);
  }
  const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  for (const n of snapshot.news ?? []) {
    articles.push({ title: n.title, source: n.source ?? "" });
  }
  console.log(`=== TAGGER FULL AUDIT — snapshot ${date} only (${articles.length} articles) ===\n`);
} else {
  const dbPath = path.resolve("data", "news-memory.db");
  if (!fs.existsSync(dbPath)) {
    console.error("news-memory.db not found");
    process.exit(1);
  }
  const db = new Database(dbPath);
  const rows = db.prepare("SELECT title, source, summary FROM articles ORDER BY published_at DESC").all() as Article[];
  articles.push(...rows);
  db.close();
  console.log(`=== TAGGER FULL AUDIT — all DB articles (${articles.length}) ===\n`);
}

// ── Tag all articles ──
interface TagHit {
  title: string;
  layer: 1 | 2 | 3;
  confidence: string;
  ruleId?: string;
}

const symbolHits = new Map<string, TagHit[]>();
const articleStats = { total: 0, withTags: 0, totalTags: 0 };

for (const article of articles) {
  articleStats.total++;
  const result = tagArticleAuto({ title: article.title, source: article.source ?? "", summary: article.summary });

  if (result.assets.length > 0) articleStats.withTags++;
  articleStats.totalTags += result.assets.length;

  for (const tag of result.assets) {
    const hits = symbolHits.get(tag.symbol) ?? [];
    hits.push({
      title: article.title,
      layer: tag.source_layer,
      confidence: tag.confidence,
    });
    symbolHits.set(tag.symbol, hits);
  }
}

console.log(`Articles tagged: ${articleStats.withTags}/${articleStats.total}`);
console.log(`Total tags: ${articleStats.totalTags}`);
console.log(`Unique symbols: ${symbolHits.size}\n`);

// ── Sort by hit count ──
const sorted = [...symbolHits.entries()].sort((a, b) => b[1].length - a[1].length);

// ── Classify: watchlist vs hors-watchlist ──
// Load watchlist from snapshot if available
const snapshotForWL = (() => {
  try {
    const sp = path.resolve("data", `snapshot-${date}.json`);
    if (fs.existsSync(sp)) return JSON.parse(fs.readFileSync(sp, "utf-8")) as DailySnapshot;
  } catch {}
  return null;
})();
const watchlistSymbols = new Set(snapshotForWL?.assets.map((a: any) => a.symbol) ?? []);

// ── False positive check: does the article title actually mention the symbol/company? ──
// Load company names from indices
const indicesDir = path.resolve("data", "indices");
const companyNames = new Map<string, string>();
try {
  for (const file of fs.readdirSync(indicesDir).filter(f => f.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(indicesDir, file), "utf-8")) as { symbol: string; name: string }[];
    for (const c of data) companyNames.set(c.symbol, c.name);
  }
} catch { /* no indices */ }
// Add watchlist names
if (snapshotForWL) {
  for (const a of snapshotForWL.assets) companyNames.set(a.symbol, a.name);
}

function titleActuallyMentions(title: string, symbol: string, name?: string): boolean {
  const norm = normalizeText(title);
  const tickerClean = symbol.replace(/\..+$/, "").toLowerCase();
  const padded = ` ${norm} `;

  // Ticker match (word boundary)
  if (tickerClean.length >= 3 && padded.includes(` ${tickerClean} `)) return true;

  if (name) {
    const nameLow = name.toLowerCase();
    if (norm.includes(nameLow)) return true;
    const firstName = nameLow.split(/\s+/)[0];
    if (firstName.length >= 5 && norm.includes(firstName)) return true;
  }
  return false;
}

// ── Display results ──

// Section 1: Layer distribution
const layerCounts = { l1: 0, l2: 0, l3: 0 };
for (const [, hits] of sorted) {
  for (const h of hits) {
    if (h.layer === 1) layerCounts.l1++;
    else if (h.layer === 2) layerCounts.l2++;
    else layerCounts.l3++;
  }
}
console.log(`Tags by layer: L1=${layerCounts.l1}  L2=${layerCounts.l2}  L3=${layerCounts.l3}\n`);

// Section 2: All symbols with ≥1 hit
console.log("╔══════════════════════════════════════════════════════════════════════╗");
console.log("║  ALL TAGGED SYMBOLS (sorted by article count)                      ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

console.log("Symbol       Name                       WL?  Hits  L1  L2  L3  FP?");
console.log("─".repeat(78));

let totalFP = 0;
const fpDetails: Array<{ symbol: string; name: string; fps: string[] }> = [];

for (const [symbol, hits] of sorted) {
  const name = companyNames.get(symbol) ?? "?";
  const isWL = watchlistSymbols.has(symbol) ? "WL" : "  ";
  const l1 = hits.filter(h => h.layer === 1).length;
  const l2 = hits.filter(h => h.layer === 2).length;
  const l3 = hits.filter(h => h.layer === 3).length;

  // Check false positives (title doesn't actually mention the asset)
  const fps: string[] = [];
  for (const h of hits) {
    if (h.layer === 1 && !titleActuallyMentions(h.title, symbol, name)) {
      fps.push(h.title.slice(0, 80));
    }
  }
  totalFP += fps.length;
  if (fps.length > 0) fpDetails.push({ symbol, name, fps });

  const fpFlag = fps.length > 0 ? `⚠${fps.length}` : "  ";

  console.log(
    `${symbol.padEnd(13)}${name.slice(0, 25).padEnd(27)}${isWL}   ${String(hits.length).padStart(3)}  ${String(l1).padStart(2)}  ${String(l2).padStart(2)}  ${String(l3).padStart(2)}  ${fpFlag}`
  );
}

// Section 3: False positives detail
if (fpDetails.length > 0) {
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  FALSE POSITIVES DETAIL (L1 tags where title doesn't mention it)  ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝\n`);

  for (const { symbol, name, fps } of fpDetails) {
    console.log(`${symbol} (${name}):`);
    for (const fp of fps.slice(0, 5)) {
      console.log(`  ✗ "${fp}"`);
    }
    if (fps.length > 5) console.log(`  ... +${fps.length - 5} more`);
    console.log();
  }
}

// Section 4: Sample titles for top symbols (verification)
console.log("╔══════════════════════════════════════════════════════════════════════╗");
console.log("║  TOP 15 SYMBOLS — sample articles                                 ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

for (const [symbol, hits] of sorted.slice(0, 15)) {
  const name = companyNames.get(symbol) ?? "?";
  console.log(`${symbol} (${name}) — ${hits.length} articles:`);
  // Show up to 3 L1 hits first
  const l1Hits = hits.filter(h => h.layer === 1);
  const l2Hits = hits.filter(h => h.layer === 2);
  for (const h of l1Hits.slice(0, 3)) {
    console.log(`  [L1] "${h.title.slice(0, 100)}"`);
  }
  for (const h of l2Hits.slice(0, 2)) {
    console.log(`  [L2] "${h.title.slice(0, 100)}"`);
  }
  console.log();
}

// Summary
console.log("═".repeat(78));
console.log(`SUMMARY: ${symbolHits.size} symbols tagged from ${articleStats.total} articles`);
console.log(`  Watchlist: ${sorted.filter(([s]) => watchlistSymbols.has(s)).length} symbols tagged`);
console.log(`  Hors-WL:  ${sorted.filter(([s]) => !watchlistSymbols.has(s)).length} symbols tagged`);
console.log(`  L1 FP:    ${totalFP} false positives across ${fpDetails.length} symbols`);
console.log(`=== AUDIT COMPLETE ===`);
