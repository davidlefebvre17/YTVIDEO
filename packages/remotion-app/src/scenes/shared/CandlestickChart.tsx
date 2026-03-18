/**
 * CandlestickChart — SVG OHLC candles + SMA 20/50/200 + RSI panel + volume.
 * Animated L→R: candles appear progressively with vertical expansion.
 * Auto-disables RSI when height < 250px.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { Candle } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import type { InkLevel } from "./InkChart";

interface CandlestickChartProps {
  candles: Candle[];
  levels?: InkLevel[];
  accentColor?: string;
  width?: number;
  height?: number;
  drawDuration?: number;
  startFrame?: number;
  showRSI?: boolean;
  showVolume?: boolean;
  showSMA?: boolean;
  smaWindows?: [number, number, number];
}

const PAD_H = BRAND.chart.padH;
const PAD_V = BRAND.chart.padV;

// ─── Computation helpers ──────────────────────────────────────────────────────

function computeSMA(candles: Candle[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < window - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += candles[j].c;
    result.push(sum / window);
  }
  return result;
}

function computeRSI(candles: Candle[], period = 14): (number | null)[] {
  if (candles.length < period + 1) return candles.map(() => null);
  const result: (number | null)[] = new Array(period).fill(null);

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].c - candles[i - 1].c;
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].c - candles[i - 1].c;
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  levels = [],
  accentColor = BRAND.colors.accentDefault,
  width = 560,
  height = 320,
  drawDuration = BRAND.anim.inkDrawFrames,
  startFrame = 0,
  showRSI: showRSIProp = true,
  showVolume = true,
  showSMA = true,
  smaWindows = [20, 50, 200],
}) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame - startFrame);

  // Auto-disable RSI when too short
  const showRSI = showRSIProp && height >= 250;

  // Panel heights
  const rsiH = showRSI ? height * BRAND.chart.rsiPanelRatio : 0;
  const volH = showVolume ? height * BRAND.chart.volumeRatio : 0;
  const priceH = height - rsiH - volH;

  // Price range (high/low for candle wicks)
  const { minP, maxP, range } = useMemo(() => {
    if (candles.length === 0) return { minP: 0, maxP: 1, range: 1 };
    const lo = Math.min(...candles.map(c => c.l));
    const hi = Math.max(...candles.map(c => c.h));
    const r = hi - lo || hi * 0.01 || 1;
    return { minP: lo, maxP: hi, range: r };
  }, [candles]);

  const maxVol = useMemo(() => Math.max(...candles.map(c => c.v || 0), 1), [candles]);

  // Candle geometry
  const innerW = width - 2 * PAD_H;
  const candleStep = candles.length > 0 ? innerW / candles.length : innerW;
  const candleBodyW = Math.max(BRAND.chart.candleMinWidth, candleStep * BRAND.chart.candleBodyRatio);

  // Animation: visible candle count grows L→R
  const visibleCount = interpolate(relFrame, [0, drawDuration], [0, candles.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const chartOpacity = interpolate(relFrame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Coordinate helpers
  const priceToY = (price: number) => {
    const innerH = priceH - 2 * PAD_V;
    return PAD_V + (1 - (price - minP) / range) * innerH;
  };
  const iToX = (i: number) => PAD_H + (i + 0.5) * candleStep;

  // SMA data
  const smaData = useMemo(() => {
    if (!showSMA) return [];
    return smaWindows.map(w => computeSMA(candles, w));
  }, [candles, showSMA, smaWindows]);

  // RSI data
  const rsiValues = useMemo(() => {
    if (!showRSI) return [];
    return computeRSI(candles, 14);
  }, [candles, showRSI]);

  // Grid lines
  const gridCount = BRAND.chart.gridLines;
  const gridLines = useMemo(() =>
    Array.from({ length: gridCount + 1 }, (_, i) => {
      const ratio = i / gridCount;
      return {
        y: PAD_V + ratio * (priceH - 2 * PAD_V),
        price: maxP - ratio * range,
      };
    }), [priceH, maxP, range, gridCount]);

  // SMA visual config
  const smaStyles: Array<{ color: string; dash?: string }> = [
    { color: BRAND.chart.smaColors.fast },
    { color: BRAND.chart.smaColors.medium, dash: "4 3" },
    { color: BRAND.chart.smaColors.slow, dash: "8 4" },
  ];

  // Levels S/R
  const levelStart = drawDuration + 5;
  const levelsWithFrames = levels.map((lvl, idx) => ({
    ...lvl,
    showFrame: lvl.showAtFrame ?? levelStart + idx * (BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames + 4),
    hideFrame: lvl.hideAtFrame ?? Infinity,
  }));

  // RSI fade-in after candles
  const rsiOpacity = interpolate(relFrame, [drawDuration + 5, drawDuration + 15], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width, height, opacity: chartOpacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* ── Price panel background ── */}
        <rect width={width} height={priceH} fill={BRAND.colors.cream} />

        {/* ── Grid ── */}
        {gridLines.map(({ y, price }, i) => (
          <g key={`g${i}`}>
            <line x1={PAD_H} y1={y} x2={width - PAD_H} y2={y}
              stroke={BRAND.colors.chartGrid} strokeWidth={1} strokeDasharray="4 6" />
            <text x={PAD_H - 8} y={y + 4} textAnchor="end" fontSize={10}
              fontFamily={BRAND.fonts.mono} fill={BRAND.colors.inkFaint}>
              {price >= 1000
                ? price.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                : price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* ── Candles ── */}
        {candles.map((c, i) => {
          if (i >= visibleCount) return null;
          const x = iToX(i);
          const isGreen = c.c >= c.o;
          const color = isGreen ? BRAND.colors.accentBull : BRAND.colors.accentBear;

          // Vertical expansion over ~4 frames
          const age = visibleCount - i;
          const exp = interpolate(age, [0, 4], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          const bodyTop = priceToY(Math.max(c.o, c.c));
          const bodyBot = priceToY(Math.min(c.o, c.c));
          const bodyH = Math.max(1, (bodyBot - bodyTop) * exp);
          const bodyMid = (bodyTop + bodyBot) / 2;
          const wickTop = priceToY(c.h);
          const wickBot = priceToY(c.l);
          const wickH = (wickBot - wickTop) * exp;

          return (
            <g key={`c${i}`}>
              <line x1={x} y1={bodyMid - wickH / 2} x2={x} y2={bodyMid + wickH / 2}
                stroke={color} strokeWidth={1} />
              <rect x={x - candleBodyW / 2} y={bodyMid - bodyH / 2}
                width={candleBodyW} height={bodyH}
                fill={color} stroke={color} strokeWidth={0.5} />
            </g>
          );
        })}

        {/* ── SMA overlays (grow with visible candles) ── */}
        {showSMA && smaData.map((data, idx) => {
          const style = smaStyles[idx];
          const points: string[] = [];
          const maxI = Math.min(Math.floor(visibleCount), data.length);
          for (let i = 0; i < maxI; i++) {
            if (data[i] === null) continue;
            points.push(`${iToX(i).toFixed(1)},${priceToY(data[i]!).toFixed(1)}`);
          }
          if (points.length < 2) return null;
          return (
            <path key={`sma${idx}`} d={`M ${points.join(" L ")}`}
              fill="none" stroke={style.color} strokeWidth={1.5}
              strokeDasharray={style.dash} opacity={0.8} />
          );
        })}

        {/* ── S/R Levels ── */}
        {levelsWithFrames.map((lvl, idx) => {
          const rl = relFrame - lvl.showFrame;
          if (rl < 0 || relFrame > lvl.hideFrame) return null;
          const y = priceToY(lvl.value);
          if (y < PAD_V - 10 || y > priceH - PAD_V + 10) return null;

          const color =
            lvl.type === "resistance" || lvl.type === "price_label" ? BRAND.colors.chartResist
            : lvl.type === "support" ? BRAND.colors.chartSupport
            : lvl.type === "ma" ? BRAND.colors.chartMA
            : BRAND.colors.chartAnnot;

          const lineProg = interpolate(rl, [0, BRAND.anim.levelDrawFrames],
            [0, width - 2 * PAD_H], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const lblOp = interpolate(rl,
            [BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames,
             BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames + 8],
            [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <g key={`lv${idx}`}>
              <line x1={PAD_H} y1={y} x2={PAD_H + lineProg} y2={y}
                stroke={color} strokeWidth={BRAND.chart.levelWidth}
                strokeDasharray="6 4" opacity={0.85} />
              <g opacity={lblOp}>
                <rect x={PAD_H + 8} y={y - 14}
                  width={Math.min(lvl.label.length * 7 + 16, 200)} height={20}
                  fill={BRAND.colors.cream} rx={2} />
                <text x={PAD_H + 16} y={y + 1} fontSize={10}
                  fontFamily={BRAND.fonts.mono} fill={color} fontWeight="600">
                  {lvl.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* ── Volume panel ── */}
        {showVolume && volH > 0 && (
          <g>
            <rect x={0} y={priceH} width={width} height={volH} fill={BRAND.colors.creamDark} />
            <line x1={0} y1={priceH} x2={width} y2={priceH}
              stroke={BRAND.colors.rule} strokeWidth={1} />
            {candles.map((c, i) => {
              if (i >= visibleCount) return null;
              const x = iToX(i);
              const barH = ((c.v || 0) / maxVol) * (volH - 8);
              const isGreen = c.c >= c.o;
              return (
                <rect key={`v${i}`} x={x - candleBodyW / 2}
                  y={priceH + volH - barH - 4} width={candleBodyW}
                  height={Math.max(barH, 1)}
                  fill={isGreen ? BRAND.colors.accentBull : BRAND.colors.accentBear}
                  opacity={0.35} />
              );
            })}
          </g>
        )}

        {/* ── RSI panel ── */}
        {showRSI && rsiH > 0 && (() => {
          const rsiTop = priceH + volH;
          const rsiInnerH = rsiH - 2 * PAD_V;
          const y70 = rsiTop + PAD_V + (1 - 70 / 100) * rsiInnerH;
          const y30 = rsiTop + PAD_V + (1 - 30 / 100) * rsiInnerH;

          // Build RSI path up to visible candles
          const pts: string[] = [];
          const maxI = Math.min(Math.floor(visibleCount), rsiValues.length);
          for (let i = 0; i < maxI; i++) {
            if (rsiValues[i] === null) continue;
            const x = iToX(i);
            const y = rsiTop + PAD_V + (1 - rsiValues[i]! / 100) * rsiInnerH;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          const path = pts.length >= 2 ? `M ${pts.join(" L ")}` : "";

          return (
            <g opacity={rsiOpacity}>
              <rect x={0} y={rsiTop} width={width} height={rsiH} fill={BRAND.colors.cream} />
              <line x1={0} y1={rsiTop} x2={width} y2={rsiTop}
                stroke={BRAND.colors.rule} strokeWidth={1} />
              <rect x={PAD_H} y={y70} width={width - 2 * PAD_H} height={y30 - y70}
                fill={BRAND.colors.inkFaint} opacity={0.08} />
              <line x1={PAD_H} y1={y70} x2={width - PAD_H} y2={y70}
                stroke={BRAND.colors.inkFaint} strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
              <line x1={PAD_H} y1={y30} x2={width - PAD_H} y2={y30}
                stroke={BRAND.colors.inkFaint} strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
              <text x={width - PAD_H + 4} y={y70 + 4} fontSize={9}
                fontFamily={BRAND.fonts.mono} fill={BRAND.colors.inkFaint}>70</text>
              <text x={width - PAD_H + 4} y={y30 + 4} fontSize={9}
                fontFamily={BRAND.fonts.mono} fill={BRAND.colors.inkFaint}>30</text>
              {path && (
                <path d={path} fill="none" stroke={accentColor} strokeWidth={1.5} />
              )}
              <text x={PAD_H} y={rsiTop + 12} fontSize={9}
                fontFamily={BRAND.fonts.mono} fill={BRAND.colors.inkLight}>RSI(14)</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
