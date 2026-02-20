import type {
  NewsItem,
  StockScreenResult,
  ActiveCausalChain,
  SectorCluster,
} from "@yt-maker/core";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MoverExplanation {
  symbol: string;
  name: string;
  changePct: number;
  explanationType: "earnings" | "news_direct" | "sector_theme" | "causal_chain" | "none";
  confidence: "high" | "medium" | "low";
  text: string;
  article?: NewsItem;
  sectorCluster?: SectorCluster;
  causalChainId?: string;
}

// ── Sector rules for cluster detection (design doc section 6.2) ─────────────

interface SectorRule {
  keywords: string[];
  minCount: number;
  thresholdPct: number; // absolute threshold, direction inferred from sign
  bidirectional: boolean; // true = up or down, false = down only
}

const SECTOR_RULES: Record<string, SectorRule> = {
  airlines: {
    keywords: ["air", "airline", "airlines", "aviation", "wizz", "ryanair", "delta air", "united air", "southwest", "alaska air"],
    minCount: 3,
    thresholdPct: 2,
    bidirectional: false, // airlines cluster typically detected on drops
  },
  banks: {
    keywords: ["bank", "bnp", "societe generale", "barclays", "hsbc", "jpmorgan", "goldman"],
    minCount: 3,
    thresholdPct: 3,
    bidirectional: true,
  },
  energy: {
    keywords: ["total", "shell", "bp plc", "exxon", "chevron", "eni", "equinor"],
    minCount: 2,
    thresholdPct: 2,
    bidirectional: true,
  },
  luxury: {
    keywords: ["lvmh", "hermes", "kering", "moncler", "richemont"],
    minCount: 2,
    thresholdPct: 2,
    bidirectional: true,
  },
  auto: {
    keywords: ["stellantis", "volkswagen", "bmw", "mercedes", "renault", "toyota"],
    minCount: 2,
    thresholdPct: 2,
    bidirectional: true,
  },
  tech_us: {
    keywords: ["apple", "meta platforms", "google", "alphabet", "amazon", "microsoft", "nvidia", "amd"],
    minCount: 2,
    thresholdPct: 2,
    bidirectional: true,
  },
  pharma: {
    keywords: ["sanofi", "bayer", "novartis", "roche", "astrazeneca", "pfizer", "biontech"],
    minCount: 2,
    thresholdPct: 2,
    bidirectional: true,
  },
  private_eq: {
    keywords: ["blue owl", "apollo", "kkr", "carlyle", "ares", "blackstone"],
    minCount: 2,
    thresholdPct: 3,
    bidirectional: false,
  },
};

// ── detectSectorClusters ─────────────────────────────────────────────────────

/**
 * Detect sector clusters among stock movers.
 * When N stocks from the same sector move in the same direction beyond a threshold,
 * a cluster is detected (design doc section 6.2).
 */
export function detectSectorClusters(movers: StockScreenResult[]): SectorCluster[] {
  const clusters: SectorCluster[] = [];

  for (const [sectorId, rule] of Object.entries(SECTOR_RULES)) {
    // Find movers matching sector keywords AND exceeding threshold
    const matchedDown = movers.filter((m) => {
      const nameLower = m.name.toLowerCase();
      return (
        rule.keywords.some((kw) => nameLower.includes(kw)) &&
        m.changePct <= -rule.thresholdPct
      );
    });

    const matchedUp = rule.bidirectional
      ? movers.filter((m) => {
          const nameLower = m.name.toLowerCase();
          return (
            rule.keywords.some((kw) => nameLower.includes(kw)) &&
            m.changePct >= rule.thresholdPct
          );
        })
      : [];

    // Check down cluster
    if (matchedDown.length >= rule.minCount) {
      const avg = matchedDown.reduce((s, m) => s + m.changePct, 0) / matchedDown.length;
      clusters.push({
        sector: sectorId,
        movers: matchedDown.map((m) => ({
          symbol: m.symbol,
          name: m.name,
          changePct: m.changePct,
        })),
        avgChangePct: Math.round(avg * 100) / 100,
        direction: "down",
      });
    }

    // Check up cluster
    if (matchedUp.length >= rule.minCount) {
      const avg = matchedUp.reduce((s, m) => s + m.changePct, 0) / matchedUp.length;
      clusters.push({
        sector: sectorId,
        movers: matchedUp.map((m) => ({
          symbol: m.symbol,
          name: m.name,
          changePct: m.changePct,
        })),
        avgChangePct: Math.round(avg * 100) / 100,
        direction: "up",
      });
    }
  }

  // Sort by number of movers descending
  clusters.sort((a, b) => b.movers.length - a.movers.length);
  return clusters;
}

// ── matchMoversToNews ────────────────────────────────────────────────────────

/**
 * For each stock mover, find the best explanation available.
 * Priority: earnings > direct news > sector cluster > causal chain > none
 * (design doc section 6.1)
 */
export function matchMoversToNews(
  movers: StockScreenResult[],
  news: NewsItem[],
  activeChains: ActiveCausalChain[],
): MoverExplanation[] {
  const sectorClusters = detectSectorClusters(movers);
  const results: MoverExplanation[] = [];

  for (const mover of movers) {
    const explanations: MoverExplanation[] = [];

    // 1. Earnings (highest confidence)
    if (mover.earningsDetail?.publishingToday) {
      explanations.push({
        symbol: mover.symbol,
        name: mover.name,
        changePct: mover.changePct,
        explanationType: "earnings",
        confidence: "high",
        text: formatEarningsExplanation(mover),
      });
    }

    // 2. Direct news (company name/symbol in title)
    const directArticle = findDirectNews(mover, news);
    if (directArticle) {
      explanations.push({
        symbol: mover.symbol,
        name: mover.name,
        changePct: mover.changePct,
        explanationType: "news_direct",
        confidence: "high",
        text: directArticle.title,
        article: directArticle,
      });
    }

    // 3. Sector cluster
    const cluster = findSectorCluster(mover, sectorClusters);
    if (cluster) {
      explanations.push({
        symbol: mover.symbol,
        name: mover.name,
        changePct: mover.changePct,
        explanationType: "sector_theme",
        confidence: "medium",
        text: `Mouvement sectoriel : ${cluster.sector} (${cluster.avgChangePct > 0 ? "+" : ""}${cluster.avgChangePct}%)`,
        sectorCluster: cluster,
      });
    }

    // 4. Causal chain
    const chain = findCausalChain(mover, activeChains);
    if (chain) {
      explanations.push({
        symbol: mover.symbol,
        name: mover.name,
        changePct: mover.changePct,
        explanationType: "causal_chain",
        confidence: "medium",
        text: `Via chaine causale : ${chain.name}`,
        causalChainId: chain.id,
      });
    }

    // Pick best explanation (first in priority order) or "none"
    if (explanations.length > 0) {
      results.push(explanations[0]);
    } else {
      results.push({
        symbol: mover.symbol,
        name: mover.name,
        changePct: mover.changePct,
        explanationType: "none",
        confidence: "low",
        text: "Pas d'explication identifiee",
      });
    }
  }

  return results;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEarningsExplanation(mover: StockScreenResult): string {
  const detail = mover.earningsDetail!;
  const lastQ = detail.lastFourQuarters[0];
  if (lastQ?.epsActual != null && lastQ?.epsEstimate != null) {
    const beat = lastQ.epsActual >= lastQ.epsEstimate;
    return `Resultats ${beat ? "au-dessus" : "en-dessous"} des attentes (EPS: ${lastQ.epsActual} vs ${lastQ.epsEstimate} attendu)`;
  }
  return "Publication de resultats aujourd'hui";
}

/**
 * Find a news article that directly mentions this mover by name or symbol.
 */
function findDirectNews(mover: StockScreenResult, news: NewsItem[]): NewsItem | undefined {
  const symbolClean = mover.symbol.replace(/\..*$/, "").toLowerCase(); // "AIR.PA" → "air"
  const nameLower = mover.name.toLowerCase();

  // Split name into meaningful segments (e.g. "Deere & Company" → ["deere", "company"])
  const nameSegments = nameLower
    .split(/[\s&,\-\/]+/)
    .filter((s) => s.length >= 4);

  for (const article of news) {
    const titleLower = article.title.toLowerCase();

    // Check symbol (only if 3+ chars to avoid false positives like "DE")
    if (symbolClean.length >= 3 && titleLower.includes(symbolClean)) {
      return article;
    }

    // Check full name
    if (nameLower.length >= 5 && titleLower.includes(nameLower)) {
      return article;
    }

    // Check name segments (at least one 5+ char segment)
    for (const seg of nameSegments) {
      if (seg.length >= 5 && titleLower.includes(seg)) {
        return article;
      }
    }
  }

  return undefined;
}

/**
 * Check if this mover belongs to a detected sector cluster.
 */
function findSectorCluster(
  mover: StockScreenResult,
  clusters: SectorCluster[],
): SectorCluster | undefined {
  const nameLower = mover.name.toLowerCase();

  for (const cluster of clusters) {
    // Check if mover is already in this cluster's movers list
    if (cluster.movers.some((m) => m.symbol === mover.symbol)) {
      return cluster;
    }

    // Also check by sector keywords (mover might match but wasn't above threshold)
    const rule = SECTOR_RULES[cluster.sector];
    if (rule && rule.keywords.some((kw) => nameLower.includes(kw))) {
      // Same direction check
      if (
        (cluster.direction === "down" && mover.changePct < 0) ||
        (cluster.direction === "up" && mover.changePct > 0)
      ) {
        return cluster;
      }
    }
  }

  return undefined;
}

/**
 * Check if this mover is affected by an active causal chain.
 */
function findCausalChain(
  mover: StockScreenResult,
  chains: ActiveCausalChain[],
): ActiveCausalChain | undefined {
  const nameLower = mover.name.toLowerCase();
  const symbolLower = mover.symbol.toLowerCase();

  for (const chain of chains) {
    // Check if mover's symbol is in the chain's related assets
    if (chain.relatedAssets.some((a) => a.toLowerCase() === symbolLower)) {
      return chain;
    }

    // Check by sector keywords from the chain name
    // e.g. chain "Iran → Petrole → Airlines" matches airline movers
    const chainNameLower = chain.name.toLowerCase();
    if (chainNameLower.includes("airlines") && SECTOR_RULES.airlines.keywords.some((kw) => nameLower.includes(kw))) {
      return chain;
    }
    if (chainNameLower.includes("banks") && SECTOR_RULES.banks.keywords.some((kw) => nameLower.includes(kw))) {
      return chain;
    }
    if (chainNameLower.includes("energy") && SECTOR_RULES.energy.keywords.some((kw) => nameLower.includes(kw))) {
      return chain;
    }
    if (chainNameLower.includes("private") && SECTOR_RULES.private_eq.keywords.some((kw) => nameLower.includes(kw))) {
      return chain;
    }
    if (chainNameLower.includes("tech") && SECTOR_RULES.tech_us.keywords.some((kw) => nameLower.includes(kw))) {
      return chain;
    }
  }

  return undefined;
}
