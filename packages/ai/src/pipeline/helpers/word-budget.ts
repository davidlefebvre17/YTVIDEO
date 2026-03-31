import type { EditorialPlan, WordBudget, SegmentDepth } from "../types";

const WORDS_PER_SEC = 170 / 60; // ~2.83 words/sec (calibrated on Fish Audio 0.90-0.95 speed)

const DEPTH_WORDS: Record<SegmentDepth, { min: number; target: number; max: number }> = {
  DEEP:  { min: 200, target: 260, max: 320 },
  FOCUS: { min: 100, target: 140, max: 180 },
  FLASH: { min: 45,  target: 65,  max: 85 },
  PANORAMA: { min: 120, target: 160, max: 200 },
};

export function computeWordBudget(plan: EditorialPlan): WordBudget {
  const segments = plan.segments.map(seg => ({
    segmentId: seg.id,
    depth: seg.depth,
    targetWords: DEPTH_WORDS[seg.depth].target,
    maxWords: DEPTH_WORDS[seg.depth].max,
  }));

  const segTotal = segments.reduce((sum, s) => sum + s.targetWords, 0);

  return {
    hook: 25,
    titleCard: 0 as const,
    thread: 60,
    segments,
    closing: 70,
    totalTarget: 25 + 0 + 50 + segTotal + 60,
  };
}

export function durationFromWords(words: number): number {
  return Math.round(words / WORDS_PER_SEC);
}
