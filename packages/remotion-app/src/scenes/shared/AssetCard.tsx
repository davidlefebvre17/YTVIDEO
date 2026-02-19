import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { AssetSnapshot } from "@yt-maker/core";
import { BRAND, staggerDelay } from "@yt-maker/core";
import { Sparkline } from "./Sparkline";

interface AssetCardProps {
  asset: AssetSnapshot;
  index: number;
  width: number;
  height: number;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  index,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = staggerDelay(index, 6);
  const localFrame = Math.max(0, frame - delay);

  const scale = spring({
    frame: localFrame,
    fps,
    config: { stiffness: 250, damping: 14 },
  });

  const opacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isUp = asset.changePct >= 0;
  const changeColor = isUp ? BRAND.colors.profit : BRAND.colors.loss;
  const arrow = isUp ? "\u25B2" : "\u25BC";

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: BRAND.colors.surface,
        borderRadius: BRAND.borderRadius.md,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity,
        transform: `scale(${scale})`,
        border: `1px solid ${BRAND.colors.border}`,
        boxShadow: BRAND.shadows.card,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontFamily: BRAND.fonts.primary,
            fontSize: 14,
            color: BRAND.colors.textMuted,
            fontWeight: 500,
          }}>
            {asset.name}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 24,
            color: BRAND.colors.text,
            fontWeight: 700,
            marginTop: 4,
          }}>
            {asset.price.toFixed(2)}
          </div>
        </div>
        <div style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 16,
          color: changeColor,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {arrow} {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
        </div>
      </div>
      <Sparkline
        candles={asset.candles}
        width={width - 32}
        height={50}
      />
    </div>
  );
};
