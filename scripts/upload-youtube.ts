/**
 * Upload an episode to YouTube.
 *
 * Usage :
 *   npm run publish -- --date 2026-04-28                              # default privacy + schedule from env
 *   npm run publish -- --date 2026-04-28 --privacy unlisted           # override default privacy
 *   npm run publish -- --date 2026-04-28 --publish-at 2026-05-07T07:00:00+02:00   # explicit ISO schedule
 *   npm run publish -- --date 2026-04-28 --no-schedule                # ignore env scheduling
 *   npm run publish -- --date 2026-04-28 --dry-run                    # validate inputs, no API call
 *   npm run publish -- --auth                                          # OAuth interactive flow (one-time)
 *
 * Default video privacy is **unlisted** so the user can share by link with friends/testers
 * without the video being publicly indexed. Override with --privacy private | public.
 *
 * Reads :
 * - episodes/YYYY/MM-DD/script.json — uses script.seo (P10 output) if present
 * - episodes/YYYY/MM-DD/episode-DATE.mp4 OR out/episode-DATE.mp4
 * - episodes/YYYY/MM-DD/thumbnail.png (optional, requires verified channel)
 * - episodes/YYYY/MM-DD/episode-DATE.vtt (optional, FR subtitles via Echogarden)
 *
 * Quota cost : 1600 units per upload (10000/day quota = ~6 uploads/day max).
 *
 * ════════════════════════════════════════════════════════════════════════
 * COMPLIANCE POLICY — Owl Street Journal
 * ════════════════════════════════════════════════════════════════════════
 * Decisions documented based on YouTube Help (support.google.com/youtube/answer/14328491)
 * + research deep-dive 2026-05-04. Re-evaluate if production stack changes.
 *
 * 1. Made for kids (COPPA)             → FALSE
 *    Finance content for adults; not designed for children.
 *    → Auto-set via API: status.selfDeclaredMadeForKids = false
 *
 * 2. Altered content / Contenu modifié → "NON" (verdict from official examples)
 *    The 3 modal questions ALL require "realistic content that could mislead viewers" :
 *      a) Real person saying/doing things they didn't → ❌ no impersonation, owl is fictional
 *      b) Modified images of real event/place        → ❌ all data + footage genuine
 *      c) Realistic-looking scene that didn't happen → ❌ owl mascot is clearly animated
 *
 *    The voice is Fish Audio "Voix Homme 10" (ID accc8ea9...) — a generic synthetic voice
 *    by user "DigitalCreator", NOT a clone of a real person. Per YouTube examples list :
 *      - "Clonage de la voix d'UNE AUTRE PERSONNE" → requires disclosure
 *      - "Clonage de SA PROPRE voix"               → exempt
 *      - Generic synthetic voice (this case)       → exempt (no person identifiable)
 *
 *    → API cannot set this field; user must verify in Studio if asked.
 *    → Reminder printed after each upload.
 *
 * 3. Default privacy                   → UNLISTED (or scheduled)
 *    Allows sharing the link with friends/reviewers without public indexing.
 *    → Auto-set via env: YOUTUBE_DEFAULT_PRIVACY=unlisted
 *    → If YOUTUBE_PUBLISH_HOUR_CET is set, privacy is forced to 'private' and
 *      the video drops public automatically at that hour (Europe/Paris timezone).
 *      Default 7h CET = morning recap, before EU market open at 9h.
 *
 * 4. Category                          → 25 (News & Politics)
 *    Daily market recap fits News & Politics taxonomy.
 *    → Auto-set in snippet.categoryId
 *
 * 5. Default language                  → fr (French)
 *    → Auto-set in snippet.defaultLanguage + defaultAudioLanguage
 *
 * If voice changes (clone of real person), or content uses deepfake/face-swap/synthetic-events,
 * re-evaluate disclosure decision and update this block.
 * ════════════════════════════════════════════════════════════════════════
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getYoutubeClient, runInteractiveAuth, MissingCredentialsError } from './youtube/auth';
import { refreshChaptersFromVTT, patchDescriptionChapters } from './youtube/chapter-resolver';
import type { EpisodeScript, EpisodeSEO } from '@yt-maker/core';

type Privacy = 'private' | 'unlisted' | 'public';

interface CLIArgs {
  date?: string;
  privacy?: Privacy;
  dryRun: boolean;
  auth: boolean;
  videoPath?: string;
  scriptPath?: string;
  thumbnailPath?: string;
  noThumbnail: boolean;
  captionsPath?: string;
  noCaptions: boolean;
  captionsOnly?: string;   // video ID — only replace captions on existing video
  publishAt?: string;      // ISO 8601 datetime — schedules public release; forces privacy=private
  noSchedule: boolean;     // disable scheduling even if env var YOUTUBE_PUBLISH_HOUR_CET is set
}

function parseArgs(argv: string[]): CLIArgs {
  const out: CLIArgs = { dryRun: false, auth: false, noThumbnail: false, noCaptions: false, noSchedule: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--date' && next) { out.date = next; i++; }
    else if (arg === '--privacy' && next) {
      if (!['private', 'unlisted', 'public'].includes(next)) {
        throw new Error(`Invalid --privacy "${next}". Must be private | unlisted | public.`);
      }
      out.privacy = next as Privacy;
      i++;
    }
    else if (arg === '--video' && next) { out.videoPath = next; i++; }
    else if (arg === '--script' && next) { out.scriptPath = next; i++; }
    else if (arg === '--thumbnail' && next) { out.thumbnailPath = next; i++; }
    else if (arg === '--no-thumbnail') out.noThumbnail = true;
    else if (arg === '--captions' && next) { out.captionsPath = next; i++; }
    else if (arg === '--no-captions') out.noCaptions = true;
    else if (arg === '--captions-only' && next) { out.captionsOnly = next; i++; }
    else if (arg === '--publish-at' && next) { out.publishAt = next; i++; }
    else if (arg === '--no-schedule') out.noSchedule = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--auth') out.auth = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function printHelp() {
  console.log(`
Usage: npm run publish -- [options]

Options :
  --date YYYY-MM-DD     Episode date (e.g. 2026-04-28)
  --privacy <p>         private | unlisted | public  (default: $YOUTUBE_DEFAULT_PRIVACY or "private")
  --video <path>        Override path to MP4 (default: out/episode-YYYY-MM-DD.mp4)
  --script <path>       Override path to script.json (default: episodes/YYYY/MM-DD/script.json)
  --thumbnail <path>    Override path to thumbnail PNG (default: episodes/YYYY/MM-DD/thumbnail.png)
  --no-thumbnail        Skip thumbnail upload even if PNG exists
  --captions <path>     Override path to VTT subtitles (default: episodes/YYYY/MM-DD/episode-DATE.vtt)
  --no-captions         Skip captions upload even if VTT exists
  --captions-only <id>  Replace captions on an existing video (id = YouTube video ID), no video upload
  --publish-at <ISO>    Schedule public release at ISO 8601 datetime (e.g. 2026-05-07T07:00:00+02:00).
                        Forces privacy=private until then. Overrides $YOUTUBE_PUBLISH_HOUR_CET.
  --no-schedule         Disable scheduling even if $YOUTUBE_PUBLISH_HOUR_CET is set in .env
  --dry-run             Validate inputs and print metadata without uploading
  --auth                One-time OAuth consent flow to obtain refresh token
  --help                Show this help

Env vars :
  YOUTUBE_DEFAULT_PRIVACY    private | unlisted | public  (default: private)
  YOUTUBE_PLAYLIST_ID        if set, video is auto-added to this playlist
  YOUTUBE_PUBLISH_HOUR_CET   if set (0-23), schedule public release at next occurrence of that
                             hour in Europe/Paris timezone (handles CET/CEST DST automatically)

Examples :
  npm run publish -- --date 2026-04-28
  npm run publish -- --date 2026-04-28 --privacy unlisted
  npm run publish -- --date 2026-04-28 --publish-at 2026-05-07T07:00:00+02:00
  npm run publish -- --date 2026-04-28 --no-schedule         # ignore env hour
  npm run publish -- --auth
`);
}

function projectRoot(): string {
  return path.resolve(__dirname, '..');
}

function resolvePaths(args: CLIArgs): { videoPath: string; scriptPath: string; date: string; thumbnailPath?: string; captionsPath?: string } {
  if (!args.date && (!args.videoPath || !args.scriptPath)) {
    throw new Error('Either --date is required, or both --video and --script must be provided.');
  }
  const date = args.date ?? '';
  const root = projectRoot();

  const [y, m, d] = date.split('-');
  const episodeDir = date ? path.join(root, 'episodes', y!, `${m}-${d}`) : '';
  const scriptPath = args.scriptPath
    ?? (date ? path.join(episodeDir, 'script.json') : '');

  // Look for MP4 in : 1) explicit override, 2) episodes/YYYY/MM-DD/, 3) out/
  let videoPath = args.videoPath ?? '';
  if (!videoPath && date) {
    const candidates = [
      path.join(episodeDir, `episode-${date}.mp4`),
      path.join(root, 'out', `episode-${date}.mp4`),
    ];
    videoPath = candidates.find(p => fs.existsSync(p)) ?? candidates[0]!;
  }

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`script.json not found: ${scriptPath}`);
  }
  if (!fs.existsSync(videoPath)) {
    throw new Error(`MP4 not found: ${videoPath}\n(generate it with \`npm run generate\` or \`npx remotion render ...\`)`);
  }

  // Thumbnail: explicit override > episode folder > undefined
  let thumbnailPath: string | undefined;
  if (!args.noThumbnail) {
    if (args.thumbnailPath) {
      thumbnailPath = args.thumbnailPath;
    } else if (date) {
      const candidate = path.join(episodeDir, 'thumbnail.png');
      if (fs.existsSync(candidate)) thumbnailPath = candidate;
    }
    if (thumbnailPath && !fs.existsSync(thumbnailPath)) {
      console.warn(`  ⚠ Thumbnail path doesn't exist: ${thumbnailPath} — skipping`);
      thumbnailPath = undefined;
    }
  }

  // Captions: explicit override > episode folder > undefined
  let captionsPath: string | undefined;
  if (!args.noCaptions) {
    if (args.captionsPath) {
      captionsPath = args.captionsPath;
    } else if (date) {
      const candidate = path.join(episodeDir, `episode-${date}.vtt`);
      if (fs.existsSync(candidate)) captionsPath = candidate;
    }
    if (captionsPath && !fs.existsSync(captionsPath)) {
      console.warn(`  ⚠ Captions path doesn't exist: ${captionsPath} — skipping`);
      captionsPath = undefined;
    }
  }

  return { videoPath, scriptPath, date, thumbnailPath, captionsPath };
}

function buildMetadata(script: EpisodeScript): {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
} {
  const seo: EpisodeSEO | undefined = script.seo;

  if (seo) {
    return {
      title: seo.title,
      description: seo.description,
      tags: seo.tags,
      hashtags: seo.hashtags,
    };
  }

  // Fallback : C3 title/description without SEO optimisation
  console.warn('  ⚠ No script.seo found — falling back to C3 title/description (less optimised).');
  return {
    title: script.title.slice(0, 100),
    description: script.description,
    tags: ['bourse', 'trading', 'marchés financiers', 'cac 40'],
    hashtags: ['Bourse', 'CAC40', 'Marches'],
  };
}

function previewMetadata(meta: ReturnType<typeof buildMetadata>, videoPath: string, privacy: Privacy) {
  console.log('═══ YouTube upload preview ═══\n');
  console.log(`Privacy:      ${privacy}`);
  console.log(`Video file:   ${videoPath}`);
  const stat = fs.statSync(videoPath);
  console.log(`Size:         ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`\n── Title (${meta.title.length} chars) ──`);
  console.log(meta.title);
  console.log(`\n── Description (${meta.description.length} chars, ${meta.description.split(/\s+/).filter(Boolean).length} words) ──`);
  console.log(meta.description.length > 1500 ? meta.description.slice(0, 1500) + '\n... [truncated for preview]' : meta.description);
  console.log(`\n── Tags (${meta.tags.length}, ${meta.tags.join(',').length} chars) ──`);
  console.log(meta.tags.join(', '));
  console.log(`\n── Hashtags (${meta.hashtags.length}) ──`);
  console.log(meta.hashtags.map(h => `#${h}`).join(' '));
  console.log('\n══════════════════════════════════');
}

async function uploadThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
  const youtube = getYoutubeClient();
  const stat = fs.statSync(thumbnailPath);
  console.log(`\nUploading thumbnail (${(stat.size / 1024).toFixed(0)} KB)...`);
  await youtube.thumbnails.set({
    videoId,
    media: { body: fs.createReadStream(thumbnailPath) },
  });
  console.log('  ✓ Thumbnail set');
}

async function uploadCaptions(videoId: string, captionsPath: string, replaceExisting = true): Promise<void> {
  const youtube = getYoutubeClient();
  const stat = fs.statSync(captionsPath);
  const cueCount = (fs.readFileSync(captionsPath, 'utf-8').match(/-->/g) || []).length;

  if (replaceExisting) {
    try {
      const existing = await youtube.captions.list({ part: ['snippet'], videoId });
      const frTracks = (existing.data.items ?? []).filter(
        (c: any) => c.snippet?.language === 'fr',
      );
      for (const track of frTracks) {
        if (track.id) {
          console.log(`  Removing existing FR caption track ${track.id}...`);
          await youtube.captions.delete({ id: track.id });
        }
      }
    } catch (err) {
      console.warn(`  ⚠ Could not list/delete existing captions: ${(err as Error).message.slice(0, 120)}`);
    }
  }

  console.log(`\nUploading captions VTT (${(stat.size / 1024).toFixed(1)} KB, ${cueCount} cues)...`);
  await youtube.captions.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        language: 'fr',
        name: 'Français',
        isDraft: false,
      },
    },
    media: {
      mimeType: 'text/vtt',
      body: fs.createReadStream(captionsPath),
    },
  });
  console.log('  ✓ Captions set');
}

/**
 * Compute the next occurrence of `hourParis` o'clock in Europe/Paris timezone,
 * returning a UTC ISO 8601 string suitable for YouTube's `status.publishAt`.
 * Handles CET/CEST DST automatically by trying both offsets and picking the one
 * that yields the requested Paris hour.
 */
function nextPublishAtParis(hourParis: number): string {
  const now = new Date();
  const fmtDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  });
  const parts = fmtDate.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;

  let y = parseInt(get('year'), 10);
  let m = parseInt(get('month'), 10);
  let d = parseInt(get('day'), 10);
  const currentParisHour = parseInt(get('hour'), 10);

  // Skip to tomorrow in Paris if target hour already passed (with 5-min safety margin)
  if (currentParisHour >= hourParis) {
    const tomorrowParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    y = parseInt(tomorrowParts.find((p) => p.type === 'year')!.value, 10);
    m = parseInt(tomorrowParts.find((p) => p.type === 'month')!.value, 10);
    d = parseInt(tomorrowParts.find((p) => p.type === 'day')!.value, 10);
  }

  // Try CET (+01:00) and CEST (+02:00); the offset where Paris-formatted hour
  // matches the target is the correct one for that date.
  for (const offsetH of [1, 2]) {
    const candidateUTC = new Date(Date.UTC(y, m - 1, d, hourParis - offsetH, 0, 0));
    const checkParis = parseInt(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(candidateUTC),
      10,
    );
    if (checkParis === hourParis) return candidateUTC.toISOString();
  }
  // DST transition edge case fallback — use CET
  return new Date(Date.UTC(y, m - 1, d, hourParis - 1, 0, 0)).toISOString();
}

async function addToPlaylist(videoId: string, playlistId: string): Promise<void> {
  const youtube = getYoutubeClient();
  await youtube.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    },
  });
}

/**
 * Poste un commentaire en tant que propriétaire de chaîne. YouTube n'expose
 * PAS d'API pour épingler — c'est un clic manuel dans Studio après le post.
 * Requires the youtube.force-ssl OAuth scope (same as captions).
 */
async function postPinnedComment(videoId: string, text: string): Promise<void> {
  const youtube = getYoutubeClient();
  await youtube.commentThreads.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: {
          snippet: { textOriginal: text },
        },
      },
    },
  });
}

async function uploadVideo(args: {
  videoPath: string;
  meta: ReturnType<typeof buildMetadata>;
  privacy: Privacy;
  publishAt?: string;  // ISO 8601 UTC — when set, privacy is forced to 'private'
}): Promise<{ videoId: string; studioUrl: string }> {
  const youtube = getYoutubeClient();

  // YouTube requires privacyStatus='private' when publishAt is set; the video
  // becomes public automatically at publishAt time.
  const effectivePrivacy: Privacy = args.publishAt ? 'private' : args.privacy;

  if (args.publishAt) {
    console.log(`\nUploading to YouTube (scheduled publish at ${args.publishAt})...`);
  } else {
    console.log(`\nUploading to YouTube (privacy=${effectivePrivacy})...`);
  }
  const fileSize = fs.statSync(args.videoPath).size;
  let lastProgress = 0;

  const res = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: args.meta.title,
          description: args.meta.description,
          tags: args.meta.tags,
          // categoryId 25 = News & Politics, 28 = Science & Tech, 22 = People & Blogs.
          // Finance/markets fits best in 25 (News & Politics) per YouTube taxonomy.
          categoryId: '25',
          defaultLanguage: 'fr',
          defaultAudioLanguage: 'fr',
        },
        status: {
          privacyStatus: effectivePrivacy,
          selfDeclaredMadeForKids: false,
          embeddable: true,
          publicStatsViewable: true,
          ...(args.publishAt ? { publishAt: args.publishAt } : {}),
        },
      },
      media: {
        body: fs.createReadStream(args.videoPath),
      },
    },
    {
      onUploadProgress: (evt: { bytesRead: number }) => {
        const pct = Math.floor((evt.bytesRead / fileSize) * 100);
        if (pct >= lastProgress + 5) {
          process.stdout.write(`  upload: ${pct}%\r`);
          lastProgress = pct;
        }
      },
    },
  );

  const videoId = res.data.id;
  if (!videoId) throw new Error('Upload succeeded but no video ID returned.');

  return {
    videoId,
    studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.auth) {
    await runInteractiveAuth();
    return;
  }

  // Captions-only mode: replace captions on an existing video, skip everything else
  if (args.captionsOnly) {
    if (!args.date && !args.captionsPath) {
      console.error('--captions-only requires --date YYYY-MM-DD or --captions <path>');
      process.exit(1);
    }
    let captionsPath = args.captionsPath;
    if (!captionsPath && args.date) {
      const root = projectRoot();
      const [y, m, d] = args.date.split('-');
      captionsPath = path.join(root, 'episodes', y!, `${m}-${d}`, `episode-${args.date}.vtt`);
    }
    if (!captionsPath || !fs.existsSync(captionsPath)) {
      console.error(`Captions VTT not found: ${captionsPath}`);
      process.exit(1);
    }
    console.log(`\n═══ Captions-only mode — videoId=${args.captionsOnly} ═══`);
    console.log(`Captions: ${captionsPath}`);
    if (args.dryRun) {
      const cueCount = (fs.readFileSync(captionsPath, 'utf-8').match(/-->/g) || []).length;
      console.log(`[--dry-run] Would replace FR captions with ${cueCount} cues. No API call.`);
      return;
    }
    try {
      await uploadCaptions(args.captionsOnly, captionsPath, true);
      console.log(`\n✓ Captions replaced on https://studio.youtube.com/video/${args.captionsOnly}/edit`);
    } catch (err) {
      console.error(`\n✗ Captions replace failed: ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }

  if (!args.date && !args.videoPath) {
    printHelp();
    process.exit(1);
  }

  const { videoPath, scriptPath, date, thumbnailPath, captionsPath } = resolvePaths(args);
  console.log(`Episode date: ${date || '(custom)'}`);
  console.log(`Script:       ${scriptPath}`);
  if (thumbnailPath) console.log(`Thumbnail:    ${thumbnailPath}`);
  if (captionsPath) console.log(`Captions:     ${captionsPath}`);

  const script: EpisodeScript = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));

  // Refresh chapter timestamps from the VTT BEFORE building metadata. P10 SEO
  // computes chapters from estimated narration durations (~150 wpm) but Fish
  // Audio + Remotion transitions yield real positions that drift cumulatively.
  // The VTT (Echogarden DTW alignment) is the source of truth for the MP4 timeline.
  if (captionsPath && script.seo?.chapters) {
    const refreshed = refreshChaptersFromVTT(script, captionsPath);
    if (refreshed) {
      const oldCount = script.seo.chapters.length;
      const driftSec = refreshed.reduce((max, c, i) => {
        const oldT = script.seo!.chapters[i]?.time ?? '';
        const [oM, oS] = oldT.split(':').map(Number);
        const [nM, nS] = c.time.split(':').map(Number);
        const oldSec = (oM ?? 0) * 60 + (oS ?? 0);
        const newSec = (nM ?? 0) * 60 + (nS ?? 0);
        return Math.max(max, Math.abs(newSec - oldSec));
      }, 0);
      console.log(`\n  Refreshed chapter timings from VTT (${oldCount} chapters, max drift = ${driftSec}s)`);
      script.seo.chapters = refreshed.map((c) => ({ time: c.time, label: c.label }));
      script.seo.description = patchDescriptionChapters(script.seo.description, refreshed);
      // Persist back to disk so re-runs (e.g., --captions-only later) see corrected data
      fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
    } else {
      console.warn(`  ⚠ Could not refresh chapters from VTT (insufficient matches) — using estimated timings`);
    }
  }

  const meta = buildMetadata(script);

  const defaultPrivacy = (process.env.YOUTUBE_DEFAULT_PRIVACY as Privacy) ?? 'private';
  const privacy: Privacy = args.privacy ?? defaultPrivacy;

  // Resolve scheduling: explicit --publish-at takes precedence, then env var auto-compute,
  // unless --no-schedule overrides everything.
  let publishAt: string | undefined;
  if (!args.noSchedule) {
    if (args.publishAt) {
      publishAt = args.publishAt;
    } else if (process.env.YOUTUBE_PUBLISH_HOUR_CET) {
      const hour = parseInt(process.env.YOUTUBE_PUBLISH_HOUR_CET, 10);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
        publishAt = nextPublishAtParis(hour);
      } else {
        console.warn(`⚠ YOUTUBE_PUBLISH_HOUR_CET="${process.env.YOUTUBE_PUBLISH_HOUR_CET}" invalid (0-23 expected). Skipping schedule.`);
      }
    }
  }

  previewMetadata(meta, videoPath, privacy);
  if (publishAt) {
    const parisStr = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date(publishAt));
    console.log(`\n⏰ Scheduled drop : ${parisStr} Paris  (${publishAt})`);
    console.log(`   Privacy uploaded as 'private', will become 'public' automatically at that time.`);
  }

  if (args.dryRun) {
    console.log('\n[--dry-run] No API call made. Remove --dry-run to upload.');
    return;
  }

  // Confirm before pushing public/unlisted (those are visible immediately).
  // Skipped when scheduled — scheduling forces 'private' until publishAt fires.
  if (!publishAt && privacy !== 'private') {
    console.log(`\n⚠ Privacy is "${privacy}" — video will be VISIBLE immediately after upload.`);
    console.log(`If this is unintended, ctrl+C now.`);
    await new Promise(r => setTimeout(r, 3000));
  }

  try {
    const { videoId, studioUrl } = await uploadVideo({ videoPath, meta, privacy, publishAt });
    console.log(`\n═══ Video uploaded ═══`);
    console.log(`Video ID:  ${videoId}`);

    if (thumbnailPath) {
      try {
        await uploadThumbnail(videoId, thumbnailPath);
      } catch (thumbErr) {
        console.warn(`  ⚠ Thumbnail upload failed: ${(thumbErr as Error).message.slice(0, 120)}`);
        console.warn(`    (video itself uploaded OK — you can set thumbnail manually in Studio)`);
      }
    }

    if (captionsPath) {
      try {
        await uploadCaptions(videoId, captionsPath);
      } catch (capErr) {
        const msg = (capErr as Error).message;
        console.warn(`  ⚠ Captions upload failed: ${msg.slice(0, 200)}`);
        if (msg.includes('insufficient') || msg.includes('scope')) {
          console.warn(`    → Re-run \`npm run publish -- --auth\` to grant the youtube.force-ssl scope.`);
        } else {
          console.warn(`    (video itself uploaded OK — you can upload captions manually in Studio)`);
        }
      }
    }

    const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
    if (playlistId) {
      console.log(`\nAdding to playlist ${playlistId}...`);
      try {
        await addToPlaylist(videoId, playlistId);
        console.log('  ✓ Added to playlist');
      } catch (plErr) {
        console.warn(`  ⚠ Playlist add failed: ${(plErr as Error).message.slice(0, 200)}`);
        console.warn(`    (video uploaded OK — you can add it to the playlist manually in Studio)`);
      }
    }

    let commentPosted = false;
    const pinnedCommentText = (script as any)?.seo?.pinnedComment as string | undefined;
    if (pinnedCommentText && pinnedCommentText.trim().length >= 80) {
      console.log(`\nPosting pinned comment (${pinnedCommentText.length} chars)...`);
      try {
        await postPinnedComment(videoId, pinnedCommentText);
        console.log('  ✓ Comment posted (epingle manuellement dans Studio)');
        commentPosted = true;
      } catch (cErr) {
        const msg = (cErr as Error).message;
        console.warn(`  ⚠ Comment post failed: ${msg.slice(0, 200)}`);
        if (msg.includes('insufficient') || msg.includes('scope')) {
          console.warn(`    → Re-run \`npm run publish -- --auth\` to grant the youtube.force-ssl scope.`);
        } else {
          console.warn(`    (video uploaded OK — tu peux poster le commentaire manuellement)`);
        }
      }
    }

    console.log(`\n═══ Upload complete ═══`);
    console.log(`Watch URL: https://youtu.be/${videoId}`);
    console.log(`Studio:    ${studioUrl}`);

    // Studio-only actions YouTube doesn't expose via API — print compact checklist
    const effectivePrivacy = publishAt ? 'private (scheduled)' : privacy;
    console.log(`\n━━━ Manual checks in Studio (if YouTube prompts) ━━━`);
    console.log(`  Audience              → "Non, pas pour enfants"   (set via API ✓)`);
    console.log(`  Privacy               → ${effectivePrivacy}        (set via API ✓)`);
    console.log(`  Contenu modifié (IA)  → "Non"                      (per OSJ policy — voix générique, hibou animé)`);
    if (!thumbnailPath) {
      console.log(`  Thumbnail             → upload manually in Studio (channel verification needed)`);
    }
    console.log(`  Chapitres in player   → reload page if not visible (description has 0:00 anchor ✓)`);
    if (commentPosted) {
      console.log(`  Premier commentaire   → ÉPINGLER manuellement dans Studio (pas d'API pour pinning)`);
    }
    if (publishAt) {
      const parisStr = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
      }).format(new Date(publishAt));
      console.log(`\n⏰ Drop programmé : ${parisStr} Paris — la vidéo passera 'public' automatiquement.`);
    } else {
      console.log(`\n→ Review in Studio, then publish (or schedule) when ready.`);
    }
  } catch (err) {
    if (err instanceof MissingCredentialsError) {
      console.error(`\n✗ ${err.message}`);
      process.exit(2);
    }
    console.error(`\n✗ Upload failed: ${(err as Error).message}`);
    if ((err as any).response?.data) {
      console.error(JSON.stringify((err as any).response.data, null, 2));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
