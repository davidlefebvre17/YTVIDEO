import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { Beat, AssetSnapshot } from "@yt-maker/core";
import { BackgroundImage } from "./BackgroundImage";
import { DataOverlay } from "./DataOverlay";

interface BeatSequenceProps {
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
}

export const BeatSequence: React.FC<BeatSequenceProps> = ({
  beat,
  assets,
  accentColor,
}) => {
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(beat.durationSec * fps);
  const delayFrames = beat.overlay ? Math.round((beat.overlay.enterDelayMs ?? 0) / 1000 * fps) : 0;

  return (
    <AbsoluteFill>
      <BackgroundImage
        src={beat.imagePath ?? 'placeholders/office-desk.png'}
        effect={beat.imageEffect}
        durationInFrames={durationInFrames}
      />
      {beat.overlay && (
        <Sequence from={delayFrames}>
          <DataOverlay
            overlay={beat.overlay}
            assets={assets}
            accentColor={accentColor}
            durationInFrames={durationInFrames - delayFrames}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
