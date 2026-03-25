import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface PermanentTickerProps {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  accentColor?: string;
}

/**
 * Bandeau ticker permanent — juste au-dessus du disclaimer.
 * Affiche l'asset courant avec son prix et variation.
 */
export const PermanentTicker: React.FC<PermanentTickerProps> = ({
  symbol,
  name,
  price,
  changePct,
  accentColor = BRAND.colors.accentDefault,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isUp = changePct >= 0;
  const changeColor = isUp ? BRAND.colors.profit : BRAND.colors.loss;
  const sign = isUp ? '+' : '';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: BRAND.layout.disclaimerH,
        left: 0,
        right: 0,
        height: BRAND.layout.tickerH,
        backgroundColor: 'rgba(26, 22, 18, 0.06)',
        borderTop: `1px solid ${BRAND.colors.rule}`,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        paddingLeft: BRAND.layout.safeH,
        paddingRight: BRAND.layout.safeH,
        opacity,
        zIndex: 997,
      }}
    >
      {/* Accent bar gauche */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: accentColor,
      }} />

      <span style={{
        fontFamily: BRAND.fonts.mono,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: BRAND.colors.ink,
      }}>
        {symbol}
      </span>

      <span style={{
        fontFamily: BRAND.fonts.body,
        fontSize: 13,
        color: BRAND.colors.inkLight,
      }}>
        {name}
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'baseline' }}>
        <span style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 15,
          fontWeight: 700,
          color: BRAND.colors.ink,
        }}>
          {price >= 1000
            ? price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : price.toFixed(2)}
        </span>
        <span style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 13,
          fontWeight: 600,
          color: changeColor,
        }}>
          {sign}{(typeof changePct === "number" ? changePct : 0).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};
