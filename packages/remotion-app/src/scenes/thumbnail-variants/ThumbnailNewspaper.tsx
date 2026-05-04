/**
 * Thumbnail YouTube — Variante D "Front Page" (NYT / WSJ / Le Monde)
 * 1280x720, 1 frame.
 *
 * La plus prestigieuse. On reproduit la grammaire stricte d'une Une de
 * journal éditorial : masthead, dateline, headline serif, deck italic,
 * stat box latérale, médaillon image optionnel, byline en pied.
 *
 * Structure verticale :
 *  ─ Masthead "OWL STREET JOURNAL" (Playfair noir) + filets
 *  ─ Dateline "LUNDI 4 MAI 2026 — ÉDITION DU MATIN" (mono caps)
 *  ─ Headline énorme Playfair Bold, 1 ou 2 lignes
 *  ─ Deck (sous-titre serif italic)
 *  ─ 2 colonnes : médaillon image gauche · stat box éditoriale droite
 *  ─ Byline / source en pied
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
 * Headline en Playfair Bold — la lecture serif demande un peu plus de chasse
 * que Bebas. On taille en fonction de la longueur ET du nombre de lignes.
 */
const computeHeadlineSize = (lines: string[]): number => {
  const longest = Math.max(...lines.map((l) => l.length));
  const isTwoLines = lines.length >= 2;
  if (isTwoLines) {
    if (longest <= 6) return 200;
    if (longest <= 9) return 175;
    if (longest <= 12) return 150;
    return 125;
  }
  // 1 ligne unique — on peut pousser
  if (longest <= 6) return 260;
  if (longest <= 9) return 220;
  if (longest <= 12) return 180;
  return 150;
};

export const ThumbnailNewspaper: React.FC<ThumbnailProps> = ({
  headlineLines,
  dateLabel,
  ticker,
  bgImagePath,
  accent = "bear",
  subtitle,
}) => {
  const accentColor = resolveAccent(accent);
  const headlineSize = computeHeadlineSize(headlineLines);
  const isUp = (ticker?.changePct ?? 0) >= 0;
  const editionLabel = `${dateLabel.toUpperCase()} — ÉDITION DU SOIR`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.cream,
        // Subtle paper warmth, vignette-style
        backgroundImage:
          "radial-gradient(ellipse at center, rgba(245,240,232,1) 0%, rgba(237,231,217,1) 100%)",
      }}
    >
      {/* ── Masthead ── */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Top thin rule */}
        <div
          style={{
            width: "calc(100% - 96px)",
            height: 2,
            backgroundColor: BRAND.colors.ink,
          }}
        />
        {/* Triple-line decoration (NYT style hint) */}
        <div
          style={{
            width: "calc(100% - 96px)",
            height: 1,
            backgroundColor: BRAND.colors.ink,
            marginTop: 4,
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 52,
            fontWeight: 900,
            color: BRAND.colors.ink,
            letterSpacing: 1,
            marginTop: 8,
            textTransform: "none",
            // Slight tracking adjust to feel monumental
            fontStyle: "normal",
          }}
        >
          The Owl Street Journal
        </div>

        {/* Dateline rule + edition info */}
        <div
          style={{
            width: "calc(100% - 96px)",
            height: 1,
            backgroundColor: BRAND.colors.ink,
            marginTop: 4,
          }}
        />
        <div
          style={{
            width: "calc(100% - 96px)",
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0 0 0",
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 16,
              letterSpacing: 3,
              color: BRAND.colors.inkLight,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Vol. III · No. 218
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 16,
              letterSpacing: 3,
              color: BRAND.colors.inkLight,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {editionLabel}
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 16,
              letterSpacing: 3,
              color: BRAND.colors.inkLight,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Marchés · Paris
          </span>
        </div>
        <div
          style={{
            width: "calc(100% - 96px)",
            height: 1,
            backgroundColor: BRAND.colors.ink,
            marginTop: 6,
          }}
        />
      </div>

      {/* ── Kicker label, accent color, above headline ── */}
      <div
        style={{
          position: "absolute",
          top: 192,
          left: 64,
          right: 64,
          fontFamily: BRAND.fonts.condensed,
          fontSize: 26,
          letterSpacing: 8,
          color: accentColor,
          textTransform: "uppercase",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        ◆ Une du jour · Marchés mondiaux ◆
      </div>

      {/* ── Headline (centered, serif, large) ── */}
      <div
        style={{
          position: "absolute",
          top: 232,
          left: 64,
          right: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {headlineLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: BRAND.fonts.display,
              fontSize: headlineSize,
              lineHeight: 0.95,
              fontWeight: 900,
              color: BRAND.colors.ink,
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
              fontSize: 28,
              color: BRAND.colors.inkMid,
              marginTop: 16,
              lineHeight: 1.22,
              fontStyle: "italic",
              maxWidth: 880,
              // Three-em dash flourish hint
              position: "relative",
            }}
          >
            — {subtitle}
          </div>
        )}
      </div>

      {/* ── Bottom row : médaillon image + stat box ── */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 64,
          right: 64,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        {/* Left — médaillon (image OR byline block if no image) */}
        {bgImagePath ? (
          <div
            style={{
              width: 220,
              height: 140,
              border: `2px solid ${BRAND.colors.ink}`,
              padding: 4,
              backgroundColor: BRAND.colors.cream,
              boxShadow: `4px 4px 0 0 ${BRAND.colors.ink}`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Img
                src={staticFile(bgImagePath)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "saturate(0.45) contrast(1.1) sepia(0.25) grayscale(0.3)",
                }}
              />
              {/* Caption strip below */}
            </div>
          </div>
        ) : (
          <div
            style={{
              maxWidth: 360,
              fontFamily: BRAND.fonts.body,
              fontSize: 17,
              color: BRAND.colors.inkLight,
              lineHeight: 1.35,
              fontStyle: "italic",
              borderLeft: `3px solid ${BRAND.colors.rule}`,
              paddingLeft: 14,
            }}
          >
            <strong style={{ color: BRAND.colors.ink, fontStyle: "normal" }}>
              Notre analyse —
            </strong>{" "}
            les ressorts de la séance, ses signaux faibles, ce qui se prépare
            pour l'ouverture demain.
          </div>
        )}

        {/* Center — wordmark + tagline (small, modest) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          <div
            style={{
              fontFamily: BRAND.fonts.condensed,
              fontSize: 22,
              letterSpacing: 7,
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
              fontSize: 13,
              letterSpacing: 3,
              color: BRAND.colors.inkLight,
              textTransform: "uppercase",
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            Les marchés, chaque matin
          </div>
        </div>

        {/* Right — stat box éditoriale */}
        {ticker && (
          <div
            style={{
              minWidth: 240,
              border: `2px solid ${BRAND.colors.ink}`,
              padding: "14px 22px 18px 22px",
              backgroundColor: BRAND.colors.cream,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              boxShadow: `4px 4px 0 0 ${BRAND.colors.ink}`,
            }}
          >
            <div
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 14,
                letterSpacing: 4,
                color: BRAND.colors.inkLight,
                textTransform: "uppercase",
                fontWeight: 600,
                alignSelf: "flex-start",
              }}
            >
              Cours du jour
            </div>
            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: BRAND.colors.rule,
                margin: "4px 0 6px 0",
              }}
            />
            <div
              style={{
                fontFamily: BRAND.fonts.condensed,
                fontSize: 36,
                letterSpacing: 4,
                color: BRAND.colors.ink,
                fontWeight: 700,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {ticker.ticker}
            </div>
            <div
              style={{
                fontFamily: BRAND.fonts.condensed,
                fontSize: 64,
                fontWeight: 700,
                color: accentColor,
                lineHeight: 0.95,
                letterSpacing: -1,
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span>
                {ticker.changePct >= 0 ? "+" : ""}
                {ticker.changePct.toFixed(1)}%
              </span>
              <span style={{ fontSize: 44, lineHeight: 1 }}>
                {isUp ? "▲" : "▼"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom rule + byline ── */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 64,
          right: 64,
          height: 1,
          backgroundColor: BRAND.colors.rule,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 14,
            color: BRAND.colors.inkLight,
            fontStyle: "italic",
            letterSpacing: 0.5,
          }}
        >
          Par la rédaction · Sources Yahoo Finance, Reuters, FRED
        </div>
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 12,
            color: BRAND.colors.inkFaint,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          owlstreetjournal.fr
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Sample default props for studio preview
export const SAMPLE_PROPS: ThumbnailProps = {
  headlineLines: ["Le pétrole", "rallume la mèche"],
  dateLabel: "Lundi 4 mai",
  subtitle:
    "La prime géopolitique repointe, le brut efface deux mois de calme.",
  ticker: { ticker: "Brent", changePct: -5.1 },
  accent: "bear",
};
