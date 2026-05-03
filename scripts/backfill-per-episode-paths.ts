/**
 * Backfill — migrate existing episodes' assets into per-episode public/ subdirs.
 *
 * Before this fix, all episodes shared:
 *   public/audio/beats/segments/seg_*.mp3      (overwritten on each run)
 *   public/audio/beats/beat_*.mp3              (legacy mode, idem)
 *   public/audio/owl/owl_*.mp3                 (idem)
 *   public/editorial/beat_*.png                (idem)
 *
 * After: each episode has its own subdir keyed by the publishDate folder name:
 *   public/audio/ep-{date}/beats/segments/seg_*.mp3
 *   public/audio/ep-{date}/beats/beat_*.mp3
 *   public/audio/ep-{date}/owl/owl_*.mp3
 *   public/editorial/ep-{date}/*.png
 *
 * This script :
 *   1. Iterates every existing episodes/YYYY/MM-DD/ folder
 *   2. Copies its audio + images from the episode source into public/ep-{date}/
 *   3. Rewrites all path references in props.json
 *
 * Idempotent : safe to run multiple times. Skips episodes already migrated
 * (i.e. props.json already references audio/ep-{date}/...).
 *
 * Usage:
 *   npx tsx scripts/backfill-per-episode-paths.ts                 # dry run
 *   npx tsx scripts/backfill-per-episode-paths.ts --apply         # actually write
 *   npx tsx scripts/backfill-per-episode-paths.ts --apply --only 2026-05-02
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const EPISODES_BASE = path.join(ROOT, 'episodes', '2026');
const PUBLIC_BASE = path.join(ROOT, 'packages', 'remotion-app', 'public');
const APPLY = process.argv.includes('--apply');
const ONLY_IDX = process.argv.indexOf('--only');
const ONLY = ONLY_IDX > -1 ? process.argv[ONLY_IDX + 1] : null;  // YYYY-MM-DD

interface MigrationStats {
  episodeKey: string;
  audioCopied: number;
  imagesCopied: number;
  pathsRewritten: number;
  alreadyMigrated: boolean;
  error?: string;
}

/** List all episode folders under episodes/2026/ as full date strings (YYYY-MM-DD). */
function listEpisodes(): string[] {
  if (!fs.existsSync(EPISODES_BASE)) return [];
  const out: string[] = [];
  for (const folder of fs.readdirSync(EPISODES_BASE)) {
    // folder = "MM-DD"
    if (!/^\d{2}-\d{2}$/.test(folder)) continue;
    out.push(`2026-${folder}`);
  }
  return out.sort();
}

function copyDirContents(srcDir: string, destDir: string, ext?: string): number {
  if (!fs.existsSync(srcDir)) return 0;
  let copied = 0;
  if (APPLY && !fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    if (ext && !f.endsWith(ext)) continue;
    const src = path.join(srcDir, f);
    const dst = path.join(destDir, f);
    const stat = fs.statSync(src);
    if (!stat.isFile()) continue;
    if (APPLY) {
      try { fs.copyFileSync(src, dst); copied++; } catch (err) {
        console.warn(`    copy failed: ${f} (${(err as Error).message.slice(0, 60)})`);
      }
    } else {
      copied++;  // count what would be copied in dry-run
    }
  }
  return copied;
}

/** Rewrite a single path string : insert /ep-{date}/ at the right place. */
function rewritePath(p: string, date: string): string {
  // audio/beats/segments/X.mp3 → audio/ep-{date}/beats/segments/X.mp3
  if (p.startsWith('audio/beats/segments/')) {
    return p.replace(/^audio\/beats\/segments\//, `audio/ep-${date}/beats/segments/`);
  }
  // audio/beats/X.mp3 (legacy per-beat mode) → audio/ep-{date}/beats/X.mp3
  if (p.startsWith('audio/beats/')) {
    return p.replace(/^audio\/beats\//, `audio/ep-${date}/beats/`);
  }
  // audio/owl/X.mp3 → audio/ep-{date}/owl/X.mp3
  if (p.startsWith('audio/owl/')) {
    return p.replace(/^audio\/owl\//, `audio/ep-${date}/owl/`);
  }
  // editorial/X.png → editorial/ep-{date}/X.png  (keep already-migrated paths)
  if (p.startsWith('editorial/') && !p.startsWith(`editorial/ep-`)) {
    return p.replace(/^editorial\//, `editorial/ep-${date}/`);
  }
  return p;
}

function rewriteJsonPaths(obj: any, date: string, counter: { n: number }): any {
  if (typeof obj === 'string') {
    const newStr = rewritePath(obj, date);
    if (newStr !== obj) counter.n++;
    return newStr;
  }
  if (Array.isArray(obj)) {
    return obj.map((x) => rewriteJsonPaths(x, date, counter));
  }
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = rewriteJsonPaths(v, date, counter);
    }
    return out;
  }
  return obj;
}

function migrateEpisode(episodeKey: string): MigrationStats {
  const stats: MigrationStats = {
    episodeKey,
    audioCopied: 0,
    imagesCopied: 0,
    pathsRewritten: 0,
    alreadyMigrated: false,
  };

  const epFolder = path.join(EPISODES_BASE, episodeKey.slice(5));  // "MM-DD"
  if (!fs.existsSync(epFolder)) {
    stats.error = 'folder not found';
    return stats;
  }

  const propsPath = path.join(epFolder, 'props.json');
  if (!fs.existsSync(propsPath)) {
    stats.error = 'no props.json — skipping';
    return stats;
  }

  let propsRaw: string;
  try { propsRaw = fs.readFileSync(propsPath, 'utf-8'); } catch (e) {
    stats.error = `read props.json failed: ${(e as Error).message}`;
    return stats;
  }

  // Idempotency check : already-migrated props won't have raw "audio/beats/" anymore
  // (they'll have audio/ep-{date}/beats/...).
  const hasOldAudio = /"audio\/(beats|owl)\//.test(propsRaw);
  const hasOldImage = /"editorial\/(?!ep-)/.test(propsRaw);
  if (!hasOldAudio && !hasOldImage) {
    stats.alreadyMigrated = true;
    return stats;
  }

  // 1. Copy audio files
  const audioSrc = path.join(epFolder, 'audio');
  const audioPubBase = path.join(PUBLIC_BASE, 'audio', `ep-${episodeKey}`);

  // segments/
  stats.audioCopied += copyDirContents(
    path.join(audioSrc, 'segments'),
    path.join(audioPubBase, 'beats', 'segments'),
    '.mp3',
  );
  // owl/
  stats.audioCopied += copyDirContents(
    path.join(audioSrc, 'owl'),
    path.join(audioPubBase, 'owl'),
    '.mp3',
  );
  // legacy per-beat mode (beat_*.mp3 directly under audio/)
  if (fs.existsSync(audioSrc)) {
    for (const f of fs.readdirSync(audioSrc)) {
      if (!f.endsWith('.mp3')) continue;
      const src = path.join(audioSrc, f);
      const dst = path.join(audioPubBase, 'beats', f);
      if (APPLY) {
        if (!fs.existsSync(path.dirname(dst))) fs.mkdirSync(path.dirname(dst), { recursive: true });
        try { fs.copyFileSync(src, dst); stats.audioCopied++; } catch {}
      } else {
        stats.audioCopied++;
      }
    }
  }

  // 2. Copy image files
  const imagesSrc = path.join(epFolder, 'images');
  const imagesPubDir = path.join(PUBLIC_BASE, 'editorial', `ep-${episodeKey}`);
  stats.imagesCopied += copyDirContents(imagesSrc, imagesPubDir, '.png');
  // Also copy placeholder PNGs if referenced (they live in public/placeholders, not in episode folder)
  // We don't need to copy them — props will reference editorial/ep-{date}/{filename} only for real images.

  // 3. Rewrite paths in props.json (only props field; the episode source paths stay
  // unchanged in the source folder).
  const props = JSON.parse(propsRaw);
  const counter = { n: 0 };
  const migrated = rewriteJsonPaths(props, episodeKey, counter);
  stats.pathsRewritten = counter.n;

  if (APPLY && counter.n > 0) {
    fs.writeFileSync(propsPath, JSON.stringify(migrated, null, 2), 'utf-8');
  }

  return stats;
}

function main() {
  console.log(`=== Backfill per-episode public paths ===`);
  console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no changes)'}`);
  if (ONLY) console.log(`Filter: only ${ONLY}\n`);
  else console.log('');

  const episodes = ONLY ? [ONLY] : listEpisodes();
  if (episodes.length === 0) {
    console.log('No episodes found.');
    return;
  }

  let totalAudio = 0;
  let totalImages = 0;
  let totalPaths = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const ep of episodes) {
    const stats = migrateEpisode(ep);
    if (stats.error) {
      console.log(`  ✗ ${ep} — ${stats.error}`);
      totalErrors++;
      continue;
    }
    if (stats.alreadyMigrated) {
      console.log(`  · ${ep} — already migrated, skipping`);
      totalSkipped++;
      continue;
    }
    console.log(`  ✓ ${ep} — audio=${stats.audioCopied} images=${stats.imagesCopied} pathsRewritten=${stats.pathsRewritten}`);
    totalAudio += stats.audioCopied;
    totalImages += stats.imagesCopied;
    totalPaths += stats.pathsRewritten;
  }

  // ── Migrate episode-index.json (Studio reads from this fixture, not props.json) ──
  const indexPath = path.join(ROOT, 'packages', 'remotion-app', 'src', 'fixtures', 'episode-index.json');
  let indexPathsRewritten = 0;
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const idx = JSON.parse(raw);
    const props = idx.props || {};
    const counter = { n: 0 };
    for (const date of Object.keys(props)) {
      props[date] = rewriteJsonPaths(props[date], date, counter);
    }
    indexPathsRewritten = counter.n;
    if (APPLY && counter.n > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2), 'utf-8');
    }
    console.log(`\n  ${APPLY ? '✓' : '·'} episode-index.json — paths ${APPLY ? 'rewritten' : 'would rewrite'}: ${counter.n}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Episodes processed: ${episodes.length}`);
  console.log(`Already migrated: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Audio files ${APPLY ? 'copied' : 'would copy'}: ${totalAudio}`);
  console.log(`Image files ${APPLY ? 'copied' : 'would copy'}: ${totalImages}`);
  console.log(`Paths ${APPLY ? 'rewritten in props.json' : 'would rewrite'}: ${totalPaths}`);
  console.log(`Paths ${APPLY ? 'rewritten in episode-index.json' : 'would rewrite in episode-index.json'}: ${indexPathsRewritten}`);
  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to actually migrate.`);
  }
}

main();
