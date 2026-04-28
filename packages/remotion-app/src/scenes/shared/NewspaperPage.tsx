/**
 * NewspaperPage — 4-column newspaper layout.
 *
 * Articles flow sequentially into columns: title → image → body text.
 * If there's room below, the next article starts in the same column.
 * Equal column widths, no gaps, no empty zones.
 */
import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface SegmentCard {
  id: string;
  title: string;
  depth?: string;
  imageSrc?: string;
  narration?: string;
}

interface NewspaperPageProps {
  title: string;
  date: string;
  segments: SegmentCard[];
  threadSummary: string;
  activeSegmentIdx?: number;
  showTypewriter?: boolean;
}

// ── Layout constants ─────────────────────────────────────────
const MARGIN_H = 40;
const COL_GUTTER = 12;
const MASTHEAD_H = 120;   // Masthead zone (title OWL STREET JOURNAL)
const HEADLINE_TOP = MASTHEAD_H + 18;  // was +5 — more breathing room below double rule
const HEADLINE_H = 120;   // Main headline — fits 3 lines at 32px (32 × 1.2 × 3 = 115px)
const THREAD_TOP = HEADLINE_TOP + HEADLINE_H + 5;
const THREAD_H = 40;      // Thread summary
const CONTENT_TOP = THREAD_TOP + THREAD_H + 10;
const CONTENT_H = 1080 - CONTENT_TOP - 10; // Fill remaining space
const COL_COUNT = 4;

const KICKER_H = 20;
const TITLE_H = 42;
const ARTICLE_GAP = 14;

// Image heights — uniformisé : même taille pour tous les articles quel que soit depth
const IMG_H_UNIFORM = 240;
const IMG_H_DEEP = IMG_H_UNIFORM;
const IMG_H_FOCUS = IMG_H_UNIFORM;
const IMG_H_FLASH = IMG_H_UNIFORM;

function imgHeightForDepth(_depth?: string): number {
  return IMG_H_UNIFORM;
}

// ── Layout computation (shared between render + zoom rects) ──
// DEEP segments span 2 columns, others 1 column.

interface Placement {
  segIdx: number;
  col: number;
  colSpan: number;
  x: number;
  y: number;
  w: number;
  h: number;
  imgH: number;
  imgY: number;
}

function computeLayout(segments: SegmentCard[]): Placement[] {
  const n = segments.length;
  if (n === 0) return [];

  // Filter out panorama from newspaper layout
  const visible = segments.filter(s => (s.depth ?? 'focus') !== 'panorama');
  const nVisible = visible.length;

  const colW = Math.floor(
    (1920 - 2 * MARGIN_H - (COL_COUNT - 1) * COL_GUTTER) / COL_COUNT,
  );

  if (nVisible === 0) return segments.map((_, i) => ({
    segIdx: i, col: 0, colSpan: 1, x: MARGIN_H, y: CONTENT_TOP,
    w: colW, h: 100, imgH: IMG_H_FOCUS, imgY: CONTENT_TOP + KICKER_H + TITLE_H,
  }));

  // DEEP segments take 1 column but double row height (bigger image).
  // Others take 1 column, 1 row height.
  // We fill columns left to right. DEEP costs 2 row-units, others 1.

  const colFill = new Array(COL_COUNT).fill(0); // row-units consumed per column

  interface Slot {
    segIdx: number;
    depth: string;
    col: number;
    rowStart: number;
    rowSpan: number; // 2 for DEEP, 1 for others
  }

  const slots: Slot[] = [];

  for (const seg of visible) {
    const origIdx = segments.indexOf(seg);
    const depth = seg.depth ?? 'focus';
    const isDeep = depth === 'deep';
    const rowSpan = isDeep ? 2 : 1;

    // Find column with least fill
    let bestCol = 0;
    let bestFill = Infinity;
    for (let c = 0; c < COL_COUNT; c++) {
      if (colFill[c] < bestFill) {
        bestFill = colFill[c];
        bestCol = c;
      }
    }

    const rowStart = colFill[bestCol];
    colFill[bestCol] += rowSpan;

    slots.push({ segIdx: origIdx, depth, col: bestCol, rowStart, rowSpan });
  }

  // Compute pixel positions
  const maxUnits = Math.max(...colFill, 1);
  const totalGaps = Math.max(0, maxUnits - 1) * ARTICLE_GAP;
  const unitH = Math.floor((CONTENT_H - totalGaps) / maxUnits);

  const placements: Placement[] = new Array(n);

  for (const slot of slots) {
    const x = MARGIN_H + slot.col * (colW + COL_GUTTER);
    const y = CONTENT_TOP + slot.rowStart * (unitH + ARTICLE_GAP);
    const h = slot.rowSpan * unitH + (slot.rowSpan - 1) * ARTICLE_GAP;
    const imgH = imgHeightForDepth(slot.depth);

    placements[slot.segIdx] = {
      segIdx: slot.segIdx,
      col: slot.col,
      colSpan: 1,
      x, y,
      w: colW,
      h,
      imgH,
      imgY: y + KICKER_H + TITLE_H,
    };
  }

  // Fill missing placements (panorama etc) with dummy
  for (let i = 0; i < n; i++) {
    if (!placements[i]) {
      placements[i] = {
        segIdx: i, col: 0, colSpan: 1,
        x: MARGIN_H, y: CONTENT_TOP, w: colW, h: unitH,
        imgH: IMG_H_FOCUS, imgY: CONTENT_TOP + KICKER_H + TITLE_H,
      };
    }
  }

  return placements;
}

/** Returns IMAGE rects for zoom transitions. */
export function computeSegmentRects(
  _count: number,
  segments?: SegmentCard[],
): Array<{ x: number; y: number; w: number; h: number }> {
  if (!segments || segments.length === 0) return [];
  return computeLayout(segments).map((p) => ({
    x: p.x,
    y: p.imgY,
    w: p.w,
    h: p.imgH,
  }));
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateFR(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const DEPTH_LABELS: Record<string, string> = {
  deep: "ANALYSE",
  focus: "FOCUS",
  flash: "FLASH",
  panorama: "PANORAMA",
};

// ── Article (rendered within a fixed-height zone) ────────────

const Article: React.FC<{
  seg: SegmentCard;
  width: number;
  height: number;
  imgHeight: number;
  isActive: boolean;
  accentColor: string;
  frame: number;
  showTypewriter: boolean;
  staggerDelay: number;
}> = ({
  seg,
  width,
  height,
  imgHeight,
  isActive,
  accentColor,
  frame,
  showTypewriter,
  staggerDelay,
}) => {
  const label = DEPTH_LABELS[seg.depth ?? "focus"] ?? "FOCUS";
  const paragraphs = (seg.narration ?? "").split("\n\n").filter(Boolean);

  const cardOp = showTypewriter
    ? interpolate(frame, [staggerDelay, staggerDelay + 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const pulse = isActive
    ? interpolate(frame % 60, [0, 30, 60], [0.2, 0.8, 0.2], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const hasImage = seg.imageSrc && seg.imageSrc.includes("editorial/");

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        opacity: cardOp,
      }}
    >
      {/* Kicker — fixed KICKER_H */}
      <div
        style={{
          height: KICKER_H,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 8,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: accentColor,
            backgroundColor: `${accentColor}14`,
            padding: "2px 8px",
            borderRadius: 2,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Title — fixed TITLE_H */}
      <div
        style={{
          height: TITLE_H,
          flexShrink: 0,
          overflow: "hidden",
          borderLeft: `3px solid ${isActive ? accentColor : `${accentColor}60`}`,
          paddingLeft: 10,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <h3
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 16,
            fontWeight: 700,
            fontStyle: "italic",
            color: BRAND.colors.ink,
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {seg.title}
        </h3>
      </div>

      {/* Image — height varies by depth */}
      <div
        style={{
          width,
          height: imgHeight,
          backgroundColor: BRAND.colors.creamDark,
          border: `1px solid ${BRAND.colors.rule}`,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {hasImage ? (
          <Img
            src={staticFile(seg.imageSrc!)}
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              if (t.parentElement) {
                t.parentElement.style.background = `linear-gradient(135deg, ${BRAND.colors.creamDark}, ${BRAND.colors.creamDeep})`;
              }
            }}
            style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: BRAND.colors.creamDark }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${BRAND.colors.creamDark}, ${BRAND.colors.creamDeep})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 10,
                color: BRAND.colors.inkFaint,
              }}
            >
              {seg.id}
            </span>
          </div>
        )}
      </div>

      {/* Body text — fills remaining space */}
      <div style={{ flex: 1, overflow: "hidden", paddingTop: 8 }}>
        {paragraphs.map((p, pi) => (
          <p
            key={pi}
            style={{
              fontFamily: BRAND.fonts.body,
              fontSize: 11,
              lineHeight: 1.5,
              color: BRAND.colors.inkMid,
              margin: 0,
              marginBottom: 8,
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Active glow */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            border: `3px solid ${accentColor}`,
            boxShadow: `0 0 24px rgba(192,57,43,${pulse})`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────

export const NewspaperPage: React.FC<NewspaperPageProps> = ({
  title,
  date,
  segments,
  threadSummary,
  activeSegmentIdx = -1,
  showTypewriter = true,
}) => {
  const frame = useCurrentFrame();
  const dateStr = formatDateFR(date);
  const accentColor = BRAND.colors.accentDefault;
  const placements = computeLayout(segments);

  const charsToShow = showTypewriter
    ? Math.min(title.length, Math.round(frame * 1.2))
    : title.length;
  const displayTitle = title.slice(0, charsToShow);
  const showCursor =
    showTypewriter && charsToShow < title.length && frame % 16 < 8;

  const pageOpacity = showTypewriter
    ? interpolate(frame, [0, 12], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Column divider positions
  const colCount = Math.min(COL_COUNT, segments.length);
  const colW = colCount > 0
    ? Math.floor((1920 - 2 * MARGIN_H - (colCount - 1) * COL_GUTTER) / colCount)
    : 0;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BRAND.colors.cream,
        position: "relative",
        overflow: "hidden",
        opacity: pageOpacity,
        fontFamily: BRAND.fonts.body,
      }}
    >
      {/* ── Masthead ── */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: MARGIN_H,
          right: MARGIN_H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Top rule */}
        <div style={{ width: "100%", height: 2, backgroundColor: BRAND.colors.ink }} />
        {/* Sub-header line */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "3px 0",
          }}
        >
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 10, letterSpacing: "0.15em", color: BRAND.colors.inkLight, textTransform: "uppercase" }}>
            Recap Quotidien
          </span>
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 10, letterSpacing: "0.15em", color: BRAND.colors.inkLight }}>
            {BRAND.tagline}
          </span>
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 10, letterSpacing: "0.1em", color: BRAND.colors.inkLight }}>
            {dateStr}
          </span>
        </div>
        {/* Thin rule */}
        <div style={{ width: "100%", height: 1, backgroundColor: BRAND.colors.rule }} />
        {/* Main title — OWL STREET JOURNAL */}
        <h1
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 90,
            fontWeight: 900,
            letterSpacing: "0.06em",
            color: BRAND.colors.ink,
            margin: "4px 0",
            lineHeight: 1,
            textAlign: "center",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Owl Street Journal
        </h1>
        {/* Bottom double rule */}
        <div style={{ width: "100%", height: 2, backgroundColor: BRAND.colors.ink }} />
        <div style={{ width: "100%", height: 2, backgroundColor: BRAND.colors.ink, marginTop: 3 }} />
      </div>

      {/* ── Headline — adaptive font for long titles ── */}
      <div
        style={{
          position: "absolute",
          top: HEADLINE_TOP,
          left: MARGIN_H,
          right: MARGIN_H,
          height: HEADLINE_H,
          borderBottom: `1px solid ${BRAND.colors.rule}`,
          paddingBottom: 4,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: title.length <= 45 ? 42 : title.length <= 65 ? 36 : 32,
            fontWeight: 700,
            fontStyle: "italic",
            color: BRAND.colors.ink,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {displayTitle}
          {showCursor && (
            <span style={{ opacity: 0.5, marginLeft: 2 }}>│</span>
          )}
        </h1>
      </div>

      {/* ── Thread ── */}
      <div
        style={{
          position: "absolute",
          top: THREAD_TOP,
          left: MARGIN_H,
          right: MARGIN_H,
          height: THREAD_H,
          overflow: "hidden",
          borderLeft: `3px solid ${accentColor}`,
          paddingLeft: 12,
          borderBottom: `2px solid ${BRAND.colors.ink}`,
          paddingBottom: 6,
        }}
      >
        <p
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 14,
            fontStyle: "italic",
            color: BRAND.colors.inkMid,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {threadSummary.slice(0, 300)}
        </p>
      </div>

      {/* ── Articles — absolutely positioned from computeLayout ── */}
      {placements.map((p) => {
        const seg = segments[p.segIdx];
        // Skip panorama — excluded from layout, only has dummy placement
        if ((seg.depth ?? 'focus') === 'panorama') return null;
        return (
          <div
            key={seg.id}
            style={{
              position: "absolute",
              top: p.y,
              left: p.x,
              width: p.w,
              height: p.h,
            }}
          >
            <Article
              seg={seg}
              width={p.w}
              height={p.h}
              imgHeight={p.imgH}
              isActive={activeSegmentIdx === p.segIdx}
              accentColor={accentColor}
              frame={frame}
              showTypewriter={showTypewriter}
              staggerDelay={30 + p.segIdx * 10}
            />
          </div>
        );
      })}

      {/* ── Column dividers ── */}
      {Array.from({ length: Math.max(0, colCount - 1) }, (_, i) => (
        <div
          key={`vr-${i}`}
          style={{
            position: "absolute",
            top: CONTENT_TOP,
            left:
              MARGIN_H +
              (i + 1) * (colW + COL_GUTTER) -
              COL_GUTTER / 2,
            width: 1,
            height: CONTENT_H,
            backgroundColor: BRAND.colors.rule,
            opacity: 0.6,
          }}
        />
      ))}

      {/* ── Horizontal rules between stacked articles ── */}
      {placements
        .filter((p) => {
          // Draw a rule above every article that isn't the first in its column
          const sameCol = placements.filter((q) => q.col === p.col);
          return sameCol.indexOf(p) > 0;
        })
        .map((p) => (
          <div
            key={`hr-${p.segIdx}`}
            style={{
              position: "absolute",
              top: p.y - ARTICLE_GAP / 2,
              left: p.x,
              width: p.w,
              height: 1,
              backgroundColor: BRAND.colors.rule,
              opacity: 0.5,
            }}
          />
        ))}
    </div>
  );
};
