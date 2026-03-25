import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import type { ImageEffect } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";

interface BackgroundImageProps {
  src: string;
  effect: ImageEffect;
  durationInFrames: number;
}

const isRealImage = (src: string) =>
  src.startsWith('http') || src.startsWith('data:') || src.includes('/ep-') || src.includes('editorial/');

export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  src,
  effect,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const dur = durationInFrames;
  let transform = '';

  switch (effect) {
    case 'ken_burns_in': {
      const scale = interpolate(frame, [0, dur], [1.0, 1.06], { extrapolateRight: 'clamp' });
      transform = `scale(${scale})`;
      break;
    }
    case 'ken_burns_out': {
      const scale = interpolate(frame, [0, dur], [1.06, 1.0], { extrapolateRight: 'clamp' });
      transform = `scale(${scale})`;
      break;
    }
    case 'slow_pan_left': {
      const tx = interpolate(frame, [0, dur], [0, -2], { extrapolateRight: 'clamp' });
      transform = `translateX(${tx}%) scale(1.03)`;
      break;
    }
    case 'slow_pan_right': {
      const tx = interpolate(frame, [0, dur], [0, 2], { extrapolateRight: 'clamp' });
      transform = `translateX(${tx}%) scale(1.03)`;
      break;
    }
    case 'static':
    default:
      transform = 'scale(1)';
      break;
  }

  if (!isRealImage(src)) {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${BRAND.colors.cream}, ${BRAND.colors.creamDark})`,
      }} />
    );
  }

  const imageSrc = src.startsWith('http') || src.startsWith('data:')
    ? src
    : staticFile(src);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Img
        src={imageSrc}
        onError={(e) => {
          // Fallback to cream gradient if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
          if (e.target instanceof HTMLImageElement && e.target.parentElement) {
            e.target.parentElement.style.background = `linear-gradient(135deg, ${BRAND.colors.cream}, ${BRAND.colors.creamDark})`;
          }
        }}
        style={{
          width,
          height,
          objectFit: 'cover',
          transform,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
