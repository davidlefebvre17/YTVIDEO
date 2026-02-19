import type { Candle, TechnicalIndicators } from "@yt-maker/core";

/**
 * Compute EMA (Exponential Moving Average) over closing prices.
 */
function computeEMA(candles: Candle[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1]?.c ?? 0;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.c, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].c * k + ema * (1 - k);
  }
  return ema;
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
 * Compute all technical indicators for an asset given its daily candles.
 * Expects at least 21 daily candles for meaningful results.
 */
export function computeTechnicals(
  dailyCandles: Candle[],
  price: number,
  changePct: number,
  newsCount: number,
): TechnicalIndicators {
  const ema9 = computeEMA(dailyCandles, 9);
  const ema21 = computeEMA(dailyCandles, 21);
  const rsi14 = computeRSI(dailyCandles);

  // Trend based on price vs EMAs
  let trend: "bullish" | "bearish" | "neutral" = "neutral";
  if (price > ema9 && ema9 > ema21) trend = "bullish";
  else if (price < ema9 && ema9 < ema21) trend = "bearish";

  // Volume anomaly: latest volume vs 20-day average
  const recentCandles = dailyCandles.slice(-21);
  const avgVolume =
    recentCandles.slice(0, -1).reduce((sum, c) => sum + c.v, 0) /
    Math.max(recentCandles.length - 1, 1);
  const latestVolume = recentCandles[recentCandles.length - 1]?.v ?? 0;
  const volumeAnomaly = avgVolume > 0 ? latestVolume / avgVolume : 1;

  // Support/Resistance: 20d low/high + round numbers
  const last20 = dailyCandles.slice(-20);
  const high20d = Math.max(...last20.map((c) => c.h));
  const low20d = Math.min(...last20.map((c) => c.l));
  const roundLevels = findRoundNumbers(price);

  const supports = [low20d, ...roundLevels.filter((l) => l < price)].sort(
    (a, b) => b - a,
  );
  const resistances = [high20d, ...roundLevels.filter((l) => l > price)].sort(
    (a, b) => a - b,
  );

  // 52-week proximity (using available data — approximate with 20d range)
  const isNear52wHigh = price >= high20d * 0.98;
  const isNear52wLow = price <= low20d * 1.02;

  // Drama Score
  const breakingLevel =
    (isNear52wHigh ? 5 : 0) +
    (isNear52wLow ? 5 : 0) +
    (roundLevels.some((l) => Math.abs(l - price) / price < 0.005) ? 3 : 0);
  const dramaScore =
    Math.abs(changePct) * 3 +
    volumeAnomaly * 2 +
    breakingLevel +
    newsCount * 3;

  return {
    ema9,
    ema21,
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
