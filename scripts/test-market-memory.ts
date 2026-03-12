/**
 * Quick smoke tests for MarketMemory (D3)
 * Run: npx tsx scripts/test-market-memory.ts
 */

import type { Candle } from "@yt-maker/core";
import type { Zone } from "@yt-maker/data";
import { calculateDailyIndicators } from "../packages/data/src/market-memory/indicators";
import { detectZoneEvents, findSignificantPivots } from "../packages/data/src/market-memory/zone-detector";
import { loadMemory, loadWeeklyBrief } from "../packages/data/src/market-memory/update-market-memory";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    failed++;
  }
}

// ─── Generate fake candles ───────────────────────────────────────

function makeCandles(count: number, basePrice: number, volatility: number = 0.02): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
    const volume = 1000000 + Math.random() * 500000;

    const date = new Date(2024, 0, 1);
    date.setDate(date.getDate() + i);

    candles.push({
      t: date.getTime() / 1000,
      date: date.toISOString().split("T")[0],
      o: open,
      h: high,
      l: low,
      c: close,
      v: volume,
    });

    price = close;
  }
  return candles;
}

// ─── Test 1: indicators ──────────────────────────────────────────

console.log("\n=== Test 1: calculateDailyIndicators ===");

{
  const tooFew = makeCandles(50, 100);
  const result = calculateDailyIndicators(tooFew);
  assert(result === null, "Returns null for <100 candles");
}

{
  const candles = makeCandles(200, 4500, 0.015);
  const result = calculateDailyIndicators(candles);
  assert(result !== null, "Returns result for 200 candles");

  if (result) {
    assert(typeof result.bb_width_pct === "number" && result.bb_width_pct > 0, `bb_width_pct = ${result.bb_width_pct.toFixed(2)}`);
    assert(result.bb_width_pct_rank >= 0 && result.bb_width_pct_rank <= 100, `bb_width_pct_rank = ${result.bb_width_pct_rank.toFixed(1)}`);
    assert(typeof result.mm20_slope_deg === "number", `mm20_slope_deg = ${result.mm20_slope_deg.toFixed(2)}`);
    assert(result.atr14 > 0, `atr14 = ${result.atr14.toFixed(2)}`);
    assert(result.atr90 > 0, `atr90 = ${result.atr90.toFixed(2)}`);
    assert(result.atr_ratio > 0, `atr_ratio = ${result.atr_ratio.toFixed(2)}`);
    assert(result.volume_ratio_20d > 0, `volume_ratio_20d = ${result.volume_ratio_20d.toFixed(2)}`);
    assert(result.rsi14 >= 0 && result.rsi14 <= 100, `rsi14 = ${result.rsi14.toFixed(1)}`);
    assert(result.date === candles[candles.length - 1].date, `date matches last candle`);
  }
}

// ─── Test 2: findSignificantPivots ───────────────────────────────

console.log("\n=== Test 2: findSignificantPivots ===");

{
  const short = makeCandles(15, 100);
  const pivots = findSignificantPivots(short);
  assert(pivots.length === 0, "Returns empty for <21 candles");
}

{
  const candles = makeCandles(300, 1800, 0.02);
  const pivots = findSignificantPivots(candles, 5);
  assert(pivots.length > 0, `Found ${pivots.length} pivots`);
  assert(pivots.length <= 5, "Max 5 pivots");

  for (const p of pivots) {
    assert(p.type === "support" || p.type === "resistance", `Pivot ${p.level.toFixed(2)} is ${p.type}`);
  }
}

// ─── Test 3: detectZoneEvents ────────────────────────────────────

console.log("\n=== Test 3: detectZoneEvents ===");

{
  // No events when price is far from zones
  const candles = makeCandles(30, 100, 0.005); // low volatility around 100
  const zones: Zone[] = [{
    level: 200, // way above
    type: "resistance",
    created: "2024-01-01",
    touches: 0,
    last_touch: "2024-01-01",
    last_event_type: null,
    cassure_date: null,
    cassure_confirmed: null,
    last_behavior: "",
  }];

  const { updatedZones, newEvents } = detectZoneEvents(candles, zones, "2024-01-30");
  assert(newEvents.length === 0, "No events when price far from zone");
  assert(updatedZones[0].touches === 0, "Touches unchanged");
}

{
  // TOUCH: price exactly at zone level
  const candles = makeCandles(25, 100, 0.01);
  const lastCandle = candles[candles.length - 1];
  const zoneLevel = lastCandle.h; // set zone at the high — guaranteed touch

  const zones: Zone[] = [{
    level: zoneLevel,
    type: "resistance",
    created: "2024-01-01",
    touches: 0,
    last_touch: "2024-01-01",
    last_event_type: null,
    cassure_date: null,
    cassure_confirmed: true, // not pending — normal zone
    last_behavior: "",
  }];

  const { newEvents } = detectZoneEvents(candles, zones, "2024-01-25");
  assert(newEvents.length > 0, `Event detected at zone: ${newEvents.map(e => e.event_type).join(", ")}`);
  assert(
    newEvents[0].event_type === "TOUCH" || newEvents[0].event_type === "REJET",
    `Event type is TOUCH or REJET: ${newEvents[0].event_type}`
  );
}

{
  // CASSURE: close far beyond support + volume spike
  const candles = makeCandles(25, 100, 0.005);
  // Manually craft last candle with a big drop
  const lastIdx = candles.length - 1;
  candles[lastIdx] = {
    ...candles[lastIdx],
    o: 100,
    h: 100.5,
    l: 95,
    c: 95.5, // 4.5% below 100
    v: 3000000, // high volume
  };
  // Set average volume low so ratio > 1.2
  for (let i = 0; i < lastIdx; i++) {
    candles[i] = { ...candles[i], v: 1000000 };
  }

  const zones: Zone[] = [{
    level: 100,
    type: "support",
    created: "2024-01-01",
    touches: 2,
    last_touch: "2024-01-15",
    last_event_type: "TOUCH",
    cassure_date: null,
    cassure_confirmed: true, // not null = eligible for cassure check
    last_behavior: "",
  }];

  const { updatedZones, newEvents } = detectZoneEvents(candles, zones, "2024-01-25");
  assert(newEvents.some(e => e.event_type === "CASSURE"), `CASSURE detected: ${newEvents.map(e => e.event_type).join(", ")}`);

  if (newEvents.some(e => e.event_type === "CASSURE")) {
    assert(updatedZones[0].type === "resistance", "Support flipped to resistance after cassure");
    assert(updatedZones[0].cassure_confirmed === null, "cassure_confirmed set to null (pending)");
  }
}

{
  // PULLBACK_TENU: cassure pending + price returns + holds
  const candles = makeCandles(25, 100, 0.005);
  const lastIdx = candles.length - 1;
  // Price comes back near 100 from below, closes below (breakout side for flipped resistance→support)
  candles[lastIdx] = {
    ...candles[lastIdx],
    o: 99,
    h: 100.5,
    l: 98.5,
    c: 100.5, // close above zone (breakout side for support)
    v: 1200000,
  };

  const zones: Zone[] = [{
    level: 100,
    type: "support",  // was resistance, flipped after cassure
    created: "2024-01-01",
    touches: 3,
    last_touch: "2024-01-20",
    last_event_type: "CASSURE",
    cassure_date: "2024-01-20",
    cassure_confirmed: null, // pending!
    last_behavior: "",
  }];

  const { updatedZones, newEvents } = detectZoneEvents(candles, zones, "2024-01-25");
  assert(
    newEvents.some(e => e.event_type === "PULLBACK_TENU"),
    `PULLBACK_TENU detected: ${newEvents.map(e => e.event_type).join(", ")}`
  );
  if (newEvents.some(e => e.event_type === "PULLBACK_TENU")) {
    assert(updatedZones[0].cassure_confirmed === true, "cassure_confirmed = true after PULLBACK_TENU");
  }
}

// ─── Test 4: File I/O (loadMemory for non-existent) ─────────────

console.log("\n=== Test 4: loadMemory / loadWeeklyBrief ===");

{
  const mem = loadMemory("FAKE-SYMBOL");
  assert(mem === null, "loadMemory returns null for non-existent symbol");
}

{
  const brief = loadWeeklyBrief();
  assert(brief === null || typeof brief.generated === "string", "loadWeeklyBrief returns null or valid brief");
}

// ─── Summary ─────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
