import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { ScriptSection, NewsItem } from "@yt-maker/core";
import { BRAND, fadeIn, staggerDelay, computeLayout } from "@yt-maker/core";
import { AnimatedText } from "./shared/AnimatedText";

interface NewsSceneProps {
  section: ScriptSection;
  news: NewsItem[];
}

export const NewsScene: React.FC<NewsSceneProps> = ({ section, news }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        fontFamily: BRAND.fonts.primary,
        padding: layout.padding.left,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: layout.fontSize.sectionTitle,
          color: BRAND.colors.news,
          fontWeight: 700,
          opacity: fadeIn(frame, 0, 20),
          marginTop: layout.padding.top,
          marginBottom: 30,
        }}
      >
        {section.title || "Headlines"}
      </div>

      {/* News cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {news.slice(0, 5).map((item, i) => {
          const delay = staggerDelay(i, 12);
          const localFrame = Math.max(0, frame - delay);
          const slideX = spring({
            frame: localFrame,
            fps,
            config: { stiffness: 200, damping: 16 },
          });
          const cardOpacity = interpolate(localFrame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                backgroundColor: BRAND.colors.surface,
                borderRadius: BRAND.borderRadius.md,
                padding: 20,
                borderLeft: `4px solid ${BRAND.colors.news}`,
                opacity: cardOpacity,
                transform: `translateX(${interpolate(slideX, [0, 1], [60, 0])}px)`,
              }}
            >
              <div style={{
                fontSize: layout.fontSize.body,
                color: BRAND.colors.text,
                fontWeight: 600,
                lineHeight: 1.4,
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: layout.fontSize.small,
                color: BRAND.colors.textMuted,
                marginTop: 6,
              }}>
                {item.source}
              </div>
            </div>
          );
        })}
      </div>

      {/* Narration */}
      <div
        style={{
          position: "absolute",
          bottom: layout.padding.bottom + 20,
          left: layout.padding.left,
          right: layout.padding.right,
        }}
      >
        <AnimatedText
          text={section.narration}
          fontSize={layout.fontSize.narration}
          delay={15}
          color={BRAND.colors.textMuted}
        />
      </div>
    </AbsoluteFill>
  );
};
