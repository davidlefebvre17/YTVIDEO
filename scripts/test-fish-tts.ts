/**
 * Test Fish Audio TTS sur quelques beats de l'épisode 2026-03-23.
 *
 * Génère 5 beats avec Fish Audio S2-Pro pour comparer avec edge-tts.
 * Les MP3 sont sauvés dans public/audio/beats-fish/ (sans écraser edge-tts).
 *
 * Usage:
 *   npx tsx scripts/test-fish-tts.ts [voiceId]
 *
 * Exemples:
 *   npx tsx scripts/test-fish-tts.ts                              # voix par défaut
 *   npx tsx scripts/test-fish-tts.ts b6efa2e7896645c28589046c576ddb2e   # Voix de documentaire
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';

const ROOT = process.cwd();
const FIXTURE_PATH = join(ROOT, 'packages/remotion-app/src/fixtures/real-beats.json');
const FISH_AUDIO_DIR = join(ROOT, 'packages/remotion-app/public/audio/beats-fish');

/** Nettoyer le texte pour TTS */
function sanitize(text: string): string {
  return text
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/—/g, ', ')
    .replace(/\.\.\./g, '…')
    .replace(/\+(\d)/g, 'plus $1')
    .replace(/%/g, ' pour cent')
    .replace(/\$/g, ' dollars').replace(/€/g, ' euros')
    .replace(/\bWTI\b/g, 'W.T.I.').replace(/\bDXY\b/g, 'D.X.Y.')
    .replace(/\bRSI\b/g, 'R.S.I.').replace(/\bCOT\b/g, 'C.O.T.')
    .replace(/\bSMA200\b/g, 'S.M.A. 200').replace(/\bSMA50\b/g, 'S.M.A. 50')
    .replace(/\bEMA\b/g, 'E.M.A.').replace(/\bFed\b/g, 'Fède')
    .replace(/\bBCE\b/g, 'B.C.E.').replace(/\bS&P\b/g, 'S. and P.')
    .replace(/\bETF\b/g, 'E.T.F.').replace(/&/g, ' et ')
    .replace(/\s+/g, ' ').trim();
}

async function main() {
  const voiceId = process.argv[2] || undefined;

  console.log('=== Test Fish Audio TTS ===\n');
  console.log(`Voice ID: ${voiceId || 'default (no clone)'}`);
  console.log(`API Key: ${process.env.FISH_API_KEY ? '✓ set' : '✗ missing'}\n`);

  if (!process.env.FISH_API_KEY) {
    console.error('FISH_API_KEY not set. Add it to .env');
    process.exit(1);
  }

  // Charger les beats
  const data = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
  const beats = data.beats as any[];
  console.log(`${beats.length} beats in fixture\n`);

  // Prendre 5 beats variés (début, milieu, fin + un key moment)
  const testBeats = selectTestBeats(beats);
  console.log(`Selected ${testBeats.length} beats for testing:\n`);

  if (!existsSync(FISH_AUDIO_DIR)) mkdirSync(FISH_AUDIO_DIR, { recursive: true });

  for (const beat of testBeats) {
    const text = sanitize(beat.narrationChunk);
    const depth = (beat.segmentDepth || 'focus').toUpperCase() as keyof typeof FISH_PRESETS;
    const preset = FISH_PRESETS[depth] || FISH_PRESETS.FOCUS;
    const mp3Path = join(FISH_AUDIO_DIR, `${beat.id}.mp3`);

    console.log(`  ${beat.id} [${depth}] "${text.slice(0, 60)}..."`);

    try {
      const result = await fishTTS({
        text,
        outputPath: mp3Path,
        voiceId,
        format: 'mp3',
        speed: preset.speed,
        temperature: preset.temperature,
        topP: preset.topP,
        repetitionPenalty: preset.repetitionPenalty,
      });

      console.log(`    ✓ ${(result.bytes / 1024).toFixed(0)} KB → ${mp3Path}\n`);
    } catch (err) {
      console.error(`    ✗ ${(err as Error).message.slice(0, 120)}\n`);
    }
  }

  console.log(`\nDone! Écoute les fichiers dans:\n  ${FISH_AUDIO_DIR}\n`);
  console.log('Pour écouter:');
  console.log('  start packages/remotion-app/public/audio/beats-fish/beat_001.mp3');
}

/** Sélectionne 5 beats variés pour le test */
function selectTestBeats(beats: any[]): any[] {
  const withNarration = beats.filter((b: any) => b.narrationChunk && b.narrationChunk.trim().length > 10);
  if (withNarration.length <= 5) return withNarration;

  const selected: any[] = [];

  // 1. Premier beat (cold open / hook)
  selected.push(withNarration[0]);

  // 2. Un beat DEEP (analytique)
  const deep = withNarration.find((b: any) => b.segmentDepth === 'deep' && !selected.includes(b));
  if (deep) selected.push(deep);

  // 3. Un beat du milieu
  const mid = withNarration[Math.floor(withNarration.length / 2)];
  if (!selected.includes(mid)) selected.push(mid);

  // 4. Un beat FLASH (dynamique)
  const flash = withNarration.find((b: any) => b.segmentDepth === 'flash' && !selected.includes(b));
  if (flash) selected.push(flash);

  // 5. Dernier beat (closing)
  const last = withNarration[withNarration.length - 1];
  if (!selected.includes(last)) selected.push(last);

  return selected.slice(0, 5);
}

main().catch(console.error);
