import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { ScriptSection, Prediction, Language } from "@yt-maker/core";
import { BRAND, fadeIn, staggerDelay, computeLayout } from "@yt-maker/core";
import { AnimatedText } from "./shared/AnimatedText";

interface PredictionsSceneProps {
  section: ScriptSection;
  lang?: Language;
}

export const PredictionsScene: React.FC<PredictionsSceneProps> = ({ section, lang = "fr" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = computeLayout(width, height);

  const predictions: Prediction[] = (section.data as any)?.predictions || [];

  const directionEmoji = (dir: string) => {
    if (dir === "bullish") return "\u25B2";
    if (dir === "bearish") return "\u25BC";
    return "\u25C6";
  };

  const directionColor = (dir: string) => {
    if (dir === "bullish") return BRAND.colors.profit;
    if (dir === "bearish") return BRAND.colors.loss;
    return BRAND.colors.neutral;
  };

  const confidenceLabel = (c: string) => {
    if (lang === "en") {
      if (c === "high") return "HIGH";
      if (c === "medium") return "MEDIUM";
      return "LOW";
    }
    if (c === "high") return "HAUTE";
    if (c === "medium") return "MOYENNE";
    return "FAIBLE";
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.background,
        fontFamily: BRAND.fonts.primary,
        padding: layout.padding.left,
      }}
    >
      <div
        style={{
          fontSize: layout.fontSize.sectionTitle,
          color: BRAND.colors.accentBlue,
          fontWeight: 700,
          opacity: fadeIn(frame, 0, 20),
          marginTop: layout.padding.top,
          marginBottom: 30,
        }}
      >
        {section.title || "Outlook"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {predictions.map((pred, i) => {
          const delay = staggerDelay(i, 15);
          const localFrame = Math.max(0, frame - delay);
          const scaleVal = spring({
            frame: localFrame,
            fps,
            config: { stiffness: 250, damping: 13 },
          });
          const cardOpacity = interpolate(localFrame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                backgroundColor: BRAND.colors.surface,
                borderRadius: BRAND.borderRadius.md,
                padding: 24,
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: cardOpacity,
                transform: `scale(${scaleVal})`,
                border: `1px solid ${BRAND.colors.border}`,
              }}
            >
              <div style={{
                fontSize: 36,
                color: directionColor(pred.direction),
                fontWeight: 700,
              }}>
                {directionEmoji(pred.direction)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: layout.fontSize.body,
                  color: BRAND.colors.text,
                  fontWeight: 700,
                }}>
                  {pred.asset}
                </div>
                <div style={{
                  fontSize: layout.fontSize.small,
                  color: BRAND.colors.textMuted,
                  marginTop: 4,
                }}>
                  {pred.reasoning}
                </div>
              </div>
              <div style={{
                fontSize: layout.fontSize.tiny,
                color: directionColor(pred.direction),
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                {confidenceLabel(pred.confidence)}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: layout.padding.bottom + 20,
          left: layout.padding.left,
          right: layout.padding.right,
        }}
      >
        <AnimatedText
          text={section.narration}
          fontSize={layout.fontSize.narration}
          delay={20}
          color={BRAND.colors.textMuted}
        />
      </div>
    </AbsoluteFill>
  );
};
