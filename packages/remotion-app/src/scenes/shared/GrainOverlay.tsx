import React from "react";
import { BRAND } from "@yt-maker/core";

/**
 * Texture grain papier — présente dans TOUTES les scènes.
 * Simule le grain d'un journal de qualité sur fond crème.
 */
export const GrainOverlay: React.FC<{ opacity?: number }> = ({
  opacity = BRAND.layout.grainOpacity,
}) => {
  const svgNoise = `
    <svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
      <filter id='grain'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#grain)' opacity='0.4'/>
    </svg>
  `.trim();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svgNoise)}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        pointerEvents: 'none',
        zIndex: 1000,
        opacity,
        mixBlendMode: 'multiply',
      }}
    />
  );
};
