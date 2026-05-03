/**
 * Quick smoke test — charge tous les modules narratifs + vérifie les types
 * et la signature publique de runC8ImagePrompts. Aucun appel LLM, aucun coût.
 *
 * Usage : npx tsx scripts/test-narrative-import.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import {
  runC8ImagePrompts,
  type NarrativeContext,
} from '../packages/ai/src/pipeline/p7c-image-prompts';
import {
  generateNarrativePromptsForSegment,
  humanizeTickers,
  humanizeAssetList,
  type SubjectKind,
  type SubjectRole,
  type StagingMode,
  type Subject,
  type Staging,
  type BeatSubjects,
  type NarrativeBeat,
  type BeatLite,
  type SectionLite,
} from '../packages/ai/src/pipeline/p7c-narrative';

// ── 1. Modules charge sans erreur ─────────────────────────────────
console.log('✓ Imports OK');
console.log('  runC8ImagePrompts:', typeof runC8ImagePrompts);
console.log('  generateNarrativePromptsForSegment:', typeof generateNarrativePromptsForSegment);
console.log('  humanizeTickers:', typeof humanizeTickers);

// ── 2. humanizeTickers fonctionne ─────────────────────────────────
const sample = 'Hier, "CL=F" a clôturé à 99$, "USDJPY=X" est stable, "^N225" cède 1%.';
const cleaned = humanizeTickers(sample);
console.log('\n✓ humanizeTickers');
console.log(`  in : ${sample}`);
console.log(`  out: ${cleaned}`);

const cleanedAssets = humanizeAssetList(['CL=F', 'USDJPY=X', '^N225', 'AAPL', 'BTC-USD']);
console.log(`  assets: ${cleanedAssets.join(' | ')}`);

// ── 3. NarrativeContext can be built from a real episode ─────────
const epDir = path.join(process.cwd(), 'episodes', '2026', '04-29');
if (!fs.existsSync(epDir)) {
  console.log('\n(Episode 04-29 not found — skipping context-build test)');
  process.exit(0);
}

const beatsRaw = JSON.parse(fs.readFileSync(path.join(epDir, 'beats.json'), 'utf-8'));
const allBeats: any[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf-8'));

const ctx: NarrativeContext = {
  beats: allBeats.map((b) => ({
    id: b.id,
    segmentId: b.segmentId,
    narrationChunk: b.narrationChunk ?? '',
    emotion: b.emotion,
  })),
  sections: script.sections.map((s: any) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    narration: s.narration ?? '',
    topic: s.topic,
    assets: s.assets,
  })),
};

console.log('\n✓ NarrativeContext built from episode');
console.log(`  beats   : ${ctx.beats.length}`);
console.log(`  sections: ${ctx.sections.length}`);

// Group beats by segment to verify the pipeline groupage logic
const bySegment = new Map<string, BeatLite[]>();
for (const b of ctx.beats) {
  if (!bySegment.has(b.segmentId)) bySegment.set(b.segmentId, []);
  bySegment.get(b.segmentId)!.push(b);
}
console.log(`  segments grouping:`);
for (const [segId, beats] of bySegment) {
  const sec = ctx.sections.find((s) => s.id === segId);
  console.log(`    ${segId.padEnd(20)} ${beats.length} beats  (section ${sec ? '✓' : '✗ MISSING'})`);
}

// Verify all beats have a matching section
const orphanBeats = ctx.beats.filter((b) => !ctx.sections.find((s) => s.id === b.segmentId));
if (orphanBeats.length > 0) {
  console.log(`\n⚠ Orphan beats (no matching section): ${orphanBeats.length}`);
  for (const b of orphanBeats.slice(0, 5)) console.log(`    - ${b.id} → segmentId=${b.segmentId}`);
} else {
  console.log(`\n✓ All beats have a matching section`);
}

console.log('\n✓ Smoke test passed — no LLM call made');
