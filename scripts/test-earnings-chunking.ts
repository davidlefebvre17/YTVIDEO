import "dotenv/config";
import { fetchEarningsCalendar } from "../packages/data/src/finnhub";

async function main() {
  const events = await fetchEarningsCalendar("2026-04-25", "2026-05-15");
  console.log("Total events:", events.length);

  const bigTickers = ["MSFT", "GOOGL", "GOOG", "META", "AAPL", "AMZN", "QCOM", "NVDA", "AMD", "INTC"];
  const big = events.filter((e) => bigTickers.includes(e.symbol));
  console.log("Big tech matches:", big.length);
  for (const e of big) console.log(" ", e.date, "|", e.symbol, "| hour:", e.hour);

  const dates = [...new Set(events.map((e) => e.date))].sort();
  console.log("Date range:", dates[0], "→", dates[dates.length - 1]);
  console.log("First 7 dates:", dates.slice(0, 7));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
