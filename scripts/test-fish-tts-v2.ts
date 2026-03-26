/**
 * Test Fish Audio TTS v2 — avec tags émotionnels et presets variés.
 *
 * Usage: npx tsx scripts/test-fish-tts-v2.ts [voiceId]
 */

import 'dotenv/config';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';

const ROOT = process.cwd();
const FIXTURE_PATH = join(ROOT, 'packages/remotion-app/src/fixtures/real-beats.json');
const FISH_AUDIO_DIR = join(ROOT, 'packages/remotion-app/public/audio/beats-fish');

/** Sanitize pour TTS */
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

// ─── Test beats avec tags émotionnels manuels ───────────────────

interface TestBeat {
  id: string;
  text: string;
  preset: keyof typeof FISH_PRESETS;
  label: string;
}

async function main() {
  const voiceId = process.argv[2] || undefined;

  console.log('=== Test Fish Audio TTS v2 — avec émotions ===\n');
  console.log(`Voice ID: ${voiceId || 'default'}`);
  console.log(`API Key: ${process.env.FISH_API_KEY ? '✓' : '✗ missing'}\n`);

  if (!process.env.FISH_API_KEY) {
    console.error('FISH_API_KEY not set');
    process.exit(1);
  }

  // Charger les vrais beats pour avoir le texte
  const data = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
  const beats = data.beats as any[];

  // Sélectionner des beats intéressants et ajouter les tags
  const testBeats: TestBeat[] = [
    {
      id: 'beat_001',
      text: getAdaptedText(beats, 'beat_001',
        '[emphase] Moins dix pour cent sur le pétrole. [pause] En une seule séance. [grave] Un tweet de Trump, et cinq semaines de prime géopolitique effacées d\'un coup.'),
      preset: 'COLD_OPEN',
      label: 'COLD OPEN — emphase + grave',
    },
    {
      id: 'beat_005',
      text: getAdaptedText(beats, 'beat_005',
        '[grave] Treize jours de hausse. Treize jours de prime géopolitique construite couche par couche. [pause] [emphase] Et tout s\'est effondré en quelques heures.'),
      preset: 'DEEP',
      label: 'DEEP — grave + pause dramatique',
    },
    {
      id: 'beat_020',
      text: getAdaptedText(beats, 'beat_020', null),
      preset: 'FOCUS',
      label: 'FOCUS — calme analytique',
    },
    {
      id: 'beat_060',
      text: getAdaptedText(beats, 'beat_060', null),
      preset: 'FLASH',
      label: 'FLASH — dynamique',
    },
    {
      id: 'beat_080',
      text: getAdaptedText(beats, 'beat_080',
        '[confident] Et la question qui reste en l\'air ce soir. [pause] [whispering] Est-ce vraiment la fin de la crise, ou juste le début d\'une nouvelle phase ?'),
      preset: 'DEEP',
      label: 'CLOSING — confident + whispering',
    },
  ];

  if (!existsSync(FISH_AUDIO_DIR)) mkdirSync(FISH_AUDIO_DIR, { recursive: true });

  for (const tb of testBeats) {
    if (!tb.text) {
      console.log(`  ${tb.id} — skipped (no narration)\n`);
      continue;
    }

    const preset = FISH_PRESETS[tb.preset];
    const mp3Path = join(FISH_AUDIO_DIR, `${tb.id}_v2.mp3`);

    console.log(`  ${tb.id} [${tb.label}]`);
    console.log(`    speed=${preset.speed} temp=${preset.temperature} topP=${preset.topP}`);
    console.log(`    "${tb.text.slice(0, 80)}..."`);

    try {
      const result = await fishTTS({
        text: tb.text,
        outputPath: mp3Path,
        voiceId,
        format: 'mp3',
        speed: preset.speed,
        temperature: preset.temperature,
        topP: preset.topP,
        repetitionPenalty: preset.repetitionPenalty,
      });

      console.log(`    ✓ ${(result.bytes / 1024).toFixed(0)} KB\n`);
    } catch (err) {
      console.error(`    ✗ ${(err as Error).message.slice(0, 120)}\n`);
    }
  }

  console.log(`\nFichiers dans: ${FISH_AUDIO_DIR}`);
  console.log('\nPour écouter:');
  testBeats.forEach(tb => {
    console.log(`  start packages/remotion-app/public/audio/beats-fish/${tb.id}_v2.mp3`);
  });
}

/** Récupère le texte adapté ou le texte original avec tags calme/emphase auto */
function getAdaptedText(beats: any[], beatId: string, override: string | null): string {
  const beat = beats.find((b: any) => b.id === beatId);
  if (!beat?.narrationChunk) return '';

  if (override) return override;

  // Auto-tag basé sur le contenu
  const raw = sanitize(beat.narrationChunk);
  // Ajouter [calme] par défaut pour les beats sans override
  return `[calme] ${raw}`;
}

main().catch(console.error);
