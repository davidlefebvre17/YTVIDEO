/**
 * BeatEpisode — Newspaper-flow video composition (E3 plan).
 *
 * Flow: Disclaimer → NewspaperPage (with pre-segment audio)
 *       → [ZoomIn → Beats → ZoomOut → Between] × N
 *       → Closing NewspaperPage
 *
 * The newspaper page is the HOME BASE — the viewer sees the full "edition"
 * then dives into each segment via zoom transitions.
 */
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Video,
  Audio,
  staticFile,
} from "remotion";
import type {
  EpisodeScript,
  AssetSnapshot,
  Beat,
  BeatTransition,
} from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { BeatSequence } from "../scenes/beat/BeatSequence";
import { InkSubtitle, type SubtitleLine } from "../scenes/shared/InkSubtitle";
import { GrainOverlay } from "../scenes/shared/GrainOverlay";
import { DisclaimerBar } from "../scenes/shared/DisclaimerBar";
import { BeatAudioTrack } from "../audio/BeatAudioTrack";
import { DisclaimerScene } from "../scenes/shared/DisclaimerScene";
import { TypewriterTitle } from "../scenes/shared/TypewriterTitle";
import {
  NewspaperPage,
  computeSegmentRects,
  type SegmentCard,
} from "../scenes/shared/NewspaperPage";
import { ZoomTransition } from "../scenes/shared/ZoomTransition";
import { ScrollingTicker } from "../scenes/shared/ScrollingTicker";
import { NewsRollBanner } from "../scenes/shared/NewsRollBanner";

// ── Props ────────────────────────────────────────────────────
export interface BeatEpisodeProps {
  script: EpisodeScript;
  beats: Beat[];
  assets?: AssetSnapshot[];
  news?: import("@yt-maker/core").NewsItem[];
  /** Owl intro audio path (played over owl video clips) */
  owlIntroAudio?: string;
  /** Owl closing audio path */
  owlClosingAudio?: string;
  /** Owl transition audio paths per segment */
  owlTransitionAudios?: Record<string, string>;
  [key: string]: unknown;
}

// ── Owl video clips ──────────────────────────────────────────
const OWL_INTRO_SRC = staticFile("owl-video/owl_intro_std_1080p.mp4");
const OWL_DIVE_SRC = staticFile("owl-video/owl_clip2_kling.mp4");
const OWL_INTRO_FRAMES = 240; // 8s @ 30fps
const OWL_DIVE_FRAMES = 300; // 10s @ 30fps
const OWL_CROSSFADE = 20; // crossfade from dive video into NewspaperPage
const OWL_CLIP_OVERLAP = 15; // overlap between intro and dive for smooth transition

/** Owl clip with fade-out at end */
const OwlClipFade: React.FC<{
  durationInFrames: number;
  fadeOutFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, fadeOutFrames, children }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/** Owl dive clip: fade-in at start, crossfade to newspaper at end */
const OwlDiveWithCrossfade: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  // Fade in at start (overlaps with intro clip)
  const fadeIn = interpolate(frame, [0, OWL_CLIP_OVERLAP], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Fade out at end (crossfade to newspaper)
  const fadeStart = durationInFrames - OWL_CROSSFADE;
  const videoOp = interpolate(frame, [fadeStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const pageOp = interpolate(frame, [fadeStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const combinedVideoOp = Math.min(fadeIn, videoOp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: pageOp }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: combinedVideoOp }}>
        <Video src={OWL_DIVE_SRC} style={{ width: "100%", height: "100%" }} volume={0} muted />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Constants ────────────────────────────────────────────────
const DISCLAIMER_FRAMES = 90; // 3s
const ZOOM_FRAMES = 45; // 1.5s
const BETWEEN_FRAMES = 90; // 3s pause for owl transition voice between segments
const CROSSFADE_FRAMES = 25; // overlap between zoom end and first beat
const MIN_NEWSPAPER_FRAMES = 600; // 20s minimum newspaper intro
const MIN_CLOSING_FRAMES = 150; // 5s minimum closing

const PRE_SEGMENT_IDS = ["hook", "title_card", "thread"];

// ── Beat helpers ─────────────────────────────────────────────

export function getEffectiveDuration(beat: Beat): number {
  return (
    beat.timing?.audioDurationSec ??
    beat.timing?.estimatedDurationSec ??
    beat.durationSec
  );
}

export function getTransitionDurationFrames(type: BeatTransition): number {
  switch (type) {
    case "cut":
      return 2;
    case "fade":
      return 10;
    case "cross_dissolve":
      return 15;
    default:
      return 10;
  }
}

/** Group beats by segmentId, preserving insertion order. */
function groupBeatsBySegment(beats: Beat[]): Map<string, Beat[]> {
  const map = new Map<string, Beat[]>();
  for (const b of beats) {
    if (!map.has(b.segmentId)) map.set(b.segmentId, []);
    map.get(b.segmentId)!.push(b);
  }
  return map;
}

/** Duration of a beat group in frames, accounting for crossfade overlaps. */
function groupDurationFrames(beats: Beat[], fps: number): number {
  let total = 0;
  for (let i = 0; i < beats.length; i++) {
    const dur = Math.max(
      15,
      Math.round(getEffectiveDuration(beats[i]) * fps),
    );
    total +=
      i === 0
        ? dur
        : dur - getTransitionDurationFrames(beats[i - 1].transitionOut);
  }
  return Math.max(0, total);
}

/** Layout beats sequentially with crossfade overlaps. */
function layoutBeats(
  beats: Beat[],
  sectionStart: number,
  fps: number,
): Array<{ start: number; duration: number; fadeFrames: number }> {
  let cumFrames = 0;
  return beats.map((beat, i) => {
    const dur = Math.max(
      15,
      Math.round(getEffectiveDuration(beat) * fps),
    );
    if (i === 0) {
      const result = { start: sectionStart, duration: dur, fadeFrames: 0 };
      cumFrames = dur;
      return result;
    }
    const prevFade = getTransitionDurationFrames(
      beats[i - 1].transitionOut,
    );
    const start = sectionStart + cumFrames - prevFade;
    const result = {
      start,
      duration: dur + prevFade,
      fadeFrames: prevFade,
    };
    cumFrames += dur - prevFade;
    return result;
  });
}

// ── Total duration (used by calculateMetadata in Root.tsx) ────

export function computeNewspaperDuration(
  beats: Beat[],
  script: EpisodeScript,
  fps: number,
): number {
  const groups = groupBeatsBySegment(beats);

  const preSegDur = PRE_SEGMENT_IDS.reduce(
    (sum, id) => sum + groupDurationFrames(groups.get(id) ?? [], fps),
    0,
  );
  const newspaperIntro = Math.max(MIN_NEWSPAPER_FRAMES, preSegDur + 60);

  const segIds = script.sections
    .filter((s) => s.type === "segment")
    .map((s) => s.id);
  let segTotal = 0;
  for (let i = 0; i < segIds.length; i++) {
    const dur = groupDurationFrames(groups.get(segIds[i]) ?? [], fps);
    // CROSSFADE_FRAMES overlap means beats start earlier, reducing total
    segTotal += ZOOM_FRAMES + dur + ZOOM_FRAMES - CROSSFADE_FRAMES;
    if (i < segIds.length - 1) segTotal += BETWEEN_FRAMES;
  }

  const closingDur = groups.has("closing")
    ? groupDurationFrames(groups.get("closing")!, fps) + 60
    : MIN_CLOSING_FRAMES;

  const owlTotal = OWL_INTRO_FRAMES + OWL_DIVE_FRAMES - OWL_CLIP_OVERLAP;
  return owlTotal + newspaperIntro + segTotal + closingDur;
}

// ── CrossfadeBeat ────────────────────────────────────────────

const CrossfadeBeat: React.FC<{
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
  fadeFrames: number;
}> = ({ beat, assets, accentColor, durationInFrames, fadeFrames }) => {
  const frame = useCurrentFrame();
  const ff = Math.max(1, fadeFrames);
  const fadeIn = interpolate(frame, [0, ff], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - ff, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <BeatSequence
        beat={beat}
        assets={assets}
        accentColor={accentColor}
      />
    </AbsoluteFill>
  );
};

// ── Main Component ───────────────────────────────────────────

export const BeatEpisode: React.FC<BeatEpisodeProps> = ({
  script,
  beats,
  assets = [],
  news = [],
  owlIntroAudio,
  owlClosingAudio,
  owlTransitionAudios = {},
}) => {
  const { fps } = useVideoConfig();
  const mood = script.direction?.moodMusic ?? "neutre_analytique";
  const accentColor =
    BRAND.moodAccent[mood] ?? BRAND.colors.accentDefault;

  // ── Step 1: Group and classify beats ──
  const beatGroups = useMemo(
    () => groupBeatsBySegment(beats),
    [beats],
  );

  const segmentIds = useMemo(
    () =>
      script.sections
        .filter((s) => s.type === "segment")
        .map((s) => s.id),
    [script.sections],
  );

  // ── Step 2: Segment cards for NewspaperPage ──
  const segmentCards: SegmentCard[] = useMemo(
    () =>
      segmentIds.map((id) => {
        const section = script.sections.find((s) => s.id === id);
        const firstBeat = (beatGroups.get(id) ?? [])[0];
        return {
          id,
          title: section?.title ?? id,
          depth: section?.depth,
          imageSrc: firstBeat?.imagePath,
          narration: section?.narration,
        };
      }),
    [segmentIds, script.sections, beatGroups],
  );

  const segmentRects = useMemo(
    () => computeSegmentRects(segmentCards.length, segmentCards),
    [segmentCards],
  );

  // ── Step 3: Compute all frame timings ──
  const timings = useMemo(() => {
    // Pre-segment audio duration
    const preSegDur = PRE_SEGMENT_IDS.reduce(
      (sum, id) =>
        sum + groupDurationFrames(beatGroups.get(id) ?? [], fps),
      0,
    );
    const newspaperIntroFrames = Math.max(
      MIN_NEWSPAPER_FRAMES,
      preSegDur + 60,
    );

    // Section start times (absolute frames)
    // Owl intro + dive replaces disclaimer; newspaper intro follows
    const owlTotalFrames = OWL_INTRO_FRAMES + OWL_DIVE_FRAMES - OWL_CLIP_OVERLAP;
    const sectionStarts = new Map<string, number>();
    let preCum = owlTotalFrames;
    for (const id of PRE_SEGMENT_IDS) {
      if (beatGroups.has(id)) {
        sectionStarts.set(id, preCum);
        preCum += groupDurationFrames(beatGroups.get(id)!, fps);
      }
    }

    // Segment zoom timings
    interface SegTiming {
      segIdx: number;
      segId: string;
      zoomInStart: number;
      beatsStart: number;
      zoomOutStart: number;
      end: number;
    }
    let segCum = owlTotalFrames + newspaperIntroFrames;
    const segs: SegTiming[] = segmentIds.map((segId, i) => {
      const dur = groupDurationFrames(
        beatGroups.get(segId) ?? [],
        fps,
      );
      const zoomInStart = segCum;
      // Beats start CROSSFADE_FRAMES before zoom ends (overlap for smooth transition)
      const beatsStart = zoomInStart + ZOOM_FRAMES - CROSSFADE_FRAMES;
      const zoomOutStart = beatsStart + dur;
      const isLast = i === segmentIds.length - 1;
      const end =
        zoomOutStart + ZOOM_FRAMES + (isLast ? 0 : BETWEEN_FRAMES);
      sectionStarts.set(segId, beatsStart);
      segCum = end;
      return {
        segIdx: i,
        segId,
        zoomInStart,
        beatsStart,
        zoomOutStart,
        end,
      };
    });

    // Closing
    const closingStart = segCum;
    sectionStarts.set("closing", closingStart);
    const closingDur = beatGroups.has("closing")
      ? groupDurationFrames(beatGroups.get("closing")!, fps) + 60
      : MIN_CLOSING_FRAMES;

    // Per-section beat layouts
    const sectionLayouts = new Map<
      string,
      Array<{ start: number; duration: number; fadeFrames: number }>
    >();
    for (const [segId, segBeats] of beatGroups) {
      const start = sectionStarts.get(segId) ?? 0;
      sectionLayouts.set(segId, layoutBeats(segBeats, start, fps));
    }

    // Build allBeatTimings aligned with beats array
    const allBeatTimings = beats.map((beat) => {
      const sectionBeats = beatGroups.get(beat.segmentId) ?? [];
      const idx = sectionBeats.indexOf(beat);
      const layout = sectionLayouts.get(beat.segmentId) ?? [];
      return layout[idx] ?? { start: 0, duration: 30, fadeFrames: 0 };
    });

    return {
      newspaperIntroFrames,
      segTimings: segs,
      closingStart,
      closingDur,
      allBeatTimings,
    };
  }, [beats, beatGroups, segmentIds, fps]);

  // ── Step 4: Subtitle lines ──
  const subtitleLines = useMemo(
    (): SubtitleLine[] =>
      beats
        .map((beat, i) => {
          const t = timings.allBeatTimings[i];
          if (
            !t ||
            !beat.narrationChunk ||
            beat.narrationChunk.length < 3
          )
            return null;
          return {
            text: beat.narrationChunk,
            startFrame: t.start,
            endFrame: t.start + t.duration,
          };
        })
        .filter((l): l is SubtitleLine => l !== null),
    [beats, timings.allBeatTimings],
  );

  // ── Shared newspaper props ──
  const npProps = {
    title: script.title,
    date: script.date,
    segments: segmentCards,
    threadSummary: script.threadSummary ?? "",
  };

  // ── Render ──
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* ── 1. Owl Intro clip (8s) — fades out at end ── */}
      <Sequence from={0} durationInFrames={OWL_INTRO_FRAMES}>
        <OwlClipFade durationInFrames={OWL_INTRO_FRAMES} fadeOutFrames={OWL_CLIP_OVERLAP}>
          <Video src={OWL_INTRO_SRC} style={{ width: "100%", height: "100%" }} volume={0} muted />
        </OwlClipFade>
      </Sequence>

      {/* ── 2. Owl Dive clip (10s) — fades in at start, crossfades to newspaper at end ── */}
      <Sequence from={OWL_INTRO_FRAMES - OWL_CLIP_OVERLAP} durationInFrames={OWL_DIVE_FRAMES}>
        <OwlDiveWithCrossfade durationInFrames={OWL_DIVE_FRAMES}>
          <NewspaperPage
            {...npProps}
            activeSegmentIdx={0}
            showTypewriter
          />
        </OwlDiveWithCrossfade>
      </Sequence>

      {/* ── 3. Newspaper intro (pre-segment audio plays over this) ── */}
      <Sequence
        from={OWL_INTRO_FRAMES + OWL_DIVE_FRAMES - OWL_CLIP_OVERLAP}
        durationInFrames={timings.newspaperIntroFrames}
      >
        <NewspaperPage
          {...npProps}
          activeSegmentIdx={0}
          showTypewriter
        />
      </Sequence>

      {/* ── 3. Segment zoom loops ── */}
      {timings.segTimings.map((st, i) => {
        const segBeats = beatGroups.get(st.segId) ?? [];
        const section = script.sections.find((s) => s.id === st.segId);
        const rect = segmentRects[i];
        if (!rect || segBeats.length === 0) return null;

        return (
          <React.Fragment key={st.segId}>
            {/* Zoom In → newspaper zooms toward segment image */}
            <Sequence
              from={st.zoomInStart}
              durationInFrames={ZOOM_FRAMES}
            >
              <ZoomTransition
                direction="in"
                sourceRect={rect}
                durationInFrames={ZOOM_FRAMES}
              >
                <NewspaperPage
                  {...npProps}
                  activeSegmentIdx={i}
                  showTypewriter={false}
                />
              </ZoomTransition>
            </Sequence>

            {/* Beats play full-screen (first beat overlaps zoom-in end for smooth crossfade) */}
            {segBeats.map((beat, j) => {
              const globalIdx = beats.indexOf(beat);
              const bt = timings.allBeatTimings[globalIdx];
              if (!bt) return null;
              // First beat gets extra fade-in frames to blend with zoom
              const effectiveFade = j === 0
                ? Math.max(bt.fadeFrames, CROSSFADE_FRAMES)
                : bt.fadeFrames;
              return (
                <Sequence
                  key={beat.id}
                  from={bt.start}
                  durationInFrames={bt.duration}
                >
                  <CrossfadeBeat
                    beat={beat}
                    assets={assets}
                    accentColor={accentColor}
                    durationInFrames={bt.duration}
                    fadeFrames={effectiveFade}
                  />
                  {/* Segment title overlay on first beat */}
                  {j === 0 && section && (
                    <TypewriterTitle
                      text={section.title}
                      durationInFrames={Math.min(
                        60,
                        Math.round(1.5 * fps),
                      )}
                      accentColor={accentColor}
                    />
                  )}
                </Sequence>
              );
            })}

            {/* Zoom Out → back to newspaper */}
            <Sequence
              from={st.zoomOutStart}
              durationInFrames={ZOOM_FRAMES}
            >
              <ZoomTransition
                direction="out"
                sourceRect={rect}
                durationInFrames={ZOOM_FRAMES}
              >
                <NewspaperPage
                  {...npProps}
                  activeSegmentIdx={
                    i < segmentIds.length - 1 ? i + 1 : -1
                  }
                  showTypewriter={false}
                />
              </ZoomTransition>
            </Sequence>

            {/* Brief pause on newspaper between segments */}
            {i < segmentIds.length - 1 && BETWEEN_FRAMES > 0 && (
              <Sequence
                from={st.zoomOutStart + ZOOM_FRAMES}
                durationInFrames={BETWEEN_FRAMES}
              >
                <NewspaperPage
                  {...npProps}
                  activeSegmentIdx={i + 1}
                  showTypewriter={false}
                />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}

      {/* ── 4. Closing (newspaper page, no highlight) ── */}
      <Sequence
        from={timings.closingStart}
        durationInFrames={timings.closingDur}
      >
        <NewspaperPage
          {...npProps}
          activeSegmentIdx={-1}
          showTypewriter={false}
        />
      </Sequence>

      {/* ── Owl audio: intro over video clips ── */}
      {owlIntroAudio && (
        <Sequence from={0} durationInFrames={OWL_INTRO_FRAMES + OWL_DIVE_FRAMES}>
          <Audio src={staticFile(owlIntroAudio)} volume={1} />
        </Sequence>
      )}

      {/* ── Owl audio: transitions between segments (over cream background) ── */}
      {timings.segTimings.map((st, i) => {
        const audioPath = owlTransitionAudios[st.segId];
        if (!audioPath || i === 0) return null; // first segment: newspaper intro is the transition
        return (
          <Sequence key={`owl-tr-${st.segId}`}
            from={st.zoomInStart - BETWEEN_FRAMES}
            durationInFrames={BETWEEN_FRAMES + ZOOM_FRAMES}>
            <Audio src={staticFile(audioPath)} volume={1} />
          </Sequence>
        );
      })}

      {/* ── Owl audio: closing ── */}
      {owlClosingAudio && (
        <Sequence from={timings.closingStart} durationInFrames={timings.closingDur}>
          <Audio src={staticFile(owlClosingAudio)} volume={1} />
        </Sequence>
      )}

      {/* ── Beat audio: voice TTS + SFX ── */}
      <BeatAudioTrack
        beats={beats}
        beatTimings={timings.allBeatTimings}
        fps={fps}
        direction={script.direction}
      />

      {/* ── Scrolling ticker — only during segment beats ── */}
      {timings.segTimings.map((st) => {
        const segBeats = beatGroups.get(st.segId) ?? [];
        if (segBeats.length === 0) return null;
        const firstBeatIdx = beats.indexOf(segBeats[0]);
        const lastBeatIdx = beats.indexOf(segBeats[segBeats.length - 1]);
        const firstTiming = timings.allBeatTimings[firstBeatIdx];
        const lastTiming = timings.allBeatTimings[lastBeatIdx];
        if (!firstTiming || !lastTiming) return null;
        const tickerStart = firstTiming.start;
        const tickerEnd = lastTiming.start + lastTiming.duration;
        return (
          <Sequence
            key={`ticker-${st.segId}`}
            from={tickerStart}
            durationInFrames={tickerEnd - tickerStart}
          >
            <ScrollingTicker assets={assets} />
            <NewsRollBanner news={news} />
          </Sequence>
        );
      })}

      {/* ── Viewport-locked overlays ── */}
      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay opacity={0.04} />
      <DisclaimerBar lang={script.lang} />
    </AbsoluteFill>
  );
};
