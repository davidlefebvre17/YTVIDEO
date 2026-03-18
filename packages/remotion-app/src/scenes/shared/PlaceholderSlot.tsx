import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface PlaceholderSlotProps {
  description: string;
  source?: 'COMFYUI' | 'STOCK' | 'MIDJOURNEY' | string;
  asset?: string;
  prompt?: string;
  /** Taille du placeholder : 'full' = plein écran, 'card' = carte dans une scène */
  mode?: 'full' | 'card';
  width?: number;
  height?: number;
}

/**
 * Placeholder élégant pour les visuels IA/stock non encore générés.
 * S'intègre dans le style cream/ink sans briser le rendu.
 */
export const PlaceholderSlot: React.FC<PlaceholderSlotProps> = ({
  description,
  source = 'STOCK',
  asset,
  mode = 'full',
  width = 1920,
  height = 1080,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sourceLabels: Record<string, string> = {
    COMFYUI: 'Image encre — en production',
    MIDJOURNEY: 'Visuel conceptuel — en production',
    STOCK: 'Photo stock — à sourcer',
    REMOTION: 'Composant Remotion',
  };

  const sourceLabel = sourceLabels[source] ?? source;

  const w = mode === 'full' ? width : '100%';
  const h = mode === 'full' ? height : '100%';

  return (
    <div
      style={{
        width: w,
        height: h,
        backgroundColor: BRAND.colors.creamDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity,
        position: mode === 'full' ? 'absolute' : 'relative',
        inset: mode === 'full' ? 0 : undefined,
        border: `1px dashed ${BRAND.colors.rule}`,
      }}
    >
      {/* Icône source */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: BRAND.colors.cream,
          border: `1.5px solid ${BRAND.colors.rule}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        {source === 'COMFYUI' || source === 'MIDJOURNEY' ? '🎨' : '📷'}
      </div>

      {/* Label source */}
      <div
        style={{
          fontFamily: BRAND.fonts.mono,
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: BRAND.colors.inkFaint,
        }}
      >
        {sourceLabel}
      </div>

      {/* Description */}
      <div
        style={{
          fontFamily: BRAND.fonts.body,
          fontSize: mode === 'full' ? 22 : 14,
          fontStyle: 'italic',
          color: BRAND.colors.inkLight,
          textAlign: 'center',
          maxWidth: mode === 'full' ? 700 : '80%',
          lineHeight: 1.5,
          padding: '0 40px',
        }}
      >
        {description}
      </div>

      {/* Asset badge si applicable */}
      {asset && (
        <div
          style={{
            fontFamily: BRAND.fonts.mono,
            fontSize: 12,
            color: BRAND.colors.accentWarning,
            letterSpacing: '0.1em',
          }}
        >
          {asset}
        </div>
      )}

      {/* Ligne décorative */}
      <div
        style={{
          width: 48,
          height: 1,
          backgroundColor: BRAND.colors.rule,
          marginTop: 4,
        }}
      />
    </div>
  );
};
