# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TradingRecap** — Automated trading YouTube video generator. Fetches market data, generates narration scripts via LLM, and renders videos using Remotion. French daily market recaps, English ready to activate.

**Blueprint** : `BLUEPRINT.md` est le document de direction du projet. Le relire avant toute implementation significative.

## Commands

```bash
# Full pipeline: fetch → script → render
npm run generate -- --type daily_recap --lang fr --date 2026-02-19

# Individual steps
npm run fetch -- --date 2026-02-19          # Market data → data/snapshot-DATE.json
npm run script -- --data ./data/snapshot-2026-02-19.json --lang fr  # Script → data/script-DATE.json
npm run render -- --episode ./episodes/2026/02-19.json              # Video → out/episode-DATE.mp4

# Development & testing
npm run dev          # Remotion Studio (localhost:3000)
npm run preview      # Also opens Remotion Studio
npm run studio       # Prompt Studio web UI (localhost:3030)
npm run prompt-test -- --data ./data/snapshot-2026-02-19.json --lang fr --save
npm run typecheck    # TypeScript validation across all packages
```

## Architecture

Turbo monorepo with npm workspaces. All packages under `packages/` with `@yt-maker/*` scope.

### Pipeline Flow (current)

```
Yahoo Finance + RSS → DailySnapshot → OpenRouter LLM → EpisodeScript → Remotion → MP4
```

### Pipeline Flow (target — see BLUEPRINT.md)

```
Yahoo+CoinGecko+FRED+RSS → EnrichedSnapshot → Haiku+Sonnet+Opus → EnrichedEpisodeScript → TTS → Remotion → YouTube
```

### Packages

- **`@yt-maker/core`** — Types (`types.ts`), design tokens (`brand.ts`), layout engine (`layout.ts`), animations (`animations.ts`)
- **`@yt-maker/data`** — Yahoo Finance (`yahoo.ts`), RSS news (`news.ts`), calendar stub (`calendar.ts`), orchestrator (`market-snapshot.ts`)
- **`@yt-maker/ai`** — LLM client (`llm-client.ts`), script generator (`script-generator.ts`), prompts (`prompts/`), episode history (`episode-history.ts`)
- **`@yt-maker/remotion-app`** — Compositions (`Root.tsx`, `DailyRecapEpisode.tsx`), 7 scenes, 4 shared components, fixtures

### LLM Strategy

- **Dev/test** : OpenRouter with free model fallback chain (llama, qwen, gemini-lite). Env: `OPENROUTER_API_KEY`
- **Production** (planned) : Anthropic API (Haiku/Sonnet/Opus per task). Env: `ANTHROPIC_API_KEY`
- Switch via `LLM_PROVIDER=anthropic|openrouter` in `.env`
- Single interface: `generateStructuredJSON<T>(systemPrompt, userMessage)`

## Key Types (in `core/types.ts`)

- `DailySnapshot` — Bundle of assets, news, economic events
- `EpisodeScript` — Video script with ordered `ScriptSection[]`
- `AssetSnapshot` — Single instrument: symbol, price, change%, candles
- `ScriptSection` — Narration text, duration, visual cues per scene
- `VisualCue` — Rendering instructions
- `SectionType` — intro | previously_on | market_overview | deep_dive | news | predictions | outro

## Key Design Decisions

- **Default watchlist** in `data/yahoo.ts`: Gold, EUR/USD, USD/JPY, GBP/USD, Bitcoin, S&P 500, Dollar Index, Crude Oil
- **Video**: 1920x1080 @ 30fps, h264, CRF 18
- **Pacing**: ~150 words per 60 seconds, 8-10 min total across 6-7 sections
- **Brand**: Primary cyan `#00b4d8`, gold `#ffd60a`, dark `#0b0f1a`. Full tokens in `core/brand.ts`
- **Compliance**: AMF / MiFID II strict — no investment advice, conditional language only, permanent disclaimer

## Environment

```
OPENROUTER_API_KEY=sk-or-v1-...    # Required (dev/test)
ANTHROPIC_API_KEY=sk-ant-...        # Planned (production)
ELEVENLABS_API_KEY=...              # Phase TTS
ELEVENLABS_VOICE_ID=...             # Phase TTS
DISCORD_WEBHOOK_URL=...             # Phase automation
```

## Output Structure

- `data/snapshot-*.json` — Raw market snapshots
- `data/script-*.json` — Generated scripts
- `episodes/YYYY/MM-DD.json` — Complete episode data
- `episodes/manifest.json` — Episode index
- `out/episode-*.mp4` — Rendered videos
