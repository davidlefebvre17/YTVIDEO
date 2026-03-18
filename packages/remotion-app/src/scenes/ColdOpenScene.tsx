import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { GrainOverlay } from "./shared/GrainOverlay";
import { DisclaimerBar } from "./shared/DisclaimerBar";

interface ColdOpenSceneProps {
  section: ScriptSection;
  /** Chiffre clé à animer (ex: "-11.94") */
  keyFigure?: string;
  /** Unité à afficher après le chiffre (ex: "%", "$") */
  unit?: string;
  /** Couleur d'accent de l'épisode */
  accentColor?: string;
  lang?: 'fr' | 'en';
}

/**
 * Scène d'ouverture — cold open.
 * Chiffre géant qui apparaît d'un coup, sous-titre qui se révèle.
 * Fond crème, maximum d'impact.
 */
export const ColdOpenScene: React.FC<ColdOpenSceneProps> = ({
  section,
  keyFigure,
  unit = '',
  accentColor = BRAND.colors.accentDefault,
  lang = 'fr',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Animation du chiffre — spring brutal
  const figureScale = spring({
    frame,
    fps,
    config: { stiffness: 320, damping: 18, mass: 1 },
    from: 0,
    to: 1,
  });

  // Opacité de la ligne de sous-titre
  const subtitleOpacity = interpolate(frame, [12, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleY = interpolate(frame, [12, 28], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Ligne décorative — se trace de gauche à droite
  const lineWidth = interpolate(frame, [6, 28], [0, 320], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Extraire un chiffre clé de la narration si pas fourni
  const displayFigure = keyFigure || extractKeyFigure(section.narration);
  const displayUnit = unit || extractUnit(section.narration, displayFigure);

  // Première ligne de la narration (jusqu'au premier tiret ou point)
  const firstLine = section.narration
    .split(/[—\-\.]/)[0]
    .trim()
    .slice(0, 80);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>

      {/* Contenu centré */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        paddingBottom: BRAND.layout.disclaimerH + BRAND.layout.tickerH,
      }}>

        {/* Chiffre géant */}
        <div style={{
          fontFamily: BRAND.fonts.condensed,
          fontSize: 220,
          fontWeight: 900,
          color: accentColor,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          transform: `scale(${figureScale})`,
          transformOrigin: 'center',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}>
          <span>{displayFigure}</span>
          {displayUnit && (
            <span style={{
              fontSize: 80,
              fontFamily: BRAND.fonts.condensed,
              color: accentColor,
              opacity: 0.75,
            }}>
              {displayUnit}
            </span>
          )}
        </div>

        {/* Ligne décorative */}
        <div style={{
          width: lineWidth,
          height: 3,
          backgroundColor: BRAND.colors.ink,
          marginTop: 24,
          marginBottom: 28,
          opacity: 0.3,
        }} />

        {/* Sous-titre — première phrase */}
        <div style={{
          fontFamily: BRAND.fonts.body,
          fontSize: 32,
          fontStyle: 'italic',
          color: BRAND.colors.inkMid,
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.4,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          paddingLeft: BRAND.layout.safeH,
          paddingRight: BRAND.layout.safeH,
        }}>
          {firstLine}
        </div>

      </div>

      {/* Grain papier */}
      <GrainOverlay />

      {/* Compliance */}
      <DisclaimerBar lang={lang} />
    </AbsoluteFill>
  );
};

/** Extrait le premier chiffre significatif de la narration */
function extractKeyFigure(narration: string): string {
  const match = narration.match(/([+-]?\d+[,.]?\d*)/);
  return match ? match[1] : '?';
}

/** Déduit l'unité à partir du contexte */
function extractUnit(narration: string, figure: string): string {
  const idx = narration.indexOf(figure);
  if (idx === -1) return '';
  const after = narration.slice(idx + figure.length, idx + figure.length + 6).trim();
  if (after.startsWith('%') || after.startsWith('pour cent')) return '%';
  if (after.startsWith('$') || after.startsWith('dollar')) return '$';
  if (after.startsWith('€') || after.startsWith('euro')) return '€';
  return '';
}
