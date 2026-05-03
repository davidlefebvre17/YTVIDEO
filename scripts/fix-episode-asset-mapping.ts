/**
 * Fix the per-episode asset mapping after the previous backfill mistake.
 *
 * Previous backfill copied files into `public/audio/ep-{folderName}/...`,
 * but Studio reads paths from `episode-index.json` keyed by `entries[].date`,
 * which often differs from the folder name (publishDate vs snapDate offset).
 *
 * Fix: for each entry K in episode-index.json, lookup script.episodeNumber,
 * find the source folder with matching episodeNumber, and re-copy assets
 * into `public/audio/ep-K/...` (overwriting whatever was there).
 *
 * Usage:
 *   npx tsx scripts/fix-episode-asset-mapping.ts             # dry run
 *   npx tsx scripts/fix-episode-asset-mapping.ts --apply     # actually copy
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const EPISODES_BASE = path.join(ROOT, 'episodes', '2026');
const PUBLIC_BASE = path.join(ROOT, 'packages', 'remotion-app', 'public');
const INDEX_PATH = path.join(ROOT, 'packages', 'remotion-app', 'src', 'fixtures', 'episode-index.json');
const APPLY = process.argv.includes('--apply');

function listEpisodeFolders(): string[] {
  const out: string[] = [];
  for (const f of fs.readdirSync(EPISODES_BASE)) {
    if (!/^\d{2}-\d{2}$/.test(f)) continue;
    const propsPath = path.join(EPISODES_BASE, f, 'props.json');
    if (!fs.existsSync(propsPath)) continue;
    out.push(`2026-${f}`);
  }
  return out.sort();
}

function readEpNumFromFolder(folderKey: string): number | null {
  try {
    const propsPath = path.join(EPISODES_BASE, folderKey.slice(5), 'props.json');
    const j = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
    return j?.script?.episodeNumber ?? null;
  } catch {
    return null;
  }
}

function rmDirContents(dir: string, ext?: string): number {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (ext && !f.endsWith(ext)) continue;
    try { fs.unlinkSync(path.join(dir, f)); n++; } catch {}
  }
  return n;
}

function copyDirFiles(src: string, dst: string, ext?: string): number {
  if (!fs.existsSync(src)) return 0;
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(src)) {
    if (ext && !f.endsWith(ext)) continue;
    const s = path.join(src, f);
    const d = path.join(dst, f);
    try {
      const stat = fs.statSync(s);
      if (!stat.isFile()) continue;
      fs.copyFileSync(s, d);
      n++;
    } catch {}
  }
  return n;
}

function main() {
  console.log(`=== Fix per-episode asset mapping (epNum-based) ===`);
  console.log(`Mode: ${APPLY ? 'APPLY (will copy)' : 'DRY RUN'}\n`);

  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  const indexProps = idx.props as Record<string, any>;

  // Build map: epNum → folderKey  (e.g. 42 → "2026-05-01")
  const folders = listEpisodeFolders();
  const epNumToFolder = new Map<number, string>();
  for (const fkey of folders) {
    const n = readEpNumFromFolder(fkey);
    if (n != null) {
      // Prefer first match (earliest folder); duplicates ignored
      if (!epNumToFolder.has(n)) epNumToFolder.set(n, fkey);
    }
  }
  console.log(`Indexed ${epNumToFolder.size} folders by episodeNumber\n`);

  let totalAudio = 0, totalImages = 0, mismatch = 0, alreadyOk = 0, missing = 0;
  for (const K of Object.keys(indexProps)) {
    const epNum = indexProps[K]?.script?.episodeNumber;
    if (epNum == null) {
      console.log(`  ? ${K} — no episodeNumber in props, skipping`);
      missing++;
      continue;
    }
    const folder = epNumToFolder.get(epNum);
    if (!folder) {
      console.log(`  ✗ ${K} (ep#${epNum}) — no source folder for this epNum`);
      missing++;
      continue;
    }

    if (folder === K) {
      console.log(`  · ${K} (ep#${epNum}) — folder matches, OK`);
      alreadyOk++;
      continue;
    }

    // Need to remap: folder F differs from index key K
    const srcAudio = path.join(EPISODES_BASE, folder.slice(5), 'audio');
    const srcImages = path.join(EPISODES_BASE, folder.slice(5), 'images');
    const dstSegments = path.join(PUBLIC_BASE, 'audio', `ep-${K}`, 'beats', 'segments');
    const dstOwl = path.join(PUBLIC_BASE, 'audio', `ep-${K}`, 'owl');
    const dstBeats = path.join(PUBLIC_BASE, 'audio', `ep-${K}`, 'beats');
    const dstImages = path.join(PUBLIC_BASE, 'editorial', `ep-${K}`);

    let a = 0, b = 0;
    if (APPLY) {
      // Wipe destination first (it currently holds wrong-episode files)
      rmDirContents(dstSegments, '.mp3');
      rmDirContents(dstOwl, '.mp3');
      rmDirContents(dstBeats, '.mp3');  // legacy per-beat mp3 directly under beats/
      rmDirContents(dstImages, '.png');

      // Copy from source folder (which has the correct episodeNumber)
      a += copyDirFiles(path.join(srcAudio, 'segments'), dstSegments, '.mp3');
      a += copyDirFiles(path.join(srcAudio, 'owl'), dstOwl, '.mp3');
      a += copyDirFiles(srcAudio, dstBeats, '.mp3');  // legacy per-beat
      b += copyDirFiles(srcImages, dstImages, '.png');
    } else {
      // Dry-run: count files in source
      const segs = fs.existsSync(path.join(srcAudio, 'segments')) ? fs.readdirSync(path.join(srcAudio, 'segments')).filter(f => f.endsWith('.mp3')).length : 0;
      const owl = fs.existsSync(path.join(srcAudio, 'owl')) ? fs.readdirSync(path.join(srcAudio, 'owl')).filter(f => f.endsWith('.mp3')).length : 0;
      const legacy = fs.existsSync(srcAudio) ? fs.readdirSync(srcAudio).filter(f => f.endsWith('.mp3')).length : 0;
      const imgs = fs.existsSync(srcImages) ? fs.readdirSync(srcImages).filter(f => f.endsWith('.png')).length : 0;
      a = segs + owl + legacy;
      b = imgs;
    }

    console.log(`  ✓ ${K} (ep#${epNum}) ← ${folder} : audio=${a} images=${b}`);
    totalAudio += a;
    totalImages += b;
    mismatch++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Index entries: ${Object.keys(indexProps).length}`);
  console.log(`Already correctly mapped (folder == K): ${alreadyOk}`);
  console.log(`Remapped (folder ≠ K): ${mismatch}`);
  console.log(`Missing (no folder match or no epNum): ${missing}`);
  console.log(`Audio files ${APPLY ? 'copied' : 'would copy'}: ${totalAudio}`);
  console.log(`Image files ${APPLY ? 'copied' : 'would copy'}: ${totalImages}`);
  if (!APPLY) console.log(`\nDry-run only. Re-run with --apply to actually fix.`);
}

main();
