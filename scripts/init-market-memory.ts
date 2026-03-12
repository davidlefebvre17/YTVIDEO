/**
 * One-shot bootstrap for MarketMemory (D3)
 * Initializes all 35 assets: fetch 10y candles → code pivots → Sonnet impressions
 *
 * Usage: npm run init-market-memory
 */
import "dotenv/config";
import {
  fetchDailyMaxCandles,
  MARKET_MEMORY_SYMBOLS,
  saveMemory,
  applyWeeklyBrief,
  calculateDailyIndicators,
  findSignificantPivots,
} from "@yt-maker/data";
import type { AssetMarketMemory } from "@yt-maker/data";
import { generateStructuredJSON, getWeeklySonnetPrompt } from "@yt-maker/ai";

const today = new Date().toISOString().split("T")[0];

async function main() {
  console.log("=== MarketMemory Init ===");
  console.log(`Date: ${today} | Assets: ${MARKET_MEMORY_SYMBOLS.length}\n`);

  // ── Step 1: Bootstrap all assets with code-detected zones ──
  console.log("--- Step 1: Code bootstrap (pivots + indicators) ---");
  const memories: AssetMarketMemory[] = [];
  let success = 0;
  let failed = 0;

  for (const asset of MARKET_MEMORY_SYMBOLS) {
    try {
      process.stdout.write(`  ${asset.symbol.padEnd(12)} `);
      const candles = await fetchDailyMaxCandles(asset.symbol);

      if (candles.length < 100) {
        console.log(`SKIP (${candles.length} candles)`);
        failed++;
        continue;
      }

      const indicators = calculateDailyIndicators(candles);
      const pivots = findSignificantPivots(candles, 5);

      const memory: AssetMarketMemory = {
        symbol: asset.symbol,
        name: asset.name,
        context: {
          regime: "range",
          regime_since: today,
          impression: "",
          impression_updated: today,
        },
        zones: pivots.map((p) => ({
          level: p.level,
          type: p.type,
          created: today,
          touches: 0,
          last_touch: today,
          last_event_type: null,
          cassure_date: null,
          cassure_confirmed: null,
          last_behavior: "",
        })),
        indicators_daily: indicators,
        last_events: [],
      };

      saveMemory(memory);
      memories.push(memory);
      success++;

      const zonesSummary = pivots.map((p) => `${p.type[0].toUpperCase()}${p.level.toFixed(0)}`).join(" ");
      console.log(`OK (${candles.length} candles, ${pivots.length} zones: ${zonesSummary})`);
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\nBootstrap: ${success} OK, ${failed} failed\n`);

  if (memories.length === 0) {
    console.error("No assets bootstrapped — cannot run Sonnet. Exiting.");
    process.exit(1);
  }

  // ── Step 2: Sonnet pass for qualitative impressions ──
  console.log("--- Step 2: Sonnet enrichment (impressions + regime) ---");
  console.log(`  Sending ${memories.length} assets to Sonnet...\n`);

  try {
    const { system, user } = getWeeklySonnetPrompt(memories);

    const result = await generateStructuredJSON<{
      brief: import("@yt-maker/data").MarketWeeklyBrief;
      asset_updates: Array<{
        symbol: string;
        zones: Array<{ level: number; type: "support" | "resistance" | "pivot" }>;
        regime: "bull" | "bear" | "range";
        impression: string;
      }>;
    }>(system, user, { role: "balanced", maxTokens: 16384 });

    // Apply results
    applyWeeklyBrief(result.brief, result.asset_updates);

    console.log("  Weekly brief saved.");
    console.log(`  Regime summary: ${result.brief.regime_summary.slice(0, 120)}...`);
    console.log(`  Assets updated: ${result.asset_updates.length}`);

    for (const update of result.asset_updates) {
      console.log(`    ${update.symbol.padEnd(12)} ${update.regime.padEnd(6)} — ${update.impression.slice(0, 80)}`);
    }
  } catch (err) {
    console.error(`  Sonnet enrichment failed: ${(err as Error).message}`);
    console.log("  Code-only bootstrap still saved. Run again later for Sonnet enrichment.");
  }

  console.log("\n=== Init complete ===");
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
