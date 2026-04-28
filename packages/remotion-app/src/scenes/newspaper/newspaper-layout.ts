/**
 * Newspaper layout — classic front page, 1920×1080.
 * Canvas = viewport = video size. Camera zooms in/out on articles.
 *
 * 5 columns, dense NYT-style:
 *   Col A (420px): seg_1 DEEP — full height
 *   Col B (360px): seg_2 FOCUS — full height
 *   Col C (360px): seg_3 FOCUS (top) + seg_4 FLASH (bottom)
 *   Col D (340px): seg_5 FLASH (top) + seg_6 FLASH (bottom)
 *   Col E (312px): Closing + end card
 */

export const NP = {
  canvas: { w: 1920, h: 1080 },
  viewport: { w: 1920, h: 1080 },

  margin: { left: 40, right: 40 },
  gutter: 12,

  // ── Header rows ─────────────────────────────────
  masthead: { y: 15, h: 45 },
  headline: { y: 78, h: 120 },   // fits 3 lines at 32px min font
  thread:   { y: 208, h: 45 },
  contentTop: 263,
  contentH: 797,     // 1080 - 263 - 20

  // ── 5-column grid ───────────────────────────────
  // Usable: 1920 - 80 = 1840. Gutters: 4×12 = 48. Columns: 1792 total
  cols: {
    a: { x: 40,   w: 420 },   // seg_1 deep
    b: { x: 472,  w: 360 },   // seg_2 focus
    c: { x: 844,  w: 360 },   // seg_3 focus (top) + seg_4 flash (bottom)
    d: { x: 1216, w: 340 },   // seg_5 flash (top) + seg_6 flash (bottom)
    e: { x: 1568, w: 312 },   // closing + end card
  },

  // ── Stacked splits (cols C and D) ───────────────
  splitTop:    { h: 383 },     // top article in split column
  splitGap:    12,
  splitBottom: { h: 402 },     // bottom article (797 - 383 - 12)

  // ── Image frame dimensions per depth — uniformisé ────────────
  // Même taille pour tous les articles, indépendamment du depth, pour un rendu
  // éditorial cohérent (plus de hiérarchie visuelle par la taille).
  imageFrame: {
    deep:  { w: 340, h: 180 },
    focus: { w: 340, h: 180 },
    flash: { w: 340, h: 180 },
  },

  // ── Typography ──────────────────────────────────
  font: {
    mastheadSize: 36,
    headlineSize: 42,
    articleTitleDeep: 24,
    articleTitleFocus: 20,
    articleTitleFlash: 16,
    bodySize: 11,
    bodyLineHeight: 1.45,
    kickerSize: 8,
    threadSize: 14,
  },
} as const;

/**
 * Get zone position for a segment index (0-based).
 * Returns { x, y, w, h } on the 1920×1080 canvas.
 */
export function zoneForSegment(segIdx: number): { x: number; y: number; w: number; h: number } {
  const top = NP.contentTop;
  const fullH = NP.contentH;
  const topH = NP.splitTop.h;
  const botY = top + topH + NP.splitGap;
  const botH = NP.splitBottom.h;

  switch (segIdx) {
    case 0: return { x: NP.cols.a.x, y: top, w: NP.cols.a.w, h: fullH };       // deep
    case 1: return { x: NP.cols.b.x, y: top, w: NP.cols.b.w, h: fullH };       // focus
    case 2: return { x: NP.cols.c.x, y: top, w: NP.cols.c.w, h: topH };        // focus (top C)
    case 3: return { x: NP.cols.c.x, y: botY, w: NP.cols.c.w, h: botH };       // flash (bottom C)
    case 4: return { x: NP.cols.d.x, y: top, w: NP.cols.d.w, h: topH };        // flash (top D)
    case 5: return { x: NP.cols.d.x, y: botY, w: NP.cols.d.w, h: botH };       // flash (bottom D)
    default: return { x: NP.cols.d.x, y: botY, w: NP.cols.d.w, h: botH };
  }
}
