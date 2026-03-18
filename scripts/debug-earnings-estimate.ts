import "dotenv/config";
import { fetchEarningsCalendar } from "@yt-maker/data";

async function main() {
  const upcoming = await fetchEarningsCalendar("2026-03-11", "2026-03-17");
  const withEstimate = upcoming.filter(e => e.epsEstimate != null);
  console.log(`With EPS estimate: ${withEstimate.length}/${upcoming.length}`);
  for (const e of withEstimate.slice(0, 30)) {
    console.log(`  ${e.symbol.padEnd(10)} est=${e.epsEstimate?.toFixed(2).padStart(7)}  ${e.date} [${e.hour}]`);
  }
}
main().catch(console.error);
