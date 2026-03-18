import { readFileSync } from "fs";
const snap = JSON.parse(readFileSync("data/snapshot-2026-03-10.json", "utf-8"));

console.log("--- MACRO CONTEXT ---");
console.log(`Yields: 10Y=${snap.yields.us10y}% 2Y=${snap.yields.us2y}% spread=${snap.yields.spread10y2y}%`);
console.log(`Sentiment: F&G=${snap.sentiment.cryptoFearGreed.value} (${snap.sentiment.cryptoFearGreed.label}) BTC dom=${snap.sentiment.btcDominance.toFixed(1)}%`);

console.log("\n--- COT NOTABLE POSITIONS (report " + snap.cotPositioning.reportDate + ") ---");
for (const c of snap.cotPositioning.contracts) {
  const s = c.current?.signals;
  if (s?.bias && s.bias !== "neutral") {
    const flip = s.flipDetected ? " **FLIP**" : "";
    console.log(`  ${c.symbol.padEnd(12)} ${c.name.padEnd(22)} ${s.bias.padEnd(16)} netChg=${s.netChangeSpeculators ?? "?"}  weeks=${s.weeksInDirection ?? "?"}${flip}`);
  }
}

console.log("\n--- STOCK SCREEN TOP 15 ---");
const screen = [...snap.stockScreen].sort((a: any, b: any) => Math.abs(b.changePct) - Math.abs(a.changePct));
for (const s of screen.slice(0, 15)) {
  const sign = s.changePct >= 0 ? "+" : "";
  console.log(`  ${s.symbol.padEnd(10)} ${s.name.padEnd(30)} ${sign}${s.changePct.toFixed(2).padStart(7)}% [${s.index ?? "?"}] reason=[${(s.reason ?? []).join(", ")}]`);
}

console.log("\n--- EVENTS TODAY ---");
for (const e of snap.events) {
  console.log(`  ${(e.time ?? "?").padEnd(8)} ${e.name.padEnd(40)} impact=${e.impact}  ${e.actual ? `actual=${e.actual}` : `forecast=${e.forecast ?? "?"}`}`);
}

console.log("\n--- UPCOMING EVENTS (high impact, 7d) ---");
const highUpcoming = (snap.upcomingEvents ?? []).filter((e: any) => e.impact === "high");
for (const e of highUpcoming.slice(0, 15)) {
  console.log(`  ${e.date ?? "?"} ${(e.time ?? "?").padEnd(8)} ${e.name.padEnd(40)} (${e.currency})`);
}

console.log("\n--- EARNINGS TODAY (with actual) ---");
const reported = (snap.earnings ?? []).filter((e: any) => e.epsActual != null);
for (const e of reported.slice(0, 10)) {
  const surp = e.epsEstimate ? `${((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate) * 100).toFixed(0)}%` : "?";
  console.log(`  ${e.symbol.padEnd(8)} EPS=${e.epsActual} est=${e.epsEstimate ?? "?"} surprise=${surp} [${e.hour}]`);
}

console.log(`\n--- UPCOMING EARNINGS (7d): ${(snap.earningsUpcoming ?? []).length} ---`);
const byDate: Record<string, number> = {};
for (const e of snap.earningsUpcoming ?? []) {
  byDate[e.date] = (byDate[e.date] ?? 0) + 1;
}
for (const [d, n] of Object.entries(byDate).sort()) {
  console.log(`  ${d}: ${n} reports`);
}

console.log("\n--- POLYMARKET ---");
if (snap.polymarket) {
  for (const m of snap.polymarket) {
    const q = (m as any).question ?? (m as any).title ?? "?";
    console.log(`  ${q.slice(0, 90)}`);
  }
} else { console.log("  absent"); }

// News with/without summary
console.log("\n--- NEWS QUALITY ---");
const withSum = snap.news.filter((n: any) => n.summary && n.summary.length > 20).length;
console.log(`Total: ${snap.news.length} | with summary: ${withSum} | title-only: ${snap.news.length - withSum}`);

// Divergences: oil down but XLE not proportional
const oil = snap.assets.find((a: any) => a.symbol === "CL=F");
const xle = snap.assets.find((a: any) => a.symbol === "XLE");
console.log(`\n--- KEY DIVERGENCES ---`);
console.log(`Oil ${oil.changePct.toFixed(2)}% vs XLE ${xle.changePct.toFixed(2)}% — XLE only fell 1/10th of oil`);

const gold = snap.assets.find((a: any) => a.symbol === "GC=F");
const silver = snap.assets.find((a: any) => a.symbol === "SI=F");
console.log(`Gold ${gold.changePct.toFixed(2)}% vs Silver ${silver.changePct.toFixed(2)}% — Silver 2x gold (industrial demand)`);

const spx = snap.assets.find((a: any) => a.symbol === "^GSPC");
const cac = snap.assets.find((a: any) => a.symbol === "^FCHI");
const dax = snap.assets.find((a: any) => a.symbol === "^GDAXI");
console.log(`US flat (SPX ${spx.changePct.toFixed(2)}%) vs Europe rally (CAC ${cac.changePct.toFixed(2)}%, DAX ${dax.changePct.toFixed(2)}%)`);

const btc = snap.assets.find((a: any) => a.symbol === "BTC-USD");
console.log(`BTC ${btc.changePct.toFixed(2)}% in Extreme Fear (F&G=18) — contrarian signal?`);
console.log(`VIX dropping ${snap.assets.find((a: any) => a.symbol === "^VIX").changePct.toFixed(2)}% while markets mixed — fear subsiding`);
