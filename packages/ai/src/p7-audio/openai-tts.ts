/**
 * TTS via OpenAI gpt-4o-mini-tts.
 *
 * Pas de clone vocal. 11 voix disponibles (alloy, ash, ballad, coral, echo,
 * fable, onyx, nova, sage, shimmer, verse). Le modèle gpt-4o-mini-tts accepte
 * un champ `instructions` (langage naturel) pour orienter le style/prosodie —
 * c'est le levier principal pour obtenir un FR métropolitain naturel.
 *
 * Coût indicatif : ~0,015 $/min audio.
 *
 * Env: OPENAI_API_KEY, OPENAI_TTS_VOICE (default 'onyx'),
 *      OPENAI_TTS_MODEL (default 'gpt-4o-mini-tts')
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const OPENAI_BASE = 'https://api.openai.com/v1/audio/speech';

export type OpenAIVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
  | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse';

export interface OpenAITTSOptions {
  text: string;
  outputPath: string;
  voice?: OpenAIVoice;
  /** gpt-4o-mini-tts | tts-1 | tts-1-hd */
  model?: string;
  /** Langage naturel — orientation prosodie/ton (gpt-4o-mini-tts uniquement) */
  instructions?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  /** 0.25 – 4.0 (default 1.0) */
  speed?: number;
}

export interface OpenAITTSResult {
  outputPath: string;
  bytes: number;
}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required when TTS_PROVIDER=openai');
  }
  const voice = (process.env.OPENAI_TTS_VOICE as OpenAIVoice) || 'onyx';
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  return { apiKey, voice, model };
}

export async function openaiTTS(opts: OpenAITTSOptions): Promise<OpenAITTSResult> {
  if (!opts.text?.trim()) {
    throw new Error('OpenAI TTS: text is empty');
  }

  const { apiKey, voice: defaultVoice, model: defaultModel } = getOpenAIConfig();
  const voice = opts.voice ?? defaultVoice;
  const model = opts.model ?? defaultModel;
  const format = opts.format ?? 'mp3';

  const dir = dirname(opts.outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const body: Record<string, unknown> = {
    model,
    voice,
    input: opts.text,
    response_format: format,
  };

  if (typeof opts.speed === 'number') {
    body.speed = opts.speed;
  }

  if (opts.instructions && model === 'gpt-4o-mini-tts') {
    body.instructions = opts.instructions;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  const response = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI TTS ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(opts.outputPath, buffer);

  return {
    outputPath: opts.outputPath,
    bytes: buffer.length,
  };
}

export function checkOpenAITTS(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
