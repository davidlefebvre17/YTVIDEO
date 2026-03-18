import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface AnimatedStatProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accentColor?: string;
  startFrame?: number;
  durationFrames?: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Statistique animée avec count-up.
 * Ex: COT "+685 contrats nets" · VIX "27.29"
 */
export const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  label,
  prefix = '',
  suffix = '',
  decimals = 0,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
  durationFrames = 30,
  size = 'md',
}) => {
  const frame = useCurrentFrame();
  const rel = Math.max(0, frame - startFrame);

  const currentValue = interpolate(rel, [0, durationFrames], [0, value], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(rel, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const fontSize = size === 'lg' ? 72 : size === 'md' ? 48 : 32;
  const labelSize = size === 'lg' ? 16 : size === 'md' ? 13 : 11;

  const formattedValue = Math.abs(currentValue) >= 1000
    ? currentValue.toLocaleString('fr-FR', { maximumFractionDigits: decimals })
    : currentValue.toFixed(decimals);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      opacity,
    }}>
      <div style={{
        fontFamily: BRAND.fonts.condensed,
        fontSize,
        fontWeight: 900,
        color: accentColor,
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        {prefix}{formattedValue}{suffix}
      </div>
      <div style={{
        fontFamily: BRAND.fonts.mono,
        fontSize: labelSize,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: BRAND.colors.inkLight,
        textAlign: 'center',
        maxWidth: 300,
      }}>
        {label}
      </div>
    </div>
  );
};
