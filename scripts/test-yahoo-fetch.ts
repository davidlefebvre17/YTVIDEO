import { fetchAllAssets, DEFAULT_ASSETS } from "@yt-maker/data";

async function main() {
  console.log(`Testing ALL ${DEFAULT_ASSETS.length} assets (historical 2026-03-16)...\n`);
  const t0 = Date.now();
  const results = await fetchAllAssets(DEFAULT_ASSETS, "2026-03-16");
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const failed = DEFAULT_ASSETS.filter(a => !results.find(r => r.symbol === a.symbol));

  console.log(`\n=== ${results.length}/${DEFAULT_ASSETS.length} OK in ${elapsed}s ===\n`);
  if (failed.length) {
    console.log(`FAILED (${failed.length}):`);
    for (const f of failed) console.log(`  ${f.symbol} (${f.name})`);
  }
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
