import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { Candle } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";

export interface InkLevel {
  value: number;
  label: string;
  type: 'support' | 'resistance' | 'annotation' | 'ma' | 'price_label';
  /** Frame absolu d'apparition (optionnel — sinon staggered après la courbe) */
  showAtFrame?: number;
  hideAtFrame?: number;
}

interface InkChartProps {
  candles: Candle[];
  levels?: InkLevel[];
  /** Couleur d'accent de l'épisode (ex: '#c0392b') */
  accentColor?: string;
  width?: number;
  height?: number;
  /** Frames pour tracer la courbe de prix */
  drawDuration?: number;
  /** Frame de début de l'animation (0 par défaut) */
  startFrame?: number;
  /** Afficher le panel RSI (si disponible dans les données) */
  showVolume?: boolean;
}

// Constantes layout interne
const PAD_H = BRAND.chart.padH;
const PAD_V = BRAND.chart.padV;
const VOL_RATIO = BRAND.chart.volumeRatio; // 15% pour le volume

function buildPricePath(
  candles: Candle[],
  chartW: number,
  chartH: number,
): string {
  if (candles.length === 0) return '';
  const prices = candles.map(c => c.c);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || maxP * 0.01 || 1;

  const innerW = chartW - 2 * PAD_H;
  const innerH = chartH - 2 * PAD_V;

  const points = candles.map((c, i) => {
    const x = PAD_H + (i / Math.max(candles.length - 1, 1)) * innerW;
    const y = PAD_V + (1 - (c.c - minP) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${points.join(' L ')}`;
}

function priceToY(price: number, minP: number, range: number, chartH: number): number {
  const innerH = chartH - 2 * PAD_V;
  return PAD_V + (1 - (price - minP) / range) * innerH;
}

export const InkChart: React.FC<InkChartProps> = ({
  candles,
  levels = [],
  accentColor = BRAND.colors.accentDefault,
  width = 1600,
  height = 620,
  drawDuration = BRAND.anim.inkDrawFrames,
  startFrame = 0,
  showVolume = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hauteur réservée au volume en bas
  const volH = showVolume ? height * VOL_RATIO : 0;
  const chartH = height - volH;

  // Données prix
  const prices = useMemo(() => candles.map(c => c.c), [candles]);
  const minP = useMemo(() => Math.min(...prices), [prices]);
  const maxP = useMemo(() => Math.max(...prices), [prices]);
  const range = useMemo(() => maxP - minP || maxP * 0.01 || 1, [maxP, minP]);

  // Volume max
  const maxVol = useMemo(
    () => Math.max(...candles.map(c => c.v || 0), 1),
    [candles]
  );

  // Path SVG de la courbe de prix
  const pricePath = useMemo(
    () => buildPricePath(candles, width, chartH),
    [candles, width, chartH]
  );

  // Animation : stroke-dashoffset 100000 → 0 sur drawDuration frames
  const DASH_LEN = 100000;
  const relFrame = Math.max(0, frame - startFrame);
  const drawProgress = interpolate(
    relFrame,
    [0, drawDuration],
    [DASH_LEN, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Opacité globale du chart
  const chartOpacity = interpolate(
    relFrame,
    [0, 8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Prix final = haussier ou baissier ?
  const isUp = candles.length > 1
    ? candles[candles.length - 1].c >= candles[0].c
    : true;

  // Couleur de la courbe de prix
  const lineColor = BRAND.colors.chartLine;

  // Lignes de grille horizontales
  const gridCount = BRAND.chart.gridLines;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const ratio = i / gridCount;
    const y = PAD_V + ratio * (chartH - 2 * PAD_V);
    const price = maxP - ratio * range;
    return { y, price };
  });

  // Niveaux (S/R lines) — chacun se trace après la courbe, staggered
  const levelStartFrame = drawDuration + 5;
  const levelsWithFrames = levels.map((lvl, idx) => {
    const showFrame = lvl.showAtFrame ?? levelStartFrame + idx * (BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames + 4);
    const hideFrame = lvl.hideAtFrame ?? Infinity;
    return { ...lvl, showFrame, hideFrame };
  });

  return (
    <div style={{ position: 'relative', width, height, opacity: chartOpacity }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block' }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Fond transparent (laisse passer l'image d'épisode) */}

        {/* Grid lines horizontales */}
        {gridLines.map(({ y, price }, i) => (
          <g key={i}>
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

        {/* Zone de couleur sous la courbe (légère) */}
        {pricePath && (
          <path
            d={`${pricePath} L ${width - PAD_H},${chartH - PAD_V} L ${PAD_H},${chartH - PAD_V} Z`}
            fill={isUp
              ? 'rgba(26, 107, 58, 0.05)'
              : 'rgba(139, 26, 26, 0.05)'}
          />
        )}

        {/* Courbe de prix principale — l'animation "encre" */}
        {pricePath && (
          <path
            d={pricePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={BRAND.chart.lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_LEN} ${DASH_LEN}`}
            strokeDashoffset={drawProgress}
          />
        )}

        {/* Point final de la courbe (prix actuel) */}
        {candles.length > 0 && relFrame >= drawDuration && (() => {
          const lastCandle = candles[candles.length - 1];
          const lastX = PAD_H + ((candles.length - 1) / Math.max(candles.length - 1, 1)) * (width - 2 * PAD_H);
          const lastY = priceToY(lastCandle.c, minP, range, chartH);
          const dotOpacity = interpolate(relFrame, [drawDuration, drawDuration + 8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <g opacity={dotOpacity}>
              <circle cx={lastX} cy={lastY} r={5} fill={accentColor} />
              <circle cx={lastX} cy={lastY} r={8} fill={accentColor} opacity={0.25} />
            </g>
          );
        })()}

        {/* Niveaux S/R — chacun se trace progressivement */}
        {levelsWithFrames.map((lvl, idx) => {
          const relLvlFrame = relFrame - lvl.showFrame;
          if (relLvlFrame < 0) return null;
          if (relFrame > lvl.hideFrame) return null;

          const y = priceToY(lvl.value, minP, range, chartH);
          // Si hors du range visible, on skip
          if (y < PAD_V - 10 || y > chartH - PAD_V + 10) return null;

          // Couleur selon le type
          const color = lvl.type === 'resistance' || lvl.type === 'price_label'
            ? BRAND.colors.chartResist
            : lvl.type === 'support'
            ? BRAND.colors.chartSupport
            : lvl.type === 'ma'
            ? BRAND.colors.chartMA
            : BRAND.colors.chartAnnot;

          const isDashed = lvl.type !== 'ma' && lvl.type !== 'price_label';

          // Animation de tracé de la ligne
          const lineDrawProgress = interpolate(
            relLvlFrame,
            [0, BRAND.anim.levelDrawFrames],
            [0, width - 2 * PAD_H],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Opacité du label
          const labelOpacity = interpolate(
            relLvlFrame,
            [BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames,
             BRAND.anim.levelDrawFrames + BRAND.anim.labelDelayFrames + 8],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <g key={idx}>
              {/* Ligne qui se trace */}
              <line
                x1={PAD_H}
                y1={y}
                x2={PAD_H + lineDrawProgress}
                y2={y}
                stroke={color}
                strokeWidth={BRAND.chart.levelWidth}
                strokeDasharray={isDashed ? '6 4' : 'none'}
                opacity={0.85}
              />
              {/* Label */}
              <g opacity={labelOpacity}>
                <rect
                  x={PAD_H + 8}
                  y={y - 14}
                  width={Math.min(lvl.label.length * 7 + 16, 200)}
                  height={20}
                  fill={BRAND.colors.cream}
                  rx={2}
                />
                <text
                  x={PAD_H + 16}
                  y={y + 1}
                  fontSize={11}
                  fontFamily={BRAND.fonts.mono}
                  fill={color}
                  fontWeight="600"
                >
                  {lvl.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Panel Volume */}
        {showVolume && volH > 0 && (
          <g>
            <rect
              x={0} y={chartH}
              width={width} height={volH}
              fill={BRAND.colors.creamDark}
              fillOpacity={0.3}
            />
            <line
              x1={0} y1={chartH} x2={width} y2={chartH}
              stroke={BRAND.colors.rule}
              strokeWidth={1}
            />
            {candles.map((c, i) => {
              const barW = Math.max(1, (width - 2 * PAD_H) / candles.length - 1);
              const x = PAD_H + (i / Math.max(candles.length - 1, 1)) * (width - 2 * PAD_H) - barW / 2;
              const barH = ((c.v || 0) / maxVol) * (volH - 8);
              const visible = interpolate(relFrame, [0, drawDuration], [0, i / candles.length], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              });
              if (i / candles.length > visible + 0.05) return null;
              return (
                <rect
                  key={i}
                  x={x}
                  y={chartH + volH - barH - 4}
                  width={barW}
                  height={Math.max(barH, 1)}
                  fill={BRAND.colors.chartVolume}
                  opacity={0.7}
                />
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};
