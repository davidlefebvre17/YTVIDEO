import { DailySnapshot, AssetSnapshot } from "@yt-maker/core";
import { NewsMemoryDB } from "./news-db";
import { EconomicEvent, MacroTheme } from "./types";

// ============================================================
// Outcome Computation (section 7.2)
// ============================================================

/**
 * Compute outcome of an economic event based on actual vs forecast.
 * Returns "beat", "miss", "inline", or "pending".
 */
export function computeOutcome(event: {
  actual?: number;
  forecast?: number;
}): "beat" | "miss" | "inline" | "pending" {
  if (event.actual == null || event.forecast == null) return "pending";
  if (event.forecast === 0) return "inline"; // edge case
  const deviation = Math.abs(
    (event.actual - event.forecast) / event.forecast
  );
  if (deviation < 0.02) return "inline"; // <2% deviation
  return event.actual > event.forecast ? "beat" : "miss";
}

// ============================================================
// Currency-to-Assets Mapping (section 7.3)
// ============================================================

export const CURRENCY_ASSET_MAP: Record<string, string[]> = {
  USD: ["DX-Y.NYB", "^GSPC", "US10Y", "GC=F"],
  EUR: ["EURUSD=X", "^FCHI", "^STOXX"],
  GBP: ["GBPUSD=X", "^FTSE"],
  JPY: ["USDJPY=X", "^N225"],
  CHF: ["USDCHF=X"],
  AUD: ["AUDUSD=X"],
  CAD: ["USDCAD=X", "CL=F"],
  NZD: ["NZDUSD=X"],
  CNY: ["^HSI", "000001.SS"],
};

// ============================================================
// Research Context Builder (v2)
// ============================================================

/**
 * Construit le contexte historique pour les prompts C1/C2/C3.
 *
 * V2 changes:
 * - 30 jours de fenêtre (au lieu de 7)
 * - Exclut le jour du snapshot (les news du jour sont dans snapshot.news)
 * - Titres complets (plus de troncature à 60 chars)
 * - Tendances par asset (plus de tendances globales répétées)
 * - Cadrage temporel explicite pour le LLM
 */
/** Extra stock symbols detected via news cluster (not in watchlist) */
export interface ClusterSymbol {
  symbol: string;
  name: string;
}

export function buildResearchContext(
  snapshot: DailySnapshot,
  db: NewsMemoryDB,
  clusterSymbols?: ClusterSymbol[],
): string {
  const snapshotDate = snapshot.date;

  const topMovers = identifyTopMovers(snapshot, 8, 10);

  if (topMovers.length === 0 && (!clusterSymbols || clusterSymbols.length === 0)) {
    return "";
  }

  let markdown = `⚠️ ATTENTION : les articles ci-dessous sont ANTÉRIEURS au ${snapshotDate}. Ce sont des archives, PAS des news du jour.\n`;
  markdown += `Utilise-les pour comprendre l'ARC NARRATIF d'une histoire (depuis quand un sujet est couvert, quelle est la trajectoire) et pour identifier des continuités avec le passé récent.\n`;
  markdown += `Les news du jour sont dans la section ASSETS / NEWS séparée.\n\n`;

  // Section: Top movers with historical articles
  markdown += `### Contexte historique par asset (J-1 à J-30)\n\n`;
  const coveredSymbols = new Set<string>();
  for (const mover of topMovers) {
    markdown += buildMoverSection(mover, db, snapshotDate);
    coveredSymbols.add(mover.symbol);
  }

  // Section: News cluster stocks (hors watchlist, forte couverture médiatique)
  if (clusterSymbols?.length) {
    const uncovered = clusterSymbols.filter(c => !coveredSymbols.has(c.symbol));
    if (uncovered.length > 0) {
      markdown += `### Stocks hors watchlist — contexte historique (J-1 à J-30)\n\n`;
      for (const cluster of uncovered.slice(0, 5)) {
        markdown += buildClusterSection(cluster, db, snapshotDate);
      }
    }
  }

  // Section: Dominant themes (global, 14 days)
  markdown += `### Thèmes dominants (14 derniers jours)\n`;
  const themeStats = db.countByTheme(14);
  const topThemes = themeStats.slice(0, 5);
  if (topThemes.length > 0) {
    for (const { theme, count } of topThemes) {
      markdown += `- ${theme} : ${count} articles\n`;
    }
  } else {
    markdown += "- Pas de données disponibles\n";
  }
  markdown += "\n";

  // Section: Recent economic events (exclude snapshot day)
  markdown += `### Événements économiques récents (J-1 à J-5)\n`;
  const recentEvents = db.getEconomicEvents({
    from: subtractDays(snapshotDate, 5),
    to: subtractDays(snapshotDate, 1),
    strength: "Strong",
  });

  if (recentEvents.length > 0) {
    for (const event of recentEvents) {
      const outcome = computeOutcome({
        actual: event.actual,
        forecast: event.forecast,
      });
      const outcomeStr =
        outcome === "pending"
          ? "—"
          : `actual: ${event.actual} vs forecast: ${event.forecast} → ${outcome.toUpperCase()}`;
      markdown += `- ${event.event_date} : ${event.name} ${outcomeStr}\n`;
    }
  } else {
    markdown += "- Pas d'événements économiques forts ces 5 derniers jours\n";
  }
  markdown += "\n";

  // Section: High-impact articles (J-1 to J-7, exclude snapshot day)
  markdown += `### Articles high-impact récents (J-1 à J-7)\n`;
  const highImpactArticles = db.getHighImpactRecent(7, 10);
  const filteredHighImpact = highImpactArticles.filter(a => {
    const pubDate = a.published_at.split("T")[0];
    return pubDate < snapshotDate;
  });
  if (filteredHighImpact.length > 0) {
    for (const article of filteredHighImpact.slice(0, 8)) {
      const pubDate = article.published_at.split("T")[0];
      const daysAgo = daysBetween(pubDate, snapshotDate);
      markdown += `- [J-${daysAgo}] ${pubDate} : "${article.title}" (${article.source}) [HIGH]\n`;
    }
  } else {
    markdown += "- Pas d'articles high-impact dans les 7 derniers jours\n";
  }
  markdown += "\n";

  return markdown;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Identify top movers by |changePct| > 0.5% or dramaScore > threshold.
 * Sort by dramaScore descending, limit to max.
 */
function identifyTopMovers(
  snapshot: DailySnapshot,
  _minMoversForBudget: number,
  maxMovers: number
): AssetSnapshot[] {
  const CHANGE_THRESHOLD = 0.5;
  const DRAMA_THRESHOLD = 40;

  const candidates = snapshot.assets.filter((asset) => {
    const absChange = Math.abs(asset.changePct);
    const drama = asset.technicals?.dramaScore || 0;
    return absChange > CHANGE_THRESHOLD || drama > DRAMA_THRESHOLD;
  });

  candidates.sort(
    (a, b) => (b.technicals?.dramaScore || 0) - (a.technicals?.dramaScore || 0)
  );

  return candidates.slice(0, maxMovers);
}

/**
 * Build the markdown section for a single mover.
 * Uses searchByAssetBefore to exclude snapshot date articles.
 */
function buildMoverSection(
  asset: AssetSnapshot,
  db: NewsMemoryDB,
  snapshotDate: string,
): string {
  let markdown = `#### ${asset.symbol} (${asset.name}) — ${asset.changePct > 0 ? "+" : ""}${asset.changePct.toFixed(1)}% aujourd'hui\n`;

  // Articles from J-1 to J-30 (excludes snapshot day)
  const articles = db.searchByAssetBefore(asset.symbol, snapshotDate, {
    days: 30,
    limit: 8,
  });

  if (articles.length > 0) {
    for (const article of articles) {
      const pubDate = article.published_at.split("T")[0];
      const daysAgo = daysBetween(pubDate, snapshotDate);
      const impact = (article.impact || "medium").toUpperCase();
      markdown += `- [J-${daysAgo}] ${pubDate} : "${article.title}" (${article.source}) [${impact}]\n`;
    }
  } else {
    markdown += `- Pas d'articles trouvés pour cet actif ces 30 derniers jours\n`;
  }

  // Per-asset themes (30 days)
  const assetThemes = db.countThemesByAsset(asset.symbol, 30, 3);
  if (assetThemes.length > 0) {
    const themeStr = assetThemes
      .map((t) => `${t.theme} (${t.count})`)
      .join(", ");
    markdown += `→ Thèmes associés (30j) : ${themeStr}\n`;
  }

  markdown += "\n";
  return markdown;
}

/**
 * Post-query filter: check article title actually mentions the asset.
 * Catches false positives from DB (e.g. "meta" matching "metals").
 */
function titleMentionsAsset(title: string, symbol: string, name: string): boolean {
  const titleLow = title.toLowerCase();
  const tickerClean = symbol.replace(/\..+$/, "").toLowerCase(); // NVDA, AIR, META
  const nameLow = name.toLowerCase();
  // Check ticker as word boundary (surround with spaces)
  const paddedTitle = ` ${titleLow} `;
  if (tickerClean.length >= 3 && paddedTitle.includes(` ${tickerClean} `)) return true;
  // Check full name or first meaningful word (>5 chars)
  if (titleLow.includes(nameLow)) return true;
  const firstName = nameLow.split(/\s+/)[0];
  if (firstName.length >= 5 && titleLow.includes(firstName)) return true;
  return false;
}

/**
 * Build section for a news cluster stock (not in watchlist).
 */
function buildClusterSection(
  cluster: ClusterSymbol,
  db: NewsMemoryDB,
  snapshotDate: string,
): string {
  // Fetch more than needed, then filter for relevance
  const rawArticles = db.searchByAssetBefore(cluster.symbol, snapshotDate, {
    days: 30,
    limit: 15,
  });
  const articles = rawArticles.filter(a =>
    titleMentionsAsset(a.title, cluster.symbol, cluster.name)
  );

  if (articles.length === 0) return ""; // Skip entirely if no relevant articles

  let markdown = `#### ${cluster.symbol} (${cluster.name}) — hors watchlist\n`;
  for (const article of articles.slice(0, 6)) {
    const pubDate = article.published_at.split("T")[0];
    const daysAgo = daysBetween(pubDate, snapshotDate);
    const impact = (article.impact || "medium").toUpperCase();
    markdown += `- [J-${daysAgo}] ${pubDate} : "${article.title}" (${article.source}) [${impact}]\n`;
  }

  markdown += "\n";
  return markdown;
}

/**
 * Subtract days from a date string (YYYY-MM-DD).
 */
function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Number of days between two YYYY-MM-DD dates.
 */
function daysBetween(from: string, to: string): number {
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
