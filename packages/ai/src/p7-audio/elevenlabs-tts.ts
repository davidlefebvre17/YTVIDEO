/**
 * TTS avec ElevenLabs API.
 *
 * Utilise le modèle eleven_multilingual_v2 (FR natif).
 *
 * Env: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

export interface ElevenLabsTTSOptions {
  text: string;
  outputPath: string;
  /** Voice ID (from ElevenLabs dashboard) */
  voiceId?: string;
  /** Model ID — default: eleven_multilingual_v2 */
  modelId?: string;
  /** Stability 0–1 (default 0.5, higher = more consistent) */
  stability?: number;
  /** Similarity boost 0–1 (default 0.75, higher = closer to original voice) */
  similarityBoost?: number;
  /** Style exaggeration 0–1 (default 0.0) */
  style?: number;
  /** Speaker boost (default true) */
  useSpeakerBoost?: boolean;
  /** Speed multiplier (0.7 – 1.2, default 1.0) */
  speed?: number;
}

export interface ElevenLabsTTSResult {
  outputPath: string;
  bytes: number;
}

function getElevenLabsConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required when TTS_PROVIDER=elevenlabs');
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new Error('ELEVENLABS_VOICE_ID environment variable is required when TTS_PROVIDER=elevenlabs');
  }
  return { apiKey, voiceId };
}

/**
 * Génère un fichier audio MP3 via ElevenLabs.
 */
export async function elevenLabsTTS(opts: ElevenLabsTTSOptions): Promise<ElevenLabsTTSResult> {
  if (!opts.text?.trim()) {
    throw new Error('ElevenLabs TTS: text is empty');
  }

  const { apiKey, voiceId: defaultVoiceId } = getElevenLabsConfig();
  const voiceId = opts.voiceId ?? defaultVoiceId;
  const modelId = opts.modelId ?? DEFAULT_MODEL;

  const dir = dirname(opts.outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const body: Record<string, unknown> = {
    text: opts.text,
    model_id: modelId,
    voice_settings: {
      stability: opts.stability ?? 0.5,
      similarity_boost: opts.similarityBoost ?? 0.75,
      style: opts.style ?? 0.0,
      use_speaker_boost: opts.useSpeakerBoost ?? true,
      speed: opts.speed ?? 1.0,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  const response = await fetch(`${ELEVEN_BASE}/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(opts.outputPath, buffer);

  return {
    outputPath: opts.outputPath,
    bytes: buffer.length,
  };
}

/** Vérifier qu'ElevenLabs est configuré */
export function checkElevenLabsTTS(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}
