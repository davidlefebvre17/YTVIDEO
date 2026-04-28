/**
 * Génère le TTS sans C6 (preProcessForTTS only) pour comparer avec la version C6.
 * Compare: episodes/2026/04-16/audio/segments/ (avec C6) vs data/tts-c6-compare/ (sans C6)
 */
import 'dotenv/config';
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const outDir = 'data/tts-c6-compare';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const segs = ['seg_1', 'seg_2', 'seg_panorama'];

async function main() {
  const data = JSON.parse(readFileSync('episodes/2026/04-16/beats-raw.json', 'utf-8'));
  const beats = data.beats || data;
  const preset = FISH_PRESETS.FOCUS;

  for (const segId of segs) {
    const segBeats = beats.filter((b: any) => b.segmentId === segId);
    if (!segBeats.length) { console.log('No beats for ' + segId); continue; }

    // PreProcess only — no C6, no [pause] tags
    const rawText = segBeats
      .map((b: any) => preProcessForTTS(b.narrationChunk))
      .join(' ')
      .replace(/\.\s+/g, '.\n')
      .replace(/\?\s+/g, '?\n')
      .replace(/!\s+/g, '!\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    const mp3 = join(outDir, `${segId}_no_c6.mp3`);
    console.log(`${segId}: generating without C6 (${rawText.split(/\s+/).length} words)...`);

    try {
      const r = await fishTTS({
        text: rawText,
        outputPath: mp3,
        format: 'mp3',
        speed: preset.speed,
        temperature: preset.temperature,
      });
      console.log(`  OK ${(r.bytes / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(`  FAIL ${(e as Error).message.slice(0, 100)}`);
    }
  }

  console.log('\n=== Compare ===');
  for (const segId of segs) {
    console.log(`${segId}:`);
    console.log(`  AVEC C6:  start episodes/2026/04-16/audio/segments/${segId}.mp3`);
    console.log(`  SANS C6:  start data/tts-c6-compare/${segId}_no_c6.mp3`);
  }
}

main().catch(console.error);
