import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fetchEarningsCalendar } from "@yt-maker/data";

// Load all index constituents
const indicesDir = join(process.cwd(), "data", "indices");
const indexMap = new Map<string, string>();
for (const file of ["sp500.json", "cac40.json", "dax40.json", "ftse100.json", "nikkei50.json", "hsi30.json"]) {
  const p = join(indicesDir, file);
  if (!existsSync(p)) continue;
  const data: Array<{ symbol: string; name: string }> = JSON.parse(readFileSync(p, "utf-8"));
  const idx = file.replace(".json", "").toUpperCase();
  for (const e of data) {
    indexMap.set(e.symbol.toUpperCase(), `${idx}:${e.name}`);
  }
}
console.log(`Index constituents total: ${indexMap.size}`);

async function main() {
// Fetch raw upcoming earnings
const from = "2026-03-11";
const to = "2026-03-17";
console.log(`\nFetching earnings ${from} → ${to}...`);
const upcoming = await fetchEarningsCalendar(from, to);
console.log(`Raw upcoming: ${upcoming.length}`);

// Check overlap
const matched = upcoming.filter(e => indexMap.has(e.symbol.toUpperCase()));
console.log(`Matched to indices: ${matched.length}`);
for (const e of matched) {
  console.log(`  ${e.symbol.padEnd(10)} ${e.date} [${e.hour}] — ${indexMap.get(e.symbol.toUpperCase())}`);
}

// Show some unmatched to understand format
const unmatched = upcoming.filter(e => !indexMap.has(e.symbol.toUpperCase()));
console.log(`\nUnmatched sample (first 20):`);
for (const e of unmatched.slice(0, 20)) {
  console.log(`  ${e.symbol.padEnd(10)} ${e.date} [${e.hour}]`);
}

// Check by date distribution
const byDate: Record<string, number> = {};
for (const e of upcoming) {
  byDate[e.date] = (byDate[e.date] ?? 0) + 1;
}
console.log(`\nBy date:`);
for (const [d, n] of Object.entries(byDate).sort()) {
  console.log(`  ${d}: ${n} earnings`);
}
}
main().catch(err => { console.error(err); process.exit(1); });
