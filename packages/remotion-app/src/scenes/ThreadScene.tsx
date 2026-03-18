import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { GrainOverlay } from "./shared/GrainOverlay";
import { DisclaimerBar } from "./shared/DisclaimerBar";

interface ThreadSceneProps {
  section: ScriptSection;
  accentColor?: string;
  lang?: 'fr' | 'en';
  date?: string;
}

/**
 * Scène de fil conducteur — thread de l'épisode.
 * Présente le thème principal, posé et éditorial.
 */
export const ThreadScene: React.FC<ThreadSceneProps> = ({
  section,
  accentColor = BRAND.colors.accentDefault,
  lang = 'fr',
  date,
}) => {
  const frame = useCurrentFrame();

  // Ligne décorative — se trace depuis gauche
  const lineW = interpolate(frame, [0, 20], [0, 80], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Titre (thème dominant)
  const titleOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [4, 20], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Corps du thread — phrases qui apparaissent
  const bodyOpacity = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Date / étiquette
  const metaOpacity = interpolate(frame, [2, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dateLabel = date ? formatDate(date, lang) : '';

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>

      <div style={{
        position: 'absolute',
        top: 0,
        left: BRAND.layout.safeH,
        right: BRAND.layout.safeH,
        bottom: BRAND.layout.disclaimerH + BRAND.layout.tickerH,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0,
      }}>

        {/* Méta — date + label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
          opacity: metaOpacity,
        }}>
          {/* Ligne accent */}
          <div style={{
            width: lineW,
            height: 3,
            backgroundColor: accentColor,
          }} />
          <span style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 13,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: BRAND.colors.inkLight,
          }}>
            {dateLabel}
          </span>
        </div>

        {/* Titre */}
        <h1 style={{
          fontFamily: BRAND.fonts.display,
          fontSize: 58,
          fontWeight: 700,
          fontStyle: 'italic',
          color: BRAND.colors.ink,
          lineHeight: 1.2,
          margin: 0,
          marginBottom: 32,
          maxWidth: 1100,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}>
          {section.title}
        </h1>

        {/* Séparateur */}
        <div style={{
          width: 60,
          height: 1,
          backgroundColor: BRAND.colors.rule,
          marginBottom: 32,
          opacity: titleOpacity,
        }} />

        {/* Corps — narration thread */}
        <p style={{
          fontFamily: BRAND.fonts.body,
          fontSize: 26,
          lineHeight: 1.7,
          color: BRAND.colors.inkMid,
          margin: 0,
          maxWidth: 1000,
          opacity: bodyOpacity,
        }}>
          {section.narration.slice(0, 300)}{section.narration.length > 300 ? '…' : ''}
        </p>

      </div>

      <GrainOverlay />
      <DisclaimerBar lang={lang} />
    </AbsoluteFill>
  );
};

function formatDate(date: string, lang: 'fr' | 'en'): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return date;
  }
}
