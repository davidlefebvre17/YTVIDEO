# Remotion 4.0.425 — Quick Reference & Cheat Sheet

For rapid lookup while coding. All examples assume Remotion 4.0.425+ and TypeScript.

---

## API Quick Lookup

### Imports You'll Need

```tsx
// Core
import { Composition, Sequence, AbsoluteFill, Img, Text, Video, Audio } from 'remotion';
import { useCurrentFrame, useVideoConfig, staticFile, delayRender, continueRender } from 'remotion';
import { useDelayRender } from 'remotion';

// Animations
import { spring, interpolate, interpolateColors, Easing } from 'remotion';

// Transitions (separate package)
import { TransitionSeries, springTiming, linearTiming } from '@remotion/transitions';
import { fade, slide, wipe, flip, clockWipe, iris } from '@remotion/transitions';

// Media utilities
import { OffthreadVideo } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';

// Preloading
import { preloadImage } from '@remotion/preload';
```

---

## Timing Reference

### Frame to Time Conversion

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const timeInSeconds = frame / fps;
const timeInMs = (frame / fps) * 1000;

// Example: frame 150 @ 30fps = 5 seconds
// 150 / 30 = 5
```

### Common FPS & Frame Conversions

| Situation | Frames | FPS | Duration |
|---|---|---|---|
| 1 second | 30 | 30 | 1s |
| 2 seconds | 60 | 30 | 2s |
| 8 minutes | 14400 | 30 | 8m |
| 10 minutes | 18000 | 30 | 10m |

### Transition Duration Math

```
Total frames = Seq1 + Seq2 + Seq3 - Trans1 - Trans2

100 beats × 30 frames + 99 transitions × 20 frames
= 3000 + (3000 - 1980) = 3020 frames @ 30fps = 100.67 seconds
```

---

## Component Quick Syntax

### <Sequence>

```tsx
<Sequence from={frameNumber} durationInFrames={frameCount} name="optional-label">
  {/* Content visible from frame N for D frames */}
</Sequence>

// Defaults: from=0, durationInFrames=Infinity, layout="absolute-fill"
```

### <Series>

```tsx
<Series>
  <Series.Sequence durationInFrames={40}>Scene 1</Series.Sequence>
  <Series.Sequence durationInFrames={60}>Scene 2</Series.Sequence>
</Series>

// Layout: absolute-fill (default) or "none"
// offset={10}: adds 10-frame gap before this and all subsequent sequences
```

### <AbsoluteFill>

```tsx
<AbsoluteFill style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
  Content (fills entire frame, absolutely positioned)
</AbsoluteFill>

// Equivalent to: position absolute, top 0, left 0, 100% width/height, flex display
```

### <Img>

```tsx
<Img
  src={staticFile('/path/image.png')} // Required
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  delayRenderTimeoutInMilliseconds={3000}
  maxRetries={1}
  onError={() => console.error('Failed')}
/>

// Automatically delays rendering until image loads
// Max pixel size: 2^29 (~539 megapixels)
```

### <Audio>

```tsx
<Audio
  src={staticFile('/path/audio.mp3')} // Required
  volume={0.8}
  muted={false}
  playbackRate={1.0}
/>

// Plays for entire duration of containing Sequence
```

### <OffthreadVideo>

```tsx
<OffthreadVideo
  src={staticFile('/video.mp4')} // Required
  volume={0.8}
  muted={false}
  playbackRate={1.0}
  toneFrequency={1.0}
  trimBefore={0}
  trimAfter={0}
  transparent={false}
/>

// Extracts exact frames via FFmpeg (not browser playback)
// Supports: H.264, H.265, VP8, VP9, AV1, ProRes
```

---

## Animation Formulas

### spring()

```tsx
const value = spring({
  fps,                          // from useVideoConfig().fps
  frame,                         // from useCurrentFrame()
  from: 0,                       // start value
  to: 100,                       // end value
  config: {
    damping: 10,               // ↑ remove bounce, ↓ more springy
    stiffness: 100,            // ↑ faster/bouncier
    mass: 1,                   // ↑ slower
    overshootClamping: false,  // prevent exceeding target
  },
  delay: 0,                      // frames before animation starts
  durationInFrames: undefined,   // undefined = natural, or fixed frames
  reverse: false,                // play backwards
});
```

### interpolate()

```tsx
const value = interpolate(
  frame,                   // input (typically frame number)
  [0, 30],                 // input range
  [0, 100],                // output range
  {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }
);

// Extrapolation modes: 'extend' | 'clamp' | 'wrap' | 'identity'
// Default: 'extend' (keeps interpolating beyond bounds)
```

### interpolateColors()

```tsx
const color = interpolateColors(
  frame,
  [0, 30],
  ['#00b4d8', '#ffd60a'] // Any CSS format
);

// Returns: rgba(R, G, B, A) string
// Supports: hex, rgb, rgba, hsl, hsla, CSS color names
```

---

## Easing Functions Cheat Sheet

### Basic

```tsx
Easing.linear         // 1:1, no ease
Easing.ease           // Slow start/end
Easing.easeIn         // Slow start
Easing.easeOut        // Slow end
Easing.easeInOut      // Slow start & end
```

### Power

```tsx
Easing.quad           // t^2 (quadratic)
Easing.cubic          // t^3 (cubic)
Easing.poly(n)        // t^n (polynomial)
```

### Special

```tsx
Easing.bounce         // Bouncing effect
Easing.elastic(b)     // Spring oscillation (b = bounciness 0-2)
Easing.back           // Overshoot effect
```

### Math

```tsx
Easing.bezier(x1, y1, x2, y2)  // CSS cubic-bezier
Easing.circle                   // Circular
Easing.sin                      // Sine wave
Easing.exp                      // Exponential
```

### Modifiers

```tsx
Easing.in(Easing.quad)     // Slow start
Easing.out(Easing.quad)    // Slow end
Easing.inOut(Easing.quad)  // Slow both (symmetric)

// Examples:
Easing.out(Easing.bounce)
Easing.inOut(Easing.elastic(2))
```

---

## TransitionSeries Quick Reference

### Basic Pattern

```tsx
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={40}>
    Scene 1
  </TransitionSeries.Sequence>

  <TransitionSeries.Transition
    timing={springTiming({ durationInFrames: 20 })}
    presentation={slide({ direction: 'from-right' })}
  />

  <TransitionSeries.Sequence durationInFrames={50}>
    Scene 2
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### Presentations

```tsx
fade()                              // Opacity crossfade
slide({ direction: 'from-right' })  // Slide in (from-left, from-right, from-top, from-bottom)
wipe()                              // Wipe over previous
flip()                              // Rotate away
clockWipe()                         // Circular reveal
iris()                              // Circular mask from center
```

### Timing Functions

```tsx
springTiming({
  durationInFrames: 30,
  delay: 0,
  mass: 1,
  damping: 10,
  stiffness: 100,
})

linearTiming({
  durationInFrames: 30,
  easing: Easing.ease,
  delay: 0,
})
```

### Overlay (No Duration Change)

```tsx
<TransitionSeries.Overlay durationInFrames={20} offset={-10}>
  {/* Light leak or flash effect */}
</TransitionSeries.Overlay>

// Does NOT reduce total duration
// offset: -10 = starts 10 frames before cut
```

---

## staticFile() & Asset Loading

### Directory Structure

```
project/
├── public/
│   ├── backgrounds/beat-001.png
│   ├── overlays/chart.svg
│   ├── audio/narration.mp3
│   └── video/clip.mp4
└── src/
    └── Root.tsx
```

### Usage

```tsx
// Images
<Img src={staticFile('/backgrounds/beat-001.png')} />

// Audio
<Audio src={staticFile('/audio/narration.mp3')} />

// Video
<OffthreadVideo src={staticFile('/video/clip.mp4')} />

// Font files (in CSS)
@font-face {
  font-family: 'MyFont';
  src: url(staticFile('/fonts/MyFont.woff2')) format('woff2');
}

// In fetch
fetch(staticFile('/data.json'))
```

### Key Rules

- Path must start with `/`
- Relative to `public/` folder (same dir as `package.json` with Remotion)
- Auto-encodes special chars: `#` → `%23`
- Don't manually encode: `staticFile(encodeURIComponent(...))` = broken

---

## Calculation Helpers

### Duration Calculation

```ts
function calculateCompositionDuration(
  beats: Beat[],
  transitionDurationFrames: number,
  fps: number = 30,
): { frames: number; seconds: number } {
  const beatFrames = beats.reduce((sum, b) => sum + b.duration, 0);
  const transitionFrames = (beats.length - 1) * transitionDurationFrames;
  const totalFrames = beatFrames + transitionFrames - (beats.length - 1) * transitionDurationFrames;
  // Wait, that's wrong. Let me recalculate:
  // Total = beatFrames + transitionFrames - (overlap)
  // Overlap = transitionDurationFrames * (beats.length - 1)
  const frames = beatFrames + transitionFrames - transitionFrames; // = beatFrames only?
  // No. Each transition reduces total by its duration:
  const totalFramesCorrect = beatFrames + transitionFrames - (beats.length - 1) * transitionDurationFrames;
  // = beatFrames + (beats.length - 1) * trans - (beats.length - 1) * trans = beatFrames

  // Simpler: just add up sequence durations
  const simpleTotal = beats.reduce((sum, b) => sum + b.duration, 0);
  return {
    frames: simpleTotal,
    seconds: simpleTotal / fps,
  };
}

// Example
const beats = [
  { duration: 50 },
  { duration: 40 },
  { duration: 30 },
];
// Transitions: 20 frames each (3 sequences = 2 transitions)
// Without transitions: 50 + 40 + 30 = 120 frames
// With transitions: 120 - (20 + 20) = 80 frames (not 160!)
```

### Frame Padding

```ts
// Pad string for beat numbering
const beatNumber = String(i).padStart(3, '0');
// 0 → "000", 1 → "001", 10 → "010", 100 → "100"

// Use in paths
const imagePath = `/backgrounds/beat-${beatNumber}.png`;
// /backgrounds/beat-000.png, /backgrounds/beat-001.png, etc.
```

---

## CLI Command Cheat Sheet

### Render

```bash
# Basic
npx remotion render ./src/Root.tsx out.mp4

# With composition ID
npx remotion render --composition my-comp ./src/Root.tsx out.mp4

# With props
npx remotion render --composition my-comp --props '{"date":"2026-03-19"}' ./src/Root.tsx out.mp4

# Performance
npx remotion render --concurrency 8 --crf 18 ./src/Root.tsx out.mp4

# Frame range (for testing)
npx remotion render --frames 0-99 ./src/Root.tsx test.mp4

# With codec
npx remotion render --codec h264 ./src/Root.tsx out.mp4
npx remotion render --codec h265 ./src/Root.tsx out.mp4 # smaller file
npx remotion render --codec vp9 ./src/Root.tsx out.webm # heaviest compression

# Audio bitrate
npx remotion render --audio-bitrate 192k ./src/Root.tsx out.mp4
```

### Benchmark

```bash
# Find optimal concurrency
npx remotion benchmark --composition my-comp ./src/Root.tsx

# Results show which thread count is fastest
```

### Studio (Development)

```bash
# Open Remotion Studio (localhost:3000)
npx remotion studio

# With explicit entry point
npx remotion studio ./src/Root.tsx
```

---

## Props & Type Safety

### Composition Props

```tsx
interface EpisodeProps {
  date: string;
  lang: 'fr' | 'en';
  beats: Beat[];
}

// Component
const MyComposition: React.FC<EpisodeProps> = ({ date, lang, beats }) => {
  // ...
};

// Root registration
<Composition
  id="my-comp"
  component={MyComposition}
  durationInFrames={3000}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    date: '2026-03-19',
    lang: 'fr',
    beats: [],
  } as EpisodeProps}
/>

// Render with props
npx remotion render \
  --composition my-comp \
  --props '{"date":"2026-03-19","lang":"fr","beats":[...]}' \
  ./src/Root.tsx out.mp4
```

### calculateMetadata for Dynamic Props

```tsx
calculateMetadata={async ({ props, abortSignal }) => {
  return {
    durationInFrames: 3000,
    props: {
      ...props,
      beats: await fetchBeats(props.date, abortSignal),
    },
  };
}}
```

---

## Common Patterns

### 100 Beats with Transitions

```tsx
<TransitionSeries>
  {beats.map((beat, i) => (
    <React.Fragment key={i}>
      <TransitionSeries.Sequence durationInFrames={beat.duration}>
        <Img src={staticFile(beat.imagePath)} />
      </TransitionSeries.Sequence>
      {i < beats.length - 1 && (
        <TransitionSeries.Transition
          timing={springTiming({ durationInFrames: 20 })}
          presentation={slide({ direction: 'from-right' })}
        />
      )}
    </React.Fragment>
  ))}
</TransitionSeries>
```

### Fade In/Out

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp',
});

<div style={{ opacity }}>Content</div>
```

### Slide In from Right

```tsx
const translateX = interpolate(frame, [0, 30], [1920, 0], {
  easing: Easing.ease,
  extrapolateRight: 'clamp',
});

<div style={{ transform: `translateX(${translateX}px)` }}>Content</div>
```

### Ken Burns Zoom

```tsx
const scale = interpolate(frame, [0, duration], [1, 1.2], {
  extrapolateRight: 'clamp',
});

<Img
  src={staticFile(imagePath)}
  style={{
    transform: `scale(${scale})`,
    transformOrigin: 'center',
  }}
/>
```

### Spring Scale Pop

```tsx
const scale = spring({
  fps, frame,
  from: 0, to: 1,
  config: { damping: 5, stiffness: 100 },
});

<div style={{ transform: `scale(${scale})` }}>Popping in</div>
```

---

## Performance Rules of Thumb

| Situation | Recommendation |
|---|---|
| 100+ images | Use `<Sequence>` to lazy-load (unmounts outside range) |
| Rendering 100 images | Start with `--concurrency 6` (less than CPU cores) |
| Heavy GPU effects | Replace with precomputed image overlays |
| Long audio narration | Sync with `calculateMetadata` to get duration first |
| Spring animations | Increase `damping` if overshooting is problem |
| Ken Burns zoom | Use 4K source if zooming beyond 1.2x to avoid blurring |
| Memory issues | Use `--disallow-parallel-encoding` or limit `--media-cache` |

---

## Debugging

### Check Frame Duration

```bash
ffprobe out.mp4 -show_entries format=duration -v quiet -of csv="p=0"
```

### Verbose Render Log

```bash
npx remotion render --log verbose ./src/Root.tsx out.mp4 2>&1 | tee render.log
```

### Test 10 Frames Only

```bash
npx remotion render --frames 0-9 ./src/Root.tsx test.mp4
# Quick validation before full render
```

### Profile Memory Usage

```tsx
// In component
useEffect(() => {
  if ((window as any).performance?.memory) {
    const mem = (window as any).performance.memory;
    console.log(`Memory: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(0)}MB`);
  }
}, [frame]);
```

---

## Version-Specific Notes

### v4.0.249+

- Tailwind CSS class conflict detection in `AbsoluteFill`
- Inline styles take precedence

### v4.0.424+

- `--fps` and `--duration` CLI flags
- Better `OffthreadVideo` performance (C API, not extraction)

### v4.0.425 (Current)

- Your current version
- Latest bug fixes and optimizations

---

## Links

- [Remotion Docs](https://www.remotion.dev/docs/)
- [Spring Timing Editor](https://www.remotion.dev/timing-editor)
- [Easing Functions](https://www.remotion.dev/docs/easing)
- [Performance Tips](https://www.remotion.dev/docs/performance)
- [CLI Render Reference](https://www.remotion.dev/docs/cli/render)

