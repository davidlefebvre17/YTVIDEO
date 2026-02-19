import React from "react";
import { Composition, Folder, AbsoluteFill } from "remotion";
import { DailyRecapEpisode } from "./compositions/DailyRecapEpisode";
import { IntroScene } from "./scenes/IntroScene";
import { PreviouslyOnScene } from "./scenes/PreviouslyOnScene";
import { MarketOverviewScene } from "./scenes/MarketOverviewScene";
import { ChartDeepDiveScene } from "./scenes/ChartDeepDiveScene";
import { NewsScene } from "./scenes/NewsScene";
import { PredictionsScene } from "./scenes/PredictionsScene";
import { OutroScene } from "./scenes/OutroScene";
import { SAMPLE_SCRIPT, SAMPLE_ASSETS, SAMPLE_NEWS } from "./fixtures/sample-data";
import type { EpisodeScript, ScriptSection, AssetSnapshot } from "@yt-maker/core";

// Scene wrapper components for Remotion Compositions
const IntroSceneWrapper: React.FC<{ section: ScriptSection; episodeNumber: number; date: string }> = (props) => (
  <AbsoluteFill>
    <IntroScene {...props} />
  </AbsoluteFill>
);

const PreviouslyOnSceneWrapper: React.FC<{ section: ScriptSection }> = (props) => (
  <AbsoluteFill>
    <PreviouslyOnScene {...props} />
  </AbsoluteFill>
);

const MarketOverviewSceneWrapper: React.FC<{ section: ScriptSection; assets: AssetSnapshot[] }> = (props) => (
  <AbsoluteFill>
    <MarketOverviewScene {...props} />
  </AbsoluteFill>
);

const ChartDeepDiveSceneWrapper: React.FC<{ section: ScriptSection; asset: AssetSnapshot | undefined }> = (props) => (
  <AbsoluteFill>
    <ChartDeepDiveScene {...props} />
  </AbsoluteFill>
);

const NewsSceneWrapper: React.FC<{ section: ScriptSection; news: any[] }> = (props) => (
  <AbsoluteFill>
    <NewsScene {...props} />
  </AbsoluteFill>
);

const PredictionsSceneWrapper: React.FC<{ section: ScriptSection }> = (props) => (
  <AbsoluteFill>
    <PredictionsScene {...props} />
  </AbsoluteFill>
);

const OutroSceneWrapper: React.FC<{ section: ScriptSection }> = (props) => (
  <AbsoluteFill>
    <OutroScene {...props} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  // Get sections from fixture data
  const introSection = SAMPLE_SCRIPT.sections.find(s => s.type === "intro")!;
  const previouslyOnSection = SAMPLE_SCRIPT.sections.find(s => s.type === "previously_on");
  const marketOverviewSection = SAMPLE_SCRIPT.sections.find(s => s.type === "market_overview")!;
  const deepDiveSection1 = SAMPLE_SCRIPT.sections.find(s => s.type === "deep_dive");
  const deepDiveSection2 = SAMPLE_SCRIPT.sections.filter(s => s.type === "deep_dive")[1];
  const newsSection = SAMPLE_SCRIPT.sections.find(s => s.type === "news")!;
  const predictionsSection = SAMPLE_SCRIPT.sections.find(s => s.type === "predictions")!;
  const outroSection = SAMPLE_SCRIPT.sections.find(s => s.type === "outro")!;

  // Get matching assets for deep dive scenes
  const deepDiveAsset1 = deepDiveSection1?.data?.asset
    ? SAMPLE_ASSETS.find(a => a.symbol === (deepDiveSection1.data as Record<string, unknown>).asset)
    : SAMPLE_ASSETS[0];
  const deepDiveAsset2 = deepDiveSection2?.data?.asset
    ? SAMPLE_ASSETS.find(a => a.symbol === (deepDiveSection2.data as Record<string, unknown>).asset)
    : SAMPLE_ASSETS[1];

  return (
    <>
      <Folder name="Episodes">
        <Composition
          id="DailyRecap"
          component={DailyRecapEpisode}
          durationInFrames={SAMPLE_SCRIPT.totalDurationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            script: SAMPLE_SCRIPT,
            assets: SAMPLE_ASSETS,
            news: SAMPLE_NEWS,
          }}
          calculateMetadata={({ props }: { props: Record<string, unknown> }) => {
            const script = props.script as EpisodeScript;
            const totalSec = script.totalDurationSec || 540;
            return {
              durationInFrames: Math.round(totalSec * 30),
              fps: 30,
              width: 1920,
              height: 1080,
            };
          }}
        />
      </Folder>

      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={IntroSceneWrapper}
          durationInFrames={introSection.durationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: introSection,
            episodeNumber: SAMPLE_SCRIPT.episodeNumber,
            date: SAMPLE_SCRIPT.date,
          }}
        />

        {previouslyOnSection && (
          <Composition
            id="PreviouslyOn"
            component={PreviouslyOnSceneWrapper}
            durationInFrames={previouslyOnSection.durationSec * 30}
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
              section: previouslyOnSection,
            }}
          />
        )}

        <Composition
          id="MarketOverview"
          component={MarketOverviewSceneWrapper}
          durationInFrames={marketOverviewSection.durationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: marketOverviewSection,
            assets: SAMPLE_ASSETS,
          }}
        />

        {deepDiveSection1 && deepDiveAsset1 && (
          <Composition
            id="ChartDeepDive1"
            component={ChartDeepDiveSceneWrapper}
            durationInFrames={deepDiveSection1.durationSec * 30}
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
              section: deepDiveSection1,
              asset: deepDiveAsset1,
            }}
          />
        )}

        {deepDiveSection2 && deepDiveAsset2 && (
          <Composition
            id="ChartDeepDive2"
            component={ChartDeepDiveSceneWrapper}
            durationInFrames={deepDiveSection2.durationSec * 30}
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
              section: deepDiveSection2,
              asset: deepDiveAsset2,
            }}
          />
        )}

        <Composition
          id="News"
          component={NewsSceneWrapper}
          durationInFrames={newsSection.durationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: newsSection,
            news: SAMPLE_NEWS,
          }}
        />

        <Composition
          id="Predictions"
          component={PredictionsSceneWrapper}
          durationInFrames={predictionsSection.durationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: predictionsSection,
          }}
        />

        <Composition
          id="Outro"
          component={OutroSceneWrapper}
          durationInFrames={outroSection.durationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: outroSection,
          }}
        />
      </Folder>
    </>
  );
};
