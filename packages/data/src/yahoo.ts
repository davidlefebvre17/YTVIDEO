import type { Candle, AssetSnapshot } from "@yt-maker/core";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

// Default watchlist
export const DEFAULT_ASSETS = [
  // Indices
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq Composite" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^GDAXI", name: "DAX" },
  { symbol: "^FCHI", name: "CAC 40" },
  { symbol: "^N225", name: "Nikkei 225" },
  { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^STOXX", name: "STOXX Europe 600" },
  { symbol: "^VIX", name: "VIX" },
  // Forex
  { symbol: "EURUSD=X", name: "EUR/USD" },
  { symbol: "USDJPY=X", name: "USD/JPY" },
  { symbol: "GBPUSD=X", name: "GBP/USD" },
  { symbol: "DX-Y.NYB", name: "US Dollar Index" },
  // Commodities
  { symbol: "GC=F", name: "Gold (XAUUSD)" },
  { symbol: "SI=F", name: "Silver" },
  { symbol: "CL=F", name: "Crude Oil" },
  // Crypto
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  // Sector ETFs
  { symbol: "XLK", name: "Tech ETF" },
  { symbol: "XLF", name: "Financials ETF" },
  { symbol: "XLE", name: "Energy ETF" },
];

async function fetchYahoo(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  const json = await res.json();
  if (json.chart?.error) {
    throw new Error(`Yahoo Finance error: ${json.chart.error.description}`);
  }
  return json;
}

function parseCandles(json: any): Candle[] {
  const result = json.chart.result[0];
  const { timestamp, indicators } = result;
  const q = indicators.quote[0];
  const candles: Candle[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    if (q.open[i] === null) continue;
    candles.push({
      t: timestamp[i],
      date: new Date(timestamp[i] * 1000).toISOString(),
      o: q.open[i],
      h: q.high[i],
      l: q.low[i],
      c: q.close[i],
      v: q.volume[i] || 0,
    });
  }
  return candles;
}

export async function fetchAssetSnapshot(
  symbol: string,
  name: string,
): Promise<AssetSnapshot> {
  // Fetch 1h candles for last 2 days (sparkline)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=2d`;
  console.log(`  Fetching ${name} (${symbol})...`);

  const json = await fetchYahoo(url);
  const candles = parseCandles(json);

  if (candles.length === 0) {
    throw new Error(`No data for ${symbol}`);
  }

  const latest = candles[candles.length - 1];
  const first = candles[0];
  const price = latest.c;
  const change = price - first.o;
  const changePct = (change / first.o) * 100;
  const high24h = Math.max(...candles.map((c) => c.h));
  const low24h = Math.min(...candles.map((c) => c.l));

  return {
    symbol,
    name,
    price,
    change,
    changePct,
    candles,
    high24h,
    low24h,
  };
}

export async function fetchDailyCandles(
  symbol: string,
): Promise<import("@yt-maker/core").Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
  try {
    const json = await fetchYahoo(url);
    return parseCandles(json);
  } catch {
    return [];
  }
}

/**
 * Build an AssetSnapshot from daily candles for a specific historical date.
 * Uses the candle of that day for price/change, and the previous candle for reference.
 */
export function buildSnapshotFromCandles(
  symbol: string,
  name: string,
  dailyCandles: Candle[],
  targetDate: string,
): AssetSnapshot | null {
  // Find the candle matching the target date
  const targetIdx = dailyCandles.findIndex((c) =>
    c.date.startsWith(targetDate),
  );
  if (targetIdx < 0) return null;

  const candle = dailyCandles[targetIdx];
  const prevCandle = targetIdx > 0 ? dailyCandles[targetIdx - 1] : null;

  const price = candle.c;
  const prevClose = prevCandle ? prevCandle.c : candle.o;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  return {
    symbol,
    name,
    price,
    change,
    changePct,
    candles: [], // hourly candles not available for historical dates
    high24h: candle.h,
    low24h: candle.l,
  };
}

export async function fetchAllAssets(
  assets = DEFAULT_ASSETS,
  targetDate?: string,
): Promise<AssetSnapshot[]> {
  const isHistorical = targetDate && targetDate < new Date().toISOString().split("T")[0];
  console.log(`Fetching ${assets.length} assets${isHistorical ? ` (historical: ${targetDate})` : ""}...`);
  const results: AssetSnapshot[] = [];

  for (const asset of assets) {
    try {
      if (isHistorical) {
        // Historical mode: use daily candles to reconstruct the snapshot
        const dailyCandles = await fetchDailyCandles(asset.symbol);
        const snapshot = buildSnapshotFromCandles(asset.symbol, asset.name, dailyCandles, targetDate);
        if (snapshot) {
          console.log(`  ${asset.name}: ${snapshot.price.toFixed(2)} (${snapshot.changePct >= 0 ? "+" : ""}${snapshot.changePct.toFixed(2)}%) [historical]`);
          results.push(snapshot);
        } else {
          console.warn(`  ${asset.name}: no candle found for ${targetDate}`);
        }
      } else {
        const snapshot = await fetchAssetSnapshot(asset.symbol, asset.name);
        results.push(snapshot);
      }
    } catch (err) {
      console.warn(`  Failed to fetch ${asset.name}: ${err}`);
    }
  }

  console.log(`Got ${results.length}/${assets.length} assets`);
  return results;
}
