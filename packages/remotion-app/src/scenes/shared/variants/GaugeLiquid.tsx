/**
 * GaugeLiquid — variant "manomètre liquide".
 * Un tube vertical qui se remplit comme du mercure avec une surface ondulée
 * et des bulles qui montent. Chiffre en gros à droite.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { GaugeOverlayProps } from "../GaugeOverlay";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

export const GaugeLiquid: React.FC<GaugeOverlayProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  accentColor = BRAND.colors.accentBull,
}) => {
  const frame = useCurrentFrame();
  const range = max - min || 1;
  const target = Math.max(0, Math.min(1, (value - min) / range));

  const fill = interpolate(frame, [10, 70], [0, target], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const counter = interpolate(frame, [10, 70], [min, value], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const wavePhase = frame * 0.18;

  const tubeW = 200, tubeH = 600;
  const liquidH = tubeH * fill;
  const waveAmp = 10;

  const wavePoints: string[] = [];
  for (let x = 0; x <= tubeW; x += 8) {
    const y = tubeH - liquidH + Math.sin(wavePhase + x * 0.04) * waveAmp;
    wavePoints.push(`${x},${y}`);
  }
  const wavePath = `M 0,${tubeH} L 0,${tubeH - liquidH} L ${wavePoints.join(" L ")} L ${tubeW},${tubeH} Z`;

  const titleOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const headlineOp = interpolate(frame, [4, 22], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [4, 22], [-20, 0], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const numOp = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const numScale = interpolate(frame, [60, 76], [1.3, 1], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 60,
    }}>
      <div style={{ position: "relative" }}>
        <svg width={tubeW + 80} height={tubeH + 60} viewBox={`0 0 ${tubeW + 80} ${tubeH + 60}`}>
          {[0, 25, 50, 75, 100].map((v, i) => {
            const y = tubeH - (v / 100) * tubeH;
            const tickOp = interpolate(frame, [i * 2, 12 + i * 2], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <g key={i} opacity={tickOp}>
                <line x1={tubeW + 4} y1={y} x2={tubeW + 24} y2={y}
                  stroke={BRAND.colors.ink} strokeWidth={2} />
                <text x={tubeW + 30} y={y + 5}
                  fontFamily={BRAND.fonts.mono} fontSize={14}
                  letterSpacing="0.1em" fill={BRAND.colors.ink}>{v}</text>
              </g>
            );
          })}
          <rect x={0} y={0} width={tubeW} height={tubeH}
            fill={BRAND.colors.creamDark}
            stroke={BRAND.colors.ink} strokeWidth={3} />
          <path d={wavePath} fill={accentColor} />
          {Array.from({ length: 8 }, (_, i) => {
            const phase = (((frame - i * 12) % 90) + 90) / 90 % 1;
            const y = tubeH - phase * liquidH;
            if (y > tubeH || y < tubeH - liquidH) return null;
            return (
              <circle key={i}
                cx={30 + ((i * 31) % (tubeW - 60))}
                cy={y}
                r={3 + Math.sin(i) * 2}
                fill={BRAND.colors.cream}
                opacity={1 - phase} />
            );
          })}
          <rect x={0} y={tubeH} width={tubeW} height={20}
            fill={BRAND.colors.ink} />
        </svg>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, minWidth: 600 }}>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 700,
          fontSize: 56, color: BRAND.colors.ink, lineHeight: 1.15,
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
          maxWidth: 700,
        }}>
          {label}
        </div>

        <div style={{
          display: "flex", alignItems: "baseline", gap: 16,
          opacity: numOp,
        }}>
          <div style={{
            fontFamily: BRAND.fonts.condensed, fontSize: 240,
            color: accentColor, lineHeight: 0.9,
            transform: `scale(${numScale})`,
            transformOrigin: "left bottom",
          }}>
            {Math.round(counter)}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.condensed, fontSize: 64,
            color: BRAND.colors.inkLight, lineHeight: 1,
          }}>
            / {max}
          </div>
        </div>
      </div>
    </div>
  );
};
