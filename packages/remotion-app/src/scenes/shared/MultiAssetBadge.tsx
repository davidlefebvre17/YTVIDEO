/**
 * MultiAssetBadge — Newspaper ticker board.
 * Each asset as a column snippet with ink borders,
 * staggered slide-up entrance, colored accent underlines.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface AssetBadge {
  symbol: string;
  name?: string;
  changePct: number;
  price?: number;
}

interface MultiAssetBadgeProps {
  assets: AssetBadge[];
  title?: string;
  accentColor?: string;
}

export const MultiAssetBadge: React.FC<MultiAssetBadgeProps> = ({
  assets,
  title,
  accentColor = BRAND.colors.accentDefault,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {title && (
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 10,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: BRAND.colors.inkLight,
          borderBottom: `1px solid ${BRAND.colors.rule}`,
          paddingBottom: 6,
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {assets.map((asset, i) => {
          const delay = i * 6;
          const slideY = interpolate(frame, [delay, delay + 12], [24, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const op = interpolate(frame, [delay, delay + 10], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          const isUp = asset.changePct >= 0;
          const changeColor = isUp
            ? BRAND.colors.accentBull
            : BRAND.colors.accentBear;
          const sign = isUp ? "+" : "";
          const safePct = typeof asset.changePct === "number" ? asset.changePct : 0;
          const safePrice = typeof asset.price === "number" ? asset.price : 0;

          // Accent underline grows
          const lineW = interpolate(frame, [delay + 8, delay + 20], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${slideY}px)`,
                padding: "10px 16px",
                backgroundColor: BRAND.colors.cream,
                borderTop: `1px solid ${BRAND.colors.rule}`,
                borderBottom: `1px solid ${BRAND.colors.rule}`,
                display: "flex",
                flexDirection: "column",
                gap: 3,
                minWidth: 130,
                position: "relative",
              }}
            >
              {/* Name (falls back to symbol) */}
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 14,
                letterSpacing: "0.08em", color: BRAND.colors.ink,
              }}>
                {asset.name || asset.symbol}
              </div>

              {/* Price */}
              {asset.price !== undefined && (
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 22,
                  color: BRAND.colors.ink, lineHeight: 1,
                }}>
                  {safePrice >= 1000
                    ? safePrice.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                    : safePrice.toFixed(2)}
                </div>
              )}

              {/* Change % */}
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 18,
                color: changeColor, lineHeight: 1,
              }}>
                {sign}{safePct.toFixed(2)}%
              </div>

              {/* Name */}
              {asset.name && (
                <div style={{
                  fontFamily: BRAND.fonts.body, fontSize: 10,
                  color: BRAND.colors.inkFaint, fontStyle: "italic",
                }}>
                  {asset.name}
                </div>
              )}

              {/* Accent underline */}
              <div style={{
                position: "absolute", bottom: 0, left: 0,
                width: `${lineW * 100}%`, height: 3,
                backgroundColor: changeColor,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
