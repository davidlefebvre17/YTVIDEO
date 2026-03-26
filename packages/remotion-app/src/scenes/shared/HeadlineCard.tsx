/**
 * HeadlineCard — Breaking news tape with structured layout.
 * Splits title on ":" or " — " to create visual hierarchy:
 * Line 1 (bold): main subject
 * Line 2+ (lighter): detail
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface HeadlineCardProps {
  title: string;
  source?: string;
  accentColor?: string;
  startFrame?: number;
}

export const HeadlineCard: React.FC<HeadlineCardProps> = ({
  title,
  source,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  // Red bar slides in
  const barW = interpolate(rel, [0, 12], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Source badge stamps in
  const srcScale = interpolate(rel, [5, 12], [1.2, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const srcOp = interpolate(rel, [5, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Split title into headline + detail on ":" or " — "
  const splitMatch = title.match(/^([^:—]+)(?:\s*[:—]\s*)(.+)$/);
  const headline = splitMatch ? splitMatch[1].trim() : title;
  const detail = splitMatch ? splitMatch[2].trim() : null;

  // Headline fade
  const headOp = interpolate(rel, [8, 16], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const headY = interpolate(rel, [8, 16], [15, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Detail fade (staggered)
  const detailOp = interpolate(rel, [18, 28], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const detailY = interpolate(rel, [18, 28], [10, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: 14, maxWidth: 750,
    }}>
      {/* Red accent bar */}
      <div style={{
        width: `${barW}%`, height: 4,
        backgroundColor: accentColor,
      }} />

      {/* Source badge */}
      {source && (
        <div style={{
          transform: `scale(${srcScale})`,
          transformOrigin: "left",
          opacity: srcOp,
        }}>
          <span style={{
            fontFamily: BRAND.fonts.mono, fontSize: 12,
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: accentColor, fontWeight: 700,
            padding: "3px 10px",
            border: `1px solid ${accentColor}40`,
            backgroundColor: `${accentColor}10`,
          }}>
            {source}
          </span>
        </div>
      )}

      {/* Headline (main line — bold, large) */}
      <div style={{
        opacity: headOp,
        transform: `translateY(${headY}px)`,
        fontFamily: BRAND.fonts.display,
        fontSize: 34, fontWeight: 700,
        fontStyle: "italic",
        color: BRAND.colors.ink,
        lineHeight: 1.3,
      }}>
        {headline}
      </div>

      {/* Detail line (lighter, smaller, separated) */}
      {detail && (
        <div style={{
          opacity: detailOp,
          transform: `translateY(${detailY}px)`,
          fontFamily: BRAND.fonts.body,
          fontSize: 20,
          color: BRAND.colors.inkMid,
          lineHeight: 1.5,
          borderLeft: `3px solid ${accentColor}40`,
          paddingLeft: 14,
        }}>
          {detail}
        </div>
      )}
    </div>
  );
};
