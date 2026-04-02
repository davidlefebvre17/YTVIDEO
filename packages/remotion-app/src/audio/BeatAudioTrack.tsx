/**
 * BeatAudioTrack — voice TTS layer for BeatEpisode.
 *
 * Renders one <Audio> per beat when beat.audioPath is defined.
 * SFX are handled directly in BeatEpisode.tsx, synced to visual events.
 */

import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { Beat } from "@yt-maker/core";

interface BeatAudioTrackProps {
  beats: Beat[];
  /** Timings calculés par BeatEpisode (start frame + duration en frames) */
  beatTimings: Array<{ start: number; duration: number }>;
  fps: number;
  /** Volume global voix (0-1), défaut 1 */
  voiceVolume?: number;
  /** Segment mode: map of segmentId → total duration in seconds */
  segmentAudioDurations?: Record<string, number>;
}

export const BeatAudioTrack: React.FC<BeatAudioTrackProps> = ({
  beats,
  beatTimings,
  fps,
  voiceVolume = 1,
  segmentAudioDurations = {},
}) => {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const timing = beatTimings[i];
    if (!timing) continue;

    // ── Detect mode: segment or legacy ──
    const beatAny = beat as any;
    const isSegmentMode =
      beatAny.audioSegmentPath &&
      typeof beatAny.audioSegmentPath === 'string' &&
      beatAny.audioSegmentPath.trim().length > 0;

    if (isSegmentMode) {
      // ── Segment mode: trim portion of shared segment MP3 ──
      const segmentPath = beatAny.audioSegmentPath;
      const offsetSec = beatAny.audioOffsetSec ?? 0;
      const endSec = beatAny.audioEndSec ?? 0;

      // Get total duration of segment from map; fallback to endSec if not provided
      const segmentId = segmentPath.replace(/[^a-zA-Z0-9_-]/g, '_');
      const totalDuration = segmentAudioDurations[segmentId] ?? endSec;

      if (totalDuration <= 0) continue;

      const trimBeforeFrames = Math.round(offsetSec * fps);
      const trimAfterFrames = Math.round((totalDuration - endSec) * fps);

      const audioSrc = segmentPath.startsWith('http') || segmentPath.startsWith('/')
        ? segmentPath
        : staticFile(segmentPath);

      elements.push(
        <Sequence
          key={`voice-segment-${beat.id}`}
          from={timing.start}
          durationInFrames={timing.duration + 15}
        >
          <Audio
            src={audioSrc}
            volume={voiceVolume}
            trimBefore={trimBeforeFrames}
            trimAfter={trimAfterFrames}
          />
        </Sequence>
      );
    } else if (beat.audioPath) {
      // ── Legacy mode: individual MP3 per beat ──
      const audioSrc = beat.audioPath.startsWith('http') || beat.audioPath.startsWith('/')
        ? beat.audioPath
        : staticFile(beat.audioPath);
      elements.push(
        <Sequence
          key={`voice-${beat.id}`}
          from={timing.start}
          durationInFrames={timing.duration + 15}
        >
          <Audio
            src={audioSrc}
            volume={voiceVolume}
          />
        </Sequence>
      );
    }
  }

  return <>{elements}</>;
};
