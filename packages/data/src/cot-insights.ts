/**
 * COT Insights — détection automatique de signaux exploitables, vulgarisés en FR.
 *
 * Lit `data/cot-history.json` (5 ans hebdo) + le snapshot COT courant pour
 * produire des insights prêts-à-citer pour Opus, en français humain (pas de
 * jargon "smart money / dumb money / squeeze").
 *
 * Usage :
 *   const insights = computeCotInsights({ scriptAssets, currentCOT, history });
 *   const md = formatCotInsightsMarkdown(insights);
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { COTPositioning, COTContractData } from "@yt-maker/core";

// ── Types ────────────────────────────────────────────────────────────────────

export type CotSignalKind =
  | "EXTREME_LONG"
  | "EXTREME_SHORT"
  | "DIVERGENCE"
  | "CAPITULATION"
  | "FLIP_BIAIS"
  | "CONSENSUS_TRADE"
  | "SHORT_SQUEEZE_RISK"
  | "OI_SURGE"
  | "STRUCTURAL_BREAK_PRODUCERS";

export type CotBucketKey =
  | "assetManagers"
  | "leveragedFunds"
  | "managedMoney"
  | "dealers"
  | "commercials"
  | "producers";

export interface CotInsight {
  symbol: string;
  contractName: string;
  signal: CotSignalKind;
  bucket: CotBucketKey;
  /** 'low' | 'medium' | 'high' — confiance dans le signal */
  confidence: "low" | "medium" | "high";
  /** 'note' = à peine mentionner, 'mention' = utile, 'lead' = signal majeur de la séance */
  severity: "note" | "mention" | "lead";
  /** Phrases prêtes-à-tisser en français (sans jargon technique) */
  narrativeHints: string[];
  /** Métadonnées pour traçabilité */
  meta: {
    percentileRank156w?: number;
    percentileRank260w?: number;
    weeksInDirection?: number;
    lookbackUsed?: number;
    [key: string]: unknown;
  };
}

interface ComputeOptions {
  /** Symbols cités dans le script — ne calcule que pour ceux-là (filtre pertinence) */
  scriptAssets?: string[];
  /** Snapshot COT courant (objet COTPositioning) */
  currentCOT: COTPositioning;
  /** Path vers le fichier d'historique. Défaut : data/cot-history.json */
  historyPath?: string;
  /** Maximum d'insights à retourner (top par sévérité). Défaut : 4 */
  maxInsights?: number;
}

// ── Loader ────────────────────────────────────────────────────────────────────

let _historyCache: Record<string, COTContractData[]> | null = null;
function loadHistory(historyPath: string): Record<string, COTContractData[]> {
  if (_historyCache) return _historyCache;
  if (!existsSync(historyPath)) {
    console.warn(`  [cot-insights] history file not found: ${historyPath}`);
    _historyCache = {};
    return _historyCache;
  }
  try {
    _historyCache = JSON.parse(readFileSync(historyPath, "utf-8"));
    return _historyCache!;
  } catch (e) {
    console.warn(`  [cot-insights] failed to parse history: ${(e as Error).message.slice(0, 80)}`);
    _historyCache = {};
    return _historyCache;
  }
}

// ── Helpers numériques ────────────────────────────────────────────────────────

/** Rank percentile (0-100) du current parmi les nets historiques. */
function percentileRank(values: number[], current: number): number {
  if (values.length === 0) return 50;
  let count = 0;
  for (const v of values) if (v < current) count++;
  return Math.round((count / values.length) * 100);
}

/** Format un nombre de contrats en k humain (-540k, +1,2M, +95k). */
function fmtContracts(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} million de contrats`;
  if (abs >= 100_000) return `${sign}${Math.round(abs / 1000)}k contrats`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1000)}k contrats`;
  return `${sign}${abs}`;
}

/** Format le percentile en phrase humaine ("le plus haut depuis X"). */
function fmtPercentileTime(rank: number, lookbackWeeks: number, weeksAtExtreme: number): string {
  const lookbackYears = Math.round(lookbackWeeks / 52);
  if (rank >= 99) return `un sommet absolu sur ${lookbackYears} ans`;
  if (rank >= 95) return `le plus haut sur ${lookbackYears} ans environ`;
  if (rank >= 85) return `un niveau qu'on n'avait pas vu depuis ${Math.max(1, Math.floor(lookbackYears * (1 - rank / 100)))} an${lookbackYears > 1 ? "s" : ""}`;
  if (rank <= 1) return `un creux absolu sur ${lookbackYears} ans`;
  if (rank <= 5) return `le plus bas sur ${lookbackYears} ans environ`;
  if (rank <= 15) return `un niveau qu'on n'avait pas vu depuis longtemps`;
  return `un niveau notable sur ${lookbackYears} ans`;
}

/** Cherche dans l'historique la dernière semaine où le rank était comparable. */
function lastTimeAtSimilarLevel(
  history: COTContractData[],
  bucket: CotBucketKey,
  currentNet: number,
  isExtremeLong: boolean,
): { weeksAgo: number; date: string } | null {
  // Cherche, en remontant, la dernière fois que la position était plus extrême
  for (let i = 1; i < history.length; i++) {
    const net = getBucket(history[i], bucket)?.netPosition ?? 0;
    if (isExtremeLong && net >= currentNet) {
      // Plus haut que current → on a atteint ce niveau il y a i+1 semaines
      return { weeksAgo: i + 1, date: history[i].reportDate };
    }
    if (!isExtremeLong && net <= currentNet) {
      return { weeksAgo: i + 1, date: history[i].reportDate };
    }
  }
  return null;
}

/** Calcule la variation en contrats sur N semaines. */
function changeOverWeeks(
  history: COTContractData[],
  bucket: CotBucketKey,
  currentNet: number,
  weeks: number,
): number | null {
  if (history.length < weeks) return null;
  const past = getBucket(history[weeks - 1], bucket)?.netPosition;
  if (past === undefined) return null;
  return currentNet - past;
}

function getBucket(d: COTContractData, bucket: CotBucketKey): { netPosition: number; long: number; short: number; pctOfOI: number } | undefined {
  return (d as any)[bucket];
}

/** Renvoie le bucket "spéculatif principal" selon le type de contrat. */
function specBucket(contract: { reportType: "tff" | "disaggregated" }): CotBucketKey {
  return contract.reportType === "tff" ? "leveragedFunds" : "managedMoney";
}

/** Renvoie le bucket "smart money structurelle" selon le type. */
function smartBucket(contract: { reportType: "tff" | "disaggregated" }): CotBucketKey {
  return contract.reportType === "tff" ? "assetManagers" : "producers";
}

/** Nom humain en français pour un bucket, contextualisé par type de contrat. */
function humanBucket(bucket: CotBucketKey, reportType: "tff" | "disaggregated"): string {
  if (bucket === "leveragedFunds" || bucket === "managedMoney") return "les fonds spéculatifs";
  if (bucket === "assetManagers") return "les institutions";
  if (bucket === "dealers") return "les banques";
  if (bucket === "commercials" || bucket === "producers") return "les producteurs";
  return bucket;
}

/** Nom humain courant pour le contrat. */
function humanAsset(symbol: string, name: string): string {
  const map: Record<string, string> = {
    "GC=F": "l'or",
    "SI=F": "l'argent",
    "CL=F": "le pétrole WTI",
    "BZ=F": "le brent",
    "HG=F": "le cuivre",
    "NG=F": "le gaz naturel",
    "BTC-USD": "le bitcoin",
    "^GSPC": "le S&P 500",
    "^IXIC": "le Nasdaq",
    "EURUSD=X": "l'euro",
    "JPY=X": "le yen",
    "GBPUSD=X": "la livre",
    "AUDUSD=X": "le dollar australien",
    "CADUSD=X": "le dollar canadien",
    "CHFUSD=X": "le franc suisse",
    "NZDUSD=X": "le dollar néo-zélandais",
    "DX-Y.NYB": "le dollar index",
  };
  return map[symbol] ?? name;
}

// ── Détecteurs de signaux ─────────────────────────────────────────────────────

function detectExtreme(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
  bucket: CotBucketKey,
): CotInsight | null {
  const cur = getBucket(contract.current, bucket);
  if (!cur) return null;
  const hist156 = history.slice(0, 156);
  if (hist156.length < 50) return null;
  const nets = hist156.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
  const rank156 = percentileRank(nets, cur.netPosition);
  const hist260 = history.slice(0, 260);
  const nets260 = hist260.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
  const rank260 = percentileRank(nets260, cur.netPosition);

  // Persistance : combien de semaines à >=95 ou <=5 sur le rank156 dynamique ?
  let weeksAtExtreme = 0;
  for (let i = 0; i < Math.min(12, hist156.length); i++) {
    const sliceEnd = hist156.slice(i + 1, i + 157);
    if (sliceEnd.length < 50) break;
    const sliceNets = sliceEnd.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
    const r = percentileRank(sliceNets, getBucket(hist156[i], bucket)?.netPosition ?? 0);
    if (r >= 95 || r <= 5) weeksAtExtreme++;
    else break;
  }

  const isExtremeLong = rank156 >= 95;
  const isExtremeShort = rank156 <= 5;
  if (!isExtremeLong && !isExtremeShort) return null;

  const direction = isExtremeLong ? "à la hausse" : "à la baisse";
  const asset = humanAsset(contract.symbol, contract.name);
  const who = humanBucket(bucket, contract.reportType);
  const lookback = hist260.length >= 200 ? 260 : 156;
  const lookbackLabel = fmtPercentileTime(rank156, lookback, weeksAtExtreme);
  const change4w = changeOverWeeks(history, bucket, cur.netPosition, 4);
  const lastSimilar = lastTimeAtSimilarLevel(history, bucket, cur.netPosition, isExtremeLong);

  // Construction de phrase avec chiffres concrets
  const netK = Math.round(Math.abs(cur.netPosition) / 1000);
  const directionPari = isExtremeLong ? "longs (paris à la hausse)" : "shorts (paris à la baisse)";
  const persistenceClause = weeksAtExtreme >= 4
    ? ` Et ce niveau tient depuis ${weeksAtExtreme} semaines, ce n'est pas un coup d'humeur.`
    : "";

  // "Plus haut depuis X" — utilise lastSimilar si trouvé
  let referenceClause = "";
  if (lastSimilar) {
    const monthsAgo = Math.round(lastSimilar.weeksAgo / 4.3);
    referenceClause = monthsAgo >= 12
      ? `, un niveau qu'on n'avait pas vu depuis plus de ${Math.floor(monthsAgo / 12)} an${monthsAgo / 12 >= 2 ? "s" : ""}`
      : monthsAgo >= 2
        ? `, un niveau qu'on n'avait pas vu depuis ${monthsAgo} mois`
        : "";
  } else {
    referenceClause = `, ${lookbackLabel}`;
  }

  // Skip if change is too small to matter (<1k or <1% of net position)
  const changeAbs = Math.abs(change4w ?? 0);
  const changeNotable = changeAbs >= 1000 && changeAbs >= Math.abs(cur.netPosition) * 0.05;
  const changeClause = change4w !== null && changeNotable
    ? ` Sur les quatre dernières semaines, ils ont ${change4w > 0 ? "ajouté" : "retiré"} ${Math.round(changeAbs / 1000)}k contrats.`
    : "";

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: isExtremeLong ? "EXTREME_LONG" : "EXTREME_SHORT",
    bucket,
    confidence: weeksAtExtreme >= 4 ? "high" : "medium",
    severity: weeksAtExtreme >= 4 ? "lead" : "mention",
    narrativeHints: [
      `${who.charAt(0).toUpperCase() + who.slice(1)} sont nets ${directionPari} de ${netK}k contrats sur ${asset}${referenceClause}.${persistenceClause}${changeClause}`,
      `Sur ${asset}, ${who} accumulent ${netK}k contrats ${directionPari}${referenceClause}.`,
    ],
    meta: {
      percentileRank156w: rank156,
      percentileRank260w: rank260,
      weeksInDirection: contract.current.signals?.weeksInDirection,
      weeksAtExtreme,
      currentNetK: netK,
      change4w,
    },
  };
}

function detectDivergence(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
  prices?: Array<{ date: string; close: number }>,
): CotInsight | null {
  if (!prices || prices.length < 5) return null;
  // Cherche le prix il y a ~4 semaines (28j)
  const todayP = prices[prices.length - 1].close;
  const past4w = prices[Math.max(0, prices.length - 28)].close;
  const priceChange4w = (todayP - past4w) / past4w;
  if (Math.abs(priceChange4w) < 0.03) return null; // mouvement trop faible

  const bucket = specBucket(contract);
  const cur = getBucket(contract.current, bucket);
  if (!cur) return null;
  const past4wEntry = history[3]; // history[0] = current-1, history[3] = current-4 (semaines)
  if (!past4wEntry) return null;
  const past4wPos = getBucket(past4wEntry, bucket);
  if (!past4wPos) return null;
  const posChange4w = cur.netPosition - past4wPos.netPosition;

  // Divergence : prix monte mais position baisse (ou inverse)
  const priceUp = priceChange4w > 0;
  const posUp = posChange4w > 0;
  if (priceUp === posUp) return null;

  // Magnitude : la position doit avoir bougé significativement
  const magnitudeOK = Math.abs(posChange4w) > Math.abs(past4wPos.netPosition) * 0.10;
  if (!magnitudeOK) return null;

  const asset = humanAsset(contract.symbol, contract.name);
  const who = humanBucket(bucket, contract.reportType);
  const direction = priceUp ? "monte" : "recule";
  const counterDir = priceUp ? "à la baisse" : "à la hausse";
  const pricePct = Math.abs(Math.round(priceChange4w * 100));
  const posChangeK = Math.round(Math.abs(posChange4w) / 1000);
  const posVerb = posChange4w > 0 ? "ajouté" : "retiré";
  const directionPari = priceUp ? "shorts (paris à la baisse)" : "longs (paris à la hausse)";

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "DIVERGENCE",
    bucket,
    confidence: "high",
    severity: "lead",
    narrativeHints: [
      `${asset.charAt(0).toUpperCase() + asset.slice(1)} ${direction} de ${pricePct}% en quatre semaines, mais sur la même période ${who} ont ${posVerb} ${posChangeK}k contrats ${directionPari} — quand les acteurs les plus rapides cessent de croire au mouvement, c'est souvent un signe d'épuisement.`,
      `Divergence sur ${asset} : le prix ${direction} (${pricePct}% en un mois) alors que ${who} renforcent leurs paris ${counterDir} (${posChangeK}k contrats ${posVerb}s).`,
    ],
    meta: {
      priceChange4wPct: +(priceChange4w * 100).toFixed(2),
      posChange4w,
      posChange4wK: posChangeK,
    },
  };
}

function detectCapitulation(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
): CotInsight | null {
  const bucket = specBucket(contract);
  const cur = getBucket(contract.current, bucket);
  if (!cur) return null;
  // Cherche le peak des 6 dernières semaines
  const window = [contract.current, ...history.slice(0, 6)];
  const nets = window.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
  const peakAbs = Math.max(...nets.map(Math.abs));
  const peakIdx = nets.findIndex((n) => Math.abs(n) === peakAbs);
  const peakNet = nets[peakIdx];
  const reduction = peakNet === 0 ? 0 : (peakNet - cur.netPosition) / Math.abs(peakNet);
  if (Math.abs(reduction) < 0.40) return null;
  if (peakIdx > 4) return null; // peak trop ancien
  // Vérifier que le peak était à un percentile rank élevé
  const hist156 = history.slice(0, 156);
  if (hist156.length < 50) return null;
  const histNets = hist156.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
  const peakRank = percentileRank(histNets, peakNet);
  if (peakRank < 80 && peakRank > 20) return null;

  const asset = humanAsset(contract.symbol, contract.name);
  const who = humanBucket(bucket, contract.reportType);
  const reductionPct = Math.round(Math.abs(reduction) * 100);
  const peakK = Math.round(Math.abs(peakNet) / 1000);
  const currentK = Math.round(Math.abs(cur.netPosition) / 1000);
  const weeksClause = peakIdx === 1 ? "en une semaine"
    : peakIdx === 2 ? "en deux semaines"
    : peakIdx === 3 ? "en trois semaines"
    : `en ${peakIdx} semaines`;

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "CAPITULATION",
    bucket,
    confidence: "high",
    severity: "lead",
    narrativeHints: [
      `Vague de débouclements sur ${asset} : ${who} sont passés de ${peakK}k contrats au pic à ${currentK}k aujourd'hui — près de ${reductionPct}% des positions liquidées ${weeksClause}.`,
      `Sur ${asset}, ${who} sortent en masse — ${peakK}k contrats fin du mois dernier, ${currentK}k aujourd'hui.`,
    ],
    meta: {
      reductionPct,
      peakIdxWeeks: peakIdx,
      peakK,
      currentK,
    },
  };
}

function detectFlipBiais(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
): CotInsight | null {
  const bucket = specBucket(contract);
  const cur = getBucket(contract.current, bucket);
  const prev = getBucket(history[0], bucket);
  if (!cur || !prev) return null;
  if (Math.sign(cur.netPosition) === Math.sign(prev.netPosition)) return null;

  // Magnitude : variation > 5% de l'OI ou > 2σ historique
  const change = cur.netPosition - prev.netPosition;
  const oi = contract.current.openInterest;
  if (oi > 0 && Math.abs(change) / oi < 0.05) return null;

  // Nombre de semaines depuis le dernier flip dans la même direction
  let weeksSinceFlip = 1;
  for (let i = 1; i < history.length; i++) {
    if (Math.sign(getBucket(history[i], bucket)?.netPosition ?? 0) !== Math.sign(prev.netPosition)) break;
    weeksSinceFlip++;
  }
  if (weeksSinceFlip < 4) return null; // flip trop récent ou bruit

  const asset = humanAsset(contract.symbol, contract.name);
  const who = humanBucket(bucket, contract.reportType);
  const newDir = cur.netPosition > 0 ? "haussier" : "baissier";
  const oldDir = cur.netPosition > 0 ? "baissier" : "haussier";
  const newK = Math.round(Math.abs(cur.netPosition) / 1000);
  const monthsLabel = weeksSinceFlip >= 13
    ? `plus de ${Math.floor(weeksSinceFlip / 4.3)} mois`
    : `${weeksSinceFlip} semaines`;

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "FLIP_BIAIS",
    bucket,
    confidence: "medium",
    severity: "mention",
    narrativeHints: [
      `Premier basculement net depuis ${monthsLabel} : ${who} passent de pari ${oldDir} à pari ${newDir} sur ${asset}, désormais ${newK}k contrats nets ${newDir === "haussier" ? "long" : "short"}.`,
      `${asset.charAt(0).toUpperCase() + asset.slice(1)} : ${who} viennent de changer de camp pour la première fois en ${monthsLabel}.`,
    ],
    meta: { weeksSinceFlip, newNetK: newK },
  };
}

function detectConsensusTrade(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
): CotInsight | null {
  if (contract.reportType !== "tff") return null;
  const am = getBucket(contract.current, "assetManagers");
  const lf = getBucket(contract.current, "leveragedFunds");
  if (!am || !lf) return null;
  const hist156 = history.slice(0, 156);
  if (hist156.length < 50) return null;
  const amNets = hist156.map((d) => getBucket(d, "assetManagers")?.netPosition ?? 0);
  const lfNets = hist156.map((d) => getBucket(d, "leveragedFunds")?.netPosition ?? 0);
  const amRank = percentileRank(amNets, am.netPosition);
  const lfRank = percentileRank(lfNets, lf.netPosition);

  const bothHigh = amRank >= 85 && lfRank >= 85;
  const bothLow = amRank <= 15 && lfRank <= 15;
  if (!bothHigh && !bothLow) return null;

  const asset = humanAsset(contract.symbol, contract.name);
  const direction = bothHigh ? "à la hausse" : "à la baisse";
  const amK = Math.round(Math.abs(am.netPosition) / 1000);
  const lfK = Math.round(Math.abs(lf.netPosition) / 1000);
  const directionPari = bothHigh ? "long (paris à la hausse)" : "short (paris à la baisse)";

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "CONSENSUS_TRADE",
    bucket: "leveragedFunds",
    confidence: "high",
    severity: "mention",
    narrativeHints: [
      `Configuration rare sur ${asset} : les institutions (${amK}k contrats nets ${directionPari}) et les fonds spéculatifs (${lfK}k contrats également nets ${directionPari.split(" ")[0]}) parient ${direction} en même temps — tout le monde est sur le même côté du bateau.`,
      `Sur ${asset}, alignement total entre institutions (${amK}k) et hedge funds (${lfK}k), tous deux à des niveaux extrêmes ${direction} — configuration vulnérable à un retournement.`,
    ],
    meta: { amRank156w: amRank, lfRank156w: lfRank, amK, lfK },
  };
}

function detectShortSqueezeRisk(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
  prices?: Array<{ date: string; close: number }>,
): CotInsight | null {
  const bucket = specBucket(contract);
  const cur = getBucket(contract.current, bucket);
  if (!cur) return null;
  const oi = contract.current.openInterest;
  if (oi === 0) return null;
  const shortPctOI = cur.short / oi;
  if (shortPctOI < 0.20) return null;

  const hist156 = history.slice(0, 156);
  if (hist156.length < 50) return null;
  const nets = hist156.map((d) => getBucket(d, bucket)?.netPosition ?? 0);
  const rank = percentileRank(nets, cur.netPosition);
  if (rank > 10) return null;

  // Prix flat sur 4 semaines
  if (prices && prices.length >= 28) {
    const todayP = prices[prices.length - 1].close;
    const past4w = prices[prices.length - 28].close;
    const priceChange4w = Math.abs((todayP - past4w) / past4w);
    if (priceChange4w > 0.05) return null; // si baisse continue, pas de squeeze
  }

  const asset = humanAsset(contract.symbol, contract.name);
  const shortPctRound = Math.round(shortPctOI * 100);
  const shortK = Math.round(cur.short / 1000);

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "SHORT_SQUEEZE_RISK",
    bucket,
    confidence: "medium",
    severity: "mention",
    narrativeHints: [
      `${shortPctRound}% des positions ouvertes sur ${asset} sont à découvert (${shortK}k contrats), un niveau historiquement haut. Au moindre signal positif, ces vendeurs devront racheter — c'est ce qui produit les rebonds violents.`,
      `Sur ${asset}, ${shortK}k contrats à la baisse côté fonds spéculatifs (${shortPctRound}% des positions ouvertes). Configuration similaire au yen en août 2024 — squeeze possible si le prix refuse de baisser.`,
    ],
    meta: {
      shortPctOI: +(shortPctOI * 100).toFixed(1),
      percentileRank156w: rank,
      shortK,
    },
  };
}

function detectStructuralBreakProducers(
  contract: COTPositioning["contracts"][number],
  history: COTContractData[],
): CotInsight | null {
  if (contract.reportType !== "disaggregated") return null;
  const cur = getBucket(contract.current, "producers") ?? getBucket(contract.current, "commercials");
  if (!cur) return null;
  const hist260 = history.slice(0, 260);
  if (hist260.length < 100) return null;
  const pcts = hist260.map((d) => {
    const p = getBucket(d, "producers") ?? getBucket(d, "commercials");
    return p?.pctOfOI ?? 0;
  });
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const variance = pcts.reduce((a, b) => a + (b - mean) * (b - mean), 0) / pcts.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  const zScore = (cur.pctOfOI - mean) / std;
  if (Math.abs(zScore) < 2.5) return null;

  const asset = humanAsset(contract.symbol, contract.name);
  const direction = zScore > 0 ? "réduisent leur couverture, signe qu'ils anticipent une hausse durable" : "augmentent leur couverture, signe qu'ils anticipent une baisse";
  const stdDev = Math.abs(zScore).toFixed(1).replace(".", ",");
  const meanRound = mean.toFixed(1).replace(".", ",");
  const currentRound = cur.pctOfOI.toFixed(1).replace(".", ",");

  return {
    symbol: contract.symbol,
    contractName: contract.name,
    signal: "STRUCTURAL_BREAK_PRODUCERS",
    bucket: "producers",
    confidence: "high",
    severity: "lead",
    narrativeHints: [
      `Anomalie rare sur ${asset} : les producteurs ${direction}. Leur posture est aujourd'hui à ${currentRound}% des positions ouvertes — bien loin de leur moyenne historique de ${meanRound}%. Ce sont les mieux placés pour savoir.`,
      `Mouvement inhabituel des producteurs de ${asset} : ils ${direction.split(",")[0]} (${currentRound}% des positions vs ${meanRound}% en moyenne sur cinq ans).`,
    ],
    meta: { zScore: +zScore.toFixed(2), mean: +mean.toFixed(2), currentPct: cur.pctOfOI },
  };
}

// ── Orchestration ─────────────────────────────────────────────────────────────

const ALL_DETECTORS = [
  detectExtreme,
  detectDivergence,
  detectCapitulation,
  detectFlipBiais,
  detectConsensusTrade,
  detectShortSqueezeRisk,
  detectStructuralBreakProducers,
];

export function computeCotInsights(opts: ComputeOptions & {
  pricesBySymbol?: Record<string, Array<{ date: string; close: number }>>;
  /** Date de publication de l'épisode (YYYY-MM-DD). Défaut : aujourd'hui. */
  publishDate?: string;
}): CotInsight[] {
  const { currentCOT, scriptAssets, maxInsights = 4 } = opts;
  const historyPath = opts.historyPath ?? join(process.cwd(), "data", "cot-history.json");
  const history = loadHistory(historyPath);

  // ── Gestion de l'âge du rapport COT ──
  // Réalité CFTC : publication vendredi pour données mardi → 3 jours de lag
  // built-in. Run typique le lundi = 6-7 jours déjà. Donc seuils peu sévères :
  //   0-9 jours  = fresh (normal — couvre une semaine de pipeline normale)
  //   10-16 jours = aging (1 semaine manquée — encore exploitable)
  //   17-30 jours = stale (plusieurs semaines manquées — usage structurel uniquement)
  //   >30 jours   = suppress (anomalie majeure)
  const today = opts.publishDate ?? new Date().toISOString().slice(0, 10);
  const reportDate = currentCOT.reportDate;
  const daysOld = Math.round((new Date(today).getTime() - new Date(reportDate).getTime()) / 86400000);

  if (daysOld > 30) {
    console.log(`  [cot-insights] report too old (${daysOld}d, >30j), skipping`);
    return [];
  }

  if (Object.keys(history).length === 0) {
    console.log(`  [cot-insights] no history available, skipping insights`);
    return [];
  }

  // Auto-merge : si le snapshot courant est plus récent que la dernière entrée
  // d'historique pour un contrat, on l'ajoute en mémoire (n'écrit pas le fichier).
  // Bénéfice : pas besoin de relancer fetch-cot-history quand un nouveau rapport sort.
  for (const contract of currentCOT.contracts) {
    const sym = contract.symbol;
    const h = history[sym] ?? [];
    if (h.length === 0 || h[0].reportDate < contract.current.reportDate) {
      history[sym] = [contract.current, ...h];
    }
  }

  const filterSet = scriptAssets ? new Set(scriptAssets) : null;
  const insights: CotInsight[] = [];

  for (const contract of currentCOT.contracts) {
    if (filterSet && !filterSet.has(contract.symbol)) continue;
    const contractHistory = history[contract.symbol] ?? [];
    if (contractHistory.length < 50) continue;
    const prices = opts.pricesBySymbol?.[contract.symbol];

    // Run extreme on the spec bucket (lev funds / managed money)
    const specB = specBucket(contract);
    const extreme = detectExtreme(contract, contractHistory, specB);
    if (extreme) insights.push(extreme);

    // Run other detectors
    const divergence = detectDivergence(contract, contractHistory, prices);
    if (divergence) insights.push(divergence);
    const capitulation = detectCapitulation(contract, contractHistory);
    if (capitulation) insights.push(capitulation);
    const flip = detectFlipBiais(contract, contractHistory);
    if (flip) insights.push(flip);
    const consensus = detectConsensusTrade(contract, contractHistory);
    if (consensus) insights.push(consensus);
    const squeeze = detectShortSqueezeRisk(contract, contractHistory, prices);
    if (squeeze) insights.push(squeeze);
    const structural = detectStructuralBreakProducers(contract, contractHistory);
    if (structural) insights.push(structural);
  }

  // Downgrade selon l'âge — seuils tolérants vu le lag CFTC + la réalité du pipeline
  //   0-9 jours   : fresh, severity inchangée (cas normal)
  //   10-16 jours : aging, lead → mention
  //   17-30 jours : stale, lead → mention, mention → note
  const stalenessTier: 'fresh' | 'aging' | 'stale' =
    daysOld <= 9 ? 'fresh' : daysOld <= 16 ? 'aging' : 'stale';
  for (const ins of insights) {
    if (stalenessTier === 'aging' && ins.severity === 'lead') ins.severity = 'mention';
    if (stalenessTier === 'stale') {
      if (ins.severity === 'lead') ins.severity = 'mention';
      else if (ins.severity === 'mention') ins.severity = 'note';
    }
    ins.meta.daysOld = daysOld;
    ins.meta.stalenessTier = stalenessTier;
  }

  // Tri par sévérité (lead > mention > note) puis confidence (high > medium > low)
  const sevOrder = { lead: 3, mention: 2, note: 1 };
  const confOrder = { high: 3, medium: 2, low: 1 };
  insights.sort((a, b) => (sevOrder[b.severity] - sevOrder[a.severity]) || (confOrder[b.confidence] - confOrder[a.confidence]));

  // Diversifier par symbol pour ne pas saturer un seul actif
  const seen = new Set<string>();
  const filtered: CotInsight[] = [];
  for (const ins of insights) {
    if (seen.has(ins.symbol) && filtered.length >= 2) continue; // 1 par symbol après les 2 premiers
    if (filtered.length >= maxInsights) break;
    filtered.push(ins);
    seen.add(ins.symbol);
  }

  return filtered;
}

/** Génère un markdown lisible avec règle "optionnel — ne cite que si pertinent". */
export function formatCotInsightsMarkdown(insights: CotInsight[], reportDate?: string, publishDate?: string): string {
  if (insights.length === 0) return "";
  let header = `## SIGNAUX DE POSITIONNEMENT`;
  let stalenessNote = "";
  if (reportDate) {
    const today = publishDate ?? new Date().toISOString().slice(0, 10);
    const daysOld = Math.round((new Date(today).getTime() - new Date(reportDate).getTime()) / 86400000);
    header += ` (rapport du ${reportDate}, ${daysOld} jour${daysOld > 1 ? "s" : ""} d'ancienneté)`;
    if (daysOld <= 9) stalenessNote = " Données récentes.";
    else if (daysOld <= 16) stalenessNote = " Données déjà partiellement digérées par le marché — à utiliser comme contexte structurel, pas comme timing immédiat.";
    else stalenessNote = " Données âgées — utilisable uniquement pour rappeler une position structurelle, pas pour un commentaire d'actualité immédiate.";
  }
  let md = `${header}\n\n`;
  md += `**Optionnel** : ces signaux viennent du dernier rapport CFTC (positions des fonds spéculatifs et institutions sur les marchés à terme).${stalenessNote} Ne les cite QUE si l'un d'eux est directement pertinent pour un segment de ton récit. Si aucun ne l'est, ne mentionne pas le COT — pas besoin d'en parler à chaque épisode. Pioche au maximum un signal et tisse-le naturellement, jamais en énumération.\n\n`;
  for (const ins of insights) {
    md += `**${ins.contractName}** — ${ins.signal.toLowerCase()} (${ins.severity}, ${ins.confidence})\n`;
    md += `→ ${ins.narrativeHints[0]}\n`;
    if (ins.narrativeHints[1]) md += `   alt : ${ins.narrativeHints[1]}\n`;
    md += `\n`;
  }
  return md;
}
