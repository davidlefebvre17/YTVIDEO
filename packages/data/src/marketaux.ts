import type { NewsItem } from "@yt-maker/core";

const MARKETAUX_BASE = "https://api.marketaux.com/v1/news/all";

function getApiKey(): string | undefined {
  return process.env.MARKETAUX_API_KEY;
}

interface MarketauxArticle {
  uuid: string;
  title: string;
  description: string;
  url: string;
  language: string;
  published_at: string;
  source: string;
  entities: Array<{
    symbol: string;
    name: string;
    type: string;
  }>;
}

interface MarketauxResponse {
  meta: { found: number; returned: number; limit: number; page: number };
  data: MarketauxArticle[];
}

/**
 * Fetch historical news for a specific date from Marketaux.
 * Supports date filtering (published_after / published_before) — unlike RSS feeds.
 *
 * Free tier returns 3 articles per request. Pagination is used to collect more.
 * Budget: maxPages * 2 API requests total (one fetch per language per page).
 *   - maxPages=3 (default) → 6 req/date, ~18 articles/date → ~16 dates/day of quota
 *   - maxPages=10          → 20 req/date, ~60 articles/date → 5 dates/day of quota
 *
 * Env: MARKETAUX_API_KEY (marketaux.com — free 100 req/day)
 */
export async function fetchMarketauxNews(
  targetDate: string,
  { maxPages = 3 }: { maxPages?: number } = {},
): Promise<NewsItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Marketaux: skipped (no MARKETAUX_API_KEY)");
    return [];
  }

  const after = `${targetDate}T00:00:00`;
  const before = `${targetDate}T23:59:59`;
  const results: NewsItem[] = [];
  const seenUrls = new Set<string>();

  for (const lang of ["fr", "en"] as const) {
    let totalFound = 0;
    let pagesFetched = 0;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const params = new URLSearchParams({
          api_token: apiKey,
          language: lang,
          published_after: after,
          published_before: before,
          sort: "published_on",
          sort_order: "desc",
          page: String(page),
          // Only articles with recognized financial entities (reduces noise: lottery, sports, etc.)
          must_have_entities: "true",
        });

        const res = await fetch(`${MARKETAUX_BASE}?${params}`);
        if (!res.ok) {
          console.warn(`  Marketaux (${lang} p${page}): HTTP ${res.status}`);
          break;
        }

        const data: MarketauxResponse = await res.json();
        totalFound = data.meta.found;
        pagesFetched++;

        let addedThisPage = 0;
        for (const item of data.data) {
          if (!item.url || seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);
          results.push({
            title: item.title,
            source: `Marketaux/${item.source}`,
            url: item.url,
            publishedAt: item.published_at,
            summary: item.description || undefined,
            category: inferCategory(item),
            lang,
          });
          addedThisPage++;
        }

        // Stop paginating if this page returned nothing (exhausted)
        if (data.data.length === 0) break;

        // Delay between page requests
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.warn(`  Marketaux (${lang} p${page}) error: ${err}`);
        break;
      }
    }

    const langCount = results.filter((n) => n.lang === lang).length;
    console.log(`  Marketaux (${lang}): ${langCount} articles fetched (${totalFound} available, ${pagesFetched} pages)`);
  }

  return results;
}

function inferCategory(item: MarketauxArticle): string {
  const cryptoSymbols = new Set(["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE"]);
  const hasCrypto = item.entities.some(
    (e) => cryptoSymbols.has(e.symbol) || e.type?.toLowerCase().includes("crypto"),
  );
  if (hasCrypto) return "crypto";
  const hasForex = item.entities.some((e) => e.type?.toLowerCase().includes("currency"));
  if (hasForex) return "forex";
  return "macro";
}
