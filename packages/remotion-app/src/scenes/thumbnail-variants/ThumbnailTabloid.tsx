/**
 * Thumbnail YouTube — Variante B "Tabloid Élégant"
 * 1280x720, 1 frame.
 *
 * Inspiration : Daily Mail / NY Post / The Sun, mais filtré par la palette
 * crème/encre du brand. On garde le punch (Bebas Neue massif, barres pleines
 * d'accent color) tout en évitant la vulgarité (pas de jaune fluo, pas de
 * triple point d'exclamation, pas d'arrière-plan agressif).
 *
 * Hiérarchie :
 *  1. Barres horizontales d'accent (top + bottom) qui cadrent l'image
 *  2. Bandeau eyebrow "OWL STREET JOURNAL · DATE" sur la barre du haut
 *  3. HEADLINE en Bebas Neue ALL CAPS, occupe ~60% de la hauteur utile
 *  4. Pastille ticker pleine couleur, contraste maximal en bas-droite
 *  5. Image bg fortement atténuée (≤ 18% opacity), uniquement texture
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

const resolveAccent = (
  accent: ThumbnailProps["accent"]
): { color: string; onColor: string } => {
  switch (accent) {
    case "bull":
      return { color: BRAND.colors.accentBull, onColor: BRAND.colors.cream };
    case "warning":
      return { color: BRAND.colors.accentWarning, onColor: BRAND.colors.cream };
    case "blue":
      return { color: BRAND.colors.accentBlue, onColor: BRAND.colors.cream };
    case "neutral":
      return { color: BRAND.colors.accentNeutral, onColor: BRAND.colors.cream };
    case "bear":
    default:
      return { color: BRAND.colors.accentBear, onColor: BRAND.colors.cream };
  }
};

/**
 * Bebas Neue est ULTRA-condensed → on peut se permettre des tailles élevées
 * sans déborder. Mais on garde une rampe pour 1 ou 2 lignes.
 */
const computeHeadlineSize = (lines: string[]): number => {
  const longest = Math.max(...lines.map((l) => l.length));
  const isTwoLines = lines.length >= 2;
  if (isTwoLines) {
    if (longest <= 6) return 240;
    if (longest <= 9) return 210;
    if (longest <= 12) return 180;
    return 150;
  }
  // 1 ligne : on peut pousser bien plus haut
  if (longest <= 5) return 340;
  if (longest <= 7) return 300;
  if (longest <= 9) return 270;
  if (longest <= 12) return 230;
  return 190;
};

export const ThumbnailTabloid: React.FC<ThumbnailProps> = ({
  headlineLines,
  dateLabel,
  ticker,
  bgImagePath,
  accent = "bear",
  subtitle,
}) => {
  const { color: accentColor, onColor } = resolveAccent(accent);
  const headlineSize = computeHeadlineSize(headlineLines);
  const isOneLine = headlineLines.length === 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>
      {/* ── Optional bg image, ultra-faded, texture only ── */}
      {bgImagePath && (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={staticFile(bgImagePath)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.2) contrast(1.1) sepia(0.35) blur(1.5px)",
              opacity: 0.18,
            }}
          />
          {/* Cream wash to flatten the image into a paper texture */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(245,240,232,0.55) 0%, rgba(245,240,232,0.85) 100%)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── Top accent bar with eyebrow text inside ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 78,
          backgroundColor: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 64px",
          color: onColor,
        }}
      >
        <div
          style={{
            fontFamily: BRAND.fonts.condensed,
            fontSize: 32,
            letterSpacing: 8,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Owl Street Journal
        </div>
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 22,
            letterSpacing: 5,
            opacity: 0.92,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {dateLabel}
        </div>
      </div>

      {/* ── Bottom accent bar (thinner, pure structural) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 14,
          backgroundColor: accentColor,
        }}
      />

      {/* ── Inner ink rule directly under top bar — editorial cue ── */}
      <div
        style={{
          position: "absolute",
          top: 78,
          left: 64,
          right: 64,
          height: 2,
          backgroundColor: BRAND.colors.ink,
          opacity: 0.85,
        }}
      />

      {/* ── Main content stack ── */}
      <AbsoluteFill
        style={{
          padding: "118px 64px 60px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Kicker — small label above headline, mono caps */}
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 22,
            letterSpacing: 6,
            color: accentColor,
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 10,
          }}
        >
          {accent === "bear"
            ? "Marchés · Choc"
            : accent === "bull"
            ? "Marchés · Rallye"
            : accent === "warning"
            ? "Marchés · Alerte"
            : accent === "blue"
            ? "Marchés · Risk-off"
            : "Marchés · Édition"}
        </div>

        {/* HEADLINE — Bebas Neue ALL CAPS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            // Visually center the headline in the remaining vertical space
            marginTop: isOneLine ? -40 : -10,
          }}
        >
          {headlineLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: BRAND.fonts.condensed,
                fontSize: headlineSize,
                // Tight leading on second line so two-line headlines feel
                // stacked rather than airy
                lineHeight: 0.86,
                marginTop: i === 0 ? 0 : -headlineSize * 0.16,
                fontWeight: 700,
                color: BRAND.colors.ink,
                textTransform: "uppercase",
                letterSpacing: -1,
                // Light tonal shift on second line for hierarchy
                opacity: i === 1 ? 0.92 : 1,
                // Force the headline against the left margin, hard-edge feel
                textAlign: "left",
              }}
            >
              {line}
            </div>
          ))}

          {subtitle && (
            <div
              style={{
                fontFamily: BRAND.fonts.body,
                fontSize: 32,
                color: BRAND.colors.inkMid,
                marginTop: 24,
                lineHeight: 1.18,
                fontStyle: "italic",
                maxWidth: ticker ? "62%" : "100%",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom row — wordmark + ticker */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: 24,
          }}
        >
          {/* Tagline tucked bottom-left */}
          <div
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 18,
              color: BRAND.colors.inkLight,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Les marchés, chaque matin
          </div>

          {/* Ticker pastille — chunky, square, hard shadow */}
          {ticker && (
            <div
              style={{
                backgroundColor: accentColor,
                color: onColor,
                padding: "18px 32px 22px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
                borderRadius: 0,
                boxShadow: `6px 6px 0 0 ${BRAND.colors.ink}`,
                border: `2px solid ${BRAND.colors.ink}`,
              }}
            >
              <div
                style={{
                  fontFamily: BRAND.fonts.condensed,
                  fontSize: 28,
                  letterSpacing: 4,
                  fontWeight: 700,
                  opacity: 0.95,
                  textTransform: "uppercase",
                }}
              >
                {ticker.ticker}
              </div>
              <div
                style={{
                  fontFamily: BRAND.fonts.condensed,
                  fontSize: 78,
                  fontWeight: 700,
                  letterSpacing: 0,
                  lineHeight: 0.95,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <span>
                  {ticker.changePct >= 0 ? "+" : ""}
                  {ticker.changePct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 60, lineHeight: 1 }}>
                  {ticker.changePct >= 0 ? "▲" : "▼"}
                </span>
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Sample default props for studio preview
export const SAMPLE_PROPS: ThumbnailProps = {
  headlineLines: ["Hormuz", "en feu"],
  dateLabel: "Lundi 4 mai",
  subtitle: "La prime géopolitique repointe sur le pétrole.",
  ticker: { ticker: "Brent", changePct: -5.1 },
  accent: "bear",
};
