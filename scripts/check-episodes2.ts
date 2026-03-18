import * as fs from "fs";

const ep10 = JSON.parse(fs.readFileSync("episodes/2026/03-10.json", "utf-8"));
const ep12 = JSON.parse(fs.readFileSync("episodes/2026/03-12.json", "utf-8"));

// Full narrations
for (const [label, ep] of [["03-10", ep10], ["03-12", ep12]] as const) {
  console.log(`\n${"=".repeat(60)}\n=== Episode ${label}: "${ep.script.title}" ===\n${"=".repeat(60)}\n`);
  for (const sec of ep.script.sections) {
    if (!sec.narration || sec.narration.length < 10) continue;
    console.log(`--- [${sec.id}] ${sec.type} ${sec.depth ?? ""} ---`);
    console.log(sec.narration);
    console.log();
  }
}

// Compare specific price claims
console.log("\n=== VÉRIFICATION FACTUELLE ===\n");

// Oil: 03-12 title says "100$" but actual data?
const cl10 = ep10.snapshot.assets.find((a: any) => a.symbol === "CL=F");
const cl12 = ep12.snapshot.assets.find((a: any) => a.symbol === "CL=F");
console.log("Pétrole CL=F:");
console.log(`  03-10: close=${cl10.price.toFixed(2)} high=${cl10.high24h.toFixed(2)} low=${cl10.low24h.toFixed(2)} change=${cl10.changePct.toFixed(2)}%`);
console.log(`  03-12: close=${cl12.price.toFixed(2)} high=${cl12.high24h.toFixed(2)} low=${cl12.low24h.toFixed(2)} change=${cl12.changePct.toFixed(2)}%`);
console.log(`  high52w (les deux): ${cl10.multiTF?.daily1y.high52w.toFixed(2)}`);

// Brent
const bz10 = ep10.snapshot.assets.find((a: any) => a.symbol === "BZ=F");
const bz12 = ep12.snapshot.assets.find((a: any) => a.symbol === "BZ=F");
if (bz10 && bz12) {
  console.log("\nBrent BZ=F:");
  console.log(`  03-10: close=${bz10.price.toFixed(2)} high=${bz10.high24h.toFixed(2)} change=${bz10.changePct.toFixed(2)}%`);
  console.log(`  03-12: close=${bz12.price.toFixed(2)} high=${bz12.high24h.toFixed(2)} change=${bz12.changePct.toFixed(2)}%`);
  console.log(`  high52w: ${bz10.multiTF?.daily1y.high52w.toFixed(2)} / ${bz12.multiTF?.daily1y.high52w.toFixed(2)}`);
}

// Check all assets for "plus haut de 52 semaines" vs actual data
console.log("\n=== Proximité 52w high (seuil 5%) ===");
for (const [label, ep] of [["03-10", ep10], ["03-12", ep12]] as const) {
  console.log(`\n${label}:`);
  for (const a of ep.snapshot.assets) {
    if (!a.multiTF) continue;
    const distFromHigh = ((a.price - a.multiTF.daily1y.high52w) / a.multiTF.daily1y.high52w) * 100;
    if (Math.abs(distFromHigh) < 5) {
      console.log(`  ${a.symbol}: close=${a.price.toFixed(2)} high52w=${a.multiTF.daily1y.high52w.toFixed(2)} dist=${distFromHigh.toFixed(1)}%`);
    }
  }
}
