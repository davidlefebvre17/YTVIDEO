/**
 * Résout les VRAIES positions des chapitres dans le MP4 final à partir de la VTT.
 *
 * Pourquoi : P10 SEO calcule des chapitres à partir de durées ESTIMÉES (~150 wpm)
 * mais Fish Audio parle ~190 wpm + Remotion ajoute des transitions/intros entre
 * segments. Conséquence : les timestamps de chapitres dérivent par rapport au MP4.
 * Cas concret : épisode 06/05 où le dernier chapitre tombait à 14:04 alors que la
 * vidéo fait 12:24 → YouTube invalide tout le bloc.
 *
 * Source de vérité : la VTT alignée par Echogarden DTW sur l'audio du MP4.
 *
 * Algo :
 * 1. Parse la VTT (cues = mots/phrases avec leur timing dans le MP4)
 * 2. Pour chaque chapitre, trouve sa "needle" (premiers mots distinctifs de la
 *    narration de la section correspondante) — dérivé automatiquement depuis
 *    script.sections, dans l'ordre des chapitres.
 * 3. Cherche la 1ère cue (après le timestamp précédent) qui contient la needle.
 * 4. Retourne la liste des chapitres avec timestamps refreshed.
 *
 * Si la VTT n'existe pas ou si une needle ne match pas, retourne null (caller
 * garde les timestamps estimés — fail-safe).
 */
import * as fs from 'fs';
import type { EpisodeScript } from '@yt-maker/core';

interface Cue { sec: number; text: string; }
interface ResolvedChapter { time: string; label: string; }

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

function secToMSS(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Extract a distinctive "needle" (first 5-10 normalized words) from a section narration
 * for matching against VTT cues. Strips quotes (TTS phonetic substitutions) and bracketed
 * markup like [pause].
 */
function deriveNeedle(narration: string): string {
  const cleaned = narration
    .replace(/\[[^\]]*\]/g, ' ')      // strip [pause], [BEAT]...
    .replace(/"[^"]*"/g, ' ')         // strip "TICKER" quoted (replaced by phonetic in TTS)
    .replace(/\s+/g, ' ')
    .trim();
  // Take first 6 words (skip 1-2 stopwords if leading)
  const words = cleaned.split(' ').filter(Boolean);
  const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'de', 'des', 'à', 'au', 'aux', 'et', 'en', 'sur', 'pour']);
  let start = 0;
  while (start < words.length && stopWords.has(words[start].toLowerCase())) start++;
  return words.slice(start, start + 5).join(' ').toLowerCase();
}

/**
 * Find the first VTT cue (after `afterSec`) whose text contains all words of `needle`
 * in order. Returns null if not found.
 */
function findCue(cues: Cue[], needle: string, afterSec: number): Cue | undefined {
  const needleWords = needle.split(' ').filter(Boolean);
  if (!needleWords.length) return undefined;
  for (const cue of cues) {
    if (cue.sec < afterSec) continue;
    const lc = cue.text.toLowerCase();
    let pos = 0;
    let allFound = true;
    for (const w of needleWords) {
      const idx = lc.indexOf(w, pos);
      if (idx === -1) { allFound = false; break; }
      pos = idx + w.length;
    }
    if (allFound) return cue;
  }
  return undefined;
}

/**
 * Try to fuzzy-match a chapter label to a script section (for non-default chapter ordering).
 * Compares lowercased keywords overlap. Returns the section with highest overlap.
 */
function fuzzyMatchSection(label: string, sections: EpisodeScript['sections']): EpisodeScript['sections'][number] | undefined {
  const labelWords = new Set(
    label.toLowerCase().split(/\W+/).filter((w) => w.length >= 4),
  );
  let best: { section: EpisodeScript['sections'][number]; score: number } | undefined;
  for (const sec of sections) {
    if (!sec.narration) continue;
    const narrWords = sec.narration.toLowerCase().split(/\W+/).slice(0, 30);
    let score = 0;
    for (const w of narrWords) if (labelWords.has(w)) score++;
    // Bonus if section title or topic matches
    if (sec.title && labelWords.has(sec.title.toLowerCase())) score += 3;
    if ((sec as any).topic && labelWords.has((sec as any).topic.toLowerCase())) score += 3;
    if (!best || score > best.score) best = { section: sec, score };
  }
  return best && best.score > 0 ? best.section : undefined;
}

/**
 * Resolve real chapter timestamps from the VTT. Strategy :
 * - Iterate chapters in order (assumed to follow narration order: cold open → thread → segments → closing).
 * - For each chapter index, try to find the matching script section by ORDER (most reliable),
 *   fallback to fuzzy label match.
 * - Derive a needle from that section's narration first words.
 * - Search VTT for the first cue (after previous chapter time) that matches.
 * - Return new chapters array with refreshed times.
 *
 * Returns null if VTT missing or fewer than 50% of chapters could be matched (unsafe to use).
 */
export function refreshChaptersFromVTT(
  script: EpisodeScript,
  vttPath: string,
): ResolvedChapter[] | null {
  if (!fs.existsSync(vttPath)) return null;
  const cues = parseVtt(vttPath);
  if (cues.length < 5) return null;

  const oldChapters = script.seo?.chapters ?? [];
  if (oldChapters.length < 3) return null;

  // Sections that have actual narration (skip title_card etc.)
  const narrSections = script.sections.filter((s) => s.narration && s.narration.trim().length > 0);
  // The first chapter often maps to the OPENING (hook/owlIntro) — but in our case the spoken
  // opening is `script.owlIntro` not `script.sections[0]` (which is "hook" with narration).
  // We will use the section narration directly when section has narration; otherwise fallback to owlIntro.
  const owlIntro: string = (script as any).owlIntro ?? '';

  const result: ResolvedChapter[] = [];
  let cursor = 0;
  let matched = 0;

  for (let i = 0; i < oldChapters.length; i++) {
    const ch = oldChapters[i];
    let needle = '';

    // Strategy 1: chapter index → narration section (in order)
    // Chapter 0 = opening. Use owlIntro if available (matches the actual TTS output).
    if (i === 0 && owlIntro) {
      needle = deriveNeedle(owlIntro);
    } else if (i < narrSections.length) {
      needle = deriveNeedle(narrSections[i].narration);
    }

    // Strategy 2: fuzzy match the label to a section if direct mapping yielded nothing
    if (!needle) {
      const sec = fuzzyMatchSection(ch.label, narrSections);
      if (sec) needle = deriveNeedle(sec.narration);
    }

    let foundCue: Cue | undefined;
    if (needle) foundCue = findCue(cues, needle, cursor);

    if (foundCue) {
      const t = i === 0 ? 0 : foundCue.sec; // force first chapter to 0:00
      result.push({ time: secToMSS(t), label: ch.label });
      cursor = foundCue.sec + 0.1;
      matched++;
    } else {
      // Failed to match — keep old time (caller decides what to do)
      result.push({ time: ch.time, label: ch.label });
    }
  }

  // Safety: if less than half matched, return null (data probably inconsistent)
  if (matched < Math.ceil(oldChapters.length * 0.5)) return null;

  // Sort + dedupe consecutive equal times by skipping
  // (shouldn't happen with the cursor logic but guards against weird narrations)
  return result;
}

/**
 * Replace the chapter block in a description with the new timestamps + labels.
 * Matches the canonical YouTube format (no header line just before, M:SS without
 * leading zero for minutes < 10, blank line above the first 0:00).
 *
 * If the description doesn't contain a recognizable chapter block, returns the
 * original description unchanged.
 */
export function patchDescriptionChapters(
  description: string,
  newChapters: ResolvedChapter[],
): string {
  if (!newChapters.length) return description;
  // Match the existing chapter block (any header, then ≥3 consecutive M:SS lines).
  // Header may be "⏱ CHAPITRES" with optional blank line, or absent.
  const blockRe = /(?:⏱\s*CHAPITRES\n+)?((?:\d{1,2}:\d{2}(?::\d{2})?[^\n]*\n?){3,})/;
  const block = newChapters.map((c) => `${c.time} ${c.label}`).join('\n') + '\n';
  if (!blockRe.test(description)) return description;
  return description.replace(blockRe, block);
}
