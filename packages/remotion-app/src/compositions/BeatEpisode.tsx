import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { linearTiming, springTiming } from "@remotion/transitions";
import type { EpisodeScript, AssetSnapshot, NewsItem, Beat, BeatTransition } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { BeatSequence } from "../scenes/beat/BeatSequence";
import { InkSubtitle, type SubtitleLine } from "../scenes/shared/InkSubtitle";
import { GrainOverlay } from "../scenes/shared/GrainOverlay";
import { DisclaimerBar } from "../scenes/shared/DisclaimerBar";

export interface BeatEpisodeProps {
  script: EpisodeScript;
  beats: Beat[];
  assets?: AssetSnapshot[];
  news?: NewsItem[];
  [key: string]: unknown;
}

function getEffectiveDuration(beat: Beat): number {
  if (beat.timing.audioDurationSec !== undefined) {
    return beat.timing.audioDurationSec;
  }
  return beat.timing.estimatedDurationSec;
}

function getTransitionDurationFrames(type: BeatTransition): number {
  switch (type) {
    case 'cut': return 1;
    case 'fade': return 15;
    case 'slide_left': return 15;
    case 'slide_up': return 15;
    case 'wipe': return 20;
    case 'cross_dissolve': return 24;
    default: return 15;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransition(type: BeatTransition): { presentation: any; timing: any } {
  switch (type) {
    case 'cut':
      return { presentation: fade(), timing: linearTiming({ durationInFrames: 1 }) };
    case 'fade':
      return { presentation: fade(), timing: linearTiming({ durationInFrames: 15 }) };
    case 'slide_left':
      return { presentation: slide({ direction: 'from-right' }), timing: springTiming({ config: { damping: 14 } }) };
    case 'slide_up':
      return { presentation: slide({ direction: 'from-bottom' }), timing: linearTiming({ durationInFrames: 15 }) };
    case 'wipe':
      return { presentation: wipe({ direction: 'from-left' }), timing: linearTiming({ durationInFrames: 20 }) };
    case 'cross_dissolve':
      return { presentation: fade(), timing: linearTiming({ durationInFrames: 24 }) };
    default:
      return { presentation: fade(), timing: linearTiming({ durationInFrames: 15 }) };
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

export const BeatEpisode: React.FC<BeatEpisodeProps> = ({
  script,
  beats,
  assets = [],
}) => {
  const { fps } = useVideoConfig();
  const mood = script.direction?.moodMusic ?? 'neutre_analytique';
  const accentColor = BRAND.moodAccent[mood] ?? BRAND.colors.accentDefault;

  const subtitleLines = useMemo(() => buildSubtitleLines(beats, fps), [beats, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      <TransitionSeries>
        {beats.map((beat, i) => {
          const durationInFrames = Math.max(15, Math.round(getEffectiveDuration(beat) * fps));
          const isLast = i === beats.length - 1;
          const trans = !isLast ? mapTransition(beat.transitionOut) : null;

          return (
            <React.Fragment key={beat.id}>
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                <BeatSequence beat={beat} assets={assets} accentColor={accentColor} />
              </TransitionSeries.Sequence>
              {trans && (
                <TransitionSeries.Transition
                  presentation={trans.presentation}
                  timing={trans.timing}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay opacity={0.04} />
      <DisclaimerBar lang={script.lang} />
    </AbsoluteFill>
  );
};

export { getEffectiveDuration, getTransitionDurationFrames };
