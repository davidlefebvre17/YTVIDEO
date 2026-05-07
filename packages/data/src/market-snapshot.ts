import type { DailySnapshot, EarningsEvent, NewsItem } from "@yt-maker/core";
import { fetchAllAssets, fetchDailyCandles, fetchWeeklyCandles, fetchDaily3yCandles, fetchHourlyCandles, DEFAULT_ASSETS } from "./yahoo";
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

  // Strip today's partial intraday candle while keeping the session we cover.
  //   - d <= narrativeDate : keep up to and including snapshotDate (the session
  //     being covered — its candle is complete by the time we run).
  //   - d <  todayUTC      : exclude today's candle which is in-progress with
  //     live OHLC and renders as a degenerate thin line on the chart.
  // For historical snaps (narrativeDate < today) only the first condition binds.
  // For a live snap where narrativeDate == today, the second excludes today.
  const todayUTC = today;
  const stripPartial = <T extends { date?: string; c?: number | null }>(arr: T[], narrativeDate: string): T[] =>
    arr.filter((c) => {
      const d = (c.date || "").slice(0, 10);
      if (!d) return false;
      return d <= narrativeDate && d < todayUTC;
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

  /**
   * Patch null closes on the tail of a daily candle array using the corresponding
   * hourly closes. Yahoo's daily aggregation lags for FX (the J-1 candle at 23:00
   * UTC has open valid but close=null while the 1h granularity holds the data).
   *
   * For each daily candle in the last 3 entries with c=null, find the latest
   * hourly close on the same UTC calendar day and copy it in. Mutates the array
   * in place. No-op if hourly fetch returns nothing.
   */
  const patchTailFromHourly = async <T extends { date?: string; c?: number | null }>(
    daily: T[],
    symbol: string,
  ): Promise<number> => {
    const tail = daily.slice(-3);
    const hasNull = tail.some((c) => c.c == null);
    if (!hasNull) return 0;

    const hourly = await fetchHourlyCandles(symbol);
    if (hourly.length === 0) return 0;

    // Index hourly closes by YYYY-MM-DD → keep the LAST close of each day.
    const lastCloseByDay = new Map<string, number>();
    for (const h of hourly) {
      if (h.c == null || !Number.isFinite(h.c)) continue;
      const day = (h.date || "").slice(0, 10);
      if (day) lastCloseByDay.set(day, h.c);
    }

    let patched = 0;
    for (let i = daily.length - 3; i < daily.length; i++) {
      const candle = daily[i];
      if (!candle || candle.c != null) continue;
      const day = (candle.date || "").slice(0, 10);
      const recovered = lastCloseByDay.get(day);
      if (recovered != null) {
        candle.c = recovered as any;
        patched++;
      }
    }
    return patched;
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

      // ── Patch missing closes from hourly data ────────────────────────────
      // Yahoo's daily aggregation lags for FX pairs : the J-1 candle stamped
      // at 23:00 UTC carries open=valid but close=null until ~24h later, even
      // though the 1h granularity holds the actual close earlier. Detect this
      // pattern in the daily tail and recover the missing close from the 1h
      // candles before downstream technicals consume the data.
      let cleanDaily = stripPartial(dailyCandles, snapshotDate);
      let cleanDaily3y = stripPartial(daily3yCandles, snapshotDate);
      const tailValid = isTailValid(cleanDaily, snapshotDate) && isTailValid(cleanDaily3y, snapshotDate);
      if (!tailValid) {
        const patched1d = await patchTailFromHourly(dailyCandles, asset.symbol);
        const patched3y = await patchTailFromHourly(daily3yCandles, asset.symbol);
        const totalPatched = patched1d + patched3y;
        if (totalPatched > 0) {
          cleanDaily = stripPartial(dailyCandles, snapshotDate);
          cleanDaily3y = stripPartial(daily3yCandles, snapshotDate);
          if (isTailValid(cleanDaily, snapshotDate) && isTailValid(cleanDaily3y, snapshotDate)) {
            console.log(`  ${asset.name}: tail patched from hourly (${totalPatched} close${totalPatched > 1 ? "s" : ""} recovered)`);
          } else {
            console.warn(`  ${asset.name}: hourly patch insufficient (${totalPatched} closes recovered) — using latest valid`);
            (asset as any).dataStale = true;
          }
        } else {
          console.warn(`  ${asset.name}: tail gap and hourly fallback also empty — using latest valid candle`);
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

  // Phase 2b — Drop or MARK assets based on their session vs the narrative date.
  //
  // `snapshotDate` est la NARRATIVE date (= session qu'on récap, ex: vendredi
  // pour un récap lundi matin). 4 cas :
  //
  // - Asset avec sessionDate === snapshotDate → KEEP active (TradFi standard)
  // - Asset avec sessionDate >  snapshotDate  → KEEP active (Crypto 24/7 sur Monday
  //                                             recap : BTC sessionDate=Sunday >
  //                                             Friday → moves weekend)
  // - Asset avec sessionDate <  snapshotDate  → KEEP **fermé** si lag ≤ 14j
  //                                             (HOLIDAY: marché légitimement fermé.
  //                                             On garde la dernière clôture valide
  //                                             + flag `marketClosed=true` + lag.
  //                                             dramaScore forcé à 0 pour ne pas
  //                                             squatter les top movers. Le LLM en
  //                                             parle brièvement via le prompt P3.)
  // - Asset avec sessionDate <  snapshotDate, lag > 14j  → DROP (data corrompue ou
  //                                             asset délisté — pas un holiday)
  // - Asset avec sessionDate manquant         → DROP (fetch broken)
  //
  // Le hourly tail-patch en amont a déjà recovered les closes legitimes en lag.
  // Seuls les vrais non-trading days et les data corrompues atteignent ce filtre.
  {
    const dropped: string[] = [];
    const closed: string[] = [];
    for (let i = assets.length - 1; i >= 0; i--) {
      const a = assets[i];
      const sd = a.sessionDate;
      if (!sd) {
        // Pas de session → fetch broken
        dropped.push(`${a.symbol} (no session)`);
        assets.splice(i, 1);
        continue;
      }
      if (sd < snapshotDate) {
        const lagDays = Math.round(
          (new Date(snapshotDate + "T12:00:00Z").getTime() -
            new Date(sd + "T12:00:00Z").getTime()) / 86400000,
        );
        if (lagDays > 14) {
          // Lag absurde → asset délisté ou data corrompue (pas un holiday réaliste)
          dropped.push(`${a.symbol} (last=${sd}, ${lagDays}d ago — too stale)`);
          assets.splice(i, 1);
          continue;
        }
        // Holiday legitime → garde avec flag, neutralise les indicateurs de mouvement
        a.marketClosed = true;
        a.daysSinceLastSession = lagDays;
        // Neutralise tous les indicateurs de "mouvement" puisque le marché n'a pas
        // tradé : 7+ consommateurs (p1-flagging, editorial-score, knowledge-matcher,
        // causal-chain-detector, etc.) utilisent Math.abs(asset.changePct) pour
        // détecter les top movers — sans cela, les closed assets squatteraient la
        // sélection avec leur changePct stale (ex: ^N225 +5.58% pré-Golden-Week).
        // Le sessionClose et les candles historiques restent intacts pour les
        // visuels (chart, ticker) — c'est juste le "delta du jour" qui devient nul.
        a.changePct = 0;
        a.changePctNow = 0;
        a.sessionRange = 0;
        a.sessionRangePct = 0;
        if (a.technicals) {
          a.technicals.dramaScore = 0;
        }
        closed.push(`${a.symbol} (last=${sd}, ${lagDays}d closed)`);
      }
      // sd >= snapshotDate → keep active (cas standard ou crypto weekend)
    }
    if (dropped.length > 0) {
      console.log(
        `  Dropped ${dropped.length} watchlist asset(s): ${dropped.slice(0, 8).join(", ")}${dropped.length > 8 ? ` (+${dropped.length - 8} more)` : ""}`,
      );
    }
    if (closed.length > 0) {
      console.log(
        `  Marketclosed (kept with stale data + dramaScore=0): ${closed.slice(0, 8).join(", ")}${closed.length > 8 ? ` (+${closed.length - 8} more)` : ""}`,
      );
    }

    // Garde-fou intégrité — basé sur le nombre d'assets ACTIFS (non-fermés).
    // Sur un jour férié majeur (Christmas, Tous les marchés fermés), 70%+ seraient
    // marqués marketClosed. On bloque le pipeline car récap mostly-stale n'a pas
    // de sens. Threshold : 15 actifs minimum (couvre Memorial Day = ~32 actifs OK,
    // refuse Christmas = ~5-8 actifs).
    const totalCount = assets.length + dropped.length;
    const activeCount = assets.filter((a) => !a.marketClosed).length;
    const closedCount = assets.length - activeCount;
    if (activeCount < 15) {
      throw new Error(
        `Snapshot data integrity check failed: only ${activeCount} ACTIVE assets ` +
          `(${closedCount} marketClosed, ${dropped.length} dropped, ${totalCount} total). ` +
          `Probable cause: ${snapshotDate} est un jour férié majeur (Christmas/New Year) où la plupart ` +
          `des marchés sont fermés. Pas de récap pertinent à produire ce jour-là — passer --date à une ` +
          `session de trading antérieure si tu veux quand même un récap.`,
      );
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

/**
 * Transforme un snapshot pour le mode Monday recap : remplace les valeurs daily
 * (changePct, sessionHigh/Low, dramaScore) par leurs équivalents HEBDOMADAIRES.
 *
 * Pourquoi : en Monday mode, le narratif doit raconter la SEMAINE écoulée
 * (lun→ven), pas la séance vendredi seule. Le drama score / sélection des movers
 * doit aussi se baser sur la perf hebdo, sinon on rate les movers de la semaine
 * qui n'ont pas bougé spécifiquement vendredi.
 *
 * Approche : "REPLACE" — les champs daily sont écrasés. Le pipeline downstream
 * (P1→P10) consomme les valeurs hebdo comme s'il s'agissait de la session à
 * récap. Les prompts P3/P4 ont déjà des règles "talk in weekly terms" en
 * `isMondayRecap` — leurs chiffres sont maintenant cohérents avec ces règles.
 *
 * Champs touchés par asset :
 *   - `changePct`              ← `perf.week` (rolling 7 jours, ≈ Friday vs prev Friday)
 *   - `sessionHigh`            ← max(highs des 5 derniers jours)
 *   - `sessionLow`             ← min(lows des 5 derniers jours)
 *   - `sessionRange`           ← sessionHigh - sessionLow
 *   - `sessionRangePct`        ← sessionRange / prevSessionClose
 *   - `prevSessionClose`       ← close il y a 5 jours ouvrés (= previous Friday close)
 *   - `technicals.dramaScore`  ← recomputé avec |changePct hebdo| au lieu de daily
 *
 * Inchangé :
 *   - `sessionDate` reste Friday (ancrage temporel pour P3/P4)
 *   - `sessionClose` reste Friday close
 *   - `multiTF`, `perf` (gardés intacts pour référence si prompts en ont besoin)
 *   - news, events, sentiment, etc.
 */
export function transformSnapshotForWeeklyMode(snapshot: DailySnapshot): void {
  let touched = 0;
  for (const asset of snapshot.assets) {
    const candles = (asset as any).dailyCandles ?? asset.candles ?? [];
    if (candles.length < 6) continue; // need ≥5 daily highs + 1 prior close

    const last5 = candles.slice(-5);
    const highs = last5.map((c: any) => c.h ?? c.c).filter((v: any) => Number.isFinite(v));
    const lows = last5.map((c: any) => c.l ?? c.c).filter((v: any) => Number.isFinite(v));
    const sessionHigh = highs.length ? Math.max(...highs) : undefined;
    const sessionLow = lows.length ? Math.min(...lows) : undefined;

    // prevSessionClose = close avant les 5 derniers jours ouvrés (= prev Friday close)
    const prevWeekCandle = candles[candles.length - 6];
    const prevSessionClose = prevWeekCandle?.c ?? asset.prevSessionClose;

    const oldChangePct = asset.changePct ?? 0;
    const newChangePct = asset.perf?.week ?? oldChangePct;

    asset.changePct = newChangePct;
    if (sessionHigh !== undefined) asset.sessionHigh = sessionHigh;
    if (sessionLow !== undefined) asset.sessionLow = sessionLow;
    if (sessionHigh !== undefined && sessionLow !== undefined) {
      asset.sessionRange = Math.round((sessionHigh - sessionLow) * 100) / 100;
      if (prevSessionClose && prevSessionClose > 0) {
        asset.sessionRangePct = Math.round((asset.sessionRange / prevSessionClose) * 10000) / 100;
      }
    }
    if (prevSessionClose) asset.prevSessionClose = prevSessionClose;

    // Recompute dramaScore: replace daily |changePct|*3 component with weekly |changePct|*3
    if (asset.technicals && Number.isFinite(asset.technicals.dramaScore)) {
      const dailyComponent = Math.abs(oldChangePct) * 3;
      const weeklyComponent = Math.abs(newChangePct) * 3;
      asset.technicals.dramaScore = Math.max(
        0,
        asset.technicals.dramaScore - dailyComponent + weeklyComponent,
      );
    }
    touched++;
  }
  console.log(`  [weekly-transform] Replaced daily fields with weekly equivalents on ${touched} assets`);
}
