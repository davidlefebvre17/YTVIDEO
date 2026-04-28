import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('episodes/2026/04-16/beats-raw.json', 'utf-8'));
const beats = (data.beats || data) as any[];

let changed = 0;
for (const b of beats) {
  const pp = preProcessForTTS(b.narrationChunk);
  if (pp !== b.narrationChunk) {
    changed++;
    console.log(`--- ${b.id} [${b.segmentId}] ---`);
    console.log(`OPUS: ${b.narrationChunk.slice(0, 200)}`);
    console.log(`TTS:  ${pp.slice(0, 200)}`);
    console.log();
  }
}
console.log(`${changed}/${beats.length} beats modifiés par preProcess`);
