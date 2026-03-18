import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BRAND, fadeIn, slideInFromBottom, computeLayout } from "@yt-maker/core";
import type { ScriptSection } from "@yt-maker/core";

interface IntroSceneProps {
  section: ScriptSection;
  episodeNumber: number;
  date: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  section,
  episodeNumber,
  date,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  // Animated background gradient line
  const lineWidth = interpolate(frame, [0, 40], [0, width * 0.6], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = fadeIn(frame, 10, 25);
  const titleY = slideInFromBottom(Math.max(0, frame - 10), fps, 40);

  const episodeOpacity = fadeIn(frame, 20, 20);
  const dateOpacity = fadeIn(frame, 30, 20);
  const subtitleOpacity = fadeIn(frame, 40, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: BRAND.fonts.primary,
      }}
    >
      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: height * 0.35,
          left: (width - lineWidth) / 2,
          width: lineWidth,
          height: 3,
          background: `linear-gradient(135deg, ${BRAND.colors.accentDefault}, ${BRAND.colors.accentBear})`,
          borderRadius: 2,
        }}
      />

      {/* Episode number */}
      <div
        style={{
          fontSize: layout.fontSize.small,
          color: BRAND.colors.primary,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: episodeOpacity,
          marginBottom: 16,
        }}
      >
        Episode #{episodeNumber}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: layout.fontSize.title,
          color: BRAND.colors.text,
          fontWeight: 800,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          maxWidth: width * 0.8,
          lineHeight: 1.2,
        }}
      >
        {section.title || BRAND.name}
      </div>

      {/* Date */}
      <div
        style={{
          fontSize: layout.fontSize.subtitle,
          color: BRAND.colors.textMuted,
          fontWeight: 400,
          marginTop: 20,
          opacity: dateOpacity,
          fontFamily: BRAND.fonts.mono,
        }}
      >
        {date}
      </div>

      {/* Narration text (subtitle) */}
      <div
        style={{
          position: "absolute",
          bottom: layout.padding.bottom + 40,
          fontSize: layout.fontSize.narration,
          color: BRAND.colors.textMuted,
          textAlign: "center",
          maxWidth: width * 0.7,
          opacity: subtitleOpacity,
          lineHeight: 1.6,
        }}
      >
        {section.narration}
      </div>
    </AbsoluteFill>
  );
};
