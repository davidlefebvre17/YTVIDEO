import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BRAND, fadeIn, computeLayout } from "@yt-maker/core";
import type { ScriptSection } from "@yt-maker/core";

interface OutroSceneProps {
  section: ScriptSection;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ section }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  const titleScale = spring({
    frame,
    fps,
    config: { stiffness: 200, damping: 12 },
  });

  const ctaOpacity = fadeIn(frame, 20, 25);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        fontFamily: BRAND.fonts.primary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Brand name */}
      <div
        style={{
          fontSize: layout.fontSize.title,
          color: BRAND.colors.text,
          fontWeight: 800,
          transform: `scale(${titleScale})`,
        }}
      >
        {BRAND.name}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 30,
          fontSize: layout.fontSize.cta,
          color: BRAND.colors.primary,
          fontWeight: 600,
          opacity: ctaOpacity,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Subscribe
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 16,
          fontSize: layout.fontSize.body,
          color: BRAND.colors.textMuted,
          opacity: ctaOpacity,
        }}
      >
        {BRAND.tagline}
      </div>

      {/* Narration at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: layout.padding.bottom + 20,
          fontSize: layout.fontSize.narration,
          color: BRAND.colors.textMuted,
          textAlign: "center",
          opacity: fadeIn(frame, 10, 20),
        }}
      >
        {section.narration}
      </div>
    </AbsoluteFill>
  );
};
