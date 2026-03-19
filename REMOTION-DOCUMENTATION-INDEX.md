# Remotion 4.0.425 Documentation Index

Complete reference materials for building a 100-image trading YouTube video generator with Remotion.

---

## Document Overview

### 1. **REMOTION-COMPREHENSIVE-GUIDE.md** (Primary Reference)
   **13 major sections covering core Remotion APIs**

   - **Section 1**: @remotion/transitions — All 6 transition types (fade, slide, wipe, flip, clockWipe, iris), timing functions (springTiming, linearTiming)
   - **Section 2**: staticFile() & <Img> — Loading 100+ background images, batch patterns, best practices for many images
   - **Section 3**: spring() — Physics-based animations, all config options (damping, stiffness, mass, overshootClamping), presets
   - **Section 4**: interpolate() — Value mapping, all easing functions, extrapolation modes (extend, clamp, wrap, identity)
   - **Section 5**: <Series> & <Sequence> — Layout & timing components, from/durationInFrames/layout props, offset semantics
   - **Section 6**: <AbsoluteFill> — Stacking, positioning, style props, Tailwind integration (v4.0.249+)
   - **Section 7**: delayRender() / continueRender() — Async image loading, useDelayRender() hook, timeout management
   - **Section 8**: <OffthreadVideo> & <Audio> — FFmpeg frame extraction, audio pitch/volume, TTS integration prep
   - **Section 9**: calculateMetadata() — Dynamic duration, prop transformation, async execution
   - **Section 10**: npx remotion render CLI — All flags, concurrency, quality settings, frame ranges
   - **Section 11**: Ken Burns effect — Slow zoom + pan on static images, implementation with interpolate()
   - **Section 12**: Performance optimization — Memory management, image preloading, codec choices, 100+ image rendering
   - **Section 13**: Summary pattern for your use case

   **Use this for**: Deep understanding of each API, code examples for every feature, gotchas and best practices

### 2. **REMOTION-ADVANCED-PATTERNS.md** (Problem Solving)
   **10 critical gotchas + 7 advanced patterns**

   - **Gotchas**:
     1. TransitionSeries duration math (overlapping vs sequential)
     2. Image loading order (lazy vs eager)
     3. Tailwind CSS conflicts in AbsoluteFill
     4. staticFile() double-encoding trap
     5. Extrapolation mode confusion
     6. Spring animation overshooting
     7. Sequence "from" vs "offset" confusion
     8. <Img> retry and timeout stacking
     9. Ken Burns effect causing blur
     10. useCurrentFrame() stale closure

   - **Advanced Patterns**:
     1. Computed beat timing (importance-based durations)
     2. Staggered image loading with useDelayRender
     3. Dynamic narration sync (audio + beat)
     4. Conditional rendering based on beat properties
     5. Memoized data transformation (useMemo)
     6. Render-time props transformation (calculateMetadata)
     7. Frame-based analytics tracking

   **Use this for**: Debugging unexpected behavior, optimizing performance, solving complex timing issues

### 3. **REMOTION-QUICK-REFERENCE.md** (Cheat Sheet)
   **Fast lookup tables and copy-paste snippets**

   - **API Quick Lookup**: All imports, organized by category
   - **Timing Reference**: Frame/time conversions, FPS math, transition duration formulas
   - **Component Quick Syntax**: Every component's props and defaults
   - **Animation Formulas**: spring(), interpolate(), interpolateColors() signatures
   - **Easing Functions Table**: All 20+ easing options with examples
   - **TransitionSeries Syntax**: Presentations, timings, overlays
   - **staticFile() Rules**: Directory structure, naming, encoding
   - **Calculation Helpers**: Duration math, frame padding
   - **CLI Command Cheat Sheet**: render, benchmark, studio with common flags
   - **Props & Type Safety**: Composition props, calculateMetadata
   - **Common Patterns**: 100 beats, fade, slide, Ken Burns, spring pop
   - **Performance Rules**: Concurrency, GPU effects, memory
   - **Debugging**: Frame duration check, verbose logs, frame range testing

   **Use this for**: Quick syntax lookup, copy-paste starters, finding CLI flags without searching docs

### 4. **REMOTION-TRADING-VIDEO-PATTERNS.md** (Your Use Case)
   **Complete trading video architecture + full compositions**

   - **Beat Data Structure**: Complete TypeScript interface with all fields
   - **Main Composition**: Full DailyTradingEpisode component structure
   - **Quick Update Scene**: Most common beat type (image + caption + sentiment)
   - **Deep Dive Scene**: Analysis-heavy beats with text, causal context, charts
   - **Intro & Outro Beats**: Branded opening/closing with animations
   - **calculateMetadata Integration**: Sync to narration, dynamic duration
   - **CLI Workflow**: Bash script for test → full render pipeline
   - **Image Preparation**: Format specs, naming convention, Ken Burns configs per beat type
   - **Performance Tips**: Batch processing, memory optimization, pre-computation
   - **Audio Sync (Future)**: ElevenLabs integration structure
   - **Copy-Paste Template**: Ready-to-use Root.tsx + render command

   **Use this for**: Building your actual composition, understanding your specific architecture

---

## Quick Start by Task

### "I need to load 100 background images"
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 2 (staticFile & <Img>)
→ **REMOTION-QUICK-REFERENCE.md** (staticFile Rules)

### "My transitions don't have the right duration"
→ **REMOTION-ADVANCED-PATTERNS.md** § 1.1 (TransitionSeries Duration Math)
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 1 (Transition Timing Math)

### "I'm getting memory errors rendering 100 images"
→ **REMOTION-ADVANCED-PATTERNS.md** § 2.2 (Image Loading Order)
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 12 (Performance Optimization)

### "How do I implement a Ken Burns zoom effect?"
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 11 (Ken Burns Effect)
→ **REMOTION-TRADING-VIDEO-PATTERNS.md** (Ken Burns configs per beat)

### "I need to sync narration audio to beats"
→ **REMOTION-ADVANCED-PATTERNS.md** § 3 (Dynamic Narration Sync)
→ **REMOTION-TRADING-VIDEO-PATTERNS.md** (Audio Sync section)

### "What CLI flags should I use for rendering?"
→ **REMOTION-QUICK-REFERENCE.md** (CLI Command Cheat Sheet)
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 10 (npx remotion render)

### "My spring animation is bouncing too much"
→ **REMOTION-ADVANCED-PATTERNS.md** § 6 (Spring Overshooting)
→ **REMOTION-COMPREHENSIVE-GUIDE.md** § 3 (spring() Config)

### "How do I structure my entire trading video composition?"
→ **REMOTION-TRADING-VIDEO-PATTERNS.md** (Complete Architecture)
→ Copy the template at the end

---

## Remotion Version: 4.0.425

Your project uses Remotion 4.0.425, which includes:
- ✓ TransitionSeries with springTiming/linearTiming
- ✓ Improved OffthreadVideo (FFmpeg C API)
- ✓ Tailwind CSS conflict detection in AbsoluteFill (v4.0.249+)
- ✓ Modern interpolate() with all easing functions
- ✓ calculateMetadata() for dynamic composition

All code examples in these docs are written for v4.0.425.

---

## Core Concepts Summary

### Timeline & Sequences
- **Sequence**: Single time block, displays content from frame N for D frames
- **Series**: Container for multiple Sequences that play sequentially
- **TransitionSeries**: Extended Series with built-in transitions between scenes
- **Transition**: Animated crossfade/slide/wipe between two sequences (overlaps them)
- **Overlay**: Effect at cut point without changing duration

### Animations
- **spring()**: Physics-based bouncy animation (configurable damping/stiffness)
- **interpolate()**: Linear value mapping with easing and extrapolation
- **interpolateColors()**: Color interpolation from one value to another

### Assets
- **staticFile()**: Convert public/ folder file to URL (required for Remotion)
- **<Img>**: Auto-delay rendering until image loads, built-in retry logic
- **<Audio>**: Play sound track during sequence
- **<OffthreadVideo>**: Extract frames from video via FFmpeg, not browser playback

### Layout
- **<AbsoluteFill>**: Fills entire frame, absolutely positioned, stacking via DOM order
- **layout="absolute-fill"**: Sequences overlay each other
- **layout="none"**: You handle positioning

### Performance
- Unmounting outside sequence time range = lazy image loading
- 100 images = only 1-2 in memory at once
- Concurrency 6 is typically optimal (less than CPU cores)
- H.264 codec balances speed and quality

---

## API Reference Links

### Official Remotion Docs
- [Remotion Home](https://www.remotion.dev/)
- [Transitions](https://www.remotion.dev/docs/transitions/)
- [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries)
- [spring()](https://www.remotion.dev/docs/spring)
- [interpolate()](https://www.remotion.dev/docs/interpolate)
- [interpolateColors()](https://www.remotion.dev/docs/interpolate-colors)
- [Easing](https://www.remotion.dev/docs/easing)
- [<Sequence>](https://www.remotion.dev/docs/sequence)
- [<Series>](https://www.remotion.dev/docs/series)
- [<AbsoluteFill>](https://www.remotion.dev/docs/absolute-fill)
- [staticFile()](https://www.remotion.dev/docs/staticfile)
- [<Img>](https://www.remotion.dev/docs/img)
- [delayRender/continueRender](https://www.remotion.dev/docs/delay-render)
- [<OffthreadVideo>](https://www.remotion.dev/docs/offthreadvideo)
- [calculateMetadata()](https://www.remotion.dev/docs/calculate-metadata)
- [npx remotion render](https://www.remotion.dev/docs/cli/render)
- [Performance Tips](https://www.remotion.dev/docs/performance)
- [Timing Editor](https://www.remotion.dev/timing-editor) (interactive spring/easing playground)

---

## File Locations in Your Project

```
trading-youtube-maker/
├── REMOTION-COMPREHENSIVE-GUIDE.md        ← Main API reference
├── REMOTION-ADVANCED-PATTERNS.md          ← Gotchas & solutions
├── REMOTION-QUICK-REFERENCE.md            ← Cheat sheet
├── REMOTION-TRADING-VIDEO-PATTERNS.md     ← Your use case
├── REMOTION-DOCUMENTATION-INDEX.md        ← This file
├── packages/
│   └── remotion-app/
│       ├── src/
│       │   ├── Root.tsx                   ← Composition registration
│       │   ├── compositions/
│       │   │   ├── DailyRecapEpisode.tsx
│       │   │   └── NewspaperEpisode.tsx
│       │   └── scenes/
│       │       ├── ColdOpenScene.tsx
│       │       ├── ThreadScene.tsx
│       │       └── ...
│       └── public/
│           └── backgrounds/               ← Your 100 beat images
│               ├── beat-001.png
│               ├── beat-002.png
│               └── ...
└── out/
    └── episode.mp4                        ← Rendered output
```

---

## Recommended Reading Order

1. **First time using Remotion?**
   - Start: REMOTION-QUICK-REFERENCE.md (get oriented)
   - Then: REMOTION-COMPREHENSIVE-GUIDE.md § 1-6 (core components)
   - Practice: Build a simple 3-beat composition

2. **Building your trading video?**
   - Read: REMOTION-TRADING-VIDEO-PATTERNS.md (full architecture)
   - Reference: REMOTION-COMPREHENSIVE-GUIDE.md (details as needed)
   - Troubleshoot: REMOTION-ADVANCED-PATTERNS.md (gotchas)

3. **Optimization time?**
   - Check: REMOTION-COMPREHENSIVE-GUIDE.md § 12 (performance)
   - Avoid: REMOTION-ADVANCED-PATTERNS.md (all 10 gotchas)
   - Benchmark: CLI section in REMOTION-QUICK-REFERENCE.md

4. **Rendering production videos?**
   - Use: CLI Workflow in REMOTION-TRADING-VIDEO-PATTERNS.md
   - Flags: REMOTION-QUICK-REFERENCE.md (CLI Command Cheat Sheet)
   - Monitor: Debugging section in REMOTION-QUICK-REFERENCE.md

---

## Testing Your Setup

Validate your Remotion environment:

```bash
# Test import
npm list remotion @remotion/cli @remotion/transitions

# Version check
npx remotion --version

# Test rendering (10 frames only)
npx remotion render --frames 0-9 ./src/Root.tsx out/test.mp4

# Open studio
npx remotion studio
```

---

## Common Questions Answered

**Q: Which transition should I use for trading videos?**
A: slide({ direction: 'from-right' }) is most professional. Use 15-20 frame duration, springTiming with damping: 12.

**Q: How do I avoid blurry Ken Burns zoom?**
A: Use high-res images (4K source) and limit zoom to 1.1-1.15x. See REMOTION-ADVANCED-PATTERNS.md § 9.

**Q: What concurrency should I use?**
A: Run `npx remotion benchmark` to find optimal. Usually 6-8 threads on modern CPU.

**Q: Can I sync narration audio to beats?**
A: Yes. Use calculateMetadata() to get audio duration and set durationInFrames per beat. See REMOTION-TRADING-VIDEO-PATTERNS.md.

**Q: How many images can I render in one video?**
A: Tested with 100+. Use <Sequence> to lazy-load (unmounts outside time range).

**Q: Should I use H.264 or H.265?**
A: H.264 for compatibility/speed. H.265 for 50% smaller files (slower to render).

---

## Version History of These Docs

- **v1.0** (2026-03-19): Initial comprehensive Remotion 4.0.425 documentation
  - 4 detailed markdown files
  - 13 major API sections
  - 100+ code examples
  - Trading video use case patterns
  - Complete quick reference and cheat sheets

---

## Contact & References

### For Remotion Help
- Official docs: https://www.remotion.dev/docs/
- Discord: https://discord.gg/remotion
- GitHub: https://github.com/remotion-dev/remotion

### For Your Project
- BLUEPRINT.md: High-level project direction
- packages/ai/: LLM pipeline and prompts
- packages/data/: Market data fetching
- packages/remotion-app/: Your Remotion compositions

---

## License & Attribution

These docs are based on official Remotion documentation (4.0.425) from https://www.remotion.dev/ and customized for your trading YouTube video use case.

---

**Last Updated**: 2026-03-19
**Remotion Version**: 4.0.425
**Status**: Complete & tested
