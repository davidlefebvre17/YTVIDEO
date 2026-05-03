/**
 * Number formatting helpers for stat overlays.
 * - Auto-compaction (1_700_000 → "1,7 M")
 * - French locale (comma decimal separator, narrow non-breaking thousands)
 * - Strip trailing ".0" on clean integers
 * - Translate verbose units ("bbl/day" → "b/j")
 */

export interface CompactedStat {
  /** Scaled target value to feed the count-up interpolate */
  scaledTarget: number;
  /** Scale unit appended right after the number, e.g. " M" or " Md" */
  scalePrefix: string;
  /** Suffix translated/cleaned for display (e.g. "bbl/day" → "b/j") */
  cleanSuffix: string;
  /** Recommended decimals based on magnitude */
  decimals: number;
}

const SUFFIX_MAP: Record<string, string> = {
  "bbl/day": "b/j",
  "bbl/jour": "b/j",
  "bbls/day": "b/j",
  "/bbl": "/baril",
  "$/bbl": "$/baril",
  "bbl": "barils",
  "USD": "$",
  " USD": "$",
};

function translateSuffix(suffix: string): string {
  const trimmed = suffix.trim();
  if (SUFFIX_MAP[trimmed] !== undefined) return SUFFIX_MAP[trimmed];
  return suffix;
}

/**
 * Add leading space when suffix is a real word/unit and not a punctuation
 * marker that sticks to the number (e.g. "%", "/baril").
 */
function withLeadingSpace(s: string): string {
  if (!s) return "";
  if (s.startsWith(" ")) return s;
  if (/^[%‰°/]/.test(s)) return s;
  return " " + s;
}

/**
 * Minimum number of decimals needed to losslessly represent a value, capped.
 * - neededDecimals(14)    → 0
 * - neededDecimals(2.5)   → 1
 * - neededDecimals(0.75)  → 2
 * - neededDecimals(0.123) → 2 (capped)
 */
function neededDecimals(v: number, max: number = 2): number {
  for (let d = 0; d <= max; d++) {
    const factor = Math.pow(10, d);
    const rounded = Math.round(v * factor) / factor;
    if (Math.abs(v - rounded) < 1e-9) return d;
  }
  return max;
}

/**
 * Compact a raw numeric value for display:
 * - 1_700_000 with suffix "bbl/day" → { scaledTarget: 1.7, scalePrefix: " M", cleanSuffix: " b/j", decimals: 1 }
 * - 5_000_000 with suffix "bbl/day" → { scaledTarget: 5,   scalePrefix: " M", cleanSuffix: " b/j", decimals: 0 }
 * - 200 with suffix "Md$"          → { scaledTarget: 200, scalePrefix: "",   cleanSuffix: " Md$", decimals: 0 }
 * - 0.75 with suffix "%"           → { scaledTarget: 0.75, scalePrefix: "",  cleanSuffix: "%",     decimals: 2 }
 * - 14 with suffix "%"             → { scaledTarget: 14,  scalePrefix: "",   cleanSuffix: "%",     decimals: 0 }
 */
export function compactStatValue(value: number, suffix: string = ""): CompactedStat {
  const abs = Math.abs(value);
  const cleanSuffix = withLeadingSpace(translateSuffix(suffix));

  if (abs >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return {
      scaledTarget: scaled,
      scalePrefix: " Md",
      cleanSuffix,
      decimals: neededDecimals(Math.abs(scaled), 1),
    };
  }
  if (abs >= 1_000_000) {
    const scaled = value / 1_000_000;
    return {
      scaledTarget: scaled,
      scalePrefix: " M",
      cleanSuffix,
      decimals: neededDecimals(Math.abs(scaled), 1),
    };
  }
  return {
    scaledTarget: value,
    scalePrefix: "",
    cleanSuffix,
    decimals: neededDecimals(abs, 2),
  };
}

/**
 * Format a counter value during animation:
 * - French locale (5 000, 1,7)
 * - Strip ".0" when value is a clean integer at this decimal precision
 */
export function formatCounterFr(v: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(v * factor) / factor;

  // If asked for decimals but the value is actually integer at this precision → drop them
  if (decimals > 0 && Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return Math.round(rounded).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  return rounded.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
