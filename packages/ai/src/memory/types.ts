// ============================================================
// MacroTheme — catégories thématiques macro
// ============================================================
export type MacroTheme =
  | "monetary_policy"    // Fed, ECB, BOJ, BOE, PBOC
  | "inflation"          // CPI, PPI, wages, prix conso
  | "employment"         // NFP, unemployment, jobless claims
  | "gdp_growth"         // PIB, GDP, recession, croissance
  | "geopolitics"        // Wars, sanctions, trade war, tensions
  | "earnings"           // Corporate results, guidance
  | "regulation"         // Crypto reg, banking rules, SEC
  | "commodities"        // Supply/demand, OPEC, pétrole, or
  | "technical"          // Breakouts, key levels (rarement tagger en rules)
  | "risk_sentiment"     // Risk-on/off, VIX spikes, F&G
  | "crypto_market"      // Adoption, halving, DeFi, ETF crypto
  | "central_bank_other" // Banques centrales hors rate decision (QE, bilan, forward guidance)
  | "fiscal_policy"      // Budget, dette, stimulus, shutdown
  | "real_estate"        // Immobilier, housing, mortgage
  | "other";             // Non classifié (upgrade path → Haiku enrichissement)

// ============================================================
// NewsTags — résultat du tagging d'un article
// ============================================================
export interface NewsTags {
  assets: AssetTag[];
  themes: MacroTheme[];
  impact: "high" | "medium" | "low";
  rules_matched: string[];  // IDs des règles qui ont matché (debug/audit)
}

export interface AssetTag {
  symbol: string;             // symbole canonique (ex: "GC=F", "^GSPC", "AAPL")
  sentiment?: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  source_layer: 1 | 2 | 3;   // quelle couche a produit ce tag
}

// ============================================================
// Article stocké en DB
// ============================================================
export interface StoredArticle {
  id?: number;                // auto-increment SQLite
  title: string;
  source: string;             // ex: "CNBC", "ZoneBourse", "Yahoo Finance"
  feed_url?: string;          // URL du feed d'origine (pour mapping tier)
  url: string;                // URL unique de l'article (dedup key)
  published_at: string;       // ISO 8601
  summary?: string;           // résumé ou description RSS
  lang?: "en" | "fr";
  category?: string;          // catégorie RSS d'origine
  snapshot_date?: string;     // date du snapshot qui a ingéré cet article
  impact?: "high" | "medium" | "low";  // impact level from tagging
}

// ============================================================
// Economic Event (sync Supabase → SQLite)
// ============================================================
export interface EconomicEvent {
  id: string;                 // event_key Supabase
  name: string;
  currency?: string;          // "USD", "EUR", "JPY", etc.
  event_date: string;         // ISO date
  strength?: "Strong" | "Moderate" | "Weak";
  forecast?: number;
  previous?: number;
  actual?: number;
  outcome?: "beat" | "miss" | "inline" | "pending";
  source: string;             // "forexfactory"
  synced_at?: string;
}

// ============================================================
// Interfaces de configuration des règles
// ============================================================

/** Couche 1 — Matching direct asset */
export interface DirectMatchRule {
  id: string;                   // ex: "direct_gold", "direct_sp500"
  patterns: string[];           // lowercase, matchés dans title + summary
  asset: string;                // symbole canonique
  word_boundary: boolean;       // true pour les mots courts/ambigus ("or", "cat", "ubs")
  related_index?: string;       // si stock → indice parent (AAPL → ^GSPC)
}

/** Couche 2 — Règle causale */
export interface CausalRule {
  id: string;                   // ex: "fed_rate", "opec_oil"
  triggers: string[];           // mots-clés activateurs (FR + EN mélangés)
  modifiers?: {
    bullish: string[];          // direction haussière
    bearish: string[];          // direction baissière
  };
  assets: string[];             // assets impactés
  theme: MacroTheme;
  sentiment_map?: {
    bullish_modifier: Record<string, "bullish" | "bearish">;
    bearish_modifier: Record<string, "bullish" | "bearish">;
  };
  confidence: "high" | "medium";
  min_triggers?: number;        // défaut 1, mettre 2 pour les ambigus
  exclude_patterns?: string[];  // patterns qui annulent le match (faux positifs connus)
}

/** Couche 3 — Metadata source */
export interface MetadataRule {
  id: string;
  source_patterns: string[];    // substring match sur source name ou feed URL
  default_theme: MacroTheme;
  default_assets?: string[];    // optionnel, ex: CoinDesk → BTC-USD
}

/** Tier source pour impact scoring */
export interface SourceTier {
  patterns: string[];           // substring match sur source name ou feed URL
  tier: 1 | 2 | 3;
}
