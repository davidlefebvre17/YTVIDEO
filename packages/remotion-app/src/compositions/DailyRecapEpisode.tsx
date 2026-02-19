import React from "react";
import { Series, useVideoConfig } from "remotion";
import type { EpisodeScript, AssetSnapshot, NewsItem } from "@yt-maker/core";
import { IntroScene } from "../scenes/IntroScene";
import { PreviouslyOnScene } from "../scenes/PreviouslyOnScene";
import { MarketOverviewScene } from "../scenes/MarketOverviewScene";
import { ChartDeepDiveScene } from "../scenes/ChartDeepDiveScene";
import { NewsScene } from "../scenes/NewsScene";
import { PredictionsScene } from "../scenes/PredictionsScene";
import { OutroScene } from "../scenes/OutroScene";

export interface DailyRecapEpisodeProps {
  script: EpisodeScript;
  assets?: AssetSnapshot[];
  news?: NewsItem[];
  [key: string]: unknown;
}

export const DailyRecapEpisode: React.FC<DailyRecapEpisodeProps> = ({
  script,
  assets = [],
  news = [],
}) => {
  const { fps } = useVideoConfig();

  // Find asset by symbol for deep dives
  const findAsset = (symbol: string | undefined) =>
    assets.find((a) => a.symbol === symbol);

  return (
    <Series>
      {script.sections.map((section) => {
        const durationInFrames = Math.round(section.durationSec * fps);

        return (
          <Series.Sequence key={section.id} durationInFrames={durationInFrames}>
            {section.type === "intro" && (
              <IntroScene
                section={section}
                episodeNumber={script.episodeNumber}
                date={script.date}
              />
            )}
            {section.type === "previously_on" && (
              <PreviouslyOnScene section={section} />
            )}
            {section.type === "market_overview" && (
              <MarketOverviewScene section={section} assets={assets} />
            )}
            {section.type === "deep_dive" && (
              <ChartDeepDiveScene
                section={section}
                asset={findAsset((section.data as any)?.asset)}
              />
            )}
            {section.type === "news" && (
              <NewsScene section={section} news={news} />
            )}
            {section.type === "predictions" && (
              <PredictionsScene section={section} />
            )}
            {section.type === "outro" && (
              <OutroScene section={section} />
            )}
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
