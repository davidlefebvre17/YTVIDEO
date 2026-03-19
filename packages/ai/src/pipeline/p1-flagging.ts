import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot, AssetSnapshot, EconomicEvent } from "@yt-maker/core";
import { loadMemory } from "@yt-maker/data";
import { initTagger, tagArticleAuto } from "../memory/news-tagger";
import type { SnapshotFlagged, FlaggedAsset, MaterialityFlag, NewsCluster } from "./types";
import {
  POLITICAL_ACTORS, ACTION_KEYWORDS, COT_TO_ASSET,
  actorMatchesText, matchesKeyword,
} from "./helpers/briefing-pack";

// ── Flag weights for materiality score v2 ──
// Pondération narrative-first : ce qui captive le spectateur YouTube
const FLAG_WEIGHT: Record<MaterialityFlag, number> = {
  // ── Narratif (~40%) — histoires, surprises, acteurs ──
  'POLITICAL_TRIGGER':  3.0,  // head of state / central bank + action keyword
  'MACRO_SURPRISE':     3.0,  // high-impact event, actual ≠ forecast >10%
  'EARNINGS_SURPRISE':  3.0,  // beat/miss >10%
  'NEWS_CLUSTER':       2.0,  // ≥3 articles concentrated on same asset
  'EARNINGS_TODAY':     1.5,  // publishes today, results pending (suspense)
  'NEWS_LINKED':        1.0,  // ≥1 article linked via tagger
  // ── Mouvement (~25%) — preuve que quelque chose s'est passé ──
  'EXTREME_MOVE':       3.0,  // >5% variation
  'PRICE_MOVE':         1.0,  // >2% variation
  'VOLUME_SPIKE':       1.5,  // volume >150% avg 20d
  // ── Structure (~20%) — contexte, niveaux historiques ──
  'ATH_PROXIMITY':      2.0,  // <5% from ATH — "record historique" = titre YouTube
  'SMA200_CROSS':       2.0,  // regime change
  'ZONE_EVENT':         1.5,  // MarketMemory zone touched
  'EMA_BREAK':          0.5,  // SMA20/50 cross — trop fréquent
  'RSI_EXTREME':        0.5,  // RSI <30 or >70 — trop courant
  // ── Intermarché (~15%) — liens causaux, positionnement ──
  'CAUSAL_CHAIN':       2.0,  // asset in active intermarket correlation
  'COT_DIVERGENCE':     1.5,  // COT bias contradicts price direction
  'SENTIMENT_EXTREME':  1.0,  // F&G <20 or >80
};

/**
 * Extract previous close price.
 * Tries direct candles first, then computes from price and changePct.
 */
function getPrevClose(asset: AssetSnapshot): number | undefined {
  // Try direct candles first
  if (asset.candles?.length >= 2) {
    return asset.candles[asset.candles.length - 2]?.c;
  }
  // Fallback: compute from current price and changePct
  // prevClose = price / (1 + changePct/100)
  if (asset.price > 0 && asset.changePct !== 0) {
    return asset.price / (1 + asset.changePct / 100);
  }
  return undefined;
}

// ── News cluster detection for stocks outside watchlist ──

const INDICES_DIR = path.resolve(process.cwd(), "data", "indices");

interface IndexConstituent { symbol: string; name: string; }

function loadAllConstituents(): IndexConstituent[] {
  const all: IndexConstituent[] = [];
  try {
    const files = fs.readdirSync(INDICES_DIR).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(INDICES_DIR, file), "utf-8")) as IndexConstituent[];
      all.push(...data);
    }
  } catch {
    // indices not available
  }
  return all;
}

// Names too generic to match reliably as substrings in news titles
const SKIP_NAMES = new Set([
  "3M", "HP", "ON", "AT", "IT", "AES", "CF", "GE", "LG", "SK",
  "Bio-Techne",  // "tech" matches too broadly
]);
// Minimum name length for substring match (shorter names use word-boundary match)
const MIN_SUBSTRING_LEN = 6;

function detectNewsClusters(snapshot: DailySnapshot): NewsCluster[] {
  if (!snapshot.news?.length) return [];

  const watchlistSymbols = new Set(snapshot.assets.map(a => a.symbol));
  const constituents = loadAllConstituents();
  // Only consider stocks NOT already in the 38-asset watchlist
  const candidates = constituents.filter(c => !watchlistSymbols.has(c.symbol));

  // Build matching: for each candidate, count articles where the company name appears in the title
  const counts = new Map<string, { name: string; count: number; titles: string[] }>();

  for (const candidate of candidates) {
    const name = candidate.name;
    if (SKIP_NAMES.has(name) || name.length < 4) continue;

    const nameUp = name.toUpperCase();
    const symbolUp = candidate.symbol.replace(/\..+$/, "").toUpperCase(); // Remove .PA, .DE etc.

    // For short names (<6 chars), use word-boundary regex to avoid false positives
    // e.g. "Meta" should match "Meta Platforms" but not "metadata" or "metaverse"
    // For longer names (>=6 chars), substring match is safe enough
    let nameRegex: RegExp | null = null;
    if (nameUp.length < MIN_SUBSTRING_LEN) {
      try {
        nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      } catch {
        continue; // Invalid regex — skip this candidate
      }
    }

    const matched: string[] = [];
    for (const article of snapshot.news) {
      const title = article.title;
      const titleUp = title.toUpperCase();

      let nameMatch = false;
      if (nameRegex) {
        nameMatch = nameRegex.test(title);
      } else {
        nameMatch = titleUp.includes(nameUp);
      }

      // Ticker match: only for 4+ char symbols, word-boundary to avoid partial matches
      let symbolMatch = false;
      if (symbolUp.length >= 4) {
        try {
          symbolMatch = new RegExp(`\\b${symbolUp}\\b`).test(titleUp);
        } catch {
          // skip
        }
      }

      if (nameMatch || symbolMatch) {
        matched.push(title);
      }
    }

    if (matched.length >= 3) {
      const existing = counts.get(candidate.symbol);
      if (!existing || matched.length > existing.count) {
        counts.set(candidate.symbol, { name, count: matched.length, titles: matched });
      }
    }
  }

  // Get price data from screening if available
  const screenData = snapshot.stockScreen ?? [];

  // Deduplicate by company name (e.g. Airbus listed as AIR.PA and AIR.DE)
  const seen = new Map<string, NewsCluster>();
  for (const [symbol, data] of counts) {
    const screen = screenData.find(s => s.symbol === symbol);
    const cluster: NewsCluster = {
      symbol,
      name: data.name,
      articleCount: data.count,
      titles: data.titles.slice(0, 5),
      changePct: screen?.changePct,
    };
    const existing = seen.get(data.name);
    if (!existing || data.count > existing.articleCount) {
      seen.set(data.name, cluster);
    }
  }

  const clusters = Array.from(seen.values());

  // Sort by article count descending
  clusters.sort((a, b) => b.articleCount - a.articleCount);

  return clusters.slice(0, 10); // Top 10 clusters
}

// Currency → affected watchlist assets (for MACRO_SURPRISE detection)
const CURRENCY_ASSETS: Record<string, string[]> = {
  'USD': ['DX-Y.NYB', 'GC=F', '^GSPC'],
  'EUR': ['EURUSD=X', '^FCHI', '^GDAXI'],
  'JPY': ['USDJPY=X', '^N225'],
  'GBP': ['GBPUSD=X', '^FTSE'],
  'CNY': ['000001.SS', '^HSI'],
  'CHF': ['USDCHF=X'],
  'AUD': ['AUDUSD=X'],
  'CAD': ['USDCAD=X', 'CL=F'],
  'NZD': ['NZDUSD=X'],
};

// Assets directly impacted by crypto F&G sentiment
const SENTIMENT_ASSETS = new Set([
  'BTC-USD', 'ETH-USD', 'SOL-USD', '^VIX',
  '^GSPC', '^DJI', '^IXIC', '^FCHI', '^GDAXI', '^FTSE', '^STOXX', '^N225', '^HSI', '^KS11',
]);

export function flagAssets(snapshot: DailySnapshot): SnapshotFlagged {
  // ════════════════════════════════════════════════════════════
  // PRE-COMPUTATIONS (run once before the per-asset loop)
  // ════════════════════════════════════════════════════════════

  // ── NEWS_LINKED + NEWS_CLUSTER: tagger-based article counts ──
  const newsLinkedSymbols = new Set<string>();
  const newsCountBySymbol = new Map<string, number>();
  if (snapshot.news?.length) {
    initTagger();
    for (const article of snapshot.news) {
      const tags = tagArticleAuto({ title: article.title, source: article.source });
      for (const tag of tags.assets) {
        newsLinkedSymbols.add(tag.symbol);
        newsCountBySymbol.set(tag.symbol, (newsCountBySymbol.get(tag.symbol) ?? 0) + 1);
      }
    }
  }

  // ── POLITICAL_TRIGGER: detect political actors + action in news → linked assets ──
  const politicalLinkedAssets = new Set<string>();
  if (snapshot.news?.length) {
    for (const article of snapshot.news) {
      const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();
      for (const config of Object.values(POLITICAL_ACTORS)) {
        if (!actorMatchesText(config, text)) continue;
        // Require action keyword (tarif, guerre, taux, etc.) — actor mention alone is too weak
        const hasAction = Object.values(ACTION_KEYWORDS).some(kws =>
          kws.some(k => matchesKeyword(text, k))
        );
        if (hasAction) {
          for (const symbol of config.linkedAssets) {
            politicalLinkedAssets.add(symbol);
          }
        }
      }
    }
  }

  // ── MACRO_SURPRISE: high-impact events where actual deviates from forecast ──
  const macroSurpriseAssets = new Set<string>();
  for (const event of snapshot.events ?? []) {
    if (event.impact !== 'high') continue;
    if (event.actual != null && event.forecast != null) {
      const actual = parseFloat(String(event.actual));
      const forecast = parseFloat(String(event.forecast));
      if (!isNaN(actual) && !isNaN(forecast) && forecast !== 0) {
        const surprisePct = Math.abs((actual - forecast) / Math.abs(forecast)) * 100;
        if (surprisePct > 10) {
          const assets = CURRENCY_ASSETS[event.currency] ?? [];
          for (const symbol of assets) macroSurpriseAssets.add(symbol);
        }
      }
    }
  }

  // ── EARNINGS_TODAY: assets publishing earnings today (results pending = suspense) ──
  const earningsTodaySymbols = new Set<string>();
  for (const earning of snapshot.earnings ?? []) {
    if (earning.epsActual == null) earningsTodaySymbols.add(earning.symbol);
  }

  // ── CAUSAL_CHAIN: detect active intermarket correlations ──
  const causalAssets = new Set<string>();
  const getAssetPct = (sym: string) => snapshot.assets.find(a => a.symbol === sym)?.changePct;

  // Rule 1-2: Dollar ↔ commodities
  const dxyPct = getAssetPct('DX-Y.NYB');
  if (dxyPct != null && Math.abs(dxyPct) > 0.3) {
    for (const [sym, pct] of [['GC=F', getAssetPct('GC=F')], ['SI=F', getAssetPct('SI=F')], ['CL=F', getAssetPct('CL=F')]] as const) {
      if (pct != null && ((dxyPct > 0 && pct < -0.3) || (dxyPct < 0 && pct > 0.3))) {
        causalAssets.add('DX-Y.NYB');
        causalAssets.add(sym);
      }
    }
  }
  // Rule 4: VIX spike ↔ SPX
  const vixPct = getAssetPct('^VIX');
  const spxPct = getAssetPct('^GSPC');
  if (vixPct != null && vixPct > 10 && spxPct != null && spxPct < 0) {
    causalAssets.add('^VIX');
    causalAssets.add('^GSPC');
  }
  // Rule 5: BTC/ETH correlation
  const btcPct = getAssetPct('BTC-USD');
  const ethPct = getAssetPct('ETH-USD');
  if (btcPct != null && ethPct != null && Math.abs(btcPct) > 2) {
    if ((btcPct > 0 && ethPct > 0) || (btcPct < 0 && ethPct < 0)) {
      causalAssets.add('BTC-USD');
      causalAssets.add('ETH-USD');
    }
  }
  // Rule 6: Oil big move → gold, Europe indices
  const oilPct = getAssetPct('CL=F');
  if (oilPct != null && Math.abs(oilPct) > 3) {
    causalAssets.add('CL=F');
    const goldPct = getAssetPct('GC=F');
    if (goldPct != null && Math.abs(goldPct) > 0.5) causalAssets.add('GC=F');
    for (const sym of ['^FCHI', '^GDAXI', '^STOXX'] as const) {
      const pct = getAssetPct(sym);
      if (pct != null && ((oilPct < -3 && pct > 0.5) || (oilPct > 3 && pct < -0.5))) {
        causalAssets.add(sym);
      }
    }
  }
  // Rule 7: JPY as risk gauge
  const jpyPct = getAssetPct('USDJPY=X');
  if (jpyPct != null && Math.abs(jpyPct) > 0.8) {
    causalAssets.add('USDJPY=X');
  }
  // Rule 9: Global sell-off / rally
  const globalIndices = ['^GSPC', '^IXIC', '^DJI', '^FCHI', '^GDAXI', '^N225']
    .map(s => ({ s, pct: getAssetPct(s) })).filter(x => x.pct != null);
  if (globalIndices.length >= 4) {
    const allDown = globalIndices.every(x => x.pct! < -0.5);
    const allUp = globalIndices.every(x => x.pct! > 0.5);
    if (allDown || allUp) {
      for (const x of globalIndices) causalAssets.add(x.s);
    }
  }

  // ── COT_DIVERGENCE: COT bias contradicts price direction ──
  const cotDivergenceAssets = new Set<string>();
  if (snapshot.cotPositioning) {
    for (const contract of snapshot.cotPositioning.contracts) {
      const bias = contract.current?.signals?.bias;
      if (!bias || bias === 'neutral') continue;
      const assetSymbol = COT_TO_ASSET[contract.symbol] ?? contract.symbol;
      const asset = snapshot.assets.find(a => a.symbol === assetSymbol);
      if (!asset || Math.abs(asset.changePct) < 1) continue;
      const cotBullish = bias.includes('long');
      const cotBearish = bias.includes('short');
      if ((asset.changePct > 0 && cotBearish) || (asset.changePct < 0 && cotBullish)) {
        cotDivergenceAssets.add(assetSymbol);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // PER-ASSET FLAG DETECTION
  // ════════════════════════════════════════════════════════════

  const flagged: FlaggedAsset[] = [];

  for (const asset of snapshot.assets) {
    const flags: MaterialityFlag[] = [];
    const absPct = Math.abs(asset.changePct);

    // ── Mouvement ──
    if (absPct > 2) flags.push('PRICE_MOVE');
    if (absPct > 5) flags.push('EXTREME_MOVE');
    if (asset.technicals
        && asset.technicals.volumeAnomaly > 1.5
        && asset.technicals.volumeAnomaly <= 10
        && !asset.symbol.startsWith('^'))
      flags.push('VOLUME_SPIKE');

    // ── Structure ──
    if (asset.technicals) {
      const prevClose = getPrevClose(asset);
      if (prevClose !== undefined) {
        const { ema9: sma20, ema21: sma50 } = asset.technicals;
        const crossSma20 = (prevClose < sma20 && asset.price >= sma20) ||
                           (prevClose > sma20 && asset.price <= sma20);
        const crossSma50 = (prevClose < sma50 && asset.price >= sma50) ||
                           (prevClose > sma50 && asset.price <= sma50);
        if (crossSma20 || crossSma50) flags.push('EMA_BREAK');
      }
    }
    if (asset.technicals?.rsi14 !== undefined &&
        (asset.technicals.rsi14 < 30 || asset.technicals.rsi14 > 70))
      flags.push('RSI_EXTREME');
    if (asset.multiTF?.weekly10y?.distanceFromATH !== undefined) {
      if (Math.abs(asset.multiTF.weekly10y.distanceFromATH) < 5)
        flags.push('ATH_PROXIMITY');
    }
    if (asset.multiTF?.daily3y?.sma200) {
      const prevClose = getPrevClose(asset);
      const sma200 = asset.multiTF.daily3y.sma200;
      if (prevClose !== undefined) {
        const crossUp = prevClose < sma200 && asset.price >= sma200;
        const crossDown = prevClose > sma200 && asset.price <= sma200;
        if (crossUp || crossDown) flags.push('SMA200_CROSS');
      }
    }
    try {
      const memory = loadMemory(asset.symbol);
      if (memory?.last_events?.some(e => e.date === snapshot.date))
        flags.push('ZONE_EVENT');
    } catch {
      // MarketMemory not available for this asset — skip
    }

    // ── Narratif ──
    if (snapshot.earnings) {
      const earning = snapshot.earnings.find(e => e.symbol === asset.symbol);
      if (earning?.epsActual !== undefined && earning?.epsEstimate !== undefined && earning.epsEstimate !== 0) {
        if (Math.abs((earning.epsActual - earning.epsEstimate) / earning.epsEstimate) > 0.1)
          flags.push('EARNINGS_SURPRISE');
      }
    }
    if (earningsTodaySymbols.has(asset.symbol)) flags.push('EARNINGS_TODAY');
    if (newsLinkedSymbols.has(asset.symbol)) flags.push('NEWS_LINKED');
    if ((newsCountBySymbol.get(asset.symbol) ?? 0) >= 3) flags.push('NEWS_CLUSTER');
    if (politicalLinkedAssets.has(asset.symbol)) flags.push('POLITICAL_TRIGGER');
    if (macroSurpriseAssets.has(asset.symbol)) flags.push('MACRO_SURPRISE');

    // ── Intermarché ──
    if (snapshot.sentiment && SENTIMENT_ASSETS.has(asset.symbol)) {
      const fgValue = snapshot.sentiment.cryptoFearGreed.value;
      if (fgValue < 20 || fgValue > 80)
        flags.push('SENTIMENT_EXTREME');
    }
    if (causalAssets.has(asset.symbol)) flags.push('CAUSAL_CHAIN');
    if (cotDivergenceAssets.has(asset.symbol)) flags.push('COT_DIVERGENCE');

    // ── Compute weighted materiality score ──
    let score = 0;
    for (const flag of flags) {
      score += FLAG_WEIGHT[flag] ?? 1;
    }
    // Amplitude bonus: volatility-adjusted z-score
    // A +5% on KOSPI (vol 15%) is exceptional, +5% on BTC (vol 60%) is routine
    const vol20d = asset.multiTF?.daily1y?.volatility20d;
    if (vol20d && vol20d > 0 && absPct > 0.5) {
      const dailyVol = vol20d / 16; // annualized → daily (√252 ≈ 16)
      const zScore = absPct / dailyVol;
      score += Math.min(zScore * 0.5, 5); // cap at 5 pts
    } else if (absPct > 2) {
      // Fallback for assets without vol20d — use steeper curve for big moves
      // +5% → 2.25, +10% → 8.0 (accelerating, not linear)
      score += (absPct - 2) * 0.5 + (absPct > 4 ? (absPct - 4) * 0.5 : 0);
    }

    flagged.push({
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      changePct: asset.changePct,
      materialityScore: Math.round(score * 10) / 10,
      flags,
      snapshot: asset,
    });
  }

  // ════════════════════════════════════════════════════════════
  // PROMOTION — top stockScreen candidates into flagged pool
  // ════════════════════════════════════════════════════════════

  const newsClusters = detectNewsClusters(snapshot);
  const watchlistSymbols = new Set(snapshot.assets.map(a => a.symbol));
  const flaggedSymbols = new Set(flagged.map(a => a.symbol));

  // Score promotion candidates
  const promoCandidates: Array<{
    screen: typeof snapshot.stockScreen extends (infer T)[] | undefined ? T : never;
    promoScore: number;
    cluster?: NewsCluster;
  }> = [];

  for (const screen of snapshot.stockScreen ?? []) {
    if (watchlistSymbols.has(screen.symbol) || flaggedSymbols.has(screen.symbol)) continue;

    let ps = 0;

    // Earnings surprise >10% (today's results)
    const earning = (snapshot.earnings ?? []).find(e => e.symbol === screen.symbol);
    if (earning?.epsActual != null && earning?.epsEstimate != null && earning.epsEstimate !== 0) {
      if (Math.abs((earning.epsActual - earning.epsEstimate) / earning.epsEstimate) > 0.1) ps += 3;
    }
    // Historical earnings surprise from earningsDetail
    const lastQ = screen.earningsDetail?.lastFourQuarters?.[0];
    if (lastQ?.surprisePct != null && Math.abs(lastQ.surprisePct) > 10) ps += 2;

    // Publishing today (suspense)
    if (screen.earningsDetail?.publishingToday) ps += 1.5;

    // Extreme mover
    if (Math.abs(screen.changePct) > 5) ps += 3;
    else if (Math.abs(screen.changePct) > 2) ps += 1;

    // News cluster
    const cluster = newsClusters.find(c => c.symbol === screen.symbol);
    if (cluster) ps += 2;

    // Volume spike
    if (screen.volume > 0 && screen.avgVolume > 0 && screen.volume / screen.avgVolume > 1.5) ps += 1.5;

    // Near 52w high
    if (screen.high52w > 0 && screen.price >= screen.high52w * 0.95) ps += 1;

    if (ps >= 3) promoCandidates.push({ screen, promoScore: ps, cluster });
  }

  // Also promote newsCluster stocks not in stockScreen (rare but possible)
  for (const cluster of newsClusters) {
    if (watchlistSymbols.has(cluster.symbol) || flaggedSymbols.has(cluster.symbol)) continue;
    if (promoCandidates.some(c => c.screen.symbol === cluster.symbol)) continue;
    if (cluster.articleCount >= 4) {
      // Minimal screen-like data from cluster
      const screenLike = {
        symbol: cluster.symbol, name: cluster.name, index: '?',
        price: 0, changePct: cluster.changePct ?? 0,
        volume: 0, avgVolume: 0, high52w: 0, low52w: 0,
        reason: ['news_cluster'] as string[],
      };
      promoCandidates.push({ screen: screenLike, promoScore: 2 + (cluster.articleCount >= 5 ? 1 : 0), cluster });
    }
  }

  // Take top 5, build FlaggedAssets
  promoCandidates.sort((a, b) => b.promoScore - a.promoScore);
  for (const { screen, cluster } of promoCandidates.slice(0, 5)) {
    const flags: MaterialityFlag[] = [];
    const absPct = Math.abs(screen.changePct);

    // Mouvement
    if (absPct > 2) flags.push('PRICE_MOVE');
    if (absPct > 5) flags.push('EXTREME_MOVE');
    if (screen.volume > 0 && screen.avgVolume > 0 && screen.volume / screen.avgVolume > 1.5)
      flags.push('VOLUME_SPIKE');

    // Structure (limited — no multiTF, no candles)
    if (screen.technicals?.rsi14 != null && (screen.technicals.rsi14 < 30 || screen.technicals.rsi14 > 70))
      flags.push('RSI_EXTREME');
    if (screen.high52w > 0 && screen.price >= screen.high52w * 0.95)
      flags.push('ATH_PROXIMITY');

    // Narratif
    const earning = (snapshot.earnings ?? []).find(e => e.symbol === screen.symbol);
    if (earning?.epsActual != null && earning?.epsEstimate != null && earning.epsEstimate !== 0) {
      if (Math.abs((earning.epsActual - earning.epsEstimate) / earning.epsEstimate) > 0.1)
        flags.push('EARNINGS_SURPRISE');
    }
    if (screen.earningsDetail?.publishingToday || earningsTodaySymbols.has(screen.symbol))
      flags.push('EARNINGS_TODAY');
    if (newsLinkedSymbols.has(screen.symbol)) flags.push('NEWS_LINKED');
    if ((newsCountBySymbol.get(screen.symbol) ?? 0) >= 3 || cluster)
      flags.push('NEWS_CLUSTER');

    // Compute score
    let score = 0;
    for (const flag of flags) score += FLAG_WEIGHT[flag] ?? 1;
    if (absPct > 2) score += (absPct - 2) * 0.5;

    // Build synthetic AssetSnapshot
    const syntheticAsset: AssetSnapshot = {
      symbol: screen.symbol,
      name: screen.name,
      price: screen.price,
      change: screen.price * screen.changePct / 100,
      changePct: screen.changePct,
      candles: [],
      high24h: 0,
      low24h: 0,
      technicals: screen.technicals,
    };

    flagged.push({
      symbol: screen.symbol,
      name: screen.name,
      price: screen.price,
      changePct: screen.changePct,
      materialityScore: Math.round(score * 10) / 10,
      flags,
      snapshot: syntheticAsset,
      promoted: true,
    });
  }

  if (promoCandidates.length > 0) {
    const promoted = flagged.filter(a => a.promoted);
    console.log(`  Promoted ${promoted.length} stocks: ${promoted.map(a => `${a.symbol}(${a.materialityScore})`).join(', ')}`);
  }

  // Sort by materiality score descending
  flagged.sort((a, b) => b.materialityScore - a.materialityScore);

  return {
    date: snapshot.date ?? new Date().toISOString().slice(0, 10),
    assets: flagged,
    events: snapshot.events ?? [],
    yesterdayEvents: snapshot.yesterdayEvents,
    upcomingEvents: snapshot.upcomingEvents,
    yields: snapshot.yields,
    sentiment: snapshot.sentiment,
    earnings: snapshot.stockScreen ?? [],
    themesDuJour: snapshot.themesDuJour,
    screenResults: snapshot.stockScreen ?? [],
    news: snapshot.news ?? [],
    newsClusters,
  };
}
