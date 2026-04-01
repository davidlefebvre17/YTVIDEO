/**
 * ScenarioFork — Animated chart that splits into bull/bear paths.
 *
 * 1. Mini price chart draws itself (evolvePath)
 * 2. Chart SPLITS: green line up, red line down
 * 3. Markers follow each branch (getPointAtLength)
 * 4. Price targets spring in at endpoints
 * 5. Conditions fade in below
 */
import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { evolvePath, getPointAtLength, getLength } from "@remotion/paths";
import { BRAND } from "@yt-maker/core";

interface ScenarioForkProps {
  trunk: string;
  bullish: { condition: string; target: string; prob?: number };
  bearish: { condition: string; target: string; prob?: number };
  startFrame?: number;
  accentColor?: string;
}

// Chart dimensions — sized for 1920x1080 overlay
const W = 1100;
const H = 440;
const CX = W * 0.38; // split point X (slightly left of center)
const CHART_TOP = 60;
const CHART_BOT = 380;
const CHART_MID = (CHART_TOP + CHART_BOT) / 2;
const RIGHT_END = W - 60;
const BRANCH_LEN = RIGHT_END - CX;

// Base price line (recent trend — slightly downward ending at split)
const BASE_PATH = `M 50 ${CHART_MID - 40} C 140 ${CHART_MID - 60}, 200 ${CHART_MID + 25}, 260 ${CHART_MID - 15} C 320 ${CHART_MID - 50}, 370 ${CHART_MID + 15}, ${CX} ${CHART_MID}`;

// Bull path — curves upward from split
const BULL_PATH = `M ${CX} ${CHART_MID} C ${CX + BRANCH_LEN * 0.15} ${CHART_MID - 35}, ${CX + BRANCH_LEN * 0.35} ${CHART_MID - 15}, ${CX + BRANCH_LEN * 0.5} ${CHART_MID - 55} C ${CX + BRANCH_LEN * 0.65} ${CHART_MID - 80}, ${CX + BRANCH_LEN * 0.8} ${CHART_MID - 50}, ${RIGHT_END} ${CHART_MID - 95}`;

// Bear path — curves downward from split
const BEAR_PATH = `M ${CX} ${CHART_MID} C ${CX + BRANCH_LEN * 0.15} ${CHART_MID + 35}, ${CX + BRANCH_LEN * 0.35} ${CHART_MID + 15}, ${CX + BRANCH_LEN * 0.5} ${CHART_MID + 55} C ${CX + BRANCH_LEN * 0.65} ${CHART_MID + 80}, ${CX + BRANCH_LEN * 0.8} ${CHART_MID + 50}, ${RIGHT_END} ${CHART_MID + 95}`;

/** Try to extract a short price label from a condition string (old format fallback) */
function extractTarget(condition: string): string {
  const m = condition.match(/(\d[\d\s,.]*\$)/);
  return m ? m[1].trim() : '';
}

export const ScenarioFork: React.FC<ScenarioForkProps> = ({
  trunk,
  bullish,
  bearish,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - startFrame;
  const time = rel / fps;

  // Resolve targets (new format has them split, old format we extract from condition)
  const bullTarget = bullish.target || extractTarget(bullish.condition);
  const bearTarget = bearish.target || extractTarget(bearish.condition);

  // Path lengths
  const bullLen = useMemo(() => getLength(BULL_PATH), []);
  const bearLen = useMemo(() => getLength(BEAR_PATH), []);

  // ── Phase 1: Base chart draws (0-25f) ──
  const baseDraw = interpolate(rel, [0, 25], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const baseEvolve = evolvePath(baseDraw, BASE_PATH);

  // ── Phase 2: Split label appears (20-28f) ──
  const splitOp = interpolate(rel, [20, 28], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ── Phase 3: Bull + Bear paths draw simultaneously (25-55f) ──
  const branchDraw = interpolate(rel, [25, 55], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bullEvolve = evolvePath(branchDraw, BULL_PATH);
  const bearEvolve = evolvePath(branchDraw, BEAR_PATH);

  // ── Phase 3b: Markers follow paths ──
  const bullMarkerPos = branchDraw > 0 ? getPointAtLength(BULL_PATH, branchDraw * bullLen) : null;
  const bearMarkerPos = branchDraw > 0 ? getPointAtLength(BEAR_PATH, branchDraw * bearLen) : null;

  // ── Phase 4: Targets stamp in (52-62f) ──
  const targetScale = spring({
    frame: Math.max(0, rel - 52), fps,
    config: { stiffness: 180, damping: 12 },
  });

  // ── Phase 5: Conditions fade (58-70f) ──
  const condOp = interpolate(rel, [58, 70], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: "100%", maxWidth: 1200,
    }}>
      {/* Trunk question / asset label */}
      <div style={{
        opacity: interpolate(rel, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        fontFamily: BRAND.fonts.display,
        fontSize: trunk.length > 80 ? 22 : trunk.length > 60 ? 25 : 28,
        fontWeight: 700,
        fontStyle: "italic", color: BRAND.colors.ink, textAlign: "center",
        borderBottom: `2px solid ${BRAND.colors.ink}`, padding: "10px 24px",
        width: "100%", marginBottom: 10,
        letterSpacing: "0.02em",
        overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {trunk}
      </div>

      {/* Main SVG chart area */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>

        {/* Faint grid lines */}
        {[CHART_TOP, CHART_MID, CHART_BOT].map((y, i) => (
          <line key={i} x1={40} y1={y} x2={W - 40} y2={y}
            stroke={BRAND.colors.chartGrid} strokeWidth={1} strokeDasharray="4 8" opacity={0.5} />
        ))}

        {/* Base price line — draws itself */}
        <path
          d={BASE_PATH}
          fill="none" stroke={BRAND.colors.ink} strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={baseEvolve.strokeDasharray}
          strokeDashoffset={baseEvolve.strokeDashoffset}
          style={{ filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.15))` }}
        />

        {/* Split point pulse */}
        <circle cx={CX} cy={CHART_MID} r={8 + Math.sin(time * 4) * 2.5}
          fill="none" stroke={BRAND.colors.ink} strokeWidth={2}
          opacity={splitOp * 0.5}
        />
        <circle cx={CX} cy={CHART_MID} r={4}
          fill={BRAND.colors.ink} opacity={splitOp}
        />

        {/* Bull path — green, curves upward */}
        <path
          d={BULL_PATH}
          fill="none" stroke={BRAND.colors.accentBull} strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={bullEvolve.strokeDasharray}
          strokeDashoffset={bullEvolve.strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 6px ${BRAND.colors.accentBull}50)` }}
        />
        {branchDraw > 0.3 && (
          <path
            d={BULL_PATH + ` L ${RIGHT_END} ${CHART_MID} L ${CX} ${CHART_MID} Z`}
            fill={BRAND.colors.accentBull}
            opacity={0.06 * branchDraw}
          />
        )}

        {/* Bear path — red, curves downward */}
        <path
          d={BEAR_PATH}
          fill="none" stroke={BRAND.colors.accentBear} strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={bearEvolve.strokeDasharray}
          strokeDashoffset={bearEvolve.strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 6px ${BRAND.colors.accentBear}50)` }}
        />
        {branchDraw > 0.3 && (
          <path
            d={BEAR_PATH + ` L ${RIGHT_END} ${CHART_MID} L ${CX} ${CHART_MID} Z`}
            fill={BRAND.colors.accentBear}
            opacity={0.06 * branchDraw}
          />
        )}

        {/* Bull marker — follows the green line */}
        {bullMarkerPos && (
          <g>
            <circle cx={bullMarkerPos.x} cy={bullMarkerPos.y}
              r={6} fill={BRAND.colors.accentBull}
              style={{ filter: `drop-shadow(0 0 8px ${BRAND.colors.accentBull})` }}
            />
            <circle cx={bullMarkerPos.x} cy={bullMarkerPos.y}
              r={12 + Math.sin(time * 6) * 3} fill="none"
              stroke={BRAND.colors.accentBull} strokeWidth={1.5} opacity={0.35}
            />
          </g>
        )}

        {/* Bear marker — follows the red line */}
        {bearMarkerPos && (
          <g>
            <circle cx={bearMarkerPos.x} cy={bearMarkerPos.y}
              r={6} fill={BRAND.colors.accentBear}
              style={{ filter: `drop-shadow(0 0 8px ${BRAND.colors.accentBear})` }}
            />
            <circle cx={bearMarkerPos.x} cy={bearMarkerPos.y}
              r={12 + Math.sin(time * 6) * 3} fill="none"
              stroke={BRAND.colors.accentBear} strokeWidth={1.5} opacity={0.35}
            />
          </g>
        )}

        {/* Bull target (end of green line) */}
        {bullTarget && targetScale > 0 && (() => {
          const label = `▲ ${bullTarget}`;
          const fs = label.length > 18 ? 16 : label.length > 12 ? 20 : 24;
          const bw = Math.max(140, label.length * (fs * 0.65) + 24);
          return (
            <g transform={`translate(${RIGHT_END}, ${CHART_MID - 95}) scale(${targetScale})`}>
              <rect x={-bw / 2} y={-20} width={bw} height={40} rx={4}
                fill={BRAND.colors.cream} stroke={BRAND.colors.accentBull} strokeWidth={2} />
              <text x={0} y={7} textAnchor="middle"
                fontFamily={BRAND.fonts.condensed} fontSize={fs} fontWeight={700} fill={BRAND.colors.accentBull}>
                {label}
              </text>
            </g>
          );
        })()}

        {/* Bear target (end of red line) */}
        {bearTarget && targetScale > 0 && (() => {
          const label = `▼ ${bearTarget}`;
          const fs = label.length > 18 ? 16 : label.length > 12 ? 20 : 24;
          const bw = Math.max(140, label.length * (fs * 0.65) + 24);
          return (
            <g transform={`translate(${RIGHT_END}, ${CHART_MID + 95}) scale(${targetScale})`}>
              <rect x={-bw / 2} y={-20} width={bw} height={40} rx={4}
                fill={BRAND.colors.cream} stroke={BRAND.colors.accentBear} strokeWidth={2} />
              <text x={0} y={7} textAnchor="middle"
                fontFamily={BRAND.fonts.condensed} fontSize={fs} fontWeight={700} fill={BRAND.colors.accentBear}>
                {label}
              </text>
            </g>
          );
        })()}

        {/* HAUSSIER / BAISSIER labels */}
        <text x={CX + BRANCH_LEN * 0.5} y={CHART_TOP - 8}
          textAnchor="middle" fontFamily={BRAND.fonts.mono} fontSize={13}
          letterSpacing="0.15em" fill={BRAND.colors.accentBull}
          opacity={branchDraw}>
          HAUSSIER
        </text>
        <text x={CX + BRANCH_LEN * 0.5} y={CHART_BOT + 24}
          textAnchor="middle" fontFamily={BRAND.fonts.mono} fontSize={13}
          letterSpacing="0.15em" fill={BRAND.colors.accentBear}
          opacity={branchDraw}>
          BAISSIER
        </text>
      </svg>

      {/* Conditions below chart */}
      <div style={{
        display: "flex", width: "100%", gap: 40, opacity: condOp, marginTop: 10,
      }}>
        <div style={{
          flex: 1, fontFamily: BRAND.fonts.body,
          fontSize: bullish.condition.length > 80 ? 14 : bullish.condition.length > 50 ? 16 : 18,
          fontStyle: "italic",
          color: BRAND.colors.inkMid, lineHeight: 1.4, textAlign: "center",
          borderTop: `2px solid ${BRAND.colors.accentBull}`,
          paddingTop: 10, overflow: "hidden", maxHeight: 70,
        }}>
          {bullish.condition}
        </div>
        <div style={{
          flex: 1, fontFamily: BRAND.fonts.body,
          fontSize: bearish.condition.length > 80 ? 14 : bearish.condition.length > 50 ? 16 : 18,
          fontStyle: "italic",
          color: BRAND.colors.inkMid, lineHeight: 1.4, textAlign: "center",
          borderTop: `2px solid ${BRAND.colors.accentBear}`,
          paddingTop: 10, overflow: "hidden", maxHeight: 70,
        }}>
          {bearish.condition}
        </div>
      </div>
    </div>
  );
};
