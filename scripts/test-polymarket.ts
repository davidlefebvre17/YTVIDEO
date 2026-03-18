import { fetchPolymarketData } from "@yt-maker/data";
import { readFileSync } from "fs";

async function main() {
  const snap = JSON.parse(readFileSync("data/snapshot-2026-03-10.json", "utf-8"));
  const allEvents = [...(snap.events || []), ...(snap.yesterdayEvents || []), ...(snap.upcomingEvents || [])];

  const markets = await fetchPolymarketData(allEvents);
console.log("\n--- POLYMARKET RESULTS ---");
for (const m of markets) {
  console.log(`  [${m.category}] ${m.question.slice(0, 100)} | vol24h=${m.volume24h.toFixed(0)}`);
  for (const [outcome, prob] of Object.entries(m.probabilities)) {
    console.log(`    ${outcome}: ${prob}%`);
  }
}
  console.log(`\nTotal: ${markets.length} markets`);
}

main().catch(err => { console.error(err); process.exit(1); });
