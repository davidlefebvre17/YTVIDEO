import React from "react";
import { Series, useVideoConfig } from "remotion";
import type { EpisodeScript, AssetSnapshot, NewsItem } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { ColdOpenScene } from "../scenes/ColdOpenScene";
import { ThreadScene } from "../scenes/ThreadScene";
import { ChartDeepDiveScene } from "../scenes/ChartDeepDiveScene";
import { NewsScene } from "../scenes/NewsScene";
import { PredictionsScene } from "../scenes/PredictionsScene";
import { OutroScene } from "../scenes/OutroScene";
import { SegmentScene, type VisualSlot } from "../scenes/SegmentScene";
// Legacy scenes (backward compat)
import { IntroScene } from "../scenes/IntroScene";
import { MarketOverviewScene } from "../scenes/MarketOverviewScene";

export interface DailyRecapEpisodeProps {
  script: EpisodeScript;
  assets?: AssetSnapshot[];
  news?: NewsItem[];
  /** Optional C7 storyboard — enables SegmentScene for segment sections */
  storyboard?: { slots: readonly VisualSlot[] | VisualSlot[] };
  [key: string]: unknown;
}

export const DailyRecapEpisode: React.FC<DailyRecapEpisodeProps> = ({
  script,
  assets = [],
  news = [],
  storyboard,
}) => {
  const { fps } = useVideoConfig();

  const findAsset = (symbol: string | undefined) =>
    assets.find((a) => a.symbol === symbol);

  // Couleur d'accent depuis les données de direction
  const moodMusic = script.direction?.moodMusic ?? 'neutre_analytique';
  const accentColor = BRAND.moodAccent[moodMusic] ?? BRAND.colors.accentDefault;

  // Thumbnail moment — le segment le plus important
  const thumbnailSegmentId = script.direction?.thumbnailMoment?.segmentId;

  // Pre-compute cumulative section offsets (seconds) for storyboard slot mapping
  const sectionOffsets: Record<string, number> = {};
  let cumSec = 0;
  for (const s of script.sections) {
    sectionOffsets[s.id] = cumSec;
    cumSec += s.durationSec;
  }

  return (
    <Series>
      {script.sections.map((section) => {
        const durationInFrames = Math.max(30, Math.round(section.durationSec * fps));

        // Trouver l'asset associé à ce segment
        const segAsset =
          findAsset(section.assets?.[0]) ||
          findAsset((section.data as any)?.asset);

        // Accent du segment (thumbnail moment = accent plus fort)
        const segAccent = section.id === thumbnailSegmentId
          ? accentColor
          : accentColor;

        // Storyboard slots for this segment
        const segSlots = storyboard?.slots.filter(
          (sl) => sl.segId === section.id
        ) ?? [];

        return (
          <Series.Sequence key={section.id} durationInFrames={durationInFrames}>
            {/* ── Nouveaux types (pipeline C1→C5) ── */}
            {(section.type === 'hook') && (
              <ColdOpenScene
                section={section}
                keyFigure={script.direction?.thumbnailMoment?.keyFigure}
                accentColor={segAccent}
                lang={script.lang}
              />
            )}
            {section.type === 'title_card' && (
              <ThreadScene
                section={section}
                accentColor={segAccent}
                lang={script.lang}
                date={script.date}
              />
            )}
            {section.type === 'thread' && (
              <ThreadScene
                section={section}
                accentColor={segAccent}
                lang={script.lang}
                date={script.date}
              />
            )}
            {section.type === 'segment' && segSlots.length > 0 && (
              <SegmentScene
                section={section}
                storyboardSlots={segSlots}
                assets={assets}
                accentColor={segAccent}
                lang={script.lang}
                segmentOffsetSec={sectionOffsets[section.id] ?? 0}
              />
            )}
            {section.type === 'segment' && segSlots.length === 0 && (
              <ChartDeepDiveScene
                section={section}
                asset={segAsset}
                accentColor={segAccent}
                lang={script.lang}
              />
            )}
            {section.type === 'closing' && (
              <OutroScene section={section} />
            )}

            {/* ── Legacy types (backward compat) ── */}
            {section.type === 'intro' && (
              <IntroScene
                section={section}
                episodeNumber={script.episodeNumber}
                date={script.date}
              />
            )}
            {section.type === 'market_overview' && (
              <MarketOverviewScene section={section} assets={assets} />
            )}
            {section.type === 'deep_dive' && (
              <ChartDeepDiveScene
                section={section}
                asset={findAsset((section.data as any)?.asset)}
                accentColor={segAccent}
                lang={script.lang}
              />
            )}
            {section.type === 'news' && (
              <NewsScene section={section} news={news} />
            )}
            {section.type === 'predictions' && (
              <PredictionsScene section={section} />
            )}
            {section.type === 'outro' && (
              <OutroScene section={section} />
            )}
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
