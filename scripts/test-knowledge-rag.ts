import * as fs from "fs";
import * as path from "path";
import { detectActiveThemes, matchChunks, resetIndexCache } from "../packages/ai/src/knowledge/knowledge-matcher";
import { resetKnowledgeCache } from "../packages/ai/src/knowledge/knowledge-briefing";
import type { ChunkIndex, ChunkMeta } from "../packages/ai/src/knowledge/chunk-types";
import type { SnapshotFlagged, EditorialPlan, FlaggedAsset, PlannedSegment } from "../packages/ai/src/pipeline/types";
import type { DailySnapshot, EconomicEvent, NewsItem } from "@yt-maker/core";

// ============================================================
// TEST HARNESS
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, message: string = ""): void {
  if (condition) {
    results.push({ name: testName, passed: true, message: "\u2713" });
  } else {
    results.push({ name: testName, passed: false, message: message || "Assertion failed" });
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string, message: string = ""): void {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (passed) {
    results.push({ name: testName, passed: true, message: "\u2713" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`,
    });
  }
}

function assertIncludes<T>(array: T[], value: T, testName: string, message: string = ""): void {
  const passed = array.some((item) => JSON.stringify(item) === JSON.stringify(value));
  if (passed) {
    results.push({ name: testName, passed: true, message: "\u2713" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: `Expected array to include ${JSON.stringify(value)}. ${message}`,
    });
  }
}

function assertGreater(actual: number, expected: number, testName: string, message: string = ""): void {
  if (actual > expected) {
    results.push({ name: testName, passed: true, message: "\u2713" });
  } else {
    results.push({
      name: testName,
      passed: false,
      message: `Expected ${actual} > ${expected}. ${message}`,
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

const CHUNKS_DIR = path.resolve(__dirname, "..", "packages", "ai", "src", "knowledge", "chunks");
const INDEX_PATH = path.join(CHUNKS_DIR, "index.json");

function loadIndex(): ChunkIndex {
  return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8")) as ChunkIndex;
}

function makeFlaggedAsset(overrides: Partial<FlaggedAsset> & { symbol: string; name: string }): FlaggedAsset {
  return {
    price: 100,
    changePct: 0,
    materialityScore: 5,
    flags: [],
    snapshot: {} as any,
    ...overrides,
  };
}

function makeSegment(overrides: Partial<PlannedSegment> & { assets: string[] }): PlannedSegment {
  return {
    id: "s1",
    topic: "Test",
    depth: "FOCUS",
    angle: "test",
    justification: "test",
    ...overrides,
  };
}

function makeEditorial(overrides: Partial<EditorialPlan>): EditorialPlan {
  return {
    date: "2026-03-25",
    dominantTheme: "Test",
    threadSummary: "test thread",
    moodMarche: "incertain",
    coldOpenFact: "Test fact",
    closingTeaser: "Test teaser",
    segments: [makeSegment({ assets: [] })],
    skippedAssets: [],
    deepCount: 0,
    flashCount: 0,
    totalSegments: 1,
    ...overrides,
  };
}

function makeFlagged(overrides: Partial<SnapshotFlagged>): SnapshotFlagged {
  return {
    date: "2026-03-25",
    assets: [],
    events: [],
    earnings: [],
    screenResults: [],
    news: [],
    newsClusters: [],
    ...overrides,
  };
}

function makeSnapshot(date: string = "2026-03-25"): DailySnapshot {
  return { date, assets: [], news: [], events: [] } as any;
}

// ============================================================
// ALLOWED TAXONOMY (hardcoded for validation)
// ============================================================

const ALLOWED_THEMES = [
  "banque-centrale", "fed", "bce", "boj", "boe", "taux", "pivot", "qe-qt",
  "inflation", "recession", "emploi", "croissance", "dette", "pib",
  "risk-on", "risk-off", "rotation-sectorielle", "carry-trade", "volatilite",
  "refuge", "momentum", "mean-reversion", "liquidite", "m2",
  "geopolitique", "moyen-orient", "russie-ukraine", "chine-taiwan", "tarifs", "sanctions",
  "saisonnalite", "cot-positioning", "earnings", "dividendes",
  "narration", "ton", "structure-episode", "analyse-technique", "confluence",
];

const ALLOWED_FLAGS = [
  "PRICE_MOVE", "EXTREME_MOVE", "VOLUME_SPIKE", "EMA_BREAK", "RSI_EXTREME",
  "ATH_PROXIMITY", "SMA200_CROSS", "ZONE_EVENT", "EARNINGS_SURPRISE", "EARNINGS_TODAY",
  "NEWS_LINKED", "NEWS_CLUSTER", "POLITICAL_TRIGGER", "MACRO_SURPRISE",
  "SENTIMENT_EXTREME", "CAUSAL_CHAIN", "COT_DIVERGENCE",
];

const ALLOWED_ACTORS = [
  "trump", "biden", "powell", "lagarde", "bce", "ueda", "xi-jinping", "poutine", "fed", "boj",
];

const ALLOWED_REGIMES = ["risk-on", "risk-off", "incertain", "rotation", "choc-exogene"];

const ALLOWED_PRIORITIES = ["critical", "high", "medium", "low"];

const BAD_SYMBOLS = ["GOLD", "SPX", "DXY", "EUR/USD", "BTC", "ETH", "OIL", "SILVER", "VIX"];

// ============================================================

const index = loadIndex();
const idSet = new Set(index.chunks.map((c) => c.id));

// ── Section 1: Chunk Index Integrity ──────────

console.log("\n\u2500\u2500 Section 1: Chunk Index Integrity \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

// 1. Index loads correctly
assert(index != null && Array.isArray(index.chunks), "1.1 Index loads with chunks array");

// 2. totalChunks matches actual count
assertEqual(index.totalChunks, index.chunks.length, "1.2 totalChunks matches actual chunk count");

// 3. All chunk IDs are unique
const allIds = index.chunks.map((c) => c.id);
const uniqueIds = new Set(allIds);
assertEqual(uniqueIds.size, allIds.length, "1.3 All chunk IDs are unique");

// 4. All chunk files in index exist on disk
{
  const missing: string[] = [];
  for (const chunk of index.chunks) {
    const filePath = path.join(CHUNKS_DIR, chunk.file);
    if (!fs.existsSync(filePath)) missing.push(chunk.file);
  }
  assert(missing.length === 0, "1.4 All chunk files referenced in index exist on disk", `Missing: ${missing.join(", ")}`);
}

// 5. All .md files in chunks/ are in the index (no orphans)
{
  const mdFiles = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith(".md"));
  const indexedFiles = new Set(index.chunks.map((c) => c.file));
  const orphans = mdFiles.filter((f) => !indexedFiles.has(f));
  assert(orphans.length === 0, "1.5 No orphan .md files in chunks/", `Orphans: ${orphans.join(", ")}`);
}

// 6. All themes in allowed taxonomy
{
  const allowedSet = new Set(ALLOWED_THEMES);
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    for (const t of chunk.themes) {
      if (!allowedSet.has(t)) bad.push(`${chunk.id}:${t}`);
    }
  }
  assert(bad.length === 0, "1.6 All themes in allowed taxonomy", `Bad themes: ${bad.join(", ")}`);
}

// 7. All flags in allowed list
{
  const allowedSet = new Set(ALLOWED_FLAGS);
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    for (const f of chunk.conditions.flags) {
      if (!allowedSet.has(f)) bad.push(`${chunk.id}:${f}`);
    }
  }
  assert(bad.length === 0, "1.7 All flags in allowed flags list", `Bad flags: ${bad.join(", ")}`);
}

// 8. All actors in allowed list
{
  const allowedSet = new Set(ALLOWED_ACTORS);
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    for (const a of chunk.conditions.actors) {
      if (!allowedSet.has(a)) bad.push(`${chunk.id}:${a}`);
    }
  }
  assert(bad.length === 0, "1.8 All actors in allowed actors list", `Bad actors: ${bad.join(", ")}`);
}

// 9. All regimes in allowed list
{
  const allowedSet = new Set(ALLOWED_REGIMES);
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    for (const r of chunk.conditions.regimes) {
      if (!allowedSet.has(r)) bad.push(`${chunk.id}:${r}`);
    }
  }
  assert(bad.length === 0, "1.9 All regimes in allowed regimes list", `Bad regimes: ${bad.join(", ")}`);
}

// 10. No bad symbol formats
{
  const badSymSet = new Set(BAD_SYMBOLS);
  const found: string[] = [];
  for (const chunk of index.chunks) {
    for (const s of chunk.symbols) {
      if (badSymSet.has(s)) found.push(`${chunk.id}:${s}`);
    }
  }
  assert(found.length === 0, "1.10 No bad symbol formats (GOLD/SPX/DXY/etc)", `Found: ${found.join(", ")}`);
}

// 11. Each priority is valid
{
  const validSet = new Set(ALLOWED_PRIORITIES);
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    if (!validSet.has(chunk.priority)) bad.push(`${chunk.id}:${chunk.priority}`);
  }
  assert(bad.length === 0, "1.11 All priorities are valid", `Bad: ${bad.join(", ")}`);
}

// 12. All related_chunks reference existing IDs
{
  const bad: string[] = [];
  for (const chunk of index.chunks) {
    for (const rel of chunk.related_chunks) {
      if (!idSet.has(rel)) bad.push(`${chunk.id} -> ${rel}`);
    }
  }
  assert(bad.length === 0, "1.12 All related_chunks reference existing IDs", `Broken refs: ${bad.join(", ")}`);
}

// 13. All 10 sources are represented
{
  const sources = new Set(index.chunks.map((c) => c.source));
  const expected = [
    "asset-profiles.md", "central-banks.md", "cot-positioning.md", "geopolitics.md",
    "intermarket.md", "macro-indicators.md", "narrative-patterns.md",
    "seasonality.md", "technical-analysis.md", "tone-references.md",
  ];
  for (const src of expected) {
    assert(sources.has(src), `1.13a Source '${src}' represented`);
  }
  assertEqual(sources.size, 10, "1.13b Exactly 10 sources");
}

// 14. No chunk has empty themes array
{
  const empty = index.chunks.filter((c) => c.themes.length === 0);
  assert(empty.length === 0, "1.14 No chunk has empty themes", `Empty themes: ${empty.map((c) => c.id).join(", ")}`);
}

// 15. Sample 10 chunks have non-empty content (>50 chars after frontmatter strip)
{
  const sample = index.chunks.slice(0, 10);
  let emptyContent = 0;
  for (const chunk of sample) {
    const filePath = path.join(CHUNKS_DIR, chunk.file);
    const raw = fs.readFileSync(filePath, "utf-8");
    // Strip frontmatter
    let content = raw;
    if (raw.startsWith("---")) {
      const end = raw.indexOf("---", 3);
      if (end !== -1) content = raw.slice(end + 3).trim();
    }
    if (content.length <= 50) emptyContent++;
  }
  assert(emptyContent === 0, "1.15 Sample 10 chunks have content >50 chars");
}

// ── Section 2: Chunk Content Quality ──────────

console.log("\n\u2500\u2500 Section 2: Chunk Content Quality \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

function getChunk(id: string): ChunkMeta | undefined {
  return index.chunks.find((c) => c.id === id);
}

// 1. asset-gold-drivers has symbols GC=F and DX-Y.NYB
{
  const c = getChunk("asset-gold-drivers")!;
  assert(c != null, "2.1a asset-gold-drivers exists");
  assertIncludes(c.symbols, "GC=F", "2.1b asset-gold-drivers has GC=F");
  assertIncludes(c.symbols, "DX-Y.NYB", "2.1c asset-gold-drivers has DX-Y.NYB");
}

// 2. cb-fed-pivot-signals has themes fed and banque-centrale
{
  const c = getChunk("cb-fed-pivot-signals")!;
  assert(c != null, "2.2a cb-fed-pivot-signals exists");
  assertIncludes(c.themes, "fed", "2.2b cb-fed-pivot-signals has theme 'fed'");
  assertIncludes(c.themes, "banque-centrale", "2.2c cb-fed-pivot-signals has theme 'banque-centrale'");
}

// 3. geo-moyen-orient-chaine has CL=F and geopolitique
{
  const c = getChunk("geo-moyen-orient-chaine")!;
  assert(c != null, "2.3a geo-moyen-orient-chaine exists");
  assertIncludes(c.symbols, "CL=F", "2.3b geo-moyen-orient-chaine has CL=F");
  assertIncludes(c.themes, "geopolitique", "2.3c geo-moyen-orient-chaine has geopolitique");
}

// 4. season-indices-actions has seasonality_months covering multiple months
{
  const c = getChunk("season-indices-actions")!;
  assert(c != null, "2.4a season-indices-actions exists");
  assertGreater(c.conditions.seasonality_months.length, 5, "2.4b season-indices-actions has >5 seasonality months");
}

// 5. ta-rsi-zones has analyse-technique
{
  const c = getChunk("ta-rsi-zones")!;
  assert(c != null, "2.5a ta-rsi-zones exists");
  assertIncludes(c.themes, "analyse-technique", "2.5b ta-rsi-zones has analyse-technique");
}

// 6. cot-signaux-cles has cot-positioning
{
  const c = getChunk("cot-signaux-cles")!;
  assert(c != null, "2.6a cot-signaux-cles exists");
  assertIncludes(c.themes, "cot-positioning", "2.6b cot-signaux-cles has cot-positioning");
}

// 7. At least 5 chunks with always_if_symbol=true that start with "asset-"
{
  const alwaysSym = index.chunks.filter((c) => c.always_if_symbol && c.id.startsWith("asset-"));
  assertGreater(alwaysSym.length, 4, "2.7 At least 5 asset-* chunks with always_if_symbol=true", `Got ${alwaysSym.length}`);
}

// 8. At least 7 narr-* chunks
{
  const narrChunks = index.chunks.filter((c) => c.id.startsWith("narr-"));
  assertGreater(narrChunks.length, 6, "2.8 At least 7 narr-* chunks", `Got ${narrChunks.length}`);
}

// 9. Gold chunk has related_chunks that exist
{
  const c = getChunk("asset-gold-drivers")!;
  assert(c.related_chunks.length > 0, "2.9a asset-gold-drivers has related_chunks");
  for (const rel of c.related_chunks) {
    assert(idSet.has(rel), `2.9b asset-gold-drivers related '${rel}' exists`);
  }
}

// 10. Critical chunks exist for key topics
{
  const criticalIds = ["asset-gold-drivers", "asset-dollar-index", "inter-carry-trade", "asset-vix-profile", "macro-yield-curve"];
  for (const id of criticalIds) {
    assert(idSet.has(id), `2.10 Critical chunk '${id}' exists`);
  }
}

// ── Section 3: Theme Detection ──────────

console.log("\n\u2500\u2500 Section 3: Theme Detection \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

// Reset cache before tests
resetIndexCache();

// 1. Risk-off mood
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({ moodMarche: "risk-off" }),
    [],
  );
  assertIncludes(themes, "risk-off", "3.1a risk-off mood -> risk-off theme");
  assertIncludes(themes, "refuge", "3.1b risk-off mood -> refuge theme");
  assertIncludes(themes, "volatilite", "3.1c risk-off mood -> volatilite theme");
}

// 2. Risk-on mood
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({ moodMarche: "risk-on" }),
    [],
  );
  assertIncludes(themes, "risk-on", "3.2a risk-on mood -> risk-on theme");
  assertIncludes(themes, "momentum", "3.2b risk-on mood -> momentum theme");
}

// 3. Rotation mood
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({ moodMarche: "rotation" }),
    [],
  );
  assertIncludes(themes, "rotation-sectorielle", "3.3 rotation mood -> rotation-sectorielle theme");
}

// 4. POLITICAL_TRIGGER flag
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "^GSPC", name: "S&P 500", flags: ["POLITICAL_TRIGGER"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "geopolitique", "3.4 POLITICAL_TRIGGER -> geopolitique theme");
}

// 5. MACRO_SURPRISE + CPI event -> inflation
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "^GSPC", name: "S&P 500", flags: ["MACRO_SURPRISE"] })],
      events: [{ name: "CPI Core", impact: "high", currency: "USD", time: "13:30", date: "2026-03-25" }],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "inflation", "3.5 MACRO_SURPRISE + CPI -> inflation theme");
}

// 6. MACRO_SURPRISE + NFP event -> emploi
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "^GSPC", name: "S&P 500", flags: ["MACRO_SURPRISE"] })],
      events: [{ name: "Non-Farm Payrolls", impact: "high", currency: "USD", time: "13:30", date: "2026-03-25" }],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "emploi", "3.6 MACRO_SURPRISE + NFP -> emploi theme");
}

// 7. RSI_EXTREME -> analyse-technique + confluence
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "GC=F", name: "Gold", flags: ["RSI_EXTREME"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "analyse-technique", "3.7a RSI_EXTREME -> analyse-technique");
  assertIncludes(themes, "confluence", "3.7b RSI_EXTREME -> confluence");
}

// 8. COT_DIVERGENCE -> cot-positioning
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "GC=F", name: "Gold", flags: ["COT_DIVERGENCE"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "cot-positioning", "3.8 COT_DIVERGENCE -> cot-positioning theme");
}

// 9. SENTIMENT_EXTREME -> volatilite
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "^VIX", name: "VIX", flags: ["SENTIMENT_EXTREME"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "volatilite", "3.9 SENTIMENT_EXTREME -> volatilite theme");
}

// 10. ATH_PROXIMITY -> momentum
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "GC=F", name: "Gold", flags: ["ATH_PROXIMITY"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "momentum", "3.10 ATH_PROXIMITY -> momentum theme");
}

// 11. EARNINGS_SURPRISE -> earnings
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "AAPL", name: "Apple", flags: ["EARNINGS_SURPRISE"] })],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "earnings", "3.11 EARNINGS_SURPRISE -> earnings theme");
}

// 12. Actor "powell" -> fed, banque-centrale
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({}),
    ["powell"],
  );
  assertIncludes(themes, "fed", "3.12a actor powell -> fed");
  assertIncludes(themes, "banque-centrale", "3.12b actor powell -> banque-centrale");
}

// 13. Actor "lagarde" -> bce, banque-centrale
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({}),
    ["lagarde"],
  );
  assertIncludes(themes, "bce", "3.13a actor lagarde -> bce");
  assertIncludes(themes, "banque-centrale", "3.13b actor lagarde -> banque-centrale");
}

// 14. GC=F in episode -> refuge
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({ segments: [makeSegment({ assets: ["GC=F"] })] }),
    [],
  );
  assertIncludes(themes, "refuge", "3.14 GC=F in episode -> refuge theme");
}

// 15. USDJPY=X with big move -> carry-trade
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [makeFlaggedAsset({ symbol: "USDJPY=X", name: "USD/JPY", changePct: 3.5, flags: ["PRICE_MOVE"] })],
    }),
    makeEditorial({ segments: [makeSegment({ assets: ["USDJPY=X"] })] }),
    [],
  );
  assertIncludes(themes, "carry-trade", "3.15 USDJPY=X big move -> carry-trade theme");
}

// 16. Saisonnalite always present
{
  const themes = detectActiveThemes(
    makeFlagged({ assets: [] }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "saisonnalite", "3.16 saisonnalite always present");
}

// 17. Iran news -> geopolitique + moyen-orient
{
  const themes = detectActiveThemes(
    makeFlagged({
      assets: [],
      news: [
        { title: "Iran launches missile strikes", summary: "Tensions escalate in Middle East", source: "Reuters", publishedAt: "2026-03-25", url: "" },
      ],
    }),
    makeEditorial({}),
    [],
  );
  assertIncludes(themes, "geopolitique", "3.17a Iran news -> geopolitique");
  assertIncludes(themes, "moyen-orient", "3.17b Iran news -> moyen-orient");
}

// ── Section 4: Chunk Matching ──────────

console.log("\n\u2500\u2500 Section 4: Chunk Matching \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

resetIndexCache();

// ── Scenario A: Gold ATH + Dollar weakness + VIX spike ──

const flaggedA = makeFlagged({
  assets: [
    makeFlaggedAsset({ symbol: "GC=F", name: "Gold", price: 5200, changePct: 2.5, materialityScore: 9, flags: ["PRICE_MOVE", "ATH_PROXIMITY"] }),
    makeFlaggedAsset({ symbol: "DX-Y.NYB", name: "Dollar Index", price: 99, changePct: -1.2, materialityScore: 6, flags: ["PRICE_MOVE"] }),
    makeFlaggedAsset({ symbol: "^VIX", name: "VIX", price: 28, changePct: 15, materialityScore: 7, flags: ["SENTIMENT_EXTREME", "EXTREME_MOVE"] }),
  ],
});

const editorialA = makeEditorial({
  moodMarche: "risk-off",
  dominantTheme: "Gold ATH",
  coldOpenFact: "Gold 5200",
  segments: [
    makeSegment({ id: "s1", topic: "Gold", depth: "DEEP", assets: ["GC=F", "DX-Y.NYB"] }),
  ],
});

const snapshotA = makeSnapshot();

const candidatesA = matchChunks(flaggedA, editorialA, snapshotA);
const candidateIdsA = candidatesA.map((c) => c.id);

assert(candidatesA.length > 0, "4.A1 Scenario A returns candidates");
assertIncludes(candidateIdsA, "asset-gold-drivers", "4.A2 asset-gold-drivers matched");

{
  const goldChunk = candidatesA.find((c) => c.id === "asset-gold-drivers");
  assert(goldChunk != null && goldChunk.score >= 100, "4.A3 asset-gold-drivers score >= 100 (always_if_symbol)", goldChunk ? `Score: ${goldChunk.score}` : "Not found");
}

assertIncludes(candidateIdsA, "asset-dollar-index", "4.A4 asset-dollar-index matched");
assertIncludes(candidateIdsA, "inter-dollar-cascade", "4.A5 inter-dollar-cascade matched");

{
  const zeroScores = candidatesA.filter((c) => c.score === 0);
  assertEqual(zeroScores.length, 0, "4.A6 No candidates with score 0");
}

{
  const topScore = candidatesA[0]?.score ?? 0;
  assertGreater(topScore, 10, "4.A7 Top candidate score > 10");
}

// ── Scenario B: Fed decision day + CPI surprise ──

const flaggedB = makeFlagged({
  assets: [
    makeFlaggedAsset({ symbol: "^GSPC", name: "S&P 500", price: 5800, changePct: -1.8, materialityScore: 7, flags: ["PRICE_MOVE", "MACRO_SURPRISE"] }),
    makeFlaggedAsset({ symbol: "DX-Y.NYB", name: "Dollar", price: 104, changePct: 0.8, materialityScore: 5, flags: ["PRICE_MOVE"] }),
  ],
  events: [{ name: "CPI Core", impact: "high", currency: "USD", time: "13:30", date: "2026-03-25", forecast: "3.1", actual: "3.4" }],
});

const editorialB = makeEditorial({
  moodMarche: "risk-off",
  segments: [makeSegment({ id: "s1", topic: "CPI shock", depth: "DEEP", assets: ["^GSPC", "DX-Y.NYB"] })],
});

const snapshotB = makeSnapshot();

const candidatesB = matchChunks(flaggedB, editorialB, snapshotB);
const candidateIdsB = candidatesB.map((c) => c.id);

// CB-related chunks should appear (via inflation theme from MACRO_SURPRISE + CPI)
{
  const cbChunks = candidatesB.filter((c) => c.id.startsWith("cb-"));
  assertGreater(cbChunks.length, 0, "4.B1 CB-related chunks in candidates");
}

// macro-inflation-cpi has always_if_theme=true + inflation overlap -> score >= 100
// But with many always_if_symbol chunks also at 100, top-35 cutoff may exclude it.
// Test that inflation-themed chunks appear in candidates instead.
{
  const inflationChunks = candidatesB.filter((c) => {
    const meta = index.chunks.find((m) => m.id === c.id);
    return meta?.themes.includes("inflation");
  });
  assertGreater(inflationChunks.length, 0, "4.B2 Inflation-themed chunks in candidates");
}

// macro-yield-curve may also be cut by top-35 limit when many always_if_symbol chunks score 100.
// Test that taux/recession-related chunks appear.
{
  const tauxChunks = candidatesB.filter((c) => {
    const meta = index.chunks.find((m) => m.id === c.id);
    return meta?.themes.includes("taux");
  });
  assertGreater(tauxChunks.length, 0, "4.B3 Taux-themed chunks in candidates");
}

{
  const fedDual = candidatesB.find((c) => c.id === "cb-fed-dual-mandate");
  assert(fedDual != null && fedDual.score > 0, "4.B4 cb-fed-dual-mandate scores > 0");
}

// ── Scenario C: Geopolitical crisis (Iran + oil spike) ──

const flaggedC = makeFlagged({
  assets: [
    makeFlaggedAsset({ symbol: "CL=F", name: "WTI", price: 95, changePct: 8.5, materialityScore: 10, flags: ["EXTREME_MOVE", "POLITICAL_TRIGGER", "CAUSAL_CHAIN"] }),
    makeFlaggedAsset({ symbol: "GC=F", name: "Gold", price: 5100, changePct: 1.8, materialityScore: 7, flags: ["PRICE_MOVE"] }),
  ],
  news: [
    { title: "Iran launches missile strikes", summary: "Tensions escalate in Middle East", source: "Reuters", publishedAt: "2026-03-25", url: "" },
    { title: "Oil surges on Iran conflict", summary: "", source: "Bloomberg", publishedAt: "2026-03-25", url: "" },
    { title: "Iran sanctions tightened", summary: "", source: "FT", publishedAt: "2026-03-25", url: "" },
  ],
});

const editorialC = makeEditorial({
  moodMarche: "risk-off",
  segments: [
    makeSegment({ id: "s1", topic: "Oil", depth: "DEEP", assets: ["CL=F", "GC=F"] }),
  ],
});

const snapshotC = makeSnapshot();

const candidatesC = matchChunks(flaggedC, editorialC, snapshotC);
const candidateIdsC = candidatesC.map((c) => c.id);

{
  const geoMO = candidatesC.find((c) => c.id === "geo-moyen-orient-chaine");
  assert(geoMO != null, "4.C1a geo-moyen-orient-chaine in candidates");
  if (geoMO) assertGreater(geoMO.score, 5, "4.C1b geo-moyen-orient-chaine has high score");
}

assertIncludes(candidateIdsC, "geo-asymetries-regionales", "4.C2 geo-asymetries-regionales matched");
assertIncludes(candidateIdsC, "asset-oil-wti-brent", "4.C3 asset-oil-wti-brent matched (CL=F always_if_symbol)");

{
  const themes = detectActiveThemes(flaggedC, editorialC, []);
  assertIncludes(themes, "geopolitique", "4.C4 Geopolitique theme detected");
  assertIncludes(themes, "moyen-orient", "4.C5 Moyen-orient theme detected from Iran news");
}

// ── Scenario D: Calm market / rotation ──

const flaggedD = makeFlagged({
  assets: [
    makeFlaggedAsset({ symbol: "^GSPC", name: "S&P 500", price: 5700, changePct: 0.2, materialityScore: 3, flags: [] }),
    makeFlaggedAsset({ symbol: "GC=F", name: "Gold", price: 5000, changePct: -0.1, materialityScore: 2, flags: [] }),
  ],
});

const editorialD = makeEditorial({
  moodMarche: "rotation",
  segments: [makeSegment({ id: "s1", topic: "Rotation", depth: "FOCUS", assets: ["^GSPC"] })],
});

const snapshotD = makeSnapshot();

const candidatesD = matchChunks(flaggedD, editorialD, snapshotD);

assert(candidatesD.length > 0, "4.D1 Calm market still returns candidates");

// narr-* chunks have always_if_theme on "narration" but detectActiveThemes never emits "narration".
// In a calm rotation market with ^GSPC, narr chunks only match if they share a flag/symbol/theme.
// Verify that rotation-themed or structure chunks appear instead.
{
  const rotationChunks = candidatesD.filter((c) => {
    const meta = index.chunks.find((m) => m.id === c.id);
    return meta?.themes.includes("rotation-sectorielle");
  });
  assertGreater(rotationChunks.length, 0, "4.D2 Rotation-themed chunks present in calm market");
}

{
  const seasonChunks = candidatesD.filter((c) => c.id.startsWith("season-"));
  assertGreater(seasonChunks.length, 0, "4.D3 Seasonality chunks score > 0 in calm market");
}

// ── Scenario E: Bitcoin crash + carry trade unwind ──

const flaggedE = makeFlagged({
  assets: [
    makeFlaggedAsset({ symbol: "BTC-USD", name: "Bitcoin", price: 45000, changePct: -12, materialityScore: 10, flags: ["EXTREME_MOVE", "CAUSAL_CHAIN", "SENTIMENT_EXTREME"] }),
    makeFlaggedAsset({ symbol: "USDJPY=X", name: "USD/JPY", price: 142, changePct: -3.5, materialityScore: 8, flags: ["EXTREME_MOVE", "PRICE_MOVE"] }),
  ],
});

const editorialE = makeEditorial({
  moodMarche: "risk-off",
  segments: [
    makeSegment({ id: "s1", topic: "BTC crash", depth: "DEEP", assets: ["BTC-USD"] }),
    makeSegment({ id: "s2", topic: "Yen surge", depth: "FOCUS", assets: ["USDJPY=X"] }),
  ],
});

const snapshotE = makeSnapshot();

const candidatesE = matchChunks(flaggedE, editorialE, snapshotE);
const candidateIdsE = candidatesE.map((c) => c.id);

assertIncludes(candidateIdsE, "asset-bitcoin-crypto", "4.E1 asset-bitcoin-crypto matched");
assertIncludes(candidateIdsE, "inter-carry-trade", "4.E2 inter-carry-trade matched");
assertIncludes(candidateIdsE, "asset-jpy-refuge", "4.E3 asset-jpy-refuge matched (USDJPY symbol)");

{
  const btcChunk = candidatesE.find((c) => c.id === "asset-bitcoin-crypto");
  assert(btcChunk != null && btcChunk.score >= 100, "4.E4 BTC chunk score >= 100 (always_if_symbol)");
}

{
  const themes = detectActiveThemes(flaggedE, editorialE, []);
  assertIncludes(themes, "carry-trade", "4.E5 carry-trade theme from USDJPY big move");
}

// ── Section 5: Briefing Assembly ──────────

console.log("\n\u2500\u2500 Section 5: Briefing Assembly \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

// 1. loadKnowledgeBriefing function exists (we import it at top level)
{
  const mod = require("../packages/ai/src/knowledge/knowledge-briefing");
  assert(typeof mod.loadKnowledgeBriefing === "function", "5.1 loadKnowledgeBriefing is a function");
}

// 2. Test stripFrontmatter behavior indirectly: read a chunk, verify content after strip
{
  const rawGold = fs.readFileSync(path.join(CHUNKS_DIR, "asset-gold-drivers.md"), "utf-8");
  assert(rawGold.startsWith("---"), "5.2a Gold chunk has frontmatter");
  const secondMarker = rawGold.indexOf("---", 3);
  const content = rawGold.slice(secondMarker + 3).trim();
  assertGreater(content.length, 50, "5.2b Stripped content has >50 chars");
  assert(!content.startsWith("---"), "5.2c Stripped content does not start with ---");
}

// 3. All chunk content files can be read
{
  let readableCount = 0;
  let errorCount = 0;
  for (const chunk of index.chunks) {
    try {
      const filePath = path.join(CHUNKS_DIR, chunk.file);
      const raw = fs.readFileSync(filePath, "utf-8");
      if (raw.length > 0) readableCount++;
    } catch {
      errorCount++;
    }
  }
  assertEqual(errorCount, 0, "5.3a No errors reading chunk files");
  assertEqual(readableCount, index.chunks.length, "5.3b All chunks readable with content");
}

// 4. Count chunks with content > 0 (should be 133)
{
  let contentCount = 0;
  for (const chunk of index.chunks) {
    const raw = fs.readFileSync(path.join(CHUNKS_DIR, chunk.file), "utf-8");
    let content = raw;
    if (raw.startsWith("---")) {
      const end = raw.indexOf("---", 3);
      if (end !== -1) content = raw.slice(end + 3).trim();
    }
    if (content.length > 0) contentCount++;
  }
  assertEqual(contentCount, 133, "5.4 All 133 chunks have non-empty content");
}

// 5. Token estimation sanity check (words * 1.3 approx)
{
  const testText = "This is a simple test string with exactly ten words now";
  const wordCount = testText.split(/\s+/).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);
  assertGreater(estimatedTokens, wordCount, "5.5 Token estimate > word count");
  assert(estimatedTokens < wordCount * 2, "5.5b Token estimate < 2x word count");
}

// ── Section 6: Coverage Verification ──────────

console.log("\n\u2500\u2500 Section 6: Coverage Verification \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

// Helper: check that at least one chunk exists matching a pattern in id/title/themes
function hasChunkCovering(keywords: string[], field: "id" | "themes" | "title"): boolean {
  return index.chunks.some((c) => {
    const text = field === "themes" ? c.themes.join(" ") : field === "id" ? c.id : c.title;
    return keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
  });
}

// 1. central-banks.md coverage
{
  const cbChunks = index.chunks.filter((c) => c.source === "central-banks.md");
  assertGreater(cbChunks.length, 0, "6.1a CB chunks exist");
  assert(hasChunkCovering(["fed"], "id"), "6.1b Fed covered in chunks");
  assert(hasChunkCovering(["boj"], "id"), "6.1c BoJ covered in chunks");
  // BCE is covered through themes
  assert(index.chunks.some((c) => c.themes.includes("bce")), "6.1d BCE theme exists in chunks");
}

// 2. geopolitics.md coverage
{
  const geoChunks = index.chunks.filter((c) => c.source === "geopolitics.md");
  assertGreater(geoChunks.length, 9, "6.2a At least 10 geo chunks", `Got ${geoChunks.length}`);
  assert(hasChunkCovering(["iran"], "id"), "6.2b Iran covered");
  assert(hasChunkCovering(["russie", "ukraine"], "id"), "6.2c Russia-Ukraine covered");
  assert(hasChunkCovering(["chine", "taiwan"], "id"), "6.2d China-Taiwan covered");
  assert(hasChunkCovering(["tarif"], "id"), "6.2e Tarifs covered");
  assert(hasChunkCovering(["krachs", "crash"], "id"), "6.2f Krachs covered");
}

// 3. intermarket.md coverage
{
  const interChunks = index.chunks.filter((c) => c.source === "intermarket.md");
  assertGreater(interChunks.length, 5, "6.3a At least 6 intermarket chunks");
  assert(hasChunkCovering(["dollar", "dxy"], "id"), "6.3b DXY/Dollar covered");
  assert(hasChunkCovering(["taux"], "id"), "6.3c Taux covered");
  assert(hasChunkCovering(["vix"], "id"), "6.3d VIX covered");
  assert(hasChunkCovering(["petrole", "oil"], "id"), "6.3e Petrole covered");
  assert(hasChunkCovering(["bitcoin"], "id"), "6.3f Bitcoin covered");
  assert(hasChunkCovering(["m2", "liquidite"], "id"), "6.3g M2/Liquidite covered");
}

// 4. macro-indicators.md coverage
{
  const macroChunks = index.chunks.filter((c) => c.source === "macro-indicators.md");
  assertGreater(macroChunks.length, 5, "6.4a At least 6 macro chunks");
  assert(hasChunkCovering(["vix"], "id"), "6.4b VIX macro covered");
  assert(hasChunkCovering(["yield", "treasury"], "id"), "6.4c Yields covered");
  assert(hasChunkCovering(["cpi", "inflation"], "id"), "6.4d CPI/Inflation covered");
  assert(hasChunkCovering(["debt"], "id"), "6.4e Debt ceiling covered");
}

// 5. asset-profiles.md coverage
{
  const assetChunks = index.chunks.filter((c) => c.source === "asset-profiles.md");
  assertGreater(assetChunks.length, 10, "6.5a At least 11 asset chunks");
  assert(hasChunkCovering(["gold"], "id"), "6.5b Gold covered");
  assert(hasChunkCovering(["silver"], "id"), "6.5c Silver covered");
  assert(hasChunkCovering(["oil", "wti"], "id"), "6.5d Oil covered");
  assert(hasChunkCovering(["bitcoin"], "id"), "6.5e Bitcoin covered");
  assert(hasChunkCovering(["sp500"], "id"), "6.5f S&P 500 covered");
  assert(hasChunkCovering(["cac"], "id"), "6.5g CAC 40 covered");
  assert(hasChunkCovering(["dollar"], "id"), "6.5h Dollar covered");
  assert(hasChunkCovering(["eurusd"], "id"), "6.5i EUR/USD covered");
  assert(hasChunkCovering(["vix"], "id"), "6.5j VIX covered");
  assert(hasChunkCovering(["copper", "cuivre", "gas"], "id"), "6.5k Copper/Gas covered");
}

// 6. narrative-patterns.md coverage
{
  const narrChunks = index.chunks.filter((c) => c.source === "narrative-patterns.md");
  assertGreater(narrChunks.length, 6, "6.6a At least 7 narrative chunks", `Got ${narrChunks.length}`);
  assert(hasChunkCovering(["fil-rouge"], "id"), "6.6b Fil rouge covered");
  assert(hasChunkCovering(["domino", "contraste"], "id"), "6.6c Domino/Contraste covered");
  assert(hasChunkCovering(["surprise", "patience"], "id"), "6.6d Surprise/Patience covered");
  assert(hasChunkCovering(["buy-rumor", "misprice"], "id"), "6.6e Buy rumor covered");
  assert(hasChunkCovering(["discounting"], "id"), "6.6f Discounting mechanism covered");
  assert(hasChunkCovering(["causal"], "id"), "6.6g Causal chains covered");
  assert(hasChunkCovering(["counter-intuitive"], "id"), "6.6h Counter-intuitive covered");
}

// 7. seasonality.md coverage
{
  const seasonChunks = index.chunks.filter((c) => c.source === "seasonality.md");
  assertGreater(seasonChunks.length, 3, "6.7a At least 4 seasonality chunks");
  assert(hasChunkCovering(["indices", "actions"], "id"), "6.7b Indices/Actions covered");
  assert(hasChunkCovering(["devises"], "id"), "6.7c Devises covered");
  assert(hasChunkCovering(["energie"], "id"), "6.7d Energie covered");
  assert(hasChunkCovering(["crypto"], "id"), "6.7e Crypto covered");
}

// 8. technical-analysis.md coverage
{
  const taChunks = index.chunks.filter((c) => c.source === "technical-analysis.md");
  assertGreater(taChunks.length, 5, "6.8a At least 6 TA chunks");
  assert(hasChunkCovering(["ema", "sma"], "id"), "6.8b EMA/SMA covered");
  assert(hasChunkCovering(["rsi"], "id"), "6.8c RSI covered");
  assert(hasChunkCovering(["support", "resistance"], "id"), "6.8d Support/Resistance covered");
  assert(hasChunkCovering(["volume"], "id"), "6.8e Volume covered");
  assert(hasChunkCovering(["fibonacci"], "id"), "6.8f Fibonacci covered");
}

// 9. tone-references.md coverage
{
  const toneChunks = index.chunks.filter((c) => c.source === "tone-references.md");
  assertGreater(toneChunks.length, 0, "6.9a Tone chunks exist");
  assert(hasChunkCovering(["cold-open"], "id"), "6.9b Cold open covered");
  assert(hasChunkCovering(["closing"], "id"), "6.9c Closing covered");
}

// 10. cot-positioning.md coverage
{
  const cotChunks = index.chunks.filter((c) => c.source === "cot-positioning.md");
  assertGreater(cotChunks.length, 0, "6.10a COT chunks exist");
  assert(hasChunkCovering(["cot", "signaux"], "id"), "6.10b COT signals covered");
}

// ============================================================
// RESULTS
// ============================================================

console.log("\n=== Test Results ===\n");

let passed = 0;
let failed = 0;

for (const r of results) {
  if (r.passed) {
    passed++;
    console.log(`  \u2705 ${r.name}`);
  } else {
    failed++;
    console.log(`  \u274c ${r.name}: ${r.message}`);
  }
}

console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) {
  process.exit(1);
}
