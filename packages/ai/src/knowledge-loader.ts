import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot } from "@yt-maker/core";

const KNOWLEDGE_DIR = path.resolve(__dirname, "knowledge");

function readKnowledgeFile(filename: string): string {
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Load relevant knowledge context based on the day's market snapshot.
 * Returns formatted text for injection into the LLM system prompt.
 * Target: 500-1500 tokens of highly relevant context.
 */
export function loadKnowledge(snapshot: DailySnapshot): string {
  const sections: string[] = [];

  // Always inject: intermarket relationships + narrative patterns
  const intermarket = readKnowledgeFile("intermarket.md");
  if (intermarket) sections.push(intermarket);

  const narrative = readKnowledgeFile("narrative-patterns.md");
  if (narrative) sections.push(narrative);

  // Always inject technical analysis guide (needed for deep dives)
  const technical = readKnowledgeFile("technical-analysis.md");
  if (technical) sections.push(technical);

  // Always inject macro indicators (VIX, yields, F&G context)
  const macro = readKnowledgeFile("macro-indicators.md");
  if (macro) sections.push(macro);

  // Always inject geopolitical context (causal chains, region profiles)
  const geopolitics = readKnowledgeFile("geopolitics.md");
  if (geopolitics) sections.push(geopolitics);

  // Conditional: central banks (if we have the file and there's a rate event)
  const hasCentralBankEvent = snapshot.events.some(
    (e) =>
      e.name.toLowerCase().includes("fomc") ||
      e.name.toLowerCase().includes("ecb") ||
      e.name.toLowerCase().includes("boj") ||
      e.name.toLowerCase().includes("interest rate"),
  );
  if (hasCentralBankEvent) {
    const centralBanks = readKnowledgeFile("central-banks.md");
    if (centralBanks) sections.push(centralBanks);
  }

  // Conditional: asset profiles (if we have the file)
  const assetProfiles = readKnowledgeFile("asset-profiles.md");
  if (assetProfiles) sections.push(assetProfiles);

  // Conditional: seasonality — inject only active windows for the snapshot date
  const seasonalityContext = buildSeasonalityContext(snapshot.date);
  if (seasonalityContext) sections.push(seasonalityContext);

  return sections.join("\n\n---\n\n");
}

// ── Seasonality selection ──────────────────────────────────────────────────────

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
