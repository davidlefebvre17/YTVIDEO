import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "fs";
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
 * Copy image files to episode images/ AND remotion public/editorial/ for render
 * Returns updated map with paths relative to remotion public/ (for beat.imagePath)
 */
export function syncImagesToPublic(
  date: string,
  imageMap: Map<string, string>
): Map<string, string> {
  const dir = episodeDir(date);
  const imagesDir = join(dir, "images");
  const editorialPublicDir = join(REMOTION_PUBLIC, "editorial");

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
      updatedMap.set(key, `editorial/${filename}`);
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
  const beatsPublicDir = join(REMOTION_PUBLIC, "audio", "beats");

  try {
    mkdirSync(audioDir, { recursive: true });
    mkdirSync(beatsPublicDir, { recursive: true });
  } catch (err) {
    console.warn(`Failed to create audio dirs: ${(err as Error).message}`);
  }

  for (const beat of beats) {
    if (!beat.audioPath || !existsSync(beat.audioPath)) {
      continue;
    }

    const filename = basename(beat.audioPath);

    try {
      const episodeAudioPath = join(audioDir, filename);
      const publicAudioPath = join(beatsPublicDir, filename);

      copyFileSync(beat.audioPath, episodeAudioPath);
      copyFileSync(beat.audioPath, publicAudioPath);
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
