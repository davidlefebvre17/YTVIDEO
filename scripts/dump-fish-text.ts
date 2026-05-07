/**
 * Dump le texte exact envoyé à Fish Audio pour un épisode donné.
 * Usage : npx tsx scripts/dump-fish-text.ts 2026-05-05
 */
import * as fs from 'fs';
import * as path from 'path';
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

const date = process.argv[2] || '2026-05-05';
const [y, m, d] = date.split('-');
const epDir = path.join(__dirname, '..', 'episodes', y!, `${m}-${d}`);

const beats = JSON.parse(fs.readFileSync(path.join(epDir, 'beats.json'), 'utf-8'));
const script = JSON.parse(fs.readFileSync(path.join(epDir, 'script.json'), 'utf-8'));

console.log(`═══ TEXTE ENVOYÉ À FISH AUDIO — épisode ${date} ═══\n`);

console.log('--- OWL INTRO ---');
console.log(preProcessForTTS(script.owlIntro || ''));
console.log();

let currentSeg = '';
for (const beat of beats) {
  if (beat.segmentId === 'owl' || beat.segmentId === 'title_card') continue;
  if (beat.segmentId !== currentSeg) {
    currentSeg = beat.segmentId;
    console.log(`\n--- ${currentSeg.toUpperCase()} ---`);
  }
  console.log(`[${beat.id}] ${beat.narrationTTS || beat.narrationChunk}`);
}

console.log('\n--- OWL TRANSITIONS (entre segments) ---');
for (const sec of script.sections) {
  if (sec.owlTransition) {
    console.log(`[avant ${sec.id}] ${preProcessForTTS(sec.owlTransition)}`);
  }
}

console.log('\n--- OWL CLOSING ---');
console.log(preProcessForTTS(script.owlClosing || ''));
