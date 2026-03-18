/**
 * Patch an incomplete snapshot by re-fetching only missing data.
 * Usage: npx tsx scripts/patch-snapshot.ts
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const path = join(process.cwd(), "data", "snapshot-2026-03-10.json");
const snap = JSON.parse(readFileSync(path, "utf-8"));

console.log("Current snapshot state:");
console.log(`  events: ${snap.events?.length ?? 0}`);
console.log(`  yesterdayEvents: ${snap.yesterdayEvents?.length ?? 0}`);
console.log(`  upcomingEvents: ${snap.upcomingEvents?.length ?? 0}`);
console.log(`  yields: ${snap.yields ? "OK" : "MISSING"}`);
console.log(`  sentiment: ${snap.sentiment ? "OK" : "MISSING"}`);
console.log(`  earnings: ${snap.earnings?.length ?? 0}`);
console.log(`  polymarket: ${snap.polymarket?.length ?? 0}`);
console.log(`  news: ${snap.news?.length ?? 0}`);

async function patch() {
  const date = "2026-03-10";
  let patched = 0;

  // 1. Calendar (Supabase + Finnhub fallback)
  if (!snap.events?.length) {
    console.log("\n--- Patching calendar ---");
    try {
      const { fetchEconomicCalendar } = await import("@yt-maker/data");
      await new Promise(r => setTimeout(r, 2000));
      const cal = await fetchEconomicCalendar(date);
      if (cal.today?.length || cal.yesterday?.length) {
        // Dedup
        const dedup = (events: any[]) => {
          const seen = new Set<string>();
          return events.filter((e: any) => {
            const key = `${e.name}|${e.currency}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };
        snap.events = dedup(cal.today);
        snap.yesterdayEvents = dedup(cal.yesterday ?? []);
        snap.upcomingEvents = cal.upcoming ?? [];
        console.log(`  ✓ events=${snap.events.length} yesterday=${snap.yesterdayEvents.length} upcoming=${snap.upcomingEvents.length}`);
        patched++;
      }
    } catch (err) {
      console.log(`  ✗ Calendar failed: ${err}`);
    }
  }

  // 2. Yields (FRED)
  if (!snap.yields) {
    console.log("\n--- Patching yields ---");
    try {
      const { fetchBondYields } = await import("@yt-maker/data");
      await new Promise(r => setTimeout(r, 2000));
      const yields = await fetchBondYields(date);
      if (yields) {
        snap.yields = yields;
        console.log(`  ✓ 10Y=${yields.us10y}% 2Y=${yields.us2y}%`);
        patched++;
      }
    } catch (err) {
      console.log(`  ✗ Yields failed: ${err}`);
    }
  }

  // 3. Sentiment
  if (!snap.sentiment) {
    console.log("\n--- Patching sentiment ---");
    try {
      const { fetchMarketSentiment } = await import("@yt-maker/data");
      await new Promise(r => setTimeout(r, 2000));
      const sentiment = await fetchMarketSentiment(date);
      if (sentiment) {
        snap.sentiment = sentiment;
        console.log(`  ✓ F&G=${sentiment.cryptoFearGreed.value} BTC dom=${sentiment.btcDominance.toFixed(1)}%`);
        patched++;
      }
    } catch (err) {
      console.log(`  ✗ Sentiment failed: ${err}`);
    }
  }

  // 4. Earnings today
  if (!snap.earnings?.length) {
    console.log("\n--- Patching earnings ---");
    try {
      const { fetchEarningsCalendar } = await import("@yt-maker/data");
      await new Promise(r => setTimeout(r, 3000));
      const earnings = await fetchEarningsCalendar(date);
      if (earnings.length) {
        snap.earnings = earnings;
        console.log(`  ✓ ${earnings.length} earnings`);
        patched++;
      }
    } catch (err) {
      console.log(`  ✗ Earnings failed: ${err}`);
    }
  }

  // 5. Re-fetch upcoming earnings (already filtered in snapshot, need raw data for new index)
  console.log("\n--- Re-fetching upcoming earnings ---");
  try {
    const { fetchEarningsCalendar } = await import("@yt-maker/data");
    await new Promise(r => setTimeout(r, 2000));
    const futureDate = new Date("2026-03-10T12:00:00Z");
    futureDate.setDate(futureDate.getDate() + 7);
    const nextDay = new Date("2026-03-10T12:00:00Z");
    nextDay.setDate(nextDay.getDate() + 1);
    const rawUpcoming = await fetchEarningsCalendar(
      nextDay.toISOString().split("T")[0],
      futureDate.toISOString().split("T")[0],
    );
    if (rawUpcoming.length > 0) {
      snap.earningsUpcoming = rawUpcoming; // will be filtered below
      console.log(`  ✓ ${rawUpcoming.length} raw upcoming earnings`);
      patched++;
    }
  } catch (err) {
    console.log(`  ✗ Upcoming earnings failed: ${err}`);
  }

  // 6. Enrich earnings names + filter upcoming by index
  console.log("\n--- Enriching earnings ---");
  const indicesDir = join(process.cwd(), "data", "indices");
  const indexMap = new Map<string, string>();
  for (const file of ["sp500.json", "cac40.json", "dax40.json", "ftse100.json", "nikkei50.json", "hsi30.json"]) {
    const p = join(indicesDir, file);
    if (!existsSync(p)) continue;
    const data: Array<{ symbol: string; name: string }> = JSON.parse(readFileSync(p, "utf-8"));
    for (const e of data) indexMap.set(e.symbol.toUpperCase(), e.name);
  }
  console.log(`  Index constituents: ${indexMap.size}`);

  // Enrich names on today earnings
  if (snap.earnings?.length) {
    let named = 0;
    for (const e of snap.earnings) {
      const name = indexMap.get(e.symbol?.toUpperCase());
      if (name) { e.name = name; named++; }
    }
    console.log(`  Earnings today: ${named}/${snap.earnings.length} named`);
    patched++;
  }

  // Re-filter upcoming earnings with updated index data
  if (snap.earningsUpcoming?.length) {
    const before = snap.earningsUpcoming.length;
    snap.earningsUpcoming = snap.earningsUpcoming.filter((e: any) => indexMap.has(e.symbol?.toUpperCase()));
    for (const e of snap.earningsUpcoming) {
      const name = indexMap.get(e.symbol?.toUpperCase());
      if (name) e.name = name;
    }
    console.log(`  Upcoming: ${before} → ${snap.earningsUpcoming.length} (index filter)`);
    patched++;
  }

  if (patched > 0) {
    writeFileSync(path, JSON.stringify(snap, null, 2));
    console.log(`\n✓ Patched ${patched} sections, saved.`);
  } else {
    console.log("\n✗ Nothing patched (APIs still down). Try again later.");
  }
}

patch().catch(err => { console.error(err); process.exit(1); });
