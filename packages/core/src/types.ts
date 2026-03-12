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
  | "hook" | "title_card" | "thread"
  | "segment" | "closing"
  // legacy (backward compatibility)
  | "intro" | "market_overview" | "deep_dive" | "news" | "predictions" | "outro"
  | "synthesis" | "watchlist" | "recap_cta" | "previously_on" | "suivi";

export interface VisualCue {
  type: "highlight_asset" | "show_chart" | "show_level" | "direction_arrow" | "flash" | "transition"
    | "sector_heatmap" | "macro_stat" | "comparison";
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
  depth?: "flash" | "focus" | "deep";
  topic?: string;
  assets?: string[];
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
  threadSummary: string;
  segmentCount: number;
  coverageTopics: string[];
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
  ema9: number;   // SMA20
  ema21: number;  // SMA50
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

export interface EarningsEvent {
  symbol: string;
  name?: string;
  date: string;
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  hour: "bmo" | "amc" | "dmh";
  reported?: boolean;
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

export interface SectorCluster {
  sector: string;
  movers: Array<{ symbol: string; name: string; changePct: number }>;
  avgChangePct: number;
  direction: "up" | "down";
}

export interface ActiveCausalChain {
  id: string;
  name: string;
  confidence: number;       // 0-1
  confirmedSteps: string[];
  suggestedNarration: string;
  relatedAssets: string[];
}

export interface EventSurprise {
  eventName: string;
  actual: number;
  forecast: number;
  surprisePct: number;
  magnitude: "neutral" | "minor" | "notable" | "major";
  direction: "above" | "below" | "inline";
  relatedAssets: string[];
}

export interface Theme {
  id: string;
  label: { fr: string; en: string };
  editorialScore: number;
  buzzScore: number;
  assets: string[];          // symbols
  events: string[];          // event names
  newsItems: string[];       // article titles
  causalChain?: string[];    // active causal links
  sectorClusters?: SectorCluster[];
  breakdown: {
    amplitude: number;
    breadth: number;
    surprise: number;
    causalDepth: number;
    symbolic: number;
    newsFrequency: number;
    regimeCoherence: number;
  };
}

export interface ThemesDuJour {
  themes: Theme[];
  causalChains: ActiveCausalChain[];
  sectorClusters: SectorCluster[];
  eventSurprises: EventSurprise[];
  marketRegime: string;
}

export interface COTCategoryData {
  netPosition: number;
  long: number;
  short: number;
  pctOfOI: number;          // net as % of open interest
}

export interface COTContractData {
  reportDate: string;        // YYYY-MM-DD (Tuesday snapshot date)
  openInterest: number;
  assetManagers: COTCategoryData;   // TFF: Asset Managers / Disagg: Managed Money
  leveragedFunds: COTCategoryData;  // TFF: Leveraged Funds / Disagg: Swap Dealers
  dealers: COTCategoryData;         // TFF: Dealers / Disagg: Producers
  signals?: {
    netChangeSpeculators: number;   // week-over-week change in speculator net
    percentileRank: number;         // 0-100, current net vs 10-week range
    bias: "extreme_long" | "extreme_short" | "long" | "short" | "neutral";
    flipDetected: boolean;          // sign change in speculator net position
    weeksInDirection: number;       // consecutive weeks same direction
  };
}

export interface COTPositioning {
  reportDate: string;
  contracts: Array<{
    symbol: string;
    name: string;
    reportType: "tff" | "disaggregated";
    current: COTContractData;
    history: COTContractData[];      // previous weeks (oldest last)
  }>;
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
  earnings?: EarningsEvent[];
  earningsUpcoming?: EarningsEvent[];  // J+1 to J+21
  stockScreen?: StockScreenResult[];
  polymarket?: PolymarketMarket[];
  cotPositioning?: COTPositioning;
  themesDuJour?: ThemesDuJour;
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
