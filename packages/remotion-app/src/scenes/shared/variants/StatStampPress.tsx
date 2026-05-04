/**
 * StatStampPress — variant éditorial "tampon imprimerie".
 * Le chiffre est posé comme un tampon (slam scale), avec halo d'encre,
 * compteur animé, ligne d'encre qui se déploie, label en typewriter.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND, compactStatValue, formatCounterFr } from "@yt-maker/core";
import type { AnimatedStatProps } from "../AnimatedStat";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

export const StatStampPress: React.FC<AnimatedStatProps> = ({
  value,
  label,
  prefix = "",
  suffix = "%",
  decimals = 0,
  accentColor = BRAND.colors.accentBear,
}) => {
  const frame = useCurrentFrame();
  const isNegative = value < 0;
  const compact = compactStatValue(value, suffix);
  const target = Math.abs(compact.scaledTarget);
  const effectiveDecimals = decimals > 0 ? decimals : compact.decimals;

  const stampScale = interpolate(frame, [0, 18], [2.4, 1], {
    easing: easeOutBack,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stampRot = interpolate(frame, [0, 22], [-8, -2], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stampOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inkSpread = interpolate(frame, [10, 40], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const counter = interpolate(frame, [0, 28], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(frame, [22, 60], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelChars = label.split("");
  const kickerOp = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
      <div style={{ position: "relative" }}>
        {/* halo d'encre */}
        <div style={{
          position: "absolute", inset: -40,
          background: `radial-gradient(ellipse 60% 40% at 50% 55%, ${accentColor}1a, transparent 70%)`,
          opacity: inkSpread,
          filter: "blur(20px)",
        }} />
        {(() => {
          // Adaptive sizing : keep the giant stamp readable even with a long
          // suffix or value. Container budget is ~1400px wide.
          const fullText = `${isNegative ? '−' : prefix}${formatCounterFr(counter, effectiveDecimals)}${compact.scalePrefix}${compact.cleanSuffix ?? ''}`;
          const baseFs = 360;
          const charBudget = 1400 / (baseFs * 0.55);
          const fs = fullText.length > charBudget
            ? baseFs * (charBudget / fullText.length)
            : baseFs;
          const sufFs = fs * 0.6;  // suffix slightly smaller than main value
          return (
            <div style={{
              transform: `scale(${stampScale}) rotate(${stampRot}deg)`,
              opacity: stampOp,
              transformOrigin: "center",
              fontFamily: BRAND.fonts.condensed,
              fontSize: fs, lineHeight: 0.85,
              color: accentColor,
              letterSpacing: "-0.04em",
              display: "flex", alignItems: "baseline", gap: 12,
              maxWidth: 1400,
            }}>
              {isNegative && <span style={{ fontSize: sufFs * 1.1 }}>−</span>}
              {!isNegative && prefix && <span style={{ fontSize: sufFs }}>{prefix}</span>}
              <span>{formatCounterFr(counter, effectiveDecimals)}{compact.scalePrefix}</span>
              {compact.cleanSuffix && <span style={{ fontSize: sufFs }}>{compact.cleanSuffix}</span>}
            </div>
          );
        })()}
      </div>

      <div style={{
        width: 520 * lineW, height: 2, backgroundColor: BRAND.colors.ink,
      }} />

      <div style={{
        fontFamily: BRAND.fonts.display, fontSize: 38, fontStyle: "italic",
        color: BRAND.colors.inkMid, letterSpacing: "0.005em",
      }}>
        {labelChars.map((c, i) => {
          const op = interpolate(frame, [40 + i * 1.2, 44 + i * 1.2], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return <span key={i} style={{ opacity: op }}>{c}</span>;
        })}
      </div>
    </div>
  );
};
