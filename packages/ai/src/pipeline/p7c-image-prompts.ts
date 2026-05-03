import type { Language, EpisodeVisualIdentity } from "@yt-maker/core";
import type { BeatDirection, C7DirectionResult, ImagePromptResult } from "./types";
import type { MoodTag } from "./types";
import { buildC8Prompt } from "../prompts/c8-image-prompts";
import { generateStructuredJSON } from "../llm-client";
import {
  generateNarrativePromptsForSegment,
  type BeatLite,
  type SectionLite,
} from "./p7c-narrative";

// ── Mood → style suffix (appended by code, NOT by LLM) ─────

const MOOD_SUFFIX: Record<string, string> = {
  tension_geopolitique: ', dramatic ink shading, high contrast crosshatching, tense composition',
  risk_off_calme: ', lighter ink density, more cream paper visible, serene wide composition',
  bullish_momentum: ', confident bold linework, warm selective accents, dynamic angle',
  neutre_analytique: ', even stipple density, balanced composition, precise linework',
  incertitude: ', loose crosshatching, atmospheric ink wash, contemplative framing',
};

// ── Emotion → fallback prompts (when LLM fails) ─────────────

const EMOTION_FALLBACK: Record<string, string[]> = {
  tension: [
    'Silhouette of a figure at a desk in dark office, tense posture, hands clasped',
    'Deep shadows falling across a leather briefcase, tension lines sharp and defined',
    'Hunched shoulders of a trader staring at charts, ink crosshatching emphasizing stress',
  ],
  analyse: [
    'Stack of financial newspapers on wooden desk, reading glasses beside them, morning light',
    'Opened financial reports with analytical notes, pencil marks crossing data points',
    'Magnifying glass examining market ticker tape, meticulous detail in stippling',
  ],
  revelation: [
    'Dramatic light breaking through tall windows of institutional building, long shadows',
    'Lightbulb moment illustrated as vertical rays piercing through institutional stone facade',
    'Unveiling of a document, corner lifting to reveal hidden numbers beneath',
  ],
  contexte: [
    'Aerial view of financial district skyline at dusk, distant buildings',
    'Wide establishing shot of stock exchange exterior, bustling entrance steps',
    'Bird\'s-eye view of trading floor layout, positions marked with careful stipple',
  ],
  impact: [
    'Close-up of a gavel striking on marble surface, sharp detail',
    'Impact wave radiating from central point, concentric circles in bold linework',
    'Domino effect illustration, falling pieces rendered in crisp ink',
  ],
  respiration: [
    'Calm harbor at sunrise, still water, distant cranes, soft horizon light',
    'Empty trading floor at dawn, peaceful silence before opening bell',
    'Peaceful landscape with minimal ink density, breathing space in composition',
  ],
  conclusion: [
    'Panoramic city skyline at dawn, financial district emerging from morning fog',
    'Final page of a ledger being closed, symbolic ink line completing the entry',
    'Sunset over financial district, markets closed for the day, calm resolution',
  ],
};

// ── Forbidden words filter ──────────────────────────────────

const FORBIDDEN_WORDS = [
  'selfie', 'headshot', 'looking at camera', 'cartoon', 'caricature',
  'black background', 'dark background', 'black velvet', 'dark surface', 'black surface',
  'noir background', 'on black', 'against black', 'dark backdrop',
  'glowing', 'soft focus', 'bokeh', 'cinematic', 'photorealistic', 'lens flare',
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

// STYLE PREFIX — goes FIRST in every prompt (Flux weighs early tokens more heavily)
const STYLE_PREFIX = 'WSJ hedcut stipple pen and ink illustration on aged cream paper, fine crosshatching and dot shading, black ink dominant. ';

export function buildStyleSuffix(_identity: EpisodeVisualIdentity, mood: string): string {
  const moodPart = MOOD_SUFFIX[mood] ?? MOOD_SUFFIX.neutre_analytique;
  return `${moodPart}, wide 16:9 composition`;
}

// ── Main function ───────────────────────────────────────────

/** Optional input to enable the new narrative 2-pass prompter (P7c v5d).
 *  When `beats` and `sections` are provided, uses the multi-subject + staging
 *  pipeline. Otherwise falls back to the legacy per-beat C8 Haiku prompter.
 */
export interface NarrativeContext {
  beats: BeatLite[];
  sections: SectionLite[];
}

export async function runC8ImagePrompts(
  c7Result: C7DirectionResult,
  mood: string,
  _options: { lang: Language },
  narrativeContext?: NarrativeContext,
): Promise<ImagePromptResult[]> {
  const { visualIdentity, directions } = c7Result;

  // ── Narrative 2-pass path (when context provided) ────────────────
  if (narrativeContext) {
    return runNarrativePath(directions, mood, visualIdentity, narrativeContext);
  }

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

  // Chunk C8 calls to avoid maxTokens overflow (Haiku can't handle 100+ prompts at once)
  const C8_CHUNK_SIZE = 30;
  const promptMap = new Map<string, string>();

  console.log(`  C8 Image Prompts: ${toGenerate.length} directions → Haiku...`);

  for (let i = 0; i < toGenerate.length; i += C8_CHUNK_SIZE) {
    const chunk = toGenerate.slice(i, i + C8_CHUNK_SIZE);
    const chunkNum = Math.floor(i / C8_CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(toGenerate.length / C8_CHUNK_SIZE);

    try {
      if (totalChunks > 1) console.log(`    C8 chunk ${chunkNum}/${totalChunks}: ${chunk.length} directions...`);
      const { system, user } = buildC8Prompt(chunk, visualIdentity);

      const llmResult = await generateStructuredJSON<Array<{ id: string; prompt: string }>>(
        system, user, { role: 'fast' },
      );

      if (Array.isArray(llmResult)) {
        for (const item of llmResult) {
          if (item.id && item.prompt) {
            promptMap.set(item.id, item.prompt);
          }
        }
      }
    } catch (err) {
      console.warn(`    C8 chunk ${chunkNum} failed: ${(err as Error).message.slice(0, 80)}`);
      // Fallback for this chunk only — other chunks still work
      for (const dir of chunk) {
        const fallbackArr = EMOTION_FALLBACK[dir.emotion] ?? EMOTION_FALLBACK.contexte;
        const fallback = fallbackArr[Math.floor(Math.random() * fallbackArr.length)];
        promptMap.set(dir.beatId, fallback);
      }
    }
  }

  for (const dir of toGenerate) {
    let prompt = promptMap.get(dir.beatId) ?? '';

    if (!prompt) {
      const fallbackArr = EMOTION_FALLBACK[dir.emotion] ?? EMOTION_FALLBACK.contexte;
      prompt = fallbackArr[Math.floor(Math.random() * fallbackArr.length)];
    }

    prompt = sanitizePrompt(prompt);
    // Style PREFIX (Flux weighs early tokens more) + content + mood suffix
    prompt = STYLE_PREFIX + prompt + suffix;

    results.push({
      beatId: dir.beatId,
      imagePrompt: prompt,
      skip: false,
    });
  }

  const generated = results.filter(r => !r.skip).length;
  console.log(`  C8: ${generated} prompts generated, ${skipped.length} skipped (reuse)`);

  results.sort((a, b) => {
    const aIdx = directions.findIndex(d => d.beatId === a.beatId);
    const bIdx = directions.findIndex(d => d.beatId === b.beatId);
    return aIdx - bIdx;
  });

  return results;
}

// ── Narrative 2-pass path (v5d) ──────────────────────────────────

async function runNarrativePath(
  directions: BeatDirection[],
  mood: string,
  visualIdentity: EpisodeVisualIdentity,
  ctx: NarrativeContext,
): Promise<ImagePromptResult[]> {
  const suffix = buildStyleSuffix(visualIdentity, mood);
  const beatById = new Map(ctx.beats.map((b) => [b.id, b]));
  const sectionById = new Map(ctx.sections.map((s) => [s.id, s]));

  const reuseDirections = directions.filter((d) => d.imageReuse);
  const generateDirections = directions.filter((d) => !d.imageReuse);

  const results: ImagePromptResult[] = reuseDirections.map((d) => ({
    beatId: d.beatId,
    imagePrompt: '',
    skip: true,
  }));

  // Group beats-to-generate by segment
  const beatsBySegment = new Map<string, BeatLite[]>();
  for (const dir of generateDirections) {
    const beat = beatById.get(dir.beatId);
    if (!beat) continue;
    const segId = beat.segmentId;
    if (!beatsBySegment.has(segId)) beatsBySegment.set(segId, []);
    beatsBySegment.get(segId)!.push(beat);
  }

  console.log(`  C8 narrative: ${generateDirections.length} beats across ${beatsBySegment.size} segments`);

  // Generate per-segment (Pass 1 batch + Pass 2 parallel)
  const promptByBeat = new Map<string, string>();
  let segmentIdx = 0;
  for (const [segId, segmentBeats] of beatsBySegment) {
    segmentIdx++;
    const section = sectionById.get(segId);
    if (!section) {
      console.warn(`  C8 narrative: section "${segId}" not found, skipping ${segmentBeats.length} beats`);
      continue;
    }
    console.log(`    [${segmentIdx}/${beatsBySegment.size}] ${segId}: ${segmentBeats.length} beats...`);
    try {
      const segPrompts = await generateNarrativePromptsForSegment(segmentBeats, section);
      for (const [beatId, prompt] of segPrompts) {
        promptByBeat.set(beatId, prompt);
      }
    } catch (err) {
      console.warn(`    C8 narrative segment "${segId}" failed: ${(err as Error).message.slice(0, 100)}`);
    }
  }

  // Build final results — wrap with style prefix + mood suffix
  for (const dir of generateDirections) {
    const raw = promptByBeat.get(dir.beatId);
    let prompt: string;
    if (raw) {
      prompt = STYLE_PREFIX + sanitizePrompt(raw) + suffix;
    } else {
      // Fallback per-emotion if narrative pipeline failed for this beat
      const fallbackArr = EMOTION_FALLBACK[dir.emotion] ?? EMOTION_FALLBACK.contexte;
      const fb = fallbackArr[Math.floor(Math.random() * fallbackArr.length)];
      prompt = STYLE_PREFIX + sanitizePrompt(fb) + suffix;
    }
    results.push({ beatId: dir.beatId, imagePrompt: prompt, skip: false });
  }

  results.sort((a, b) => {
    const aIdx = directions.findIndex((d) => d.beatId === a.beatId);
    const bIdx = directions.findIndex((d) => d.beatId === b.beatId);
    return aIdx - bIdx;
  });

  const generatedCount = results.filter((r) => !r.skip).length;
  const filledCount = generateDirections.filter((d) => promptByBeat.has(d.beatId)).length;
  console.log(`  C8 narrative: ${filledCount}/${generateDirections.length} prompts via 2-pass, ${reuseDirections.length} skipped (reuse)`);

  return results;
}
