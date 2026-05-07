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
  OffthreadVideo,
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
import { DisclaimerOverlay } from "../scenes/shared/DisclaimerOverlay";
import { LikeSubscribePrompt } from "../scenes/shared/LikeSubscribePrompt";
import { BeatAudioTrack } from "../audio/BeatAudioTrack";
import { getSfxPath, SFX_VOLUME } from "../audio/sfx-library";
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
import { StampOverlay } from "../scenes/shared/StampOverlay";
import { ColdOpenPunch, getColdOpenPunchStampFrames } from "../scenes/shared/ColdOpenPunch";

/**
 * Rule-based fallback to derive 3 punch-card fragments from the hook
 * narration when `script.coldOpenPunch` is absent. Replaced in P4 by an
 * Opus-generated version that crafts a real teaser.
 */
function derivePunchFragments(hook: string | undefined): string[] {
  const HARDCODE_FALLBACK = ["LE MARCHÉ", "BOUGE.", "VOICI POURQUOI."];
  if (!hook) return HARDCODE_FALLBACK;

  // Pick the first NON-DATE sentence. Date sentences match patterns like
  // "Mardi 28 avril 2026" / "Mardi vingt-huit avril deux mille vingt-six"
  // and may be the entire first sentence — in that case, skip to the next.
  const sentences = hook
    .replace(/[*_]/g, "")
    .replace(/—/g, ",")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const isDateOnlySentence = (s: string): boolean => {
    if (s.length > 80) return false;
    return /\b(deux mille|\d{4})\b/i.test(s) &&
      /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(s);
  };

  const editorial = sentences.find((s) => !isDateOnlySentence(s)) ?? sentences[0];
  if (!editorial) return HARDCODE_FALLBACK;

  // 1) Prefer comma-separated clauses if there are 2-4 of them — gives natural editorial cuts.
  // Strip leading lowercase conjunctions ("et", "mais", "puis", "alors") — but NOT "or"
  // because in market context "or" usually means gold, not the conjunction.
  const clauses = editorial
    .split(/,\s*/)
    .map((c) => c.replace(/^(et|mais|puis|alors)\s+/i, "").trim())
    .filter((c) => c.length > 0);

  const fragments = clauses.length >= 2 && clauses.length <= 4
    ? clauses
    : (() => {
        // 2) Otherwise, three-way split on word count
        const words = editorial.split(/\s+/).filter(Boolean);
        if (words.length < 4) return [editorial];
        const third = Math.max(2, Math.floor(words.length / 3));
        return [
          words.slice(0, third).join(" "),
          words.slice(third, 2 * third).join(" "),
          words.slice(2 * third).join(" "),
        ];
      })();

  // 3) Cap each fragment to 9 words max — the ColdOpenPunch component shrinks
  // its font size automatically for longer text (168/140/110px tiers).
  const capped = fragments
    .slice(0, 3)
    .map((f) => {
      const ws = f.split(/\s+/).filter(Boolean);
      return ws.slice(0, 9).join(" ");
    })
    .map((s) => s.toUpperCase().replace(/[,;:]$/, "").trim())
    .filter((s) => s.length > 0);

  return capped.length > 0 ? capped : HARDCODE_FALLBACK;
}

/**
 * Humanize subtitles : "CL=F" → Pétrole WTI (sans guillemets).
 * Opus écrit tickers quoted dans la narration, on les remplace par le nom affichable.
 */
function humanizeSubtitle(text: string, assets: AssetSnapshot[] = []): string {
  if (!text) return text;
  const nameBySymbol = new Map<string, string>();
  for (const a of assets) {
    if (a.symbol && a.name) nameBySymbol.set(a.symbol, a.name);
  }
  // Replace "SYMBOL" (with quotes) → name (no quotes)
  return text.replace(/"([A-Z0-9^=.\-]{1,15})"/g, (match, sym) => {
    return nameBySymbol.get(sym) ?? match.replace(/"/g, '');
  });
}

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
  /** Real durations (seconds) of owl audio clips keyed by owl_intro, owl_tr_seg_1, etc. */
  owlAudioDurations?: Record<string, number>;
  /** Segment audio durations for segment-level TTS mode (segmentId → total seconds) */
  segmentAudioDurations?: Record<string, number>;
  [key: string]: unknown;
}

// ── Owl Paris opener ────────────────────────────────────────
// Single pre-rendered clip (V1 sit-talk + V2 stand + V3 walk-to-window + V4 dive-to-newspaper).
// Replaces the previous owl_seg1 + owl_seg2 pair.
const PARIS_OPENER_SRC = staticFile("owl-video/paris-opener.mp4");
const PARIS_OPENER_FRAMES = 678; // 22.6s @ 30fps (real render length)
const OWL_CROSSFADE = 20; // crossfade from end of opener into NewspaperPage

// ── Inter-segment owl video clips ──────────────────────────────
// Each video plays for ~5s during a transition between segments, then crossfades to NewspaperPage.
// Layered with start/end frame images to prevent flashes around the OffthreadVideo decode boundaries.
const TRANSITION_VIDEO_FRAMES = 150; // 5s @ 30fps
const TRANSITION_FADE_FRAMES = 30; // 1s crossfade image → newspaper after video ends

interface OwlTransitionClip {
  videoSrc: string;
  startImg: string;
  endImg: string;
}

/** Ordered list of inter-segment owl clips. Transition i (between segments i and i+1)
 *  uses TRANSITION_CLIPS[i] if defined, otherwise falls back to a static newspaper.
 *  V9 covers the last transition (before-last → last segment, e.g. seg_5 → panorama). */
const TRANSITION_CLIPS: OwlTransitionClip[] = [
  // T0 (after seg 1) — Paris V5: turn from window + walk right
  {
    videoSrc: staticFile("owl-video/paris_v5.mp4"),
    startImg: staticFile("owl-video/paris_v5_start.png"),
    endImg: staticFile("owl-video/paris_v5_end.png"),
  },
  // T1 (after seg 2) — Paris V6: walk toward camera
  {
    videoSrc: staticFile("owl-video/paris_v6.mp4"),
    startImg: staticFile("owl-video/paris_v6_start.png"),
    endImg: staticFile("owl-video/paris_v6_end.png"),
  },
  // T2 (after seg 3) — Paris V7: stop + take hands out + gesture
  {
    videoSrc: staticFile("owl-video/paris_v7.mp4"),
    startImg: staticFile("owl-video/paris_v7_start.png"),
    endImg: staticFile("owl-video/paris_v7_end.png"),
  },
  // T3 (after seg 4) — Paris V8: walk back, around table, end standing left of table
  {
    videoSrc: staticFile("owl-video/paris_v8.mp4"),
    startImg: staticFile("owl-video/paris_v8_start.png"),
    endImg: staticFile("owl-video/paris_v8_end.png"),
  },
  // T4 (after seg 5, before panorama) — Paris V9: walk last steps + sit in armchair
  {
    videoSrc: staticFile("owl-video/paris_v9.mp4"),
    startImg: staticFile("owl-video/paris_v9_start.png"),
    endImg: staticFile("owl-video/paris_v9_end.png"),
  },
];

// ── Closing/outro clip (overlay on the closing newspaper, ending with freeze + fade-to-black) ──
const PARIS_OUTRO_SRC = staticFile("owl-video/paris_outro.mp4");
const PARIS_OUTRO_END_IMG = staticFile("owl-video/paris_outro_end.png");
const PARIS_OUTRO_FRAMES = 300; // 10s @ 30fps
const PARIS_OUTRO_FREEZE_FRAMES = 150; // 5s freeze on last frame, with fade-to-black overlay

/** Black overlay that fades in from 0 → 1 opacity over the duration. */
const FadeToBlackOverlay: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity }} />;
};

/** Paris opener (single pre-rendered clip) with crossfade to newspaper at end */
const ParisOpenerWithCrossfade: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const fadeStart = durationInFrames - OWL_CROSSFADE;
  const videoOp = interpolate(frame, [fadeStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const pageOp = interpolate(frame, [fadeStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: pageOp }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: videoOp }}>
        <OffthreadVideo src={PARIS_OPENER_SRC} style={{ width: "100%", height: "100%" }} volume={0} muted onError={() => {}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Generic inter-segment owl video transition: layered crossfades to avoid white flashes.
 *  Layer stack (bottom→top):
 *    1) end-image (always full opacity — revealed cleanly when video unmounts)
 *    2) video (plays frame 0 to TRANSITION_VIDEO_FRAMES; last frame pixel-matches end-image)
 *    3) start-image (opaque at frame 0, fades out → reveals video beneath, covers potential flash)
 *    4) newspaper (fades in over TRANSITION_FADE_FRAMES frames after video ends)
 */
const START_CF = 12; // 0.4s crossfade start-image → video
const OwlVideoTransitionBlock: React.FC<{
  clip: OwlTransitionClip;
  durationInFrames: number;
  npProps: React.ComponentProps<typeof NewspaperPage>;
  activeSegmentIdx: number;
}> = ({ clip, npProps, activeSegmentIdx }) => {
  const frame = useCurrentFrame();

  const startImgOpacity = interpolate(frame, [0, START_CF], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const npOpacity = interpolate(
    frame,
    [TRANSITION_VIDEO_FRAMES, TRANSITION_VIDEO_FRAMES + TRANSITION_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const videoVisible = frame < TRANSITION_VIDEO_FRAMES;
  const imgStyle = { width: "100%", height: "100%", objectFit: "cover" } as const;

  return (
    <AbsoluteFill>
      {/* 1. End image as stable base */}
      <AbsoluteFill>
        <img src={clip.endImg} style={imgStyle} alt="" />
      </AbsoluteFill>
      {/* 2. Video plays above end image */}
      {videoVisible && (
        <AbsoluteFill>
          <OffthreadVideo
            src={clip.videoSrc}
            muted
            volume={0}
            style={imgStyle}
            onError={() => {}}
          />
        </AbsoluteFill>
      )}
      {/* 3. Start image crossfades out to reveal video */}
      {startImgOpacity > 0 && (
        <AbsoluteFill style={{ opacity: startImgOpacity }}>
          <img src={clip.startImg} style={imgStyle} alt="" />
        </AbsoluteFill>
      )}
      {/* 4. Newspaper crossfades in from end image at the end of the block */}
      {npOpacity > 0 && (
        <AbsoluteFill style={{ opacity: npOpacity }}>
          <NewspaperPage {...npProps} activeSegmentIdx={activeSegmentIdx} showTypewriter={false} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ── Constants ────────────────────────────────────────────────
const DISCLAIMER_FRAMES = 90; // 3s
const ZOOM_FRAMES = 45; // 1.5s
const BETWEEN_FRAMES_DEFAULT = 90; // 3s fallback for owl transition voice between segments
const CROSSFADE_FRAMES = 25; // overlap between zoom end and first beat
const MIN_NEWSPAPER_FRAMES = 600; // 20s minimum newspaper intro
const MIN_CLOSING_FRAMES = 150; // 5s minimum closing
const PUNCH_CARD_FRAMES = 180; // 6s cold-open punch card (~2s per fragment for readable pace)

const PRE_SEGMENT_IDS = ["hook", "thread"];

/** Minimum frames required for any owl-video transition block:
 *  video + crossfade to newspaper + 15f newspaper tail before zoom-in. */
const VIDEO_TRANSITION_MIN_FRAMES = TRANSITION_VIDEO_FRAMES + TRANSITION_FADE_FRAMES + 15;

/** Get transition duration in frames for a given segment, using real owl audio duration if available.
 *  Transitions with index < TRANSITION_CLIPS.length embed a 5s owl video, so they need a minimum. */
function getBetweenFrames(
  segId: string,
  fps: number,
  owlAudioDurations: Record<string, number> | undefined,
  transitionIdx: number,
): number {
  const key = `owl_tr_${segId}`;
  const audioDur = owlAudioDurations?.[key];
  const audioFrames = audioDur && audioDur > 0
    ? Math.round(audioDur * fps) + 15
    : BETWEEN_FRAMES_DEFAULT;
  // Transitions with a pre-rendered owl video need to fit it.
  if (transitionIdx >= 0 && transitionIdx < TRANSITION_CLIPS.length) {
    return Math.max(VIDEO_TRANSITION_MIN_FRAMES, audioFrames);
  }
  return audioFrames;
}

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

/** Get owl closing duration in frames, using real audio duration if available. */
function getOwlClosingFrames(fps: number, owlAudioDurations?: Record<string, number>): number {
  const dur = owlAudioDurations?.owl_closing;
  if (dur && dur > 0) return Math.round(dur * fps) + 15;
  return 0;
}

export function computeNewspaperDuration(
  beats: Beat[],
  script: EpisodeScript,
  fps: number,
  owlAudioDurations?: Record<string, number>,
  segmentAudioDurations?: Record<string, number>,
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
    const crossfadeDur = groupDurationFrames(groups.get(segIds[i]) ?? [], fps);
    const segAudioDur = segmentAudioDurations?.[segIds[i]];
    const dur = segAudioDur ? Math.round(segAudioDur * fps) : crossfadeDur;
    const isPanorama = segIds[i] === 'seg_panorama';
    if (isPanorama) {
      segTotal += dur;
    } else {
      // CROSSFADE_FRAMES overlap means beats start earlier, reducing total
      segTotal += ZOOM_FRAMES + dur + ZOOM_FRAMES - CROSSFADE_FRAMES;
    }
    if (i < segIds.length - 1) segTotal += getBetweenFrames(segIds[i], fps, owlAudioDurations, i);
  }

  const closingBeatsDur = groups.has("closing")
    ? groupDurationFrames(groups.get("closing")!, fps) + 60
    : MIN_CLOSING_FRAMES;
  const closingDur = closingBeatsDur + getOwlClosingFrames(fps, owlAudioDurations);

  return PUNCH_CARD_FRAMES + PARIS_OPENER_FRAMES + newspaperIntro + segTotal + closingDur;
}

// ── CrossfadeBeat ────────────────────────────────────────────

const CrossfadeBeat: React.FC<{
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
  fadeFrames: number;
  yieldsHistory?: any;
}> = ({ beat, assets, accentColor, durationInFrames, fadeFrames, yieldsHistory }) => {
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
        yieldsHistory={yieldsHistory}
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
  owlAudioDurations,
  segmentAudioDurations,
  ...restProps
}) => {
  const { fps } = useVideoConfig();
  const yieldsHistoryData = (restProps as any).yieldsHistory;
  const mood = script.direction?.moodMusic ?? "neutre_analytique";
  const accentColor =
    BRAND.moodAccent[mood] ?? BRAND.colors.accentDefault;

  // ── Step 0: Fill missing imagePath from nearest sibling in same segment ──
  const patchedBeats = useMemo(() => {
    const grouped = new Map<string, typeof beats>();
    for (const b of beats) {
      const arr = grouped.get(b.segmentId) ?? [];
      arr.push(b);
      grouped.set(b.segmentId, arr);
    }
    return beats.map((b) => {
      if (b.imagePath) return b;
      const siblings = grouped.get(b.segmentId) ?? [];
      const idx = siblings.indexOf(b);
      // Search outward from current position for nearest sibling with an image
      for (let dist = 1; dist < siblings.length; dist++) {
        const before = siblings[idx - dist];
        if (before?.imagePath) return { ...b, imagePath: before.imagePath };
        const after = siblings[idx + dist];
        if (after?.imagePath) return { ...b, imagePath: after.imagePath };
      }
      return b;
    });
  }, [beats]);

  // ── Step 1: Group and classify beats ──
  const beatGroups = useMemo(
    () => groupBeatsBySegment(patchedBeats),
    [patchedBeats],
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
    // Cold-open punch card → Paris opener → newspaper intro
    const sectionStarts = new Map<string, number>();
    let preCum = PUNCH_CARD_FRAMES + PARIS_OPENER_FRAMES;
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
      betweenFrames: number;
      zoomInStart: number;
      beatsStart: number;
      zoomOutStart: number;
      end: number;
    }
    let segCum = PUNCH_CARD_FRAMES + PARIS_OPENER_FRAMES + newspaperIntroFrames;
    const segs: SegTiming[] = segmentIds.map((segId, i) => {
      const crossfadeDur = groupDurationFrames(
        beatGroups.get(segId) ?? [],
        fps,
      );
      // In segment audio mode, use real audio duration (no crossfade reduction)
      const segAudioDur = segmentAudioDurations?.[segId];
      const dur = segAudioDur ? Math.round(segAudioDur * fps) : crossfadeDur;
      const isPanorama = segId === 'seg_panorama';
      const isLast = i === segmentIds.length - 1;

      if (isPanorama) {
        // PANORAMA: no zoom in/out — stays on newspaper page with StampOverlay + audio
        const beatsStart = segCum;
        const betweenF = getBetweenFrames(segId, fps, owlAudioDurations as any, i);
        const end = beatsStart + dur + (isLast ? 0 : betweenF);
        sectionStarts.set(segId, beatsStart);
        segCum = end;
        return {
          segIdx: i,
          segId,
          betweenFrames: betweenF,
          zoomInStart: beatsStart, // no zoom, but field required
          beatsStart,
          zoomOutStart: beatsStart + dur, // no zoom, but field required
          end,
        };
      }

      const betweenF = getBetweenFrames(segId, fps, owlAudioDurations as any, i);
      const zoomInStart = segCum;
      // Beats start CROSSFADE_FRAMES before zoom ends (overlap for smooth transition)
      const beatsStart = zoomInStart + ZOOM_FRAMES - CROSSFADE_FRAMES;
      const zoomOutStart = beatsStart + dur;
      const end =
        zoomOutStart + ZOOM_FRAMES + (isLast ? 0 : betweenF);
      sectionStarts.set(segId, beatsStart);
      segCum = end;
      return {
        segIdx: i,
        segId,
        betweenFrames: betweenF,
        zoomInStart,
        beatsStart,
        zoomOutStart,
        end,
      };
    });

    // Closing
    const closingStart = segCum;
    sectionStarts.set("closing", closingStart);
    const closingBeatsDur = beatGroups.has("closing")
      ? groupDurationFrames(beatGroups.get("closing")!, fps) + 60
      : MIN_CLOSING_FRAMES;
    const owlClosingF = getOwlClosingFrames(fps, owlAudioDurations as any);
    const closingDur = closingBeatsDur + owlClosingF;

    // Per-section beat layouts
    const sectionLayouts = new Map<
      string,
      Array<{ start: number; duration: number; fadeFrames: number }>
    >();
    for (const [segId, segBeats] of beatGroups) {
      const start = sectionStarts.get(segId) ?? 0;
      sectionLayouts.set(segId, layoutBeats(segBeats, start, fps));
    }

    // Build allBeatTimings aligned with patchedBeats array
    const allBeatTimings = patchedBeats.map((beat) => {
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
  }, [patchedBeats, beatGroups, segmentIds, fps, owlAudioDurations]);

  // ── Step 4: Subtitle lines ──
  const subtitleLines = useMemo((): SubtitleLine[] => {
    const beatLines: SubtitleLine[] = patchedBeats
      .map((beat, i) => {
        const t = timings.allBeatTimings[i];
        if (!t || !beat.narrationChunk || beat.narrationChunk.length < 3) return null;
        return {
          text: humanizeSubtitle(beat.narrationChunk, assets),
          startFrame: t.start,
          endFrame: t.start + t.duration,
        };
      })
      .filter((l): l is SubtitleLine => l !== null);

    // Transition subtitles: chunk owlTransition text over audio duration
    const transitionLines: SubtitleLine[] = [];
    for (let i = 1; i < timings.segTimings.length; i++) {
      const prevSeg = timings.segTimings[i - 1];
      const st = timings.segTimings[i];
      const section = script.sections.find((s) => s.id === prevSeg.segId);
      const text = section?.owlTransition?.trim();
      if (!text) continue;
      const audioDur = owlAudioDurations?.[`owl_tr_${prevSeg.segId}`];
      if (!audioDur || audioDur <= 0) continue;
      const audioFrames = Math.round(audioDur * fps);
      const audioStart = st.zoomInStart - prevSeg.betweenFrames;

      const words = humanizeSubtitle(text, assets).split(/\s+/);
      const chunkSize = 11;
      const chunks: string[] = [];
      for (let k = 0; k < words.length; k += chunkSize) {
        chunks.push(words.slice(k, k + chunkSize).join(" "));
      }
      const perChunk = audioFrames / chunks.length;
      for (let k = 0; k < chunks.length; k++) {
        transitionLines.push({
          text: chunks[k],
          startFrame: Math.round(audioStart + k * perChunk),
          endFrame: Math.round(audioStart + (k + 1) * perChunk),
        });
      }
    }

    return [...beatLines, ...transitionLines];
  }, [patchedBeats, timings.allBeatTimings, timings.segTimings, script.sections, owlAudioDurations, fps, assets]);

  // ── Shared newspaper props ──
  const npProps = {
    title: script.title,
    date: script.date,
    segments: segmentCards,
    threadSummary: script.threadSummary ?? "",
  };

  // ── Cold-open punch card content (LLM-provided or rule-based fallback) ──
  const hookSection = script.sections.find((s) => s.type === "hook" || s.id === "hook");
  const punchFragments =
    script.coldOpenPunch?.fragments && script.coldOpenPunch.fragments.length > 0
      ? script.coldOpenPunch.fragments.slice(0, 3)
      : derivePunchFragments(hookSection?.narration);

  // ── Render ──
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* ── 0. Cold-open punch card (3s) — silent except per-fragment SFX strike ── */}
      <Sequence from={0} durationInFrames={PUNCH_CARD_FRAMES}>
        <ColdOpenPunch
          fragments={punchFragments}
          durationInFrames={PUNCH_CARD_FRAMES}
        />
      </Sequence>

      {/* ── SFX: typewriter strike per punch-card fragment ── */}
      {getColdOpenPunchStampFrames(punchFragments.length, PUNCH_CARD_FRAMES).map((startF, k) => (
        <Sequence
          key={`punch-strike-${k}`}
          from={startF}
          durationInFrames={Math.round(0.4 * fps)}
        >
          <Audio src={getSfxPath("sting", k)} volume={SFX_VOLUME.sting * 1.6} />
        </Sequence>
      ))}

      {/* ── 1. Paris opener (V1+V2+V3+V4 pre-rendered, 22.6s) — crossfades to newspaper at end ── */}
      <Sequence from={PUNCH_CARD_FRAMES} durationInFrames={PARIS_OPENER_FRAMES}>
        <ParisOpenerWithCrossfade durationInFrames={PARIS_OPENER_FRAMES}>
          <NewspaperPage
            {...npProps}
            activeSegmentIdx={0}
            showTypewriter
            cardRevealSpread={timings.newspaperIntroFrames}
          />
        </ParisOpenerWithCrossfade>
      </Sequence>

      {/* ── 2. Newspaper intro (pre-segment audio plays over this) ── */}
      <Sequence
        from={PUNCH_CARD_FRAMES + PARIS_OPENER_FRAMES}
        durationInFrames={timings.newspaperIntroFrames}
      >
        <NewspaperPage
          {...npProps}
          activeSegmentIdx={0}
          showTypewriter
          cardRevealSpread={timings.newspaperIntroFrames}
        />
      </Sequence>

      {/* ── SFX: Newspaper unfold when newspaper first appears (after owl intro) ── */}
      <Sequence from={PUNCH_CARD_FRAMES} durationInFrames={Math.round(2 * fps)}>
        <Audio src={getSfxPath("unfold", 0)} volume={SFX_VOLUME.unfold} />
      </Sequence>

      {/* ── SFX: Individual key strikes during headline typewriter ── */}
      {(() => {
        const typeStart = PUNCH_CARD_FRAMES + PARIS_OPENER_FRAMES;
        const titleLen = script.title?.length ?? 40;
        const charsPerFrame = 1.2;
        // One strike every ~4 chars (not every char — too dense)
        const strikeInterval = Math.round(4 / charsPerFrame); // ~3 frames
        const strikeCount = Math.min(Math.ceil(titleLen / 4), 25); // cap at 25 strikes
        // Key files to rotate: typewriter-key + sting (both are short key sounds)
        const keyFiles = ["sting", "sting", "sting"] as const;
        return Array.from({ length: strikeCount }, (_, k) => {
          // Slight volume variation per key (0.12 - 0.22)
          const vol = 0.12 + (((k * 7 + 3) % 11) / 11) * 0.10;
          return (
            <Sequence
              key={`typekey-${k}`}
              from={typeStart + k * strikeInterval}
              durationInFrames={Math.round(0.3 * fps)}
            >
              <Audio
                src={getSfxPath(keyFiles[k % keyFiles.length], k)}
                volume={vol}
              />
            </Sequence>
          );
        });
      })()}

      {/* ── 3. Segment zoom loops ── */}
      {timings.segTimings.map((st, i) => {
        const segBeats = beatGroups.get(st.segId) ?? [];
        const section = script.sections.find((s) => s.id === st.segId);
        const rect = segmentRects[i];
        if (!rect || segBeats.length === 0) return null;

        const isPanorama = st.segId === 'seg_panorama';

        // PANORAMA: stay on newspaper page — no zoom, no BeatSequence images
        // Audio plays via BeatAudioTrack, stamps via StampOverlay (rendered separately)
        if (isPanorama) {
          const panoDur = st.zoomOutStart - st.beatsStart;
          return (
            <React.Fragment key={st.segId}>
              <Sequence from={st.beatsStart} durationInFrames={panoDur}>
                <NewspaperPage
                  {...npProps}
                  activeSegmentIdx={i}
                  showTypewriter={false}
                />
              </Sequence>
              {/* Brief pause on newspaper between segments */}
              {i < segmentIds.length - 1 && st.betweenFrames > 0 && (
                <Sequence
                  from={st.zoomOutStart}
                  durationInFrames={st.betweenFrames}
                >
                  <NewspaperPage
                    {...npProps}
                    activeSegmentIdx={i < segmentIds.length - 1 ? i + 1 : -1}
                    showTypewriter={false}
                  />
                </Sequence>
              )}
            </React.Fragment>
          );
        }

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

            {/* SFX: Paper rustle on zoom in */}
            <Sequence from={st.zoomInStart} durationInFrames={ZOOM_FRAMES}>
              <Audio src={getSfxPath("paperSlide", i)} volume={SFX_VOLUME.paperSlide} />
            </Sequence>

            {/* Beats play full-screen (first beat overlaps zoom-in end for smooth crossfade) */}
            {segBeats.map((beat, j) => {
              const globalIdx = patchedBeats.indexOf(beat);
              const bt = timings.allBeatTimings[globalIdx];
              if (!bt) return null;
              const isLastBeat = j === segBeats.length - 1;
              // First beat gets extra fade-in frames to blend with zoom
              // Last beat gets extra fade-out frames to crossfade smoothly into the next content (pushups image or zoom-out)
              const effectiveFade = j === 0
                ? Math.max(bt.fadeFrames, CROSSFADE_FRAMES)
                : isLastBeat
                  ? Math.max(bt.fadeFrames, CROSSFADE_FRAMES)
                  : bt.fadeFrames;
              // Last beat: extend its Sequence to fill any gap up to zoomOutStart
              // PLUS CROSSFADE_FRAMES so its fade-out overlaps with the next content, creating a clean crossfade.
              const seqDuration = isLastBeat
                ? Math.max(bt.duration, st.zoomOutStart - bt.start) + CROSSFADE_FRAMES
                : bt.duration;
              return (
                <Sequence
                  key={beat.id}
                  from={bt.start}
                  durationInFrames={seqDuration}
                >
                  <CrossfadeBeat
                    beat={beat}
                    assets={assets}
                    accentColor={accentColor}
                    durationInFrames={seqDuration}
                    fadeFrames={effectiveFade}
                    yieldsHistory={yieldsHistoryData}
                  />
                  {/* Segment title overlay on first beat (SFX removed — no bruitage pendant segments) */}
                  {j === 0 && section && (
                    <TypewriterTitle
                      text={section.title}
                      durationInFrames={Math.min(60, Math.round(1.5 * fps))}
                      accentColor={accentColor}
                    />
                  )}
                </Sequence>
              );
            })}

            {/* Zoom Out → if next transition has an owl video: direct cut to that video's start image
                (no zoom avoids zooming into random region); otherwise zoom out onto newspaper card. */}
            <Sequence
              from={st.zoomOutStart}
              durationInFrames={ZOOM_FRAMES}
            >
              {i < TRANSITION_CLIPS.length ? (
                <AbsoluteFill>
                  <img
                    src={TRANSITION_CLIPS[i].startImg}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    alt=""
                  />
                </AbsoluteFill>
              ) : (
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
              )}
            </Sequence>

            {/* SFX: Page flip on zoom out */}
            <Sequence from={st.zoomOutStart} durationInFrames={ZOOM_FRAMES}>
              <Audio src={getSfxPath("pageFlip", i)} volume={SFX_VOLUME.pageFlip} />
            </Sequence>

            {/* Brief pause on newspaper between segments — owl video transition for first N transitions, then static newspaper */}
            {i < segmentIds.length - 1 && st.betweenFrames > 0 && (
              i < TRANSITION_CLIPS.length ? (
                <Sequence
                  from={st.zoomOutStart + ZOOM_FRAMES}
                  durationInFrames={st.betweenFrames}
                >
                  <OwlVideoTransitionBlock
                    clip={TRANSITION_CLIPS[i]}
                    durationInFrames={st.betweenFrames}
                    npProps={npProps}
                    activeSegmentIdx={i + 1}
                  />
                </Sequence>
              ) : (
                <Sequence
                  from={st.zoomOutStart + ZOOM_FRAMES}
                  durationInFrames={st.betweenFrames}
                >
                  <NewspaperPage
                    {...npProps}
                    activeSegmentIdx={i + 1}
                    showTypewriter={false}
                  />
                </Sequence>
              )
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

      {/* ── SFX: Portfolio close at episode end ── */}
      <Sequence
        from={timings.closingStart + timings.closingDur - Math.round(2 * fps)}
        durationInFrames={Math.round(2 * fps)}
      >
        <Audio src={getSfxPath("close", 0)} volume={SFX_VOLUME.close} />
      </Sequence>

      {/* ── Owl audio: intro over video clips ── */}
      {/* Durée audio = vraie durée du MP3 + 3 frames buffer (pas la durée vidéo).
          Évite de couper la fin de l'owl intro si l'audio dépasse les 20s de la
          séquence vidéo. L'audio peut overlapper sur le newspaper visuel —
          c'est OK, on préfère entendre la phrase complète. */}
      {owlIntroAudio && (() => {
        const introDur = (owlAudioDurations as Record<string, number> | undefined)?.["owl_intro"];
        const audioFrames = introDur && introDur > 0
          ? Math.round(introDur * fps) + 3
          : PARIS_OPENER_FRAMES;
        return (
          <Sequence from={PUNCH_CARD_FRAMES} durationInFrames={audioFrames}>
            <Audio src={staticFile(owlIntroAudio)} volume={1} />
          </Sequence>
        );
      })()}

      {/* ── Owl audio: transitions between segments (over cream background) ── */}
      {/* owlTransition text introduces the NEXT segment, so we play seg[i-1]'s audio before seg[i] */}
      {timings.segTimings.map((st, i) => {
        if (i === 0) return null; // first segment: newspaper intro is the transition
        const prevSeg = timings.segTimings[i - 1];
        const audioPath = owlTransitionAudios[prevSeg.segId];
        if (!audioPath) return null;
        // The gap before current segment was sized by PREVIOUS segment's betweenFrames
        const gapFrames = prevSeg.betweenFrames;
        return (
          <Sequence key={`owl-tr-${st.segId}`}
            from={st.zoomInStart - gapFrames}
            durationInFrames={gapFrames + ZOOM_FRAMES}>
            <Audio src={staticFile(audioPath)} volume={1} />
          </Sequence>
        );
      })}

      {/* ── Owl audio: closing — plays AFTER closing beats (CTA outro) ── */}
      {owlClosingAudio && (() => {
        const owlF = getOwlClosingFrames(fps, owlAudioDurations as any);
        if (owlF <= 0) return null;
        const owlStart = timings.closingStart + timings.closingDur - owlF;
        return (
          <Sequence from={owlStart} durationInFrames={owlF}>
            <Audio src={staticFile(owlClosingAudio)} volume={1} />
          </Sequence>
        );
      })()}

      {/* ── Outro: 10s talk-and-point video, then 5s freeze on last frame with fade-to-black ── */}
      {owlClosingAudio && (() => {
        const owlF = getOwlClosingFrames(fps, owlAudioDurations as any);
        if (owlF <= 0) return null;
        const owlStart = timings.closingStart + timings.closingDur - owlF;
        return (
          <>
            <Sequence
              key="paris-outro-video"
              from={owlStart}
              durationInFrames={PARIS_OUTRO_FRAMES}
            >
              <AbsoluteFill>
                <OffthreadVideo
                  src={PARIS_OUTRO_SRC}
                  muted
                  volume={0}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => {}}
                />
              </AbsoluteFill>
            </Sequence>
            <Sequence
              key="paris-outro-freeze"
              from={owlStart + PARIS_OUTRO_FRAMES}
              durationInFrames={PARIS_OUTRO_FREEZE_FRAMES}
            >
              <AbsoluteFill>
                <img
                  src={PARIS_OUTRO_END_IMG}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
              </AbsoluteFill>
            </Sequence>
          </>
        );
      })()}

      {/* ── Fade-to-black overlay during the 5s freeze at the very end ── */}
      <Sequence
        from={timings.closingStart + timings.closingDur - PARIS_OUTRO_FREEZE_FRAMES}
        durationInFrames={PARIS_OUTRO_FREEZE_FRAMES}
      >
        <FadeToBlackOverlay durationInFrames={PARIS_OUTRO_FREEZE_FRAMES} />
      </Sequence>

      {/* ── Beat audio: voice TTS + SFX ── */}
      <BeatAudioTrack
        beats={beats}
        beatTimings={timings.allBeatTimings}
        fps={fps}
        segmentAudioDurations={segmentAudioDurations}
      />

      {/* ── Scrolling ticker — only during segment beats ── */}
      {timings.segTimings.map((st) => {
        const segBeats = beatGroups.get(st.segId) ?? [];
        if (segBeats.length === 0) return null;
        const firstBeatIdx = patchedBeats.indexOf(segBeats[0]);
        const lastBeatIdx = patchedBeats.indexOf(segBeats[segBeats.length - 1]);
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

      {/* ── Stamp overlay during PANORAMA segment ── */}
      {(() => {
        const panoramaSeg = timings.segTimings.find(st => st.segId === "seg_panorama");
        if (!panoramaSeg) return null;
        const segBeats = beatGroups.get("seg_panorama") ?? [];
        if (segBeats.length === 0) return null;
        const firstIdx = patchedBeats.indexOf(segBeats[0]);
        const lastIdx = patchedBeats.indexOf(segBeats[segBeats.length - 1]);
        const firstT = timings.allBeatTimings[firstIdx];
        const lastT = timings.allBeatTimings[lastIdx];
        if (!firstT || !lastT) return null;
        const stampStart = firstT.start;
        const stampDur = lastT.start + lastT.duration - stampStart;
        // Affiche l'ensemble des assets (watchlist enrichie avec les movers nommés
        // dans le script via generate.ts). Les gros movers auront une grosse bulle,
        // la watchlist remplit le contexte visuel.
        const stampAssets = assets;
        return (
          <>
            <Sequence from={stampStart} durationInFrames={stampDur}>
              <StampOverlay
                assets={stampAssets}
                durationInFrames={stampDur}
              />
            </Sequence>
            {/* SFX: bubble bloom rush during the grow phase (~1.5s) — soft stagger */}
            {(() => {
              const bloomFrames = Math.min(45, stampDur);
              const count = stampAssets.length;
              const interval = count > 1 ? bloomFrames / count : 0;
              return stampAssets.map((_, j) => (
                <Sequence
                  key={`stamp-sfx-${j}`}
                  from={stampStart + Math.round(j * interval)}
                  durationInFrames={Math.round(0.8 * fps)}
                >
                  <Audio src={getSfxPath("stamp", j)} volume={SFX_VOLUME.stamp * 0.15} />
                </Sequence>
              ));
            })()}
          </>
        );
      })()}

      {/* ── Viewport-locked overlays ── */}
      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay opacity={0.04} />
      <DisclaimerBar lang={script.lang} />

      {/* Like + Subscribe prompt à la seconde 12 du flux principal (post punch-card) */}
      {/* Étendu à 6s pour rester presque jusqu'à la fin de l'owl video */}
      <Sequence from={PUNCH_CARD_FRAMES + 12 * fps} durationInFrames={6 * fps}>
        <LikeSubscribePrompt durationInFrames={6 * fps} />
      </Sequence>

      {/* Disclaimer overlay — JUSTE APRÈS le Like+Subscribe, fade out pendant la transition newspaper */}
      {/* 18s post-punch-card = 24s absolus, dure 3s, finit pendant les 1.5 premières secondes du newspaper (fade) */}
      <Sequence from={PUNCH_CARD_FRAMES + 18 * fps} durationInFrames={Math.round(3 * fps)}>
        <DisclaimerOverlay durationInFrames={Math.round(3 * fps)} lang={script.lang} />
      </Sequence>

      {/* Like + Subscribe prompt à la fin, pendant l'owl closing (CTA) */}
      {(() => {
        const owlF = getOwlClosingFrames(fps, owlAudioDurations as any);
        if (owlF <= 0) return null;
        const owlStart = timings.closingStart + timings.closingDur - owlF;
        // Démarre le prompt 1s après le début de l'owl closing, dure toute la coda
        const promptStart = owlStart + Math.round(fps);
        const promptDur = Math.max(owlF - Math.round(fps), Math.round(3 * fps));
        return (
          <Sequence from={promptStart} durationInFrames={promptDur}>
            <LikeSubscribePrompt durationInFrames={promptDur} />
          </Sequence>
        );
      })()}
    </AbsoluteFill>
  );
};
