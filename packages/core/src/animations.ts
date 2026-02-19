import { interpolate, spring, Easing } from "remotion";

export const fadeIn = (frame: number, start = 0, duration = 30) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const fadeOut = (frame: number, start: number, duration = 30) =>
  interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const fadeInOut = (frame: number, totalDuration: number, fadeDuration = 20) =>
  interpolate(
    frame,
    [0, fadeDuration, totalDuration - fadeDuration, totalDuration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

export const slideInFromLeft = (frame: number, fps: number, distance = 100) => {
  const progress = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
  return interpolate(progress, [0, 1], [-distance, 0]);
};

export const slideInFromRight = (frame: number, fps: number, distance = 100) => {
  const progress = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
  return interpolate(progress, [0, 1], [distance, 0]);
};

export const slideInFromBottom = (frame: number, fps: number, distance = 80) => {
  const progress = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
  return interpolate(progress, [0, 1], [distance, 0]);
};

export const slideInFromTop = (frame: number, fps: number, distance = 80) => {
  const progress = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
  return interpolate(progress, [0, 1], [-distance, 0]);
};

export const scaleIn = (frame: number, fps: number) =>
  spring({ frame, fps, config: { stiffness: 250, damping: 11 } });

export const popIn = (frame: number, fps: number) =>
  spring({ frame, fps, config: { stiffness: 320, damping: 10 } });

export const smoothEase = Easing.bezier(0.4, 0, 0.2, 1);
export const snappyEase = Easing.bezier(0.2, 0, 0, 1);

export const animateNumber = (
  frame: number,
  start: number,
  end: number,
  startFrame = 0,
  duration = 30,
) => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smoothEase,
  });
  return start + (end - start) * progress;
};

export const staggerDelay = (index: number, delayPerItem = 5) =>
  index * delayPerItem;
