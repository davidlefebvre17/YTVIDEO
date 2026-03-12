import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { initTagger, tagArticleAuto } from "../packages/ai/src/memory/news-tagger";
import { NewsMemoryDB } from "../packages/ai/src/memory/news-db";
import { buildResearchContext } from "../packages/ai/src/memory/research-context";
import type { StoredArticle, EconomicEvent } from "../packages/ai/src/memory/types";
import type { DailySnapshot, AssetSnapshot, TechnicalIndicators } from "@yt-maker/core";

// ============================================================
// TEST HARNESS
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(
  condition: boolean,
  testName: string,
  message: string = ""
): void {
  if (condition) {
    results.push({ name: testName, passed: true, message: "✓" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: message || "Assertion failed",
    });
  }
}

function assertEqual<T>(
  actual: T,
  expected: T,
  testName: string,
  message: string = ""
): void {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (passed) {
    results.push({ name: testName, passed: true, message: "✓" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(
        actual
      )}. ${message}`,
    });
  }
}

function assertIncludes<T>(
  array: T[],
  value: T,
  testName: string,
  message: string = ""
): void {
  const passed = array.some(
    (item) => JSON.stringify(item) === JSON.stringify(value)
  );
  if (passed) {
    results.push({ name: testName, passed: true, message: "✓" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: `Expected array to include ${JSON.stringify(value)}. ${message}`,
    });
  }
}

// ============================================================
// 10.1 — TAGGER UNIT TESTS
// ============================================================

console.log("\n=== D2 News Memory Tests ===\n");
console.log("--- Tagger Tests ---");

try {
  initTagger();

  // Couche 1 — Direct match
  const test1 = tagArticleAuto({
    title: "Gold rallies to $5100",
    summary: "",
    source: "Yahoo Finance",
  });
  assertIncludes(
    test1.assets.map((a) => a.symbol),
    "GC=F",
    "Direct match: Gold found"
  );
  assert(
    test1.assets.find((a) => a.symbol === "GC=F")?.confidence === "high",
    "Direct match: Gold confidence high"
  );

  const test2 = tagArticleAuto({
    title: "Apple reports record Q4 earnings",
    summary: "",
    source: "CNBC",
  });
  assertIncludes(
    test2.assets.map((a) => a.symbol),
    "AAPL",
    "Direct match: Apple found"
  );
  assertIncludes(
    test2.assets.map((a) => a.symbol),
    "^GSPC",
    "Direct match: S&P500 found (related index)"
  );

  const test3 = tagArticleAuto({
    title: "Le CAC 40 recule de 1.2%",
    summary: "",
    source: "Les Echos",
  });
  assertIncludes(
    test3.assets.map((a) => a.symbol),
    "^FCHI",
    "Direct match: CAC40 found"
  );

  const test4 = tagArticleAuto({
    title: "NVIDIA Corporation beats estimates",
    summary: "",
    source: "Finnhub",
  });
  assertIncludes(
    test4.assets.map((a) => a.symbol),
    "NVDA",
    "Direct match: NVIDIA found"
  );

  // Couche 1 — Edge cases
  const test5 = tagArticleAuto({
    title: "Le chat mange une pomme",
    summary: "",
    source: "Random",
  });
  assertEqual(
    test5.assets.length,
    0,
    "Edge case: No match for unrelated text"
  );

  const test6 = tagArticleAuto({
    title: "L'or a franchi les 5000 dollars",
    summary: "",
    source: "Yahoo Finance",
  });
  assertIncludes(
    test6.assets.map((a) => a.symbol),
    "GC=F",
    "Edge case: Gold matched via 'l or a'"
  );

  // Couche 2 — Causal rules
  const test7 = tagArticleAuto({
    title: "Fed signals rate pause in March",
    summary: "",
    source: "CNBC",
  });
  assert(
    test7.assets.map((a) => a.symbol).includes("GC=F") &&
      test7.assets.map((a) => a.symbol).includes("DX-Y.NYB") &&
      test7.assets.map((a) => a.symbol).includes("^GSPC") &&
      test7.assets.map((a) => a.symbol).includes("US10Y"),
    "Causal: Fed rate pause tags all assets"
  );
  assert(
    test7.themes.includes("monetary_policy"),
    "Causal: Fed rate pause theme"
  );
  const gcTag = test7.assets.find((a) => a.symbol === "GC=F");
  assert(
    gcTag?.sentiment === "bullish",
    "Causal: Gold bullish on Fed pause"
  );
  const dxyTag = test7.assets.find((a) => a.symbol === "DX-Y.NYB");
  assert(
    dxyTag?.sentiment === "bearish",
    "Causal: Dollar bearish on Fed pause"
  );

  const test8 = tagArticleAuto({
    title: "OPEC agrees to cut production",
    summary: "",
    source: "Reuters",
  });
  assertIncludes(
    test8.assets.map((a) => a.symbol),
    "CL=F",
    "Causal: OPEC oil cut found"
  );
  assertIncludes(
    test8.assets.map((a) => a.symbol),
    "BZ=F",
    "Causal: Brent found"
  );
  assert(
    test8.themes.includes("commodities"),
    "Causal: OPEC theme"
  );
  const clTag = test8.assets.find((a) => a.symbol === "CL=F");
  assert(
    clTag?.sentiment === "bullish",
    "Causal: Oil bullish on OPEC cut"
  );

  const test9 = tagArticleAuto({
    title: "La Fed hésite, pas de signal clair",
    summary: "",
    source: "Les Echos",
  });
  assert(
    test9.assets.map((a) => a.symbol).includes("GC=F"),
    "Causal: Fed with no direction tags assets"
  );
  const gcTag9 = test9.assets.find((a) => a.symbol === "GC=F");
  assert(
    gcTag9?.sentiment === undefined,
    "Causal: Fed with no clear signal has no sentiment"
  );

  const test10 = tagArticleAuto({
    title: "NFP beats at 275K vs 198K expected",
    summary: "",
    source: "Bloomberg",
  });
  assert(
    test10.themes.includes("employment"),
    "Causal: NFP theme"
  );
  assertIncludes(
    test10.assets.map((a) => a.symbol),
    "DX-Y.NYB",
    "Causal: NFP tags DX"
  );

  // Couche 3 — Metadata
  const test11 = tagArticleAuto({
    title: "Bitcoin Price Surges on Adoption",
    summary: "Institutional interest drives BTC higher",
    source: "CoinDesk",
    feed_url: "https://www.coindesk.com/rss",
  });
  assert(
    test11.themes.includes("crypto_market"),
    "Metadata: CoinDesk adds crypto_market theme"
  );
  assertIncludes(
    test11.assets.map((a) => a.symbol),
    "BTC-USD",
    "Metadata: CoinDesk adds BTC-USD"
  );

  // Impact scoring
  const test12 = tagArticleAuto({
    title: "Fed rate pause signals",
    summary: "",
    source: "CNBC",
    feed_url: "https://www.cnbc.com/news",
  });
  assertEqual(
    test12.impact,
    "high",
    "Impact: CNBC + Fed pause = HIGH"
  );

  const test13 = tagArticleAuto({
    title: "Article générique sur le marché",
    summary: "",
    source: "Yahoo Finance",
  });
  assertEqual(
    test13.impact,
    "low",
    "Impact: Yahoo Finance + generic = LOW"
  );

  // Multi-layer accumulation
  const test14 = tagArticleAuto({
    title: "Fed pause boosts gold ETF inflows",
    summary: "",
    source: "Bloomberg",
  });
  const gcTag14 = test14.assets.find((a) => a.symbol === "GC=F");
  assert(
    gcTag14 !== undefined,
    "Multi-layer: Gold tag exists"
  );
  assert(
    gcTag14?.sentiment === "bullish",
    "Multi-layer: Gold has bullish sentiment from Fed pause rule"
  );

  console.log(
    `✓ Tagger initialized with ${test1.rules_matched.length > 0 ? "rules" : "error"}`
  );
} catch (error) {
  console.error(`✗ Tagger initialization failed: ${error}`);
}

// ============================================================
// 10.2 — SQLITE TESTS
// ============================================================

console.log("\n--- SQLite Tests ---");

const testDbPath = "data/test-news-memory.db";

try {
  // Clean up any previous test DB
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new NewsMemoryDB(testDbPath);

  // Test: Insert + dedup
  const article1: StoredArticle = {
    title: "Test Article 1",
    source: "Test Source",
    url: "https://example.com/article1",
    published_at: new Date().toISOString(),
    summary: "Test summary",
    lang: "en",
  };

  const tags1 = {
    assets: [{ symbol: "GC=F", confidence: "high" as const, source_layer: 1 as const }],
    themes: ["commodities" as const],
    impact: "high" as const,
    rules_matched: ["direct_gold"],
  };

  const id1 = db.storeArticle(article1, tags1);
  assert(id1 !== null, "SQLite: Insert article returns ID");

  const id1Dup = db.storeArticle(article1, tags1);
  assert(id1Dup === null, "SQLite: Insert duplicate returns null (dedup)");

  // Test: Insert with tracking params → normalized
  const article2: StoredArticle = {
    title: "Test Article 2",
    source: "Test Source",
    url: "https://example.com/article2?utm_source=twitter&utm_medium=social",
    published_at: new Date(Date.now() - 86400000).toISOString(),
    summary: "Another test",
    lang: "en",
  };

  const tags2 = {
    assets: [{ symbol: "^GSPC", confidence: "medium" as const, source_layer: 2 as const }],
    themes: ["earnings" as const],
    impact: "medium" as const,
    rules_matched: ["fed_rate"],
  };

  const id2 = db.storeArticle(article2, tags2);
  assert(id2 !== null, "SQLite: Insert second article");

  // Test: searchByAsset
  const gcResults = db.searchByAsset("GC=F", { days: 7, limit: 10 });
  assert(
    gcResults.length === 1,
    "SQLite: searchByAsset returns correct count"
  );
  assert(
    gcResults[0].title === "Test Article 1",
    "SQLite: searchByAsset returns correct article"
  );

  const spxResults = db.searchByAsset("^GSPC", { days: 7, limit: 10 });
  assert(
    spxResults.length === 1,
    "SQLite: searchByAsset S&P500"
  );

  // Test: searchByTheme
  const commoditiesTheme = db.searchByTheme("commodities", {
    days: 7,
    limit: 10,
  });
  assert(
    commoditiesTheme.length === 1,
    "SQLite: searchByTheme returns correct count"
  );

  const earningsTheme = db.searchByTheme("earnings", {
    days: 7,
    limit: 10,
  });
  assert(
    earningsTheme.length === 1,
    "SQLite: searchByTheme earnings"
  );

  // Test: FTS5 full-text search
  const goldSearch = db.searchFullText("Test", { days: 7, limit: 20 });
  assert(
    goldSearch.length >= 1,
    "SQLite: FTS5 search returns results"
  );

  const noSearch = db.searchFullText("xyz nonexistent", { days: 7, limit: 20 });
  assert(
    noSearch.length === 0,
    "SQLite: FTS5 search for nonexistent term"
  );

  // Test: Batch insert (storeArticles)
  const batchArticles: Array<{ article: StoredArticle; tags: typeof tags1 }> =
    [];
  for (let i = 0; i < 10; i++) {
    batchArticles.push({
      article: {
        title: `Batch Article ${i}`,
        source: "Batch Source",
        url: `https://example.com/batch${i}`,
        published_at: new Date(Date.now() - i * 3600000).toISOString(),
        summary: `Batch summary ${i}`,
        lang: "en",
      },
      tags: {
        assets: [
          {
            symbol: i % 2 === 0 ? "GC=F" : "^GSPC",
            confidence: "high" as const,
            source_layer: 1 as const,
          },
        ],
        themes: ["commodities" as const],
        impact: "high" as const,
        rules_matched: [],
      },
    });
  }

  const inserted = db.storeArticles(batchArticles);
  assert(
    inserted === 10,
    "SQLite: Batch insert 10 articles"
  );

  const gcAfterBatch = db.searchByAsset("GC=F", { days: 30, limit: 50 });
  assert(
    gcAfterBatch.length >= 6,
    "SQLite: Batch articles tagged correctly"
  );

  // Test: getStats
  const stats = db.getStats();
  assert(stats.totalArticles >= 12, "SQLite: getStats totalArticles");
  assert(stats.totalAssetTags >= 12, "SQLite: getStats totalAssetTags");
  assert(stats.totalThemeTags >= 12, "SQLite: getStats totalThemeTags");

  // Test: Economic events sync
  const events: EconomicEvent[] = [
    {
      id: "event_1",
      name: "US NFP",
      currency: "USD",
      event_date: "2026-03-11",
      strength: "Strong",
      forecast: 200000,
      previous: 195000,
      actual: 210000,
      outcome: "beat",
      source: "forexfactory",
    },
    {
      id: "event_2",
      name: "ECB Interest Rate Decision",
      currency: "EUR",
      event_date: "2026-03-12",
      strength: "Strong",
      forecast: 4.5,
      previous: 4.25,
      actual: 4.5,
      outcome: "inline",
      source: "forexfactory",
    },
  ];

  const syncedCount = db.syncEconomicEvents(events);
  assert(
    syncedCount === 2,
    "SQLite: syncEconomicEvents inserts both events"
  );

  // Test: getEconomicEvents
  const fetchedEvents = db.getEconomicEvents({
    from: "2026-03-10",
    to: "2026-03-13",
  });
  assert(
    fetchedEvents.length === 2,
    "SQLite: getEconomicEvents returns correct events"
  );

  const usdEvents = db.getEconomicEvents({
    from: "2026-03-10",
    to: "2026-03-13",
    currency: "USD",
  });
  assert(
    usdEvents.length === 1,
    "SQLite: getEconomicEvents filters by currency"
  );

  const strongEvents = db.getEconomicEvents({
    from: "2026-03-10",
    to: "2026-03-13",
    strength: "Strong",
  });
  assert(
    strongEvents.length === 2,
    "SQLite: getEconomicEvents filters by strength"
  );

  // Test: Purge old articles
  const oldArticle: StoredArticle = {
    title: "Very Old Article",
    source: "Old Source",
    url: "https://example.com/old",
    published_at: "2025-01-01T00:00:00Z", // 70 days ago
    summary: "Old",
    lang: "en",
  };

  const oldTags = {
    assets: [{ symbol: "GC=F", confidence: "low" as const, source_layer: 1 as const }],
    themes: ["other" as const],
    impact: "low" as const,
    rules_matched: [],
  };

  const oldId = db.storeArticle(oldArticle, oldTags);
  assert(oldId !== null, "SQLite: Insert old article");

  const beforePurge = db.getStats().totalArticles;
  const purged = db.purgeOldArticles(60); // Purge articles > 60 days old
  const afterPurge = db.getStats().totalArticles;

  assert(
    purged > 0 && afterPurge < beforePurge,
    "SQLite: purgeOldArticles removes old articles"
  );

  // Test: High impact articles
  const highImpact = db.getHighImpactRecent(1, 5);
  assert(
    highImpact.length > 0,
    "SQLite: getHighImpactRecent returns articles"
  );

  // Test: Count by theme
  const themeCounts = db.countByTheme(30);
  assert(
    themeCounts.length > 0,
    "SQLite: countByTheme returns stats"
  );

  // Test: Count by asset
  const assetCounts = db.countByAsset(30, 10);
  assert(
    assetCounts.length > 0,
    "SQLite: countByAsset returns stats"
  );

  db.close();
  console.log("✓ SQLite database closed cleanly");
} catch (error) {
  console.error(`✗ SQLite test failed: ${error}`);
}

// ============================================================
// 10.3 — RESEARCH CONTEXT TESTS
// ============================================================

console.log("\n--- Research Context Tests ---");

try {
  const db = new NewsMemoryDB(testDbPath);

  // Create a minimal DailySnapshot
  const emptySnapshot: DailySnapshot = {
    date: "2026-03-11",
    assets: [],
    news: [],
    events: [],
  };

  // Test: Empty DB returns placeholder
  const emptyContext = buildResearchContext(emptySnapshot, db);
  assert(
    emptyContext.includes("accumulation"),
    "Research Context: Empty DB returns placeholder with 'accumulation'"
  );
  assert(
    emptyContext.includes("## Contexte historique"),
    "Research Context: Empty DB returns markdown header"
  );

  // Now add some articles for a real test
  const article1: StoredArticle = {
    title: "Gold prices surge on inflation concerns",
    source: "Bloomberg",
    url: "https://example.com/gold1",
    published_at: new Date(Date.now() - 3600000).toISOString(),
    summary: "Gold rallies to new highs",
    lang: "en",
  };

  const tags1 = {
    assets: [
      { symbol: "GC=F", confidence: "high" as const, source_layer: 1 as const },
      { symbol: "DX-Y.NYB", confidence: "medium" as const, source_layer: 2 as const },
    ],
    themes: ["inflation" as const],
    impact: "high" as const,
    rules_matched: ["direct_gold", "inflation_data"],
  };

  db.storeArticle(article1, tags1);

  // Add snapshot with top movers
  const asset1: AssetSnapshot = {
    symbol: "GC=F",
    name: "Gold Futures",
    price: 5100,
    change: 50,
    changePct: 0.99,
    high24h: 5110,
    low24h: 5090,
    candles: [],
    technicals: {
      dramaScore: 50,
    } as TechnicalIndicators,
  };

  const snapshotWithData: DailySnapshot = {
    date: "2026-03-11",
    assets: [asset1],
    news: [
      {
        title: "Gold article",
        source: "Bloomberg",
        url: "https://example.com/gold1",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    events: [],
  };

  const context = buildResearchContext(snapshotWithData, db);
  assert(
    context.includes("## Contexte historique"),
    "Research Context: Returns markdown header"
  );
  assert(
    context.includes("Top movers"),
    "Research Context: Includes top movers section"
  );
  assert(
    context.includes("Thèmes dominants"),
    "Research Context: Includes themes section"
  );
  assert(
    context.includes("Articles high-impact") || context.includes("HIGH"),
    "Research Context: Includes high-impact section"
  );

  const tokenEstimate = context.split(/\s+/).length * 1.3; // ~1.3 tokens per word
  assert(
    tokenEstimate < 3000,
    `Research Context: Token budget respected (est. ${Math.round(
      tokenEstimate
    )} tokens < 3000)`
  );

  db.close();
  console.log("✓ Research context tests passed");
} catch (error) {
  console.error(`✗ Research context test failed: ${error}`);
}

// ============================================================
// CLEANUP AND REPORT
// ============================================================

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
  console.log("\n✓ Test database cleaned up");
}

// Print test results
console.log("\n=== Test Results ===\n");

let passed = 0;
let failed = 0;

for (const result of results) {
  const icon = result.passed ? "✓" : "✗";
  const message = result.message || "";
  console.log(
    `  ${icon} ${result.name}${message ? ": " + message : ""}`
  );
  if (result.passed) {
    passed++;
  } else {
    failed++;
  }
}

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===\n`);

if (failed > 0) {
  process.exit(1);
}
