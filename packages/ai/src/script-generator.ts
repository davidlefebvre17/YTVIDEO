import type { DailySnapshot, EpisodeScript, EpisodeType, Language, ScriptSection } from "@yt-maker/core";
import { generateStructuredJSON } from "./llm-client";
import { getDailyRecapSystemPrompt } from "./prompts/daily-recap";
import { getChartAnalysisSystemPrompt } from "./prompts/chart-analysis";
import { loadKnowledge } from "./knowledge-loader";
import { selectRelevantNews } from "./news-selector";

export interface PrevEntry {
  snapshot: DailySnapshot;
  script?: EpisodeScript;
}

/**
 * Multi-day history context (ordered oldest → most recent).
 * entries[last] = J-1, entries[last-1] = J-2, etc.
 * Max 5 entries to avoid bloating the prompt.
 */
export interface PrevContext {
  entries: PrevEntry[];
}

/** Top movers summary for a snapshot (5 lines max). */
function formatMovers(snapshot: DailySnapshot): string {
  const sorted = [...snapshot.assets]
    .filter((a) => a.technicals)
    .sort((a, b) => (b.technicals?.dramaScore ?? 0) - (a.technicals?.dramaScore ?? 0))
    .slice(0, 5);
  return sorted.map((a) => {
    const dir = a.changePct >= 0 ? "+" : "";
    return `  - ${a.name}: ${dir}${a.changePct.toFixed(2)}% → ${a.price.toFixed(2)}`;
  }).join("\n");
}

/**
 * Build multi-day history block.
 *
 * For each past episode (oldest first):
 *   - Show top movers
 *   - Show predictions made that day (from script)
 *   - If the NEXT day's snapshot is available → show what actually happened (accountability)
 *
 * The LLM uses this to:
 *   1. Build factual suivi J-1 ("hier le VIX explosait, l'argent tenait les 75$")
 *   2. Verify older predictions ("il y a 2 jours je surveillais X, hier ça a...")
 *   3. Build narrative continuity ("3ème séance consécutive de...")
 */
function formatPrevContext(prev: PrevContext): string {
  if (prev.entries.length === 0) return "";

  let text = `# Historique récent (${prev.entries.length} séance${prev.entries.length > 1 ? "s" : ""})\n\n`;

  for (let i = 0; i < prev.entries.length; i++) {
    const entry = prev.entries[i];
    const nextEntry = prev.entries[i + 1]; // entry after this one (closer to today)
    const isYesterday = i === prev.entries.length - 1;
    const label = isYesterday ? "J-1" : `J-${prev.entries.length - i}`;

    text += `## ${label} — ${entry.snapshot.date}\n`;

    // Key movers
    text += `**Mouvements**\n${formatMovers(entry.snapshot)}\n`;

    // Macro snapshot
    if (entry.snapshot.yields) {
      const y = entry.snapshot.yields;
      text += `10Y: ${y.us10y}% | Spread: ${y.spread10y2y > 0 ? "+" : ""}${y.spread10y2y}%`;
    }
    if (entry.snapshot.sentiment) {
      text += ` | F&G: ${entry.snapshot.sentiment.cryptoFearGreed.value}`;
    }
    text += "\n";

    // Key events with actuals
    const withActuals = (entry.snapshot.events ?? []).filter((e) => e.actual).slice(0, 3);
    if (withActuals.length > 0) {
      text += `Événements: ${withActuals.map((e) => `${e.name} → ${e.actual} (vs ${e.forecast ?? "?"})`).join(" | ")}\n`;
    }

    // Script predictions for this day
    if (entry.script) {
      const preds = entry.script.sections.find((s: ScriptSection) => s.type === "predictions");
      if (preds?.narration) {
        text += `\n**Prédictions faites ce jour-là**\n${preds.narration}\n`;
      }
    }

    // Accountability: what happened the next day (if we have it)
    if (entry.script && nextEntry) {
      text += `\n**Résultat le lendemain (${nextEntry.snapshot.date})**\n`;
      text += `${formatMovers(nextEntry.snapshot)}\n`;
      text += `→ Utilise ces données pour évaluer honnêtement les prédictions ci-dessus.\n`;
    } else if (entry.script && isYesterday) {
      text += `\n→ C'est la séance d'AUJOURD'HUI qui répond à ces prédictions. Vérifie-les dans ton suivi.\n`;
    }

    text += "\n";
  }

  text += `---\n\n`;
  return text;
}

/**
 * Format a snapshot into a rich prompt for the LLM.
 * Includes technical indicators when available.
 */
export function formatSnapshotForPrompt(
  snapshot: DailySnapshot,
  lang: Language = "fr",
  prevContext?: PrevContext,
): string {
  let text = prevContext ? formatPrevContext(prevContext) : "";
  text += `# Market Data — ${snapshot.date}\n\n`;

  // ── Macro context ─────────────────────────────────────────────────
  if (snapshot.yields) {
    const y = snapshot.yields;
    const spreadLabel = y.spread10y2y > 0 ? "normale (courbe positive)" : "inversée (courbe négative — signal recessif)";
    text += `## Taux obligataires US\n`;
    text += `10Y: ${y.us10y}% | 2Y: ${y.us2y}% | Spread 10Y-2Y: ${y.spread10y2y > 0 ? "+" : ""}${y.spread10y2y}% — courbe ${spreadLabel}\n\n`;
  }

  if (snapshot.sentiment) {
    const s = snapshot.sentiment;
    const fgLabel = s.cryptoFearGreed.value < 25 ? "FEAR EXTREME" : s.cryptoFearGreed.value < 45 ? "FEAR" : s.cryptoFearGreed.value < 55 ? "NEUTRE" : s.cryptoFearGreed.value < 75 ? "GREED" : "GREED EXTREME";
    text += `## Sentiment marché\n`;
    text += `Crypto Fear & Greed: ${s.cryptoFearGreed.value}/100 (${fgLabel}) | BTC dominance: ${s.btcDominance.toFixed(1)}%\n`;
    if (s.trendingCoins?.length) {
      text += `Trending: ${s.trendingCoins.slice(0, 5).map((c) => c.name).join(", ")}\n`;
    }
    text += "\n";
  }

  // ── Assets watchlist (sorted by drama score) ──────────────────────
  const sorted = [...snapshot.assets].sort((a, b) => {
    const da = a.technicals?.dramaScore ?? 0;
    const db = b.technicals?.dramaScore ?? 0;
    return db - da;
  });

  text += "## Assets watchlist (triés par importance)\n\n";
  for (const asset of sorted) {
    const dir = asset.changePct >= 0 ? "+" : "";
    const fmt = (n: number) => n.toFixed(asset.price > 100 ? 2 : 4);
    text += `### ${asset.name} (${asset.symbol})\n`;
    text += `Prix: ${fmt(asset.price)} | Variation: ${dir}${asset.changePct.toFixed(2)}% | Range 24h: ${fmt(asset.low24h)} — ${fmt(asset.high24h)}\n`;

    if (asset.technicals) {
      const t = asset.technicals;
      text += `Court terme (1 mois):\n`;
      text += `  EMA9: ${fmt(t.ema9)} | EMA21: ${fmt(t.ema21)} | Prix ${asset.price > t.ema9 ? "AU-DESSUS" : "EN-DESSOUS"} de l'EMA\n`;
      text += `  RSI14: ${t.rsi14.toFixed(0)}${t.rsi14 < 30 ? " ⚠️ SURVENTE" : t.rsi14 > 70 ? " ⚠️ SURACHAT" : ""}\n`;
      text += `  Trend: ${t.trend.toUpperCase()} | Volume: ${t.volumeAnomaly > 1.2 ? `+${(t.volumeAnomaly * 100 - 100).toFixed(0)}% vs moy.20j` : t.volumeAnomaly < 0.8 ? `-${(100 - t.volumeAnomaly * 100).toFixed(0)}% vs moy.20j` : "normal"}\n`;
      text += `  Supports: ${t.supports.map(fmt).join(", ") || "—"} | Résistances: ${t.resistances.map(fmt).join(", ") || "—"}\n`;
      if (t.isNear52wHigh) text += `  *** PROCHE DU PLUS HAUT 52 SEMAINES ***\n`;
      if (t.isNear52wLow) text += `  *** PROCHE DU PLUS BAS 52 SEMAINES ***\n`;
      text += `  Drama Score: ${t.dramaScore.toFixed(1)}\n`;
    }

    if (asset.multiTF) {
      const m = asset.multiTF;
      text += `Multi-timeframe:\n`;
      text += `  Tendance séculaire (10 ans): ${m.weekly10y.trend.toUpperCase()} | ATH: ${m.weekly10y.distanceFromATH.toFixed(1)}% | EMA52w: ${fmt(m.weekly10y.ema52w)}\n`;
      text += `  Tendance moyen terme (3 ans): SMA200=${fmt(m.daily3y.sma200)} | SMA50=${fmt(m.daily3y.sma50)} | ${m.daily3y.aboveSma200 ? "AU-DESSUS" : "EN-DESSOUS"} SMA200 | ${m.daily3y.goldenCross ? "GOLDEN CROSS" : "DEATH CROSS"}\n`;
      text += `  Court terme (1 an): High52w=${fmt(m.daily1y.high52w)} | Low52w=${fmt(m.daily1y.low52w)} | Volatilité=${m.daily1y.volatility20d.toFixed(1)}%/an${m.daily1y.recentBreakout ? " | *** BREAKOUT 52w ***" : ""}\n`;
    }
    text += "\n";
  }

  // ── Stock screening movers ────────────────────────────────────────
  if (snapshot.stockScreen && snapshot.stockScreen.length > 0) {
    const movers = snapshot.stockScreen.slice(0, 25);
    text += `## Movers actions (top ${movers.length} flaggés sur ~763 analysées)\n\n`;
    for (const m of movers) {
      const dir = m.changePct >= 0 ? "+" : "";
      text += `- **${m.name}** (${m.symbol}, ${m.index}): ${dir}${m.changePct.toFixed(2)}% — ${m.reason.join(", ")}`;
      if (m.technicals) {
        text += ` | RSI=${m.technicals.rsi14.toFixed(0)} trend=${m.technicals.trend}`;
      }
      if (m.earningsDetail?.publishingToday) {
        text += ` | *** RÉSULTATS PUBLIÉS AUJOURD'HUI ***`;
      }
      text += "\n";

      // Earnings detail block (only for stocks with enriched data)
      if (m.earningsDetail) {
        const ed = m.earningsDetail;
        if (ed.publishingToday && ed.currentQtrEpsEstimate !== undefined) {
          text += `  → EPS consensus ce trimestre: ${ed.currentQtrEpsEstimate}\n`;
        }
        if (ed.lastFourQuarters.length > 0) {
          text += `  → Historique EPS (4 derniers trimestres, du plus récent au plus ancien):\n`;
          for (const q of ed.lastFourQuarters) {
            const beat = q.surprisePct !== undefined
              ? (q.surprisePct >= 0 ? `BEAT +${q.surprisePct.toFixed(1)}%` : `MISS ${q.surprisePct.toFixed(1)}%`)
              : "";
            text += `     Q${q.quarter} ${q.year} (${q.period}): EPS réel=${q.epsActual ?? "?"} vs consensus=${q.epsEstimate ?? "?"} ${beat}\n`;
          }
        }
      }
    }
    text += "\n";
  }

  // ── News (sélection intelligente par pertinence) ──────────────────
  if (snapshot.news.length > 0) {
    const selected = selectRelevantNews(snapshot.news, snapshot, lang, 40);
    const byLang = {
      fr: selected.filter((n) => n.lang === "fr"),
      en: selected.filter((n) => n.lang !== "fr"),
    };

    text += `## News du jour (${snapshot.news.length} total, ${selected.length} sélectionnées par pertinence)\n\n`;

    if (byLang.fr.length > 0) {
      text += `### Sources françaises\n`;
      for (const n of byLang.fr.slice(0, 20)) {
        text += `- [${n.source}] ${n.title}`;
        if (n.category) text += ` _(${n.category})_`;
        text += "\n";
        if (n.summary) text += `  ${n.summary}\n`;
      }
      text += "\n";
    }

    if (byLang.en.length > 0) {
      text += `### Sources internationales\n`;
      for (const n of byLang.en.slice(0, 20)) {
        text += `- [${n.source}] ${n.title}`;
        if (n.category) text += ` _(${n.category})_`;
        text += "\n";
        if (n.summary) text += `  ${n.summary}\n`;
      }
      text += "\n";
    }
  }

  // ── Calendrier économique ─────────────────────────────────────────
  if ((snapshot.yesterdayEvents ?? []).length > 0) {
    text += `## Événements hier (avec résultats)\n`;
    for (const e of snapshot.yesterdayEvents!) {
      text += `- ${e.name} (${e.currency}) — Impact: ${e.impact}`;
      if (e.forecast) text += ` | Consensus: ${e.forecast}`;
      if (e.actual) text += ` | **Résultat: ${e.actual}**`;
      if (e.previous) text += ` | Précédent: ${e.previous}`;
      text += "\n";
    }
    text += "\n";
  }

  if (snapshot.events.length > 0) {
    text += `## Événements aujourd'hui\n`;
    for (const e of snapshot.events) {
      text += `- ${e.name} (${e.currency}) — Impact: ${e.impact}`;
      if (e.forecast) text += ` | Consensus: ${e.forecast}`;
      if (e.previous) text += ` | Précédent: ${e.previous}`;
      if (e.actual) text += ` | Résultat: ${e.actual}`;
      text += "\n";
    }
    text += "\n";
  }

  if ((snapshot.upcomingEvents ?? []).length > 0) {
    const high = snapshot.upcomingEvents!.filter((e) => e.impact === "high").slice(0, 5);
    if (high.length > 0) {
      text += `## Événements à venir (impact HIGH, 7 prochains jours)\n`;
      for (const e of high) {
        text += `- ${e.date} — ${e.name} (${e.currency}) | Consensus: ${e.forecast ?? "n/a"}\n`;
      }
      text += "\n";
    }
  }

  // ── Earnings ─────────────────────────────────────────────────────
  if ((snapshot.earnings ?? []).length > 0) {
    text += `## Résultats d'entreprises\n`;
    for (const e of snapshot.earnings!.slice(0, 10)) {
      text += `- ${e.symbol} (${e.hour === "bmo" ? "avant ouverture" : e.hour === "amc" ? "après clôture" : "pendant séance"})`;
      if (e.epsEstimate !== undefined) text += ` | EPS consensus: ${e.epsEstimate}`;
      if (e.epsActual !== undefined) text += ` | **EPS réel: ${e.epsActual}**`;
      if (e.revenueEstimate !== undefined) text += ` | CA consensus: ${(e.revenueEstimate / 1e9).toFixed(1)}Md$`;
      if (e.revenueActual !== undefined) text += ` | **CA réel: ${(e.revenueActual / 1e9).toFixed(1)}Md$**`;
      text += "\n";
    }
    text += "\n";
  }

  // ── Polymarket — indicateur de sentiment, pas une source factuelle ────────
  if ((snapshot.polymarket ?? []).length > 0) {
    text += `## Marchés de prédiction Polymarket\n`;
    text += `⚠️ SENTIMENT COLLECTIF UNIQUEMENT — ces probabilités reflètent les paris des utilisateurs, pas des prévisions officielles. Même statut que le Fear & Greed Index : couleur narrative possible ("les marchés anticipent à X%..."), jamais cité comme fait brut ni source primaire.\n\n`;
    for (const m of snapshot.polymarket!) {
      const probs = Object.entries(m.probabilities)
        .map(([label, pct]) => `${label}: ${pct}%`)
        .join(" / ");
      const vol = m.volume24h > 1e6
        ? `${(m.volume24h / 1e6).toFixed(1)}M$`
        : `${(m.volume24h / 1e3).toFixed(0)}K$`;
      text += `- ${m.question} → ${probs} (vol. 24h: ${vol})\n`;
    }
    text += "\n";
  }

  return text;
}

// ── Quality gate ────────────────────────────────────────────────────────────

/**
 * Known anglicism errors: [wrong, correct]
 * These are generation errors the LLM makes regardless of instructions.
 */
const ANGLICISM_FIXES: [RegExp, string][] = [
  [/\bdeath cat bounce\b/gi, "dead cat bounce"],
  [/\bsafe heaven\b/gi, "safe haven"],
  [/\bbull market run\b/gi, "bull run"],
  [/\bshort-squeeze\b/gi, "short squeeze"],
];

/**
 * Disclaimer phrases that must never appear in spoken narration.
 * The visual banner handles compliance — narration ends on the CTA.
 */
const DISCLAIMER_PATTERNS = [
  /rappel[,\s]+ce contenu est purement éducatif[^.]*\./gi,
  /ce contenu est purement éducatif et ne constitue pas[^.]*\./gi,
  /reminder[,\s]+this content is purely educational[^.]*\./gi,
  /this content is purely educational and does not constitute[^.]*\./gi,
];

function postProcessScript(script: EpisodeScript): void {
  const warnings: string[] = [];

  for (const section of script.sections) {
    if (!section.narration) continue;
    let text = section.narration;

    // Fix known anglicism errors
    for (const [pattern, replacement] of ANGLICISM_FIXES) {
      if (pattern.test(text)) {
        warnings.push(`  [quality] Fixed anglicism in ${section.type}: "${pattern.source}" → "${replacement}"`);
        text = text.replace(pattern, replacement);
      }
    }

    // Strip disclaimer phrases from narration
    for (const pattern of DISCLAIMER_PATTERNS) {
      if (pattern.test(text)) {
        warnings.push(`  [quality] ⚠ Disclaimer found and removed from ${section.type} narration`);
        text = text.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
      }
    }

    section.narration = text;
  }

  if (warnings.length > 0) {
    console.log("Quality gate:");
    for (const w of warnings) console.log(w);
  }
}

export async function generateScript(
  snapshot: DailySnapshot,
  options: {
    type: EpisodeType;
    lang: Language;
    episodeNumber: number;
    prevContext?: PrevContext;
  },
): Promise<EpisodeScript> {
  console.log(`\nGenerating ${options.type} script in ${options.lang}...`);
  if (options.prevContext?.entries.length) {
    const dates = options.prevContext.entries.map((e) => e.snapshot.date);
    const withScript = options.prevContext.entries.filter((e) => e.script).length;
    console.log(`History: ${dates.join(", ")} (${withScript}/${dates.length} with predictions)`);
  }

  // Load knowledge context
  const knowledgeContext = loadKnowledge(snapshot);
  console.log(`Knowledge context: ${knowledgeContext.length} chars loaded`);

  const systemPrompt =
    options.type === "chart_analysis"
      ? getChartAnalysisSystemPrompt(options.lang)
      : getDailyRecapSystemPrompt(options.lang, knowledgeContext);

  const userMessage = formatSnapshotForPrompt(snapshot, options.lang, options.prevContext);

  console.log(`System prompt: ${systemPrompt.length} chars`);
  console.log(`User message: ${userMessage.length} chars`);

  const scriptBody = await generateStructuredJSON<
    Omit<EpisodeScript, "episodeNumber" | "date" | "type" | "lang">
  >(systemPrompt, userMessage);

  const script: EpisodeScript = {
    episodeNumber: options.episodeNumber,
    date: snapshot.date,
    type: options.type,
    lang: options.lang,
    ...scriptBody,
  };

  // Validate total duration
  const actualTotal = script.sections.reduce((sum, s) => sum + s.durationSec, 0);
  script.totalDurationSec = actualTotal;

  // Quality gate — post-process narration
  postProcessScript(script);

  console.log(
    `Script generated: "${script.title}" (${actualTotal}s, ${script.sections.length} sections)`,
  );
  return script;
}
