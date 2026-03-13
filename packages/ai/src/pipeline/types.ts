import type {
  AssetSnapshot, DailySnapshot, EpisodeScript, ScriptSection, VisualCue, Prediction,
  ThemesDuJour, BondYields, MarketSentiment, EconomicEvent, StockScreenResult, NewsItem,
  Language,
} from "@yt-maker/core";
import type { NewsMemoryDB } from "../memory";

// ── P1 Flagging ─────────────────────────────────────────

export type MaterialityFlag =
  | 'PRICE_MOVE'
  | 'EXTREME_MOVE'
  | 'VOLUME_SPIKE'
  | 'EMA_BREAK'
  | 'RSI_EXTREME'
  | 'EARNINGS_SURPRISE'
  | 'SENTIMENT_EXTREME'
  | 'NEWS_LINKED'
  | 'ZONE_EVENT'
  | 'ATH_PROXIMITY'
  | 'SMA200_CROSS';

export interface FlaggedAsset {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  materialityScore: number;
  flags: MaterialityFlag[];
  snapshot: AssetSnapshot;
}

export interface SnapshotFlagged {
  date: string;
  assets: FlaggedAsset[];
  events: EconomicEvent[];
  yields?: BondYields;
  sentiment?: MarketSentiment;
  earnings: StockScreenResult[];
  themesDuJour?: ThemesDuJour;
  screenResults: StockScreenResult[];
  news: NewsItem[];
}

// ── P2 C1 Editorial ─────────────────────────────────────

export type SegmentDepth = 'DEEP' | 'FOCUS' | 'FLASH';

export interface PlannedSegment {
  id: string;
  topic: string;
  depth: SegmentDepth;
  assets: string[];
  angle: string;
  justification: string;
  continuityFromJ1?: string;
  /** Political/economic trigger that caused this movement (if applicable) */
  trigger?: {
    actor: string;
    action: string;
    source: string;
  };
  /** Narrative role in the episode arc */
  narrativeRole?: 'opener' | 'bridge' | 'inverse' | 'closer' | 'standard';
}

export interface EditorialPlan {
  date: string;
  dominantTheme: string;
  threadSummary: string;
  moodMarche: 'risk-on' | 'risk-off' | 'incertain' | 'rotation';
  coldOpenFact: string;
  closingTeaser: string;
  segments: PlannedSegment[];
  skippedAssets: Array<{
    symbol: string;
    reason: string;
  }>;
  deepCount: number;
  flashCount: number;
  totalSegments: number;
}

// ── P3 C2 Analysis ──────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'speculative';

export interface ChartInstruction {
  type: 'support_line' | 'resistance_line' | 'annotation' | 'zone_highlight'
       | 'trend_line' | 'indicator_overlay' | 'price_label';
  asset: string;
  value?: number;
  label?: string;
  timeframe?: string;
  detail?: string;
}

export interface SegmentAnalysis {
  segmentId: string;
  keyFacts: string[];
  technicalReading: string;
  fundamentalContext: string;
  causalChain?: string;
  scenarios: {
    bullish: { target: string; condition: string };
    bearish: { target: string; condition: string };
  };
  narrativeHook: string;
  chartInstructions: ChartInstruction[];
  visualSuggestions: string[];
  risk: string;
  confidenceLevel: ConfidenceLevel;
  /** Data sources the analysis is based on (for traceability) */
  sourcesUsed?: Array<{
    type: 'snapshot_price' | 'news_article' | 'knowledge_base' | 'market_memory' | 'causal_brief' | 'inference';
    detail: string;
  }>;
}

export interface GlobalContext {
  marketMood: string;
  dominantTheme: string;
  crossSegmentLinks: string[];
  keyRisks: string[];
}

export interface AnalysisBundle {
  segments: SegmentAnalysis[];
  globalContext: GlobalContext;
}

// ── P4 C3 Writing ───────────────────────────────────────

export interface NarrationSegment {
  segmentId: string;
  type: 'segment';
  title: string;
  narration: string;
  depth: SegmentDepth;
  topic: string;
  assets: string[];
  visualCues: VisualCue[];
  predictions?: Prediction[];
  transitionTo?: string;
  durationSec: number;
  wordCount: number;
}

export interface NarrationBlock {
  type: 'hook' | 'title_card' | 'thread' | 'closing';
  title: string;
  narration: string;
  durationSec: number;
  wordCount: number;
  visualCues?: VisualCue[];
}

export interface DraftScript {
  date: string;
  title: string;
  description: string;
  coldOpen: NarrationBlock;
  titleCard: NarrationBlock;
  thread: NarrationBlock;
  segments: NarrationSegment[];
  closing: NarrationBlock;
  metadata: {
    totalWordCount: number;
    totalDurationSec: number;
    toneProfile: string;
    dominantTheme: string;
    threadSummary: string;
    moodMarche: string;
    coverageTopics: string[];
    segmentCount: number;
  };
}

// ── P5 C4 Validation ────────────────────────────────────

export interface ValidationIssue {
  type: 'compliance' | 'factual' | 'length' | 'tone' | 'structure' | 'repetition';
  segmentId?: string;
  description: string;
  severity: 'blocker' | 'warning';
  suggestedFix?: string;
  source: 'code' | 'haiku';
}

export interface ValidationResult {
  status: 'pass' | 'needs_revision';
  issues: ValidationIssue[];
  validatedScript: DraftScript;
}

// ── P6 C5 Direction ─────────────────────────────────────

export type MoodTag =
  | 'tension_geopolitique'
  | 'risk_off_calme'
  | 'bullish_momentum'
  | 'neutre_analytique'
  | 'incertitude';

export type TransitionType = 'cut' | 'fade' | 'wipe' | 'zoom_out' | 'slide';

export interface ArcBeat {
  segmentId: string;
  tensionLevel: number;
  role: 'hook' | 'montee' | 'pic' | 'respiration' | 'rebond' | 'resolution' | 'closing';
}

export interface Transition {
  fromSegmentId: string;
  toSegmentId: string;
  type: TransitionType;
  durationMs: number;
  soundEffect?: 'silence' | 'sting' | 'swoosh' | 'none';
  vocalShift?: string;
}

export interface ChartTiming {
  chartInstruction: ChartInstruction;
  showAtSec: number;
  hideAtSec: number;
}

export interface ThumbnailMoment {
  segmentId: string;
  reason: string;
  keyFigure?: string;
  emotionalTone: string;
}

export interface DirectedEpisode {
  script: DraftScript;
  arc: ArcBeat[];
  transitions: Transition[];
  thumbnailMoment: ThumbnailMoment;
  moodMusic: MoodTag;
  chartTimings: ChartTiming[];
  totalEstimatedDuration: number;
}

// ── Helpers ─────────────────────────────────────────────

export interface EpisodeSummary {
  date: string;
  label: string;
  segmentTopics: string[];
  predictions: Array<{
    asset: string;
    claim: string;
    resolved: boolean;
    outcome?: 'correct' | 'incorrect' | 'pending';
  }>;
  /** Events/earnings announced as upcoming in this episode — to be followed up in future episodes */
  forwardLooking: string[];
  angles: string[];
  dominantTheme: string;
  moodMarche: string;
}

export interface WordBudget {
  hook: number;
  titleCard: 0;
  thread: number;
  segments: Array<{
    segmentId: string;
    depth: SegmentDepth;
    targetWords: number;
    maxWords: number;
  }>;
  closing: number;
  totalTarget: number;
}

export interface CausalBrief {
  chains: Array<{
    name: string;
    confidence: number;
    steps: string[];
    relatedAssets: string[];
  }>;
  intermarketSignals: Array<{
    signal: string;
    implication: string;
  }>;
}

// ── Pipeline orchestrator ───────────────────────────────

export type PipelineStage = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';

export interface PipelineOptions {
  snapshot: DailySnapshot;
  lang: Language;
  episodeNumber: number;
  newsDb?: NewsMemoryDB;
  prevContext?: PrevContext;
  startFrom?: PipelineStage;
  stopAt?: PipelineStage;
  dryRun?: boolean;
}

export interface PipelineResult {
  directedEpisode: DirectedEpisode;
  intermediates: {
    flagged: SnapshotFlagged;
    editorial: EditorialPlan;
    analysis: AnalysisBundle;
    draft: DraftScript;
    validation: ValidationResult;
  };
  stats: PipelineStats;
}

export interface PipelineStats {
  totalDurationMs: number;
  llmCalls: number;
  retries: number;
  cost: number;
}

// Re-export PrevEntry from script-generator for compatibility
export interface PrevEntry {
  snapshot: DailySnapshot;
  script?: EpisodeScript;
}

export interface PrevContext {
  entries: PrevEntry[];
}
