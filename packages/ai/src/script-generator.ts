import type { DailySnapshot, EpisodeScript, EpisodeType, Language, ScriptSection, ThemesDuJour } from "@yt-maker/core";
import { generateStructuredJSON } from "./llm-client";
import { getDailyRecapSystemPrompt } from "./prompts/daily-recap";
import { getChartAnalysisSystemPrompt } from "./prompts/chart-analysis";
import { loadKnowledge } from "./knowledge-loader";
import { selectRelevantNews } from "./news-selector";
import { buildThemesDuJour } from "./editorial-score";
import { getCompanyProfile, getProfileContext } from "./company-profiles";
import { buildMarketMemoryContext } from "@yt-maker/data";
import type { NewsMemoryDB } from "./memory";
import { buildResearchContext } from "./memory";

export interface PrevEntry {
  snapshot: DailySnapshot;
  script?: EpisodeScript;
}

/**
 * Multi-day history context (ordered oldest → most recent).
 * entries[last] = J-1, entries[last-1] = J-2, etc.
 * Max 15 entries with degraded detail over time.
 */
export interface PrevContext {
  entries: PrevEntry[];
}

/** Compact digest of a past episode for contextual memory. */
interface EpisodeDigest {
  date: string;
  label: string;             // "J-1", "J-5", etc.
  tier: "detailed" | "summary" | "thread";
  movers: string;            // compact top-5 movers line
  regime?: string;           // risk-on / risk-off / incertain / rotation
  thread?: string;           // threadSummary from script
  topics?: string[];         // coverageTopics from script
  trendIdeas?: string[];     // direction ideas (non-chiffered) extracted from predictions
  yields?: string;           // compact yields line
  sentiment?: string;        // compact sentiment line
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
 * Build an EpisodeDigest from a PrevEntry.
 * Extracts compact, structured data for contextual memory.
 */
function buildDigest(entry: PrevEntry, label: string, tier: "detailed" | "summary" | "thread"): EpisodeDigest {
  const snap = entry.snapshot;
  const script = entry.script;

  const digest: EpisodeDigest = {
    date: snap.date,
    label,
    tier,
    movers: formatMovers(snap),
  };

  // Yields (compact)
  if (snap.yields) {
    const y = snap.yields;
    digest.yields = `10Y:${y.us10y}% spread:${y.spread10y2y > 0 ? "+" : ""}${y.spread10y2y}%`;
  }

  // Sentiment (compact)
  if (snap.sentiment) {
    digest.sentiment = `F&G:${snap.sentiment.cryptoFearGreed.value}/100`;
  }

  // From script metadata
  if (script) {
    digest.thread = script.threadSummary;
    digest.topics = script.coverageTopics;

    // Extract mood from script (moodMarche field — added by LLM, not in strict type)
    const moodField = (script as unknown as Record<string, unknown>).moodMarche;
    if (typeof moodField === "string") {
      digest.regime = moodField;
    }

    // Extract trend ideas from segment predictions (direction only, no numbers)
    const ideas: string[] = [];
    for (const section of script.sections) {
      if (section.type === "segment" && section.data) {
        const preds = section.data.predictions as Array<{ asset: string; direction: string; reasoning?: string }> | undefined;
        if (preds) {
          for (const p of preds) {
            ideas.push(`${p.asset}: ${p.direction}`);
          }
        }
      }
    }
    if (ideas.length > 0) digest.trendIdeas = ideas.slice(0, 8);
  }

  return digest;
}

/**
 * Format contextual memory from episode digests.
 *
 * Degraded tiers:
 *   - J-1 → J-3: DETAILED — full movers, yields, sentiment, thread, topics, trend ideas, key events
 *   - J-4 → J-7: SUMMARY — thread, topics, top 3 movers, regime
 *   - J-8 → J-15: THREAD — thread + regime only (1 line each)
 *
 * The LLM uses this as CONTEXTUAL KNOWLEDGE, not as a mandatory section.
 * It mentions past episodes ONLY when there is a narrative link with today's data.
 */
function formatPrevContext(prev: PrevContext): string {
  if (prev.entries.length === 0) return "";

  const digests: EpisodeDigest[] = [];
  const total = prev.entries.length;

  for (let i = 0; i < total; i++) {
    const entry = prev.entries[i];
    const daysAgo = total - i; // J-1 for last entry, J-2 for second-to-last, etc.
    const label = `J-${daysAgo}`;
    const tier = daysAgo <= 3 ? "detailed" : daysAgo <= 7 ? "summary" : "thread";
    digests.push(buildDigest(entry, label, tier));
  }

  let text = `# Mémoire contextuelle (${total} séance${total > 1 ? "s" : ""})\n\n`;
  text += `> INSTRUCTION : cette mémoire est un OUTIL de connaissance, pas un script obligatoire.\n`;
  text += `> Mentionne un épisode passé UNIQUEMENT s'il y a un lien de cause à effet avec les données du jour.\n`;
  text += `> Exemples valides : "3ème séance consécutive de hausse pour l'or", "hier je surveillais les 5000 — et c'est exactement là que le prix a réagi".\n`;
  text += `> Si aucun lien pertinent → ignore complètement cette section.\n\n`;

  // Detailed tier (J-1 → J-3)
  const detailed = digests.filter((d) => d.tier === "detailed");
  if (detailed.length > 0) {
    for (const d of detailed) {
      text += `## ${d.label} — ${d.date}`;
      if (d.regime) text += ` [${d.regime}]`;
      text += "\n";
      text += `Mouvements:\n${d.movers}\n`;
      if (d.yields) text += `${d.yields}`;
      if (d.sentiment) text += ` | ${d.sentiment}`;
      if (d.yields || d.sentiment) text += "\n";
      if (d.thread) text += `Fil conducteur: "${d.thread}"\n`;
      if (d.topics?.length) text += `Sujets couverts: ${d.topics.join(", ")}\n`;
      if (d.trendIdeas?.length) text += `Idées de tendance: ${d.trendIdeas.join(" | ")}\n`;
      text += "\n";
    }
  }

  // Summary tier (J-4 → J-7)
  const summary = digests.filter((d) => d.tier === "summary");
  if (summary.length > 0) {
    text += `## Semaine précédente (résumé)\n`;
    for (const d of summary) {
      text += `**${d.label}** ${d.date}`;
      if (d.regime) text += ` [${d.regime}]`;
      if (d.thread) text += ` — "${d.thread}"`;
      text += "\n";
      // Only top 3 movers (first 3 lines of movers string)
      const moverLines = d.movers.split("\n").slice(0, 3);
      text += `${moverLines.join("\n")}\n`;
      if (d.topics?.length) text += `Sujets: ${d.topics.join(", ")}\n`;
    }
    text += "\n";
  }

  // Thread tier (J-8 → J-15)
  const threads = digests.filter((d) => d.tier === "thread");
  if (threads.length > 0) {
    text += `## Deux semaines précédentes (fils)\n`;
    for (const d of threads) {
      text += `${d.label} ${d.date}`;
      if (d.regime) text += ` [${d.regime}]`;
      if (d.thread) text += ` — "${d.thread}"`;
      text += "\n";
    }
    text += "\n";
  }

  text += `---\n\n`;
  return text;
}

/**
 * Format the ThemesDuJour block for injection into the prompt.
 * This replaces the flat news list with a structured editorial analysis
 * that guides the LLM in building its narrative.
 */
function formatThemesDuJour(tdj: ThemesDuJour): string {
  let text = `## Themes du jour (analyse editoriale pre-digeree)\n\n`;

  // Market regime at the top — sets the tone
  text += `### REGIME : ${tdj.marketRegime}\n\n`;

  // Themes sorted by editorial score (already sorted by caller)
  for (let i = 0; i < tdj.themes.length; i++) {
    const theme = tdj.themes[i];
    const rank = i === 0 ? "dominant" : `#${i + 1}`;
    text += `### Theme ${rank} : ${theme.label.fr} [buzz=${theme.buzzScore.toFixed(0)}, editorial=${theme.editorialScore.toFixed(0)}]\n`;

    // Top articles (max 3)
    for (const title of theme.newsItems.slice(0, 3)) {
      text += `- ${title}\n`;
    }

    // Related assets with market data
    if (theme.assets.length > 0) {
      text += `> Assets lies : ${theme.assets.join(", ")}\n`;
    }

    // Sector clusters if present
    if (theme.sectorClusters && theme.sectorClusters.length > 0) {
      for (const sc of theme.sectorClusters) {
        const moversStr = sc.movers
          .map((m) => `${m.name} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(1)}%`)
          .join(", ");
        text += `> Cluster sectoriel ${sc.sector} (${sc.direction}, moy ${sc.avgChangePct >= 0 ? "+" : ""}${sc.avgChangePct.toFixed(1)}%) : ${moversStr}\n`;
      }
    }

    // Causal chain if present
    if (theme.causalChain && theme.causalChain.length > 0) {
      text += `> Chaine causale : ${theme.causalChain.join(" -> ")}\n`;
    }

    // Editorial score breakdown (compact)
    const bd = theme.breakdown;
    text += `> Score : amplitude=${bd.amplitude.toFixed(0)} breadth=${bd.breadth.toFixed(0)} surprise=${bd.surprise.toFixed(0)} causal=${bd.causalDepth.toFixed(0)} symbolic=${bd.symbolic.toFixed(0)} news=${bd.newsFrequency.toFixed(0)} regime=${bd.regimeCoherence.toFixed(0)}\n`;

    text += "\n";
  }

  // Active causal chains (max 3)
  if (tdj.causalChains.length > 0) {
    text += `### Chaines causales actives\n`;
    for (const chain of tdj.causalChains.slice(0, 3)) {
      text += `- **${chain.name}** (confiance: ${(chain.confidence * 100).toFixed(0)}%)\n`;
      for (const step of chain.confirmedSteps) {
        text += `  [CONFIRME] ${step}\n`;
      }
      if (chain.suggestedNarration) {
        text += `  Suggestion narration : "${chain.suggestedNarration}"\n`;
      }
      text += `  Assets lies : ${chain.relatedAssets.join(", ")}\n`;
    }
    text += "\n";
  }

  // Sector clusters (standalone, not already shown in themes)
  if (tdj.sectorClusters.length > 0) {
    text += `### Clusters sectoriels detectes\n`;
    for (const sc of tdj.sectorClusters) {
      const moversStr = sc.movers
        .map((m) => `${m.name} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(1)}%`)
        .join(", ");
      text += `- ${sc.sector} (${sc.direction}, moy ${sc.avgChangePct >= 0 ? "+" : ""}${sc.avgChangePct.toFixed(1)}%, ${sc.movers.length} titres) : ${moversStr}\n`;
    }
    text += "\n";
  }

  // Event surprises
  if (tdj.eventSurprises.length > 0) {
    text += `### Events avec surprise\n`;
    for (const es of tdj.eventSurprises) {
      const dir = es.direction === "above" ? "au-dessus" : es.direction === "below" ? "en-dessous" : "en ligne";
      text += `- ${es.eventName} : ${es.actual} vs ${es.forecast} attendu (${dir}, ${es.magnitude}) → assets lies : ${es.relatedAssets.join(", ")}\n`;
    }
    text += "\n";
  }

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
  newsDb?: NewsMemoryDB,
): string {
  let text = prevContext ? formatPrevContext(prevContext) : "";

  // ── Research Context (News Memory — D2) ──
  if (newsDb) {
    try {
      const researchContext = buildResearchContext(snapshot, newsDb);
      if (researchContext.trim()) {
        text += researchContext;
        text += `\n---\n\n`;
      }
    } catch (err) {
      console.warn(`[script-generator] Research context error: ${(err as Error).message.slice(0, 80)}`);
    }
  }

  // ── MarketMemory context (zones, indicators, regime per asset) ──
  const snapshotSymbols = snapshot.assets.map((a) => a.symbol);
  const memoryContext = buildMarketMemoryContext(snapshotSymbols);
  if (memoryContext.trim()) {
    text += `# Mémoire technique MarketMemory\n\n`;
    text += `> Zones S/R, indicateurs et événements récents pour les actifs du jour.\n`;
    text += `> Utilise ces niveaux pour contextualiser les mouvements — "le prix a testé le support à X", "cassure confirmée de la résistance Y".\n\n`;
    text += memoryContext;
    text += `\n---\n\n`;
  }

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

  // ── Themes du jour (pre-digested editorial analysis) ──────────────
  if (snapshot.themesDuJour) {
    text += formatThemesDuJour(snapshot.themesDuJour);
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
      text += `  SMA20: ${fmt(t.sma20)} | SMA50: ${fmt(t.sma50)} | Prix ${asset.price > t.sma20 ? "AU-DESSUS" : "EN-DESSOUS"} de la SMA\n`;
      text += `  RSI14: ${t.rsi14.toFixed(0)}${t.rsi14 < 30 ? " ⚠️ SURVENTE" : t.rsi14 > 70 ? " ⚠️ SURACHAT" : ""}\n`;
      text += `  Trend: ${t.trend.toUpperCase()} | Volume: ${t.volumeAnomaly > 1.2 ? `+${(t.volumeAnomaly * 100 - 100).toFixed(0)}% vs moy.20j` : t.volumeAnomaly < 0.8 ? `-${(100 - t.volumeAnomaly * 100).toFixed(0)}% vs moy.20j` : "normal"}\n`;
      text += `  Supports: ${t.supports.map(fmt).join(", ") || "—"} | Résistances: ${t.resistances.map(fmt).join(", ") || "—"}\n`;
      if (t.isNear52wHigh) text += `  *** PROCHE DU PLUS HAUT 52 SEMAINES ***\n`;
      if (t.isNear52wLow) text += `  *** PROCHE DU PLUS BAS 52 SEMAINES ***\n`;
      // Drama score is internal metadata — not sent to LLM to prevent leaking into narration
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
      const profile = getCompanyProfile(m.symbol);
      const sectorStr = profile?.sector ? ` [${profile.sector}]` : "";
      text += `- **${m.name}** (${m.symbol}, ${m.index})${sectorStr}: ${dir}${m.changePct.toFixed(2)}% — ${m.reason.join(", ")}`;
      if (m.technicals) {
        text += ` | RSI=${m.technicals.rsi14.toFixed(0)} trend=${m.technicals.trend}`;
      }
      if (m.earningsDetail?.publishingToday) {
        text += ` | *** RÉSULTATS PUBLIÉS AUJOURD'HUI ***`;
      }
      if (profile?.correlation) {
        text += `\n  → Corrélation: ${profile.correlation}`;
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
      const profile = getCompanyProfile(e.symbol);
      const nameStr = profile ? `${profile.name} (${e.symbol})` : e.symbol;
      text += `- **${nameStr}** — ${e.hour === "bmo" ? "avant ouverture" : e.hour === "amc" ? "après clôture" : "pendant séance"}`;
      if (profile?.sector) text += ` | Secteur: ${profile.sector}`;
      if (e.epsEstimate !== undefined) text += ` | EPS consensus: ${e.epsEstimate}`;
      if (e.epsActual !== undefined) text += ` | **EPS réel: ${e.epsActual}**`;
      if (e.revenueEstimate !== undefined) text += ` | CA consensus: ${(e.revenueEstimate / 1e9).toFixed(1)}Md$`;
      if (e.revenueActual !== undefined) text += ` | **CA réel: ${(e.revenueActual / 1e9).toFixed(1)}Md$**`;
      if (profile?.correlation) text += `\n  → Corrélation: ${profile.correlation}`;
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

  // ── COT Positioning — positionnement institutionnel (données mardi, publiées vendredi) ──
  if (snapshot.cotPositioning && snapshot.cotPositioning.contracts.length > 0) {
    text += `## Positionnement institutionnel COT (rapport CFTC du ${snapshot.cotPositioning.reportDate})\n`;
    text += `Données du mardi, publiées le vendredi suivant. Le COT est un indicateur CONTRARIAN de positionnement — voir la fiche knowledge pour les règles d'interprétation.\n\n`;

    // Show notable signals first (extremes + flips)
    const notable = snapshot.cotPositioning.contracts.filter(
      (c) => c.current.signals && (c.current.signals.bias.includes("extreme") || c.current.signals.flipDetected),
    );
    if (notable.length > 0) {
      text += `### Signaux notables\n`;
      for (const c of notable) {
        const s = c.current.signals!;
        const netFmt = c.current.assetManagers.netPosition > 0 ? "+" : "";
        if (s.flipDetected) {
          text += `- **FLIP** ${c.name}: les spéculateurs ont retourné leur position (net ${netFmt}${c.current.assetManagers.netPosition}). Signal de conviction fort.\n`;
        } else if (s.bias === "extreme_long") {
          text += `- **EXTREME LONG** ${c.name}: net ${netFmt}${c.current.assetManagers.netPosition} (percentile ${s.percentileRank}/100 sur 10 semaines). Signal contrarian potentiel — complaisance ?\n`;
        } else if (s.bias === "extreme_short") {
          text += `- **EXTREME SHORT** ${c.name}: net ${netFmt}${c.current.assetManagers.netPosition} (percentile ${s.percentileRank}/100 sur 10 semaines). Signal contrarian potentiel — excès de pessimisme ?\n`;
        }
      }
      text += "\n";
    }

    // Then show all contracts in compact format
    text += `### Positionnement complet\n`;
    text += `| Contrat | Net spéculateurs | % OI | Bias | P-rank | Δ semaine | Semaines |\n`;
    text += `|---------|-----------------|------|------|--------|-----------|----------|\n`;
    for (const c of snapshot.cotPositioning.contracts) {
      const am = c.current.assetManagers;
      const s = c.current.signals;
      const netFmt = am.netPosition > 0 ? `+${am.netPosition}` : `${am.netPosition}`;
      const bias = s?.bias ?? "?";
      const pRank = s ? `P${s.percentileRank}` : "?";
      const chg = s ? (s.netChangeSpeculators > 0 ? `+${s.netChangeSpeculators}` : `${s.netChangeSpeculators}`) : "?";
      const wks = s ? `${s.weeksInDirection}` : "?";
      text += `| ${c.name} | ${netFmt} | ${am.pctOfOI}% | ${bias} | ${pRank} | ${chg} | ${wks} |\n`;
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

  // Strip previously_on sections (LLM sometimes generates despite explicit instruction not to)
  script.sections = script.sections.filter((section) => {
    if (section.type === "previously_on") {
      warnings.push(`  [quality] Stripped unexpected "previously_on" section`);
      return false;
    }
    return true;
  });

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
    newsDb?: NewsMemoryDB;
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

  // Build editorial themes (pre-digested analysis) and attach to snapshot
  if (!snapshot.themesDuJour) {
    const tdj = buildThemesDuJour(snapshot, snapshot.news, options.lang);
    snapshot.themesDuJour = tdj;
    console.log(`Themes du jour: ${tdj.themes.length} themes, regime=${tdj.marketRegime}, ${tdj.causalChains.length} causal chains, ${tdj.sectorClusters.length} sector clusters`);
  } else {
    console.log(`Themes du jour: already computed (${snapshot.themesDuJour.themes.length} themes)`);
  }

  const systemPrompt =
    options.type === "chart_analysis"
      ? getChartAnalysisSystemPrompt(options.lang)
      : getDailyRecapSystemPrompt(options.lang, knowledgeContext);

  const userMessage = formatSnapshotForPrompt(snapshot, options.lang, options.prevContext, options.newsDb);

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
