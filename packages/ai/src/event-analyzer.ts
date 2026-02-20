import type {
  EconomicEvent,
  EventSurprise,
  DailySnapshot,
  AssetSnapshot,
} from "@yt-maker/core";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EventReaction {
  surprise: EventSurprise;
  reactions: Array<{
    asset: string;
    symbol: string;
    changePct: number;
  }>;
  narrative: string;
}

// ── Event → Asset mapping (design doc section 7.2) ──────────────────────────

interface AssetMapping {
  primary: string[];
  secondary: string[];
}

const EVENT_ASSET_MAP: Record<string, AssetMapping> = {
  "CPI":              { primary: ["^GSPC", "GC=F", "DX-Y.NYB"], secondary: ["^IXIC", "EURUSD=X"] },
  "Non-Farm":         { primary: ["^GSPC", "DX-Y.NYB", "GC=F"], secondary: ["USDJPY=X"] },
  "FOMC":             { primary: ["^GSPC", "DX-Y.NYB", "GC=F", "^IXIC"], secondary: ["BTC-USD"] },
  "Unemployment":     { primary: ["^GSPC", "DX-Y.NYB"], secondary: ["GC=F"] },
  "GDP":              { primary: ["^GSPC", "DX-Y.NYB"], secondary: ["EURUSD=X"] },
  "PMI":              { primary: ["^GSPC"], secondary: ["DX-Y.NYB", "CL=F"] },
  "ECB":              { primary: ["EURUSD=X", "^FCHI", "^GDAXI"], secondary: ["^STOXX"] },
  "BoJ":              { primary: ["USDJPY=X", "^N225"], secondary: ["BTC-USD"] },
  "Philly Fed":       { primary: ["DX-Y.NYB", "^GSPC"], secondary: [] },
  "Consumer Conf":    { primary: ["^GSPC"], secondary: ["DX-Y.NYB"] },
  "Oil Inventory":    { primary: ["CL=F", "BZ=F"], secondary: [] },
  "Retail Sales":     { primary: ["^GSPC"], secondary: ["DX-Y.NYB"] },
};

// ── analyzeEventSurprises ────────────────────────────────────────────────────

/**
 * Compute surprise score for each economic event that has actual + forecast values.
 * Classification: neutral (<5%), minor (5-10%), notable (10-20%), major (>20%)
 * (design doc section 7.1)
 */
export function analyzeEventSurprises(events: EconomicEvent[]): EventSurprise[] {
  const surprises: EventSurprise[] = [];

  for (const event of events) {
    if (!event.actual || !event.forecast) continue;

    const actual = parseFloat(event.actual);
    const forecast = parseFloat(event.forecast);
    if (isNaN(actual) || isNaN(forecast)) continue;

    const absSurprise = actual - forecast;
    const relSurprise = forecast !== 0
      ? (absSurprise / Math.abs(forecast)) * 100
      : 0;

    const absRel = Math.abs(relSurprise);
    let magnitude: EventSurprise["magnitude"];
    if (absRel > 20) magnitude = "major";
    else if (absRel > 10) magnitude = "notable";
    else if (absRel > 5) magnitude = "minor";
    else magnitude = "neutral";

    let direction: EventSurprise["direction"];
    if (absSurprise > 0) direction = "above";
    else if (absSurprise < 0) direction = "below";
    else direction = "inline";

    // Find related assets from the mapping
    const mapping = findBestEventMapping(event.name);
    const relatedAssets = mapping
      ? [...mapping.primary, ...mapping.secondary]
      : [];

    surprises.push({
      eventName: event.name,
      actual,
      forecast,
      surprisePct: Math.round(relSurprise * 10) / 10,
      magnitude,
      direction,
      relatedAssets,
    });
  }

  // Sort by absolute surprise descending (most surprising first)
  surprises.sort((a, b) => Math.abs(b.surprisePct) - Math.abs(a.surprisePct));
  return surprises;
}

// ── matchEventsToReaction ────────────────────────────────────────────────────

/**
 * For each significant surprise, check if the expected assets actually reacted.
 * Returns EventReaction objects linking surprise to observed market moves.
 * (design doc section 7.2)
 */
export function matchEventsToReaction(
  surprises: EventSurprise[],
  snapshot: DailySnapshot,
): EventReaction[] {
  const results: EventReaction[] = [];

  // Only process non-neutral surprises
  const significant = surprises.filter((s) => s.magnitude !== "neutral");

  for (const surprise of significant) {
    const mapping = findBestEventMapping(surprise.eventName);
    if (!mapping) continue;

    // Check if primary assets moved
    const reactions: EventReaction["reactions"] = [];
    for (const symbol of mapping.primary) {
      const asset = findAsset(snapshot.assets, symbol);
      if (asset && Math.abs(asset.changePct) > 0.1) {
        reactions.push({
          asset: asset.name,
          symbol: asset.symbol,
          changePct: asset.changePct,
        });
      }
    }

    if (reactions.length === 0) continue;

    results.push({
      surprise,
      reactions,
      narrative: buildEventNarrative(surprise, reactions),
    });
  }

  return results;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the best matching event mapping by checking if the event name
 * contains any of the mapping keys (case-insensitive partial match).
 */
function findBestEventMapping(eventName: string): AssetMapping | undefined {
  const nameLower = eventName.toLowerCase();

  // Try exact key match first, then partial
  for (const [key, mapping] of Object.entries(EVENT_ASSET_MAP)) {
    if (nameLower.includes(key.toLowerCase())) {
      return mapping;
    }
  }

  return undefined;
}

function findAsset(assets: AssetSnapshot[], symbol: string): AssetSnapshot | undefined {
  return assets.find((a) => a.symbol === symbol);
}

/**
 * Build a narrative string describing the event surprise and market reaction.
 * (design doc section 7.3)
 */
function buildEventNarrative(
  surprise: EventSurprise,
  reactions: EventReaction["reactions"],
): string {
  const parts: string[] = [];

  // Event description
  parts.push(
    `${surprise.eventName}: ${surprise.actual} vs ${surprise.forecast} attendu`
  );

  // Magnitude qualifier
  if (surprise.magnitude === "major") {
    parts.push(
      `surprise ${surprise.direction === "above" ? "haussiere" : "baissiere"} massive (${surprise.direction === "above" ? "+" : ""}${surprise.surprisePct}%)`
    );
  } else if (surprise.magnitude === "notable") {
    parts.push(
      `surprise ${surprise.direction === "above" ? "haussiere" : "baissiere"} notable (${surprise.direction === "above" ? "+" : ""}${surprise.surprisePct}%)`
    );
  }

  // Reaction description
  const reactionStr = reactions
    .map((r) => {
      const dir = r.changePct > 0 ? "en hausse" : "en baisse";
      return `${r.asset} ${dir} (${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%)`;
    })
    .join(", ");

  parts.push(`Reaction: ${reactionStr}`);

  return parts.join(" — ");
}
