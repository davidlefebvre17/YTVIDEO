import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface ScenarioForkProps {
  trunk: string;
  bullish: { condition: string; target: string; prob?: number };
  bearish: { condition: string; target: string; prob?: number };
  startFrame?: number;
  accentColor?: string;
}

/**
 * Bifurcation scénario haussier / baissier.
 * Le trunk apparaît, puis les deux branches s'ouvrent.
 */
export const ScenarioFork: React.FC<ScenarioForkProps> = ({
  trunk,
  bullish,
  bearish,
  startFrame = 0,
  accentColor = BRAND.colors.accentDefault,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  const trunkOpacity = interpolate(rel, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const branchOpacity = interpolate(rel, [18, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const branchY = interpolate(rel, [18, 32], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>

      {/* Trunk */}
      <div style={{
        opacity: trunkOpacity,
        padding: '14px 32px',
        backgroundColor: BRAND.colors.creamDark,
        border: `1px solid ${BRAND.colors.rule}`,
        borderRadius: BRAND.borderRadius.sm,
        fontFamily: BRAND.fonts.body,
        fontSize: 20,
        fontStyle: 'italic',
        color: BRAND.colors.inkMid,
        textAlign: 'center',
        maxWidth: 600,
      }}>
        {trunk}
      </div>

      {/* Connecteur */}
      <div style={{ width: 2, height: 28, backgroundColor: BRAND.colors.rule, opacity: trunkOpacity }} />

      {/* Branches */}
      <div style={{
        display: 'flex',
        gap: 40,
        opacity: branchOpacity,
        transform: `translateY(${branchY}px)`,
        width: '100%',
        maxWidth: 900,
      }}>
        {/* Bullish */}
        <div style={{
          flex: 1,
          padding: '16px 20px',
          backgroundColor: `${BRAND.colors.accentBull}10`,
          border: `2px solid ${BRAND.colors.accentBull}`,
          borderRadius: BRAND.borderRadius.sm,
        }}>
          <div style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: BRAND.colors.accentBull,
            marginBottom: 8,
          }}>
            ▲ Haussier {bullish.prob ? `· ${bullish.prob}%` : ''}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 16,
            color: BRAND.colors.inkMid,
            marginBottom: 10,
            lineHeight: 1.5,
          }}>
            {bullish.condition}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 20,
            fontWeight: 700,
            color: BRAND.colors.accentBull,
          }}>
            {bullish.target}
          </div>
        </div>

        {/* Bearish */}
        <div style={{
          flex: 1,
          padding: '16px 20px',
          backgroundColor: `${BRAND.colors.accentBear}10`,
          border: `2px solid ${BRAND.colors.accentBear}`,
          borderRadius: BRAND.borderRadius.sm,
        }}>
          <div style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: BRAND.colors.accentBear,
            marginBottom: 8,
          }}>
            ▼ Baissier {bearish.prob ? `· ${bearish.prob}%` : ''}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.body,
            fontSize: 16,
            color: BRAND.colors.inkMid,
            marginBottom: 10,
            lineHeight: 1.5,
          }}>
            {bearish.condition}
          </div>
          <div style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 20,
            fontWeight: 700,
            color: BRAND.colors.accentBear,
          }}>
            {bearish.target}
          </div>
        </div>
      </div>
    </div>
  );
};
