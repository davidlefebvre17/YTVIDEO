import type { BondYields } from "@yt-maker/core";

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
