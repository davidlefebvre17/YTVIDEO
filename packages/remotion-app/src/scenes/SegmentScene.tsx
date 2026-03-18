import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { AssetSnapshot, ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
// Inline VisualSlot type (mirrors @yt-maker/ai p7-visual types) to avoid circular dependency
export type VisualSource = 'REMOTION_CHART' | 'REMOTION_TEXT' | 'REMOTION_DATA' | 'REMOTION_LOWER' | 'MIDJOURNEY' | 'STOCK';
export type VisualComponentType = string; // full union in @yt-maker/ai
export interface VisualSlot {
  slot: number;
  tStart: number;
  tEnd: number;
  segId: string;
  source: VisualSource;
  type: VisualComponentType;
  desc: string;
  asset?: string | null;
  chartInstructionRef?: string;
  prompt?: string;
  stockKeywords?: string;
}
import { InkChart, type InkLevel } from "./shared/InkChart";
import { CandlestickChart } from "./shared/CandlestickChart";
import { CausalChain, type CausalStep } from "./shared/CausalChain";
import { ScenarioFork } from "./shared/ScenarioFork";
import { AnimatedStat } from "./shared/AnimatedStat";
import { MultiAssetBadge, type AssetBadge } from "./shared/MultiAssetBadge";
import { HeatmapGrid, type SectorData } from "./shared/HeatmapGrid";
import { PlaceholderSlot } from "./shared/PlaceholderSlot";
import { GrainOverlay } from "./shared/GrainOverlay";
import { DisclaimerBar } from "./shared/DisclaimerBar";
import { PermanentTicker } from "./shared/PermanentTicker";

interface SegmentSceneProps {
  section: ScriptSection;
  /** Storyboard slots for this segment — absolute episode times */
  storyboardSlots: VisualSlot[];
  assets: AssetSnapshot[];
  accentColor?: string;
  lang?: "fr" | "en";
  /** Absolute start time (seconds) of this segment in the episode */
  segmentOffsetSec?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the first float found in a string (e.g. "100,46$" → 100.46, "+9.7%" → 9.7) */
function extractNumber(desc: string): number {
  const clean = desc.replace(/,/g, ".");
  const m = clean.match(/[-+]?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

/** Parse "A → B → C" or "A | B | C" chain from a desc string */
function parseCausalSteps(desc: string): CausalStep[] {
  const raw = desc.replace(/step-by-step\s*:/i, "").trim();
  const parts = raw.split(/\s*→\s*/);
  if (parts.length < 2) return [{ label: raw.slice(0, 60) }];
  return parts.map((p) => ({ label: p.trim().slice(0, 40) }));
}

/**
 * Parse "BZ=F +4.2% | CL=F +9.7% | ^GSPC -1.5% | GC=F -1.0%"
 * Returns AssetBadge[] merging with full asset data when available.
 */
function parseMultiBadge(desc: string, assets: AssetSnapshot[]): AssetBadge[] {
  // Try to extract symbol/change pairs from desc
  const pairs = desc.match(/([A-Z^=.\-]+)\s*([+-]\d+\.?\d*%)/g) ?? [];
  const parsed = pairs.map((p) => {
    const m = p.match(/^([A-Z^=.\-]+)\s*([+-]\d+\.?\d*)%/);
    if (!m) return null;
    const [, symbol, changeStr] = m;
    const changePct = parseFloat(changeStr);
    const found = assets.find((a) => a.symbol === symbol);
    return {
      symbol,
      name: found?.name,
      changePct,
      price: found?.price,
    } satisfies AssetBadge;
  });
  const results = parsed.filter(Boolean) as AssetBadge[];
  if (results.length > 0) return results;
  // Fallback: use first 4 assets from prop
  return assets.slice(0, 4).map((a) => ({
    symbol: a.symbol,
    name: a.name,
    changePct: a.changePct,
    price: a.price,
  }));
}

/** Build InkLevel[] from section.visualCues (show_level entries) */
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
  slot: VisualSlot;
  assets: AssetSnapshot[];
  section: ScriptSection;
  accentColor: string;
  contentW: number;
  contentH: number;
}> = ({ slot, assets, section, accentColor, contentW, contentH }) => {
  const found = assets.find((a) => a.symbol === slot.asset) ?? assets[0];
  const candles = found?.dailyCandles?.length
    ? found.dailyCandles.slice(-60)
    : found?.candles?.slice(-60) ?? [];

  if (candles.length < 2) {
    return (
      <PlaceholderSlot description={slot.desc} source="REMOTION" mode="full" />
    );
  }

  const levels = buildLevels(section);
  const hasOHLC = candles.some(c => c.h !== c.l && c.o !== 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: contentW,
        height: contentH,
      }}
    >
      {hasOHLC ? (
        <CandlestickChart
          candles={candles}
          levels={levels}
          accentColor={accentColor}
          width={contentW}
          height={contentH}
          drawDuration={BRAND.anim.inkDrawFrames}
        />
      ) : (
        <InkChart
          candles={candles}
          levels={levels}
          accentColor={accentColor}
          width={contentW}
          height={contentH}
          drawDuration={BRAND.anim.inkDrawFrames}
        />
      )}
    </div>
  );
};

const CausalChainSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({
  slot,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const steps = parseCausalSteps(slot.desc);
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(245, 240, 232, 0.94)",
        opacity,
        padding: 60,
      }}
    >
      <CausalChain steps={steps} accentColor={accentColor} stepDelay={18} />
    </div>
  );
};

const TextCardSlot: React.FC<{
  slot: VisualSlot;
  accentColor: string;
}> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slideY = interpolate(frame, [0, 14], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isAlert = slot.type === "infographie_alerte";
  const isParadox = slot.type === "infographie_paradoxe";
  const isTransition = slot.type === "transition_segment";

  const bgColor = isAlert
    ? `${BRAND.colors.accentBear}12`
    : isParadox
    ? `${BRAND.colors.accentWarning}10`
    : "rgba(245, 240, 232, 0.96)";

  const borderColor = isAlert
    ? BRAND.colors.accentBear
    : isParadox
    ? BRAND.colors.accentWarning
    : accentColor;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${slideY}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          padding: "40px 56px",
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}40`,
          borderLeft: `6px solid ${borderColor}`,
          borderRadius: BRAND.borderRadius.md,
        }}
      >
        {isTransition && (
          <div
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accentColor,
              marginBottom: 16,
            }}
          >
            {slot.segId}
          </div>
        )}
        <p
          style={{
            fontFamily: BRAND.fonts.body,
            fontSize: isTransition ? 28 : 22,
            fontStyle: "italic",
            color: BRAND.colors.inkMid,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {slot.desc.slice(0, 280)}
        </p>
      </div>
    </div>
  );
};

const ScenarioForkSlot: React.FC<{ slot: VisualSlot; accentColor: string }> = ({
  slot,
  accentColor,
}) => {
  // ScenarioFork needs structured data — parse what we can from desc, or fallback to text
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Try a rough parse: anything before "haussier" is trunk, then two branches
  const desc = slot.desc;
  const bullMatch = desc.match(/hausse?[^:]*:\s*([^|.]+)/i);
  const bearMatch = desc.match(/baisse?[^:]*:\s*([^|.]+)/i);

  if (bullMatch && bearMatch) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          padding: 80,
        }}
      >
        <ScenarioFork
          trunk={desc.split(/haussier|hausse/i)[0].slice(0, 120).trim()}
          bullish={{ condition: bullMatch[1].trim().slice(0, 80), target: "↑" }}
          bearish={{ condition: bearMatch[1].trim().slice(0, 80), target: "↓" }}
          accentColor={accentColor}
        />
      </div>
    );
  }
  // Fallback to text card
  return <TextCardSlot slot={slot} accentColor={accentColor} />;
};

const AnimStatSlot: React.FC<{
  slot: VisualSlot;
  accentColor: string;
}> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const value = extractNumber(slot.desc);
  const isPercent = slot.desc.includes("%");
  const isDollar = slot.desc.includes("$") || slot.desc.includes("dollar");

  // Extract a short label from desc
  const label = slot.desc
    .replace(/['"]/g, "")
    .replace(/Count-up animé vers\s*/i, "")
    .replace(/\d+[\d,. ]*[%$]?/g, "")
    .trim()
    .slice(0, 60);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(11, 15, 26, 0.92)",
        opacity,
      }}
    >
      <AnimatedStat
        value={value}
        label={label || slot.desc.slice(0, 50)}
        suffix={isPercent ? "%" : isDollar ? "$" : ""}
        decimals={isPercent || value < 1000 ? 2 : 0}
        accentColor={accentColor}
        durationFrames={45}
        size="lg"
      />
    </div>
  );
};

const MultiBadgeSlot: React.FC<{
  slot: VisualSlot;
  assets: AssetSnapshot[];
  accentColor: string;
}> = ({ slot, assets, accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badges = parseMultiBadge(slot.desc, assets);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(245, 240, 232, 0.96)",
        opacity,
        padding: 80,
      }}
    >
      <MultiAssetBadge
        assets={badges}
        title={slot.desc.includes("badges") ? "Récap marché" : undefined}
        accentColor={accentColor}
      />
    </div>
  );
};

const HeatmapSlot: React.FC<{
  slot: VisualSlot;
  assets: AssetSnapshot[];
}> = ({ slot, assets }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Build sector data from assets with sector-like names, or fallback to top movers
  const sectors: SectorData[] = assets.slice(0, 11).map((a) => ({
    name: a.name ?? a.symbol,
    ticker: a.symbol,
    change: a.changePct,
  }));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(11, 15, 26, 0.88)",
        opacity,
        padding: 60,
      }}
    >
      <HeatmapGrid sectors={sectors} title="Secteurs S&P 500" cellDelay={4} />
    </div>
  );
};

const LowerThirdSlot: React.FC<{
  slot: VisualSlot;
  accentColor: string;
}> = ({ slot, accentColor }) => {
  const frame = useCurrentFrame();
  const slideX = interpolate(frame, [0, 18], [-400, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: BRAND.layout.disclaimerH + BRAND.layout.tickerH + 12,
        left: BRAND.layout.safeH,
        right: BRAND.layout.safeH,
        transform: `translateX(${slideX}px)`,
        zIndex: 200,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          backgroundColor: "rgba(11, 15, 26, 0.88)",
          borderLeft: `4px solid ${accentColor}`,
          padding: "10px 20px",
          borderRadius: "0 4px 4px 0",
        }}
      >
        <span
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 14,
            letterSpacing: "0.08em",
            color: "rgba(245, 240, 232, 0.9)",
          }}
        >
          {slot.desc.slice(0, 120)}
        </span>
      </div>
    </div>
  );
};

// ─── Main slot dispatcher ─────────────────────────────────────────────────────

const SlotRenderer: React.FC<{
  slot: VisualSlot;
  assets: AssetSnapshot[];
  section: ScriptSection;
  accentColor: string;
  contentW: number;
  contentH: number;
}> = ({ slot, assets, section, accentColor, contentW, contentH }) => {
  const { source, type } = slot;

  if (source === "MIDJOURNEY" || source === "STOCK") {
    return (
      <PlaceholderSlot
        description={slot.desc}
        source={source}
        asset={slot.asset ?? undefined}
        prompt={slot.prompt}
        mode="full"
      />
    );
  }

  if (source === "REMOTION_CHART") {
    return (
      <ChartSlot
        slot={slot}
        assets={assets}
        section={section}
        accentColor={accentColor}
        contentW={contentW}
        contentH={contentH}
      />
    );
  }

  if (source === "REMOTION_TEXT") {
    if (type === "infographie_chaine") {
      return <CausalChainSlot slot={slot} accentColor={accentColor} />;
    }
    if (type === "infographie_scenario") {
      return <ScenarioForkSlot slot={slot} accentColor={accentColor} />;
    }
    return <TextCardSlot slot={slot} accentColor={accentColor} />;
  }

  if (source === "REMOTION_DATA") {
    if (type === "chiffre_geant_animé" || type === "gauge_animee" || type === "callout_mover" || type === "donnee_animee") {
      return <AnimStatSlot slot={slot} accentColor={accentColor} />;
    }
    if (type === "multi_badge") {
      return <MultiBadgeSlot slot={slot} assets={assets} accentColor={accentColor} />;
    }
    if (type === "heatmap_sectorielle") {
      return <HeatmapSlot slot={slot} assets={assets} />;
    }
    if (type === "lower_third_recap" || type === "teaser_demain" || type === "recap_point") {
      return <LowerThirdSlot slot={slot} accentColor={accentColor} />;
    }
    // Fallback for remaining data types
    return <TextCardSlot slot={slot} accentColor={accentColor} />;
  }

  if (source === "REMOTION_LOWER") {
    return <LowerThirdSlot slot={slot} accentColor={accentColor} />;
  }

  return (
    <PlaceholderSlot description={slot.desc} source={source} mode="full" />
  );
};

// ─── SegmentScene ─────────────────────────────────────────────────────────────

export const SegmentScene: React.FC<SegmentSceneProps> = ({
  section,
  storyboardSlots,
  assets,
  accentColor = BRAND.colors.accentDefault,
  lang = "fr",
  segmentOffsetSec = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const headerH = BRAND.layout.headerH;
  const bottomH = BRAND.layout.disclaimerH + BRAND.layout.tickerH;
  const contentH = height - headerH - bottomH - 32;
  const contentW = width - BRAND.layout.safeH * 2;

  // Depth label
  const depth = section.depth ?? "focus";
  const depthLabels: Record<string, string> = {
    deep: lang === "fr" ? "Analyse" : "Deep Dive",
    focus: "Focus",
    flash: "Flash",
  };
  const depthLabel = depthLabels[depth] ?? "Focus";

  // Primary asset for ticker
  const primaryAsset =
    assets.find((a) => a.symbol === section.assets?.[0]) ??
    assets.find((a) => a.symbol === storyboardSlots[0]?.asset) ??
    assets[0];

  const headerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isUp = primaryAsset ? primaryAsset.changePct >= 0 : true;
  const changeColor = isUp ? BRAND.colors.profit : BRAND.colors.loss;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>

      {/* ── Header (permanent) ── */}
      <div
        style={{
          position: "absolute",
          top: BRAND.layout.safeV,
          left: BRAND.layout.safeH,
          right: BRAND.layout.safeH,
          height: headerH,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          opacity: headerOpacity,
          borderBottom: `1px solid ${BRAND.colors.rule}`,
          paddingBottom: 16,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: accentColor,
                backgroundColor: `${accentColor}18`,
                padding: "3px 10px",
                borderRadius: 3,
                border: `1px solid ${accentColor}40`,
              }}
            >
              {depthLabel}
            </span>
            {primaryAsset && (
              <span
                style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  color: BRAND.colors.inkLight,
                }}
              >
                {primaryAsset.symbol}
              </span>
            )}
          </div>
          <h2
            style={{
              fontFamily: BRAND.fonts.display,
              fontSize: 38,
              fontWeight: 700,
              fontStyle: "italic",
              color: BRAND.colors.ink,
              margin: 0,
              lineHeight: 1.15,
              maxWidth: 950,
            }}
          >
            {section.title}
          </h2>
        </div>

        {primaryAsset && (
          <div
            style={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 40,
                fontWeight: 700,
                color: BRAND.colors.ink,
                letterSpacing: "-0.02em",
              }}
            >
              {primaryAsset.price >= 1000
                ? primaryAsset.price.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : primaryAsset.price.toFixed(2)}
            </div>
            <div
              style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 20,
                fontWeight: 700,
                color: changeColor,
              }}
            >
              {isUp ? "+" : ""}
              {primaryAsset.changePct.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* ── Content area (slot sequences) ── */}
      <div
        style={{
          position: "absolute",
          top: BRAND.layout.safeV + headerH + 16,
          left: BRAND.layout.safeH,
          width: contentW,
          height: contentH,
          overflow: "hidden",
        }}
      >
        {storyboardSlots.map((slot) => {
          const relStartSec = slot.tStart - segmentOffsetSec;
          const durationSec = slot.tEnd - slot.tStart;
          // Skip slots before or outside this segment
          if (relStartSec < -1 || durationSec <= 0) return null;

          const fromFrame = Math.max(0, Math.round(relStartSec * fps));
          const durationFrames = Math.max(1, Math.round(durationSec * fps));

          // z-index by source — charts at back, overlays on top
          const zIndex =
            slot.source === "REMOTION_CHART"
              ? 10
              : slot.source === "REMOTION_LOWER"
              ? 150
              : slot.source === "MIDJOURNEY" || slot.source === "STOCK"
              ? 5
              : 20;

          return (
            <Sequence
              key={slot.slot}
              from={fromFrame}
              durationInFrames={durationFrames}
              layout="none"
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex,
                }}
              >
                <SlotRenderer
                  slot={slot}
                  assets={assets}
                  section={section}
                  accentColor={accentColor}
                  contentW={contentW}
                  contentH={contentH}
                />
              </div>
            </Sequence>
          );
        })}
      </div>

      {/* ── Ticker ── */}
      {primaryAsset && (
        <PermanentTicker
          symbol={primaryAsset.symbol}
          name={primaryAsset.name ?? primaryAsset.symbol}
          price={primaryAsset.price}
          changePct={primaryAsset.changePct}
          accentColor={accentColor}
        />
      )}

      {/* ── Always-on overlays ── */}
      <GrainOverlay />
      <DisclaimerBar lang={lang} />
    </AbsoluteFill>
  );
};
