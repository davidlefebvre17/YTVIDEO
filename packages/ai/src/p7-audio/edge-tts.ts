/**
 * TTS avec edge-tts (Microsoft Edge Neural TTS — gratuit, sans API key).
 *
 * Prérequis : pip install edge-tts
 * Voix FR : fr-FR-DeniseNeural (femme) | fr-FR-HenriNeural (homme)
 * Voix EN : en-US-AriaNeural | en-US-GuyNeural
 *
 * Usage : edge-tts --voice fr-FR-DeniseNeural --text "Bonjour" --write-media out.mp3
 */

import { execSync, exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import type { Language } from '@yt-maker/core';

export interface TTSSegment {
  segmentId: string;
  text: string;
  voice: string;
  speed?: number;   // 0.5 → 1.5 (edge-tts: --rate "+10%" format)
  outputPath: string;
}

export interface TTSResult {
  segmentId: string;
  wavPath: string;
  durationSec: number;
  srtPath?: string;
}

export interface AudioManifest {
  date: string;
  totalDurationSec: number;
  segments: Array<{
    segmentId: string;
    wavPath: string;
    startSec: number;
    durationSec: number;
    voice: string;
  }>;
}

/** Voix par langue et genre */
export const VOICES = {
  fr: {
    female: 'fr-FR-DeniseNeural',
    male: 'fr-FR-HenriNeural',
    default: 'fr-FR-DeniseNeural',
  },
  en: {
    female: 'en-US-AriaNeural',
    male: 'en-US-GuyNeural',
    default: 'en-US-AriaNeural',
  },
} as const;

/** Vérifier si edge-tts est installé */
export function checkEdgeTTS(): boolean {
  try {
    execSync('edge-tts --version', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('python -m edge_tts --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/** Commande edge-tts selon l'environnement */
function getEdgeTTSCmd(): string {
  try {
    execSync('edge-tts --version', { stdio: 'pipe' });
    return 'edge-tts';
  } catch {
    return 'python -m edge_tts';
  }
}

/**
 * Convertir speed (0.5–1.5) en format edge-tts rate (+X% ou -X%)
 * speed=1.0 → "+0%", speed=1.1 → "+10%", speed=0.9 → "-10%"
 */
function speedToRate(speed: number = 1.0): string {
  const pct = Math.round((speed - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Générer un fichier audio WAV depuis un texte.
 * Retourne le chemin du fichier et la durée.
 */
export async function generateSegmentAudio(
  segment: TTSSegment
): Promise<TTSResult> {
  const dir = dirname(segment.outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const cmd = getEdgeTTSCmd();
  const rate = speedToRate(segment.speed);
  const srtPath = segment.outputPath.replace('.wav', '.srt');

  // Sanitize text pour la ligne de commande
  const sanitized = sanitizeForTTS(segment.text);

  // Écrire le texte dans un fichier temp pour éviter les problèmes de quotes
  const tmpTextPath = segment.outputPath.replace('.wav', '_tmp.txt');
  writeFileSync(tmpTextPath, sanitized, 'utf-8');

  const command = `${cmd} --voice "${segment.voice}" --rate "${rate}" --file "${tmpTextPath}" --write-media "${segment.outputPath}" --write-subtitles "${srtPath}"`;

  console.log(`  TTS [${segment.segmentId}] ${segment.voice} rate=${rate}`);

  execSync(command, { stdio: 'pipe', timeout: 30000 });

  // Calculer la durée depuis le SRT
  const durationSec = estimateDurationFromSRT(srtPath) || estimateDurationFromText(sanitized, segment.speed);

  return {
    segmentId: segment.segmentId,
    wavPath: segment.outputPath,
    durationSec,
    srtPath,
  };
}

/**
 * Générer l'audio pour un épisode complet depuis un DraftScript.
 * Retourne l'audio_manifest.json.
 */
export async function generateEpisodeAudio(
  script: { date: string; segments: Array<{ segmentId: string; narration: string; durationSec: number }> },
  lang: Language = 'fr',
  outputDir?: string
): Promise<AudioManifest> {
  if (!checkEdgeTTS()) {
    throw new Error(
      'edge-tts non installé. Exécuter : pip install edge-tts\n' +
      'Puis vérifier avec : edge-tts --version'
    );
  }

  const dir = outputDir ?? join(process.cwd(), 'data', 'audio', script.date);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const voice = VOICES[lang].default;
  const results: TTSResult[] = [];

  for (const seg of script.segments) {
    const outputPath = join(dir, `${seg.segmentId}.wav`);

    try {
      const result = await generateSegmentAudio({
        segmentId: seg.segmentId,
        text: seg.narration,
        voice,
        outputPath,
      });
      results.push(result);
    } catch (err) {
      console.warn(`  TTS échec pour ${seg.segmentId}: ${(err as Error).message.slice(0, 80)}`);
      // Fallback : utiliser la durée estimée, pas de fichier audio
      results.push({
        segmentId: seg.segmentId,
        wavPath: outputPath,
        durationSec: seg.durationSec,
      });
    }
  }

  // Construire le manifest avec offsets absolus
  let currentSec = 0;
  const manifest: AudioManifest = {
    date: script.date,
    totalDurationSec: 0,
    segments: results.map(r => {
      const entry = {
        segmentId: r.segmentId,
        wavPath: r.wavPath,
        startSec: currentSec,
        durationSec: r.durationSec,
        voice,
      };
      currentSec += r.durationSec;
      return entry;
    }),
  };
  manifest.totalDurationSec = currentSec;

  // Sauvegarder le manifest
  const manifestPath = join(dir, 'audio_manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  Audio manifest → ${manifestPath} (${manifest.totalDurationSec.toFixed(1)}s)`);

  return manifest;
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
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extraire la durée depuis un fichier SRT */
function estimateDurationFromSRT(srtPath: string): number {
  try {
    const content = readFileSync(srtPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.includes('-->'));
    if (lines.length === 0) return 0;
    const lastLine = lines[lines.length - 1];
    const match = lastLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g);
    if (!match || match.length < 2) return 0;
    const end = match[1];
    const [h, m, s, ms] = end.split(/[:,]/).map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
  } catch {
    return 0;
  }
}

/** Estimation fallback : ~150 mots/min */
function estimateDurationFromText(text: string, speed: number = 1.0): number {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60 / speed;
}
