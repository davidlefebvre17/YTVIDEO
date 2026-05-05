/**
 * Syntactic fixes — code-side, deterministic transforms applied to a DraftScript
 * BEFORE any LLM retry. Handles the 6 issue types where the correction is
 * grammatically inert (no surrounding context dependency).
 *
 * Anything semantic (anglicisms that need rewording, ton retail, compliance,
 * sigles, redondances) is OUT of scope here — it goes to runC3Patch.
 */
import type { DraftScript, ValidationIssue } from "../types";

/** Convert integer string to French words (0-999_999_999). Lifted from
 *  generate-beat-audio.ts so multiple pipeline stages can reuse without an
 *  audio dependency. */
export function numberToFrench(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num) || num < 0) return n;
  if (num === 0) return "zéro";
  const units = [
    "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
  ];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  if (num < 20) return units[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) return tens[t] + "-" + units[10 + u];
    if (u === 0) return tens[t] + (t === 8 ? "s" : "");
    if (u === 1 && t !== 8) return tens[t] + " et un";
    return tens[t] + "-" + units[u];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const hPart = h === 1 ? "cent" : units[h] + " cent";
    if (rest === 0) return hPart + (h > 1 ? "s" : "");
    return hPart + " " + numberToFrench(String(rest));
  }
  if (num < 1000000) {
    const th = Math.floor(num / 1000);
    const rest = num % 1000;
    const thPart = th === 1 ? "mille" : numberToFrench(String(th)) + " mille";
    if (rest === 0) return thPart;
    return thPart + " " + numberToFrench(String(rest));
  }
  if (num < 1000000000) {
    const mil = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const milPart = mil === 1 ? "un million" : numberToFrench(String(mil)) + " millions";
    if (rest === 0) return milPart;
    return milPart + " " + numberToFrench(String(rest));
  }
  return n;
}

/**
 * Strip parentheses and brackets — both the markers AND the content that
 * commonly lives inside them in narration drafts. Heuristic : if the content
 * fits on one line and is short (<60 chars), drop it; otherwise keep content
 * but drop just the markers (an Opus retry can refine).
 */
function stripParens(text: string): string {
  // Drop short parenthetical asides entirely.
  let out = text.replace(/\s*\([^()]{0,60}\)/g, "");
  out = out.replace(/\s*\[[^\[\]]{0,60}\]/g, "");
  // Strip lone markers if any survived.
  out = out.replace(/[(\[\])]/g, "");
  // Collapse double spaces created by deletion.
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

/** Replace cascade dashes (3+ em-dashes in a sentence) by commas. */
function fixCascadeDashes(text: string): string {
  const sentences = text.split(/([.!?]+\s*)/);
  return sentences
    .map((part, i) => {
      if (i % 2 === 1) return part; // separators
      const dashCount = (part.match(/—/g) ?? []).length;
      if (dashCount > 2) return part.replace(/—/g, ",");
      return part;
    })
    .join("")
    .replace(/\s*,\s*/g, ", ")
    .replace(/[ \t]{2,}/g, " ");
}

/** Convert digit numbers to French words. Three rules :
 *   1. Skip digits inside quoted tickers ("CL=F", "9984.T") and [pause] tags.
 *   2. Skip digits glued to letters (T2, A380, COVID-19, Q1) — these are codes,
 *      not numbers.
 *   3. Handle French decimal comma : "7,28" → "sept virgule vingt-huit", as a
 *      single unit rather than two independent integers. */
function digitsToFrench(text: string): string {
  // Find quoted regions to mask.
  const masked: Array<[number, number]> = [];
  for (const m of text.matchAll(/"[^"]+"/g)) {
    masked.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(/\[pause\]/gi)) {
    masked.push([m.index!, m.index! + m[0].length]);
  }
  const inMasked = (idx: number) => masked.some(([s, e]) => idx >= s && idx < e);

  // Match a number that is :
  //  - bordered by start/whitespace/punctuation on the left (no letter before)
  //  - followed by an optional French decimal (",NN")
  //  - bordered by end/whitespace/punctuation on the right (no letter after)
  // The boundary check ensures "T2" and "A380" don't match.
  return text.replace(
    /(^|[\s,.;:!?()«»"'—–\-])(\d+)(?:,(\d+))?(?=$|[\s,.;:!?()«»"'—–])/g,
    (full, prefix, intPart, decPart, offset) => {
      // offset points at the start of `prefix`, so the digit starts at offset + prefix.length
      const digitOffset = (offset as number) + (prefix as string).length;
      if (inMasked(digitOffset)) return full;
      const intWords = numberToFrench(intPart as string);
      if (decPart) {
        return `${prefix}${intWords} virgule ${numberToFrench(decPart as string)}`;
      }
      return `${prefix}${intWords}`;
    },
  );
}

/** Strip bullet markers at line start, normalize to inline prose. */
function stripBullets(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s+/, "").replace(/^\s*\d+\.\s+/, ""))
    .join("\n")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ");
}

/** Remove the literal "drama score" mention (and its enclosing parenthetical
 *  if any). Drama score is internal scoring, never to surface in narration. */
function stripDramaScore(text: string): string {
  return text
    .replace(/\(?\s*drama\s*score[^)\.]*\)?/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/** Remove disclaimer-like phrases from narration. The visual banner is the
 *  authoritative disclaimer; oral repetition is forbidden. */
const DISCLAIMER_REGEXES: RegExp[] = [
  /Rappel[,]?\s*ce contenu est[^.]+\./gi,
  /Ce[s]?\s*propos\s*ne\s*constituent[^.]+\./gi,
  /Aucun\s*conseil\s*en\s*investissement[^.]+\./gi,
  /Investir\s*comporte\s*des?\s*risques?[^.]+\./gi,
];
function stripDisclaimer(text: string): string {
  let out = text;
  for (const re of DISCLAIMER_REGEXES) out = out.replace(re, "");
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

export interface SyntacticFixResult {
  patched: DraftScript;
  applied: number;
  unhandled: ValidationIssue[];
}

/**
 * Apply all syntactic fixes for the given issues. Returns a new draft (the
 * input is shallow-cloned per segment) plus counts.
 *
 * The function is idempotent — running it twice yields the same output.
 */
export function applySyntacticFixes(
  draft: DraftScript,
  issues: ValidationIssue[],
): SyntacticFixResult {
  const syntactic = issues.filter((i) => i.safetyClass === "syntactic" && i.severity === "blocker");
  if (syntactic.length === 0) return { patched: draft, applied: 0, unhandled: [] };

  // Group issues by segmentId (or 'global' for whole-script issues).
  const byScope = new Map<string, ValidationIssue[]>();
  for (const issue of syntactic) {
    const key = issue.segmentId ?? "__global__";
    (byScope.get(key) ?? byScope.set(key, []).get(key))!.push(issue);
  }

  let applied = 0;
  const unhandled: ValidationIssue[] = [];

  // Helper : apply transforms to a narration based on the issues attached.
  const applyToNarration = (text: string, issuesForScope: ValidationIssue[]): string => {
    let out = text;
    for (const issue of issuesForScope) {
      const desc = issue.description;
      if (/drama\s*score/i.test(desc)) {
        out = stripDramaScore(out);
        applied++;
      } else if (desc.includes("Disclaimer détecté")) {
        out = stripDisclaimer(out);
        applied++;
      } else if (desc.includes("Parenthèses") || desc.includes("crochets")) {
        out = stripParens(out);
        applied++;
      } else if (desc.includes("Liste à puces")) {
        out = stripBullets(out);
        applied++;
      } else if (desc.includes("Tirets en cascade")) {
        out = fixCascadeDashes(out);
        applied++;
      } else if (desc.includes("Chiffres non convertis")) {
        out = digitsToFrench(out);
        applied++;
      } else {
        unhandled.push(issue);
      }
    }
    return out;
  };

  // Build a patched draft — shallow-clone segments we touch.
  const patched: DraftScript = {
    ...draft,
    segments: draft.segments.map((seg) => {
      const segIssues = byScope.get(seg.segmentId);
      if (!segIssues || segIssues.length === 0) return seg;
      const newNarration = applyToNarration(seg.narration, segIssues);
      if (newNarration === seg.narration) return seg;
      return { ...seg, narration: newNarration };
    }),
  };

  // Apply global-scope issues (e.g. drama score across whole text) to all
  // segments + cold open / thread / closing if relevant.
  const globalIssues = byScope.get("__global__") ?? [];
  if (globalIssues.length) {
    patched.segments = patched.segments.map((seg) => ({
      ...seg,
      narration: applyToNarration(seg.narration, globalIssues),
    }));
    if (patched.coldOpen) patched.coldOpen = { ...patched.coldOpen, narration: applyToNarration(patched.coldOpen.narration, globalIssues) };
    if (patched.thread) patched.thread = { ...patched.thread, narration: applyToNarration(patched.thread.narration, globalIssues) };
    if (patched.closing) patched.closing = { ...patched.closing, narration: applyToNarration(patched.closing.narration, globalIssues) };
  }

  return { patched, applied, unhandled };
}
