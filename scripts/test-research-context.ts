/**
 * Test script: show what buildResearchContext() produces for a given snapshot.
 * Usage: npx tsx scripts/test-research-context.ts [date]
 */
import * as fs from "fs";
import * as path from "path";
import { NewsMemoryDB } from "../packages/ai/src/memory/news-db";
import { buildResearchContext } from "../packages/ai/src/memory/research-context";
import type { DailySnapshot } from "@yt-maker/core";

const date = process.argv[2] || "2026-03-16";

// Find snapshot
const snapshotPath = path.resolve("data", `snapshot-${date}.json`);
if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath}`);
  // List available snapshots
  const files = fs.readdirSync("data").filter(f => f.startsWith("snapshot-") && f.endsWith(".json"));
  console.log(`Available: ${files.slice(-10).join(", ")}`);
  process.exit(1);
}

const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
console.log(`Snapshot: ${date}, ${snapshot.assets?.length ?? 0} assets, ${snapshot.news?.length ?? 0} news\n`);

// Open DB
const dbPath = path.resolve("data", "news-memory.db");
if (!fs.existsSync(dbPath)) {
  console.error(`DB not found: ${dbPath}`);
  process.exit(1);
}

const db = new NewsMemoryDB(dbPath);

// Show DB stats
try {
  const stats = db.getStats();
  console.log(`DB stats: ${JSON.stringify(stats)}\n`);
} catch (e) {
  console.log(`DB stats error: ${(e as Error).message}\n`);
}

// Detect news clusters (same as P1)
import { flagAssets } from "../packages/ai/src/pipeline/p1-flagging";
const flagged = flagAssets(snapshot);
const clusterSymbols = flagged.newsClusters.map(c => ({ symbol: c.symbol, name: c.name }));
console.log(`News clusters: ${clusterSymbols.map(c => c.symbol).join(", ") || "none"}\n`);

// Build research context
const context = buildResearchContext(snapshot, db, clusterSymbols);
console.log("=== RESEARCH CONTEXT OUTPUT ===\n");
console.log(context);
console.log(`\n=== END (${context.length} chars) ===`);

db.close();
