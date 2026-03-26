/**
 * ScenarioFork — "Le Verdict" editorial fork.
 * Two dramatic columns face off: bull vs bear.
 * Central question stamps in, ink divider draws, panels slide from sides,
 * target prices stamp in last for dramatic effect.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface ScenarioForkProps {
  trunk: string;
  bullish: { condition: string; target: string; prob?: number };
  bearish: { condition: string; target: string; prob?: number };
  startFrame?: number;
  accentColor?: string;
}

export const ScenarioFork: React.FC<ScenarioForkProps> = ({
  trunk,
  bullish,
  bearish,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  // 1. Question stamps in
  const qScale = interpolate(rel, [0, 10], [1.15, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const qOp = interpolate(rel, [0, 6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 2. Accent underline draws
  const underlineW = interpolate(rel, [6, 20], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 3. Center divider draws
  const dividerH = interpolate(rel, [12, 26], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dividerOp = interpolate(rel, [12, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 4. Bull panel slides from left
  const bullX = interpolate(rel, [16, 30], [-80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bullOp = interpolate(rel, [16, 26], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 5. Bear panel slides from right
  const bearX = interpolate(rel, [20, 34], [80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bearOp = interpolate(rel, [20, 30], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 6. Targets stamp in
  const targetScale = interpolate(rel, [32, 42], [1.3, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const targetOp = interpolate(rel, [32, 38], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // 7. Prob bars fill
  const probFill = interpolate(rel, [40, 58], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: "100%", maxWidth: 860,
    }}>
      {/* ── Question ── */}
      <div style={{
        opacity: qOp,
        transform: `scale(${qScale})`,
        transformOrigin: "center",
        textAlign: "center",
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.display, fontSize: 22,
          fontWeight: 700, fontStyle: "italic",
          color: BRAND.colors.ink, lineHeight: 1.3,
        }}>
          {trunk}
        </div>
      </div>

      {/* Accent underline */}
      <div style={{
        width: `${underlineW}%`, height: 2,
        backgroundColor: BRAND.colors.ink,
        marginBottom: 16,
      }} />

      {/* ── Two panels + center divider ── */}
      <div style={{
        display: "flex", width: "100%",
        position: "relative", minHeight: 200,
      }}>
        {/* Center divider */}
        <div style={{
          position: "absolute",
          left: "50%", top: 0,
          width: 1, height: `${dividerH}%`,
          backgroundColor: BRAND.colors.rule,
          opacity: dividerOp,
          transform: "translateX(-50%)",
        }} />

        {/* "ou" circle on divider */}
        <div style={{
          position: "absolute",
          left: "50%", top: "40%",
          transform: "translate(-50%, -50%)",
          width: 32, height: 32,
          borderRadius: "50%",
          backgroundColor: BRAND.colors.cream,
          border: `1.5px solid ${BRAND.colors.rule}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: dividerOp,
          zIndex: 2,
        }}>
          <span style={{
            fontFamily: BRAND.fonts.mono, fontSize: 9,
            letterSpacing: "0.1em", color: BRAND.colors.inkLight,
          }}>
            OU
          </span>
        </div>

        {/* ── Bull panel ── */}
        <div style={{
          flex: 1,
          opacity: bullOp,
          transform: `translateX(${bullX}px)`,
          paddingRight: 24,
        }}>
          {/* Arrow + label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 12,
          }}>
            <svg width={28} height={28} viewBox="0 0 28 28">
              <polygon points="14,2 26,22 2,22"
                fill={BRAND.colors.accentBull} />
            </svg>
            <span style={{
              fontFamily: BRAND.fonts.condensed, fontSize: 20,
              letterSpacing: "0.15em",
              color: BRAND.colors.accentBull,
            }}>
              HAUSSIER
            </span>
          </div>

          {/* Condition */}
          <div style={{
            fontFamily: BRAND.fonts.body, fontSize: 17,
            fontStyle: "italic",
            color: BRAND.colors.inkMid, lineHeight: 1.6,
            marginBottom: 16,
            borderLeft: `3px solid ${BRAND.colors.accentBull}40`,
            paddingLeft: 14,
          }}>
            {bullish.condition}
          </div>

          {/* Target — stamps in */}
          {bullish.target && (
            <div style={{
              opacity: targetOp,
              transform: `scale(${targetScale})`,
              transformOrigin: "left center",
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 9,
                letterSpacing: "0.15em", color: BRAND.colors.inkLight,
                marginBottom: 4,
              }}>
                CIBLE
              </div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 40,
                color: BRAND.colors.accentBull, lineHeight: 1,
              }}>
                {bullish.target}
              </div>
            </div>
          )}

          {/* Prob bar */}
          {bullish.prob != null && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                width: "80%", height: 6,
                backgroundColor: BRAND.colors.creamDark,
                borderRadius: 3,
              }}>
                <div style={{
                  width: `${bullish.prob * probFill}%`, height: "100%",
                  backgroundColor: BRAND.colors.accentBull,
                  borderRadius: 3,
                }} />
              </div>
              <span style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 16,
                color: BRAND.colors.accentBull, marginTop: 4, display: "block",
              }}>
                {Math.round(bullish.prob * probFill)}%
              </span>
            </div>
          )}
        </div>

        {/* ── Bear panel ── */}
        <div style={{
          flex: 1,
          opacity: bearOp,
          transform: `translateX(${bearX}px)`,
          paddingLeft: 24,
        }}>
          {/* Arrow + label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 12,
          }}>
            <svg width={28} height={28} viewBox="0 0 28 28">
              <polygon points="14,26 26,6 2,6"
                fill={BRAND.colors.accentBear} />
            </svg>
            <span style={{
              fontFamily: BRAND.fonts.condensed, fontSize: 20,
              letterSpacing: "0.15em",
              color: BRAND.colors.accentBear,
            }}>
              BAISSIER
            </span>
          </div>

          {/* Condition */}
          <div style={{
            fontFamily: BRAND.fonts.body, fontSize: 17,
            fontStyle: "italic",
            color: BRAND.colors.inkMid, lineHeight: 1.6,
            marginBottom: 16,
            borderLeft: `3px solid ${BRAND.colors.accentBear}40`,
            paddingLeft: 14,
          }}>
            {bearish.condition}
          </div>

          {/* Target — stamps in */}
          {bearish.target && (
            <div style={{
              opacity: targetOp,
              transform: `scale(${targetScale})`,
              transformOrigin: "left center",
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 9,
                letterSpacing: "0.15em", color: BRAND.colors.inkLight,
                marginBottom: 4,
              }}>
                CIBLE
              </div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 40,
                color: BRAND.colors.accentBear, lineHeight: 1,
              }}>
                {bearish.target}
              </div>
            </div>
          )}

          {/* Prob bar */}
          {bearish.prob != null && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                width: "80%", height: 6,
                backgroundColor: BRAND.colors.creamDark,
                borderRadius: 3,
              }}>
                <div style={{
                  width: `${bearish.prob * probFill}%`, height: "100%",
                  backgroundColor: BRAND.colors.accentBear,
                  borderRadius: 3,
                }} />
              </div>
              <span style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 16,
                color: BRAND.colors.accentBear, marginTop: 4, display: "block",
              }}>
                {Math.round(bearish.prob * probFill)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
