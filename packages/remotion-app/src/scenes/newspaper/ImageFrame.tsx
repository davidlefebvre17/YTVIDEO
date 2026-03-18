import React from "react";
import { Sequence, useCurrentFrame, interpolate } from "remotion";
import type { AssetSnapshot, ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import type { VisualSlot } from "../SegmentScene";
import { SlotRenderer } from "../shared/SlotRenderer";

interface ImageFrameProps {
  /** Storyboard slots to cycle through in this frame */
  slots: VisualSlot[];
  /** Full section for context (visual cues, title, etc.) */
  section: ScriptSection;
  /** All assets for chart rendering */
  assets: AssetSnapshot[];
  /** Frame dimensions */
  width: number;
  height: number;
  /** Absolute start time of parent segment in seconds */
  segmentOffsetSec: number;
  accentColor?: string;
  fps?: number;
}

const CROSSFADE_FRAMES = 8;

/**
 * ImageFrame — a rectangle within a newspaper article that cycles through
 * storyboard visual slots using Remotion Sequences with crossfade transitions.
 */
export const ImageFrame: React.FC<ImageFrameProps> = ({
  slots,
  section,
  assets,
  width,
  height,
  segmentOffsetSec,
  accentColor = BRAND.colors.accentDefault,
  fps = 30,
}) => {
  if (slots.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          border: `1.5px dashed ${BRAND.colors.rule}`,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BRAND.colors.creamDark,
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 11,
            color: BRAND.colors.inkFaint,
          }}
        >
          {section.id} — NO SLOTS
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        border: `1px solid ${BRAND.colors.rule}40`,
      }}
    >
      {slots.map((slot) => {
        const relStartSec = slot.tStart - segmentOffsetSec;
        const durationSec = slot.tEnd - slot.tStart;
        if (relStartSec < -1 || durationSec <= 0) return null;

        const fromFrame = Math.max(0, Math.round(relStartSec * fps));
        const durationFrames = Math.max(1, Math.round(durationSec * fps));

        return (
          <Sequence
            key={slot.slot}
            from={fromFrame}
            durationInFrames={durationFrames}
            layout="none"
          >
            <CrossfadeSlot
              slot={slot}
              section={section}
              assets={assets}
              width={width}
              height={height}
              accentColor={accentColor}
              durationFrames={durationFrames}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

/** Wraps a single slot with crossfade in/out */
const CrossfadeSlot: React.FC<{
  slot: VisualSlot;
  section: ScriptSection;
  assets: AssetSnapshot[];
  width: number;
  height: number;
  accentColor: string;
  durationFrames: number;
}> = ({ slot, section, assets, width, height, accentColor, durationFrames }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [Math.max(0, durationFrames - CROSSFADE_FRAMES), durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);
  const scale = interpolate(frame, [0, CROSSFADE_FRAMES], [0.97, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <SlotRenderer
        slot={slot}
        assets={assets}
        section={section}
        accentColor={accentColor}
        contentW={width}
        contentH={height}
      />
    </div>
  );
};
