import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export const DisclaimerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Total: 90 frames (3s at 30fps)
  // Fade in: 15 frames, hold: 60 frames, fade out: 15 frames
  const fadeInFrames = 15;
  const holdFrames = 60;
  const fadeOutFrames = 15;

  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [fadeInFrames + holdFrames, fadeInFrames + holdFrames + fadeOutFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 120px",
          opacity,
        }}
      >
        <p
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 22,
            lineHeight: 1.8,
            color: BRAND.colors.ink,
            textAlign: "center",
            margin: 0,
            maxWidth: 800,
            fontStyle: "normal",
            letterSpacing: "0.3px",
          }}
        >
          Les informations présentées dans cette vidéo sont à caractère
          éducatif uniquement et ne constituent en aucun cas des conseils en
          investissement. Les performances passées ne préjugent pas des
          performances futures.
        </p>
      </div>
    </AbsoluteFill>
  );
};
