import type { SnapshotFlagged } from "../types";
import type { DailySnapshot, EconomicEvent } from "@yt-maker/core";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { labelEventDate } from "./temporal-anchors";

// ── Temporal classifier for economic events ──
// Publication cutoff = 07:00 UTC (morning broadcast assumption)
const PUB_CUTOFF_HOUR = 7;

/**
 * Classify an economic event relative to the covered session and publication time.
 *
 * - `session_day`        : event happened on session day — impacted the covered move
 * - `pre_session`        : event happened before session — historical context
 * - `pub_morning_before` : event on pub day, scheduled BEFORE pub cutoff (07:00 UTC) — already public at viewing
 * - `pub_morning_after`  : event on pub day, scheduled AFTER pub cutoff — NOT YET PUBLIC for viewer, futur
 * - `upcoming`           : event after pub day — future event in the coming week
 */
export type EventWhen =
  | 'session_day'
  | 'pre_session'
  | 'pub_morning_before'
  | 'pub_morning_after'
  | 'upcoming';

export function classifyEventTemporal(
  event: EconomicEvent,
  sessionDate: string,
  pubDate: string,
): EventWhen {
  const evDate = event.date;
  if (!evDate) return 'session_day';
  if (evDate < sessionDate) return 'pre_session';
  if (evDate === sessionDate) return 'session_day';
  if (evDate === pubDate) {
    // Extract hour from event.time (format HH:MM)
    const h = parseInt((event.time || '00:00').slice(0, 2), 10) || 0;
    return h < PUB_CUTOFF_HOUR ? 'pub_morning_before' : 'pub_morning_after';
  }
  return 'upcoming';
}

/**
 * Format an event with its actuals for narration prompts.
 * Includes actual/forecast/previous if present.
 */
export function formatEventWithContext(event: EconomicEvent): string {
  let line = `${event.time ?? '?'} ${event.name} (${event.currency}, ${event.impact})`;
  if (event.forecast) line += ` consensus:${event.forecast}`;
  if (event.actual) line += ` résultat:${event.actual}`;
  if (event.previous) line += ` précédent:${event.previous}`;
  return line;
}

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
  /** Watchlist tickers (snapshot.assets) reporting in the upcoming window — editorially priority */
  upcomingWatchlist: string[];
  /** Other notable upcoming earnings — context for narrative fit, not all need to be cited */
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
  /** 15 most relevant news with temporal tags */
  topNewsTitles: Array<{
    title: string;
    /** ISO date (YYYY-MM-DD) of publication */
    publishedDate: string;
    /** Human-readable label relative to viewer's day (e.g. "hier (jeudi 30 avril)",
     *  "aujourd'hui vendredi 1 mai"). Lets the LLM pick the right relative
     *  marker without inferring weekdays from raw dates. */
    whenLabel: string;
    /** Temporal tag relative to market session covered */
    when: 'before_session' | 'during_session' | 'post_session' | 'pre_publication';
  }>;
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
  /** OBLIGATORY macro stats released today/yesterday (curated list — must be
   *  mentioned at least once in some segment, not as a dedicated segment) */
  obligatoryMacroStats: string[];
  /** Central bank speeches from yesterday that deserve editorial attention */
  cbSpeechesYesterday: string[];
  /** Fear & Greed trend over last 7 days */
  sentimentTrend?: SentimentTrend;
}

// ── OBLIGATORY macro stats — patterns that MUST be mentioned ──
// Keyed by currency, value = regex matching the event name. When such an
// event lands in today/yesterday with `actual` value populated, it is
// pulled out and surfaced as a non-skippable bullet in the prompt.
const OBLIGATORY_MACRO_PATTERNS: Record<string, RegExp> = {
  USD: /\b(FOMC|Fed Interest Rate Decision|Fed Decision|Non[\s-]?Farm Payrolls|NFP|Initial Jobless Claims|(Core )?CPI(?! ratio)|(Core )?PCE Price Index|GDP Growth|GDP Annualized)\b/i,
  EUR: /\b(ECB Interest Rate Decision|ECB Decision|Deposit Facility Rate|HICP|Inflation Rate (YoY|MoM) Flash|GDP Growth Rate (QoQ|YoY)( Adv)?|HCOB.*Composite PMI|PMI Composite)\b/i,
  GBP: /\b(BoE Interest Rate Decision|BoE Decision|Bank of England.*(Rate|Decision)|CPI(?! ratio)|GDP Growth Rate)\b/i,
  JPY: /\b(BoJ Interest Rate Decision|BoJ Decision|Bank of Japan.*(Rate|Decision)|CPI(?! ratio)|GDP Growth Rate|Tankan)\b/i,
};

/** Format a single macro stat into a one-liner with actual / forecast / surprise. */
function formatObligatoryStat(e: { name: string; currency: string; impact?: string; time?: string; actual?: string; forecast?: string; previous?: string; date?: string }, snapshotDate: string): string | null {
  // Compute surprise pct when both present
  let surpriseStr = '';
  const a = e.actual ? parseFloat(e.actual) : NaN;
  const f = e.forecast ? parseFloat(e.forecast) : NaN;
  if (!isNaN(a) && !isNaN(f) && f !== 0) {
    const pct = ((a - f) / Math.abs(f)) * 100;
    const sign = pct >= 0 ? '+' : '';
    surpriseStr = ` (surprise ${sign}${pct.toFixed(1)}%)`;
  }
  const dateLabel = e.date && e.date !== snapshotDate ? `${e.date} ` : '';
  const parts = [
    `[${e.currency}]`,
    dateLabel + (e.name ?? '?'),
    e.actual ? `actual=${e.actual}` : null,
    e.forecast ? `forecast=${e.forecast}` : null,
    e.previous ? `prev=${e.previous}` : null,
  ].filter(Boolean);
  return parts.join(' ') + surpriseStr;
}

// Known political actors and their domains
// Aliases use regex patterns for word-boundary matching where needed
export interface ActorConfig {
  // Simple substring aliases (matched literally)
  aliases: string[];
  // Regex patterns for aliases that need word boundaries (e.g. short words)
  regexAliases?: RegExp[];
  domain: string;
  linkedAssets: string[];
}

export const POLITICAL_ACTORS: Record<string, ActorConfig> = {
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
    domain: 'Fed',
    linkedAssets: ['DX-Y.NYB', 'GC=F', '^GSPC'],
  },
  'Warsh': {
    aliases: ['warsh', 'kevin warsh'],
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
export const ACTION_KEYWORDS: Record<string, Array<string | RegExp>> = {
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

// COT contract symbols → watchlist asset symbols
export const COT_TO_ASSET: Record<string, string> = {
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

export function matchesKeyword(text: string, keyword: string | RegExp): boolean {
  if (keyword instanceof RegExp) return keyword.test(text);
  return text.includes(keyword);
}

export function actorMatchesText(config: ActorConfig, text: string): boolean {
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
    return { title: n.title, summary: n.summary, score, publishedAt: n.publishedAt };
  });

  scoredNews.sort((a, b) => b.score - a.score);
  // Tag helper: classify an economic event temporally relative to session vs publication
  // Publication assumed at 07:00 UTC (morning broadcast)
  // Tag chaque news avec sa position temporelle relative à la séance couverte
  // snapshot.date = jour de séance (ex: vendredi), pubDate = lendemain matin (samedi) ou +3j en Monday mode
  const sessionDate = snapshot.date;
  const nextDay = (() => {
    const d = new Date(sessionDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  // Quota séparé par bucket temporel pour garantir qu'Opus ait assez de news
  // pour EXPLIQUER le move (before+during) ET pour contextualiser "à venir" (post+pre).
  // Sans ce quota, les news récentes (post_session) risquent de dominer en score et
  // de laisser Opus sans matériau pour la séance couverte.
  const classify = (publishedAt: string | undefined): 'before_session' | 'during_session' | 'post_session' | 'pre_publication' => {
    const publishedDate = (publishedAt || '').slice(0, 10) || sessionDate;
    if (publishedDate < sessionDate) return 'before_session';
    if (publishedDate === sessionDate) return 'during_session';
    if (publishedDate === nextDay) return 'post_session';
    return 'pre_publication';
  };
  const relevant = scoredNews.filter(n => n.score > 0);
  const newsExplain = relevant.filter(n => {
    const w = classify(n.publishedAt);
    return w === 'before_session' || w === 'during_session';
  }).slice(0, 15);
  const newsUpcoming = relevant.filter(n => {
    const w = classify(n.publishedAt);
    return w === 'post_session' || w === 'pre_publication';
  }).slice(0, 5);
  const topNewsTitles = [...newsExplain, ...newsUpcoming].map(n => {
    const publishedDate = (n.publishedAt || '').slice(0, 10) || sessionDate;
    return {
      title: n.title.slice(0, 120),
      publishedDate,
      whenLabel: labelEventDate(publishedDate, sessionDate),
      when: classify(n.publishedAt),
    };
  });

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

  // ── Calendar highlights (today's events — labeled "hier" from viewer perspective) ──
  const calendarHighlights = (flagged.events ?? [])
    .filter(e => e.impact === 'high' || e.impact === 'medium')
    .slice(0, 5)
    .map(e => `hier ${e.time ?? '?'} ${e.name} (${e.currency}, ${e.impact})${e.actual ? ` résultat:${e.actual}` : ` consensus:${e.forecast ?? '?'}`}`);

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

  // Split upcoming earnings into two pools:
  //   1. WATCHLIST: tickers tracked in snapshot.assets — guaranteed visibility for narrative integration
  //   2. OTHER: remaining earnings sorted by date — context, the LLM cites if narrative-relevant
  const trackedAssetSymbols = new Set(
    (snapshot.assets ?? []).map(a => a.symbol.toUpperCase()),
  );
  const allUpcoming = snapshot.earningsUpcoming ?? [];
  const fmtUpcoming = (e: typeof allUpcoming[number]): string => {
    const dateLabel = labelEventDate(e.date, snapshot.date);
    const tag = e.name ? `${e.symbol}/${e.name}` : e.symbol;
    return `${tag} ${dateLabel} [${e.hour}]`;
  };
  const upcomingWatchlist = allUpcoming
    .filter(e => trackedAssetSymbols.has(e.symbol.toUpperCase()))
    .slice(0, 12)
    .map(fmtUpcoming);
  const upcoming = allUpcoming
    .filter(e => !trackedAssetSymbols.has(e.symbol.toUpperCase()))
    .slice(0, 12)
    .map(fmtUpcoming);

  const earningsBuckets: EarningsBucket = { reported, pending, upcomingWatchlist, upcoming };

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

  // ── Upcoming high-impact events (J+1 to J+7) — labeled with temporal context ──
  const upcomingHighImpact = (snapshot.upcomingEvents ?? [])
    .filter(e => e.impact === 'high')
    .slice(0, 10)
    .map(e => {
      const dateLabel = labelEventDate(e.date, snapshot.date);
      return `${dateLabel} ${e.time ?? '?'} ${e.name} (${e.currency})`;
    });

  // ── CB speeches yesterday (detect from calendar, enriched later by BIS) ──
  const CB_SPEECH_PATTERNS = /\b(speaks?|speech|press\s*conf|testimony|conférence|discours|audition)\b/i;
  const CB_ACTORS_PATTERNS = /\b(powell|warsh|lagarde|schnabel|lane|ueda|bailey|jordan|macklem|fed\s*chair|ecb\s*president|boj\s*governor)\b/i;
  const detectedCBSpeeches = (snapshot.yesterdayEvents ?? [])
    .filter(e => {
      const name = e.name ?? '';
      return (e.impact === 'high' || e.impact === 'medium')
        && CB_SPEECH_PATTERNS.test(name)
        && CB_ACTORS_PATTERNS.test(name);
    })
    .map(e => {
      const speaker = (e.name.match(CB_ACTORS_PATTERNS) ?? [''])[0];
      return { speaker, eventName: e.name, currency: e.currency };
    });

  // Fallback: format without BIS content (enriched later by enrichBriefingPackCBSpeeches)
  const cbSpeechesYesterday = detectedCBSpeeches.map(s => {
    const relatedNews = snapshot.news
      .filter(n => s.speaker && n.title.toLowerCase().includes(s.speaker.toLowerCase()))
      .slice(0, 2)
      .map(n => n.summary ? `${n.title} — ${n.summary.slice(0, 150)}` : n.title);

    let line = `HIER: ${s.eventName} (${s.currency})`;
    if (relatedNews.length > 0) {
      line += ` → ${relatedNews.join(' | ')}`;
    }
    return line;
  });

  // ── Sentiment trend (F&G over last 7 days from previous snapshots) ──
  const sentimentTrend = buildSentimentTrend(snapshot);

  // ── Obligatory macro stats — curated list, must be cited in narration ──
  // Pull from today + yesterday events: high-impact OR matching the curated
  // pattern for the currency. Only keep events with `actual` populated
  // (already released — there's something to comment on).
  const allMacroEvents = [
    ...(flagged.events ?? []).map(e => ({ ...e, _bucket: 'today' })),
    ...(flagged.yesterdayEvents ?? []).map(e => ({ ...e, _bucket: 'yesterday' })),
  ];
  const obligatoryMacroStats: string[] = [];
  const seenStatKeys = new Set<string>();
  for (const e of allMacroEvents) {
    const pattern = OBLIGATORY_MACRO_PATTERNS[e.currency];
    if (!pattern) continue;
    if (!pattern.test(e.name ?? '')) continue;
    if (!e.actual && !(e.name ?? '').match(/Decision|Rate/i)) continue;  // need a value or it's a CB decision
    const key = `${e.currency}|${e.name}|${e.date}`;
    if (seenStatKeys.has(key)) continue;
    seenStatKeys.add(key);
    const formatted = formatObligatoryStat(e, snapshot.date);
    if (formatted) obligatoryMacroStats.push(formatted);
  }

  return {
    topNewsTitles,
    politicalTriggers,
    topScreenMovers,
    calendarHighlights,
    earningsBuckets,
    cotHighlights,
    cotDivergences,
    upcomingHighImpact,
    cbSpeechesYesterday,
    obligatoryMacroStats,
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
 * Enrichit le briefing pack avec le contenu réel des discours CB via BIS RSS.
 * Appelé dans le pipeline APRÈS buildBriefingPack (qui est synchrone).
 * Ne fetch BIS que si des discours ont été détectés — coût 0 sinon.
 */
export async function enrichBriefingPackCBSpeeches(
  pack: BriefingPack,
  snapshot: DailySnapshot,
): Promise<BriefingPack> {
  if (pack.cbSpeechesYesterday.length === 0) return pack;

  try {
    const { enrichCBSpeeches } = await import("@yt-maker/data");

    // Re-detect speakers from yesterdayEvents
    const CB_SPEECH_PATTERNS = /\b(speaks?|speech|press\s*conf|testimony|conférence|discours|audition)\b/i;
    const CB_ACTORS_PATTERNS = /\b(powell|warsh|lagarde|schnabel|lane|ueda|bailey|jordan|macklem|fed\s*chair|ecb\s*president|boj\s*governor)\b/i;

    const detected = (snapshot.yesterdayEvents ?? [])
      .filter(e => (e.impact === 'high' || e.impact === 'medium')
        && CB_SPEECH_PATTERNS.test(e.name ?? '')
        && CB_ACTORS_PATTERNS.test(e.name ?? ''))
      .map(e => ({
        speaker: (e.name.match(CB_ACTORS_PATTERNS) ?? [''])[0],
        eventName: e.name,
        currency: e.currency,
      }));

    if (detected.length === 0) return pack;

    console.log(`  BIS enrichment: ${detected.length} CB speech(es) detected...`);
    const enriched = await enrichCBSpeeches(detected, snapshot.date);

    if (enriched.length > 0) {
      return { ...pack, cbSpeechesYesterday: enriched };
    }
  } catch (err) {
    console.warn(`  BIS enrichment failed: ${(err as Error).message.slice(0, 60)}`);
  }

  return pack;
}

/**
 * Format BriefingPack as text sections for injection into LLM prompts.
 */
/**
 * Format minimal du briefing pack pour C2 (analyse).
 * C1 (editorial) a déjà reçu la version complète — C2 n'a besoin que de :
 * - Déclencheurs politiques (pour citer dans la causalChain)
 * - Discours BC d'hier (contexte éditorial)
 * - Divergences COT vs prix (signal contrarian)
 * Les movers, news, earnings, sentiment sont déjà dans l'editorial plan + asset data.
 * Gain : -4-6k chars sur le prompt C2 (environ -0.12€/épisode).
 */
export function formatBriefingPackMinimal(pack: BriefingPack): string {
  let text = '';
  if (pack.politicalTriggers.length) {
    text += `## DÉCLENCHEURS POLITIQUES\n`;
    for (const t of pack.politicalTriggers) {
      text += `- ${t.actor} (${t.action}) — "${t.sourceTitle}" — assets liés: ${t.linkedAssets.join(', ')}\n`;
    }
    text += '\n';
  }
  if (pack.cbSpeechesYesterday.length) {
    text += `## DISCOURS BANQUES CENTRALES HIER (contexte éditorial important)\n`;
    for (const s of pack.cbSpeechesYesterday) text += `- ${s}\n`;
    text += `→ Analyser : était-ce attendu ? Qu'est-ce que ça change pour la trajectoire future ? Le marché avait-il déjà pricé ?\n\n`;
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
    for (const e of pack.upcomingHighImpact) text += `- ${e}\n`;
    text += `→ Relie la data d'hier à la prochaine décision : la séance d'aujourd'hui pricé-t-elle déjà cet event ? Qu'est-ce qui confirmerait ou invaliderait le pricing actuel ?\n\n`;
  }
  if (pack.earningsBuckets.upcomingWatchlist.length || pack.earningsBuckets.upcoming.length) {
    text += `## EARNINGS À VENIR (7j)\n`;
    if (pack.earningsBuckets.upcomingWatchlist.length) {
      text += `**Watchlist trackée** (priorité narrative — ces noms sont déjà suivis dans l'épisode) : ${pack.earningsBuckets.upcomingWatchlist.join(' | ')}\n`;
    }
    if (pack.earningsBuckets.upcoming.length) {
      text += `**Autres notables** (contexte — cite uniquement si narrativement pertinent) : ${pack.earningsBuckets.upcoming.join(' | ')}\n`;
    }
    text += `→ Si un mouvement sectoriel aujourd'hui anticipe ces publications, flag-le explicitement (rotation pré-earnings, re-rating sur guidance attendue).\n\n`;
  }
  return text;
}

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
    text += `ATTENTION causalité : seules les news du groupe **EXPLIQUENT LE MOVE** (before/during session) peuvent être citées comme cause du mouvement de la séance couverte. Les news du groupe **À VENIR** sont arrivées APRÈS la clôture (ou sont futures) — à présenter uniquement comme contexte pour la séance suivante, jamais comme driver du move d'hier.\n\n`;
    // Deux groupes : expliquent le move vs à venir
    const explainGroup = pack.topNewsTitles.filter(n => n.when === 'before_session' || n.when === 'during_session');
    const upcomingGroup = pack.topNewsTitles.filter(n => n.when === 'post_session' || n.when === 'pre_publication');
    if (explainGroup.length) {
      text += `**EXPLIQUENT LE MOVE (avant/pendant la séance couverte)** :\n`;
      for (const n of explainGroup) text += `- [${n.whenLabel}] ${n.title}\n`;
    }
    if (upcomingGroup.length) {
      text += `**À VENIR (après clôture / futur — ne peut PAS expliquer le move d'hier)** :\n`;
      for (const n of upcomingGroup) text += `- [${n.whenLabel}] ${n.title}\n`;
    }
    text += '\n';
  }

  if (pack.cbSpeechesYesterday.length) {
    text += `## DISCOURS BANQUES CENTRALES HIER (contexte éditorial important)\n`;
    for (const s of pack.cbSpeechesYesterday) {
      text += `- ${s}\n`;
    }
    text += `→ Analyser : était-ce attendu ? Qu'est-ce que ça change pour la trajectoire future ? Le marché avait-il déjà pricé ?\n`;
    text += '\n';
  }

  if (pack.calendarHighlights.length) {
    text += `## CALENDAR HIGHLIGHTS\n`;
    for (const h of pack.calendarHighlights) {
      text += `- ${h}\n`;
    }
    text += '\n';
  }

  if (pack.obligatoryMacroStats?.length) {
    text += `## ⚠ STATS MACRO OBLIGATOIRES À MENTIONNER\n`;
    text += `Ces stats sont sorties (ou attendues) sur la session couverte. Elles doivent OBLIGATOIREMENT être citées au moins une fois dans la narration — intégrées dans un segment existant pertinent (banques centrales, devise concernée, indice impacté), JAMAIS un segment dédié juste pour les évoquer. Si leur lien narratif n'est pas évident, citer en transition ou en contexte d'un autre point.\n`;
    for (const s of pack.obligatoryMacroStats) {
      text += `- ${s}\n`;
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

  if (pack.earningsBuckets.upcomingWatchlist.length || pack.earningsBuckets.upcoming.length) {
    text += `## EARNINGS À VENIR (7j)\n`;
    if (pack.earningsBuckets.upcomingWatchlist.length) {
      text += `**Watchlist trackée** (priorité narrative) : ${pack.earningsBuckets.upcomingWatchlist.join(' | ')}\n`;
    }
    if (pack.earningsBuckets.upcoming.length) {
      text += `**Autres notables** : ${pack.earningsBuckets.upcoming.join(' | ')}\n`;
    }
    text += '\n';
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
