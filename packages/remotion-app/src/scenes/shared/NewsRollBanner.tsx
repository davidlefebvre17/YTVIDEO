/**
 * NewsRollBanner — bandeau de news en bas de la vidéo.
 *
 * Affiche UNE news à la fois avec roulement vertical (slide up).
 * Change de news toutes les 4 secondes.
 * Fond noir semi-transparent, style chaîne info.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { NewsItem } from "@yt-maker/core";

interface NewsRollBannerProps {
  news: NewsItem[];
  /** Durée d'affichage par news en secondes (default 4) */
  displayDuration?: number;
  /** Hauteur du bandeau (default 44) */
  height?: number;
  /** Position depuis le bas (default 40 = au-dessus du disclaimer) */
  bottom?: number;
}

export const NewsRollBanner: React.FC<NewsRollBannerProps> = ({
  news,
  displayDuration = 8,
  height = 44,
  bottom = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Filtrer : FR uniquement, dédupliquer, nettoyer
  const frNews = React.useMemo(() => {
    const seen = new Set<string>();
    return news.filter((n) => {
      if (n.lang && n.lang !== "fr") return false;
      const clean = cleanTitle(n.title);
      // Ignorer les titres trop courts ou qui sont juste un nom de personne
      if (clean.length < 20) return false;
      // Dédupliquer par les 50 premiers chars (évite les doublons multi-source)
      const key = clean.slice(0, 50).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [news]);

  if (frNews.length === 0) return null;

  const framesPerNews = Math.round(displayDuration * fps);
  const transitionFrames = 8; // ~0.27s slide transition

  // Index courant dans la liste de news (boucle)
  const currentIdx = Math.floor(frame / framesPerNews) % frNews.length;
  const nextIdx = (currentIdx + 1) % frNews.length;
  const frameInCycle = frame % framesPerNews;

  // Phase transition : les dernières transitionFrames du cycle
  const isTransitioning = frameInCycle >= framesPerNews - transitionFrames;
  const transitionProgress = isTransitioning
    ? interpolate(
        frameInCycle,
        [framesPerNews - transitionFrames, framesPerNews],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  const currentNews = frNews[currentIdx];
  const nextNews = frNews[nextIdx];

  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 0,
        right: 0,
        height,
        backgroundColor: "rgba(11, 15, 26, 0.80)",
        overflow: "hidden",
        zIndex: 998,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Label "INFO" */}
      <div
        style={{
          flexShrink: 0,
          width: 80,
          height: "100%",
          backgroundColor: BRAND.colors.loss,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.15em",
          }}
        >
          INFO
        </span>
      </div>

      {/* Zone de news avec slide vertical */}
      <div
        style={{
          flex: 1,
          height,
          position: "relative",
          overflow: "hidden",
          paddingLeft: 16,
        }}
      >
        {/* News courante — slide vers le haut quand transition */}
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            height,
            display: "flex",
            alignItems: "center",
            transform: `translateY(${-transitionProgress * height}px)`,
          }}
        >
          <NewsLine item={currentNews} />
        </div>

        {/* News suivante — arrive par le bas */}
        {isTransitioning && (
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              height,
              display: "flex",
              alignItems: "center",
              transform: `translateY(${(1 - transitionProgress) * height}px)`,
            }}
          >
            <NewsLine item={nextNews} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Nettoyer les entités HTML et l'encoding cassé */
function cleanTitle(raw: string): string {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ã /g, "à")
    .replace(/Ã§/g, "ç")
    .replace(/Ã´/g, "ô")
    .replace(/Ã®/g, "î")
    .replace(/Ã¯/g, "ï")
    .replace(/Ã¢/g, "â")
    .replace(/Ã«/g, "ë")
    .replace(/Ã¹/g, "ù")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ligne de news individuelle */
const NewsLine: React.FC<{ item: NewsItem }> = ({ item }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
    {/* Source */}
    <span
      style={{
        fontFamily: BRAND.fonts.mono,
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      {item.source}
    </span>
    {/* Titre */}
    <span
      style={{
        fontFamily: BRAND.fonts.body,
        fontSize: 15,
        color: "#ffffff",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flex: 1,
      }}
    >
      {cleanTitle(item.title)}
    </span>
  </div>
);
