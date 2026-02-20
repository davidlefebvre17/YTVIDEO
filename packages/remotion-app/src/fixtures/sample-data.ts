/**
 * Preview data for Remotion Studio.
 *
 * To preview a different episode, change PREVIEW_DATE below.
 * The corresponding snapshot-DATE.json and script-DATE.json must exist in /data/.
 */

import type { AssetSnapshot, NewsItem, EpisodeScript } from "@yt-maker/core";

// ── Change this to preview a different date ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const scriptRaw = require("../../../../data/script-2026-02-19.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const snapshotRaw = require("../../../../data/snapshot-2026-02-19.json");

export const SAMPLE_SCRIPT: EpisodeScript = scriptRaw as EpisodeScript;
export const SAMPLE_ASSETS: AssetSnapshot[] = (snapshotRaw.assets ?? []) as AssetSnapshot[];
export const SAMPLE_NEWS: NewsItem[] = (snapshotRaw.news ?? []) as NewsItem[];
