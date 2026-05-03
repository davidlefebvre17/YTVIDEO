/**
 * CountdownEvent — Rendez-vous à venir : "J-3 / Fed / 29 avril / impact SPX".
 * Utilisé pour les events éco/earnings à venir (Fed, BCE, CPI, NFP, earnings majeurs).
 * Style éditorial : large "J-N" à gauche, métadonnées empilées à droite.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface CountdownEventProps {
  /** Label court de l'event (ex : "Fed", "CPI", "AMAT earnings") */
  eventLabel: string;
  /** Date cible formatée humaine (ex : "29 avril", "Mercredi") */
  targetDate: string;
  /** Jours restants — calculé en amont */
  daysUntil: number;
  /** Asset impacté (optionnel) */
  affectedAsset?: string;
  /** Contexte / enjeu en une ligne courte */
  stake?: string;
  accentColor?: string;
  startFrame?: number;
}

export const CountdownEvent: React.FC<CountdownEventProps> = ({
  eventLabel,
  targetDate,
  daysUntil,
  affectedAsset,
  stake,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  const barW = interpolate(rel, [0, 12], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const countOp = interpolate(rel, [4, 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const countY = interpolate(rel, [4, 14], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const labelOp = interpolate(rel, [10, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const labelY = interpolate(rel, [10, 20], [12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const stakeOp = interpolate(rel, [20, 30], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const countdownText = daysUntil <= 0 ? "J" : `J−${daysUntil}`;

  // Adaptive font sizes : long values (J−123, J−20+) and long event labels
  // would otherwise overflow the 780px max-width. Scale down progressively.
  const countdownFontSize = countdownText.length <= 3 ? 84 : countdownText.length <= 5 ? 68 : 52;
  const countdownMinWidth = countdownText.length <= 3 ? 140 : countdownText.length <= 5 ? 170 : 200;
  const labelLen = (eventLabel ?? '').length;
  const eventFontSize = labelLen <= 18 ? 36 : labelLen <= 28 ? 28 : 22;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: 16, maxWidth: 780,
    }}>
      {/* Accent bar */}
      <div style={{
        width: `${barW}%`, height: 4,
        backgroundColor: accentColor,
      }} />

      <div style={{
        display: "flex", alignItems: "center", gap: 28,
      }}>
        {/* J-N large */}
        <div style={{
          opacity: countOp,
          transform: `translateY(${countY}px)`,
          fontFamily: BRAND.fonts.display,
          fontSize: countdownFontSize, fontWeight: 700,
          color: accentColor,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          minWidth: countdownMinWidth,
          flexShrink: 0,
        }}>
          {countdownText}
        </div>

        {/* Event + date + asset */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          minWidth: 0,
          flex: 1,
        }}>
          <div style={{
            fontFamily: BRAND.fonts.mono, fontSize: 12,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: BRAND.colors.inkMid, fontWeight: 700,
          }}>
            Rendez-vous
          </div>
          <div style={{
            fontFamily: BRAND.fonts.display,
            fontSize: eventFontSize, fontWeight: 700,
            color: BRAND.colors.ink,
            lineHeight: 1.15,
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}>
            {eventLabel}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 18,
            color: BRAND.colors.inkMid,
            lineHeight: 1.3,
          }}>
            {targetDate}
            {affectedAsset ? (
              <span style={{
                marginLeft: 14, paddingLeft: 14,
                borderLeft: `2px solid ${accentColor}60`,
                fontFamily: BRAND.fonts.mono,
                color: BRAND.colors.ink,
                fontWeight: 700,
              }}>
                {affectedAsset}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {stake && (
        <div style={{
          opacity: stakeOp,
          fontFamily: BRAND.fonts.body,
          fontSize: 16,
          color: BRAND.colors.inkMid,
          lineHeight: 1.5,
          fontStyle: "italic",
          borderLeft: `3px solid ${accentColor}40`,
          paddingLeft: 14,
          maxWidth: 700,
        }}>
          {stake}
        </div>
      )}
    </div>
  );
};
