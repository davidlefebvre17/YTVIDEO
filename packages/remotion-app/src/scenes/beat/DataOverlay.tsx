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

  return (
    <div style={{ ...posStyle, zIndex: 100 }}>
      <div style={{ ...OVERLAY_CONTAINER, ...animStyle }}>
        <OverlayContent type={overlay.type} data={data} accentColor={accentColor} durationInFrames={durationInFrames} />
      </div>
    </div>
  );
};

interface OverlayContentProps {
  type: string;
  data: Record<string, unknown>;
  accentColor: string;
  durationInFrames: number;
}

const OverlayContent: React.FC<OverlayContentProps> = ({ type, data, accentColor, durationInFrames }) => {
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
    case 'chart_zone':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 14, color: BRAND.colors.inkLight }}>
            {(data.symbol as string) ?? ''}
          </span>
          <span style={{ fontFamily: BRAND.fonts.condensed, fontSize: 28, color: BRAND.colors.ink }}>
            {(data.price as number)?.toLocaleString() ?? ''}
          </span>
          <span style={{
            fontFamily: BRAND.fonts.mono, fontSize: 16,
            color: ((data.changePct as number) ?? 0) >= 0 ? '#1a6b3a' : '#8b1a1a',
          }}>
            {((data.changePct as number) ?? 0) >= 0 ? '+' : ''}{((data.changePct as number) ?? 0).toFixed(1)}%
          </span>
        </div>
      );

    default:
      return null;
  }
};
