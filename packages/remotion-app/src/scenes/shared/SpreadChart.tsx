import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Candle } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";

export interface SpreadChartProps {
  /** First data series (e.g., 10Y yield or WTI) */
  line1: { candles: Candle[]; label: string; color?: string };
  /** Second data series (e.g., 2Y yield or Brent) */
  line2: { candles: Candle[]; label: string; color?: string };
  /** Chart title */
  title?: string;
  /** Show the spread value */
  showSpread?: boolean;
  width?: number;
  height?: number;
  /** Animation draw duration in frames */
  drawDuration?: number;
  startFrame?: number;
}

const PAD_H = BRAND.chart.padH;
const PAD_V = BRAND.chart.padV;
const DASH_LEN = 100000;

/**
 * Build SVG path from candle closes
 */
function buildLinePath(
  candles: Candle[],
  chartW: number,
  chartH: number,
  minY: number,
  maxY: number,
): string {
  if (candles.length === 0) return '';
  const range = maxY - minY || maxY * 0.01 || 1;
  const innerW = chartW - 2 * PAD_H;
  const innerH = chartH - 2 * PAD_V;

  const points = candles.map((c, i) => {
    const x = PAD_H + (i / Math.max(candles.length - 1, 1)) * innerW;
    const y = PAD_V + (1 - (c.c - minY) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${points.join(' L ')}`;
}

/**
 * Convert price to Y coordinate
 */
function priceToY(
  price: number,
  minY: number,
  range: number,
  chartH: number,
): number {
  const innerH = chartH - 2 * PAD_V;
  return PAD_V + (1 - (price - minY) / range) * innerH;
}

/**
 * Align two data series by date, returning last N points
 */
function alignData(
  candles1: Candle[],
  candles2: Candle[],
  maxPoints: number = 250,
): { aligned1: Candle[]; aligned2: Candle[]; count: number } {
  // Both arrays should be aligned by date index already
  // Take min length, then last maxPoints
  const minLen = Math.min(candles1.length, candles2.length);
  const startIdx = Math.max(0, minLen - maxPoints);
  const count = minLen - startIdx;

  return {
    aligned1: candles1.slice(startIdx, minLen),
    aligned2: candles2.slice(startIdx, minLen),
    count,
  };
}

export const SpreadChart: React.FC<SpreadChartProps> = ({
  line1,
  line2,
  title,
  showSpread = true,
  width = 1600,
  height = 620,
  drawDuration = BRAND.anim.inkDrawFrames,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Align data
  const { aligned1, aligned2, count } = useMemo(
    () => alignData(line1.candles, line2.candles, 250),
    [line1.candles, line2.candles]
  );

  // Extract prices
  const prices1 = useMemo(() => aligned1.map(c => c.c), [aligned1]);
  const prices2 = useMemo(() => aligned2.map(c => c.c), [aligned2]);

  const minP1 = useMemo(() => Math.min(...prices1, Infinity), [prices1]);
  const maxP1 = useMemo(() => Math.max(...prices1, -Infinity), [prices1]);
  const range1 = useMemo(() => maxP1 - minP1 || maxP1 * 0.01 || 1, [maxP1, minP1]);

  const minP2 = useMemo(() => Math.min(...prices2, Infinity), [prices2]);
  const maxP2 = useMemo(() => Math.max(...prices2, -Infinity), [prices2]);
  const range2 = useMemo(() => maxP2 - minP2 || maxP2 * 0.01 || 1, [maxP2, minP2]);

  // Auto-scale detection: single vs dual Y axis
  const rangeRatio = Math.max(range1, range2) / Math.min(range1, range2, 1);
  const dualAxis = rangeRatio >= 3;

  // Single axis setup
  const globalMinP = Math.min(minP1, minP2);
  const globalMaxP = Math.max(maxP1, maxP2);
  const globalRange = globalMaxP - globalMinP || globalMaxP * 0.01 || 1;

  // Colors
  const color1 = line1.color || BRAND.colors.accentBull;
  const color2 = line2.color || BRAND.colors.accentBear;

  // Build paths
  const path1 = useMemo(() => {
    if (!dualAxis) {
      return buildLinePath(aligned1, width, height, globalMinP, globalMaxP);
    } else {
      return buildLinePath(aligned1, width, height, minP1, maxP1);
    }
  }, [aligned1, width, height, dualAxis, globalMinP, globalMaxP, minP1, maxP1]);

  const path2 = useMemo(() => {
    if (!dualAxis) {
      return buildLinePath(aligned2, width, height, globalMinP, globalMaxP);
    } else {
      return buildLinePath(aligned2, width, height, minP2, maxP2);
    }
  }, [aligned2, width, height, dualAxis, globalMinP, globalMaxP, minP2, maxP2]);

  // Animation
  const relFrame = Math.max(0, frame - startFrame);
  const drawProgress = interpolate(
    relFrame,
    [0, drawDuration],
    [DASH_LEN, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const chartOpacity = interpolate(
    relFrame,
    [0, 8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Current values
  const current1 = aligned1.length > 0 ? aligned1[aligned1.length - 1].c : minP1;
  const current2 = aligned2.length > 0 ? aligned2[aligned2.length - 1].c : minP2;
  const spread = current1 - current2;

  // Grid lines (single axis)
  const gridCount = BRAND.chart.gridLines;
  const gridLines = useMemo(() => {
    if (dualAxis) {
      // Two separate grids
      return {
        left: Array.from({ length: gridCount + 1 }, (_, i) => {
          const ratio = i / gridCount;
          return { y: PAD_V + ratio * (height - 2 * PAD_V), price: maxP1 - ratio * range1 };
        }),
        right: Array.from({ length: gridCount + 1 }, (_, i) => {
          const ratio = i / gridCount;
          return { y: PAD_V + ratio * (height - 2 * PAD_V), price: maxP2 - ratio * range2 };
        }),
      };
    } else {
      // Single grid
      return {
        left: Array.from({ length: gridCount + 1 }, (_, i) => {
          const ratio = i / gridCount;
          return { y: PAD_V + ratio * (height - 2 * PAD_V), price: globalMaxP - ratio * globalRange };
        }),
        right: [],
      };
    }
  }, [dualAxis, gridCount, height, maxP1, range1, maxP2, range2, globalMaxP, globalRange]);

  // Last X position
  const lastX = PAD_H + ((count - 1) / Math.max(count - 1, 1)) * (width - 2 * PAD_H);

  // Last Y positions
  const lastY1 = dualAxis
    ? priceToY(current1, minP1, range1, height)
    : priceToY(current1, globalMinP, globalRange, height);
  const lastY2 = dualAxis
    ? priceToY(current2, minP2, range2, height)
    : priceToY(current2, globalMinP, globalRange, height);

  // Spread area color
  const spreadColor = current1 > current2
    ? 'rgba(26, 107, 58, 0.08)'
    : 'rgba(139, 26, 26, 0.08)';

  // Build fill path for spread area (single axis only)
  const spreadFillPath = useMemo(() => {
    if (dualAxis || aligned1.length === 0 || aligned2.length === 0) return '';

    const innerW = width - 2 * PAD_H;
    const innerH = height - 2 * PAD_V;
    const points: string[] = [];

    // Forward along line1
    for (let i = 0; i < aligned1.length; i++) {
      const x = PAD_H + (i / Math.max(aligned1.length - 1, 1)) * innerW;
      const y = PAD_V + (1 - (aligned1[i].c - globalMinP) / globalRange) * innerH;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // Backward along line2
    for (let i = aligned2.length - 1; i >= 0; i--) {
      const x = PAD_H + (i / Math.max(aligned2.length - 1, 1)) * innerW;
      const y = PAD_V + (1 - (aligned2[i].c - globalMinP) / globalRange) * innerH;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return points.length > 2 ? `M ${points.join(' L ')} Z` : '';
  }, [aligned1, aligned2, width, height, dualAxis, globalMinP, globalRange]);

  if (count === 0) {
    return <div style={{ width, height }} />;
  }

  return (
    <div style={{ position: 'relative', width, height, opacity: chartOpacity }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block' }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Background */}
        <rect width={width} height={height} fill={BRAND.colors.cream} />

        {/* Grid lines */}
        {gridLines.left.map(({ y, price }, i) => (
          <g key={`grid-left-${i}`}>
            <line
              x1={PAD_H} y1={y} x2={width - PAD_H} y2={y}
              stroke={BRAND.colors.chartGrid}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
            <text
              x={PAD_H - 8} y={y + 4}
              textAnchor="end"
              fontSize={11}
              fontFamily={BRAND.fonts.mono}
              fill={BRAND.colors.inkFaint}
            >
              {price >= 1000
                ? price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
                : price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Right axis grid (dual only) */}
        {dualAxis && gridLines.right.map(({ y, price }, i) => (
          <g key={`grid-right-${i}`}>
            <text
              x={width - PAD_H + 8} y={y + 4}
              textAnchor="start"
              fontSize={11}
              fontFamily={BRAND.fonts.mono}
              fill={BRAND.colors.inkFaint}
            >
              {price >= 1000
                ? price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
                : price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Spread fill area (single axis only) */}
        {!dualAxis && spreadFillPath && (
          <path
            d={spreadFillPath}
            fill={spreadColor}
          />
        )}

        {/* Line 1 */}
        {path1 && (
          <path
            d={path1}
            fill="none"
            stroke={color1}
            strokeWidth={BRAND.chart.lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_LEN} ${DASH_LEN}`}
            strokeDashoffset={drawProgress}
          />
        )}

        {/* Line 2 */}
        {path2 && (
          <path
            d={path2}
            fill="none"
            stroke={color2}
            strokeWidth={BRAND.chart.lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_LEN} ${DASH_LEN}`}
            strokeDashoffset={drawProgress}
          />
        )}

        {/* Current value dots */}
        {relFrame >= drawDuration && (
          <>
            {/* Line 1 dot */}
            <g opacity={interpolate(relFrame, [drawDuration, drawDuration + 8], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })}>
              <circle cx={lastX} cy={lastY1} r={5} fill={color1} />
              <circle cx={lastX} cy={lastY1} r={8} fill={color1} opacity={0.25} />
            </g>

            {/* Line 2 dot */}
            <g opacity={interpolate(relFrame, [drawDuration, drawDuration + 8], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })}>
              <circle cx={lastX} cy={lastY2} r={5} fill={color2} />
              <circle cx={lastX} cy={lastY2} r={8} fill={color2} opacity={0.25} />
            </g>
          </>
        )}

        {/* Current value labels */}
        {relFrame >= drawDuration && (
          <>
            {/* Line 1 label */}
            <g opacity={interpolate(relFrame, [drawDuration + 10, drawDuration + 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })}>
              <rect
                x={lastX + 12}
                y={lastY1 - 14}
                width={80}
                height={20}
                fill={BRAND.colors.cream}
                stroke={color1}
                strokeWidth={1}
                rx={3}
              />
              <text
                x={lastX + 20}
                y={lastY1 + 1}
                fontSize={10}
                fontFamily={BRAND.fonts.mono}
                fill={color1}
                fontWeight="600"
              >
                {current1.toFixed(2)}
              </text>
            </g>

            {/* Line 2 label */}
            <g opacity={interpolate(relFrame, [drawDuration + 10, drawDuration + 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })}>
              <rect
                x={lastX + 12}
                y={lastY2 - 14}
                width={80}
                height={20}
                fill={BRAND.colors.cream}
                stroke={color2}
                strokeWidth={1}
                rx={3}
              />
              <text
                x={lastX + 20}
                y={lastY2 + 1}
                fontSize={10}
                fontFamily={BRAND.fonts.mono}
                fill={color2}
                fontWeight="600"
              >
                {current2.toFixed(2)}
              </text>
            </g>
          </>
        )}

        {/* Legend — top right */}
        {relFrame >= 15 && (
          <g opacity={interpolate(relFrame, [15, 25], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })}>
            <rect
              x={width - PAD_H - 220}
              y={PAD_V}
              width={210}
              height={showSpread ? 65 : 50}
              fill={BRAND.colors.cream}
              stroke={BRAND.colors.rule}
              strokeWidth={1}
              rx={4}
            />

            {/* Line 1 legend */}
            <circle
              cx={width - PAD_H - 200}
              cy={PAD_V + 12}
              r={3}
              fill={color1}
            />
            <text
              x={width - PAD_H - 190}
              y={PAD_V + 15}
              fontSize={10}
              fontFamily={BRAND.fonts.mono}
              fill={BRAND.colors.inkMid}
            >
              {line1.label}
            </text>

            {/* Line 2 legend */}
            <circle
              cx={width - PAD_H - 200}
              cy={PAD_V + 30}
              r={3}
              fill={color2}
            />
            <text
              x={width - PAD_H - 190}
              y={PAD_V + 33}
              fontSize={10}
              fontFamily={BRAND.fonts.mono}
              fill={BRAND.colors.inkMid}
            >
              {line2.label}
            </text>

            {/* Spread value */}
            {showSpread && (
              <text
                x={width - PAD_H - 200}
                y={PAD_V + 50}
                fontSize={9}
                fontFamily={BRAND.fonts.mono}
                fill={BRAND.colors.inkFaint}
              >
                Spread: {spread >= 0 ? '+' : ''}{spread.toFixed(2)}
              </text>
            )}
          </g>
        )}

        {/* Title */}
        {title && relFrame >= 5 && (
          <g opacity={interpolate(relFrame, [5, 15], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })}>
            <text
              x={PAD_H}
              y={PAD_V - 8}
              fontSize={14}
              fontFamily={BRAND.fonts.display}
              fill={BRAND.colors.ink}
              fontWeight="600"
            >
              {title}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
