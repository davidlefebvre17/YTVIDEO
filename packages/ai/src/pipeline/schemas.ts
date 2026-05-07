/**
 * Schémas Zod pour valider les sorties LLM (C1, C2, C3, C4, C5).
 *
 * Stratégie : schémas LÂCHES — on attrape juste les structures clairement
 * malformées (champ manquant, mauvais type, array vide quand requis non-vide).
 * On ne valide PAS les enums littéraux (trop fragile), on accepte des strings.
 *
 * Usage côté pipeline phase :
 *   const draft = await generateStructuredJSON(systemPrompt, userMessage, {
 *     role: 'quality',
 *     validate: zodValidator(DraftScriptSchema),
 *   });
 */
import { z } from 'zod';

/** Wrapper qui retourne un validateur compatible avec LLMOptions.validate. */
export function zodValidator<T>(schema: z.ZodType<T>) {
  return (parsed: unknown): T => schema.parse(parsed);
}

// ─── C1 Editorial Plan ──────────────────────────────────────

const PlannedSegmentSchema = z.object({
  id: z.string().min(1),
  depth: z.string().min(1),
  topic: z.string().min(1),
  assets: z.array(z.string()).default([]),
  angle: z.string().optional(),
  durationTargetSec: z.number().optional(),
}).passthrough();

export const EditorialPlanSchema = z.object({
  date: z.string().min(8),
  dominantTheme: z.string().min(3),
  threadSummary: z.string().min(5),
  moodMarche: z.string().min(3),
  coldOpenFact: z.string().min(3),
  closingTeaser: z.string().min(3),
  segments: z.array(PlannedSegmentSchema).min(1, 'editorial: au moins 1 segment requis'),
}).passthrough();

// ─── C2 Analysis Bundle ─────────────────────────────────────

// Helper : champ string toléré "absent" (undefined) ET "vide" (null) — Sonnet renvoie
// parfois null pour signifier "pas pertinent ici" (ex: technicalReading sur panorama
// sans données techniques). On accepte les 2, on remplace par '' pour le code aval.
const optionalStringTolerant = z.preprocess(
  (v) => (v == null ? '' : v),
  z.string().default(''),
);

const ScenarioSchema = z.object({
  // target/condition peuvent être null si Sonnet hésite sur un chiffre (ex: panorama)
  target: optionalStringTolerant,
  condition: optionalStringTolerant,
}).passthrough().optional().nullable();

const SegmentAnalysisSchema = z.object({
  segmentId: z.string().min(1),
  keyFacts: z.array(z.string()).default([]),
  technicalReading: optionalStringTolerant,
  fundamentalContext: optionalStringTolerant,
  narrativeHook: optionalStringTolerant,
  scenarios: z.object({
    bullish: ScenarioSchema,
    bearish: ScenarioSchema,
  }).passthrough().optional().nullable(),
}).passthrough();

export const AnalysisBundleSchema = z.object({
  segments: z.array(SegmentAnalysisSchema).min(1, 'analysis: au moins 1 segment requis'),
  globalContext: z.object({
    marketMood: optionalStringTolerant,
  }).passthrough(),
}).passthrough();

// ─── C3 Draft Script ────────────────────────────────────────

const NarrationBlockSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional().default(''),
  narration: z.string().optional().default(''),
  durationSec: z.number().optional(),
  wordCount: z.number().optional(),
}).passthrough();

const NarrationSegmentSchema = z.object({
  segmentId: z.string().min(1),
  title: z.string().min(1),
  narration: z.string().min(20, 'segment: narration trop courte'),
  assets: z.array(z.string()).default([]),
  durationSec: z.number().optional(),
  wordCount: z.number().optional(),
}).passthrough();

export const DraftScriptSchema = z.object({
  date: z.string().min(8),
  title: z.string().min(5),
  description: z.string().min(10),
  coldOpen: NarrationBlockSchema,
  thread: NarrationBlockSchema,
  segments: z.array(NarrationSegmentSchema).min(1, 'draft: au moins 1 segment requis'),
  closing: NarrationBlockSchema,
  metadata: z.object({
    totalWordCount: z.number().optional(),
    dominantTheme: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

// ─── C4 Validation Response ─────────────────────────────────

// severity tolérante : Haiku invente parfois "critical", "info", "error" — on les
// remappe vers blocker/warning pour éviter retry inutile.
const severityTolerant = z.preprocess((v) => {
  if (typeof v !== 'string') return 'warning';
  const norm = v.toLowerCase().trim();
  if (['blocker', 'critical', 'error', 'fatal', 'high'].includes(norm)) return 'blocker';
  return 'warning'; // tout le reste (warning, info, low, medium, etc.)
}, z.enum(['blocker', 'warning']));

const ValidationIssueSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(3),
  severity: severityTolerant,
}).passthrough();

// status tolérant : on accepte des variantes ('passed', 'needs revision', etc.)
const statusTolerant = z.preprocess((v) => {
  if (typeof v !== 'string') return undefined;
  const norm = v.toLowerCase().trim().replace(/[\s_-]+/g, '_');
  if (['pass', 'passed', 'ok', 'success'].includes(norm)) return 'pass';
  if (['needs_revision', 'revise', 'revision', 'fail', 'failed'].includes(norm)) return 'needs_revision';
  return v; // laisser passer si déjà 'ok'
}, z.enum(['pass', 'needs_revision', 'ok']).optional());

export const ValidationResponseSchema = z.object({
  status: statusTolerant,
  issues: z.array(ValidationIssueSchema).default([]),
}).passthrough();

// ─── C5 Direction ───────────────────────────────────────────

export const DirectionSchema = z.object({
  arc: z.array(z.any()).optional(),
  transitions: z.array(z.any()).optional(),
  chartTimings: z.array(z.any()).optional(),
  moodMusic: z.string().optional(),
  thumbnailMoment: z.object({
    segmentId: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

// ─── C10 SEO Metadata ───────────────────────────────────────

const SEOChapterSchema = z.object({
  time: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'time must be MM:SS or HH:MM:SS'),
  label: z.string().min(3, 'chapter label trop court').max(80, 'chapter label trop long'),
}).passthrough();

export const SEOMetadataSchema = z.object({
  title: z.string().min(20, 'title trop court').max(85, 'title trop long'),
  description: z.string().min(200, 'description trop courte (<200 chars)'),
  chapters: z.array(SEOChapterSchema).min(3, 'au moins 3 chapitres requis').max(12, 'max 12 chapitres'),
  tags: z.array(z.string().min(2).max(60)).min(5, 'au moins 5 tags requis').max(15, 'max 15 tags'),
  hashtags: z.array(z.string().min(2).max(30)).min(2, 'au moins 2 hashtags').max(5, 'max 5 hashtags'),
  // REQUIRED (pas .optional()) — sans cela, Sonnet skippe régulièrement le champ
  // alors que le prompt le demande. Le retry P10 (3 attempts) force la génération
  // si Zod fail. Si malgré tout le LLM échoue 3x, le mechanical fallback dans
  // p10-seo.ts génère un pinnedComment de remplacement.
  pinnedComment: z.string().min(80, 'pinnedComment manquant ou trop court (<80 chars)').max(500, 'pinnedComment trop long (>500 chars)'),
}).passthrough();
