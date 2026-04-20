import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import type { EpisodeScript, AssetSnapshot } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import type { VisualSlot } from "../scenes/SegmentScene";
import { NewspaperCanvas } from "../scenes/newspaper/NewspaperCanvas";
import { useCamera } from "../scenes/newspaper/useCamera";
import { NEWSPAPER_KEYFRAMES, buildFocusFrames } from "../scenes/newspaper/camera-keyframes";
import { NP, zoneForSegment } from "../scenes/newspaper/newspaper-layout";
import { ImageFrame } from "../scenes/newspaper/ImageFrame";
import { InkSubtitle, type SubtitleLine } from "../scenes/shared/InkSubtitle";
import { GrainOverlay } from "../scenes/shared/GrainOverlay";
import { DisclaimerBar } from "../scenes/shared/DisclaimerBar";

interface NewspaperEpisodeProps {
  script: EpisodeScript;
  assets: AssetSnapshot[];
  storyboard: { slots: VisualSlot[] };
  lang?: "fr" | "en";
}

export const NewspaperEpisode: React.FC<NewspaperEpisodeProps> = ({
  script,
  assets,
  storyboard,
  lang = "fr",
}) => {
  const keyframes = NEWSPAPER_KEYFRAMES;
  const camera = useCamera(keyframes);
  const accentColor = resolveAccent(script);

  const focusFrames = useMemo(() => buildFocusFrames(keyframes, 30), []);
  const subtitleLines = useMemo(() => buildSubtitleLines(script, assets, 30), [script, assets]);

  const slotsBySegId = useMemo(() => {
    const map: Record<string, VisualSlot[]> = {};
    for (const slot of storyboard.slots) {
      if (!map[slot.segId]) map[slot.segId] = [];
      map[slot.segId].push(slot);
    }
    return map;
  }, [storyboard.slots]);

  const segmentOffsets = useMemo(() => {
    const map: Record<string, number> = {};
    let t = 0;
    for (const sec of script.sections) {
      map[sec.id] = t;
      t += sec.durationSec;
    }
    return map;
  }, [script.sections]);

  const segments = script.sections.filter((s) => s.type === "segment");

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream, overflow: "hidden" }}>
      {/* Camera wrapper — transforms the canvas (same size as viewport) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: NP.canvas.w,
          height: NP.canvas.h,
          transform: camera.transform,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        <NewspaperCanvas
          script={script}
          accentColor={accentColor}
          focusFrames={focusFrames}
        />

        {/* ImageFrames overlaid on article placeholder positions */}
        {segments.map((seg, idx) => {
          const slots = slotsBySegId[seg.id] ?? [];
          const frameSlots = slots.filter(
            (s) => s.source === "REMOTION_CHART" || s.source === "REMOTION_DATA"
          );
          if (frameSlots.length === 0) return null;

          const depth = seg.depth ?? (idx === 0 ? "deep" : idx < 3 ? "focus" : "flash");
          const dims = NP.imageFrame[depth as keyof typeof NP.imageFrame] ?? NP.imageFrame.focus;
          const pos = getImageFramePosition(idx, depth);

          return (
            <div
              key={seg.id}
              style={{
                position: "absolute",
                top: pos.y,
                left: pos.x,
                width: dims.w,
                height: dims.h,
              }}
            >
              <ImageFrame
                slots={frameSlots}
                section={seg}
                assets={assets}
                width={dims.w}
                height={dims.h}
                segmentOffsetSec={segmentOffsets[seg.id] ?? 0}
                accentColor={accentColor}
              />
            </div>
          );
        })}
      </div>

      {/* Paper shadow on viewport edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 60px 20px rgba(26, 22, 18, 0.15)",
          pointerEvents: "none",
          zIndex: 500,
        }}
      />

      {/* ── Viewport-locked overlays ── */}
      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay />
      <DisclaimerBar lang={lang} />
    </AbsoluteFill>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveAccent(script: EpisodeScript): string {
  const mood = script.direction?.moodMusic;
  if (mood && BRAND.moodAccent[mood]) return BRAND.moodAccent[mood];
  return BRAND.colors.accentDefault;
}

/**
 * Returns the absolute (x, y) position of an image frame on the canvas.
 */
function getImageFramePosition(segIdx: number, depth: string): { x: number; y: number } {
  const zone = zoneForSegment(segIdx);
  // kicker (~18px) + title (~30-40px) + margins
  const titleOffset = depth === "deep" ? 55 : depth === "focus" ? 45 : 35;
  return {
    x: zone.x + 5,
    y: zone.y + titleOffset,
  };
}

function humanizeTickers(text: string, assets: AssetSnapshot[]): string {
  const nameBy = new Map<string, string>();
  for (const a of assets) if (a.symbol && a.name) nameBy.set(a.symbol, a.name);
  return text.replace(/"([A-Z0-9^=.\-]{1,15})"/g, (m, sym) => nameBy.get(sym) ?? sym);
}

function buildSubtitleLines(script: EpisodeScript, assets: AssetSnapshot[], fps: number): SubtitleLine[] {
  const lines: SubtitleLine[] = [];
  let currentSec = 0;

  for (const section of script.sections) {
    if (!section.narration || section.narration.length < 5) {
      currentSec += section.durationSec;
      continue;
    }

    const humanized = humanizeTickers(section.narration, assets);
    const words = humanized.split(/\s+/);
    const chunkSize = 13;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    const chunkDuration = section.durationSec / chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      const startSec = currentSec + i * chunkDuration;
      lines.push({
        text: chunks[i],
        startFrame: Math.round(startSec * fps),
        endFrame: Math.round((startSec + chunkDuration) * fps),
      });
    }
    currentSec += section.durationSec;
  }
  return lines;
}
