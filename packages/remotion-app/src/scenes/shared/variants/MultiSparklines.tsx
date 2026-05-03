/**
 * MultiSparklines — variant "tableau de mini-courbes".
 * Chaque actif a sa propre carte avec sparkline animée (draw-in)
 * et compteur sur le pourcentage.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { MultiAssetBadgeProps } from "../MultiAssetBadge";

const easeOut = Easing.out(Easing.cubic);

export const MultiSparklines: React.FC<MultiAssetBadgeProps> = ({
  assets,
  title,
}) => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const visibleAssets = assets.slice(0, 6);

  // Largeur adaptative : 240px par carte + 16px gap, plafonnée à 1500
  const cardW = 240, gap = 16;
  const totalW = visibleAssets.length * cardW + (visibleAssets.length - 1) * gap;
  const containerW = Math.min(1500, totalW);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: containerW }}>
      {title && (
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 700,
          fontSize: 36, color: BRAND.colors.ink, opacity: titleOp,
          borderBottom: `1px solid ${BRAND.colors.rule}`, paddingBottom: 10,
        }}>
          {title}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${visibleAssets.length}, ${cardW}px)`,
        gap,
      }}>
        {visibleAssets.map((a, i) => {
          const start = 12 + i * 8;
          const op = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const draw = interpolate(frame, [start + 4, start + 50], [0, 1], {
            easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const counter = interpolate(frame, [start + 6, start + 36], [0, a.changePct], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const color = a.changePct >= 0 ? BRAND.colors.accentBull : BRAND.colors.accentBear;
          // Vraie trajectoire de prix si dispo, sinon ligne plate (pas de fake)
          const pts = (a.pricePath && a.pricePath.length >= 2) ? a.pricePath : null;
          const W = 200, H = 110;
          const path = pts ? (() => {
            const minV = Math.min(...pts), maxV = Math.max(...pts);
            const rng = maxV - minV || 1;
            return pts.map((v, idx) => {
              const x = (idx / (pts.length - 1)) * W;
              const y = H - ((v - minV) / rng) * H;
              return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }).join(" ");
          })() : `M 0 ${H * 0.5} L ${W} ${H * 0.5}`;
          const totalLen = 600;
          return (
            <div key={a.symbol + i} style={{
              opacity: op, padding: "20px 18px",
              background: BRAND.colors.cream,
              border: `1.5px solid ${BRAND.colors.ink}`,
              display: "flex", flexDirection: "column", gap: 10,
              minHeight: 320,
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: "0.2em",
                color: BRAND.colors.inkLight,
              }}>
                {a.symbol}
              </div>
              <div style={{
                fontFamily: BRAND.fonts.display, fontStyle: "italic", fontSize: 22,
                fontWeight: 700, color: BRAND.colors.ink, lineHeight: 1.1,
                minHeight: 50,
              }}>
                {a.name ?? a.symbol}
              </div>

              <svg width={W} height={H} style={{ marginTop: 6 }}>
                <line x1={0} y1={H * 0.55} x2={W} y2={H * 0.55}
                  stroke={BRAND.colors.inkFaint} strokeWidth={1} strokeDasharray="3 3" />
                <path d={path} fill="none" stroke={color} strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeDasharray={totalLen}
                  strokeDashoffset={totalLen * (1 - draw)} />
              </svg>

              {a.price !== undefined && (
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 32, color: BRAND.colors.ink, lineHeight: 1,
                }}>
                  {a.price.toLocaleString("fr-FR")}
                </div>
              )}
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 24, color, lineHeight: 1,
              }}>
                {counter >= 0 ? "+" : ""}{counter.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
