/**
 * GaugeOverlay — Newspaper-style meter with tick marks, zone labels,
 * ink needle sweep, and stamped value.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface GaugeOverlayProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  accentColor?: string;
  startFrame?: number;
  durationFrames?: number;
  variant?: 'default' | 'strip' | 'liquid';
}

export const GaugeOverlay: React.FC<GaugeOverlayProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
  durationFrames = 45,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const safeMin = typeof min === "number" && Number.isFinite(min) ? min : 0;
  const safeMax = typeof max === "number" && Number.isFinite(max) ? max : 100;

  const progress = interpolate(rel, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  const range = safeMax - safeMin || 1;
  const normalizedValue = Math.max(0, Math.min(1, (safeValue - safeMin) / range));
  const currentAngle = Math.min(179, normalizedValue * progress * 180);
  const currentValue = interpolate(rel, [0, durationFrames], [0, safeValue], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Stamp effect on value
  const stampScale = interpolate(rel, [durationFrames * 0.6, durationFrames * 0.6 + 10], [1.3, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const stampOp = interpolate(rel, [durationFrames * 0.6, durationFrames * 0.6 + 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const r = 70;
  const cx = 110;
  const cy = 105;
  const strokeW = 10;

  // Arc paths — built as polyline to avoid SVG arc ambiguity
  function arcPoints(radius: number, startDeg: number, endDeg: number, steps: number) {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const deg = startDeg + (endDeg - startDeg) * (i / steps);
      const rad = (deg * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy - radius * Math.sin(rad);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts;
  }
  const bgPts = arcPoints(r, 180, 0, 60);
  const bgPath = `M ${bgPts.join(' L ')}`;
  const valPts = arcPoints(r, 180, 180 - currentAngle, Math.max(2, Math.round(currentAngle / 3)));
  const valuePath = currentAngle > 0 ? `M ${valPts.join(' L ')}` : "";

  // Needle
  const needleR = r - 18;
  const needleAngleRad = ((180 - currentAngle) * Math.PI) / 180;
  const needleX = cx + needleR * Math.cos(needleAngleRad);
  const needleY = cy - needleR * Math.sin(needleAngleRad);

  const opacity = interpolate(rel, [0, 8], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Tick marks (every 30°)
  const ticks = Array.from({ length: 7 }, (_, i) => {
    const angle = i * 30;
    const rad = (Math.PI * (180 - angle)) / 180;
    const outerR = r + 6;
    const innerR = r + 14;
    return {
      x1: cx + outerR * Math.cos(rad),
      y1: cy - outerR * Math.sin(rad),
      x2: cx + innerR * Math.cos(rad),
      y2: cy - innerR * Math.sin(rad),
    };
  });

  // Zone label positions
  const labelR = r + 24;
  const zones = [
    { angle: 150, text: label.includes("RSI") ? "SURVENDU" : "PEUR" },
    { angle: 90, text: "NEUTRE" },
    { angle: 30, text: label.includes("RSI") ? "SURACHETÉ" : "EUPHORIE" },
  ];

  return (
    <div style={{
      opacity, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 6,
    }}>
      <svg width={220} height={130} viewBox="0 0 220 130" style={{ overflow: 'visible' }}>
        {/* Background arc (slightly wider as rail) */}
        <path d={bgPath} fill="none"
          stroke={BRAND.colors.inkFaint} strokeWidth={strokeW + 4} strokeLinecap="round" />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={BRAND.colors.inkLight} strokeWidth={1.5} />
        ))}

        {/* Zone labels */}
        {zones.map((z, i) => {
          const rad = (Math.PI * z.angle) / 180;
          return (
            <text key={i}
              x={cx + labelR * Math.cos(rad)}
              y={cy - labelR * Math.sin(rad)}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily={BRAND.fonts.mono} fontSize={7}
              letterSpacing="0.1em" fill={BRAND.colors.inkFaint}>
              {z.text}
            </text>
          );
        })}

        {/* Value arc */}
        {valuePath && (
          <path d={valuePath} fill="none"
            stroke={accentColor} strokeWidth={strokeW} strokeLinecap="round" />
        )}

        {/* Needle line */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke={BRAND.colors.ink} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={BRAND.colors.ink} />
      </svg>

      {/* Value — stamp effect */}
      <div style={{
        transform: `scale(${stampScale})`,
        opacity: stampOp,
        marginTop: -16,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 38,
          color: accentColor, lineHeight: 1,
        }}>
          {Math.round(currentValue)}
        </span>
      </div>

      {/* Label — typewriter substring (texte réel pour que letter-spacing fonctionne) */}
      {(() => {
        const totalChars = label.length;
        const revealStart = durationFrames * 0.7;
        const revealEnd = revealStart + Math.max(totalChars, 12);
        const visibleChars = Math.round(
          interpolate(rel, [revealStart, revealEnd], [0, totalChars], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        );
        return (
          <div
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: BRAND.colors.inkLight,
              whiteSpace: "nowrap",
              textAlign: "center",
              maxWidth: 360,
              overflow: "hidden",
            }}
          >
            {label.slice(0, visibleChars)}
          </div>
        );
      })()}
    </div>
  );
};
