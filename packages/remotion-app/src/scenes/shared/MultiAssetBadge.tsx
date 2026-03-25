import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
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

/**
 * Grille de badges assets — apparition staggerée.
 * Utilisé pour les récapitulatifs multi-assets.
 */
export const MultiAssetBadge: React.FC<MultiAssetBadgeProps> = ({
  assets,
  title,
  accentColor = BRAND.colors.accentDefault,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {title && (
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: BRAND.colors.inkLight,
            opacity: interpolate(frame, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {assets.map((asset, i) => {
          const delay = i * 8;
          const sc = spring({
            frame: frame - delay,
            fps,
            config: { stiffness: 280, damping: 14 },
            from: 0,
            to: 1,
          });
          const isUp = asset.changePct >= 0;
          const changeColor = isUp
            ? BRAND.colors.accentBull
            : BRAND.colors.accentBear;
          const sign = isUp ? '+' : '';

          return (
            <div
              key={i}
              style={{
                padding: '12px 18px',
                backgroundColor: BRAND.colors.cream,
                border: `1.5px solid ${changeColor}`,
                borderRadius: BRAND.borderRadius.sm,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transform: `scale(${sc})`,
                transformOrigin: 'center',
                minWidth: 140,
              }}
            >
              <div
                style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: BRAND.colors.ink,
                }}
              >
                {asset.symbol}
              </div>
              {asset.price !== undefined && (
                <div
                  style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 18,
                    fontWeight: 700,
                    color: BRAND.colors.ink,
                  }}
                >
                  {asset.price >= 1000
                    ? asset.price.toLocaleString('fr-FR', {
                        maximumFractionDigits: 2,
                      })
                    : (typeof asset.price === "number" ? asset.price : 0).toFixed(2)}
                </div>
              )}
              <div
                style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 16,
                  fontWeight: 700,
                  color: changeColor,
                }}
              >
                {sign}
                {(typeof asset.changePct === 'number' ? asset.changePct : 0).toFixed(2)}%
              </div>
              {asset.name && (
                <div
                  style={{
                    fontFamily: BRAND.fonts.body,
                    fontSize: 11,
                    color: BRAND.colors.inkFaint,
                    fontStyle: 'italic',
                  }}
                >
                  {asset.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
