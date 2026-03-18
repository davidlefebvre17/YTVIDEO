/**
 * SlotRenderer — dispatches a VisualSlot to the correct Remotion component.
 * Extracted from SegmentScene.tsx for reuse in NewspaperEpisode ImageFrames.
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { AssetSnapshot, ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import type { VisualSlot } from "../SegmentScene";
import { InkChart, type InkLevel } from "./InkChart";
import { CandlestickChart } from "./CandlestickChart";
import { CausalChain, type CausalStep } from "./CausalChain";
import { ScenarioFork } from "./ScenarioFork";
import { AnimatedStat } from "./AnimatedStat";
import { MultiAssetBadge, type AssetBadge } from "./MultiAssetBadge";
import { HeatmapGrid, type SectorData } from "./HeatmapGrid";
import { PlaceholderSlot } from "./PlaceholderSlot";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractNumber(desc: string): number {
  const clean = desc.replace(/,/g, ".");
  const m = clean.match(/[-+]?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

function parseCausalSteps(desc: string): CausalStep[] {
  const raw = desc.replace(/step-by-step\s*:/i, "").trim();
  const parts = raw.split(/\s*→\s*/);
  if (parts.length < 2) return [{ label: raw.slice(0, 60) }];
  return parts.map((p) => ({ label: p.trim().slice(0, 40) }));
}

function parseMultiBadge(desc: string, assets: AssetSnapshot[]): AssetBadge[] {
  const pairs = desc.match(/([A-Z^=.\-]+)\s*([+-]\d+\.?\d*%)/g) ?? [];
  const parsed = pairs.map((p) => {
    const m = p.match(/^([A-Z^=.\-]+)\s*([+-]\d+\.?\d*)%/);
    if (!m) return null;
    const [, symbol, changeStr] = m;
    const changePct = parseFloat(changeStr);
    const found = assets.find((a) => a.symbol === symbol);
    return { symbol, name: found?.name, changePct, price: found?.price } satisfies AssetBadge;
  });
  const results = parsed.filter(Boolean) as AssetBadge[];
  if (results.length > 0) return results;
  return assets.slice(0, 4).map((a) => ({
    symbol: a.symbol, name: a.name, changePct: a.changePct, price: a.price,
  }));
}

function buildLevels(section: ScriptSection): InkLevel[] {
  return (section.visualCues ?? [])
    .filter((vc) => vc.type === "show_level" && vc.value !== undefined)
    .map((vc) => ({
      value: vc.value!,
      label: vc.label ?? `${vc.value}`,
      type: (vc.direction === "up" ? "support" : "resistance") as InkLevel["type"],
    }));
}

// ─── Sub-slot renderers ───────────────────────────────────────────────────────

const ChartSlot: React.FC<{
  slot: VisualSlot; assets: AssetSnapshot[]; section: ScriptSection;
  accentColor: string; contentW: number; contentH: number;
}> = ({ slot, assets, section, accentColor, contentW, contentH }) => {
  const found = assets.find((a) => a.symbol === slot.asset) ?? assets[0];
  const candles = found?.dailyCandles?.length
    ? found.dailyCandles.slice(-60)
    : found?.candles?.slice(-60) ?? [];
  if (candles.length < 2) {
    return <PlaceholderSlot description={slot.desc} source="REMOTION" mode="full" />;
  }
  const hasOHLC = candles.some(c => c.h !== c.l && c.o !== 0);
  const levels = buildLevels(section);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: contentW, height: contentH }}>
      {hasOHLC ? (
        <CandlestickChart candles={candles} levels={levels} accentColor={accentColor}
          width={contentW} height={contentH} drawDuration={BRAND.anim.inkDrawFrames} />
      ) : (
        <InkChart candles={candles} levels={levels} accentColor={accentColor}
          width={contentW} height={contentH} drawDuration={BRAND.anim.inkDrawFrames} />
      )}
    </div>
  );
};

const CausalChainSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245, 240, 232, 0.94)", opacity, padding: 60 }}>
      <CausalChain steps={parseCausalSteps(slot.desc)} accentColor={accentColor} stepDelay={18} />
    </div>
  );
};

const TextCardSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideY = interpolate(frame, [0, 14], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const isAlert = slot.type === "infographie_alerte";
  const isParadox = slot.type === "infographie_paradoxe";
  const isTransition = slot.type === "transition_segment";
  const bgColor = isAlert ? `${BRAND.colors.accentBear}12` : isParadox ? `${BRAND.colors.accentWarning}10` : "rgba(245, 240, 232, 0.96)";
  const borderColor = isAlert ? BRAND.colors.accentBear : isParadox ? BRAND.colors.accentWarning : accentColor;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity, transform: `translateY(${slideY}px)` }}>
      <div style={{ maxWidth: 900, padding: "40px 56px", backgroundColor: bgColor,
        border: `2px solid ${borderColor}40`, borderLeft: `6px solid ${borderColor}`, borderRadius: BRAND.borderRadius.md }}>
        {isTransition && (
          <div style={{ fontFamily: BRAND.fonts.mono, fontSize: 11, letterSpacing: "0.2em",
            textTransform: "uppercase", color: accentColor, marginBottom: 16 }}>{slot.segId}</div>
        )}
        <p style={{ fontFamily: BRAND.fonts.body, fontSize: isTransition ? 28 : 22, fontStyle: "italic",
          color: BRAND.colors.inkMid, margin: 0, lineHeight: 1.6 }}>{slot.desc.slice(0, 280)}</p>
      </div>
    </div>
  );
};

const ScenarioForkSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const desc = slot.desc;
  const bullMatch = desc.match(/hausse?[^:]*:\s*([^|.]+)/i);
  const bearMatch = desc.match(/baisse?[^:]*:\s*([^|.]+)/i);
  if (bullMatch && bearMatch) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity, padding: 80 }}>
        <ScenarioFork trunk={desc.split(/haussier|hausse/i)[0].slice(0, 120).trim()}
          bullish={{ condition: bullMatch[1].trim().slice(0, 80), target: "↑" }}
          bearish={{ condition: bearMatch[1].trim().slice(0, 80), target: "↓" }}
          accentColor={accentColor} />
      </div>
    );
  }
  return <TextCardSlot slot={slot} accentColor={accentColor} />;
};

const AnimStatSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const value = extractNumber(slot.desc);
  const isPercent = slot.desc.includes("%");
  const isDollar = slot.desc.includes("$") || slot.desc.includes("dollar");
  const label = slot.desc.replace(/['"]/g, "").replace(/Count-up animé vers\s*/i, "")
    .replace(/\d+[\d,. ]*[%$]?/g, "").trim().slice(0, 60);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(11, 15, 26, 0.92)", opacity }}>
      <AnimatedStat value={value} label={label || slot.desc.slice(0, 50)}
        suffix={isPercent ? "%" : isDollar ? "$" : ""} decimals={isPercent || value < 1000 ? 2 : 0}
        accentColor={accentColor} durationFrames={45} size="lg" />
    </div>
  );
};

const MultiBadgeSlot: React.FC<{ slot: VisualSlot; assets: AssetSnapshot[]; accentColor: string }> = ({ slot, assets, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badges = parseMultiBadge(slot.desc, assets);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(245, 240, 232, 0.96)", opacity, padding: 80 }}>
      <MultiAssetBadge assets={badges} title={slot.desc.includes("badges") ? "Récap marché" : undefined} accentColor={accentColor} />
    </div>
  );
};

const HeatmapSlot: React.FC<{ slot: VisualSlot; assets: AssetSnapshot[] }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sectors: SectorData[] = assets.slice(0, 11).map((a) => ({ name: a.name ?? a.symbol, ticker: a.symbol, change: a.changePct }));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(11, 15, 26, 0.88)", opacity, padding: 60 }}>
      <HeatmapGrid sectors={sectors} title="Secteurs S&P 500" cellDelay={4} />
    </div>
  );
};

const LowerThirdSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const slideX = interpolate(frame, [0, 18], [-400, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: BRAND.layout.disclaimerH + BRAND.layout.tickerH + 12,
      left: BRAND.layout.safeH, right: BRAND.layout.safeH, transform: `translateX(${slideX}px)`, zIndex: 200 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 16,
        backgroundColor: "rgba(11, 15, 26, 0.88)", borderLeft: `4px solid ${accentColor}`, padding: "10px 20px", borderRadius: "0 4px 4px 0" }}>
        <span style={{ fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: "0.08em", color: "rgba(245, 240, 232, 0.9)" }}>
          {slot.desc.slice(0, 120)}
        </span>
      </div>
    </div>
  );
};

// ─── Main dispatcher ─────────────────────────────────────────────────────────

export interface SlotRendererProps {
  slot: VisualSlot;
  assets: AssetSnapshot[];
  section: ScriptSection;
  accentColor: string;
  contentW: number;
  contentH: number;
}

export const SlotRenderer: React.FC<SlotRendererProps> = ({ slot, assets, section, accentColor, contentW, contentH }) => {
  const { source, type } = slot;

  if (source === "MIDJOURNEY" || source === "STOCK") {
    return <PlaceholderSlot description={slot.desc} source={source} asset={slot.asset ?? undefined} prompt={slot.prompt} mode="full" />;
  }
  if (source === "REMOTION_CHART") {
    return <ChartSlot slot={slot} assets={assets} section={section} accentColor={accentColor} contentW={contentW} contentH={contentH} />;
  }
  if (source === "REMOTION_TEXT") {
    if (type === "infographie_chaine") return <CausalChainSlot slot={slot} accentColor={accentColor} />;
    if (type === "infographie_scenario") return <ScenarioForkSlot slot={slot} accentColor={accentColor} />;
    return <TextCardSlot slot={slot} accentColor={accentColor} />;
  }
  if (source === "REMOTION_DATA") {
    if (type === "chiffre_geant_animé" || type === "gauge_animee" || type === "callout_mover" || type === "donnee_animee") {
      return <AnimStatSlot slot={slot} accentColor={accentColor} />;
    }
    if (type === "multi_badge") return <MultiBadgeSlot slot={slot} assets={assets} accentColor={accentColor} />;
    if (type === "heatmap_sectorielle") return <HeatmapSlot slot={slot} assets={assets} />;
    if (type === "lower_third_recap" || type === "teaser_demain" || type === "recap_point") {
      return <LowerThirdSlot slot={slot} accentColor={accentColor} />;
    }
    return <TextCardSlot slot={slot} accentColor={accentColor} />;
  }
  if (source === "REMOTION_LOWER") return <LowerThirdSlot slot={slot} accentColor={accentColor} />;
  return <PlaceholderSlot description={slot.desc} source={source} mode="full" />;
};
