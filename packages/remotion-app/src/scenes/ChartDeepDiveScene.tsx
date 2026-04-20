import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { AssetSnapshot, ScriptSection } from "@yt-maker/core";
import { BRAND } from "@yt-maker/core";
import { InkChart, type InkLevel } from "./shared/InkChart";
import { GrainOverlay } from "./shared/GrainOverlay";
import { DisclaimerBar } from "./shared/DisclaimerBar";
import { PermanentTicker } from "./shared/PermanentTicker";

interface ChartDeepDiveSceneProps {
  section: ScriptSection;
  asset?: AssetSnapshot;
  accentColor?: string;
  lang?: 'fr' | 'en';
}

export const ChartDeepDiveScene: React.FC<ChartDeepDiveSceneProps> = ({
  section,
  asset,
  accentColor = BRAND.colors.accentDefault,
  lang = 'fr',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Header fade-in
  const headerOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Depth badge
  const depth = section.depth ?? 'focus';
  const depthLabel = ({
    deep: lang === 'fr' ? 'Analyse' : 'Deep Dive',
    focus: lang === 'fr' ? 'Focus' : 'Focus',
    flash: lang === 'fr' ? 'Flash' : 'Flash',
    panorama: lang === 'fr' ? 'Panorama' : 'Panorama',
  } as Record<string, string>)[depth] ?? 'Focus';

  // Changer de couleur d'accent selon hausse/baisse
  const isUp = asset ? asset.changePct >= 0 : true;
  const changeColor = isUp ? BRAND.colors.profit : BRAND.colors.loss;
  const effectiveAccent = accentColor;

  // Extraire les niveaux depuis les visualCues de la section
  const levels: InkLevel[] = (section.visualCues ?? [])
    .filter(vc => vc.type === 'show_level' && vc.value !== undefined)
    .map(vc => ({
      value: vc.value!,
      label: vc.label ?? `${vc.value}`,
      type: vc.direction === 'up' ? 'support' as const : 'resistance' as const,
    }));

  // Candles — on prend dailyCandles si disponible, sinon candles
  const candles = asset?.dailyCandles?.length
    ? asset.dailyCandles.slice(-60)  // 60 derniers jours
    : (asset?.candles?.slice(-60) ?? []);

  const hasChart = candles.length > 1;

  // Zones de layout
  const headerH = BRAND.layout.headerH;
  const bottomH = BRAND.layout.disclaimerH + BRAND.layout.tickerH;
  const chartAreaH = height - headerH - bottomH - 40;
  const chartAreaW = width - BRAND.layout.safeH * 2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream }}>

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: BRAND.layout.safeV,
        left: BRAND.layout.safeH,
        right: BRAND.layout.safeH,
        height: headerH,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        opacity: headerOpacity,
        borderBottom: `1px solid ${BRAND.colors.rule}`,
        paddingBottom: 20,
      }}>

        {/* Gauche : badge depth + titre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Badge depth */}
            <span style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: effectiveAccent,
              backgroundColor: `${effectiveAccent}18`,
              padding: '3px 10px',
              borderRadius: 3,
              border: `1px solid ${effectiveAccent}40`,
            }}>
              {depthLabel}
            </span>
            {/* Asset symbol */}
            {asset && (
              <span style={{
                fontFamily: BRAND.fonts.mono,
                fontSize: 14,
                letterSpacing: '0.12em',
                color: BRAND.colors.inkLight,
              }}>
                {asset.symbol}
              </span>
            )}
          </div>

          <h2 style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 42,
            fontWeight: 700,
            fontStyle: 'italic',
            color: BRAND.colors.ink,
            margin: 0,
            lineHeight: 1.1,
            maxWidth: 900,
          }}>
            {section.title}
          </h2>
        </div>

        {/* Droite : prix + variation */}
        {asset && (
          <div style={{
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 44,
              fontWeight: 700,
              color: BRAND.colors.ink,
              letterSpacing: '-0.02em',
            }}>
              {asset.price >= 1000
                ? asset.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : asset.price.toFixed(2)}
            </div>
            <div style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 22,
              fontWeight: 700,
              color: changeColor,
            }}>
              {isUp ? '+' : ''}{asset.changePct.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Chart InkChart */}
      {hasChart && (
        <div style={{
          position: 'absolute',
          top: BRAND.layout.safeV + headerH + 16,
          left: BRAND.layout.safeH,
        }}>
          <InkChart
            candles={candles}
            levels={levels}
            accentColor={effectiveAccent}
            width={chartAreaW}
            height={chartAreaH}
            drawDuration={BRAND.anim.inkDrawFrames}
          />
        </div>
      )}

      {/* Narration — si FLASH, afficher en bas à gauche */}
      {depth === 'flash' && (
        <div style={{
          position: 'absolute',
          bottom: bottomH + 16,
          left: BRAND.layout.safeH,
          right: BRAND.layout.safeH,
          opacity: interpolate(frame, [20, 35], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }),
        }}>
          <p style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 22,
            fontStyle: 'italic',
            color: BRAND.colors.inkMid,
            margin: 0,
            lineHeight: 1.6,
          }}>
            {section.narration.slice(0, 180)}{section.narration.length > 180 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Ticker + Disclaimer */}
      {asset && (
        <PermanentTicker
          symbol={asset.symbol}
          name={asset.name}
          price={asset.price}
          changePct={asset.changePct}
          accentColor={effectiveAccent}
        />
      )}
      <GrainOverlay />
      <DisclaimerBar lang={lang} />
    </AbsoluteFill>
  );
};
