import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { EpisodeScript, AssetSnapshot, NewsItem, Beat, BeatTransition } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { BeatSequence } from "../scenes/beat/BeatSequence";
import { InkSubtitle, type SubtitleLine } from "../scenes/shared/InkSubtitle";
import { GrainOverlay } from "../scenes/shared/GrainOverlay";
import { DisclaimerBar } from "../scenes/shared/DisclaimerBar";
import { BeatAudioTrack } from "../audio/BeatAudioTrack";

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

  const beatTimings = useMemo(() => {
    let cumFrames = 0;
    return beats.map((beat) => {
      const dur = Math.max(15, Math.round(getEffectiveDuration(beat) * fps));
      const fadeFrames = getTransitionDurationFrames(beat.transitionOut);
      const start = Math.max(0, cumFrames - fadeFrames);
      const overlap = cumFrames > 0 ? fadeFrames : 0;
      const result = { start: cumFrames === 0 ? 0 : start, duration: dur + overlap, fadeFrames };
      cumFrames += dur - fadeFrames;
      return result;
    });
  }, [beats, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {beats.map((beat, i) => {
        const t = beatTimings[i];
        return (
          <Sequence key={beat.id} from={t.start} durationInFrames={t.duration}>
            <CrossfadeBeat
              beat={beat}
              assets={assets}
              accentColor={accentColor}
              durationInFrames={t.duration}
              fadeFrames={t.fadeFrames}
            />
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
