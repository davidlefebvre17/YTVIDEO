/**
 * ScenarioBattle — variant "diptyque combat".
 * La question centrale, puis deux camps qui slide en miroir avec triangle bull/bear,
 * cible géante chiffrée, barre de probabilité animée.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { ScenarioForkProps } from "../ScenarioFork";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

interface SidePanelProps {
  kind: "bull" | "bear";
  label: string;
  color: string;
  cond: string;
  target: string;
  prob?: number;
  dir: "left" | "right";
  frame: number;
}

const SidePanel: React.FC<SidePanelProps> = ({
  kind, label, color, cond, target, prob, dir, frame,
}) => {
  const start = dir === "left" ? 28 : 36;
  const slideX = interpolate(frame, [start, start + 18], [dir === "left" ? -100 : 100, 0], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const op = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const targStart = 60 + (dir === "left" ? 0 : 6);
  const tScale = interpolate(frame, [targStart, targStart + 14], [1.4, 1], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const tOp = interpolate(frame, [targStart, targStart + 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const probFill = prob !== undefined
    ? interpolate(frame, [80, 110], [0, prob / 100], {
        easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div style={{
      opacity: op, transform: `translateX(${slideX}px)`,
      padding: "0 28px",
      display: "flex", flexDirection: "column", gap: 16,
      alignItems: dir === "left" ? "flex-end" : "flex-start",
      textAlign: dir === "left" ? "right" : "left",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        flexDirection: dir === "left" ? "row-reverse" : "row",
      }}>
        <svg width={44} height={44} viewBox="0 0 28 28">
          <polygon
            points={kind === "bull" ? "14,2 26,22 2,22" : "14,26 26,6 2,6"}
            fill={color} />
        </svg>
        <span style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 36,
          letterSpacing: "0.18em", color, textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontFamily: BRAND.fonts.body, fontStyle: "italic", fontSize: 22,
        color: BRAND.colors.inkMid, lineHeight: 1.5, maxWidth: 480,
        borderLeft: dir === "right" ? `3px solid ${color}66` : "none",
        borderRight: dir === "left" ? `3px solid ${color}66` : "none",
        paddingLeft: dir === "right" ? 14 : 0,
        paddingRight: dir === "left" ? 14 : 0,
      }}>
        {cond}
      </div>

      <div style={{
        opacity: tOp, transform: `scale(${tScale})`,
        transformOrigin: dir === "left" ? "right" : "left",
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: "0.2em",
          color: BRAND.colors.inkLight, textTransform: "uppercase",
        }}>
          Cible
        </div>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 100,
          color, lineHeight: 0.95,
        }}>
          {target}
        </div>
      </div>

      {prob !== undefined && (
        <div style={{ width: 280, marginTop: 4 }}>
          <div style={{
            fontFamily: BRAND.fonts.mono, fontSize: 11, letterSpacing: "0.2em",
            color: BRAND.colors.inkLight, marginBottom: 6,
            textTransform: "uppercase",
          }}>
            Probabilité
          </div>
          <div style={{
            width: "100%", height: 8, background: BRAND.colors.creamDeep,
          }}>
            <div style={{
              width: `${probFill * 100}%`, height: "100%", background: color,
            }} />
          </div>
          <div style={{
            fontFamily: BRAND.fonts.condensed, fontSize: 24, color, marginTop: 4,
          }}>
            {Math.round(probFill * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export const ScenarioBattle: React.FC<ScenarioForkProps> = ({
  trunk,
  bullish,
  bearish,
}) => {
  const frame = useCurrentFrame();

  const kickerOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const trunkOp = interpolate(frame, [4, 22], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const trunkScale = interpolate(frame, [4, 22], [0.92, 1], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const ruleW = interpolate(frame, [16, 36], [0, 380], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dividerH = interpolate(frame, [22, 50], [0, 320], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dividerOp = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      width: 1500, display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
    }}>
      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: "italic", fontWeight: 800,
        fontSize: 56, color: BRAND.colors.ink, textAlign: "center", lineHeight: 1.15,
        opacity: trunkOp,
        transform: `scale(${trunkScale})`,
        maxWidth: 1200,
      }}>
        {trunk}
      </div>
      <div style={{
        width: ruleW, height: 3,
        background: BRAND.colors.ink,
      }} />

      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0,
        width: "100%", marginTop: 24,
      }}>
        <SidePanel
          kind="bull"
          label="Haussier"
          color={BRAND.colors.accentBull}
          cond={bullish.condition}
          target={bullish.target}
          prob={bullish.prob}
          dir="left"
          frame={frame}
        />

        <div style={{
          width: 80, position: "relative",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        }}>
          <div style={{
            width: 1, height: dividerH,
            background: BRAND.colors.rule, opacity: dividerOp,
            marginTop: 24,
          }} />
          <div style={{
            position: "absolute", top: 140,
            width: 56, height: 56, borderRadius: "50%",
            background: BRAND.colors.cream, border: `2px solid ${BRAND.colors.ink}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: dividerOp,
          }}>
            <span style={{
              fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: "0.1em",
              color: BRAND.colors.ink, textTransform: "uppercase",
            }}>
              ou
            </span>
          </div>
        </div>

        <SidePanel
          kind="bear"
          label="Baissier"
          color={BRAND.colors.accentBear}
          cond={bearish.condition}
          target={bearish.target}
          prob={bearish.prob}
          dir="right"
          frame={frame}
        />
      </div>
    </div>
  );
};
