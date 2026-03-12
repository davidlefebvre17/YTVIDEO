import type { EconomicEvent, EarningsEvent, EarningsQuarter, NewsItem } from "@yt-maker/core";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string | undefined {
  return process.env.FINNHUB_API_KEY;
}

export async function fetchEconomicCalendar(
  from: string,
  to?: string,
): Promise<EconomicEvent[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Finnhub calendar: skipped (no FINNHUB_API_KEY)");
    return [];
  }

  const toDate = to || from;
  const url = `${FINNHUB_BASE}/calendar/economic?from=${from}&to=${toDate}&token=${apiKey}`;
  console.log("  Fetching economic calendar from Finnhub...");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub economic: ${res.status}`);
    const data = await res.json();

    const events: EconomicEvent[] = (data.economicCalendar || []).map(
      (e: {
        event: string;
        time: string;
        country: string;
        impact: string;
        estimate: string;
        prev: string;
        actual: string;
      }) => ({
        name: e.event,
        date: from,
        time: e.time || "00:00",
        currency: e.country || "USD",
        impact: mapImpact(e.impact),
        forecast: e.estimate ?? undefined,
        previous: e.prev ?? undefined,
        actual: e.actual ?? undefined,
      }),
    );

    console.log(`  Finnhub: ${events.length} economic events`);
    return events;
  } catch (err) {
    console.warn(`  Finnhub economic calendar error: ${err}`);
    return [];
  }
}

export async function fetchEarningsCalendar(
  from: string,
  to?: string,
): Promise<EarningsEvent[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Finnhub earnings: skipped (no FINNHUB_API_KEY)");
    return [];
  }

  const toDate = to || from;
  const url = `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${toDate}&token=${apiKey}`;
  console.log("  Fetching earnings calendar from Finnhub...");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub earnings: ${res.status}`);
    const data = await res.json();

    const earnings: EarningsEvent[] = (data.earningsCalendar || []).map(
      (e: {
        symbol: string;
        date: string;
        epsEstimate: number;
        epsActual: number;
        revenueEstimate: number;
        revenueActual: number;
        hour: string;
      }) => ({
        symbol: e.symbol,
        date: e.date,
        epsEstimate: e.epsEstimate ?? undefined,
        epsActual: e.epsActual ?? undefined,
        revenueEstimate: e.revenueEstimate ?? undefined,
        revenueActual: e.revenueActual ?? undefined,
        hour: mapHour(e.hour),
        reported: e.epsActual != null,
      }),
    );

    console.log(`  Finnhub: ${earnings.length} earnings events`);
    return earnings;
  } catch (err) {
    console.warn(`  Finnhub earnings calendar error: ${err}`);
    return [];
  }
}

export async function fetchFinnhubNews(targetDate?: string): Promise<NewsItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Finnhub news: skipped (no FINNHUB_API_KEY)");
    return [];
  }

  // NOTE: Finnhub /news (general) does NOT support date filtering — from/to params are silently ignored.
  // Only /company-news supports historical date ranges. General news is always live.
  const url = `${FINNHUB_BASE}/news?category=general&token=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub news: ${res.status}`);
    const data = await res.json();

    const news: NewsItem[] = (data as Array<{
      headline: string;
      source: string;
      url: string;
      datetime: number;
      summary: string;
      category: string;
    }>).map((item) => ({
      title: item.headline,
      source: `Finnhub/${item.source}`,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      summary: item.summary,
      category: item.category || "macro",
      lang: "en" as const,
    }));

    console.log(`  Finnhub news: ${news.length} articles`);
    return news;
  } catch (err) {
    console.warn(`  Finnhub news error: ${err}`);
    return [];
  }
}

/**
 * Fetch historical company news for a set of symbols on a specific date.
 * /company-news DOES support from/to date filtering (unlike /news general).
 * Used for historical mode to get dated news when RSS feeds have expired.
 * Rate limit: 60 req/min — batch with small delays.
 */
export async function fetchFinnhubCompanyNews(
  symbols: string[],
  targetDate: string,
): Promise<NewsItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const to = nextDay(targetDate);
  const results: NewsItem[] = [];
  const seenUrls = new Set<string>();

  for (const symbol of symbols) {
    // Skip non-equity symbols (futures =F, forex =X, indices ^, crypto -USD)
    if (/[=^]/.test(symbol) || symbol.endsWith("-USD") || symbol.endsWith("=F")) continue;
    try {
      const url = `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${targetDate}&to=${to}&token=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: Array<{
        headline: string;
        source: string;
        url: string;
        datetime: number;
        summary: string;
        category: string;
      }> = await res.json();
      for (const item of data.slice(0, 5)) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        results.push({
          title: item.headline,
          source: `Finnhub/${item.source}`,
          url: item.url,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
          summary: item.summary,
          category: item.category || "business",
          lang: "en" as const,
        });
      }
      // Respect rate limit
      await new Promise((r) => setTimeout(r, 150));
    } catch {
      // skip silently per symbol
    }
  }

  console.log(`  Finnhub company news (historical): ${results.length} articles for ${targetDate}`);
  return results;
}

function nextDay(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function mapImpact(impact: string): "high" | "medium" | "low" {
  const n = parseInt(impact, 10);
  if (n >= 3) return "high";
  if (n === 2) return "medium";
  return "low";
}

function mapHour(hour: string): "bmo" | "amc" | "dmh" {
  if (hour === "bmo") return "bmo";
  if (hour === "amc") return "amc";
  return "dmh";
}

/**
 * Fetch EPS history for a single stock: last 4 quarters with actual, estimate, surprise %.
 * Uses Finnhub /stock/earnings — free tier, no premium needed.
 * Revenue quarterly is NOT available on free tier (requires Yahoo quoteSummary auth or Finnhub premium).
 */
export async function fetchStockEarningsHistory(symbol: string): Promise<EarningsQuarter[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${FINNHUB_BASE}/stock/earnings?symbol=${encodeURIComponent(symbol)}&limit=5&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data: Array<{
      actual: number | null;
      estimate: number | null;
      surprisePercent: number | null;
      period: string;
      quarter: number;
      year: number;
    }> = await res.json();

    return data
      .filter((q) => q.period)
      .slice(0, 4)
      .map((q) => ({
        period: q.period,
        quarter: q.quarter,
        year: q.year,
        epsActual: q.actual ?? undefined,
        epsEstimate: q.estimate ?? undefined,
        surprisePct: q.surprisePercent ?? undefined,
      }));
  } catch {
    return [];
  }
}
