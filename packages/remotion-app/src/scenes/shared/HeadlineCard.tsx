import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface HeadlineCardProps {
  title: string;
  source?: string;
  accentColor?: string;
  startFrame?: number;
}

export const HeadlineCard: React.FC<HeadlineCardProps> = ({
  title,
  source,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const opacity = interpolate(rel, [0, 12], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ opacity, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {source && (
        <span style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accentColor,
        }}>
          {source}
        </span>
      )}
      <span style={{
        fontFamily: BRAND.fonts.body,
        fontSize: 22,
        color: BRAND.colors.ink,
        lineHeight: 1.35,
        maxWidth: 600,
      }}>
        {title}
      </span>
    </div>
  );
};
