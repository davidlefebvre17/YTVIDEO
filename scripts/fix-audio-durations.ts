/**
 * Read real MP3 durations and update beat-test-props.json + fixture.
 * Fixes voice cutoff by using actual audio duration instead of word-count estimate.
 */
import { parseFile } from "music-metadata";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const AUDIO_DIR = join(ROOT, "packages/remotion-app/public/audio/beats");
const FIXTURE_PATH = join(ROOT, "packages/remotion-app/src/fixtures/real-beats.json");
const PROPS_PATH = join(ROOT, "data/beat-test-props.json");

async function main() {
  const data = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
  const beats = data.beats as any[];

  let updated = 0;
  let totalEstimated = 0;
  let totalReal = 0;

  for (const beat of beats) {
    if (!beat.audioPath) continue;

    const mp3Path = join(ROOT, "packages/remotion-app/public", beat.audioPath);
    if (!existsSync(mp3Path)) continue;

    try {
      const meta = await parseFile(mp3Path);
      const realDuration = meta.format.duration ?? 0;
      if (realDuration <= 0) continue;

      const estimated = beat.timing?.estimatedDurationSec ?? beat.durationSec;
      totalEstimated += estimated;
      totalReal += realDuration;

      // Update beat with real audio duration
      beat.timing = {
        ...beat.timing,
        estimatedDurationSec: estimated,
        audioDurationSec: realDuration,
      };
      beat.durationSec = realDuration;

      updated++;

      const diff = realDuration - estimated;
      if (Math.abs(diff) > 1) {
        console.log(`  ${beat.id}: estimated ${estimated.toFixed(1)}s → real ${realDuration.toFixed(1)}s (${diff > 0 ? '+' : ''}${diff.toFixed(1)}s)`);
      }
    } catch (err) {
      console.warn(`  ${beat.id}: failed to read MP3 - ${(err as Error).message.slice(0, 60)}`);
    }
  }

  // Recalculate startSec for all beats
  let cumSec = 0;
  for (const beat of beats) {
    beat.startSec = Math.round(cumSec * 100) / 100;
    cumSec += beat.durationSec;
  }

  // Save
  writeFileSync(FIXTURE_PATH, JSON.stringify(data, null, 2));
  writeFileSync(PROPS_PATH, JSON.stringify(data, null, 2));

  console.log(`\n${updated} beats updated with real MP3 durations`);
  console.log(`Total estimated: ${totalEstimated.toFixed(1)}s → real: ${totalReal.toFixed(1)}s (${(totalReal - totalEstimated) > 0 ? '+' : ''}${(totalReal - totalEstimated).toFixed(1)}s)`);
}

main().catch(console.error);
