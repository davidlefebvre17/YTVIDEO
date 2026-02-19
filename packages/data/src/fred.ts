import type { BondYields } from "@yt-maker/core";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchSeries(seriesId: string, apiKey: string): Promise<number | null> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const data = await res.json();
  // Skip entries with value "." (missing data on weekends/holidays)
  const obs = data.observations?.find((o: { value: string }) => o.value !== ".");
  return obs ? parseFloat(obs.value) : null;
}

export async function fetchBondYields(): Promise<BondYields | undefined> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.log("  FRED: skipped (no FRED_API_KEY)");
    return undefined;
  }

  console.log("  Fetching bond yields from FRED...");
  try {
    const [us10y, us2y, spread] = await Promise.all([
      fetchSeries("DGS10", apiKey),
      fetchSeries("DGS2", apiKey),
      fetchSeries("T10Y2Y", apiKey),
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
