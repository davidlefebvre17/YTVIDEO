import React from "react";
import { BRAND } from "@yt-maker/core";
import type { EpisodeScript, ScriptSection } from "@yt-maker/core";
import { NP, zoneForSegment } from "./newspaper-layout";
import { NewspaperArticle } from "./NewspaperArticle";
import { TypewriterText } from "../shared/TypewriterText";

/**
 * Adaptive headline font size — shrinks for long titles to avoid truncation.
 * Target: fit in ~100px height (2 lines max at chosen size).
 */
function headlineFontSize(title: string): number {
  const len = title.length;
  if (len <= 45) return 42;
  if (len <= 65) return 36;
  return 32;                   // minimum — wraps on 2-3 lines, stays readable
}

interface NewspaperCanvasProps {
  script: EpisodeScript;
  accentColor?: string;
  focusFrames?: Record<string, number>;
}

export const NewspaperCanvas: React.FC<NewspaperCanvasProps> = ({
  script,
  accentColor = BRAND.colors.accentDefault,
  focusFrames = {},
}) => {
  const segments = script.sections.filter((s) => s.type === "segment");
  const thread = script.sections.find((s) => s.type === "thread");
  const closing = script.sections.find((s) => s.type === "closing");
  const dateFormatted = formatDate(script.date);

  return (
    <div
      style={{
        width: NP.canvas.w,
        height: NP.canvas.h,
        backgroundColor: BRAND.colors.cream,
        position: "relative",
        fontFamily: BRAND.fonts.body,
        overflow: "hidden",
      }}
    >
      {/* ── Masthead ── */}
      <div
        style={{
          position: "absolute",
          top: NP.masthead.y,
          left: NP.margin.left,
          right: NP.margin.right,
          height: NP.masthead.h,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `2px solid ${BRAND.colors.ink}`,
          borderBottom: `2px solid ${BRAND.colors.ink}`,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.condensed,
            fontSize: NP.font.mastheadSize,
            fontWeight: 400,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: BRAND.colors.ink,
          }}
        >
          OWL STREET JOURNAL
        </span>
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 10,
            letterSpacing: "0.15em",
            color: BRAND.colors.inkLight,
          }}
        >
          {BRAND.tagline}
        </span>
        <div style={{ textAlign: "right", display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 11, letterSpacing: "0.1em", color: BRAND.colors.inkMid }}>
            {dateFormatted}
          </span>
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 10, color: BRAND.colors.inkLight }}>
            N°{script.episodeNumber}
          </span>
        </div>
      </div>

      {/* ── Headline (typewriter effect) — adaptive font for long titles ── */}
      <div
        style={{
          position: "absolute",
          top: NP.headline.y,
          left: NP.margin.left,
          right: NP.margin.right,
          borderBottom: `1px solid ${BRAND.colors.rule}`,
          paddingBottom: 8,
        }}
      >
        <TypewriterText
          text={script.title}
          startFrame={90}
          charsPerFrame={1.2}
          as="h1"
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: headlineFontSize(script.title),
            fontWeight: 700,
            fontStyle: "italic",
            color: BRAND.colors.ink,
            margin: 0,
            lineHeight: 1.15,
          }}
        />
      </div>

      {/* ── Thread summary ── */}
      {thread && (
        <div
          style={{
            position: "absolute",
            top: NP.thread.y,
            left: NP.margin.left,
            right: NP.margin.right,
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: 12,
            borderBottom: `2px solid ${BRAND.colors.ink}`,
            paddingBottom: 6,
          }}
        >
          <p
            style={{
              fontFamily: BRAND.fonts.body,
              fontSize: NP.font.threadSize,
              fontStyle: "italic",
              color: BRAND.colors.inkMid,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {thread.narration.slice(0, 300)}
          </p>
        </div>
      )}

      {/* ── Segment articles (cols A-D) ── */}
      {segments.slice(0, 6).map((seg, i) => {
        const zone = zoneForSegment(i);
        const depth = seg.depth ?? (i === 0 ? "deep" : i < 3 ? "focus" : "flash");
        return (
          <div
            key={seg.id}
            style={{
              position: "absolute",
              top: zone.y,
              left: zone.x,
              width: zone.w,
              height: zone.h,
            }}
          >
            <NewspaperArticle
              section={seg}
              width={zone.w}
              height={zone.h}
              focusFrame={focusFrames[seg.id] ?? 0}
              accentColor={accentColor}
              depth={depth as "deep" | "focus" | "flash"}
            />
          </div>
        );
      })}

      {/* ── Column E: Closing + End card ── */}
      <div
        style={{
          position: "absolute",
          top: NP.contentTop,
          left: NP.cols.e.x,
          width: NP.cols.e.w,
          height: NP.contentH,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {closing && (
          <div style={{ borderTop: `2px solid ${BRAND.colors.ink}`, paddingTop: 12 }}>
            <h2
              style={{
                fontFamily: BRAND.fonts.display,
                fontSize: 18,
                fontWeight: 700,
                fontStyle: "italic",
                color: BRAND.colors.ink,
                margin: 0,
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              {closing.title}
            </h2>
            <p
              style={{
                fontFamily: BRAND.fonts.body,
                fontSize: 10,
                color: BRAND.colors.inkMid,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {closing.narration.slice(0, 500)}
            </p>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            borderTop: `1px solid ${BRAND.colors.rule}`,
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fonts.condensed,
              fontSize: 14,
              letterSpacing: "0.15em",
              color: BRAND.colors.inkLight,
            }}
          >
            OWL STREET JOURNAL — {dateFormatted}
          </span>
        </div>
      </div>

      {/* ── Column divider rules ── */}
      {[NP.cols.b.x, NP.cols.c.x, NP.cols.d.x, NP.cols.e.x].map((cx) => (
        <div
          key={`vr-${cx}`}
          style={{
            position: "absolute",
            top: NP.contentTop,
            left: cx - NP.gutter / 2,
            width: 1,
            height: NP.contentH,
            backgroundColor: BRAND.colors.rule,
            opacity: 0.6,
          }}
        />
      ))}

      {/* ── Horizontal split rules in cols C and D ── */}
      {[NP.cols.c.x, NP.cols.d.x].map((cx, i) => (
        <div
          key={`hr-${i}`}
          style={{
            position: "absolute",
            top: NP.contentTop + NP.splitTop.h + NP.splitGap / 2,
            left: cx,
            width: i === 0 ? NP.cols.c.w : NP.cols.d.w,
            height: 1,
            backgroundColor: BRAND.colors.rule,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
};

function formatDate(dateStr: string): string {
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
