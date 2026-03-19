# Remotion 4.0.425 — Advanced Patterns & Gotchas

This document covers edge cases, performance pitfalls, and advanced patterns for your 100-image trading video generator.

---

## Gotchas & Common Mistakes

### 1. TransitionSeries Duration Math (Critical)

**Mistake:**
```tsx
// You expect: 50 + 40 + 50 + 40 + 50 = 230 frames
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={50} />
  <TransitionSeries.Transition ... durationInFrames={40} /> {/* WRONG */}
  <TransitionSeries.Sequence durationInFrames={50} />
</TransitionSeries>
```

**Why it fails:** Transitions **overlap** scenes. A 40-frame transition means:
- Last 40 frames of Seq1 play simultaneously with first 40 frames of Seq2
- Total: 50 + 50 - 40 = **60 frames**, not 130

**Fix:**
```tsx
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={50}>Scene 1</TransitionSeries.Sequence>

  <TransitionSeries.Transition timing={springTiming({ durationInFrames: 20 })} />
  {/* Actual total: 50 + 50 - 20 = 80 frames so far */}

  <TransitionSeries.Sequence durationInFrames={50}>Scene 2</TransitionSeries.Sequence>
</TransitionSeries>
```

**Calculate correct timing:**
```ts
function calculateTotalDuration(
  seq1: number,
  trans1: number,
  seq2: number,
  trans2: number,
  seq3: number,
) {
  // seq1 + seq2 - trans1 + seq3 - trans2
  return seq1 + seq2 - trans1 + seq3 - trans2;
}

// For 100 beats at 50 frames each with 20-frame transitions:
// 50 + (50 - 20) + (50 - 20) + ... + 50
// = 50 + 30*99 + 50 = 50 + 2970 = 3020 frames (~100 seconds @ 30fps)
```

---

### 2. Image Loading Order (Performance)

**Mistake:**
```tsx
const HundredImageComposition = ({ beats }: { beats: Beat[] }) => {
  // DON'T: Load ALL images at once
  return (
    <>
      {beats.map(beat => (
        <Img key={beat.id} src={staticFile(beat.imagePath)} /> {/* Blocks all */}
      ))}
    </>
  );
};
```

**Why it fails:** Remotion tries to load all 100 images before rendering first frame. Memory spike, long wait.

**Fix:**
```tsx
// DO: Use Sequence to load only current beat
const HundredImageComposition = ({ beats }: { beats: Beat[] }) => {
  return (
    <TransitionSeries>
      {beats.map((beat, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={beat.duration}>
            {/* Only this image is mounted; others unmounted */}
            <Img src={staticFile(beat.imagePath)} />
          </TransitionSeries.Sequence>

          {i < beats.length - 1 && <TransitionSeries.Transition ... />}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
```

**Why this works:** Remotion unmounts `<Sequence>` children outside their time range. Only ~2-3 images in memory at once.

---

### 3. Tailwind CSS Conflicts in AbsoluteFill (v4.0.249+)

**Mistake:**
```tsx
// Conflicting: Tailwind says position-relative, AbsoluteFill says absolute
<AbsoluteFill className="relative p-10">
  Content
</AbsoluteFill>
```

**Result:** Unpredictable stacking behavior.

**Fix:**
```tsx
// Option 1: Use style prop for absolute positioning
<AbsoluteFill style={{ padding: '40px' }} className="bg-black">
  Content
</AbsoluteFill>

// Option 2: Use layout="none" and position manually
<AbsoluteFill layout="none" className="relative">
  Content
</AbsoluteFill>

// v4.0.249+: Automatically detects conflicts and disables inline styles
```

---

### 4. staticFile() Double-Encoding Trap

**Mistake:**
```tsx
// DON'T: Manual encoding
const encoded = encodeURIComponent('beat#1.png');
<Img src={staticFile(`/${encoded}`)} /> // Double-encoded → broken
```

**Fix:**
```tsx
// DO: Let staticFile() handle encoding
<Img src={staticFile('/beat#1.png')} /> // Automatic → /beat%231.png
```

---

### 5. Extrapolation Mode Confusion

**Mistake:**
```tsx
// Input: frame 0-20, Output: 0-100
// At frame 25: What happens?
interpolate(frame, [0, 20], [0, 100], {
  extrapolateRight: 'extend', // Default — continues interpolating → 125
})

// Expecting it to clamp at 100? Frame 25 gives 125 instead!
```

**Fix:**
```tsx
// Explicitly clamp for safe bounds
const value = interpolate(frame, [0, 20], [0, 100], {
  extrapolateRight: 'clamp', // Hard stop at 100
});

// Or wrap in Math.min/max for safety
const opacity = Math.min(1, interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: 'extend',
}));
```

---

### 6. Spring Animation Overshooting

**Mistake:**
```tsx
// Spring bounces beyond target (common in animations)
const scale = spring({
  fps, frame,
  from: 1, to: 2,
  config: { damping: 5, stiffness: 100 },
});
// Result: scale reaches 2.15 before settling at 2
// Your 1920px element briefly becomes 4128px!
```

**Fix:**
```tsx
// Option 1: Enable overshoot clamping
const scale = spring({
  fps, frame,
  from: 1, to: 2,
  config: {
    damping: 5,
    stiffness: 100,
    overshootClamping: true, // Prevents exceeding 2
  },
});

// Option 2: Increase damping to remove bounce
const scale = spring({
  fps, frame,
  from: 1, to: 2,
  config: {
    damping: 20, // High damping = no bounce
    stiffness: 100,
  },
});
```

---

### 7. Sequence "from" vs "offset" Confusion

**Mistake:**
```tsx
<Series>
  <Series.Sequence durationInFrames={40}>
    Scene 1 (frames 0-40)
  </Series.Sequence>

  {/* WRONG: Using from={60} */}
  <Series.Sequence durationInFrames={30} offset={60}>
    Scene 2 (frames 60-90) ✓
    But ALSO shifted Scene 3 and beyond by 60 frames!
  </Series.Sequence>

  <Series.Sequence durationInFrames={40}>
    Scene 3 (frames 150-190) ← Was (90-130)!
  </Series.Sequence>
</Series>
```

**Fix:**
```tsx
// offset affects this AND all subsequent sequences
// If you want a gap, use offset
<Series>
  <Series.Sequence durationInFrames={40}>Scene 1</Series.Sequence>
  <Series.Sequence durationInFrames={20} offset={10}> {/* Gap 10 frames */}
    Scene 2 with offset
  </Series.Sequence>
  {/* Scene 3 automatically shifted 10 frames later */}
</Series>

// Or use layout="none" and Sequence with explicit from={60}
<>
  <Sequence from={0} durationInFrames={40} layout="none">Scene 1</Sequence>
  <Sequence from={50} durationInFrames={30} layout="none">Scene 2 with gap</Sequence>
  <Sequence from={80} durationInFrames={40} layout="none">Scene 3</Sequence>
</>
```

---

### 8. <Img> Retries and Timeout Stacking

**Mistake:**
```tsx
// Default: 2 retries, 30sec total timeout
// With 100 images:
// 100 images × 30s = 3000s (50 minutes!) if they all fail
<Img src={staticFile('/image.png')} /> // No timeout control
```

**Fix:**
```tsx
// Reduce timeout aggressively
<Img
  src={staticFile('/image.png')}
  delayRenderTimeoutInMilliseconds={2000} // 2 seconds total
  maxRetries={1} // Only try twice
  onError={() => console.warn('Image failed')}
/>

// Or handle manually with useDelayRender
const SmartImg = ({ src }: { src: string }) => {
  const { continueRender } = useDelayRender();

  return (
    <Img
      src={src}
      delayRenderTimeoutInMilliseconds={2000}
      onError={() => {
        console.error(`Failed to load: ${src}`);
        continueRender(); // Don't block entire video
      }}
    />
  );
};
```

---

### 9. Ken Burns Effect Causing Blur

**Mistake:**
```tsx
// Zooming in 30% + 1920x1080 = blurry
<Img
  src={staticFile('/background.png')} // 1920x1080 source
  style={{
    transform: 'scale(1.3)', // Scaling up 30% = pixel interpolation
  }}
/>
```

**Fix:**
```tsx
// Option 1: Use higher-res source (2560x1440 or 4K)
// Then scale down in CSS for crisp result
<Img
  src={staticFile('/background-4k.png')} // 3840x2160 source
  style={{
    width: '1920px',
    height: '1080px',
    objectFit: 'cover',
    transform: 'scale(1.3)', // Zooming up from 4K → stays crisp
  }}
/>

// Option 2: Limit Ken Burns zoom to 1.1-1.15 max
// Avoids visible pixelation
const scale = interpolate(frame, [0, duration], [1, 1.1], {
  extrapolateRight: 'clamp',
});
```

---

### 10. useCurrentFrame() Outside Render Loop

**Mistake:**
```tsx
const MyComponent = () => {
  const frame = useCurrentFrame(); // ✓ OK in render function

  const handleClick = () => {
    console.log(frame); // ✗ Stale closure — won't update
  };

  return <button onClick={handleClick}>Click</button>;
};
```

**Fix:**
```tsx
// useCurrentFrame() is reactive only in render function
const MyComponent = () => {
  const frame = useCurrentFrame(); // Fresh every frame

  // Use directly in JSX
  return <div>{frame}</div>;
};

// If you need to react to frame changes:
useEffect(() => {
  // This triggers when frame changes
  doSomething(frame);
}, [frame]);
```

---

## Advanced Patterns

### 1. Computed Beat Timing

Your 100 beats may have different durations (e.g., important assets get more time). Calculate timing upfront:

```tsx
interface Beat {
  imagePath: string;
  importance: number; // 1-10 scale
  narrationDurationMs: number;
}

function computeBeatTimings(
  beats: Beat[],
  fps: number = 30,
  baseFramesPerBeat: number = 30,
) {
  return beats.map(beat => ({
    ...beat,
    // More important beats get more frames
    duration: baseFramesPerBeat + Math.ceil((beat.importance - 1) * 5),
    // Or sync to narration length
    duration: Math.ceil((beat.narrationDurationMs / 1000) * fps),
  }));
}

// Usage
const beats = computeBeatTimings([
  { imagePath: '...', importance: 10, narrationDurationMs: 8000 },
  { imagePath: '...', importance: 5, narrationDurationMs: 4000 },
  // ...
], 30, 30);

const totalFrames = beats.reduce((sum, b) => sum + b.duration, 0);
console.log(`Total video: ${totalFrames / 30}s`);
```

---

### 2. Staggered Image Loading with useDelayRender

For batch processing (e.g., fetch metadata for 100 images):

```tsx
import { useDelayRender } from 'remotion';
import { useEffect, useState } from 'react';

interface BeatMetadata {
  imagePath: string;
  isValid: boolean;
}

const BatchImageValidator = ({ beats }: { beats: Beat[] }) => {
  const { continueRender } = useDelayRender();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    (async () => {
      const metadata: BeatMetadata[] = await Promise.all(
        beats.map(async beat => ({
          imagePath: beat.imagePath,
          // Validate image exists and is accessible
          isValid: await checkImageAccessible(staticFile(beat.imagePath)),
        }))
      );

      console.log(`Validated ${metadata.filter(m => m.isValid).length}/${beats.length} images`);
      setValidated(true);
      continueRender(); // Unpause rendering
    })();
  }, [beats]);

  if (!validated) return null;

  return <YourVideoComposition />;
};

async function checkImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

---

### 3. Dynamic Narration Sync (Audio + Beat)

Match beat timing to narration:

```tsx
import { Audio, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';

interface Beat {
  imagePath: string;
  narrationAudioPath: string; // e.g., '/audio/beat-001.mp3'
  narrationDurationMs: number; // from metadata
}

const NarrationSyncedComposition = ({ beats }: { beats: Beat[] }) => {
  const { fps } = useVideoConfig();
  let currentFrame = 0;

  return (
    <TransitionSeries>
      {beats.map((beat, i) => {
        const durationInFrames = Math.ceil((beat.narrationDurationMs / 1000) * fps);
        const startFrame = currentFrame;
        currentFrame += durationInFrames;

        return (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              {/* Background image */}
              <AbsoluteFill>
                <Img src={staticFile(beat.imagePath)} />
              </AbsoluteFill>

              {/* Narration audio (plays during this sequence) */}
              <Audio src={staticFile(beat.narrationAudioPath)} />

              {/* Overlay chart/caption */}
              <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '40px' }}>
                <Text>{beat.caption}</Text>
              </AbsoluteFill>
            </TransitionSeries.Sequence>

            {i < beats.length - 1 && (
              <TransitionSeries.Transition
                timing={springTiming({ durationInFrames: 15 })}
                presentation={slide({ direction: 'from-right' })}
              />
            )}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};
```

---

### 4. Conditional Rendering Based on Beat Properties

Some beats are "deep dives" with extra analysis; others are quick updates:

```tsx
interface Beat {
  type: 'quick' | 'deep-dive' | 'event';
  imagePath: string;
  analysis?: string;
  chartData?: ChartData;
}

const AdaptiveComposition = ({ beat }: { beat: Beat }) => {
  if (beat.type === 'quick') {
    return <QuickUpdateScene beat={beat} />;
  } else if (beat.type === 'deep-dive') {
    return <DeepDiveScene beat={beat} />;
  } else {
    return <EventHighlightScene beat={beat} />;
  }
};

const QuickUpdateScene = ({ beat }: { beat: Beat }) => {
  return (
    <AbsoluteFill>
      <Img src={staticFile(beat.imagePath)} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>Brief update</Text>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const DeepDiveScene = ({ beat }: { beat: Beat }) => {
  return (
    <AbsoluteFill>
      <Img src={staticFile(beat.imagePath)} />

      {/* More complex overlays */}
      <AbsoluteFill style={{ background: 'rgba(0, 0, 0, 0.4)' }} />

      <AbsoluteFill style={{
        padding: '60px',
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}>
        <Text style={{ fontSize: 36 }}>{beat.analysis}</Text>
        {beat.chartData && <InkChart data={beat.chartData} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Usage
<TransitionSeries>
  {beats.map((beat, i) => (
    <React.Fragment key={i}>
      <TransitionSeries.Sequence durationInFrames={beat.duration}>
        <AdaptiveComposition beat={beat} />
      </TransitionSeries.Sequence>
      {/* Transitions... */}
    </React.Fragment>
  ))}
</TransitionSeries>
```

---

### 5. Memoized Data Transformation

For 100 images with complex data, compute once:

```tsx
import { useMemo } from 'react';

const ComputeIntensiveComposition = ({ rawData }: { rawData: RawData[] }) => {
  // Compute transformed data once, reuse across frames
  const processedBeats = useMemo(() => {
    return rawData.map(item => ({
      imagePath: generateImagePath(item),
      importance: calculateImportance(item),
      causalChain: analyzeCausality(item), // Expensive
      sentiment: detectSentiment(item.text), // LLM or rules
    }));
  }, [rawData]);

  return (
    <TransitionSeries>
      {processedBeats.map((beat, i) => (
        // ... render beat
      ))}
    </TransitionSeries>
  );
};
```

---

### 6. Render-Time Props Transformation

Use `calculateMetadata` to transform props before composition runs:

```tsx
interface RawEpisodeProps {
  date: string;
  assets: string[]; // Symbols
  lang: 'fr' | 'en';
}

interface ProcessedEpisodeProps extends RawEpisodeProps {
  beats: Beat[];
  totalFrames: number;
}

const Root = () => {
  return (
    <Composition
      id="trading-episode"
      component={TradingEpisodeComposition}
      durationInFrames={3000} // fallback
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        date: '2026-03-19',
        assets: ['SPX', 'EUR=X', 'BTC-USD'],
        lang: 'fr',
      } as RawEpisodeProps}
      calculateMetadata={async ({ props }) => {
        const rawProps = props as RawEpisodeProps;

        // Fetch market data, generate beats
        const beats = await generateBeats(
          rawProps.date,
          rawProps.assets,
          rawProps.lang,
        );

        // Calculate total duration
        const totalFrames = beats.reduce((sum, b) => sum + b.duration, 0);

        return {
          durationInFrames: totalFrames + 60, // Add intro/outro
          props: {
            ...rawProps,
            beats,
            totalFrames,
          } as ProcessedEpisodeProps,
        };
      }}
    />
  );
};
```

---

### 7. Frame-Based Analytics Tracking

Log which beats are rendering (useful for debugging):

```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

const TrackedBeat = ({ beat, index }: { beat: Beat; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSecond = frame / fps;

  // Log once per beat (on first frame of sequence)
  useEffect(() => {
    if (frame === 0) {
      console.log(`[${currentSecond.toFixed(1)}s] Rendering beat #${index}: ${beat.imagePath}`);
    }
  }, [index, beat, frame, currentSecond]);

  return (
    <AbsoluteFill>
      <Img src={staticFile(beat.imagePath)} />
    </AbsoluteFill>
  );
};
```

---

## CLI Best Practices for Your Use Case

### Full Workflow

```bash
# 1. Generate episode data (beats, narration, charts)
npm run generate -- --type daily_recap --lang fr --date 2026-03-19
# Output: episodes/2026/03-19.json

# 2. Test locally with first 50 frames
npx remotion render \
  --composition daily-trading-episode \
  ./src/Root.tsx \
  out/test-draft.mp4 \
  --frames 0-50 \
  --crf 28 \
  --concurrency 4

# 3. Benchmark optimal concurrency
npx remotion benchmark \
  --composition daily-trading-episode \
  ./src/Root.tsx

# 4. Full high-quality render
npx remotion render \
  --composition daily-trading-episode \
  ./src/Root.tsx \
  out/trading-recap-2026-03-19.mp4 \
  --crf 18 \
  --concurrency <optimal> \
  --props '{"date":"2026-03-19","lang":"fr"}'

# 5. Check result
ffprobe out/trading-recap-2026-03-19.mp4 \
  -show_entries format=duration \
  -v quiet -of csv="p=0"
```

---

## Memory Profiling for 100 Images

Monitor during rendering:

```bash
# Enable verbose logging
npx remotion render \
  --composition daily-trading-episode \
  ./src/Root.tsx \
  out/episode.mp4 \
  --log verbose

# Look for:
# - Peak memory usage per frame
# - Slow frames (>1s each)
# - Failed image loads
```

Add instrumentation:

```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

const MemoryTracker = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      console.log(`Frame ${frame}: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }, [frame]);

  return null;
};
```

---

## Summary: Your Safe Pattern

```tsx
// ✓ Safe, tested, optimal for 100 images
<TransitionSeries>
  {beats.map((beat, i) => (
    <React.Fragment key={i}>
      {/* Sequence unmounts outside time range → only 1 image loaded */}
      <TransitionSeries.Sequence durationInFrames={beat.duration}>
        <AbsoluteFill>
          <Img
            src={staticFile(beat.imagePath)}
            delayRenderTimeoutInMilliseconds={3000}
            maxRetries={1}
          />
        </AbsoluteFill>

        {/* Overlays */}
        <AbsoluteFill style={{ padding: '40px' }}>
          <Text>{beat.caption}</Text>
        </AbsoluteFill>
      </TransitionSeries.Sequence>

      {/* Spring transition between beats */}
      {i < beats.length - 1 && (
        <TransitionSeries.Transition
          timing={springTiming({
            durationInFrames: 15,
            damping: 12,
          })}
          presentation={slide({ direction: 'from-right' })}
        />
      )}
    </React.Fragment>
  ))}
</TransitionSeries>

// Render with:
// npx remotion render ... --crf 18 --concurrency 6
```
