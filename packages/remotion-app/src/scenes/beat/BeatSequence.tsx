import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { Beat, AssetSnapshot } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { BackgroundImage } from "./BackgroundImage";
import { DataOverlay } from "./DataOverlay";

interface BeatSequenceProps {
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
  yieldsHistory?: { us10y: any[]; us2y: any[]; spread10y2y: any[] };
}

const isPlaceholder = (src?: string) =>
  !src || src.includes('placeholders/');

export const BeatSequence: React.FC<BeatSequenceProps> = ({
  beat,
  assets,
  accentColor,
  yieldsHistory,
}) => {
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(beat.durationSec * fps);
  const overlayType = beat.overlay?.type as string | undefined;
  const isChart = overlayType === 'chart' || overlayType === 'chart_zone';
  const isCausal = overlayType === 'causal_chain' || overlayType === 'scenario_fork';
  const rawDelay = beat.overlay ? Math.round((beat.overlay.enterDelayMs ?? 0) / 1000 * fps) : 0;
  // Charts + causal: no delay, appear immediately. Causal chains need time to read.
  const delayFrames = (isChart || isCausal) ? 0 : rawDelay;
  const showPrompt = isPlaceholder(beat.imagePath) && beat.imagePrompt;

  return (
    <AbsoluteFill>
      <BackgroundImage
        src={beat.imagePath ?? 'placeholders/office-desk.png'}
        effect={beat.imageEffect}
        durationInFrames={durationInFrames}
      />
      {showPrompt && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${BRAND.colors.cream}f0, ${BRAND.colors.creamDark}e8)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `${BRAND.layout.safeV + 20}px ${BRAND.layout.safeH + 20}px`,
          gap: 16,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: accentColor,
              padding: '3px 8px',
              border: `1px solid ${accentColor}40`,
              borderRadius: 4,
            }}>
              {beat.id}
            </span>
            <span style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              color: BRAND.colors.inkLight,
            }}>
              {beat.emotion} · {beat.imageEffect} · {beat.transitionOut} · {beat.durationSec}s
            </span>
          </div>
          <p style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 20,
            color: BRAND.colors.ink,
            lineHeight: 1.5,
            margin: 0,
            fontStyle: 'italic',
          }}>
            "{beat.imagePrompt.slice(0, 200)}{beat.imagePrompt.length > 200 ? '...' : ''}"
          </p>
          {beat.overlay && (
            <span style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 12,
              color: BRAND.colors.inkMid,
              marginTop: 4,
            }}>
              overlay: {beat.overlay.type} (delay {beat.overlay.enterDelayMs}ms)
            </span>
          )}
        </div>
      )}
      {beat.overlay && (
        <Sequence from={delayFrames} durationInFrames={
          isCausal
            ? Math.round((durationInFrames - delayFrames) * 1.8) // causal chains persist 80% longer
            : (durationInFrames - delayFrames)
        }>
          <DataOverlay
            overlay={beat.overlay}
            assets={assets}
            accentColor={accentColor}
            yieldsHistory={yieldsHistory}
            durationInFrames={
              isCausal
                ? Math.round((durationInFrames - delayFrames) * 1.8)
                : (durationInFrames - delayFrames)
            }
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
