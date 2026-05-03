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

const SegmentAnalysisSchema = z.object({
  segmentId: z.string().min(1),
  keyFacts: z.array(z.string()).default([]),
  technicalReading: z.string().optional().default(''),
  fundamentalContext: z.string().optional().default(''),
  narrativeHook: z.string().optional().default(''),
  scenarios: z.object({
    bullish: z.object({ target: z.string().optional(), condition: z.string().optional() }).passthrough().optional().nullable(),
    bearish: z.object({ target: z.string().optional(), condition: z.string().optional() }).passthrough().optional().nullable(),
  }).passthrough().optional().nullable(),
}).passthrough();

export const AnalysisBundleSchema = z.object({
  segments: z.array(SegmentAnalysisSchema).min(1, 'analysis: au moins 1 segment requis'),
  globalContext: z.object({
    marketMood: z.string().optional().default(''),
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

const ValidationIssueSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(3),
  severity: z.enum(['blocker', 'warning']),
}).passthrough();

export const ValidationResponseSchema = z.object({
  status: z.enum(['pass', 'needs_revision', 'ok']).optional(),
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
}).passthrough();
