import type { Language } from "@yt-maker/core";

export function getChartAnalysisSystemPrompt(lang: Language): string {
  // Phase 2: chart-focused episode prompt
  return getDailyRecapSystemPromptFallback(lang);
}

function getDailyRecapSystemPromptFallback(lang: Language): string {
  return `You are a trading chart analyst. Output a JSON EpisodeScript. Lang: ${lang}. (Placeholder - Phase 2)`;
}
