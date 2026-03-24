import type { AssetSnapshot, EpisodeDirection, Language, ImageEffect, BeatTransition, BeatEmotion, OverlayType } from "@yt-maker/core";
import type { RawBeat, BeatDirection, C7DirectionResult } from "./types";
import { buildC7Prompt } from "../prompts/c7-direction-artistique";
import { generateStructuredJSON } from "../llm-client";

const VALID_OVERLAYS = new Set<string>([
  'stat', 'chart', 'chart_zone', 'causal_chain', 'comparison',
  'headline', 'text_card', 'heatmap', 'scenario_fork', 'gauge', 'ticker_strip', 'none',
]);

const VALID_EFFECTS = new Set<string>([
  'ken_burns_in', 'ken_burns_out', 'slow_pan_left', 'slow_pan_right', 'static',
]);

const VALID_TRANSITIONS = new Set<string>([
  'cut', 'fade', 'slide_left', 'slide_up', 'wipe', 'cross_dissolve',
]);

const VALID_EMOTIONS = new Set<string>([
  'tension', 'analyse', 'revelation', 'contexte', 'impact', 'respiration', 'conclusion',
]);

// Map approximate emotion values to valid ones
function normalizeEmotion(raw: string | undefined): BeatEmotion {
  if (!raw) return 'contexte';
  const lower = raw.toLowerCase().trim();
  if (VALID_EMOTIONS.has(lower)) return lower as BeatEmotion;
  // Fuzzy mapping
  if (lower.includes('tension') || lower.includes('stress') || lower.includes('peur') || lower.includes('fear')) return 'tension';
  if (lower.includes('analy') || lower.includes('explic') || lower.includes('pédag') || lower.includes('mecan')) return 'analyse';
  if (lower.includes('revel') || lower.includes('surpr') || lower.includes('paradox') || lower.includes('ironi')) return 'revelation';
  if (lower.includes('impact') || lower.includes('choc') || lower.includes('shock') || lower.includes('drama')) return 'impact';
  if (lower.includes('respir') || lower.includes('calm') || lower.includes('pause') || lower.includes('repos')) return 'respiration';
  if (lower.includes('conclu') || lower.includes('synth') || lower.includes('closing') || lower.includes('final')) return 'conclusion';
  if (lower.includes('context') || lower.includes('intro') || lower.includes('etabl') || lower.includes('descr')) return 'contexte';
  return 'contexte';
}

function validateDirection(dir: BeatDirection, beatIds: Set<string>): BeatDirection {
  return {
    beatId: dir.beatId,
    imageDirection: dir.imageDirection || 'Editorial documentary scene, soft natural light',
    imageReuse: dir.imageReuse || undefined,
    overlay: VALID_OVERLAYS.has(dir.overlay) ? dir.overlay as (OverlayType | 'none') : 'none',
    overlayNotes: dir.overlayNotes,
    imageEffect: VALID_EFFECTS.has(dir.imageEffect) ? dir.imageEffect as ImageEffect : 'ken_burns_in',
    transitionOut: VALID_TRANSITIONS.has(dir.transitionOut) ? dir.transitionOut as BeatTransition : 'fade',
    emotion: normalizeEmotion(dir.emotion ?? (dir as any).narrativeRole),
  };
}

function buildFallback(beats: RawBeat[]): C7DirectionResult {
  return {
    visualIdentity: {
      colorTemperature: 'neutral',
      lightingRegister: 'soft_natural',
      photographicStyle: 'WSJ hedcut stipple illustration, black ink crosshatching on cream paper, selective color accents, editorial documentary',
      forbiddenElements: ['cartoon_style', 'neon', 'text_labels', 'abstract_concepts', 'bright_red', 'modern_flat_design'],
    },
    directions: beats.map(b => ({
      beatId: b.id,
      imageDirection: 'WSJ hedcut stipple illustration, institutional building in ink crosshatching on cream paper',
      overlay: b.overlayHint as (OverlayType | 'none'),
      imageEffect: 'ken_burns_in' as ImageEffect,
      transitionOut: (b.isSegmentEnd ? 'cross_dissolve' : 'fade') as BeatTransition,
      emotion: 'contexte' as BeatEmotion,
    })),
  };
}

const CHUNK_SIZE = 40;

async function callC7Chunk(
  beats: RawBeat[],
  direction: EpisodeDirection,
  assets: AssetSnapshot[],
  chunkLabel: string,
): Promise<C7DirectionResult> {
  const { system, user } = buildC7Prompt(beats, direction.moodMusic, direction.arc, assets);
  console.log(`    C7 chunk ${chunkLabel}: ${beats.length} beats → Sonnet...`);
  return generateStructuredJSON<C7DirectionResult>(system, user, { role: 'balanced', maxTokens: 16000 });
}

export async function runC7Direction(
  rawBeats: RawBeat[],
  direction: EpisodeDirection,
  assets: AssetSnapshot[],
  options: { lang: Language },
): Promise<C7DirectionResult> {
  const beatIds = new Set(rawBeats.map(b => b.id));

  try {
    console.log(`  C7 Direction Artistique: ${rawBeats.length} beats → Sonnet...`);

    let result: C7DirectionResult;

    if (rawBeats.length <= CHUNK_SIZE) {
      result = await callC7Chunk(rawBeats, direction, assets, '1/1');
    } else {
      const chunks: RawBeat[][] = [];
      for (let i = 0; i < rawBeats.length; i += CHUNK_SIZE) {
        chunks.push(rawBeats.slice(i, i + CHUNK_SIZE));
      }

      const firstResult = await callC7Chunk(chunks[0], direction, assets, `1/${chunks.length}`);
      const allDirections = [...(firstResult.directions ?? [])];

      for (let c = 1; c < chunks.length; c++) {
        const chunkResult = await callC7Chunk(chunks[c], direction, assets, `${c + 1}/${chunks.length}`);
        if (Array.isArray(chunkResult.directions)) {
          allDirections.push(...chunkResult.directions);
        }
      }

      result = {
        visualIdentity: firstResult.visualIdentity,
        directions: allDirections,
      };
    }

    if (!result.visualIdentity || !Array.isArray(result.directions)) {
      console.warn('  C7: invalid structure, using fallback');
      return buildFallback(rawBeats);
    }

    const validatedDirections = result.directions
      .filter(d => beatIds.has(d.beatId))
      .map(d => validateDirection(d, beatIds));

    const missingBeats = rawBeats.filter(b => !validatedDirections.find(d => d.beatId === b.id));
    for (const missing of missingBeats) {
      validatedDirections.push({
        beatId: missing.id,
        imageDirection: 'Documentary editorial scene, soft natural light',
        overlay: missing.overlayHint as (OverlayType | 'none'),
        imageEffect: 'ken_burns_in',
        transitionOut: missing.isSegmentEnd ? 'cross_dissolve' : 'fade',
        emotion: 'contexte',
      });
    }

    validatedDirections.sort((a, b) => {
      const aIdx = rawBeats.findIndex(rb => rb.id === a.beatId);
      const bIdx = rawBeats.findIndex(rb => rb.id === b.beatId);
      return aIdx - bIdx;
    });

    const identity = result.visualIdentity;
    if (!identity.colorTemperature) identity.colorTemperature = 'neutral';
    if (!identity.lightingRegister) identity.lightingRegister = 'soft_natural';
    if (!identity.photographicStyle) identity.photographicStyle = 'editorial documentary';
    if (!identity.forbiddenElements) identity.forbiddenElements = [];

    const reuseCount = validatedDirections.filter(d => d.imageReuse).length;
    const overlayCount = validatedDirections.filter(d => d.overlay !== 'none').length;
    const uniqueImages = validatedDirections.length - reuseCount;
    console.log(`  C7: ${validatedDirections.length} directions, ${overlayCount} overlays (${Math.round(overlayCount / validatedDirections.length * 100)}%), identity: ${identity.colorTemperature}/${identity.lightingRegister}`);
    console.log(`  Reuse: ${reuseCount} (C7) → ${uniqueImages} unique images`);

    return { visualIdentity: identity, directions: validatedDirections };
  } catch (err) {
    console.warn(`  C7 Direction failed: ${(err as Error).message.slice(0, 100)}`);
    console.warn('  Using mechanical fallback');
    return buildFallback(rawBeats);
  }
}
