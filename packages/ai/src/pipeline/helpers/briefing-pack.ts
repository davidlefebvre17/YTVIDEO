import type { SnapshotFlagged } from "../types";
import type { DailySnapshot } from "@yt-maker/core";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface PoliticalTrigger {
  actor: string;
  action: string;
  sourceTitle: string;
  linkedAssets: string[];
}

export interface ScreenMover {
  symbol: string;
  name: string;
  changePct: number;
  sector: string;
  reasons: string[];
}

export interface EarningsBucket {
  /** Earnings reported today with actual results */
  reported: string[];
  /** Earnings expected today (results not yet out) */
  pending: string[];
  /** Notable upcoming earnings (J+1 to J+7) */
  upcoming: string[];
}

export interface COTHighlight {
  symbol: string;
  name: string;
  bias: string;
  netChange: string;
  daysOld: number;
  flip: boolean;
}

export interface COTDivergence {
  symbol: string;
  name: string;
  cotBias: string;
  priceChangePct: number;
  note: string;
}

export interface SentimentTrend {
  /** Current F&G value */
  current: number;
  /** Current F&G label */
  label: string;
  /** Last 7 days values, most recent first: [today, J-1, J-2, ...] */
  history: Array<{ date: string; value: number }>;
  /** Direction: 'improving' (fear decreasing), 'worsening' (fear increasing), 'stable' */
  direction: 'improving' | 'worsening' | 'stable';
  /** How many consecutive days the trend has been in this direction */
  streak: number;
}

export interface BriefingPack {
  /** 15 most relevant news titles (highest buzz/relevance) */
  topNewsTitles: string[];
  /** Political actors detected in news (heads of state, central bank chairs, etc.) */
  politicalTriggers: PoliticalTrigger[];
  /** Top 10 movers from stock screening (outside 38-asset watchlist) */
  topScreenMovers: ScreenMover[];
  /** Key economic events today/tomorrow */
  calendarHighlights: string[];
  /** Earnings in 3 buckets: reported, pending, upcoming */
  earningsBuckets: EarningsBucket;
  /** COT highlights with age warning */
  cotHighlights: COTHighlight[];
  /** COT bias vs price direction divergences */
  cotDivergences: COTDivergence[];
  /** Upcoming high-impact events (J+1 to J+7) */
  upcomingHighImpact: string[];
  /** Fear & Greed trend over last 7 days */
  sentimentTrend?: SentimentTrend;
}

// Known political actors and their domains
// Aliases use regex patterns for word-boundary matching where needed
interface ActorConfig {
  // Simple substring aliases (matched literally)
  aliases: string[];
  // Regex patterns for aliases that need word boundaries (e.g. short words)
  regexAliases?: RegExp[];
  domain: string;
  linkedAssets: string[];
}

const POLITICAL_ACTORS: Record<string, ActorConfig> = {
  'Trump': {
    aliases: ['trump', 'président américain', 'maison blanche', 'white house'],
    domain: 'US policy',
    linkedAssets: ['DX-Y.NYB', 'CL=F', '^GSPC'],
  },
  'Biden': {
    aliases: ['biden'],
    domain: 'US policy',
    linkedAssets: ['DX-Y.NYB', '^GSPC'],
  },
  'Powell': {
    aliases: ['powell'],
    // "fed chair" only matches if Powell is also mentioned, OR if no other name is nearby
    domain: 'Fed',
    linkedAssets: ['DX-Y.NYB', 'GC=F', '^GSPC'],
  },
  'Lagarde': {
    aliases: ['lagarde'],
    domain: 'ECB',
    linkedAssets: ['EURUSD=X', '^FCHI', '^GDAXI'],
  },
  'BCE/ECB': {
    aliases: ['bce', 'ecb'],
    domain: 'ECB',
    linkedAssets: ['EURUSD=X', '^FCHI', '^GDAXI'],
  },
  'Ueda': {
    aliases: ['ueda', 'boj governor', 'banque du japon'],
    domain: 'BoJ',
    linkedAssets: ['USDJPY=X', '^N225'],
  },
  'Xi Jinping': {
    // NO short alias "xi" — too many false positives (asphyxie, proximus, etc.)
    aliases: ['xi jinping', 'président chinois'],
    // Use regex for "pékin" and "beijing" with word boundaries to reduce false positives
    regexAliases: [/\bpékin\b/i, /\bbeijing\b/i],
    domain: 'China',
    linkedAssets: ['000001.SS', '^HSI', 'HG=F'],
  },
  'Poutine': {
    aliases: ['poutine', 'putin', 'kremlin'],
    regexAliases: [/\bmoscou\b/i],
    domain: 'Russia/Geo',
    linkedAssets: ['CL=F', 'GC=F', 'NG=F'],
  },
  'Fed': {
    aliases: ['federal reserve', 'réserve fédérale', 'fed funds'],
    regexAliases: [/\bthe fed\b/i, /\bla fed\b/i],
    domain: 'Fed',
    linkedAssets: ['DX-Y.NYB', 'GC=F', '^GSPC'],
  },
  'BoJ': {
    aliases: ['bank of japan', 'banque du japon'],
    domain: 'BoJ',
    linkedAssets: ['USDJPY=X', '^N225'],
  },
};

// Action keywords for political triggers.
// Short single-word English keywords (≤4 chars) use word-boundary regex to avoid false
// substring matches (e.g. 'war' inside "Warsh", 'deal' inside "ideal").
const ACTION_KEYWORDS: Record<string, Array<string | RegExp>> = {
  'tarif': ['tariff', 'tarifs', 'tariffs', 'droits de douane', 'customs', 'surtaxe'],
  'guerre': [/\bwar\b/, 'guerre', 'conflit', 'conflict', 'escalade', 'escalation', 'invasion', 'frappe', 'strike', 'bombardement', 'missile'],
  'paix': ['peace', 'paix', 'ceasefire', 'cessez-le-feu', 'accord', /\bdeal\b/, 'négociation', 'désescalade', 'de-escalation', 'trêve'],
  'sanctions': ['sanction', 'sanctions', 'embargo', 'restriction'],
  'taux': ['rate cut', 'rate hike', 'taux directeur', 'hausse des taux', 'baisse des taux', 'pivot', 'pause monétaire'],
  'réserves': ['reserve', 'réserves', 'strategic petroleum', 'SPR', 'réserves stratégiques'],
  'stimulus': ['stimulus', 'relance', 'quantitative easing', 'injection', 'spending', 'dépenses publiques'],
};

// Financial vocabulary required for 'déclaration' fallback triggers (no specific action keyword matched).
// Without this, peripheral actor mentions in non-financial articles create false triggers.
const FINANCIAL_RELEVANCE_TERMS = [
  '%', 'bourse', 'marché', 'marchés', 'wall street', 'cac', 'dax', 'nasdaq', 's&p', 'dow',
  'pétrole', 'baril', 'dollar', 'euro', 'livre sterling', 'yen', 'bitcoin', 'crypto',
  'obligation', 'indice', 'cours du', 'taux', 'inflation', 'récession', 'banque centrale',
  'hausse', 'baisse', 'chute', 'rally', 'crash', 'sell-off', 'selloff',
  'milliards', 'rendement', 'spread', 'yield', 'points de base', 'banque',
];

function matchesKeyword(text: string, keyword: string | RegExp): boolean {
  if (keyword instanceof RegExp) return keyword.test(text);
  return text.includes(keyword);
}

function actorMatchesText(config: ActorConfig, text: string): boolean {
  // Check simple aliases (substring match)
  if (config.aliases.some(a => text.includes(a))) return true;
  // Check regex aliases (word boundary match)
  if (config.regexAliases?.some(r => r.test(text))) return true;
  return false;
}

function detectPoliticalTriggers(news: { title: string; summary?: string }[]): PoliticalTrigger[] {
  const triggers: PoliticalTrigger[] = [];
  const seen = new Set<string>(); // actor+action dedup

  for (const article of news) {
    const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();

    for (const [actor, config] of Object.entries(POLITICAL_ACTORS)) {
      if (!actorMatchesText(config, text)) continue;

      // Find what action keyword matches
      let action = '';
      for (const [actionLabel, keywords] of Object.entries(ACTION_KEYWORDS)) {
        if (keywords.some(k => matchesKeyword(text, k))) {
          action = actionLabel;
          break;
        }
      }

      if (!action) {
        // Fallback 'déclaration': only keep if article has explicit financial vocabulary.
        // This prevents peripheral actor mentions (e.g. Poutine in a crypto article) from
        // creating false triggers.
        const hasFinancialContext = FINANCIAL_RELEVANCE_TERMS.some(t => text.includes(t));
        if (!hasFinancialContext) continue;
        action = 'déclaration';
      }

      const key = `${actor}:${action}`;
      if (seen.has(key)) continue;
      seen.add(key);

      triggers.push({
        actor,
        action,
        sourceTitle: article.title.slice(0, 120),
        linkedAssets: config.linkedAssets,
      });
    }
  }

  return triggers;
}

/**
 * Build the BriefingPack — compact editorial facts for pipeline layers.
 * Called once after P1, passed to C1 and C2 (NOT C3).
 */
export function buildBriefingPack(
  flagged: SnapshotFlagged,
  snapshot: DailySnapshot,
): BriefingPack {
  // ── Top news titles (sorted by relevance heuristic) ──
  const scoredNews = snapshot.news.map(n => {
    let score = 0;
    const title = n.title.toLowerCase();
    // Boost: political actors
    for (const config of Object.values(POLITICAL_ACTORS)) {
      if (actorMatchesText(config, title)) score += 10;
    }
    // Boost: action keywords
    for (const keywords of Object.values(ACTION_KEYWORDS)) {
      if (keywords.some(k => matchesKeyword(title, k))) score += 5;
    }
    // Boost: mentions watchlist assets
    for (const asset of flagged.assets.slice(0, 10)) {
      const sym = asset.symbol.replace(/[=^]/g, '').toLowerCase();
      const name = asset.name.toLowerCase();
      if (title.includes(sym) || title.includes(name)) score += 3;
    }
    // Boost: FR sources (more likely editorial)
    if (n.lang === 'fr') score += 2;
    return { title: n.title, summary: n.summary, score };
  });

  scoredNews.sort((a, b) => b.score - a.score);
  const topNewsTitles = scoredNews
    .slice(0, 15)
    .filter(n => n.score > 0)
    .map(n => n.title.slice(0, 120));

  // ── Political triggers ──
  const politicalTriggers = detectPoliticalTriggers(
    snapshot.news.map(n => ({ title: n.title, summary: n.summary }))
  );

  // ── Top screen movers (outside watchlist) ──
  const watchlistSymbols = new Set(flagged.assets.map(a => a.symbol));
  const topScreenMovers: ScreenMover[] = flagged.screenResults
    .filter(s => !watchlistSymbols.has(s.symbol))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 10)
    .map(s => ({
      symbol: s.symbol,
      name: s.name,
      changePct: s.changePct,
      sector: (s as any).index ?? (s as any).sector ?? '?',
      reasons: s.reason ?? [],
    }));

  // ── Calendar highlights ──
  const calendarHighlights = (flagged.events ?? [])
    .filter(e => e.impact === 'high' || e.impact === 'medium')
    .slice(0, 5)
    .map(e => `${e.time ?? '?'} ${e.name} (${e.currency}, ${e.impact})${e.actual ? ` résultat:${e.actual}` : ` consensus:${e.forecast ?? '?'}`}`);

  // ── Earnings in 3 buckets ──
  // Priority score: watchlist asset > named company > large EPS surprise > default
  function earningsPriority(e: { symbol: string; name?: string; epsActual?: number; epsEstimate?: number }): number {
    let score = 0;
    if (watchlistSymbols.has(e.symbol)) score += 100;
    if (e.name) score += 10; // named = known company (microcaps often have name=undefined)
    if (e.epsActual != null && e.epsEstimate && e.epsEstimate !== 0) {
      const surprisePct = Math.abs((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate) * 100);
      if (surprisePct > 20) score += 8;
      else if (surprisePct > 10) score += 4;
    }
    return score;
  }

  const todayEarnings = snapshot.earnings ?? [];
  const reported = todayEarnings
    .filter(e => e.epsActual != null)
    .sort((a, b) => earningsPriority(b) - earningsPriority(a))
    .slice(0, 10)
    .map(e => {
      const surprise = e.epsEstimate && e.epsEstimate !== 0
        ? ` (${((e.epsActual! - e.epsEstimate) / Math.abs(e.epsEstimate) * 100).toFixed(0)}% surprise)`
        : '';
      const label = e.name ? `${e.symbol} (${e.name.split(' ')[0]})` : e.symbol;
      return `${label} EPS=${e.epsActual}${surprise} [${e.hour}]`;
    });
  const pending = todayEarnings
    .filter(e => e.epsActual == null)
    .sort((a, b) => earningsPriority(b) - earningsPriority(a))
    .slice(0, 8)
    .map(e => `${e.symbol} est=${e.epsEstimate ?? '?'} [${e.hour}]`);
  const tomorrowDate = new Date(snapshot.date);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const upcoming = (snapshot.earningsUpcoming ?? [])
    .slice(0, 10)
    .map(e => {
      const tag = e.date === tomorrowStr ? ' ⚡ DEMAIN' : '';
      return `${e.symbol} ${e.date} [${e.hour}]${tag}`;
    });

  const earningsBuckets: EarningsBucket = { reported, pending, upcoming };

  // ── COT highlights with age warning + flip detection ──
  const cotHighlights: COTHighlight[] = [];
  if (snapshot.cotPositioning) {
    const reportDate = snapshot.cotPositioning.reportDate;
    const daysOld = Math.round(
      (new Date(snapshot.date).getTime() - new Date(reportDate).getTime()) / 86400000,
    );
    for (const contract of snapshot.cotPositioning.contracts) {
      if (contract.current?.signals?.bias && contract.current.signals.bias !== 'neutral') {
        cotHighlights.push({
          symbol: contract.symbol,
          name: contract.name,
          bias: contract.current.signals.bias,
          netChange: contract.current.signals.netChangeSpeculators != null
            ? `${contract.current.signals.netChangeSpeculators > 0 ? '+' : ''}${contract.current.signals.netChangeSpeculators}`
            : '?',
          daysOld,
          flip: contract.current.signals.flipDetected === true,
        });
      }
    }
  }

  // ── COT divergences vs price direction ──
  // Map COT contract symbols to watchlist asset symbols.
  // Includes both standard contract codes (ES, NQ...) and already-mapped FX symbols
  // that may appear inverted in COT data (CADUSD=X → USDCAD=X, etc.).
  const COT_TO_ASSET: Record<string, string> = {
    // Futures contract codes
    'GC': 'GC=F', 'SI': 'SI=F', 'CL': 'CL=F', 'NG': 'NG=F', 'HG': 'HG=F',
    'PL': 'PL=F', 'ZW': 'ZW=F',
    'DX': 'DX-Y.NYB', 'ES': '^GSPC', 'NQ': '^IXIC', 'YM': '^DJI',
    '6E': 'EURUSD=X', '6J': 'USDJPY=X', '6B': 'GBPUSD=X',
    '6A': 'AUDUSD=X', '6C': 'USDCAD=X', '6S': 'USDCHF=X', '6N': 'NZDUSD=X',
    'BTC': 'BTC-USD', 'ETH': 'ETH-USD',
    // Inverted FX symbols from COT data (e.g. CADUSD=X → USDCAD=X)
    'CADUSD=X': 'USDCAD=X', 'CHFUSD=X': 'USDCHF=X',
    'JPY=X': 'USDJPY=X', 'NZDUSD=X': 'NZDUSD=X',
  };
  const cotDivergences: COTDivergence[] = [];
  for (const cot of cotHighlights) {
    const assetSymbol = COT_TO_ASSET[cot.symbol] ?? cot.symbol;
    const asset = flagged.assets.find(a => a.symbol === assetSymbol);
    if (!asset || Math.abs(asset.changePct ?? 0) < 1) continue;

    const priceUp = (asset.changePct ?? 0) > 0;
    // COT bias values: 'long', 'extreme_long', 'short', 'extreme_short', 'neutral'
    const cotBullish = cot.bias.includes('long');
    const cotBearish = cot.bias.includes('short');

    if ((priceUp && cotBearish) || (!priceUp && cotBullish)) {
      cotDivergences.push({
        symbol: assetSymbol,
        name: cot.name,
        cotBias: cot.bias,
        priceChangePct: asset.changePct ?? 0,
        note: priceUp
          ? `Prix en hausse (+${(asset.changePct ?? 0).toFixed(1)}%) mais COT ${cot.bias} — spéculateurs à contre-courant`
          : `Prix en baisse (${(asset.changePct ?? 0).toFixed(1)}%) mais COT ${cot.bias} — divergence spéculateurs/prix`,
      });
    }
  }

  // ── Upcoming high-impact events (J+1 to J+7) ──
  const upcomingHighImpact = (snapshot.upcomingEvents ?? [])
    .filter(e => e.impact === 'high')
    .slice(0, 10)
    .map(e => {
      const tag = e.date === tomorrowStr ? ' ⚡ DEMAIN' : '';
      return `${e.date} ${e.time ?? '?'} ${e.name} (${e.currency})${tag}`;
    });

  // ── Sentiment trend (F&G over last 7 days from previous snapshots) ──
  const sentimentTrend = buildSentimentTrend(snapshot);

  return {
    topNewsTitles,
    politicalTriggers,
    topScreenMovers,
    calendarHighlights,
    earningsBuckets,
    cotHighlights,
    cotDivergences,
    upcomingHighImpact,
    sentimentTrend,
  };
}

/**
 * Build sentiment trend by loading F&G values from previous snapshots.
 * Looks at last 7 available snapshots before the current date.
 */
function buildSentimentTrend(snapshot: DailySnapshot): SentimentTrend | undefined {
  if (!snapshot.sentiment) return undefined;

  const current = snapshot.sentiment.cryptoFearGreed.value;
  const label = snapshot.sentiment.cryptoFearGreed.label;
  const today = snapshot.date;

  // Load previous snapshots' F&G values
  const dataDir = join(process.cwd(), "data");
  const history: Array<{ date: string; value: number }> = [
    { date: today, value: current },
  ];

  try {
    const files = readdirSync(dataDir)
      .filter(f => f.startsWith("snapshot-") && f.endsWith(".json") && !f.includes(today))
      .sort()
      .reverse() // most recent first
      .slice(0, 7);

    for (const file of files) {
      try {
        const raw = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
        if (raw.sentiment?.cryptoFearGreed?.value != null) {
          history.push({
            date: raw.date ?? file.replace("snapshot-", "").replace(".json", ""),
            value: raw.sentiment.cryptoFearGreed.value,
          });
        }
      } catch { /* skip corrupted snapshots */ }
    }
  } catch { /* data dir not available */ }

  if (history.length < 2) {
    return { current, label, history, direction: 'stable', streak: 0 };
  }

  // Determine direction: compare consecutive days
  // "improving" = F&G going up (less fear), "worsening" = F&G going down (more fear)
  let streak = 0;
  let direction: 'improving' | 'worsening' | 'stable' = 'stable';

  for (let i = 0; i < history.length - 1; i++) {
    const diff = history[i].value - history[i + 1].value;
    if (i === 0) {
      if (diff > 2) direction = 'improving';
      else if (diff < -2) direction = 'worsening';
      else direction = 'stable';
    }
    // Count streak in same direction
    if (direction === 'improving' && diff > 0) streak++;
    else if (direction === 'worsening' && diff < 0) streak++;
    else if (direction === 'stable' && Math.abs(diff) <= 2) streak++;
    else break;
  }

  return { current, label, history, direction, streak };
}

/**
 * Format BriefingPack as text sections for injection into LLM prompts.
 */
export function formatBriefingPack(pack: BriefingPack): string {
  let text = '';

  if (pack.politicalTriggers.length) {
    text += `## DÉCLENCHEURS POLITIQUES\n`;
    for (const t of pack.politicalTriggers) {
      text += `- ${t.actor} (${t.action}) — "${t.sourceTitle}" — assets liés: ${t.linkedAssets.join(', ')}\n`;
    }
    text += '\n';
  }

  if (pack.topScreenMovers.length) {
    text += `## MOVERS HORS WATCHLIST (stock screening)\n`;
    for (const m of pack.topScreenMovers) {
      text += `${m.symbol} (${m.name}) ${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}% [${m.sector}] — ${m.reasons.join(', ')}\n`;
    }
    text += '\n';
  }

  if (pack.topNewsTitles.length) {
    text += `## TITRES NEWS CLÉS (top ${pack.topNewsTitles.length})\n`;
    for (const title of pack.topNewsTitles) {
      text += `- ${title}\n`;
    }
    text += '\n';
  }

  if (pack.calendarHighlights.length) {
    text += `## CALENDAR HIGHLIGHTS\n`;
    for (const h of pack.calendarHighlights) {
      text += `- ${h}\n`;
    }
    text += '\n';
  }

  if (pack.earningsBuckets.reported.length || pack.earningsBuckets.pending.length) {
    text += `## EARNINGS DU JOUR\n`;
    if (pack.earningsBuckets.reported.length) {
      text += `Publiés: ${pack.earningsBuckets.reported.join(' | ')}\n`;
    }
    if (pack.earningsBuckets.pending.length) {
      text += `En attente: ${pack.earningsBuckets.pending.join(' | ')}\n`;
    }
    text += '\n';
  }

  if (pack.earningsBuckets.upcoming.length) {
    text += `## EARNINGS À VENIR (7j)\n`;
    text += pack.earningsBuckets.upcoming.join(' | ') + '\n\n';
  }

  if (pack.cotHighlights.length) {
    const daysOld = pack.cotHighlights[0]?.daysOld ?? 99;
    const ageLabel = `J-${daysOld}`;
    // Stale (≥7j) = structural signal only, never cite as confirmation of today's move
    // Fresh (<7j) = can be used more directly, but still with caution
    const usageNote = daysOld >= 7
      ? `⚠️ DONNÉES STRUCTURELLES UNIQUEMENT (rapport du ${ageLabel}) — NE PAS citer comme confirmation d'un move du jour. Usage valide : risque prospectif (capitulation si retournement) ou divergence de fond.`
      : `données du ${ageLabel} — signal frais, mais toujours positionnel (pas intra-day).`;
    text += `## POSITIONNEMENT COT (${usageNote})\n`;
    for (const c of pack.cotHighlights) {
      const flipTag = c.flip ? ' [FLIP DE CAMP]' : '';
      text += `- ${c.symbol} (${c.name}): ${c.bias} | net chg: ${c.netChange}${flipTag} | daysOld: ${daysOld}\n`;
    }
    text += '\n';
  }

  if (pack.cotDivergences.length) {
    const cotDaysOld = pack.cotHighlights[0]?.daysOld ?? 99;
    text += `## DIVERGENCES COT vs PRIX (signal contrarian prospectif — positionnement J-${cotDaysOld} AVANT le move du jour)\n`;
    for (const d of pack.cotDivergences) {
      text += `- ${d.symbol} (${d.name}): ${d.note}\n`;
    }
    text += '\n';
  }

  if (pack.upcomingHighImpact.length) {
    text += `## ÉVÉNEMENTS À VENIR (high impact, 7j)\n`;
    for (const e of pack.upcomingHighImpact) {
      text += `- ${e}\n`;
    }
    text += '\n';
  }

  if (pack.sentimentTrend) {
    const t = pack.sentimentTrend;
    const arrow = t.direction === 'improving' ? '📈' : t.direction === 'worsening' ? '📉' : '➡️';
    const dirLabel = t.direction === 'improving' ? 'peur en recul' : t.direction === 'worsening' ? 'peur croissante' : 'stable';
    const values = t.history.map(h => `${h.value}`).join(' ← ');
    text += `## SENTIMENT TREND (Fear & Greed)\n`;
    text += `${arrow} ${t.current} (${t.label}) — ${dirLabel}${t.streak > 1 ? ` depuis ${t.streak} jours` : ''}\n`;
    text += `Historique: ${values}\n\n`;
  }

  return text;
}
