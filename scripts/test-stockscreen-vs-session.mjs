#!/usr/bin/env node
// Compare stockScreen changePct (via spark) vs true session J-1 (via daily candles).
// Usage: node scripts/test-stockscreen-vs-session.mjs [pubDate]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pubDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";

const s = JSON.parse(readFileSync(resolve(`data/snapshot-${pubDate}.json`), 'utf8'));
const screen = s.stockScreen || [];
// Sample: take 15 across all indices
const sample = [];
for (const idx of ['SP500','CAC40','DAX40','FTSE100','NIKKEI50','HSI30']) {
  sample.push(...screen.filter(x => x.index === idx).slice(0, 3));
}

async function getSessionChg(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    if (!res) return { error: 'no result' };
    const ts = res.timestamp || [];
    const closes = res.indicators?.quote?.[0]?.close || [];
    const opens = res.indicators?.quote?.[0]?.open || [];
    const highs = res.indicators?.quote?.[0]?.high || [];
    const lows = res.indicators?.quote?.[0]?.low || [];
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] == null || opens[i] == null) continue;
      candles.push({
        date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
        o: opens[i], h: highs[i], l: lows[i], c: closes[i],
      });
    }
    const completed = candles.filter(c => c.date < pubDate && Number.isFinite(c.c));
    if (completed.length < 2) return { error: 'insufficient history', n: completed.length };
    const sess = completed[completed.length - 1];
    const prev = completed[completed.length - 2];
    return {
      sessionChg: (sess.c - prev.c) / prev.c * 100,
      sessionDate: sess.date,
      sessionHigh: sess.h,
      sessionLow: sess.l,
      sessionRangePct: (sess.h - sess.l) / prev.c * 100,
      currentPrice: res.meta?.regularMarketPrice,
      changePctNow: res.meta?.regularMarketPrice ? (res.meta.regularMarketPrice - sess.c) / sess.c * 100 : null,
    };
  } catch (e) {
    return { error: e.message.slice(0, 60) };
  }
}

console.log(`Sampling ${sample.length} stock screen movers — comparing spark changePct vs daily-candle session J-1`);
console.log('='.repeat(110));
console.log('Symbol       Index       Screen%      Session%     Now%         SessDate    Status');
console.log('─'.repeat(110));

let bugCount = 0;
for (const s_ of sample) {
  const r = await getSessionChg(s_.symbol);
  if (r.error) {
    console.log(`  ${s_.symbol.padEnd(12)} ${s_.index.padEnd(10)}  ${(s_.changePct>=0?'+':'') + s_.changePct.toFixed(2)}%       ERROR: ${r.error}`);
    continue;
  }
  const screenPct = s_.changePct;
  const sessionPct = r.sessionChg;
  const diff = Math.abs(screenPct - sessionPct);
  const isBug = diff > 0.5; // More than 0.5pp difference = real divergence
  if (isBug) bugCount++;
  const flag = isBug ? ' ⚠ BUG' : '';
  console.log(`  ${s_.symbol.padEnd(12)} ${s_.index.padEnd(10)} ${((screenPct>=0?'+':'') + screenPct.toFixed(2) + '%').padEnd(12)} ${((sessionPct>=0?'+':'') + sessionPct.toFixed(2) + '%').padEnd(12)} ${(r.changePctNow != null ? (r.changePctNow>=0?'+':'') + r.changePctNow.toFixed(2) + '%' : '—').padEnd(12)} ${r.sessionDate.padEnd(11)}${flag}`);
}
console.log('─'.repeat(110));
console.log(`\nBugs detected: ${bugCount}/${sample.length} (|screen - session| > 0.5pp)`);
