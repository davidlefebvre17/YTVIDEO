#!/usr/bin/env node
// Test Yahoo API on ALL 770 tickers to validate session J-1 extraction.
// Strategy: fetch 1d/10d daily candles, compute session stats, report anomalies.
// Usage: node scripts/test-yahoo-session-bulk.mjs [pubDate]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pubDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";
const CONCURRENCY = 10;
const TIMEOUT_MS = 15000;

const profiles = JSON.parse(readFileSync(resolve('data/company-profiles.json'), 'utf8'));
const tickers = profiles.map(p => ({
  symbol: p.symbol,
  name: p.name || p.symbol,
  industry: p.finnhubIndustry || '?',
}));

console.log(`Testing ${tickers.length} tickers, pubDate=${pubDate}, concurrency=${CONCURRENCY}`);
console.log(`Start: ${new Date().toISOString()}\n`);

async function fetchChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    const j = await r.json();
    return { data: j };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : e.message.slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

function parseCandles(j) {
  const res = j?.chart?.result?.[0];
  if (!res) return { candles: [], meta: null };
  const ts = res.timestamp || [];
  const q = res.indicators?.quote?.[0];
  if (!q) return { candles: [], meta: res.meta };
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if (o == null || c == null) continue;
    out.push({ t: ts[i], date: new Date(ts[i] * 1000).toISOString().slice(0, 10), o, h, l, c, v: v ?? 0 });
  }
  return { candles: out, meta: res.meta };
}

function analyze(symbol, parsed) {
  const { candles, meta } = parsed;
  if (!candles.length) return { status: 'no_data' };

  // Filter: keep only sessions strictly before pubDate → real J-1 is last
  const completed = candles.filter(c => c.date < pubDate);
  const hasTodayCandle = candles.some(c => c.date === pubDate);

  if (completed.length < 2) return { status: 'insufficient_history', candlesReceived: candles.length };

  const sess = completed[completed.length - 1];
  const prev = completed[completed.length - 2];
  const sessionChangePct = (sess.c - prev.c) / prev.c * 100;
  const sessionRange = sess.h - sess.l;
  const sessionRangePct = sessionRange / prev.c * 100;
  const currentPrice = meta?.regularMarketPrice ?? candles[candles.length - 1].c;
  const changePctNow = (currentPrice - sess.c) / sess.c * 100;

  // Yahoo meta fields
  const metaChgPct = meta?.regularMarketPrice && meta?.chartPreviousClose
    ? (meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100
    : null;

  return {
    status: 'ok',
    candlesTotal: candles.length,
    completedCount: completed.length,
    hasTodayCandle,
    tz: meta?.exchangeTimezoneName || null,
    sessionDate: sess.date,
    prevSessionDate: prev.date,
    sessionClose: sess.c,
    prevClose: prev.c,
    sessionHigh: sess.h,
    sessionLow: sess.l,
    sessionChangePct: Number(sessionChangePct.toFixed(3)),
    sessionRangePct: Number(sessionRangePct.toFixed(3)),
    currentPrice,
    changePctNow: Number(changePctNow.toFixed(3)),
    absDiffSessionVsNow: Number(Math.abs(sessionChangePct - changePctNow).toFixed(3)),
  };
}

async function processBatch(batch) {
  return Promise.all(batch.map(async (t) => {
    const { data, error } = await fetchChart(t.symbol);
    if (error) return { ...t, status: 'fetch_error', error };
    const parsed = parseCandles(data);
    const res = analyze(t.symbol, parsed);
    return { ...t, ...res };
  }));
}

// Run
const results = [];
let processed = 0;
for (let i = 0; i < tickers.length; i += CONCURRENCY) {
  const batch = tickers.slice(i, i + CONCURRENCY);
  const batchResults = await processBatch(batch);
  results.push(...batchResults);
  processed += batch.length;
  if (processed % 50 === 0 || processed >= tickers.length) {
    console.log(`  Progress: ${processed}/${tickers.length} (${(processed / tickers.length * 100).toFixed(0)}%)`);
  }
}

// ── Analyse the results ────────────────────────────────────
console.log(`\nDone: ${results.length} tickers processed in ${((Date.now() - new Date().getTime()) / 1000).toFixed(0)}s`);

const byStatus = {};
results.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
console.log('\nStatus breakdown:');
Object.entries(byStatus).forEach(([k, v]) => console.log(`  ${k.padEnd(25)} ${v}  (${(v/results.length*100).toFixed(1)}%)`));

// Stats on OK results
const ok = results.filter(r => r.status === 'ok');
if (ok.length) {
  const sorted = (k) => [...ok].sort((a, b) => Math.abs(b[k]) - Math.abs(a[k]));

  // Most divergent session vs now (= assets where the bug had the biggest impact)
  console.log('\n── Top 20 assets where session J-1 DIVERGES most from current intraday ──');
  console.log('    (indicates pipeline was reading the wrong number)');
  console.log(`   ${'Symbol'.padEnd(12)} ${'Session'.padEnd(12)} ${'Now'.padEnd(10)} ${'|Diff|'.padEnd(10)} ${'Range%'.padEnd(10)} Name`);
  sorted('absDiffSessionVsNow').slice(0, 20).forEach(r => {
    console.log(`   ${r.symbol.padEnd(12)} ${(r.sessionChangePct.toFixed(2) + '%').padEnd(12)} ${(r.changePctNow.toFixed(2) + '%').padEnd(10)} ${(r.absDiffSessionVsNow.toFixed(2) + '%').padEnd(10)} ${(r.sessionRangePct.toFixed(2) + '%').padEnd(10)} ${r.name.slice(0, 40)}`);
  });

  // Biggest session movers (true J-1)
  console.log('\n── Top 15 biggest J-1 session movers (vraie bougie d hier) ──');
  console.log(`   ${'Symbol'.padEnd(12)} ${'Session'.padEnd(12)} ${'Range%'.padEnd(10)} ${'Date'.padEnd(12)} Name`);
  sorted('sessionChangePct').slice(0, 15).forEach(r => {
    console.log(`   ${r.symbol.padEnd(12)} ${(r.sessionChangePct.toFixed(2) + '%').padEnd(12)} ${(r.sessionRangePct.toFixed(2) + '%').padEnd(10)} ${r.sessionDate.padEnd(12)} ${r.name.slice(0, 40)}`);
  });

  // Timezone distribution — important for session boundary logic
  const byTz = {};
  ok.forEach(r => { byTz[r.tz] = (byTz[r.tz] || 0) + 1; });
  console.log('\n── Timezones observed ──');
  Object.entries(byTz).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${(k || 'null').padEnd(30)} ${v}`));

  // Assets where the last completed session is NOT yesterday (pubDate-1)
  const yesterdayStr = (() => {
    const d = new Date(pubDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const stale = ok.filter(r => r.sessionDate < yesterdayStr);
  console.log(`\n── Assets with session older than ${yesterdayStr} (weekend/holiday/delisted?) ──`);
  console.log(`   Count: ${stale.length}`);
  stale.slice(0, 20).forEach(r => console.log(`   ${r.symbol.padEnd(12)} sessionDate=${r.sessionDate}  ${r.name.slice(0, 50)}`));

  // Assets where we already have a candle for today (futures, FX, crypto)
  const withToday = ok.filter(r => r.hasTodayCandle);
  console.log(`\n── Assets with a PARTIAL candle for ${pubDate} (futures/FX/crypto/24h markets) ──`);
  console.log(`   Count: ${withToday.length}`);

  // Errors sample
  const errors = results.filter(r => r.status !== 'ok');
  console.log(`\n── Failed/incomplete tickers (${errors.length}) ──`);
  const errorByKind = {};
  errors.forEach(e => { const k = e.status + (e.error ? ':' + e.error : ''); errorByKind[k] = (errorByKind[k] || 0) + 1; });
  Object.entries(errorByKind).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`   ${k.padEnd(40)} ${v}`));
  console.log(`\n   Sample errors:`);
  errors.slice(0, 10).forEach(e => console.log(`   ${e.symbol.padEnd(12)} ${e.status.padEnd(25)} ${e.error || ''}  [${e.industry}]`));
}

// Write detailed CSV
const csvPath = resolve(`data/yahoo-session-test-${pubDate}.csv`);
const csvHeader = 'symbol,name,industry,status,tz,sessionDate,prevSessionDate,sessionClose,prevClose,sessionHigh,sessionLow,sessionChangePct,sessionRangePct,currentPrice,changePctNow,absDiff,hasTodayCandle,error\n';
const csvRows = results.map(r => [
  r.symbol,
  (r.name || '').replace(/[,\n]/g, ' '),
  r.industry,
  r.status,
  r.tz || '',
  r.sessionDate || '',
  r.prevSessionDate || '',
  r.sessionClose ?? '',
  r.prevClose ?? '',
  r.sessionHigh ?? '',
  r.sessionLow ?? '',
  r.sessionChangePct ?? '',
  r.sessionRangePct ?? '',
  r.currentPrice ?? '',
  r.changePctNow ?? '',
  r.absDiffSessionVsNow ?? '',
  r.hasTodayCandle ?? '',
  r.error || '',
].join(',')).join('\n');
writeFileSync(csvPath, csvHeader + csvRows, 'utf8');
console.log(`\nCSV written: ${csvPath} (${Math.round((csvHeader + csvRows).length / 1024)} KB)`);
