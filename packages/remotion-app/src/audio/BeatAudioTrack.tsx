/**
 * BeatAudioTrack — couche audio complète pour BeatEpisode.
 *
 * 3 pistes superposées :
 * 1. Voix TTS (1 <Audio> par beat quand beat.audioPath est défini)
 * 2. Page flip SFX (au changement de segmentId)
 * 3. Transition SFX (soundEffect tags du pipeline: sting/swoosh)
 */

import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { Beat, EpisodeDirection } from "@yt-maker/core";
import {
  getSfxPath,
  SFX_VOLUME,
  soundEffectToCategory,
  type SoundEffectTag,
} from "./sfx-library";

interface BeatAudioTrackProps {
  beats: Beat[];
  /** Timings calculés par BeatEpisode (start frame + duration en frames) */
  beatTimings: Array<{ start: number; duration: number }>;
  fps: number;
  /** Direction de l'épisode (contient les transitions avec soundEffect) */
  direction?: EpisodeDirection;
  /** Volume global voix (0-1), défaut 1 */
  voiceVolume?: number;
  /** Volume global SFX (0-1), défaut 1 — multiplicateur sur les volumes par catégorie */
  sfxVolume?: number;
}

/**
 * Construit un lookup: toSegmentId → soundEffect tag
 * depuis les transitions de la direction.
 */
function buildTransitionSfxMap(
  direction?: EpisodeDirection
): Map<string, SoundEffectTag> {
  const map = new Map<string, SoundEffectTag>();
  if (!direction?.transitions) return map;
  for (const t of direction.transitions) {
    if (t.soundEffect && t.soundEffect !== "none") {
      map.set(t.toSegmentId, t.soundEffect as SoundEffectTag);
    }
  }
  return map;
}

export const BeatAudioTrack: React.FC<BeatAudioTrackProps> = ({
  beats,
  beatTimings,
  fps,
  direction,
  voiceVolume = 1,
  sfxVolume = 1,
}) => {
  const transitionSfxMap = buildTransitionSfxMap(direction);

  // Track pour détecter les changements de segment
  let prevSegmentId: string | null = null;
  let sectionChangeCount = 0;

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const timing = beatTimings[i];
    if (!timing) continue;

    const isNewSection = beat.segmentId !== prevSegmentId;

    // ── 1. Voix TTS ──
    // audioPath est un chemin relatif depuis public/ (ex: "audio/beats/beat_001.mp3")
    if (beat.audioPath) {
      const audioSrc = beat.audioPath.startsWith('http') || beat.audioPath.startsWith('/')
        ? beat.audioPath
        : staticFile(beat.audioPath);
      elements.push(
        <Sequence
          key={`voice-${beat.id}`}
          from={timing.start}
          durationInFrames={timing.duration}
        >
          <Audio
            src={audioSrc}
            volume={voiceVolume}
          />
        </Sequence>
      );
    }

    // ── 2. Page flip SFX (changement de section) ──
    if (isNewSection && prevSegmentId !== null) {
      const sfxPath = getSfxPath("pageFlip", sectionChangeCount);
      const vol = SFX_VOLUME.pageFlip * sfxVolume;
      // Le page flip démarre quelques frames avant le beat
      const sfxStart = Math.max(0, timing.start - 3);
      elements.push(
        <Sequence
          key={`pageflip-${beat.id}`}
          from={sfxStart}
          durationInFrames={Math.round(1.5 * fps)}
        >
          <Audio src={sfxPath} volume={vol} />
        </Sequence>
      );
      sectionChangeCount++;
    }

    // ── 3. Transition SFX (sting/swoosh/bell/stamp etc. du pipeline) ──
    if (isNewSection) {
      const sfxTag = transitionSfxMap.get(beat.segmentId);
      const category = soundEffectToCategory(sfxTag);
      if (category) {
        const sfxPath = getSfxPath(category, i);
        const vol = SFX_VOLUME[category] * sfxVolume;
        elements.push(
          <Sequence
            key={`sfx-${beat.id}`}
            from={timing.start}
            durationInFrames={Math.round(1.5 * fps)}
          >
            <Audio src={sfxPath} volume={vol} />
          </Sequence>
        );
      }
    }

    // ── 4. Contextual SFX (auto: based on segment type) ──
    // unfold on first beat (hook), close on last beat (closing)
    if (i === 0 && beat.segmentId === 'hook') {
      elements.push(
        <Sequence key={`unfold-${beat.id}`} from={0} durationInFrames={Math.round(2 * fps)}>
          <Audio src={getSfxPath('unfold', 0)} volume={SFX_VOLUME.unfold * sfxVolume} />
        </Sequence>
      );
    }
    if (i === beats.length - 1 && beat.segmentId === 'closing') {
      const closeStart = Math.max(0, timing.start + timing.duration - Math.round(2 * fps));
      elements.push(
        <Sequence key={`close-${beat.id}`} from={closeStart} durationInFrames={Math.round(2 * fps)}>
          <Audio src={getSfxPath('close', 0)} volume={SFX_VOLUME.close * sfxVolume} />
        </Sequence>
      );
    }

    prevSegmentId = beat.segmentId;
  }

  return <>{elements}</>;
};
