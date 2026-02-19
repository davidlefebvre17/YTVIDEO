import type { NewsItem } from "@yt-maker/core";

const RSS_FEEDS = [
  // Yahoo Finance feeds
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^DJI&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F&region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^VIX&region=US&lang=en-US", source: "Yahoo Finance" },
  // Google News
  { url: "https://news.google.com/rss/search?q=bourse+march%C3%A9s+financiers&hl=fr&gl=FR&ceid=FR:fr", source: "Google News FR" },
  { url: "https://news.google.com/rss/search?q=stock+market&hl=en-US&gl=US&ceid=US:en", source: "Google News EN" },
];

function parseRssXml(xml: string, source: string): NewsItem[] {
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

    if (title) {
      items.push({
        title: title.trim(),
        source,
        url: link.trim(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: description?.trim(),
      });
    }
  }

  return items;
}

/**
 * Pick news spread across the full time range instead of only the most recent.
 * Divides available news into hourly buckets and picks proportionally from each.
 */
function spreadAcrossDay(sorted: NewsItem[], max: number): NewsItem[] {
  if (sorted.length <= max) return sorted;

  // Group by hour bucket
  const buckets = new Map<string, NewsItem[]>();
  for (const item of sorted) {
    const hour = item.publishedAt.slice(0, 13); // "2026-02-19T15"
    if (!buckets.has(hour)) buckets.set(hour, []);
    buckets.get(hour)!.push(item);
  }

  // Sort buckets by time (most recent first)
  const sortedBuckets = [...buckets.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  // Round-robin: pick from each bucket proportionally
  const result: NewsItem[] = [];
  const perBucket = Math.max(1, Math.floor(max / sortedBuckets.length));
  const remainder = max - perBucket * sortedBuckets.length;

  for (let i = 0; i < sortedBuckets.length; i++) {
    const items = sortedBuckets[i][1];
    // Give extra slots to more recent buckets
    const take = perBucket + (i < remainder ? 1 : 0);
    result.push(...items.slice(0, take));
  }

  // Sort final selection by date descending
  return result
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, max);
}

export async function fetchNews(maxItems = 20): Promise<NewsItem[]> {
  console.log("Fetching financial news...");
  const allNews: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const xml = await res.text();
      const items = parseRssXml(xml, feed.source);
      allNews.push(...items);
    } catch (err) {
      console.warn(`  Failed to fetch RSS from ${feed.source}: ${err}`);
    }
  }

  // Deduplicate by normalized title (lowercase, trimmed)
  const seen = new Set<string>();
  const unique = allNews
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Spread selection across time to cover the full day, not just the last hour
  const selected = spreadAcrossDay(unique, maxItems);

  const oldest = selected[selected.length - 1]?.publishedAt?.slice(0, 16) ?? "?";
  const newest = selected[0]?.publishedAt?.slice(0, 16) ?? "?";
  console.log(`Got ${unique.length} unique news, selected ${selected.length} (${oldest} → ${newest})`);
  return selected;
}
