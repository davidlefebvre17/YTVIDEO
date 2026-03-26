/**
 * ZoomTransition — Animates zoom from full newspaper page to a segment image
 * (zoom-in) or from a segment image back to the full page (zoom-out).
 *
 * Wraps children (typically NewspaperPage) and applies CSS transform
 * based on the target sourceRect position on the 1920×1080 canvas.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

interface ZoomTransitionProps {
  direction: "in" | "out";
  /** Position and size of the target image on the 1920×1080 canvas */
  sourceRect: { x: number; y: number; w: number; h: number };
  durationInFrames: number;
  children: React.ReactNode;
}

export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  direction,
  sourceRect,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  // Target zoom level — COVER: image fills entire viewport (no borders)
  const targetZoom = Math.max(1920 / sourceRect.w, 1080 / sourceRect.h);

  // Translation to center sourceRect at target zoom
  const centerX = sourceRect.x + sourceRect.w / 2;
  const centerY = sourceRect.y + sourceRect.h / 2;
  const targetTx = 960 - centerX * targetZoom;
  const targetTy = 540 - centerY * targetZoom;

  // Progress: 0 = full page (scale 1), 1 = zoomed in on sourceRect
  const progress = interpolate(
    frame,
    [0, durationInFrames],
    direction === "in" ? [0, 1] : [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing:
        direction === "in"
          ? Easing.out(Easing.exp) // snap: fast departure, soft landing
          : Easing.inOut(Easing.cubic), // smooth: balanced zoom out
    },
  );

  const scale = interpolate(progress, [0, 1], [1, targetZoom]);
  const tx = interpolate(progress, [0, 1], [0, targetTx]);
  const ty = interpolate(progress, [0, 1], [0, targetTy]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
