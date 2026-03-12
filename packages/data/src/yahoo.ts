import type { Candle, AssetSnapshot } from "@yt-maker/core";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Yahoo auth (crumb + cookie) for endpoints that require it ────────
interface YahooAuth { crumb: string; cookie: string; expiresAt: number }
let _yahooAuth: YahooAuth | null = null;

async function getYahooAuth(): Promise<YahooAuth | null> {
  if (_yahooAuth && Date.now() < _yahooAuth.expiresAt) return _yahooAuth;

  try {
    // Step 1: get session cookies from Yahoo Finance
    const pageRes = await fetch("https://finance.yahoo.com/", {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
    });
    // getSetCookie() returns all Set-Cookie headers as an array (Node 18+)
    const setCookieRaw: string[] = (pageRes.headers as any).getSetCookie?.() ?? [];
    const cookies = setCookieRaw.map((c: string) => c.split(";")[0].trim()).join("; ");

    // Step 2: get the crumb
    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": USER_AGENT, "Cookie": cookies },
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.length < 3 || crumb.includes("<")) return null;

    _yahooAuth = { crumb, cookie: cookies, expiresAt: Date.now() + 3_600_000 };
    return _yahooAuth;
  } catch {
    return null;
  }
}

// Default watchlist — 38 assets, multi-timeframe (Phase 2)
export const DEFAULT_ASSETS = [
  // Indices US (4)
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq Composite" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^VIX", name: "VIX" },
  // Indices EU (4)
  { symbol: "^FCHI", name: "CAC 40" },
  { symbol: "^GDAXI", name: "DAX 40" },
  { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^STOXX", name: "STOXX Europe 600" },
  // Indices Asie (4)
  { symbol: "^N225", name: "Nikkei 225" },
  { symbol: "000001.SS", name: "Shanghai Composite" },
  { symbol: "^HSI", name: "Hang Seng" },
  { symbol: "^KS11", name: "KOSPI" },
  // Chine Shenzhen (1, optionnel)
  { symbol: "399001.SZ", name: "Shenzhen Component" },
  // Forex — DXY + Top 10 pairs (11)
  { symbol: "DX-Y.NYB", name: "US Dollar Index" },
  { symbol: "EURUSD=X", name: "EUR/USD" },
  { symbol: "USDJPY=X", name: "USD/JPY" },
  { symbol: "GBPUSD=X", name: "GBP/USD" },
  { symbol: "USDCHF=X", name: "USD/CHF" },
  { symbol: "AUDUSD=X", name: "AUD/USD" },
  { symbol: "USDCAD=X", name: "USD/CAD" },
  { symbol: "NZDUSD=X", name: "NZD/USD" },
  { symbol: "EURGBP=X", name: "EUR/GBP" },
  { symbol: "EURJPY=X", name: "EUR/JPY" },
  { symbol: "GBPJPY=X", name: "GBP/JPY" },
  // Commodities (8)
  { symbol: "GC=F", name: "Gold (XAUUSD)" },
  { symbol: "SI=F", name: "Silver" },
  { symbol: "HG=F", name: "Copper" },
  { symbol: "CL=F", name: "Crude Oil WTI" },
  { symbol: "BZ=F", name: "Brent Crude" },
  { symbol: "NG=F", name: "Natural Gas" },
  { symbol: "ZW=F", name: "Wheat" },
  { symbol: "PL=F", name: "Platinum" },
  // Crypto (3)
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "SOL-USD", name: "Solana" },
  // Sector ETFs US (3)
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

  // Fix Yahoo volume unit mismatch: on some exchanges (Shanghai, Shenzhen, etc.)
  // the last candle (live/intraday) reports volume in raw units while historical
  // candles use lots (thousands). Detect and normalize.
  if (candles.length >= 5) {
    const last = candles[candles.length - 1];
    const prevVolumes = candles.slice(-21, -1).filter(c => c.v > 0).map(c => c.v);
    if (prevVolumes.length >= 3 && last.v > 0) {
      const sorted = [...prevVolumes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      // If last volume is >50x the median, it's a unit mismatch — scale it down
      if (median > 0 && last.v / median > 50) {
        const scaleFactor = Math.round(last.v / median);
        last.v = Math.round(last.v / scaleFactor);
      }
    }
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

  // Use previous session's last close as reference, not first hourly open
  // (avoids gap distortion over weekends for equities/indices)
  const todayStr = new Date().toISOString().split("T")[0];
  const prevSessionCandle = [...candles].reverse().find((c) => !c.date.startsWith(todayStr));
  const prevClose = prevSessionCandle?.c ?? first.o;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  // high24h/low24h on last 24 hourly candles only (not full 48h range)
  const last24h = candles.slice(-24);
  const high24h = Math.max(...last24h.map((c) => c.h));
  const low24h = Math.min(...last24h.map((c) => c.l));

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

/** Fetch weekly candles for 10 years (macro trend) */
export async function fetchWeeklyCandles(
  symbol: string,
): Promise<import("@yt-maker/core").Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=10y`;
  try {
    const json = await fetchYahoo(url);
    return parseCandles(json);
  } catch {
    return [];
  }
}

/** Fetch daily candles for 3 years (medium term) */
export async function fetchDaily3yCandles(
  symbol: string,
): Promise<import("@yt-maker/core").Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3y`;
  try {
    const json = await fetchYahoo(url);
    return parseCandles(json);
  } catch {
    return [];
  }
}

export async function fetchDailyMaxCandles(
  symbol: string,
): Promise<import("@yt-maker/core").Candle[]> {
  // Yahoo caps daily candles at ~10y; "max" may return monthly data
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10y`;
  try {
    const json = await fetchYahoo(url);
    return parseCandles(json);
  } catch {
    return [];
  }
}

/**
 * Fetch changePct for a list of symbols using the Yahoo Finance spark endpoint.
 * Max 20 symbols per call (free, no auth required).
 * Returns { symbol, changePct }[].
 */
export async function fetchSparkChanges(symbols: string[]): Promise<Array<{ symbol: string; changePct: number }>> {
  if (symbols.length === 0) return [];

  const BATCH = 20;
  const results: Array<{ symbol: string; changePct: number }> = [];

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const joined = batch.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${joined}&range=5d&interval=1d`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        console.warn(`  [spark] HTTP ${res.status} for batch ${Math.floor(i / BATCH) + 1}`);
        continue;
      }
      const json = await res.json();
      for (const item of json.spark?.result ?? []) {
        const closes: (number | null)[] = item.response?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const validCloses = closes.filter((c): c is number => c !== null && c > 0);
        if (validCloses.length >= 2) {
          const prev = validCloses[validCloses.length - 2];
          const last = validCloses[validCloses.length - 1];
          const changePct = ((last - prev) / prev) * 100;
          results.push({ symbol: item.symbol, changePct });
        } else if (validCloses.length === 1) {
          console.warn(`  [spark] ${item.symbol}: only 1 valid close, skipped`);
        }
      }
      // Small delay between batches to be respectful
      if (i + BATCH < symbols.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.warn(`  [spark] Batch ${Math.floor(i / BATCH) + 1} failed: ${err}`);
    }
  }

  return results;
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
  // Find the candle matching the target date.
  // Asian markets (UTC+8/+9) have candle timestamps at local midnight, which falls
  // on the previous UTC day (e.g. Shanghai Feb 17 = UTC Feb 16 16:00).
  // So we also try targetDate - 1 day as a fallback.
  const prevDay = (() => {
    const d = new Date(targetDate + "T12:00:00Z");
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  let targetIdx = dailyCandles.findIndex((c) => c.date.startsWith(targetDate));
  if (targetIdx < 0) {
    // Timezone fallback for Asian markets
    targetIdx = dailyCandles.findIndex((c) => c.date.startsWith(prevDay));
  }
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
