import type { DailySnapshot, EarningsEvent, NewsItem } from "@yt-maker/core";
import { fetchAllAssets, fetchDailyCandles, fetchWeeklyCandles, fetchDaily3yCandles, DEFAULT_ASSETS } from "./yahoo";
import { fetchNews } from "./news";
import { fetchEconomicCalendar } from "./calendar";
import { computeTechnicals, computeMultiTFAnalysis, computePerf, getAssetGroup, computeSessionFields } from "./technicals";
import { fetchBondYields, fetchYieldsHistory } from "./fred";
import { fetchMarketSentiment } from "./sentiment";
import { fetchEarningsCalendar, fetchFinnhubNews, fetchFinnhubCompanyNews, fetchStockEarningsHistory } from "./finnhub";
import { fetchYahooEarnings, isEuropeanTicker } from "./yahoo-earnings";
import { fetchMarketauxNews } from "./marketaux";
import { screenStocks } from "./screening";
import { fetchPolymarketData } from "./polymarket";
import { fetchCOTPositioning } from "./cot";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Load all index constituents as a symbol→name map.
 * Used to enrich earnings with company names and filter small caps.
 */
function loadIndexConstituents(): Map<string, string> {
  const map = new Map<string, string>();
  const indicesDir = join(process.cwd(), "data", "indices");
  for (const file of ["sp500.json", "cac40.json", "dax40.json", "ftse100.json", "nikkei50.json", "hsi30.json"]) {
    const path = join(indicesDir, file);
    if (!existsSync(path)) continue;
    try {
      const data: Array<{ symbol: string; name: string }> = JSON.parse(readFileSync(path, "utf-8"));
      for (const entry of data) {
        map.set(entry.symbol.toUpperCase(), entry.name);
      }
    } catch { /* skip */ }
  }
  return map;
}

/**
 * Enrich earnings with company names from index constituents.
 */
function enrichEarningsNames(earnings: EarningsEvent[], constituents: Map<string, string>): void {
  for (const e of earnings) {
    const name = constituents.get(e.symbol.toUpperCase());
    if (name) e.name = name;
  }
}

export async function fetchMarketSnapshot(
  date?: string,
): Promise<DailySnapshot> {
  const snapshotDate = date || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const isHistorical = snapshotDate < today;
  console.log(`\nBuilding market snapshot for ${snapshotDate}...`);

  // Phase 1 — parallel fetches (network-bound)
  // NOTE: fetchFinnhubNews() returns only LIVE articles (Finnhub /news ignores from/to params).
  // In historical mode we skip it entirely to avoid today's news contaminating yesterday's snapshot.
  // fetchNews() receives targetDate to anchor its 24h window to snapshotDate in historical mode.
  const [assets, rssNews, calendar, yields, sentiment, earnings, yieldsHistory] = await Promise.all([
    fetchAllAssets(DEFAULT_ASSETS, snapshotDate),
    fetchNews(snapshotDate),
    fetchEconomicCalendar(snapshotDate),
    fetchBondYields(snapshotDate),
    fetchMarketSentiment(snapshotDate),
    fetchEarningsCalendar(snapshotDate),
    fetchYieldsHistory(snapshotDate),
  ]);

  // Fetch upcoming earnings (J+1 to J+21) for editorial context
  const futureDate = new Date(snapshotDate + "T12:00:00Z");
  futureDate.setDate(futureDate.getDate() + 21);
  const nextDay = new Date(snapshotDate + "T12:00:00Z");
  nextDay.setDate(nextDay.getDate() + 1);
  let earningsUpcoming: typeof earnings = [];
  try {
    earningsUpcoming = await fetchEarningsCalendar(
      nextDay.toISOString().split("T")[0],
      futureDate.toISOString().split("T")[0],
    );
  } catch (err) {
    console.warn(`  Upcoming earnings fetch failed: ${err}`);
  }
  const finnhubNews = isHistorical ? [] : await fetchFinnhubNews(snapshotDate);

  // Phase 1b — Polymarket + COT (independent of each other)
  const allCalendarEvents = [...calendar.yesterday, ...calendar.today, ...calendar.upcoming];
  const [polymarket, cotPositioning] = await Promise.all([
    fetchPolymarketData(allCalendarEvents),
    fetchCOTPositioning(),
  ]);

  // In historical mode, RSS feeds are stale (live-only). Supplement with:
  // - Finnhub /company-news: date-filtered, equity symbols only, 1 year depth
  // - Marketaux: date-filtered, FR + EN, 5000+ sources, free 100 req/day
  let companyNews: NewsItem[] = [];
  let marketauxNews: NewsItem[] = [];
  if (isHistorical) {
    [companyNews, marketauxNews] = await Promise.all([
      fetchFinnhubCompanyNews(DEFAULT_ASSETS.map((a) => a.symbol), snapshotDate),
      fetchMarketauxNews(snapshotDate),
    ]);
  }

  // Merge and dedup news (RSS + Finnhub general + company news + Marketaux if historical)
  const allNews = [...rssNews, ...finnhubNews, ...companyNews, ...marketauxNews];
  const seenTitles = new Set<string>();
  const news = allNews
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

  // Phase 2 — per-asset enrichment (sequential with throttle to avoid Yahoo rate-limit)
  console.log(`\nEnriching ${assets.length} assets (technicals + multi-TF)...`);

  // Strip today's partial intraday candle. The cutoff is strict (`< snapshotDate`)
  // so that the J candle — which has live OHLC and renders as a degenerate thin
  // line in the chart — is always excluded. Last kept candle is J-1.
  const stripPartial = <T extends { date?: string; c?: number | null }>(arr: T[], narrativeDate: string): T[] =>
    arr.filter((c) => {
      const d = (c.date || "").slice(0, 10);
      return d && d < narrativeDate;
    });

  /** Tail validity check : last kept candle must be on snapDate (or close to it,
   *  ≤ 3 calendar days back to allow weekends) AND have a non-null close. */
  const isTailValid = (candles: Array<{ date?: string; c?: number | null }>, narrativeDate: string): boolean => {
    if (candles.length === 0) return false;
    const last = candles[candles.length - 1];
    if (last.c == null || !Number.isFinite(last.c)) return false;
    const d = (last.date || "").slice(0, 10);
    if (!d) return false;
    const lag = (new Date(narrativeDate + "T12:00:00Z").getTime() - new Date(d + "T12:00:00Z").getTime()) / 86400000;
    return lag >= 0 && lag <= 3;
  };

  for (let ai = 0; ai < assets.length; ai++) {
    const asset = assets[ai];
    try {
      // Fetch all candle series in parallel for this asset
      let [dailyCandles, weeklyCandles, daily3yCandles] = await Promise.all([
        fetchDailyCandles(asset.symbol),       // 1d, 1mo  → technicals
        fetchWeeklyCandles(asset.symbol),      // 1wk, 10y → multi-TF macro
        fetchDaily3yCandles(asset.symbol),     // 1d, 3y   → multi-TF medium/short
      ]);

      // ── Retry on data gap : Yahoo sometimes returns the J-1 candle late
      // (missing entirely OR with c=null) when fetched too soon after close.
      // If the post-strip tail isn't valid (last candle older than 3 days OR
      // close is null), retry once with a short delay.
      let cleanDaily = stripPartial(dailyCandles, snapshotDate);
      let cleanDaily3y = stripPartial(daily3yCandles, snapshotDate);
      const tailValid = isTailValid(cleanDaily, snapshotDate) && isTailValid(cleanDaily3y, snapshotDate);
      if (!tailValid) {
        console.log(`  ${asset.name}: tail gap detected (last candle stale or null) — retrying after 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        try {
          const [retryDaily, retryDaily3y] = await Promise.all([
            fetchDailyCandles(asset.symbol),
            fetchDaily3yCandles(asset.symbol),
          ]);
          const retryClean = stripPartial(retryDaily, snapshotDate);
          const retryClean3y = stripPartial(retryDaily3y, snapshotDate);
          if (isTailValid(retryClean, snapshotDate) && isTailValid(retryClean3y, snapshotDate)) {
            cleanDaily = retryClean;
            cleanDaily3y = retryClean3y;
            dailyCandles = retryDaily;
            daily3yCandles = retryDaily3y;
            console.log(`  ${asset.name}: retry succeeded — fresh candles obtained`);
          } else {
            console.warn(`  ${asset.name}: retry still incomplete — narrative will use latest valid candle`);
            (asset as any).dataStale = true;
          }
        } catch (err) {
          console.warn(`  ${asset.name}: retry failed (${(err as Error).message.slice(0, 60)})`);
          (asset as any).dataStale = true;
        }
      }

      if (cleanDaily.length >= 10) {
        asset.dailyCandles = cleanDaily3y.length > cleanDaily.length ? cleanDaily3y : cleanDaily;

        // ── Session J-1 fields (overwrite intraday changePct with true session value) ──
        // pubDate = snapshotDate : filtre toute bougie dont date >= pubDate (partial intraday today).
        const sessionFields = computeSessionFields(asset.dailyCandles, asset.price, snapshotDate);
        if (sessionFields) {
          asset.sessionClose = sessionFields.sessionClose;
          asset.prevSessionClose = sessionFields.prevSessionClose;
          asset.sessionHigh = sessionFields.sessionHigh;
          asset.sessionLow = sessionFields.sessionLow;
          asset.sessionRange = sessionFields.sessionRange;
          asset.sessionRangePct = sessionFields.sessionRangePct;
          asset.sessionDate = sessionFields.sessionDate;
          asset.changePctNow = sessionFields.changePctNow;
          // OVERWRITE changePct (intraday) with session J-1 change — the meaningful value for narration
          asset.changePct = sessionFields.changePct;
          asset.change = sessionFields.sessionClose - sessionFields.prevSessionClose;
        }

        // Multi-TF FIRST (provides true 52w range + ATH + SMA200 for drama score)
        const multiTF = computeMultiTFAnalysis(weeklyCandles, cleanDaily3y, asset.price);
        if (multiTF) {
          asset.multiTF = multiTF;
        }

        // Multi-timeframe performance (rolling + calendaire + ATH / 52wLow)
        // pubDate filtering ensures perf is computed against session J-1 close, not intraday.
        const perf = computePerf(asset.dailyCandles, asset.price, snapshotDate);
        if (perf) asset.perf = perf;
        // Asset group pour comparaisons narratives entre pairs
        asset.group = getAssetGroup(asset.symbol);

        const newsForAsset = news.filter(
          (n) =>
            n.title.toLowerCase().includes(asset.name.toLowerCase()) ||
            n.title.toLowerCase().includes(asset.symbol.toLowerCase()),
        ).length;

        // Use 3y candles for robust EMA/RSI (750+ candles), fallback to 1-month
        const candlesForTechnicals = cleanDaily3y.length >= 50 ? cleanDaily3y : cleanDaily;
        asset.technicals = computeTechnicals(
          candlesForTechnicals,
          asset.price,
          asset.changePct,
          newsForAsset,
          asset.symbol,
          multiTF,
        );
        const t = asset.technicals;
        let line = `  ${asset.name}: RSI=${t.rsi14.toFixed(0)} trend=${t.trend} drama=${t.dramaScore.toFixed(1)}`;
        if (multiTF) {
          line += ` | SMA200=${multiTF.daily3y.sma200.toFixed(0)} ATH=${multiTF.weekly10y.distanceFromATH.toFixed(1)}%`;
        }
        console.log(line);
      }
    } catch (err) {
      console.warn(`  Failed to enrich ${asset.name}: ${err}`);
    }
    // Throttle between assets (3 requests each) to avoid Yahoo rate-limit
    if (ai < assets.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Phase 3 — stock screening (brief pause to avoid rate-limit after multi-TF calls)
  let stockScreen = undefined;
  try {
    await new Promise((r) => setTimeout(r, 2000));
    stockScreen = await screenStocks(snapshotDate);
  } catch (err) {
    console.warn(`  Stock screening failed: ${err}`);
  }

  // Phase 3a — Yahoo earnings (EU complement to Finnhub which is US-only)
  // Query Yahoo for European movers in stockScreen so we capture earnings publications
  // that Finnhub misses (Air Liquide, BNP, Airbus, BP, Shell, SAP, Siemens, etc.).
  // Output is merged into the same `earnings` array — same shape, P1 reads one unified source.
  if (stockScreen && stockScreen.length > 0) {
    const euMoverSymbols = stockScreen
      .map((s) => s.symbol)
      .filter(isEuropeanTicker);
    if (euMoverSymbols.length > 0) {
      try {
        const yahooEvents = await fetchYahooEarnings(euMoverSymbols, snapshotDate);
        // Dedup by symbol+date — Yahoo overrides Finnhub for EU symbols (Finnhub returned nothing for them anyway).
        const seenKeys = new Set(earnings.map((e) => `${e.symbol}_${e.date}`));
        for (const evt of yahooEvents) {
          const key = `${evt.symbol}_${evt.date}`;
          if (!seenKeys.has(key)) {
            earnings.push(evt);
            seenKeys.add(key);
          }
        }
      } catch (err) {
        console.warn(`  Yahoo earnings fetch failed: ${err}`);
      }
    }
  }

  // Phase 3b — earnings detail enrichment
  // For stocks in the screenings that also appear in the earnings calendar (today ±2 days)
  // and moved more than 2%, fetch EPS history (4Q) from Finnhub.
  if (stockScreen && stockScreen.length > 0 && earnings.length > 0) {
    const today = new Date(snapshotDate + "T12:00:00Z");
    const windowMs = 2 * 24 * 60 * 60 * 1000; // ±2 days
    const earningsWindow = earnings.filter((e) => {
      const diff = Math.abs(new Date(e.date + "T12:00:00Z").getTime() - today.getTime());
      return diff <= windowMs;
    });
    const earningsSymbols = new Set(earningsWindow.map((e) => e.symbol.toUpperCase()));

    // Candidates: in earnings window AND |changePct| > 2%
    const candidates = stockScreen.filter(
      (s) => earningsSymbols.has(s.symbol.toUpperCase()) && Math.abs(s.changePct) > 2,
    );

    if (candidates.length > 0) {
      console.log(`\nEarnings detail enrichment: ${candidates.length} candidates...`);
      // Cap at 10 to avoid rate-limit (60 req/min free tier)
      for (const stock of candidates.slice(0, 10)) {
        try {
          const history = await fetchStockEarningsHistory(stock.symbol);
          const calendarEntry = earningsWindow.find(
            (e) => e.symbol.toUpperCase() === stock.symbol.toUpperCase(),
          );
          const publishingToday = calendarEntry?.date === snapshotDate;
          stock.earningsDetail = {
            lastFourQuarters: history,
            currentQtrEpsEstimate: calendarEntry?.epsEstimate,
            publishingToday,
          };
          const flag = publishingToday ? " 🔴 PUBLIE AUJOURD'HUI" : "";
          console.log(`  ${stock.symbol}: ${history.length} quarters EPS history${flag}`);
          // Small delay to respect 60 req/min
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          console.warn(`  Earnings detail failed for ${stock.symbol}: ${err}`);
        }
      }
    }
  }

  // Dedup events by name+currency (timezone dupes)
  const dedupEvents = (events: typeof calendar.today) => {
    const seen = new Set<string>();
    return events.filter((e) => {
      const key = `${e.name}|${e.currency}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const dedupedToday = dedupEvents(calendar.today);
  const dedupedYesterday = dedupEvents(calendar.yesterday ?? []);

  // Enrich earnings with company names from index constituents
  const indexConstituents = loadIndexConstituents();
  enrichEarningsNames(earnings, indexConstituents);
  enrichEarningsNames(earningsUpcoming, indexConstituents);

  // Filter upcoming earnings: only keep companies in our tracked indices (J+1 to J+21)
  const filteredUpcoming = earningsUpcoming.filter(e => indexConstituents.has(e.symbol.toUpperCase()));
  if (earningsUpcoming.length > 0) {
    console.log(`  Earnings upcoming filtered: ${earningsUpcoming.length} → ${filteredUpcoming.length} (index constituents only)`);
  }

  const snapshot: DailySnapshot = {
    date: snapshotDate,
    assets,
    news,
    events: dedupedToday,
    yesterdayEvents: dedupedYesterday,
    upcomingEvents: calendar.upcoming,
    yields,
    yieldsHistory,
    sentiment,
    earnings,
    earningsUpcoming: filteredUpcoming.length > 0 ? filteredUpcoming : undefined,
    stockScreen,
    polymarket: polymarket.length > 0 ? polymarket : undefined,
    cotPositioning,
  };

  console.log(`\nSnapshot complete:`);
  console.log(`  Assets: ${assets.length} (${assets.filter(a => a.multiTF).length} with multi-TF)`);
  const newsLog = [
    `${rssNews.length} RSS`,
    !isHistorical ? `${finnhubNews.length} Finnhub` : "(Finnhub skipped—live only)",
    companyNews.length ? `${companyNews.length} company` : "",
    marketauxNews.length ? `${marketauxNews.length} Marketaux` : "",
  ].filter(Boolean).join(" + ");
  console.log(`  News: ${news.length} articles (${newsLog})`);
  console.log(`  Events today: ${calendar.today.length}`);
  if (calendar.yesterday.length > 0) console.log(`  Yesterday: ${calendar.yesterday.length} events`);
  if (calendar.upcoming.length > 0) console.log(`  Upcoming (7d): ${calendar.upcoming.length} events`);
  if (yields) console.log(`  Yields: 10Y=${yields.us10y}% 2Y=${yields.us2y}% spread=${yields.spread10y2y}%`);
  if (sentiment) console.log(`  Sentiment: F&G=${sentiment.cryptoFearGreed.value} BTC dom=${sentiment.btcDominance.toFixed(1)}%`);
  if (earnings.length > 0) console.log(`  Earnings today: ${earnings.length} reports`);
  if (earningsUpcoming.length > 0) console.log(`  Earnings upcoming (21d): ${earningsUpcoming.length} reports`);
  if (stockScreen && stockScreen.length > 0) console.log(`  Stock screening: ${stockScreen.length} flagged movers`);
  if (polymarket.length > 0) console.log(`  Polymarket: ${polymarket.length} prediction markets`);
  if (cotPositioning) console.log(`  COT: ${cotPositioning.contracts.length} contracts (${cotPositioning.reportDate})`);

  return snapshot;
}
