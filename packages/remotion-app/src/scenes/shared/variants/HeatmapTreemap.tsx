/**
 * HeatmapTreemap — variant "treemap qui se compose".
 * Cellules de tailles variables (par poids), apparaissent + scale-pop,
 * remplissage couleur graduel, légère pulsation continue.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { HeatmapGridProps } from "../HeatmapGrid";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

function colorFor(c: number): string {
  if (c >= 1.5) return BRAND.colors.accentBull;
  if (c >= 0) return "#3d7a4f";
  if (c >= -1) return "#8b4a1a";
  return BRAND.colors.accentBear;
}

// Heuristique pour répartir 8 secteurs sur une grille 4×3 avec poids variable
const TREEMAP_AREAS = [
  { area: "tech",   colSpan: 1, rowSpan: 2, colStart: 1 },
  { area: "fin",    colSpan: 1, rowSpan: 2, colStart: 2 },
  { area: "cons",   colSpan: 1, rowSpan: 1, colStart: 3 },
  { area: "indu",   colSpan: 1, rowSpan: 1, colStart: 4 },
  { area: "enrg",   colSpan: 1, rowSpan: 1, colStart: 3 },
  { area: "sante",  colSpan: 1, rowSpan: 1, colStart: 4 },
  { area: "util",   colSpan: 2, rowSpan: 1, colStart: 1 },
  { area: "mat",    colSpan: 2, rowSpan: 1, colStart: 3 },
];

export const HeatmapTreemap: React.FC<HeatmapGridProps> = ({
  sectors,
  title,
}) => {
  const frame = useCurrentFrame();

  const titleOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Trier par |change| desc pour assigner les plus gros d'abord aux grosses cellules
  const sorted = [...sectors].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 8);

  return (
    <div style={{ width: 1500, display: "flex", flexDirection: "column", gap: 20 }}>
      {title && (
        <div style={{
          opacity: titleOp,
          borderBottom: `2px solid ${BRAND.colors.ink}`, paddingBottom: 12,
        }}>
          <span style={{
            fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 800,
            fontSize: 56, color: BRAND.colors.ink,
          }}>
            {title}
          </span>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "32fr 22fr 18fr 12fr",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: 6, height: 540,
      }}>
        {sorted.map((s, i) => {
          const cfg = TREEMAP_AREAS[i] ?? { colSpan: 1, rowSpan: 1, colStart: ((i % 4) + 1) };
          const start = 14 + i * 5;
          const op = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const scale = interpolate(frame, [start, start + 18], [0.4, 1], {
            easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const fillProg = interpolate(frame, [start + 8, start + 26], [0, 1], {
            easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const pulseAmp = interpolate(frame, [start + 30, start + 60], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const pulse = 1 + Math.sin((frame - start) * 0.15) * 0.02 * pulseAmp;
          const counter = interpolate(frame, [start + 6, start + 26], [0, s.change], {
            easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const color = colorFor(s.change);
          const isLarge = cfg.colSpan + cfg.rowSpan >= 3;
          const isMed = cfg.colSpan + cfg.rowSpan === 2;
          return (
            <div key={i} style={{
              gridColumn: `${cfg.colStart} / span ${cfg.colSpan}`,
              gridRow: `span ${cfg.rowSpan}`,
              opacity: op,
              transform: `scale(${scale * pulse})`,
              transformOrigin: "center",
              background: BRAND.colors.cream,
              border: `2px solid ${BRAND.colors.ink}`,
              position: "relative", overflow: "hidden",
              padding: "14px 16px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              {/* Calcule l'intensité visible : fillProg + magnitude — sinon le texte cream
                  sur fond peu coloré est illisible */}
              {(() => {
                const fillIntensity = fillProg * Math.min(1, Math.abs(s.change) / 3) * 0.85;
                const isDarkBg = fillIntensity > 0.45; // seuil sur l'opacité réellement rendue
                return (
                  <>
                    <div style={{
                      position: "absolute", inset: 0,
                      background: color,
                      opacity: fillIntensity,
                      clipPath: `inset(${100 - fillProg * 100}% 0 0 0)`,
                    }} />
                    <div style={{ position: "relative" }}>
                      <div style={{
                        fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 700,
                        fontSize: isLarge ? 36 : isMed ? 28 : 22,
                        color: isDarkBg ? BRAND.colors.cream : BRAND.colors.ink,
                        lineHeight: 1,
                      }}>
                        {s.name}
                      </div>
                      {s.ticker && (
                        <div style={{
                          fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: "0.2em",
                          color: isDarkBg ? BRAND.colors.creamDark : BRAND.colors.inkLight,
                          marginTop: 4,
                        }}>{s.ticker}</div>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        fontFamily: BRAND.fonts.condensed,
                        fontSize: isLarge ? 84 : isMed ? 56 : 36,
                        color: isDarkBg ? BRAND.colors.cream : color,
                        lineHeight: 0.9,
                      }}>
                        {counter >= 0 ? "+" : ""}{counter.toFixed(1)}%
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
