import type { DailySnapshot, NewsItem, Theme } from "@yt-maker/core";
import { ASSET_KEYWORDS, SOURCE_TIER } from "./news-selector";

// ── Cluster definitions ─────────────────────────────────────────────────────

interface ClusterDef {
  id: string;
  name: { fr: string; en: string };
  keywords: {
    fr: string[];
    en: string[];
  };
  type: "thematic" | "sectoral";
}

const CLUSTERS: ClusterDef[] = [
  // Thematic clusters (1-9)
  {
    id: "geopolitique_iran",
    name: { fr: "Tensions Iran/Moyen-Orient", en: "Iran/Middle East tensions" },
    keywords: {
      fr: ["iran", "teheran", "téhéran", "moyen-orient", "golfe persique", "detroit d'ormuz", "détroit d'ormuz", "houthis", "hezbollah", "tensions geopolitiques", "tensions géopolitiques"],
      en: ["iran", "tehran", "middle east", "persian gulf", "strait of hormuz", "houthis", "hezbollah", "geopolitical tensions"],
    },
    type: "thematic",
  },
  {
    id: "geopolitique_russie_ukraine",
    name: { fr: "Conflit Russie-Ukraine", en: "Russia-Ukraine conflict" },
    keywords: {
      fr: ["russie", "ukraine", "kremlin", "poutine", "zelensky", "sanctions russes", "gazoduc", "nord stream"],
      en: ["russia", "ukraine", "kremlin", "putin", "zelensky", "russian sanctions", "nord stream", "pipeline"],
    },
    type: "thematic",
  },
  {
    id: "geopolitique_chine_taiwan",
    name: { fr: "Tensions Chine-Taiwan", en: "China-Taiwan tensions" },
    keywords: {
      fr: ["chine", "taiwan", "xi jinping", "pekin", "pékin", "mer de chine", "semi-conducteurs taiwan"],
      en: ["china", "taiwan", "xi jinping", "beijing", "south china sea", "taiwan semiconductor"],
    },
    type: "thematic",
  },
  {
    id: "tarifs_douane",
    name: { fr: "Tarifs douaniers / Commerce", en: "Tariffs / Trade" },
    keywords: {
      fr: ["tarifs douaniers", "droits de douane", "guerre commerciale", "balance commerciale", "deficit commercial", "déficit commercial", "protectionnisme"],
      en: ["tariffs", "trade war", "customs duties", "trade deficit", "trade balance", "protectionism", "import duties"],
    },
    type: "thematic",
  },
  {
    id: "fed_monetary",
    name: { fr: "Fed / Politique monétaire US", en: "Fed / US monetary policy" },
    keywords: {
      fr: ["fomc", "powell", "taux directeur", "politique monetaire", "politique monétaire", "assouplissement", "hawkish", "dovish", "pivot", "baisse des taux", "hausse des taux", "minutes de la fed"],
      en: ["fomc", "powell", "interest rate", "monetary policy", "rate cut", "rate hike", "hawkish", "dovish", "pivot", "fed minutes", "quantitative tightening"],
    },
    type: "thematic",
  },
  {
    id: "ecb_monetary",
    name: { fr: "BCE / Politique monétaire EU", en: "ECB / EU monetary policy" },
    keywords: {
      fr: ["bce", "lagarde", "taux directeur bce", "politique monetaire europeenne", "politique monétaire européenne"],
      en: ["ecb", "lagarde", "european central bank", "ecb rate", "eurozone monetary policy"],
    },
    type: "thematic",
  },
  {
    id: "boj_monetary",
    name: { fr: "BoJ / Politique monétaire JP", en: "BoJ / Japan monetary policy" },
    keywords: {
      fr: ["boj", "banque du japon", "ueda", "kazuo ueda", "politique monetaire japon", "politique monétaire japon"],
      en: ["boj", "bank of japan", "ueda", "japan monetary policy", "yen policy"],
    },
    type: "thematic",
  },
  {
    id: "inflation_cpi",
    name: { fr: "Inflation / CPI / Prix", en: "Inflation / CPI / Prices" },
    keywords: {
      fr: ["inflation", "indice des prix", "prix a la consommation", "prix à la consommation", "deflation", "déflation", "desinflation", "désinflation", "core inflation"],
      en: ["inflation", "consumer price", "deflation", "disinflation", "core inflation", "price index"],
    },
    type: "thematic",
  },
  {
    id: "emploi_labor",
    name: { fr: "Emploi / Marché du travail", en: "Employment / Labor market" },
    keywords: {
      fr: ["emploi", "chomage", "chômage", "non-farm payrolls", "marche du travail", "marché du travail", "licenciements", "creation d'emplois", "création d'emplois"],
      en: ["employment", "unemployment", "non-farm payrolls", "labor market", "jobless claims", "layoffs", "job openings"],
    },
    type: "thematic",
  },
  // Sectoral clusters (10-18)
  {
    id: "earnings_tech",
    name: { fr: "Résultats Tech / GAFAM", en: "Tech / GAFAM earnings" },
    keywords: {
      fr: ["resultats apple", "résultats apple", "resultats meta", "résultats meta", "resultats google", "résultats google", "resultats amazon", "résultats amazon", "resultats microsoft", "résultats microsoft", "resultats nvidia", "résultats nvidia", "mag7", "magnificent seven", "earnings tech"],
      en: ["apple earnings", "meta earnings", "google earnings", "amazon earnings", "microsoft earnings", "nvidia earnings", "mag7", "magnificent seven", "tech earnings"],
    },
    type: "sectoral",
  },
  {
    id: "earnings_general",
    name: { fr: "Résultats d'entreprises", en: "Corporate earnings" },
    keywords: {
      fr: ["resultats", "résultats", "benefice", "bénéfice", "chiffre d'affaires", "ebitda", "previsions", "prévisions", "guidance", "publication resultats", "publication résultats"],
      en: ["earnings", "revenue", "profit", "ebitda", "guidance", "beat estimates", "missed estimates", "quarterly results"],
    },
    type: "sectoral",
  },
  {
    id: "petrole_energie",
    name: { fr: "Pétrole / Énergie", en: "Oil / Energy" },
    keywords: {
      fr: ["petrole", "pétrole", "opep", "stocks petrole", "stocks pétrole", "production petrole", "production pétrole", "raffinerie", "gaz naturel", "prix du baril"],
      en: ["crude oil", "opec", "oil inventory", "oil production", "refinery", "natural gas", "barrel price", "energy"],
    },
    type: "sectoral",
  },
  {
    id: "airlines_transport",
    name: { fr: "Aviation / Transport", en: "Airlines / Transport" },
    keywords: {
      fr: ["compagnie aerienne", "compagnie aérienne", "aviation", "airline", "air france", "lufthansa", "ryanair", "kerosene", "kérosène", "cout du carburant", "coût du carburant", "fret aerien", "fret aérien", "transport aerien", "transport aérien"],
      en: ["airline", "aviation", "air france", "lufthansa", "ryanair", "fuel cost", "jet fuel", "air freight", "air transport"],
    },
    type: "sectoral",
  },
  {
    id: "crypto_regulation",
    name: { fr: "Crypto / Régulation", en: "Crypto / Regulation" },
    keywords: {
      fr: ["regulation crypto", "régulation crypto", "sec crypto", "stablecoin", "cbdc", "etf bitcoin", "etf ethereum", "defi"],
      en: ["crypto regulation", "sec crypto", "stablecoin", "cbdc", "bitcoin etf", "ethereum etf", "defi", "tokenized securities"],
    },
    type: "sectoral",
  },
  {
    id: "crypto_market",
    name: { fr: "Marché crypto / Prix", en: "Crypto market / Prices" },
    keywords: {
      fr: ["bitcoin", "ethereum", "solana", "altcoin", "crypto crash", "bull run crypto", "fear and greed", "btc dominance", "liquidation", "halving"],
      en: ["bitcoin", "ethereum", "solana", "altcoin", "crypto crash", "bull run", "fear and greed", "btc dominance", "liquidation", "halving"],
    },
    type: "sectoral",
  },
  {
    id: "immobilier_credit",
    name: { fr: "Immobilier / Crédit privé", en: "Real estate / Private credit" },
    keywords: {
      fr: ["immobilier", "credit prive", "crédit privé", "private credit", "private equity", "leveraged loans", "reits", "blue owl", "apollo", "carlyle", "blackstone"],
      en: ["real estate", "private credit", "private equity", "leveraged loans", "reits", "blue owl", "apollo", "carlyle", "blackstone"],
    },
    type: "sectoral",
  },
  {
    id: "ai_semiconductors",
    name: { fr: "IA / Semi-conducteurs", en: "AI / Semiconductors" },
    keywords: {
      fr: ["intelligence artificielle", "nvidia", "data center", "semi-conducteur", "puce", "tsmc"],
      en: ["artificial intelligence", "nvidia", "data center", "semiconductor", "chip", "tsmc"],
    },
    type: "sectoral",
  },
  {
    id: "or_metaux_precieux",
    name: { fr: "Or / Métaux précieux", en: "Gold / Precious metals" },
    keywords: {
      fr: ["argent metal", "argent métal", "platine", "palladium", "metal precieux", "métal précieux", "valeur refuge", "xauusd"],
      en: ["gold", "silver", "platinum", "palladium", "precious metal", "safe haven", "xauusd", "bullion"],
    },
    type: "sectoral",
  },
];

// ── Special keyword handling ────────────────────────────────────────────────
// Short words that need boundary matching to avoid false positives
const BOUNDARY_KEYWORDS: Record<string, true> = {
  "fed": true,
  "bce": true,
  "sec": true,
  "ecb": true,
  "boj": true,
  "cpi": true,
  "nfp": true,
  "eps": true,
  "bpa": true,
  "gpu": true,
  "amd": true,
  "oil": true,
  "wti": true,
  "kkr": true,
  "nft": true,
  "pce": true,
};

// ── Stopwords ───────────────────────────────────────────────────────────────

const FRENCH_STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "en", "et", "ou", "au",
  "aux", "est", "par", "pour", "sur", "dans", "que", "qui", "ce", "cette",
  "son", "sa", "ses", "mais", "avec", "plus", "apres", "après", "avant",
  "entre", "vers", "sous", "chez", "sans", "depuis", "lors", "comme", "bien",
  "selon", "meme", "même", "fait", "alors", "tout", "autre", "aussi", "tres",
  "très", "peu", "tant", "donc", "elle", "ils", "elles", "nous", "vous",
  "ces", "ont", "pas", "été", "ete", "sont",
]);

const ENGLISH_STOPWORDS = new Set([
  "the", "and", "or", "of", "to", "in", "on", "at", "for", "by", "with",
  "from", "is", "are", "was", "were", "has", "have", "had", "its", "this",
  "that", "these", "those", "but", "not", "also", "more", "than", "about",
  "into", "after", "before", "over", "under", "between", "some", "how",
  "why", "what", "which", "so", "than", "been", "will", "can", "may",
]);

const ALL_STOPWORDS = new Set([...FRENCH_STOPWORDS, ...ENGLISH_STOPWORDS]);

// SOURCE_TIER imported from news-selector

// ── Internal types ──────────────────────────────────────────────────────────

interface TaggedArticle extends NewsItem {
  clusterIds: string[];
}

interface ClusterResult {
  id: string;
  name: { fr: string; en: string };
  type: "thematic" | "sectoral";
  articles: TaggedArticle[];
  rawCount: number;
  dedupedArticles: TaggedArticle[];
  uniqueInfoCount: number;
  buzzScore: number;
  sourceCount: number;
  hasBothLangs: boolean;
}

export interface ClusteredResult {
  clusters: ClusterResult[];
  activeThemes: ClusterResult[];
  unclusteredNews: NewsItem[];
}

// ── Text normalization ──────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[']/g, "'")
    .replace(/[""]/g, '"');
}

// ── Keyword matching ────────────────────────────────────────────────────────

function textMatchesKeyword(text: string, keyword: string): boolean {
  if (BOUNDARY_KEYWORDS[keyword]) {
    // For short acronyms, match word boundaries
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(text);
  }
  if (keyword.startsWith(" ") || keyword.endsWith(" ")) {
    // Padded keywords: match with surrounding spaces (add spaces to text for boundary)
    return (` ${text} `).includes(keyword);
  }
  return text.includes(keyword);
}

function countMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    if (textMatchesKeyword(text, kw)) {
      count++;
    }
  }
  return count;
}

// ── Jaccard deduplication ───────────────────────────────────────────────────

function extractSignificantTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-zàâéèêëïîôùûüç0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !ALL_STOPWORDS.has(t));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function deduplicateCluster(articles: TaggedArticle[]): TaggedArticle[] {
  // Sort by source tier DESC, then publishedAt DESC
  const sorted = [...articles].sort((a, b) => {
    const tierA = SOURCE_TIER[a.source] ?? 1;
    const tierB = SOURCE_TIER[b.source] ?? 1;
    if (tierB !== tierA) return tierB - tierA;
    return b.publishedAt.localeCompare(a.publishedAt);
  });

  const kept: TaggedArticle[] = [];
  const keptTokens: Set<string>[] = [];

  for (const article of sorted) {
    const tokens = extractSignificantTokens(article.title);
    let isDuplicate = false;
    for (const existingTokens of keptTokens) {
      if (jaccardSimilarity(tokens, existingTokens) > 0.45) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      kept.push(article);
      keptTokens.push(tokens);
    }
  }

  return kept;
}

// ── Buzz score ──────────────────────────────────────────────────────────────

function computeBuzzScore(
  articles: TaggedArticle[],
  targetDate: string,
): { buzzScore: number; sourceCount: number; hasBothLangs: boolean } {
  const rawCount = articles.length;
  const sources = new Set(articles.map((a) => a.source));
  const sourceCount = sources.size;
  const langs = new Set(articles.map((a) => a.lang ?? "en"));
  const hasBothLangs = langs.has("fr") && langs.has("en");
  const bilingual = hasBothLangs ? 1.5 : 1.0;

  // Timeliness: boost if articles are from the target date
  let timelinessSum = 0;
  for (const a of articles) {
    const pubDay = a.publishedAt.slice(0, 10);
    if (pubDay === targetDate) {
      timelinessSum += 1.0;
    } else {
      // Previous or next day — partial credit
      const pubDate = new Date(a.publishedAt);
      const target = new Date(targetDate + "T12:00:00Z");
      const diffMs = Math.abs(pubDate.getTime() - target.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      timelinessSum += diffDays <= 1 ? 0.7 : 0.3;
    }
  }
  const timeliness = rawCount > 0 ? timelinessSum / rawCount : 0;

  const buzzScore = (rawCount * 0.4) + (sourceCount * 3) * bilingual * timeliness;

  return { buzzScore, sourceCount, hasBothLangs };
}

// ── Find related assets for a cluster ───────────────────────────────────────

function findRelatedAssets(cluster: ClusterResult): string[] {
  const relatedSymbols = new Set<string>();

  // Check all article texts against ASSET_KEYWORDS
  for (const article of cluster.dedupedArticles) {
    const text = normalizeText(article.title + " " + (article.summary ?? ""));
    for (const [symbol, keywords] of Object.entries(ASSET_KEYWORDS)) {
      if (keywords.some((kw) => textMatchesKeyword(text, kw))) {
        relatedSymbols.add(symbol);
      }
    }
  }

  return [...relatedSymbols];
}

// ── Main clustering function ────────────────────────────────────────────────

export function clusterNews(
  news: NewsItem[],
  snapshot: DailySnapshot,
  lang: string,
): ClusteredResult {
  const targetDate = snapshot.date;

  // Phase 1: Match each article to clusters
  const tagged: TaggedArticle[] = news.map((article) => {
    const text = normalizeText(
      (article.title ?? "") + " " + (article.summary ?? ""),
    );
    const articleLang = article.lang ?? (lang === "fr" ? "fr" : "en");
    const clusterIds: string[] = [];

    for (const cluster of CLUSTERS) {
      // Combine keywords for the article's language + the other language for cross-matching
      const keywords = [
        ...cluster.keywords.fr,
        ...cluster.keywords.en,
      ];

      if (countMatches(text, keywords) >= 1) {
        clusterIds.push(cluster.id);
      }
    }

    return { ...article, clusterIds };
  });

  // Phase 2: Aggregate by cluster
  const clusterResults: ClusterResult[] = CLUSTERS.map((def) => {
    const matchedArticles = tagged.filter((a) =>
      a.clusterIds.includes(def.id),
    );
    const { buzzScore, sourceCount, hasBothLangs } = computeBuzzScore(
      matchedArticles,
      targetDate,
    );

    return {
      id: def.id,
      name: def.name,
      type: def.type,
      articles: matchedArticles,
      rawCount: matchedArticles.length,
      dedupedArticles: [],
      uniqueInfoCount: 0,
      buzzScore,
      sourceCount,
      hasBothLangs,
    };
  });

  // Phase 3: Deduplicate intra-cluster
  for (const cluster of clusterResults) {
    if (cluster.rawCount > 0) {
      cluster.dedupedArticles = deduplicateCluster(cluster.articles);
      cluster.uniqueInfoCount = cluster.dedupedArticles.length;
    }
  }

  // Phase 4: Sort by buzz score, take top 6 active themes
  const activeThemes = clusterResults
    .filter((c) => c.uniqueInfoCount >= 1)
    .sort((a, b) => b.buzzScore - a.buzzScore)
    .slice(0, 6);

  // Identify unclustered news (articles that matched no cluster)
  const unclusteredNews = tagged.filter((a) => a.clusterIds.length === 0);

  return {
    clusters: clusterResults,
    activeThemes,
    unclusteredNews,
  };
}

// ── Build Theme objects from ClusteredResult ────────────────────────────────

export function buildThemesFromClusters(
  clustered: ClusteredResult,
): Theme[] {
  return clustered.activeThemes.map((cluster) => {
    const relatedAssets = findRelatedAssets(cluster);

    return {
      id: cluster.id,
      label: cluster.name,
      editorialScore: 0, // Will be computed by editorial-score.ts
      buzzScore: cluster.buzzScore,
      assets: relatedAssets,
      events: [],
      newsItems: cluster.dedupedArticles.slice(0, 3).map((a) => a.title),
      breakdown: {
        amplitude: 0,
        breadth: 0,
        surprise: 0,
        causalDepth: 0,
        symbolic: 0,
        newsFrequency: cluster.buzzScore,
        regimeCoherence: 0,
      },
    };
  });
}
