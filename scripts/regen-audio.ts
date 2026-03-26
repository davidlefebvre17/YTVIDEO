import "dotenv/config";
import { generateBeatAudio } from "@yt-maker/ai";
import * as fs from "fs";
import * as path from "path";

const date = "2026-03-24";
const epDir = `episodes/2026/03-24`;
const pubAudioDir = `packages/remotion-app/public/audio/ep-${date}`;

async function main() {
  const beats = JSON.parse(fs.readFileSync(`${epDir}/beats.json`, "utf-8"));
  console.log(`Provider: ${process.env.TTS_PROVIDER}`);
  console.log(`Beats: ${beats.length}`);

  const audioDir = path.join(epDir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(pubAudioDir, { recursive: true });

  const { manifest } = await generateBeatAudio(
    beats, "fr", audioDir, "audio/beats",
    { skipExisting: false },
  );
  console.log(`Generated: ${manifest.beats.length} audio files`);

  // Copy to public
  for (const b of beats) {
    if (!b.audioPath) continue;
    const src = path.join(audioDir, path.basename(b.audioPath));
    const dst = path.join(pubAudioDir, path.basename(b.audioPath));
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
  }

  // Fix paths for studio
  for (const b of beats) {
    if (b.audioPath) b.audioPath = `audio/ep-${date}/${path.basename(b.audioPath)}`;
    const imgFile = `editorial/ep-${date}/${b.id}.png`;
    if (fs.existsSync(`packages/remotion-app/public/${imgFile}`)) b.imagePath = imgFile;
  }

  // Sync durations
  const { parseFile } = await import("music-metadata");
  let synced = 0;
  for (const b of beats) {
    if (!b.audioPath) continue;
    const mp3 = path.join(pubAudioDir, path.basename(b.audioPath));
    if (!fs.existsSync(mp3)) continue;
    try {
      const meta = await parseFile(mp3);
      if (meta.format.duration) {
        b.timing = { ...b.timing, audioDurationSec: meta.format.duration };
        b.durationSec = meta.format.duration;
        synced++;
      }
    } catch {}
  }
  let cum = 0;
  for (const b of beats) { (b as any).startSec = cum; cum += b.durationSec; }
  console.log(`${synced} durations synced`);

  // Save
  fs.writeFileSync(`${epDir}/beats.json`, JSON.stringify(beats, null, 2));
  const props = JSON.parse(fs.readFileSync(`${epDir}/props.json`, "utf-8"));
  props.beats = beats;
  fs.writeFileSync(`${epDir}/props.json`, JSON.stringify(props, null, 2));
  console.log("Saved beats + props");
}

main().catch(err => { console.error("FAILED:", err); process.exit(1); });
