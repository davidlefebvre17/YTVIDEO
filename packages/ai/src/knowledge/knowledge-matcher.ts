// ── Knowledge Chunk Matcher ───────────────────────────────
// Deterministic scoring of knowledge chunks against the day's
// snapshot, editorial plan, and detected signals.
// Returns top 35 chunks sorted by relevance score.

import { readFileSync } from "fs";
import * as path from "path";
import type { DailySnapshot, EconomicEvent, NewsItem } from "@yt-maker/core";
import type { SnapshotFlagged, EditorialPlan, MaterialityFlag } from "../pipeline/types";
import type { PoliticalTrigger } from "../pipeline/helpers/briefing-pack";
import type { ChunkIndex, ChunkMeta, ScoredChunk } from "./chunk-types";

// ── Index cache ──────────────────────────────────────────

let cachedIndex: ChunkIndex | null = null;

function loadIndex(): ChunkIndex {
  if (cachedIndex) return cachedIndex;
  const indexPath = path.resolve(__dirname, "chunks", "index.json");
  const raw = readFileSync(indexPath, "utf-8");
  cachedIndex = JSON.parse(raw) as ChunkIndex;
  return cachedIndex;
}

/** Reset cache (useful for tests) */
export function resetIndexCache(): void {
  cachedIndex = null;
}

// ── Priority bonus map ───────────────────────────────────

const PRIORITY_BONUS: Record<ChunkMeta["priority"], number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

// ── Geo keywords for news scanning ──────────────────────

const GEO_KEYWORDS: Array<{ pattern: RegExp; themes: string[] }> = [
  // Middle East
  { pattern: /\b(iran|israel|gaza|hamas|hezbollah|houthi|yémen|yemen)\b/i, themes: ["geopolitique", "moyen-orient"] },
  { pattern: /\b(ormuz|hormuz|mer\s+rouge|red\s+sea|suez|détroit)\b/i, themes: ["geopolitique", "moyen-orient"] },
  { pattern: /\b(arabie\s+saoudite|saudi|opec|opep)\b/i, themes: ["geopolitique", "moyen-orient"] },
  // Russia-Ukraine
  { pattern: /\b(ukrain|russie|russia|kremlin|poutine|putin|zelensky|moscou|moscow)\b/i, themes: ["geopolitique", "russie-ukraine"] },
  { pattern: /\b(mer\s+noire|black\s+sea)\b/i, themes: ["geopolitique", "russie-ukraine"] },
  // China-Taiwan
  { pattern: /\b(taiwan|taïwan|chine|china|xi\s*jinping|pékin|beijing|tsmc|semi.?conducteur)\b/i, themes: ["geopolitique", "chine-taiwan"] },
  // Trade & tariffs
  { pattern: /\b(tarif|tariff|droits?\s+de\s+douane|trade\s+war|guerre\s+commerciale)\b/i, themes: ["geopolitique", "tarifs"] },
  { pattern: /\b(sanction|embargo|restriction|surtaxe|rétorsion|retaliation)\b/i, themes: ["geopolitique", "sanctions"] },
  // Alliances & diplomacy
  { pattern: /\b(otan|nato|g7|g20)\b/i, themes: ["geopolitique"] },
  { pattern: /\b(cessez.?le.?feu|ceasefire|armistice|trêve|négociation|traité|treaty)\b/i, themes: ["geopolitique"] },
  // Conflict terms
  { pattern: /\b(guerre|war|conflit|conflict|escalade|escalation|invasion|missile|drone|frappe|bombardement)\b/i, themes: ["geopolitique"] },
  { pattern: /\b(nucléaire|nuclear|terroris|attentat)\b/i, themes: ["geopolitique"] },
  // BRICS & emerging
  { pattern: /\b(brics|corée\s+du\s+nord|north\s+korea)\b/i, themes: ["geopolitique"] },
];

// ── Macro keywords for news/event theme detection ──

const MACRO_KEYWORDS: Array<{ pattern: RegExp; theme: string }> = [
  // Inflation
  { pattern: /\b(cpi|ipc|ppi|pce|inflation|deflat|désinfla|stagflat)\b/i, theme: "inflation" },
  { pattern: /\b(prix\s+à\s+la\s+consommation|consumer\s+price|core\s+inflation)\b/i, theme: "inflation" },
  // Employment
  { pattern: /\b(nfp|non.?farm|payroll|emploi|employment|unemployment|chômage|jobless|claims)\b/i, theme: "emploi" },
  { pattern: /\b(salaires|wages|hourly\s+earnings)\b/i, theme: "emploi" },
  // Growth & GDP
  { pattern: /\b(gdp|pib|récession|recession|croissance|growth|contraction|ralentissement)\b/i, theme: "pib" },
  // Manufacturing & services
  { pattern: /\b(pmi|ism|manufacturing|industrie|services\s+pmi|composite\s+pmi)\b/i, theme: "croissance" },
  // Rates & CB
  { pattern: /\b(taux\s+directeur|fed\s+funds|rate\s+cut|rate\s+hike|rate\s+decision|rate\s+pause)\b/i, theme: "taux" },
  { pattern: /\b(quantitative\s+easing|qe|quantitative\s+tightening|qt|tapering|bilan\s+fed)\b/i, theme: "qe-qt" },
  // Consumer
  { pattern: /\b(retail\s+sales|ventes?\s+(au\s+)?détail|consumer\s+confidence|confiance\s+consommateur)\b/i, theme: "croissance" },
  // Housing
  { pattern: /\b(housing|logement|immobilier|mortgage|hypothéca)\b/i, theme: "croissance" },
  // Debt
  { pattern: /\b(debt\s+ceiling|plafond\s+(de\s+la\s+)?dette|shutdown|déficit\s+budgétaire)\b/i, theme: "dette" },
];

// ── Central bank keywords ──

const CB_KEYWORDS: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\b(fomc|fed|federal\s+reserve|réserve\s+fédérale|powell|warsh|waller|bowman|kashkari)\b/i, theme: "fed" },
  { pattern: /\b(dot\s+plot|projections?\s+économiques|summary\s+of\s+economic)\b/i, theme: "fed" },
  { pattern: /\b(ecb|bce|lagarde|schnabel|lane|banque\s+centrale\s+européenne)\b/i, theme: "bce" },
  { pattern: /\b(zone\s+euro|eurozone|tpi|pepp)\b/i, theme: "bce" },
  { pattern: /\b(boj|banque\s+du\s+japon|bank\s+of\s+japan|ueda|ycc|yield\s+curve\s+control)\b/i, theme: "boj" },
  { pattern: /\b(boe|bank\s+of\s+england|bailey|mpc)\b/i, theme: "boe" },
  { pattern: /\b(rba|rbnz|snb|banque\s+nationale\s+suisse|riksbank)\b/i, theme: "banque-centrale" },
];

// ── Financial stress keywords ──

const FINANCIAL_STRESS_KEYWORDS: Array<{ pattern: RegExp; themes: string[] }> = [
  { pattern: /\b(bank\s+run|ruée\s+bancaire|faillite\s+bancaire|bank\s*rupt)\b/i, themes: ["stress-financier", "risk-off"] },
  { pattern: /\b(cds|credit\s+default|swap\s+de\s+défaut)\b/i, themes: ["stress-financier"] },
  { pattern: /\b(margin\s+call|appel\s+de\s+marge|liquidation\s+forcée|forced\s+selling)\b/i, themes: ["stress-financier", "volatilite"] },
  { pattern: /\b(contagion|systémique|systemic\s+risk|risque\s+systémique)\b/i, themes: ["stress-financier", "risk-off"] },
  { pattern: /\b(bail.?out|bail.?in|sauvetage|fdic|stress\s+test)\b/i, themes: ["stress-financier"] },
];

// ── Market structure keywords ──

const MARKET_STRUCTURE_KEYWORDS: Array<{ pattern: RegExp; themes: string[] }> = [
  { pattern: /\b(triple\s+witching|expiration\s+options|échéance|expiry)\b/i, themes: ["structure-marche", "volatilite"] },
  { pattern: /\b(short\s+squeeze|gamma\s+squeeze|squeeze)\b/i, themes: ["structure-marche", "volatilite"] },
  { pattern: /\b(flash\s+crash|crash\s+éclair|circuit\s+breaker|coupe.?circuit)\b/i, themes: ["flash-crash", "volatilite"] },
  { pattern: /\b(algo|algorithmi|hft|high.?frequency)\b/i, themes: ["structure-marche"] },
];

// ── Big-move symbols with special theme mapping ─────────

const SYMBOL_THEME_MAP: Record<string, string[]> = {
  "GC=F": ["refuge"],
  "SI=F": ["refuge"],
  "USDJPY=X": ["carry-trade"],
  "AUDUSD=X": ["carry-trade"],
  "NZDUSD=X": ["carry-trade"],
  "CL=F": ["inflation"],
  "BZ=F": ["inflation"],
  "NG=F": ["inflation"],
  "HG=F": ["croissance"],
  "^VIX": ["volatilite"],
  "BTC-USD": ["crypto-cycle"],
  "ETH-USD": ["crypto-cycle"],
  "DX-Y.NYB": ["taux"],
  "TLT": ["taux"],
  "XLE": ["rotation-sectorielle"],
  "XLK": ["rotation-sectorielle"],
  "XLF": ["rotation-sectorielle"],
};

const BIG_MOVE_THRESHOLD = 2; // percent

// ── Theme detection ─────────────────────────────────────

export function detectActiveThemes(
  flagged: SnapshotFlagged,
  editorial: EditorialPlan,
  detectedActors: string[],
): string[] {
  const themes = new Set<string>();

  // Collect all flags across all assets
  const allFlags = new Set<MaterialityFlag>();
  for (const asset of flagged.assets) {
    for (const f of asset.flags) allFlags.add(f);
  }

  // ── Flag-based themes ──

  if (allFlags.has("POLITICAL_TRIGGER")) themes.add("geopolitique");

  if (allFlags.has("MACRO_SURPRISE")) {
    // Check events for specific macro type
    const macroEvents = [...(flagged.events || []), ...(flagged.yesterdayEvents || [])];
    let matched = false;
    for (const ev of macroEvents) {
      const name = ev.name.toLowerCase();
      if (/\b(cpi|ppi|inflation|prix)\b/.test(name)) {
        themes.add("inflation");
        matched = true;
      }
      if (/\b(nfp|non.?farm|emploi|payroll|unemployment|chômage)\b/.test(name)) {
        themes.add("emploi");
        matched = true;
      }
      if (/\b(gdp|pib|growth)\b/.test(name)) {
        themes.add("pib");
        matched = true;
      }
    }
    if (!matched) themes.add("croissance");
  }

  if (allFlags.has("RSI_EXTREME")) {
    themes.add("analyse-technique");
    themes.add("confluence");
  }

  if (allFlags.has("COT_DIVERGENCE")) themes.add("cot-positioning");

  if (allFlags.has("SENTIMENT_EXTREME")) themes.add("volatilite");

  if (allFlags.has("CAUSAL_CHAIN")) {
    if (editorial.moodMarche === "risk-off") {
      themes.add("risk-off");
    } else {
      themes.add("risk-on");
    }
  }

  if (allFlags.has("ATH_PROXIMITY")) themes.add("momentum");

  if (allFlags.has("SMA200_CROSS")) themes.add("analyse-technique");

  if (allFlags.has("EARNINGS_SURPRISE") || allFlags.has("EARNINGS_TODAY")) {
    themes.add("earnings");
  }

  // ── Mood-based themes ──

  switch (editorial.moodMarche) {
    case "risk-off":
      themes.add("risk-off");
      themes.add("refuge");
      themes.add("volatilite");
      break;
    case "risk-on":
      themes.add("risk-on");
      themes.add("momentum");
      break;
    case "rotation":
      themes.add("rotation-sectorielle");
      break;
  }

  // ── Actor-based themes ──

  const actorsLower = detectedActors.map((a) => a.toLowerCase());
  for (const actor of actorsLower) {
    if (actor === "powell" || actor === "fed") {
      themes.add("fed");
      themes.add("banque-centrale");
    }
    if (actor === "lagarde" || actor === "bce") {
      themes.add("bce");
      themes.add("banque-centrale");
    }
    if (actor === "ueda" || actor === "boj") {
      themes.add("boj");
      themes.add("banque-centrale");
    }
  }

  // ── Symbol-specific themes ──

  const episodeSymbols = new Set<string>();
  for (const seg of editorial.segments) {
    for (const s of seg.assets) episodeSymbols.add(s);
  }

  if (episodeSymbols.has("GC=F")) themes.add("refuge");

  for (const [sym, symThemes] of Object.entries(SYMBOL_THEME_MAP)) {
    if (!episodeSymbols.has(sym)) continue;
    const asset = flagged.assets.find((a) => a.symbol === sym);
    if (asset && Math.abs(asset.changePct) >= BIG_MOVE_THRESHOLD) {
      for (const t of symThemes) themes.add(t);
    }
  }

  // ── Always include seasonality ──

  themes.add("saisonnalite");

  // ── News-based geo themes ──

  const allNews: NewsItem[] = flagged.news || [];
  for (const newsItem of allNews) {
    const text = `${newsItem.title} ${newsItem.summary || ""}`;
    for (const { pattern, themes: geoThemes } of GEO_KEYWORDS) {
      if (pattern.test(text)) {
        for (const t of geoThemes) themes.add(t);
      }
    }
  }

  // ── News-based macro/CB/stress/structure themes ──
  for (const newsItem of allNews) {
    const text = `${newsItem.title} ${newsItem.summary || ""}`;
    for (const { pattern, theme } of MACRO_KEYWORDS) {
      if (pattern.test(text)) themes.add(theme);
    }
    for (const { pattern, theme } of CB_KEYWORDS) {
      if (pattern.test(text)) {
        themes.add(theme);
        themes.add("banque-centrale");
      }
    }
    for (const { pattern, themes: stressThemes } of FINANCIAL_STRESS_KEYWORDS) {
      if (pattern.test(text)) {
        for (const t of stressThemes) themes.add(t);
      }
    }
    for (const { pattern, themes: structThemes } of MARKET_STRUCTURE_KEYWORDS) {
      if (pattern.test(text)) {
        for (const t of structThemes) themes.add(t);
      }
    }
  }

  // ── Calendar event-based themes ──
  for (const event of [...(flagged.events || []), ...(flagged.yesterdayEvents || [])]) {
    const name = event.name.toLowerCase();
    for (const { pattern, theme } of MACRO_KEYWORDS) {
      if (pattern.test(name)) themes.add(theme);
    }
    for (const { pattern, theme } of CB_KEYWORDS) {
      if (pattern.test(name)) {
        themes.add(theme);
        themes.add("banque-centrale");
      }
    }
  }

  return Array.from(themes);
}

// ── Mood → regime mapping ───────────────────────────────

function moodToRegime(mood: EditorialPlan["moodMarche"]): string {
  switch (mood) {
    case "risk-on":
      return "risk-on";
    case "risk-off":
      return "risk-off";
    case "rotation":
      return "rotation";
    case "incertain":
      return "incertain";
    default:
      return "incertain";
  }
}

// ── Intersection helper ─────────────────────────────────

function intersect(a: string[], b: Set<string>): string[] {
  return a.filter((x) => b.has(x));
}

// ── Main matcher ────────────────────────────────────────

export function matchChunks(
  flagged: SnapshotFlagged,
  editorial: EditorialPlan,
  snapshot: DailySnapshot,
  actors?: PoliticalTrigger[],
): ScoredChunk[] {
  const index = loadIndex();

  // ── Extract signals ──

  // All symbols from editorial segments
  const symbolsInEpisode = new Set<string>();
  for (const seg of editorial.segments) {
    for (const s of seg.assets) symbolsInEpisode.add(s);
  }

  // All active flags across flagged assets
  const activeFlags = new Set<string>();
  for (const asset of flagged.assets) {
    for (const f of asset.flags) activeFlags.add(f);
  }

  // Political actors
  const detectedActorNames = (actors || []).map((a) => a.actor);
  const activeActors = new Set<string>(detectedActorNames);

  // Active themes
  const activeThemes = new Set<string>(
    detectActiveThemes(flagged, editorial, detectedActorNames),
  );

  // Current regime
  const currentRegime = moodToRegime(editorial.moodMarche);

  // Current month (1-12)
  const currentMonth = new Date(snapshot.date || flagged.date).getMonth() + 1;

  // VIX level
  let vixLevel: number | null = null;
  const vixAsset = snapshot.assets?.find(
    (a) => a.symbol === "^VIX" || a.symbol === "VIX" || a.symbol === "^VIXCLS",
  );
  if (vixAsset) {
    vixLevel = vixAsset.price;
  }

  // Build a map of symbol → changePct for big-move checks
  const changePctBySymbol = new Map<string, number>();
  for (const asset of flagged.assets) {
    changePctBySymbol.set(asset.symbol, Math.abs(asset.changePct));
  }

  // ── Score each chunk ──

  const scored: ScoredChunk[] = [];

  for (const chunk of index.chunks) {
    let score = 0;
    const reasons: string[] = [];

    // Symbol matches (+3 each)
    const matchedSymbols = intersect(chunk.symbols, symbolsInEpisode);
    if (matchedSymbols.length > 0) {
      score += matchedSymbols.length * 3;
      reasons.push(`symbols: ${matchedSymbols.join(", ")}`);
    }

    // Theme matches (+2 each)
    const matchedThemes = intersect(chunk.themes, activeThemes);
    if (matchedThemes.length > 0) {
      score += matchedThemes.length * 2;
      reasons.push(`themes: ${matchedThemes.join(", ")}`);
    }

    // Flag matches (+2 each)
    const matchedFlags = intersect(chunk.conditions.flags, activeFlags);
    if (matchedFlags.length > 0) {
      score += matchedFlags.length * 2;
      reasons.push(`flags: ${matchedFlags.join(", ")}`);
    }

    // Actor matches (+3 each)
    const matchedActors = intersect(chunk.conditions.actors, activeActors);
    if (matchedActors.length > 0) {
      score += matchedActors.length * 3;
      reasons.push(`actors: ${matchedActors.join(", ")}`);
    }

    // Regime match (+2)
    if (chunk.conditions.regimes.length > 0 && chunk.conditions.regimes.includes(currentRegime)) {
      score += 2;
      reasons.push(`regime: ${currentRegime}`);
    }

    // VIX condition (+1)
    if (chunk.conditions.vix_above !== null && vixLevel !== null && vixLevel >= chunk.conditions.vix_above) {
      score += 1;
      reasons.push(`vix ${vixLevel} >= ${chunk.conditions.vix_above}`);
    }

    // any_symbol_move: at least one chunk symbol in episode with >2% move (+2)
    if (chunk.conditions.any_symbol_move) {
      for (const sym of matchedSymbols) {
        const pct = changePctBySymbol.get(sym);
        if (pct !== undefined && pct > BIG_MOVE_THRESHOLD) {
          score += 2;
          reasons.push(`big move: ${sym} (${pct.toFixed(1)}%)`);
          break;
        }
      }
    }

    // Seasonality month match (+1)
    if (
      chunk.conditions.seasonality_months.length > 0 &&
      chunk.conditions.seasonality_months.includes(currentMonth)
    ) {
      score += 1;
      reasons.push(`seasonality: month ${currentMonth}`);
    }

    // Priority bonus
    const bonus = PRIORITY_BONUS[chunk.priority];
    if (bonus > 0) {
      score += bonus;
      reasons.push(`priority: ${chunk.priority}`);
    }

    // always_if_symbol override
    if (chunk.always_if_symbol && matchedSymbols.length > 0) {
      score = Math.max(score, 100);
      reasons.push("always_if_symbol");
    }

    // always_if_theme override
    if (chunk.always_if_theme && matchedThemes.length > 0) {
      score = Math.max(score, 100);
      reasons.push("always_if_theme");
    }

    if (score > 0) {
      scored.push({ id: chunk.id, score, reasons });
    }
  }

  // Sort by score descending, then by id for stability
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  // Return top 35
  return scored.slice(0, 35);
}
