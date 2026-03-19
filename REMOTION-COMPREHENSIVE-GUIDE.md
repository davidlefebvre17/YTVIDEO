# Remotion 4.0.425 — Comprehensive Guidance for 100-Image Trading Video Generator

This is a complete reference for building video compositions with ~100 AI-generated images per episode, combining transitions, animations, overlays, and dynamic data visualization.

---

## 1. @remotion/transitions — All Transition Types & TimingFunctions

### Available Transition Presentations

| Presentation | Effect | Use Case |
|---|---|---|
| `fade()` | Fade opacity of scenes | Smooth blend between images |
| `slide()` | Slide in/push out previous | Default, most common |
| `wipe()` | Slide over previous scene | Directional reveal |
| `flip()` | Rotate previous scene away | Dramatic direction change |
| `clockWipe()` | Circular reveal from center | Circular/spiral effects |
| `iris()` | Circular mask from center | Focused zoom effect |

### API: TransitionSeries Component

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { fade, slide, wipe } from '@remotion/transitions';
import { springTiming, linearTiming } from '@remotion/transitions';

// Complete TransitionSeries structure
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={40}>
    {/* Scene 1 content */}
  </TransitionSeries.Sequence>

  <TransitionSeries.Transition
    timing={springTiming({
      durationInFrames: 30,
      delay: 0,
      mass: 1,
      damping: 10,
      stiffness: 100,
    })}
    presentation={slide({
      direction: 'from-right', // from-left, from-right, from-top, from-bottom
    })}
  />

  <TransitionSeries.Sequence durationInFrames={60}>
    {/* Scene 2 content */}
  </TransitionSeries.Sequence>

  <TransitionSeries.Overlay durationInFrames={20} offset={-10}>
    {/* Light leak or flash effect */}
  </TransitionSeries.Overlay>
</TransitionSeries>
```

### Timing Functions

#### springTiming()
```tsx
springTiming({
  durationInFrames: 30,        // Total duration
  delay: 0,                     // Start delay
  mass: 1,                      // Affects speed (default: 1)
  damping: 10,                  // Removes bounce (increase to remove)
  stiffness: 100,               // Bounciness coefficient
  overshootClamping: false,     // Prevent overshooting target
});
```

#### linearTiming()
```tsx
linearTiming({
  durationInFrames: 30,
  easing: Easing.ease,          // Optional easing function
  delay: 0,
});
```

### Critical Rules

1. Transitions **reduce total duration** — they overlap scenes:
   - Seq1 (40fr) + Transition (30fr) + Seq2 (60fr) = **70 total** (not 130)

2. Overlays **maintain duration** — they don't overlap:
   - Seq1 (40fr) + Overlay (20fr) + Seq2 (60fr) = **120 total**

3. Constraints:
   - Transition duration ≤ min(adjSeq1, adjSeq2)
   - Transitions/overlays cannot be adjacent
   - At least one sequence before/after any transition

### useTransitionProgress Hook

For custom transitions, get animation progress inside sequence:

```tsx
import { useTransitionProgress } from '@remotion/transitions';

const MySceneWithProgress = () => {
  const progress = useTransitionProgress(); // 0 → 1 during transition

  return (
    <div style={{
      opacity: progress, // Fade in during transition
      scale: 0.9 + (progress * 0.1),
    }}>
      Content
    </div>
  );
};
```

---

## 2. staticFile() & <Img> — Loading 100+ Background Images

### Directory Structure
```
your-project/
├── package.json
├── public/
│   ├── backgrounds/
│   │   ├── beat-001.png
│   │   ├── beat-002.png
│   │   ├── beat-003.png
│   │   └── ... (up to 100+)
│   └── overlays/
│       ├── chart-001.svg
│       └── ...
└── src/
    └── Root.tsx
```

### Basic Image Loading

```tsx
import { Img, staticFile } from 'remotion';

// Single image
const ImageComponent = () => {
  return (
    <Img
      src={staticFile('/backgrounds/beat-001.png')}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};
```

### Batch Loading 100+ Images with Series

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { Img, staticFile } from 'remotion';
import { springTiming, slide } from '@remotion/transitions';

interface Beat {
  frameNumber: number;
  imagePath: string; // e.g., `/backgrounds/beat-001.png`
  duration: number;  // frames
  durationMs: number; // for logging
}

const HundredImageComposition = ({ beats }: { beats: Beat[] }) => {
  return (
    <TransitionSeries>
      {beats.map((beat, i) => (
        <div key={beat.frameNumber}>
          <TransitionSeries.Sequence durationInFrames={beat.duration}>
            <Img
              src={staticFile(beat.imagePath)}
              style={{
                width: '1920px',
                height: '1080px',
                objectFit: 'cover',
              }}
              // Retry failed loads
              maxRetries={2}
              delayRenderTimeoutInMilliseconds={10000}
            />
          </TransitionSeries.Sequence>

          {i < beats.length - 1 && (
            <TransitionSeries.Transition
              timing={springTiming({
                durationInFrames: 20,
                damping: 15, // Faster, less bouncy
              })}
              presentation={slide({ direction: 'from-right' })}
            />
          )}
        </div>
      ))}
    </TransitionSeries>
  );
};
```

### staticFile() Specifics

```tsx
// Function signature
staticFile(pathRelativeToPublic: string): string

// Examples
staticFile('/backgrounds/beat-001.png')  // ✓ correct
staticFile('backgrounds/beat-001.png')   // ✗ missing leading /
staticFile('/beat#1.png')                // ✓ auto-encodes as /beat%231.png

// Returns a URL-safe string safe for subdirectory deployments
// e.g., if deployed to https://example.com/my-app/, paths still resolve correctly
```

### <Img> Best Practices for Many Images

```tsx
import { Img, staticFile, useCurrentFrame } from 'remotion';

// 1. Lazy indexing — avoid loading all at render time
const LazyImageLoader = ({ beatIndex, total }: { beatIndex: number; total: number }) => {
  // Only load image for this specific beat
  const imagePath = `/backgrounds/beat-${String(beatIndex).padStart(3, '0')}.png`;

  return (
    <Img
      src={staticFile(imagePath)}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// 2. Image preloading (optional, for Studio/Player smoothness)
import { preloadImage } from '@remotion/preload';

useEffect(() => {
  // Preload next 3 images
  for (let i = currentBeat; i < currentBeat + 3; i++) {
    const path = `/backgrounds/beat-${String(i).padStart(3, '0')}.png`;
    preloadImage(staticFile(path));
  }
}, [currentBeat]);

// 3. Error fallback
const ImageWithFallback = ({ beatIndex }: { beatIndex: number }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div style={{ background: '#1a1a1a' }}>Image failed</div>;
  }

  return (
    <Img
      src={staticFile(`/backgrounds/beat-${String(beatIndex).padStart(3, '0')}.png`)}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
```

### Image Size Limits
- Max pixel dimensions: **2^29 (~539 megapixels)**
- For 1920×1080: safely use up to 262,000+ images
- For your 100 images: negligible concern

---

## 3. spring() — Physics-Based Animations

### Core API

```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const MySpringAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Basic spring from 0 to 100
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 10,        // default: 10 (increase to remove bounce)
      stiffness: 100,     // default: 100 (higher = faster/bouncier)
      mass: 1,            // default: 1 (affects speed)
      overshootClamping: false, // default: false (prevent overshooting)
    },
    from: 0,
    to: 100,
    delay: 0,
    durationInFrames: undefined, // undefined = natural spring duration
    reverse: false,
  });

  return <div style={{ scale: scale / 100 }}>Bouncy element</div>;
};
```

### Config Presets

```tsx
// No bounce — immediate settle
spring({
  fps,
  frame,
  config: { damping: 1000, stiffness: 100, mass: 1 },
  from: 0,
  to: 1,
})

// Default bounce — natural feel
spring({
  fps,
  frame,
  config: { damping: 10, stiffness: 100, mass: 1 },
  from: 0,
  to: 1,
})

// Elastic/springy — dramatic overshoot
spring({
  fps,
  frame,
  config: { damping: 3, stiffness: 100, mass: 0.5 },
  from: 0,
  to: 1,
})

// Fast and tight
spring({
  fps,
  frame,
  config: { damping: 15, stiffness: 200, mass: 1 },
  from: 0,
  to: 1,
})
```

### Chaining Springs

```tsx
// Scale up, then rotate
const MyChainedAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps, frame,
    from: 1, to: 1.2,
    config: { damping: 8, stiffness: 150 },
  });

  const rotation = spring({
    fps, frame,
    from: 0, to: 360,
    config: { damping: 12, stiffness: 100 },
    delay: 15, // Start after scale
  });

  return (
    <div style={{
      transform: `scale(${scale}) rotate(${rotation}deg)`,
    }}>
      Chained animation
    </div>
  );
};
```

### With durationInFrames — Fixed Timing

```tsx
// Stretch spring to exactly 30 frames, regardless of physics
const fixedDurationSpring = spring({
  fps: 30,
  frame,
  config: { damping: 10, stiffness: 100, mass: 1 },
  from: 0,
  to: 1,
  durationInFrames: 30, // Force exactly 30 frames
});
```

---

## 4. interpolate() — Value Mapping with Easing

### Core API

```tsx
import { interpolate, Easing, useCurrentFrame } from 'remotion';

const MyInterpolation = () => {
  const frame = useCurrentFrame();

  // Map frame 0-30 to opacity 0-1
  const opacity = interpolate(
    frame,           // input value
    [0, 30],         // input range
    [0, 1],          // output range
    {
      easing: Easing.ease,
      extrapolateLeft: 'clamp',   // prevent output < 0
      extrapolateRight: 'clamp',  // prevent output > 1
    }
  );

  return <div style={{ opacity }}>Fading in</div>;
};
```

### All Extrapolation Modes

| Mode | Behavior |
|---|---|
| `'extend'` | Continue interpolating beyond bounds |
| `'clamp'` | Cap at range edges |
| `'wrap'` | Loop the value |
| `'identity'` | Return input unchanged |

```tsx
// Frame 0-20 maps to 0-100
// extrapolateRight: 'extend' → frame 40 gives 200
// extrapolateRight: 'clamp' → frame 40 gives 100
// extrapolateRight: 'wrap' → frame 40 gives 0 (loops)

interpolate(frame, [0, 20], [0, 100], {
  extrapolateRight: 'extend',
})
```

### All Easing Functions

```tsx
import { Easing } from 'remotion';

// Basic
Easing.linear              // 1:1 correspondence
Easing.ease                // Slow start/end, fast middle
Easing.easeIn              // Slow start
Easing.easeOut             // Slow end
Easing.easeInOut           // Slow start & end

// Polynomial
Easing.quad                // t²
Easing.cubic               // t³
Easing.poly(3)             // t³ (custom power)

// Bounce & elastic
Easing.bounce              // Bouncing effect
Easing.elastic(bounciness) // Spring-like oscillation
Easing.back                // Overshoot effect

// Math functions
Easing.bezier(x1, y1, x2, y2)  // CSS cubic-bezier equivalent
Easing.circle              // Circular ease
Easing.sin                 // Sine wave
Easing.exp                 // Exponential

// Modifiers — apply to ANY easing
Easing.in(Easing.quad)     // Start slow
Easing.out(Easing.quad)    // End slow
Easing.inOut(Easing.quad)  // Both slow (symmetric)

// Examples
Easing.inOut(Easing.quad)
Easing.out(Easing.bounce)
Easing.in(Easing.elastic(2))
```

### Multi-Step Interpolation

```tsx
// Map to multiple ranges
const complexValue = interpolate(
  frame,
  [0, 10, 20, 30],           // input checkpoints
  [0, 50, 80, 100],          // output checkpoints
  { easing: Easing.easeInOut }
);

// frame 0 → 0
// frame 10 → 50
// frame 20 → 80
// frame 30 → 100
// Interpolates between checkpoints automatically
```

### Color Interpolation

```tsx
import { interpolateColors } from 'remotion';

const colorValue = interpolateColors(
  frame,                      // input
  [0, 30],                    // input range
  ['#00b4d8', '#ffd60a'],     // color range (any format: hex, rgb, rgba, hsl, color names)
);
// Returns: 'rgba(R, G, B, A)' string

// Supported formats:
// Hex: '#ff0000'
// RGB: 'rgb(255, 0, 0)'
// RGBA: 'rgba(255, 0, 0, 1)'
// HSL: 'hsl(0, 100%, 50%)'
// CSS names: 'red', 'yellow', 'blue'
```

---

## 5. <Series> & <Sequence> — Layout & Timing

### <Sequence> — Single Time Block

```tsx
import { Sequence } from 'remotion';

// Display content from frame 30 to 90
<Sequence from={30} durationInFrames={60} name="my-scene">
  <MyComponent />
</Sequence>

// Core props:
// from: number (default: 0) — start frame
// durationInFrames: number (default: Infinity) — how long to display
// layout: 'absolute-fill' | 'none' (default: 'absolute-fill')
// name: string — label in Studio timeline
// showInTimeline: boolean (default: true)
```

### <Series> — Multiple Sequential Sequences

```tsx
import { Series } from 'remotion';
import { TransitionSeries } from '@remotion/transitions';

// Play multiple sequences one after another
<Series>
  <Series.Sequence durationInFrames={40}>
    {/* Scene 1 — frames 0-40 */}
  </Series.Sequence>

  <Series.Sequence durationInFrames={60}>
    {/* Scene 2 — frames 40-100 */}
  </Series.Sequence>

  <Series.Sequence durationInFrames={30}>
    {/* Scene 3 — frames 100-130 */}
  </Series.Sequence>
</Series>

// Core props for Series.Sequence:
// durationInFrames: number (required, except last can be Infinity)
// offset: number (default: 0) — delays this and subsequent sequences
// layout: 'absolute-fill' | 'none'
// name, style, className, ref, etc.
```

### Offset — Creating Gaps

```tsx
<Series>
  <Series.Sequence durationInFrames={40}>
    Scene 1 (0-40)
  </Series.Sequence>

  <Series.Sequence durationInFrames={60} offset={20}>
    {/* 20-frame gap, then 60-frame scene */}
    {/* Timeline: 0-40 (Seq1), 40-60 (gap), 60-120 (Seq2) */}
    Scene 2
  </Series.Sequence>
</Series>
```

### Layout Options

```tsx
// layout='absolute-fill' (default)
// All sequences stack on top of each other
// Later sequences appear on top (z-index stacking)
<Series>
  <Series.Sequence durationInFrames={30} layout="absolute-fill">
    {/* Absolutely positioned, full frame */}
  </Series.Sequence>
</Series>

// layout='none'
// You handle positioning yourself
<Series>
  <Series.Sequence durationInFrames={30} layout="none" style={{ position: 'relative' }}>
    {/* You control where it appears */}
  </Series.Sequence>
</Series>
```

---

## 6. <AbsoluteFill> — Stacking & Positioning

### Core API

```tsx
import { AbsoluteFill } from 'remotion';

<AbsoluteFill>
  {/* Fills entire frame, absolutely positioned */}
</AbsoluteFill>

// Equivalent to:
<div style={{
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}}>
  {/* Children */}
</div>
```

### Stacking Multiple Layers

```tsx
import { AbsoluteFill, Sequence } from 'remotion';

const LayeredScene = () => {
  return (
    <>
      {/* Background image */}
      <AbsoluteFill>
        <Img src={staticFile('/bg.png')} style={{ width: '100%', height: '100%' }} />
      </AbsoluteFill>

      {/* Chart overlay (appears on top) */}
      <AbsoluteFill>
        <InkChart data={chartData} />
      </AbsoluteFill>

      {/* Text overlay (appears on top of chart) */}
      <AbsoluteFill>
        <Text>Market Analysis</Text>
      </AbsoluteFill>

      {/* Disclaimer bar (topmost) */}
      <AbsoluteFill>
        <DisclaimerBar />
      </AbsoluteFill>
    </>
  );
};

// Stacking order: defined by DOM order (later = higher z-index)
// Background → Chart → Text → Disclaimer
```

### Style Props

```tsx
<AbsoluteFill
  style={{
    background: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
    pointerEvents: 'none',              // Click through
  }}
  className="my-overlay"  // Tailwind classes (conflicting ones auto-detect)
>
  Content
</AbsoluteFill>

// v4.0.249+: Tailwind conflicts auto-resolved
// Inline styles take precedence over className
```

---

## 7. delayRender() / continueRender() — Async Image Loading

### Pattern for Pre-Rendering Image Validation

```tsx
import { delayRender, continueRender, useCallback } from 'remotion';

const AsyncImageLoader = ({ imagePath }: { imagePath: string }) => {
  const [loaded, setLoaded] = useState(false);

  const handle = useRef<ReturnType<typeof delayRender> | null>(null);

  useEffect(() => {
    // Pause rendering until image loads
    handle.current = delayRender();

    const img = new Image();
    img.onload = () => {
      setLoaded(true);
      if (handle.current) continueRender(handle.current);
    };
    img.onerror = () => {
      console.error(`Failed to load: ${imagePath}`);
      if (handle.current) continueRender(handle.current);
    };
    img.src = imagePath;
  }, [imagePath]);

  if (!loaded) return <div>Loading...</div>;

  return <Img src={imagePath} />;
};
```

### Using useDelayRender() Hook (Preferred)

```tsx
import { useDelayRender } from 'remotion';

const SmartImageLoader = ({ imagePath }: { imagePath: string }) => {
  const { continueRender } = useDelayRender();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(imagePath)
      .then(r => r.blob())
      .then(() => {
        setReady(true);
        continueRender(); // Unpause rendering
      })
      .catch(() => continueRender()); // Even on error, continue
  }, [imagePath, continueRender]);

  return ready ? <Img src={imagePath} /> : null;
};
```

### Key Points

- **Default timeout: 30 seconds** per `delayRender()` call
- **Multiple calls**: Rendering waits for ALL handles cleared
- **Customize per-component**: `<Img delayRenderTimeoutInMilliseconds={10000} />`
- **<Img> handles automatically** — use `delayRender` for custom logic

```tsx
// <Img> automatically delays rendering with customizable timeout
<Img
  src={staticFile('/my-image.png')}
  delayRenderTimeoutInMilliseconds={5000}
  maxRetries={3}
/>
```

---

## 8. <OffthreadVideo> & <Audio> — For TTS Integration

### OffthreadVideo — Extract Exact Frames from Video

```tsx
import { OffthreadVideo } from 'remotion';

const VideoComponent = () => {
  return (
    <OffthreadVideo
      src={staticFile('/my-video.mp4')} // Remote URL or local via staticFile()
      volume={0.8}                        // Static volume (0-1)
      muted={false}                       // Strip audio if true
      playbackRate={1.0}                  // Speed (0.25 - 2.0)
      toneFrequency={1.0}                 // Pitch shift (0.01-2, 1=normal)
      trimBefore={0}                      // Frames to skip from start
      trimAfter={0}                       // Frames to skip from end
      transparent={false}                 // PNG extraction (slower, enables transparency)
      toneMapped={true}                   // Color space adjustment
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};

// Supported formats: H.264, H.265, VP8, VP9, AV1, ProRes
```

### Dynamic Volume Per Frame

```tsx
import { OffthreadVideo, useCurrentFrame, interpolate } from 'remotion';

const FadingVideoComponent = () => {
  const frame = useCurrentFrame();

  // Fade out over 30 frames
  const volume = interpolate(frame, [0, 30], [1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <OffthreadVideo
      src={staticFile('/video.mp4')}
      volume={volume}
    />
  );
};
```

### <Audio> Component

```tsx
import { Audio, useCurrentFrame } from 'remotion';

const AudioComponent = () => {
  return (
    <Audio
      src={staticFile('/narration.mp3')}
      volume={0.8}
      muted={false}
      playbackRate={1.0}
    />
  );
};

// For TTS (Text-to-Speech):
// 1. Generate MP3 via ElevenLabs or Google Cloud TTS
// 2. Save to public/audio/narration.mp3
// 3. Load via <Audio src={staticFile('/audio/narration.mp3')} />
```

### TTS Integration Pattern for Trading Videos

```tsx
import { Audio, Sequence } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';

interface Narration {
  text: string;
  audioPath: string;     // e.g., '/audio/segment-001.mp3'
  durationSeconds: number; // e.g., 8.5
}

const TtsVideoComposition = ({ narrations }: { narrations: Narration[] }) => {
  const fps = useVideoConfig().fps;
  let currentFrame = 0;

  return (
    <>
      {narrations.map((narration, i) => {
        const durationInFrames = Math.ceil(narration.durationSeconds * fps);
        const startFrame = currentFrame;
        currentFrame += durationInFrames;

        return (
          <Sequence
            key={i}
            from={startFrame}
            durationInFrames={durationInFrames}
            name={`narration-${i}`}
          >
            <Audio src={staticFile(narration.audioPath)} />
            {/* Visual content synced to audio */}
          </Sequence>
        );
      })}
    </>
  );
};
```

---

## 9. calculateMetadata() — Dynamic Duration

### API Overview

```tsx
import { Composition } from 'remotion';

// Pass calculateMetadata callback
<Composition
  id="my-composition"
  component={MyVideoComponent}
  durationInFrames={300}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={defaultProps}
  calculateMetadata={({ props, defaultProps, abortSignal, compositionId }) => {
    // Return updated metadata based on props
    return {
      durationInFrames: props.beats?.length * 50 || 300, // Dynamic duration
      fps: 30,
      width: 1920,
      height: 1080,
      // Also optionally return transformed props:
      props: {
        ...props,
        fetchedData: await fetchDataIfNeeded(props, abortSignal),
      },
    };
  }}
/>
```

### Use Case: Beat-Based Duration

```tsx
interface EpisodeProps {
  beats: Beat[];
  lang: 'fr' | 'en';
}

interface Beat {
  imagePath: string;
  duration: number; // frames per beat
  caption: string;
}

const TradingVideoComposition: React.FC<EpisodeProps> = ({ beats, lang }) => {
  // Component receives computed duration automatically
  return (
    // Render beats...
  );
};

const Root = () => {
  return (
    <Composition
      id="trading-episode"
      component={TradingVideoComposition}
      durationInFrames={300} // fallback
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        beats: [], // will be overridden at render time
        lang: 'fr',
      }}
      calculateMetadata={({ props }) => {
        const totalFrames = props.beats.reduce((sum, beat) => sum + beat.duration, 0);
        // Add 2 seconds (60 frames) for intro/outro
        return {
          durationInFrames: totalFrames + 60,
        };
      }}
    />
  );
};
```

### Async Props Transformation

```tsx
calculateMetadata={async ({ props, abortSignal }) => {
  // Fetch market data at render time
  const marketData = await fetch(
    `https://api.example.com/market?date=${props.date}`,
    { signal: abortSignal }
  ).then(r => r.json());

  return {
    durationInFrames: marketData.beats.length * 30,
    props: {
      ...props,
      marketData, // Pass fetched data to component
    },
  };
}}
```

---

## 10. Rendering: npx remotion render — CLI Options for 100+ Images

### Basic Command

```bash
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4

# Arguments:
# --composition (or --id): which composition to render
# ./src/Root.tsx: entry point (auto-detected if omitted)
# out/episode.mp4: output file
```

### Performance Flags

```bash
# Concurrency (threads) — use npx remotion benchmark to find optimal
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --concurrency 8

# Frame range (render only frames 0-99 for testing)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --frames 0-99

# Hardware acceleration (GPU for CSS filters, gradients)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --gl native  # or --gl angle, --gl egl

# Memory optimization — disable parallel encoding
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --disallow-parallel-encoding
```

### Video Quality Settings

```bash
# CRF (Constant Rate Factor) — 18 is high quality, 28 is low
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --crf 18

# VP8/VP9 for heavy compression (slower rendering)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.webm \
  --codec vp9

# Scale (4x = 4 times resolution, then downscale — increases detail)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --scale 2

# Audio bitrate
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --audio-bitrate 192k
```

### Benchmarking for Optimal Concurrency

```bash
# Test 1 to max threads, measure frame rate
npx remotion benchmark \
  --composition trading-episode \
  ./src/Root.tsx

# Output suggests best concurrency value
```

### Full Example for Your Trading Video

```bash
npx remotion render \
  --composition daily-recap-episode \
  ./src/Root.tsx \
  out/trading-recap-2026-03-19.mp4 \
  --concurrency 8 \
  --crf 18 \
  --codec h264 \
  --width 1920 \
  --height 1080 \
  --fps 30 \
  --props '{"date":"2026-03-19","lang":"fr","beats":[...]}'
```

---

## 11. Ken Burns Effect — Slow Zoom + Pan on Static Images

### Implementation with interpolate()

```tsx
import { Img, staticFile, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface KenBurnsConfig {
  duration: number; // frames
  zoomStart: 1;     // starting scale (1 = no zoom)
  zoomEnd: 1.3;     // ending scale (1.3 = 30% zoom)
  panX: number;     // pan left (-50) to right (50)
  panY: number;     // pan up (-50) to down (50)
}

const KenBurnsImage: React.FC<{
  imagePath: string;
  config: KenBurnsConfig;
}> = ({ imagePath, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smoothly zoom from 1 to 1.3 over duration
  const scale = interpolate(
    frame,
    [0, config.duration],
    [config.zoomStart, config.zoomEnd],
    {
      easing: Easing.easeInOut,
      extrapolateRight: 'clamp',
    }
  );

  // Pan across image (translateX)
  const translateX = interpolate(
    frame,
    [0, config.duration],
    [0, config.panX],
    {
      easing: Easing.easeInOut,
      extrapolateRight: 'clamp',
    }
  );

  // Pan vertically (translateY)
  const translateY = interpolate(
    frame,
    [0, config.duration],
    [0, config.panY],
    {
      easing: Easing.easeInOut,
      extrapolateRight: 'clamp',
    }
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Img
        src={staticFile(imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px)`,
          transformOrigin: 'center',
          transition: 'none', // No CSS transition, frame-by-frame control
        }}
      />
    </div>
  );
};

// Usage
<KenBurnsImage
  imagePath="/backgrounds/beat-001.png"
  config={{
    duration: 90,
    zoomStart: 1,
    zoomEnd: 1.25,
    panX: 50,
    panY: -30,
  }}
/>
```

### Ken Burns with Spring Animation

```tsx
const KenBurnsSpringImage: React.FC<{
  imagePath: string;
  duration: number;
}> = ({ imagePath, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring zoom (bouncy effect)
  const scale = spring({
    fps,
    frame,
    from: 1,
    to: 1.3,
    config: { damping: 8, stiffness: 100 },
    durationInFrames: duration,
  });

  // Linear pan for smoothness
  const panX = interpolate(
    frame,
    [0, duration],
    [0, 40],
    { easing: Easing.easeInOut, extrapolateRight: 'clamp' }
  );

  return (
    <Img
      src={staticFile(imagePath)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${scale}) translateX(${panX}px)`,
      }}
    />
  );
};
```

### Variants: Different Pan Directions

```tsx
// Pan from bottom-right to top-left (dramatic reveal)
const dramaticKenBurns = (frame: number, duration: number) => {
  const scale = interpolate(frame, [0, duration], [1.5, 1], {
    easing: Easing.easeOut,
    extrapolateRight: 'clamp',
  });
  const translateX = interpolate(frame, [0, duration], [100, 0], {
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [0, duration], [100, 0], {
    extrapolateRight: 'clamp',
  });

  return `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px)`;
};

// Slow, subtle pan (background effect)
const subtleKenBurns = (frame: number, duration: number) => {
  const scale = interpolate(frame, [0, duration], [1, 1.08], {
    easing: Easing.linear,
    extrapolateRight: 'clamp',
  });
  const translateX = interpolate(frame, [0, duration], [0, 15], {
    extrapolateRight: 'clamp',
  });

  return `scale(${scale}) translateX(${translateX}px)`;
};
```

---

## 12. Performance Optimization — Rendering 100+ Images

### Memory Management

```tsx
// Set cache size for OffthreadVideo frames (default: 50% of system RAM)
// In remotion.config.ts:
export const config = {
  // Limit OffthreadVideo cache to 2GB
  offthreadVideoCache: 2 * 1024 * 1024 * 1024,
};

// Or via CLI:
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --media-cache 2gb
```

### Avoid GPU Bottlenecks with Large Images

```tsx
// DON'T: Heavy GPU effects
<AbsoluteFill style={{
  boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)', // GPU intensive
  background: 'linear-gradient(to bottom, #000, #fff)', // GPU intensive
  filter: 'blur(10px)', // GPU intensive
}}>
  {/* Content */}
</AbsoluteFill>

// DO: Precompute and use static images
import shadowOverlay from '../assets/shadow-overlay.png';

<AbsoluteFill>
  <Img src={shadowOverlay} /> {/* Raster, pre-rendered, fast */}
</AbsoluteFill>
```

### Memoization for Expensive Computations

```tsx
import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';

const ComputeIntensiveScene = ({ beats }: { beats: Beat[] }) => {
  const frame = useCurrentFrame();

  // Memoize color calculation (expensive operation)
  const backgroundColor = useMemo(() => {
    return calculateDominantColor(beats[frame % beats.length]);
  }, [frame, beats]);

  // Memoize rendered chart (expensive operation)
  const chart = useMemo(() => {
    return renderComplexChart(beats);
  }, [beats]);

  return (
    <AbsoluteFill style={{ background: backgroundColor }}>
      {chart}
    </AbsoluteFill>
  );
};
```

### Image Preloading Strategy

```tsx
import { preloadImage } from '@remotion/preload';
import { useEffect } from 'react';

const PreloadManager = ({ currentBeatIndex, totalBeats }: {
  currentBeatIndex: number;
  totalBeats: number;
}) => {
  useEffect(() => {
    // Preload next 5 images (helps Studio/Player, not strictly needed for rendering)
    for (let i = currentBeatIndex; i < Math.min(currentBeatIndex + 5, totalBeats); i++) {
      const path = `/backgrounds/beat-${String(i).padStart(3, '0')}.png`;
      preloadImage(staticFile(path));
    }
  }, [currentBeatIndex, totalBeats]);

  return null; // Invisible component
};
```

### Optimal Concurrency Settings

```bash
# For 100 images on 8-core machine:
# Start with 4-6 threads (leave room for OS)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --concurrency 6

# Benchmark first to find exact optimal
npx remotion benchmark --composition trading-episode ./src/Root.tsx
```

### Codec Choice for Speed vs Quality

| Codec | Speed | Quality | File Size | Notes |
|---|---|---|---|---|
| H.264 | Fast | High | Medium | Default, widest support |
| H.265 | Slow | Very High | Small | Modern, 50% smaller files |
| VP9 | Very Slow | High | Very Small | Heavy compression |
| ProRes | Medium | Extreme | Very Large | Professional, edit-friendly |

```bash
# Fast render for testing (H.264, lower quality)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode-draft.mp4 \
  --crf 28 \
  --concurrency 8

# Final render (H.264, high quality)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/episode-final.mp4 \
  --crf 18 \
  --concurrency 6
```

### Render Specific Frame Ranges (for Debugging)

```bash
# Test first 30 frames only
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/test.mp4 \
  --frames 0-30

# Render middle section (e.g., frames 500-600)
npx remotion render \
  --composition trading-episode \
  ./src/Root.tsx \
  out/middle.mp4 \
  --frames 500-600
```

---

## Summary: Your 100-Image Trading Video Architecture

### Pattern: TransitionSeries + Beat Loop

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { springTiming, slide } from '@remotion/transitions';

interface Beat {
  imagePath: string;
  duration: number; // frames
  caption: string;
  chartData?: any;
}

export const DailyTradingEpisode: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  return (
    <TransitionSeries>
      {beats.map((beat, i) => (
        <React.Fragment key={i}>
          {/* Scene with background image + overlays */}
          <TransitionSeries.Sequence durationInFrames={beat.duration}>
            <AbsoluteFill>
              <Img
                src={staticFile(beat.imagePath)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </AbsoluteFill>

            {/* Overlay chart/caption */}
            <AbsoluteFill style={{ padding: '40px', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 32, color: 'white' }}>
                {beat.caption}
              </Text>
            </AbsoluteFill>
          </TransitionSeries.Sequence>

          {/* Transition to next beat (except last) */}
          {i < beats.length - 1 && (
            <TransitionSeries.Transition
              timing={springTiming({
                durationInFrames: 20,
                damping: 12,
              })}
              presentation={slide({ direction: 'from-right' })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
```

### Render Command

```bash
npx remotion render \
  --composition daily-trading-episode \
  ./src/Root.tsx \
  out/trading-recap-2026-03-19.mp4 \
  --crf 18 \
  --concurrency 6 \
  --props '{"beats":[...]}'
```

---

## References

- [Remotion Transitions](https://www.remotion.dev/docs/transitions/)
- [TransitionSeries API](https://www.remotion.dev/docs/transitions/transitionseries)
- [staticFile()](https://www.remotion.dev/docs/staticfile)
- [<Img> Component](https://www.remotion.dev/docs/img)
- [spring()](https://www.remotion.dev/docs/spring)
- [interpolate()](https://www.remotion.dev/docs/interpolate)
- [<Sequence>](https://www.remotion.dev/docs/sequence)
- [<Series>](https://www.remotion.dev/docs/series)
- [<AbsoluteFill>](https://www.remotion.dev/docs/absolute-fill)
- [delayRender() & continueRender()](https://www.remotion.dev/docs/delay-render)
- [<OffthreadVideo>](https://www.remotion.dev/docs/offthreadvideo)
- [calculateMetadata()](https://www.remotion.dev/docs/calculate-metadata)
- [npx remotion render CLI](https://www.remotion.dev/docs/cli/render)
- [Performance Tips](https://www.remotion.dev/docs/performance)
- [Easing Functions](https://www.remotion.dev/docs/easing)
- [interpolateColors()](https://www.remotion.dev/docs/interpolate-colors)
- [preloadImage()](https://www.remotion.dev/docs/preload/preload-image)
