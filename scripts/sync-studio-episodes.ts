/**
 * Sync episode list for Remotion Studio.
 * Scans episodes/ folders and generates an index file that Root.tsx imports.
 * Also copies each episode's images + audio to remotion-app/public/ for preview.
 *
 * Run before `npm run dev`:
 *   npx tsx scripts/sync-studio-episodes.ts
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "episodes");
const REMOTION_PUBLIC = path.join(ROOT, "packages", "remotion-app", "public");
const FIXTURE_DIR = path.join(ROOT, "packages", "remotion-app", "src", "fixtures");

interface EpisodeEntry {
  date: string;
  title: string;
  hasBeats: boolean;
  hasImages: boolean;
  hasAudio: boolean;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, "manifest.json"), "utf-8"));
  const entries: EpisodeEntry[] = [];

  for (const entry of manifest) {
    const { date, title, filePath } = entry;
    const dir = filePath;
    if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, "script.json"))) continue;

    const hasBeats = fs.existsSync(path.join(dir, "beats.json"));
    const hasImages = fs.existsSync(path.join(dir, "images")) &&
      fs.readdirSync(path.join(dir, "images")).filter((f: string) => f.endsWith(".png")).length > 0;
    const hasAudio = fs.existsSync(path.join(dir, "audio")) &&
      fs.readdirSync(path.join(dir, "audio")).filter((f: string) => f.endsWith(".mp3")).length > 0;

    entries.push({ date, title, hasBeats, hasImages, hasAudio });

    // Copy images to public/editorial/ep-DATE/
    if (hasImages) {
      const destImgDir = path.join(REMOTION_PUBLIC, "editorial", `ep-${date}`);
      if (!fs.existsSync(destImgDir)) fs.mkdirSync(destImgDir, { recursive: true });
      for (const img of fs.readdirSync(path.join(dir, "images")).filter((f: string) => f.endsWith(".png"))) {
        const src = path.join(dir, "images", img);
        const dst = path.join(destImgDir, img);
        if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
      }
    }

    // Copy audio to public/audio/ep-DATE/
    if (hasAudio) {
      const destAudDir = path.join(REMOTION_PUBLIC, "audio", `ep-${date}`);
      if (!fs.existsSync(destAudDir)) fs.mkdirSync(destAudDir, { recursive: true });
      for (const aud of fs.readdirSync(path.join(dir, "audio")).filter((f: string) => f.endsWith(".mp3"))) {
        const src = path.join(dir, "audio", aud);
        const dst = path.join(destAudDir, aud);
        if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
      }
    }
  }

  // Generate props per episode with beats
  const propsMap: Record<string, any> = {};
  for (const entry of entries) {
    const dir = manifest.find((m: any) => m.date === entry.date)?.filePath;
    if (!dir) continue;

    const script = JSON.parse(fs.readFileSync(path.join(dir, "script.json"), "utf-8"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(dir, "snapshot.json"), "utf-8"));

    let beats: any[] = [];
    if (entry.hasBeats) {
      beats = JSON.parse(fs.readFileSync(path.join(dir, "beats.json"), "utf-8"));
      // Rewrite image paths to per-episode public dir
      if (entry.hasImages) {
        for (const beat of beats) {
          if (beat.imagePath && (beat.imagePath.includes("editorial/") || beat.imagePath.includes("editorial\\"))) {
            beat.imagePath = `editorial/ep-${entry.date}/${path.basename(beat.imagePath)}`;
          }
        }
      }
      // Rewrite audio paths
      if (entry.hasAudio) {
        for (const beat of beats) {
          if (beat.audioPath) {
            beat.audioPath = `audio/ep-${entry.date}/${path.basename(beat.audioPath)}`;
          }
        }
      }
    }

    // Load owl audio paths if available
    let owlIntroAudio: string | undefined;
    let owlClosingAudio: string | undefined;
    const owlTransitionAudios: Record<string, string> = {};
    const owlPathsFile = path.join(dir, "owl-audio-paths.json");
    if (fs.existsSync(owlPathsFile)) {
      const owlPaths = JSON.parse(fs.readFileSync(owlPathsFile, "utf-8"));
      owlIntroAudio = owlPaths["owl_intro"];
      owlClosingAudio = owlPaths["owl_closing"];
      for (const sec of script.sections || []) {
        const key = `owl_tr_${sec.id}`;
        if (owlPaths[key]) owlTransitionAudios[sec.id] = owlPaths[key];
      }
    }

    propsMap[entry.date] = {
      script,
      beats,
      assets: snapshot.assets ?? [],
      news: snapshot.news ?? [],
      owlIntroAudio,
      owlClosingAudio,
      owlTransitionAudios,
    };
  }

  // Write episode index
  const indexPath = path.join(FIXTURE_DIR, "episode-index.json");
  fs.writeFileSync(indexPath, JSON.stringify({ entries, props: propsMap }, null, 2));

  console.log(`✓ ${entries.length} episodes synced to studio`);
  for (const e of entries) {
    const flags = [
      e.hasBeats ? "beats" : "",
      e.hasImages ? "images" : "",
      e.hasAudio ? "audio" : "",
    ].filter(Boolean).join("+");
    console.log(`  ${e.date} — ${e.title.slice(0, 50)} [${flags || "script only"}]`);
  }
  console.log(`\nIndex: ${indexPath}`);
}

main();
