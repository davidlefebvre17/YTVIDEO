/**
 * GaugeStrip — variant "barre linéaire de cellules".
 * 50 cellules colorées qui s'allument de gauche à droite,
 * une aiguille marque la valeur, échelle textuelle dessous.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { GaugeOverlayProps } from "../GaugeOverlay";

const easeOut = Easing.out(Easing.cubic);

export const GaugeStrip: React.FC<GaugeOverlayProps> = ({
  label,
  value,
  min = 0,
  max = 100,
}) => {
  const frame = useCurrentFrame();
  const range = max - min || 1;
  const normalized = Math.max(0, Math.min(1, (value - min) / range));

  const animVal = interpolate(frame, [10, 60], [0, value], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const animNormalized = Math.max(0, Math.min(1, (animVal - min) / range));

  const w = 1200, h = 70;
  const cellCount = 50;
  const cellW = w / cellCount;
  const litCells = Math.round(animNormalized * cellCount);

  const titleOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const labelX = interpolate(frame, [4, 20], [-20, 0], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const labelOp = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const needleOp = interpolate(frame, [40, 56], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const numOp = interpolate(frame, [44, 60], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const scaleOp = interpolate(frame, [60, 76], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start" }}>
      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 700,
        fontSize: 56, color: BRAND.colors.ink, lineHeight: 1.1,
        opacity: labelOp,
        transform: `translateX(${labelX}px)`,
        maxWidth: 1000,
      }}>
        {label}
      </div>

      <div style={{ position: "relative", width: w, marginTop: 12 }}>
        <svg width={w} height={h + 60}>
          {Array.from({ length: cellCount }).map((_, i) => {
            const lit = i < litCells;
            const t = i / cellCount;
            const color = t < 0.25 ? BRAND.colors.accentBear
              : t < 0.5 ? "#8b4a1a"
              : t < 0.75 ? BRAND.colors.accentWarning
              : BRAND.colors.accentBull;
            const delay = i * 0.6;
            const cellOp = interpolate(frame, [10 + delay, 14 + delay], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <rect key={i}
                x={i * cellW + 2} y={0}
                width={cellW - 4} height={h}
                fill={lit ? color : BRAND.colors.creamDark}
                stroke={BRAND.colors.rule} strokeWidth={0.5}
                opacity={cellOp} />
            );
          })}
          <g transform={`translate(${animNormalized * w}, 0)`}>
            <polygon points={`0,${h + 4} -10,${h + 24} 10,${h + 24}`}
              fill={BRAND.colors.ink}
              opacity={needleOp} />
            <line x1={0} y1={-10} x2={0} y2={h + 4}
              stroke={BRAND.colors.ink} strokeWidth={3}
              opacity={needleOp} />
          </g>
        </svg>

        <div style={{
          position: "absolute",
          left: `${animNormalized * 100}%`, top: -54,
          transform: "translateX(-50%)",
          fontFamily: BRAND.fonts.condensed, fontSize: 56,
          color: BRAND.colors.ink,
          opacity: numOp,
        }}>
          {Math.round(animVal)}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: "0.16em",
          color: BRAND.colors.inkLight, marginTop: 20,
          opacity: scaleOp,
          textTransform: "uppercase",
        }}>
          <span>{min}</span>
          <span>{Math.round(min + range * 0.25)}</span>
          <span>{Math.round(min + range * 0.5)}</span>
          <span>{Math.round(min + range * 0.75)}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
};
