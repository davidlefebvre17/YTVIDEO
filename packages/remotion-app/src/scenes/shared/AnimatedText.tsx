import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND, fadeIn } from "@yt-maker/core";

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 28,
  color = BRAND.colors.text,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;
  const opacity = fadeIn(localFrame, 0, 20);
  const translateY = interpolate(localFrame, [0, 20], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: BRAND.fonts.primary,
        fontSize,
        color,
        opacity: Math.max(0, opacity),
        transform: `translateY(${Math.max(0, translateY)}px)`,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
