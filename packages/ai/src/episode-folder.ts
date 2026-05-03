import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, unlinkSync } from "fs";
import { join, basename } from "path";

const ROOT = join(__dirname, "..", "..", "..");
const EPISODES_DIR = join(ROOT, "episodes");
const REMOTION_PUBLIC = join(ROOT, "packages", "remotion-app", "public");

/**
 * Get episode folder path: episodes/YYYY/MM-DD/
 */
export function episodeDir(date: string): string {
  const year = date.slice(0, 4);
  const monthDay = date.slice(5);
  return join(EPISODES_DIR, year, monthDay);
}

/**
 * Create episode folder with subdirs: images/, audio/, pipeline/
 */
export function createEpisodeDir(date: string): string {
  const dir = episodeDir(date);
  const subdirs = ["images", "audio", "pipeline"];

  try {
    mkdirSync(dir, { recursive: true });
    for (const subdir of subdirs) {
      mkdirSync(join(dir, subdir), { recursive: true });
    }
  } catch (err) {
    console.warn(`Failed to create episode dir: ${(err as Error).message}`);
  }

  return dir;
}

/**
 * Save JSON to episode folder
 */
export function saveToEpisode(
  date: string,
  filename: string,
  data: unknown
): string {
  const dir = episodeDir(date);
  createEpisodeDir(date);

  const filepath = join(dir, filename);
  try {
    writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn(
      `Failed to save ${filename}: ${(err as Error).message}`
    );
  }

  return filepath;
}

/**
 * Save pipeline intermediate to episode folder (pipeline/ subdir)
 */
export function saveIntermediate(
  date: string,
  name: string,
  data: unknown
): void {
  const dir = episodeDir(date);
  const pipelineDir = join(dir, "pipeline");

  try {
    mkdirSync(pipelineDir, { recursive: true });
    writeFileSync(
      join(pipelineDir, `${name}.json`),
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.warn(
      `Failed to save intermediate ${name}: ${(err as Error).message}`
    );
  }
}

/**
 * Load a pipeline intermediate from episode folder.
 * Returns null if file doesn't exist.
 */
export function loadIntermediate<T = unknown>(date: string, name: string): T | null {
  const dir = episodeDir(date);
  const filePath = join(dir, "pipeline", `${name}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Remove all files matching a pattern from a directory (non-recursive).
 * Used to clean stale beat audio/images before syncing a new episode.
 */
function cleanDir(dir: string, ext?: string): number {
  if (!existsSync(dir)) return 0;
  let removed = 0;
  try {
    for (const file of readdirSync(dir)) {
      if (ext && !file.endsWith(ext)) continue;
      try {
        unlinkSync(join(dir, file));
        removed++;
      } catch {}
    }
  } catch {}
  return removed;
}

/**
 * Clean ONLY the current episode's public directory tree to avoid stale files
 * from a previous run of THIS episode. Other episodes' files are preserved so
 * Remotion Studio can switch between episodes and load each one's own assets.
 */
export function cleanPublicForNewEpisode(date?: string, opts?: { skipImages?: boolean }): void {
  if (!date) {
    // Legacy fallback (no date): used to wipe everything. Now a no-op since
    // per-episode folders are isolated. Call cleanPublicForNewEpisode(date)
    // instead.
    return;
  }
  const epAudioDir = join(REMOTION_PUBLIC, "audio", `ep-${date}`);
  const epEditorialDir = join(REMOTION_PUBLIC, "editorial", `ep-${date}`);

  const beatsDir = join(epAudioDir, "beats");
  const segmentsDir = join(beatsDir, "segments");
  const owlDir = join(epAudioDir, "owl");

  const a = cleanDir(beatsDir, ".mp3") + cleanDir(segmentsDir, ".mp3");
  const b = cleanDir(owlDir, ".mp3");
  const c = opts?.skipImages ? 0 : cleanDir(epEditorialDir, ".png");

  if (a + b + c > 0) {
    console.log(`  Cleaned public/ep-${date}: ${a} beat audio, ${b} owl audio, ${c} images`);
  }
}

/**
 * Copy image files to episode images/ AND remotion public/editorial/ep-{date}/
 * for render. Per-episode subdir prevents files of one episode from
 * overwriting another's when Studio switches between dates.
 *
 * Returns updated map with paths relative to remotion public/
 * (e.g. "editorial/ep-2026-05-02/beat_001.png").
 */
export function syncImagesToPublic(
  date: string,
  imageMap: Map<string, string>
): Map<string, string> {
  const dir = episodeDir(date);
  const imagesDir = join(dir, "images");
  const editorialPublicDir = join(REMOTION_PUBLIC, "editorial", `ep-${date}`);

  try {
    mkdirSync(imagesDir, { recursive: true });
    mkdirSync(editorialPublicDir, { recursive: true });
  } catch (err) {
    console.warn(`Failed to create image dirs: ${(err as Error).message}`);
  }

  const updatedMap = new Map<string, string>();

  for (const [key, sourcePath] of imageMap) {
    if (!existsSync(sourcePath)) {
      console.warn(`Source image not found: ${sourcePath}`);
      updatedMap.set(key, sourcePath);
      continue;
    }

    const filename = basename(sourcePath);
    const episodeImagePath = join(imagesDir, filename);
    const publicImagePath = join(editorialPublicDir, filename);

    try {
      copyFileSync(sourcePath, episodeImagePath);
      copyFileSync(sourcePath, publicImagePath);
      // Return path relative to public/ for Remotion — always forward slashes (web URLs)
      updatedMap.set(key, `editorial/ep-${date}/${filename}`);
    } catch (err) {
      console.warn(
        `Failed to sync image ${filename}: ${(err as Error).message}`
      );
      updatedMap.set(key, sourcePath);
    }
  }

  return updatedMap;
}

/**
 * Copy audio files to episode audio/ AND remotion public/audio/beats/ for render
 */
export function syncAudioToPublic(
  date: string,
  beats: Array<{ id: string; audioPath?: string }>
): void {
  const dir = episodeDir(date);
  const audioDir = join(dir, "audio");
  const beatsPublicDir = join(REMOTION_PUBLIC, "audio", `ep-${date}`, "beats");

  try {
    mkdirSync(audioDir, { recursive: true });
    mkdirSync(beatsPublicDir, { recursive: true });
  } catch (err) {
    console.warn(`Failed to create audio dirs: ${(err as Error).message}`);
  }

  for (const beat of beats) {
    if (!beat.audioPath) continue;

    // Resolve: audioPath can be absolute or relative (e.g. "audio/beats/beat_001.mp3")
    let sourcePath = beat.audioPath;
    if (!existsSync(sourcePath)) {
      // Try resolving from episode audio dir
      const fromEpisode = join(audioDir, basename(sourcePath));
      if (existsSync(fromEpisode)) {
        sourcePath = fromEpisode;
      } else {
        continue;
      }
    }

    const filename = basename(sourcePath);

    try {
      const episodeAudioPath = join(audioDir, filename);
      const publicAudioPath = join(beatsPublicDir, filename);

      if (sourcePath !== episodeAudioPath) copyFileSync(sourcePath, episodeAudioPath);
      copyFileSync(sourcePath, publicAudioPath);
    } catch (err) {
      console.warn(
        `Failed to sync audio ${beat.id}: ${(err as Error).message}`
      );
    }
  }
}

/**
 * Build and save complete Remotion props
 * Returns path to props.json
 */
export function saveRemotionProps(
  date: string,
  props: Record<string, unknown>
): string {
  const dir = episodeDir(date);
  createEpisodeDir(date);

  const propsPath = join(dir, "props.json");
  try {
    writeFileSync(propsPath, JSON.stringify(props, null, 2));
  } catch (err) {
    console.warn(`Failed to save props: ${(err as Error).message}`);
  }

  return propsPath;
}

/**
 * Save episode data (script + snapshot) to episode folder
 * Saves to episode/YYYY/MM-DD.json (not a subdir)
 */
export function saveEpisodeData(
  date: string,
  script: unknown,
  snapshot: unknown
): void {
  const year = date.slice(0, 4);
  const monthDay = date.slice(5);
  const yearDir = join(EPISODES_DIR, year);

  try {
    mkdirSync(yearDir, { recursive: true });

    const episodePath = join(yearDir, `${monthDay}.json`);
    const episodeData = { script, snapshot };
    writeFileSync(episodePath, JSON.stringify(episodeData, null, 2));
  } catch (err) {
    console.warn(
      `Failed to save episode data: ${(err as Error).message}`
    );
  }
}
