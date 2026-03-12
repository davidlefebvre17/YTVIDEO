// ============================================================
// News Memory (D2) Barrel Export
// ============================================================

// Types
export type {
  MacroTheme,
  NewsTags,
  AssetTag,
  StoredArticle,
  EconomicEvent,
  DirectMatchRule,
  CausalRule,
  MetadataRule,
  SourceTier,
} from "./types";

// Tagging Rules
export {
  normalizeText,
  matchPattern,
  DIRECT_MATCH_RULES,
  STOCK_ALIAS_RULES,
  CAUSAL_RULES,
  METADATA_RULES,
  SOURCE_TIERS,
  getSourceTier,
  computeImpact,
  generateStockDirectRules,
} from "./tagging-rules";

// News Tagger
export {
  tagArticle,
  tagArticleAuto,
  initTagger,
  isTaggerReady,
} from "./news-tagger";

// News Memory DB
export { NewsMemoryDB } from "./news-db";

// Research Context Builder
export { buildResearchContext } from "./research-context";
