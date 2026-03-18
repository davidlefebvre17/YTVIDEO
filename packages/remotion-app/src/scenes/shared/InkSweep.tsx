import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface InkSweepProps {
  /** 'in' = balaie pour révéler, 'out' = balaie pour couvrir */
  direction?: 'in' | 'out';
  color?: string;
  durationFrames?: number;
}

/**
 * Transition signature TradingRecap — balayage d'encre.
 * Utilisé entre segments DEEP/FOCUS.
 */
export const InkSweep: React.FC<InkSweepProps> = ({
  direction = 'in',
  color = BRAND.colors.ink,
  durationFrames = 20,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Sweep left to right : width animé 0 → width (out) ou width → 0 (in)
  const sweepW = direction === 'out'
    ? progress * width
    : (1 - progress) * width;

  const sweepX = direction === 'out' ? 0 : width - sweepW;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: sweepX,
        width: sweepW,
        height,
        backgroundColor: color,
        // Légère irrégularité sur le bord droit (style encre)
        clipPath: direction === 'out'
          ? `polygon(0 0, 100% 0, calc(100% - 4px) 25%, 100% 50%, calc(100% - 2px) 75%, 100% 100%, 0 100%)`
          : `polygon(0 0, calc(100% + 4px) 0, 100% 100%, 0 100%, 4px 75%, 0 50%, 4px 25%)`,
      }} />
    </div>
  );
};
