import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface SectorData {
  name: string;
  ticker?: string;
  change: number;
}

interface HeatmapGridProps {
  sectors: SectorData[];
  title?: string;
  /** Frames entre chaque apparition de cellule */
  cellDelay?: number;
}

function changeToColor(change: number): string {
  if (change >= 2) return '#1a4d2e';
  if (change >= 0.5) return '#2d6b3e';
  if (change >= 0) return '#3d7a4f';
  if (change >= -0.5) return '#6b2020';
  if (change >= -2) return '#8b1a1a';
  return '#a01010';
}

/**
 * Heatmap sectorielle S&P 500.
 * Cellules qui s'allument progressivement du plus fort au plus faible.
 */
export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  sectors,
  title,
  cellDelay = 5,
}) => {
  const frame = useCurrentFrame();

  // Trier par valeur absolue du changement (les plus forts en premier)
  const sorted = [...sectors].sort(
    (a, b) => Math.abs(b.change) - Math.abs(a.change)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {title && (
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: BRAND.colors.inkLight,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {sorted.map((sector, i) => {
          const cellStart = i * cellDelay;
          const opacity = interpolate(frame, [cellStart, cellStart + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const bgColor = changeToColor(sector.change);
          const isUp = sector.change >= 0;
          const sign = isUp ? '+' : '';

          return (
            <div
              key={i}
              style={{
                padding: '14px 12px',
                backgroundColor: bgColor,
                borderRadius: BRAND.borderRadius.sm,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                opacity,
              }}
            >
              <div
                style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'rgba(245,240,232,0.9)',
                  textTransform: 'uppercase',
                }}
              >
                {sector.ticker ?? sector.name.slice(0, 4)}
              </div>
              <div
                style={{
                  fontFamily: BRAND.fonts.condensed,
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'rgba(245,240,232,1)',
                  lineHeight: 1,
                }}
              >
                {sign}
                {sector.change.toFixed(2)}%
              </div>
              <div
                style={{
                  fontFamily: BRAND.fonts.body,
                  fontSize: 10,
                  color: 'rgba(245,240,232,0.65)',
                  fontStyle: 'italic',
                }}
              >
                {sector.name.length > 14
                  ? sector.name.slice(0, 12) + '…'
                  : sector.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
