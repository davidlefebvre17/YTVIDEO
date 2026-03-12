import type { Candle } from "@yt-maker/core";
import type { Zone, ZoneEvent, ZoneEventType } from "./types";

/**
 * Detects zone events on the latest candle and updates zones accordingly.
 * Pure code — no LLM.
 */
export function detectZoneEvents(
  candles: Candle[],
  zones: Zone[],
  today: string
): { updatedZones: Zone[]; newEvents: ZoneEvent[] } {
  if (candles.length < 2) return { updatedZones: zones, newEvents: [] };

  const last = candles[candles.length - 1];
  const newEvents: ZoneEvent[] = [];
  const volumeRatio = calculateVolumeRatio(candles);

  const updatedZones = zones.map((zone) => {
    // ── PULLBACK check (cassure pending) ──
    if (zone.cassure_confirmed === null) {
      const pullbackThreshold = zone.level * 0.01;
      const isPriceNear =
        last.l <= zone.level + pullbackThreshold &&
        last.h >= zone.level - pullbackThreshold;

      if (isPriceNear) {
        const isHeld =
          (zone.type === "resistance" && last.c < zone.level) ||
          (zone.type === "support" && last.c > zone.level);

        const eventType: ZoneEventType = isHeld ? "PULLBACK_TENU" : "PULLBACK_RATE";
        const evt: ZoneEvent = {
          date: today,
          event_type: eventType,
          detail: `${eventType} at ${zone.level.toFixed(2)} (vol ${volumeRatio.toFixed(1)}x)`,
        };
        newEvents.push(evt);

        return {
          ...zone,
          last_touch: today,
          last_event_type: eventType,
          cassure_confirmed: isHeld,
        };
      }
      return zone;
    }

    // ── TOUCH threshold: ±0.3% ──
    const touchThreshold = zone.level * 0.003;
    const isTouched =
      (last.h >= zone.level - touchThreshold && last.h <= zone.level + touchThreshold) ||
      (last.l >= zone.level - touchThreshold && last.l <= zone.level + touchThreshold);

    // ── CASSURE: close >1% beyond + volume >1.2x ──
    const cassureThreshold = zone.level * 0.01;
    const isCassure =
      ((zone.type === "support" && last.c < zone.level - cassureThreshold) ||
       (zone.type === "resistance" && last.c > zone.level + cassureThreshold)) &&
      volumeRatio > 1.2;

    if (isCassure) {
      const flippedType: "support" | "resistance" =
        zone.type === "support" ? "resistance" : "support";
      const evt: ZoneEvent = {
        date: today,
        event_type: "CASSURE",
        detail: `CASSURE ${zone.type} ${zone.level.toFixed(2)} → now ${flippedType} (vol ${volumeRatio.toFixed(1)}x)`,
      };
      newEvents.push(evt);

      return {
        ...zone,
        type: flippedType,
        last_touch: today,
        last_event_type: "CASSURE" as ZoneEventType,
        touches: zone.touches + 1,
        cassure_date: today,
        cassure_confirmed: null,
      };
    }

    if (isTouched) {
      const isRejet =
        (zone.type === "support" && last.c > zone.level) ||
        (zone.type === "resistance" && last.c < zone.level);

      const eventType: ZoneEventType = isRejet ? "REJET" : "TOUCH";
      const evt: ZoneEvent = {
        date: today,
        event_type: eventType,
        detail: `${eventType} ${zone.type} ${zone.level.toFixed(2)}`,
      };
      newEvents.push(evt);

      return {
        ...zone,
        last_touch: today,
        last_event_type: eventType,
        touches: zone.touches + 1,
      };
    }

    return zone;
  });

  return { updatedZones, newEvents };
}

// ─── Multi-scale pivot detection ─────────────────────────────────

/**
 * Finds significant pivots at a given lookback scale.
 * A pivot high requires the bar's high to be higher than N bars on each side.
 */
function findPivotsAtScale(
  candles: Candle[],
  lookback: number,
  count: number
): Array<{ level: number; index: number }> {
  if (candles.length < lookback * 2 + 1) return [];

  const pivots: Array<{ level: number; index: number }> = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i].h <= candles[i - j].h || candles[i].h <= candles[i + j].h) isPivotHigh = false;
      if (candles[i].l >= candles[i - j].l || candles[i].l >= candles[i + j].l) isPivotLow = false;
      if (!isPivotHigh && !isPivotLow) break;
    }

    if (isPivotHigh) pivots.push({ level: candles[i].h, index: i });
    if (isPivotLow) pivots.push({ level: candles[i].l, index: i });
  }

  return pivots
    .sort((a, b) => b.index - a.index) // most recent first
    .slice(0, count);
}

/**
 * Multi-scale pivot detection + ATH/ATL + recent swing highs.
 * Returns zones classified as support/resistance relative to current price.
 * Deduplicates clusters within 2%.
 *
 * @param candles  Full candle history (the more the better)
 * @param maxZones Maximum zones to return (default 10)
 */
export function findSignificantPivots(
  candles: Candle[],
  maxZones: number = 10
): Array<{ level: number; type: "support" | "resistance" }> {
  if (candles.length < 21) return [];

  const currentPrice = candles[candles.length - 1].c;
  const raw: Array<{ level: number; scale: number }> = [];

  // Multi-scale detection
  for (const lookback of [5, 10, 20, 50, 100]) {
    const pivots = findPivotsAtScale(candles, lookback, 30);
    for (const p of pivots) {
      raw.push({ level: p.level, scale: lookback });
    }
  }

  // Auto-add ATH as resistance
  let ath = 0;
  for (const c of candles) { if (c.h > ath) ath = c.h; }
  if (ath > 0 && currentPrice < ath) {
    raw.push({ level: ath, scale: 999 });
  }

  // Auto-add recent swing highs as resistance (for near-ATH scenarios)
  for (const lb of [5, 10, 20]) {
    const window = candles.slice(-lb * 4);
    for (let i = lb; i < window.length - lb; i++) {
      let isPivotHigh = true;
      for (let j = 1; j <= lb; j++) {
        if (window[i].h <= window[i - j].h || window[i].h <= window[i + j].h) {
          isPivotHigh = false;
          break;
        }
      }
      if (isPivotHigh && window[i].h > currentPrice) {
        raw.push({ level: window[i].h, scale: lb });
      }
    }
  }

  // Classify support/resistance
  const classified = raw.map((p) => ({
    level: p.level,
    type: (currentPrice > p.level ? "support" : "resistance") as "support" | "resistance",
    scale: p.scale,
  }));

  // Filter traversed: keep only valid S/R relative to price
  const valid = classified.filter((z) => {
    const margin = z.level * 0.005;
    if (z.type === "support" && currentPrice > z.level - margin) return true;
    if (z.type === "resistance" && currentPrice < z.level + margin) return true;
    return false;
  });

  // Dedup clusters within 2%, prefer higher scale
  valid.sort((a, b) => b.scale - a.scale);
  const deduped = valid.reduce<typeof valid>((acc, z) => {
    const tooClose = acc.some((existing) => Math.abs(existing.level - z.level) / z.level < 0.02);
    if (!tooClose) acc.push(z);
    return acc;
  }, []);

  return deduped
    .slice(0, maxZones)
    .sort((a, b) => a.level - b.level)
    .map(({ level, type }) => ({ level, type }));
}

/** Volume ratio: last candle vs 20-day average */
function calculateVolumeRatio(candles: Candle[]): number {
  if (candles.length < 2) return 1;
  const lastVolume = candles[candles.length - 1].v;
  const lookback = Math.min(20, candles.length - 1);
  let sum = 0;
  for (let i = candles.length - 1 - lookback; i < candles.length - 1; i++) {
    sum += candles[i].v;
  }
  const avg = sum / lookback;
  return avg > 0 ? lastVolume / avg : 1;
}
