import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface TransitionWipeProps {
  direction?: "left" | "right";
  duration?: number;
  color?: string;
}

export const TransitionWipe: React.FC<TransitionWipeProps> = ({
  direction = "right",
  duration = 15,
  color = BRAND.colors.primary,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, duration / 2, duration], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = direction === "right"
    ? interpolate(frame, [0, duration], [-100, 100], { extrapolateRight: "clamp" })
    : interpolate(frame, [0, duration], [100, -100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: progress * 0.9,
        transform: `translateX(${translateX}%)`,
      }}
    />
  );
};
