import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface DisclaimerOverlayProps {
  /** Total frames the Sequence runs for (e.g. 3s × fps) */
  durationInFrames: number;
  /** Frames for fade-in (default ~10 = 0.33s) */
  fadeInFrames?: number;
  /** Frames for fade-out (default ~15 = 0.5s) */
  fadeOutFrames?: number;
  lang?: 'fr' | 'en';
}

/**
 * Compliance flash overlay — visible uniquement pendant le punch card (les 0-3s
 * de la vidéo, AVANT que la narration owl intro ne commence).
 *
 * Le composant ne vit que dans sa <Sequence> et disparaît totalement après —
 * pas d'empiètement sur le reste de la vidéo.
 *
 * Layout : carte centrée crème sur fond ink semi-transparent, fade in/out doux.
 */
export const DisclaimerOverlay: React.FC<DisclaimerOverlayProps> = ({
  durationInFrames,
  fadeInFrames = 10,
  fadeOutFrames = 15,
  lang = 'fr',
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const titleText = lang === 'fr' ? 'Avertissement' : 'Disclaimer';
  const bodyText = lang === 'fr'
    ? 'Contenu strictement éducatif. Pas un conseil en investissement.'
    : 'Strictly educational content. Not investment advice.';

  return (
    <AbsoluteFill
      style={{
        opacity,
        zIndex: 950,
        pointerEvents: 'none',
        backgroundColor: 'rgba(26, 22, 18, 0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: BRAND.colors.cream,
          padding: '48px 80px',
          maxWidth: 1100,
          textAlign: 'center',
          border: `3px solid ${BRAND.colors.ink}`,
          boxShadow: `12px 12px 0 0 rgba(26, 22, 18, 0.55)`,
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 96,
            fontWeight: 800,
            color: BRAND.colors.ink,
            lineHeight: 1,
            marginBottom: 28,
            letterSpacing: -1,
          }}
        >
          {titleText}
        </div>
        <div
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 38,
            color: BRAND.colors.inkMid,
            lineHeight: 1.3,
            fontStyle: 'italic',
          }}
        >
          {bodyText}
        </div>
      </div>
    </AbsoluteFill>
  );
};
