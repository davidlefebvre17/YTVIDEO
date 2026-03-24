import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import type { BeatOverlay, AssetSnapshot } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { AnimatedStat } from "../shared/AnimatedStat";
import { CausalChain, type CausalStep } from "../shared/CausalChain";
import { MultiAssetBadge, type AssetBadge } from "../shared/MultiAssetBadge";
import { ScenarioFork } from "../shared/ScenarioFork";
import { HeadlineCard } from "../shared/HeadlineCard";
import { TextCard } from "../shared/TextCard";
import { GaugeOverlay } from "../shared/GaugeOverlay";
import { HeatmapGrid } from "../shared/HeatmapGrid";
import { type InkLevel } from "../shared/InkChart";
import { CandlestickChart } from "../shared/CandlestickChart";

interface DataOverlayProps {
  overlay: BeatOverlay;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  center: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bottom_third: {
    position: 'absolute', bottom: BRAND.layout.disclaimerH + 16, left: BRAND.layout.safeH, right: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
  },
  lower_third: {
    position: 'absolute', bottom: BRAND.layout.disclaimerH + 16, left: BRAND.layout.safeH, right: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
  },
  top_right: {
    position: 'absolute', top: BRAND.layout.safeV, right: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
  },
  full: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};

const OVERLAY_CONTAINER: React.CSSProperties = {
  background: 'rgba(245, 240, 232, 0.82)',
  borderRadius: 10,
  padding: '16px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
};

export const DataOverlay: React.FC<DataOverlayProps> = ({
  overlay,
  assets,
  accentColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = overlay.data;

  const enterAnim = overlay.enterAnimation;
  let animStyle: React.CSSProperties = {};

  switch (enterAnim) {
    case 'pop': {
      const s = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
      animStyle = { transform: `scale(${s})` };
      break;
    }
    case 'slide_up': {
      const ty = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' });
      const op = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
      animStyle = { transform: `translateY(${ty}px)`, opacity: op };
      break;
    }
    case 'fade': {
      const op = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      animStyle = { opacity: op };
      break;
    }
    case 'count_up':
    default: {
      const op = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      animStyle = { opacity: op };
      break;
    }
  }

  const posStyle = POSITION_STYLES[overlay.position] ?? POSITION_STYLES.center;
  const isChart = overlay.type === 'chart' || overlay.type === 'chart_zone';

  const containerStyle = isChart
    ? { background: 'rgba(245, 240, 232, 0.92)', padding: '24px 32px', borderRadius: 0 }
    : OVERLAY_CONTAINER;

  return (
    <div style={{ ...posStyle, zIndex: 100 }}>
      <div style={{ ...containerStyle, ...animStyle }}>
        <OverlayContent type={overlay.type} data={data} assets={assets} accentColor={accentColor} durationInFrames={durationInFrames} />
      </div>
    </div>
  );
};

interface OverlayContentProps {
  type: string;
  data: Record<string, unknown>;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
}

const OverlayContent: React.FC<OverlayContentProps> = ({ type, data, assets, accentColor, durationInFrames }) => {
  switch (type) {
    case 'stat':
      return (
        <AnimatedStat
          value={(data.value as number) ?? 0}
          label={(data.label as string) ?? ''}
          prefix={(data.prefix as string) ?? ''}
          suffix={(data.suffix as string) ?? '%'}
          decimals={Math.abs((data.value as number) ?? 0) < 10 ? 1 : 0}
          accentColor={accentColor}
          size="md"
        />
      );

    case 'causal_chain': {
      const steps: CausalStep[] = ((data.steps as string[]) ?? []).map(s => ({ label: s }));
      return <CausalChain steps={steps} accentColor={accentColor} />;
    }

    case 'comparison': {
      const badges: AssetBadge[] = ((data.assets as any[]) ?? []).map(a => ({
        symbol: a.symbol ?? '',
        name: a.label ?? a.name ?? '',
        changePct: a.changePct ?? 0,
        price: a.value ?? a.price,
      }));
      return <MultiAssetBadge assets={badges} accentColor={accentColor} />;
    }

    case 'scenario_fork':
      return (
        <ScenarioFork
          trunk={(data.trunk as string) ?? ''}
          bullish={{ condition: (data.bull as string) ?? '', target: '' }}
          bearish={{ condition: (data.bear as string) ?? '', target: '' }}
          accentColor={accentColor}
        />
      );

    case 'headline':
      return (
        <HeadlineCard
          title={(data.title as string) ?? ''}
          source={(data.source as string) ?? undefined}
          accentColor={accentColor}
        />
      );

    case 'text_card':
      return (
        <TextCard
          text={(data.text as string) ?? ''}
          subtitle={(data.subtitle as string) ?? undefined}
          accentColor={accentColor}
        />
      );

    case 'gauge':
      return (
        <GaugeOverlay
          label={(data.label as string) ?? ''}
          value={(data.value as number) ?? 0}
          min={(data.min as number) ?? 0}
          max={(data.max as number) ?? 100}
          accentColor={accentColor}
        />
      );

    case 'heatmap': {
      const sectors = ((data.sectors as any[]) ?? []).map(s => ({
        name: s.sector ?? s.name ?? '',
        change: s.changePct ?? s.change ?? 0,
      }));
      return <HeatmapGrid sectors={sectors} title="Secteurs" />;
    }

    case 'chart':
    case 'chart_zone': {
      const sym = (data.symbol as string) ?? '';
      const asset = assets.find(a => a.symbol === sym);
      const candles = asset?.dailyCandles ?? asset?.candles ?? [];

      if (candles.length < 5) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 14, color: BRAND.colors.inkLight }}>{sym}</span>
            <span style={{ fontFamily: BRAND.fonts.condensed, fontSize: 28, color: BRAND.colors.ink }}>
              {(data.price as number)?.toLocaleString() ?? ''}
            </span>
          </div>
        );
      }

      const levels: InkLevel[] = ((data.levels as any[]) ?? []).map(l => ({
        value: l.value,
        label: l.label ?? `${l.value}`,
        type: 'support' as const,
      }));

      const chartW = 1400;
      const chartH = 650;

      return (
        <div style={{ width: chartW, height: chartH + 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 8px' }}>
            <span style={{ fontFamily: BRAND.fonts.display, fontSize: 22, color: BRAND.colors.ink }}>
              {asset?.name ?? sym}
            </span>
            <span style={{
              fontFamily: BRAND.fonts.condensed, fontSize: 26,
              color: (asset?.changePct ?? 0) >= 0 ? '#1a6b3a' : '#8b1a1a',
            }}>
              {asset?.price?.toLocaleString()} ({(asset?.changePct ?? 0) >= 0 ? '+' : ''}{(asset?.changePct ?? 0).toFixed(2)}%)
            </span>
          </div>
          <CandlestickChart
            candles={candles}
            levels={levels}
            accentColor={accentColor}
            width={chartW}
            height={chartH}
            drawDuration={45}
            showVolume
            showSMA
          />
        </div>
      );
    }

    default:
      return null;
  }
};
