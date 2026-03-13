/**
 * Test pipeline layer by layer.
 * Usage: npx tsx scripts/test-layer-by-layer.ts --layer p1|p2|p3|p4|p5|p6
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { DailySnapshot } from "@yt-maker/core";
import type { PrevContext } from "@yt-maker/ai";

/**
 * Load previous pipeline runs as PrevContext for C1/C3.
 * Reads data/pipeline/YYYY-MM-DD/draft.json + data/snapshot-*.json
 * Orders oldest→newest so entries[last] = J-1.
 */
function loadPrevContextFromPipelineRuns(currentDate: string): PrevContext {
  const pipelineDir = join(process.cwd(), "data", "pipeline");
  if (!existsSync(pipelineDir)) return { entries: [] };

  const dirs = readdirSync(pipelineDir)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d < currentDate)
    .sort(); // oldest first → last entry = J-1

  const entries: PrevContext["entries"] = [];

  for (const dir of dirs) {
    // Support both naming conventions (draft.json and episode_draft.json)
    const draftPath = existsSync(join(pipelineDir, dir, "draft.json"))
      ? join(pipelineDir, dir, "draft.json")
      : join(pipelineDir, dir, "episode_draft.json");
    const snapPath = join(process.cwd(), "data", `snapshot-${dir}.json`);
    if (!existsSync(draftPath) || !existsSync(snapPath)) continue;

    const draft = JSON.parse(readFileSync(draftPath, "utf-8"));
    const snap = JSON.parse(readFileSync(snapPath, "utf-8"));

    // Convert DraftScript → minimal EpisodeScript shape expected by buildEpisodeSummaries / formatRecentScriptsForC3
    const script = {
      threadSummary: draft.metadata?.dominantTheme ?? "",
      moodMarche: draft.metadata?.moodMarche ?? "",
      sections: (draft.segments ?? []).map((seg: Record<string, unknown>) => ({
        type: "segment" as const,
        title: seg.title ?? "",
        narration: seg.narration ?? "",
        depth: seg.depth ?? "FOCUS",
        assets: seg.assets ?? [],
        data: {
          topic: seg.title ?? "",
          predictions: seg.predictions ?? [],
        },
      })),
    };

    entries.push({ snapshot: snap, script: script as never });
  }

  return { entries };
}

const args = process.argv.slice(2);
const layerIdx = args.indexOf("--layer");
const layer = layerIdx >= 0 ? args[layerIdx + 1] : "p1";
const dateIdx = args.indexOf("--date");
const date = dateIdx >= 0 ? args[dateIdx + 1] : "2026-03-10";

const snapshotPath = join(process.cwd(), "data", `snapshot-${date}.json`);
const snapshot: DailySnapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));

console.log(`\n=== Layer: ${layer.toUpperCase()} === (snapshot ${snapshot.date})\n`);

async function main() {
  if (layer === "p1") {
    const { flagAssets } = await import("@yt-maker/ai");
    const { buildBriefingPack, formatBriefingPack } = await import("@yt-maker/ai");
    const { buildCausalBrief } = await import("@yt-maker/ai");

    const flagged = flagAssets(snapshot);

    console.log(`--- P1 FLAGGING ---`);
    console.log(`Assets scorés: ${flagged.assets.length}`);
    console.log(`\nTop 15 par materialityScore:`);
    for (const a of flagged.assets.slice(0, 15)) {
      console.log(`  ${a.symbol.padEnd(12)} ${a.name.padEnd(25)} score=${a.materialityScore.toFixed(1).padStart(5)}  chg=${(a.changePct ?? 0).toFixed(2).padStart(7)}%  flags=[${a.flags.join(', ')}]`);
    }

    console.log(`\nScreen results: ${flagged.screenResults.length} stocks`);
    for (const s of flagged.screenResults.slice(0, 10)) {
      console.log(`  ${s.symbol.padEnd(10)} ${s.name.padEnd(25)} chg=${s.changePct.toFixed(2).padStart(7)}%  reason=[${(s.reason ?? []).join(', ')}]`);
    }

    console.log(`\nEarnings: ${flagged.earnings.length}`);
    for (const e of flagged.earnings.slice(0, 5)) {
      console.log(`  ${e.symbol.padEnd(10)} publishingToday=${e.earningsDetail?.publishingToday}`);
    }

    console.log(`\nEvents: ${(flagged.events ?? []).length}`);
    for (const e of (flagged.events ?? []).slice(0, 8)) {
      console.log(`  ${(e.time ?? '?').padEnd(8)} ${e.name.padEnd(40)} impact=${e.impact}  ${e.actual ? `actual=${e.actual}` : `forecast=${e.forecast ?? '?'}`}`);
    }

    console.log(`\n--- BRIEFING PACK ---`);
    const briefingPack = buildBriefingPack(flagged, snapshot);
    console.log(`Political triggers: ${briefingPack.politicalTriggers.length}`);
    for (const t of briefingPack.politicalTriggers) {
      console.log(`  ${t.actor} → ${t.action} — "${t.sourceTitle.slice(0, 80)}"`);
      console.log(`    linked: ${t.linkedAssets.join(', ')}`);
    }
    console.log(`\nTop news (${briefingPack.topNewsTitles.length}):`);
    for (const t of briefingPack.topNewsTitles) {
      console.log(`  - ${t}`);
    }
    console.log(`\nScreen movers hors watchlist (${briefingPack.topScreenMovers.length}):`);
    for (const m of briefingPack.topScreenMovers) {
      console.log(`  ${m.symbol.padEnd(10)} ${m.name.padEnd(25)} ${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}%  [${m.sector}]  reasons=[${m.reasons.join(', ')}]`);
    }
    console.log(`\nCalendar highlights: ${briefingPack.calendarHighlights.length}`);
    for (const h of briefingPack.calendarHighlights) {
      console.log(`  - ${h}`);
    }
    console.log(`\nEarnings reported: ${briefingPack.earningsBuckets.reported.length}`);
    for (const e of briefingPack.earningsBuckets.reported.slice(0, 5)) {
      console.log(`  - ${e}`);
    }
    console.log(`Earnings pending: ${briefingPack.earningsBuckets.pending.length}`);
    for (const e of briefingPack.earningsBuckets.pending.slice(0, 5)) {
      console.log(`  - ${e}`);
    }
    console.log(`Earnings upcoming: ${briefingPack.earningsBuckets.upcoming.length}`);
    for (const e of briefingPack.earningsBuckets.upcoming.slice(0, 5)) {
      console.log(`  - ${e}`);
    }

    console.log(`\nCOT highlights: ${briefingPack.cotHighlights.length}`);
    for (const c of briefingPack.cotHighlights) {
      const flipTag = c.flip ? ' **FLIP**' : '';
      console.log(`  ${c.symbol.padEnd(12)} ${c.name.padEnd(20)} bias=${c.bias}  netChg=${c.netChange}  (J-${c.daysOld})${flipTag}`);
    }

    console.log(`\nCOT divergences: ${briefingPack.cotDivergences.length}`);
    for (const d of briefingPack.cotDivergences) {
      console.log(`  ${d.symbol.padEnd(12)} ${d.name.padEnd(20)} COT=${d.cotBias} vs prix=${d.priceChangePct.toFixed(2)}%`);
      console.log(`    → ${d.note}`);
    }

    console.log(`\nUpcoming high-impact events: ${briefingPack.upcomingHighImpact.length}`);
    for (const e of briefingPack.upcomingHighImpact) {
      console.log(`  ${e}`);
    }

    if (briefingPack.sentimentTrend) {
      const t = briefingPack.sentimentTrend;
      const arrow = t.direction === 'improving' ? '📈' : t.direction === 'worsening' ? '📉' : '➡️';
      console.log(`\nSentiment trend: ${arrow} ${t.current} (${t.label}) — ${t.direction}${t.streak > 1 ? ` x${t.streak}j` : ''}`);
      console.log(`  History: ${t.history.map(h => `${h.date}=${h.value}`).join(' ← ')}`);
    }

    console.log(`\n--- CAUSAL BRIEF ---`);
    const causalBrief = buildCausalBrief(flagged);
    console.log(causalBrief || '(empty)');

    // Save for next layers
    const outDir = join(process.cwd(), "data", "pipeline", date);
    if (!existsSync(outDir)) {
      const { mkdirSync } = await import("fs");
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(join(outDir, "flagged.json"), JSON.stringify(flagged, null, 2));
    writeFileSync(join(outDir, "briefing-pack.json"), JSON.stringify(briefingPack, null, 2));
    writeFileSync(join(outDir, "causal-brief.json"), JSON.stringify(causalBrief, null, 2));
    console.log(`\nSaved to data/pipeline/${date}/`);
  }

  if (layer === "p2") {
    const { runC1Editorial } = await import("@yt-maker/ai");
    const flagged = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "flagged.json"), "utf-8"));
    const briefingPack = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "briefing-pack.json"), "utf-8"));

    console.log(`--- P2 C1 HAIKU (sélection éditoriale) ---`);
    const { buildEpisodeSummaries } = await import("@yt-maker/ai");
    const prevContext = loadPrevContextFromPipelineRuns(date);
    const episodeSummaries = buildEpisodeSummaries(prevContext, 15);
    console.log(`  PrevContext: ${prevContext.entries.length} épisodes chargés (${episodeSummaries.length} summaries)`);

    const editorial = await runC1Editorial({
      flagged,
      episodeSummaries,
      researchContext: "",
      weeklyBrief: "",
      briefingPack,
      lang: "fr",
    });

    console.log(`\nMood marché: ${editorial.moodMarche}`);
    console.log(`Theme du jour: ${editorial.dominantTheme}`);
    console.log(`Total segments: ${editorial.totalSegments}`);
    console.log(`\nSegments:`);
    for (const s of editorial.segments) {
      console.log(`  ${s.id.padEnd(8)} [${s.depth.padEnd(5)}] ${s.topic.padEnd(30)} assets=[${s.assets.join(', ')}]`);
      if (s.trigger) {
        console.log(`           trigger: ${s.trigger.actor} → ${s.trigger.action} (${s.trigger.source})`);
      }
      if (s.narrativeRole) {
        console.log(`           role: ${s.narrativeRole}`);
      }
      console.log(`           angle: ${s.angle}`);
    }
    console.log(`\nThread: ${editorial.threadSummary}`);

    const outDir = join(process.cwd(), "data", "pipeline", date);
    writeFileSync(join(outDir, "editorial.json"), JSON.stringify(editorial, null, 2));
    console.log(`\nSaved to data/pipeline/${date}/editorial.json`);
  }

  if (layer === "p3") {
    const { runC2Analysis } = await import("@yt-maker/ai");
    const flagged = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "flagged.json"), "utf-8"));
    const editorial = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "editorial.json"), "utf-8"));
    const briefingPack = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "briefing-pack.json"), "utf-8"));
    const causalBrief = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "causal-brief.json"), "utf-8"));

    console.log(`--- P3 C2 SONNET (analyse) ---`);
    const analysis = await runC2Analysis({
      editorial,
      flagged,
      causalBrief,
      researchContext: "",
      snapshot,
      briefingPack,
      lang: "fr",
    });

    console.log(`\nGlobal context:`);
    console.log(`  Mood: ${analysis.globalContext.marketMood}`);
    console.log(`  Theme: ${analysis.globalContext.dominantTheme}`);
    console.log(`  Cross-links: ${analysis.globalContext.crossSegmentLinks.join(' | ')}`);

    console.log(`\nSegment analyses:`);
    for (const s of analysis.segments) {
      console.log(`\n  ${s.segmentId}:`);
      console.log(`    keyFacts: ${JSON.stringify(s.keyFacts)}`);
      console.log(`    chartInstructions: ${JSON.stringify(s.chartInstructions?.slice(0, 2))}`);
      console.log(`    causalChain: ${s.causalChain}`);
      if (s.sourcesUsed?.length) {
        console.log(`    sources: ${s.sourcesUsed.map(su => `${su.type}:${su.detail.slice(0, 40)}`).join(' | ')}`);
      }
    }

    const outDir = join(process.cwd(), "data", "pipeline", date);
    writeFileSync(join(outDir, "analysis.json"), JSON.stringify(analysis, null, 2));
    console.log(`\nSaved to data/pipeline/${date}/analysis.json`);
  }

  if (layer === "p4") {
    const { runC3Writing, computeWordBudget, loadKnowledge } = await import("@yt-maker/ai");
    const editorial = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "editorial.json"), "utf-8"));
    const analysis = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "analysis.json"), "utf-8"));

    console.log(`--- P4 C3 OPUS (rédaction narrative) ---`);

    const budget = computeWordBudget(editorial);
    console.log(`Budget: hook=${budget.hook} thread=${budget.thread} closing=${budget.closing} total=${budget.totalTarget}`);
    for (const s of budget.segments) {
      console.log(`  ${s.segmentId} [${s.depth}]: cible=${s.targetWords} max=${s.maxWords}`);
    }

    // Load Tier1 knowledge (tone + narrative patterns)
    const knowledgeTier1 = loadKnowledge(snapshot);

    const { formatRecentScriptsForC3 } = await import("@yt-maker/ai");
    const prevContext = loadPrevContextFromPipelineRuns(date);
    const recentScripts = formatRecentScriptsForC3(prevContext, 5);
    console.log(`  PrevContext: ${prevContext.entries.length} épisodes chargés pour C3`);

    const draft = await runC3Writing({
      editorial,
      analysis,
      budget,
      recentScripts,
      knowledgeTier1,
      lang: "fr",
    });

    console.log(`\n--- DRAFT OUTPUT ---`);
    console.log(`Titre: ${draft.title}`);
    console.log(`Description: ${draft.description}`);
    console.log(`Total mots: ${draft.metadata?.totalWordCount} | Durée: ${draft.metadata?.totalDurationSec}s`);
    console.log(`Mood: ${draft.metadata?.moodMarche} | Thème: ${draft.metadata?.dominantTheme}`);

    console.log(`\n[COLD OPEN] (${draft.coldOpen?.wordCount} mots)`);
    console.log(draft.coldOpen?.narration);

    console.log(`\n[THREAD] (${draft.thread?.wordCount} mots)`);
    console.log(draft.thread?.narration);

    for (const seg of draft.segments ?? []) {
      console.log(`\n[${seg.segmentId?.toUpperCase()} — ${seg.title}] [${seg.depth}] (${seg.wordCount} mots)`);
      console.log(seg.narration);
      if (seg.predictions?.length) {
        console.log(`  Predictions: ${seg.predictions.map(p => `${p.asset} ${p.direction} (${p.confidence})`).join(' | ')}`);
      }
      if (seg.transitionTo) {
        console.log(`  → Transition: ${seg.transitionTo}`);
      }
    }

    console.log(`\n[CLOSING] (${draft.closing?.wordCount} mots)`);
    console.log(draft.closing?.narration);

    const outDir = join(process.cwd(), "data", "pipeline", date);
    writeFileSync(join(outDir, "draft.json"), JSON.stringify(draft, null, 2));
    console.log(`\nSaved to data/pipeline/${date}/draft.json`);
  }

  if (layer === "p5") {
    const { runValidation, computeWordBudget } = await import("@yt-maker/ai");
    const editorial = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "editorial.json"), "utf-8"));
    const analysis = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "analysis.json"), "utf-8"));
    const draft = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "draft.json"), "utf-8"));

    console.log(`--- P5 VALIDATION (Code + C4 Haiku) ---`);

    const budget = computeWordBudget(editorial);
    const result = await runValidation(draft, editorial, analysis, budget);

    console.log(`\nStatus: ${result.status}`);
    console.log(`Issues (${result.issues.length}):`);
    for (const issue of result.issues) {
      const icon = issue.severity === 'blocker' ? '🚫' : '⚠️';
      const seg = issue.segmentId ? ` [${issue.segmentId}]` : '';
      console.log(`  ${icon} [${issue.source}]${seg} ${issue.type}: ${issue.description}`);
      if (issue.suggestedFix) console.log(`       → ${issue.suggestedFix}`);
    }

    if (result.status === 'pass') {
      console.log(`\n✅ Validation passée — script prêt pour P6`);
    } else {
      console.log(`\n❌ Révision requise — ${result.issues.filter(i => i.severity === 'blocker').length} blocker(s)`);
    }

    const outDir = join(process.cwd(), "data", "pipeline", date);
    writeFileSync(join(outDir, "validated.json"), JSON.stringify(result, null, 2));
    console.log(`\nSaved to data/pipeline/${date}/validated.json`);
  }

  // p5b: force C4 Haiku semantic validation even if mechanical blockers exist
  if (layer === "p5b") {
    const { generateStructuredJSON } = await import("@yt-maker/ai");
    const editorial = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "editorial.json"), "utf-8"));
    const analysis = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "analysis.json"), "utf-8"));
    const draft = JSON.parse(readFileSync(join(process.cwd(), "data", "pipeline", date, "draft.json"), "utf-8"));

    console.log(`--- P5b C4 HAIKU (validation sémantique directe) ---`);

    const systemPrompt = `Tu es un validateur éditorial pour une émission de marché financier. Tu vérifies la qualité et la compliance d'un script.

RÔLE : Identifier les problèmes. Tu NE réécris PAS le script entier — tu corriges uniquement les problèmes mineurs (warnings).

VÉRIFICATIONS :
1. COMPLIANCE : Aucune recommandation directe, même déguisée ("le bon moment pour...", "on devrait...")
2. TON : Jamais retail ("t'as vu", "c'est dingue", "pépite", "to the moon")
3. COHÉRENCE TEMPORELLE : J vs J-1 clairement distingués, pas d'ambiguïté
4. CONTINUITÉS : Si le plan éditorial mentionne une continuité J-1, elle DOIT être dans la narration
5. CONFIANCE : Le ton doit correspondre au confidenceLevel (speculative → conditionnel, high → direct)
6. HALLUCINATIONS : Tout chiffre précis (volume x fois, %, niveaux) DOIT être dans les keyFacts C2. Signale tout chiffre invraissemblable ou non sourcé.

RÈGLES :
- severity = "blocker" : recommandation directe, ton retail persistant, continuité manquante, chiffre halluciné
- severity = "warning" : transition maladroite, formulation améliorable
- NE PAS inventer de problèmes — si le script est bon, retourne status: "pass"

SORTIE : JSON strict avec status, issues[], et validatedScript.`;

    let userPrompt = `## SCRIPT À VALIDER\n`;
    userPrompt += `Cold open: "${draft.coldOpen?.narration ?? ''}"\n`;
    userPrompt += `Thread: "${draft.thread?.narration ?? ''}"\n\n`;
    for (const seg of draft.segments) {
      const analysisForSeg = analysis.segments.find((s: any) => s.segmentId === seg.segmentId);
      userPrompt += `### ${seg.segmentId} [${seg.depth}] — ${seg.title}\n`;
      userPrompt += `Narration: "${seg.narration}"\n`;
      userPrompt += `keyFacts C2: ${JSON.stringify(analysisForSeg?.keyFacts ?? [])}\n`;
      userPrompt += `Confiance C2: ${analysisForSeg?.confidenceLevel ?? '?'}\n\n`;
    }
    userPrompt += `Closing: "${draft.closing?.narration ?? ''}"\n\n`;
    userPrompt += `## PLAN ÉDITORIAL\n`;
    for (const seg of editorial.segments) {
      userPrompt += `- ${seg.id} [${seg.depth}] ${seg.topic}`;
      if (seg.continuityFromJ1) userPrompt += ` — continuité J-1: ${seg.continuityFromJ1}`;
      userPrompt += '\n';
    }
    userPrompt += `\n## FORMAT DE SORTIE\n{ "status": "pass"|"needs_revision", "issues": [{"type":"...","segmentId":"...","description":"...","severity":"blocker"|"warning","suggestedFix":"...","source":"haiku"}], "validatedScript": null }`;

    const result = await generateStructuredJSON<any>(systemPrompt, userPrompt, { role: 'fast' });

    console.log(`\nStatus: ${result.status}`);
    console.log(`Issues (${result.issues?.length ?? 0}):`);
    for (const issue of result.issues ?? []) {
      const icon = issue.severity === 'blocker' ? '🚫' : '⚠️';
      const seg = issue.segmentId ? ` [${issue.segmentId}]` : '';
      console.log(`  ${icon}${seg} ${issue.type}: ${issue.description}`);
      if (issue.suggestedFix) console.log(`       → ${issue.suggestedFix}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
