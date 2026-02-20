import type { MarketSentiment } from "@yt-maker/core";

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 2,
): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 && i < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

export async function fetchMarketSentiment(targetDate?: string): Promise<MarketSentiment | undefined> {
  console.log("  Fetching market sentiment...");
  try {
    const isHistorical = targetDate && targetDate < new Date().toISOString().split("T")[0];
    const [fearGreed, globalData, trending] = await Promise.all([
      fetchFearGreed(isHistorical ? targetDate : undefined),
      fetchCoinGeckoGlobal(),
      // Trending coins are always live — no historical endpoint
      isHistorical ? Promise.resolve(undefined) : fetchTrendingCoins(),
    ]);

    if (!fearGreed) {
      console.warn("  Sentiment: fear & greed unavailable");
      return undefined;
    }

    const result: MarketSentiment = {
      cryptoFearGreed: fearGreed,
      btcDominance: globalData?.btcDominance ?? 0,
      trendingCoins: trending,
    };

    console.log(
      `  Sentiment: F&G=${result.cryptoFearGreed.value} (${result.cryptoFearGreed.label}) BTC dom=${result.btcDominance.toFixed(1)}%`,
    );
    return result;
  } catch (err) {
    console.warn(`  Sentiment error: ${err}`);
    return undefined;
  }
}

async function fetchFearGreed(targetDate?: string): Promise<{ value: number; label: string } | null> {
  try {
    // For historical dates, fetch last 90 days and find the matching entry
    const limit = targetDate ? 90 : 1;
    const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}&date_format=iso`);
    if (!res.ok) return null;
    const data = await res.json();

    let entry: { value: string; value_classification: string; timestamp: string } | undefined;
    if (targetDate) {
      // Find the entry whose date matches targetDate (format: "YYYY-MM-DD")
      entry = data.data?.find((d: { timestamp: string }) => d.timestamp.startsWith(targetDate));
      // Fallback: closest prior day (weekend/holiday gaps)
      if (!entry) {
        const sorted = (data.data ?? []).filter(
          (d: { timestamp: string }) => d.timestamp <= targetDate,
        );
        entry = sorted[0];
      }
    } else {
      entry = data.data?.[0];
    }

    if (!entry) return null;
    return {
      value: parseInt(entry.value, 10),
      label: entry.value_classification,
    };
  } catch {
    return null;
  }
}

async function fetchCoinGeckoGlobal(): Promise<{ btcDominance: number } | null> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["x-cg-demo-key"] = apiKey;
    }
    const res = await fetchWithRetry("https://api.coingecko.com/api/v3/global", headers);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      btcDominance: data.data?.market_cap_percentage?.btc ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchTrendingCoins(): Promise<Array<{ name: string; symbol: string; rank: number }> | undefined> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["x-cg-demo-key"] = apiKey;
    }
    const res = await fetchWithRetry("https://api.coingecko.com/api/v3/search/trending", headers);
    if (!res.ok) return undefined;
    const data = await res.json();
    return (data.coins || []).slice(0, 5).map(
      (c: { item: { name: string; symbol: string; market_cap_rank: number } }) => ({
        name: c.item.name,
        symbol: c.item.symbol,
        rank: c.item.market_cap_rank,
      }),
    );
  } catch {
    return undefined;
  }
}
