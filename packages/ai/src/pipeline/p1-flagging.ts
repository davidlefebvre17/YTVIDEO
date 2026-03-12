import type { DailySnapshot, AssetSnapshot, EconomicEvent } from "@yt-maker/core";
import { loadMemory } from "@yt-maker/data";
import type { SnapshotFlagged, FlaggedAsset, MaterialityFlag } from "./types";

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
  };
}
