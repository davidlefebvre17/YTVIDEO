/**
 * HeadlineTabloid — variant "tabloïd slam".
 * Titre énorme qui claque depuis le haut avec shake + flash blanc,
 * puis sous-titre coloré + détail.
 */
import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { HeadlineCardProps } from "../HeadlineCard";

const easeOut = Easing.out(Easing.cubic);
const easeOutBack = Easing.out(Easing.back(1.7));

export const HeadlineTabloid: React.FC<HeadlineCardProps> = ({
  title,
  source,
  accentColor = BRAND.colors.accentBear,
}) => {
  const frame = useCurrentFrame();

  // Split title sur ":" ou " — " pour avoir line1 / line2 visuelles
  const splitMatch = title.match(/^([^:—]+)(?:\s*[:—]\s*)(.+)$/);
  const line1 = splitMatch ? splitMatch[1].trim() : title.split(" ").slice(0, Math.max(1, Math.floor(title.split(" ").length / 2))).join(" ");
  const line2 = splitMatch ? splitMatch[2].trim() : title.split(" ").slice(Math.max(1, Math.floor(title.split(" ").length / 2))).join(" ");

  // Taille adaptative : titres courts → grand impact ; titres longs → réduit pour rester centré
  const maxLineLen = Math.max(line1.length, line2?.length ?? 0);
  const slamFontSize = maxLineLen <= 12 ? 220
    : maxLineLen <= 20 ? 140
    : maxLineLen <= 30 ? 96
    : 72;
  const slamMarginLeft = slamFontSize > 140 ? 60 : 0;

  const slamY = interpolate(frame, [0, 14], [-200, 0], {
    easing: easeOutBack, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const slamOp = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const shakeAmp = interpolate(frame, [14, 30], [4, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const shake = Math.sin(frame * 0.5) * shakeAmp;
  const flashOp = interpolate(frame, [12, 22], [0.55, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [22, 42], [40, 0], {
    easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const subOp = interpolate(frame, [22, 42], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const kickerOp = interpolate(frame, [50, 64], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "relative", width: 1500, minHeight: 700,
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "0 60px",
    }}>
      <div style={{
        position: "absolute", inset: 0, background: BRAND.colors.cream,
        opacity: flashOp, pointerEvents: "none",
      }} />

      {source && (
        <div style={{
          position: "absolute", top: 40, left: 60,
          display: "flex", alignItems: "center", gap: 18,
          opacity: kickerOp,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            background: accentColor,
          }} />
          <span style={{
            fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: "0.32em",
            color: accentColor, textTransform: "uppercase",
          }}>
            En direct · {source}
          </span>
        </div>
      )}

      <div style={{
        transform: `translate(${shake}px, ${slamY}px)`,
        opacity: slamOp,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: BRAND.fonts.condensed,
          fontSize: slamFontSize, lineHeight: 0.95,
          color: BRAND.colors.ink,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
        }}>
          {line1}
        </div>
        {line2 && (
          <div style={{
            fontFamily: BRAND.fonts.condensed,
            fontSize: slamFontSize, lineHeight: 0.95,
            color: accentColor,
            letterSpacing: "-0.02em",
            marginLeft: slamMarginLeft,
            textTransform: "uppercase",
          }}>
            {line2}{line2.endsWith(".") ? "" : "."}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 30,
        transform: `translateY(${subY}px)`, opacity: subOp,
        display: "flex", alignItems: "center", gap: 24,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: "italic",
          fontSize: 36, color: BRAND.colors.inkMid, lineHeight: 1.2, maxWidth: 900,
        }}>
          {line2 ? "" : line1}
        </span>
      </div>
    </div>
  );
};
