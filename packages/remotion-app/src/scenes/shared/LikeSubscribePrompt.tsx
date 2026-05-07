/**
 * LikeSubscribePrompt — gros prompt éditorial en deux cartes décalées.
 * Style WSJ hedcut cream/ink, large format, multi-phase animations.
 *
 * Carte 1 (Like) :
 *   - Draw-in des traits du pouce (stroke-dashoffset)
 *   - Hachures intérieures qui apparaissent après les contours
 *   - Sparks en étoile qui rayonnent autour
 *   - Tap en boucle (scale + rotation micro)
 *   - Tampon "LIKE" estampé latéralement avec condensed font
 *
 * Carte 2 (Subscribe) :
 *   - Entrée 30f plus tard, spring overshoot
 *   - Cloche qui sonne (rotation oscillante amortie)
 *   - 3 vagues d'ondes concentriques qui se propagent
 *   - Clapper qui oscille à contre-phase
 *   - Tampon "S'ABONNER" estampé
 */
import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";

// ── Carte Like ─────────────────────────────────────────────────────
const LikeCard: React.FC<{
  accentColor: string;
  startFrame: number;
  endFrame: number;
}> = ({ accentColor, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - startFrame;

  const enter = spring({
    frame: rel,
    fps,
    config: { damping: 10, stiffness: 170, mass: 0.9 },
  });
  const fadeOut = interpolate(frame, [endFrame - 20, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, fadeOut);
  const scale = interpolate(enter, [0, 1], [0.5, 1]);
  const baseRotate = interpolate(enter, [0, 1], [14, 3]);

  // Draw-in des traits principaux
  const strokeLen = 420;
  const dashOffset = interpolate(rel, [3, 28], [strokeLen, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Hachures (shading) qui fadent après les contours
  const hatchOp = interpolate(rel, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tap en boucle après entrée complète
  const tapPhase = Math.max(0, rel - 40);
  const tapScale =
    tapPhase > 0
      ? interpolate(tapPhase % 55, [0, 8, 18, 55], [1, 1.18, 1, 1], {
          extrapolateRight: "clamp",
        })
      : 1;
  const tapRotate =
    tapPhase > 0
      ? interpolate(tapPhase % 55, [0, 8, 18, 55], [0, -6, 0, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  // Sparks d'impact (rayonnement)
  const sparkOp = interpolate(rel, [18, 32, 52], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sparkScale = interpolate(rel, [18, 40], [0.3, 1.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tampon "LIKE" — pop avec overshoot après les contours
  const stampScale = spring({
    frame: Math.max(0, rel - 30),
    fps,
    config: { damping: 8, stiffness: 200 },
  });
  const stampRotate = interpolate(stampScale, [0, 1], [-25, -6]);

  const ICON = 160;
  const ICON_VB = 64;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 60,
        opacity,
        transform: `scale(${scale}) rotate(${baseRotate}deg)`,
        transformOrigin: "top right",
        pointerEvents: "none",
      }}
    >
      {/* Ombre portée papier double */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate(8px, 8px)",
          backgroundColor: BRAND.colors.rule,
          borderRadius: 8,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate(3px, 3px)",
          backgroundColor: BRAND.colors.ink,
          borderRadius: 8,
          opacity: 0.25,
        }}
      />

      {/* Carte */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 22,
          backgroundColor: BRAND.colors.cream,
          border: `2.5px solid ${BRAND.colors.ink}`,
          borderRadius: 8,
          padding: "26px 36px 26px 28px",
          minWidth: 520,
        }}
      >
        {/* Barre d'accent coin supérieur */}
        <div
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            height: 10,
            width: `${Math.min(100, interpolate(rel, [5, 25], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}%`,
            backgroundColor: accentColor,
          }}
        />

        {/* Tampon "LIKE" en exergue */}
        <div
          style={{
            position: "absolute",
            top: -28,
            left: 40,
            transform: `scale(${stampScale}) rotate(${stampRotate}deg)`,
            transformOrigin: "center",
            backgroundColor: accentColor,
            color: BRAND.colors.cream,
            fontFamily: BRAND.fonts.condensed,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.18em",
            padding: "6px 18px",
            border: `2.5px solid ${BRAND.colors.ink}`,
            boxShadow: `3px 3px 0 ${BRAND.colors.ink}`,
          }}
        >
          LIKE
        </div>

        {/* Pouce — gros SVG avec détails */}
        <div style={{ position: "relative", width: ICON, height: ICON }}>
          {/* Rayons d'impact autour du pouce */}
          <svg
            width={ICON * 1.6}
            height={ICON * 1.6}
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              top: -ICON * 0.3,
              left: -ICON * 0.3,
              opacity: sparkOp,
              transform: `scale(${sparkScale})`,
              transformOrigin: "center",
            }}
          >
            <g stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" fill="none">
              <path d="M14 26 L22 30" />
              <path d="M8 44 L18 44" />
              <path d="M14 62 L22 58" />
              <path d="M26 14 L30 22" />
              <path d="M70 14 L66 22" />
              <path d="M86 30 L78 34" />
              <path d="M50 8 L50 16" />
            </g>
            <g stroke={accentColor} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.6}>
              <path d="M18 18 L24 22" />
              <path d="M82 18 L76 22" />
              <path d="M38 12 L40 20" />
              <path d="M62 12 L60 20" />
            </g>
          </svg>

          <div
            style={{
              transform: `scale(${tapScale}) rotate(${tapRotate}deg)`,
              transformOrigin: "32px 40px",
            }}
          >
            <svg width={ICON} height={ICON} viewBox={`0 0 ${ICON_VB} ${ICON_VB}`} fill="none">
              {/* Hachures d'ombre sous la main (apparaissent après contours) */}
              <g
                stroke={BRAND.colors.ink}
                strokeWidth={0.6}
                opacity={hatchOp * 0.4}
              >
                <line x1="28" y1="44" x2="42" y2="44" />
                <line x1="28" y1="47" x2="42" y2="47" />
                <line x1="28" y1="50" x2="42" y2="50" />
                <line x1="28" y1="53" x2="42" y2="53" />
              </g>

              {/* Poignet */}
              <path
                d="M12 58 L12 34 L24 34 L24 58 Z"
                stroke={BRAND.colors.ink}
                strokeWidth={2.6}
                strokeLinejoin="round"
                fill={BRAND.colors.creamDark}
                strokeDasharray={strokeLen}
                strokeDashoffset={dashOffset}
              />
              {/* Hachures poignet */}
              <g
                stroke={BRAND.colors.ink}
                strokeWidth={0.7}
                opacity={hatchOp * 0.5}
              >
                <line x1="14" y1="40" x2="22" y2="40" />
                <line x1="14" y1="44" x2="22" y2="44" />
                <line x1="14" y1="48" x2="22" y2="48" />
                <line x1="14" y1="52" x2="22" y2="52" />
              </g>

              {/* Main + pouce (contour principal) */}
              <path
                d="M24 34 L24 18 C24 13 27 10 31 11 C35 12 36 16 34 22 L30 31 L50 31 C54 31 56 34 56 38 L54 53 C53 56 50 58 46 58 L24 58"
                stroke={BRAND.colors.ink}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill={BRAND.colors.cream}
                strokeDasharray={strokeLen}
                strokeDashoffset={dashOffset}
              />

              {/* Plis des doigts */}
              <path
                d="M30 39 L52 39"
                stroke={BRAND.colors.ink}
                strokeWidth={1.4}
                opacity={hatchOp * 0.7}
                strokeLinecap="round"
              />
              <path
                d="M30 45 L52 45"
                stroke={BRAND.colors.ink}
                strokeWidth={1.4}
                opacity={hatchOp * 0.7}
                strokeLinecap="round"
              />
              <path
                d="M30 51 L50 51"
                stroke={BRAND.colors.ink}
                strokeWidth={1.4}
                opacity={hatchOp * 0.7}
                strokeLinecap="round"
              />

              {/* Détail ongle pouce */}
              <path
                d="M29 15 C30 14 32 14 33 15"
                stroke={BRAND.colors.ink}
                strokeWidth={1}
                opacity={hatchOp * 0.8}
              />
            </svg>
          </div>
        </div>

        {/* Texte */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 13,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: BRAND.colors.inkMid,
              fontWeight: 700,
            }}
          >
            Un clic, ça aide
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.display,
              fontSize: 56,
              fontWeight: 800,
              fontStyle: "italic",
              color: BRAND.colors.ink,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            Laisse
            <br />
            un pouce
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Carte Subscribe ─────────────────────────────────────────────────
const SubscribeCard: React.FC<{
  accentColor: string;
  startFrame: number;
  endFrame: number;
}> = ({ accentColor, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = frame - startFrame;

  const enter = spring({
    frame: rel,
    fps,
    config: { damping: 11, stiffness: 160, mass: 0.9 },
  });
  const fadeOut = interpolate(frame, [endFrame - 20, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, fadeOut);
  const scale = interpolate(enter, [0, 1], [0.5, 1]);
  const baseRotate = interpolate(enter, [0, 1], [-10, -2]);

  const strokeLen = 480;
  const dashOffset = interpolate(rel, [3, 30], [strokeLen, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const hatchOp = interpolate(rel, [24, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cloche qui sonne après entrée — oscillation amortie
  const ringPhase = Math.max(0, rel - 36);
  const ringAngle = Math.sin(ringPhase / 4) * 14 * Math.exp(-ringPhase / 60);

  // Battant qui oscille à contre-phase
  const clapperX = Math.sin(ringPhase / 4 + Math.PI / 2) * 4 * Math.exp(-ringPhase / 60);

  // 3 vagues d'ondes concentriques
  const wave = (delay: number) => {
    const p = rel - 28 - delay;
    return {
      op: interpolate(p, [0, 14, 42], [0, 0.9, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      scale: interpolate(p, [0, 42], [0.8, 2.2], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    };
  };
  const w1 = wave(0);
  const w2 = wave(12);
  const w3 = wave(24);

  const stampScale = spring({
    frame: Math.max(0, rel - 34),
    fps,
    config: { damping: 8, stiffness: 200 },
  });
  const stampRotate = interpolate(stampScale, [0, 1], [22, 5]);

  const ICON = 160;
  const ICON_VB = 64;

  return (
    <div
      style={{
        position: "absolute",
        top: 280,
        right: 140,
        opacity,
        transform: `scale(${scale}) rotate(${baseRotate}deg)`,
        transformOrigin: "top right",
        pointerEvents: "none",
      }}
    >
      {/* Ombres portées */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate(8px, 8px)",
          backgroundColor: BRAND.colors.rule,
          borderRadius: 8,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate(3px, 3px)",
          backgroundColor: BRAND.colors.ink,
          borderRadius: 8,
          opacity: 0.25,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 22,
          backgroundColor: BRAND.colors.cream,
          border: `2.5px solid ${BRAND.colors.ink}`,
          borderRadius: 8,
          padding: "26px 36px 26px 28px",
          minWidth: 560,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            height: 10,
            width: `${Math.min(100, interpolate(rel, [5, 28], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}%`,
            backgroundColor: accentColor,
          }}
        />

        {/* Tampon "S'ABONNER" */}
        <div
          style={{
            position: "absolute",
            top: -28,
            left: 32,
            transform: `scale(${stampScale}) rotate(${stampRotate}deg)`,
            transformOrigin: "center",
            backgroundColor: accentColor,
            color: BRAND.colors.cream,
            fontFamily: BRAND.fonts.condensed,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "0.15em",
            padding: "6px 16px",
            border: `2.5px solid ${BRAND.colors.ink}`,
            boxShadow: `3px 3px 0 ${BRAND.colors.ink}`,
          }}
        >
          S'ABONNER
        </div>

        {/* Cloche */}
        <div style={{ position: "relative", width: ICON, height: ICON }}>
          {/* 3 vagues d'ondes */}
          {[w1, w2, w3].map((w, i) => (
            <svg
              key={i}
              width={ICON * 1.8}
              height={ICON * 1.8}
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                top: -ICON * 0.4,
                left: -ICON * 0.4,
                opacity: w.op,
                transform: `scale(${w.scale})`,
                transformOrigin: "center",
              }}
            >
              <circle
                cx={50}
                cy={50}
                r={28}
                stroke={accentColor}
                strokeWidth={2}
                fill="none"
                strokeDasharray="4 6"
              />
            </svg>
          ))}

          <div
            style={{
              transform: `rotate(${ringAngle}deg)`,
              transformOrigin: `${ICON_VB * 0.5}px ${ICON_VB * 0.12}px`,
            }}
          >
            <svg width={ICON} height={ICON} viewBox={`0 0 ${ICON_VB} ${ICON_VB}`} fill="none">
              {/* Hachures d'ombre interne */}
              <g stroke={BRAND.colors.ink} strokeWidth={0.6} opacity={hatchOp * 0.45}>
                <line x1="26" y1="30" x2="36" y2="30" />
                <line x1="24" y1="33" x2="40" y2="33" />
                <line x1="22" y1="36" x2="42" y2="36" />
              </g>

              {/* Anse (poignée en haut) */}
              <path
                d="M30 10 L30 7 C30 4.5 31 3 32 3 C33 3 34 4.5 34 7 L34 10"
                stroke={BRAND.colors.ink}
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={strokeLen}
                strokeDashoffset={dashOffset}
              />

              {/* Corps de la cloche */}
              <path
                d="M32 10 C22 10 16 17 16 27 L16 40 L11 46 L53 46 L48 40 L48 27 C48 17 42 10 32 10 Z"
                stroke={BRAND.colors.ink}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill={BRAND.colors.creamDark}
                strokeDasharray={strokeLen}
                strokeDashoffset={dashOffset}
              />

              {/* Ligne décorative horizontale sur la cloche */}
              <path
                d="M20 36 L44 36"
                stroke={BRAND.colors.ink}
                strokeWidth={1.3}
                opacity={hatchOp * 0.65}
                strokeLinecap="round"
              />
              <path
                d="M22 26 L42 26"
                stroke={BRAND.colors.ink}
                strokeWidth={1}
                opacity={hatchOp * 0.4}
                strokeLinecap="round"
              />

              {/* Petits points stylistiques */}
              <circle cx={24} cy={18} r={0.8} fill={BRAND.colors.ink} opacity={hatchOp * 0.7} />
              <circle cx={40} cy={18} r={0.8} fill={BRAND.colors.ink} opacity={hatchOp * 0.7} />
            </svg>
          </div>

          {/* Battant (indépendant du swing de la cloche) */}
          <svg
            width={ICON}
            height={ICON}
            viewBox={`0 0 ${ICON_VB} ${ICON_VB}`}
            fill="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
          >
            <circle
              cx={32 + clapperX}
              cy={50}
              r={3.8}
              stroke={BRAND.colors.ink}
              strokeWidth={2}
              fill={accentColor}
              opacity={rel > 10 ? 1 : 0}
            />
          </svg>
        </div>

        {/* Texte */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 13,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: BRAND.colors.inkMid,
              fontWeight: 700,
            }}
          >
            Chaque matin, ici
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.display,
              fontSize: 56,
              fontWeight: 800,
              fontStyle: "italic",
              color: BRAND.colors.ink,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            Abonnez-
            <br />
            vous
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Orchestrateur ───────────────────────────────────────────────────
interface LikeSubscribePromptProps {
  accentColor?: string;
  durationInFrames?: number;
}

export const LikeSubscribePrompt: React.FC<LikeSubscribePromptProps> = ({
  accentColor = BRAND.colors.accentDefault,
  durationInFrames = 150,
}) => {
  const SUBSCRIBE_DELAY = 30; // 1 seconde de décalage @ 30fps
  return (
    <>
      <LikeCard accentColor={accentColor} startFrame={0} endFrame={durationInFrames} />
      <SubscribeCard
        accentColor={accentColor}
        startFrame={SUBSCRIBE_DELAY}
        endFrame={durationInFrames}
      />
    </>
  );
};
