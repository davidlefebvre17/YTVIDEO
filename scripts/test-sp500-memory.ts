/**
 * Real-world test: what does MarketMemory see for S&P 500?
 * Run: npx tsx scripts/test-sp500-memory.ts
 */
import "dotenv/config";
import { fetchDaily3yCandles } from "../packages/data/src/yahoo";
import { calculateDailyIndicators } from "../packages/data/src/market-memory/indicators";
import { findSignificantPivots, detectZoneEvents } from "../packages/data/src/market-memory/zone-detector";
import type { Zone } from "../packages/data/src/market-memory/types";

async function main() {
  console.log("Fetching S&P 500 3y daily candles...");
  const candles = await fetchDaily3yCandles("^GSPC");
  console.log(`Got ${candles.length} candles (${candles[0]?.date} → ${candles[candles.length - 1]?.date})\n`);

  const last = candles[candles.length - 1];
  console.log(`=== Dernière bougie ===`);
  console.log(`Date: ${last.date}`);
  console.log(`Open: ${last.o.toFixed(2)} | High: ${last.h.toFixed(2)} | Low: ${last.l.toFixed(2)} | Close: ${last.c.toFixed(2)}`);
  console.log(`Volume: ${(last.v / 1e6).toFixed(1)}M`);

  // ATH/ATL sur 3 ans
  let ath = 0, athDate = "";
  let atl = Infinity, atlDate = "";
  for (const c of candles) {
    if (c.h > ath) { ath = c.h; athDate = c.date; }
    if (c.l < atl) { atl = c.l; atlDate = c.date; }
  }
  console.log(`\nATH 3y: ${ath.toFixed(2)} (${athDate})`);
  console.log(`ATL 3y: ${atl.toFixed(2)} (${atlDate})`);
  console.log(`Distance ATH: ${(((last.c - ath) / ath) * 100).toFixed(2)}%`);

  // Indicateurs
  console.log(`\n=== Indicateurs Daily ===`);
  const indicators = calculateDailyIndicators(candles);
  if (indicators) {
    console.log(`RSI(14):          ${indicators.rsi14.toFixed(1)}`);
    console.log(`BB width %:       ${indicators.bb_width_pct.toFixed(2)}%`);
    console.log(`BB width rank:    ${indicators.bb_width_pct_rank.toFixed(0)}% (percentile 90j)`);
    console.log(`ATR(14):          ${indicators.atr14.toFixed(2)}`);
    console.log(`ATR(90):          ${indicators.atr90.toFixed(2)}`);
    console.log(`ATR ratio:        ${indicators.atr_ratio.toFixed(2)} ${indicators.atr_ratio > 1.3 ? "(volatilité en hausse)" : indicators.atr_ratio < 0.7 ? "(compression)" : "(normal)"}`);
    console.log(`SMA20 slope:      ${indicators.mm20_slope_deg.toFixed(1)}° ${indicators.mm20_slope_deg > 10 ? "(haussier)" : indicators.mm20_slope_deg < -10 ? "(baissier)" : "(plat)"}`);
    console.log(`Volume ratio 20d: ${indicators.volume_ratio_20d.toFixed(2)}x`);
  } else {
    console.log("Insufficient data for indicators");
  }

  // Pivots (bootstrap zones)
  console.log(`\n=== Zones (pivots auto-détectés) ===`);
  const pivots = findSignificantPivots(candles, 5);
  for (const p of pivots) {
    const distPct = ((last.c - p.level) / p.level * 100).toFixed(2);
    console.log(`  ${p.type.padEnd(10)} ${p.level.toFixed(2)}  (${distPct}% du close actuel)`);
  }

  // Simuler la détection d'events sur les zones trouvées
  console.log(`\n=== Zone Events (simulation) ===`);
  const zones: Zone[] = pivots.map((p) => ({
    level: p.level,
    type: p.type,
    created: "2024-01-01",
    touches: 0,
    last_touch: "2024-01-01",
    last_event_type: null,
    cassure_date: null,
    cassure_confirmed: true, // normal state
    last_behavior: "",
  }));

  const { updatedZones, newEvents } = detectZoneEvents(candles, zones, last.date);

  if (newEvents.length === 0) {
    console.log("  Aucun event zone aujourd'hui (prix entre les zones)");
  }
  for (const evt of newEvents) {
    console.log(`  ${evt.event_type}: ${evt.detail}`);
  }

  // Résumé narratif
  console.log(`\n=== Ce que le LLM verrait dans le prompt ===`);
  console.log(`## S&P 500 (^GSPC)`);
  console.log(`Régime: ${indicators && indicators.mm20_slope_deg > 5 ? "bull" : indicators && indicators.mm20_slope_deg < -5 ? "bear" : "range"} (auto-détecté)`);
  console.log(`Zones:`);
  for (const z of updatedZones) {
    const dist = ((last.c - z.level) / z.level * 100).toFixed(2);
    let line = `  ${z.type} ${z.level.toFixed(2)} (${dist}%)`;
    if (z.last_event_type) line += ` — dernier: ${z.last_event_type} ${z.last_touch}`;
    console.log(line);
  }
  if (indicators) {
    console.log(`Indicateurs: RSI=${indicators.rsi14.toFixed(1)} BB_rank=${indicators.bb_width_pct_rank.toFixed(0)}% ATR_ratio=${indicators.atr_ratio.toFixed(2)} SMA20_slope=${indicators.mm20_slope_deg.toFixed(1)}° Vol_ratio=${indicators.volume_ratio_20d.toFixed(1)}x`);
  }
  if (newEvents.length > 0) {
    console.log(`Events récents: ${newEvents.map(e => `${e.date} ${e.event_type}`).join(", ")}`);
  }
}

main().catch(console.error);
