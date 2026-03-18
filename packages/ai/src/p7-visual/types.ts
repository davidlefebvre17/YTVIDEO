/**
 * C7 Visual Storyboard Types
 * A VisualSlot = one visual element in the video, covering a time window.
 */

export type VisualSource =
  | 'REMOTION_CHART'   // InkChart — generated from price data
  | 'REMOTION_TEXT'    // Text infographic (causal chain, scenario fork, definition, alert)
  | 'REMOTION_DATA'    // Data component (gauge, badge, heatmap, countdown, end card)
  | 'REMOTION_LOWER'   // Lower third overlay
  | 'MIDJOURNEY'       // AI-generated conceptual image
  | 'STOCK';           // Stock photo (Pexels/Unsplash)

export type RemotionChartType =
  | 'chart_principal'      // Full InkChart with levels
  | 'chart_comparaison'    // J-1 vs J0 side-by-side bars
  | 'chart_split'          // Split screen 2 assets
  | 'chart_correlation'    // 2 curves overlay (correlation/divergence)
  | 'chart_spark'          // Minimal 5-day sparkline
  | 'chart_indicateur'     // RSI/MACD panel
  | 'yield_curve';         // 2Y/10Y yield curve

export type RemotionTextType =
  | 'infographie_chaine'       // Animated causal chain (CausalChain component)
  | 'infographie_definition'   // Term definition (2 lines, dark bg)
  | 'infographie_schema'       // Technical schema (Bollinger, etc.)
  | 'infographie_scenario'     // Bull/bear fork (ScenarioFork component)
  | 'infographie_alerte'       // Alert banner (flashing)
  | 'infographie_paradoxe'     // Paradox/contradiction callout
  | 'transition_segment';      // Segment transition text

export type RemotionDataType =
  | 'chiffre_geant_animé'  // AnimatedStat — large count-up number
  | 'gauge_animee'         // RSI or Fear&Greed gauge (AnimatedStat)
  | 'multi_badge'          // MultiAssetBadge — 4 assets grid
  | 'donnee_animee'        // Single animated number/bar
  | 'callout_mover'        // Large mover highlight (+13.21%)
  | 'carte_annotee'        // Annotated map/diagram
  | 'heatmap_sectorielle'  // HeatmapGrid — 11 sectors
  | 'countdown_event'      // Countdown to economic event
  | 'calendrier_eco'       // Economic calendar
  | 'lower_third_recap'    // Recap lower third (LowerThirdRecap)
  | 'recap_point'          // Animated recap bullet
  | 'teaser_demain'        // Tomorrow teaser with countdown
  | 'end_card';            // YouTube end card

export type VisualComponentType = RemotionChartType | RemotionTextType | RemotionDataType | 'image_conceptuelle' | 'photo_actualite';

export interface VisualSlot {
  /** Sequential slot number (1-based) */
  slot: number;
  /** Start time in seconds */
  tStart: number;
  /** End time in seconds */
  tEnd: number;
  /** Parent segment ID */
  segId: string;
  /** Visual source — determines rendering pipeline */
  source: VisualSource;
  /** Specific component type within the source */
  type: VisualComponentType;
  /** Human-readable description of what to show */
  desc: string;
  /** Primary asset ticker (if applicable) */
  asset?: string;
  /** Chart instruction data (for REMOTION_CHART slots) */
  chartInstructionRef?: string; // reference to chartTimings entry
  /** Midjourney/Flux prompt (for MIDJOURNEY slots) */
  prompt?: string;
  /** Stock photo search keywords (for STOCK slots) */
  stockKeywords?: string;
}

export interface VisualStoryboard {
  date: string;
  episodeTitle: string;
  moodMusic: string;
  totalSlots: number;
  totalDurationSec: number;
  slots: VisualSlot[];
  summary: {
    remotionChart: number;
    remotionText: number;
    remotionData: number;
    remotionLower: number;
    midjourney: number;
    stock: number;
  };
  midjourneyPrompts: Array<{
    segId: string;
    type: string;
    prompt: string;
    variant?: string;
  }>;
  stockPhotoNeeds: Array<{
    segId: string;
    keywords: string;
    subject: string;
  }>;
}
