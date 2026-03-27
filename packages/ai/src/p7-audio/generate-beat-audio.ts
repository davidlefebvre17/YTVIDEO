/**
 * Génère l'audio TTS pour chaque beat individuellement.
 *
 * Providers : edge-tts (gratuit) | fish (Fish Audio S2-Pro, ~$0.15/épisode)
 * Switch via TTS_PROVIDER env var (default: edge).
 *
 * Chaque beat reçoit son propre fichier MP3.
 * Après génération, beat.audioPath et beat.timing.audioDurationSec sont remplis.
 *
 * Usage:
 *   const beats = await generateBeatAudio(beats, 'fr', 'packages/remotion-app/public/audio/beats');
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Beat, Language } from '@yt-maker/core';
import { fishTTS, FISH_PRESETS } from './fish-tts';

// ─── TTS Provider ───────────────────────────────────────────────

type TTSProvider = 'edge' | 'fish';

function getTTSProvider(): TTSProvider {
  const provider = process.env.TTS_PROVIDER || 'edge';
  if (provider === 'fish' || provider === 'fish-audio') return 'fish';
  return 'edge';
}

// ─── Edge TTS (lazy import) ─────────────────────────────────────

let MsEdgeTTS: any;
let OUTPUT_FORMAT: any;

async function loadEdgeTTS() {
  if (!MsEdgeTTS) {
    const mod = await import('edge-tts-node');
    MsEdgeTTS = mod.MsEdgeTTS;
    OUTPUT_FORMAT = mod.OUTPUT_FORMAT;
  }
}

/** Voix Edge par langue */
const EDGE_VOICES: Record<string, string> = {
  fr: 'fr-FR-DeniseNeural',
  en: 'en-US-AriaNeural',
};

// ─── Shared utils ───────────────────────────────────────────────

export interface BeatAudioManifest {
  date: string;
  provider: TTSProvider;
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

/** Convert integer string to French words (0-999999999) */
function numberToFrench(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num) || num < 0) return n;
  if (num === 0) return 'zéro';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  if (num < 20) return units[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u];
    if (u === 0) return tens[t] + (t === 8 ? 's' : '');
    if (u === 1 && t !== 8) return tens[t] + ' et un';
    return tens[t] + '-' + units[u];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const hPart = h === 1 ? 'cent' : units[h] + ' cent';
    if (rest === 0) return hPart + (h > 1 ? 's' : '');
    return hPart + ' ' + numberToFrench(String(rest));
  }
  if (num < 1000000) {
    const th = Math.floor(num / 1000);
    const rest = num % 1000;
    const thPart = th === 1 ? 'mille' : numberToFrench(String(th)) + ' mille';
    if (rest === 0) return thPart;
    return thPart + ' ' + numberToFrench(String(rest));
  }
  if (num < 1000000000) {
    const mil = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const milPart = mil === 1 ? 'un million' : numberToFrench(String(mil)) + ' millions';
    if (rest === 0) return milPart;
    return milPart + ' ' + numberToFrench(String(rest));
  }
  return n;
}

/** Nettoyer le texte pour TTS — supprimer symboles non-prononçables */
function sanitizeForTTS(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/—/g, ' — ')
    .replace(/\.\.\./g, '…')
    // Chiffres → lettres (pour prononciation TTS)
    .replace(/(\d+)[.,](\d+)\s*%/g, (_, a, b) => `${numberToFrench(a)} virgule ${numberToFrench(b)} pour cent`)
    .replace(/(\d+)\s*%/g, (_, n) => `${numberToFrench(n)} pour cent`)
    .replace(/(\d+)[.,](\d+)\s*\$/g, (_, a, b) => `${numberToFrench(a)} dollars ${numberToFrench(b)}`)
    .replace(/(\d+)\s*\$/g, (_, n) => `${numberToFrench(n)} dollars`)
    .replace(/(\d+)[.,](\d+)\s*€/g, (_, a, b) => `${numberToFrench(a)} euros ${numberToFrench(b)}`)
    .replace(/(\d+)\s*€/g, (_, n) => `${numberToFrench(n)} euros`)
    .replace(/\b(\d{1,9})\b/g, (_, n) => numberToFrench(n))
    // Symboles financiers → texte
    .replace(/\+(\d)/g, 'plus $1')
    .replace(/%/g, ' pour cent')
    .replace(/\$/g, ' dollars')
    .replace(/€/g, ' euros')
    // Mots anglais — laisser tels quels, Fish Audio les prononce mieux que la phonétisation
    // Abréviations
    .replace(/\bWTI\b/g, 'W.T.I.')
    .replace(/\bDXY\b/g, 'D.X.Y.')
    .replace(/\bRSI\b/g, 'R.S.I.')
    .replace(/\bCOT\b/g, 'C.O.T.')
    .replace(/\bSMA200\b/g, 'S.M.A. deux cents')
    .replace(/\bSMA50\b/g, 'S.M.A. cinquante')
    .replace(/\bSMA20\b/g, 'S.M.A. vingt')
    .replace(/\bEMA\b/g, 'E.M.A.')
    .replace(/\bFed\b/g, 'Fède')
    .replace(/\bBCE\b/g, 'B.C.E.')
    .replace(/\bS&P\b/g, 'S. and P.')
    .replace(/\bETF\b/g, 'E.T.F.')
    .replace(/\bUSDC\b/g, 'U.S.D.C.')
    .replace(/\bUSDT\b/g, 'U.S.D.T.')
    .replace(/\bAUD\b/g, 'A.U.D.')
    .replace(/\bCPI\b/g, 'C.P.I.')
    .replace(/\bPMI\b/g, 'P.M.I.')
    .replace(/&/g, ' et ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estimation de durée par mots (~150 mots/min en FR) */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60;
}

// ─── Per-beat TTS generation ────────────────────────────────────

async function generateBeatWithEdge(
  tts: any,
  sanitized: string,
  mp3Path: string,
): Promise<void> {
  await tts.toFile(mp3Path, sanitized);
}

async function generateBeatWithFish(
  sanitized: string,
  mp3Path: string,
  preset?: keyof typeof FISH_PRESETS,
  speed?: number,
): Promise<void> {
  const p = preset ? FISH_PRESETS[preset] : FISH_PRESETS.FOCUS;
  await fishTTS({
    text: sanitized,
    outputPath: mp3Path,
    format: 'mp3',
    speed: speed ?? p.speed,
    temperature: p.temperature,
    topP: p.topP,
    repetitionPenalty: p.repetitionPenalty,
  });
}

// ─── Main entry point ───────────────────────────────────────────

/**
 * Génère un fichier MP3 par beat.
 * Provider sélectionné via TTS_PROVIDER env (edge | fish).
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
    /** Speed multiplier (Fish Audio only, default 1.0) */
    speed?: number;
  }
): Promise<{ beats: Beat[]; manifest: BeatAudioManifest }> {
  const provider = getTTSProvider();

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // Init provider
  let edgeTts: any = null;
  let voice: string;

  if (provider === 'edge') {
    await loadEdgeTTS();
    voice = options?.voice ?? EDGE_VOICES[lang] ?? EDGE_VOICES.fr;
    edgeTts = new MsEdgeTTS({});
    await edgeTts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  } else {
    voice = process.env.FISH_VOICE_ID ?? 'fish-s2-pro';
  }

  const OWL_VOICE_ID = process.env.FISH_OWL_VOICE_ID;

  const results: Array<{ beatId: string; mp3Path: string; relativePath: string; durationSec: number }> = [];
  let successCount = 0;
  let skipCount = 0;

  console.log(`\n  Generating TTS for ${beats.length} beats (${provider}: ${voice})...`);

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

      if (provider === 'fish') {
        await generateBeatWithFish(sanitized, mp3Path, undefined, options?.speed);
      } else {
        await generateBeatWithEdge(edgeTts, sanitized, mp3Path);
      }

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
    provider,
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
    ` (${manifest.totalDurationSec.toFixed(1)}s total) [${provider}]`
  );
  console.log(`  Manifest: ${manifestPath}`);

  return { beats, manifest };
}
