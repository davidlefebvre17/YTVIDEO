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
}

export const BeatAudioTrack: React.FC<BeatAudioTrackProps> = ({
  beats,
  beatTimings,
  fps,
  voiceVolume = 1,
}) => {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const timing = beatTimings[i];
    if (!timing) continue;

    // ── Voix TTS ──
    // audioPath est un chemin relatif depuis public/ (ex: "audio/beats/beat_001.mp3")
    if (beat.audioPath) {
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
