#!/usr/bin/env node
// Test Yahoo Finance API : daily vs hourly, quote endpoint, session H/L.
// Usage: node scripts/test-yahoo-session.mjs

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";
const SYMBOLS = [
  { s: "CL=F", name: "WTI" },
  { s: "BZ=F", name: "Brent" },
  { s: "^GSPC", name: "S&P 500" },
  { s: "^VIX", name: "VIX" },
  { s: "EURUSD=X", name: "EUR/USD" },
  { s: "AAPL", name: "Apple" },
];

const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : '—');
const pct = (now, prev) => prev ? ((now - prev) / prev * 100).toFixed(2) + '%' : '—';

async function fetchJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

function parseCandles(j) {
  const res = j?.chart?.result?.[0];
  if (!res) return [];
  const ts = res.timestamp || [];
  const q = res.indicators?.quote?.[0];
  if (!q) return [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if (o == null || c == null) continue;
    out.push({
      t: ts[i],
      date: new Date(ts[i] * 1000).toISOString(),
      o, h, l, c, v: v ?? 0,
    });
  }
  return { candles: out, meta: res.meta };
}

async function testOne({ s, name }) {
  console.log(`\n═══ ${name} (${s}) ═══`);

  // ── 1. v7/finance/quote ──────────────────────────────
  try {
    const q = await fetchJson(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(s)}`);
    const r = q?.quoteResponse?.result?.[0];
    if (r) {
      console.log(`  [quote] regularMarketPrice=${r.regularMarketPrice} regularMarketPreviousClose=${r.regularMarketPreviousClose}`);
      console.log(`          regularMarketChange=${r.regularMarketChange} regularMarketChangePercent=${r.regularMarketChangePercent?.toFixed(3)}%`);
      console.log(`          regularMarketDayHigh=${r.regularMarketDayHigh} regularMarketDayLow=${r.regularMarketDayLow}`);
      console.log(`          regularMarketOpen=${r.regularMarketOpen} regularMarketTime=${new Date(r.regularMarketTime * 1000).toISOString()}`);
      console.log(`          marketState=${r.marketState}`);
    } else {
      console.log(`  [quote] NO DATA (auth required?)`);
    }
  } catch (e) {
    console.log(`  [quote] ERROR: ${e.message.slice(0, 100)}`);
  }

  // ── 2. Daily candles (10 days) ──────────────────────
  const dj = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=10d`);
  const { candles: daily, meta } = parseCandles(dj);
  console.log(`  [daily] ${daily.length} candles, meta.regularMarketPrice=${meta?.regularMarketPrice} previousClose=${meta?.previousClose} chartPreviousClose=${meta?.chartPreviousClose}`);
  console.log(`          gmtoffset=${meta?.gmtoffset} exchangeTimezoneName=${meta?.exchangeTimezoneName}`);
  const last5 = daily.slice(-5);
  last5.forEach((c, i) => {
    const prev = i > 0 ? last5[i-1].c : (daily[daily.length - last5.length - 1]?.c ?? null);
    console.log(`     ${c.date.slice(0,10)}  O=${fmt(c.o)}  H=${fmt(c.h)}  L=${fmt(c.l)}  C=${fmt(c.c)}  V=${c.v}  | J-1: ${pct(c.c, prev)}  | range: ${fmt(c.h - c.l)}`);
  });

  // ── 3. Hourly candles (2 days) ──────────────────────
  const hj = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1h&range=2d`);
  const { candles: hourly } = parseCandles(hj);
  console.log(`  [hourly 2d] ${hourly.length} candles, first=${hourly[0]?.date}, last=${hourly[hourly.length-1]?.date}`);

  // Group by UTC date to see if we can reconstruct a clean session
  const byDate = {};
  for (const c of hourly) {
    const d = c.date.slice(0, 10);
    byDate[d] = byDate[d] || [];
    byDate[d].push(c);
  }
  Object.entries(byDate).forEach(([d, cs]) => {
    const highs = cs.map(c => c.h).filter(Number.isFinite);
    const lows = cs.map(c => c.l).filter(Number.isFinite);
    const first = cs[0], last = cs[cs.length-1];
    console.log(`     ${d}  n=${cs.length}  first=${first.date.slice(11,19)} last=${last.date.slice(11,19)}  O=${fmt(first.o)} C=${fmt(last.c)}  H=${fmt(Math.max(...highs))} L=${fmt(Math.min(...lows))}  range=${fmt(Math.max(...highs) - Math.min(...lows))}`);
  });
}

console.log("Yahoo API test —", new Date().toISOString());
for (const sym of SYMBOLS) {
  try { await testOne(sym); } catch (e) { console.log(`  ERROR: ${e.message}`); }
}
console.log("\nDone.");
