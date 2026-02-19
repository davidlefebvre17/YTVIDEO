import type { MarketSentiment } from "@yt-maker/core";

export async function fetchMarketSentiment(): Promise<MarketSentiment | undefined> {
  console.log("  Fetching market sentiment...");
  try {
    const [fearGreed, globalData, trending] = await Promise.all([
      fetchFearGreed(),
      fetchCoinGeckoGlobal(),
      fetchTrendingCoins(),
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

async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data.data?.[0];
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
    const res = await fetch("https://api.coingecko.com/api/v3/global", { headers });
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
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", { headers });
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
