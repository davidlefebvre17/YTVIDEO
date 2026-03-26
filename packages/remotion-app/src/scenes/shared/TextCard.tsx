/**
 * TextCard — Editorial quote with guillemets, accent line, typewriter.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface TextCardProps {
  text: string;
  subtitle?: string;
  accentColor?: string;
  startFrame?: number;
}

export const TextCard: React.FC<TextCardProps> = ({
  text,
  subtitle,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  // Accent line draws across
  const lineW = interpolate(rel, [0, 14], [0, 200], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Guillemet opacity
  const guilOp = interpolate(rel, [2, 10], [0, 0.15], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Text typewriter
  const charsToShow = Math.min(text.length, Math.round(Math.max(0, rel - 6) * 1.5));
  const displayText = text.slice(0, charsToShow);
  const showCursor = charsToShow < text.length && rel % 16 < 8;

  // Subtitle slide up
  const subOp = interpolate(rel, [text.length / 1.5 + 8, text.length / 1.5 + 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subY = interpolate(rel, [text.length / 1.5 + 8, text.length / 1.5 + 18], [12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 12,
      maxWidth: 800, position: "relative",
    }}>
      {/* Accent line */}
      <div style={{
        width: lineW, height: 2,
        backgroundColor: accentColor,
      }} />

      {/* Quote area */}
      <div style={{ position: "relative", padding: "0 40px" }}>
        {/* Guillemets */}
        <span style={{
          position: "absolute", top: -20, left: 0,
          fontFamily: BRAND.fonts.display, fontSize: 80,
          color: accentColor, opacity: guilOp, lineHeight: 1,
        }}>
          «
        </span>
        <span style={{
          position: "absolute", bottom: -30, right: 0,
          fontFamily: BRAND.fonts.display, fontSize: 80,
          color: accentColor, opacity: guilOp, lineHeight: 1,
        }}>
          »
        </span>

        {/* Text */}
        <span style={{
          fontFamily: BRAND.fonts.display, fontSize: 32,
          fontStyle: "italic", color: BRAND.colors.ink,
          textAlign: "center", lineHeight: 1.35,
          display: "block",
        }}>
          {displayText}
          {showCursor && <span style={{ opacity: 0.4 }}>│</span>}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontFamily: BRAND.fonts.mono, fontSize: 12,
          letterSpacing: "0.1em", color: BRAND.colors.inkLight,
          fontStyle: "normal",
        }}>
          — {subtitle}
        </div>
      )}
    </div>
  );
};
