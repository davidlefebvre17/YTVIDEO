import * as fs from "fs";

const ep10 = JSON.parse(fs.readFileSync("episodes/2026/03-10.json", "utf-8"));
const ep12 = JSON.parse(fs.readFileSync("episodes/2026/03-12.json", "utf-8"));

for (const [label, ep] of [["03-10", ep10], ["03-12", ep12]] as const) {
  console.log(`\n=== Episode ${label}: "${ep.script.title}" ===\n`);
  for (const sec of ep.script.sections) {
    if (!sec.narration || sec.narration.length < 10) continue;
    const n = sec.narration.toLowerCase();
    if (n.includes("52") || n.includes("plus haut") || n.includes("record") || n.includes("sommet") || n.includes("ath") || n.includes("plus bas") || n.includes("high") || n.includes("7 mois") || n.includes("mois")) {
      console.log(`  [${sec.id}] (${sec.type}, ${sec.depth ?? "-"}):`);
      console.log(`    ${sec.narration.slice(0, 300)}`);
      console.log();
    }
  }
}

// Also check prices for key assets
console.log("\n=== Prix pétrole (CL=F) dans les snapshots ===");
for (const [label, ep] of [["03-10", ep10], ["03-12", ep12]] as const) {
  const cl = ep.snapshot.assets.find((a: any) => a.symbol === "CL=F");
  if (cl) {
    console.log(`  ${label}: close=${cl.price} | change=${cl.changePct.toFixed(2)}% | high24h=${cl.high24h} | low24h=${cl.low24h}`);
    if (cl.multiTF) {
      console.log(`    high52w=${cl.multiTF.daily1y.high52w} | low52w=${cl.multiTF.daily1y.low52w} | ATH_dist=${cl.multiTF.weekly10y.distanceFromATH.toFixed(1)}%`);
    }
  }
}

// Check gold, silver too
for (const sym of ["GC=F", "SI=F", "BTC-USD"]) {
  console.log(`\n=== ${sym} ===`);
  for (const [label, ep] of [["03-10", ep10], ["03-12", ep12]] as const) {
    const a = ep.snapshot.assets.find((x: any) => x.symbol === sym);
    if (a) {
      console.log(`  ${label}: close=${a.price.toFixed(2)} | change=${a.changePct.toFixed(2)}% | high24h=${a.high24h?.toFixed(2)} | low24h=${a.low24h?.toFixed(2)}`);
      if (a.multiTF) {
        console.log(`    high52w=${a.multiTF.daily1y.high52w.toFixed(2)} | low52w=${a.multiTF.daily1y.low52w.toFixed(2)} | ATH_dist=${a.multiTF.weekly10y.distanceFromATH.toFixed(1)}%`);
      }
    }
  }
}
