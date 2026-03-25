import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface TypewriterTitleProps {
  text: string;
  durationInFrames: number;
  accentColor: string;
}

export const TypewriterTitle: React.FC<TypewriterTitleProps> = ({
  text,
  durationInFrames,
  accentColor,
}) => {
  const frame = useCurrentFrame();

  // Typing speed: ~2 characters per frame
  const typingSpeed = 2;
  const charsToShow = Math.min(text.length, Math.round((frame / durationInFrames) * text.length * typingSpeed));
  const displayText = text.slice(0, charsToShow);

  // Blinking cursor: visible for 8 frames, invisible for 8 frames, only while typing
  const isTyping = charsToShow < text.length;
  const cursorBlinkCycle = 16;
  const cursorFrame = frame % cursorBlinkCycle;
  const showCursor = isTyping && cursorFrame < 8;

  // Fade out in last 15 frames
  const fadeOutStartFrame = durationInFrames - 15;
  const opacity = interpolate(
    frame,
    [fadeOutStartFrame, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: BRAND.layout.safeH,
        right: BRAND.layout.safeH,
        backgroundColor: `${BRAND.colors.cream}cc`,
        padding: "16px 24px",
        backdropFilter: "blur(2px)",
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 18,
          fontWeight: 600,
          color: BRAND.colors.ink,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {displayText}
        {showCursor && <span style={{ marginLeft: "2px" }}>│</span>}
      </span>

      {/* Thin accent underline */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: accentColor,
          opacity: 0.6,
        }}
      />
    </div>
  );
};
