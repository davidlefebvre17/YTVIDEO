import type { DailySnapshot, NewsItem, AssetSnapshot, StockScreenResult } from "@yt-maker/core";
import type { Language } from "@yt-maker/core";

// ── Source tiers ────────────────────────────────────────────────────────────
// Higher = more reliable, more market-relevant
export const SOURCE_TIER: Record<string, number> = {
  "ZoneBourse": 7,
  "TradingSat/BFM": 7,
  "Les Echos Marchés": 7,
  "Les Echos Valeurs": 7,
  "L'Agefi": 7,
  "EasyBourse": 6,
  "CNBC Investing": 5,
  "CNBC Economy": 5,
  "CoinDesk": 5,
  "FXStreet": 5,
  "Finnhub/Bloomberg": 5,
  "CoinTelegraph": 4,
  "Investing.com FR": 4,
  "Finnhub/CNBC": 3,
  "Finnhub/MarketWatch": 3,
  "Yahoo Finance": 2,
  "Google News FR": 2,
  "Google News EN": 1,
};

// ── Asset keywords (lowercase) ───────────────────────────────────────────────
// Used to detect which news articles relate to which watchlist assets
export const ASSET_KEYWORDS: Record<string, string[]> = {
  "SI=F":       ["silver", "argent métal", "métal blanc", "silver futures", "argent métal précieux"],
  "^FCHI":      ["cac 40", "cac40", "bourse de paris", "indice parisien", "paris bourse"],
  "BTC-USD":    ["bitcoin", "btc"],
  "GC=F":       ["gold", " or ", "or et", "gold futures", "métal précieux", "xauusd"],
  "CL=F":       ["wti", "crude oil", "pétrole wti", "oil price"],
  "BZ=F":       ["brent", "pétrole brent", "brent crude"],
  "^GSPC":      ["s&p 500", "s&p500", "sp500", "wall street"],
  "^IXIC":      ["nasdaq"],
  "^DJI":       ["dow jones", "dow"],
  "^VIX":       ["vix", "volatility index", "indice de volatilité"],
  "^GDAXI":     ["dax", "bourse de francfort", "frankfurt"],
  "^FTSE":      ["ftse", "london stock", "bourse de londres"],
  "^STOXX":     ["stoxx", "europe 600", "stoxx 600"],
  "^N225":      ["nikkei", "tokyo stock", "bourse de tokyo"],
  "ETH-USD":    ["ethereum", " eth "],
  "SOL-USD":    ["solana"],
  "HG=F":       ["copper", "cuivre", "dr. copper", "prix du cuivre"],
  "PL=F":       ["platinum", "platine"],
  "NG=F":       ["natural gas", "gaz naturel"],
  "ZW=F":       ["wheat", "blé", "céréales"],
  "DX-Y.NYB":   ["dollar index", "dxy", "us dollar index"],
  "EURUSD=X":   ["eur/usd", "eurusd", "euro dollar", "euro face au dollar"],
  "USDJPY=X":   ["usd/jpy", "usdjpy", "dollar yen"],
  "GBPUSD=X":   ["gbp/usd", "gbpusd", "sterling", "livre sterling"],
  "USDCHF=X":   ["usd/chf", "franc suisse"],
  "XLE":        ["energy etf", "xle", "energy sector"],
  "XLK":        ["tech etf", "xlk", "technology sector"],
  "XLF":        ["financial etf", "xlf", "financial sector"],
};

// ── Category relevance ───────────────────────────────────────────────────────
const CATEGORY_SCORE: Record<string, number> = {
  commodities: 3,
  indices: 3,
  macro: 3,
  forex: 2,
  crypto: 1,
  "top news": 0,
  business: 1,
};

// ── Noise patterns — articles irrelevant to a market recap ──────────────────
const NOISE_PATTERNS = [
  /\d+[,.]?\d*\s*[kK]\s*.*earn/i,        // "I earn $300K"
  /earn.*\$\s*\d+/i,
  /\bi\s*(am|'m)\s+\d+\s*(and|years)/i,  // "I'm 71 and earn..."
  /rings.*nasdaq.*bell/i,                 // IPO bell-ringing announcements
  /ring.*opening bell/i,
  /reverse.*share.*split/i,               // reverse splits
  /penny stock/i,
  /buys \$\d+.*\betf\b/i,                // "TrueWealth buys $12M ETF"
  /\bglp.?1\b.*compounded/i,             // FDA/health non-market
  /compounded.*glp.?1/i,
  /municipal.*etf/i,
];

// ── Summary cleaner ─────────────────────────────────────────────────────────
/**
 * Strip HTML tags, decode entities, remove CDATA junk.
 * Returns undefined if the cleaned result is too short to be useful.
 */
export function cleanSummary(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw
    .replace(/<[^>]*>/g, " ")        // strip all HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&[a-zA-Z]{2,8};/g, " ") // strip named HTML entities (é, à, etc.)
    .replace(/&#\d+;/g, "")
    .replace(/\[\[CDATA\[[\s\S]*?\]\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Discard if result is just a URL (happens with TradingSat)
  if (clean.startsWith("http://") || clean.startsWith("https://")) return undefined;
  return clean.length > 25 ? clean.slice(0, 200) : undefined;
}

// ── Per-asset keyword lookup ─────────────────────────────────────────────────
function getAssetKeywords(symbol: string, name: string): string[] {
  const specific = ASSET_KEYWORDS[symbol] ?? [];
  // Add the asset name itself if long enough to avoid false positives ("or", "or ")
  const nameLower = name.toLowerCase();
  const nameKw = nameLower.length >= 5 ? [nameLower] : [];
  return [...specific, ...nameKw];
}

// ── Scoring ──────────────────────────────────────────────────────────────────
function scoreItem(
  item: NewsItem,
  targetDate: string,
  topAssets: AssetSnapshot[],
  movers: StockScreenResult[],
  lang: Language,
): number {
  let score = 0;
  const text = (item.title + " " + (item.summary ?? "")).toLowerCase();

  // 1. Date relevance — prioritize articles from the trading day itself
  const pubDay = item.publishedAt.slice(0, 10);

  const prevDate = new Date(targetDate + "T12:00:00Z");
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDayStr = prevDate.toISOString().slice(0, 10);

  const nextDate = new Date(targetDate + "T12:00:00Z");
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDayStr = nextDate.toISOString().slice(0, 10);

  if (pubDay === targetDate) score += 15;       // published during the trading day ✓
  else if (pubDay === prevDayStr) score += 5;   // day before (pre-market context)
  else if (pubDay === nextDayStr) score += 3;   // next morning (wrap-up / analysis)
  // else (2+ days after): no date bonus — these are fetch-day artifacts

  // 2. Asset relevance — weighted by drama score
  for (const asset of topAssets.slice(0, 12)) {
    const drama = asset.technicals?.dramaScore ?? 0;
    if (drama < 8) continue;
    const keywords = getAssetKeywords(asset.symbol, asset.name);
    if (keywords.some((kw) => text.includes(kw))) {
      score += Math.max(2, Math.round(drama / 5)); // drama 30 → +6, drama 10 → +2
    }
  }

  // 3. Stock mover relevance — articles explaining why a mover moved
  // Split names like "Deere & Company" → try "deere", "company" (≥5 chars each)
  for (const mover of movers.slice(0, 20)) {
    const moverName = mover.name.toLowerCase();
    const segments = moverName
      .split(/[\s&,\-\/]+/)
      .filter((s) => s.length >= 5);
    const candidates = [moverName, ...segments];
    if (candidates.some((c) => c.length >= 4 && text.includes(c))) {
      score += 5;
    }
  }

  // 4. Source tier
  score += SOURCE_TIER[item.source] ?? 1;

  // 5. Language bonus — for a FR script, FR sources get a boost
  if (lang === "fr" && item.lang === "fr") score += 4;

  // 6. Category relevance
  score += CATEGORY_SCORE[item.category ?? ""] ?? 0;

  // 7. Noise penalty — irrelevant articles dragged in by broad RSS feeds
  if (NOISE_PATTERNS.some((p) => p.test(item.title))) score -= 10;

  return score;
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Select the most relevant news items for the LLM context.
 *
 * Replaces the naive slice(0, N) approach with a scoring model that weights:
 *   - Date: articles from the trading day itself score highest
 *   - Asset match: articles mentioning high-drama assets score higher
 *   - Mover match: articles explaining stock movers score higher
 *   - Source quality: ZoneBourse/Les Echos > Yahoo Finance > Google News
 *   - Language: FR sources boosted for FR scripts
 *   - Category: commodities/indices/macro > generic top news
 *   - Noise: personal finance / non-market articles penalized
 *
 * Also cleans HTML from summaries before returning.
 */
export function selectRelevantNews(
  news: NewsItem[],
  snapshot: DailySnapshot,
  lang: Language,
  maxItems = 40,
): NewsItem[] {
  const topAssets = [...snapshot.assets]
    .filter((a) => a.technicals)
    .sort((a, b) => (b.technicals!.dramaScore) - (a.technicals!.dramaScore));

  const movers = snapshot.stockScreen ?? [];

  const scored = news.map((item) => ({
    item,
    score: scoreItem(item, snapshot.date, topAssets, movers, lang),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, maxItems)
    .map((s) => ({
      ...s.item,
      summary: cleanSummary(s.item.summary),
    }));
}
