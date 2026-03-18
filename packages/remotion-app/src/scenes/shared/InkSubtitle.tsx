import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface SubtitleLine {
  text: string;
  startFrame: number;
  endFrame: number;
}

interface InkSubtitleProps {
  lines: SubtitleLine[];
  position?: 'bottom' | 'lower-third';
}

/**
 * Sous-titres brûlés dans la vidéo.
 * Apparaissent/disparaissent aux frames indiqués.
 * Style éditorial : fond semi-transparent, Source Serif 4 italic.
 */
export const InkSubtitle: React.FC<InkSubtitleProps> = ({
  lines,
  position = 'bottom',
}) => {
  const frame = useCurrentFrame();

  const activeLine = lines.find(
    (l) => frame >= l.startFrame && frame < l.endFrame
  );
  if (!activeLine) return null;

  const fadeIn = interpolate(
    frame,
    [activeLine.startFrame, activeLine.startFrame + 4],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const fadeOut = interpolate(
    frame,
    [activeLine.endFrame - 4, activeLine.endFrame],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  const bottomOffset =
    position === 'bottom'
      ? BRAND.layout.disclaimerH + BRAND.layout.tickerH + 16
      : BRAND.layout.disclaimerH + BRAND.layout.tickerH + 80;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: BRAND.layout.safeH,
        right: BRAND.layout.safeH,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        zIndex: 990,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(26, 22, 18, 0.72)',
          padding: '10px 24px',
          borderRadius: BRAND.borderRadius.sm,
          maxWidth: 1400,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 28,
            fontStyle: 'italic',
            color: BRAND.colors.cream,
            lineHeight: 1.4,
            letterSpacing: '0.01em',
          }}
        >
          {activeLine.text}
        </span>
      </div>
    </div>
  );
};
