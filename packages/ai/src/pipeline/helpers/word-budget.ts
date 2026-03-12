import type { EditorialPlan, WordBudget, SegmentDepth } from "../types";

const WORDS_PER_SEC = 150 / 60; // 2.5 words/sec

const DEPTH_WORDS: Record<SegmentDepth, { min: number; target: number; max: number }> = {
  DEEP:  { min: 175, target: 200, max: 225 },
  FOCUS: { min: 100, target: 130, max: 150 },
  FLASH: { min: 50,  target: 62,  max: 75 },
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
    thread: 50,
    segments,
    closing: 60,
    totalTarget: 25 + 0 + 50 + segTotal + 60,
  };
}

export function durationFromWords(words: number): number {
  return Math.round(words / WORDS_PER_SEC);
}
