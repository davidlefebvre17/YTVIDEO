import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, fadeIn, slideInFromLeft, staggerDelay, computeLayout } from "@yt-maker/core";
import type { ScriptSection } from "@yt-maker/core";

interface PreviouslyOnSceneProps {
  section: ScriptSection;
}

export const PreviouslyOnScene: React.FC<PreviouslyOnSceneProps> = ({ section }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  const titleOpacity = fadeIn(frame, 0, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        padding: layout.padding.left,
        fontFamily: BRAND.fonts.primary,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: layout.fontSize.sectionTitle,
          color: BRAND.colors.primary,
          fontWeight: 700,
          opacity: titleOpacity,
          marginBottom: 40,
        }}
      >
        {section.title || "Précédemment..."}
      </div>

      <div
        style={{
          fontSize: layout.fontSize.narration,
          color: BRAND.colors.text,
          opacity: fadeIn(frame, 15, 25),
          lineHeight: 1.8,
          maxWidth: width * 0.75,
        }}
      >
        {section.narration}
      </div>
    </AbsoluteFill>
  );
};
