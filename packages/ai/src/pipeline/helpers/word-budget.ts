import type { EditorialPlan, WordBudget, SegmentDepth } from "../types";

const WORDS_PER_SEC = 170 / 60; // ~2.83 words/sec (calibrated on Fish Audio 0.90-0.95 speed)

const DEPTH_WORDS: Record<SegmentDepth, { min: number; target: number; max: number }> = {
  DEEP:  { min: 300, target: 400, max: 450 },   // Aligné sur C3 système (règle "1 concept + réel physique" demande plus d'air)
  FOCUS: { min: 120, target: 170, max: 200 },   // Aligné sur C3 système (max 200)
  FLASH: { min: 50,  target: 65,  max: 75 },    // Aligné sur C3 système (max 75)
  PANORAMA: { min: 200, target: 250, max: 320 },
};

export function computeWordBudget(plan: EditorialPlan): WordBudget {
  const segments = plan.segments.map(seg => ({
    segmentId: seg.id,
    depth: seg.depth,
    targetWords: DEPTH_WORDS[seg.depth].target,
    maxWords: DEPTH_WORDS[seg.depth].max,
  }));

  const segTotal = segments.reduce((sum, s) => sum + s.targetWords, 0);

  const hook = 20;      // Cold open max (C3 dit max 20 mots)
  const thread = 40;    // Thread (C3 dit ~40 mots)
  const closing = 70;   // Closing (C3 dit ~70 mots)

  return {
    hook,
    titleCard: 0 as const,
    thread,
    segments,
    closing,
    totalTarget: hook + 0 + thread + segTotal + closing,
  };
}

export function durationFromWords(words: number): number {
  return Math.round(words / WORDS_PER_SEC);
}
