import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;

// Tiny 4-frame overlap on every clip boundary. Just enough to hide the
// OffthreadVideo decode gap without producing a visible double-image.
const FADE_FRAMES = 4;

// Premount each clip 30 frames before its real start so OffthreadVideo
// has time to decode the first frame; eliminates the black-flash on cuts.
const PREMOUNT_FRAMES = 30;

type Clip = {
  src: string;
  durationFrames: number;
  fadeOutFrames: number;
};

const CLIPS: Clip[] = [
  { src: "paris-opener/V1.mp4", durationFrames: 5 * FPS, fadeOutFrames: FADE_FRAMES },
  { src: "paris-opener/V2.mp4", durationFrames: 5 * FPS, fadeOutFrames: FADE_FRAMES },
  { src: "paris-opener/V3.mp4", durationFrames: 10 * FPS, fadeOutFrames: FADE_FRAMES },
  { src: "paris-opener/V4.mp4", durationFrames: 3 * FPS, fadeOutFrames: 0 },
];

// Each clip starts at the end of the previous, MINUS its incoming fade overlap.
// The incoming fade overlap = the previous clip's fadeOutFrames.
const STARTS: number[] = [];
{
  let cursor = 0;
  for (let i = 0; i < CLIPS.length; i++) {
    STARTS.push(cursor);
    const overlap = CLIPS[i].fadeOutFrames; // overlap into next clip
    cursor += CLIPS[i].durationFrames - overlap;
  }
}

export const PARIS_OPENER_DURATION_FRAMES =
  STARTS[CLIPS.length - 1] + CLIPS[CLIPS.length - 1].durationFrames;

const FadingClip: React.FC<{
  src: string;
  durationFrames: number;
  fadeInFrames: number;
  fadeOutFrames: number;
}> = ({ src, durationFrames, fadeInFrames, fadeOutFrames }) => {
  const frame = useCurrentFrame();

  let opacity = 1;
  if (fadeInFrames > 0 && frame < fadeInFrames) {
    opacity = interpolate(frame, [0, fadeInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (
    fadeOutFrames > 0 &&
    frame > durationFrames - fadeOutFrames
  ) {
    opacity = interpolate(
      frame,
      [durationFrames - fadeOutFrames, durationFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo src={staticFile(src)} />
    </AbsoluteFill>
  );
};

export const ParisOpener: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {CLIPS.map((clip, i) => {
        const fadeInFrames = i === 0 ? 0 : CLIPS[i - 1].fadeOutFrames;
        return (
          <Sequence
            key={i}
            from={STARTS[i]}
            durationInFrames={clip.durationFrames}
            premountFor={i === 0 ? 0 : PREMOUNT_FRAMES}
          >
            <FadingClip
              src={clip.src}
              durationFrames={clip.durationFrames}
              fadeInFrames={fadeInFrames}
              fadeOutFrames={clip.fadeOutFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
