import React from "react";
import type { Candle } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";

interface SparklineProps {
  candles: Candle[];
  width: number;
  height: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  candles,
  width,
  height,
  color,
}) => {
  if (candles.length < 2) return null;

  const prices = candles.map((c) => c.c);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = color || (isUp ? BRAND.colors.profit : BRAND.colors.loss);

  const points = prices
    .map((price, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
