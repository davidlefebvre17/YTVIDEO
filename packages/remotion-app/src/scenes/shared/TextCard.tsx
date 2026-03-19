import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface TextCardProps {
  text: string;
  subtitle?: string;
  accentColor?: string;
  startFrame?: number;
}

export const TextCard: React.FC<TextCardProps> = ({
  text,
  subtitle,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;
  const opacity = interpolate(rel, [0, 15], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{
      opacity,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{
        fontFamily: BRAND.fonts.display,
        fontSize: 36,
        color: BRAND.colors.ink,
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: 800,
      }}>
        {text}
      </span>
      {subtitle && (
        <span style={{
          fontFamily: BRAND.fonts.body,
          fontSize: 18,
          color: BRAND.colors.inkMid,
          fontStyle: 'italic',
        }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
