import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot } from "@yt-maker/core";

const KNOWLEDGE_DIR = path.resolve(__dirname, "knowledge");

function readKnowledgeFile(filename: string): string {
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

// ── Signal detection ─────────────────────────────────────────────────────────

/** Central bank event in calendar or significant CB news buzz */
function hasCentralBankSignal(snapshot: DailySnapshot): boolean {
  const kw = [
    "fomc", "ecb", "boj", "boe", "interest rate", "taux directeur",
    "rate decision", "décision de taux", "monetary policy", "politique monétaire",
    "fed funds", "banque centrale",
  ];
  const check = (text: string) => kw.some((k) => text.toLowerCase().includes(k));

  return (
    snapshot.events.some((e) => check(e.name)) ||
    (snapshot.upcomingEvents || []).some((e) => check(e.name)) ||
    snapshot.news.slice(0, 30).filter((n) => check(n.title)).length >= 3
  );
}

/** 3+ geopolitical news items = significant geopolitical buzz */
function hasGeopoliticalSignal(snapshot: DailySnapshot): boolean {
  const kw = [
    "war", "guerre", "conflict", "conflit", "sanction", "tariff", "tarif",
    "military", "militaire", "iran", "russia", "russie", "ukraine",
    "china", "chine", "taiwan", "houthi", "missile", "frappe", "strike",
    "invasion", "otan", "nato", "tension", "escalad", "cease", "cessez",
  ];
  const geoCount = snapshot.news
    .slice(0, 50)
    .filter((n) => kw.some((k) => n.title.toLowerCase().includes(k))).length;
  return geoCount >= 3;
}

/** High-impact macro event in calendar OR VIX spike */
function hasMacroSignal(snapshot: DailySnapshot): boolean {
  const kw = [
    "cpi", "ppi", "gdp", "pib", "nfp", "non-farm", "payroll", "pmi", "ism",
    "retail sales", "inflation", "unemployment", "chômage", "chomage",
    "consumer confidence", "confiance", "jolts", "pce",
  ];
  const macroEvent = snapshot.events.some(
    (e) => e.impact === "high" && kw.some((k) => e.name.toLowerCase().includes(k)),
  );

  // VIX spike (>10% daily change)
  const vix = snapshot.assets.find((a) => a.symbol === "^VIX");
  const vixSpike = vix ? Math.abs(vix.changePct) > 10 : false;

  return macroEvent || vixSpike;
}

/** 5+ assets moving >1.5% = active cross-market day */
function hasIntermarketSignal(snapshot: DailySnapshot): boolean {
  const bigMovers = snapshot.assets.filter((a) => Math.abs(a.changePct) > 1.5).length;
  return bigMovers >= 5;
}

// ── Asset profiles: extract only relevant sections ───────────────────────────

/** Maps asset symbols to patterns found in asset-profiles.md ## headers */
const SYMBOL_PROFILE_PATTERNS: Record<string, string[]> = {
  "GC=F": ["## Or ("],
  "SI=F": ["## Argent"],
  "CL=F": ["## Pétrole"],
  "BZ=F": ["## Pétrole"],
  "BTC-USD": ["## Bitcoin"],
  "ETH-USD": ["## Ethereum"],
  "^GSPC": ["## S&P 500"],
  "^FCHI": ["## CAC 40"],
  "DX-Y.NYB": ["## Dollar Index"],
  "EURUSD=X": ["## EUR/USD"],
  "^VIX": ["## VIX"],
  "HG=F": ["## Cuivre"],
  "NG=F": ["## Gaz naturel"],
  "JPY=X": ["## Yen japonais"],
  "GBPUSD=X": ["## GBP"],
  "AUDUSD=X": ["## Dollar australien"],
  "NZDUSD=X": ["## Dollar néo-zélandais"],
};

/**
 * Extract only the asset profile sections for the top 5 drama-score assets.
 * Includes Carry Trade if JPY/AUD/NZD are in play, Yields if yield data exists,
 * and always appends the narration rules.
 */
function buildAssetProfilesContext(snapshot: DailySnapshot): string {
  const fullContent = readKnowledgeFile("asset-profiles.md");
  if (!fullContent) return "";

  // Split into sections by ## headers
  const rawSections = fullContent.split(/(?=^## )/m);

  // Get top 5 assets by drama score
  const topSymbols = [...snapshot.assets]
    .sort((a, b) => (b.technicals?.dramaScore ?? 0) - (a.technicals?.dramaScore ?? 0))
    .slice(0, 5)
    .map((a) => a.symbol);

  const matched = new Set<string>();
  const result: string[] = [];

  // Match top assets to profile sections
  for (const symbol of topSymbols) {
    const patterns = SYMBOL_PROFILE_PATTERNS[symbol];
    if (!patterns) continue;
    for (const section of rawSections) {
      const firstLine = section.split("\n")[0];
      if (patterns.some((p) => firstLine.includes(p)) && !matched.has(firstLine)) {
        matched.add(firstLine);
        result.push(section.trim());
        break;
      }
    }
  }

  // Include Carry Trade if JPY/AUD/NZD are in top assets
  if (topSymbols.some((s) => s.includes("JPY") || s.includes("AUD") || s.includes("NZD"))) {
    const carry = rawSections.find((s) => s.startsWith("## Carry Trade"));
    if (carry) {
      result.push(carry.trim());
    }
  }

  // Include Yields section if yields data exists
  if (snapshot.yields) {
    const yields = rawSections.find((s) => s.startsWith("## Yields US"));
    if (yields) {
      result.push(yields.trim());
    }
  }

  // Always include narration rules if we have any profiles
  if (result.length > 0) {
    const rules = rawSections.find((s) => s.includes("Règles de narration"));
    if (rules) result.push(rules.trim());
  }

  if (!result.length) return "";
  return `# Profils fondamentaux — Assets du jour\n\n${result.join("\n\n")}`;
}

// ── Main loader ──────────────────────────────────────────────────────────────

/**
 * Load relevant knowledge context based on the day's market snapshot.
 * Returns formatted text for injection into the LLM system prompt.
 *
 * Three-tier injection strategy:
 * - Tier 1 (always): tone + narrative patterns + technical analysis (~4000 tokens)
 * - Tier 2 (conditional): central banks / macro / geopolitics / intermarket
 *   Injected only when the snapshot signals relevance (0-4 files, ~1500-3000 tokens each)
 * - Tier 3 (filtered): asset profiles for top 5 drama assets + active seasonality (~500-1000 tokens)
 *
 * Quiet day: ~5000 tokens. Active day: ~7000-9000 tokens. Max (all triggers): ~13000 tokens.
 */
export function loadKnowledge(snapshot: DailySnapshot): string {
  const sections: string[] = [];

  // ── Tier 1: Always inject (define HOW to write and analyze) ──

  const tone = readKnowledgeFile("tone-references.md");
  if (tone) sections.push(tone);

  const narrative = readKnowledgeFile("narrative-patterns.md");
  if (narrative) sections.push(narrative);

  const technical = readKnowledgeFile("technical-analysis.md");
  if (technical) sections.push(technical);

  // ── Tier 2: Conditional inject based on snapshot signals ──

  if (hasCentralBankSignal(snapshot)) {
    const cb = readKnowledgeFile("central-banks.md");
    if (cb) sections.push(cb);
  }

  if (hasMacroSignal(snapshot)) {
    const macro = readKnowledgeFile("macro-indicators.md");
    if (macro) sections.push(macro);
  }

  if (hasGeopoliticalSignal(snapshot)) {
    const geo = readKnowledgeFile("geopolitics.md");
    if (geo) sections.push(geo);
  }

  if (hasIntermarketSignal(snapshot)) {
    const inter = readKnowledgeFile("intermarket.md");
    if (inter) sections.push(inter);
  }

  // ── Tier 2b: COT positioning (inject when data is available) ──

  if (snapshot.cotPositioning && snapshot.cotPositioning.contracts.length > 0) {
    const cotKnowledge = readKnowledgeFile("cot-positioning.md");
    if (cotKnowledge) sections.push(cotKnowledge);
  }

  // ── Tier 3: Filtered inject ──

  const assetContext = buildAssetProfilesContext(snapshot);
  if (assetContext) sections.push(assetContext);

  const seasonalityContext = buildSeasonalityContext(snapshot.date);
  if (seasonalityContext) sections.push(seasonalityContext);

  return sections.filter(Boolean).join("\n\n---\n\n");
}

// ── Seasonality selection ────────────────────────────────────────────────────

interface SeasonalPattern {
  assets: string[];          // ticker symbols from the watchlist
  name: string;
  startMonth: number;        // 1-12
  startDay: number;          // 1-31
  endMonth: number;          // 1-12
  endDay: number;            // 1-31
  direction: "bullish" | "bearish" | "volatile" | "neutral";
  winRate: number;           // 0-100
  avgReturn?: string;        // e.g. "+3.2%"
  yearsData: number;
  cause: string;             // one-sentence fundamental cause
}

const SEASONAL_PATTERNS: SeasonalPattern[] = [
  // ── S&P 500 ──
  { assets: ["^GSPC"], name: "Effet janvier S&P 500", startMonth: 1, startDay: 1, endMonth: 1, endDay: 15,
    direction: "bullish", winRate: 65, avgReturn: "+1.8%", yearsData: 25,
    cause: "Réallocations institutionnelles en début d'année et rachats d'actions post-résultats annuels." },
  { assets: ["^GSPC", "^IXIC"], name: "Effet septembre (pire mois historique)", startMonth: 9, startDay: 1, endMonth: 9, endDay: 30,
    direction: "bearish", winRate: 58, avgReturn: "-0.7%", yearsData: 25,
    cause: "Retour des institutionnels post-vacances, rebalancement de portefeuilles et rachats de couvertures." },
  { assets: ["^GSPC", "^IXIC"], name: "Santa Claus Rally", startMonth: 12, startDay: 22, endMonth: 1, endDay: 2,
    direction: "bullish", winRate: 75, avgReturn: "+1.3%", yearsData: 25,
    cause: "Faibles volumes, window dressing institutionnel et positionnement optimiste de fin d'année." },
  { assets: ["^GSPC", "^IXIC", "^DJI"], name: "Saison forte Nov-Avr", startMonth: 11, startDay: 1, endMonth: 4, endDay: 30,
    direction: "bullish", winRate: 70, yearsData: 25,
    cause: "Période historiquement forte : résultats Q3/Q4, Black Friday, consommation, réallocations de fonds." },
  { assets: ["^GSPC", "^IXIC"], name: "Sell in May", startMonth: 5, startDay: 1, endMonth: 10, endDay: 31,
    direction: "bearish", winRate: 60, yearsData: 25,
    cause: "Sous-performance estivale vs hiver : réduction des positions, volumes faibles, manque de catalyseurs." },

  // ── Nasdaq / Tech ──
  { assets: ["^IXIC", "XLK"], name: "Force Q4 tech (résultats MAG7)", startMonth: 10, startDay: 1, endMonth: 11, endDay: 30,
    direction: "bullish", winRate: 68, yearsData: 20,
    cause: "Résultats Q3 des grandes techs, Black Friday e-commerce, appétit risk-on d'automne." },

  // ── CAC 40 ──
  { assets: ["^FCHI"], name: "Pression détachement dividendes CAC", startMonth: 5, startDay: 1, endMonth: 6, endDay: 30,
    direction: "bearish", winRate: 72, yearsData: 20,
    cause: "Détachement massif des dividendes des sociétés françaises : pression mécanique sur l'indice." },

  // ── DAX ──
  { assets: ["^GDAXI"], name: "Effet janvier DAX", startMonth: 1, startDay: 1, endMonth: 2, endDay: 28,
    direction: "bullish", winRate: 66, avgReturn: "+2.5%", yearsData: 20,
    cause: "Données industrielles allemandes solides en début d'année, commandes à l'exportation asiatique." },

  // ── Nikkei ──
  { assets: ["^N225"], name: "Fin d'exercice fiscal japonais", startMonth: 3, startDay: 15, endMonth: 3, endDay: 31,
    direction: "volatile", winRate: 60, yearsData: 20,
    cause: "Clôture exercice fiscal 31 mars : ventes de positions, rapatriement de capitaux, pression sur le yen." },

  // ── Or ──
  { assets: ["GC=F"], name: "Force saisonnière or T1", startMonth: 1, startDay: 1, endMonth: 2, endDay: 28,
    direction: "bullish", winRate: 65, avgReturn: "+3.2%", yearsData: 25,
    cause: "Demande bijouterie Asie (Nouvel An chinois, Saint-Valentin), achats banques centrales, incertitude début d'année." },
  { assets: ["GC=F"], name: "Force géopolitique or T3", startMonth: 7, startDay: 1, endMonth: 9, endDay: 30,
    direction: "bullish", winRate: 62, avgReturn: "+2.8%", yearsData: 25,
    cause: "Saison géopolitique estivale, appétit refuge, achats institutionnels préventifs avant rentrée." },
  { assets: ["GC=F"], name: "Faiblesse or printemps", startMonth: 3, startDay: 15, endMonth: 5, endDay: 15,
    direction: "bearish", winRate: 57, yearsData: 25,
    cause: "Fin de la demande bijoux pré-printemps et rotation vers actifs risqués." },

  // ── Argent ──
  { assets: ["SI=F"], name: "Force hivernale argent", startMonth: 12, startDay: 1, endMonth: 2, endDay: 28,
    direction: "bullish", winRate: 61, yearsData: 20,
    cause: "Demande bijouterie mondiale (fêtes, Saint-Valentin), demande panneaux solaires et électronique." },

  // ── Platine ──
  { assets: ["PL=F"], name: "Force hivernale platine", startMonth: 12, startDay: 1, endMonth: 2, endDay: 28,
    direction: "bullish", winRate: 63, avgReturn: "+4.5%", yearsData: 20,
    cause: "Commandes de catalyseurs auto en début d'année, bijoux en Asie, renouvellement stocks joailliers." },

  // ── Cuivre ──
  { assets: ["HG=F"], name: "Restockage cuivre Chine", startMonth: 1, startDay: 1, endMonth: 3, endDay: 31,
    direction: "bullish", winRate: 64, yearsData: 20,
    cause: "La Chine constitue ses stocks de cuivre en début d'année avant la reprise industrielle de printemps." },

  // ── Pétrole WTI ──
  { assets: ["CL=F", "BZ=F"], name: "Faiblesse pétrole hiver", startMonth: 1, startDay: 1, endMonth: 2, endDay: 28,
    direction: "bearish", winRate: 62, avgReturn: "-3.1%", yearsData: 25,
    cause: "Maintenance des raffineries, demande de chauffage en baisse post-janvier, stocks en excès." },
  { assets: ["CL=F", "BZ=F", "XLE"], name: "Force driving season pétrole", startMonth: 5, startDay: 1, endMonth: 6, endDay: 30,
    direction: "bullish", winRate: 65, avgReturn: "+4.2%", yearsData: 25,
    cause: "Saison estivale de conduite américaine, hausse de la demande d'essence raffinée." },
  { assets: ["CL=F", "BZ=F"], name: "Saison ouragans Golfe du Mexique", startMonth: 8, startDay: 1, endMonth: 10, endDay: 31,
    direction: "volatile", winRate: 58, yearsData: 25,
    cause: "Perturbations potentielles des infrastructures pétrolières du Golfe du Mexique." },

  // ── Gaz naturel ──
  { assets: ["NG=F"], name: "Force hivernale gaz naturel", startMonth: 11, startDay: 1, endMonth: 3, endDay: 31,
    direction: "bullish", winRate: 72, avgReturn: "+8.1%", yearsData: 25,
    cause: "Demande de chauffage résidentiel et industriel en hiver nord-américain et européen." },
  { assets: ["NG=F"], name: "Creux printanier gaz naturel (shoulder season)", startMonth: 4, startDay: 1, endMonth: 6, endDay: 30,
    direction: "bearish", winRate: 65, yearsData: 25,
    cause: "Shoulder season : ni chauffage ni climatisation, stocks se reconstituent, prix au plus bas." },

  // ── Blé ──
  { assets: ["ZW=F"], name: "Tensions récolte blé", startMonth: 5, startDay: 1, endMonth: 6, endDay: 30,
    direction: "volatile", winRate: 60, yearsData: 20,
    cause: "Incertitudes météorologiques sur les récoltes de printemps en Europe et Midwest américain." },

  // ── Dollar Index ──
  { assets: ["DX-Y.NYB"], name: "Faiblesse décembre dollar", startMonth: 12, startDay: 1, endMonth: 12, endDay: 31,
    direction: "bearish", winRate: 62, yearsData: 20,
    cause: "Rapatriement de capitaux étrangers vers leurs devises locales et flux de fin d'année." },
  { assets: ["DX-Y.NYB"], name: "Force janvier dollar", startMonth: 1, startDay: 1, endMonth: 1, endDay: 31,
    direction: "bullish", winRate: 60, yearsData: 20,
    cause: "Repositionnement institutionnel, demande de liquidité en dollar, risk-off de début d'année." },

  // ── EUR/USD ──
  { assets: ["EURUSD=X"], name: "Faiblesse EUR/USD Q1", startMonth: 1, startDay: 1, endMonth: 3, endDay: 31,
    direction: "bearish", winRate: 60, yearsData: 20,
    cause: "Rapatriements de capitaux américains, différentiel de taux Fed/BCE favorable au dollar en début d'année." },

  // ── USD/JPY ──
  { assets: ["JPY=X"], name: "Faiblesse yen fin exercice fiscal", startMonth: 3, startDay: 15, endMonth: 4, endDay: 30,
    direction: "bullish", winRate: 68, yearsData: 20,
    cause: "Fin d'exercice fiscal japonais : les institutionnels vendent JPY pour acheter actifs étrangers." },

  // ── Bitcoin ──
  { assets: ["BTC-USD"], name: "Uptober Bitcoin", startMonth: 10, startDay: 1, endMonth: 11, endDay: 30,
    direction: "bullish", winRate: 75, avgReturn: "+22%", yearsData: 12,
    cause: "Repositionnement post-été, appétit risk-on d'automne, anticipation Q4 bull run, flush des shorts." },
  { assets: ["BTC-USD"], name: "Creux estival Bitcoin", startMonth: 8, startDay: 1, endMonth: 9, endDay: 30,
    direction: "bearish", winRate: 65, avgReturn: "-8%", yearsData: 12,
    cause: "Volumes faibles, manque de catalyseurs, ventes tax-loss anticipées, réduction du levier crypto." },
  { assets: ["BTC-USD", "ETH-USD"], name: "Rebond janvier crypto", startMonth: 1, startDay: 1, endMonth: 1, endDay: 31,
    direction: "bullish", winRate: 62, yearsData: 12,
    cause: "Fin des ventes tax-loss de décembre, nouveaux capitaux de début d'année, optimisme du cycle." },
];

/**
 * Build a seasonality context block with ONLY the active patterns for the given date.
 * Returns empty string if no patterns are active (saves tokens).
 */
function buildSeasonalityContext(snapshotDate: string): string {
  const [, monthStr, dayStr] = snapshotDate.split("-");
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const active = SEASONAL_PATTERNS.filter((p) => isInWindow(month, day, p.startMonth, p.startDay, p.endMonth, p.endDay));
  if (!active.length) return "";

  const lines: string[] = ["## Saisonnalités actives\n"];
  for (const p of active) {
    const windowStr = `${p.startDay}/${p.startMonth} → ${p.endDay}/${p.endMonth}`;
    const dirEmoji = p.direction === "bullish" ? "↑" : p.direction === "bearish" ? "↓" : "~";
    const wrStr = `${p.winRate}% WR / ${p.yearsData} ans`;
    const retStr = p.avgReturn ? ` | moy ${p.avgReturn}` : "";
    lines.push(
      `- **${p.name}** (${windowStr}) ${dirEmoji} ${wrStr}${retStr}\n  Assets: ${p.assets.join(", ")} — ${p.cause}`,
    );
  }

  return lines.join("\n");
}

/**
 * Check if month/day falls in the window [startMonth/startDay, endMonth/endDay].
 * Handles year-boundary windows (e.g. Dec 22 → Jan 2).
 */
function isInWindow(
  month: number, day: number,
  startMonth: number, startDay: number,
  endMonth: number, endDay: number,
): boolean {
  // Convert to day-of-year number (approximate, ignores leap year)
  const toDOY = (m: number, d: number) => m * 32 + d;
  const current = toDOY(month, day);
  const start = toDOY(startMonth, startDay);
  const end = toDOY(endMonth, endDay);

  if (start <= end) {
    // Normal window (e.g. Jan 1 → Feb 28)
    return current >= start && current <= end;
  } else {
    // Year-boundary window (e.g. Dec 22 → Jan 2)
    return current >= start || current <= end;
  }
}
