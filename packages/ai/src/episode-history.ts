import * as fs from "fs";
import * as path from "path";
import type { EpisodeManifestEntry, EpisodeScript, DailySnapshot } from "@yt-maker/core";

function getManifestPath(): string {
  // Resolve from project root (go up from packages/ai/)
  return path.resolve(__dirname, "..", "..", "..", "episodes", "manifest.json");
}

export function readManifest(): EpisodeManifestEntry[] {
  const manifestPath = getManifestPath();
  if (!fs.existsSync(manifestPath)) return [];
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw);
}

export function getNextEpisodeNumber(): number {
  const entries = readManifest();
  if (entries.length === 0) return 1;
  return Math.max(...entries.map((e) => e.episodeNumber)) + 1;
}

export function getRecentEpisodes(count = 5): EpisodeManifestEntry[] {
  const entries = readManifest();
  return entries.slice(-count);
}

export function appendToManifest(entry: EpisodeManifestEntry): void {
  const manifestPath = getManifestPath();
  const entries = readManifest();
  // Replace existing entry for same date (no duplicates)
  const idx = entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
}

/**
 * Load episode data from file path.
 * Supports both formats:
 *   - Old flat JSON: filePath ends with .json → load directly as { script, snapshot }
 *   - New folder format: filePath is a directory → load script.json and snapshot.json from inside
 */
export function loadEpisodeData(filePath: string): { script: EpisodeScript; snapshot: DailySnapshot } | null {
  try {
    if (!fs.existsSync(filePath)) return null;

    // Check if it's a JSON file (old flat format)
    if (filePath.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.snapshot && data.script) {
        return { script: data.script, snapshot: data.snapshot };
      }
      return null;
    }

    // Assume it's a directory (new folder format)
    const scriptPath = path.join(filePath, "script.json");
    const snapshotPath = path.join(filePath, "snapshot.json");

    if (!fs.existsSync(scriptPath) || !fs.existsSync(snapshotPath)) {
      return null;
    }

    const script = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

    if (script && snapshot) {
      return { script, snapshot };
    }
    return null;
  } catch (err) {
    return null;
  }
}
