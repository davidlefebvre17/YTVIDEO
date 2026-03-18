import { readFileSync } from "fs";
const snap = JSON.parse(readFileSync("data/snapshot-2026-03-10.json", "utf-8"));

console.log("=== EARNINGS ===");
const earn = snap.earnings ?? [];
console.log("Total:", earn.length);
if (earn.length > 0) {
  console.log("Sample:", JSON.stringify(earn[0], null, 2));
  const wa = earn.filter((e: any) => e.epsActual != null).length;
  const we = earn.filter((e: any) => e.epsEstimate != null).length;
  const wr = earn.filter((e: any) => e.revenueActual != null).length;
  console.log(`With epsActual: ${wa} / epsEstimate: ${we} / revenueActual: ${wr}`);
  const hours: Record<string, number> = {};
  earn.forEach((e: any) => { hours[e.hour ?? "unknown"] = (hours[e.hour ?? "unknown"] ?? 0) + 1; });
  console.log("By hour:", hours);
  // Show some with actual
  const reported = earn.filter((e: any) => e.epsActual != null);
  console.log("\nReported (with actual):");
  reported.slice(0, 5).forEach((e: any) => {
    const surprise = e.epsEstimate ? ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate) * 100).toFixed(1) : "?";
    console.log(`  ${e.symbol} hour=${e.hour} eps=${e.epsActual} est=${e.epsEstimate} surprise=${surprise}%`);
  });
  // Show pending
  const pending = earn.filter((e: any) => e.epsActual == null);
  console.log(`\nPending (no actual): ${pending.length}`);
  pending.slice(0, 5).forEach((e: any) => {
    console.log(`  ${e.symbol} hour=${e.hour} est=${e.epsEstimate}`);
  });
}

console.log("\n=== STOCK SCREEN earningsDetail ===");
const ss = snap.stockScreen ?? [];
const withED = ss.filter((e: any) => e.earningsDetail);
console.log(`With earningsDetail: ${withED.length} / ${ss.length}`);
const pubToday = withED.filter((e: any) => e.earningsDetail?.publishingToday);
console.log(`publishingToday=true: ${pubToday.length}`);
pubToday.slice(0, 5).forEach((e: any) => {
  console.log(`  ${e.symbol} (${e.name}) ${JSON.stringify(e.earningsDetail)}`);
});

console.log("\n=== UPCOMING EVENTS ===");
console.log("count:", snap.upcomingEvents?.length ?? "absent");
if (snap.upcomingEvents?.length > 0) {
  snap.upcomingEvents.slice(0, 3).forEach((e: any) => console.log(" ", JSON.stringify(e)));
}

console.log("\n=== YESTERDAY EVENTS ===");
console.log("count:", snap.yesterdayEvents?.length ?? "absent");
if (snap.yesterdayEvents?.length > 0) {
  // Check for dupes
  const keys = snap.yesterdayEvents.map((e: any) => `${e.name}|${e.currency}`);
  const unique = new Set(keys);
  console.log(`unique: ${unique.size} / total: ${keys.length}`);
  snap.yesterdayEvents.slice(0, 5).forEach((e: any) => console.log(`  ${e.time ?? '?'} ${e.name} (${e.currency}) impact=${e.impact}`));
}

console.log("\n=== COT ===");
if (snap.cotPositioning) {
  console.log("reportDate:", snap.cotPositioning.reportDate);
  console.log("snapshotDate:", snap.date);
  const diffDays = Math.round((new Date(snap.date).getTime() - new Date(snap.cotPositioning.reportDate).getTime()) / 86400000);
  console.log("daysOld:", diffDays);
  console.log("contracts:", snap.cotPositioning.contracts.length);
  snap.cotPositioning.contracts.slice(0, 3).forEach((c: any) => {
    console.log(`  ${c.symbol ?? c.name}: longs=${c.longPositions ?? c.leveragedLongs} shorts=${c.shortPositions ?? c.leveragedShorts}`);
  });
} else { console.log("absent"); }

console.log("\n=== POLYMARKET ===");
if (snap.polymarket) {
  const mkts = snap.polymarket.markets ?? [];
  console.log("markets:", mkts.length);
  mkts.forEach((m: any) => console.log(`  - ${(m.question ?? m.title ?? "?").slice(0, 80)}`));
} else { console.log("absent"); }

console.log("\n=== NEWS SUMMARY COVERAGE ===");
const news = snap.news ?? [];
const withSummary = news.filter((n: any) => n.summary && n.summary.length > 20);
const withContent = news.filter((n: any) => n.content && n.content.length > 20);
console.log(`Total: ${news.length} / with summary: ${withSummary.length} / with content: ${withContent.length}`);
const sources: Record<string, { total: number; withSum: number }> = {};
news.forEach((n: any) => {
  const src = n.source ?? "unknown";
  if (!sources[src]) sources[src] = { total: 0, withSum: 0 };
  sources[src].total++;
  if (n.summary && n.summary.length > 20) sources[src].withSum++;
});
console.log("By source:");
Object.entries(sources).sort((a, b) => b[1].total - a[1].total).forEach(([src, data]) => {
  console.log(`  ${src.padEnd(25)} total=${data.total}  withSummary=${data.withSum}`);
});
