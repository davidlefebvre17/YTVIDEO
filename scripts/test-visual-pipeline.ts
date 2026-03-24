/**
 * Test du pipeline visuel P7a→P7c sur un épisode réel.
 * Génère un fichier props JSON utilisable dans Remotion Studio.
 *
 * Usage: npx tsx scripts/test-visual-pipeline.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import type { EpisodeScript, DailySnapshot, Beat, BeatEpisodeData } from "@yt-maker/core";
import { generateBeats } from "../packages/ai/src/pipeline/p7a-beat-generator";
import { runC7Direction } from "../packages/ai/src/pipeline/p7b-direction-artistique";
import { runC8ImagePrompts } from "../packages/ai/src/pipeline/p7c-image-prompts";
import { computeOverlayDelay } from "../packages/ai/src/pipeline/p7a-beat-generator";

// ── Load latest episode ──
const episodePath = path.resolve(__dirname, "..", "episodes", "2026", "03-20.json");
console.log(`Loading episode: ${episodePath}`);
const episode = JSON.parse(fs.readFileSync(episodePath, "utf-8"));
const script: EpisodeScript = episode.script;
const snapshot: DailySnapshot = episode.snapshot;

// Load C2 analysis if available (enriches overlays with levels, RSI, causal chains)
const analysisPath = path.resolve(__dirname, "..", "data", "pipeline", "2026-03-20", "analysis.json");
let analysis: any = undefined;
if (fs.existsSync(analysisPath)) {
  analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
  console.log(`Analysis loaded: ${analysis.segments?.length ?? 0} segments`);
}

console.log(`Script: "${script.title}" — ${script.sections.length} sections, ${script.totalDurationSec}s`);

async function main() {
  // ── P7a: Beat Generator (CODE) ──
  console.log("\n=== P7a: Beat Generator ===");
  const rawBeats = generateBeats(script, snapshot, analysis);
  console.log(`  ${rawBeats.length} beats generated`);
  console.log(`  Overlays: ${rawBeats.filter(b => b.overlayHint !== 'none').length}/${rawBeats.length}`);
  console.log(`  Segments: ${[...new Set(rawBeats.map(b => b.segmentId))].join(', ')}`);

  // ── P7b: C7 Sonnet Direction Artistique ──
  console.log("\n=== P7b: C7 Sonnet Direction Artistique ===");
  const direction = script.direction ?? {
    arc: [], transitions: [], chartTimings: [],
    moodMusic: 'neutre_analytique' as const,
    thumbnailMoment: { segmentId: 'seg_1', reason: '', emotionalTone: '' },
  };
  const c7Result = await runC7Direction(rawBeats, direction, snapshot.assets, { lang: script.lang });
  console.log(`  Identity: ${c7Result.visualIdentity.colorTemperature} / ${c7Result.visualIdentity.lightingRegister}`);
  console.log(`  Style: ${c7Result.visualIdentity.photographicStyle}`);
  const reuses = c7Result.directions.filter(d => d.imageReuse).length;
  const overlays = c7Result.directions.filter(d => d.overlay !== 'none').length;
  console.log(`  Directions: ${c7Result.directions.length}, overlays: ${overlays}, reuses: ${reuses}`);

  // ── P7c: C8 Haiku Image Prompts ──
  console.log("\n=== P7c: C8 Haiku Image Prompts ===");
  const imagePrompts = await runC8ImagePrompts(c7Result, direction.moodMusic, { lang: script.lang });
  const generated = imagePrompts.filter(p => !p.skip).length;
  const skipped = imagePrompts.filter(p => p.skip).length;
  console.log(`  Prompts: ${generated} generated, ${skipped} skipped (reuse)`);

  // ── Assemble final Beat[] ──
  console.log("\n=== Assembly ===");
  const placeholders = [
    'placeholders/trading-floor.png', 'placeholders/skyline-dawn.png',
    'placeholders/gold-bars.png', 'placeholders/oil-tanker.png',
    'placeholders/port-aerial.png', 'placeholders/office-desk.png',
  ];

  const beats: Beat[] = rawBeats.map((raw, i) => {
    const dir = c7Result.directions.find(d => d.beatId === raw.id);
    const prompt = imagePrompts.find(p => p.beatId === raw.id);

    const finalOverlayType = dir?.overlay && dir.overlay !== 'none' ? dir.overlay : null;

    let overlayData = raw.overlayData ?? {};
    if (finalOverlayType && (finalOverlayType !== raw.overlayHint || Object.keys(overlayData).length === 0)) {
      const { resolveOverlayData } = require('../packages/ai/src/pipeline/p7a-beat-generator');
      overlayData = resolveOverlayData(raw.narrationChunk, finalOverlayType, snapshot.assets, raw.assets, snapshot);
    }

    const delay = finalOverlayType
      ? computeOverlayDelay(raw.narrationChunk, finalOverlayType, raw.durationSec * 1000)
      : { delayMs: 0 };

    return {
      id: raw.id,
      segmentId: raw.segmentId,
      startSec: raw.startSec,
      durationSec: raw.durationSec,
      narrationChunk: raw.narrationChunk,
      timing: { estimatedDurationSec: raw.durationSec },
      imagePrompt: prompt?.imagePrompt ?? '',
      imagePath: placeholders[i % placeholders.length],
      imageReuse: dir?.imageReuse,
      imageEffect: dir?.imageEffect ?? 'ken_burns_in',
      overlay: finalOverlayType ? {
        type: finalOverlayType,
        data: overlayData,
        position: getPosition(finalOverlayType),
        enterAnimation: getAnimation(finalOverlayType),
        enterDelayMs: delay.delayMs,
        triggerWord: delay.triggerWord,
      } : undefined,
      transitionOut: dir?.transitionOut ?? 'fade',
      emotion: dir?.emotion ?? 'contexte',
    };
  });

  const beatData: BeatEpisodeData = {
    beats,
    visualIdentity: c7Result.visualIdentity,
    totalBeats: beats.length,
    uniqueImages: beats.filter(b => !b.imageReuse).length,
    stats: {
      overlayCount: beats.filter(b => b.overlay).length,
      imageOnlyCount: beats.filter(b => !b.overlay).length,
      avgBeatDurationSec: Math.round(beats.reduce((s, b) => s + b.durationSec, 0) / beats.length * 10) / 10,
    },
  };

  // ── Save props for Remotion Studio ──
  const propsPath = path.resolve(__dirname, "..", "data", "beat-test-props.json");
  const props = {
    script,
    beats: beatData.beats,
    assets: snapshot.assets,
    news: snapshot.news,
  };
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

  console.log(`\n=== Results ===`);
  console.log(`Beats: ${beatData.totalBeats}`);
  console.log(`Unique images: ${beatData.uniqueImages}`);
  console.log(`Overlays: ${beatData.stats.overlayCount} (${Math.round(beatData.stats.overlayCount / beatData.totalBeats * 100)}%)`);
  console.log(`Avg beat: ${beatData.stats.avgBeatDurationSec}s`);
  console.log(`Total duration: ${beats.reduce((s, b) => s + b.durationSec, 0).toFixed(1)}s`);
  console.log(`\nProps saved: ${propsPath}`);
  console.log(`\nTo preview in Remotion Studio:`);
  console.log(`  npm run dev`);
  console.log(`  → Navigate to BeatEpisodes/BeatDaily`);
  console.log(`  → In sidebar, load props from: data/beat-test-props.json`);

  // Also print 3 sample prompts
  console.log(`\n=== Sample image prompts ===`);
  const samplePrompts = imagePrompts.filter(p => !p.skip).slice(0, 3);
  for (const p of samplePrompts) {
    console.log(`\n[${p.beatId}]:`);
    console.log(`  ${p.imagePrompt.slice(0, 150)}...`);
  }
}

function getPosition(overlay: string): 'center' | 'bottom_third' | 'lower_third' | 'top_right' | 'full' {
  switch (overlay) {
    case 'stat': return 'lower_third';
    case 'chart': case 'chart_zone': return 'center';
    case 'causal_chain': return 'center';
    case 'comparison': return 'bottom_third';
    case 'headline': return 'lower_third';
    case 'text_card': return 'center';
    case 'heatmap': return 'center';
    case 'scenario_fork': return 'center';
    case 'gauge': return 'top_right';
    default: return 'center';
  }
}

function getAnimation(overlay: string): 'pop' | 'slide_up' | 'fade' | 'count_up' {
  switch (overlay) {
    case 'stat': return 'count_up';
    case 'comparison': return 'slide_up';
    case 'causal_chain': return 'fade';
    case 'headline': return 'fade';
    case 'text_card': return 'fade';
    case 'gauge': return 'count_up';
    default: return 'fade';
  }
}

main().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
