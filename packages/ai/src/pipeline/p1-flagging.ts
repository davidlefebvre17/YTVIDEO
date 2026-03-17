import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot, AssetSnapshot, EconomicEvent } from "@yt-maker/core";
import { loadMemory } from "@yt-maker/data";
import type { SnapshotFlagged, FlaggedAsset, MaterialityFlag, NewsCluster } from "./types";

// ── News alias map for NEWS_LINKED matching ──
// Key = asset symbol, Value = additional search terms in news titles
const NEWS_ALIASES: Record<string, string[]> = {
  'CL=F':     ['oil', 'pétrole', 'petrole', 'crude', 'wti', 'brent', 'opec', 'opep'],
  'BZ=F':     ['oil', 'pétrole', 'petrole', 'crude', 'brent', 'opec', 'opep'],
  'GC=F':     ['gold', "l'or ", ' or ', "d'or", 'gold price'],
  'SI=F':     ['silver', 'argent métal', "l'argent"],
  'NG=F':     ['natural gas', 'gaz naturel'],
  'HG=F':     ['copper', 'cuivre'],
  'PL=F':     ['platinum', 'platine'],
  'ZW=F':     ['wheat', 'blé'],
  '^GSPC':    ['s&p 500', 's&p500', 'sp500', 'wall street'],
  '^DJI':     ['dow jones', 'dow '],
  '^IXIC':    ['nasdaq'],
  '^FCHI':    ['cac 40', 'cac40', 'bourse de paris'],
  '^GDAXI':   ['dax'],
  '^FTSE':    ['ftse', 'bourse de londres'],
  '^STOXX':   ['stoxx', 'marchés européens', 'bourses européennes'],
  '^N225':    ['nikkei', 'bourse de tokyo'],
  '^HSI':     ['hang seng', 'bourse de hong kong'],
  '^KS11':    ['kospi', 'bourse de séoul'],
  '000001.SS': ['shanghai'],
  '399001.SZ': ['shenzhen'],
  'DX-Y.NYB': ['dollar index', 'indice dollar', 'dxy', 'billet vert', 'greenback'],
  'EURUSD=X': ['eur/usd', 'euro dollar', 'eurusd'],
  'USDJPY=X': ['usd/jpy', 'dollar yen', 'usdjpy'],
  'GBPUSD=X': ['gbp/usd', 'livre sterling', 'gbpusd'],
  'BTC-USD':  ['bitcoin', 'btc'],
  'ETH-USD':  ['ethereum', 'ether', 'eth '],
  'SOL-USD':  ['solana'],
  '^VIX':     ['vix', 'volatilité', 'fear index'],
  'XLE':      ['energy sector', 'secteur énergie', 'energy etf'],
  'XLF':      ['financial sector', 'secteur financier', 'bank etf'],
  'XLK':      ['tech sector', 'secteur tech'],
};

// ── Flag weights for materiality score ──
const FLAG_WEIGHT: Record<MaterialityFlag, number> = {
  'PRICE_MOVE':       1,
  'EXTREME_MOVE':     3,   // >5% move — very significant
  'VOLUME_SPIKE':     1.5,
  'EMA_BREAK':        1,
  'RSI_EXTREME':      1,
  'EARNINGS_SURPRISE': 2,
  'SENTIMENT_EXTREME': 0.5,  // applies to all crypto, less discriminating
  'NEWS_LINKED':      1,
  'ZONE_EVENT':       1.5,
  'ATH_PROXIMITY':    1,
  'SMA200_CROSS':     2,
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

export function flagAssets(snapshot: DailySnapshot): SnapshotFlagged {
  const flagged: FlaggedAsset[] = [];

  for (const asset of snapshot.assets) {
    const flags: MaterialityFlag[] = [];
    const absPct = Math.abs(asset.changePct);

    // PRICE_MOVE: variation >±2%
    if (absPct > 2) flags.push('PRICE_MOVE');

    // EXTREME_MOVE: variation >±5% — exceptional day
    if (absPct > 5) flags.push('EXTREME_MOVE');

    // VOLUME_SPIKE: volume >150% of 20d avg
    // Guard: indices (^symbols) have unreliable volume from Yahoo → skip
    // Guard: volumeAnomaly > 10 is likely a unit mismatch (e.g. Shanghai lots vs shares) → skip
    if (asset.technicals
        && asset.technicals.volumeAnomaly > 1.5
        && asset.technicals.volumeAnomaly <= 10
        && !asset.symbol.startsWith('^'))
      flags.push('VOLUME_SPIKE');

    // EMA_BREAK: price crosses EMA9 or EMA21
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

    // RSI_EXTREME: RSI <30 or >70 (relaxed from 25/75)
    if (asset.technicals?.rsi14 !== undefined &&
        (asset.technicals.rsi14 < 30 || asset.technicals.rsi14 > 70))
      flags.push('RSI_EXTREME');

    // EARNINGS_SURPRISE: beat/miss >10%
    if (snapshot.earnings) {
      const earning = snapshot.earnings.find(e => e.symbol === asset.symbol);
      if (earning?.epsActual !== undefined && earning?.epsEstimate !== undefined && earning.epsEstimate !== 0) {
        if (Math.abs((earning.epsActual - earning.epsEstimate) / earning.epsEstimate) > 0.1)
          flags.push('EARNINGS_SURPRISE');
      }
    }

    // SENTIMENT_EXTREME: Fear&Greed <20 or >80
    // Only applies to assets directly impacted by crypto sentiment (crypto, VIX, indices)
    // Not applied to all 38 assets — otherwise it dilutes every score equally
    const SENTIMENT_ASSETS = new Set([
      'BTC-USD', 'ETH-USD', 'SOL-USD', '^VIX',
      '^GSPC', '^DJI', '^IXIC', '^FCHI', '^GDAXI', '^FTSE', '^STOXX', '^N225', '^HSI', '^KS11',
    ]);
    if (snapshot.sentiment && SENTIMENT_ASSETS.has(asset.symbol)) {
      const fgValue = snapshot.sentiment.cryptoFearGreed.value;
      if (fgValue < 20 || fgValue > 80)
        flags.push('SENTIMENT_EXTREME');
    }

    // NEWS_LINKED: news title contains symbol, name, OR known aliases
    if (snapshot.news?.length) {
      const symbolUp = asset.symbol.toUpperCase();
      const nameUp = asset.name.toUpperCase();
      const aliases = (NEWS_ALIASES[asset.symbol] ?? []).map(a => a.toUpperCase());
      const hasNews = snapshot.news.some(n => {
        const titleUp = n.title.toUpperCase();
        if (titleUp.includes(symbolUp) || titleUp.includes(nameUp)) return true;
        return aliases.some(alias => titleUp.includes(alias));
      });
      if (hasNews) flags.push('NEWS_LINKED');
    }

    // ZONE_EVENT: D3 MarketMemory zone event today
    try {
      const memory = loadMemory(asset.symbol);
      if (memory?.last_events?.some(e => e.date === snapshot.date))
        flags.push('ZONE_EVENT');
    } catch {
      // MarketMemory not available for this asset — skip
    }

    // ATH_PROXIMITY: <5% from ATH (multiTF weekly10y)
    if (asset.multiTF?.weekly10y?.distanceFromATH !== undefined) {
      if (Math.abs(asset.multiTF.weekly10y.distanceFromATH) < 5)
        flags.push('ATH_PROXIMITY');
    }

    // SMA200_CROSS: price crosses SMA200 today
    if (asset.multiTF?.daily3y?.sma200) {
      const prevClose = getPrevClose(asset);
      const sma200 = asset.multiTF.daily3y.sma200;
      if (prevClose !== undefined) {
        const crossUp = prevClose < sma200 && asset.price >= sma200;
        const crossDown = prevClose > sma200 && asset.price <= sma200;
        if (crossUp || crossDown) flags.push('SMA200_CROSS');
      }
    }

    // ── Compute weighted materiality score ──
    let score = 0;
    for (const flag of flags) {
      score += FLAG_WEIGHT[flag] ?? 1;
    }
    // Amplitude bonus: continuous boost proportional to move size
    // +0.5 per % above 2%, so -12% → +5.0 bonus, +6% → +2.0 bonus
    if (absPct > 2) {
      score += (absPct - 2) * 0.5;
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

  // Sort by materiality score descending
  flagged.sort((a, b) => b.materialityScore - a.materialityScore);

  // Detect news clusters on stocks outside watchlist
  const newsClusters = detectNewsClusters(snapshot);

  return {
    date: snapshot.date ?? new Date().toISOString().slice(0, 10),
    assets: flagged,
    events: snapshot.events ?? [],
    yields: snapshot.yields,
    sentiment: snapshot.sentiment,
    earnings: snapshot.stockScreen ?? [],
    themesDuJour: snapshot.themesDuJour,
    screenResults: snapshot.stockScreen ?? [],
    news: snapshot.news ?? [],
    newsClusters,
  };
}
