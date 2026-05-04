/**
 * NumberAvalanche — variant "cascade de chiffres".
 * Une avalanche de chiffres tombent du haut en arrière-plan ;
 * au milieu, le chiffre cible se fige avec un kicker tampon.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND, compactStatValue, formatCounterFr } from "@yt-maker/core";
import type { AnimatedStatProps } from "../AnimatedStat";

const easeOutBack = Easing.out(Easing.back(1.7));

const FLOATING_TEXTS = ["+0,4%", "+1,1%", "+0,8%", "−0,3%", "−2,1%", "+5471", "−25pb", "+62", "+1,82%"];

export const NumberAvalanche: React.FC<AnimatedStatProps> = ({
  value,
  label,
  prefix = "",
  suffix = "%",
  decimals = 0,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const isPositive = value >= 0;
  const color = accentColor ?? (isPositive ? BRAND.colors.accentBull : BRAND.colors.accentBear);
  const W = 1600, H = 800;
  const numbersCount = 50;

  const numbers = Array.from({ length: numbersCount }, (_, i) => {
    const seed = i * 2.7 + 1;
    const x = ((Math.sin(seed * 13) * 0.5 + 0.5)) * W;
    const fallStart = i * 1.5;
    const fallSpeed = 6 + Math.sin(seed * 7) * 2;
    const y = ((frame - fallStart) * fallSpeed) % (H + 200) - 100;
    const txt = FLOATING_TEXTS[i % FLOATING_TEXTS.length];
    const op = 0.14 + Math.abs(Math.sin(seed)) * 0.18;
    const size = 24 + Math.abs(Math.sin(seed * 3)) * 36;
    return { x, y, txt, op, size, rot: Math.sin(i) * 14 };
  });

  const kickerOp = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const heroOp = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const heroScale = interpolate(frame, [60, 80], [0.6, 1], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const labelOp = interpolate(frame, [90, 110], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const sign = isPositive ? "+" : "−";
  const compact = compactStatValue(value, suffix);
  const absScaled = Math.abs(compact.scaledTarget);
  const effectiveDecimals = decimals > 0 ? decimals : compact.decimals;

  return (
    <div style={{
      width: W, height: H, position: "relative", overflow: "hidden",
      // Pas de fond plein : le variant s'overlay sur l'image d'épisode existante
    }}>
      {numbers.map((n, i) => (
        <div key={i} style={{
          position: "absolute",
          left: n.x, top: n.y,
          fontFamily: BRAND.fonts.condensed,
          fontSize: n.size, color: BRAND.colors.ink,
          opacity: n.op,
          transform: `rotate(${n.rot}deg)`,
        }}>
          {n.txt}
        </div>
      ))}

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        opacity: heroOp,
        transform: `scale(${heroScale})`,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: "0.32em",
          color, background: BRAND.colors.cream,
          padding: "8px 20px",
          border: `2px solid ${color}`, textTransform: "uppercase",
        }}>
          {label}
        </div>
        {(() => {
          // Adaptive size — long suffix would otherwise overflow horizontally
          // beyond W=1600.
          const fullText = `${prefix || sign}${formatCounterFr(absScaled, effectiveDecimals)}${compact.scalePrefix}${compact.cleanSuffix ?? ''}`;
          const baseFs = 380;
          const charBudget = (W - 80) / (baseFs * 0.55);
          const fs = fullText.length > charBudget
            ? baseFs * (charBudget / fullText.length)
            : baseFs;
          return (
            <div style={{
              fontFamily: BRAND.fonts.condensed, fontSize: fs,
              color, lineHeight: 0.85,
              textShadow: `4px 4px 0 ${BRAND.colors.ink}`,
              maxWidth: W - 80,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}>
              {fullText}
            </div>
          );
        })()}
        {/* Pas de baseline éditoriale présomptueuse — le label prop est déjà au-dessus du chiffre */}
      </div>
    </div>
  );
};
