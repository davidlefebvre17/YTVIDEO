import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND } from "@yt-maker/core";

interface FrontPageProps {
  title: string;
  date: string;
  segments: Array<{ title: string; depth?: string }>;
  heroImageSrc?: string;
  threadSummary: string;
}

export const FrontPage: React.FC<FrontPageProps> = ({
  title,
  date,
  segments,
  heroImageSrc,
  threadSummary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Total: 210 frames (7s)
  // Title types in: ~0.5s (15 frames for ~30 chars @ 2 chars/frame)
  // Headlines stagger: 200ms each = 6 frames each
  // Hero fades in after title: at frame ~20, over 10 frames
  const titleTypingFrames = 15;
  const titleCompleteFrame = titleTypingFrames;
  const heroFadeInStart = titleCompleteFrame;
  const heroFadeInDuration = 10;

  // Type title: 2 chars per frame
  const charsToShow = Math.min(
    title.length,
    Math.round((frame / titleTypingFrames) * title.length)
  );
  const displayTitle = title.slice(0, charsToShow);

  // Headlines slide in with stagger: 6 frames per headline @ 200ms
  const headlineSlideFrames = 6;
  const headlineStaggerStart = titleCompleteFrame + 5;

  const headlineOpacities = segments.map((_, idx) => {
    const startFrame = headlineStaggerStart + idx * headlineSlideFrames;
    return interpolate(
      frame,
      [startFrame, startFrame + headlineSlideFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  });

  const headlineTranslates = segments.map((_, idx) => {
    const startFrame = headlineStaggerStart + idx * headlineSlideFrames;
    return interpolate(
      frame,
      [startFrame, startFrame + headlineSlideFrames],
      [40, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  });

  // Hero image fade in
  const heroFadeIn = interpolate(
    frame,
    [heroFadeInStart, heroFadeInStart + heroFadeInDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fade out entire page in last 15 frames
  const pageOpacity = interpolate(
    frame,
    [210 - 15, 210],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Masthead fade in
  const mastheadOpacity = interpolate(
    frame,
    [0, 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.cream, opacity: pageOpacity }}>
      {/* ─── Masthead: OWL STREET JOURNAL ─── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 14,
          paddingBottom: 8,
          borderBottom: `2px solid ${BRAND.colors.ink}`,
          opacity: mastheadOpacity,
        }}
      >
        {/* Top rule */}
        <div
          style={{
            width: "calc(100% - 80px)",
            height: 1,
            backgroundColor: BRAND.colors.rule,
            marginBottom: 10,
          }}
        />
        {/* Main title */}
        <h1
          style={{
            fontFamily: BRAND.fonts.display,
            fontSize: 72,
            fontWeight: 900,
            color: BRAND.colors.ink,
            margin: 0,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          Owl Street Journal
        </h1>
        {/* Date + edition line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "calc(100% - 80px)",
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BRAND.colors.inkLight,
            }}
          >
            Recap Quotidien
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.body,
              fontSize: 13,
              color: BRAND.colors.inkLight,
            }}
          >
            {date}
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BRAND.colors.inkLight,
            }}
          >
            TradingRecap
          </span>
        </div>
        {/* Bottom double rule */}
        <div
          style={{
            width: "calc(100% - 80px)",
            marginTop: 6,
            borderTop: `1px solid ${BRAND.colors.rule}`,
            height: 3,
            borderBottom: `1px solid ${BRAND.colors.rule}`,
          }}
        />
      </div>

      {/* Main content area */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          padding: "16px 40px",
          gap: 32,
        }}
      >
        {/* Left side: headline + hero image */}
        <div
          style={{
            flex: "0 0 60%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Main headline (typewriter) */}
          <h1
            style={{
              fontFamily: BRAND.fonts.display,
              fontSize: 42,
              fontWeight: 700,
              color: BRAND.colors.ink,
              margin: 0,
              lineHeight: 1.3,
              minHeight: 120,
            }}
          >
            {displayTitle}
            {charsToShow < title.length ? <span style={{ opacity: 0.5 }}>│</span> : ""}
          </h1>

          {/* Thread summary (chapeau) */}
          <p
            style={{
              fontFamily: BRAND.fonts.body,
              fontSize: 16,
              fontStyle: "italic",
              color: BRAND.colors.inkMid,
              margin: "8px 0 16px 0",
              lineHeight: 1.6,
              maxWidth: 600,
            }}
          >
            {threadSummary}
          </p>

          {/* Horizontal rule */}
          <div
            style={{
              height: 1,
              backgroundColor: BRAND.colors.rule,
              margin: "8px 0",
            }}
          />

          {/* Hero image with cream border */}
          {heroImageSrc && (
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 300,
                backgroundColor: BRAND.colors.creamDark,
                border: `8px solid ${BRAND.colors.cream}`,
                boxShadow: `0 4px 12px rgba(26,22,18,0.08)`,
                overflow: "hidden",
                opacity: heroFadeIn,
              }}
            >
              <img
                src={heroImageSrc}
                alt="Episode hero"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
        </div>

        {/* Right sidebar: segment headlines */}
        <div
          style={{
            flex: "0 0 40%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 4,
          }}
        >
          {segments.map((segment, idx) => (
            <div
              key={idx}
              style={{
                opacity: headlineOpacities[idx],
                transform: `translateX(${headlineTranslates[idx]}px)`,
              }}
            >
              <h3
                style={{
                  fontFamily: BRAND.fonts.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: BRAND.colors.ink,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {segment.title}
              </h3>
              {segment.depth && (
                <span
                  style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 11,
                    color: BRAND.colors.inkLight,
                    marginTop: 2,
                    display: "block",
                  }}
                >
                  {segment.depth}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer rule */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: BRAND.colors.rule,
        }}
      />
    </AbsoluteFill>
  );
};
