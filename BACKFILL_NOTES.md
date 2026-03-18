# News Memory Backfill (D2) — Implementation Summary

## Files Modified/Created

### 1. `scripts/backfill-news.ts` (NEW)
- Complete rewrite per D2-NEWS-MEMORY-SPEC.md § 9
- **Step 1**: Backfill from existing `data/snapshot-*.json` files (automatic)
  - Extracts news items from each snapshot
  - Tags articles using `tagArticleAuto()` (3-layer algorithm)
  - Stores in SQLite with URL deduplication
  - Result: 3,105 new articles from 6,927 processed across 16 snapshots
  
- **Step 2**: Finnhub company-news historical fetch (optional `--finnhub`)
  - Filters watchlist to equity symbols only
  - Fetches 6-month window via `/company-news` endpoint
  - Rate-limited to 60 req/min with 500ms batch delays
  
- **Step 3**: Marketaux 30-day backfill (optional `--marketaux`)
  - Last 30 days, 1 request per day
  - ~90 requests total (respects 100 req/day quota)

### 2. `packages/data/src/index.ts` (MODIFIED)
- Added export: `fetchFinnhubCompanyNews` (was internal-only)
- Now available to backfill script

## Usage

```bash
# Snapshots only (default)
npm run backfill-news

# With all options
npm run backfill-news -- --finnhub --marketaux --verbose

# Single steps
npm run backfill-news -- --finnhub          # Snapshots + Finnhub
npm run backfill-news -- --marketaux        # Snapshots + Marketaux
```

## Database Output

- **Location**: `data/news-memory.db` (SQLite)
- **Size**: 4.5 MB (3,105 articles indexed + FTS5)
- **Schema**: 
  - `articles` table with URL dedup
  - `article_assets` (Many-to-many with asset tags)
  - `article_themes` (Many-to-many with macro themes)
  - `article_fts` (FTS5 full-text search on title + summary)
  - `economic_events` (sync from Supabase)

## Features

✓ Idempotent — can run multiple times safely (URL UNIQUE constraint)
✓ Deduplication — removes tracking params (utm_*, ref, mod)
✓ Progress reporting — real-time status per source
✓ Error handling — graceful fallback per symbol/date
✓ Rate limiting — respects API quotas
✓ Integration ready — exports `NewsMemoryDB.getStats()` for validation

## Testing

```bash
npm run typecheck       # ✓ Passes
npm run backfill-news   # ✓ Works (creates db/news-memory.db)
```

## Next Steps

1. Integrate `buildResearchContext()` in `generateScript()` to add historical context
2. Import `NewsMemoryDB` in pipeline for daily tagging (call `storeArticle()` after each news fetch)
3. Run weekly `purgeOldArticles(180)` for retention (6-month window)

## Notes

- **Tagger initialization**: Loads 763 company profiles + 41 watchlist items at startup (~1s)
- **Spec compliance**: Implements all 3 layers per D2-NEWS-MEMORY-SPEC.md § 4
  - Layer 1: Direct asset matching (477 rules)
  - Layer 2: Causal rules (20 rules: monetary policy, earnings, commodities, etc.)
  - Layer 3: Metadata source (5 rules for tier-based defaults)
- **Finnhub function**: `fetchFinnhubCompanyNews()` processes batches of symbols, respects rate limits
