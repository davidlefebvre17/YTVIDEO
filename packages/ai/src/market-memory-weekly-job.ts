import type { MarketWeeklyBrief } from "@yt-maker/data";
import {
  buildWeeklyContext,
  applyWeeklyBrief,
} from "@yt-maker/data";
import {
  getWeeklySonnetPrompt,
  type SonnetWeeklyOutput,
} from "./prompts/market-memory-sonnet-weekly";
import { generateStructuredJSON } from "./llm-client";

/**
 * MarketMemory Weekly Job (Bloc D3)
 * Runs Monday morning at 08:00 UTC
 * - Reads all 35 asset memory files via buildWeeklyContext()
 * - Sends to Sonnet (balanced role)
 * - Adjusts zones, updates regime, writes impressions
 * - Generates market_weekly_brief.json
 * - Writes updated memories back to disk via applyWeeklyBrief()
 */

export interface WeeklyJobResult {
  success: boolean;
  timestamp: string;
  assets_processed: number;
  brief_generated: boolean;
  errors: string[];
}

/**
 * Send all memories to Sonnet, get adjustments
 */
async function callSonnetWeekly(
  memories: ReturnType<typeof buildWeeklyContext>,
): Promise<SonnetWeeklyOutput> {
  const { system, user } = getWeeklySonnetPrompt(memories);

  console.log(`[Weekly Job] Calling Sonnet for ${memories.length} assets...`);

  const result = await generateStructuredJSON<SonnetWeeklyOutput>(
    system,
    user,
    { role: "balanced" }, // Sonnet via OpenRouter or Anthropic
  );

  return result;
}


/**
 * Main orchestration
 */
export async function runWeeklyJob(): Promise<WeeklyJobResult> {
  const result: WeeklyJobResult = {
    success: false,
    timestamp: new Date().toISOString(),
    assets_processed: 0,
    brief_generated: false,
    errors: [],
  };

  try {
    // 1. Load all memories
    console.log("[Weekly Job] Loading all asset memories...");
    const memories = buildWeeklyContext();
    result.assets_processed = memories.length;

    if (memories.length === 0) {
      result.errors.push("No memories loaded");
      return result;
    }

    // 2. Call Sonnet
    console.log("[Weekly Job] Sending to Sonnet...");
    const output = await callSonnetWeekly(memories);

    // 3. Apply updates (persists to disk)
    console.log("[Weekly Job] Applying zone updates and brief...");
    applyWeeklyBrief(output.brief, output.asset_updates);

    result.success = true;
    result.brief_generated = true;

    console.log(
      `[Weekly Job] COMPLETE — ${memories.length} assets updated, brief generated`,
    );
  } catch (err) {
    result.errors.push(`Fatal error: ${String(err)}`);
    console.error("[Weekly Job] Fatal error:", err);
  }

  return result;
}
