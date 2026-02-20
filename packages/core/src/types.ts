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

export interface MultiTimeframeAnalysis {
  weekly10y: {
    trend: "bull" | "bear" | "range";
    distanceFromATH: number;    // % from ATH (negative = below, e.g. -5.2)
    distanceFromATL: number;    // % above ATL (positive, e.g. +340)
    majorSupport: number;
    majorResistance: number;
    ema52w: number;
  };
  daily3y: {
    trend: "bull" | "bear" | "range";
    sma200: number;
    sma50: number;
    rsi14: number;
    aboveSma200: boolean;
    goldenCross: boolean;       // SMA50 > SMA200
  };
  daily1y: {
    trend: "bull" | "bear" | "range";
    high52w: number;
    low52w: number;
    volatility20d: number;      // annualized %
    volumeVsAvg: number;        // ratio vs 20d avg
    recentBreakout: boolean;    // price within 1% of 52w high
  };
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
  // Multi-timeframe analysis (weekly 10y + daily 3y)
  multiTF?: MultiTimeframeAnalysis;
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
  category?: string;
  lang?: "fr" | "en";
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

export interface EarningsQuarter {
  period: string;             // "2025-09-30"
  quarter: number;            // 1-4
  year: number;
  epsActual?: number;
  epsEstimate?: number;
  surprisePct?: number;       // % beat (+) or miss (-)
}

export interface EarningsDetail {
  lastFourQuarters: EarningsQuarter[];  // most recent first
  currentQtrEpsEstimate?: number;       // from EarningsEvent already fetched
  publishingToday: boolean;
}

export interface StockScreenResult {
  symbol: string;
  name: string;
  index: string;              // "SP500" | "CAC40" | "DAX40" | "FTSE100" | "NIKKEI50" | "HSI30"
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  high52w: number;
  low52w: number;
  reason: string[];           // ["mover_up", "volume_spike", "52w_high"]
  technicals?: TechnicalIndicators;
  earningsDetail?: EarningsDetail;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  category: string;
  endDate: string;
  probabilities: Record<string, number>;  // { "Yes": 68, "No": 32 } — values in %
  volume24h: number;
  liquidity: number;
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
  stockScreen?: StockScreenResult[];
  polymarket?: PolymarketMarket[];
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
