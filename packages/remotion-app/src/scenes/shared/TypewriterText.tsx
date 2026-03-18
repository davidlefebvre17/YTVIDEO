/**
 * TypewriterText — old mechanical typewriter stamp effect.
 * Characters appear one by one with irregular timing and ink-stamp impact.
 * No digital cursor — each letter lands like a key hitting paper.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TypewriterTextProps {
  text: string;
  /** Frame at which typing starts (default 0) */
  startFrame?: number;
  /** Base characters per frame — actual speed varies per character (default 0.8) */
  charsPerFrame?: number;
  /** React inline styles for the text container */
  style?: React.CSSProperties;
  /** Tag to render (default 'span') */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}

/** Deterministic pseudo-random from char index + code point */
function charRng(index: number, code: number): number {
  let h = (index * 2654435761 + code * 40503) | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

/** How many frames a character "costs" based on its type */
function charDelay(ch: string, rng: number): number {
  if (ch === " ") return 1.4 + rng * 1.0;           // spaces: slight hesitation
  if (".!?…".includes(ch)) return 2.5 + rng * 1.5;  // sentence end: longer pause
  if (",;:–—".includes(ch)) return 1.8 + rng * 0.8; // punctuation: medium pause
  if (ch === "\n") return 3.0 + rng * 1.0;           // newline: carriage return
  return 0.8 + rng * 0.7;                            // letters: fast but irregular
}

/** Pre-compute cumulative frame timestamps for each character */
function buildTimeline(text: string, charsPerFrame: number) {
  const speedFactor = 1 / Math.max(charsPerFrame, 0.1);
  const stamps: number[] = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    stamps.push(t);
    const rng = charRng(i, text.charCodeAt(i));
    t += charDelay(text[i], rng) * speedFactor;
  }
  return { stamps, totalFrames: t };
}

/** Stamp impact: frames since this char appeared → scale + opacity multiplier */
function stampImpact(age: number): { scale: number; opacity: number; y: number } {
  if (age < 0) return { scale: 0, opacity: 0, y: -2 };
  // Quick overshoot then settle
  const scale = interpolate(age, [0, 1, 3], [1.15, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(age, [0, 2], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Tiny downward punch on impact
  const y = interpolate(age, [0, 1, 3], [0.5, -0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { scale, opacity, y };
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.8,
  style,
  as: Tag = "span",
}) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame - startFrame);

  const { stamps } = useMemo(
    () => buildTimeline(text, charsPerFrame),
    [text, charsPerFrame]
  );

  // Fade in the whole block
  const blockOpacity = interpolate(relFrame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Find how many chars are visible
  let visibleCount = 0;
  for (let i = 0; i < stamps.length; i++) {
    if (stamps[i] <= relFrame) visibleCount = i + 1;
    else break;
  }

  return (
    <Tag
      style={{
        ...style,
        opacity: blockOpacity,
        whiteSpace: "pre-wrap",
      }}
    >
      {text.split("").map((ch, i) => {
        if (i >= visibleCount) return null;

        const age = relFrame - stamps[i];
        // Only animate recent characters (perf: skip old ones)
        if (age > 6) return <React.Fragment key={i}>{ch}</React.Fragment>;

        const impact = stampImpact(age);
        const rng = charRng(i, text.charCodeAt(i));
        // Micro-rotation: ±1.5deg, deterministic per char
        const rotation = (rng - 0.5) * 3;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `scale(${impact.scale}) translateY(${impact.y}px) rotate(${rotation * (age < 4 ? 1 : 0)}deg)`,
              opacity: impact.opacity,
              // Preserve spaces
              whiteSpace: ch === " " ? "pre" : undefined,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </Tag>
  );
};
