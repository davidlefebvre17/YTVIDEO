/**
 * Re-exécute UNIQUEMENT P7a5 (Haiku beat annotation) sur un épisode existant.
 * Sans relancer Opus, sans relancer ComfyUI, sans relancer TTS.
 *
 * Usage: npx tsx scripts/rerun-beat-annotation.ts <episode-key>
 *        ex: npx tsx scripts/rerun-beat-annotation.ts 2026-04-28
 *
 * Met à jour beats.json + props.json + fixture Studio.
 * Préserve imagePath, audioPath, imageEffect, etc. (champs de C7/C8/TTS).
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { annotateBeats } from '@yt-maker/ai';
import type { AnalysisBundle } from '@yt-maker/ai';

const key = process.argv[2];
if (!key) {
  console.error('Usage: rerun-beat-annotation.ts <episode-key>');
  process.exit(1);
}

const [y, md] = [key.slice(0, 4), key.slice(5)];
const epDir = join('episodes', y, md);

const snapshotPath = join(epDir, 'snapshot.json');
const beatsPath = join(epDir, 'beats.json');
const propsPath = join(epDir, 'props.json');

if (!existsSync(snapshotPath) || !existsSync(beatsPath)) {
  console.error('Missing snapshot.json or beats.json in ' + epDir);
  process.exit(1);
}

async function main() {
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
  const beats: any[] = JSON.parse(readFileSync(beatsPath, 'utf-8'));

  // Try load analysis intermediate, fallback to empty if missing
  const analysisPath = join(epDir, 'pipeline', 'analysis.json');
  let analysis: AnalysisBundle;
  if (existsSync(analysisPath)) {
    analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));
    console.log('Analysis loaded from ' + analysisPath);
  } else {
    analysis = { segments: [], globalContext: { marketMood: '', dominantTheme: '', crossSegmentLinks: [], keyRisks: [] } } as any;
    console.log('No analysis intermediate found — running with empty analysis (variants based on narration + emotion only)');
  }

  // Reconstruire RawBeat pour annotateBeats (besoin de id, segmentId, narrationChunk, durationSec, segmentDepth, isSegmentStart, isSegmentEnd)
  const rawBeats = beats.map(b => ({
    id: b.id,
    segmentId: b.segmentId,
    narrationChunk: b.narrationChunk,
    durationSec: b.durationSec,
    segmentDepth: b.segmentDepth ?? 'focus',
    isSegmentStart: b.isSegmentStart ?? false,
    isSegmentEnd: b.isSegmentEnd ?? false,
    overlayHint: b.overlayHint,
    overlayData: b.overlayData,
    primaryAsset: b.primaryAsset,
    emotion: b.emotion,
  })) as any;

  console.log(`\nRe-annotating ${rawBeats.length} beats with Haiku P7a5...`);
  const annotations = await annotateBeats(rawBeats, snapshot, analysis);

  // Index annotations by beatId
  const annMap = new Map(annotations.map(a => [a.beatId, a]));

  // Merge new annotations into existing beats (preserve imagePath, audioPath, etc.)
  let variantsApplied = 0;
  let variantsByKind: Record<string, number> = {};
  for (const beat of beats) {
    const ann = annMap.get(beat.id);
    if (!ann) continue;
    beat.overlayHint = ann.overlayType;
    beat.primaryAsset = ann.primaryAsset;
    beat.emotion = ann.emotion;
    beat.visualScale = ann.visualScale;
    beat.beatPacing = ann.beatPacing;
    beat.overlayAnimation = ann.overlayAnimation;
    beat.isKeyMoment = ann.isKeyMoment;
    beat.triggerWord = ann.triggerWord;
    if (ann.overlaySpec) {
      beat.overlayData = beat.overlayData ?? {};
      Object.assign(beat.overlayData, ann.overlaySpec);
    }
    if (ann.variant) {
      beat.overlayData = beat.overlayData ?? {};
      beat.overlayData.variant = ann.variant;
      // Aussi dans beat.overlay.data pour le rendu Remotion
      if (beat.overlay?.data) beat.overlay.data.variant = ann.variant;
      variantsApplied++;
      variantsByKind[ann.variant] = (variantsByKind[ann.variant] ?? 0) + 1;
    } else if (beat.overlayData) {
      delete beat.overlayData.variant;
      if (beat.overlay?.data) delete beat.overlay.data.variant;
    }
  }

  writeFileSync(beatsPath, JSON.stringify(beats, null, 2));
  console.log(`\n${variantsApplied} variants appliqués sur ${beats.length} beats`);
  for (const [v, n] of Object.entries(variantsByKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}: ${n}`);
  }

  // Sync props.json beats
  if (existsSync(propsPath)) {
    const props = JSON.parse(readFileSync(propsPath, 'utf-8'));
    props.beats = beats;
    writeFileSync(propsPath, JSON.stringify(props, null, 2));
    console.log(`\nprops.json synchronisé`);
  }

  console.log(`\nNext step:  npx tsx scripts/reenrich-props-assets.ts ${key}`);
  console.log(`(pour synchroniser la fixture Studio + episode-index)`);
}

main().catch(e => { console.error(e); process.exit(1); });
