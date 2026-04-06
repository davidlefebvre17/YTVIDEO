import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import type { BeatOverlay, AssetSnapshot } from "@yt-maker/core";
import { BRAND, ASSET_NAMES } from "@yt-maker/core";
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
    position: 'absolute', top: BRAND.layout.safeV, right: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    maxWidth: 500,
  },
  lower_third: {
    position: 'absolute', top: BRAND.layout.safeV, left: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
    maxWidth: 500,
  },
  top_right: {
    position: 'absolute', top: BRAND.layout.safeV, right: BRAND.layout.safeH,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    maxWidth: 400,
  },
  full: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};

function getContainerStyle(type: string, accentColor: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    background: `rgba(${245}, ${240}, ${232}, 0.82)`,
    padding: '16px 24px',
  };

  switch (type) {
    case 'stat':
      return {
        ...baseStyle,
        borderRadius: 0,
        borderTop: `2px solid ${BRAND.colors.rule}`,
        borderBottom: `2px solid ${BRAND.colors.rule}`,
      };
    case 'causal_chain':
      return {
        ...baseStyle,
        borderRadius: 0,
        borderLeft: `4px solid ${accentColor}`,
        paddingLeft: '20px',
      };
    case 'headline':
      return {
        ...baseStyle,
        borderRadius: 0,
        borderLeft: `4px solid ${accentColor}`,
        paddingLeft: '20px',
      };
    case 'chart':
    case 'chart_zone':
      return {
        background: 'rgba(245, 240, 232, 0.92)',
        padding: '24px 32px',
        borderRadius: 0,
        backdropFilter: 'blur(4px)',
      };
    case 'gauge':
      return {
        ...baseStyle,
        borderRadius: 0,
        borderTop: `2px solid ${BRAND.colors.rule}`,
        borderBottom: `2px solid ${BRAND.colors.rule}`,
        padding: '20px 32px',
        minWidth: 220,
      };
    case 'scenario_fork':
      return {
        ...baseStyle,
        borderRadius: 0,
        borderTop: `1px solid ${BRAND.colors.rule}`,
        borderBottom: `1px solid ${BRAND.colors.rule}`,
      };
    default:
      return {
        ...baseStyle,
        borderRadius: 0,
        borderTop: `1px solid ${BRAND.colors.rule}`,
      };
  }
}

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
  const containerStyle = getContainerStyle(overlay.type, accentColor);

  const exitStart = durationInFrames - 8;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const combinedAnimStyle = {
    ...animStyle,
    opacity: (animStyle.opacity as number | undefined) ? (animStyle.opacity as number) * exitOpacity : exitOpacity,
  };

  return (
    <div style={{ ...posStyle, zIndex: 100 }}>
      <div style={{ ...containerStyle, ...combinedAnimStyle }}>
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

/** Replace Yahoo symbols with human names.
 *  Symbols with special chars (^, =, -, .) → safe exact match.
 *  Plain tickers (AAPL, META) → word boundary to avoid "Or" → "Realty Incomer".
 *  Single-char tickers (O, A, C, F) → skipped entirely. */
function replaceSymbol(text: string, sym: string, name: string): string {
  if (sym.length < 2 || !text.includes(sym)) return text;
  // Symbols with special chars are unambiguous — safe for exact replace
  if (/[^A-Za-z0-9]/.test(sym)) {
    return text.split(sym).join(name);
  }
  // Plain tickers: require word boundaries (not preceded/followed by letter/digit)
  const re = new RegExp(`(?<![a-zA-ZÀ-ÿ0-9])${sym}(?![a-zA-ZÀ-ÿ0-9])`, 'g');
  return text.replace(re, name);
}

// Financial abbreviations → readable French
const ABBREV_FR: Record<string, string> = {
  'BCE': 'Banque Centrale Européenne',
  'ECB': 'Banque Centrale Européenne',
  'FOMC': 'Réunion de la Fed',
  'CPI': 'Indice des Prix',
  'PPI': 'Prix à la Production',
  'PMI': 'Indice des Directeurs d\'Achat',
  'NFP': 'Créations d\'Emploi US',
  'COT': 'Positions des Traders',
  'RSI': 'Force Relative',
  'SMA': 'Moyenne Mobile',
  'EMA': 'Moyenne Mobile Exp.',
  'ATH': 'Plus Haut Historique',
  'ATL': 'Plus Bas Historique',
  'DXY': 'Dollar Index',
  'VIX': 'Indice de Volatilité',
  'IPO': 'Introduction en Bourse',
  'ETF': 'Fonds Indiciel',
  'YoY': 'Sur un an',
  'MoM': 'Sur un mois',
  'QoQ': 'Sur un trimestre',
  'GDP': 'PIB',
  'QE': 'Assouplissement Quantitatif',
  'QT': 'Resserrement Quantitatif',
  'OPEC': 'OPEP',
  'WTI': 'Pétrole WTI',
  'F&G': 'Peur & Avidité',
};

// ASSET_NAMES sorted by key length descending — longer symbols first (CL=F before CL)
const SORTED_ASSET_ENTRIES = Object.entries(ASSET_NAMES)
  .sort(([a], [b]) => b.length - a.length);

function humanize(text: string, assets: AssetSnapshot[]): string {
  if (!text) return text;
  let out = text;
  // 1. Financial abbreviations → readable French
  for (const [abbr, full] of Object.entries(ABBREV_FR)) {
    out = replaceSymbol(out, abbr, full);
  }
  // 2. Live assets first (longest symbols, most accurate names)
  const sortedAssets = [...assets].sort((a, b) => b.symbol.length - a.symbol.length);
  for (const a of sortedAssets) {
    if (a.name && a.symbol) {
      out = replaceSymbol(out, a.symbol, a.name);
    }
  }
  // 3. ASSET_NAMES fallback (sorted longest first — CL=F before CL)
  for (const [sym, name] of SORTED_ASSET_ENTRIES) {
    out = replaceSymbol(out, sym, name);
  }
  return out;
}

/** Two-phase chart: full view → crossfade → zoomed last 15 candles */
const ChartWithZoom: React.FC<{
  allCandles: any[]; zoomCandles: any[]; hasZoom: boolean;
  levels: InkLevel[]; accentColor: string;
  chartW: number; chartH: number;
  assetName: string; price?: number; changePct: number;
  durationInFrames: number;
}> = ({ allCandles, zoomCandles, hasZoom, levels, accentColor, chartW, chartH, assetName, price, changePct, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Phase 1: full chart (0 → 60% of duration)
  // Phase 2: zoomed chart (60% → 100%)
  // Full chart for 50%, zoom for 50%
  const switchFrame = Math.round(durationInFrames * 0.5);
  const crossfadeDur = 10;

  const fullOp = hasZoom
    ? interpolate(frame, [switchFrame, switchFrame + crossfadeDur], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 1;
  const zoomOp = hasZoom
    ? interpolate(frame, [switchFrame, switchFrame + crossfadeDur], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 0;

  const header = (label: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 8px' }}>
      <span style={{ fontFamily: BRAND.fonts.display, fontSize: 22, color: BRAND.colors.ink }}>
        {assetName}
        {label && <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 11, color: BRAND.colors.inkLight, marginLeft: 12 }}>{label}</span>}
      </span>
      <span style={{
        fontFamily: BRAND.fonts.condensed, fontSize: 26,
        color: changePct >= 0 ? '#1a6b3a' : '#8b1a1a',
      }}>
        {price?.toLocaleString()} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
    </div>
  );

  return (
    <div style={{ width: chartW, height: chartH + 40, position: 'relative' }}>
      {/* Full chart */}
      <div style={{ position: 'absolute', inset: 0, opacity: fullOp }}>
        {header('')}
        <CandlestickChart
          candles={allCandles} levels={levels} accentColor={accentColor}
          width={chartW} height={chartH} drawDuration={30}
          showVolume showSMA zoomLast={0}
        />
      </div>

      {/* Zoomed chart (last 15 candles) — fades in */}
      {hasZoom && zoomOp > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: zoomOp }}>
          {header('ZOOM')}
          <CandlestickChart
            candles={zoomCandles} levels={levels} accentColor={accentColor}
            width={chartW} height={chartH} drawDuration={8}
            showVolume showSMA zoomLast={0} displayLast={200}
          />
        </div>
      )}
    </div>
  );
};

const OverlayContent: React.FC<OverlayContentProps> = ({ type, data, assets, accentColor, durationInFrames }) => {
  switch (type) {
    case 'stat': {
      const rawValue = data.value;
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
      // If value is not a valid number, show just the label as a text card
      if (isNaN(numValue)) {
        return (
          <TextCard
            text={humanize((data.label as string) ?? '', assets)}
            accentColor={accentColor}
          />
        );
      }
      const rawSuffix = (data.suffix as string) ?? '%';
      const suffix = rawSuffix === 'text' || rawSuffix === 'string' ? '' : rawSuffix;
      return (
        <AnimatedStat
          value={numValue}
          label={humanize((data.label as string) ?? '', assets)}
          prefix={(data.prefix as string) ?? ''}
          suffix={suffix}
          decimals={Math.abs(numValue) < 10 ? 1 : 0}
          accentColor={accentColor}
          size="md"
        />
      );
    }

    case 'causal_chain': {
      const steps: CausalStep[] = ((data.steps as string[]) ?? []).map(s => ({ label: humanize(s, assets) }));
      return <CausalChain steps={steps} accentColor={accentColor} />;
    }

    case 'comparison': {
      const badges: AssetBadge[] = ((data.assets as any[]) ?? []).map(a => {
        const sym = a.symbol ?? '';
        const found = assets.find(x => x.symbol === sym);
        return {
          symbol: found?.name ?? a.label ?? sym,
          name: a.label ?? found?.name ?? '',
          changePct: a.changePct ?? found?.changePct ?? 0,
          price: a.value ?? a.price ?? found?.price,
        };
      });
      return <MultiAssetBadge assets={badges} accentColor={accentColor} />;
    }

    case 'scenario_fork':
      return (
        <ScenarioFork
          trunk={humanize((data.trunk as string) ?? '', assets)}
          bullish={{
            condition: humanize((data.bullCondition as string) ?? (data.bull as string) ?? '', assets),
            target: humanize((data.bullTarget as string) ?? '', assets),
          }}
          bearish={{
            condition: humanize((data.bearCondition as string) ?? (data.bear as string) ?? '', assets),
            target: humanize((data.bearTarget as string) ?? '', assets),
          }}
          accentColor={accentColor}
        />
      );

    case 'headline':
      return (
        <HeadlineCard
          title={humanize((data.title as string) ?? '', assets)}
          source={(data.source as string) ?? undefined}
          accentColor={accentColor}
        />
      );

    case 'text_card':
      return (
        <TextCard
          text={humanize((data.text as string) ?? '', assets)}
          subtitle={humanize((data.subtitle as string) ?? '', assets)}
          accentColor={accentColor}
        />
      );

    case 'gauge':
      return (
        <GaugeOverlay
          label={humanize((data.label as string) ?? '', assets)}
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
      const allCandles = asset?.dailyCandles ?? asset?.candles ?? [];

      if (allCandles.length < 5) {
        // No candle data — show as stat or text instead of broken chart
        const label = humanize((data.name as string) ?? (asset?.name as string) ?? sym, assets);
        const price = (data.price as number);
        if (price) {
          return <AnimatedStat value={price} label={label} suffix="" accentColor={accentColor} size="md" />;
        }
        return <TextCard text={label} accentColor={accentColor} />;
      }

      const levels: InkLevel[] = ((data.levels as any[]) ?? []).map(l => ({
        value: l.value,
        label: l.label ?? `${l.value}`,
        type: 'support' as const,
      }));

      const chartW = 1400;
      const chartH = 650;
      const ZOOM_DISPLAY = 200;
      // Pass 450 candles so SMA 200 has enough lookback data from the start
      const ZOOM_WITH_LOOKBACK = ZOOM_DISPLAY + 250;
      const zoomCandles = allCandles.slice(-ZOOM_WITH_LOOKBACK);
      const hasZoom = allCandles.length > ZOOM_DISPLAY;

      return <ChartWithZoom
        allCandles={allCandles}
        zoomCandles={zoomCandles}
        hasZoom={hasZoom}
        levels={levels}
        accentColor={accentColor}
        chartW={chartW}
        chartH={chartH}
        assetName={asset?.name ?? sym}
        price={asset?.price}
        changePct={asset?.changePct ?? 0}
        durationInFrames={durationInFrames}
      />;
    }

    default:
      return null;
  }
};
