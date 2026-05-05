/**
 * Locate the sentence containing a given character offset in a narration.
 * Splits on `.!?` while keeping `[pause]` / abbreviation-safe heuristics
 * loose enough that the call site is forgiving.
 *
 * Returns the trimmed sentence (without the terminator), or the whole input
 * if no sentence boundary is found (single-sentence narrations).
 */
export function extractSentenceAt(narration: string, offset: number): string {
  if (!narration) return "";
  const safeOffset = Math.max(0, Math.min(offset, narration.length - 1));

  // Walk backward for the start of the sentence : nearest `.!?` that is not
  // followed immediately by a space-and-letter (to avoid splitting "U.S.A.").
  let start = 0;
  for (let i = safeOffset - 1; i > 0; i--) {
    const ch = narration[i];
    if (ch === "." || ch === "!" || ch === "?") {
      // Don't split inside a "[pause]" tag or after a single-letter abbrev.
      const prev2 = narration.slice(Math.max(0, i - 4), i);
      if (/^\[pause/i.test(narration.slice(i - 6, i))) continue;
      if (/^\s[A-Z]\.$/.test(narration.slice(i - 2, i + 1))) continue;
      start = i + 1;
      break;
    }
  }

  // Walk forward for the end : nearest `.!?` after the offset.
  let end = narration.length;
  for (let i = safeOffset; i < narration.length; i++) {
    const ch = narration[i];
    if (ch === "." || ch === "!" || ch === "?") {
      // Skip terminators inside [pause] tags.
      const ahead = narration.slice(Math.max(0, i - 6), i);
      if (/\[pause/i.test(ahead)) continue;
      end = i + 1;
      break;
    }
  }

  return narration.slice(start, end).trim();
}

/**
 * Locate the sentence containing the first occurrence of `match` in `narration`.
 * Returns "" if the match isn't found.
 */
export function extractSentenceContaining(narration: string, match: string): string {
  if (!narration || !match) return "";
  const idx = narration.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return "";
  return extractSentenceAt(narration, idx);
}
