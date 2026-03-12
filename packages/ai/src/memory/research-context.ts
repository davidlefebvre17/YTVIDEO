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
// Research Context Builder (section 6)
// ============================================================

interface ResearchContextOptions {
  maxTokensEstimate?: number;
  shortTermDays?: number;
  longTermDays?: number;
  maxArticlesPerAsset?: number;
  maxThemesLongTerm?: number;
}

/**
 * Construit le contexte historique pour le prompt du Writer (Opus).
 *
 * @param snapshot - Le DailySnapshot du jour
 * @param db - Instance NewsMemoryDB
 * @param options - Configuration optionnelle
 * @returns Texte markdown formaté, prêt à injecter dans le prompt
 */
export function buildResearchContext(
  snapshot: DailySnapshot,
  db: NewsMemoryDB,
  options?: ResearchContextOptions
): string {
  const opts = {
    maxTokensEstimate: options?.maxTokensEstimate || 2000,
    shortTermDays: options?.shortTermDays || 7,
    longTermDays: options?.longTermDays || 90,
    maxArticlesPerAsset: options?.maxArticlesPerAsset || 5,
    maxThemesLongTerm: options?.maxThemesLongTerm || 3,
  };

  // ============================================================
  // 1. IDENTIFY TOP MOVERS
  // ============================================================

  const topMovers = identifyTopMovers(snapshot, 8, 10);

  if (topMovers.length === 0) {
    // DB is empty or no significant movers
    return (
      "## Contexte historique (News Memory)\n\n" +
      "Base de données en cours d'accumulation. Pas de contexte historique disponible.\n"
    );
  }

  // ============================================================
  // 2. BUILD MARKDOWN SECTIONS
  // ============================================================

  let markdown = "## Contexte historique (News Memory)\n\n";

  // Section: Top movers
  markdown += "### Top movers — contexte 7 jours\n\n";
  for (const mover of topMovers) {
    markdown += buildMoverSection(
      mover,
      db,
      opts.shortTermDays,
      opts.longTermDays,
      opts.maxArticlesPerAsset,
      opts.maxThemesLongTerm
    );
  }

  // Section: Dominant themes
  markdown += "### Thèmes dominants cette semaine\n";
  const themeStats = db.countByTheme(7);
  const topThemes = themeStats.slice(0, 5);
  if (topThemes.length > 0) {
    for (const { theme, count } of topThemes) {
      markdown += `- ${theme} : ${count} articles\n`;
    }
  } else {
    markdown += "- Pas de données disponibles\n";
  }
  markdown += "\n";

  // Section: Recent economic events
  markdown += "### Événements économiques récents (3j)\n";
  const recentEvents = db.getEconomicEvents({
    from: subtractDays(snapshot.date, 3),
    to: snapshot.date,
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
      markdown += `- ${event.event_date} : ${event.name} ${outcomeStr} [${event.strength || "Strong"}]\n`;
    }
  } else {
    markdown += "- Pas d'événements économiques forts ces 3 derniers jours\n";
  }
  markdown += "\n";

  // Section: High-impact articles
  markdown += "### Articles high-impact récents (3j)\n";
  const highImpactArticles = db.getHighImpactRecent(3, 5);
  if (highImpactArticles.length > 0) {
    for (const article of highImpactArticles) {
      const pubDate = article.published_at.split("T")[0];
      markdown += `- "${article.title}" (${article.source}, ${pubDate}) [HIGH]\n`;
    }
  } else {
    markdown += "- Pas d'articles high-impact dans les 3 derniers jours\n";
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
  minMoversForBudget: number,
  maxMovers: number
): AssetSnapshot[] {
  const CHANGE_THRESHOLD = 0.5; // 0.5%
  const DRAMA_THRESHOLD = 40; // arbitrary drama score threshold

  const candidates = snapshot.assets.filter((asset) => {
    const absChange = Math.abs(asset.changePct);
    const drama = asset.technicals?.dramaScore || 0;
    return absChange > CHANGE_THRESHOLD || drama > DRAMA_THRESHOLD;
  });

  // Sort by drama score descending
  candidates.sort(
    (a, b) => (b.technicals?.dramaScore || 0) - (a.technicals?.dramaScore || 0)
  );

  // Cap at maxMovers
  return candidates.slice(0, maxMovers);
}

/**
 * Build the markdown section for a single mover.
 */
function buildMoverSection(
  asset: AssetSnapshot,
  db: NewsMemoryDB,
  shortTermDays: number,
  longTermDays: number,
  maxArticlesPerAsset: number,
  maxThemesLongTerm: number
): string {
  let markdown = `#### ${asset.symbol} (${asset.name}) — ${asset.changePct > 0 ? "+" : ""}${asset.changePct.toFixed(1)}% aujourd'hui\n`;

  // Short-term articles (7 days)
  const articles = db.searchByAsset(asset.symbol, {
    days: shortTermDays,
    limit: maxArticlesPerAsset,
  });

  if (articles.length > 0) {
    for (const article of articles.slice(0, maxArticlesPerAsset)) {
      const pubDate = article.published_at.split("T")[0];
      const impact = (article.impact || "medium").toUpperCase();
      markdown += `- ${pubDate} : ${article.title.substring(0, 60)}... (${article.source}) [${impact}]\n`;
    }
    // Remaining articles count
    if (articles.length > maxArticlesPerAsset) {
      markdown += `- + ${articles.length - maxArticlesPerAsset} autres articles récents\n`;
    }
  } else {
    markdown += `- Pas d'articles trouvés pour cet actif ces ${shortTermDays} jours\n`;
  }

  // Long-term theme distribution (90 days)
  const themeStats = db.countByTheme(longTermDays);
  // Filter to themes where this asset was tagged
  const relevantThemes = themeStats.slice(0, maxThemesLongTerm);

  if (relevantThemes.length > 0) {
    const themeStr = relevantThemes
      .map((t) => `${t.theme} (${t.count} articles)`)
      .join(", ");
    markdown += `→ Tendances 90j : ${themeStr}\n`;
  }

  markdown += "\n";
  return markdown;
}

/**
 * Subtract days from a date string (YYYY-MM-DD).
 * Returns result in ISO string format.
 */
function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
