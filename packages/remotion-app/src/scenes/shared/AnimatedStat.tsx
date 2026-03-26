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

  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const currentValue = interpolate(rel, [0, durationFrames], [0, safeValue], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stampScale = interpolate(rel, [0, 10], [1.3, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stampOpacity = interpolate(rel, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineWidth = interpolate(rel, [8, 22], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fontSize = size === 'lg' ? 80 : size === 'md' ? 56 : 36;
  const labelSize = size === 'lg' ? 20 : size === 'md' ? 17 : 14;

  const formattedValue = Math.abs(currentValue) >= 1000
    ? currentValue.toLocaleString('fr-FR', { maximumFractionDigits: decimals })
    : currentValue.toFixed(decimals);

  const showTrendArrow = prefix === '+' || prefix === '-';
  const arrowColor = prefix === '+' ? '#1a6b3a' : '#8b1a1a';

  const labelChars = label.split('');
  const labelCharDelay = 12;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      maxWidth: 500,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transform: `scale(${stampScale})`,
        transformOrigin: 'center',
        opacity: stampOpacity,
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
        {showTrendArrow && (
          <div style={{
            fontSize: fontSize * 0.8,
            color: arrowColor,
            fontWeight: 900,
          }}>
            {prefix === '+' ? '↑' : '↓'}
          </div>
        )}
      </div>

      <div style={{
        width: Math.max(0, lineWidth),
        height: 1,
        backgroundColor: accentColor,
        transition: 'width 0.05s linear',
      }} />

      <div style={{
        fontFamily: BRAND.fonts.body,
        fontSize: labelSize,
        lineHeight: 1.4,
        color: BRAND.colors.inkMid,
        textAlign: 'center',
        maxWidth: 420,
        minHeight: labelSize * 1.4,
        fontStyle: 'italic',
      }}>
        {labelChars.map((char, idx) => {
          const charStartFrame = labelCharDelay + idx;
          const charOpacity = interpolate(rel, [charStartFrame, charStartFrame + 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span key={idx} style={{ opacity: charOpacity }}>
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
};
