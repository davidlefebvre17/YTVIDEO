import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { EpisodeScript, ScriptSection, Language } from "@yt-maker/core";
import { loadWeeklyBrief as loadWeeklyBriefRaw } from "@yt-maker/data";
import { buildResearchContext } from "../memory";
import { loadKnowledgeBriefing } from "../knowledge/knowledge-briefing";
import { flagAssets } from "./p1-flagging";
import { runC1Editorial } from "./p2-editorial";
import { runC2Analysis } from "./p3-analysis";
import { runC3Writing } from "./p4-writing";
import { runValidation } from "./p5-validation";
import { runC5Direction } from "./p6-direction";
import { computeWordBudget } from "./helpers/word-budget";
import { buildEpisodeSummaries, formatRecentScriptsForC3 } from "./helpers/episode-summary";
import { buildCausalBrief } from "./helpers/causal-brief";
import { buildBriefingPack, enrichBriefingPackCBSpeeches } from "./helpers/briefing-pack";
import { runNewsDigest } from "./p1b-news-digest";
import { saveIntermediate as saveToEpisodeIntermediate, loadIntermediate } from "../episode-folder";
import type {
  PipelineOptions,
  PipelineResult,
  PipelineStats,
  PipelineStage,
  DirectedEpisode,
  DraftScript,
  NarrationBlock,
  NarrationSegment,
  SnapshotFlagged,
  EditorialPlan,
  AnalysisBundle,
} from "./types";

// Re-export everything
export * from "./types";
export { flagAssets } from "./p1-flagging";
export { runC1Editorial, validateEditorialPlan } from "./p2-editorial";
export { runC2Analysis } from "./p3-analysis";
export { runC3Writing } from "./p4-writing";
export { runValidation, validateMechanical } from "./p5-validation";
export { runC5Direction } from "./p6-direction";
export { computeWordBudget, durationFromWords } from "./helpers/word-budget";
export { buildEpisodeSummaries, formatRecentScriptsForC3 } from "./helpers/episode-summary";
export { buildCausalBrief } from "./helpers/causal-brief";
export { generateBeats, chunkNarration, computeOverlayDelay } from "./p7a-beat-generator";
export { annotateBeats } from "./p7a5-beat-annotator";
export type { BeatAnnotation } from "./p7a5-beat-annotator";
export { runC7Direction } from "./p7b-direction-artistique";
export { runC8ImagePrompts, buildStyleSuffix } from "./p7c-image-prompts";
export { runImageGeneration } from "./p7d-image-generation";
export { adaptForTTS } from "./p7-c6-tts-adaptation";
export type { TTSBeat } from "./p7-c6-tts-adaptation";
export { buildBriefingPack, enrichBriefingPackCBSpeeches, formatBriefingPack } from "./helpers/briefing-pack";
export { runNewsDigest, formatNewsDigest } from "./p1b-news-digest";
export type { NewsDigest, NewsDigestEvent } from "./p1b-news-digest";
export type { BriefingPack, PoliticalTrigger, ScreenMover, EarningsBucket, COTHighlight, COTDivergence, SentimentTrend } from "./helpers/briefing-pack";
export { episodeDir, createEpisodeDir, saveToEpisode, saveIntermediate as saveToEpisodeIntermediate, syncImagesToPublic, syncAudioToPublic, saveRemotionProps, saveEpisodeData, cleanPublicForNewEpisode } from "../episode-folder";

/**
 * Format weekly brief as string for C1 prompt.
 */
function formatWeeklyBrief(): string {
  try {
    const brief = loadWeeklyBriefRaw();
    if (!brief) return "";
    let text = `Régime: ${brief.regime_summary}\n`;
    if (brief.notable_zones.length) {
      text += "Zones notables:\n";
      for (const z of brief.notable_zones) {
        text += `  ${z.symbol} ${z.type} ${z.level}: ${z.event}\n`;
      }
    }
    if (brief.watchlist_next_week.length) {
      text += "Watchlist:\n";
      for (const w of brief.watchlist_next_week) {
        text += `  ${w.symbol}: ${w.reason}\n`;
      }
    }
    return text;
  } catch {
    return "";
  }
}

/**
 * Save intermediate pipeline result for debugging.
 * Delegates to episode-folder for centralized management.
 */
function saveIntermediate(date: string, name: string, data: unknown): void {
  saveToEpisodeIntermediate(date, name, data);
}

/**
 * Convert DirectedEpisode to EpisodeScript for Remotion compatibility.
 */
export function toEpisodeScript(
  directed: DirectedEpisode,
  episodeNumber: number,
  lang: Language = "fr"
): EpisodeScript {
  const { script } = directed;

  const blockToSection = (block: NarrationBlock): ScriptSection => ({
    id: block.type,
    type:
      block.type === "hook"
        ? "hook"
        : block.type === "title_card"
          ? "title_card"
          : block.type === "thread"
            ? "thread"
            : "closing",
    title: block.title,
    narration: block.narration,
    durationSec: block.durationSec,
    visualCues: block.visualCues ?? [],
  });

  const segToSection = (seg: NarrationSegment): ScriptSection => ({
    id: seg.segmentId,
    type: "segment",
    title: seg.title,
    narration: seg.narration,
    durationSec: seg.durationSec,
    visualCues: seg.visualCues ?? [],
    depth: seg.depth.toLowerCase() as "flash" | "focus" | "deep" | "panorama",
    topic: seg.topic,
    assets: seg.assets,
    editorialVisual: seg.editorialVisual,
    owlTransition: seg.owlTransition,
    data: {
      depth: seg.depth,
      topic: seg.topic,
      predictions: seg.predictions,
    },
  });

  const sections: ScriptSection[] = [
    blockToSection(script.coldOpen),
    blockToSection(script.titleCard),
    blockToSection(script.thread),
    ...script.segments.map(segToSection),
    blockToSection(script.closing),
  ];

  return {
    episodeNumber,
    date: script.date,
    type: "daily_recap",
    lang,
    title: script.title,
    description: script.description,
    sections,
    totalDurationSec: script.metadata.totalDurationSec,
    threadSummary: script.metadata.threadSummary,
    segmentCount: script.metadata.segmentCount,
    coverageTopics: script.metadata.coverageTopics,
    mechanismsExplained: script.metadata.mechanismsExplained ?? [],
    direction: {
      arc: directed.arc,
      transitions: directed.transitions,
      chartTimings: directed.chartTimings,
      moodMusic: directed.moodMusic,
      thumbnailMoment: directed.thumbnailMoment,
    },
    owlIntro: script.owlIntro,
    owlClosing: script.owlClosing,
  };
}

/**
 * Run the full C1→C5 pipeline.
 */
export async function runPipeline(
  options: PipelineOptions
): Promise<PipelineResult> {
  const { snapshot, lang, episodeNumber, newsDb, prevContext } = options;
  const stats: PipelineStats = {
    totalDurationMs: 0,
    llmCalls: 0,
    retries: 0,
    cost: 0,
  };
  const t0 = Date.now();

  const STAGE_ORDER: PipelineStage[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const startIdx = options.startFrom ? STAGE_ORDER.indexOf(options.startFrom) : 0;
  const shouldRun = (stage: PipelineStage) => STAGE_ORDER.indexOf(stage) >= startIdx;

  console.log(`\n═══ Pipeline C1→C5 — ${snapshot.date}${options.startFrom ? ` (from ${options.startFrom})` : ''} ═══\n`);

  // ── P1: Pré-filtrage mécanique (code pur) ──────────────
  let flagged: SnapshotFlagged;
  if (shouldRun('p1')) {
    console.log("P1 — Pré-filtrage mécanique...");
    flagged = flagAssets(snapshot);
  } else {
    console.log("P1 — Chargement depuis disque...");
    const loaded = loadIntermediate<SnapshotFlagged>(snapshot.date, "snapshot_flagged");
    if (!loaded) throw new Error(`startFrom=${options.startFrom}: snapshot_flagged.json not found in episodes/${snapshot.date}`);
    flagged = loaded;
  }
  console.log(
    `  ${flagged.assets.length} assets scorés, top: ${flagged.assets
      .slice(0, 3)
      .map((a) => `${a.symbol}(${a.materialityScore})`)
      .join(", ")}`
  );
  if (flagged.newsClusters.length) {
    console.log(`  News clusters: ${flagged.newsClusters.map(c => `${c.name}(${c.articleCount} articles)`).join(', ')}`);
  }
  saveIntermediate(snapshot.date, "snapshot_flagged", flagged);

  // ── Prepare parallel inputs ────────────────────────────
  const episodeSummaries = buildEpisodeSummaries(prevContext, 15, snapshot.date);
  const recentScripts = formatRecentScriptsForC3(prevContext, 5);

  let researchContext = "";
  if (newsDb) {
    try {
      const clusterSymbols = flagged.newsClusters.map(c => ({
        symbol: c.symbol,
        name: c.name,
      }));
      researchContext = buildResearchContext(snapshot, newsDb, clusterSymbols);
    } catch (err) {
      console.warn(
        `  Research context error: ${(err as Error).message.slice(0, 80)}`
      );
    }
  }

  const weeklyBrief = formatWeeklyBrief();
  const causalBrief = buildCausalBrief(flagged);
  let briefingPack = buildBriefingPack(flagged, snapshot);
  // Enrich CB speeches with BIS content (async, conditional — only fetches if speeches detected)
  briefingPack = await enrichBriefingPackCBSpeeches(briefingPack, snapshot);
  if (briefingPack.cbSpeechesYesterday.length) {
    console.log(`  CB speeches: ${briefingPack.cbSpeechesYesterday.length} enriched`);
  }
  if (briefingPack.politicalTriggers.length) {
    console.log(`  Triggers: ${briefingPack.politicalTriggers.map(t => `${t.actor}(${t.action})`).join(', ')}`);
  }
  if (briefingPack.topScreenMovers.length) {
    console.log(`  Screen movers: ${briefingPack.topScreenMovers.slice(0, 5).map(m => `${m.symbol}(${m.changePct.toFixed(1)}%)`).join(', ')}`);
  }
  if (options.stopAt === "p1") {
    return {
      directedEpisode: null as unknown as DirectedEpisode,
      intermediates: { flagged } as any,
      stats,
    };
  }

  // ── P1.5: News Digest — extraction événements structurels ──
  let newsDigest: Awaited<ReturnType<typeof runNewsDigest>> = { events: [] };
  if (shouldRun('p1')) {
    const calendarHighlights = (snapshot.events ?? [])
      .filter(e => e.impact === 'high')
      .map(e => `${e.time ?? '?'} ${e.name} (${e.currency}) forecast:${e.forecast ?? '?'} actual:${e.actual ?? '?'}`);
    newsDigest = await runNewsDigest(snapshot.news ?? [], calendarHighlights);
    stats.llmCalls++;
    if (newsDigest.events.length) {
      const gc = newsDigest.events.filter(e => e.importance === 'game_changer').length;
      const sig = newsDigest.events.filter(e => e.importance === 'significant').length;
      console.log(`  Digest: ${newsDigest.events.length} events (${gc} game-changers, ${sig} significant)`);

      // Reinject digest into materialityScore — max boost per asset (not cumulative)
      const DIGEST_BOOST: Record<string, number> = { game_changer: 3, significant: 2, notable: 0 };
      const maxBoostPerAsset = new Map<string, number>();
      for (const event of newsDigest.events) {
        const boost = DIGEST_BOOST[event.importance] ?? 0;
        if (boost === 0) continue;
        for (const sym of event.linkedAssets ?? []) {
          maxBoostPerAsset.set(sym, Math.max(maxBoostPerAsset.get(sym) ?? 0, boost));
        }
      }
      let boosted = 0;
      for (const [sym, boost] of maxBoostPerAsset) {
        const asset = flagged.assets.find(a => a.symbol === sym);
        if (asset) {
          asset.materialityScore = Math.round((asset.materialityScore + boost) * 10) / 10;
          boosted++;
        }
      }
      if (boosted > 0) {
        flagged.assets.sort((a, b) => b.materialityScore - a.materialityScore);
        console.log(`  Digest boost: ${boosted} assets adjusted (max per asset), re-sorted`);
      }
    }
  } else {
    console.log("  P1.5 — Skipped (loaded from disk)");
  }

  // ── P2: C1 Sonnet — Sélection éditoriale ────────────────
  let editorial: EditorialPlan;
  if (shouldRun('p2')) {
    console.log("\nP2 — C1 Sonnet (sélection éditoriale)...");
    editorial = await runC1Editorial({
      flagged,
      episodeSummaries,
      researchContext,
      weeklyBrief,
      briefingPack,
      newsDigest,
      lang,
    });
    stats.llmCalls++;
    console.log(
      `  ${editorial.totalSegments} segments: ${editorial.segments
        .map((s) => `${s.id}[${s.depth}]`)
        .join(", ")}`
    );
    saveIntermediate(snapshot.date, "editorial", editorial);
  } else {
    console.log("\nP2 — Chargement depuis disque...");
    const loaded = loadIntermediate<EditorialPlan>(snapshot.date, "editorial");
    if (!loaded) throw new Error(`startFrom=${options.startFrom}: editorial.json not found`);
    editorial = loaded;
    console.log(`  ${editorial.totalSegments} segments (loaded)`);
  }

  // ── Auto-generate PANORAMA segment from skipped/uncovered assets ──
  {
    // Collect top skipped assets + screen movers not already in editorial segments
    const coveredSymbols = new Set<string>();
    for (const seg of editorial.segments) {
      for (const sym of seg.assets) coveredSymbols.add(sym);
    }

    // Candidates: skipped assets with high materiality + top screen movers
    const panoramaAssets: string[] = [];

    // 1. Flagged assets not covered (already scored, sorted by materialityScore)
    for (const asset of flagged.assets) {
      if (coveredSymbols.has(asset.symbol)) continue;
      if (panoramaAssets.length >= 10) break;
      panoramaAssets.push(asset.symbol);
    }

    // 2. Screen movers (outside watchlist) not covered
    if (briefingPack?.topScreenMovers) {
      for (const mover of briefingPack.topScreenMovers) {
        if (coveredSymbols.has(mover.symbol)) continue;
        if (panoramaAssets.includes(mover.symbol)) continue;
        if (panoramaAssets.length >= 15) break;
        panoramaAssets.push(mover.symbol);
      }
    }

    if (panoramaAssets.length >= 5) {
      editorial.segments.push({
        id: 'seg_panorama',
        topic: 'Tour du monde — les autres mouvements du jour',
        depth: 'PANORAMA' as any,
        assets: panoramaAssets,
        angle: 'Balayage rapide des mouvements non couverts — une phrase par asset, enchaîner naturellement',
        justification: `${panoramaAssets.length} assets non couverts méritent une mention`,
      });
      editorial.totalSegments = editorial.segments.length;
      console.log(`  Panorama: ${panoramaAssets.length} assets (${panoramaAssets.slice(0, 5).join(', ')}...)`);
    }
  }

  // ── Knowledge RAG briefing (depends on editorial) ──
  console.log("\n  Knowledge RAG briefing...");
  const knowledgeBriefing = await loadKnowledgeBriefing(flagged, editorial, snapshot, briefingPack?.politicalTriggers);
  stats.llmCalls++; // Haiku ranking call
  console.log(`  Knowledge: ${knowledgeBriefing.length} chars briefing`);

  if (options.stopAt === "p2") {
    return {
      directedEpisode: null as unknown as DirectedEpisode,
      intermediates: { flagged, editorial } as any,
      stats,
    };
  }

  // ── Word budget (depends on C1) ────────────────────────
  const budget = computeWordBudget(editorial);
  console.log(`  Budget: ${budget.totalTarget} mots cible`);

  // ── P3: C2 Sonnet — Analyse ────────────────────────────
  let analysis: AnalysisBundle;
  if (shouldRun('p3')) {
    console.log("\nP3 — C2 Sonnet (analyse)...");
    analysis = await runC2Analysis({
      editorial,
      flagged,
      causalBrief,
      researchContext,
      snapshot,
      briefingPack,
      knowledgeBriefing,
      episodeSummaries,
      lang,
    });
    stats.llmCalls++;
    console.log(
      `  ${analysis.segments.length} analyses, mood: ${analysis.globalContext.marketMood}`
    );
    saveIntermediate(snapshot.date, "analysis", analysis);
  } else {
    console.log("\nP3 — Chargement depuis disque...");
    const loaded = loadIntermediate<AnalysisBundle>(snapshot.date, "analysis");
    if (!loaded) throw new Error(`startFrom=${options.startFrom}: analysis.json not found`);
    analysis = loaded;
    console.log(`  ${analysis.segments.length} analyses (loaded)`);
  }

  if (options.stopAt === "p3") {
    return {
      directedEpisode: null as unknown as DirectedEpisode,
      intermediates: { flagged, editorial, analysis } as any,
      stats,
    };
  }

  // ── Build asset context for C3 (description + aliases from profiles) ──
  const { assetDescription, assetAliases } = await import("@yt-maker/core");
  const { getProfileContext } = await import("../company-profiles");
  const assetContext: Record<string, string> = {};

  // Collect all symbols mentioned in editorial plan + stockScreen
  const allSymbols = new Set<string>();
  for (const seg of editorial.segments) {
    for (const sym of seg.assets) allSymbols.add(sym);
  }
  for (const asset of snapshot.assets) allSymbols.add(asset.symbol);
  if (snapshot.stockScreen) {
    for (const stock of snapshot.stockScreen) allSymbols.add(stock.symbol);
  }

  // Build context: description + aliases for each symbol
  for (const sym of allSymbols) {
    const desc = assetDescription(sym);
    const aliases = assetAliases(sym);
    const stockDesc = snapshot.stockScreen?.find(s => s.symbol === sym)?.description;

    let ctx = '';
    const resolvedDesc = desc ?? stockDesc;
    if (resolvedDesc) ctx = resolvedDesc;
    else {
      const profile = getProfileContext(sym);
      if (profile) ctx = profile;
    }

    if (aliases.length > 0) {
      ctx += (ctx ? ' | Surnoms: ' : 'Surnoms: ') + aliases.join(', ');
    }

    if (ctx) assetContext[sym] = ctx;
  }

  // ── P4: C3 Opus — Rédaction ────────────────────────────
  console.log("\nP4 — C3 Opus (rédaction)...");
  if (Object.keys(assetContext).length) {
    console.log(`  Asset context: ${Object.keys(assetContext).length} assets with descriptions`);
  }
  let draft = await runC3Writing({
    editorial,
    analysis,
    budget,
    recentScripts,
    knowledgeBriefing,
    researchContext,
    lang,
    assetContext,
    flagged,
  });
  stats.llmCalls++;
  saveIntermediate(snapshot.date, "episode_draft", draft);

  if (options.stopAt === "p4") {
    return {
      directedEpisode: null as unknown as DirectedEpisode,
      intermediates: { flagged, editorial, analysis, draft } as any,
      stats,
    };
  }

  // ── P5: C4 Validation (seule boucle) ──────────────────
  console.log("\nP5 — C4 Validation...");
  let validation = await runValidation(draft, editorial, analysis, budget, flagged);
  stats.llmCalls++;

  if (validation.status === "needs_revision") {
    const blockers = validation.issues.filter((i) => i.severity === "blocker");
    console.log(`  ⚠ ${blockers.length} blockers — retry C3...`);

    // Retry C3 with feedback + previous draft for targeted correction
    draft = await runC3Writing({
      editorial,
      analysis,
      budget,
      recentScripts,
      knowledgeBriefing,
      researchContext,
      lang,
      feedback: blockers,
      assetContext,
      flagged,
      previousDraft: draft,
    });
    stats.llmCalls++;
    stats.retries++;

    // Re-validate
    validation = await runValidation(draft, editorial, analysis, budget, flagged);
    stats.llmCalls++;

    if (validation.status === "needs_revision") {
      const remainingBlockers = validation.issues.filter(
        (i) => i.severity === "blocker"
      );
      console.warn(
        `  ⚠ Still ${remainingBlockers.length} blockers after retry — continuing with best result`
      );
    }
  }

  const validatedScript = validation.validatedScript;
  console.log(
    `  Validation: ${validation.status} (${validation.issues.length} issues)`
  );
  saveIntermediate(snapshot.date, "episode_validated", validatedScript);

  if (options.stopAt === "p5") {
    return {
      directedEpisode: null as unknown as DirectedEpisode,
      intermediates: { flagged, editorial, analysis, draft, validation } as any,
      stats,
    };
  }

  // ── P6: C5 Sonnet — Direction ──────────────────────────
  console.log("\nP6 — C5 Sonnet (direction)...");
  const directed = await runC5Direction({
    draft: validatedScript,
    editorial,
    analysis,
    lang,
  });
  stats.llmCalls++;
  console.log(
    `  Arc: ${directed.arc
      .map((a) => `${a.segmentId}:${a.role}(${a.tensionLevel})`)
      .join(", ")}`
  );
  console.log(
    `  Mood: ${directed.moodMusic} | Thumbnail: ${directed.thumbnailMoment.segmentId}`
  );
  saveIntermediate(snapshot.date, "episode_directed", directed);

  // ── Stats ──────────────────────────────────────────────
  stats.totalDurationMs = Date.now() - t0;
  // Cost estimation (rough)
  stats.cost = stats.llmCalls * 0.04 + stats.retries * 0.15; // rough average

  console.log(
    `\n═══ Pipeline terminé en ${(stats.totalDurationMs / 1000).toFixed(1)}s — ${stats.llmCalls} appels LLM, ${stats.retries} retries ═══\n`
  );

  return {
    directedEpisode: directed,
    intermediates: { flagged, editorial, analysis, draft, validation },
    stats,
  };
}
