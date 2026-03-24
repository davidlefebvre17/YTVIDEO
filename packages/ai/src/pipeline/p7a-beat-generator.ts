import type {
  EpisodeScript, DailySnapshot, OverlayType,
} from "@yt-maker/core";
import type { RawBeat, AnalysisBundle } from "./types";
import { annotateBeats, type BeatAnnotation } from "./p7a5-beat-annotator";

const WORDS_PER_SEC = 2.5;
const MIN_BEAT_SEC = 6;
const MAX_BEAT_SEC = 12;
const MIN_BEAT_WORDS = Math.floor(MIN_BEAT_SEC * WORDS_PER_SEC);

// ── Sentence boundaries for French narration ────────────────

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+|(?<=\s—\s)|(?<=[;])\s+/;

interface NarrationChunk {
  text: string;
  wordCount: number;
  durationSec: number;
}

export function chunkNarration(narration: string): NarrationChunk[] {
  const trimmed = narration.trim();
  if (!trimmed) return [];

  const rawSentences = trimmed.split(SENTENCE_SPLIT_RE).filter(s => s.trim().length > 0);
  if (rawSentences.length === 0) return [];

  const chunks: NarrationChunk[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const combined = buffer ? `${buffer} ${sentence}` : sentence;
    const wordCount = combined.split(/\s+/).length;
    const duration = wordCount / WORDS_PER_SEC;

    if (duration > MAX_BEAT_SEC && buffer) {
      const bufWords = buffer.split(/\s+/).length;
      chunks.push({ text: buffer.trim(), wordCount: bufWords, durationSec: round(bufWords / WORDS_PER_SEC) });
      buffer = sentence;
    } else if (duration > MAX_BEAT_SEC) {
      chunks.push({ text: sentence.trim(), wordCount, durationSec: round(duration) });
      buffer = '';
    } else if (duration >= MIN_BEAT_SEC) {
      chunks.push({ text: combined.trim(), wordCount, durationSec: round(duration) });
      buffer = '';
    } else {
      buffer = combined;
    }
  }

  if (buffer.trim()) {
    const wordCount = buffer.split(/\s+/).length;
    if (chunks.length > 0 && wordCount < MIN_BEAT_WORDS) {
      const last = chunks[chunks.length - 1];
      last.text = `${last.text} ${buffer.trim()}`;
      last.wordCount = last.text.split(/\s+/).length;
      last.durationSec = round(last.wordCount / WORDS_PER_SEC);
    } else {
      chunks.push({ text: buffer.trim(), wordCount, durationSec: round(wordCount / WORDS_PER_SEC) });
    }
  }

  return chunks;
}

// ── Overlay delay from trigger word ─────────────────────────

export function computeOverlayDelay(
  chunk: string,
  triggerWord: string | null | undefined,
  beatDurationMs: number,
): { delayMs: number; triggerWord?: string } {
  if (!triggerWord || !chunk) return { delayMs: 0 };
  const words = chunk.split(/\s+/);
  const idx = words.findIndex(w => w.toLowerCase().includes(triggerWord.toLowerCase()));
  if (idx < 0) return { delayMs: 0, triggerWord };
  const position = idx / Math.max(words.length, 1);
  return {
    delayMs: Math.round(position * beatDurationMs * 0.8),
    triggerWord,
  };
}

// ── Main orchestrator ───────────────────────────────────────

export async function generateBeats(
  script: EpisodeScript,
  snapshot: DailySnapshot,
  analysis?: AnalysisBundle,
): Promise<RawBeat[]> {
  // Step 1: Mechanical chunking
  const beats: RawBeat[] = [];
  let cumSec = 0;
  let beatIndex = 0;

  for (const section of script.sections) {
    const chunks = chunkNarration(section.narration);
    if (chunks.length === 0 && section.durationSec > 0) {
      chunks.push({ text: '', wordCount: 0, durationSec: section.durationSec });
    }

    const segmentAssets = section.assets ?? [];
    const segmentDepth = (section.depth ?? 'focus') as 'flash' | 'focus' | 'deep';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `beat_${String(++beatIndex).padStart(3, '0')}`;

      beats.push({
        id,
        segmentId: section.id,
        startSec: round(cumSec),
        durationSec: chunk.durationSec,
        narrationChunk: chunk.text,
        overlayHint: 'none',
        overlayData: undefined,
        segmentDepth,
        segmentTopic: section.topic,
        assets: segmentAssets,
        isSegmentStart: i === 0,
        isSegmentEnd: i === chunks.length - 1,
      });

      cumSec += chunk.durationSec;
    }
  }

  // Step 2: LLM annotation (replaces all regex classification + data resolution)
  if (analysis) {
    console.log(`  P7a.5: Annotating ${beats.length} beats via Haiku...`);
    const annotations = await annotateBeats(beats, snapshot, analysis);
    mergeAnnotations(beats, annotations);

    const overlayCount = beats.filter(b => b.overlayHint !== 'none').length;
    console.log(`  P7a.5: ${overlayCount} overlays (${Math.round(overlayCount / beats.length * 100)}%), ${annotations.filter(a => a.isKeyMoment).length} key moments`);
  }

  // Step 3: Safety cap
  capOverlayRatio(beats, 0.55);

  return beats;
}

// ── Merge annotations into beats ────────────────────────────

function mergeAnnotations(beats: RawBeat[], annotations: BeatAnnotation[]): void {
  const annMap = new Map(annotations.map(a => [a.beatId, a]));

  for (const beat of beats) {
    const ann = annMap.get(beat.id);
    if (!ann) continue;

    beat.overlayHint = ann.overlayType;
    beat.overlayData = ann.overlaySpec ?? undefined;

    // Store annotation fields in beat for downstream use (C7, Remotion)
    (beat as any).emotion = ann.emotion;
    (beat as any).visualScale = ann.visualScale;
    (beat as any).beatPacing = ann.beatPacing;
    (beat as any).overlayAnimation = ann.overlayAnimation;
    (beat as any).isKeyMoment = ann.isKeyMoment;
    (beat as any).triggerWord = ann.triggerWord;
    (beat as any).primaryAsset = ann.primaryAsset;
  }
}

// ── Overlay cap ─────────────────────────────────────────────

const OVERLAY_PRIORITY: Record<string, number> = {
  chart: 5, chart_zone: 5, scenario_fork: 4, causal_chain: 3,
  comparison: 3, stat: 2, gauge: 2, heatmap: 2, headline: 1, text_card: 1, ticker_strip: 1,
};

function capOverlayRatio(beats: RawBeat[], maxRatio: number): void {
  const overlayBeats = beats.filter(b => b.overlayHint !== 'none');
  const target = Math.floor(beats.length * maxRatio);
  if (overlayBeats.length <= target) return;

  const sorted = [...overlayBeats].sort((a, b) =>
    (OVERLAY_PRIORITY[a.overlayHint] ?? 0) - (OVERLAY_PRIORITY[b.overlayHint] ?? 0)
  );
  const toRemove = sorted.slice(0, overlayBeats.length - target);
  for (const beat of toRemove) {
    beat.overlayHint = 'none';
    beat.overlayData = undefined;
  }
}

// ── Utility ─────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
