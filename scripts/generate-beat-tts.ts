/**
 * Script: Génère l'audio TTS pour les beats du fixture real-beats.json
 * puis met à jour le fichier avec les audioPath.
 *
 * Usage: npx tsx scripts/generate-beat-tts.ts
 *
 * Utilise msedge-tts (Node.js pur, pas de Python).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { join, basename } from 'path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const ROOT = process.cwd();
const FIXTURE_PATH = join(ROOT, 'packages/remotion-app/src/fixtures/real-beats.json');
const PUBLIC_AUDIO_DIR = join(ROOT, 'packages/remotion-app/public/audio/beats');
const PUBLIC_RELATIVE = 'audio/beats';

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
  // 1. Charger le fixture
  console.log('Loading real-beats.json...');
  const data = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
  const beats = data.beats as any[];
  console.log(`  ${beats.length} beats found`);

  // 2. Préparer le dossier
  if (!existsSync(PUBLIC_AUDIO_DIR)) mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });

  // 3. Init TTS
  const voice = 'fr-FR-DeniseNeural';
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  console.log(`  Voice: ${voice}\n`);

  // 4. Générer beat par beat
  let success = 0;
  let skipped = 0;

  for (const beat of beats) {
    if (!beat.narrationChunk || beat.narrationChunk.trim().length < 3) {
      skipped++;
      continue;
    }

    const targetPath = join(PUBLIC_AUDIO_DIR, `${beat.id}.mp3`);
    const relativePath = `${PUBLIC_RELATIVE}/${beat.id}.mp3`;

    // Skip si déjà généré
    if (existsSync(targetPath) && statSync(targetPath).size > 100) {
      beat.audioPath = relativePath;
      const words = beat.narrationChunk.split(/\s+/).length;
      beat.timing = { ...beat.timing, audioDurationSec: (words / 150) * 60 };
      success++;
      skipped++;
      continue;
    }

    try {
      const text = sanitize(beat.narrationChunk);

      // msedge-tts.toFile(dirPath, text) → génère un fichier dans dirPath
      const { audioFilePath } = await tts.toFile(PUBLIC_AUDIO_DIR, text);

      // Renommer le fichier généré vers notre nom attendu
      if (audioFilePath && existsSync(audioFilePath) && audioFilePath !== targetPath) {
        renameSync(audioFilePath, targetPath);
      }

      // Estimer la durée (~150 mots/min en FR)
      const words = text.split(/\s+/).length;
      const durationSec = (words / 150) * 60;

      beat.audioPath = relativePath;
      beat.timing = { ...beat.timing, audioDurationSec: durationSec };

      success++;
      process.stdout.write(`  [${success}] ${beat.id} (${durationSec.toFixed(1)}s)\n`);
    } catch (err: any) {
      console.warn(`  FAIL ${beat.id}: ${err.message?.slice(0, 80)}`);
    }
  }

  // Fermer la connexion WebSocket
  try { tts.close(); } catch {}

  console.log(`\n  ${success} beats done, ${skipped} skipped`);

  // 5. Sauvegarder le fixture mis à jour
  writeFileSync(FIXTURE_PATH, JSON.stringify(data, null, 2));
  console.log(`  Updated: ${FIXTURE_PATH}`);

  // 6. Copier dans public/ pour Remotion
  const publicPropsPath = join(ROOT, 'packages/remotion-app/public/beat-test-props.json');
  writeFileSync(publicPropsPath, JSON.stringify(data, null, 2));
  console.log(`  Updated: ${publicPropsPath}`);

  console.log('\nDone! Restart Remotion Studio to hear the voices.');
}

main().catch(console.error);
