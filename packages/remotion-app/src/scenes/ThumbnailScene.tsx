/**
 * Thumbnail YouTube — 1280x720, 1 frame.
 *
 * Stratégie : 2 couches.
 * 1. Image background générée par P7d (beat PNG du `thumbnailMoment.segmentId`)
 *    désaturée/teintée crème pour cohérence brand.
 * 2. Texte rendu HTML/CSS (Chromium) — 100% net, pas d'artefact IA.
 *
 * Layout type "headline newspaper" :
 *  - Eyebrow date (mono, faint) : VENDREDI 4 MAI
 *  - Titre énorme 2-3 mots (Playfair Display, ink, 180-220pt)
 *  - Subtitle 1 ligne courte (optionnel)
 *  - Pastille ticker + % en bas droite (accent color selon sentiment)
 *  - Marque "Owl Street Journal" en bas centre, condensed
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface ThumbnailProps {
  /** 2-3 mots énormes, sentence case avec 1 mot capitalisé pour emphase si pertinent */
  headlineLines: string[];
  /** Eyebrow date affichée en haut, ex: "VENDREDI 4 MAI" */
  dateLabel: string;
  /** Pastille ticker + variation, ex: { ticker: "S&P 500", changePct: -1.2 } */
  ticker?: {
    ticker: string;
    changePct: number;
  };
  /** Path relatif au dossier public/ pour l'image bg (beat PNG) */
  bgImagePath?: string;
  /** Sentiment dominant qui dicte la couleur d'accent */
  accent?: "bull" | "bear" | "neutral" | "warning" | "blue";
  /** Subtitle court (max ~30 chars), optionnel */
  subtitle?: string;
}

export const ThumbnailScene: React.FC<ThumbnailProps> = ({
  headlineLines,
  dateLabel,
  ticker,
  bgImagePath,
  accent = "bear",
  subtitle,
}) => {
  const accentColor =
    accent === "bull" ? BRAND.colors.accentBull
    : accent === "bear" ? BRAND.colors.accentBear
    : accent === "warning" ? BRAND.colors.accentWarning
    : accent === "blue" ? BRAND.colors.accentBlue
    : BRAND.colors.accentNeutral;

  // Adaptive font size for biggest line
  const longestLineLen = Math.max(...headlineLines.map(l => l.length));
  const headlineSize =
    longestLineLen <= 6 ? 240
    : longestLineLen <= 9 ? 200
    : longestLineLen <= 13 ? 160
    : longestLineLen <= 18 ? 130
    : 110;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* ── Background image, désaturée + cream tint ── */}
      {bgImagePath && (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={staticFile(bgImagePath)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.65) contrast(1.05) sepia(0.18)",
              opacity: 0.55,
            }}
          />
          {/* Vignette gradient pour booster la lisibilité du texte */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(245,240,232,0.35) 0%, rgba(245,240,232,0.85) 70%, rgba(245,240,232,0.95) 100%)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── Content layer ── */}
      <AbsoluteFill
        style={{
          padding: "60px 70px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top — eyebrow date */}
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 42,
            letterSpacing: 5,
            color: BRAND.colors.ink,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {dateLabel}
        </div>

        {/* Middle — headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: -40,
          }}
        >
          {headlineLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: BRAND.fonts.display,
                fontSize: headlineSize,
                lineHeight: 0.95,
                fontWeight: 800,
                color: BRAND.colors.ink,
                textTransform: "none",
                letterSpacing: -2,
                fontStyle: i === 1 ? "italic" : "normal",
              }}
            >
              {line}
            </div>
          ))}
          {subtitle && (
            <div
              style={{
                fontFamily: BRAND.fonts.body,
                fontSize: 36,
                color: BRAND.colors.inkMid,
                marginTop: 24,
                lineHeight: 1.2,
                fontStyle: "italic",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom — ticker pastille + branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {/* Branding bottom-left */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: BRAND.fonts.condensed,
                fontSize: 32,
                letterSpacing: 6,
                color: BRAND.colors.ink,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Owl Street Journal
            </div>
            <div
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 18,
                color: BRAND.colors.inkLight,
                letterSpacing: 1.5,
              }}
            >
              Les marchés, chaque matin
            </div>
          </div>

          {/* Ticker pastille bottom-right */}
          {ticker && (
            <div
              style={{
                backgroundColor: accentColor,
                color: BRAND.colors.cream,
                padding: "20px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                borderRadius: 4,
                boxShadow: "4px 4px 0 0 rgba(26,22,18,0.85)",
              }}
            >
              <div
                style={{
                  fontFamily: BRAND.fonts.condensed,
                  fontSize: 30,
                  letterSpacing: 3,
                  fontWeight: 700,
                  opacity: 0.95,
                }}
              >
                {ticker.ticker}
              </div>
              <div
                style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 64,
                  fontWeight: 700,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                {ticker.changePct >= 0 ? "+" : ""}
                {ticker.changePct.toFixed(1)}%
                <span style={{ marginLeft: 8, fontSize: 56 }}>
                  {ticker.changePct >= 0 ? "↑" : "↓"}
                </span>
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Top-left corner decoration — petit trait éditorial */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 70,
          width: 120,
          height: 4,
          backgroundColor: accentColor,
        }}
      />
    </AbsoluteFill>
  );
};

// Sample default props for studio preview
export const SAMPLE_THUMBNAIL_PROPS: ThumbnailProps = {
  headlineLines: ["Hormuz", "sous tension"],
  dateLabel: "Lundi 4 mai",
  subtitle: "Le pétrole rejoue la prime géopolitique",
  ticker: { ticker: "Brent", changePct: -5.1 },
  accent: "bear",
};
