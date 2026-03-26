export { getLLMClient, generateStructuredJSON } from "./llm-client";
export type { LLMRole, LLMOptions } from "./llm-client";
export { generateScript, formatSnapshotForPrompt } from "./script-generator";
export type { PrevContext, PrevEntry } from "./script-generator";
export { getDailyRecapSystemPrompt } from "./prompts/daily-recap";
export { loadKnowledge } from "./knowledge-loader";
export { readManifest, getNextEpisodeNumber, getRecentEpisodes, appendToManifest, loadEpisodeData } from "./episode-history";
export { buildThemesDuJour, computeAssetSignal, detectMarketRegime, scoreTheme } from "./editorial-score";
export { clusterNews, buildThemesFromClusters } from "./news-clusterer";
export type { ClusteredResult } from "./news-clusterer";
export { detectCausalChains } from "./causal-chain-detector";
export { detectSectorClusters, matchMoversToNews } from "./mover-explainer";
export type { MoverExplanation } from "./mover-explainer";
export { analyzeEventSurprises, matchEventsToReaction } from "./event-analyzer";
export type { EventReaction } from "./event-analyzer";
export { getCompanyProfile, getCompaniesForAsset, getProfileContext, isCorrelatedTo, getAllProfiles } from "./company-profiles";
export type { CompanyProfile } from "./company-profiles";
export { getMarketMemoryHaikuPrompt } from "./prompts/market-memory-haiku";
export { getWeeklySonnetPrompt } from "./prompts/market-memory-sonnet-weekly";
export type { SonnetWeeklyOutput } from "./prompts/market-memory-sonnet-weekly";
export { runWeeklyJob } from "./market-memory-weekly-job";
export type { WeeklyJobResult } from "./market-memory-weekly-job";

// Pipeline C1→C5 (Bloc C)
export { runPipeline, toEpisodeScript, flagAssets, runC1Editorial, runC2Analysis, runC3Writing, runValidation, runC5Direction } from "./pipeline";
export { computeWordBudget, buildEpisodeSummaries, formatRecentScriptsForC3, buildCausalBrief, buildBriefingPack, formatBriefingPack } from "./pipeline";
export type { BriefingPack, PoliticalTrigger, ScreenMover, EarningsBucket, COTHighlight, COTDivergence, SentimentTrend } from "./pipeline";
export type {
  PipelineOptions, PipelineResult, PipelineStats,
  EditorialPlan, AnalysisBundle, DraftScript, DirectedEpisode,
  ValidationResult, SnapshotFlagged, FlaggedAsset, WordBudget, CausalBrief,
  SegmentDepth, ConfidenceLevel, MoodTag, RawBeat,
} from "./pipeline";

// Pipeline P7 — Beat visual pipeline
export { generateBeats, chunkNarration, computeOverlayDelay } from "./pipeline";
export { annotateBeats } from "./pipeline";
export type { BeatAnnotation } from "./pipeline";
export { runC7Direction } from "./pipeline";
export { runC8ImagePrompts, buildStyleSuffix } from "./pipeline";
export { runImageGeneration } from "./pipeline";
export { adaptForTTS } from "./pipeline";
export type { TTSBeat } from "./pipeline";

// Episode folder management
export { episodeDir, createEpisodeDir, saveToEpisode, saveToEpisodeIntermediate, syncImagesToPublic, syncAudioToPublic, saveRemotionProps, saveEpisodeData } from "./pipeline";

// News Memory (D2)
export {
  NewsMemoryDB,
  initTagger,
  tagArticleAuto,
  normalizeText,
  buildResearchContext,
} from "./memory";
export type {
  MacroTheme,
  NewsTags,
  StoredArticle,
  EconomicEvent,
} from "./memory";

// TTS Audio (P7)
export {
  generateSegmentAudio,
  generateEpisodeAudio,
  generateBeatAudio,
  checkEdgeTTS,
  VOICES,
} from "./p7-audio";
export type {
  TTSSegment,
  TTSResult,
  AudioManifest,
  BeatAudioManifest,
} from "./p7-audio";

// Visual Storyboard (P7 C7)
export {
  runC7Storyboard,
} from "./p7-visual";
export type {
  VisualStoryboard,
  VisualSlot,
  VisualSource,
  VisualComponentType,
} from "./p7-visual";

// ComfyUI Cloud (image generation)
export { ComfyUIClient } from "./comfyui";
