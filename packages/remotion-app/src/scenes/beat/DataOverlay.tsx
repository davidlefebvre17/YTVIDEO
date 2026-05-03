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
import { SpreadChart } from "../shared/SpreadChart";
import { CountdownEvent } from "../shared/CountdownEvent";
// Variants (handoff overlays)
import { StatStampPress } from "../shared/variants/StatStampPress";
import { NumberAvalanche } from "../shared/variants/NumberAvalanche";
import { CausalDomino } from "../shared/variants/CausalDomino";
import { GaugeStrip } from "../shared/variants/GaugeStrip";
import { GaugeLiquid } from "../shared/variants/GaugeLiquid";
import { HeatmapTreemap } from "../shared/variants/HeatmapTreemap";
import { MultiSparklines } from "../shared/variants/MultiSparklines";
import { MultiLaneRace } from "../shared/variants/MultiLaneRace";
import { HeadlineTabloid } from "../shared/variants/HeadlineTabloid";
import { ScenarioBattle } from "../shared/variants/ScenarioBattle";

interface DataOverlayProps {
  overlay: BeatOverlay;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
  yieldsHistory?: { us10y: any[]; us2y: any[]; spread10y2y: any[] };
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
  yieldsHistory,
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
        <OverlayContent type={overlay.type} data={data} assets={assets} accentColor={accentColor} durationInFrames={durationInFrames} yieldsHistory={yieldsHistory} />
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
  yieldsHistory?: { us10y: any[]; us2y: any[]; spread10y2y: any[] };
}

/**
 * Résout les alias de symbole produits par Haiku (ex: "JPY" → "USDJPY=X").
 * Si le symbole exact existe dans assets, on le garde. Sinon on tente substring/alias.
 */
const SYMBOL_ALIASES: Record<string, string[]> = {
  'JPY': ['USDJPY=X', 'JPY=X'],
  'EUR': ['EURUSD=X', 'EUR=X'],
  'GBP': ['GBPUSD=X', 'GBP=X'],
  'CHF': ['USDCHF=X', 'CHF=X'],
  'CAD': ['USDCAD=X', 'CAD=X'],
  'AUD': ['AUDUSD=X'],
  'NZD': ['NZDUSD=X'],
  'CNY': ['USDCNY=X'],
  'BTC': ['BTC-USD'],
  'ETH': ['ETH-USD'],
  'SOL': ['SOL-USD'],
  'GOLD': ['GC=F'],
  'SILVER': ['SI=F'],
  'OIL': ['CL=F'],
  'WTI': ['CL=F'],
  'BRENT': ['BZ=F'],
  'NASDAQ': ['^IXIC', '^NDX'],
  'SPX': ['^GSPC'],
  'DAX': ['^GDAXI'],
  'NIKKEI': ['^N225'],
  'CAC': ['^FCHI'],
};
function resolveAssetSymbol(sym: any, assets: AssetSnapshot[]): string {
  // Defensive: occasionally `data.assets[i].symbol` is an object/array/number
  // when Haiku misformats the overlay payload. Coerce to string instead of
  // crashing the whole frame on `.toUpperCase()`.
  if (sym == null) return '';
  if (typeof sym !== 'string') {
    try { sym = String(sym); } catch { return ''; }
  }
  if (!sym) return sym;
  // 1. Match exact sur le symbole
  if (assets.find(a => a.symbol === sym)) return sym;
  const upper = sym.toUpperCase();
  // 2. Alias map (JPY → USDJPY=X, etc.)
  const aliases = SYMBOL_ALIASES[upper];
  if (aliases) {
    for (const alt of aliases) {
      if (assets.find(a => a.symbol === alt)) return alt;
    }
  }
  // 3. Match par nom (ex: "Keyence" → "6861.T") — Haiku envoie parfois le nom au lieu du ticker
  const lower = sym.toLowerCase();
  const byName = assets.find(a => a.name?.toLowerCase() === lower);
  if (byName) return byName.symbol;
  // 4. Match par nom partiel (ex: "Keyence Corp" → "Keyence" → "6861.T")
  const byNamePartial = assets.find(a =>
    a.name?.toLowerCase().includes(lower) || lower.includes((a.name || '').toLowerCase()),
  );
  if (byNamePartial && (byNamePartial.name || '').length >= 3) return byNamePartial.symbol;
  // 5. Substring match sur le symbole (ex: "USDJPY" → "USDJPY=X")
  const match = assets.find(a => a.symbol.startsWith(upper) || a.symbol.includes(upper));
  return match ? match.symbol : sym;
}

/** Asset ticker card de fallback quand on n'a pas de candles : nom + prix + % */
const AssetTickerCard: React.FC<{
  name: string;
  price: number;
  changePct?: number;
  accentColor: string;
}> = ({ name, price, changePct, accentColor }) => {
  const isUp = (changePct ?? 0) > 0;
  const isDown = (changePct ?? 0) < 0;
  const changeColor = isUp ? '#1a6b3a' : isDown ? '#8b1a1a' : '#4a4a4a';
  const fmtPrice = price >= 1000 ? price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
    : price.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      gap: 6, minWidth: 280,
    }}>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: 28, fontWeight: 800, fontStyle: 'italic',
        color: '#1a1612', lineHeight: 1,
      }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{
          fontFamily: 'Bebas Neue, Impact, sans-serif',
          fontSize: 56, fontWeight: 900,
          color: accentColor, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{fmtPrice}</span>
        {changePct !== undefined && Number.isFinite(changePct) && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 22, fontWeight: 700,
            color: changeColor,
            fontVariantNumeric: 'tabular-nums',
          }}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
        )}
      </div>
    </div>
  );
};

/** Fallback comparaison côte-à-côte pour spread_chart sans candles */
const ComparisonFallback: React.FC<{
  title: string;
  left: { name: string; price?: number; changePct?: number };
  right: { name: string; price?: number; changePct?: number };
  accentColor: string;
}> = ({ title, left, right, accentColor }) => {
  const renderSide = (s: { name: string; price?: number; changePct?: number }) => {
    const isUp = (s.changePct ?? 0) > 0;
    const isDown = (s.changePct ?? 0) < 0;
    const c = isUp ? '#1a6b3a' : isDown ? '#8b1a1a' : '#4a4a4a';
    const fmt = (p?: number) => p === undefined ? '—'
      : p >= 1000 ? p.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
      : p.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
        <div style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 22, fontWeight: 800, fontStyle: 'italic',
          color: '#1a1612', lineHeight: 1,
        }}>{s.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: 'Bebas Neue, Impact, sans-serif',
            fontSize: 38, fontWeight: 900, color: c,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>{fmt(s.price)}</span>
          {s.changePct !== undefined && Number.isFinite(s.changePct) && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 16, fontWeight: 700, color: c,
              fontVariantNumeric: 'tabular-nums',
            }}>{s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%</span>
          )}
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {title && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#3d342a', fontWeight: 700,
        }}>{title}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {renderSide(left)}
        <div style={{
          width: 2, height: 60, backgroundColor: accentColor, opacity: 0.5,
        }} />
        {renderSide(right)}
      </div>
    </div>
  );
};

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

const OverlayContent: React.FC<OverlayContentProps> = ({ type, data, assets, accentColor, durationInFrames, yieldsHistory }) => {
  switch (type) {
    case 'stat': {
      const rawValue = data.value;
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
      // Si la value est invalide OU vaut exactement 0, on n'affiche pas un faux 0% :
      // on bascule sur TextCard avec le label seul (souvent le label est éloquent).
      if (isNaN(numValue) || numValue === 0) {
        const label = humanize((data.label as string) ?? '', assets);
        if (!label) return null;
        return <TextCard text={label} accentColor={accentColor} />;
      }
      const rawSuffix = (data.suffix as string) ?? '%';
      const suffix = rawSuffix === 'text' || rawSuffix === 'string' ? '' : rawSuffix;
      const statProps = {
        value: numValue,
        label: humanize((data.label as string) ?? '', assets),
        prefix: (data.prefix as string) ?? '',
        suffix,
        accentColor,
      };
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'stamp-press') return <StatStampPress {...statProps} />;
      if (variant === 'avalanche') return <NumberAvalanche {...statProps} />;
      return <AnimatedStat {...statProps} size="md" />;
    }

    case 'causal_chain': {
      const steps: CausalStep[] = ((data.steps as string[]) ?? []).map(s => ({ label: humanize(s, assets) }));
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'domino') return <CausalDomino steps={steps} accentColor={accentColor} />;
      return <CausalChain steps={steps} accentColor={accentColor} />;
    }

    case 'comparison': {
      const badges: AssetBadge[] = ((data.assets as any[]) ?? []).map(rawA => {
        // Defensive unwrap : Haiku produces malformed payloads like
        //   { symbol: { symbol: '^STOXX', label: 'STOXX 600' }, label: { ... }, changePct: 0 }
        // both `symbol` and `label` end up as nested objects. Coerce every
        // field that React will render to a primitive.
        const unwrapStr = (v: any, fallback?: any): any => {
          if (v == null) return fallback ?? '';
          if (typeof v === 'string') return v;
          if (typeof v === 'object') {
            // pull most likely string-bearing inner key
            return v.symbol ?? v.label ?? v.name ?? fallback ?? '';
          }
          return String(v);
        };
        const a = {
          ...rawA,
          symbol: unwrapStr(rawA?.symbol),
          label: unwrapStr(rawA?.label, unwrapStr(rawA?.symbol)),
          changePct: typeof rawA?.changePct === 'number' ? rawA.changePct : (Number(rawA?.changePct) || 0),
        };
        const rawSym = a.symbol ?? '';
        const sym = resolveAssetSymbol(rawSym, assets);
        const found = assets.find(x => x.symbol === sym);
        // Toujours préférer le changePct du snapshot quand il existe — Haiku écrit
        // parfois le prix dans changePct par erreur (424.82 pour MSFT, etc.)
        // Heuristique de détection : valeur >50 absolue suspecte pour un % daily
        const haikuVal = a.changePct;
        const haikuSuspect = typeof haikuVal === 'number' && Math.abs(haikuVal) > 50;
        const enrichedChangePct = (found?.changePct !== undefined)
          ? found.changePct
          : (haikuSuspect ? 0 : (haikuVal ?? 0));
        const enrichedLabel = (a.label && a.label !== rawSym)
          ? a.label
          : (found?.name ?? a.label ?? sym);
        // Trajectoire de prix réelle pour sparklines : 30-40 dernières closes
        const candles = (found as any)?.dailyCandles ?? found?.candles ?? [];
        const recent = candles.slice(-40);
        const pricePath = recent.length >= 2
          ? recent.map((c: any) => c.c).filter((v: any) => typeof v === 'number')
          : undefined;
        return {
          symbol: enrichedLabel,
          name: enrichedLabel,
          changePct: enrichedChangePct,
          price: a.value ?? a.price ?? found?.price,
          pricePath,
        };
      });
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'sparklines') return <MultiSparklines assets={badges} accentColor={accentColor} />;
      if (variant === 'lane-race') return <MultiLaneRace assets={badges} accentColor={accentColor} />;
      return <MultiAssetBadge assets={badges} accentColor={accentColor} />;
    }

    case 'scenario_fork': {
      const sfProps = {
        trunk: humanize((data.trunk as string) ?? '', assets),
        bullish: {
          condition: humanize((data.bullCondition as string) ?? (data.bull as string) ?? '', assets),
          target: humanize((data.bullTarget as string) ?? '', assets),
          prob: typeof data.bullProb === 'number' ? data.bullProb : undefined,
        },
        bearish: {
          condition: humanize((data.bearCondition as string) ?? (data.bear as string) ?? '', assets),
          target: humanize((data.bearTarget as string) ?? '', assets),
          prob: typeof data.bearProb === 'number' ? data.bearProb : undefined,
        },
        accentColor,
      };
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'battle') return <ScenarioBattle {...sfProps} />;
      return <ScenarioFork {...sfProps} />;
    }

    case 'headline': {
      const hProps = {
        title: humanize((data.title as string) ?? '', assets),
        source: (data.source as string) ?? undefined,
        accentColor,
      };
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'tabloid') return <HeadlineTabloid {...hProps} />;
      return <HeadlineCard {...hProps} />;
    }

    case 'text_card':
      return (
        <TextCard
          text={humanize((data.text as string) ?? '', assets)}
          subtitle={humanize((data.subtitle as string) ?? '', assets)}
          accentColor={accentColor}
        />
      );

    case 'gauge': {
      const gProps = {
        label: humanize((data.label as string) ?? '', assets),
        value: (data.value as number) ?? 0,
        min: (data.min as number) ?? 0,
        max: (data.max as number) ?? 100,
        accentColor,
      };
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'strip') return <GaugeStrip {...gProps} />;
      if (variant === 'liquid') return <GaugeLiquid {...gProps} />;
      return <GaugeOverlay {...gProps} />;
    }

    case 'heatmap': {
      const sectors = ((data.sectors as any[]) ?? []).map(s => ({
        name: s.sector ?? s.name ?? '',
        ticker: s.ticker,
        change: s.changePct ?? s.change ?? 0,
      }));
      const variant = (data.variant as string) ?? 'default';
      if (variant === 'treemap') return <HeatmapTreemap sectors={sectors} title="Secteurs" />;
      return <HeatmapGrid sectors={sectors} title="Secteurs" />;
    }

    case 'chart':
    case 'chart_zone': {
      const rawSym = (data.symbol as string) ?? '';
      const sym = resolveAssetSymbol(rawSym, assets);
      const asset = assets.find(a => a.symbol === sym);
      // Yield/spread symbols don't appear in `assets` — pull candles from yieldsHistory.
      const yieldMap: Record<string, string> = { 'DGS10': 'us10y', 'DGS2': 'us2y', 'T10Y2Y': 'spread10y2y' };
      const yieldLabel: Record<string, string> = {
        'DGS10': 'Taux 10 ans',
        'DGS2': 'Taux 2 ans',
        'T10Y2Y': 'Spread 10A - 2A',
      };
      const isYield = !!(yieldMap[sym] && yieldsHistory);
      const allCandles = isYield
        ? ((yieldsHistory as any)[yieldMap[sym]] ?? [])
        : (asset?.dailyCandles ?? asset?.candles ?? []);
      // For yields, derive price + changePct from candles (no entry in `assets`).
      const yieldPrice = isYield && allCandles.length >= 1 ? allCandles[allCandles.length - 1].c : undefined;
      const yieldChangePct = (() => {
        if (!isYield || allCandles.length < 2) return undefined;
        const last = allCandles[allCandles.length - 1].c;
        const prev = allCandles[allCandles.length - 2].c;
        return prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
      })();
      const displayName = isYield ? (yieldLabel[sym] ?? sym) : (asset?.name ?? sym);
      const displayPrice = isYield ? yieldPrice : asset?.price;
      const displayChangePct = isYield ? (yieldChangePct ?? 0) : (asset?.changePct ?? 0);

      if (allCandles.length < 5) {
        // Pas de candles : afficher un AssetTicker riche (nom + prix + %) plutôt
        // qu'un simple label. Évite l'overlay "vide" pour les stockScreen movers
        // (Keyence, Fanuc...) qui n'ont pas été fetchés avec leurs bougies.
        const label = humanize((data.name as string) ?? displayName, assets);
        const price = displayPrice ?? (data.price as number | undefined);
        const changePct = displayChangePct !== 0 ? displayChangePct : (data.changePct as number | undefined);
        if (price !== undefined && Number.isFinite(price)) {
          return (
            <AssetTickerCard
              name={label}
              price={price}
              changePct={changePct}
              accentColor={accentColor}
            />
          );
        }
        if (!asset && !label) return null;
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
        assetName={displayName}
        price={displayPrice}
        changePct={displayChangePct}
        durationInFrames={durationInFrames}
      />;
    }

    case 'spread_chart': {
      const sym1 = resolveAssetSymbol((data.asset1 as string) ?? '', assets);
      const sym2 = resolveAssetSymbol((data.asset2 as string) ?? '', assets);
      const label = (data.label as string) ?? `${sym1} vs ${sym2}`;

      // For yield symbols (DGS10, DGS2, T10Y2Y), use yieldsHistory
      const yieldMap: Record<string, string> = { 'DGS10': 'us10y', 'DGS2': 'us2y', 'T10Y2Y': 'spread10y2y' };

      let candles1: any[] = [];
      let candles2: any[] = [];
      let label1 = sym1;
      let label2 = sym2;

      if (yieldMap[sym1] && yieldsHistory) {
        candles1 = (yieldsHistory as any)[yieldMap[sym1]] ?? [];
        label1 = sym1 === 'DGS10' ? '10Y' : sym1 === 'DGS2' ? '2Y' : sym1;
      } else {
        const a1 = assets.find(a => a.symbol === sym1);
        candles1 = a1?.dailyCandles ?? a1?.candles ?? [];
        label1 = a1?.name ?? sym1;
      }

      if (yieldMap[sym2] && yieldsHistory) {
        candles2 = (yieldsHistory as any)[yieldMap[sym2]] ?? [];
        label2 = sym2 === 'DGS10' ? '10Y' : sym2 === 'DGS2' ? '2Y' : sym2;
      } else {
        const a2 = assets.find(a => a.symbol === sym2);
        candles2 = a2?.dailyCandles ?? a2?.candles ?? [];
        label2 = a2?.name ?? sym2;
      }

      if (candles1.length < 5 || candles2.length < 5) {
        // Pas de candles pour au moins un des deux : afficher une comparison
        // côte-à-côte avec name + price + % au lieu d'un simple TextCard.
        const a1 = assets.find(a => a.symbol === sym1);
        const a2 = assets.find(a => a.symbol === sym2);
        return (
          <ComparisonFallback
            title={humanize(label, assets)}
            left={{ name: humanize(label1, assets), price: a1?.price, changePct: a1?.changePct }}
            right={{ name: humanize(label2, assets), price: a2?.price, changePct: a2?.changePct }}
            accentColor={accentColor}
          />
        );
      }

      return (
        <SpreadChart
          line1={{ candles: candles1, label: label1 }}
          line2={{ candles: candles2, label: label2 }}
          title={humanize(label, assets)}
          showSpread
          width={1400}
          height={650}
          drawDuration={30}
        />
      );
    }

    case 'countdown_event': {
      const eventLabel = humanize((data.eventLabel as string) ?? (data.label as string) ?? '', assets);
      const targetDate = ((data.targetDate as string) ?? (data.date as string) ?? '').trim();
      let daysUntil = typeof data.daysUntil === 'number' ? data.daysUntil : 0;

      // Si daysUntil = 0 + targetDate ressemble à une date ISO, recalcule à partir d'aujourd'hui
      if (daysUntil <= 0 && /^\d{4}-\d{2}-\d{2}/.test(targetDate)) {
        const t = new Date(targetDate).getTime();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diff = Math.round((t - today.getTime()) / 86400000);
        if (Number.isFinite(diff) && diff >= 0) daysUntil = diff;
      }

      // Si après recalcul on a toujours 0 ET pas de targetDate clair, on suppress le countdown
      // (sinon on afficherait juste "J" sans valeur de jours, sans intérêt narratif).
      if (daysUntil <= 0 && !targetDate) return null;

      return (
        <CountdownEvent
          eventLabel={eventLabel}
          targetDate={targetDate}
          daysUntil={daysUntil}
          affectedAsset={humanize((data.affectedAsset as string) ?? (data.asset as string) ?? '', assets)}
          stake={humanize((data.stake as string) ?? '', assets)}
          accentColor={accentColor}
        />
      );
    }

    default:
      return null;
  }
};
