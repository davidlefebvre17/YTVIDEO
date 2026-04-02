import React from "react";
import { Composition, Folder, AbsoluteFill } from "remotion";
import { DailyRecapEpisode } from "./compositions/DailyRecapEpisode";
import { IntroScene } from "./scenes/IntroScene";
import { MarketOverviewScene } from "./scenes/MarketOverviewScene";
import { ChartDeepDiveScene } from "./scenes/ChartDeepDiveScene";
import { NewsScene } from "./scenes/NewsScene";
import { PredictionsScene } from "./scenes/PredictionsScene";
import { OutroScene } from "./scenes/OutroScene";
import { ColdOpenScene } from "./scenes/ColdOpenScene";
import { ThreadScene } from "./scenes/ThreadScene";
import { SegmentScene, type VisualSlot } from "./scenes/SegmentScene";
import { NewspaperEpisode } from "./compositions/NewspaperEpisode";
import { NewspaperCanvas } from "./scenes/newspaper/NewspaperCanvas";
import { SAMPLE_SCRIPT, SAMPLE_ASSETS, SAMPLE_NEWS, SAMPLE_STORYBOARD } from "./fixtures/sample-data";
import { SAMPLE_BEATS } from "./fixtures/sample-beats";
import REAL_PROPS from "./fixtures/real-beats.json";
import EPISODE_INDEX from "./fixtures/episode-index.json";
import { BeatEpisode, computeNewspaperDuration } from "./compositions/BeatEpisode";
import { StampOverlay } from "./scenes/shared/StampOverlay";
import type { EpisodeScript, ScriptSection, AssetSnapshot, Beat } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";

// Scene wrapper components for Remotion Compositions
const IntroSceneWrapper: React.FC<{ section: ScriptSection; episodeNumber: number; date: string }> = (props) => (
  <AbsoluteFill>
    <IntroScene {...props} />
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

const ColdOpenWrapper: React.FC<Record<string, unknown>> = (props) => (
  <ColdOpenScene
    section={props.section as any}
    keyFigure={props.keyFigure as string | undefined}
    unit={props.unit as string | undefined}
    accentColor={props.accentColor as string | undefined}
    lang={props.lang as 'fr' | 'en' | undefined}
  />
);

const ThreadWrapper: React.FC<Record<string, unknown>> = (props) => (
  <ThreadScene
    section={props.section as any}
    accentColor={props.accentColor as string | undefined}
    lang={props.lang as 'fr' | 'en' | undefined}
    date={props.date as string | undefined}
  />
);

const ChartInkWrapper: React.FC<Record<string, unknown>> = (props) => (
  <ChartDeepDiveScene
    section={props.section as any}
    asset={props.asset as any}
    accentColor={props.accentColor as string | undefined}
    lang={props.lang as 'fr' | 'en' | undefined}
  />
);

const SegmentSceneWrapper: React.FC<Record<string, unknown>> = (props) => (
  <SegmentScene
    section={props.section as any}
    storyboardSlots={props.storyboardSlots as VisualSlot[]}
    assets={props.assets as any[]}
    accentColor={props.accentColor as string | undefined}
    lang={props.lang as 'fr' | 'en' | undefined}
    segmentOffsetSec={props.segmentOffsetSec as number | undefined}
  />
);

const NewspaperEpisodeWrapper: React.FC<Record<string, unknown>> = (props) => (
  <NewspaperEpisode
    script={props.script as EpisodeScript}
    assets={props.assets as AssetSnapshot[]}
    storyboard={props.storyboard as any}
    lang={props.lang as 'fr' | 'en' | undefined}
  />
);

const NewspaperCanvasStatic: React.FC<Record<string, unknown>> = (props) => (
  <NewspaperCanvas script={props.script as EpisodeScript} accentColor={BRAND.colors.accentDefault} />
);

const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.";
const EmptyNewspaperPage: React.FC = () => (
  <NewspaperPage
    title=""
    date={new Date().toISOString().split("T")[0]}
    segments={[
      { id: "seg_1", title: "", depth: "deep", narration: LOREM + " " + LOREM },
      { id: "seg_2", title: "", depth: "deep", narration: LOREM + " " + LOREM },
      { id: "seg_3", title: "", depth: "focus", narration: LOREM },
      { id: "seg_4", title: "", depth: "focus", narration: LOREM },
      { id: "seg_5", title: "", depth: "flash", narration: LOREM },
      { id: "seg_6", title: "", depth: "flash", narration: LOREM },
    ]}
    threadSummary="Les marchés décortiqués, chaque soir. Analyse éditoriale indépendante des mouvements de la journée. Les marchés décortiqués, chaque soir."
    showTypewriter={false}
  />
);

import { NewspaperPage, type SegmentCard } from "./scenes/shared/NewspaperPage";

// Fallback sections for legacy Scenes folder when script uses pipeline format
const FALLBACK_SECTION = (type: string): ScriptSection => ({
  id: type, type: type as any, title: type, narration: '', durationSec: 10, visualCues: [],
});

export const RemotionRoot: React.FC = () => {
  // Get sections from fixture data (with fallbacks for pipeline-format scripts)
  const introSection = SAMPLE_SCRIPT.sections.find(s => s.type === "intro") ?? FALLBACK_SECTION("intro");
  const marketOverviewSection = SAMPLE_SCRIPT.sections.find(s => s.type === "market_overview") ?? FALLBACK_SECTION("market_overview");
  const deepDiveSection1 = SAMPLE_SCRIPT.sections.find(s => s.type === "deep_dive");
  const deepDiveSection2 = SAMPLE_SCRIPT.sections.filter(s => s.type === "deep_dive")[1];
  const newsSection = SAMPLE_SCRIPT.sections.find(s => s.type === "news") ?? FALLBACK_SECTION("news");
  const predictionsSection = SAMPLE_SCRIPT.sections.find(s => s.type === "predictions") ?? FALLBACK_SECTION("predictions");
  const outroSection = SAMPLE_SCRIPT.sections.find(s => s.type === "outro") ?? FALLBACK_SECTION("outro");

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
            storyboard: SAMPLE_STORYBOARD,
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

      <Folder name="NewScenes">
        <Composition
          id="ColdOpen"
          component={ColdOpenWrapper}
          durationInFrames={240}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: {
              id: 'cold_open',
              type: 'hook' as const,
              title: 'Cold Open',
              narration: 'Le WTI à 83,45 dollars ce soir — moins douze pour cent en une séance. Le plus grand crash pétrolier depuis Covid.',
              durationSec: 8,
              visualCues: [],
            },
            keyFigure: '-11.94',
            unit: '%',
            accentColor: BRAND.colors.accentDefault,
            lang: 'fr' as const,
          }}
        />
        <Composition
          id="Thread"
          component={ThreadWrapper}
          durationInFrames={600}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: {
              id: 'thread',
              type: 'thread' as const,
              title: 'Le Grand Repricing du Pétrole',
              narration: 'Aujourd\'hui les marchés ont vécu quelque chose de rare : une journée où tout se retourne en même temps. Le WTI s\'effondre de douze pour cent — pas parce que l\'offre monte, mais parce que le marché price une destruction de demande. Et derrière ce mouvement, une chaîne causale que nous allons décortiquer segment par segment.',
              durationSec: 20,
              visualCues: [],
            },
            accentColor: BRAND.colors.accentDefault,
            lang: 'fr' as const,
            date: '2026-03-12',
          }}
        />
        <Composition
          id="ChartInk"
          component={ChartInkWrapper}
          durationInFrames={2700}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            section: {
              id: 'seg_1',
              type: 'segment' as const,
              depth: 'deep' as const,
              title: 'WTI — Le paradoxe pétrolier',
              narration: 'Le WTI à 83,45 dollars ce soir — moins douze pour cent en une séance. Le Brent suit à 87,80, moins onze. Et le premier réflexe serait de dire : tensions Iran, le pétrole devrait monter. La raison ? Le marché ne price pas l\'offre menacée. Il price la destruction de demande.',
              durationSec: 90,
              assets: ['CL=F'],
              visualCues: [
                { type: 'show_level', asset: 'CL=F', value: 83, label: 'Support 83$', direction: 'up' as const },
                { type: 'show_level', asset: 'CL=F', value: 87, label: 'Résistance 87$', direction: 'down' as const },
              ],
            },
            asset: SAMPLE_ASSETS[0],
            accentColor: BRAND.colors.accentDefault,
            lang: 'fr' as const,
          }}
        />

        {/* ── SegmentScene previews — one per depth level ── */}
        {(() => {
          const seg1Section = SAMPLE_SCRIPT.sections.find(s => s.id === 'seg_1');
          const seg1Slots = (SAMPLE_STORYBOARD.slots as unknown as VisualSlot[]).filter(sl => sl.segId === 'seg_1');
          if (!seg1Section) return null;
          return (
            <Composition
              id="SegmentDeep"
              component={SegmentSceneWrapper}
              durationInFrames={seg1Section.durationSec * 30}
              fps={30}
              width={1920}
              height={1080}
              defaultProps={{
                section: seg1Section,
                storyboardSlots: seg1Slots,
                assets: SAMPLE_ASSETS,
                accentColor: BRAND.colors.accentDefault,
                lang: 'fr' as const,
                segmentOffsetSec: 32,
              }}
            />
          );
        })()}

        {(() => {
          const seg4Section = SAMPLE_SCRIPT.sections.find(s => s.id === 'seg_4');
          const seg4Slots = (SAMPLE_STORYBOARD.slots as unknown as VisualSlot[]).filter(sl => sl.segId === 'seg_4');
          if (!seg4Section) return null;
          return (
            <Composition
              id="SegmentFlash"
              component={SegmentSceneWrapper}
              durationInFrames={seg4Section.durationSec * 30}
              fps={30}
              width={1920}
              height={1080}
              defaultProps={{
                section: seg4Section,
                storyboardSlots: seg4Slots,
                assets: SAMPLE_ASSETS,
                accentColor: BRAND.colors.accentDefault,
                lang: 'fr' as const,
                segmentOffsetSec: 277,
              }}
            />
          );
        })()}
      </Folder>

      <Folder name="BeatEpisodes">
        <Composition
          id="BeatDaily"
          component={BeatEpisode}
          durationInFrames={300}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            script: REAL_PROPS.script as any,
            beats: REAL_PROPS.beats as any,
            assets: REAL_PROPS.assets as any,
            news: (REAL_PROPS as any).news as any,
            owlIntroAudio: (REAL_PROPS as any).owlIntroAudio,
            owlClosingAudio: (REAL_PROPS as any).owlClosingAudio,
            owlTransitionAudios: (REAL_PROPS as any).owlTransitionAudios,
            owlAudioDurations: (REAL_PROPS as any).owlAudioDurations,
          }}
          calculateMetadata={({ props }: { props: Record<string, unknown> }) => {
            const beats = (props.beats ?? []) as Beat[];
            const script = props.script as EpisodeScript;
            return {
              durationInFrames: Math.max(30, computeNewspaperDuration(beats, script, 30, (props as any).owlAudioDurations)),
              fps: 30, width: 1920, height: 1080,
            };
          }}
        />

        {/* ── Per-episode compositions from episode-index.json ── */}
        {EPISODE_INDEX.entries.map((entry) => {
          const props = (EPISODE_INDEX.props as Record<string, any>)[entry.date];
          if (!props?.script) return null;
          const label = `${entry.date} — ${entry.title.slice(0, 40)}`;
          return (
            <Composition
              key={entry.date}
              id={`EP-${entry.date}`}
              component={BeatEpisode}
              durationInFrames={300}
              fps={30}
              width={1920}
              height={1080}
              defaultProps={{
                script: props.script as any,
                beats: (props.beats ?? []) as any,
                assets: (props.assets ?? []) as any,
                news: (props.news ?? []) as any,
                owlIntroAudio: props.owlIntroAudio as any,
                owlClosingAudio: props.owlClosingAudio as any,
                owlTransitionAudios: (props.owlTransitionAudios ?? {}) as any,
                owlAudioDurations: props.owlAudioDurations as any,
              }}
              calculateMetadata={({ props: p }: { props: Record<string, unknown> }) => {
                const b = (p.beats ?? []) as Beat[];
                const s = p.script as EpisodeScript;
                return {
                  durationInFrames: Math.max(30, b.length > 0 ? computeNewspaperDuration(b, s, 30, (p as any).owlAudioDurations) : (s.totalDurationSec ?? 300) * 30),
                  fps: 30, width: 1920, height: 1080,
                };
              }}
            />
          );
        })}
      </Folder>

      {/* ── Stamp Demo: real assets on newspaper background, ~90s ── */}
      {(() => {
        const ep27 = (EPISODE_INDEX.props as Record<string, any>)["2026-03-27"];
        if (!ep27?.assets || !ep27?.script) return null;
        const demoAssets = ep27.assets as AssetSnapshot[];
        const demoScript = ep27.script as EpisodeScript;
        const dur = 2700; // 90s at 30fps
        const demoBeats = (ep27.beats ?? []) as Beat[];
        const demoSegments: SegmentCard[] = (demoScript.sections ?? [])
          .filter((s: any) => s.type === "segment")
          .map((sec: any, i: number) => {
            const segBeats = demoBeats.filter((b: any) => b.segmentId === sec.id);
            const firstWithImage = segBeats.find((b: any) => b.imagePath && !b.imagePath.includes("placeholder"));
            return {
              id: sec.id ?? `seg_${i}`,
              title: sec.title ?? "Segment",
              depth: sec.depth,
              imageSrc: firstWithImage?.imagePath,
              narration: sec.narration?.slice(0, 400),
            };
          });
        const StampDemoComp: React.FC = () => (
          <AbsoluteFill>
            <NewspaperPage
              title={demoScript.title}
              date={demoScript.date}
              segments={demoSegments}
              threadSummary={demoScript.threadSummary ?? demoScript.description ?? ""}
              activeSegmentIdx={-1}
              showTypewriter={false}
            />
            <StampOverlay assets={demoAssets} durationInFrames={dur} />
          </AbsoluteFill>
        );
        return (
          <Composition
            id="StampDemo"
            component={StampDemoComp}
            durationInFrames={dur}
            fps={30}
            width={1920}
            height={1080}
          />
        );
      })()}

      <Folder name="Newspaper">
        {/* Full newspaper episode with camera movement — 1920×1080 viewport */}
        <Composition
          id="NewspaperEpisode"
          component={NewspaperEpisodeWrapper}
          durationInFrames={SAMPLE_SCRIPT.totalDurationSec * 30}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            script: SAMPLE_SCRIPT,
            assets: SAMPLE_ASSETS,
            storyboard: SAMPLE_STORYBOARD,
            lang: 'fr' as const,
          }}
          calculateMetadata={({ props }: { props: Record<string, unknown> }) => {
            const script = props.script as EpisodeScript;
            return {
              durationInFrames: Math.round((script.totalDurationSec || 463) * 30),
              fps: 30, width: 1920, height: 1080,
            };
          }}
        />
        {/* Static full-canvas view — 1920×1080 for layout debugging */}
        <Composition
          id="NewspaperCanvas"
          component={NewspaperCanvasStatic}
          durationInFrames={300}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            script: SAMPLE_SCRIPT,
          }}
        />
        {/* Empty newspaper page — for Veo lastFrame transition */}
        <Composition
          id="EmptyNewspaper"
          component={EmptyNewspaperPage}
          durationInFrames={30}
          fps={30}
          width={1920}
          height={1080}
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
