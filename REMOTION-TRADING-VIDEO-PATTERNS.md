# Remotion Patterns for Trading YouTube Videos

Specific patterns tailored to your 100-image daily trading video use case.

---

## Architecture: 100 AI-Generated Images → Video Pipeline

### Your Workflow

```
1. Generate 100 AI images (market scenes, charts, patterns)
   ↓
2. Create beats: assign durations, narration, overlays
   ↓
3. Render Remotion composition with TransitionSeries
   ↓
4. Sync with TTS audio (ElevenLabs future)
   ↓
5. Upload to YouTube
```

### Remotion Integration Point

```
beats.json (from AI/LLM)
  ↓
Composition inputs (calculateMetadata)
  ↓
TransitionSeries renders beats sequentially with transitions
  ↓
MP4 output
```

---

## Complete Trading Episode Composition

### 1. Beat Data Structure

```tsx
interface Beat {
  // Image
  imagePath: string;             // e.g., '/backgrounds/beat-001.png'
  imageMetadata?: {
    width: number;
    height: number;
  };

  // Timing
  duration: number;              // frames (e.g., 60 = 2 seconds @ 30fps)
  narrationDurationMs?: number;  // if synced to audio

  // Content
  caption: string;               // e.g., "S&P 500 breaks resistance"
  analysis?: string;             // Deeper commentary
  assetSymbol?: string;          // e.g., 'SPX', 'NVDA'
  assetType?: 'stock' | 'forex' | 'crypto' | 'commodity';

  // Visual
  type?: 'quick-update' | 'deep-dive' | 'event' | 'transition';
  chartData?: ChartData;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  importance?: number;           // 1-10, affects visual weight

  // Causal context (from D3 memory)
  causalChain?: string;          // What triggered this move
  historicalPrecedent?: string;  // Similar patterns
  trendDirection?: 'up' | 'down' | 'sideways';
}

interface EpisodeData {
  date: string;
  lang: 'fr' | 'en';
  beats: Beat[];
  metadata: {
    generateTimestamp: number;
    llmProvider: 'openrouter' | 'anthropic';
    aiModel: string;
  };
}
```

### 2. Main Composition

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { Img, Audio, AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { springTiming, slide } from '@remotion/transitions';
import { staticFile, interpolate, Easing } from 'remotion';

interface DailyTradingEpisodeProps {
  date: string;
  lang: 'fr' | 'en';
  beats: Beat[];
}

export const DailyTradingEpisode: React.FC<DailyTradingEpisodeProps> = ({
  date,
  lang,
  beats,
}) => {
  return (
    <TransitionSeries>
      {/* Intro beat */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <IntroBeat date={date} lang={lang} />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        timing={springTiming({ durationInFrames: 20 })}
        presentation={slide({ direction: 'from-right' })}
      />

      {/* Market beats */}
      {beats.map((beat, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={beat.duration}>
            {beat.type === 'deep-dive' ? (
              <DeepDiveScene beat={beat} />
            ) : (
              <QuickUpdateScene beat={beat} />
            )}
          </TransitionSeries.Sequence>

          {i < beats.length - 1 && (
            <TransitionSeries.Transition
              timing={springTiming({
                durationInFrames: 15,
                damping: 12,
                stiffness: 100,
              })}
              presentation={slide({ direction: 'from-right' })}
            />
          )}
        </React.Fragment>
      ))}

      {/* Outro beat */}
      <TransitionSeries.Transition
        timing={springTiming({ durationInFrames: 20 })}
        presentation={slide({ direction: 'from-right' })}
      />

      <TransitionSeries.Sequence durationInFrames={60}>
        <OutroBeat date={date} lang={lang} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

### 3. Quick Update Scene (Most Beats)

```tsx
const QuickUpdateScene: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in caption during first 15 frames
  const captionOpacity = interpolate(frame, [0, 15], [0, 1], {
    easing: Easing.easeOut,
    extrapolateRight: 'clamp',
  });

  // Subtle Ken Burns (1.05x zoom)
  const scale = interpolate(frame, [0, beat.duration || 60], [1, 1.05], {
    easing: Easing.linear,
    extrapolateRight: 'clamp',
  });

  return (
    <>
      {/* Background image with Ken Burns */}
      <AbsoluteFill>
        <Img
          src={staticFile(beat.imagePath)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
          }}
          delayRenderTimeoutInMilliseconds={2000}
          maxRetries={1}
        />
      </AbsoluteFill>

      {/* Dark overlay for text readability */}
      <AbsoluteFill style={{ background: 'rgba(0, 0, 0, 0.25)' }} />

      {/* Caption bottom-right */}
      <AbsoluteFill style={{
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: '40px',
        opacity: captionOpacity,
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '20px 30px',
          borderRadius: '8px',
          maxWidth: '800px',
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#00b4d8', // Brand cyan
            margin: '0 0 10px 0',
          }}>
            {beat.caption}
          </h2>
          {beat.assetSymbol && (
            <p style={{
              fontSize: 14,
              color: '#ccc',
              margin: 0,
            }}>
              {beat.assetSymbol} • {beat.sentiment?.toUpperCase()}
            </p>
          )}
        </div>
      </AbsoluteFill>

      {/* Sentiment indicator (top-right) */}
      <AbsoluteFill style={{ padding: '40px', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        <SentimentBadge sentiment={beat.sentiment} />
      </AbsoluteFill>
    </>
  );
};

const SentimentBadge: React.FC<{ sentiment?: string }> = ({ sentiment }) => {
  const colors: Record<string, string> = {
    bullish: '#2ecc71',
    bearish: '#e74c3c',
    neutral: '#95a5a6',
  };

  return (
    <div style={{
      background: colors[sentiment || 'neutral'],
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: 12,
      fontWeight: 'bold',
      color: 'white',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    }}>
      {sentiment || 'Neutral'}
    </div>
  );
};
```

### 4. Deep Dive Scene (Important Analysis)

```tsx
const DeepDiveScene: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frame = useCurrentFrame();

  // Fade in analysis text
  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.easeOut,
    extrapolateRight: 'clamp',
  });

  return (
    <>
      {/* Background */}
      <AbsoluteFill>
        <Img src={staticFile(beat.imagePath)} />
      </AbsoluteFill>

      {/* Heavy overlay for deep analysis sections */}
      <AbsoluteFill style={{ background: 'rgba(0, 0, 0, 0.6)' }} />

      {/* Full analysis text panel */}
      <AbsoluteFill style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        opacity: textOpacity,
      }}>
        <h1 style={{
          fontSize: 36,
          color: '#00b4d8',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          {beat.caption}
        </h1>

        <p style={{
          fontSize: 16,
          color: '#fff',
          lineHeight: '1.6',
          maxWidth: '900px',
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          {beat.analysis}
        </p>

        {/* Causal context */}
        {beat.causalChain && (
          <div style={{
            background: 'rgba(0, 180, 216, 0.1)',
            borderLeft: '4px solid #00b4d8',
            padding: '20px',
            marginTop: '20px',
            fontSize: 14,
            color: '#ccc',
            maxWidth: '800px',
          }}>
            <strong>Causal Context:</strong> {beat.causalChain}
          </div>
        )}
      </AbsoluteFill>

      {/* Chart overlay (if available) */}
      {beat.chartData && (
        <AbsoluteFill style={{
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          padding: '40px',
        }}>
          <InkChart data={beat.chartData} width={400} height={300} />
        </AbsoluteFill>
      )}
    </>
  );
};
```

### 5. Intro & Outro Beats

```tsx
const IntroBeat: React.FC<{ date: string; lang: string }> = ({ date, lang }) => {
  const frame = useCurrentFrame();

  // Scale pop animation
  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    easing: Easing.ease,
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0b0f1a 0%, #1a1f2e 100%)',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        opacity,
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 60,
          fontWeight: 'bold',
          color: '#ffd60a',
          marginBottom: '10px',
        }}>
          Daily Market Recap
        </h1>
        <p style={{
          fontSize: 28,
          color: '#00b4d8',
          marginBottom: '30px',
        }}>
          {dateStr}
        </p>
        <p style={{
          fontSize: 16,
          color: '#999',
        }}>
          {lang === 'fr' ? 'Analyse des marchés en direct' : 'Live market analysis'}
        </p>
      </div>

      {/* Animated ticker at bottom */}
      <AbsoluteFill style={{
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: '20px',
        fontSize: 14,
        color: '#666',
      }}>
        Premium market intelligence
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OutroBeat: React.FC<{ date: string; lang: string }> = ({ date, lang }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [1, 0], {
    easing: Easing.easeOut,
    extrapolateLeft: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0b0f1a 0%, #1a1f2e 100%)',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      opacity,
    }}>
      <h2 style={{ fontSize: 32, color: '#00b4d8', marginBottom: '20px' }}>
        Thanks for watching
      </h2>
      <p style={{ fontSize: 16, color: '#ccc' }}>
        {lang === 'fr' ? 'À demain pour une nouvelle analyse' : 'See you tomorrow for the next recap'}
      </p>
      <p style={{ fontSize: 12, color: '#666', marginTop: '40px' }}>
        © 2026 Trading Recap • Not investment advice
      </p>
    </AbsoluteFill>
  );
};
```

---

## Dynamic Duration with calculateMetadata

### Sync to Narration Audio

```tsx
import { getAudioDurationInSeconds } from '@remotion/media-utils';

interface Root {
  children: React.ReactNode;
}

export const Root: Root = () => {
  return (
    <Composition
      id="daily-trading-episode"
      component={DailyTradingEpisode}
      durationInFrames={3600} // fallback
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        date: '2026-03-19',
        lang: 'fr',
        beats: [],
      } as DailyTradingEpisodeProps}
      calculateMetadata={async ({ props, abortSignal }) => {
        // Load episode data for the date
        const episodeData = await fetch(
          `/episodes/${props.date.replace(/-/g, '/')}.json`,
          { signal: abortSignal }
        ).then(r => r.json() as Promise<EpisodeData>);

        // Calculate total frames from beats
        const beatFramesTotal = episodeData.beats.reduce((sum, b) => sum + b.duration, 0);
        // Add transitions: 99 transitions × 15 frames = 1485 frames
        const transitionFramesTotal = (episodeData.beats.length - 1) * 15;
        // But transitions overlap, so subtract overlaps
        // Total = beats + transitions - overlaps = beats + transitions - transitions = beats
        // NO WAIT: transitions are INSERTED between sequences
        // Actual total = intro + beat1 + trans + beat2 + trans + beat3 + ... + outro
        // = 90 + sum(beat durations) + (beats.length - 1) * 15 + 60
        const totalFrames = 90 + beatFramesTotal + (episodeData.beats.length - 1) * 15 + 60;

        return {
          durationInFrames: totalFrames,
          props: {
            ...props,
            beats: episodeData.beats,
          },
        };
      }}
    />
  );
};

export default Root;
```

---

## CLI Rendering Workflow

### Full Production Render

```bash
#!/bin/bash

DATE="2026-03-19"
LANG="fr"
CONCURRENCY=6
CRF=18

echo "Generating trading episode for $DATE..."

# Step 1: Validate composition locally (10 frames only)
echo "Testing composition..."
npx remotion render \
  --composition daily-trading-episode \
  --props "{\"date\":\"$DATE\",\"lang\":\"$LANG\"}" \
  --frames 0-9 \
  ./src/Root.tsx \
  out/test-$DATE.mp4

if [ $? -ne 0 ]; then
  echo "Test render failed. Aborting."
  exit 1
fi

# Step 2: Full render with optimized settings
echo "Rendering full episode..."
npx remotion render \
  --composition daily-trading-episode \
  --props "{\"date\":\"$DATE\",\"lang\":\"$LANG\"}" \
  --concurrency $CONCURRENCY \
  --crf $CRF \
  --codec h264 \
  ./src/Root.tsx \
  out/trading-recap-$DATE.mp4

if [ $? -eq 0 ]; then
  echo "✓ Render complete: out/trading-recap-$DATE.mp4"
  ffprobe out/trading-recap-$DATE.mp4 \
    -show_entries format=duration \
    -v quiet -of csv="p=0" | xargs -I {} echo "Duration: {} seconds"
else
  echo "✗ Render failed"
  exit 1
fi
```

---

## Image Preparation Guidelines

### Beat Image Format

```
Specifications:
- Resolution: 1920×1080 (16:9)
- Format: PNG or JPEG (JPEG preferred for size)
- Color space: sRGB
- Naming: beat-NNN.png (zero-padded, e.g., beat-001.png)
- Batch size: 100 images = ~200-300 MB total

File paths:
public/backgrounds/beat-001.png
public/backgrounds/beat-002.png
...
public/backgrounds/beat-100.png
```

### Ken Burns Configuration Per Beat Type

```tsx
const kenBurnsConfigs: Record<Beat['type'], any> = {
  'quick-update': {
    duration: 60,        // 2 seconds
    zoomStart: 1,
    zoomEnd: 1.05,       // Subtle
    panX: 10,
    panY: -5,
  },
  'deep-dive': {
    duration: 120,       // 4 seconds (longer for analysis)
    zoomStart: 1,
    zoomEnd: 1.15,       // More dramatic
    panX: 30,
    panY: -20,
  },
  'event': {
    duration: 80,
    zoomStart: 1.1,
    zoomEnd: 1.25,       // Start already zoomed
    panX: 40,
    panY: 0,
  },
  'transition': {
    duration: 30,
    zoomStart: 1,
    zoomEnd: 1.02,       // Minimal
    panX: 0,
    panY: 0,
  },
};
```

---

## Performance Tips Specific to Trading Videos

### 1. Batch Process Beats

Render only critical frames during development:

```bash
# First market beat only (helps diagnose issues)
npx remotion render \
  --composition daily-trading-episode \
  --frames 90-150 \
  ./src/Root.tsx out/beat1.mp4

# Multiple sections
npx remotion render \
  --composition daily-trading-episode \
  --frames 0-500 \     # Intro + first 5 beats
  ./src/Root.tsx out/section1.mp4
```

### 2. Memory Optimization

For 100 images on limited RAM:

```bash
npx remotion render \
  --composition daily-trading-episode \
  --concurrency 4 \               # Fewer threads = less memory
  --disallow-parallel-encoding \  # Sequential encode saves RAM
  ./src/Root.tsx out/episode.mp4
```

### 3. Precompute Expensive Operations

If calculating sentiment/causal chains during render:

```tsx
// Bad: Computed in render function, every frame
const MyScene = ({ beat }: { beat: Beat }) => {
  const sentiment = analyzeSentiment(beat.caption); // 100x per beat!
  // ...
};

// Good: Precomputed in beat generation
interface Beat {
  // ...
  sentiment: 'bullish' | 'bearish' | 'neutral'; // Pre-computed
}

// Use directly
<SentimentBadge sentiment={beat.sentiment} />
```

---

## Audio Sync (Future TTS Integration)

### Structure for ElevenLabs Integration

```tsx
interface BeatWithAudio extends Beat {
  audioPath: string;             // e.g., '/audio/beat-001.mp3'
  audioDurationMs: number;       // From ElevenLabs API response
}

const AudioSyncedEpisode: React.FC<{
  beats: BeatWithAudio[];
}> = ({ beats }) => {
  const { fps } = useVideoConfig();
  let currentFrame = 0;

  return (
    <TransitionSeries>
      {/* Intro */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <IntroBeat />
        <Audio src={staticFile('/audio/intro.mp3')} />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition ... />

      {/* Market beats synced to audio */}
      {beats.map((beat, i) => {
        const durationInFrames = Math.ceil((beat.audioDurationMs / 1000) * fps);

        return (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              <QuickUpdateScene beat={beat} />
              <Audio src={staticFile(beat.audioPath)} />
            </TransitionSeries.Sequence>

            {i < beats.length - 1 && <TransitionSeries.Transition ... />}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};
```

---

## Summary: Copy-Paste Template

Start with this template and customize:

```tsx
// src/Root.tsx
import { Composition } from 'remotion';
import { DailyTradingEpisode, DailyTradingEpisodeProps } from './compositions/DailyTradingEpisode';

export const Root = () => {
  return (
    <Composition
      id="daily-trading-episode"
      component={DailyTradingEpisode}
      durationInFrames={3600}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        date: '2026-03-19',
        lang: 'fr',
        beats: [],
      } as DailyTradingEpisodeProps}
      calculateMetadata={async ({ props, abortSignal }) => {
        const episodeData = await fetch(
          `/episodes/${props.date.replace(/-/g, '/')}.json`,
          { signal: abortSignal }
        ).then(r => r.json());

        const totalFrames = 90 +
          episodeData.beats.reduce((sum: number, b: any) => sum + b.duration, 0) +
          (episodeData.beats.length - 1) * 15 + 60;

        return {
          durationInFrames: totalFrames,
          props: { ...props, beats: episodeData.beats },
        };
      }}
    />
  );
};

export default Root;
```

```bash
# Render
npx remotion render \
  --composition daily-trading-episode \
  --concurrency 6 \
  --crf 18 \
  ./src/Root.tsx \
  out/trading-recap-2026-03-19.mp4
```

Done! Your 100-image trading video pipeline.
