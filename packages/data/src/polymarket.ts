import type { EconomicEvent, PolymarketMarket } from "@yt-maker/core";

const GAMMA_API = "https://gamma-api.polymarket.com";

// Finance-relevant tag slugs on Polymarket's /events endpoint
const BASE_TAG_SLUGS = ["fed", "economy", "inflation", "oil", "stocks"];

// Additional tag slugs derived from calendar events
const EVENT_TAG_MAP: Array<[RegExp, string]> = [
  [/fomc|federal open market|fed.*rate|interest rate.*(usd|us|dollar)/i, "fed"],
  [/cpi|consumer price index/i, "inflation"],
  [/pce|personal consumption/i, "inflation"],
  [/nfp|nonfarm payroll|non-farm/i, "economy"],
  [/unemployment|jobless|initial claims/i, "economy"],
  [/gdp|gross domestic product/i, "economy"],
  [/ecb|european central bank/i, "ecb"],
  [/boj|bank of japan/i, "japan"],
  [/boe|bank of england/i, "uk"],
  [/tariff|trade war|trade deal/i, "tariffs"],
  [/retail sales/i, "economy"],
  [/bitcoin|crypto/i, "crypto"],
];

// Blacklist: event titles or market questions that aren't finance-relevant
const BLACKLIST_KEYWORDS = [
  "nba", "nfl", "nhl", "mlb", "mls", "ufc", "wwe", "fifa", "world cup",
  "stanley cup", "super bowl", "finals", "championship", "playoffs",
  "gta", "grand theft auto", "oscar", "grammy", "emmy",
  "bachelor", "survivor", "airdrop", "market cap (fdv)",
  "win the 202", "governor", "senator", "mayor",
  "impeach", "pardon", "resign", "convicted", "indicted", "prison",
  "hotdog", "costco",
];

/**
 * Extract additional tag slugs from high-impact calendar events.
 */
function extractEventTags(events: EconomicEvent[]): string[] {
  const highImpact = events.filter((e) => e.impact === "high");
  const tags = new Set<string>();

  for (const event of highImpact) {
    for (const [pattern, tag] of EVENT_TAG_MAP) {
      if (pattern.test(event.name)) tags.add(tag);
    }
  }

  return [...tags];
}

/**
 * Fetch finance prediction markets from Polymarket.
 * Uses /events endpoint with tag_slug for structured filtering.
 * No auth required. Graceful degradation on error.
 */
export async function fetchPolymarketData(events?: EconomicEvent[]): Promise<PolymarketMarket[]> {
  console.log("  Fetching Polymarket prediction markets...");
  try {
    // Combine base tags + event-derived tags, dedup
    const eventTags = events ? extractEventTags(events) : [];
    const allTags = [...new Set([...BASE_TAG_SLUGS, ...eventTags])];

    // Fetch all tag slugs in parallel
    const batches = await Promise.all(
      allTags.map((tag) => fetchEventsByTag(tag)),
    );

    // Merge + dedup by market ID, cap at 15
    const seen = new Set<string>();
    const merged: PolymarketMarket[] = [];

    for (const batch of batches) {
      for (const market of batch) {
        if (!seen.has(market.id)) {
          seen.add(market.id);
          merged.push(market);
        }
      }
    }

    // Sort by volume, take top 15
    merged.sort((a, b) => b.volume24h - a.volume24h);
    const result = merged.slice(0, 15);

    const extra = eventTags.filter(t => !BASE_TAG_SLUGS.includes(t));
    const extraLog = extra.length ? ` + event tags [${extra.join(", ")}]` : "";
    console.log(`  Polymarket: ${result.length} markets from ${allTags.length} tags${extraLog}`);

    return result;
  } catch (err) {
    console.warn(`  Polymarket error: ${err}`);
    return [];
  }
}

// ── Private fetchers ───────────────────────────────────────────────────────────

async function fetchEventsByTag(tagSlug: string): Promise<PolymarketMarket[]> {
  try {
    const url = new URL(`${GAMMA_API}/events`);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("tag_slug", tagSlug);
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const results: PolymarketMarket[] = [];

    for (const event of data) {
      const markets: GammaMarket[] = event.markets ?? [];
      for (const market of markets) {
        const parsed = parseMarket(market);
        if (parsed) results.push(parsed);
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ── Market parser ──────────────────────────────────────────────────────────────

function parseMarket(market: GammaMarket): PolymarketMarket | null {
  if (!market.outcomePrices) return null;

  const question = market.question || "";
  const lowerQuestion = question.toLowerCase();

  // Blacklist filter
  if (BLACKLIST_KEYWORDS.some((kw) => lowerQuestion.includes(kw))) return null;

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
    return null;
  }

  const prices = parsedPrices.map((p) => parseFloat(p));
  const probabilities: Record<string, number> = {};
  parsedOutcomes.forEach((label, i) => {
    probabilities[label] = Math.round((prices[i] ?? 0) * 100);
  });

  return {
    id: market.id ?? "",
    question,
    category: "Finance",
    endDate: market.endDate ?? "",
    probabilities,
    volume24h: parseFloat(String(market.volume24hr ?? 0)),
    liquidity: parseFloat(String(market.liquidity ?? 0)),
  };
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
