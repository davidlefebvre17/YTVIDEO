import type { EconomicEvent, PolymarketMarket } from "@yt-maker/core";

const GAMMA_API = "https://gamma-api.polymarket.com";

// Finance-relevant keywords for filtering top-volume markets
const FINANCE_KEYWORDS = [
  "fed", "federal reserve", "interest rate", "inflation", "cpi", "pce",
  "recession", "gdp", "unemployment", "nonfarm", "nfp",
  "bitcoin", "btc", "ethereum", "eth", "crypto", "solana",
  "stock market", "s&p 500", "nasdaq", "dow jones",
  "gold", "oil", "crude", "commodities",
  "dollar", "euro", "yen", "yuan",
  "trump", "tariff", "trade war",
  "ecb", "bank of japan", "boj",
  "earnings", "ipo",
];

// Maps event name patterns → targeted Polymarket search queries
const EVENT_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/fomc|federal open market|fed.*rate|interest rate.*(usd|us|dollar)/i, "Fed rate cut"],
  [/cpi|consumer price index/i, "CPI inflation"],
  [/pce|personal consumption/i, "PCE inflation"],
  [/nfp|nonfarm payroll|non-farm/i, "nonfarm payroll jobs"],
  [/unemployment|jobless|initial claims/i, "unemployment"],
  [/gdp|gross domestic product/i, "GDP recession"],
  [/ecb|european central bank/i, "ECB rate"],
  [/boj|bank of japan/i, "Bank of Japan"],
  [/boe|bank of england/i, "Bank of England rate"],
  [/retail sales/i, "retail sales"],
  [/tariff|trade war|trade deal/i, "tariff trade war"],
];

/**
 * Extract targeted Polymarket search keywords from high-impact calendar events.
 * Returns max 3 keywords to avoid too many API calls.
 */
function extractContextKeywords(events: EconomicEvent[]): string[] {
  const highImpact = events.filter((e) => e.impact === "high");
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const event of highImpact) {
    for (const [pattern, keyword] of EVENT_KEYWORD_MAP) {
      if (pattern.test(event.name) && !seen.has(keyword)) {
        seen.add(keyword);
        keywords.push(keyword);
      }
    }
    if (keywords.length >= 3) break;
  }

  return keywords;
}

/**
 * Fetch top prediction markets from Polymarket.
 * - Base: top finance-relevant markets by 24h volume
 * - Targeted: specific markets for today's high-impact events (FOMC, CPI, NFP...)
 * - Merge + dedup, cap at 15, targeted markets take priority
 *
 * No auth required. Graceful degradation on error.
 */
export async function fetchPolymarketData(events?: EconomicEvent[]): Promise<PolymarketMarket[]> {
  console.log("  Fetching Polymarket prediction markets...");
  try {
    const contextKeywords = events ? extractContextKeywords(events) : [];

    // Fetch base (top volume) + targeted (per event keyword) in parallel
    const [baseMarkets, ...targetedBatches] = await Promise.all([
      fetchTopMarkets(),
      ...contextKeywords.map((kw) => fetchMarketsByKeyword(kw)),
    ]);

    // Merge: targeted markets first (higher relevance), then base
    const seen = new Set<string>();
    const merged: PolymarketMarket[] = [];

    for (const market of [...targetedBatches.flat(), ...baseMarkets]) {
      if (!seen.has(market.id)) {
        seen.add(market.id);
        merged.push(market);
      }
      if (merged.length >= 15) break;
    }

    if (contextKeywords.length > 0) {
      const targeted = targetedBatches.flat().length;
      console.log(
        `  Polymarket: ${merged.length} markets (${targeted} ciblés [${contextKeywords.join(", ")}] + base volume)`,
      );
    } else {
      console.log(`  Polymarket: ${merged.length} markets (volume uniquement)`);
    }

    return merged;
  } catch (err) {
    console.warn(`  Polymarket error: ${err}`);
    return [];
  }
}

// ── Private fetchers ───────────────────────────────────────────────────────────

async function fetchTopMarkets(): Promise<PolymarketMarket[]> {
  const url = new URL(`${GAMMA_API}/markets`);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("sort", "volume24hr");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Polymarket /markets ${res.status}: ${res.statusText}`);

  const data = await res.json();
  return parseMarkets(Array.isArray(data) ? data : [], 12);
}

async function fetchMarketsByKeyword(keyword: string): Promise<PolymarketMarket[]> {
  try {
    const url = new URL(`${GAMMA_API}/markets`);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("search", keyword);
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return parseMarkets(Array.isArray(data) ? data : [], 5);
  } catch {
    return [];
  }
}

// ── Shared parser ──────────────────────────────────────────────────────────────

function parseMarkets(raw: GammaMarket[], limit: number): PolymarketMarket[] {
  const results: PolymarketMarket[] = [];

  for (const market of raw) {
    if (!market.outcomePrices) continue;

    const question = market.question || "";

    // For top-volume fetch: filter finance-relevance
    // For keyword fetch: all results are already relevant
    const lowerQuestion = question.toLowerCase();
    const isFinanceRelevant = FINANCE_KEYWORDS.some((kw) => lowerQuestion.includes(kw));
    if (!isFinanceRelevant) continue;

    let parsedPrices: string[];
    let parsedOutcomes: string[];
    try {
      parsedPrices = typeof market.outcomePrices === "string"
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices;
      parsedOutcomes = typeof market.outcomes === "string"
        ? JSON.parse(market.outcomes ?? '["Yes","No"]')
        : (market.outcomes ?? ["Yes", "No"]);
    } catch {
      continue;
    }

    const prices = parsedPrices.map((p) => parseFloat(p));
    const probabilities: Record<string, number> = {};
    parsedOutcomes.forEach((label, i) => {
      probabilities[label] = Math.round((prices[i] ?? 0) * 100);
    });

    results.push({
      id: market.id ?? "",
      question,
      category: market.category ?? "Finance",
      endDate: market.endDate ?? "",
      probabilities,
      volume24h: parseFloat(String(market.volume24hr ?? 0)),
      liquidity: parseFloat(String(market.liquidity ?? 0)),
    });

    if (results.length >= limit) break;
  }

  return results;
}

// ── Raw API type ───────────────────────────────────────────────────────────────

interface GammaMarket {
  id?: string;
  question?: string;
  endDate?: string;
  category?: string;
  outcomes?: string[] | string;
  outcomePrices?: string[] | string;
  volume24hr?: number | string;
  liquidity?: number | string;
}
