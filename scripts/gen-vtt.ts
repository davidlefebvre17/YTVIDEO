/**
 * Generate WebVTT subtitles via forced alignment (Echogarden DTW).
 *
 * Reads :
 *   - episodes/YYYY/MM-DD/script.json (owlIntro + sections + owlClosing narration)
 *   - episodes/YYYY/MM-DD/episode-YYYY-MM-DD.mp4 (final video, audio extracted via ffmpeg)
 *
 * Writes :
 *   - episodes/YYYY/MM-DD/episode-YYYY-MM-DD.vtt (word-perfect timestamps)
 *
 * Why forced alignment (not proportional split) :
 * The TTS adds pauses, the cold-open punch card has no narration, the owl video
 * has its own audio track, and segment boundaries don't align with audio chunks
 * proportionally. Echogarden handles all that by anchoring text to actual voice
 * frames in the audio.
 *
 * Usage :
 *   npm run vtt -- --date 2026-05-04
 *   npm run vtt -- --date 2026-05-04 --max-words 6 --max-sec 4
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Echogarden from 'echogarden';
import type { EpisodeScript } from '@yt-maker/core';

interface CLIArgs {
  date?: string;
  maxWords: number;
  maxSec: number;
}

interface WordEntry {
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf16?: number;
  endOffsetUtf16?: number;
}

function parseArgs(argv: string[]): CLIArgs {
  const out: CLIArgs = { maxWords: 7, maxSec: 5 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) { out.date = argv[i + 1]; i++; }
    else if (argv[i] === '--max-words' && argv[i + 1]) { out.maxWords = Number(argv[i + 1]); i++; }
    else if (argv[i] === '--max-sec' && argv[i + 1]) { out.maxSec = Number(argv[i + 1]); i++; }
  }
  return out;
}

function projectRoot(): string {
  return path.resolve(__dirname, '..');
}

function vttTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const mmm = ms % 1_000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mmm).padStart(3, '0')}`;
}

/**
 * Build the full narration text in playback order.
 * Owl intro (during owl video clips) → script sections → owl closing.
 * Each chunk is separated by a single space so the offset map matches Echogarden's
 * tokenization.
 */
function buildFullNarration(script: EpisodeScript): string {
  const parts: string[] = [];

  if (script.owlIntro?.trim()) parts.push(cleanForAlignment(script.owlIntro));

  for (const section of script.sections) {
    if (section.narration?.trim()) parts.push(cleanForAlignment(section.narration));
  }

  if (script.owlClosing?.trim()) parts.push(cleanForAlignment(script.owlClosing));

  return parts.join(' ');
}

function cleanForAlignment(text: string): string {
  return text
    .replace(/\[(emphasis|pause|long pause|excited|soft|breathy|whispering|sighing|clear throat|angry|sad|embarrassed)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reconstruct the original text slice for a word range using UTF-16 offsets.
 * Echogarden strips punctuation in word.text, but provides start/endOffsetUtf16
 * pointing to the original text so we can recover the punctuated form.
 */
function recoverOriginalSlice(words: WordEntry[], sourceText: string): string {
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return '';
  const start = first.startOffsetUtf16;
  const end = last.endOffsetUtf16;
  if (start == null || end == null) {
    return words.map(w => w.text).join(' ');
  }
  return sourceText.slice(start, end).replace(/\s+/g, ' ').trim();
}

/**
 * Group word-level alignment into VTT cues respecting maxWords + maxSec.
 * Splits preferably on sentence boundaries (.!?), then on commas, then by word count.
 */
function groupWordsIntoCues(
  words: WordEntry[],
  sourceText: string,
  maxWords: number,
  maxSec: number,
): Array<{ start: number; end: number; text: string }> {
  if (words.length === 0) return [];

  const cues: Array<{ start: number; end: number; text: string }> = [];
  let bufferWords: WordEntry[] = [];

  const flush = () => {
    if (bufferWords.length === 0) return;
    const text = recoverOriginalSlice(bufferWords, sourceText);
    if (text) {
      cues.push({
        start: bufferWords[0]!.startTime,
        end: bufferWords[bufferWords.length - 1]!.endTime,
        text,
      });
    }
    bufferWords = [];
  };

  // Look at the punctuation IN THE SOURCE following each word (not in word.text)
  const peekPunct = (word: WordEntry): { sentence: boolean; clause: boolean } => {
    const off = word.endOffsetUtf16;
    if (off == null) return { sentence: false, clause: false };
    // Skip whitespace right after the word, look at next non-space char
    let i = off;
    while (i < sourceText.length && /\s/.test(sourceText[i]!)) i++;
    const next = sourceText[i] ?? '';
    return {
      sentence: /[.!?]/.test(next),
      clause: /[,;:—]/.test(next),
    };
  };

  for (const word of words) {
    bufferWords.push(word);
    const { sentence, clause } = peekPunct(word);
    const wordCountReached = bufferWords.length >= maxWords;
    const durationReached =
      bufferWords[bufferWords.length - 1]!.endTime - bufferWords[0]!.startTime >= maxSec;

    if (sentence || wordCountReached || durationReached) {
      flush();
    } else if (clause && bufferWords.length >= Math.ceil(maxWords / 2)) {
      flush();
    }
  }

  flush();
  return cues;
}

function buildVTT(cues: Array<{ start: number; end: number; text: string }>): string {
  const lines: string[] = ['WEBVTT', '', 'NOTE Owl Street Journal — Echogarden DTW alignment', ''];
  let cueIndex = 1;
  let lastEnd = 0;

  for (const cue of cues) {
    const start = Math.max(cue.start, lastEnd);
    if (start >= cue.end) continue;
    if (!cue.text.trim()) continue;
    lines.push(String(cueIndex++));
    lines.push(`${vttTime(start)} --> ${vttTime(cue.end)}`);
    lines.push(cue.text.trim());
    lines.push('');
    lastEnd = cue.end;
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.date) {
    console.error('Usage: npm run vtt -- --date YYYY-MM-DD [--max-words 7] [--max-sec 5]');
    process.exit(1);
  }

  const root = projectRoot();
  const [y, m, d] = args.date.split('-');
  const epDir = path.join(root, 'episodes', y!, `${m}-${d}`);
  const scriptPath = path.join(epDir, 'script.json');
  const mp4Path = path.join(epDir, `episode-${args.date}.mp4`);

  if (!fs.existsSync(scriptPath)) {
    console.error(`script.json not found at ${scriptPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(mp4Path)) {
    console.error(`MP4 not found at ${mp4Path} — render first with \`npx remotion render ...\``);
    process.exit(1);
  }

  const script: EpisodeScript = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const fullText = buildFullNarration(script);

  console.log(`\n═══ VTT generation (Echogarden DTW) — ${args.date} ═══`);
  console.log(`  MP4         : ${mp4Path}`);
  console.log(`  Text length : ${fullText.length} chars (${fullText.split(/\s+/).filter(Boolean).length} words)`);
  console.log(`  Max cues    : ${args.maxWords} words / ${args.maxSec}s`);
  console.log(`  Aligning... (this can take 1-3 min)`);

  const t0 = Date.now();
  const result = await Echogarden.align(mp4Path, fullText, {
    engine: 'dtw',
    language: 'fr',
    crop: false,
    dtw: { granularity: 'high' },
  } as any);

  const wordTimeline = (result as any).wordTimeline as WordEntry[] | undefined;
  if (!wordTimeline || wordTimeline.length === 0) {
    console.error(`  ✗ Echogarden returned no word timeline`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  Aligned ${wordTimeline.length} words in ${elapsed}s`);

  const cues = groupWordsIntoCues(wordTimeline, fullText, args.maxWords, args.maxSec);
  const vtt = buildVTT(cues);

  const outPath = path.join(epDir, `episode-${args.date}.vtt`);
  fs.writeFileSync(outPath, vtt);

  // Tiny preview of first 3 cues
  const firstWord = wordTimeline[0]!;
  const lastWord = wordTimeline[wordTimeline.length - 1]!;
  console.log(`  First word  : "${firstWord.text}" @ ${firstWord.startTime.toFixed(2)}s`);
  console.log(`  Last word   : "${lastWord.text}" @ ${lastWord.endTime.toFixed(2)}s`);
  console.log(`  Total cues  : ${cues.length}`);
  console.log(`  ✓ ${outPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
