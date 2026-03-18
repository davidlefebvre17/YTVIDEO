import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import type { CameraKeyframe, CameraEasing } from "./camera-keyframes";
import { NP } from "./newspaper-layout";

export interface CameraTransform {
  /** CSS transform string to apply to the canvas wrapper */
  transform: string;
  /** Current zoom level (for debug/conditional rendering) */
  zoom: number;
  /** Current center X */
  cx: number;
  /** Current center Y */
  cy: number;
}

/**
 * Resolve a CameraEasing name to a Remotion easing function.
 *
 *   smooth   — gentle ease in/out (slow pans, body reading)
 *   snap     — fast out, soft landing (zoom into article)
 *   dramatic — slow start → whip → soft end (pull-backs, transitions)
 *   linear   — constant speed (slow drifts)
 */
function resolveEasing(name: CameraEasing = "smooth"): (t: number) => number {
  switch (name) {
    case "snap":
      // Fast departure, soft landing
      return Easing.out(Easing.exp);
    case "dramatic":
      // Slow → fast → slow (whip-like)
      return Easing.bezier(0.22, 1.0, 0.36, 1.0);
    case "linear":
      return (t: number) => t;
    case "smooth":
    default:
      return Easing.inOut(Easing.cubic);
  }
}

/**
 * Hook that interpolates camera position between keyframes.
 * Returns a CSS transform that positions the canvas so the camera's
 * center point is at the center of the viewport.
 *
 * Each keyframe can specify its own easing curve via the `easing` field.
 * The easing on a keyframe controls the transition FROM the previous keyframe TO it.
 */
export function useCamera(keyframes: CameraKeyframe[]): CameraTransform {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  // Find surrounding keyframes
  let prevIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i + 1].t > currentSec) break;
    prevIdx = i + 1;
  }
  const nextIdx = Math.min(prevIdx + 1, keyframes.length - 1);

  const prev = keyframes[prevIdx];
  const next = keyframes[nextIdx];

  let cx: number, cy: number, zoom: number;

  if (prevIdx === nextIdx || prev.t === next.t) {
    cx = prev.cx;
    cy = prev.cy;
    zoom = prev.zoom;
  } else {
    // Use the DESTINATION keyframe's easing (transition TO next)
    const easingFn = resolveEasing(next.easing);

    const progress = interpolate(
      currentSec,
      [prev.t, next.t],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easingFn }
    );

    cx = prev.cx + (next.cx - prev.cx) * progress;
    cy = prev.cy + (next.cy - prev.cy) * progress;
    zoom = prev.zoom + (next.zoom - prev.zoom) * progress;
  }

  // Camera transform:
  // 1. Scale the canvas by `zoom`
  // 2. Translate so that (cx, cy) on the canvas maps to the center of the viewport
  const vpCenterX = NP.viewport.w / 2;
  const vpCenterY = NP.viewport.h / 2;
  const tx = vpCenterX - cx * zoom;
  const ty = vpCenterY - cy * zoom;

  return {
    transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
    zoom,
    cx,
    cy,
  };
}
