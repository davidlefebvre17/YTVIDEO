/**
 * Génère l'audio TTS pour chaque beat individuellement.
 *
 * Utilise edge-tts-node (Node.js pur, pas de Python).
 * Chaque beat reçoit son propre fichier MP3.
 * Après génération, beat.audioPath et beat.timing.audioDurationSec sont remplis.
 *
 * Usage:
 *   const beats = await generateBeatAudio(beats, 'fr', 'packages/remotion-app/public/audio/beats');
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Beat, Language } from '@yt-maker/core';

// Lazy import edge-tts-node (optionnel dependency)
let MsEdgeTTS: any;
let OUTPUT_FORMAT: any;

async function loadEdgeTTS() {
  if (!MsEdgeTTS) {
    const mod = await import('edge-tts-node');
    MsEdgeTTS = mod.MsEdgeTTS;
    OUTPUT_FORMAT = mod.OUTPUT_FORMAT;
  }
}

/** Voix par langue */
const VOICES: Record<string, string> = {
  fr: 'fr-FR-DeniseNeural',
  en: 'en-US-AriaNeural',
};

export interface BeatAudioManifest {
  date: string;
  totalDurationSec: number;
  beats: Array<{
    beatId: string;
    mp3Path: string;
    /** Chemin relatif depuis public/ pour staticFile() */
    relativePath: string;
    startSec: number;
    durationSec: number;
    voice: string;
  }>;
}

/** Nettoyer le texte pour TTS — supprimer symboles non-prononçables */
function sanitizeForTTS(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/—/g, ' — ')
    .replace(/\.\.\./g, '…')
    // Symboles financiers → texte
    .replace(/\+(\d)/g, 'plus $1')
    .replace(/%/g, ' pour cent')
    .replace(/\$/g, ' dollars')
    .replace(/€/g, ' euros')
    // Abréviations
    .replace(/\bWTI\b/g, 'W.T.I.')
    .replace(/\bDXY\b/g, 'D.X.Y.')
    .replace(/\bRSI\b/g, 'R.S.I.')
    .replace(/\bCOT\b/g, 'C.O.T.')
    .replace(/\bSMA200\b/g, 'S.M.A. 200')
    .replace(/\bSMA50\b/g, 'S.M.A. 50')
    .replace(/\bEMA\b/g, 'E.M.A.')
    .replace(/\bFed\b/g, 'Fède')
    .replace(/\bBCE\b/g, 'B.C.E.')
    .replace(/\bS&P\b/g, 'S. and P.')
    .replace(/\bETF\b/g, 'E.T.F.')
    .replace(/&/g, ' et ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estimation de durée par mots (~150 mots/min en FR) */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60;
}

/**
 * Génère un fichier MP3 par beat via edge-tts-node.
 * Mute beat.audioPath et beat.timing.audioDurationSec en place.
 *
 * @param beats - Beats à traiter
 * @param lang - Langue ('fr' | 'en')
 * @param outputDir - Dossier de sortie (ex: packages/remotion-app/public/audio/beats)
 * @param publicRelativePrefix - Préfixe relatif depuis public/ (ex: 'audio/beats')
 */
export async function generateBeatAudio(
  beats: Beat[],
  lang: Language = 'fr',
  outputDir: string,
  publicRelativePrefix: string = 'audio/beats',
  options?: {
    voice?: string;
    /** Sauter les beats qui ont déjà un audioPath existant */
    skipExisting?: boolean;
  }
): Promise<{ beats: Beat[]; manifest: BeatAudioManifest }> {
  await loadEdgeTTS();

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const voice = options?.voice ?? VOICES[lang] ?? VOICES.fr;
  const tts = new MsEdgeTTS({});
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const results: Array<{ beatId: string; mp3Path: string; relativePath: string; durationSec: number }> = [];
  let successCount = 0;
  let skipCount = 0;

  console.log(`\n  Generating TTS for ${beats.length} beats (${voice})...`);

  for (const beat of beats) {
    // Skip beats sans narration
    if (!beat.narrationChunk || beat.narrationChunk.trim().length < 3) {
      skipCount++;
      continue;
    }

    const mp3Path = join(outputDir, `${beat.id}.mp3`);
    const relativePath = `${publicRelativePrefix}/${beat.id}.mp3`;

    // Skip si déjà généré
    if (options?.skipExisting && existsSync(mp3Path) && statSync(mp3Path).size > 100) {
      // Use estimated duration for skipped beats
      const dur = estimateDuration(beat.narrationChunk);
      beat.audioPath = relativePath;
      beat.timing = { ...beat.timing, audioDurationSec: dur };
      results.push({ beatId: beat.id, mp3Path, relativePath, durationSec: dur });
      skipCount++;
      successCount++;
      continue;
    }

    try {
      const sanitized = sanitizeForTTS(beat.narrationChunk);
      await tts.toFile(mp3Path, sanitized);

      // Estimer la durée (edge-tts-node ne retourne pas de durée)
      const durationSec = estimateDuration(sanitized);

      // Muter le beat en place
      beat.audioPath = relativePath;
      beat.timing = {
        ...beat.timing,
        audioDurationSec: durationSec,
      };

      results.push({ beatId: beat.id, mp3Path, relativePath, durationSec });
      successCount++;

      if (successCount % 10 === 0) {
        console.log(`    ${successCount} beats done...`);
      }
    } catch (err) {
      console.warn(`    TTS failed for ${beat.id}: ${(err as Error).message.slice(0, 80)}`);
      // Le beat garde son timing estimé, pas d'audioPath
    }
  }

  // Construire le manifest avec offsets absolus
  let currentSec = 0;
  const manifest: BeatAudioManifest = {
    date: new Date().toISOString().slice(0, 10),
    totalDurationSec: 0,
    beats: results.map(({ beatId, mp3Path, relativePath, durationSec }) => {
      const entry = {
        beatId,
        mp3Path,
        relativePath,
        startSec: currentSec,
        durationSec,
        voice,
      };
      currentSec += durationSec;
      return entry;
    }),
  };
  manifest.totalDurationSec = currentSec;

  // Sauvegarder le manifest
  const manifestPath = join(outputDir, 'beat-audio-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `  ${successCount} beats audio generated, ${skipCount} skipped` +
    ` (${manifest.totalDurationSec.toFixed(1)}s total)`
  );
  console.log(`  Manifest: ${manifestPath}`);

  return { beats, manifest };
}
