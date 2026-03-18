import type { AssetMarketMemory, MarketWeeklyBrief } from "@yt-maker/data";

export interface SonnetWeeklyOutput {
  brief: MarketWeeklyBrief;
  asset_updates: Array<{
    symbol: string;
    zones: Array<{
      level: number;
      type: "support" | "resistance" | "pivot";
    }>;
    regime: "bull" | "bear" | "range";
    impression: string;
  }>;
}

export function getWeeklySonnetPrompt(
  memories: AssetMarketMemory[],
): { system: string; user: string } {
  const systemPrompt = `You are an expert technical analyst reviewing 35 global financial instruments every Monday morning.

Your role:
- REVIEW existing zones (support/resistance/pivot) for each asset over the past week
- ADJUST zones based on price action: add new critical levels, remove stale ones, keep max 5 per asset
- UPDATE regime classification (bull/bear/range) using SMA positions, RSI, and trend structure
- WRITE a 2-3 sentence impression per asset summarizing the technical setup
- GENERATE a weekly market brief with overall regime, notable zone events, and watchlist focus for next week

RULES:

### Zone Management
- ZONES are static price levels (support/resistance/pivot) that guide trading decisions
- Zone type definitions:
  - support: where price historically rebounded upward (tested multiple times)
  - resistance: where price historically struggled to break above (tested multiple times)
  - pivot: critical inflection level that, if broken, signals regime change
- For each asset:
  - Review the last 5 daily candles and recent zone_events
  - If price touched/tested a zone this week: keep it, update last_touch and last_behavior
  - If price broke a zone decisively (cassure_confirmed=true): consider removing it or downgrading status
  - If a new price level shows strong interaction (reversal, rejection, squeeze): ADD a new zone
  - Maximum 5 zones per asset — prioritize the most actively traded levels
  - DO NOT add zones beyond 3 significant levels unless warranted by clear evidence

### Regime Classification (bull | bear | range)
- bull: SMA20 > SMA50, price above both, RSI > 50, higher highs and higher lows
- bear: SMA20 < SMA50, price below both, RSI < 50, lower highs and lower lows
- range: price oscillating between two levels, SMA convergence, RSI oscillating 40-60
- Base your classification ONLY on the latest daily indicators and zone structure
- Note: regime_since is the date it was first established (you may update the current regime, but do NOT change regime_since)

### Impression (2-3 sentences max)
- Pure chartism — NO news, NO events, NO macro
- Describe the technical setup, key levels to watch, and one likely scenario for next week
- Example structure: "[ASSET] in [REGIME] regime, testing [ZONE_TYPE] at [LEVEL]. [INDICATOR_STATE]. Watch for [SCENARIO] before next [DIRECTION]."
- Use ACTUAL values from the asset's data, not these placeholders.

### Weekly Brief (MarketWeeklyBrief)
- regime_summary: 2-3 sentences on overall market condition (bull/bear/rotation/divergence between regions)
- notable_zones: events from this week where a zone was touched, tested, or broken (max 5-7)
  - Each entry: { symbol, level, type, event: "what happened" }
  - Example structure: "[ASSET] [ACTION] [LEVEL] ([ZONE_TYPE]), [CONSEQUENCE]"
- watchlist_next_week: 4-6 most important assets to monitor
  - Each entry: { symbol, reason: "one sentence on why it matters" }
  - Prioritize assets with upcoming zone tests, regime changes, or high volatility

### Output Format
Return ONLY valid JSON matching SonnetWeeklyOutput interface. No markdown, no commentary.
{
  "brief": {
    "generated": "ISO datetime string",
    "regime_summary": "2-3 sentences on market regime",
    "notable_zones": [
      { "symbol": "SYMBOL", "level": 0, "type": "resistance", "event": "description from this week" }
    ],
    "watchlist_next_week": [
      { "symbol": "SYMBOL", "reason": "one sentence" }
    ]
  },
  "asset_updates": [
    {
      "symbol": "SYMBOL",
      "zones": [
        { "level": 0, "type": "resistance" },
        { "level": 0, "type": "support" }
      ],
      "regime": "bull",
      "impression": "2-3 sentences"
    }
  ]
}

CRITICAL:
- NEVER hallucinate. If data is missing, work with what you have.
- NEVER over-fit. Add zones only if justified by clear price interaction.
- NEVER write impression text mentioning internal scores (drama, editorial, buzz) — pure chartism only.
- SMA20/50/200 may be missing from some assets — use price/RSI/zone behavior as proxy.
- Return asset_updates for ALL input assets, in the same order as input.`;

  const userPrompt = buildUserPrompt(memories);

  return { system: systemPrompt, user: userPrompt };
}

function buildUserPrompt(memories: AssetMarketMemory[]): string {
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  let prompt = `MARKET MEMORY REVIEW — WEEK OF ${weekAgo} TO ${now.split("T")[0]}

You are reviewing the following 35 assets. For each, adjust zones, update regime, and write impression.

---

`;

  for (const memory of memories) {
    prompt += `## ${memory.symbol} — ${memory.name}

**Current Context:**
- Regime: ${memory.context.regime} (since ${memory.context.regime_since})
- Impression: ${memory.context.impression}

**Active Zones (${memory.zones.length} total):**
${
  memory.zones.length > 0
    ? memory.zones
        .map(
          (zone) =>
            `- Level ${zone.level} [${zone.type}] — ${zone.touches} touches, last: ${zone.last_touch}, behavior: ${zone.last_behavior}`,
        )
        .join("\n")
    : "(none)"
}

**Recent Events:**
${
  memory.last_events && memory.last_events.length > 0
    ? memory.last_events
        .slice(0, 5)
        .map((evt) => `- ${evt.date}: ${evt.event_type} — ${evt.detail}`)
        .join("\n")
    : "(none this week)"
}

**Latest Indicators (${memory.indicators_daily?.date || "N/A"}):**
${
  memory.indicators_daily
    ? `- RSI14: ${memory.indicators_daily.rsi14.toFixed(2)}
- BB Width %: ${memory.indicators_daily.bb_width_pct.toFixed(2)}% (rank: ${memory.indicators_daily.bb_width_pct_rank.toFixed(0)}th percentile)
- SMA20 slope: ${memory.indicators_daily.mm20_slope_deg.toFixed(2)}°
- ATR ratio: ${memory.indicators_daily.atr_ratio.toFixed(2)} (14d / 90d)
- Volume ratio: ${memory.indicators_daily.volume_ratio_20d.toFixed(2)}x 20d avg`
    : "(indicators not available)"
}

---

`;
  }

  prompt += `
Now review each asset above. For each one:
1. Decide which zones to keep (max 5), which to remove, which to add
2. Update regime based on latest setup
3. Write 2-3 sentence impression (pure technicals)
4. Report all changes in the JSON output

Then generate the weekly brief summarizing:
- Overall market regime (bull/bear/range across regions)
- 5-7 most notable zone events from this week
- 4-6 assets to watch next week and why

Be concise. Pure chartism. Return only the JSON.`;

  return prompt;
}
