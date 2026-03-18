import type { AssetMarketMemory, ZoneEvent, HaikuEnrichmentResult } from "@yt-maker/data";

/**
 * Haiku enrichment prompt for MarketMemory D3
 *
 * Task: Analyze zone events (CASSURE, REJET, PULLBACK) in pure technical context.
 * Output: zone_updates with last_behavior + cassure_confirmed, plus tactical_note.
 *
 * Called for ~4-8 assets per day that triggered zone events.
 */

export function getMarketMemoryHaikuPrompt(
  assetMemory: AssetMarketMemory,
  todayEvents: ZoneEvent[],
): { system: string; user: string } {
  const systemPrompt = `You are a pure chartist analyzing zone events on intraday/daily timeframes.

MISSION:
- Analyze ONLY technical signals (candle structure, volume, ATR, Bollinger Bands, support/resistance)
- NO news, NO fundamentals, NO sentiment
- For each triggered zone event, assess its authenticity and write a tactical summary

ZONE EVENT TYPES:
- TOUCH: Price touched a level without breaking; assess if it's a new support/resistance formation
- REJET: Price rejected from a zone with a wick; assess rejection strength (size, volume confirmation)
- CASSURE: Price broke through a level decisively; assess if it's genuine (volume spike, ATR expansion, BB expansion) or likely false breakout
- PULLBACK_TENU: After cassure, price pulled back but held above/below; confirm the cassure is valid
- PULLBACK_RATE: After cassure, price pulled back and retested the old zone; assess invalidation risk

TECHNICAL SIGNALS TO EVALUATE:
For CASSURE decisions, evaluate:
  - volume_ratio_20d: >1.5 = strong confirmation, <1.0 = weak signal, high false breakout risk
  - atr_ratio (atr14/atr90): >1.2 = volatility expansion supports cassure, <1.0 = weak
  - bb_width_pct_rank: >70 = BB expanding (supports cassure), <30 = squeeze (breakout less reliable)
  - candle close: beyond zone or quickly retracted? sustained or 1-candle spike?

For REJET and TOUCH:
  - wick size relative to ATR: >1.5x ATR = strong rejection
  - close position: did price close back inside the zone or at the extremes?
  - volume on wick: confirmation or hollow spike?

For PULLBACK_TENU:
  - pullback depth: <50% of cassure move = healthy, >75% = invalidation brewing
  - hold confirmation: close outside original zone? RSI still extreme? BB still expanded?

For PULLBACK_RATE:
  - retest at original zone: how close? volume on retest?
  - if retest breaks back through original zone = cassure false (unless re-cassure with stronger signal)

OUTPUT REQUIREMENTS FOR EACH ZONE:
1. level: the zone level (exact number from input)
2. last_behavior: 40-60 chars max. Concise technical description using ACTUAL values from today's indicators.
   Structure: "[EVENT_TYPE] with [VOL]x volume, BB [RANK] pctile, ATR [RATIO]"
   Do NOT copy example values — extract real numbers from TODAY'S TECHNICAL INDICATORS above.
3. cassure_confirmed: ONLY if event involves CASSURE or PULLBACK_TENU/PULLBACK_RATE. Otherwise omit.
   - Set to true: if technical signals confirm genuine breakout (vol >1.3x, ATR >1.1x, BB >60 pctile)
   - Set to false: if signals suggest false breakout (vol <1.0x, ATR <0.9x, BB <40 pctile, or quick pullback)
   - Leave null if event is TOUCH or REJET (no cassure decision needed)

TACTICAL_NOTE:
- 80-100 chars max. Free-form technical observation for the day.
- Structure: "[BB/ATR observation], [zone interaction], [key level from ZONES IN MEMORY to watch]"
- Use ACTUAL indicator values and zone levels from the data above. Do NOT invent levels or copy generic examples.

RULES:
- Be SPECIFIC: use actual indicator values from input
- NO speculation beyond the provided data
- NO prediction of future moves — only assessment of what happened
- NO hedging language like "could", "might", "possibly" in last_behavior — be definitive
- Tactical_note CAN have conditional language ("if X then watch Y")
- If indicators are missing/null, work with what you have and note the gap briefly

Return ONLY valid JSON matching HaikuEnrichmentResult schema. No markdown, no commentary.`;

  const indicators = assetMemory.indicators_daily;
  const zonesInfo = assetMemory.zones
    .map((z) => ({
      level: z.level,
      type: z.type,
      touches: z.touches,
      last_event_type: z.last_event_type,
      cassure_date: z.cassure_date,
      cassure_confirmed: z.cassure_confirmed,
    }))
    .sort((a, b) => b.level - a.level) // descending order
    .map(
      (z) =>
        `- Level ${z.level} (${z.type}, ${z.touches} touches): last_event=${z.last_event_type}, cassure_confirmed=${z.cassure_confirmed}`,
    )
    .join("\n");

  const indicatorsSummary = indicators
    ? `
TODAY'S TECHNICAL INDICATORS:
- Bollinger Bands width: ${indicators.bb_width_pct.toFixed(1)}% of price (percentile rank: ${indicators.bb_width_pct_rank.toFixed(0)}%)
- ATR 14: ${indicators.atr14.toFixed(2)} / ATR 90: ${indicators.atr90.toFixed(2)} → ratio ${indicators.atr_ratio.toFixed(2)}
- SMA20 slope: ${indicators.mm20_slope_deg.toFixed(1)}°
- RSI14: ${indicators.rsi14.toFixed(0)}
- Volume today: ${indicators.volume_ratio_20d.toFixed(2)}x 20-day average
`
    : `
TODAY'S TECHNICAL INDICATORS:
[MISSING — assess with available event data only]
`;

  const eventsList = todayEvents
    .map((evt) => `- ${evt.date}: ${evt.event_type} — ${evt.detail}`)
    .join("\n");

  const userPrompt = `Asset: ${assetMemory.name} (${assetMemory.symbol})
Market Regime: ${assetMemory.context.regime} (since ${assetMemory.context.regime_since})
${indicatorsSummary}
ZONES IN MEMORY:
${zonesInfo}

TODAY'S TRIGGERED EVENTS:
${eventsList}

TASK:
1. For each triggered event, assess its technical validity
2. Update the zone_updates array with the affected zones
3. Write a tactical_note summarizing the day's technical situation
4. Return JSON HaikuEnrichmentResult

Focus on: volume confirmation, ATR expansion/contraction, Bollinger Band width, RSI extremes, candle structure.`;

  return { system: systemPrompt, user: userPrompt };
}
