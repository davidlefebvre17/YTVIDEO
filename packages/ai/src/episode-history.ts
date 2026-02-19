import * as fs from "fs";
import * as path from "path";
import type { EpisodeManifestEntry } from "@yt-maker/core";

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
  entries.push(entry);
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
}
