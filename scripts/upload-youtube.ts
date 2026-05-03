/**
 * Upload an episode to YouTube.
 *
 * Usage :
 *   npm run publish -- --date 2026-04-28                    # default privacy from env (private)
 *   npm run publish -- --date 2026-04-28 --privacy unlisted
 *   npm run publish -- --date 2026-04-28 --dry-run          # validate inputs, no API call
 *   npm run publish -- --auth                                # OAuth interactive flow (one-time)
 *
 * Default video privacy is **private** so the user can review in YouTube Studio
 * before making it public. Override with --privacy unlisted | public.
 *
 * Reads :
 * - episodes/YYYY/MM-DD/script.json — uses script.seo (P10 output) if present,
 *   else falls back to script.title / script.description
 * - out/episode-YYYY-MM-DD.mp4 — the rendered MP4
 *
 * Quota cost : 1600 units per upload (10000/day quota = ~6 uploads/day max).
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getYoutubeClient, runInteractiveAuth, MissingCredentialsError } from './youtube/auth';
import type { EpisodeScript, EpisodeSEO } from '@yt-maker/core';

type Privacy = 'private' | 'unlisted' | 'public';

interface CLIArgs {
  date?: string;
  privacy?: Privacy;
  dryRun: boolean;
  auth: boolean;
  videoPath?: string;
  scriptPath?: string;
}

function parseArgs(argv: string[]): CLIArgs {
  const out: CLIArgs = { dryRun: false, auth: false };
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
  --dry-run             Validate inputs and print metadata without uploading
  --auth                One-time OAuth consent flow to obtain refresh token
  --help                Show this help

Examples :
  npm run publish -- --date 2026-04-28
  npm run publish -- --date 2026-04-28 --privacy unlisted
  npm run publish -- --date 2026-04-28 --dry-run
  npm run publish -- --auth
`);
}

function projectRoot(): string {
  return path.resolve(__dirname, '..');
}

function resolvePaths(args: CLIArgs): { videoPath: string; scriptPath: string; date: string } {
  if (!args.date && (!args.videoPath || !args.scriptPath)) {
    throw new Error('Either --date is required, or both --video and --script must be provided.');
  }
  const date = args.date ?? '';
  const root = projectRoot();

  const [y, m, d] = date.split('-');
  const scriptPath = args.scriptPath
    ?? (date ? path.join(root, 'episodes', y!, `${m}-${d}`, 'script.json') : '');
  const videoPath = args.videoPath
    ?? (date ? path.join(root, 'out', `episode-${date}.mp4`) : '');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`script.json not found: ${scriptPath}`);
  }
  if (!fs.existsSync(videoPath)) {
    throw new Error(`MP4 not found: ${videoPath}\n(generate it with \`npm run render -- --episode ...\`)`);
  }

  return { videoPath, scriptPath, date };
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

async function uploadVideo(args: {
  videoPath: string;
  meta: ReturnType<typeof buildMetadata>;
  privacy: Privacy;
}): Promise<{ videoId: string; studioUrl: string }> {
  const youtube = getYoutubeClient();

  console.log(`\nUploading to YouTube (privacy=${args.privacy})...`);
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
          privacyStatus: args.privacy,
          selfDeclaredMadeForKids: false,
          embeddable: true,
          publicStatsViewable: true,
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

  if (!args.date && !args.videoPath) {
    printHelp();
    process.exit(1);
  }

  const { videoPath, scriptPath, date } = resolvePaths(args);
  console.log(`Episode date: ${date || '(custom)'}`);
  console.log(`Script:       ${scriptPath}`);

  const script: EpisodeScript = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const meta = buildMetadata(script);

  const defaultPrivacy = (process.env.YOUTUBE_DEFAULT_PRIVACY as Privacy) ?? 'private';
  const privacy: Privacy = args.privacy ?? defaultPrivacy;

  previewMetadata(meta, videoPath, privacy);

  if (args.dryRun) {
    console.log('\n[--dry-run] No API call made. Remove --dry-run to upload.');
    return;
  }

  // Confirm before pushing public/unlisted (those are visible immediately)
  if (privacy !== 'private') {
    console.log(`\n⚠ Privacy is "${privacy}" — video will be VISIBLE immediately after upload.`);
    console.log(`If this is unintended, ctrl+C now.`);
    await new Promise(r => setTimeout(r, 3000));
  }

  try {
    const { videoId, studioUrl } = await uploadVideo({ videoPath, meta, privacy });
    console.log(`\n═══ Upload complete ═══`);
    console.log(`Video ID:  ${videoId}`);
    console.log(`Watch URL: https://youtu.be/${videoId}`);
    console.log(`Studio:    ${studioUrl}`);
    console.log(`\n→ Review in Studio, add custom thumbnail, then publish when ready.`);
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
