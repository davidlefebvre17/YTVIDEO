import type { Candle, TechnicalIndicators, MultiTimeframeAnalysis, AssetSnapshot, AssetGroup } from "@yt-maker/core";
import { findSignificantPivots } from "./market-memory/zone-detector";

/**
 * Compute multi-timeframe performance from daily candles + current price.
 * - Rolling (week/month/quarter/year) : fenêtres glissantes en jours de bourse
 * - Calendaire (wtd/mtd/qtd/ytd) : depuis la clôture de la période précédente
 * - Extrêmes (fromATH, from52wLow)
 *
 * Graceful degradation : champs omis si l'historique est insuffisant (nouvelle IPO, etc.).
 */
export function computePerf(
  candles: Candle[],
  currentPrice: number,
  pubDate?: string,
): AssetSnapshot["perf"] {
  if (!candles || candles.length === 0 || !currentPrice || !Number.isFinite(currentPrice)) {
    return undefined;
  }

  // Filter out the partial "today" candle if pubDate provided (futures/FX 24h).
  // Ensures all perf references are computed against the J-1 session, not intraday.
  const completed = pubDate
    ? candles.filter((c) => {
        const d = (c.date || "").slice(0, 10);
        return d && d < pubDate && c.c != null && Number.isFinite(c.c);
      })
    : candles.filter((c) => c.c != null && Number.isFinite(c.c));
  if (completed.length === 0) return undefined;

  // Reference price = session J-1 close (NOT current intraday price).
  // This keeps week/month/YTD consistent with the session the video covers.
  const referencePrice = completed[completed.length - 1].c;
  if (!Number.isFinite(referencePrice) || referencePrice === 0) return undefined;

  const ref = (n: number): number | undefined => {
    const idx = completed.length - 1 - n;
    if (idx < 0) return undefined;
    return completed[idx].c;
  };

  const pctFrom = (past: number | undefined): number | undefined => {
    if (past === undefined || !Number.isFinite(past) || past === 0) return undefined;
    return ((referencePrice - past) / past) * 100;
  };

  const perf: AssetSnapshot["perf"] = {};

  // ── ROLLING (fenêtres glissantes, référence = sessionClose J-1) ──
  const w = pctFrom(ref(5));
  if (w !== undefined) perf.week = round2(w);
  const m = pctFrom(ref(22));
  if (m !== undefined) perf.month = round2(m);
  const q = pctFrom(ref(66));
  if (q !== undefined) perf.quarter = round2(q);
  const y = pctFrom(ref(252));
  if (y !== undefined) perf.year = round2(y);

  // ── CALENDAIRE — référence = dernière clôture AVANT le début de la période ──
  const lastCandleDate = completed[completed.length - 1].date.slice(0, 10);

  const wtdRef = lastCloseBefore(completed, startOfWeek(lastCandleDate));
  if (wtdRef !== undefined) perf.wtd = round2(pctFrom(wtdRef)!);

  const mtdRef = lastCloseBefore(completed, startOfMonth(lastCandleDate));
  if (mtdRef !== undefined) perf.mtd = round2(pctFrom(mtdRef)!);

  const qtdRef = lastCloseBefore(completed, startOfQuarter(lastCandleDate));
  if (qtdRef !== undefined) perf.qtd = round2(pctFrom(qtdRef)!);

  const ytdRef = lastCloseBefore(completed, startOfYear(lastCandleDate));
  if (ytdRef !== undefined) perf.ytd = round2(pctFrom(ytdRef)!);

  // ── ATH & 52w low — calculés sur completed pour rester cohérent ──
  let ath = -Infinity;
  for (const c of completed) if (c.h > ath) ath = c.h;
  if (ath > 0 && Number.isFinite(ath)) {
    perf.fromATH = round2(((referencePrice - ath) / ath) * 100);
  }

  const last252 = completed.slice(-252);
  if (last252.length > 0) {
    let low52w = Infinity;
    for (const c of last252) if (c.l < low52w) low52w = c.l;
    if (low52w > 0 && Number.isFinite(low52w)) {
      perf.from52wLow = round2(((referencePrice - low52w) / low52w) * 100);
    }
  }

  return perf;
}

// ── Helpers calendaires ──

function startOfWeek(dateIso: string): string {
  // Return last Sunday's date (= cutoff : lundi de la semaine en cours)
  const d = new Date(dateIso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

function startOfMonth(dateIso: string): string {
  return dateIso.slice(0, 7) + "-01";
}

function startOfQuarter(dateIso: string): string {
  const year = dateIso.slice(0, 4);
  const month = parseInt(dateIso.slice(5, 7), 10);
  // Q1: jan-mar, Q2: apr-jun, Q3: jul-sep, Q4: oct-dec
  const qStartMonth = month - ((month - 1) % 3);
  return `${year}-${String(qStartMonth).padStart(2, "0")}-01`;
}

function startOfYear(dateIso: string): string {
  return dateIso.slice(0, 4) + "-01-01";
}

function lastCloseBefore(candles: Candle[], cutoffDate: string): number | undefined {
  for (let i = candles.length - 1; i >= 0; i--) {
    const cd = (candles[i].date || "").slice(0, 10);
    if (cd && cd < cutoffDate) return candles[i].c;
  }
  return undefined;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Extract the J-1 session candle from dailyCandles, relative to `pubDate`.
 * Returns the last candle strictly before pubDate (handles equity/FX/futures uniformly).
 *
 * Edge cases:
 * - If Yahoo has a "partial today candle" (futures/FX 24h), it's filtered out.
 * - For FX/commodities where Yahoo daily aggregation has gaps (e.g. missing Monday candle),
 *   returns the most recent available candle (graceful degradation).
 */
export function computeSessionFields(
  dailyCandles: Candle[],
  currentPrice: number,
  pubDate: string,
): {
  sessionClose: number;
  prevSessionClose: number;
  sessionHigh: number;
  sessionLow: number;
  sessionRange: number;
  sessionRangePct: number;
  sessionDate: string;
  changePct: number;
  changePctNow: number;
} | undefined {
  if (!dailyCandles || dailyCandles.length < 2) return undefined;
  // Filter: keep candles up to AND INCLUDING pubDate (the session being covered),
  // with a real close. pubDate is the snap date / session day, NOT "today".
  // Yahoo's daily endpoint sometimes returns candles with close=null (FX edge case,
  // e.g. EURUSD 2026-04-21 had O=1.1744 but C=null). Skip these dégénérées.
  // The caller (market-snapshot) is responsible for stripping today's partial
  // candle before feeding us; we only enforce the upper bound and validity here.
  const completed = dailyCandles.filter((c) => {
    const d = (c.date || "").slice(0, 10);
    return d && d <= pubDate && c.c != null && Number.isFinite(c.c);
  });
  if (completed.length < 2) return undefined;
  const sess = completed[completed.length - 1];
  const prev = completed[completed.length - 2];
  if (!sess.c || !prev.c || prev.c === 0) return undefined;
  const sessionRange = (sess.h ?? sess.c) - (sess.l ?? sess.c);
  return {
    sessionClose: sess.c,
    prevSessionClose: prev.c,
    sessionHigh: sess.h ?? sess.c,
    sessionLow: sess.l ?? sess.c,
    sessionRange: round2(sessionRange),
    sessionRangePct: round2((sessionRange / prev.c) * 100),
    sessionDate: (sess.date || "").slice(0, 10),
    changePct: round2(((sess.c - prev.c) / prev.c) * 100),
    changePctNow: round2(((currentPrice - sess.c) / sess.c) * 100),
  };
}

// ── Asset grouping (pour comparaisons narratives entre pairs) ──

/**
 * Map a ticker to its asset group. Used to identify comparable peers in narrative
 * (ex: S&P vs CAC = both US_INDEX / EU_INDEX, divergence = narrative moment).
 */
export function getAssetGroup(symbol: string): AssetGroup {
  const s = symbol || "";
  // Indices
  if (/^\^(GSPC|IXIC|DJI|NYA|RUT)$/.test(s)) return "US_INDEX";
  if (/^\^(FCHI|GDAXI|FTSE|STOXX|IBEX|AEX|SSMI)$/.test(s)) return "EU_INDEX";
  if (/^\^(N225|HSI|KS11|TWII|AXJO)$/.test(s) || s === "000001.SS" || s === "399001.SZ") return "ASIA_INDEX";
  if (s === "^VIX") return "VOLATILITY";
  // Bonds
  if (/^\^(TNX|TYX|FVX|IRX)$/.test(s)) return "BOND_US";
  // FX
  if (s.includes("=X") || s === "DX-Y.NYB") return "FX_MAJOR";
  // Futures
  if (/^(CL|BZ|NG)=F$/.test(s)) return "ENERGY";
  if (/^(GC|SI|HG|PL|PA)=F$/.test(s)) return "METAL";
  if (/^(ZW|ZC|ZS|KC|SB|CC|CT)=F$/.test(s)) return "AGRI";
  // Crypto
  if (s.endsWith("-USD")) return "CRYPTO";
  // Regional stocks
  if (s.endsWith(".PA")) return "STOCK_FR";
  if (s.endsWith(".DE")) return "STOCK_DE";
  if (s.endsWith(".L")) return "STOCK_UK";
  if (s.endsWith(".T")) return "STOCK_JP";
  if (s.endsWith(".HK")) return "STOCK_HK";
  if (s.endsWith(".SS") || s.endsWith(".SZ")) return "STOCK_CN";
  // Sector ETFs
  if (/^(XL[A-Z]|VGT|VFH|XBI|SMH|KRE|IWM|SPY|QQQ|DIA)$/.test(s)) return "ETF_SECTOR";
  // Default: single stock (US when no suffix)
  if (/^[A-Z.\-]{1,6}$/.test(s)) return "STOCK_US";
  return "OTHER";
}

/**
 * Compute RSI (Relative Strength Index) over closing prices.
 */
function computeRSI(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 50; // neutral default
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = candles[i].c - candles[i - 1].c;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smooth with remaining candles
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].c - candles[i - 1].c;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Detect round numbers near current price as psychological levels.
 */
function findRoundNumbers(price: number): number[] {
  const levels: number[] = [];
  // Determine the magnitude for rounding
  const magnitude = Math.pow(10, Math.floor(Math.log10(price)) - 1);
  const rounded = Math.round(price / magnitude) * magnitude;
  // Nearest round levels above and below
  const below = rounded <= price ? rounded : rounded - magnitude;
  const above = below + magnitude;
  if (Math.abs(below - price) / price < 0.03) levels.push(below);
  if (Math.abs(above - price) / price < 0.03) levels.push(above);
  return levels;
}

/**
 * Compute SMA (Simple Moving Average) over closing prices.
 */
function computeSMA(candles: Candle[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1]?.c ?? 0;
  const slice = candles.slice(-period);
  return slice.reduce((sum, c) => sum + c.c, 0) / period;
}

function detectMTFTrend(candles: Candle[], period: number): "bull" | "bear" | "range" {
  if (candles.length < period) return "range";
  const recent = candles.slice(-period);
  const first = recent[0].c;
  const last = recent[recent.length - 1].c;
  const change = (last - first) / first;
  if (change > 0.05) return "bull";
  if (change < -0.05) return "bear";
  return "range";
}

/**
 * Compute multi-timeframe analysis from weekly 10y + daily 3y candles.
 * Returns null if not enough data.
 */
export function computeMultiTFAnalysis(
  weeklyCandles: Candle[],
  daily3yCandles: Candle[],
  currentPrice: number,
): MultiTimeframeAnalysis | null {
  if (weeklyCandles.length < 104 || daily3yCandles.length < 200) return null;

  // ── Weekly 10y ──────────────────────────────────────────────────
  const athPrice = Math.max(...weeklyCandles.map((c) => c.h));
  const atlPrice = Math.min(...weeklyCandles.map((c) => c.l));
  const ema52w = computeSMA(weeklyCandles, 52);
  const weeklyTrend = detectMTFTrend(weeklyCandles, 52);

  // Major support/resistance from last 2 years (104 weekly candles)
  const last104w = weeklyCandles.slice(-104);
  const majorResistance = Math.max(...last104w.map((c) => c.h));
  const majorSupport = Math.min(...last104w.map((c) => c.l));

  // ── Daily 3y ────────────────────────────────────────────────────
  const sma200 = computeSMA(daily3yCandles, 200);
  const sma50 = computeSMA(daily3yCandles, 50);
  const rsi14Daily = computeRSI(daily3yCandles, 14);
  const daily3yTrend = detectMTFTrend(daily3yCandles, 50);

  // ── Daily 1y (last 252 trading days slice of 3y) ─────────────────
  const daily1y = daily3yCandles.slice(-252);
  const high52w = Math.max(...daily1y.map((c) => c.h));
  const low52w = Math.min(...daily1y.map((c) => c.l));
  const daily1yTrend = detectMTFTrend(daily1y, 20);

  // Volatility 20d: annualized std dev of daily returns
  // Filter out null closes (Yahoo returns null for today's unfinished session)
  const validCandles = daily3yCandles.filter(c => c.c != null);
  const last21 = validCandles.slice(-21);
  const returns: number[] = [];
  for (let i = 1; i < last21.length; i++) {
    returns.push((last21[i].c - last21[i - 1].c) / last21[i - 1].c);
  }
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
  const volatility20d = Math.sqrt(variance) * Math.sqrt(252) * 100;

  // Volume vs 20d average — require 10+ non-zero days for reliable signal
  // Futures roll days and forex (no volume) are excluded from the calculation
  const last20d = validCandles.slice(-20);
  const validVols20 = last20d.filter((c) => c.v > 0);
  const avgVol20 =
    validVols20.length >= 10
      ? validVols20.reduce((s, c) => s + c.v, 0) / validVols20.length
      : 0;
  const lastVol = validCandles[validCandles.length - 1].v;
  const volumeVsAvg = avgVol20 > 0 ? Math.min(lastVol / avgVol20, 20) : 1;

  const recentBreakout = currentPrice >= high52w * 0.99;

  return {
    weekly10y: {
      trend: weeklyTrend,
      distanceFromATH: ((currentPrice - athPrice) / athPrice) * 100,
      distanceFromATL: ((currentPrice - atlPrice) / atlPrice) * 100,
      majorSupport,
      majorResistance,
      ema52w,
    },
    daily3y: {
      trend: daily3yTrend,
      sma200,
      sma50,
      rsi14: rsi14Daily,
      aboveSma200: currentPrice > sma200,
      goldenCross: sma50 > sma200,
    },
    daily1y: {
      trend: daily1yTrend,
      high52w,
      low52w,
      volatility20d,
      volumeVsAvg,
      recentBreakout,
    },
  };
}

/**
 * Compute all technical indicators for an asset given its daily candles.
 * Pass daily3yCandles for robust EMA/RSI (fallback: 1-month candles).
 * Pass multiTF for true 52w high/low and enriched drama score.
 */
export function computeTechnicals(
  dailyCandles: Candle[],
  price: number,
  changePct: number,
  newsCount: number,
  symbol?: string,
  multiTF?: MultiTimeframeAnalysis | null,
): TechnicalIndicators {
  const sma20 = computeSMA(dailyCandles, 20);
  const sma50 = computeSMA(dailyCandles, 50);
  const rsi14 = computeRSI(dailyCandles);

  // Trend based on price vs SMAs
  let trend: "bullish" | "bearish" | "neutral" = "neutral";
  if (price > sma20 && sma20 > sma50) trend = "bullish";
  else if (price < sma20 && sma20 < sma50) trend = "bearish";

  // Volume anomaly: latest volume vs 20-day average
  // Futures (=F suffix): Yahoo Finance daily volume is unreliable — front-month rollover days
  // create artificial 30-100x spikes that have no market significance. Always neutral for futures.
  // Forex pairs also have no meaningful volume data. Set to 1 (neutral) for both.
  const isFutures = symbol?.endsWith("=F") ?? false;
  const isForex = symbol?.endsWith("=X") ?? false;
  let volumeAnomaly = 1;
  if (!isFutures && !isForex) {
    const recentCandles = dailyCandles.slice(-21);
    const prevCandles = recentCandles.slice(0, -1).filter((c) => c.v > 0);
    const avgVolume =
      prevCandles.length >= 10
        ? prevCandles.reduce((sum, c) => sum + c.v, 0) / prevCandles.length
        : 0;
    const latestVolume = recentCandles[recentCandles.length - 1]?.v ?? 0;
    // latestVolume === 0 means Yahoo returned no volume data (common for indices in historical mode)
    // Treat as missing data → neutral (1), not as -100% volume
    volumeAnomaly = (avgVolume > 0 && latestVolume > 0) ? latestVolume / avgVolume : 1;
  }

  // Support/Resistance: combine three sources of evidence ordered by reliability
  //   1. Significant pivots from full history (multi-scale, multi-touch swing
  //      lows/highs identified by zone-detector). These are the "real" S/R.
  //   2. 20-day extremes (recent local pivots, useful as short-term context).
  //   3. Round numbers — but only those at least 1.5% away from current price,
  //      since a round level adjacent to price is just the rounded current
  //      price, not a support (e.g. price=6.21 → "support 6.20" is meaningless).
  const last20 = dailyCandles.slice(-20);
  const high20d = Math.max(...last20.map((c) => c.h));
  const low20d = Math.min(...last20.map((c) => c.l));
  const roundLevels = findRoundNumbers(price).filter(
    (l) => Math.abs(l - price) / price >= 0.015,
  );

  // Significant pivots from full daily history (3y when available).
  // These capture multi-month / multi-year swing lows that low20d misses.
  const pivots = dailyCandles.length >= 50
    ? findSignificantPivots(dailyCandles, 8)
    : [];
  const pivotSupports = pivots
    .filter((p) => p.type === "support" && p.level < price * 0.99)
    .map((p) => p.level);
  const pivotResistances = pivots
    .filter((p) => p.type === "resistance" && p.level > price * 1.01)
    .map((p) => p.level);

  // Dedup levels within ±1.5% (cluster proximate values, prefer first seen).
  const dedupLevels = (levels: number[]): number[] => {
    const out: number[] = [];
    for (const l of levels) {
      if (!out.some((x) => Math.abs(x - l) / x < 0.015)) out.push(l);
    }
    return out;
  };

  const supports = dedupLevels([
    ...pivotSupports,
    low20d,
    ...roundLevels.filter((l) => l < price),
  ]).sort((a, b) => b - a);
  const resistances = dedupLevels([
    ...pivotResistances,
    high20d,
    ...roundLevels.filter((l) => l > price),
  ]).sort((a, b) => a - b);

  // 52-week proximity: use true 52w range from multiTF if available, else return false (no fallback)
  const true52wHigh = multiTF?.daily1y.high52w;
  const true52wLow = multiTF?.daily1y.low52w;
  const isNear52wHigh = true52wHigh ? price >= true52wHigh * 0.98 : false;
  const isNear52wLow = true52wLow ? price <= true52wLow * 1.02 : false;

  // Drama Score — enriched with multiTF signals when available
  const breakingLevel =
    (isNear52wHigh ? 5 : 0) +
    (isNear52wLow ? 5 : 0) +
    (roundLevels.some((l) => Math.abs(l - price) / price < 0.005) ? 3 : 0);

  // MultiTF-enriched signals (0 if multiTF unavailable)
  let multiTFBonus = 0;
  if (multiTF) {
    // RSI extreme (oversold < 30 or overbought > 70) — use 3y RSI for robustness
    const rsi3y = multiTF.daily3y.rsi14;
    if (rsi3y < 30 || rsi3y > 70) multiTFBonus += 4;

    // Near ATH (within 3%) — major narrative signal
    if (Math.abs(multiTF.weekly10y.distanceFromATH) < 3) multiTFBonus += 5;

    // Near ATL (within 5%) — rare, very dramatic
    if (multiTF.weekly10y.distanceFromATL < 5) multiTFBonus += 5;

    // SMA200 cross: price near SMA200 (within 1%) — major technical event
    const sma200 = multiTF.daily3y.sma200;
    if (sma200 > 0 && Math.abs(price - sma200) / sma200 < 0.01) multiTFBonus += 5;

    // Golden/Death cross — structural shift
    // (no previous day data, so just flag presence as mild bonus)
    if (multiTF.daily3y.goldenCross && multiTF.daily3y.trend === "bull") multiTFBonus += 2;
  }

  const dramaScore =
    Math.abs(changePct) * 3 +
    volumeAnomaly * 2 +
    breakingLevel +
    Math.min(newsCount, 5) * 3 +
    multiTFBonus;

  return {
    sma20,
    sma50,
    rsi14,
    trend,
    volumeAnomaly,
    supports: supports.slice(0, 3),
    resistances: resistances.slice(0, 3),
    high20d,
    low20d,
    isNear52wHigh,
    isNear52wLow,
    dramaScore,
  };
}
