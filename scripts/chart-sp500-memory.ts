/**
 * Generate an HTML chart for S&P 500 MarketMemory indicators (ALL TIME)
 * Compare with TradingView
 * Run: npx tsx scripts/chart-sp500-memory.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fetchDailyMaxCandles } from "../packages/data/src/yahoo";
import { BollingerBands, ATR, SMA, RSI } from "trading-signals";
import { findSignificantPivots } from "../packages/data/src/market-memory/zone-detector";
import type { Candle } from "@yt-maker/core";

async function main() {
  console.log("Fetching S&P 500 ALL TIME daily candles...");
  const candles = await fetchDailyMaxCandles("^GSPC");
  console.log(`Got ${candles.length} candles (${candles[0]?.date?.split("T")[0]} → ${candles[candles.length - 1]?.date?.split("T")[0]})`);

  // Show ALL candles on chart
  const recent = candles;
  const offset = 0;

  const lastPrice = candles[candles.length - 1].c;

  // ── BB(20,2) ──
  const bb = new BollingerBands(20, 2);
  const bbData: Array<{ upper: number; middle: number; lower: number } | null> = [];
  for (const c of candles) {
    const r = bb.update(c.c, false);
    bbData.push(r ? { upper: r.upper, middle: r.middle, lower: r.lower } : null);
  }

  // ── SMAs ──
  const sma20 = new SMA(20);
  const sma50 = new SMA(50);
  const sma200 = new SMA(200);
  const sma20Data: (number | null)[] = [];
  const sma50Data: (number | null)[] = [];
  const sma200Data: (number | null)[] = [];
  for (const c of candles) {
    sma20Data.push(sma20.update(c.c, false));
    sma50Data.push(sma50.update(c.c, false));
    sma200Data.push(sma200.update(c.c, false));
  }

  // ── RSI(14) ──
  const rsi = new RSI(14);
  const rsiData: (number | null)[] = [];
  for (const c of candles) rsiData.push(rsi.update(c.c, false));

  // ── ATR(14) ──
  const atr = new ATR(14);
  const atrData: (number | null)[] = [];
  for (const c of candles) atrData.push(atr.update({ high: c.h, low: c.l, close: c.c }, false));

  // ── BB Width % ──
  const bbWidthData = bbData.map((b) => b ? ((b.upper - b.lower) / b.middle) * 100 : null);

  // ── Pivots/Zones — multi-scale detection, filter traversed ──
  // Detect pivots at multiple scales to capture both local and structural levels
  const allPivots: Array<{ level: number; type: "support" | "resistance"; scale: number }> = [];

  for (const lookback of [5, 10, 20, 30, 50, 100]) {
    const pivots = findPivotsWithLookback(candles, lookback, 30);
    for (const p of pivots) {
      allPivots.push({ ...p, scale: lookback });
    }
  }

  // Filter traversed: support must be below price, resistance above
  const filteredZones = allPivots.filter((z) => {
    const margin = z.level * 0.005;
    if (z.type === "support" && lastPrice > z.level - margin) return true;
    if (z.type === "resistance" && lastPrice < z.level + margin) return true;
    return false;
  });

  // ── Step 1: ATH as resistance ──
  let ath = 0, athDate = "";
  for (const c of candles) { if (c.h > ath) { ath = c.h; athDate = c.date; } }
  if (ath > 0 && lastPrice < ath) {
    filteredZones.push({ level: ath, type: "resistance", scale: 999 });
  }

  // ── Step 2: Recent swing highs as resistance ──
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
      if (isPivotHigh && window[i].h > lastPrice) {
        filteredZones.push({ level: window[i].h, type: "resistance", scale: lb });
      }
    }
  }

  // ── Step 3: Dedup clusters within 2% ──
  filteredZones.sort((a, b) => b.scale - a.scale); // bigger scale = more important
  const dedupedZones = filteredZones.reduce<typeof filteredZones>((acc, z) => {
    const tooClose = acc.some((existing) => Math.abs(existing.level - z.level) / z.level < 0.02);
    if (!tooClose) acc.push(z);
    return acc;
  }, []);

  // ── Step 4: Keep up to 30 zones ──
  const zones = dedupedZones.slice(0, 30).sort((a, b) => a.level - b.level);

  console.log(`Zones (filtered): ${zones.map(z => `${z.type} ${z.level.toFixed(2)}`).join(", ")}`);

  // Slice to display window
  const chartData = {
    dates: recent.map((c) => c.date.split("T")[0]),
    ohlc: recent.map((c) => ({ o: c.o, h: c.h, l: c.l, c: c.c })),
    volume: recent.map((c) => c.v),
    bb: bbData.slice(offset).map((b) => b ? { upper: b.upper, middle: b.middle, lower: b.lower } : null),
    sma20: sma20Data.slice(offset),
    sma50: sma50Data.slice(offset),
    sma200: sma200Data.slice(offset),
    rsi: rsiData.slice(offset),
    atr: atrData.slice(offset),
    bbWidth: bbWidthData.slice(offset),
    zones,
    lastPrice,
    totalCandles: candles.length,
    firstDate: candles[0]?.date?.split("T")[0],
    lastDate: candles[candles.length - 1]?.date?.split("T")[0],
  };

  const html = buildHTML(chartData);
  const outPath = path.resolve(process.cwd(), "data", "sp500-chart.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`Chart saved: ${outPath}`);
}

/**
 * Find pivots with configurable lookback (N bars each side)
 */
function findPivotsWithLookback(
  candles: Candle[],
  lookback: number,
  count: number
): Array<{ level: number; type: "support" | "resistance" }> {
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

  const currentPrice = candles[candles.length - 1].c;
  return pivots
    .sort((a, b) => b.index - a.index)
    .slice(0, count)
    .map((p) => ({
      level: p.level,
      type: currentPrice > p.level ? "support" as const : "resistance" as const,
    }));
}

function buildHTML(data: any): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>S&P 500 — MarketMemory Indicators</title>
<script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0b0f1a; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; }
  .header { text-align: center; padding: 16px; }
  .header h1 { color: #00b4d8; font-size: 22px; }
  .header .meta { color: #666; font-size: 13px; margin-top: 4px; }
  .chart-container { width: 100%; padding: 0 16px; margin-bottom: 4px; }
  .chart-label { font-size: 13px; color: #888; padding: 4px 16px; display: flex; justify-content: space-between; }
  .legend { display: flex; gap: 16px; padding: 4px 16px; flex-wrap: wrap; }
  .legend span { font-size: 12px; display: flex; align-items: center; gap: 4px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .zones-info { padding: 8px 16px; font-size: 13px; display: flex; gap: 16px; flex-wrap: wrap; }
  .zones-info .zone { padding: 4px 10px; border-radius: 4px; font-weight: 600; }
  .zones-info .zone.support { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
  .zones-info .zone.resistance { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .zone-dist { font-weight: 400; color: #888; margin-left: 6px; }
</style>
</head>
<body>
<div class="header">
  <h1>S&P 500 — MarketMemory vs TradingView</h1>
  <div class="meta">${data.totalCandles} candles (${data.firstDate} → ${data.lastDate}) | Last: ${data.lastPrice.toFixed(2)} | Showing last ~2y</div>
</div>

<div class="zones-info">
  ${data.zones.map((z: any) => {
    const dist = ((data.lastPrice - z.level) / z.level * 100).toFixed(2);
    return `<span class="zone ${z.type}">${z.type.toUpperCase()} ${z.level.toFixed(2)}<span class="zone-dist">${dist}%</span></span>`;
  }).join("")}
</div>

<div class="legend">
  <span><span class="dot" style="background:#00b4d8"></span> SMA 20</span>
  <span><span class="dot" style="background:#ffd60a"></span> SMA 50</span>
  <span><span class="dot" style="background:#ff6b6b"></span> SMA 200</span>
  <span><span class="dot" style="background:rgba(0,180,216,0.3)"></span> Bollinger Bands</span>
  <span><span class="dot" style="background:#22c55e"></span> Support</span>
  <span><span class="dot" style="background:#ef4444"></span> Resistance</span>
</div>

<div class="chart-label"><span>Price + BB + SMA + Zones</span></div>
<div id="chart-price" class="chart-container" style="height:450px"></div>

<div class="chart-label"><span>Volume</span></div>
<div id="chart-volume" class="chart-container" style="height:100px"></div>

<div class="chart-label"><span>RSI (14)</span><span id="rsi-val" style="color:#a78bfa"></span></div>
<div id="chart-rsi" class="chart-container" style="height:150px"></div>

<div class="chart-label"><span>ATR (14)</span><span id="atr-val" style="color:#f97316"></span></div>
<div id="chart-atr" class="chart-container" style="height:120px"></div>

<div class="chart-label"><span>BB Width %</span><span id="bbw-val" style="color:#00b4d8"></span></div>
<div id="chart-bbw" class="chart-container" style="height:120px"></div>

<script>
const DATA = ${JSON.stringify(data)};

// Show last indicator values
const lastRSI = DATA.rsi.filter(v => v != null).pop();
const lastATR = DATA.atr.filter(v => v != null).pop();
const lastBBW = DATA.bbWidth.filter(v => v != null).pop();
document.getElementById('rsi-val').textContent = lastRSI ? lastRSI.toFixed(1) : '';
document.getElementById('atr-val').textContent = lastATR ? lastATR.toFixed(2) : '';
document.getElementById('bbw-val').textContent = lastBBW ? lastBBW.toFixed(2) + '%' : '';

function toTime(dateStr) { return dateStr; }

// ─── Price chart ─────────────────────────
const priceChart = LightweightCharts.createChart(document.getElementById('chart-price'), {
  layout: { background: { color: '#0b0f1a' }, textColor: '#888' },
  grid: { vertLines: { color: '#1a1f2e' }, horzLines: { color: '#1a1f2e' } },
  crosshair: { mode: 0 },
  rightPriceScale: { borderColor: '#2a2f3e' },
  timeScale: { borderColor: '#2a2f3e', timeVisible: false },
});

const candleSeries = priceChart.addCandlestickSeries({
  upColor: '#22c55e', downColor: '#ef4444',
  borderUpColor: '#22c55e', borderDownColor: '#ef4444',
  wickUpColor: '#22c55e', wickDownColor: '#ef4444',
});
candleSeries.setData(DATA.dates.map((d, i) => ({
  time: toTime(d), open: DATA.ohlc[i].o, high: DATA.ohlc[i].h, low: DATA.ohlc[i].l, close: DATA.ohlc[i].c,
})));

// BB
const bbUpper = priceChart.addLineSeries({ color: 'rgba(0,180,216,0.25)', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
bbUpper.setData(DATA.dates.map((d, i) => DATA.bb[i] ? { time: toTime(d), value: DATA.bb[i].upper } : null).filter(Boolean));
const bbLower = priceChart.addLineSeries({ color: 'rgba(0,180,216,0.25)', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
bbLower.setData(DATA.dates.map((d, i) => DATA.bb[i] ? { time: toTime(d), value: DATA.bb[i].lower } : null).filter(Boolean));

// SMAs
const sma20s = priceChart.addLineSeries({ color: '#00b4d8', lineWidth: 2, lastValueVisible: true, priceLineVisible: false });
sma20s.setData(DATA.dates.map((d, i) => DATA.sma20[i] != null ? { time: toTime(d), value: DATA.sma20[i] } : null).filter(Boolean));
const sma50s = priceChart.addLineSeries({ color: '#ffd60a', lineWidth: 2, lastValueVisible: true, priceLineVisible: false });
sma50s.setData(DATA.dates.map((d, i) => DATA.sma50[i] != null ? { time: toTime(d), value: DATA.sma50[i] } : null).filter(Boolean));
const sma200s = priceChart.addLineSeries({ color: '#ff6b6b', lineWidth: 2, lastValueVisible: true, priceLineVisible: false });
sma200s.setData(DATA.dates.map((d, i) => DATA.sma200[i] != null ? { time: toTime(d), value: DATA.sma200[i] } : null).filter(Boolean));

// Zone lines
DATA.zones.forEach(z => {
  const color = z.type === 'support' ? '#22c55e' : '#ef4444';
  const line = priceChart.addLineSeries({
    color, lineWidth: 1, lineStyle: 2,
    lastValueVisible: true, priceLineVisible: false,
    title: z.type[0].toUpperCase() + ' ' + z.level.toFixed(0),
  });
  line.setData(DATA.dates.map(d => ({ time: toTime(d), value: z.level })));
});

priceChart.timeScale().fitContent();

// ─── Volume ──────────────────────────────
const volChart = LightweightCharts.createChart(document.getElementById('chart-volume'), {
  layout: { background: { color: '#0b0f1a' }, textColor: '#888' },
  grid: { vertLines: { color: '#1a1f2e' }, horzLines: { color: '#1a1f2e' } },
  rightPriceScale: { borderColor: '#2a2f3e' },
  timeScale: { borderColor: '#2a2f3e', timeVisible: false },
});
const volSeries = volChart.addHistogramSeries({ priceFormat: { type: 'volume' } });
volSeries.setData(DATA.dates.map((d, i) => ({
  time: toTime(d), value: DATA.volume[i],
  color: DATA.ohlc[i].c >= DATA.ohlc[i].o ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
})));
volChart.timeScale().fitContent();

// ─── RSI ─────────────────────────────────
const rsiChart = LightweightCharts.createChart(document.getElementById('chart-rsi'), {
  layout: { background: { color: '#0b0f1a' }, textColor: '#888' },
  grid: { vertLines: { color: '#1a1f2e' }, horzLines: { color: '#1a1f2e' } },
  rightPriceScale: { borderColor: '#2a2f3e' },
  timeScale: { borderColor: '#2a2f3e', timeVisible: false },
});
const rsiSeries = rsiChart.addLineSeries({ color: '#a78bfa', lineWidth: 2 });
rsiSeries.setData(DATA.dates.map((d, i) => DATA.rsi[i] != null ? { time: toTime(d), value: DATA.rsi[i] } : null).filter(Boolean));
[30, 50, 70].forEach(level => {
  const color = level === 30 ? 'rgba(34,197,94,0.4)' : level === 70 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)';
  const s = rsiChart.addLineSeries({ color, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
  s.setData(DATA.dates.map(d => ({ time: toTime(d), value: level })));
});
rsiChart.timeScale().fitContent();

// ─── ATR ─────────────────────────────────
const atrChart = LightweightCharts.createChart(document.getElementById('chart-atr'), {
  layout: { background: { color: '#0b0f1a' }, textColor: '#888' },
  grid: { vertLines: { color: '#1a1f2e' }, horzLines: { color: '#1a1f2e' } },
  rightPriceScale: { borderColor: '#2a2f3e' },
  timeScale: { borderColor: '#2a2f3e', timeVisible: false },
});
const atrSeries = atrChart.addLineSeries({ color: '#f97316', lineWidth: 2 });
atrSeries.setData(DATA.dates.map((d, i) => DATA.atr[i] != null ? { time: toTime(d), value: DATA.atr[i] } : null).filter(Boolean));
atrChart.timeScale().fitContent();

// ─── BB Width ────────────────────────────
const bbwChart = LightweightCharts.createChart(document.getElementById('chart-bbw'), {
  layout: { background: { color: '#0b0f1a' }, textColor: '#888' },
  grid: { vertLines: { color: '#1a1f2e' }, horzLines: { color: '#1a1f2e' } },
  rightPriceScale: { borderColor: '#2a2f3e' },
  timeScale: { borderColor: '#2a2f3e', timeVisible: false },
});
const bbwSeries = bbwChart.addAreaSeries({
  topColor: 'rgba(0,180,216,0.3)', bottomColor: 'rgba(0,180,216,0.05)',
  lineColor: '#00b4d8', lineWidth: 2,
});
bbwSeries.setData(DATA.dates.map((d, i) => DATA.bbWidth[i] != null ? { time: toTime(d), value: DATA.bbWidth[i] } : null).filter(Boolean));
bbwChart.timeScale().fitContent();

// Sync all timescales
const charts = [priceChart, volChart, rsiChart, atrChart, bbwChart];
charts.forEach((c, ci) => {
  c.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!range) return;
    charts.forEach((other, oi) => { if (ci !== oi) other.timeScale().setVisibleLogicalRange(range); });
  });
});

window.addEventListener('resize', () => {
  const w = document.body.clientWidth;
  charts.forEach(c => c.applyOptions({ width: w - 32 }));
});
window.dispatchEvent(new Event('resize'));
<\/script>
</body>
</html>`;
}

main().catch(console.error);
