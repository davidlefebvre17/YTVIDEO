import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { AssetSnapshot, ScriptSection } from "@yt-maker/core";
import { BRAND, fadeIn, computeLayout } from "@yt-maker/core";
import { AssetCard } from "./shared/AssetCard";
import { AnimatedText } from "./shared/AnimatedText";

interface MarketOverviewSceneProps {
  section: ScriptSection;
  assets: AssetSnapshot[];
}

export const MarketOverviewScene: React.FC<MarketOverviewSceneProps> = ({
  section,
  assets,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  const titleOpacity = fadeIn(frame, 0, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        fontFamily: BRAND.fonts.primary,
        padding: layout.padding.left,
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontSize: layout.fontSize.sectionTitle,
          color: BRAND.colors.accentBlue,
          fontWeight: 700,
          opacity: titleOpacity,
          marginTop: layout.padding.top,
          marginBottom: 30,
        }}
      >
        {section.title || "Market Overview"}
      </div>

      {/* Asset grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: layout.grid.gap,
          marginTop: 20,
        }}
      >
        {assets.slice(0, 8).map((asset, i) => (
          <AssetCard
            key={asset.symbol}
            asset={asset}
            index={i}
            width={layout.grid.cardWidth}
            height={layout.grid.cardHeight}
          />
        ))}
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
          delay={20}
          color={BRAND.colors.textMuted}
        />
      </div>
    </AbsoluteFill>
  );
};
