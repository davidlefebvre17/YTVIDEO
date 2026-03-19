import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import type { ImageEffect } from "@yt-maker/core";

interface BackgroundImageProps {
  src: string;
  effect: ImageEffect;
  durationInFrames: number;
}

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

  const imageSrc = src.startsWith('http') || src.startsWith('data:')
    ? src
    : staticFile(src);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <Img
        src={imageSrc}
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
