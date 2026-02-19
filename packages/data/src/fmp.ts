import type { TopMovers } from "@yt-maker/core";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

export async function fetchTopMovers(): Promise<TopMovers | undefined> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.log("  FMP: skipped (no FMP_API_KEY)");
    return undefined;
  }

  console.log("  Fetching top movers from FMP...");
  try {
    const [gainersRes, losersRes] = await Promise.all([
      fetch(`${FMP_BASE}/stock_market/gainers?apikey=${apiKey}`),
      fetch(`${FMP_BASE}/stock_market/losers?apikey=${apiKey}`),
    ]);

    if (!gainersRes.ok || !losersRes.ok) {
      throw new Error(`FMP: gainers=${gainersRes.status} losers=${losersRes.status}`);
    }

    const gainersData = await gainersRes.json();
    const losersData = await losersRes.json();

    const mapMover = (m: { symbol: string; name: string; changesPercentage: number; price: number }) => ({
      symbol: m.symbol,
      name: m.name,
      changePct: m.changesPercentage,
      price: m.price,
    });

    const result: TopMovers = {
      gainers: (gainersData || []).slice(0, 5).map(mapMover),
      losers: (losersData || []).slice(0, 5).map(mapMover),
    };

    console.log(`  FMP: ${result.gainers.length} gainers, ${result.losers.length} losers`);
    return result;
  } catch (err) {
    console.warn(`  FMP error: ${err}`);
    return undefined;
  }
}
