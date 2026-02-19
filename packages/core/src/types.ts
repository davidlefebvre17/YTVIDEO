export interface Candle {
  t: number;
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type AspectMode = "landscape" | "portrait";

export type EpisodeType = "daily_recap" | "chart_analysis";
export type Language = "fr" | "en";

export type SectionType =
  | "intro"
  | "previously_on"
  | "market_overview"
  | "deep_dive"
  | "news"
  | "predictions"
  | "outro";

export interface VisualCue {
  type: "highlight_asset" | "show_chart" | "show_level" | "direction_arrow" | "flash" | "transition";
  asset?: string;
  value?: number;
  label?: string;
  direction?: "up" | "down";
  confidence?: "high" | "medium" | "low";
}

export interface ScriptSection {
  id: string;
  type: SectionType;
  title: string;
  narration: string;
  durationSec: number;
  visualCues: VisualCue[];
  data?: Record<string, unknown>;
}

export interface EpisodeScript {
  episodeNumber: number;
  date: string;
  type: EpisodeType;
  lang: Language;
  title: string;
  description: string;
  sections: ScriptSection[];
  totalDurationSec: number;
}

export interface AssetSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  candles: Candle[];
  high24h: number;
  low24h: number;
  // Enriched fields (populated by computeTechnicals)
  dailyCandles?: Candle[];
  technicals?: TechnicalIndicators;
}

export interface TechnicalIndicators {
  ema9: number;
  ema21: number;
  rsi14: number;
  trend: "bullish" | "bearish" | "neutral";
  volumeAnomaly: number; // ratio vs 20d average
  supports: number[];
  resistances: number[];
  high20d: number;
  low20d: number;
  isNear52wHigh: boolean;
  isNear52wLow: boolean;
  dramaScore: number;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
}

export interface EconomicEvent {
  name: string;
  date: string;
  time: string;
  currency: string;
  impact: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface Prediction {
  asset: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  targetLevel?: number;
  keyLevel?: number;
  reasoning: string;
}

export interface BondYields {
  us10y: number;
  us2y: number;
  spread10y2y: number;
}

export interface MarketSentiment {
  cryptoFearGreed: { value: number; label: string };
  btcDominance: number;
  trendingCoins?: Array<{ name: string; symbol: string; rank: number }>;
}

export interface TopMovers {
  gainers: Array<{ symbol: string; name: string; changePct: number; price: number }>;
  losers: Array<{ symbol: string; name: string; changePct: number; price: number }>;
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  hour: "bmo" | "amc" | "dmh";
}

export interface DailySnapshot {
  date: string;
  assets: AssetSnapshot[];
  news: NewsItem[];
  events: EconomicEvent[];
  yesterdayEvents?: EconomicEvent[];
  upcomingEvents?: EconomicEvent[];
  yields?: BondYields;
  sentiment?: MarketSentiment;
  topMovers?: TopMovers;
  earnings?: EarningsEvent[];
}

export interface EpisodeManifestEntry {
  episodeNumber: number;
  date: string;
  type: EpisodeType;
  lang: Language;
  title: string;
  filePath: string;
  predictions?: Prediction[];
}

export interface AudioSegment {
  sectionId: string;
  audioPath: string;
  durationSec: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

export interface AudioManifest {
  segments: AudioSegment[];
  totalDurationSec: number;
}
