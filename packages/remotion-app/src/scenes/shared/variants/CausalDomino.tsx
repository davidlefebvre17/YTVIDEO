/**
 * CausalDomino — variant "domino éditorial".
 * Chaque étape devient une carte à bordure noire avec ombre portée,
 * inclinée alternativement, reliée par une flèche manuscrite.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { CausalChainProps } from "../CausalChain";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

export const CausalDomino: React.FC<CausalChainProps> = ({
  steps,
  accentColor = BRAND.colors.accentDefault,
}) => {
  const frame = useCurrentFrame();

  const ruleW = interpolate(frame, [10, 40], [0, 320], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18,
    }}>
      {/* Petite barre d'accent en entrée — pas de titre générique redondant */}
      <div style={{
        width: ruleW, height: 4,
        background: accentColor, marginBottom: 8,
      }} />

      <div style={{
        position: "relative", display: "flex", alignItems: "stretch", gap: 0,
        flexWrap: "wrap",
      }}>
        {steps.map((s, i) => {
          const start = 18 + i * 16;
          const sl = interpolate(frame, [start, start + 18], [-60, 0], {
            easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const op = interpolate(frame, [start, start + 12], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const arrowProg = interpolate(frame, [start + 10, start + 24], [0, 1], {
            easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const isLast = i === steps.length - 1;
          const tilt = i % 2 === 0 ? -1.2 : 1.2;
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: op,
                transform: `translateX(${sl}px) rotate(${tilt}deg)`,
                width: 240, padding: "20px 18px",
                background: BRAND.colors.cream,
                border: `2px solid ${BRAND.colors.ink}`,
                boxShadow: `8px 8px 0 ${BRAND.colors.ink}`,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 48,
                  color: accentColor, lineHeight: 0.9,
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: "italic",
                  fontWeight: 700, fontSize: 22, color: BRAND.colors.ink,
                  lineHeight: 1.25,
                }}>
                  {s.label}
                </div>
                {s.sublabel && (
                  <div style={{
                    fontFamily: BRAND.fonts.mono, fontSize: 12,
                    letterSpacing: "0.14em", color: accentColor,
                    paddingTop: 6, borderTop: `1px dashed ${BRAND.colors.rule}`,
                    textTransform: "uppercase",
                  }}>
                    {s.sublabel}
                  </div>
                )}
              </div>

              {!isLast && (
                <div style={{
                  width: 60, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width={60} height={40} viewBox="0 0 60 40">
                    <defs>
                      <marker id={`ar${i}`} viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill={BRAND.colors.ink} />
                      </marker>
                    </defs>
                    <path
                      d={`M 4 20 Q 30 ${i % 2 === 0 ? -2 : 42} 54 20`}
                      stroke={BRAND.colors.ink} strokeWidth={2.5}
                      fill="none" strokeLinecap="round"
                      strokeDasharray={120}
                      strokeDashoffset={120 - arrowProg * 120}
                      markerEnd={`url(#ar${i})`}
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
