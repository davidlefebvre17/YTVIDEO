#!/usr/bin/env node
// Generate a single-page HTML report from a snapshot JSON.
// Usage: npx tsx scripts/snapshot-to-html.ts [pubDate YYYY-MM-DD] [sessionDate YYYY-MM-DD]
// Defaults: pubDate = today, sessionDate = day before pubDate
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initTagger, tagArticleAuto } from '../packages/ai/src/memory/news-tagger';

const pubDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const defaultSessionDate = (() => {
  const d = new Date(pubDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();
const sessionDate = process.argv[3] || defaultSessionDate;
const inPath = resolve(`data/snapshot-${pubDate}.json`);
const outPath = resolve(`data/snapshot-${pubDate}.html`);
const s = JSON.parse(readFileSync(inPath, 'utf8'));

// ── NewsMemory tagger init (rules-based, 3 layers) ──
initTagger();

// ── Temporal classification (same logic as briefing-pack.ts) ──
const PUB_CUTOFF_HOUR = 7;
const nextSessionDay = (() => {
  const d = new Date(sessionDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();
type NewsWhen = 'before_session' | 'during_session' | 'post_session' | 'pre_publication';
const classifyNewsTemporal = (publishedAt: string | undefined): NewsWhen => {
  const d = (publishedAt || '').slice(0, 10) || sessionDate;
  if (d < sessionDate) return 'before_session';
  if (d === sessionDate) return 'during_session';
  if (d === nextSessionDay) return 'post_session';
  return 'pre_publication';
};
type EventWhen = 'pre_session' | 'session_day' | 'pub_morning_before' | 'pub_morning_after' | 'upcoming';
const classifyEventTemporal = (e: { date?: string; time?: string }): EventWhen => {
  const d = e.date || '';
  if (!d) return 'session_day';
  if (d < sessionDate) return 'pre_session';
  if (d === sessionDate) return 'session_day';
  if (d === pubDate) {
    const h = parseInt((e.time || '00:00').slice(0, 2), 10) || 0;
    return h < PUB_CUTOFF_HOUR ? 'pub_morning_before' : 'pub_morning_after';
  }
  return 'upcoming';
};
const WHEN_LABEL_NEWS: Record<NewsWhen, string> = {
  before_session: 'Avant séance',
  during_session: 'Pendant séance',
  post_session: 'Après clôture (ce matin)',
  pre_publication: 'Futur',
};
const WHEN_CLASS_NEWS: Record<NewsWhen, string> = {
  before_session: 'when-before',
  during_session: 'when-during',
  post_session: 'when-post',
  pre_publication: 'when-pre',
};
const WHEN_LABEL_EVENT: Record<EventWhen, string> = {
  pre_session: 'Avant séance',
  session_day: 'Jour séance',
  pub_morning_before: 'Ce matin (avant 07h UTC)',
  pub_morning_after: 'Ce matin (après 07h UTC)',
  upcoming: 'À venir',
};
const WHEN_CLASS_EVENT: Record<EventWhen, string> = {
  pre_session: 'when-before',
  session_day: 'when-during',
  pub_morning_before: 'when-post',
  pub_morning_after: 'when-pre',
  upcoming: 'when-upcoming',
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c: string) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c as string] ?? c));
const fmt = (n: unknown, d = 2) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';
const pct = (n: unknown, d = 2) => (typeof n === 'number' && isFinite(n)) ? (n >= 0 ? '+' : '') + n.toFixed(d) + '%' : '—';
const cls = (n: unknown) => typeof n === 'number' ? (n > 0 ? 'pos' : n < 0 ? 'neg' : '') : '';
const short = (str: unknown, n = 200) => {
  if (!str) return '';
  const t = String(str);
  return t.length > n ? t.slice(0, n) + '…' : t;
};

// ── Assets ───────────────────────────────────────────────
// Compute yesterday session's candle change from dailyCandles
const computeSessionChange = (a: any): number | null => {
  const dc = a.dailyCandles || [];
  if (dc.length < 2) return null;
  // Find the candle at sessionDate (or the last one strictly before pubDate)
  const sessionClose = dc.find((c: any) => c.date?.slice(0, 10) === sessionDate)?.c
    ?? dc.filter((c: any) => c.date?.slice(0, 10) < pubDate).slice(-1)[0]?.c;
  if (sessionClose == null) return null;
  // The close of the session BEFORE the session we're reporting on
  const idx = dc.findIndex((c: any) => c.c === sessionClose);
  const prevClose = idx > 0 ? dc[idx - 1].c : null;
  if (prevClose == null) return null;
  return ((sessionClose - prevClose) / prevClose) * 100;
};

const assetsRows = s.assets.map((a: any) => {
  const t = a.technicals || {};
  const p = a.perf || {};
  const d1y = a.multiTF?.daily1y || {};
  const w10y = a.multiTF?.weekly10y || {};
  // Depuis le fix session : a.changePct = séance J-1 (vraie bougie), a.changePctNow = intraday ce matin
  return `<tr>
    <td>${esc(a.symbol)}</td>
    <td>${esc(a.name)}</td>
    <td class="num">${fmt(a.price, 4)}</td>
    <td class="num ${cls(a.changePctNow)}" title="Intraday depuis close J-1 (mouvement d'aujourd'hui)">${pct(a.changePctNow)}</td>
    <td class="num ${cls(a.changePct)}" title="Vraie bougie de la séance ${a.sessionDate || 'J-1'}">${pct(a.changePct)}</td>
    <td class="num" title="Range H-L en % de la close J-2">${a.sessionRangePct != null ? a.sessionRangePct.toFixed(2) + '%' : '—'}</td>
    <td class="num ${cls(p.week)}">${pct(p.week)}</td>
    <td class="num ${cls(p.wtd)}">${pct(p.wtd)}</td>
    <td class="num ${cls(p.month)}">${pct(p.month)}</td>
    <td class="num ${cls(p.year)}">${pct(p.year)}</td>
    <td class="num ${cls(p.ytd)}">${pct(p.ytd)}</td>
    <td class="num ${cls(p.fromATH)}">${pct(p.fromATH)}</td>
    <td class="num">${fmt(t.rsi14, 1)}</td>
    <td>${esc(t.trend || '')}</td>
    <td class="num">${fmt(t.dramaScore, 1)}</td>
    <td class="num">${fmt(t.sma20, 2)}</td>
    <td class="num">${fmt(t.sma50, 2)}</td>
    <td class="num">${fmt(d1y.high52w, 2)}</td>
    <td class="num">${fmt(d1y.low52w, 2)}</td>
    <td class="num">${fmt(d1y.volumeVsAvg, 2)}</td>
    <td>${esc(d1y.recentBreakout || '')}</td>
    <td>${esc(w10y.trend || '')}</td>
    <td class="num">${fmt(w10y.distanceFromATH, 1)}%</td>
    <td class="num">${fmt(w10y.majorSupport, 2)}</td>
    <td class="num">${fmt(w10y.majorResistance, 2)}</td>
    <td>${esc(a.group || '')}</td>
  </tr>`;
}).join('');

// ── News (with 3-layer tagging + temporal classification) ──
const taggedNews = s.news.map((n: any) => {
  const tags = tagArticleAuto({
    title: n.title,
    summary: n.summary,
    source: n.source,
  });
  const when = classifyNewsTemporal(n.publishedAt);
  return { ...n, tags, when };
});

// Count by temporal bucket
const newsWhenCounts: Record<NewsWhen, number> = {
  before_session: 0, during_session: 0, post_session: 0, pre_publication: 0,
};
for (const n of taggedNews) newsWhenCounts[n.when as NewsWhen]++;

const formatAssetTags = (tags: any) => {
  const asList = (tags.assets || []).map((a: any) =>
    `<span class="tag tag-asset tag-conf-${a.confidence}">${esc(a.symbol)}${a.source_layer === 2 ? ' ·L2' : ''}</span>`
  ).join('');
  const thList = (tags.themes || []).map((t: string) =>
    `<span class="tag tag-theme">${esc(t)}</span>`
  ).join('');
  const impact = tags.impact ? `<span class="tag tag-impact-${tags.impact}">${tags.impact}</span>` : '';
  return asList + thList + impact;
};

const newsRows = taggedNews.map((n: any) => `<tr>
  <td class="ws">${esc((n.publishedAt || '').slice(0, 16).replace('T', ' '))}</td>
  <td><span class="${WHEN_CLASS_NEWS[n.when as NewsWhen]}">${WHEN_LABEL_NEWS[n.when as NewsWhen]}</span></td>
  <td>${esc(n.source)}</td>
  <td>${esc(n.category || '')}</td>
  <td>${esc(n.lang || '')}</td>
  <td>
    <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
    ${n.summary ? `<div class="news-summary">${esc(n.summary)}</div>` : ''}
    <div class="tags">${formatAssetTags(n.tags)}</div>
    ${n.tags.rules_matched?.length ? `<div class="rules-matched">rules: ${esc((n.tags.rules_matched || []).join(', '))}</div>` : ''}
  </td>
</tr>`).join('');

// ── Events (with temporal classification) ──────────────
const eventRow = (e: any) => {
  const when = classifyEventTemporal(e);
  return `<tr>
    <td class="ws">${esc(e.date)} ${esc(e.time || '')}</td>
    <td><span class="${WHEN_CLASS_EVENT[when]}">${WHEN_LABEL_EVENT[when]}</span></td>
    <td>${esc(e.currency || '')}</td>
    <td class="impact-${esc(e.impact)}">${esc(e.impact || '')}</td>
    <td>${esc(e.name)}</td>
    <td class="num">${esc(e.actual ?? '')}</td>
    <td class="num">${esc(e.forecast ?? e.estimate ?? '')}</td>
    <td class="num">${esc(e.previous ?? '')}</td>
  </tr>`;
};
const eventsToday = s.events.map(eventRow).join('');
const eventsYesterday = (s.yesterdayEvents || []).map(eventRow).join('');
const eventsUpcoming = (s.upcomingEvents || []).map(eventRow).join('');

// ── Earnings ────────────────────────────────────────────
const earningsRow = (e: any) => `<tr>
  <td>${esc(e.symbol)}</td>
  <td>${esc(e.name || '')}</td>
  <td class="ws">${esc(e.date)}</td>
  <td>${esc(e.hour || '')}</td>
  <td class="num">${fmt(e.epsEstimate, 4)}</td>
  <td class="num">${fmt(e.epsActual, 4)}</td>
  <td class="num">${e.revenueEstimate ? (e.revenueEstimate / 1e9).toFixed(2) + 'B' : '—'}</td>
  <td class="num">${e.revenueActual ? (e.revenueActual / 1e9).toFixed(2) + 'B' : '—'}</td>
  <td>${e.reported ? '✓' : ''}</td>
</tr>`;
const earningsToday = s.earnings.map(earningsRow).join('');
const earningsUpcoming = (s.earningsUpcoming || []).map(earningsRow).join('');

// ── Stock screen ────────────────────────────────────────
const screenRows = s.stockScreen.map((x: any) => `<tr>
  <td>${esc(x.symbol)}</td>
  <td>${esc(x.name)}</td>
  <td>${esc(x.index)}</td>
  <td>${esc(x.sector || '')}</td>
  <td class="num">${fmt(x.price, 2)}</td>
  <td class="num ${cls(x.changePct)}">${pct(x.changePct)}</td>
  <td class="num">${x.volume ? (x.volume / 1e6).toFixed(2) + 'M' : '—'}</td>
  <td class="num">${x.avgVolume ? (x.volume / x.avgVolume).toFixed(2) + 'x' : '—'}</td>
  <td class="num">${fmt(x.high52w, 2)}</td>
  <td class="num">${fmt(x.low52w, 2)}</td>
  <td>${esc((x.reason || []).join(', '))}</td>
  <td>${esc(short(x.description, 140))}</td>
</tr>`).join('');

// ── Polymarket ──────────────────────────────────────────
const polyRows = s.polymarket.map((p: any) => {
  const probs = Object.entries(p.probabilities || {}).map(([k, v]) => `${esc(k)}: <b>${v}%</b>`).join(' · ');
  return `<tr>
    <td>${esc(p.category || '')}</td>
    <td>${esc(p.question)}</td>
    <td class="ws">${esc((p.endDate || '').slice(0, 10))}</td>
    <td>${probs}</td>
    <td class="num">${p.volume24h ? '$' + (p.volume24h / 1e3).toFixed(0) + 'k' : '—'}</td>
    <td class="num">${p.liquidity ? '$' + (p.liquidity / 1e3).toFixed(0) + 'k' : '—'}</td>
  </tr>`;
}).join('');

// ── COT ────────────────────────────────────────────────
const cotRows = (s.cotPositioning?.contracts || []).map((c: any) => {
  const cur = c.current || {};
  const sig = cur.signals || {};
  const am = cur.assetManagers || {};
  const lf = cur.leveragedFunds || {};
  const dl = cur.dealers || {};
  return `<tr>
    <td>${esc(c.symbol)}</td>
    <td>${esc(c.name)}</td>
    <td>${esc(c.reportType)}</td>
    <td class="num">${cur.openInterest ? cur.openInterest.toLocaleString() : '—'}</td>
    <td class="num">${am.netPosition?.toLocaleString() ?? '—'}</td>
    <td class="num">${fmt(am.pctOfOI, 1)}%</td>
    <td class="num">${lf.netPosition?.toLocaleString() ?? '—'}</td>
    <td class="num">${fmt(lf.pctOfOI, 1)}%</td>
    <td class="num">${dl.netPosition?.toLocaleString() ?? '—'}</td>
    <td class="num">${fmt(dl.pctOfOI, 1)}%</td>
    <td>${esc(sig.bias || '')}</td>
    <td class="num">${fmt(sig.percentileRank, 0)}</td>
    <td class="num ${cls(sig.netChangeSpeculators)}">${sig.netChangeSpeculators != null ? (sig.netChangeSpeculators > 0 ? '+' : '') + sig.netChangeSpeculators.toLocaleString() : '—'}</td>
    <td class="num">${sig.weeksInDirection ?? ''}</td>
    <td>${sig.flipDetected ? '⚡' : ''}</td>
  </tr>`;
}).join('');

// ── Yields history (compact) ────────────────────────────
const yieldsHist = (s.yieldsHistory?.us10y || []).slice(-30).reverse().map((y: any, i: number) => {
  const y2 = (s.yieldsHistory?.us2y || []).slice(-30).reverse()[i];
  const sp = (s.yieldsHistory?.spread10y2y || []).slice(-30).reverse()[i];
  return `<tr>
    <td class="ws">${esc(y.date)}</td>
    <td class="num">${fmt(y.value, 3)}</td>
    <td class="num">${fmt(y2?.value, 3)}</td>
    <td class="num">${fmt(sp?.value, 3)}</td>
  </tr>`;
}).join('');

// ── Trending coins ─────────────────────────────────────
const trendingRows = (s.sentiment.trendingCoins || []).map((c: any) => `<tr>
  <td>${esc(c.name)}</td>
  <td>${esc(c.symbol)}</td>
  <td class="num">${c.rank ?? ''}</td>
</tr>`).join('');

// ── HTML assembly ──────────────────────────────────────
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Snapshot ${esc(s.date)} — TradingRecap</title>
<style>
  :root {
    --bg: #0d1117; --fg: #c9d1d9; --muted: #8b949e; --border: #30363d;
    --accent: #00b4d8; --pos: #3fb950; --neg: #f85149; --warn: #d29922;
    --high: #f85149; --medium: #d29922; --low: #8b949e;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 1.5rem;
    background: var(--bg); color: var(--fg);
    font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  h1 { margin: 0 0 0.2rem; font-size: 1.6rem; color: var(--accent); }
  h2 { margin: 2rem 0 0.5rem; font-size: 1.1rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
  .subtitle { color: var(--muted); margin-bottom: 1.5rem; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem; }
  .kpi { background: #161b22; border: 1px solid var(--border); border-radius: 6px; padding: 0.6rem 0.8rem; }
  .kpi .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi .value { font-size: 1.1rem; color: var(--fg); margin-top: 0.2rem; }
  details { background: #161b22; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.8rem; }
  details > summary {
    padding: 0.6rem 1rem; cursor: pointer; font-weight: 600; list-style: none;
    user-select: none; border-radius: 6px;
  }
  details > summary::-webkit-details-marker { display: none; }
  details > summary::before { content: '▸ '; color: var(--accent); transition: 0.2s; display: inline-block; }
  details[open] > summary::before { transform: rotate(90deg); }
  details[open] > summary { border-bottom: 1px solid var(--border); border-radius: 6px 6px 0 0; }
  .table-wrap { overflow: auto; max-height: 70vh; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
  th { background: #21262d; position: sticky; top: 0; z-index: 1; font-weight: 600; color: var(--muted); white-space: nowrap; }
  tbody tr:hover { background: #1c2128; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.ws { white-space: nowrap; }
  .pos { color: var(--pos); }
  .neg { color: var(--neg); }
  .impact-high { color: var(--high); font-weight: 600; }
  .impact-medium { color: var(--medium); }
  .impact-low { color: var(--low); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .count { color: var(--muted); font-weight: 400; font-size: 0.9em; }
  .news-summary { color: var(--muted); font-size: 11.5px; margin-top: 3px; line-height: 1.4; max-width: 80ch; }
  .tags { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 3px; }
  .tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 600; line-height: 1.4; }
  .tag-asset { background: #1f6feb33; color: #79c0ff; border: 1px solid #1f6feb66; }
  .tag-asset.tag-conf-low { opacity: 0.6; }
  .tag-theme { background: #d2992233; color: #e3b341; border: 1px solid #d2992266; }
  .tag-impact-bullish { background: #3fb95033; color: var(--pos); border: 1px solid #3fb95066; }
  .tag-impact-bearish { background: #f8514933; color: var(--neg); border: 1px solid #f8514966; }
  .tag-impact-neutral { background: #8b949e33; color: var(--muted); border: 1px solid #8b949e66; }
  .rules-matched { font-size: 10px; color: #484f58; margin-top: 2px; font-family: ui-monospace, monospace; }
  .when-before { color: #8b949e; background: #8b949e22; padding: 1px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; }
  .when-during { color: #3fb950; background: #3fb95022; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .when-post { color: #d29922; background: #d2992222; padding: 1px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; }
  .when-pre { color: #bc8cff; background: #bc8cff22; padding: 1px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; }
  .when-upcoming { color: #58a6ff; background: #58a6ff22; padding: 1px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; }
  .legend { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 0.5rem 0 1rem; font-size: 11px; color: var(--muted); }
  .legend b { color: var(--fg); }
</style>
</head>
<body>

<h1>Market Snapshot — ${esc(s.date)}</h1>
<div class="subtitle">${esc(s.assets.length)} assets · ${esc(s.news.length)} news · ${esc(s.events.length)} events today · ${esc((s.yesterdayEvents || []).length)} yesterday · ${esc((s.upcomingEvents || []).length)} upcoming · ${esc(s.earnings.length)} earnings</div>

<div class="kpis">
  <div class="kpi"><div class="label">US 10Y</div><div class="value">${fmt(s.yields?.us10y, 3)}%</div></div>
  <div class="kpi"><div class="label">US 2Y</div><div class="value">${fmt(s.yields?.us2y, 3)}%</div></div>
  <div class="kpi"><div class="label">Spread 10Y-2Y</div><div class="value">${fmt(s.yields?.spread10y2y, 3)}%</div></div>
  <div class="kpi"><div class="label">Fear &amp; Greed</div><div class="value">${esc(s.sentiment?.cryptoFearGreed ?? '—')}</div></div>
  <div class="kpi"><div class="label">BTC Dominance</div><div class="value">${fmt(s.sentiment?.btcDominance, 2)}%</div></div>
  <div class="kpi"><div class="label">COT report</div><div class="value">${esc(s.cotPositioning?.reportDate || '—')}</div></div>
</div>

<h2>Assets <span class="count">(${s.assets.length})</span></h2>
<details open>
  <summary>Tous les actifs — prix, performances, techniques, multi-TF</summary>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Symbol</th><th>Name</th><th>Price</th>
        <th title="Intraday maintenant (prix live vs close J-1)">Intraday</th>
        <th title="Vraie bougie de la séance J-1 (${sessionDate})">Séance J-1</th>
        <th title="Amplitude high-low de la séance J-1 en %">Range %</th>
        <th>Week</th><th title="Week-to-date (depuis lundi)">WTD</th><th>Month</th><th>Year</th><th>YTD</th><th>ATH</th>
        <th>RSI14</th><th>Trend</th><th>Drama</th>
        <th>SMA20</th><th>SMA50</th><th>52w High</th><th>52w Low</th>
        <th>Vol vs Avg</th><th>Breakout</th>
        <th>W Trend</th><th>ATH dist</th><th>Major Support</th><th>Major Resistance</th>
        <th>Group</th>
      </tr></thead>
      <tbody>${assetsRows}</tbody>
    </table>
  </div>
</details>

<h2>Yields</h2>
<details>
  <summary>Historique 30 derniers jours (US 10Y / 2Y / Spread)</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>10Y</th><th>2Y</th><th>Spread</th></tr></thead>
      <tbody>${yieldsHist}</tbody>
    </table>
  </div>
</details>

<h2>Sentiment — Trending coins</h2>
<details>
  <summary>CoinGecko trending (${(s.sentiment.trendingCoins || []).length})</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Name</th><th>Symbol</th><th>Rank</th></tr></thead>
      <tbody>${trendingRows}</tbody>
    </table>
  </div>
</details>

<h2>COT Positioning <span class="count">(${(s.cotPositioning?.contracts || []).length} contracts, report ${esc(s.cotPositioning?.reportDate || '')})</span></h2>
<details>
  <summary>Positionnement spéculateurs — Asset Managers / Leveraged Funds / Dealers</summary>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Symbol</th><th>Name</th><th>Type</th><th>OI</th>
        <th>AM Net</th><th>AM %</th>
        <th>LF Net</th><th>LF %</th>
        <th>DL Net</th><th>DL %</th>
        <th>Bias</th><th>%ile</th>
        <th>Δ Spec</th><th>Wks</th><th>Flip</th>
      </tr></thead>
      <tbody>${cotRows}</tbody>
    </table>
  </div>
</details>

<h2>Events — Today <span class="count">(${s.events.length})</span></h2>
<details>
  <summary>Calendrier économique d'aujourd'hui</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>When</th><th>Ccy</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th></tr></thead>
      <tbody>${eventsToday}</tbody>
    </table>
  </div>
</details>

<h2>Events — Yesterday <span class="count">(${(s.yesterdayEvents || []).length})</span></h2>
<details>
  <summary>Calendrier économique d'hier (avec actuals)</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>When</th><th>Ccy</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th></tr></thead>
      <tbody>${eventsYesterday}</tbody>
    </table>
  </div>
</details>

<h2>Events — Upcoming 7d <span class="count">(${(s.upcomingEvents || []).length})</span></h2>
<details>
  <summary>Événements à venir sur 7 jours</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>When</th><th>Ccy</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th></tr></thead>
      <tbody>${eventsUpcoming}</tbody>
    </table>
  </div>
</details>

<h2>Earnings — Today <span class="count">(${s.earnings.length})</span></h2>
<details>
  <summary>Earnings reports du jour</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Symbol</th><th>Name</th><th>Date</th><th>Hour</th><th>EPS Est</th><th>EPS Act</th><th>Rev Est</th><th>Rev Act</th><th>Rep</th></tr></thead>
      <tbody>${earningsToday}</tbody>
    </table>
  </div>
</details>

<h2>Earnings — Upcoming <span class="count">(${(s.earningsUpcoming || []).length})</span></h2>
<details>
  <summary>Earnings à venir (constituents indices)</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Symbol</th><th>Name</th><th>Date</th><th>Hour</th><th>EPS Est</th><th>EPS Act</th><th>Rev Est</th><th>Rev Act</th><th>Rep</th></tr></thead>
      <tbody>${earningsUpcoming}</tbody>
    </table>
  </div>
</details>

<h2>Stock Screen <span class="count">(${s.stockScreen.length})</span></h2>
<details>
  <summary>Movers flaggés — 6 indices (SP500, CAC40, DAX40, FTSE100, NIKKEI50, HSI30)</summary>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Symbol</th><th>Name</th><th>Index</th><th>Sector</th>
        <th>Price</th><th>Chg%</th><th>Volume</th><th>Vol x</th>
        <th>52w H</th><th>52w L</th><th>Reasons</th><th>Description</th>
      </tr></thead>
      <tbody>${screenRows}</tbody>
    </table>
  </div>
</details>

<h2>Polymarket <span class="count">(${s.polymarket.length})</span></h2>
<details>
  <summary>Marchés de prédiction actifs</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Category</th><th>Question</th><th>End</th><th>Probabilities</th><th>24h Vol</th><th>Liquidity</th></tr></thead>
      <tbody>${polyRows}</tbody>
    </table>
  </div>
</details>

<h2>News <span class="count">(${s.news.length} total · <span class="when-during">pendant séance: ${newsWhenCounts.during_session}</span> · <span class="when-before">avant: ${newsWhenCounts.before_session}</span> · <span class="when-post">après clôture: ${newsWhenCounts.post_session}</span> · <span class="when-pre">futur: ${newsWhenCounts.pre_publication}</span>)</span></h2>
<div class="legend">
  <span><b>Tags</b> :</span>
  <span class="tag tag-asset">ASSET</span> = direct match (Layer 1)
  <span class="tag tag-asset" style="opacity:.6">ASSET ·L2</span> = causal rule (Layer 2)
  <span class="tag tag-theme">theme</span> = macro theme
  <span class="tag tag-impact-bullish">bullish</span> / <span class="tag tag-impact-bearish">bearish</span> / <span class="tag tag-impact-neutral">neutral</span>
</div>
<details>
  <summary>Articles taggés (3 layers: direct + causal + metadata) et classés temporellement — sessionDate=${esc(sessionDate)} pubDate=${esc(pubDate)} cutoff=07:00 UTC</summary>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Published</th><th>When</th><th>Source</th><th>Category</th><th>Lang</th><th>Title + tags</th></tr></thead>
      <tbody>${newsRows}</tbody>
    </table>
  </div>
</details>

</body>
</html>`;

writeFileSync(outPath, html, 'utf8');
console.log(`Written: ${outPath}`);
console.log(`Size: ${Math.round(html.length / 1024)} KB`);
