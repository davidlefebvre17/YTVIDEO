import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { AssetSnapshot, ScriptSection, Candle } from "@yt-maker/core";
import { BRAND, fadeIn, computeLayout } from "@yt-maker/core";
import { AnimatedText } from "./shared/AnimatedText";

interface ChartDeepDiveSceneProps {
  section: ScriptSection;
  asset?: AssetSnapshot;
}

// Simple candlestick renderer
const CandlestickChart: React.FC<{
  candles: Candle[];
  width: number;
  height: number;
  visibleCount: number;
}> = ({ candles, width, height, visibleCount }) => {
  const visible = candles.slice(0, visibleCount);
  if (visible.length === 0) return null;

  const allPrices = visible.flatMap((c) => [c.h, c.l]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;
  const candleW = Math.max(3, (width / candles.length) * 0.7);
  const gap = (width / candles.length) * 0.3;

  const priceToY = (price: number) =>
    height - ((price - min) / range) * (height * 0.9) - height * 0.05;

  return (
    <svg width={width} height={height}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = height * pct;
        return (
          <line
            key={pct}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke={BRAND.colors.border}
            strokeWidth={1}
          />
        );
      })}

      {/* Candles */}
      {visible.map((candle, i) => {
        const x = i * (candleW + gap) + gap / 2;
        const isUp = candle.c >= candle.o;
        const color = isUp ? BRAND.colors.profit : BRAND.colors.loss;
        const bodyTop = priceToY(Math.max(candle.o, candle.c));
        const bodyBottom = priceToY(Math.min(candle.o, candle.c));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x + candleW / 2}
              y1={priceToY(candle.h)}
              x2={x + candleW / 2}
              y2={priceToY(candle.l)}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body */}
            <rect
              x={x}
              y={bodyTop}
              width={candleW}
              height={bodyHeight}
              fill={isUp ? color : color}
              stroke={color}
              strokeWidth={0.5}
            />
          </g>
        );
      })}
    </svg>
  );
};

export const ChartDeepDiveScene: React.FC<ChartDeepDiveSceneProps> = ({
  section,
  asset,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  const titleOpacity = fadeIn(frame, 0, 20);
  const totalCandles = asset?.candles.length || 0;

  // Progressive candle reveal
  const durationFrames = section.durationSec * 30;
  const visibleCandles = Math.floor(
    interpolate(frame, [20, durationFrames * 0.8], [0, totalCandles], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const isUp = asset ? asset.changePct >= 0 : true;
  const accentColor = BRAND.colors.deepDive;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        fontFamily: BRAND.fonts.primary,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `${layout.padding.top}px ${layout.padding.right}px 0 ${layout.padding.left}px`,
          opacity: titleOpacity,
        }}
      >
        <div>
          <div style={{
            fontSize: layout.fontSize.sectionTitle,
            color: accentColor,
            fontWeight: 700,
          }}>
            {section.title}
          </div>
          {asset && (
            <div style={{
              fontSize: layout.fontSize.body,
              color: BRAND.colors.textMuted,
              marginTop: 4,
            }}>
              {asset.name}
            </div>
          )}
        </div>
        {asset && (
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: layout.fontSize.price,
              color: BRAND.colors.text,
              fontFamily: BRAND.fonts.mono,
              fontWeight: 700,
            }}>
              {asset.price.toFixed(2)}
            </div>
            <div style={{
              fontSize: layout.fontSize.change,
              color: isUp ? BRAND.colors.profit : BRAND.colors.loss,
              fontFamily: BRAND.fonts.mono,
              fontWeight: 600,
            }}>
              {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {asset && asset.candles.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: layout.padding.top + 100,
            left: layout.padding.left,
            opacity: fadeIn(frame, 15, 20),
          }}
        >
          <CandlestickChart
            candles={asset.candles}
            width={layout.chart.width}
            height={layout.chart.height}
            visibleCount={visibleCandles}
          />
        </div>
      )}

      {/* Narration */}
      <div
        style={{
          position: "absolute",
          bottom: layout.padding.bottom + 20,
          left: layout.padding.left,
          right: layout.padding.right,
        }}
      >
        <AnimatedText
          text={section.narration}
          fontSize={layout.fontSize.narration}
          delay={25}
          color={BRAND.colors.textMuted}
        />
      </div>
    </AbsoluteFill>
  );
};
