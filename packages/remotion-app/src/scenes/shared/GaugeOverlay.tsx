import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface GaugeOverlayProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  accentColor?: string;
  startFrame?: number;
  durationFrames?: number;
}

export const GaugeOverlay: React.FC<GaugeOverlayProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
  durationFrames = 45,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  const progress = interpolate(rel, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const currentAngle = normalizedValue * progress * 180;
  const currentValue = interpolate(rel, [0, durationFrames], [0, value], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  const r = 60;
  const cx = 80;
  const cy = 75;

  const endX = cx + r * Math.cos(Math.PI - (currentAngle * Math.PI) / 180);
  const endY = cy - r * Math.sin(Math.PI - (currentAngle * Math.PI) / 180);
  const largeArc = currentAngle > 90 ? 1 : 0;

  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const valuePath = currentAngle > 0
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`
    : '';

  const opacity = interpolate(rel, [0, 8], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={160} height={90} viewBox="0 0 160 90">
        <path d={bgPath} fill="none" stroke={BRAND.colors.inkFaint} strokeWidth={8} strokeLinecap="round" />
        {valuePath && (
          <path d={valuePath} fill="none" stroke={accentColor} strokeWidth={8} strokeLinecap="round" />
        )}
      </svg>
      <span style={{
        fontFamily: BRAND.fonts.condensed,
        fontSize: 32,
        color: BRAND.colors.ink,
        marginTop: -20,
      }}>
        {Math.round(currentValue)}
      </span>
      <span style={{
        fontFamily: BRAND.fonts.mono,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: BRAND.colors.inkLight,
      }}>
        {label}
      </span>
    </div>
  );
};
