import React from "react";
import { BRAND } from "@yt-maker/core";

interface DisclaimerBarProps {
  lang?: 'fr' | 'en';
}

/**
 * Bandeau compliance permanent — bas de toutes les scènes.
 * AMF / MiFID II : contenu strictement éducatif.
 */
export const DisclaimerBar: React.FC<DisclaimerBarProps> = ({ lang = 'fr' }) => {
  const text = lang === 'fr'
    ? 'Contenu strictement éducatif — pas un conseil en investissement — ne pas reproduire sans accord'
    : 'For educational purposes only — not investment advice — do not reproduce without permission';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: BRAND.layout.disclaimerH,
        backgroundColor: 'rgba(26, 22, 18, 0.82)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: BRAND.layout.safeH,
        paddingRight: BRAND.layout.safeH,
        zIndex: 998,
      }}
    >
      <span
        style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 14,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(245, 240, 232, 0.78)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </span>
    </div>
  );
};
