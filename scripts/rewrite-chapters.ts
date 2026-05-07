/**
 * Réécrit la section "⏱ CHAPITRES" de la description d'une vidéo YouTube
 * en remplaçant les timestamps estimés par les vrais timestamps des segments
 * extraits depuis le VTT aligné par Echogarden.
 *
 * Usage:
 *   npx tsx scripts/rewrite-chapters.ts --video <id> --date <YYYY-MM-DD>
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getYoutubeClient } from './youtube/auth';

interface Cue { sec: number; text: string; }

function parseVtt(filePath: string): Cue[] {
  const vtt = fs.readFileSync(filePath, 'utf-8');
  const cues: Cue[] = [];
  for (const block of vtt.split(/\n\n/)) {
    const lines = block.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/(\d+):(\d+):(\d+)\.(\d+)\s+-->/);
      if (m) {
        const sec = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
        const text = lines.slice(i + 1).join(' ').trim();
        cues.push({ sec, text });
      }
    }
  }
  return cues;
}

function findFirstCue(cues: Cue[], needle: string): Cue | undefined {
  const n = needle.toLowerCase();
  return cues.find((c) => c.text.toLowerCase().includes(n));
}

function secToMMSS(sec: number): string {
  // YouTube canonical format: minutes WITHOUT leading zero ("0:00", "9:21", "11:22").
  // Padding minutes ("00:00") is technically valid but appears to confuse YouTube's
  // chapter parser in some cases — we mirror the format used by working creators.
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ChapterMarker {
  needle: string;
  label: string;
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const videoId = getArg('video');
  const date = getArg('date');
  if (!videoId || !date) {
    console.error('Usage: npx tsx scripts/rewrite-chapters.ts --video <id> --date <YYYY-MM-DD>');
    process.exit(1);
  }

  const [year, month, day] = date.split('-');
  const epDir = path.join(process.cwd(), 'episodes', year, `${month}-${day}`);
  const vttPath = path.join(epDir, `episode-${date}.vtt`);
  const scriptPath = path.join(epDir, 'script.json');

  if (!fs.existsSync(vttPath)) { console.error(`VTT not found: ${vttPath}`); process.exit(1); }
  if (!fs.existsSync(scriptPath)) { console.error(`Script not found: ${scriptPath}`); process.exit(1); }

  const cues = parseVtt(vttPath);
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const oldChapters: Array<{ time: string; label: string }> = script.seo?.chapters ?? [];

  // Map original chapter labels to distinctive needles found in narration.
  // Order MUST match the script flow: intro → thread → segments → closing.
  const markers: ChapterMarker[] = [
    { needle: "Aujourd", label: oldChapters[0]?.label ?? 'Intro' },
    { needle: 'désescalade diplomatique', label: oldChapters[1]?.label ?? 'Le fil du jour' },
    { needle: 'communiqué est tombé', label: oldChapters[2]?.label ?? 'Pétrole' },
    { needle: "L'indice boursier composite", label: oldChapters[3]?.label ?? 'KOSPI' },
    { needle: 'deux nouvelles crypto', label: oldChapters[4]?.label ?? 'Bitcoin' },
    { needle: 'dollar australien a gagné', label: oldChapters[5]?.label ?? 'Dollar australien' },
    { needle: "Toute l'Europe continentale", label: oldChapters[6]?.label ?? 'HSBC' },
    { needle: 'gagne zéro virgule', label: oldChapters[7]?.label ?? 'S&P 500' },
    { needle: 'Commençons par', label: oldChapters[8]?.label ?? 'Tour du monde' },
    { needle: 'Demain jeudi', label: oldChapters[9]?.label ?? 'À retenir' },
  ];

  const newChapters: Array<{ time: string; label: string }> = [];
  for (const m of markers) {
    const cue = findFirstCue(cues, m.needle);
    if (!cue) {
      console.warn(`  ⚠ marker not found: "${m.needle}" → skipping "${m.label}"`);
      continue;
    }
    newChapters.push({ time: secToMMSS(cue.sec), label: m.label });
  }

  // Force first chapter to 0:00 (YouTube requires it)
  if (newChapters[0]) newChapters[0].time = '0:00';

  console.log('New chapters:');
  for (const c of newChapters) console.log(`  ${c.time}  ${c.label}`);

  const youtube = getYoutubeClient();
  const list = await youtube.videos.list({ part: ['snippet'], id: [videoId] });
  const video = list.data.items?.[0];
  if (!video?.snippet) { console.error(`Video ${videoId} not found`); process.exit(1); }

  const oldDesc = video.snippet.description ?? '';

  // Replace the chapter block. We DROP the "⏱ CHAPITRES" header entirely:
  // the emoji ⏱ U+23F1 + uppercase header on the line before the first
  // timestamp seems to break YouTube's chapter parser. Format mirrors the
  // canonical layout used by creators where chapters reliably render.
  const chapterBlock = newChapters.map((c) => `${c.time} ${c.label}`).join('\n');
  const re = /(?:⏱\s*CHAPITRES\n+)?(?:\d{1,2}:\d{2}(?::\d{2})?[^\n]*\n?){3,}/;
  let newDesc = oldDesc;
  if (re.test(oldDesc)) {
    newDesc = oldDesc.replace(re, chapterBlock + '\n');
  } else {
    console.error('Could not locate chapter block in description.');
    process.exit(1);
  }

  if (oldDesc === newDesc) {
    console.log('Description already up to date.');
    return;
  }

  console.log('\nUpdating description...');
  await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet: { ...video.snippet, description: newDesc },
    },
  });

  console.log(`✓ Description updated for ${videoId}`);
  console.log(`  https://studio.youtube.com/video/${videoId}/edit`);

  // Persist the corrected chapters back into script.json
  if (script.seo) {
    script.seo.chapters = newChapters;
    // Also rewrite the "⏱ CHAPITRES" block inside script.seo.description for parity
    if (typeof script.seo.description === 'string') {
      script.seo.description = script.seo.description.replace(re, chapterBlock + '\n');
    }
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
    console.log(`✓ Persisted corrected chapters to ${scriptPath}`);
  }
}

main().catch((err) => { console.error('Failed:', err.message); process.exit(1); });
