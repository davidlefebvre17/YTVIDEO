/**
 * Enrich ValidationIssue records with `match`, `originalSentence`, and
 * `safetyClass`. Runs as a post-processing step on the issues returned by
 * `validateMechanical`, so the producer doesn't have to thread three new
 * fields through 20+ code paths.
 *
 * The enricher reads the issue.description (e.g. `Anglicisme "spread" interdit`),
 * extracts the match, and classifies the issue into syntactic vs semantic.
 *
 * - syntactic : code can fix in-place (parens stripping, digit→words, dashes,
 *               disclaimer removal, bullet markers, drama score mention).
 * - semantic  : Opus must rewrite the sentence preserving intent (anglicisms,
 *               recommandations déguisées, ton retail, redondances, sigles,
 *               société sans ticker, langage formel).
 */
import type { DraftScript, ValidationIssue, IssueSafetyClass } from "../types";
import { extractSentenceContaining } from "./sentence-extract";

interface ClassificationRule {
  /** Regex extracts the match group (1) from the description if present. */
  matchPattern?: RegExp;
  /** Static match for descriptions without a quoted token. */
  staticMatch?: string;
  /** Substring test against the description to apply this rule. */
  test: (desc: string) => boolean;
  safetyClass: IssueSafetyClass;
}

const RULES: ClassificationRule[] = [
  // ── Syntactic — code applies the fix deterministically ──
  {
    test: (d) => /drama\s*score/i.test(d),
    staticMatch: "drama score",
    safetyClass: "syntactic",
  },
  {
    test: (d) => d.includes("Disclaimer détecté"),
    safetyClass: "syntactic",
  },
  {
    test: (d) => d.includes("Parenthèses") || d.includes("crochets"),
    safetyClass: "syntactic",
  },
  {
    test: (d) => d.includes("Liste à puces"),
    safetyClass: "syntactic",
  },
  {
    test: (d) => d.includes("Tirets en cascade"),
    safetyClass: "syntactic",
  },
  {
    test: (d) => d.includes("Chiffres non convertis"),
    matchPattern: /Chiffres non convertis en lettres : ([^()]+)/,
    safetyClass: "syntactic",
  },
  {
    test: (d) => /[Aa]nnée abrégée|abréviation année/.test(d),
    safetyClass: "syntactic",
  },

  // ── Semantic — Opus must judge the rewrite ──
  {
    test: (d) => d.includes("Anglicisme"),
    matchPattern: /Anglicisme "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.includes("Sigle technique"),
    matchPattern: /Sigle technique "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.includes("nommée en clair sans ticker"),
    matchPattern: /Société "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.startsWith("Redondance "),
    matchPattern: /Redondance "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.includes("Langage écrit formel"),
    matchPattern: /Langage écrit formel "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.includes("Recommandation directe"),
    matchPattern: /Recommandation directe "([^"]+)"/,
    safetyClass: "semantic",
  },
  {
    test: (d) => d.includes("Ton retail"),
    matchPattern: /Ton retail "([^"]+)"/,
    safetyClass: "semantic",
  },

  // Structural / length issues — leave class undefined → falls back to
  // legacy full-regen retry. We don't try to surgically fix budget overruns
  // or missing segments.
];

function classify(issue: ValidationIssue): { match?: string; safetyClass?: IssueSafetyClass } {
  const desc = issue.description;
  for (const rule of RULES) {
    if (!rule.test(desc)) continue;
    let match: string | undefined;
    if (rule.matchPattern) {
      const m = desc.match(rule.matchPattern);
      if (m) match = m[1].trim();
    }
    if (!match && rule.staticMatch) match = rule.staticMatch;
    return { match, safetyClass: rule.safetyClass };
  }
  return {};
}

/**
 * Enrich each issue in-place with match, originalSentence, and safetyClass.
 * Returns the same array reference for chaining convenience.
 */
export function enrichIssues(issues: ValidationIssue[], draft: DraftScript): ValidationIssue[] {
  for (const issue of issues) {
    if (issue.safetyClass && issue.match && issue.originalSentence) continue;

    if (!issue.match || !issue.safetyClass) {
      const inferred = classify(issue);
      if (inferred.match && !issue.match) issue.match = inferred.match;
      if (inferred.safetyClass && !issue.safetyClass) issue.safetyClass = inferred.safetyClass;
    }

    if (!issue.originalSentence && issue.match && issue.segmentId) {
      const seg = draft.segments.find((s) => s.segmentId === issue.segmentId);
      if (seg) {
        const sentence = extractSentenceContaining(seg.narration, issue.match);
        if (sentence) issue.originalSentence = sentence;
      }
    }
  }
  return issues;
}
