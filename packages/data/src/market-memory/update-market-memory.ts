import fs from "fs";
import path from "path";
import type { Candle } from "@yt-maker/core";
import type { AssetMarketMemory, ZoneEvent, HaikuEnrichmentResult, MarketWeeklyBrief } from "./types";
import { MARKET_MEMORY_SYMBOLS } from "./types";
import { calculateDailyIndicators } from "./indicators";
import { detectZoneEvents, findSignificantPivots } from "./zone-detector";
import { fetchDaily3yCandles } from "../yahoo";

const MEMORY_DIR = path.resolve(process.cwd(), "data/market-memory");

// ─── File I/O ────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function memoryPath(symbol: string): string {
  // Replace special chars for filesystem: ^GSPC → _GSPC, GC=F → GC_F
  const safe = symbol.replace(/[\^=]/g, "_");
  return path.join(MEMORY_DIR, `${safe}.json`);
}

export function loadMemory(symbol: string): AssetMarketMemory | null {
  const p = memoryPath(symbol);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function saveMemory(memory: AssetMarketMemory): void {
  ensureDir();
  fs.writeFileSync(memoryPath(memory.symbol), JSON.stringify(memory, null, 2));
}

export function loadWeeklyBrief(): MarketWeeklyBrief | null {
  const p = path.join(MEMORY_DIR, "market_weekly_brief.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function saveWeeklyBrief(brief: MarketWeeklyBrief): void {
  ensureDir();
  fs.writeFileSync(
    path.join(MEMORY_DIR, "market_weekly_brief.json"),
    JSON.stringify(brief, null, 2)
  );
}

// ─── Daily update (runs every morning in pipeline) ───────────────

export interface MarketMemoryUpdate {
  symbol: string;
  events: ZoneEvent[];
  indicatorsUpdated: boolean;
}

/**
 * Update MarketMemory for all 35 assets.
 * Called between P0 (data fetch) and P1 (pre-filtering).
 * Returns list of assets with triggered zone events (for Haiku enrichment).
 */
export async function updateAllMarketMemory(
  today: string
): Promise<MarketMemoryUpdate[]> {
  ensureDir();
  const results: MarketMemoryUpdate[] = [];

  for (const asset of MARKET_MEMORY_SYMBOLS) {
    try {
      const update = await updateSingleAsset(asset.symbol, asset.name, today);
      if (update) results.push(update);
    } catch (err) {
      console.warn(`  MarketMemory: ${asset.symbol} failed — ${(err as Error).message}`);
    }
  }

  const triggered = results.filter((r) => r.events.length > 0);
  console.log(
    `  MarketMemory: ${results.length}/${MARKET_MEMORY_SYMBOLS.length} updated, ` +
    `${triggered.length} with zone events`
  );

  return results;
}

async function updateSingleAsset(
  symbol: string,
  name: string,
  today: string
): Promise<MarketMemoryUpdate | null> {
  // Fetch 3y daily candles (needed for indicator history)
  const candles = await fetchDaily3yCandles(symbol);
  if (candles.length < 100) {
    console.warn(`  MarketMemory: ${symbol} — insufficient candles (${candles.length})`);
    return null;
  }

  let memory = loadMemory(symbol);

  // Bootstrap if no memory exists
  if (!memory) {
    memory = bootstrapMemory(symbol, name, candles, today);
    saveMemory(memory);
    return { symbol, events: [], indicatorsUpdated: true };
  }

  // Calculate daily indicators
  const indicators = calculateDailyIndicators(candles);
  if (indicators) {
    memory.indicators_daily = indicators;
  }

  // Detect zone events
  const { updatedZones, newEvents } = detectZoneEvents(candles, memory.zones, today);
  memory.zones = updatedZones;

  // Append new events (FIFO, max 5)
  for (const evt of newEvents) {
    memory.last_events.push(evt);
  }
  memory.last_events = memory.last_events.slice(-5);

  saveMemory(memory);

  return {
    symbol,
    events: newEvents,
    indicatorsUpdated: indicators !== null,
  };
}

// ─── Bootstrap ───────────────────────────────────────────────────

function bootstrapMemory(
  symbol: string,
  name: string,
  candles: Candle[],
  today: string
): AssetMarketMemory {
  const pivots = findSignificantPivots(candles, 5);

  const zones = pivots.map((p) => ({
    level: p.level,
    type: p.type,
    created: today,
    touches: 0,
    last_touch: today,
    last_event_type: null,
    cassure_date: null,
    cassure_confirmed: null,
    last_behavior: "",
  }));

  const indicators = calculateDailyIndicators(candles);

  return {
    symbol,
    name,
    context: {
      regime: "range",
      regime_since: today,
      impression: "",
      impression_updated: today,
    },
    zones,
    indicators_daily: indicators,
    last_events: [],
  };
}

// ─── Haiku enrichment integration ────────────────────────────────

/**
 * Apply Haiku enrichment results to saved memory files.
 * Called after the LLM returns enrichment for triggered assets.
 */
export function applyHaikuEnrichment(results: HaikuEnrichmentResult[]): void {
  for (const result of results) {
    const memory = loadMemory(result.symbol);
    if (!memory) continue;

    for (const update of result.zone_updates) {
      const zone = memory.zones.find((z) => Math.abs(z.level - update.level) < z.level * 0.001);
      if (zone) {
        zone.last_behavior = update.last_behavior;
        if (update.cassure_confirmed !== undefined) {
          zone.cassure_confirmed = update.cassure_confirmed;
        }
      }
    }

    saveMemory(memory);
  }
}

// ─── Monday weekly job ───────────────────────────────────────────

/**
 * Check if today is Monday → should run weekly Sonnet job.
 */
export function isWeeklyJobDay(today: string): boolean {
  const d = new Date(today);
  return d.getDay() === 1; // Monday
}

/**
 * Build context for the weekly Sonnet prompt.
 * Returns all 35 asset memories for Sonnet to analyze.
 */
export function buildWeeklyContext(): AssetMarketMemory[] {
  const memories: AssetMarketMemory[] = [];
  for (const asset of MARKET_MEMORY_SYMBOLS) {
    const mem = loadMemory(asset.symbol);
    if (mem) memories.push(mem);
  }
  return memories;
}

/**
 * Apply Sonnet weekly brief results: update zones + save brief.
 */
export function applyWeeklyBrief(
  brief: MarketWeeklyBrief,
  zoneUpdates?: Array<{
    symbol: string;
    zones: Array<{ level: number; type: "support" | "resistance" | "pivot" }>;
    regime?: "bull" | "bear" | "range";
    impression?: string;
  }>
): void {
  saveWeeklyBrief(brief);

  if (zoneUpdates) {
    for (const update of zoneUpdates) {
      const memory = loadMemory(update.symbol);
      if (!memory) continue;

      if (update.regime) {
        memory.context.regime = update.regime;
        memory.context.regime_since = brief.generated.slice(0, 10);
      }
      if (update.impression) {
        memory.context.impression = update.impression;
        memory.context.impression_updated = brief.generated.slice(0, 10);
      }

      // Replace zones if Sonnet provides new ones
      if (update.zones.length > 0) {
        memory.zones = update.zones.map((z) => ({
          level: z.level,
          type: z.type,
          created: brief.generated.slice(0, 10),
          touches: 0,
          last_touch: brief.generated.slice(0, 10),
          last_event_type: null,
          cassure_date: null,
          cassure_confirmed: null,
          last_behavior: "",
        }));
      }

      saveMemory(memory);
    }
  }
}

// ─── Context builder for prompts ─────────────────────────────────

/**
 * Build MarketMemory context string for LLM prompts.
 * @param symbols List of symbols to include (e.g., episode's focus assets)
 */
export function buildMarketMemoryContext(symbols: string[]): string {
  const parts: string[] = [];

  // Always include weekly brief if available
  const brief = loadWeeklyBrief();
  if (brief) {
    parts.push(`## Weekly Brief (${brief.generated.slice(0, 10)})`);
    parts.push(brief.regime_summary);
    if (brief.watchlist_next_week.length > 0) {
      parts.push("Watch: " + brief.watchlist_next_week.map((w) => `${w.symbol} (${w.reason})`).join(", "));
    }
    parts.push("");
  }

  // Per-asset context
  for (const sym of symbols) {
    const mem = loadMemory(sym);
    if (!mem) continue;

    parts.push(`## ${mem.name} (${mem.symbol})`);
    parts.push(`Régime: ${mem.context.regime} depuis ${mem.context.regime_since}`);
    if (mem.context.impression) {
      parts.push(`Impression: ${mem.context.impression}`);
    }

    if (mem.zones.length > 0) {
      parts.push("Zones:");
      for (const z of mem.zones) {
        let line = `  ${z.type} ${z.level.toFixed(2)} (${z.touches} touches)`;
        if (z.last_event_type) line += ` — dernier: ${z.last_event_type} ${z.last_touch}`;
        if (z.last_behavior) line += ` | ${z.last_behavior}`;
        parts.push(line);
      }
    }

    if (mem.indicators_daily) {
      const ind = mem.indicators_daily;
      parts.push(
        `Indicateurs: RSI=${ind.rsi14.toFixed(1)} BB_rank=${ind.bb_width_pct_rank.toFixed(0)}% ` +
        `ATR_ratio=${ind.atr_ratio.toFixed(2)} SMA20_slope=${ind.mm20_slope_deg.toFixed(1)}° ` +
        `Vol_ratio=${ind.volume_ratio_20d.toFixed(1)}x`
      );
    }

    if (mem.last_events.length > 0) {
      parts.push("Events récents: " + mem.last_events.map((e) => `${e.date} ${e.event_type}`).join(", "));
    }
    parts.push("");
  }

  return parts.join("\n");
}
