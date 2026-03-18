/**
 * Backfill episodes 2026-03-10 and 2026-03-12 from pipeline intermediates.
 * Converts DirectedEpisode → EpisodeScript via toEpisodeScript(), then saves
 * to episodes/ and updates manifest.json.
 */
import { toEpisodeScript } from "@yt-maker/ai";
import type { DirectedEpisode } from "@yt-maker/ai";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "episodes", "2026");
const MANIFEST_PATH = path.join(ROOT, "episodes", "manifest.json");

// --- Load directed episodes + snapshots ---
console.log("Loading pipeline intermediates...");

const directed10: DirectedEpisode = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/pipeline/2026-03-10/episode_directed.json"), "utf-8")
);
const snapshot10 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/snapshot-2026-03-10.json"), "utf-8")
);

const directed12: DirectedEpisode = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/pipeline/2026-03-12/directed.json"), "utf-8")
);
const snapshot12 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/snapshot-2026-03-12.json"), "utf-8")
);

// --- Convert to EpisodeScript ---
console.log("Converting DirectedEpisode → EpisodeScript...");

const script10 = toEpisodeScript(directed10, 2, "fr");
const script12 = toEpisodeScript(directed12, 3, "fr");

console.log(`  #2 (03-10): "${script10.title}"`);
console.log(`    sections: ${script10.sections.length} | types: ${script10.sections.map(s => s.type).join(", ")}`);
console.log(`    threadSummary: ${script10.threadSummary?.slice(0, 80)}`);
console.log(`    coverageTopics: ${script10.coverageTopics?.join(", ")}`);
console.log(`    duration: ${script10.totalDurationSec}s`);

console.log(`  #3 (03-12): "${script12.title}"`);
console.log(`    sections: ${script12.sections.length} | types: ${script12.sections.map(s => s.type).join(", ")}`);
console.log(`    threadSummary: ${script12.threadSummary?.slice(0, 80)}`);
console.log(`    coverageTopics: ${script12.coverageTopics?.join(", ")}`);
console.log(`    duration: ${script12.totalDurationSec}s`);

// --- Save episode files ---
console.log("\nSaving episode files...");

if (!fs.existsSync(EPISODES_DIR)) fs.mkdirSync(EPISODES_DIR, { recursive: true });

const ep10Path = path.join(EPISODES_DIR, "03-10.json");
const ep12Path = path.join(EPISODES_DIR, "03-12.json");

fs.writeFileSync(ep10Path, JSON.stringify({ script: script10, snapshot: snapshot10 }, null, 2));
console.log(`  Saved: ${ep10Path}`);

fs.writeFileSync(ep12Path, JSON.stringify({ script: script12, snapshot: snapshot12 }, null, 2));
console.log(`  Saved: ${ep12Path}`);

// --- Update manifest ---
console.log("\nUpdating manifest...");

const manifest = fs.existsSync(MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"))
  : [];

// Extract predictions from segments
function extractPredictions(script: any) {
  return script.sections
    .flatMap((s: any) => s.data?.predictions ?? [])
    .filter((p: any) => p && p.asset);
}

// Remove existing entries for these dates (idempotent)
const filtered = manifest.filter((e: any) => e.date !== "2026-03-10" && e.date !== "2026-03-12");

filtered.push({
  episodeNumber: 2,
  date: "2026-03-10",
  type: "daily_recap",
  lang: "fr",
  title: script10.title,
  filePath: ep10Path,
  predictions: extractPredictions(script10),
});

filtered.push({
  episodeNumber: 3,
  date: "2026-03-12",
  type: "daily_recap",
  lang: "fr",
  title: script12.title,
  filePath: ep12Path,
  predictions: extractPredictions(script12),
});

// Sort by date
filtered.sort((a: any, b: any) => a.date.localeCompare(b.date));

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(filtered, null, 2));
console.log(`  Manifest: ${filtered.length} entries`);
console.log(`  Dates: ${filtered.map((e: any) => `${e.date} (#${e.episodeNumber})`).join(", ")}`);

console.log("\nDone! These episodes will now appear in prevContext for future generate runs.");
