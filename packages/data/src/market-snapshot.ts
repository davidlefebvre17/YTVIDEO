import type { DailySnapshot } from "@yt-maker/core";
import { fetchAllAssets, fetchDailyCandles, DEFAULT_ASSETS } from "./yahoo";
import { fetchNews } from "./news";
import { fetchEconomicCalendar } from "./calendar";
import { computeTechnicals } from "./technicals";
import { fetchBondYields } from "./fred";
import { fetchMarketSentiment } from "./sentiment";
import { fetchTopMovers } from "./fmp";
import { fetchEarningsCalendar } from "./finnhub";

export async function fetchMarketSnapshot(
  date?: string,
): Promise<DailySnapshot> {
  const snapshotDate = date || new Date().toISOString().split("T")[0];
  console.log(`\nBuilding market snapshot for ${snapshotDate}...`);

  const [assets, news, calendar, yields, sentiment, topMovers, earnings] = await Promise.all([
    fetchAllAssets(DEFAULT_ASSETS, snapshotDate),
    fetchNews(20),
    fetchEconomicCalendar(snapshotDate),
    fetchBondYields(),
    fetchMarketSentiment(),
    fetchTopMovers(),
    fetchEarningsCalendar(snapshotDate),
  ]);

  // Enrich each asset with daily candles + technical indicators
  console.log("\nComputing technical indicators...");
  for (const asset of assets) {
    const dailyCandles = await fetchDailyCandles(asset.symbol);
    if (dailyCandles.length >= 10) {
      asset.dailyCandles = dailyCandles;
      const newsForAsset = news.filter(
        (n) =>
          n.title.toLowerCase().includes(asset.name.toLowerCase()) ||
          n.title.toLowerCase().includes(asset.symbol.toLowerCase()),
      ).length;
      asset.technicals = computeTechnicals(
        dailyCandles,
        asset.price,
        asset.changePct,
        newsForAsset,
      );
      const t = asset.technicals;
      if (t) {
        console.log(
          `  ${asset.name}: EMA9=${t.ema9.toFixed(2)} RSI=${t.rsi14.toFixed(0)} trend=${t.trend} drama=${t.dramaScore.toFixed(1)}`,
        );
      }
    }
  }

  const snapshot: DailySnapshot = {
    date: snapshotDate,
    assets,
    news,
    events: calendar.today,
    yesterdayEvents: calendar.yesterday,
    upcomingEvents: calendar.upcoming,
    yields,
    sentiment,
    topMovers,
    earnings,
  };

  console.log(`\nSnapshot complete: ${assets.length} assets, ${news.length} news, ${calendar.today.length} events today`);
  if (calendar.yesterday.length > 0) console.log(`  Yesterday: ${calendar.yesterday.length} events (with actuals)`);
  if (calendar.upcoming.length > 0) console.log(`  Upcoming (7d): ${calendar.upcoming.length} events`);
  if (yields) console.log(`  Yields: 10Y=${yields.us10y}% 2Y=${yields.us2y}% spread=${yields.spread10y2y}%`);
  if (sentiment) console.log(`  Sentiment: F&G=${sentiment.cryptoFearGreed.value} BTC dom=${sentiment.btcDominance.toFixed(1)}%`);
  if (topMovers) console.log(`  Top movers: ${topMovers.gainers.length} gainers, ${topMovers.losers.length} losers`);
  if (earnings.length > 0) console.log(`  Earnings: ${earnings.length} reports`);

  return snapshot;
}
