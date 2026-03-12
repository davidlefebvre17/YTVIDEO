import { BollingerBands, ATR, SMA, RSI } from "trading-signals";
import type { Candle } from "@yt-maker/core";
import type { DailyIndicators } from "./types";

/**
 * Calculate daily indicators for MarketMemory
 * @param dailyCandles Sorted array of daily candles (oldest to newest), min 100
 */
export function calculateDailyIndicators(
  dailyCandles: Candle[]
): DailyIndicators | null {
  if (dailyCandles.length < 100) return null;

  const closes = dailyCandles.map((c) => c.c);

  // ── BB (period 20, deviation 2) ──
  const bb = new BollingerBands(20, 2);
  const bbWidths: number[] = [];

  for (const close of closes) {
    const result = bb.update(close, false);
    if (result) {
      const width = ((result.upper - result.lower) / result.middle) * 100;
      bbWidths.push(width);
    }
  }
  if (bbWidths.length === 0) return null;

  const recentBBWidths = bbWidths.slice(-90);
  const currentBBWidth = bbWidths[bbWidths.length - 1];
  const bbWidthPercentileRank = percentileRank(recentBBWidths, currentBBWidth);

  // ── ATR(14) and ATR(90) ──
  const atr14 = new ATR(14);
  const atr90 = new ATR(90);
  let atr14Result: number | null = null;
  let atr90Result: number | null = null;

  for (const candle of dailyCandles) {
    const hlc = { high: candle.h, low: candle.l, close: candle.c };
    const r14 = atr14.update(hlc, false);
    const r90 = atr90.update(hlc, false);
    if (r14 !== null) atr14Result = r14;
    if (r90 !== null) atr90Result = r90;
  }
  if (!atr14Result || !atr90Result) return null;

  const atrRatio = atr14Result / atr90Result;

  // ── SMA(20) slope in degrees ──
  const sma20 = new SMA(20);
  const sma20Values: number[] = [];

  for (const close of closes) {
    const result = sma20.update(close, false);
    if (result !== null) sma20Values.push(result);
  }
  if (sma20Values.length < 6) return null;

  const sma20Today = sma20Values[sma20Values.length - 1];
  const sma205DaysAgo = sma20Values[sma20Values.length - 6];
  // Normalize slope as % change per day, then convert to degrees
  const slopePerDay = ((sma20Today - sma205DaysAgo) / sma205DaysAgo * 100) / 5;
  const mm20SlopeDeg = Math.atan2(slopePerDay, 1) * (180 / Math.PI);

  // ── Volume ratio: last candle / 20d average ──
  const last20Volumes = dailyCandles.slice(-20).map((c) => c.v);
  const avgVolume20d =
    last20Volumes.reduce((a, b) => a + b, 0) / last20Volumes.length;
  const volumeRatio20d =
    avgVolume20d > 0 ? dailyCandles[dailyCandles.length - 1].v / avgVolume20d : 1;

  // ── RSI(14) ──
  const rsi = new RSI(14);
  let rsi14Result: number | null = null;

  for (const close of closes) {
    const result = rsi.update(close, false);
    if (result !== null) rsi14Result = result;
  }
  if (rsi14Result === null) return null;

  return {
    date: dailyCandles[dailyCandles.length - 1].date,
    bb_width_pct: currentBBWidth,
    bb_width_pct_rank: bbWidthPercentileRank,
    mm20_slope_deg: mm20SlopeDeg,
    atr14: atr14Result,
    atr90: atr90Result,
    atr_ratio: atrRatio,
    volume_ratio_20d: volumeRatio20d,
    rsi14: rsi14Result,
  };
}

/** Percentile rank of a value within an array (0-100) */
function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 0;
  let count = 0;
  for (const v of values) {
    if (v < value) count++;
  }
  return (count / values.length) * 100;
}
