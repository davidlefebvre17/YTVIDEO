/**
 * ColdOpenPunch — kinetic cold open for the 0-3s YouTube retention window.
 * Editorial identity (cream paper, ink, Bebas Neue) with broadcast-grade motion :
 * camera shake on stamp impact, bar-wipe transitions, camera punch on final
 * fragment, closing shutter + cream flash hand-off.
 *
 * UNIFIED COMPOSITION : every fragment uses the SAME centered layout, the
 * same paddings, the same auto-fit type sizing. Crescendo across fragments
 * is achieved through accent color + rule weight, never through layout
 * change. Tolerates 1, 2, or 3 fragments cleanly.
 *
 * Sync : `getColdOpenPunchStampFrames` returns slot start + STAMP_DELAY,
 * which is the visual hit frame. Parent uses these to fire SFX strikes.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BRAND } from "@yt-maker/core";
import { GrainOverlay } from "./GrainOverlay";

interface ColdOpenPunchProps {
  fragments: string[];
  /** Total duration of the punch card in frames. */
  durationInFrames: number;
  /** Optional accent ink for the final fragment (defaults to brand accentDefault). */
  accentColor?: string;
  /** Show small "01 / 03" mono counter above each fragment (default true). */
  showCount?: boolean;
  /** Optional issue label shown in masthead. */
  issueLabel?: string;
  /** Optional date label shown in masthead. */
  dateLabel?: string;
}

/** Frames between slot start and the visual stamp impact. */
const STAMP_DELAY_FRAMES = 6;

/** Frames the bar-wipe needs to cross the screen. */
const WIPE_FRAMES = 4;

/** Type frame dimensions — centered safe zone for the headline. */
const TYPE_FRAME_WIDTH = 1500;
const TYPE_FRAME_HEIGHT = 380;

/** Side padding INSIDE the type frame. Available width = WIDTH - 2*PAD. */
const SIDE_PAD = 80;

/** Bebas Neue width-to-height ratio (condensed sans, empirically ~0.42). */
const BEBAS_RATIO = 0.42;

/** Absolute upper bound for type size — beyond this it overpowers the page. */
const MAX_FONT_SIZE = 260;

/** Line-height shared across fragments for vertical predictability. */
const LINE_HEIGHT = 0.95;

/**
 * Compute the largest font size that lets `text` fit inside `maxWidth × maxHeight`
 * without breaking any word mid-character. Pure function (Remotion is SSR).
 *
 * Tries two layouts and returns the bigger usable size :
 *  - Single-line : capped by total-text width AND single-line height.
 *  - Two-line wrap : capped by half-text width AND two-line height.
 * In both cases the longest word must fit on one line — guarantees no
 * mid-word break is ever needed by CSS auto-wrap.
 */
function autoFitFontSize(text: string, maxWidth: number, maxHeight: number): number {
  if (!text) return MAX_FONT_SIZE;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return MAX_FONT_SIZE;

  const longestWord = Math.max(...words.map((w) => w.length));
  const totalChars = text.length;

  // Universal constraint : the longest word must fit on a single line
  // (otherwise CSS auto-wrap is forced into a mid-word break).
  const maxByLongestWord = maxWidth / (longestWord * BEBAS_RATIO);

  // Single-line layout — every char on the same row.
  const maxBySingleWidth = maxWidth / (totalChars * BEBAS_RATIO);
  const singleLineHeightCap = maxHeight / LINE_HEIGHT;
  const singleLine = Math.min(maxByLongestWord, maxBySingleWidth, singleLineHeightCap, MAX_FONT_SIZE);

  // Two-line layout — half the chars per row, twice the vertical space.
  const charsPerLine = Math.ceil(totalChars / 2);
  const maxByTwoLineWidth = maxWidth / (charsPerLine * BEBAS_RATIO);
  const twoLineHeightCap = maxHeight / (2 * LINE_HEIGHT);
  const twoLine = Math.min(maxByLongestWord, maxByTwoLineWidth, twoLineHeightCap, MAX_FONT_SIZE);

  // Take whichever layout reaches the bigger size — short texts win on
  // single-line, long texts win on two-line.
  return Math.max(singleLine, twoLine);
}

export const ColdOpenPunch: React.FC<ColdOpenPunchProps> = ({
  fragments,
  durationInFrames,
  accentColor = BRAND.colors.accentDefault,
  showCount = true,
  issueLabel,
  dateLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safe = fragments.filter(Boolean).slice(0, 3);
  if (safe.length === 0) return null;

  const slot = Math.floor(durationInFrames / safe.length);
  const currentIdx = Math.min(safe.length - 1, Math.floor(frame / slot));
  const localFrame = frame - currentIdx * slot;
  const isLastSlot = currentIdx === safe.length - 1;

  // Camera shake on each stamp impact — sin-hash seed for deterministic jitter.
  const shakeWindow = localFrame - STAMP_DELAY_FRAMES;
  let shakeX = 0;
  let shakeY = 0;
  if (shakeWindow >= 0 && shakeWindow < 3) {
    const seed = currentIdx * 7 + shakeWindow;
    shakeX = Math.sin(seed * 12.9898) * 3;
    shakeY = Math.cos(seed * 78.233) * 2;
  }

  // Camera punch on the final fragment only — page-wide zoom-in.
  let pageScale = 1;
  if (isLastSlot) {
    const punch = spring({
      frame: localFrame - STAMP_DELAY_FRAMES,
      fps,
      config: { damping: 14, stiffness: 240, mass: 0.7 },
    });
    pageScale = interpolate(punch, [0, 1], [0.92, 1.0]);
  }

  const pageOpacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Closing shutter — last 14 frames, ink bands close vertically + 1-frame cream flash.
  const shutterFrames = 14;
  const shutterStart = durationInFrames - shutterFrames;
  const shutterT = interpolate(
    frame,
    [shutterStart, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const flashOpacity = frame >= durationInFrames - 2 ? 1 : 0;

  const ruleProgress = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mastheadOpacity = interpolate(frame, [4, 12], [0, 0.65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.cream,
        opacity: pageOpacity,
        fontFamily: BRAND.fonts.display,
        overflow: "hidden",
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${pageScale})`,
        transformOrigin: "center center",
      }}
    >
      <Masthead
        ruleProgress={ruleProgress}
        labelOpacity={mastheadOpacity}
        issueLabel={issueLabel}
        dateLabel={dateLabel}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: TYPE_FRAME_WIDTH,
            height: TYPE_FRAME_HEIGHT,
            overflow: "hidden",
          }}
        >
          {safe.map((text, i) => {
            const localStart = i * slot;
            const visible =
              frame >= localStart - WIPE_FRAMES &&
              frame < localStart + slot + WIPE_FRAMES;
            if (!visible) return null;
            return (
              <Fragment
                key={`frag-${i}`}
                text={text}
                index={i}
                total={safe.length}
                slot={slot}
                frame={frame}
                fps={fps}
                accentColor={accentColor}
                showCount={showCount}
              />
            );
          })}
        </div>
      </AbsoluteFill>

      {safe.slice(0, -1).map((_, i) => {
        const wipeStart = (i + 1) * slot - 2;
        return (
          <BarWipe
            key={`wipe-${i}`}
            startFrame={wipeStart}
            currentFrame={frame}
            label={i === 0 ? "II." : "III."}
            accentColor={accentColor}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          bottom: 92,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${ruleProgress * 100}%`,
          maxWidth: 1700,
          height: 1,
          backgroundColor: BRAND.colors.rule,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: BRAND.fonts.mono,
          fontSize: 11,
          letterSpacing: "0.4em",
          color: BRAND.colors.inkLight,
          textTransform: "uppercase",
          opacity: mastheadOpacity * 0.7,
        }}
      >
        Owl Street Journal · Édition du soir
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${shutterT * 50}%`,
          backgroundColor: BRAND.colors.ink,
          pointerEvents: "none",
          zIndex: 1500,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${shutterT * 50}%`,
          backgroundColor: BRAND.colors.ink,
          pointerEvents: "none",
          zIndex: 1500,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: BRAND.colors.cream,
          opacity: flashOpacity,
          pointerEvents: "none",
          zIndex: 1600,
        }}
      />

      <GrainOverlay opacity={0.07} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────
// MASTHEAD
// ─────────────────────────────────────────────────────────────────

const Masthead: React.FC<{
  ruleProgress: number;
  labelOpacity: number;
  issueLabel?: string;
  dateLabel?: string;
}> = ({ ruleProgress, labelOpacity, issueLabel, dateLabel }) => (
  <>
    <div
      style={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        width: `${ruleProgress * 100}%`,
        maxWidth: 1700,
        height: 2,
        backgroundColor: BRAND.colors.ink,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        width: `${ruleProgress * 100}%`,
        maxWidth: 1700,
        height: 1,
        backgroundColor: BRAND.colors.rule,
        opacity: 0.7,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 84,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: BRAND.fonts.mono,
        fontSize: 12,
        letterSpacing: "0.5em",
        color: BRAND.colors.inkMid,
        textTransform: "uppercase",
        opacity: labelOpacity,
      }}
    >
      Owl Street Journal
    </div>
    <div
      style={{
        position: "absolute",
        top: 84,
        left: 110,
        fontFamily: BRAND.fonts.mono,
        fontSize: 11,
        letterSpacing: "0.3em",
        color: BRAND.colors.inkLight,
        textTransform: "uppercase",
        opacity: labelOpacity * 0.85,
      }}
    >
      {issueLabel ?? "Édition du soir"}
    </div>
    <div
      style={{
        position: "absolute",
        top: 84,
        right: 110,
        fontFamily: BRAND.fonts.mono,
        fontSize: 11,
        letterSpacing: "0.3em",
        color: BRAND.colors.inkLight,
        textTransform: "uppercase",
        opacity: labelOpacity * 0.85,
      }}
    >
      {dateLabel ?? "Cold Open · p.1"}
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────
// FRAGMENT — single unified composition for every index.
// Differentiation across fragments comes from the rule weight + text color
// (final fragment in accent), never from layout change.
// ─────────────────────────────────────────────────────────────────

const Fragment: React.FC<{
  text: string;
  index: number;
  total: number;
  slot: number;
  frame: number;
  fps: number;
  accentColor: string;
  showCount: boolean;
}> = ({ text, index, total, slot, frame, fps, accentColor, showCount }) => {
  const localStart = index * slot;
  const localFrame = frame - localStart;
  const stampFrame = localFrame - STAMP_DELAY_FRAMES;
  const isFinal = index === total - 1;

  // Hard spring shared across fragments — overshoot visible by design.
  const stampSpring = spring({
    frame: stampFrame,
    fps,
    config: { damping: 12, stiffness: 380, mass: 0.4 },
  });

  // Stamp landing: scale 1.08 → 1.0 + Y settle from -16px → 0.
  const scale = interpolate(stampSpring, [0, 1], [1.08, 1.0]);
  const translateY = interpolate(stampSpring, [0, 1], [-16, 0]);
  const tracking = interpolate(stampSpring, [0, 1], [0.04, isFinal ? 0.005 : -0.008]);

  const opacity = interpolate(stampFrame, [-1, 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ruleProgress = interpolate(stampFrame, [4, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const counterOpacity = interpolate(stampFrame, [-2, 4], [0, 0.65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Auto-fit guarantees the longest word fits on one line and the wrapped
  // text fits vertically. word-break: keep-all is a belt-and-braces guard
  // against any residual mid-word break.
  const availableWidth = TYPE_FRAME_WIDTH - SIDE_PAD * 2;
  // Reserve vertical space for kicker (~36px) + rule (~24px) + gaps (~32px).
  const availableHeight = TYPE_FRAME_HEIGHT - 90;
  const fontSize = autoFitFontSize(text, availableWidth, availableHeight);

  // Crescendo : final fragment in accent color, with a thicker ink rule.
  const textColor = isFinal ? accentColor : BRAND.colors.ink;
  const ruleHeight = isFinal ? 4 : index === 0 ? 1 : 2;
  const ruleColor = isFinal ? accentColor : BRAND.colors.ink;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: `0 ${SIDE_PAD}px`,
      }}
    >
      {showCount && (
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 11,
            letterSpacing: "0.4em",
            color: isFinal ? accentColor : BRAND.colors.inkLight,
            textTransform: "uppercase",
            opacity: counterOpacity,
          }}
        >
          {`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
        </div>
      )}

      <h1
        style={{
          fontFamily: BRAND.fonts.condensed,
          fontWeight: 400,
          fontSize,
          color: textColor,
          margin: 0,
          lineHeight: LINE_HEIGHT,
          letterSpacing: `${tracking}em`,
          textTransform: "uppercase",
          textAlign: "center",
          maxWidth: availableWidth,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          // Anti-mid-word break + cleaner line splitting :
          wordBreak: "keep-all",
          overflowWrap: "normal",
          textWrap: "balance" as const,
          textShadow:
            "0 1px 0 rgba(26,22,18,0.05), 0 2px 4px rgba(26,22,18,0.06)",
        }}
      >
        {text}
        {isFinal && <span style={{ color: accentColor, marginLeft: 6 }}>.</span>}
      </h1>

      <div
        style={{
          width: 380,
          height: ruleHeight,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: `${ruleProgress * 100}%`,
            height: ruleHeight,
            backgroundColor: ruleColor,
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// BAR-WIPE — ink streak between fragments, with trail + accent counter
// ─────────────────────────────────────────────────────────────────

const BarWipe: React.FC<{
  startFrame: number;
  currentFrame: number;
  label: string;
  accentColor: string;
}> = ({ startFrame, currentFrame, label, accentColor }) => {
  const local = currentFrame - startFrame;
  if (local < 0 || local > WIPE_FRAMES + 4) return null;

  const mainProgress = interpolate(local, [0, WIPE_FRAMES], [-1.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const trailProgress = interpolate(local, [1, WIPE_FRAMES + 1], [-1.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reverseProgress = interpolate(
    local,
    [2, WIPE_FRAMES + 3],
    [1.2, -1.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: 0,
          width: "100%",
          height: 14,
          transform: `translateX(${trailProgress * 100}%)`,
          backgroundColor: BRAND.colors.ink,
          opacity: 0.35,
          filter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 800,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: 0,
          width: "100%",
          height: 22,
          transform: `translateX(${mainProgress * 100}%)`,
          backgroundColor: BRAND.colors.ink,
          display: "flex",
          alignItems: "center",
          paddingLeft: "6%",
          pointerEvents: "none",
          zIndex: 900,
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 13,
            letterSpacing: "0.3em",
            color: BRAND.colors.cream,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: "58%",
          left: 0,
          width: "100%",
          height: 4,
          transform: `translateX(${reverseProgress * 100}%)`,
          backgroundColor: accentColor,
          opacity: 0.85,
          pointerEvents: "none",
          zIndex: 900,
        }}
      />
    </>
  );
};

/**
 * Stamp timing for the parent to schedule typewriter SFX strikes.
 * Each entry is the frame at which the visual stamp impact occurs, so
 * audio strikes land on the visual hit (slot start + STAMP_DELAY_FRAMES).
 */
export function getColdOpenPunchStampFrames(
  fragmentCount: number,
  durationInFrames: number,
): number[] {
  if (fragmentCount <= 0) return [];
  const slot = Math.floor(durationInFrames / fragmentCount);
  return Array.from(
    { length: fragmentCount },
    (_, i) => i * slot + STAMP_DELAY_FRAMES,
  );
}
