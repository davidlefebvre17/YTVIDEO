/**
 * MultiLaneRace — variant "course de chevaux".
 * Chaque actif est sur sa ligne, part du centre (0%), avance vers
 * sa performance finale en laissant une trace de cendre.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { MultiAssetBadgeProps } from "../MultiAssetBadge";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

export const MultiLaneRace: React.FC<MultiAssetBadgeProps> = ({
  assets,
  title,
}) => {
  const frame = useCurrentFrame();
  const sorted = [...assets].sort((a, b) => b.changePct - a.changePct).slice(0, 6);
  const maxAbs = Math.max(3, ...sorted.map(a => Math.abs(a.changePct)));

  const titleOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const axisOp = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: 1500, display: "flex", flexDirection: "column", gap: 18 }}>
      {title && (
        <div style={{
          opacity: titleOp,
          borderBottom: `2px solid ${BRAND.colors.ink}`, paddingBottom: 14,
        }}>
          <span style={{
            fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 800,
            fontSize: 52, color: BRAND.colors.ink,
          }}>
            {title}
          </span>
        </div>
      )}

      <div style={{ position: "relative", height: 90 * sorted.length }}>
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0, width: 2,
          background: BRAND.colors.ink,
          opacity: axisOp,
        }} />
        <div style={{
          position: "absolute", left: "50%", top: -18,
          fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: "0.2em",
          color: BRAND.colors.inkLight, transform: "translateX(-50%)",
          opacity: axisOp,
        }}>0%</div>

        {sorted.map((a, i) => {
          const start = 16 + i * 6;
          const op = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const targetPct = (a.changePct / maxAbs) * 50;
          const moveProg = interpolate(frame, [start, start + 60], [0, 1], {
            easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const x = targetPct * moveProg;
          const counter = a.changePct * moveProg;
          const trailCount = Math.floor(moveProg * 12);
          const color = a.changePct >= 0 ? BRAND.colors.accentBull : BRAND.colors.accentBear;
          const isWinner = i === 0;
          const isLast = i === sorted.length - 1;
          const lineY = i * 90 + 24;

          return (
            <React.Fragment key={a.symbol + i}>
              <div style={{
                position: "absolute", left: 0, right: 0, top: lineY + 38,
                height: 1, borderTop: `1px dashed ${BRAND.colors.rule}`,
                opacity: interpolate(frame, [12 + i * 2, 24 + i * 2], [0, 1], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                }),
              }} />
              <div style={{
                position: "absolute", right: 20, top: lineY + 12,
                fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: "0.18em",
                color: BRAND.colors.inkLight,
                opacity: op, textTransform: "uppercase",
              }}>
                {a.symbol}
              </div>
              {Array.from({ length: trailCount }, (_, t) => {
                const tx = (t / 12) * targetPct;
                return (
                  <div key={t} style={{
                    position: "absolute",
                    left: `calc(50% + ${tx}%)`, top: lineY + 36,
                    width: 6, height: 6, borderRadius: "50%",
                    background: color, opacity: 0.2 + 0.05 * t,
                    transform: "translate(-50%, -50%)",
                  }} />
                );
              })}
              <div style={{
                position: "absolute",
                left: `calc(50% + ${x}%)`, top: lineY,
                transform: "translate(-50%, 0)",
                opacity: op,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 28,
                  color, lineHeight: 1,
                }}>
                  {counter >= 0 ? "+" : ""}{counter.toFixed(2)}%
                </div>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: color,
                  border: isWinner || isLast ? `3px solid ${BRAND.colors.ink}` : "none",
                  boxShadow: isWinner ? `0 0 ${interpolate(frame, [70, 100], [0, 30], {
                    extrapolateLeft: "clamp", extrapolateRight: "clamp",
                  })}px ${color}` : "none",
                }} />
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: "italic", fontSize: 20,
                  fontWeight: 700, color: BRAND.colors.ink,
                }}>
                  {a.name ?? a.symbol}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Pas de badge "VAINQUEUR" hardcodé — le glow sur le premier point parle de lui-même */}
      </div>
    </div>
  );
};
