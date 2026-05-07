import type { StockScreenResult } from "@yt-maker/core";
import { fetchSparkChanges, fetchDaily3yCandles } from "./yahoo";
import { computeTechnicals } from "./technicals";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface IndexConstituent {
  symbol: string;
  name: string;
  sector?: string;
  description?: string;
}

interface CompanyProfileEntry {
  symbol: string;
  name: string;
  sector?: string;
  finnhubIndustry?: string;
  description?: string;
  correlation?: string;
  index?: string;
}

/** Lazy-loaded company profiles for sector/description enrichment */
let _profileMap: Map<string, CompanyProfileEntry> | null = null;

function loadProfileMap(): Map<string, CompanyProfileEntry> {
  if (_profileMap) return _profileMap;
  _profileMap = new Map();
  const filePath = join(process.cwd(), "data", "company-profiles.json");
  if (!existsSync(filePath)) return _profileMap;
  try {
    const data: CompanyProfileEntry[] = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const p of data) _profileMap.set(p.symbol, p);
  } catch { /* non-critical */ }
  return _profileMap;
}

type IndexName = "SP500" | "CAC40" | "DAX40" | "FTSE100" | "NIKKEI50" | "HSI30";

const INDEX_FILES: Record<IndexName, string> = {
  SP500: "sp500.json",
  CAC40: "cac40.json",
  DAX40: "dax40.json",
  FTSE100: "ftse100.json",
  NIKKEI50: "nikkei50.json",
  HSI30: "hsi30.json",
};

// data/indices/ is relative to project root
const INDICES_DIR = join(process.cwd(), "data", "indices");

const MOVER_THRESHOLD = 2.0;   // % change to be flagged as mover

function loadConstituents(indexName: IndexName): IndexConstituent[] {
  const filePath = join(INDICES_DIR, INDEX_FILES[indexName]);
  if (!existsSync(filePath)) {
    console.warn(`  [screening] ${filePath} not found — skipping ${indexName}`);
    return [];
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as IndexConstituent[];
  } catch (err) {
    console.warn(`  [screening] Failed to parse ${filePath}: ${err}`);
    return [];
  }
}

async function screenIndex(
  indexName: IndexName,
  constituents: IndexConstituent[],
  pubDate?: string,
): Promise<StockScreenResult[]> {
  const symbols = constituents.map((c) => c.symbol);
  const nameMap = Object.fromEntries(constituents.map((c) => [c.symbol, c.name]));

  // Use spark endpoint (public, no auth): returns {symbol, changePct, sessionDate}.
  // sessionDate = date of the latest completed candle ≤ pubDate. If it's < pubDate,
  // the asset did NOT trade on pubDate (holiday) — skip it: a "mover" reported on
  // a stale session would mislead the LLM into treating an old move as today's.
  const changes = await fetchSparkChanges(symbols, pubDate);

  const results: StockScreenResult[] = [];
  for (const { symbol, changePct, sessionDate } of changes) {
    if (Math.abs(changePct) < MOVER_THRESHOLD) continue;
    if (pubDate && sessionDate !== pubDate) continue;  // not traded on snapshot day

    const reason: string[] = [];
    if (changePct >= MOVER_THRESHOLD) reason.push("mover_up");
    if (changePct <= -MOVER_THRESHOLD) reason.push("mover_down");

    results.push({
      symbol,
      name: nameMap[symbol] ?? symbol,
      index: indexName,
      price: 0,          // enriched in deep-dive
      changePct,
      volume: 0,         // enriched in deep-dive
      avgVolume: 0,
      high52w: 0,
      low52w: 0,
      reason,
    });
  }

  return results;
}

async function enrichMovers(movers: StockScreenResult[]): Promise<void> {
  // Deep-dive: fetch 1-month daily candles to get price, volume, 52w levels + technicals
  const deepDiveLimit = 30;
  const targets = movers.slice(0, deepDiveLimit);

  // Sequential with throttle to avoid Yahoo rate-limit after spark batches
  for (let mi = 0; mi < targets.length; mi++) {
    const mover = targets[mi];
    try {
      // Use 3y candles to get accurate 52w high/low (1mo candles were insufficient)
      const candles = await fetchDaily3yCandles(mover.symbol);
      if (candles.length >= 2) {
        mover.price = candles[candles.length - 1].c;
        mover.volume = candles[candles.length - 1].v;
        // Avg volume from last 20 days — skip zero-volume candles (futures, forex)
        const validSlice = candles.slice(-21, -1).filter((c) => c.v > 0);
        mover.avgVolume =
          validSlice.length > 0
            ? validSlice.reduce((s, c) => s + c.v, 0) / validSlice.length
            : 1;
        // True 52w hi/lo from last 252 trading days
        const last252 = candles.slice(-252);
        mover.high52w = Math.max(...last252.map((c) => c.h));
        mover.low52w = Math.min(...last252.map((c) => c.l));

        if (mover.avgVolume > 0 && mover.volume / mover.avgVolume >= 2) {
          mover.reason.push("volume_spike");
        }
        if (mover.price >= mover.high52w * 0.99) mover.reason.push("52w_high");
        if (mover.price <= mover.low52w * 1.01) mover.reason.push("52w_low");

        if (candles.length >= 10) {
          // Note: newsCount is 0 since we don't have news data for individual screened stocks
          // This is acceptable — stock screening movers don't have associated news yet
          mover.technicals = computeTechnicals(candles, mover.price, mover.changePct, 0, mover.symbol);
        }
      }
    } catch {
      // non-blocking
    }
    // Throttle between mover enrichment requests
    if (mi < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

/**
 * Screen ~763 stocks across major indices.
 * Returns only flagged movers (|changePct| > 2% OR volume spike OR 52w hi/lo).
 */
export async function screenStocks(pubDate?: string): Promise<StockScreenResult[]> {
  const allConstituents: Array<{ indexName: IndexName; constituent: IndexConstituent }> = [];

  for (const [indexName, _] of Object.entries(INDEX_FILES) as [IndexName, string][]) {
    const constituents = loadConstituents(indexName);
    if (constituents.length > 0) {
      console.log(`  [screening] ${indexName}: ${constituents.length} constituents loaded`);
      for (const c of constituents) {
        allConstituents.push({ indexName, constituent: c });
      }
    }
  }

  if (allConstituents.length === 0) {
    console.log("  [screening] No constituent files found — skipping stock screening");
    return [];
  }

  console.log(`\nScreening ${allConstituents.length} stocks across ${Object.keys(INDEX_FILES).length} indices...`);

  // Group by index and batch-quote
  const byIndex = new Map<IndexName, IndexConstituent[]>();
  for (const { indexName, constituent } of allConstituents) {
    if (!byIndex.has(indexName)) byIndex.set(indexName, []);
    byIndex.get(indexName)!.push(constituent);
  }

  const allResults: StockScreenResult[] = [];
  for (const [indexName, constituents] of byIndex) {
    const results = await screenIndex(indexName, constituents, pubDate);
    allResults.push(...results);
    console.log(`  [screening] ${indexName}: ${results.length} movers flagged`);
  }

  // Sort by absolute change % descending
  allResults.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // Deep-dive: enrich top movers with technicals
  if (allResults.length > 0) {
    console.log(`  [screening] Deep-dive: enriching ${Math.min(allResults.length, 30)} top movers...`);
    await enrichMovers(allResults);
  }

  // Enrich with sector + description from company-profiles.json + index files
  const profiles = loadProfileMap();
  let enrichedCount = 0;
  for (const result of allResults) {
    const profile = profiles.get(result.symbol);
    if (profile) {
      result.sector = profile.sector ?? profile.finnhubIndustry;
      result.description = profile.description;
      if (result.sector || result.description) enrichedCount++;
    }
  }
  if (enrichedCount > 0) {
    console.log(`  [screening] Enriched ${enrichedCount}/${allResults.length} movers with sector/description`);
  }

  console.log(`Screening complete: ${allResults.length} flagged stocks`);
  return allResults;
}
