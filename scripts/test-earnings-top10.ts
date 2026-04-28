import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { fetchEarningsCalendar } from "../packages/data/src/finnhub";

function loadConstituents(): Set<string> {
  const set = new Set<string>();
  const dir = join(process.cwd(), "data", "indices");
  for (const f of ["sp500.json", "cac40.json", "dax40.json", "ftse100.json", "nikkei50.json", "hsi30.json"]) {
    try {
      const arr: Array<{ symbol: string }> = JSON.parse(readFileSync(join(dir, f), "utf-8"));
      for (const e of arr) set.add(e.symbol.toUpperCase());
    } catch {}
  }
  return set;
}

async function main() {
  const events = await fetchEarningsCalendar("2026-04-25", "2026-05-15");

  // Apply same indexConstituents filter as market-snapshot.ts
  const constituents = loadConstituents();
  const filtered = events.filter((e) => constituents.has(e.symbol.toUpperCase()));
  console.log(`\nRaw: ${events.length}  →  Index-filtered: ${filtered.length}`);

  // Then split by watchlist (snapshot.assets) — this is what briefing-pack does
  const snap = JSON.parse(readFileSync("episodes/2026/04-25/snapshot.json", "utf-8"));
  const watchlist = new Set<string>(
    (snap.assets ?? []).map((a: { symbol: string }) => a.symbol.toUpperCase()),
  );
  console.log(`Watchlist (snapshot.assets): ${watchlist.size} symbols`);

  const upcomingWatchlist = filtered
    .filter((e) => watchlist.has(e.symbol.toUpperCase()))
    .slice(0, 12);
  const upcomingOther = filtered
    .filter((e) => !watchlist.has(e.symbol.toUpperCase()))
    .slice(0, 12);

  console.log(`\n=== Pool 1: WATCHLIST (priority) — ${upcomingWatchlist.length} entries ===`);
  upcomingWatchlist.forEach((e) =>
    console.log(`  ${e.date} | ${e.symbol.padEnd(6)} | ${e.hour}`),
  );

  console.log(`\n=== Pool 2: OTHER NOTABLES — ${upcomingOther.length} entries ===`);
  upcomingOther.forEach((e) =>
    console.log(`  ${e.date} | ${e.symbol.padEnd(6)} | ${e.hour}`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
