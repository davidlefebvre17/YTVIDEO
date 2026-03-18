import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { ScriptSection } from "@yt-maker/core";
import { NP } from "./newspaper-layout";
import { TypewriterText } from "../shared/TypewriterText";

interface NewspaperArticleProps {
  section: ScriptSection;
  width: number;
  height: number;
  /** Absolute frame when this article's camera focus begins */
  focusFrame?: number;
  accentColor?: string;
  /** Override depth detection from section */
  depth?: "deep" | "focus" | "flash";
}

const DEPTH_LABELS: Record<string, string> = {
  deep: "ANALYSE",
  focus: "FOCUS",
  flash: "FLASH",
};

export const NewspaperArticle: React.FC<NewspaperArticleProps> = ({
  section,
  width,
  height,
  focusFrame = 0,
  accentColor = BRAND.colors.accentDefault,
  depth: depthOverride,
}) => {
  const frame = useCurrentFrame();
  const depth = depthOverride ?? section.depth ?? "focus";
  const label = DEPTH_LABELS[depth] ?? "FOCUS";

  const titleSize =
    depth === "deep"
      ? NP.font.articleTitleDeep
      : depth === "focus"
      ? NP.font.articleTitleFocus
      : NP.font.articleTitleFlash;

  const imgDims = NP.imageFrame[depth as keyof typeof NP.imageFrame] ?? NP.imageFrame.focus;

  // Pulse animation on title border when camera is near
  const nearFocus = Math.abs(frame - focusFrame) < 90;
  const pulse = nearFocus
    ? interpolate(
        (frame - focusFrame + 90) % 60,
        [0, 30, 60],
        [0.4, 1, 0.4],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0.3;

  // Truncate body for display — newspaper columns are narrow
  const maxChars = depth === "deep" ? 2400 : depth === "focus" ? 800 : 400;
  const bodyText = section.narration.slice(0, maxChars);

  // Split into paragraphs
  const paragraphs = bodyText.split("\n\n").filter(Boolean);

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Kicker badge */}
      <div
        style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: NP.font.kickerSize,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: accentColor,
          backgroundColor: `${accentColor}14`,
          padding: "3px 10px",
          borderRadius: 2,
          border: `1px solid ${accentColor}30`,
          alignSelf: "flex-start",
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      {/* Title (typewriter when camera arrives) */}
      <div
        style={{
          marginBottom: 12,
          borderLeft: `3px solid ${accentColor}`,
          borderLeftColor: `rgba(${hexToRgb(accentColor)}, ${pulse})`,
          paddingLeft: 12,
        }}
      >
        <TypewriterText
          text={section.title}
          startFrame={focusFrame}
          charsPerFrame={1.0}
          as="h3"
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: titleSize,
            fontWeight: 700,
            fontStyle: "italic",
            color: BRAND.colors.ink,
            margin: 0,
            lineHeight: 1.2,
          }}
        />
      </div>

      {/* Image frame placeholder */}
      <div
        style={{
          width: Math.min(imgDims.w, width - 20),
          height: imgDims.h,
          border: `1.5px dashed ${BRAND.colors.rule}`,
          borderRadius: 4,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BRAND.colors.creamDark,
          flexShrink: 0,
        }}
        data-image-frame={section.id}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 11,
            color: BRAND.colors.inkFaint,
            letterSpacing: "0.1em",
          }}
        >
          {section.assets?.[0] ?? section.id} — IMAGE
        </span>
      </div>

      {/* Body text */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: BRAND.fonts.body,
              fontSize: NP.font.bodySize,
              lineHeight: NP.font.bodyLineHeight,
              color: BRAND.colors.inkMid,
              margin: 0,
              marginBottom: 10,
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Bottom rule */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: BRAND.colors.rule,
          opacity: 0.5,
        }}
      />
    </div>
  );
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
