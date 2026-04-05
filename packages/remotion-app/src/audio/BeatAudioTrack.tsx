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

  // ── Detect mode from first beat with audio ──
  const firstAudioBeat = beats.find((b: any) => (b as any).audioSegmentPath?.trim());
  const isSegmentMode = !!firstAudioBeat;

  if (isSegmentMode) {
    // ── Segment mode: ONE <Audio> per segment (not per beat) ──
    // Group beats by segmentId, find first/last beat timing for each segment
    const segmentInfo = new Map<string, { startFrame: number; endFrame: number; segmentPath: string }>();

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      const timing = beatTimings[i];
      const beatAny = beat as any;
      if (!timing || !beatAny.audioSegmentPath?.trim()) continue;

      const segId = beat.segmentId;
      const beatEnd = timing.start + timing.duration;
      if (!segmentInfo.has(segId)) {
        segmentInfo.set(segId, {
          startFrame: timing.start,
          endFrame: beatEnd,
          segmentPath: beatAny.audioSegmentPath,
        });
      } else {
        const info = segmentInfo.get(segId)!;
        if (beatEnd > info.endFrame) info.endFrame = beatEnd;
      }
    }

    // Render one <Audio> per segment — use real audio duration to avoid cutting short
    for (const [segId, { startFrame, segmentPath }] of segmentInfo) {
      const audioDurSec = segmentAudioDurations[segId];
      const durationFrames = audioDurSec
        ? Math.round(audioDurSec * fps) + 15
        : 9000; // fallback

      const audioSrc = segmentPath.startsWith('http') || segmentPath.startsWith('/')
        ? segmentPath
        : staticFile(segmentPath);

      elements.push(
        <Sequence
          key={`voice-seg-${segId}`}
          from={startFrame}
          durationInFrames={durationFrames}
        >
          <Audio src={audioSrc} volume={voiceVolume} />
        </Sequence>
      );
    }
  } else {
    // ── Legacy mode: individual MP3 per beat ──
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      const timing = beatTimings[i];
      if (!timing || !beat.audioPath) continue;

      const audioSrc = beat.audioPath.startsWith('http') || beat.audioPath.startsWith('/')
        ? beat.audioPath
        : staticFile(beat.audioPath);
      elements.push(
        <Sequence
          key={`voice-${beat.id}`}
          from={timing.start}
          durationInFrames={timing.duration + 15}
        >
          <Audio src={audioSrc} volume={voiceVolume} />
        </Sequence>
      );
    }
  }

  return <>{elements}</>;
};
