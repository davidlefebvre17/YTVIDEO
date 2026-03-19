import type { Language, EpisodeVisualIdentity } from "@yt-maker/core";
import type { BeatDirection, C7DirectionResult, ImagePromptResult } from "./types";
import type { MoodTag } from "./types";
import { buildC8Prompt } from "../prompts/c8-image-prompts";
import { generateStructuredJSON } from "../llm-client";

// ── Mood → style suffix (appended by code, NOT by LLM) ─────

const MOOD_SUFFIX: Record<string, string> = {
  tension_geopolitique: ', dramatic lighting, high contrast, desaturated, photojournalistic',
  risk_off_calme: ', cool tones, soft lighting, serene, editorial photography',
  bullish_momentum: ', warm golden lighting, dynamic angle, vibrant, cinematic',
  neutre_analytique: ', neutral tones, clean composition, professional, documentary style',
  incertitude: ', overcast, muted colors, atmospheric haze, contemplative mood',
};

// ── Emotion → fallback prompt (when LLM fails) ─────────────

const EMOTION_FALLBACK: Record<string, string> = {
  tension: 'Dimly lit trading desk with multiple screens showing market data, quiet tension, editorial photography',
  analyse: 'Clean modern office desk with financial newspaper and coffee, soft morning light, documentary style',
  revelation: 'Architectural detail of modern glass building, light breaking through, clean editorial composition',
  contexte: 'Aerial view of urban landscape at golden hour, wide documentary shot, warm tones',
  impact: 'Empty trading floor after hours, soft ambient lighting, contemplative atmosphere',
  respiration: 'Calm harbor at dawn with still water reflections, peaceful, wide angle documentary',
  conclusion: 'Panoramic city skyline at dawn, financial district emerging from morning fog, serene wide angle',
};

// ── Forbidden words filter ──────────────────────────────────

const FORBIDDEN_WORDS = [
  'text', 'words', 'title', 'label', 'logo', 'brand', 'sign', 'writing',
  'letters', 'face', 'portrait', 'selfie', 'headshot', 'looking at camera',
];

function sanitizePrompt(prompt: string): string {
  let cleaned = prompt;
  for (const word of FORBIDDEN_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    if (re.test(cleaned)) {
      cleaned = cleaned.replace(re, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  return cleaned;
}

// ── Style suffix builder ────────────────────────────────────

export function buildStyleSuffix(identity: EpisodeVisualIdentity, mood: string): string {
  const moodPart = MOOD_SUFFIX[mood] ?? MOOD_SUFFIX.neutre_analytique;
  const stylePart = identity.photographicStyle ? `, ${identity.photographicStyle}` : '';
  return `${stylePart}${moodPart}, wide 16:9 composition`;
}

// ── Main function ───────────────────────────────────────────

export async function runC8ImagePrompts(
  c7Result: C7DirectionResult,
  mood: string,
  _options: { lang: Language },
): Promise<ImagePromptResult[]> {
  const { visualIdentity, directions } = c7Result;

  const toGenerate = directions.filter(d => !d.imageReuse);
  const skipped = directions.filter(d => d.imageReuse);

  const results: ImagePromptResult[] = skipped.map(d => ({
    beatId: d.beatId,
    imagePrompt: '',
    skip: true,
  }));

  if (toGenerate.length === 0) {
    console.log('  C8: no images to generate (all reused)');
    return results;
  }

  const suffix = buildStyleSuffix(visualIdentity, mood);

  try {
    console.log(`  C8 Image Prompts: ${toGenerate.length} directions → Haiku...`);
    const { system, user } = buildC8Prompt(toGenerate, visualIdentity);

    const llmResult = await generateStructuredJSON<Array<{ id: string; prompt: string }>>(
      system, user, { role: 'fast' },
    );

    const promptMap = new Map<string, string>();
    if (Array.isArray(llmResult)) {
      for (const item of llmResult) {
        if (item.id && item.prompt) {
          promptMap.set(item.id, item.prompt);
        }
      }
    }

    for (const dir of toGenerate) {
      let prompt = promptMap.get(dir.beatId) ?? '';

      if (!prompt) {
        prompt = EMOTION_FALLBACK[dir.emotion] ?? EMOTION_FALLBACK.contexte;
      }

      prompt = sanitizePrompt(prompt);
      prompt = prompt + suffix;

      results.push({
        beatId: dir.beatId,
        imagePrompt: prompt,
        skip: false,
      });
    }

    const generated = results.filter(r => !r.skip).length;
    console.log(`  C8: ${generated} prompts generated, ${skipped.length} skipped (reuse)`);

  } catch (err) {
    console.warn(`  C8 Image Prompts failed: ${(err as Error).message.slice(0, 100)}`);
    console.warn('  Using emotion-based fallback prompts');

    for (const dir of toGenerate) {
      const fallback = EMOTION_FALLBACK[dir.emotion] ?? EMOTION_FALLBACK.contexte;
      results.push({
        beatId: dir.beatId,
        imagePrompt: sanitizePrompt(fallback) + suffix,
        skip: false,
      });
    }
  }

  results.sort((a, b) => {
    const aIdx = directions.findIndex(d => d.beatId === a.beatId);
    const bIdx = directions.findIndex(d => d.beatId === b.beatId);
    return aIdx - bIdx;
  });

  return results;
}
