/**
 * StampOverlay — Tampons encre style "crypto bubble map" sur page journal.
 *
 * Chaque asset = un tampon rond avec :
 * - Le nom écrit en arc de cercle (haut)
 * - Le % de variation au centre (gros)
 * - Taille proportionnelle à |changePct|
 * - Couleur : vert encre (hausse) / rouge encre (baisse)
 * - Position pseudo-aléatoire (seeded par symbol)
 * - Apparition progressive (stamp par stamp avec léger bounce)
 *
 * Les tampons s'accumulent pendant le PANORAMA et restent tous visibles.
 */

import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import type { AssetSnapshot } from "@yt-maker/core";

// ── Brand colors ──
const COLOR_BULL = "#1a6b3a"; // vert encre foncé
const COLOR_BEAR = "#8b1a1a"; // rouge bordeaux
const COLOR_FLAT = "#4a4a4a"; // gris encre

// ── Stamp sizing ──
const MIN_RADIUS = 32;
const MAX_RADIUS = 80;
const ABS_CHANGE_CAP = 10; // |changePct| >= 10% gets max size

// ── Layout ──
const PADDING = 20;
const STAMP_AREA = {
  x: PADDING,
  y: PADDING,
  width: 1920 - PADDING * 2,
  height: 1080 - PADDING * 2,
};

interface StampOverlayProps {
  /** All assets to stamp (sorted by |changePct| desc for visual priority) */
  assets: AssetSnapshot[];
  /** Total duration of the PANORAMA segment in frames */
  durationInFrames: number;
  /** Optional: display names map (symbol → short name) */
  names?: Record<string, string>;
}

/** Seeded pseudo-random for deterministic layout */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

/** Short display name: remove exchange suffix, shorten */
function shortName(symbol: string, name?: string): string {
  if (name) {
    // Take first 2 words max, cap at 12 chars
    const words = name.split(/[\s\-\/]+/).slice(0, 2).join(" ");
    return words.length > 12 ? words.slice(0, 11) + "." : words;
  }
  // Fallback: clean symbol
  return symbol
    .replace(/=F$/, "")
    .replace(/=X$/, "")
    .replace(/\^/, "")
    .replace(/-USD$/, "");
}

/** Radius from |changePct| */
function stampRadius(changePct: number): number {
  const abs = Math.min(Math.abs(changePct), ABS_CHANGE_CAP);
  // Minimum size for small moves, then scale linearly
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (abs / ABS_CHANGE_CAP);
}

/** SVG text along a circular arc (top half) */
const ArcText: React.FC<{
  text: string;
  radius: number;
  color: string;
  fontSize: number;
}> = ({ text, radius, color, fontSize }) => {
  const arcId = `arc-${text.replace(/\W/g, "")}`;
  // Arc for top half of circle
  const r = radius - fontSize * 0.6;
  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <path
          id={arcId}
          d={`M ${radius - r},${radius} A ${r},${r} 0 0,1 ${radius + r},${radius}`}
        />
      </defs>
      <text
        fill={color}
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="Georgia, 'Times New Roman', serif"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        <textPath href={`#${arcId}`} startOffset="50%">
          {text.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
};

/** Single stamp component */
const Stamp: React.FC<{
  symbol: string;
  name: string;
  changePct: number;
  radius: number;
  x: number;
  y: number;
  appearFrame: number;
  fps: number;
}> = ({ symbol, name, changePct, radius, x, y, appearFrame, fps }) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - appearFrame;

  if (relativeFrame < 0) return null;

  // Spring bounce on appear
  const scale = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
  });

  // Slight rotation for organic feel
  const rng = seededRandom(symbol + "rot");
  const rotation = (rng() - 0.5) * 16; // -8° to +8°

  const color =
    changePct > 0.1 ? COLOR_BULL : changePct < -0.1 ? COLOR_BEAR : COLOR_FLAT;
  const borderColor = color;

  // Opacity: slight transparency for ink effect
  const opacity = interpolate(relativeFrame, [0, 5], [0.7, 0.85], {
    extrapolateRight: "clamp",
  });

  const pctText =
    (changePct >= 0 ? "+" : "") + changePct.toFixed(1) + "%";

  const fontSize = Math.max(11, Math.min(18, radius * 0.35));
  const pctFontSize = Math.max(14, Math.min(26, radius * 0.45));
  const arcFontSize = Math.max(7, Math.min(12, radius * 0.18));

  return (
    <div
      style={{
        position: "absolute",
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        transformOrigin: "center center",
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* Circle border (double ring for stamp effect) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `3px solid ${borderColor}`,
          boxShadow: `inset 0 0 0 2px transparent, inset 0 0 0 5px ${borderColor}40`,
        }}
      />
      {/* Inner ring */}
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          border: `1.5px solid ${borderColor}80`,
        }}
      />

      {/* Arc text (name on top) */}
      <ArcText
        text={shortName(symbol, name)}
        radius={radius}
        color={color}
        fontSize={arcFontSize}
      />

      {/* Center: percentage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            color,
            fontSize: pctFontSize,
            fontWeight: 900,
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1,
            marginTop: radius * 0.1,
          }}
        >
          {pctText}
        </span>
      </div>
    </div>
  );
};

/** Place stamps without too much overlap using simple physics */
function layoutStamps(
  assets: AssetSnapshot[],
  names?: Record<string, string>
): Array<{
  symbol: string;
  name: string;
  changePct: number;
  radius: number;
  x: number;
  y: number;
}> {
  const placed: Array<{ x: number; y: number; r: number }> = [];
  const result: Array<{
    symbol: string;
    name: string;
    changePct: number;
    radius: number;
    x: number;
    y: number;
  }> = [];

  // Sort by |changePct| desc so biggest stamps get placed first
  const sorted = [...assets].sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
  );

  for (const asset of sorted) {
    const r = stampRadius(asset.changePct);
    const rng = seededRandom(asset.symbol);

    // Try random positions, pick the one with least overlap
    let bestX = STAMP_AREA.x + STAMP_AREA.width / 2;
    let bestY = STAMP_AREA.y + STAMP_AREA.height / 2;
    let bestOverlap = Infinity;

    for (let attempt = 0; attempt < 60; attempt++) {
      const x = STAMP_AREA.x + r + rng() * (STAMP_AREA.width - r * 2);
      const y = STAMP_AREA.y + r + rng() * (STAMP_AREA.height - r * 2);

      let overlap = 0;
      for (const p of placed) {
        const dist = Math.hypot(x - p.x, y - p.y);
        const minDist = r + p.r + 4; // 4px gap
        if (dist < minDist) {
          overlap += minDist - dist;
        }
      }

      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestX = x;
        bestY = y;
        if (overlap === 0) break;
      }
    }

    placed.push({ x: bestX, y: bestY, r });
    result.push({
      symbol: asset.symbol,
      name: names?.[asset.symbol] ?? asset.name ?? asset.symbol,
      changePct: asset.changePct,
      radius: r,
      x: bestX,
      y: bestY,
    });
  }

  return result;
}

export const StampOverlay: React.FC<StampOverlayProps> = ({
  assets,
  durationInFrames,
  names,
}) => {
  const { fps } = useVideoConfig();

  const stamps = useMemo(
    () => layoutStamps(assets, names),
    [assets, names]
  );

  // Stagger appearance: stamps appear one by one over 70% of duration
  const appearWindow = Math.round(durationInFrames * 0.7);
  const interval = stamps.length > 1 ? appearWindow / (stamps.length - 1) : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stamps.map((stamp, i) => (
        <Stamp
          key={stamp.symbol}
          symbol={stamp.symbol}
          name={stamp.name}
          changePct={stamp.changePct}
          radius={stamp.radius}
          x={stamp.x}
          y={stamp.y}
          appearFrame={Math.round(i * interval)}
          fps={fps}
        />
      ))}
    </div>
  );
};
