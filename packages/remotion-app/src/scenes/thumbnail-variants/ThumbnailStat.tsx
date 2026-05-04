/**
 * Thumbnail YouTube — Variante C "Stat Hero" (Bloomberg / TradingView)
 * 1280x720, 1 frame.
 *
 * Le chiffre est le héros. Tout le reste lui sert de scaffolding éditorial.
 *
 * Hiérarchie :
 *  1. Eyebrow date en haut (mono caps, faint)
 *  2. Asset name (small caps, condensed) — antichambre du chiffre
 *  3. CHIFFRE énorme (350-400pt) en couleur d'accent — colonne de gauche
 *  4. Headline éditorial Playfair (60-90pt) à droite, équilibre la masse
 *  5. Subtitle italic en dessous
 *  6. Grille mathématique très subtile en background
 *  7. Branding bottom + petit cartouche "% CHANGE 1D"
 *
 * Sur mobile (200px), le chiffre reste lisible parce qu'il occupe ~45% de
 * la largeur et utilise une couleur saturée encre (bull/bear/warning).
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface ThumbnailProps {
  headlineLines: string[];
  dateLabel: string;
  ticker?: { ticker: string; changePct: number };
  bgImagePath?: string;
  accent?: "bull" | "bear" | "neutral" | "warning" | "blue";
  subtitle?: string;
}

const resolveAccent = (accent: ThumbnailProps["accent"]): string => {
  switch (accent) {
    case "bull":
      return BRAND.colors.accentBull;
    case "warning":
      return BRAND.colors.accentWarning;
    case "blue":
      return BRAND.colors.accentBlue;
    case "neutral":
      return BRAND.colors.accentNeutral;
    case "bear":
    default:
      return BRAND.colors.accentBear;
  }
};

/**
 * The number is the hero. We auto-size based on its rendered length
 * (e.g. "+17.1%" = 6 chars, "-5.1%" = 5 chars, "+100.2%" = 7 chars).
 */
const computeStatSize = (changePct: number): number => {
  const text = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`;
  const len = text.length;
  if (len <= 5) return 400;
  if (len <= 6) return 360;
  if (len <= 7) return 320;
  return 280;
};

const computeHeadlineSize = (lines: string[]): number => {
  const longest = Math.max(...lines.map((l) => l.length));
  if (longest <= 6) return 96;
  if (longest <= 9) return 84;
  if (longest <= 13) return 72;
  if (longest <= 18) return 60;
  return 50;
};

export const ThumbnailStat: React.FC<ThumbnailProps> = ({
  headlineLines,
  dateLabel,
  ticker,
  bgImagePath,
  accent = "bear",
  subtitle,
}) => {
  const accentColor = resolveAccent(accent);
  const fallbackChange = ticker?.changePct ?? 0;
  const statSize = computeStatSize(fallbackChange);
  const headlineSize = computeHeadlineSize(headlineLines);

  const statText = `${fallbackChange >= 0 ? "+" : ""}${fallbackChange.toFixed(1)}%`;
  const isUp = fallbackChange >= 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* ── Mathematical grid background — tight, subtle ── */}
      <svg
        width="1280"
        height="720"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={BRAND.colors.rule}
              strokeWidth="0.6"
              opacity="0.45"
            />
          </pattern>
          <pattern id="gridMajor" width="200" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 200 0 L 0 0 0 200"
              fill="none"
              stroke={BRAND.colors.rule}
              strokeWidth="1.2"
              opacity="0.55"
            />
          </pattern>
        </defs>
        <rect width="1280" height="720" fill="url(#grid)" />
        <rect width="1280" height="720" fill="url(#gridMajor)" />
      </svg>

      {/* ── Optional bg image, very faint, for texture only ── */}
      {bgImagePath && (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={staticFile(bgImagePath)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.15) contrast(1.05) sepia(0.4)",
              opacity: 0.12,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(245,240,232,0.75) 0%, rgba(245,240,232,0.92) 100%)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── Top eyebrow row : date · ticker label ── */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 22,
            letterSpacing: 5,
            color: BRAND.colors.inkLight,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {dateLabel}
        </div>
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 22,
            letterSpacing: 5,
            color: BRAND.colors.inkLight,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {ticker ? "% Change · 1D" : "Édition du soir"}
        </div>
      </div>

      {/* ── Top horizontal rule — full width, anchors the masthead ── */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 64,
          right: 64,
          height: 2,
          backgroundColor: BRAND.colors.ink,
        }}
      />

      {/* ── Main content : two-column STAT | HEADLINE ── */}
      <AbsoluteFill
        style={{
          padding: "112px 64px 96px 64px",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 48,
        }}
      >
        {/* Left column — the hero stat */}
        <div
          style={{
            flex: "0 0 56%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Asset name — small caps */}
          {ticker && (
            <div
              style={{
                fontFamily: BRAND.fonts.condensed,
                fontSize: 56,
                letterSpacing: 6,
                color: BRAND.colors.ink,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {ticker.ticker}
            </div>
          )}

          {/* THE NUMBER */}
          <div
            style={{
              fontFamily: BRAND.fonts.condensed,
              fontSize: statSize,
              fontWeight: 700,
              color: accentColor,
              lineHeight: 0.85,
              letterSpacing: -2,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              // Tabular feel via tnum if available
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{statText}</span>
            <span
              style={{
                fontSize: statSize * 0.42,
                lineHeight: 1,
                marginTop: statSize * 0.12,
                color: accentColor,
              }}
            >
              {isUp ? "▲" : "▼"}
            </span>
          </div>

          {/* Sparkline-style flat baseline — adds terminal feel */}
          <div
            style={{
              marginTop: 24,
              height: 4,
              width: "70%",
              backgroundColor: accentColor,
              opacity: 0.85,
            }}
          />
          <div
            style={{
              marginTop: 14,
              fontFamily: BRAND.fonts.mono,
              fontSize: 18,
              letterSpacing: 2,
              color: BRAND.colors.inkLight,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Séance de clôture · Source Yahoo Finance
          </div>
        </div>

        {/* Right column — editorial headline */}
        <div
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderLeft: `2px solid ${BRAND.colors.ink}`,
            paddingLeft: 36,
          }}
        >
          {headlineLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: BRAND.fonts.display,
                fontSize: headlineSize,
                lineHeight: 0.98,
                fontWeight: 800,
                color: BRAND.colors.ink,
                letterSpacing: -1,
                fontStyle: i === 1 ? "italic" : "normal",
                marginBottom: 4,
              }}
            >
              {line}
            </div>
          ))}

          {subtitle && (
            <div
              style={{
                fontFamily: BRAND.fonts.body,
                fontSize: 26,
                color: BRAND.colors.inkMid,
                marginTop: 18,
                lineHeight: 1.25,
                fontStyle: "italic",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* ── Bottom horizontal rule + branding ── */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 64,
          right: 64,
          height: 1,
          backgroundColor: BRAND.colors.rule,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fonts.condensed,
            fontSize: 26,
            letterSpacing: 6,
            color: BRAND.colors.ink,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Owl Street Journal
        </div>
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 16,
            letterSpacing: 3,
            color: BRAND.colors.inkLight,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Terminal · Marchés
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Sample default props for studio preview
export const SAMPLE_PROPS: ThumbnailProps = {
  headlineLines: ["Hormuz", "sous tension"],
  dateLabel: "Lundi 4 mai",
  subtitle: "Le pétrole rejoue la prime géopolitique.",
  ticker: { ticker: "Brent", changePct: -5.1 },
  accent: "bear",
};
