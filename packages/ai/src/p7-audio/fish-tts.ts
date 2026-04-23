/**
 * TTS avec Fish Audio S2-Pro API.
 *
 * Clone vocal inclus (15s d'audio suffisent).
 * ~$0.15/épisode, ~$3/mois pour production quotidienne.
 *
 * Marqueurs expressifs supportés dans le texte :
 *   [emphase] — insistance sur le mot/phrase suivant
 *   [grave] — ton grave, sérieux
 *   [calme] — ton posé, mesuré
 *   [triste] — ton solennel
 *   [pause] — silence court
 *   [raclement de gorge] — hésitation naturelle
 *
 * Env: FISH_API_KEY, FISH_VOICE_ID (reference_id du clone)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname } from 'path';

const FISH_BASE = 'https://api.fish.audio/v1/tts';

export interface FishTTSOptions {
  text: string;
  outputPath: string;
  /** Voice clone reference ID (from Fish Audio dashboard) */
  voiceId?: string;
  /** Output format */
  format?: 'mp3' | 'wav' | 'opus' | 'flac';
  /** Speed multiplier via prosody (default 1.0) */
  speed?: number;
  /** Expressiveness: higher = more varied intonation (0.0–1.0, default 0.7) */
  temperature?: number;
  /** Nucleus sampling diversity (0.0–1.0, default 0.8) */
  topP?: number;
  /** Repetition penalty to avoid monotone (default 1.2) */
  repetitionPenalty?: number;
  /** Disable text normalization — required for phoneme tags (default true) */
  normalize?: boolean;
}

export interface FishTTSResult {
  outputPath: string;
  bytes: number;
}

/** Presets par type de segment — uniforme, dynamique et percutant */
export const FISH_PRESETS = {
  DEEP: { speed: 1.0, temperature: 0.5, topP: 0.7, repetitionPenalty: 1.2 },
  FOCUS: { speed: 1.0, temperature: 0.5, topP: 0.7, repetitionPenalty: 1.2 },
  FLASH: { speed: 1.0, temperature: 0.5, topP: 0.7, repetitionPenalty: 1.2 },
  COLD_OPEN: { speed: 1.0, temperature: 0.5, topP: 0.7, repetitionPenalty: 1.2 },
} as const;

function getFishConfig() {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) {
    throw new Error('FISH_API_KEY environment variable is required when TTS_PROVIDER=fish');
  }
  const voiceId = process.env.FISH_VOICE_ID || undefined;
  return { apiKey, voiceId };
}

/**
 * Génère un fichier audio via Fish Audio S2-Pro.
 * Retourne le chemin du fichier et la taille en bytes.
 */
export async function fishTTS(opts: FishTTSOptions): Promise<FishTTSResult> {
  if (!opts.text?.trim()) {
    throw new Error('Fish TTS: text is empty');
  }

  const { apiKey, voiceId: defaultVoiceId } = getFishConfig();
  const voiceId = opts.voiceId ?? defaultVoiceId;
  const format = opts.format ?? 'mp3';

  const dir = dirname(opts.outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const textWithSpeaker = opts.text.startsWith('<|speaker:')
    ? opts.text
    : `<|speaker:0|>${opts.text}`;

  const body: Record<string, unknown> = {
    text: textWithSpeaker,
    format,
    normalize: opts.normalize ?? true,
    latency: 'balanced',
  };

  if (voiceId) {
    body.reference_id = voiceId;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 min timeout (segment mode can be long)

  const response = await fetch(FISH_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': 's2-pro',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fish Audio ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(opts.outputPath, buffer);

  return {
    outputPath: opts.outputPath,
    bytes: buffer.length,
  };
}

/**
 * Créer un clone vocal via l'API Fish Audio.
 * Upload 1-3 samples WAV de 10-30s chacun.
 *
 * @returns Le reference_id (model _id) à utiliser dans FISH_VOICE_ID
 */
export async function createVoiceClone(opts: {
  title: string;
  audioFiles: string[];  // Chemins vers fichiers WAV/MP3
  description?: string;
  visibility?: 'public' | 'unlist' | 'private';
  enhanceQuality?: boolean;
}): Promise<string> {
  const { apiKey } = getFishConfig();

  const formData = new FormData();
  formData.append('type', 'tts');
  formData.append('title', opts.title);
  formData.append('train_mode', 'fast');
  formData.append('visibility', opts.visibility ?? 'private');
  formData.append('enhance_audio_quality', String(opts.enhanceQuality ?? true));

  if (opts.description) {
    formData.append('description', opts.description);
  }

  for (const filePath of opts.audioFiles) {
    const buffer = readFileSync(filePath);
    const ext = filePath.split('.').pop() || 'wav';
    const mimeType = ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`;
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('voices', blob, `sample.${ext}`);
  }

  const response = await fetch('https://api.fish.audio/model', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fish Audio create voice ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json() as { _id: string; title: string; state: string };
  console.log(`  Voice clone created: ${data.title} (${data._id}) — state: ${data.state}`);
  return data._id;
}

/** Vérifier que Fish Audio est configuré */
export function checkFishTTS(): boolean {
  return !!process.env.FISH_API_KEY;
}
