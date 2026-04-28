/**
 * StampOverlay — Ink bubbles on newspaper, crypto-bubble-map style.
 *
 * Each asset = a round stamp with:
 * - Name written INSIDE the circular border (between outer and inner ring)
 * - Big % in the center
 * - Size proportional to |changePct|
 * - Green ink (up) / Red ink (down)
 * - All bubbles appear simultaneously at frame 0, grow to proportional size
 * - Continuous gentle float (sin/cos drift around collision-avoidance anchor)
 */

import React, { useMemo } from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import type { AssetSnapshot } from "@yt-maker/core";

// ── Colors ──
const COLOR_BULL = "#1a6b3a";
const COLOR_BEAR = "#8b1a1a";
const COLOR_FLAT = "#4a4a4a";

// ── Sizing — BIGGER ──
const MIN_RADIUS = 62;
const MAX_RADIUS = 140;
const ABS_CHANGE_CAP = 8;

// ── Layout ──
const PADDING = 50;
const STAMP_AREA = {
  x: PADDING,
  y: PADDING + 80, // leave room for newspaper header
  width: 1920 - PADDING * 2,
  height: 1080 - PADDING * 2 - 80,
};

interface StampOverlayProps {
  assets: AssetSnapshot[];
  durationInFrames: number;
  names?: Record<string, string>;
}

/** Seeded PRNG */
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

/** Short readable name */
function shortName(symbol: string, name?: string): string {
  if (name) {
    const clean = name
      .replace(/\s*\(.*\)\s*$/, "")
      .replace(/\s*-\s*USD$/, "")
      .trim();
    const words = clean.split(/[\s]+/).slice(0, 2).join(" ");
    return words.length > 16 ? words.slice(0, 15) + "." : words;
  }
  return symbol
    .replace(/=F$/, "").replace(/=X$/, "")
    .replace(/\^/, "").replace(/-USD$/, "");
}

/** Radius from |changePct| */
function stampRadius(changePct: number): number {
  const abs = Math.min(Math.abs(changePct), ABS_CHANGE_CAP);
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (abs / ABS_CHANGE_CAP);
}

/** SVG circular text — name written along the border ring */
const CircularName: React.FC<{
  text: string;
  radius: number;
  color: string;
  fontSize: number;
  /** Outer ring inset (border starts at this inset from edge) */
  outerInset: number;
  /** Inner ring inset from edge */
  innerInset: number;
}> = ({ text, radius, color, fontSize, outerInset, innerInset }) => {
  const id = `circ-${text.replace(/\W/g, "")}-${radius}`;
  // Exact midpoint between outer ring center and inner ring center
  const outerRingCenter = radius - outerInset;
  const innerRingCenter = radius - innerInset;
  const r = (outerRingCenter + innerRingCenter) / 2;
  const cx = radius;
  const cy = radius;
  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        {/* Top arc: from left to right (upper semicircle) */}
        <path
          id={id}
          d={`M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy}`}
          fill="none"
        />
      </defs>
      <text
        fill={color}
        fontSize={fontSize}
        fontWeight={800}
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing={2.5}
        textAnchor="middle"
        dominantBaseline="central"
      >
        <textPath href={`#${id}`} startOffset="50%">
          {text.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
};

/** Single stamp */
const Stamp: React.FC<{
  symbol: string;
  name: string;
  changePct: number;
  radius: number;
  x: number;
  y: number;
  rotation: number;
  /** Frame offset for grow stagger (±5 frames per bubble) */
  growDelay: number;
  /** Per-bubble float phase (seeded) */
  floatSeed: number;
  /** Total duration of the panorama segment (used for shrink-out) */
  durationInFrames: number;
  /** Frame offset for shrink stagger (≈ ±10f per bubble) */
  shrinkDelay: number;
}> = ({ symbol, name, changePct, radius, x, y, rotation, growDelay, floatSeed, durationInFrames, shrinkDelay }) => {
  const frame = useCurrentFrame();

  // ── Growth: all bubbles appear at frame 0, grow to scale 1 over ~45 frames ──
  // Slight per-bubble stagger (growDelay ±5f) for organic feel, but all start visible
  const growFrame = Math.max(0, frame - growDelay);
  const growScale = interpolate(growFrame, [0, 15, 45], [0.1, 0.75, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Shrink-out: last ~45 frames, bubbles shrink back to 0 with per-bubble stagger ──
  const shrinkWindow = 45;
  const shrinkStart = durationInFrames - shrinkWindow - shrinkDelay;
  const shrinkScale = interpolate(frame, [shrinkStart, shrinkStart + shrinkWindow], [1.0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const scale = Math.min(growScale, shrinkScale);

  const opacity = interpolate(growFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Continuous float: sinusoidal drift around anchor position ──
  // Period ~6-9s per bubble (varied via floatSeed), amplitude ~18px x / 14px y
  const floatPeriodX = 180 + (floatSeed % 90); // 6-9s @ 30fps
  const floatPeriodY = 210 + ((floatSeed * 7) % 90); // 7-10s
  const phaseX = (floatSeed * 13) % (Math.PI * 2);
  const phaseY = (floatSeed * 17) % (Math.PI * 2);
  const floatDx = Math.sin((frame / floatPeriodX) * Math.PI * 2 + phaseX) * 18;
  const floatDy = Math.cos((frame / floatPeriodY) * Math.PI * 2 + phaseY) * 14;

  // ── Subtle rotation wobble (±1.5° around baseline) for "alive" feel ──
  const rotWobble = Math.sin((frame / 240) * Math.PI * 2 + phaseX) * 1.5;

  const color = changePct > 0.05 ? COLOR_BULL : changePct < -0.05 ? COLOR_BEAR : COLOR_FLAT;
  const pctText = (changePct >= 0 ? "+" : "") + changePct.toFixed(1) + "%";
  const displayName = shortName(symbol, name);

  const borderWidth = Math.max(5, Math.min(9, radius * 0.065));
  const innerGap = borderWidth * 2 + 18;
  const innerRadius = radius - innerGap - (borderWidth - 1);
  const pctFontSize = Math.max(14, Math.min(42, innerRadius * 0.55));
  const nameFontSize = Math.max(13, Math.min(20, radius * 0.17));

  return (
    <div
      style={{
        position: "absolute",
        left: x - radius + floatDx,
        top: y - radius + floatDy,
        width: radius * 2,
        height: radius * 2,
        transform: `scale(${scale}) rotate(${rotation + rotWobble}deg)`,
        transformOrigin: "center center",
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* Cream background disc — stamp blocks the text behind it */}
      <div
        style={{
          position: "absolute",
          inset: 2,
          borderRadius: "50%",
          backgroundColor: "#f5f0e8",
        }}
      />
      {/* Outer ring — THICK */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `${borderWidth}px solid ${color}`,
        }}
      />
      {/* Inner ring — also thick */}
      <div
        style={{
          position: "absolute",
          inset: innerGap,
          borderRadius: "50%",
          border: `${borderWidth - 1}px solid ${color}`,
        }}
      />

      {/* Name along the circular border (centered between the two rings) */}
      <CircularName
        text={displayName}
        radius={radius}
        color={color}
        fontSize={nameFontSize}
        outerInset={borderWidth / 2}
        innerInset={innerGap + (borderWidth - 1) / 2}
      />

      {/* Center: percentage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color,
            fontSize: pctFontSize,
            fontWeight: 900,
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1,
          }}
        >
          {pctText}
        </span>
      </div>
    </div>
  );
};

/** Place stamps with collision avoidance */
function layoutStamps(
  assets: AssetSnapshot[],
  names?: Record<string, string>
): Array<{
  symbol: string; name: string; changePct: number;
  radius: number; x: number; y: number; rotation: number;
}> {
  const placed: Array<{ x: number; y: number; r: number }> = [];
  const result: Array<{
    symbol: string; name: string; changePct: number;
    radius: number; x: number; y: number; rotation: number;
  }> = [];

  const sorted = [...assets].sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
  );

  for (const asset of sorted) {
    const r = stampRadius(asset.changePct);
    const rng = seededRandom(asset.symbol);
    const rotation = (rng() - 0.5) * 24; // -12° to +12°

    let bestX = STAMP_AREA.x + STAMP_AREA.width / 2;
    let bestY = STAMP_AREA.y + STAMP_AREA.height / 2;
    let bestOverlap = Infinity;

    for (let attempt = 0; attempt < 100; attempt++) {
      const x = STAMP_AREA.x + r + rng() * (STAMP_AREA.width - r * 2);
      const y = STAMP_AREA.y + r + rng() * (STAMP_AREA.height - r * 2);

      let overlap = 0;
      for (const p of placed) {
        const dist = Math.hypot(x - p.x, y - p.y);
        const minDist = r + p.r + 8;
        if (dist < minDist) overlap += minDist - dist;
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
      rotation,
    });
  }

  return result;
}

export const StampOverlay: React.FC<StampOverlayProps> = ({
  assets,
  durationInFrames,
  names,
}) => {
  const stamps = useMemo(
    () => layoutStamps(assets, names),
    [assets, names]
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stamps.map((stamp, i) => {
        // Small organic stagger (0-10f) based on symbol hash
        const symbolHash = stamp.symbol.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
        const growDelay = Math.abs(symbolHash) % 11;
        const shrinkDelay = (Math.abs(symbolHash * 7) % 20);
        const floatSeed = (Math.abs(symbolHash) % 1000) + i;
        return (
          <Stamp
            key={stamp.symbol}
            symbol={stamp.symbol}
            name={stamp.name}
            changePct={stamp.changePct}
            radius={stamp.radius}
            x={stamp.x}
            y={stamp.y}
            rotation={stamp.rotation}
            growDelay={growDelay}
            floatSeed={floatSeed}
            durationInFrames={durationInFrames}
            shrinkDelay={shrinkDelay}
          />
        );
      })}
    </div>
  );
};
