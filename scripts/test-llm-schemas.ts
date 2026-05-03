/**
 * Tests unitaires : schémas Zod sur les sorties LLM.
 * Exécution : npx tsx scripts/test-llm-schemas.ts
 */
import {
  EditorialPlanSchema,
  AnalysisBundleSchema,
  DraftScriptSchema,
  ValidationResponseSchema,
  DirectionSchema,
} from '../packages/ai/src/pipeline/schemas';

let passed = 0;
let failed = 0;

function expectValid(schema: any, payload: unknown, label: string) {
  try {
    schema.parse(payload);
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${label}\n      ${(e as Error).message.slice(0, 150)}`);
  }
}

function expectInvalid(schema: any, payload: unknown, label: string) {
  try {
    schema.parse(payload);
    failed++;
    console.log(`  ✗ ${label} — accepté alors que devait fail`);
  } catch {
    passed++;
    console.log(`  ✓ ${label}`);
  }
}

// ─── EditorialPlan (C1) ─────────────────────────────────────
console.log('=== EditorialPlanSchema ===');

const validEditorial = {
  date: '2026-04-28',
  dominantTheme: 'Triple décision banques centrales',
  threadSummary: 'Fed, BoJ et BCE convergent cette semaine',
  moodMarche: 'incertain',
  coldOpenFact: 'Trois rendez-vous majeurs',
  closingTeaser: 'Que va faire la Fed mercredi ?',
  segments: [
    { id: 'seg_1', depth: 'DEEP', topic: 'fed', assets: ['^GSPC'] },
  ],
};

expectValid(EditorialPlanSchema, validEditorial, 'editorial plan complet → valide');
expectValid(EditorialPlanSchema, { ...validEditorial, extraField: 'ok' }, 'champs supplémentaires tolérés (passthrough)');
expectInvalid(EditorialPlanSchema, { ...validEditorial, segments: [] }, 'segments vide → rejet');
expectInvalid(EditorialPlanSchema, { ...validEditorial, dominantTheme: '' }, 'dominantTheme vide → rejet');
expectInvalid(EditorialPlanSchema, { ...validEditorial, segments: 'not-array' }, 'segments string → rejet');
expectInvalid(EditorialPlanSchema, { dominantTheme: 'x' }, 'manque date/threadSummary → rejet');

// ─── AnalysisBundle (C2) ────────────────────────────────────
console.log('\n=== AnalysisBundleSchema ===');

const validAnalysis = {
  segments: [
    {
      segmentId: 'seg_1',
      keyFacts: ['Fed maintient'],
      technicalReading: 'Niveaux clés...',
      fundamentalContext: 'Inflation persistante',
      narrativeHook: 'Le pivot attendu',
    },
  ],
  globalContext: { marketMood: 'incertain' },
};

expectValid(AnalysisBundleSchema, validAnalysis, 'analysis bundle complet → valide');
expectValid(AnalysisBundleSchema, {
  segments: [{ segmentId: 'seg_1' }],
  globalContext: {},
}, 'champs optionnels manquants tolérés');
expectInvalid(AnalysisBundleSchema, { segments: [], globalContext: {} }, 'segments vide → rejet');
expectInvalid(AnalysisBundleSchema, { segments: [{}], globalContext: {} }, 'segment sans segmentId → rejet');
expectInvalid(AnalysisBundleSchema, { globalContext: {} }, 'segments manquant → rejet');

// ─── DraftScript (C3) ───────────────────────────────────────
console.log('\n=== DraftScriptSchema ===');

const validDraft = {
  date: '2026-04-28',
  title: 'Triple décision banques centrales',
  description: 'Cette semaine la Fed, la BoJ et la BCE',
  coldOpen: { type: 'hook', title: 'Hook', narration: 'Mardi.', durationSec: 5, wordCount: 1 },
  thread: { type: 'thread', title: 'Fil', narration: 'Trois rendez-vous.', durationSec: 8, wordCount: 3 },
  segments: [
    {
      segmentId: 'seg_1',
      title: 'Fed mercredi',
      narration: 'La Fed se réunit mercredi prochain. Trois scénarios possibles selon CPI.',
      assets: ['^GSPC'],
      durationSec: 60,
      wordCount: 14,
    },
  ],
  closing: { type: 'closing', title: 'Closing', narration: 'À demain.', durationSec: 4, wordCount: 2 },
  metadata: { totalWordCount: 200, dominantTheme: 'cb' },
};

expectValid(DraftScriptSchema, validDraft, 'draft script complet → valide');
expectInvalid(DraftScriptSchema, { ...validDraft, title: '' }, 'title vide → rejet');
expectInvalid(DraftScriptSchema, {
  ...validDraft,
  segments: [{ ...validDraft.segments[0], narration: 'court' }],
}, 'narration < 20 chars → rejet');
expectInvalid(DraftScriptSchema, { ...validDraft, segments: [] }, 'segments vide → rejet');
expectInvalid(DraftScriptSchema, { ...validDraft, coldOpen: 'wrong type' }, 'coldOpen string → rejet');

// ─── ValidationResponse (C4) ────────────────────────────────
console.log('\n=== ValidationResponseSchema ===');

expectValid(ValidationResponseSchema, { issues: [] }, 'pas d\'issues → valide');
expectValid(ValidationResponseSchema, {
  status: 'pass',
  issues: [{ type: 'compliance', description: 'tout est conforme', severity: 'warning' }],
}, 'issues array typé → valide');
expectValid(ValidationResponseSchema, {}, 'sans status ni issues → tolere (default vide)');
expectInvalid(ValidationResponseSchema, {
  issues: [{ type: 'compliance', description: 'X', severity: 'CRITICAL' }],
}, 'severity invalide → rejet (enum strict)');

// ─── Direction (C5) ─────────────────────────────────────────
console.log('\n=== DirectionSchema ===');

expectValid(DirectionSchema, {
  arc: [{ segmentId: 'seg_1', tensionLevel: 7 }],
  transitions: [],
  chartTimings: [],
  moodMusic: 'tension',
}, 'direction complète → valide');
expectValid(DirectionSchema, {}, 'direction vide → toleree (tous champs optionnels)');
expectValid(DirectionSchema, { unknownField: 'extra' }, 'champ inconnu → toleré (passthrough)');

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed === 0 ? 0 : 1);
