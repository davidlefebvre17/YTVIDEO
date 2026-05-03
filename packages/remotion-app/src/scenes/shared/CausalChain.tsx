import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

export interface CausalStep {
  label: string;
  sublabel?: string;
}

export interface CausalChainProps {
  steps: CausalStep[];
  accentColor?: string;
  startFrame?: number;
  stepDelay?: number;
  variant?: 'default' | 'domino';
}

export const CausalChain: React.FC<CausalChainProps> = ({
  steps,
  accentColor = BRAND.colors.accentDefault,
  startFrame = 0,
  stepDelay = 14,
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
      padding: '12px 0',
      maxWidth: 600,
    }}>
      {steps.map((step, i) => {
        const nodeStartFrame = i * stepDelay;
        const nodeSlideX = interpolate(rel, [nodeStartFrame, nodeStartFrame + 12], [-40, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const nodeOpacity = interpolate(rel, [nodeStartFrame, nodeStartFrame + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const lineStartFrame = nodeStartFrame + 6;
        const lineHeight = interpolate(rel, [lineStartFrame, lineStartFrame + 10], [0, 40], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const isLastStep = i === steps.length - 1;
        const lastStepBgOpacity = isLastStep
          ? interpolate(rel, [nodeStartFrame + 2, nodeStartFrame + 8], [0, 0.1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          : 0;

        return (
          <React.Fragment key={i}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transform: `translateX(${nodeSlideX}px)`,
              opacity: nodeOpacity,
              backgroundColor: isLastStep ? accentColor : 'transparent',
              ...(isLastStep ? { opacity: Math.min(nodeOpacity, 1 - lastStepBgOpacity + lastStepBgOpacity) } : {}),
            }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.display,
                  fontSize: 20,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: BRAND.colors.ink,
                  lineHeight: 1.35,
                }}>
                  {step.label}
                </div>
                {step.sublabel && (
                  <div style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 11,
                    color: BRAND.colors.inkLight,
                    letterSpacing: '0.05em',
                  }}>
                    {step.sublabel}
                  </div>
                )}
              </div>
            </div>

            {!isLastStep && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                padding: '4px 0',
                overflow: 'hidden',
              }}>
                <svg width={20} height={Math.max(0, lineHeight + 8)} viewBox="0 0 20 48" style={{
                  flexShrink: 0,
                  overflow: 'visible',
                }}>
                  <line
                    x1={10}
                    y1={0}
                    x2={10}
                    y2={lineHeight}
                    stroke={accentColor}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                  {lineHeight > 30 && (
                    <polygon
                      points="10,32 7,28 13,28"
                      fill={accentColor}
                      opacity={0.7}
                    />
                  )}
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
