# D2 — News Memory & Research Brief — Spec d'implémentation complète

> **Ce document est la spec UNIQUE pour implémenter le Bloc D2.**
> Il contient TOUTES les décisions prises, TOUTES les règles de tagging,
> TOUS les edge cases identifiés. Claude Code doit suivre ce doc, pas le BLUEPRINT (qui reste la vision globale).
>
> Dernière mise à jour : 2026-03-11

---

## 0. Décisions prises (brainstorm)

| Question | Décision |
|----------|----------|
| SQLite package | `better-sqlite3` — synchrone, rapide, FTS5 built-in, standard Node. Build natif OK (Windows + Linux). |
| Placement code | `packages/ai/src/memory/` pour tout (news-db, tagger, research-context, tagging-rules, types). Pas de package séparé. |
| FR + EN triggers | **Ensemble** dans le même array — un article FR ou EN matche les mêmes règles. |
| Sentiment dans les règles | **Oui**, sentiment "théorique" avec `confidence: "medium"` dans les règles causales. Opus nuance à l'écriture. |
| Nombre de règles causales | **20 règles V1**, expansion après 2 semaines de data réelle. |
| Backfill | **Oui** — backfill snapshots existants + Finnhub company-news historique + Marketaux 30j. |
| Table economic_events | **Oui** — sync Supabase → SQLite local intégrée dans D2. |
| Retention | **6 mois (180 jours)** — cron mensuel de purge. |

---

## 1. Architecture fichiers

```
packages/ai/src/memory/
  types.ts              # Types + MacroTheme enum
  tagging-rules.ts      # TOUTES les règles (direct match, causales, metadata, tiers)
  news-tagger.ts        # Moteur de tagging (applique les règles sur un article)
  news-db.ts            # SQLite wrapper (init, store, search, purge)
  research-context.ts   # Construit le contexte historique formaté pour Opus
  index.ts              # Re-exports publics

scripts/
  backfill-news.ts      # CLI backfill snapshots existants + Marketaux
```

---

## 2. Types (`types.ts`)

```typescript
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
```

---

## 3. Règles de tagging complètes (`tagging-rules.ts`)

### 3.1 Normalisation du texte (CRITIQUE)

Avant tout matching, le texte (title + summary) doit être normalisé :

```typescript
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Accents FR → ASCII (é→e, è→e, ê→e, à→a, ù→u, ç→c, ô→o, î→i, û→u, ë→e, ï→i, ü→u)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Ponctuation → espaces (pour word boundary matching)
    .replace(/['']/g, " ")     // apostrophes typographiques
    .replace(/[""«»]/g, " ")   // guillemets
    .replace(/[-–—]/g, " ")    // tirets
    .replace(/[.,;:!?()[\]{}]/g, " ")
    // Multi-espaces → simple
    .replace(/\s+/g, " ")
    .trim();
}
```

**ATTENTION** : la normalisation doit transformer `"L'or franchit"` en `"l or franchit"` (l'apostrophe devient espace). Cela permet à `"or"` en word boundary de matcher dans `"cours de l or"`.

### 3.2 Matching : word boundary vs substring

Deux modes de matching :

```typescript
/**
 * Cherche un pattern dans le texte normalisé.
 * Si wordBoundary=true, le pattern doit être entouré d'espaces ou en début/fin de string.
 * Si wordBoundary=false, simple substring match (indexOf).
 */
export function matchPattern(
  normalizedText: string,
  pattern: string,
  wordBoundary: boolean
): boolean {
  if (wordBoundary) {
    // Regex avec \b ne marche pas bien avec les chiffres/symboles
    // On utilise une approche par espaces sur le texte déjà normalisé
    const padded = ` ${normalizedText} `;
    return padded.includes(` ${pattern} `);
  }
  return normalizedText.includes(pattern);
}
```

### 3.3 Couche 1 — Direct Match Rules

#### 3.3.a Watchlist 38 assets (dictionnaire statique ~200 entrées)

```typescript
export const DIRECT_MATCH_RULES: DirectMatchRule[] = [
  // ==================== INDICES ====================
  {
    id: "direct_sp500",
    patterns: ["s&p 500", "s&p500", "sp500", "spx", "^gspc", "standard & poor"],
    asset: "^GSPC",
    word_boundary: false, // "S&P" est assez spécifique
  },
  {
    id: "direct_nasdaq",
    patterns: ["nasdaq", "^ixic", "nasdaq composite", "nasdaq 100", "qqq", "ndx"],
    asset: "^IXIC",
    word_boundary: false,
  },
  {
    id: "direct_djia",
    patterns: ["dow jones", "dow", "^dji", "djia"],
    asset: "^DJI",
    word_boundary: true, // "dow" seul peut être ambigu mais rare
  },
  {
    id: "direct_vix",
    patterns: ["vix", "^vix", "indice de la peur", "fear index", "volatility index", "cboe volatility"],
    asset: "^VIX",
    word_boundary: true, // "vix" court
  },
  {
    id: "direct_cac40",
    patterns: ["cac 40", "cac40", "^fchi", "cac quarante"],
    asset: "^FCHI",
    word_boundary: false,
    // NOTE: "cac" seul est ambigu (Crédit Agricole) — on ne le met PAS seul
  },
  {
    id: "direct_dax",
    patterns: ["dax 40", "dax40", "^gdaxi", "dax"],
    asset: "^GDAXI",
    word_boundary: true, // "dax" court
  },
  {
    id: "direct_ftse",
    patterns: ["ftse 100", "ftse100", "^ftse", "footsie", "ftse"],
    asset: "^FTSE",
    word_boundary: true,
  },
  {
    id: "direct_stoxx",
    patterns: ["stoxx 600", "stoxx600", "eurostoxx", "euro stoxx", "^stoxx"],
    asset: "^STOXX",
    word_boundary: false,
  },
  {
    id: "direct_nikkei",
    patterns: ["nikkei", "nikkei 225", "^n225", "bourse de tokyo", "tokyo stock"],
    asset: "^N225",
    word_boundary: false,
  },
  {
    id: "direct_shanghai",
    patterns: ["shanghai composite", "shanghai", "sse composite", "000001.ss", "bourse de shanghai"],
    asset: "000001.SS",
    word_boundary: true, // "shanghai" peut référer à la ville hors contexte bourse
  },
  {
    id: "direct_hangseng",
    patterns: ["hang seng", "hsi", "^hsi", "hong kong bourse", "bourse de hong kong"],
    asset: "^HSI",
    word_boundary: false,
  },
  {
    id: "direct_shenzhen",
    patterns: ["shenzhen component", "399001.sz", "shenzhen"],
    asset: "399001.SZ",
    word_boundary: true,
  },
  {
    id: "direct_kospi",
    patterns: ["kospi", "^ks11", "bourse de seoul", "bourse coreenne"],
    asset: "^KS11",
    word_boundary: true,
  },

  // ==================== FOREX ====================
  {
    id: "direct_dxy",
    patterns: ["dollar index", "dxy", "dx-y.nyb", "indice dollar", "usd index"],
    asset: "DX-Y.NYB",
    word_boundary: false,
  },
  {
    id: "direct_eurusd",
    patterns: ["eur/usd", "eurusd", "euro dollar", "euro/dollar", "eurusd=x"],
    asset: "EURUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_usdjpy",
    patterns: ["usd/jpy", "usdjpy", "dollar yen", "usdjpy=x"],
    asset: "USDJPY=X",
    word_boundary: false,
  },
  {
    id: "direct_gbpusd",
    patterns: ["gbp/usd", "gbpusd", "livre sterling dollar", "cable", "gbpusd=x"],
    asset: "GBPUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_usdchf",
    patterns: ["usd/chf", "usdchf", "dollar franc suisse", "usdchf=x"],
    asset: "USDCHF=X",
    word_boundary: false,
  },
  {
    id: "direct_audusd",
    patterns: ["aud/usd", "audusd", "dollar australien", "aussie", "audusd=x"],
    asset: "AUDUSD=X",
    word_boundary: true, // "aussie" pourrait être ambigu
  },
  {
    id: "direct_usdcad",
    patterns: ["usd/cad", "usdcad", "dollar canadien", "loonie", "usdcad=x"],
    asset: "USDCAD=X",
    word_boundary: false,
  },
  {
    id: "direct_nzdusd",
    patterns: ["nzd/usd", "nzdusd", "dollar neo zelandais", "kiwi dollar", "nzdusd=x"],
    asset: "NZDUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_eurgbp",
    patterns: ["eur/gbp", "eurgbp", "euro livre", "eurgbp=x"],
    asset: "EURGBP=X",
    word_boundary: false,
  },
  {
    id: "direct_eurjpy",
    patterns: ["eur/jpy", "eurjpy", "euro yen", "eurjpy=x"],
    asset: "EURJPY=X",
    word_boundary: false,
  },
  {
    id: "direct_gbpjpy",
    patterns: ["gbp/jpy", "gbpjpy", "livre yen", "gbpjpy=x"],
    asset: "GBPJPY=X",
    word_boundary: false,
  },

  // ==================== COMMODITIES ====================
  {
    id: "direct_gold",
    patterns: [
      "xauusd", "xau/usd", "gc=f", "gold price", "gold futures",
      "cours de l or", "once d or", "prix de l or", "or spot",
      "gold rallies", "gold drops", "gold surges", "gold falls",
      "lingot", "valeur refuge or"
    ],
    asset: "GC=F",
    word_boundary: false,
    // NOTE: "gold" seul en substring match — OK car quasi-toujours le métal en finance
    // NOTE: "or" SEUL n'est PAS dans la liste — trop de faux positifs (conjonction FR)
  },
  {
    id: "direct_gold_fr_keyword",
    // Cas spéciaux FR où "or" apparaît dans des expressions composées
    patterns: ["marche de l or", "mine d or", "production d or", "reserve d or", "demande d or",
               "offre d or", "investir dans l or", "l or a", "l or en", "l or monte",
               "l or baisse", "l or recule", "l or progresse"],
    asset: "GC=F",
    word_boundary: false,
  },
  {
    id: "direct_silver",
    patterns: ["silver", "argent metal", "xagusd", "xag/usd", "si=f", "silver price",
               "cours de l argent", "once d argent", "silver futures"],
    asset: "SI=F",
    word_boundary: false,
    // NOTE: "argent" seul est ambigu (money vs metal) → on met des expressions composées
  },
  {
    id: "direct_copper",
    patterns: ["copper", "cuivre", "hg=f", "copper futures", "dr copper", "doctor copper",
               "cours du cuivre", "copper price"],
    asset: "HG=F",
    word_boundary: true,
  },
  {
    id: "direct_oil_wti",
    patterns: ["wti", "cl=f", "west texas", "crude oil", "petrole wti", "wti crude",
               "oil futures", "cours du petrole", "prix du petrole", "baril de petrole",
               "petrole brut"],
    asset: "CL=F",
    word_boundary: false,
  },
  {
    id: "direct_oil_brent",
    patterns: ["brent", "bz=f", "brent crude", "brent oil", "petrole brent"],
    asset: "BZ=F",
    word_boundary: true,
  },
  {
    id: "direct_natgas",
    patterns: ["natural gas", "gaz naturel", "ng=f", "natgas", "henry hub"],
    asset: "NG=F",
    word_boundary: false,
  },
  {
    id: "direct_wheat",
    patterns: ["wheat", "ble", "zw=f", "wheat futures", "cours du ble", "prix du ble"],
    asset: "ZW=F",
    word_boundary: true,
  },
  {
    id: "direct_platinum",
    patterns: ["platinum", "platine", "pl=f", "platinum futures", "cours du platine"],
    asset: "PL=F",
    word_boundary: true,
  },

  // ==================== CRYPTO ====================
  {
    id: "direct_btc",
    patterns: ["bitcoin", "btc", "btc-usd", "btc/usd", "btcusd",
               "satoshi", "halvingbitcoin", "bitcoin halving"],
    asset: "BTC-USD",
    word_boundary: true, // "btc" est court
  },
  {
    id: "direct_eth",
    patterns: ["ethereum", "eth", "eth-usd", "eth/usd", "ethusd", "ether"],
    asset: "ETH-USD",
    word_boundary: true,
  },
  {
    id: "direct_sol",
    patterns: ["solana", "sol-usd", "sol/usd", "solusd"],
    asset: "SOL-USD",
    word_boundary: false,
    // NOTE: "sol" seul en FR = soleil → on ne met PAS "sol" seul
  },

  // ==================== ETFs SECTORIELS ====================
  {
    id: "direct_xlk",
    patterns: ["xlk", "tech sector etf", "technology select sector"],
    asset: "XLK",
    word_boundary: true,
  },
  {
    id: "direct_xlf",
    patterns: ["xlf", "financial sector etf", "financial select sector"],
    asset: "XLF",
    word_boundary: true,
  },
  {
    id: "direct_xle",
    patterns: ["xle", "energy sector etf", "energy select sector"],
    asset: "XLE",
    word_boundary: true,
  },

  // ==================== YIELDS (pseudo-assets) ====================
  {
    id: "direct_us10y",
    patterns: ["us 10 year", "us10y", "10 year treasury", "treasury 10y",
               "taux 10 ans", "obligation 10 ans", "yield 10y", "10y yield",
               "rendement 10 ans", "us 10y"],
    asset: "US10Y",
    word_boundary: false,
  },
  {
    id: "direct_us2y",
    patterns: ["us 2 year", "us2y", "2 year treasury", "treasury 2y",
               "taux 2 ans", "obligation 2 ans"],
    asset: "US2Y",
    word_boundary: false,
  },
];
```

#### 3.3.b Auto-génération depuis company-profiles (763 stocks)

En plus du dictionnaire statique ci-dessus, on auto-génère des règles depuis `company-profiles.ts` existant :

```typescript
/**
 * Génère des DirectMatchRule pour chaque stock des company-profiles.
 * Appelé une fois au boot (pas à chaque article).
 *
 * Source : packages/data/src/company-profiles.ts
 * Contient ~763 entrées avec { symbol, name, sector, index }
 */
export function generateStockDirectRules(
  profiles: Array<{ symbol: string; name: string; index: string }>
): DirectMatchRule[] {
  return profiles.map((p) => {
    const patterns: string[] = [];

    // 1. Ticker toujours (ex: "AAPL", "MSFT")
    patterns.push(p.symbol.toLowerCase());

    // 2. Nom complet lowercase (ex: "apple inc", "microsoft corporation")
    const nameLower = p.name.toLowerCase();
    patterns.push(nameLower);

    // 3. Nom court (avant "inc", "corp", "ltd", "sa", "se", "plc", "ag", "nv", "group")
    const suffixes = /\s+(inc\.?|corp\.?|corporation|ltd\.?|limited|sa|se|plc|ag|nv|group|co\.?|& co\.?)$/i;
    const shortName = nameLower.replace(suffixes, "").trim();
    if (shortName !== nameLower && shortName.length > 2) {
      patterns.push(shortName);
    }

    return {
      id: `direct_stock_${p.symbol.toLowerCase()}`,
      patterns,
      asset: p.symbol,
      word_boundary: p.symbol.length <= 3, // Tickers courts (UBS, CAT, F) → word boundary
      related_index: p.index === "SP500" ? "^GSPC"
                   : p.index === "CAC40" ? "^FCHI"
                   : p.index === "DAX40" ? "^GDAXI"
                   : p.index === "FTSE100" ? "^FTSE"
                   : p.index === "NIKKEI50" ? "^N225"
                   : p.index === "HSI30" ? "^HSI"
                   : undefined,
    };
  });
}
```

**Edge cases stocks à traiter** :
- `CAT` (Caterpillar) → word_boundary=true obligatoire
- `F` (Ford) → word_boundary=true, mais "f" seul va quand même matcher partout → **EXCLURE les tickers de 1 caractère du matching par pattern, les identifier uniquement par nom complet**
- `GOOG` vs `GOOGL` → les deux pointent vers Alphabet, garder les deux
- Noms FR de sociétés : "TotalEnergies" est dans les profils, mais les articles FR disent "Total" → le shortName le capture
- Sociétés avec des noms communs : "Apple" (le fruit), "Meta" (le préfixe), "Visa" (le document) → en contexte finance c'est quasi-toujours la société. Le taux de faux positif est acceptable. On ne met PAS de word_boundary sur les noms de société > 3 lettres.

**Règle de sécurité** : tout ticker de longueur ≤ 1 caractère est ignoré dans le matching pattern (seul le nom complet matche). Pour longueur 2-3, word_boundary=true obligatoire.

### 3.4 Couche 2 — Règles causales (20 règles V1)

```typescript
export const CAUSAL_RULES: CausalRule[] = [

  // ================================================================
  // POLITIQUE MONÉTAIRE (5 règles)
  // ================================================================

  {
    id: "fed_rate",
    triggers: [
      "fed", "fomc", "federal reserve", "jerome powell", "powell",
      "reserve federale", "banque centrale americaine",
      "taux directeur americain", "fed funds", "federal open market"
    ],
    modifiers: {
      bullish: [
        "cut", "pause", "dovish", "baisse", "accommodant", "assouplissement",
        "lower", "easing", "pivot", "souple", "reduction", "dovish tilt"
      ],
      bearish: [
        "hike", "hawkish", "hausse", "restrictif", "resserrement", "durcissement",
        "raise", "tightening", "higher for longer", "aggressive", "plus haut plus longtemps"
      ],
    },
    assets: ["GC=F", "DX-Y.NYB", "^GSPC", "US10Y"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "GC=F": "bullish",        // Fed dovish → or monte (dollar faiblit)
        "DX-Y.NYB": "bearish",   // Fed dovish → dollar baisse
        "^GSPC": "bullish",      // Fed dovish → actions montent (liquidité)
        "US10Y": "bearish",      // Fed dovish → yields baissent
      },
      bearish_modifier: {
        "GC=F": "bearish",
        "DX-Y.NYB": "bullish",
        "^GSPC": "bearish",
        "US10Y": "bullish",
      },
    },
    confidence: "medium",
  },

  {
    id: "ecb_rate",
    triggers: [
      "ecb", "bce", "lagarde", "christine lagarde",
      "banque centrale europeenne", "european central bank",
      "taux directeur europeen", "taux de la bce"
    ],
    modifiers: {
      bullish: ["cut", "pause", "dovish", "baisse", "accommodant", "assouplissement", "easing"],
      bearish: ["hike", "hawkish", "hausse", "restrictif", "resserrement", "tightening"],
    },
    assets: ["EURUSD=X", "^FCHI", "^STOXX"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "EURUSD=X": "bearish",   // BCE dovish → euro faiblit
        "^FCHI": "bullish",      // BCE dovish → actions EU montent
        "^STOXX": "bullish",
      },
      bearish_modifier: {
        "EURUSD=X": "bullish",
        "^FCHI": "bearish",
        "^STOXX": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "boj_rate",
    triggers: [
      "boj", "bank of japan", "banque du japon", "ueda", "kazuo ueda",
      "politique monetaire japonaise", "taux japonais", "yield curve control", "ycc"
    ],
    modifiers: {
      bullish: ["cut", "dovish", "unchanged", "maintien", "statu quo", "ultra loose", "negatif"],
      bearish: ["hike", "hawkish", "hausse", "exit ycc", "normalisation", "abandon ycc"],
    },
    assets: ["USDJPY=X", "^N225", "EURJPY=X"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "USDJPY=X": "bullish",   // BOJ dovish → yen faiblit → USD/JPY monte
        "^N225": "bullish",      // BOJ dovish → Nikkei monte (liquidité)
        "EURJPY=X": "bullish",
      },
      bearish_modifier: {
        "USDJPY=X": "bearish",
        "^N225": "bearish",
        "EURJPY=X": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "boe_rate",
    triggers: [
      "boe", "bank of england", "banque d angleterre", "bailey", "andrew bailey",
      "taux britannique", "monetary policy committee", "mpc"
    ],
    modifiers: {
      bullish: ["cut", "dovish", "baisse", "pause", "easing"],
      bearish: ["hike", "hawkish", "hausse", "tightening"],
    },
    assets: ["GBPUSD=X", "^FTSE"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: { "GBPUSD=X": "bearish", "^FTSE": "bullish" },
      bearish_modifier: { "GBPUSD=X": "bullish", "^FTSE": "bearish" },
    },
    confidence: "medium",
  },

  {
    id: "pboc_rate",
    triggers: [
      "pboc", "people s bank of china", "banque populaire de chine",
      "taux chinois", "lpr", "loan prime rate", "rrr", "reserve requirement"
    ],
    modifiers: {
      bullish: ["cut", "baisse", "stimulus", "injection", "easing", "assouplissement"],
      bearish: ["hike", "hausse", "tightening", "resserrement"],
    },
    assets: ["^HSI", "000001.SS", "HG=F"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: { "^HSI": "bullish", "000001.SS": "bullish", "HG=F": "bullish" },
      bearish_modifier: { "^HSI": "bearish", "000001.SS": "bearish", "HG=F": "bearish" },
    },
    confidence: "medium",
  },

  // ================================================================
  // DONNÉES MACRO (5 règles)
  // ================================================================

  {
    id: "inflation_data",
    triggers: [
      "inflation", "cpi", "ppi", "consumer price", "producer price",
      "prix a la consommation", "indice des prix", "core inflation",
      "inflation sous jacente", "pce", "personal consumption expenditure",
      "deflation", "desinflation", "disinflationary"
    ],
    modifiers: {
      bullish: [  // inflation HAUTE = bullish gold
        "above", "beat", "hot", "higher than", "accelerating", "surprise",
        "au dessus", "superieur", "acceleration", "hausse"
      ],
      bearish: [  // inflation BASSE = bearish gold
        "below", "miss", "cool", "lower than", "decelerating", "slowing",
        "en dessous", "inferieur", "deceleration", "baisse", "ralentissement"
      ],
    },
    assets: ["GC=F", "DX-Y.NYB", "^VIX", "US10Y"],
    theme: "inflation",
    sentiment_map: {
      bullish_modifier: {  // inflation haute
        "GC=F": "bullish",        // inflation → or refuge
        "DX-Y.NYB": "bullish",   // inflation → Fed hawkish anticipé → dollar monte
        "^VIX": "bullish",       // incertitude
        "US10Y": "bullish",      // yields montent
      },
      bearish_modifier: {  // inflation basse
        "GC=F": "bearish",
        "DX-Y.NYB": "bearish",
        "^VIX": "bearish",
        "US10Y": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "employment_data",
    triggers: [
      "nfp", "non farm payroll", "payrolls", "jobs report", "employment",
      "unemployment", "jobless claims", "initial claims", "chomage",
      "taux de chomage", "emploi americain", "marche de l emploi",
      "adp employment", "jolts", "job openings", "labour market", "labor market"
    ],
    modifiers: {
      bullish: [  // emploi FORT
        "beat", "strong", "above", "robust", "surging", "hot",
        "superieur", "solide", "dynamique", "au dessus"
      ],
      bearish: [  // emploi FAIBLE
        "miss", "weak", "below", "declining", "slowing", "rising unemployment",
        "inferieur", "faible", "en baisse", "hausse du chomage"
      ],
    },
    assets: ["DX-Y.NYB", "^GSPC", "US10Y"],
    theme: "employment",
    sentiment_map: {
      bullish_modifier: {  // emploi fort → dollar monte, yields montent, actions mitigées
        "DX-Y.NYB": "bullish",
        "^GSPC": "neutral",     // dépend si "too hot" ou Goldilocks
        "US10Y": "bullish",
      },
      bearish_modifier: {  // emploi faible
        "DX-Y.NYB": "bearish",
        "^GSPC": "bearish",
        "US10Y": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "gdp_growth",
    triggers: [
      "gdp", "pib", "gross domestic product", "produit interieur brut",
      "economic growth", "croissance economique", "recession",
      "contraction", "soft landing", "atterrissage en douceur",
      "hard landing", "stagflation"
    ],
    assets: ["^GSPC", "DX-Y.NYB", "US10Y"],
    theme: "gdp_growth",
    confidence: "medium",
    // Pas de sentiment_map : le sentiment dépend trop du contexte
    // (recession = bearish actions mais aussi dovish Fed = bullish actions)
  },

  {
    id: "retail_consumer",
    triggers: [
      "retail sales", "consumer spending", "consumer confidence",
      "consumer sentiment", "university of michigan", "michigan sentiment",
      "ventes au detail", "consommation des menages", "confiance des consommateurs",
      "depenses de consommation"
    ],
    assets: ["^GSPC"],
    theme: "gdp_growth",
    confidence: "medium",
  },

  {
    id: "pmi_ism",
    triggers: [
      "pmi", "ism", "purchasing managers", "manufacturing pmi", "services pmi",
      "indice pmi", "indice ism", "indice manufacturier", "indice des directeurs d achat",
      "flash pmi", "composite pmi", "pmi manufacturier", "pmi services"
    ],
    assets: ["^GSPC", "DX-Y.NYB"],
    theme: "gdp_growth",
    confidence: "medium",
  },

  // ================================================================
  // GÉOPOLITIQUE ET COMMODITIES (4 règles)
  // ================================================================

  {
    id: "opec_oil",
    triggers: [
      "opec", "opep", "opec+", "opec plus",
      "production petroliere", "oil production", "oil output",
      "quota petrole", "oil quota", "oil supply cut",
      "arabie saoudite petrole", "saudi oil", "saudi arabia oil"
    ],
    modifiers: {
      bullish: [  // cut = bullish oil
        "cut", "reduction", "baisse production", "restrict", "quotas"
      ],
      bearish: [  // increase = bearish oil
        "increase", "raise", "augmentation", "hausse production", "boost output"
      ],
    },
    assets: ["CL=F", "BZ=F"],
    theme: "commodities",
    sentiment_map: {
      bullish_modifier: { "CL=F": "bullish", "BZ=F": "bullish" },
      bearish_modifier: { "CL=F": "bearish", "BZ=F": "bearish" },
    },
    confidence: "high", // OPEC → oil est très direct
  },

  {
    id: "trade_war",
    triggers: [
      "tariff", "tariffs", "droits de douane", "trade war", "guerre commerciale",
      "trade tensions", "tensions commerciales", "sanctions economiques",
      "trade deficit", "deficit commercial", "protectionism", "protectionnisme",
      "embargo", "import duty", "export ban", "trade restrictions"
    ],
    assets: ["DX-Y.NYB", "^GSPC", "GC=F"],
    theme: "geopolitics",
    sentiment_map: {
      // Les tariffs/trade war sont généralement :
      // bullish dollar (US impose), bearish actions (uncertainty), bullish or (refuge)
      // Mais pas de modifier ici — le contexte est trop variable
      bullish_modifier: {},
      bearish_modifier: {},
    },
    confidence: "medium",
  },

  {
    id: "geopolitical_tension",
    triggers: [
      "guerre", "war", "conflit", "conflict", "missile", "frappe",
      "strike", "invasion", "militaire", "military", "tensions",
      "escalade", "escalation", "bombardement", "bombing",
      "nuclear", "nucleaire", "ceasefire", "cessez le feu",
      "armistice", "peace deal", "accord de paix"
    ],
    assets: ["GC=F", "CL=F", "^VIX"],
    theme: "geopolitics",
    confidence: "medium",
    min_triggers: 1,
    // NOTE: "tensions" seul est vague — les articles l'utilisent souvent dans un contexte
    // géopolitique mais pas toujours. On le garde avec confidence medium.
    // L'upgrade serait min_triggers: 2 si trop de faux positifs.
  },

  {
    id: "china_macro",
    triggers: [
      "chine", "china", "chinois", "chinese", "pekin", "beijing",
      "stimulus chinois", "china stimulus", "deflation chinoise", "china deflation",
      "yuan", "renminbi", "cny", "evergrande", "property crisis china",
      "crise immobiliere chinoise"
    ],
    assets: ["^HSI", "000001.SS", "HG=F", "CL=F"],
    theme: "geopolitics",
    confidence: "medium",
    min_triggers: 1,
    exclude_patterns: ["chinese food", "cuisine chinoise", "chinese new year"],
  },

  // ================================================================
  // EARNINGS ET CORPORATE (2 règles)
  // ================================================================

  {
    id: "earnings_generic",
    triggers: [
      "earnings", "resultats", "benefice", "benefices", "chiffre d affaires",
      "revenue", "guidance", "profit warning", "avertissement sur resultats",
      "earnings season", "saison des resultats", "quarterly results",
      "resultats trimestriels", "eps", "earnings per share",
      "beat expectations", "miss expectations"
    ],
    assets: [],  // PAS d'asset par défaut — dépend du matching couche 1
    theme: "earnings",
    confidence: "medium",
    // Cette règle tague le THEME uniquement.
    // Les assets viennent du matching couche 1 (quelle société est mentionnée).
  },

  {
    id: "mega_cap_earnings",
    // Quand une mega cap publie, ça impacte les indices
    triggers: [
      "apple earnings", "microsoft earnings", "google earnings", "alphabet earnings",
      "amazon earnings", "nvidia earnings", "meta earnings", "tesla earnings",
      "magnificent seven", "mag 7", "mag7", "big tech earnings",
      "resultats apple", "resultats microsoft", "resultats nvidia",
      "resultats google", "resultats amazon", "resultats meta", "resultats tesla",
      "gafam", "faang"
    ],
    assets: ["^GSPC", "^IXIC"],
    theme: "earnings",
    confidence: "high",
    // Les assets individuels (AAPL, MSFT, etc.) sont taggés par couche 1.
    // Cette règle AJOUTE les indices car les mega caps bougent les indices.
  },

  // ================================================================
  // CRYPTO (2 règles)
  // ================================================================

  {
    id: "crypto_regulation",
    triggers: [
      "sec crypto", "sec bitcoin", "sec ethereum",
      "crypto regulation", "regulation crypto", "reglementation crypto",
      "gensler", "gary gensler", "stablecoin regulation",
      "crypto ban", "interdiction crypto",
      "bitcoin etf", "ethereum etf", "spot etf", "etf bitcoin", "etf crypto",
      "mifid crypto", "mica regulation"
    ],
    assets: ["BTC-USD", "ETH-USD", "SOL-USD"],
    theme: "regulation",
    confidence: "medium",
  },

  {
    id: "crypto_adoption",
    triggers: [
      "bitcoin adoption", "adoption crypto", "institutional crypto",
      "institutional bitcoin", "crypto institutional",
      "halving", "bitcoin halving", "halvening",
      "whale", "whale alert", "whale transfer",
      "defi", "decentralized finance", "finance decentralisee",
      "nft market", "marche nft"
    ],
    assets: ["BTC-USD", "ETH-USD"],
    theme: "crypto_market",
    confidence: "medium",
  },

  // ================================================================
  // SENTIMENT ET RISK (2 règles)
  // ================================================================

  {
    id: "risk_sentiment",
    triggers: [
      "risk off", "risk-off", "aversion au risque", "risk aversion",
      "fuite vers la qualite", "flight to quality", "flight to safety",
      "safe haven", "valeur refuge", "risk appetite", "appetit pour le risque",
      "risk on", "risk-on", "rally", "selloff", "sell off", "sell-off",
      "correction", "bear market", "bull market", "marche baissier", "marche haussier",
      "capitulation", "panic selling", "vente panique"
    ],
    assets: ["^VIX", "GC=F", "USDJPY=X", "^GSPC"],
    theme: "risk_sentiment",
    confidence: "medium",
  },

  {
    id: "banking_crisis",
    triggers: [
      "bank run", "bank failure", "faillite bancaire", "bank collapse",
      "banking crisis", "crise bancaire", "liquidity crisis", "crise de liquidite",
      "bank stress", "stress bancaire", "bank contagion", "contagion bancaire",
      "deposit flight", "fuite des depots", "svb", "silicon valley bank",
      "credit suisse", "systemic risk", "risque systemique"
    ],
    assets: ["^VIX", "GC=F", "^GSPC", "BTC-USD", "XLF"],
    theme: "risk_sentiment",
    confidence: "high",
  },
];
```

### 3.5 Couche 3 — Metadata source

```typescript
export const METADATA_RULES: MetadataRule[] = [
  // Crypto
  {
    id: "meta_coindesk",
    source_patterns: ["coindesk", "coindesk.com"],
    default_theme: "crypto_market",
    default_assets: ["BTC-USD"],
  },
  {
    id: "meta_cointelegraph",
    source_patterns: ["cointelegraph", "cointelegraph.com"],
    default_theme: "crypto_market",
    default_assets: ["BTC-USD"],
  },

  // Forex
  {
    id: "meta_fxstreet",
    source_patterns: ["fxstreet", "fxstreet.com"],
    default_theme: "other", // FXStreet couvre trop de sujets pour un thème par défaut
  },

  // Commodities FR
  {
    id: "meta_investing_commodities",
    source_patterns: ["fr.investing.com/rss/commodities"],
    default_theme: "commodities",
  },

  // Forex FR
  {
    id: "meta_investing_forex",
    source_patterns: ["fr.investing.com/rss/forex"],
    default_theme: "other",
  },

  // Google News cibles (on tag par la query d'origine, pas par Google News)
  // Le tag se fait via le champ `category` du feed, pas ici.
];
```

### 3.6 Source Tiers pour Impact Scoring

```typescript
export const SOURCE_TIERS: SourceTier[] = [
  // ========== TIER 1 — Journalisme pro, sources primaires ==========
  { patterns: ["reuters", "afp"], tier: 1 },
  { patterns: ["cnbc.com", "cnbc"], tier: 1 },
  { patterns: ["les echos", "lesechos", "feedburner.com/lesechos"], tier: 1 },
  { patterns: ["l agefi", "agefi.fr", "lagefi"], tier: 1 },
  { patterns: ["financial times", "ft.com"], tier: 1 },
  { patterns: ["wall street journal", "wsj"], tier: 1 },
  { patterns: ["bloomberg"], tier: 1 },
  { patterns: ["barron s", "barrons"], tier: 1 },
  { patterns: ["finnhub"], tier: 1 },  // Finnhub agrège Reuters/Dow Jones

  // ========== TIER 2 — Sources spécialisées, analyse ==========
  { patterns: ["zonebourse", "zonebourse.com"], tier: 2 },
  { patterns: ["tradingsat", "tradingsat.com", "bfm bourse"], tier: 2 },
  { patterns: ["easybourse", "easybourse.com"], tier: 2 },
  { patterns: ["fxstreet", "fxstreet.com"], tier: 2 },
  { patterns: ["coindesk", "coindesk.com"], tier: 2 },
  { patterns: ["cointelegraph", "cointelegraph.com"], tier: 2 },
  { patterns: ["investing.com", "fr.investing.com"], tier: 2 },
  { patterns: ["bfm business", "bfmbusiness"], tier: 2 },
  { patterns: ["marketwatch"], tier: 2 },
  { patterns: ["zacks"], tier: 2 },
  { patterns: ["motley fool"], tier: 2 },
  { patterns: ["seekingalpha", "seeking alpha"], tier: 2 },

  // ========== TIER 3 — Agrégateurs, blogs, reste ==========
  // Tout ce qui ne matche pas tier 1 ou 2 → tier 3 par défaut
  { patterns: ["yahoo finance", "yahoo"], tier: 3 },  // Yahoo syndique du contenu mixte
  { patterns: ["google news", "news.google"], tier: 3 },
];

/**
 * Détermine le tier d'une source.
 * Cherche dans source name ET feed_url (si disponible).
 * Défaut : tier 3.
 */
export function getSourceTier(source: string, feedUrl?: string): 1 | 2 | 3 {
  const normalizedSource = source.toLowerCase();
  const normalizedFeed = feedUrl?.toLowerCase() ?? "";

  for (const tier of SOURCE_TIERS) {
    for (const pattern of tier.patterns) {
      if (normalizedSource.includes(pattern) || normalizedFeed.includes(pattern)) {
        return tier.tier;
      }
    }
  }
  return 3; // défaut
}
```

### 3.7 Impact Scoring

```typescript
/**
 * Calcule l'impact d'un article à partir de :
 * - Le tier de sa source
 * - Présence d'un keyword fort (trigger couche 2 matché)
 * - Nombre d'assets taggés (proxy de portée macro)
 */
export function computeImpact(
  sourceTier: 1 | 2 | 3,
  hasCausalRuleMatch: boolean,
  assetCount: number
): "high" | "medium" | "low" {
  // Tier 1 + causal rule → always high
  if (sourceTier === 1 && hasCausalRuleMatch) return "high";

  // Tier 1 sans causal, ou Tier 2 + causal → medium
  if (sourceTier === 1) return "medium";
  if (sourceTier === 2 && hasCausalRuleMatch) return "medium";

  // Tier 2 + multi-asset (≥3 assets) → medium (probablement macro)
  if (sourceTier === 2 && assetCount >= 3) return "medium";

  // Tout le reste → low
  return "low";
}
```

---

## 4. Moteur de tagging (`news-tagger.ts`)

### 4.1 Algorithme principal

```typescript
/**
 * Tag un article. Applique les 3 couches séquentiellement.
 * Couche 1 = matching direct, Couche 2 = causales, Couche 3 = metadata.
 * Les résultats sont CUMULATIFS (pas de court-circuit).
 */
export function tagArticle(
  article: { title: string; summary?: string; source: string; feed_url?: string },
  allDirectRules: DirectMatchRule[],  // watchlist + stocks auto-générés
  causalRules: CausalRule[],
  metadataRules: MetadataRule[]
): NewsTags {
  const text = normalizeText(`${article.title} ${article.summary ?? ""}`);
  const assetTags: Map<string, AssetTag> = new Map();  // symbol → tag (dedup)
  const themes: Set<MacroTheme> = new Set();
  const rulesMatched: string[] = [];

  // ===================== COUCHE 1 =====================
  for (const rule of allDirectRules) {
    for (const pattern of rule.patterns) {
      if (matchPattern(text, pattern, rule.word_boundary)) {
        // Asset principal
        if (!assetTags.has(rule.asset)) {
          assetTags.set(rule.asset, {
            symbol: rule.asset,
            sentiment: undefined,       // couche 1 ne donne pas de sentiment
            confidence: "high",         // matching direct = haute confiance
            source_layer: 1,
          });
        }
        // Si stock → tagger aussi l'indice parent
        if (rule.related_index && !assetTags.has(rule.related_index)) {
          assetTags.set(rule.related_index, {
            symbol: rule.related_index,
            sentiment: undefined,
            confidence: "low",          // lien indirect
            source_layer: 1,
          });
        }
        rulesMatched.push(rule.id);
        break;  // Un seul pattern suffit par règle
      }
    }
  }

  // ===================== COUCHE 2 =====================
  for (const rule of causalRules) {
    // Vérifier exclude_patterns
    if (rule.exclude_patterns?.some(p => text.includes(p))) continue;

    // Compter les triggers matchés
    const matchedTriggers = rule.triggers.filter(t => matchPattern(text, t, false));
    const minRequired = rule.min_triggers ?? 1;

    if (matchedTriggers.length >= minRequired) {
      // Déterminer le modifier direction
      let direction: "bullish" | "bearish" | null = null;
      if (rule.modifiers) {
        const hasBullish = rule.modifiers.bullish.some(m => text.includes(m));
        const hasBearish = rule.modifiers.bearish.some(m => text.includes(m));
        if (hasBullish && !hasBearish) direction = "bullish";
        if (hasBearish && !hasBullish) direction = "bearish";
        // Si les deux ou aucun → direction = null (pas de sentiment)
      }

      // Ajouter les assets de la règle causale
      for (const assetSymbol of rule.assets) {
        const existing = assetTags.get(assetSymbol);
        let sentiment: "bullish" | "bearish" | "neutral" | undefined;

        // Sentiment depuis la sentiment_map si direction déterminée
        if (direction && rule.sentiment_map) {
          const map = direction === "bullish"
            ? rule.sentiment_map.bullish_modifier
            : rule.sentiment_map.bearish_modifier;
          sentiment = map[assetSymbol];
        }

        if (!existing || existing.source_layer > 2) {
          assetTags.set(assetSymbol, {
            symbol: assetSymbol,
            sentiment,
            confidence: rule.confidence,
            source_layer: 2,
          });
        } else if (existing && !existing.sentiment && sentiment) {
          // Enrichir un tag couche 1 avec le sentiment couche 2
          existing.sentiment = sentiment;
          existing.confidence = rule.confidence;
        }
      }

      themes.add(rule.theme);
      rulesMatched.push(rule.id);
    }
  }

  // ===================== COUCHE 3 =====================
  const sourceNorm = article.source.toLowerCase();
  const feedNorm = article.feed_url?.toLowerCase() ?? "";

  for (const rule of metadataRules) {
    const matches = rule.source_patterns.some(
      p => sourceNorm.includes(p) || feedNorm.includes(p)
    );
    if (matches) {
      themes.add(rule.default_theme);
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

  // ===================== SCORING =====================
  const sourceTier = getSourceTier(article.source, article.feed_url);
  const hasCausalMatch = rulesMatched.some(id =>
    causalRules.some(r => r.id === id)
  );
  const impact = computeImpact(sourceTier, hasCausalMatch, assetTags.size);

  return {
    assets: Array.from(assetTags.values()),
    themes: Array.from(themes),
    impact,
    rules_matched: rulesMatched,
  };
}
```

### 4.2 Initialisation au boot

```typescript
import { getCompanyProfiles } from "../../data/company-profiles";

let allDirectRules: DirectMatchRule[] | null = null;

export function initTagger(): void {
  const profiles = getCompanyProfiles();  // 763 stocks
  const stockRules = generateStockDirectRules(profiles);
  allDirectRules = [...DIRECT_MATCH_RULES, ...stockRules];

  // Pré-normaliser tous les patterns pour performance
  // (les patterns dans les arrays sont déjà lowercase, mais on s'assure)
  for (const rule of allDirectRules) {
    rule.patterns = rule.patterns.map(p => normalizeText(p));
  }
  for (const rule of CAUSAL_RULES) {
    rule.triggers = rule.triggers.map(t => normalizeText(t));
    if (rule.modifiers) {
      rule.modifiers.bullish = rule.modifiers.bullish.map(m => normalizeText(m));
      rule.modifiers.bearish = rule.modifiers.bearish.map(m => normalizeText(m));
    }
    if (rule.exclude_patterns) {
      rule.exclude_patterns = rule.exclude_patterns.map(p => normalizeText(p));
    }
  }
}
```

---

## 5. SQLite Database (`news-db.ts`)

### 5.1 Dépendance

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### 5.2 Schema complet

```sql
-- ============================================================
-- NEWS ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  feed_url TEXT,
  url TEXT UNIQUE NOT NULL,
  published_at TEXT NOT NULL,
  summary TEXT,
  lang TEXT,                      -- 'en' | 'fr'
  category TEXT,                  -- catégorie RSS d'origine
  impact TEXT,                    -- 'high' | 'medium' | 'low'
  snapshot_date TEXT,             -- date du snapshot
  ingested_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_impact ON articles(impact);
CREATE INDEX IF NOT EXISTS idx_articles_snapshot ON articles(snapshot_date);

-- FTS5 pour recherche full-text
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, summary,
  content=articles,
  content_rowid=id,
  tokenize='porter unicode61'
);

-- Triggers pour sync FTS5 ↔ articles
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary)
  VALUES (new.id, new.title, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary)
  VALUES ('delete', old.id, old.title, old.summary);
END;

-- ============================================================
-- TAGS : ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS article_assets (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  sentiment TEXT,                  -- 'bullish' | 'bearish' | 'neutral' | NULL
  confidence TEXT NOT NULL,        -- 'high' | 'medium' | 'low'
  source_layer INTEGER NOT NULL,   -- 1, 2, ou 3
  PRIMARY KEY (article_id, asset_symbol)
);

CREATE INDEX IF NOT EXISTS idx_article_assets_symbol ON article_assets(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_article_assets_sentiment ON article_assets(sentiment);

-- ============================================================
-- TAGS : THEMES
-- ============================================================
CREATE TABLE IF NOT EXISTS article_themes (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  PRIMARY KEY (article_id, theme)
);

CREATE INDEX IF NOT EXISTS idx_article_themes_theme ON article_themes(theme);

-- ============================================================
-- ECONOMIC EVENTS (sync Supabase → SQLite)
-- ============================================================
CREATE TABLE IF NOT EXISTS economic_events (
  id TEXT PRIMARY KEY,              -- event_key Supabase
  name TEXT NOT NULL,
  currency TEXT,                    -- 'USD', 'EUR', 'JPY', etc.
  event_date TEXT NOT NULL,
  strength TEXT,                    -- 'Strong' | 'Moderate' | 'Weak'
  forecast REAL,
  previous REAL,
  actual REAL,
  outcome TEXT,                     -- 'beat' | 'miss' | 'inline' | 'pending'
  source TEXT DEFAULT 'forexfactory',
  synced_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eco_events_date ON economic_events(event_date);
CREATE INDEX IF NOT EXISTS idx_eco_events_currency ON economic_events(currency);
CREATE INDEX IF NOT EXISTS idx_eco_events_strength ON economic_events(strength);

-- ============================================================
-- DEBUG / AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS tagging_audit (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  rules_matched TEXT NOT NULL,      -- JSON array des rule IDs
  tagged_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (article_id)
);
```

### 5.3 API du wrapper

```typescript
import Database from "better-sqlite3";

export class NewsMemoryDB {
  private db: Database.Database;

  constructor(dbPath: string = "data/news-memory.db") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");     // Performance
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  // ---- INIT ----
  private initSchema(): void { /* CREATE TABLE IF NOT EXISTS ... */ }

  // ---- INGEST ----

  /** Stocke un article + ses tags. Ignore les doublons (url UNIQUE). Retourne l'id ou null si doublon. */
  storeArticle(article: StoredArticle, tags: NewsTags): number | null;

  /** Stocke plusieurs articles en transaction. Retourne le nombre d'articles réellement insérés. */
  storeArticles(articles: Array<{ article: StoredArticle; tags: NewsTags }>): number;

  // ---- SEARCH ----

  /** Articles taggés sur un asset, fenêtre temporelle variable. Trié par published_at DESC. */
  searchByAsset(symbol: string, options: {
    days: number;           // fenêtre en jours (7, 30, 90)
    limit?: number;         // défaut 10
    minImpact?: "high" | "medium" | "low";  // filtrer par impact minimum
    sentiment?: "bullish" | "bearish";       // filtrer par sentiment
  }): Array<StoredArticle & { sentiment?: string; confidence: string }>;

  /** Articles par thème macro. */
  searchByTheme(theme: MacroTheme, options: {
    days: number;
    limit?: number;
    minImpact?: "high" | "medium" | "low";
  }): StoredArticle[];

  /** Recherche full-text BM25 dans title + summary. */
  searchFullText(query: string, options?: {
    days?: number;
    limit?: number;
  }): StoredArticle[];

  /** Articles high impact récents. */
  getHighImpactRecent(days: number, limit?: number): StoredArticle[];

  /** Comptage d'articles par thème sur une période (pour le research context). */
  countByTheme(days: number): Array<{ theme: MacroTheme; count: number }>;

  /** Comptage d'articles par asset sur une période. */
  countByAsset(days: number, limit?: number): Array<{ symbol: string; count: number }>;

  // ---- ECONOMIC EVENTS ----

  /** Upsert economic events (sync Supabase). */
  syncEconomicEvents(events: EconomicEvent[]): number;

  /** Events par date range. */
  getEconomicEvents(options: {
    from: string;   // ISO date
    to: string;
    currency?: string;
    strength?: "Strong" | "Moderate";
  }): EconomicEvent[];

  // ---- MAINTENANCE ----

  /** Purge articles > 180 jours. Retourne le nombre supprimé. */
  purgeOldArticles(retentionDays?: number): number;

  /** Stats DB (pour monitoring). */
  getStats(): {
    totalArticles: number;
    oldestArticle: string;
    newestArticle: string;
    totalAssetTags: number;
    totalThemeTags: number;
    totalEcoEvents: number;
    dbSizeMB: number;
  };

  /** Fermer la DB proprement. */
  close(): void;
}
```

**Points d'attention implémentation** :
- Utiliser des prepared statements (`.prepare()`) pour toutes les queries fréquentes (performance).
- Le `storeArticles` doit être wrappé dans une transaction explicite pour la performance (600 articles → 1 transaction, pas 600).
- Dedup par `url` UNIQUE — le `INSERT OR IGNORE` suffit.
- La purge supprime les articles ET les tags associés (CASCADE).

---

## 6. Research Context Builder (`research-context.ts`)

### 6.1 Concept

Fonction pure (pas de LLM) qui prend un snapshot + la DB → retourne du texte markdown formaté pour injection dans le prompt Opus.

### 6.2 Interface

```typescript
/**
 * Construit le contexte historique pour le prompt du Writer (Opus).
 * 
 * @param snapshot - Le DailySnapshot du jour
 * @param db - Instance NewsMemoryDB
 * @param options - Configuration
 * @returns Texte markdown formaté, prêt à injecter dans le prompt
 */
export function buildResearchContext(
  snapshot: DailySnapshot,
  db: NewsMemoryDB,
  options?: {
    maxTokensEstimate?: number;   // Budget tokens approximatif (défaut: 2000)
    shortTermDays?: number;       // Fenêtre court terme (défaut: 7)
    longTermDays?: number;        // Fenêtre long terme (défaut: 90)
    maxArticlesPerAsset?: number; // Max articles court terme par asset (défaut: 5)
    maxThemesLongTerm?: number;   // Max thèmes long terme par asset (défaut: 3)
  }
): string;
```

### 6.3 Algorithme détaillé

```
1. IDENTIFIER les top movers du snapshot
   - Critères : |changePct| > 0.5% OU dramaScore > seuil
   - Trier par dramaScore descendant
   - Garder les top 8-10 max (budget tokens)

2. Pour CHAQUE top mover :
   a. Query court terme (7j) :
      db.searchByAsset(symbol, { days: 7, limit: 5 })
      → Liste chronologique : "2026-03-10 : titre résumé (source)"
   
   b. Query long terme (90j) :
      SELECT theme, COUNT(*) FROM article_themes
      JOIN article_assets ON ...
      WHERE symbol = ? AND published_at > date(-90 days)
      GROUP BY theme ORDER BY count DESC LIMIT 3
      → "monetary_policy (8 articles), geopolitics (5 articles)"

3. THÈMES DOMINANTS de la semaine :
   db.countByTheme(7)
   → Top 5 thèmes avec nombre d'articles

4. HIGH IMPACT RÉCENT :
   db.getHighImpactRecent(3, 5)
   → Top 5 articles high-impact des 3 derniers jours (toutes catégories)

5. ECONOMIC EVENTS RÉCENTS (croisement) :
   db.getEconomicEvents({ from: J-3, to: J, strength: "Strong" })
   → Events importants récents avec outcome (beat/miss/inline)

6. FORMATER en markdown structuré :
   Voir format ci-dessous
```

### 6.4 Format de sortie

```markdown
## Contexte historique (News Memory)

### Top movers — contexte 7 jours

#### GC=F (Or) — +1.2% aujourd'hui
- 2026-03-10 : Fed signals extended pause, gold breaks $5100 (CNBC) [HIGH]
- 2026-03-09 : Iran tensions escalate, safe havens rally (Reuters) [HIGH]
- 2026-03-08 : Gold extends gains for 4th session (Yahoo Finance) [MEDIUM]
- 2026-03-06 : ECB holds rates, euro weakens against dollar (Les Echos) [MEDIUM]
→ Tendances 90j : monetary_policy (12 articles), geopolitics (8), inflation (5)

#### ^GSPC (S&P 500) — -0.8% aujourd'hui
- 2026-03-10 : Tech selloff deepens on AI regulation fears (CNBC) [HIGH]
- 2026-03-09 : Markets brace for CPI data (Barron's) [MEDIUM]
→ Tendances 90j : earnings (22 articles), monetary_policy (15), regulation (7)

### Thèmes dominants cette semaine
- monetary_policy : 18 articles (Fed pause prolongée, ECB dovish)
- geopolitics : 12 articles (tensions Iran, sanctions Russie)
- earnings : 9 articles (saison Q4 en cours)
- inflation : 7 articles (CPI attendu mercredi)
- crypto_market : 5 articles (ETF Bitcoin flows)

### Événements économiques récents (3j)
- 2026-03-10 : US ISM Services PMI — actual: 52.1 vs forecast: 53.0 → MISS [Strong]
- 2026-03-08 : US NFP — actual: 275K vs forecast: 198K → BEAT [Strong]

### Articles high-impact récents (3j)
- "Fed's Waller: 'No rush to cut rates despite cooling inflation'" (Reuters, 2026-03-10) [HIGH]
- "NVDA beats Q4 estimates, guides above consensus" (CNBC, 2026-03-09) [HIGH]
```

### 6.5 Budget tokens

Le research context doit rester sous ~2000-3000 tokens pour ne pas écraser le prompt Opus. Mécanisme de troncature :

1. Si > 10 movers, couper aux 8 premiers par drama score.
2. Si > 5 articles par mover, couper aux 3 plus récents + résumé comptage.
3. Si le texte total dépasse ~3000 tokens estimés (~12000 chars), tronquer les movers les moins importants.
4. Si la DB est vide (jour 1-3), retourner une section vide : `## Contexte historique\n\nBase de données en cours d'accumulation. Pas de contexte historique disponible.\n`

---

## 7. Sync Supabase → SQLite (economic_events)

### 7.1 Quand synchroniser

À chaque `fetchMarketSnapshot()`, après le fetch Supabase des events :
1. Le snapshot récupère les events J-7 à J+7 depuis Supabase (existant).
2. **Nouveau** : on upsert ces events dans `economic_events` SQLite.
3. Calcul `outcome` : si `actual` et `forecast` sont présents → beat/miss/inline.

### 7.2 Mapping outcome

```typescript
function computeOutcome(event: { actual?: number; forecast?: number }): string {
  if (event.actual == null || event.forecast == null) return "pending";
  if (event.forecast === 0) return "inline"; // edge case
  const deviation = Math.abs((event.actual - event.forecast) / event.forecast);
  if (deviation < 0.02) return "inline";     // <2% d'écart
  return event.actual > event.forecast ? "beat" : "miss";
}
```

### 7.3 Mapping currency → assets impactés

Pour le croisement events × movers dans le research context :

```typescript
const CURRENCY_ASSET_MAP: Record<string, string[]> = {
  "USD": ["DX-Y.NYB", "^GSPC", "US10Y", "GC=F"],
  "EUR": ["EURUSD=X", "^FCHI", "^STOXX"],
  "GBP": ["GBPUSD=X", "^FTSE"],
  "JPY": ["USDJPY=X", "^N225"],
  "CHF": ["USDCHF=X"],
  "AUD": ["AUDUSD=X"],
  "CAD": ["USDCAD=X", "CL=F"],   // CAD corrélé pétrole
  "NZD": ["NZDUSD=X"],
  "CNY": ["^HSI", "000001.SS"],
};
```

---

## 8. Intégration pipeline

### 8.1 Point d'intégration : après fetchNews(), avant script generation

```
fetchMarketSnapshot()
  ├── fetchYahoo()        (existant)
  ├── fetchNews()         (existant, mais retourne TOUT — plus de maxItems)
  ├── fetchFRED()         (existant)
  ├── fetchFinnhub()      (existant)
  ├── fetchCoinGecko()    (existant)
  ├── fetchSupabase()     (existant)
  │
  └── ** NOUVEAU : après tous les fetchers **
      ├── initTagger()                    // une fois au boot
      ├── tagAndStoreArticles(news, db)   // tag + store dans SQLite
      └── syncEconomicEvents(events, db)  // upsert events Supabase → SQLite

generateScript()
  ├── ** NOUVEAU : avant la génération **
  │   └── buildResearchContext(snapshot, db)
  │       → retourne le texte markdown du contexte historique
  │
  ├── buildSystemPrompt()
  │   └── inclut la section "## Contexte historique" dans le prompt
  │
  └── generateStructuredJSON(prompt, ...) // appel LLM (existant)
```

### 8.2 Graceful degradation

Si la DB est vide ou corrompue :
- `buildResearchContext()` retourne un placeholder vide.
- Le pipeline fonctionne exactement comme aujourd'hui (pas de régression).
- Log un warning, pas un crash.

Si better-sqlite3 ne s'installe pas (problème build natif) :
- Fallback : `sql.js` (WASM, zero native deps).
- L'API wrapper est la même, seul le constructeur change.

---

## 9. Backfill

### 9.1 Snapshots existants

Script CLI : `scripts/backfill-news.ts`

```
1. Lister data/snapshot-*.json
2. Pour chaque snapshot :
   a. Extraire les news du champ snapshot.news[]
   b. tagArticle() sur chaque news
   c. storeArticle() dans SQLite avec snapshot_date
3. Log : "Backfilled X articles from Y snapshots"
```

### 9.2 Finnhub company-news historique

Déjà intégré dans la pipeline. Utiliser pour backfill :

```
Pour chaque equity de la watchlist (pas les indices/futures/forex/crypto) :
  GET /company-news?symbol=AAPL&from=2025-09-01&to=2026-03-11
  → Tag + store
  Rate limit : 60 req/min, ajouter un délai de 1s entre chaque appel
```

### 9.3 Marketaux backfill 30 jours

```
Pour chaque jour des 30 derniers jours :
  GET /v1/news?published_after=DATE&published_before=DATE+1&language=fr,en&limit=30
  → 3 requêtes par jour (FR général, EN finance, crypto)
  → 90 requêtes total sur 1 jour de quota (100 req/jour)
  → Tag + store

Env requise : MARKETAUX_API_KEY
```

### 9.4 Priorité backfill

1. Snapshots existants (gratuit, immédiat)
2. Finnhub company-news (gratuit, lent — rate limited)
3. Marketaux (gratuit, quota limité)

---

## 10. Tests

### 10.1 Tests unitaires tagging

Fichier : `packages/ai/src/memory/__tests__/news-tagger.test.ts`

Cas à couvrir :

```typescript
// Couche 1 — Direct match
"Gold rallies to $5100 on Fed pause"            → assets: [GC=F], confidence: high
"Apple reports record Q4 earnings"              → assets: [AAPL, ^GSPC(low)], theme: earnings
"Le CAC 40 recule de 1.2%"                      → assets: [^FCHI]
"NVIDIA Corporation beats estimates"             → assets: [NVDA, ^GSPC(low)]

// Couche 1 — Edge cases
"Le chat mange une pomme"                       → assets: [] (pas de match)
"L'or a franchi les 5000 dollars"               → assets: [GC=F] (via "l or a")
"Ford annonce un rappel"                        → assets: [F] (via nom "ford", pas ticker "f")
"Le dollar monte face au yen"                   → assets: [DX-Y.NYB? USDJPY=X?] — matcher "dollar" seul?

// Couche 2 — Causales
"Fed signals rate pause in March"               → assets: [GC=F, DX-Y.NYB, ^GSPC, US10Y]
                                                  theme: monetary_policy
                                                  sentiment: GC=F bullish, DX-Y.NYB bearish
"OPEC agrees to cut production"                 → assets: [CL=F, BZ=F], theme: commodities
                                                  sentiment: CL=F bullish
"La Fed hésite, pas de signal clair"            → assets: [GC=F, DX-Y.NYB, ^GSPC, US10Y]
                                                  theme: monetary_policy
                                                  sentiment: undefined (aucun modifier matché)
"NFP beats at 275K vs 198K expected"            → assets: [DX-Y.NYB, ^GSPC, US10Y]
                                                  theme: employment

// Couche 3 — Metadata
Article from CoinDesk sans keyword financier     → theme: crypto_market, assets: [BTC-USD(low)]

// Impact scoring
CNBC + "Fed rate pause" → HIGH
ZoneBourse + "résultats LVMH" → MEDIUM (tier 2 + causal)
Yahoo Finance + article générique → LOW

// Multi-layer accumulation
"Fed pause boosts gold ETF inflows"
  → Couche 1: GC=F (via "gold")
  → Couche 2: GC=F, DX-Y.NYB, ^GSPC, US10Y (via "fed" + "pause")
  → GC=F a confidence high (couche 1) + sentiment bullish (couche 2)
```

### 10.2 Tests SQLite

- Insert + dedup (même URL → ignoré)
- searchByAsset retourne les bons résultats triés
- searchByTheme filtre correctement
- FTS5 full-text search fonctionne
- Purge supprime les vieux articles + tags CASCADE
- Transaction batch (600 articles en 1 transaction < 100ms)
- getStats retourne des chiffres cohérents

### 10.3 Tests research context

- Snapshot vide → retourne placeholder
- Snapshot normal → texte markdown bien formaté
- Budget tokens respecté (< 3000 tokens)
- Articles triés chronologiquement
- Thèmes comptés correctement

---

## 11. Edge cases et décisions de design

### 11.1 "dollar" seul dans un titre

"Le dollar monte" → doit-on tagger DX-Y.NYB ?
**Décision** : OUI, ajouter "dollar" et "le dollar" comme patterns pour DX-Y.NYB.
Mais PAS word_boundary (sinon "dollar australien" ne matcherait pas AUDUSD).
On ajoute "dollar australien" → AUDUSD, "dollar canadien" → USDCAD, etc. séparément.
Et on ajoute "dollar" seul → DX-Y.NYB avec word_boundary=false.
**Risque** : "1000 dollars" matche DXY. Acceptable — en contexte financier c'est pertinent.

### 11.2 Article qui parle de 2 sociétés

"Apple et Microsoft annoncent un partenariat"
→ Taggé [AAPL, MSFT, ^GSPC(low), ^IXIC(low)]. Pas de problème, c'est le many-to-many.

### 11.3 Article en langue mixte

"Le Nasdaq chute après le warning de NVIDIA"
→ FR + EN mélangé. Pas de problème : normalizeText traite tout uniformément.

### 11.4 Même article de plusieurs feeds

"Fed pauses rates" apparaît dans Yahoo RSS, CNBC RSS, et Finnhub.
→ Dedup par URL unique. Seul le premier inséré est gardé.
**Attention** : les URLs peuvent différer (tracking params, etc.). Normaliser l'URL :
```typescript
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Supprimer les tracking params courants
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_content");
    u.searchParams.delete("ref");
    u.searchParams.delete("mod");
    return u.toString();
  } catch {
    return url;
  }
}
```

### 11.5 Performance

- **600 articles × tagging** : chaque article prend ~0.5ms (matching string simple). Total ~300ms. Acceptable.
- **600 inserts SQLite** : en 1 transaction batch, < 50ms.
- **FTS5 search** : < 10ms sur 100K documents.
- **buildResearchContext** : 10 queries × 10ms = 100ms. Acceptable.
- **Total overhead D2 par run** : < 500ms.

### 11.6 Tickers ambigus à ne PAS matcher par pattern

| Ticker | Mot commun | Solution |
|--------|-----------|----------|
| F | "f" (lettre) | Matcher par nom "ford" uniquement, ignorer ticker 1 char |
| T | "t" (lettre) | Matcher par nom "at&t" uniquement |
| A | "a" (article) | Matcher par nom "agilent" uniquement |
| C | "c" (lettre) | Matcher par nom "citigroup" uniquement |
| V | "v" (lettre) | Matcher par nom "visa" uniquement |
| X | "x" (lettre) | Matcher par nom "united states steel" uniquement |
| K | "k" (lettre) | Matcher par nom "kellanova" uniquement |

**Règle** : tout ticker de 1 caractère → word_boundary=true ET ajouter un check longueur min.
En pratique, on peut simplement filtrer `symbol.length <= 1` dans `generateStockDirectRules` et ne garder que les noms complets pour ces cas.

### 11.7 Conflits couche 1 vs couche 2

Si un article matche "gold" en couche 1 ET la règle "fed_rate" en couche 2 :
→ GC=F apparaît deux fois. Le Map<string, AssetTag> fait la dedup naturellement.
→ La couche 1 donne confidence=high sans sentiment.
→ La couche 2 enrichit avec sentiment=bullish, confidence=medium.
→ Résultat final : GC=F avec confidence=high + sentiment=bullish.

---

## 12. Livrables et critères de validation

### Fichiers à créer

| Fichier | Lignes estimées | Priorité |
|---------|:---:|:---:|
| `packages/ai/src/memory/types.ts` | ~100 | 1 |
| `packages/ai/src/memory/tagging-rules.ts` | ~500 | 1 |
| `packages/ai/src/memory/news-tagger.ts` | ~200 | 1 |
| `packages/ai/src/memory/news-db.ts` | ~350 | 1 |
| `packages/ai/src/memory/research-context.ts` | ~200 | 2 |
| `packages/ai/src/memory/index.ts` | ~20 | 1 |
| `scripts/backfill-news.ts` | ~100 | 3 |

**Total estimé : ~1500 lignes de code.**

### Critères de validation

1. `tagArticle()` retourne des tags corrects sur les 20+ cas de test listés en section 10.1.
2. `NewsMemoryDB` s'initialise, crée le schema, insère 600 articles en < 100ms.
3. `searchByAsset()` retourne les bons résultats triés chronologiquement.
4. `searchFullText()` fonctionne avec des queries FR et EN.
5. `buildResearchContext()` retourne du markdown bien formaté sous 3000 tokens.
6. Le pipeline existant (`scripts/generate.ts`) fonctionne identiquement si la DB est vide.
7. La section `## Contexte historique` apparaît dans le prompt Opus quand la DB a des données.
8. `purgeOldArticles(180)` supprime correctement les vieux articles + tags.

### Ordre d'implémentation recommandé

1. `types.ts` — les types d'abord (principe du blueprint)
2. `tagging-rules.ts` — toutes les règles
3. `news-tagger.ts` — le moteur de tagging
4. `news-db.ts` — le wrapper SQLite
5. Tests unitaires tagger + DB
6. `research-context.ts` — le builder de contexte
7. Intégration dans `fetchMarketSnapshot()` (tag & store)
8. Intégration dans `generateScript()` (research context)
9. `backfill-news.ts` — script CLI
10. Sync economic_events depuis Supabase

---

## 13. Notes finales

### Ce qui n'est PAS dans D2

- **Pas d'appel LLM** dans le tagging. 100% rules-based. L'upgrade path Haiku est documenté pour plus tard.
- **Pas de vector search** / embeddings. FTS5 BM25 suffit. L'upgrade path sqlite-vec est documenté.
- **Pas de sentiment analysis LLM** sur les articles. Le sentiment vient des règles causales (théorique) ou est absent.
- **Pas de digest LLM** (résumé 1 ligne). Le champ `digest` dans le schema est réservé pour plus tard.
- **Pas de Causal Analysis (Bloc A2)**. Le research context est du texte brut, pas un CausalBrief structuré.

### Upgrade paths documentés

1. **Haiku enrichissement** : si > 30% des articles restent "other" après 2 semaines, ajouter un appel Haiku pour les classifier. Budget : ~0.01$/jour.
2. **sqlite-vec** : si la recherche sémantique devient nécessaire, ajouter des embeddings sans changer le schema.
3. **Marketaux en continu** : si les RSS ne suffisent pas, utiliser Marketaux comme source quotidienne complémentaire (100 req/jour = ~3000 articles/jour).
