import type { BondYields, Candle } from "@yt-maker/core";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchSeries(seriesId: string, apiKey: string, targetDate?: string): Promise<number | null> {
  // For historical dates, set a 7-day window ending on targetDate to handle weekends/holidays
  // FRED skips non-trading days (value="."), so we fetch the nearest prior value
  const dateParams = targetDate
    ? `&observation_start=${prevWeekday(targetDate, 7)}&observation_end=${targetDate}&sort_order=desc&limit=10`
    : `&sort_order=desc&limit=10`;
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json${dateParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const data = await res.json();
  // Skip entries with value "." (missing data on weekends/holidays)
  const obs = data.observations?.find((o: { value: string }) => o.value !== ".");
  return obs ? parseFloat(obs.value) : null;
}

/** Returns a date string N calendar days before the given date (to cover weekends/holidays). */
function prevWeekday(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

/**
 * Fetch historical FRED timeseries as Candle[] (o=h=l=c=value, v=0).
 * Returns up to `limit` observations sorted ascending by date.
 */
async function fetchSeriesTimeseries(
  seriesId: string,
  apiKey: string,
  startDate?: string,
  endDate?: string,
  limit = 750,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    limit: String(limit),
    sort_order: 'asc',
  });
  if (startDate) params.append('observation_start', startDate);
  if (endDate) params.append('observation_end', endDate);

  const url = `${FRED_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED timeseries ${seriesId}: ${res.status}`);

  const data = await res.json();
  const candles: Candle[] = [];

  for (const obs of data.observations ?? []) {
    if (obs.value === '.') continue;
    const val = parseFloat(obs.value);
    if (isNaN(val)) continue;
    const dateObj = new Date(obs.date + 'T12:00:00Z');
    candles.push({
      t: Math.floor(dateObj.getTime() / 1000),
      date: obs.date,
      o: val, h: val, l: val, c: val,
      v: 0,
    });
  }

  return candles;
}

/**
 * Fetch historical yield curves as Candle arrays (for SpreadChart rendering).
 * Returns last ~2 years of daily data for 10Y, 2Y, and the spread.
 */
export async function fetchYieldsHistory(targetDate?: string): Promise<{
  us10y: Candle[];
  us2y: Candle[];
  spread10y2y: Candle[];
} | undefined> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return undefined;

  const endDate = targetDate ?? new Date().toISOString().split('T')[0];
  const startObj = new Date(endDate + 'T12:00:00Z');
  startObj.setFullYear(startObj.getFullYear() - 2);
  const startDate = startObj.toISOString().split('T')[0];

  console.log(`  FRED: fetching yield history ${startDate} → ${endDate}...`);
  try {
    const [us10y, us2y, spread] = await Promise.all([
      fetchSeriesTimeseries('DGS10', apiKey, startDate, endDate),
      fetchSeriesTimeseries('DGS2', apiKey, startDate, endDate),
      fetchSeriesTimeseries('T10Y2Y', apiKey, startDate, endDate),
    ]);
    console.log(`  FRED: 10Y=${us10y.length} pts, 2Y=${us2y.length} pts, spread=${spread.length} pts`);
    return { us10y, us2y, spread10y2y: spread };
  } catch (err) {
    console.warn(`  FRED yield history error: ${err}`);
    return undefined;
  }
}

export async function fetchBondYields(targetDate?: string): Promise<BondYields | undefined> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.log("  FRED: skipped (no FRED_API_KEY)");
    return undefined;
  }

  console.log("  Fetching bond yields from FRED...");
  try {
    const [us10y, us2y, spread] = await Promise.all([
      fetchSeries("DGS10", apiKey, targetDate),
      fetchSeries("DGS2", apiKey, targetDate),
      fetchSeries("T10Y2Y", apiKey, targetDate),
    ]);

    if (us10y === null || us2y === null) {
      console.warn("  FRED: missing yield data");
      return undefined;
    }

    const result: BondYields = {
      us10y,
      us2y,
      spread10y2y: spread ?? +(us10y - us2y).toFixed(2),
    };
    console.log(`  FRED: 10Y=${result.us10y}% 2Y=${result.us2y}% spread=${result.spread10y2y}%`);
    return result;
  } catch (err) {
    console.warn(`  FRED error: ${err}`);
    return undefined;
  }
}
