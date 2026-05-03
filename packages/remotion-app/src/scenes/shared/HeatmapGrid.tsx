/**
 * HeatmapGrid — Newspaper sector map.
 * Ink borders, colored accent band on left, staggered slide-in.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface SectorData {
  name: string;
  ticker?: string;
  change: number;
}

export interface HeatmapGridProps {
  sectors: SectorData[];
  title?: string;
  cellDelay?: number;
  variant?: 'default' | 'treemap';
}

function changeToAccent(change: number): string {
  if (change >= 1) return BRAND.colors.accentBull;
  if (change >= 0) return "#3d7a4f";
  if (change >= -1) return "#8b4a1a";
  return BRAND.colors.accentBear;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  sectors,
  title,
  cellDelay = 4,
}) => {
  const frame = useCurrentFrame();

  const sorted = [...sectors].sort(
    (a, b) => Math.abs(b.change) - Math.abs(a.change),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {title && (
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 10,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: BRAND.colors.inkLight,
          borderBottom: `1px solid ${BRAND.colors.rule}`,
          paddingBottom: 4,
        }}>
          {title}
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
      }}>
        {sorted.map((sector, i) => {
          const start = i * cellDelay;
          const slideX = interpolate(frame, [start, start + 10], [-20, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const op = interpolate(frame, [start, start + 8], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          const accent = changeToAccent(sector.change);
          const isUp = sector.change >= 0;
          const sign = isUp ? "+" : "";
          const safeChange = typeof sector.change === "number" ? sector.change : 0;

          // Accent bar grows
          const barH = interpolate(frame, [start + 4, start + 16], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${slideX}px)`,
                padding: "10px 10px 10px 14px",
                backgroundColor: BRAND.colors.cream,
                borderTop: `1px solid ${BRAND.colors.rule}`,
                borderBottom: `1px solid ${BRAND.colors.rule}`,
                display: "flex",
                flexDirection: "column",
                gap: 3,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent left bar */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: 4, height: `${barH * 100}%`,
                backgroundColor: accent,
              }} />

              {/* Ticker */}
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 12,
                letterSpacing: "0.08em", color: BRAND.colors.ink,
              }}>
                {sector.ticker ?? sector.name.slice(0, 5).toUpperCase()}
              </div>

              {/* Change % */}
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 22,
                color: accent, lineHeight: 1,
              }}>
                {sign}{safeChange.toFixed(2)}%
              </div>

              {/* Name */}
              <div style={{
                fontFamily: BRAND.fonts.body, fontSize: 9,
                color: BRAND.colors.inkFaint, fontStyle: "italic",
              }}>
                {sector.name.length > 14 ? sector.name.slice(0, 12) + "…" : sector.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
