import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { EpisodeScript, AssetSnapshot, NewsItem, Beat, BeatTransition } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { BeatSequence } from "../scenes/beat/BeatSequence";
import { InkSubtitle, type SubtitleLine } from "../scenes/shared/InkSubtitle";
import { GrainOverlay } from "../scenes/shared/GrainOverlay";
import { DisclaimerBar } from "../scenes/shared/DisclaimerBar";
import { BeatAudioTrack } from "../audio/BeatAudioTrack";
import { DisclaimerScene } from "../scenes/shared/DisclaimerScene";
import { FrontPage } from "../scenes/shared/FrontPage";
import { TypewriterTitle } from "../scenes/shared/TypewriterTitle";

export interface BeatEpisodeProps {
  script: EpisodeScript;
  beats: Beat[];
  assets?: AssetSnapshot[];
  news?: NewsItem[];
  [key: string]: unknown;
}

function getEffectiveDuration(beat: Beat): number {
  if (beat.timing?.audioDurationSec !== undefined) {
    return beat.timing.audioDurationSec;
  }
  return beat.timing?.estimatedDurationSec ?? beat.durationSec;
}

function getTransitionDurationFrames(type: BeatTransition): number {
  switch (type) {
    case 'cut': return 2;
    case 'fade': return 10;
    case 'cross_dissolve': return 15;
    default: return 10;
  }
}

function buildSubtitleLines(beats: Beat[], fps: number): SubtitleLine[] {
  let cumFrames = 0;
  const lines: SubtitleLine[] = [];

  for (const beat of beats) {
    const dur = getEffectiveDuration(beat);
    const durationFrames = Math.round(dur * fps);

    if (beat.narrationChunk && beat.narrationChunk.length > 3) {
      lines.push({
        text: beat.narrationChunk,
        startFrame: cumFrames,
        endFrame: cumFrames + durationFrames,
      });
    }

    cumFrames += durationFrames;
  }

  return lines;
}

const CrossfadeBeat: React.FC<{
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
  fadeFrames: number;
}> = ({ beat, assets, accentColor, durationInFrames, fadeFrames }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      <BeatSequence beat={beat} assets={assets} accentColor={accentColor} />
    </AbsoluteFill>
  );
};

export const BeatEpisode: React.FC<BeatEpisodeProps> = ({
  script,
  beats,
  assets = [],
}) => {
  const { fps } = useVideoConfig();
  const mood = script.direction?.moodMusic ?? 'neutre_analytique';
  const accentColor = BRAND.moodAccent[mood] ?? BRAND.colors.accentDefault;

  const subtitleLines = useMemo(() => buildSubtitleLines(beats, fps), [beats, fps]);

  // Intro offset: 90 frames (Disclaimer) + 210 frames (FrontPage) = 300 frames (10s)
  const introOffsetFrames = 300;

  const beatTimings = useMemo(() => {
    let cumFrames = introOffsetFrames;
    return beats.map((beat) => {
      const dur = Math.max(15, Math.round(getEffectiveDuration(beat) * fps));
      const fadeFrames = getTransitionDurationFrames(beat.transitionOut);
      const start = Math.max(introOffsetFrames, cumFrames - fadeFrames);
      const overlap = cumFrames > introOffsetFrames ? fadeFrames : 0;
      const result = { start, duration: dur + overlap, fadeFrames };
      cumFrames += dur - fadeFrames;
      return result;
    });
  }, [beats, fps]);

  // Build front page segment list from script sections
  const frontPageSegments = script.sections.map((section) => ({
    title: section.title,
    depth: section.depth,
  }));

  // Find first beat's image for hero
  const firstBeatImage = beats.length > 0 ? beats[0].imagePath : undefined;

  // Track previous segment ID for TypewriterTitle
  let prevSegmentId = '';

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* Feature 1: Full-page Disclaimer (3 seconds) */}
      <Sequence from={0} durationInFrames={90}>
        <DisclaimerScene />
      </Sequence>

      {/* Feature 2: Newspaper Front Page (7 seconds) */}
      <Sequence from={90} durationInFrames={210}>
        <FrontPage
          title={script.title}
          date={script.date}
          segments={frontPageSegments}
          heroImageSrc={firstBeatImage}
          threadSummary={script.threadSummary}
        />
      </Sequence>

      {/* Main beat sequences (offset by 300 frames) */}
      {beats.map((beat, i) => {
        const t = beatTimings[i];
        const isSegmentStart = beat.segmentId !== prevSegmentId;
        const section = script.sections.find((s) => s.id === beat.segmentId);
        prevSegmentId = beat.segmentId;

        return (
          <Sequence key={beat.id} from={t.start} durationInFrames={t.duration}>
            <CrossfadeBeat
              beat={beat}
              assets={assets}
              accentColor={accentColor}
              durationInFrames={t.duration}
              fadeFrames={t.fadeFrames}
            />

            {/* Feature 3: Typewriter segment title overlay */}
            {isSegmentStart && section && (
              <TypewriterTitle
                text={section.title}
                durationInFrames={Math.min(60, Math.round(1.5 * fps))}
                accentColor={accentColor}
              />
            )}
          </Sequence>
        );
      })}

      {/* ── Audio: voix TTS + SFX éditoriaux ── */}
      <BeatAudioTrack
        beats={beats}
        beatTimings={beatTimings}
        fps={fps}
        direction={script.direction}
      />

      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay opacity={0.04} />
      <DisclaimerBar lang={script.lang} />
    </AbsoluteFill>
  );
};

export { getEffectiveDuration, getTransitionDurationFrames };
