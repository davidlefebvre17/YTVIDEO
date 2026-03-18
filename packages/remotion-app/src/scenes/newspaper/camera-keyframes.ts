/**
 * Camera keyframes for the newspaper composition — 1920×1080 canvas.
 * Camera zooms in/out on each article with per-keyframe easing.
 */

export type CameraEasing = "smooth" | "snap" | "dramatic" | "linear";

export interface CameraKeyframe {
  /** Time in seconds */
  t: number;
  /** Center X on the canvas */
  cx: number;
  /** Center Y on the canvas */
  cy: number;
  /** Zoom level (1.0 = full page visible, 3.0 = zoomed into one column) */
  zoom: number;
  /** Debug label */
  label: string;
  /** Easing curve TO this keyframe (default: 'smooth') */
  easing?: CameraEasing;
}

/**
 * Zoom-based keyframes for 1920×1080 canvas.
 * zoom 1.0 = full page, zoom ~3.0 = one column readable.
 *
 * Easing types:
 *   smooth   — gentle in/out (default, for slow pans)
 *   snap     — fast arrival, soft landing (zoom-in on article)
 *   dramatic — slow start, whip fast, soft end (pull-backs, transitions)
 *   linear   — constant speed (slow drifts within a segment)
 */
export const NEWSPAPER_KEYFRAMES: CameraKeyframe[] = [
  // ── Opening: full page → masthead → headline → thread ──
  { t: 0,   cx: 960,  cy: 540,  zoom: 1.0,  label: "full page" },
  { t: 3,   cx: 960,  cy: 35,   zoom: 3.0,  label: "masthead",   easing: "snap" },
  { t: 6,   cx: 960,  cy: 90,   zoom: 2.8,  label: "headline",   easing: "smooth" },
  { t: 10,  cx: 960,  cy: 145,  zoom: 3.0,  label: "thread",     easing: "smooth" },

  // ── Pull back to see all columns ──
  { t: 28,  cx: 960,  cy: 540,  zoom: 1.0,  label: "pull back colonnes", easing: "dramatic" },

  // ── seg_1 DEEP (col A, x=250) ──
  { t: 32,  cx: 250,  cy: 260,  zoom: 3.2,  label: "seg_1 titre",  easing: "snap" },
  { t: 45,  cx: 250,  cy: 420,  zoom: 3.5,  label: "seg_1 chart",  easing: "smooth" },
  { t: 100, cx: 250,  cy: 650,  zoom: 3.0,  label: "seg_1 body",   easing: "linear" },
  { t: 155, cx: 250,  cy: 500,  zoom: 2.2,  label: "seg_1 fin",    easing: "smooth" },

  // ── Transition ──
  { t: 160, cx: 600,  cy: 540,  zoom: 1.3,  label: "transition focus", easing: "dramatic" },

  // ── seg_2 FOCUS (col B, x=652) ──
  { t: 162, cx: 652,  cy: 260,  zoom: 3.2,  label: "seg_2 titre",  easing: "snap" },
  { t: 180, cx: 652,  cy: 420,  zoom: 3.5,  label: "seg_2 chart",  easing: "smooth" },
  { t: 220, cx: 652,  cy: 500,  zoom: 2.5,  label: "seg_2 fin",    easing: "smooth" },

  // ── seg_3 FOCUS (col C top, x=1024) ──
  { t: 222, cx: 1024, cy: 240,  zoom: 3.2,  label: "seg_3 titre",  easing: "snap" },
  { t: 240, cx: 1024, cy: 340,  zoom: 3.5,  label: "seg_3 chart",  easing: "smooth" },
  { t: 275, cx: 1024, cy: 350,  zoom: 2.8,  label: "seg_3 fin",    easing: "smooth" },

  // ── Pull back ──
  { t: 276, cx: 960,  cy: 540,  zoom: 1.0,  label: "pull back flash", easing: "dramatic" },

  // ── seg_4 FLASH (col C bottom, x=1024) ──
  { t: 278, cx: 1024, cy: 750,  zoom: 3.5,  label: "seg_4",        easing: "snap" },
  { t: 305, cx: 1024, cy: 780,  zoom: 3.0,  label: "seg_4 fin",    easing: "linear" },

  // ── seg_5 FLASH (col D top, x=1386) ──
  { t: 307, cx: 1386, cy: 280,  zoom: 3.5,  label: "seg_5",        easing: "snap" },
  { t: 335, cx: 1386, cy: 340,  zoom: 3.0,  label: "seg_5 fin",    easing: "linear" },

  // ── seg_6 FLASH (col D bottom, x=1386) ──
  { t: 337, cx: 1386, cy: 750,  zoom: 3.5,  label: "seg_6",        easing: "snap" },
  { t: 365, cx: 1386, cy: 780,  zoom: 3.0,  label: "seg_6 fin",    easing: "linear" },

  // ── Closing (col E, x=1724) ──
  { t: 367, cx: 960,  cy: 540,  zoom: 1.0,  label: "pull back",    easing: "dramatic" },
  { t: 372, cx: 1724, cy: 400,  zoom: 3.0,  label: "closing",      easing: "snap" },
  { t: 390, cx: 1724, cy: 650,  zoom: 2.5,  label: "end card",     easing: "smooth" },
  { t: 395, cx: 960,  cy: 540,  zoom: 1.0,  label: "full page final", easing: "dramatic" },
];

/**
 * Build a focusFrames map from keyframes (maps segId → first frame that focuses on it).
 */
export function buildFocusFrames(keyframes: CameraKeyframe[], fps: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (const kf of keyframes) {
    const match = kf.label.match(/^(seg_\d+)/);
    if (match && !map[match[1]]) {
      map[match[1]] = Math.round(kf.t * fps);
    }
  }
  const threadKf = keyframes.find((k) => k.label === "thread");
  if (threadKf) map["thread"] = Math.round(threadKf.t * fps);
  const closingKf = keyframes.find((k) => k.label === "closing");
  if (closingKf) map["closing"] = Math.round(closingKf.t * fps);
  return map;
}
