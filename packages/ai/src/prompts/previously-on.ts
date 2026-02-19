import type { Language, Prediction } from "@yt-maker/core";

export function getPreviouslyOnPrompt(
  lang: Language,
  predictions: Prediction[],
  results: Array<{ prediction: Prediction; outcome: "correct" | "incorrect" | "pending" }>,
): string {
  // Phase 4: generates narration for "previously on" section
  return `Evaluate these predictions and generate narration. Lang: ${lang}. (Placeholder - Phase 4)`;
}
