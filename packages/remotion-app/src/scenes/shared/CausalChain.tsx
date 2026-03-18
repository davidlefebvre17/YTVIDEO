import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface CausalStep {
  label: string;
  sublabel?: string;
}

interface CausalChainProps {
  steps: CausalStep[];
  accentColor?: string;
  startFrame?: number;
  /** Frames entre chaque apparition de nœud */
  stepDelay?: number;
}

/**
 * Chaîne causale animée — nœuds qui s'enchaînent avec flèches.
 * Ex: "Iran → Ormuz → Offre → Prix → Fed"
 */
export const CausalChain: React.FC<CausalChainProps> = ({
  steps,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
  stepDelay = 18,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      flexWrap: 'nowrap',
      padding: '24px 0',
    }}>
      {steps.map((step, i) => {
        const nodeStartFrame = i * stepDelay;
        const nodeOpacity = interpolate(rel, [nodeStartFrame, nodeStartFrame + 10], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const nodeScale = interpolate(rel, [nodeStartFrame, nodeStartFrame + 12], [0.6, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        // Flèche après chaque nœud sauf le dernier
        const arrowStartFrame = nodeStartFrame + 8;
        const arrowWidth = interpolate(rel, [arrowStartFrame, arrowStartFrame + 14], [0, 48], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        return (
          <React.Fragment key={i}>
            {/* Nœud */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              opacity: nodeOpacity,
              transform: `scale(${nodeScale})`,
              transformOrigin: 'center',
            }}>
              <div style={{
                padding: '12px 20px',
                backgroundColor: BRAND.colors.creamDark,
                border: `2px solid ${accentColor}`,
                borderRadius: BRAND.borderRadius.sm,
                fontFamily: BRAND.fonts.display,
                fontSize: 18,
                fontWeight: 700,
                color: BRAND.colors.ink,
                whiteSpace: 'nowrap',
                boxShadow: `0 2px 8px ${accentColor}20`,
              }}>
                {step.label}
              </div>
              {step.sublabel && (
                <div style={{
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 10,
                  color: BRAND.colors.inkLight,
                  letterSpacing: '0.08em',
                }}>
                  {step.sublabel}
                </div>
              )}
            </div>

            {/* Flèche */}
            {i < steps.length - 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                width: arrowWidth,
                flexShrink: 0,
              }}>
                <svg width={48} height={20} viewBox="0 0 48 20" style={{ flexShrink: 0 }}>
                  <line
                    x1={2} y1={10} x2={38} y2={10}
                    stroke={accentColor}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                  <polygon
                    points="38,6 46,10 38,14"
                    fill={accentColor}
                    opacity={0.7}
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
