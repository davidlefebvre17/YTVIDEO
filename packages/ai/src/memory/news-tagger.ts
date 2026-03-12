/**
 * News Tagger Engine — D2 News Memory System
 *
 * Implements the 3-layer tagging algorithm:
 * - Layer 1: Direct asset matching (watchlist + 763 stocks)
 * - Layer 2: Causal rules (monetary policy, earnings, etc.)
 * - Layer 3: Metadata source rules
 *
 * Spec: D2-NEWS-MEMORY-SPEC.md § 4.1 & 4.2
 */

import { getAllProfiles } from "../company-profiles";
import {
  normalizeText,
  matchPattern,
  DIRECT_MATCH_RULES,
  STOCK_ALIAS_RULES,
  CAUSAL_RULES,
  METADATA_RULES,
  getSourceTier,
  computeImpact,
  generateStockDirectRules,
} from "./tagging-rules";
import type {
  NewsTags,
  AssetTag,
  DirectMatchRule,
  CausalRule,
  MetadataRule,
  MacroTheme,
} from "./types";

// ════════════════════════════════════════════════════════════════════════════
// Module-level state: initialized at boot via initTagger()
// ════════════════════════════════════════════════════════════════════════════

let allDirectRules: DirectMatchRule[] | null = null;
let allCausalRules: CausalRule[] | null = null;
let allMetadataRules: MetadataRule[] | null = null;
let isTaggerInitialized = false;

// ════════════════════════════════════════════════════════════════════════════
// 4.2 Initializer — Boot-time setup
// ════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the tagger at application boot.
 * - Loads 763 company profiles
 * - Generates stock direct rules
 * - Pre-normalizes all patterns for performance
 * - Stores rules in module-level state
 */
export function initTagger(): void {
  if (isTaggerInitialized) {
    console.debug("[news-tagger] Tagger already initialized, skipping");
    return;
  }

  try {
    // Load company profiles and generate stock rules
    const profiles = getAllProfiles();
    const stockRules = generateStockDirectRules(profiles);
    allDirectRules = [...DIRECT_MATCH_RULES, ...stockRules, ...STOCK_ALIAS_RULES];

    // Copy references (these are defined in tagging-rules.ts)
    allCausalRules = CAUSAL_RULES;
    allMetadataRules = METADATA_RULES;

    // Pre-normalize all patterns in direct rules for performance
    for (const rule of allDirectRules) {
      rule.patterns = rule.patterns.map((p) => normalizeText(p));
    }

    // Pre-normalize all patterns in causal rules
    for (const rule of allCausalRules) {
      rule.triggers = rule.triggers.map((t) => normalizeText(t));

      if (rule.modifiers) {
        rule.modifiers.bullish = rule.modifiers.bullish.map((m) =>
          normalizeText(m)
        );
        rule.modifiers.bearish = rule.modifiers.bearish.map((m) =>
          normalizeText(m)
        );
      }

      if (rule.exclude_patterns) {
        rule.exclude_patterns = rule.exclude_patterns.map((p) =>
          normalizeText(p)
        );
      }
    }

    isTaggerInitialized = true;
    console.log(
      `[news-tagger] Initialized: ${allDirectRules.length} direct rules (${DIRECT_MATCH_RULES.length} watchlist + ${stockRules.length} stocks), ${allCausalRules.length} causal rules, ${allMetadataRules.length} metadata rules`
    );
  } catch (error) {
    console.error(`[news-tagger] Initialization failed: ${error}`);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4.1 Main tagging algorithm
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tag an article using the 3-layer algorithm.
 *
 * Layer 1: Direct matching on watchlist + 763 stocks
 * Layer 2: Causal rules (monetary policy, earnings, commodities, etc.)
 * Layer 3: Metadata source rules
 *
 * Results are CUMULATIVE — each layer can add assets and themes.
 *
 * @param article The article to tag
 * @param directRules Layer 1 rules (watchlist + stock auto-generated)
 * @param causalRules Layer 2 rules (causal chains)
 * @param metadataRules Layer 3 rules (metadata source)
 * @returns NewsTags with assets, themes, impact, and rules_matched
 */
export function tagArticle(
  article: {
    title: string;
    summary?: string;
    source: string;
    feed_url?: string;
  },
  directRules: DirectMatchRule[],
  causalRules: CausalRule[],
  metadataRules: MetadataRule[]
): NewsTags {
  // Normalize article text once
  const text = normalizeText(`${article.title} ${article.summary ?? ""}`);

  // Cumulative results
  const assetTags: Map<string, AssetTag> = new Map();
  const themes: Set<MacroTheme> = new Set();
  const rulesMatched: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1: Direct Asset Matching
  // ═══════════════════════════════════════════════════════════════════════════

  for (const rule of directRules) {
    for (const pattern of rule.patterns) {
      if (matchPattern(text, pattern, rule.word_boundary)) {
        // Tag the main asset
        if (!assetTags.has(rule.asset)) {
          assetTags.set(rule.asset, {
            symbol: rule.asset,
            sentiment: undefined, // Layer 1 doesn't provide sentiment
            confidence: "high", // Direct match = high confidence
            source_layer: 1,
          });
        }

        // If it's a stock, also tag the related index (if present)
        if (rule.related_index && !assetTags.has(rule.related_index)) {
          assetTags.set(rule.related_index, {
            symbol: rule.related_index,
            sentiment: undefined,
            confidence: "low", // Indirect link = low confidence
            source_layer: 1,
          });
        }

        rulesMatched.push(rule.id);
        break; // One pattern match per rule is enough
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: Causal Rules
  // ═══════════════════════════════════════════════════════════════════════════

  for (const rule of causalRules) {
    // Skip if exclude patterns match
    if (rule.exclude_patterns?.some((p) => text.includes(p))) {
      continue;
    }

    // Count how many triggers match
    const matchedTriggers = rule.triggers.filter((t) =>
      matchPattern(text, t, false)
    );
    const minRequired = rule.min_triggers ?? 1;

    if (matchedTriggers.length >= minRequired) {
      // Determine direction based on modifiers
      let direction: "bullish" | "bearish" | null = null;

      if (rule.modifiers) {
        const hasBullish = rule.modifiers.bullish.some((m) =>
          text.includes(m)
        );
        const hasBearish = rule.modifiers.bearish.some((m) =>
          text.includes(m)
        );

        if (hasBullish && !hasBearish) {
          direction = "bullish";
        } else if (hasBearish && !hasBullish) {
          direction = "bearish";
        }
        // If both or neither → direction remains null
      }

      // Tag all assets in the causal rule
      for (const assetSymbol of rule.assets) {
        const existing = assetTags.get(assetSymbol);
        let sentiment: "bullish" | "bearish" | "neutral" | undefined;

        // Determine sentiment from sentiment_map if direction is determined
        if (direction && rule.sentiment_map) {
          const map =
            direction === "bullish"
              ? rule.sentiment_map.bullish_modifier
              : rule.sentiment_map.bearish_modifier;
          sentiment = map[assetSymbol];
        }

        // Add or update asset tag
        if (!existing || existing.source_layer > 2) {
          // New tag or upgrade from layer 3
          assetTags.set(assetSymbol, {
            symbol: assetSymbol,
            sentiment,
            confidence: rule.confidence,
            source_layer: 2,
          });
        } else if (existing && !existing.sentiment && sentiment) {
          // Enrich layer 1 tag with sentiment from layer 2
          existing.sentiment = sentiment;
          existing.confidence = rule.confidence;
        }
      }

      // Add theme from causal rule
      themes.add(rule.theme);
      rulesMatched.push(rule.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3: Metadata Source Rules
  // ═══════════════════════════════════════════════════════════════════════════

  const sourceNorm = article.source.toLowerCase();
  const feedNorm = article.feed_url?.toLowerCase() ?? "";

  for (const rule of metadataRules) {
    const matches = rule.source_patterns.some(
      (p) => sourceNorm.includes(p) || feedNorm.includes(p)
    );

    if (matches) {
      // Add default theme
      themes.add(rule.default_theme);

      // Add default assets if present
      if (rule.default_assets) {
        for (const symbol of rule.default_assets) {
          if (!assetTags.has(symbol)) {
            assetTags.set(symbol, {
              symbol,
              sentiment: undefined,
              confidence: "low",
              source_layer: 3,
            });
          }
        }
      }

      rulesMatched.push(rule.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Impact Scoring
  // ═══════════════════════════════════════════════════════════════════════════

  const sourceTier = getSourceTier(article.source, article.feed_url);
  const hasCausalMatch = rulesMatched.some((id) =>
    causalRules.some((r) => r.id === id)
  );
  const impact = computeImpact(sourceTier, hasCausalMatch, assetTags.size);

  return {
    assets: Array.from(assetTags.values()),
    themes: Array.from(themes),
    impact,
    rules_matched: rulesMatched,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Convenience wrapper: Auto-tag with initialized rules
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tag an article using the auto-initialized rules.
 * Requires initTagger() to have been called first.
 *
 * @param article The article to tag
 * @returns NewsTags with assets, themes, impact, and rules_matched
 * @throws Error if tagger has not been initialized
 */
export function tagArticleAuto(article: {
  title: string;
  summary?: string;
  source: string;
  feed_url?: string;
}): NewsTags {
  if (!isTaggerInitialized) {
    throw new Error(
      "[news-tagger] tagArticleAuto called before initTagger() — initialize at app boot"
    );
  }

  return tagArticle(
    article,
    allDirectRules!,
    allCausalRules!,
    allMetadataRules!
  );
}

/**
 * Check if the tagger is initialized.
 * Useful for health checks and logging.
 */
export function isTaggerReady(): boolean {
  return isTaggerInitialized;
}
