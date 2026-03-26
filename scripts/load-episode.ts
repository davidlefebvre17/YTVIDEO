/**
 * Load a specific episode into Remotion Studio for preview.
 * Copies episode props to the fixture file used by BeatDaily.
 *
 * Usage:
 *   npx tsx scripts/load-episode.ts 2026-03-24
 *   npx tsx scripts/load-episode.ts latest
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "episodes");
const FIXTURE = path.join(ROOT, "packages", "remotion-app", "src", "fixtures", "real-beats.json");

function main() {
  let dateArg = process.argv[2];

  if (!dateArg || dateArg === "latest") {
    // Find latest episode from manifest
    const manifest = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, "manifest.json"), "utf-8"));
    const sorted = manifest.sort((a: any, b: any) => b.date.localeCompare(a.date));
    dateArg = sorted[0]?.date;
    if (!dateArg) { console.error("No episodes found"); process.exit(1); }
  }

  const year = dateArg.slice(0, 4);
  const monthDay = dateArg.slice(5);
  const epDir = path.join(EPISODES_DIR, year, monthDay);

  // Try props.json first (has everything), then build from parts
  const propsPath = path.join(epDir, "props.json");
  if (fs.existsSync(propsPath)) {
    fs.copyFileSync(propsPath, FIXTURE);
    console.log(`✓ Loaded ${dateArg} from props.json`);
  } else {
    // Build props from script + snapshot + beats
    const script = JSON.parse(fs.readFileSync(path.join(epDir, "script.json"), "utf-8"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(epDir, "snapshot.json"), "utf-8"));
    const beatsPath = path.join(epDir, "beats.json");
    const beats = fs.existsSync(beatsPath) ? JSON.parse(fs.readFileSync(beatsPath, "utf-8")) : [];

    const props = {
      script,
      beats,
      assets: snapshot.assets ?? [],
      news: snapshot.news ?? [],
    };
    fs.writeFileSync(FIXTURE, JSON.stringify(props, null, 2));
    console.log(`✓ Loaded ${dateArg} (built from script + snapshot + beats)`);
  }

  // List what's available
  const has = (f: string) => fs.existsSync(path.join(epDir, f)) ? "✓" : "✗";
  console.log(`  ${has("script.json")} script | ${has("beats.json")} beats | ${has("snapshot.json")} snapshot`);
  console.log(`  ${has("images")} images/ | ${has("audio")} audio/ | ${has("pipeline")} pipeline/`);
  console.log(`\nOuvre le studio: npm run dev → BeatEpisodes/BeatDaily`);
}

main();
