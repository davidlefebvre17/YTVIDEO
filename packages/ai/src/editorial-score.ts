import type {
  DailySnapshot,
  NewsItem,
  AssetSnapshot,
  Theme,
  ThemesDuJour,
  ActiveCausalChain,
  SectorCluster,
  EventSurprise,
  Language,
} from "@yt-maker/core";
import { clusterNews, buildThemesFromClusters, type ClusteredResult } from "./news-clusterer";
import { detectCausalChains } from "./causal-chain-detector";
import { detectSectorClusters, matchMoversToNews } from "./mover-explainer";
import { analyzeEventSurprises, matchEventsToReaction } from "./event-analyzer";
import { ASSET_KEYWORDS } from "./news-selector";
import { getCompanyProfile, getCompaniesForAsset } from "./company-profiles";

// ── Constants ───────────────────────────────────────────────────────────────

const SQRT_252 = Math.sqrt(252);

/** Editorial score weights (design doc section 6) */
const WEIGHTS = {
  amplitude: 0.25,
  breadth: 0.20,
  surprise: 0.15,
  causalDepth: 0.15,
  symbolic: 0.10,
  newsFrequency: 0.10,
  regimeCoherence: 0.05,
} as const;

// ── Predefined theme definitions for matching ───────────────────────────────

interface ThemeMatchDef {
  id: string;
  label: { fr: string; en: string };
  /** Asset patterns: symbol → expected direction ("up" | "down" | "any") */
  assetPatterns: Array<{ symbol: string; direction: "up" | "down" | "any" }>;
  newsClusterIds: string[];
  eventKeywords: string[];
  causalChainIds: string[];
  regimeType: "risk_off" | "risk_on" | "neutral" | "rotation";
}

const PREDEFINED_THEMES: ThemeMatchDef[] = [
  {
    id: "risk_off",
    label: { fr: "Risk-Off", en: "Risk-Off" },
    assetPatterns: [
      { symbol: "^VIX", direction: "up" },
      { symbol: "^GSPC", direction: "down" },
      { symbol: "GC=F", direction: "up" },
      { symbol: "DX-Y.NYB", direction: "up" },
      { symbol: "BTC-USD", direction: "down" },
    ],
    newsClusterIds: [],
    eventKeywords: [],
    causalChainIds: ["vix_riskoff_gold_crypto"],
    regimeType: "risk_off",
  },
  {
    id: "risk_on",
    label: { fr: "Risk-On", en: "Risk-On" },
    assetPatterns: [
      { symbol: "^VIX", direction: "down" },
      { symbol: "^GSPC", direction: "up" },
      { symbol: "BTC-USD", direction: "up" },
      { symbol: "DX-Y.NYB", direction: "down" },
    ],
    newsClusterIds: [],
    eventKeywords: [],
    causalChainIds: [],
    regimeType: "risk_on",
  },
  {
    id: "oil_shock",
    label: { fr: "Choc petrolier", en: "Oil shock" },
    assetPatterns: [
      { symbol: "CL=F", direction: "up" },
      { symbol: "BZ=F", direction: "up" },
    ],
    newsClusterIds: ["petrole_energie", "geopolitique_iran"],
    eventKeywords: ["oil", "petrole", "opec"],
    causalChainIds: ["iran_oil_airlines", "oil_inflation_fed_tech"],
    regimeType: "neutral",
  },
  {
    id: "dollar_move",
    label: { fr: "Dollar en mouvement", en: "Dollar move" },
    assetPatterns: [
      { symbol: "DX-Y.NYB", direction: "any" },
      { symbol: "EURUSD=X", direction: "any" },
    ],
    newsClusterIds: ["fed_monetary"],
    eventKeywords: ["dollar", "fed", "taux"],
    causalChainIds: ["dollar_commodities_em", "fed_rates_dollar_gold"],
    regimeType: "neutral",
  },
  {
    id: "rate_shock",
    label: { fr: "Choc de taux", en: "Rate shock" },
    assetPatterns: [],
    newsClusterIds: ["fed_monetary", "ecb_monetary", "inflation_cpi"],
    eventKeywords: ["rate", "taux", "fomc", "ecb", "yield"],
    causalChainIds: ["fed_rates_dollar_gold", "cpi_surprise_rates"],
    regimeType: "neutral",
  },
  {
    id: "gold_milestone",
    label: { fr: "Or historique", en: "Gold milestone" },
    assetPatterns: [
      { symbol: "GC=F", direction: "any" },
      { symbol: "SI=F", direction: "any" },
    ],
    newsClusterIds: ["or_metaux_precieux"],
    eventKeywords: [],
    causalChainIds: [],
    regimeType: "neutral",
  },
  {
    id: "crypto_move",
    label: { fr: "Mouvement crypto", en: "Crypto move" },
    assetPatterns: [
      { symbol: "BTC-USD", direction: "any" },
      { symbol: "ETH-USD", direction: "any" },
    ],
    newsClusterIds: ["crypto_market", "crypto_regulation"],
    eventKeywords: [],
    causalChainIds: [],
    regimeType: "neutral",
  },
  {
    id: "china_trade",
    label: { fr: "Commerce / Tarifs", en: "Trade / Tariffs" },
    assetPatterns: [
      { symbol: "DX-Y.NYB", direction: "any" },
      { symbol: "EURUSD=X", direction: "any" },
    ],
    newsClusterIds: ["tarifs_douane", "geopolitique_chine_taiwan"],
    eventKeywords: ["trade", "tariff", "balance", "commerce", "tarifs"],
    causalChainIds: ["tariffs_dollar_yields"],
    regimeType: "neutral",
  },
  {
    id: "earnings_wave",
    label: { fr: "Saison des resultats", en: "Earnings season" },
    assetPatterns: [],
    newsClusterIds: ["earnings_general", "earnings_tech"],
    eventKeywords: ["earnings"],
    causalChainIds: ["earnings_sector_index"],
    regimeType: "neutral",
  },
  {
    id: "inflation_signal",
    label: { fr: "Signal inflation", en: "Inflation signal" },
    assetPatterns: [],
    newsClusterIds: ["inflation_cpi"],
    eventKeywords: ["cpi", "ppi", "pce", "inflation", "prix"],
    causalChainIds: ["cpi_surprise_rates", "oil_inflation_fed_tech"],
    regimeType: "neutral",
  },
  {
    id: "geopolitical",
    label: { fr: "Geopolitique", en: "Geopolitical" },
    assetPatterns: [
      { symbol: "GC=F", direction: "up" },
      { symbol: "CL=F", direction: "up" },
      { symbol: "^VIX", direction: "up" },
    ],
    newsClusterIds: ["geopolitique_iran", "geopolitique_russie_ukraine", "geopolitique_chine_taiwan"],
    eventKeywords: [],
    causalChainIds: ["iran_oil_airlines"],
    regimeType: "risk_off",
  },
  {
    id: "bce_fed",
    label: { fr: "Banque centrale", en: "Central bank" },
    assetPatterns: [],
    newsClusterIds: ["fed_monetary", "ecb_monetary", "boj_monetary"],
    eventKeywords: ["fomc", "ecb", "boj", "fed", "lagarde", "powell"],
    causalChainIds: ["fed_rates_dollar_gold", "ecb_euro_dax_cac", "boj_yen_carry_trade"],
    regimeType: "neutral",
  },
  {
    id: "ai_tech",
    label: { fr: "IA / Semi-conducteurs", en: "AI / Semiconductors" },
    assetPatterns: [
      { symbol: "^IXIC", direction: "any" },
    ],
    newsClusterIds: ["ai_semiconductors"],
    eventKeywords: [],
    causalChainIds: ["ai_semis_nasdaq_rotation"],
    regimeType: "neutral",
  },
];

// ── Round level definitions ─────────────────────────────────────────────────

interface RoundLevelDef {
  symbolPatterns: string[];
  magnitude: number;
  proximity: number; // % proximity required
  score: number;
}

const ROUND_LEVELS: RoundLevelDef[] = [
  // Commodities (gold, oil) — major round levels
  { symbolPatterns: ["GC=F"], magnitude: 1000, proximity: 0.5, score: 15 },
  { symbolPatterns: ["GC=F"], magnitude: 100, proximity: 0.3, score: 8 },
  { symbolPatterns: ["CL=F", "BZ=F"], magnitude: 10, proximity: 0.5, score: 12 },
  { symbolPatterns: ["SI=F"], magnitude: 5, proximity: 0.5, score: 10 },
  // Indices
  { symbolPatterns: ["^GSPC", "^IXIC", "^DJI", "^FCHI", "^GDAXI", "^FTSE", "^N225", "^STOXX"], magnitude: 1000, proximity: 0.3, score: 12 },
  // Crypto
  { symbolPatterns: ["BTC-USD"], magnitude: 10000, proximity: 1, score: 12 },
  { symbolPatterns: ["ETH-USD"], magnitude: 1000, proximity: 1, score: 10 },
  // Forex
  { symbolPatterns: ["EURUSD=X", "GBPUSD=X"], magnitude: 0.01, proximity: 0.2, score: 8 },
  { symbolPatterns: ["USDJPY=X"], magnitude: 5, proximity: 0.2, score: 8 },
  { symbolPatterns: ["DX-Y.NYB"], magnitude: 1, proximity: 0.2, score: 6 },
];

// ── Helper: clamp ───────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── computeAssetSignal ──────────────────────────────────────────────────────

/**
 * Compute asset signal score: refactored drama score using z-score + volume +
 * technical events + symbolic weight + news weight.
 * (design doc section 3)
 */
export function computeAssetSignal(asset: AssetSnapshot, newsCount: number): number {
  try {
    const zMoveScore = computeZMoveScore(asset);
    const volumeConviction = computeVolumeConviction(asset);
    const technicalEvent = computeTechnicalEvent(asset);
    const symbolicWeight = computeSymbolicWeight(asset);
    const newsWeight = Math.min(newsCount, 8) * 2.5;

    return clamp(
      zMoveScore * 25 + volumeConviction + technicalEvent + symbolicWeight + newsWeight,
      0,
      100,
    );
  } catch {
    // Fallback to simple calculation if data is missing
    return Math.min(Math.abs(asset.changePct) * 5 + newsCount * 2, 50);
  }
}

// ── Z-Score calculation ─────────────────────────────────────────────────────

function computeZScore(asset: AssetSnapshot): number {
  const vol20d = asset.multiTF?.daily1y?.volatility20d;
  if (!vol20d || vol20d <= 0) return 0;

  const dailyVol = vol20d / SQRT_252 / 100;
  if (dailyVol <= 0) return 0;

  const changePctDecimal = Math.abs(asset.changePct / 100);
  return changePctDecimal / dailyVol;
}

function computeZMoveScore(asset: AssetSnapshot): number {
  const z = computeZScore(asset);
  if (z < 0.5) return 0;
  if (z <= 1.0) return 1;
  if (z <= 2.0) return 2;
  if (z <= 3.0) return 3;
  return 4; // cap at 4
}

// ── Volume conviction ───────────────────────────────────────────────────────

function computeVolumeConviction(asset: AssetSnapshot): number {
  const volumeVsAvg = asset.multiTF?.daily1y?.volumeVsAvg
    ?? asset.technicals?.volumeAnomaly
    ?? 1;

  if (volumeVsAvg < 0.5) return -5;
  if (volumeVsAvg < 0.8) return 0;
  if (volumeVsAvg <= 1.5) return 0;
  if (volumeVsAvg <= 2.5) return 5;
  if (volumeVsAvg <= 5.0) return 10;
  return 15; // cap at 15
}

// ── Technical event ─────────────────────────────────────────────────────────

function computeTechnicalEvent(asset: AssetSnapshot): number {
  const scores: number[] = [];

  // Breakout 52w high
  if (asset.multiTF?.daily1y?.recentBreakout && asset.changePct > 0) {
    scores.push(10);
  }

  // Breakdown 52w low
  const low52w = asset.multiTF?.daily1y?.low52w;
  if (low52w && asset.price <= low52w * 1.01 && asset.changePct < 0) {
    scores.push(10);
  }

  // Golden cross (we don't have "fresh" detection, so use existing flag)
  if (asset.multiTF?.daily3y?.goldenCross) {
    scores.push(4); // Reduced score since we can't confirm "fresh"
  }

  // RSI extremes
  const rsi = asset.multiTF?.daily3y?.rsi14 ?? asset.technicals?.rsi14;
  if (rsi !== undefined) {
    if (rsi < 20 || rsi > 80) {
      scores.push(5);
    } else if (rsi < 30 || rsi > 70) {
      scores.push(2);
    }
  }

  // Proximity to ATH (< 2%)
  const distATH = asset.multiTF?.weekly10y?.distanceFromATH;
  if (distATH !== undefined && distATH > -2) {
    scores.push(8);
  }

  // Take top 2 events, cap at 20
  scores.sort((a, b) => b - a);
  const total = (scores[0] ?? 0) + (scores[1] ?? 0);
  return Math.min(total, 20);
}

// ── Symbolic weight ─────────────────────────────────────────────────────────

function computeSymbolicWeight(asset: AssetSnapshot): number {
  let roundLevelScore = 0;
  let milestoneScore = 0;

  // Round level proximity
  for (const def of ROUND_LEVELS) {
    if (!def.symbolPatterns.some((p) => asset.symbol === p)) continue;

    const remainder = asset.price % def.magnitude;
    const nearestRound = asset.price - remainder;
    const nextRound = nearestRound + def.magnitude;

    const distToNearest = Math.min(
      Math.abs(asset.price - nearestRound),
      Math.abs(asset.price - nextRound),
    );
    const proximityPct = (distToNearest / asset.price) * 100;

    if (proximityPct <= def.proximity) {
      roundLevelScore = Math.max(roundLevelScore, def.score);
    }
  }

  // Milestone: ATH
  const distATH = asset.multiTF?.weekly10y?.distanceFromATH;
  if (distATH !== undefined) {
    if (distATH > -0.5) {
      milestoneScore = Math.max(milestoneScore, 15);
    } else if (distATH > -5 && asset.changePct > 0) {
      milestoneScore = Math.max(milestoneScore, 5);
    }
  }

  // Milestone: ATL
  const distATL = asset.multiTF?.weekly10y?.distanceFromATL;
  if (distATL !== undefined && distATL < 2) {
    milestoneScore = Math.max(milestoneScore, 15);
  }

  return Math.min(roundLevelScore + milestoneScore, 20);
}

// ── Market regime detection ─────────────────────────────────────────────────

/**
 * Detect the current market regime based on VIX, SPX, Gold, DXY.
 * Returns: "risk_off" | "risk_on" | "rotation" | "incertain"
 */
export function detectMarketRegime(snapshot: DailySnapshot): string {
  const assetMap = new Map<string, AssetSnapshot>();
  for (const a of snapshot.assets) {
    assetMap.set(a.symbol, a);
  }

  const vix = assetMap.get("^VIX");
  const spx = assetMap.get("^GSPC");
  const gold = assetMap.get("GC=F");
  const dxy = assetMap.get("DX-Y.NYB");

  const vixUp = vix && vix.changePct > 3;
  const vixHigh = vix && vix.price > 25;
  const spxDown = spx && spx.changePct < -0.5;
  const spxUp = spx && spx.changePct > 0.5;
  const goldUp = gold && gold.changePct > 0.3;
  const goldDown = gold && gold.changePct < -0.3;
  const dxyUp = dxy && dxy.changePct > 0.3;
  const dxyDown = dxy && dxy.changePct < -0.3;

  // Risk-off: VIX up/high + SPX down + (Gold up OR DXY up)
  let riskOffSignals = 0;
  if (vixUp || vixHigh) riskOffSignals++;
  if (spxDown) riskOffSignals++;
  if (goldUp) riskOffSignals++;
  if (dxyUp) riskOffSignals++;
  if (riskOffSignals >= 3) return "risk_off";

  // Risk-on: VIX falling + SPX up + DXY down
  let riskOnSignals = 0;
  if (vix && vix.changePct < -2) riskOnSignals++;
  if (spxUp) riskOnSignals++;
  if (dxyDown) riskOnSignals++;
  if (goldDown) riskOnSignals++;
  if (riskOnSignals >= 3) return "risk_on";

  // Rotation: SPX flat but sectors diverge
  if (spx && Math.abs(spx.changePct) < 0.3) {
    // Check if any sector clusters show strong divergence via movers
    const movers = snapshot.stockScreen ?? [];
    const gainers = movers.filter((m) => m.changePct > 3);
    const losers = movers.filter((m) => m.changePct < -3);
    if (gainers.length >= 3 && losers.length >= 3) {
      return "rotation";
    }
  }

  return "incertain";
}

// ── scoreTheme ──────────────────────────────────────────────────────────────

/**
 * Compute editorial score for a theme (design doc section 6).
 * Each component normalized [0, 100], final score [0, 100].
 */
export function scoreTheme(
  theme: Theme,
  snapshot: DailySnapshot,
  eventSurprises: EventSurprise[],
  causalChains: ActiveCausalChain[],
  regime: string,
): number {
  const assetMap = new Map<string, AssetSnapshot>();
  for (const a of snapshot.assets) {
    assetMap.set(a.symbol, a);
  }

  // 6.1 Amplitude: max z-score among theme assets
  let maxZ = 0;
  for (const symbol of theme.assets) {
    const asset = assetMap.get(symbol);
    if (asset) {
      const z = computeZScore(asset);
      maxZ = Math.max(maxZ, z);
    }
  }
  const amplitude = clamp(maxZ * 25, 0, 100);

  // 6.2 Breadth: count of assets with z > 0.5
  let zAbove05 = 0;
  for (const symbol of theme.assets) {
    const asset = assetMap.get(symbol);
    if (asset && computeZScore(asset) > 0.5) {
      zAbove05++;
    }
  }
  const breadth = clamp(zAbove05 * 15, 0, 100);

  // 6.3 Surprise: max eventSurpriseScore among theme-related events
  let maxSurprise = 0;
  for (const es of eventSurprises) {
    // Match event to theme by checking if any related asset is in theme
    const eventRelatedToTheme = es.relatedAssets.some((a) => theme.assets.includes(a)) ||
      theme.events.some((eName) =>
        es.eventName.toLowerCase().includes(eName.toLowerCase()) ||
        eName.toLowerCase().includes(es.eventName.toLowerCase()),
      );
    if (eventRelatedToTheme) {
      // Compute eventSurpriseScore (design doc section 4)
      const impactMult = getEventImpactMult(es);
      const rawSurprise = Math.abs(es.surprisePct) / 100;
      const eventScore = Math.min(rawSurprise * impactMult * 25, 30);
      maxSurprise = Math.max(maxSurprise, eventScore);
    }
  }
  const surprise = clamp(maxSurprise * 3.33, 0, 100);

  // 6.4 Causal depth: number of active links in relevant causal chains
  let maxActiveLinks = 0;
  for (const chain of causalChains) {
    // Check if chain is related to theme
    const chainRelated = chain.relatedAssets.some((a) => theme.assets.includes(a)) ||
      (theme.causalChain && theme.causalChain.some((c) =>
        chain.confirmedSteps.some((s) => s.toLowerCase().includes(c.toLowerCase())),
      ));
    if (chainRelated) {
      maxActiveLinks = Math.max(maxActiveLinks, chain.confirmedSteps.length);
    }
  }
  const causalDepth = clamp((maxActiveLinks - 1) * 25, 0, 100);

  // 6.5 Symbolic: max symbolic weight among theme assets
  let maxSymbolic = 0;
  for (const symbol of theme.assets) {
    const asset = assetMap.get(symbol);
    if (asset) {
      maxSymbolic = Math.max(maxSymbolic, computeSymbolicWeight(asset));
    }
  }
  const symbolic = clamp(maxSymbolic * 5, 0, 100);

  // 6.6 News frequency
  const newsFrequency = clamp(theme.newsItems.length * 8, 0, 100);

  // 6.7 Regime coherence
  const regimeCoherence = computeRegimeCoherence(theme, regime);

  // Final weighted score
  const score =
    amplitude * WEIGHTS.amplitude +
    breadth * WEIGHTS.breadth +
    surprise * WEIGHTS.surprise +
    causalDepth * WEIGHTS.causalDepth +
    symbolic * WEIGHTS.symbolic +
    newsFrequency * WEIGHTS.newsFrequency +
    regimeCoherence * WEIGHTS.regimeCoherence;

  // Update breakdown
  theme.breakdown = {
    amplitude: Math.round(amplitude * 10) / 10,
    breadth: Math.round(breadth * 10) / 10,
    surprise: Math.round(surprise * 10) / 10,
    causalDepth: Math.round(causalDepth * 10) / 10,
    symbolic: Math.round(symbolic * 10) / 10,
    newsFrequency: Math.round(newsFrequency * 10) / 10,
    regimeCoherence: Math.round(regimeCoherence * 10) / 10,
  };

  return Math.round(score * 10) / 10;
}

// ── Regime coherence helper ─────────────────────────────────────────────────

function computeRegimeCoherence(theme: Theme, regime: string): number {
  // Find the predefined theme definition if it exists
  const predefined = PREDEFINED_THEMES.find((t) => t.id === theme.id);

  if (!predefined) return 0; // Emergent theme, no regime association

  // Theme IS the dominant regime
  if (
    (predefined.regimeType === "risk_off" && regime === "risk_off") ||
    (predefined.regimeType === "risk_on" && regime === "risk_on")
  ) {
    return 100;
  }

  // Theme is consistent with regime
  if (
    (predefined.regimeType === "risk_off" && regime === "risk_off") ||
    (predefined.regimeType === "risk_on" && regime === "risk_on") ||
    predefined.regimeType === "neutral"
  ) {
    return 50;
  }

  // Theme contradicts regime (decorrelation — interesting!)
  if (
    (predefined.regimeType === "risk_off" && regime === "risk_on") ||
    (predefined.regimeType === "risk_on" && regime === "risk_off")
  ) {
    return 75;
  }

  return 0;
}

// ── Event impact multiplier ─────────────────────────────────────────────────

function getEventImpactMult(es: EventSurprise): number {
  // Infer impact from magnitude since we don't have the original event's impact field
  if (es.magnitude === "major") return 3.0;
  if (es.magnitude === "notable") return 1.5;
  return 0.5;
}

// ── Count news per asset ────────────────────────────────────────────────────

function countNewsPerAsset(news: NewsItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const article of news) {
    const text = (article.title + " " + (article.summary ?? "")).toLowerCase();
    for (const [symbol, keywords] of Object.entries(ASSET_KEYWORDS)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
          break; // Only count once per article per asset
        }
      }
    }
  }

  return counts;
}

// ── Enrich themes with causal chains and sector data ────────────────────────

function enrichThemes(
  themes: Theme[],
  causalChains: ActiveCausalChain[],
  sectorClusters: SectorCluster[],
  eventSurprises: EventSurprise[],
  snapshot: DailySnapshot,
): void {
  const movers = snapshot.stockScreen ?? [];

  for (const theme of themes) {
    // Attach relevant causal chains
    for (const chain of causalChains) {
      const related = chain.relatedAssets.some((a) => theme.assets.includes(a));
      if (related && !theme.causalChain?.length) {
        theme.causalChain = chain.confirmedSteps;
      }
    }

    // Attach sector clusters
    const matchedClusters = sectorClusters.filter((sc) =>
      sc.movers.some((m) => theme.assets.includes(m.symbol)),
    );
    if (matchedClusters.length > 0) {
      theme.sectorClusters = matchedClusters;
      // Also add sector mover symbols to theme assets
      for (const sc of matchedClusters) {
        for (const m of sc.movers) {
          if (!theme.assets.includes(m.symbol)) {
            theme.assets.push(m.symbol);
          }
        }
      }
    }

    // Attach events by matching related assets
    for (const es of eventSurprises) {
      const related = es.relatedAssets.some((a) => theme.assets.includes(a));
      if (related && !theme.events.includes(es.eventName)) {
        theme.events.push(es.eventName);
      }
    }

    // ── Connect movers with earnings to themes via company profiles ──
    // For each watchlist asset in this theme, find screening stocks
    // that are correlated AND have published earnings today.
    // This links e.g. NEM earnings → gold_milestone theme.
    for (const watchlistSymbol of [...theme.assets]) {
      const correlatedStocks = getCompaniesForAsset(watchlistSymbol);
      for (const stockSymbol of correlatedStocks) {
        const mover = movers.find((m) => m.symbol === stockSymbol);
        if (!mover) continue;

        // Only link if the stock has notable activity (earnings or big move)
        const hasEarnings = mover.earningsDetail?.publishingToday;
        const bigMove = Math.abs(mover.changePct) >= 3;
        if (!hasEarnings && !bigMove) continue;

        // Add the stock to theme assets if not already there
        if (!theme.assets.includes(stockSymbol)) {
          theme.assets.push(stockSymbol);
        }

        // Add an earnings-related news item to the theme
        if (hasEarnings) {
          const profile = getCompanyProfile(stockSymbol);
          const earningsNote = profile
            ? `[Earnings] ${profile.name} (${stockSymbol}) publie ses résultats — secteur ${profile.sector}`
            : `[Earnings] ${stockSymbol} publie ses résultats`;
          if (!theme.newsItems.includes(earningsNote)) {
            theme.newsItems.push(earningsNote);
          }
        }
      }
    }
  }
}

// ── Match predefined themes against snapshot ────────────────────────────────

function detectPredefinedThemes(
  snapshot: DailySnapshot,
  clustered: ClusteredResult,
  causalChains: ActiveCausalChain[],
  eventSurprises: EventSurprise[],
): Theme[] {
  const assetMap = new Map<string, AssetSnapshot>();
  for (const a of snapshot.assets) {
    assetMap.set(a.symbol, a);
  }

  const detectedThemes: Theme[] = [];

  for (const def of PREDEFINED_THEMES) {
    let assetDimActive = false;
    let newsDimActive = false;
    let eventDimActive = false;
    let chainDimActive = false;

    // Check asset patterns
    const matchedAssets: string[] = [];
    for (const pattern of def.assetPatterns) {
      const asset = assetMap.get(pattern.symbol);
      if (!asset) continue;
      const z = computeZScore(asset);
      if (z < 0.5) continue;

      const dirOk =
        pattern.direction === "any" ||
        (pattern.direction === "up" && asset.changePct > 0) ||
        (pattern.direction === "down" && asset.changePct < 0);
      if (dirOk) {
        matchedAssets.push(pattern.symbol);
      }
    }
    if (matchedAssets.length >= 1) assetDimActive = true;

    // Check news clusters
    let totalBuzz = 0;
    const matchedNewsItems: string[] = [];
    for (const clusterId of def.newsClusterIds) {
      const cluster = clustered.clusters.find((c) => c.id === clusterId);
      if (cluster && cluster.uniqueInfoCount >= 2) {
        newsDimActive = true;
        totalBuzz += cluster.buzzScore;
        for (const a of cluster.dedupedArticles.slice(0, 2)) {
          if (!matchedNewsItems.includes(a.title)) {
            matchedNewsItems.push(a.title);
          }
        }
      }
    }

    // Check events
    const matchedEvents: string[] = [];
    if (def.eventKeywords.length > 0) {
      const allEvents = [...(snapshot.events ?? []), ...(snapshot.yesterdayEvents ?? [])];
      for (const event of allEvents) {
        const nameLower = event.name.toLowerCase();
        if (def.eventKeywords.some((kw) => nameLower.includes(kw))) {
          eventDimActive = true;
          if (!matchedEvents.includes(event.name)) {
            matchedEvents.push(event.name);
          }
        }
      }
    }

    // Check causal chains
    for (const chainId of def.causalChainIds) {
      if (causalChains.some((c) => c.id === chainId)) {
        chainDimActive = true;
      }
    }

    // Theme is detected if at least 2 dimensions are active
    const activeDims = [assetDimActive, newsDimActive, eventDimActive, chainDimActive]
      .filter(Boolean).length;
    if (activeDims < 2) continue;

    detectedThemes.push({
      id: def.id,
      label: def.label,
      editorialScore: 0,
      buzzScore: totalBuzz,
      assets: matchedAssets,
      events: matchedEvents,
      newsItems: matchedNewsItems.slice(0, 5),
      causalChain: [],
      breakdown: {
        amplitude: 0,
        breadth: 0,
        surprise: 0,
        causalDepth: 0,
        symbolic: 0,
        newsFrequency: 0,
        regimeCoherence: 0,
      },
    });
  }

  return detectedThemes;
}

// ── Merge predefined and cluster-based themes ───────────────────────────────

function mergeThemes(predefined: Theme[], clusterBased: Theme[]): Theme[] {
  const merged = [...predefined];
  const existingIds = new Set(merged.map((t) => t.id));

  // Add cluster-based themes that aren't duplicates
  for (const ct of clusterBased) {
    if (!existingIds.has(ct.id)) {
      merged.push(ct);
      existingIds.add(ct.id);
    } else {
      // Merge assets and news from cluster into existing
      const existing = merged.find((t) => t.id === ct.id)!;
      for (const symbol of ct.assets) {
        if (!existing.assets.includes(symbol)) {
          existing.assets.push(symbol);
        }
      }
      for (const title of ct.newsItems) {
        if (!existing.newsItems.includes(title)) {
          existing.newsItems.push(title);
        }
      }
      existing.buzzScore = Math.max(existing.buzzScore, ct.buzzScore);
    }
  }

  return merged;
}

// ── Diversification filter ──────────────────────────────────────────────────

function diversifyThemes(themes: Theme[], maxCount: number): Theme[] {
  if (themes.length <= maxCount) return themes;

  const selected: Theme[] = [];
  const usedTypes = new Map<string, number>();

  for (const theme of themes) {
    const type = getThemeType(theme.id);
    const typeCount = usedTypes.get(type) ?? 0;

    // Don't allow more than 2 themes of the same type
    if (typeCount >= 2) continue;

    selected.push(theme);
    usedTypes.set(type, typeCount + 1);

    if (selected.length >= maxCount) break;
  }

  // If we didn't fill up, add remaining themes regardless of type
  if (selected.length < maxCount) {
    for (const theme of themes) {
      if (!selected.includes(theme)) {
        selected.push(theme);
        if (selected.length >= maxCount) break;
      }
    }
  }

  return selected;
}

function getThemeType(themeId: string): string {
  if (themeId.startsWith("geopolitique") || themeId === "geopolitical") return "geopolitical";
  if (themeId.includes("monetary") || themeId === "bce_fed" || themeId === "rate_shock") return "central_bank";
  if (themeId.includes("crypto")) return "crypto";
  if (themeId.includes("oil") || themeId.includes("petrole") || themeId.includes("energie")) return "energy";
  if (themeId.includes("earnings")) return "earnings";
  if (themeId.includes("inflation") || themeId.includes("cpi")) return "inflation";
  if (themeId === "risk_off" || themeId === "risk_on") return "regime";
  return themeId; // unique type for everything else
}

// ── buildThemesDuJour — Main orchestrator ───────────────────────────────────

/**
 * Main orchestrator: build the complete ThemesDuJour from snapshot + news.
 * Calls all sub-modules and assembles the final editorial product.
 *
 * 1. clusterNews()
 * 2. detectSectorClusters()
 * 3. detectCausalChains()
 * 4. analyzeEventSurprises() + matchEventsToReaction()
 * 5. Detect predefined themes + build themes from clusters
 * 6. Merge, enrich, score, sort, filter, diversify
 * 7. Return ThemesDuJour
 */
export function buildThemesDuJour(
  snapshot: DailySnapshot,
  news: NewsItem[],
  lang: Language | string,
): ThemesDuJour {
  const movers = snapshot.stockScreen ?? [];
  const allEvents = [
    ...(snapshot.events ?? []),
    ...(snapshot.yesterdayEvents ?? []),
  ];

  // Step 1: Cluster news
  let clustered: ClusteredResult;
  try {
    clustered = clusterNews(news, snapshot, lang);
  } catch {
    clustered = { clusters: [], activeThemes: [], unclusteredNews: news };
  }

  // Step 2: Detect sector clusters among movers
  let sectorClusters: SectorCluster[];
  try {
    sectorClusters = detectSectorClusters(movers);
  } catch {
    sectorClusters = [];
  }

  // Step 3: Detect causal chains
  let causalChains: ActiveCausalChain[];
  try {
    causalChains = detectCausalChains(clustered, snapshot, movers);
  } catch {
    causalChains = [];
  }

  // Step 4: Analyze event surprises + match to reactions
  let eventSurprises: EventSurprise[];
  try {
    eventSurprises = analyzeEventSurprises(allEvents);
    // matchEventsToReaction is informational, we don't need the result here
    // but it could be useful for narration later
    matchEventsToReaction(eventSurprises, snapshot);
  } catch {
    eventSurprises = [];
  }

  // Step 5: Detect predefined themes + build themes from clusters
  let predefinedThemes: Theme[];
  try {
    predefinedThemes = detectPredefinedThemes(
      snapshot, clustered, causalChains, eventSurprises,
    );
  } catch {
    predefinedThemes = [];
  }

  let clusterThemes: Theme[];
  try {
    clusterThemes = buildThemesFromClusters(clustered);
  } catch {
    clusterThemes = [];
  }

  // Step 6: Merge themes
  const allThemes = mergeThemes(predefinedThemes, clusterThemes);

  // Enrich with causal chains, sector clusters, events
  enrichThemes(allThemes, causalChains, sectorClusters, eventSurprises, snapshot);

  // Also enrich theme asset lists with news-count data for asset signal
  const newsPerAsset = countNewsPerAsset(news);
  for (const theme of allThemes) {
    for (const a of snapshot.assets) {
      if (theme.assets.includes(a.symbol)) {
        // Compute and store asset signal (side effect on asset if needed)
        computeAssetSignal(a, newsPerAsset.get(a.symbol) ?? 0);
      }
    }
  }

  // Detect market regime
  const regime = detectMarketRegime(snapshot);

  // Score each theme
  for (const theme of allThemes) {
    theme.editorialScore = scoreTheme(
      theme, snapshot, eventSurprises, causalChains, regime,
    );
  }

  // Sort by editorial score descending
  allThemes.sort((a, b) => b.editorialScore - a.editorialScore);

  // Filter: score >= 15
  const filtered = allThemes.filter((t) => t.editorialScore >= 15);

  // Diversify: max 5 themes, not 3 of the same type
  const selected = diversifyThemes(filtered, 5);

  return {
    themes: selected,
    causalChains,
    sectorClusters,
    eventSurprises,
    marketRegime: regime,
  };
}
