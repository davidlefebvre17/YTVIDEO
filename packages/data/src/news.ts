import type { NewsItem } from "@yt-maker/core";

interface FeedConfig {
  url: string;
  source: string;
  lang: "fr" | "en";
  category: string;
}

const RSS_FEEDS: FeedConfig[] = [
  // Yahoo Finance per-symbole (10 feeds, EN)
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "indices" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^DJI&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "indices" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^IXIC&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "indices" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^FCHI&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "indices" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "commodities" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "commodities" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "crypto" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=ETH-USD&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "crypto" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURUSD=X&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "forex" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=DX-Y.NYB&region=US&lang=en-US", source: "Yahoo Finance", lang: "en", category: "forex" },

  // Sources FR natives (6 feeds — TIER 1, confirmées fév 2026)
  { url: "https://www.zonebourse.com/sitemap/GOOGL5500A55A2Q1QS24QS9A87A/news-our-articles.rss", source: "ZoneBourse", lang: "fr", category: "macro" },
  { url: "https://www.tradingsat.com/rssbourse.xml", source: "TradingSat/BFM", lang: "fr", category: "indices" },
  { url: "https://feeds.feedburner.com/lesechos/4MR4suAcqTl", source: "Les Echos Marchés", lang: "fr", category: "macro" },
  { url: "https://feeds.feedburner.com/lesechos/BrFLB6ZLde7", source: "Les Echos Valeurs", lang: "fr", category: "indices" },
  { url: "https://www.agefi.fr/news/economie-marches.rss", source: "L'Agefi", lang: "fr", category: "macro" },
  { url: "https://www.easybourse.com/feeds/media/", source: "EasyBourse", lang: "fr", category: "macro" },

  // CNBC (2 feeds, EN — journalisme pro US)
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069", source: "CNBC Investing", lang: "en", category: "macro" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", source: "CNBC Economy", lang: "en", category: "macro" },

  // Crypto spécialisé (2 feeds, EN)
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", lang: "en", category: "crypto" },
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph", lang: "en", category: "crypto" },

  // Forex spécialisé (1 feed, EN)
  { url: "https://www.fxstreet.com/rss/news", source: "FXStreet", lang: "en", category: "forex" },

  // Investing.com FR (3 feeds, FR — complément thématique)
  { url: "https://fr.investing.com/rss/commodities.rss", source: "Investing.com FR", lang: "fr", category: "commodities" },
  { url: "https://fr.investing.com/rss/forex.rss", source: "Investing.com FR", lang: "fr", category: "forex" },
  { url: "https://fr.investing.com/rss/market_overview.rss", source: "Investing.com FR", lang: "fr", category: "macro" },

  // Google News ciblés (6 feeds, EN+FR — agrégation multi-sources)
  { url: "https://news.google.com/rss/search?q=Federal+Reserve+ECB+interest+rate+inflation&hl=en-US&gl=US&ceid=US:en", source: "Google News EN", lang: "en", category: "macro" },
  { url: "https://news.google.com/rss/search?q=gold+oil+commodity+price&hl=en-US&gl=US&ceid=US:en", source: "Google News EN", lang: "en", category: "commodities" },
  { url: "https://news.google.com/rss/search?q=bitcoin+ethereum+crypto+market&hl=en-US&gl=US&ceid=US:en", source: "Google News EN", lang: "en", category: "crypto" },
  { url: "https://news.google.com/rss/search?q=bourse+CAC+40+Paris&hl=fr&gl=FR&ceid=FR:fr", source: "Google News FR", lang: "fr", category: "indices" },
  { url: "https://news.google.com/rss/search?q=BCE+Fed+taux+inflation&hl=fr&gl=FR&ceid=FR:fr", source: "Google News FR", lang: "fr", category: "macro" },
  { url: "https://news.google.com/rss/search?q=or+petrole+matieres+premieres&hl=fr&gl=FR&ceid=FR:fr", source: "Google News FR", lang: "fr", category: "commodities" },
];

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseRssXml(xml: string, feed: FeedConfig): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || itemXml.match(/<title>(.*?)<\/title>/)?.[1]
      || "";
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || itemXml.match(/<description>(.*?)<\/description>/)?.[1];

    // content:encoded = richer content (full article or long excerpt)
    const contentEncoded = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1]
      || itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1];

    // Pick the best available summary: content:encoded > description
    const rawSummary = contentEncoded || description;
    // Strip HTML tags, decode entities, trim to reasonable length
    const summary = rawSummary
      ? stripHtml(rawSummary).slice(0, 500).trim() || undefined
      : undefined;

    if (title) {
      items.push({
        title: title.trim(),
        source: feed.source,
        url: link.trim(),
        publishedAt: parseRssDate(pubDate),
        summary,
        category: feed.category,
        lang: feed.lang,
      });
    }
  }

  return items;
}

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRssXml(xml, feed);
}

export async function fetchNews(targetDate?: string): Promise<NewsItem[]> {
  console.log(`Fetching financial news from ${RSS_FEEDS.length} feeds (parallel)...`);

  const results = await Promise.allSettled(RSS_FEEDS.map((feed) => fetchFeed(feed)));

  const allNews: NewsItem[] = [];
  let succeeded = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      allNews.push(...result.value);
      succeeded++;
    } else {
      console.warn(`  [${RSS_FEEDS[i].source}] Failed: ${result.reason}`);
    }
  }
  console.log(`  ${succeeded}/${RSS_FEEDS.length} feeds OK, ${allNews.length} raw articles`);

  // In historical mode, anchor the window to snapshotDate (00:00 → 23:59 UTC).
  // In live mode, keep a rolling 48h window anchored to now.
  // This prevents today's morning articles from contaminating a yesterday snapshot.
  const today = new Date().toISOString().split("T")[0];
  const isHistorical = targetDate && targetDate < today;
  const cutoff = isHistorical
    ? new Date(targetDate + "T00:00:00.000Z")
    : new Date(Date.now() - 48 * 60 * 60 * 1000);
  const ceiling = isHistorical ? new Date(targetDate + "T23:59:59.999Z") : null;

  const recent = allNews.filter((item) => {
    const t = new Date(item.publishedAt);
    return t >= cutoff && (!ceiling || t <= ceiling);
  });
  const label = isHistorical ? `day of ${targetDate}` : "last 48h";
  console.log(`  Filtered to ${label}: ${recent.length}/${allNews.length} articles`);

  // Deduplicate by normalized title
  const seen = new Set<string>();
  const unique = recent
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const oldest = unique[unique.length - 1]?.publishedAt?.slice(0, 16) ?? "?";
  const newest = unique[0]?.publishedAt?.slice(0, 16) ?? "?";
  console.log(`Got ${unique.length} unique news (${oldest} → ${newest})`);
  return unique;
}
