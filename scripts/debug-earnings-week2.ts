import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fetchEarningsCalendar } from "@yt-maker/data";

const indicesDir = join(process.cwd(), "data", "indices");
const indexMap = new Map<string, string>();
for (const file of ["sp500.json", "cac40.json", "dax40.json", "ftse100.json", "nikkei50.json", "hsi30.json"]) {
  const p = join(indicesDir, file);
  if (!existsSync(p)) continue;
  const data: Array<{ symbol: string; name: string }> = JSON.parse(readFileSync(p, "utf-8"));
  for (const e of data) indexMap.set(e.symbol.toUpperCase(), e.name);
}

async function main() {
  // Test with a busy earnings week (late January / mid-April are typically peak)
  for (const [from, to] of [["2026-03-11", "2026-03-17"], ["2026-03-18", "2026-03-24"], ["2026-03-25", "2026-03-31"]]) {
    const earnings = await fetchEarningsCalendar(from, to);
    const matched = earnings.filter(e => indexMap.has(e.symbol.toUpperCase()));
    console.log(`${from}→${to}: ${earnings.length} total, ${matched.length} in indices`);
    for (const e of matched) {
      console.log(`  ${e.symbol.padEnd(8)} ${(indexMap.get(e.symbol.toUpperCase()) ?? '').padEnd(25)} ${e.date} [${e.hour}]`);
    }
  }
}
main().catch(console.error);
