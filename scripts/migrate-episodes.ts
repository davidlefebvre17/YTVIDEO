/**
 * Migrate existing episode data to folder-based structure.
 *
 * For each episode in manifest:
 *   episodes/2026/MM-DD.json → episodes/2026/MM-DD/script.json + snapshot.json
 *   data/pipeline/DATE/*     → episodes/2026/MM-DD/pipeline/*
 *
 * For episode 03-24 (latest with beats/images/audio):
 *   public/editorial/*.png   → episodes/2026/03-24/images/
 *   public/audio/beats/*.mp3 → episodes/2026/03-24/audio/
 *   data/beat-test-props.json→ episodes/2026/03-24/beats.json + props.json
 *
 * Updates manifest.json to point to folders.
 * Non-destructive: copies files, doesn't delete originals.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "episodes");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "packages", "remotion-app", "public");

interface ManifestEntry {
  episodeNumber: number;
  date: string;
  type: string;
  lang: string;
  title: string;
  filePath: string;
  predictions?: unknown;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src: string, dst: string) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    return true;
  }
  return false;
}

function main() {
  console.log("=== Episode Migration ===\n");

  // Read manifest
  const manifestPath = path.join(EPISODES_DIR, "manifest.json");
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`${manifest.length} episodes in manifest\n`);

  for (const entry of manifest) {
    const { date } = entry;
    const year = date.slice(0, 4);
    const monthDay = date.slice(5); // MM-DD
    const oldJsonPath = path.join(EPISODES_DIR, year, `${monthDay}.json`);
    const newDir = path.join(EPISODES_DIR, year, monthDay);

    // Skip if already migrated (folder exists with script.json)
    if (fs.existsSync(path.join(newDir, "script.json"))) {
      console.log(`✓ ${date} — already migrated`);
      entry.filePath = newDir;
      continue;
    }

    console.log(`→ ${date} — migrating...`);
    ensureDir(newDir);
    ensureDir(path.join(newDir, "pipeline"));
    ensureDir(path.join(newDir, "images"));
    ensureDir(path.join(newDir, "audio"));

    // 1. Split flat JSON into script.json + snapshot.json
    if (fs.existsSync(oldJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(oldJsonPath, "utf-8"));
        if (data.script) {
          fs.writeFileSync(path.join(newDir, "script.json"), JSON.stringify(data.script, null, 2));
        }
        if (data.snapshot) {
          fs.writeFileSync(path.join(newDir, "snapshot.json"), JSON.stringify(data.snapshot, null, 2));
        }
        console.log(`  ✓ Split ${monthDay}.json → script.json + snapshot.json`);
      } catch (err) {
        console.warn(`  ✗ Failed to split ${oldJsonPath}: ${err}`);
      }
    }

    // 2. Copy snapshot from data/ if not in episode
    if (!fs.existsSync(path.join(newDir, "snapshot.json"))) {
      const snapshotSrc = path.join(DATA_DIR, `snapshot-${date}.json`);
      if (copyIfExists(snapshotSrc, path.join(newDir, "snapshot.json"))) {
        console.log(`  ✓ Copied snapshot-${date}.json`);
      }
    }

    // 3. Copy pipeline intermediates
    const pipelineDir = path.join(DATA_DIR, "pipeline", date);
    if (fs.existsSync(pipelineDir)) {
      const files = fs.readdirSync(pipelineDir).filter(f => f.endsWith(".json"));
      for (const f of files) {
        fs.copyFileSync(path.join(pipelineDir, f), path.join(newDir, "pipeline", f));
      }
      console.log(`  ✓ Copied ${files.length} pipeline files`);
    }

    // Update manifest entry to folder path
    entry.filePath = newDir;
  }

  // ── Special: Episode 03-24 (latest with beats/images/audio) ──
  const ep0324Dir = path.join(EPISODES_DIR, "2026", "03-24");
  ensureDir(ep0324Dir);
  ensureDir(path.join(ep0324Dir, "images"));
  ensureDir(path.join(ep0324Dir, "audio"));
  ensureDir(path.join(ep0324Dir, "pipeline"));

  // Copy beat-test-props → beats.json + props.json + script.json + snapshot.json
  const beatPropsPath = path.join(DATA_DIR, "beat-test-props.json");
  if (fs.existsSync(beatPropsPath)) {
    try {
      const props = JSON.parse(fs.readFileSync(beatPropsPath, "utf-8"));
      if (props.beats) {
        fs.writeFileSync(path.join(ep0324Dir, "beats.json"), JSON.stringify(props.beats, null, 2));
      }
      if (props.script && !fs.existsSync(path.join(ep0324Dir, "script.json"))) {
        fs.writeFileSync(path.join(ep0324Dir, "script.json"), JSON.stringify(props.script, null, 2));
      }
      // Save full props
      fs.writeFileSync(path.join(ep0324Dir, "props.json"), JSON.stringify(props, null, 2));
      console.log(`\n→ 03-24 special: beats.json + props.json saved`);
    } catch (err) {
      console.warn(`  ✗ beat-test-props failed: ${err}`);
    }
  }

  // Copy snapshot for 03-24
  if (!fs.existsSync(path.join(ep0324Dir, "snapshot.json"))) {
    // Try 03-24 or 03-23
    const snap24 = path.join(DATA_DIR, "snapshot-2026-03-24.json");
    const snap23 = path.join(DATA_DIR, "snapshot-2026-03-23.json");
    if (copyIfExists(snap24, path.join(ep0324Dir, "snapshot.json"))) {
      console.log(`  ✓ snapshot-2026-03-24.json`);
    } else if (copyIfExists(snap23, path.join(ep0324Dir, "snapshot.json"))) {
      console.log(`  ✓ snapshot-2026-03-23.json (fallback)`);
    }
  }

  // Copy editorial images → episode images/
  const editorialDir = path.join(PUBLIC_DIR, "editorial");
  if (fs.existsSync(editorialDir)) {
    const images = fs.readdirSync(editorialDir).filter(f => f.endsWith(".png"));
    for (const img of images) {
      fs.copyFileSync(path.join(editorialDir, img), path.join(ep0324Dir, "images", img));
    }
    console.log(`  ✓ ${images.length} editorial images → 03-24/images/`);
  }

  // Copy audio beats → episode audio/
  const audioDir = path.join(PUBLIC_DIR, "audio", "beats");
  if (fs.existsSync(audioDir)) {
    const audios = fs.readdirSync(audioDir).filter(f => f.endsWith(".mp3"));
    for (const a of audios) {
      fs.copyFileSync(path.join(audioDir, a), path.join(ep0324Dir, "audio", a));
    }
    console.log(`  ✓ ${audios.length} audio files → 03-24/audio/`);
  }

  // Copy pipeline intermediates for 03-24 (might be under 03-23 date)
  for (const pDate of ["2026-03-24", "2026-03-23"]) {
    const pipeSrc = path.join(DATA_DIR, "pipeline", pDate);
    if (fs.existsSync(pipeSrc)) {
      const files = fs.readdirSync(pipeSrc).filter(f => f.endsWith(".json"));
      for (const f of files) {
        fs.copyFileSync(path.join(pipeSrc, f), path.join(ep0324Dir, "pipeline", f));
      }
      console.log(`  ✓ ${files.length} pipeline files from ${pDate}`);
    }
  }

  // Add 03-24 to manifest if not there
  if (!manifest.find(e => e.date === "2026-03-24")) {
    try {
      const script = JSON.parse(fs.readFileSync(path.join(ep0324Dir, "script.json"), "utf-8"));
      manifest.push({
        episodeNumber: 15,
        date: "2026-03-24",
        type: "daily_recap",
        lang: "fr",
        title: script.title ?? "Episode 03-24",
        filePath: ep0324Dir,
      });
      console.log(`  ✓ Added 03-24 to manifest`);
    } catch {}
  }

  // Save updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Manifest updated (${manifest.length} entries, all pointing to folders)`);

  // Summary
  console.log("\n=== Migration complete ===");
  console.log("Old .json files kept as backup (not deleted)");
  console.log("New structure: episodes/YYYY/MM-DD/{script,snapshot,beats,images/,audio/,pipeline/}");
}

main();
