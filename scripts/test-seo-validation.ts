/**
 * Tests unitaires : validateSEOMetadata + computeChapterTimestamps + Zod schema.
 * Exécution : npx tsx scripts/test-seo-validation.ts
 */
import {
  validateSEOMetadata,
  computeChapterTimestamps,
} from '../packages/ai/src/pipeline/p10-seo';
import { SEOMetadataSchema } from '../packages/ai/src/pipeline/schemas';
import type { SEOMetadata, DraftScript } from '../packages/ai/src/pipeline/types';

let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

// ─── Helpers ───────────────────────────────────────────────

function makeValidSEO(overrides: Partial<SEOMetadata> = {}): SEOMetadata {
  return {
    title: 'La Fed assomme Wall Street | CAC, S&P 500 — 28 avril',
    description: `Récap des marchés du lundi 28 avril : la Fed maintient ses taux et fait reculer Wall Street, l'or grimpe à un nouveau record.

⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement (AMF/MiFID II). Investir comporte un risque de perte en capital.

📊 SYNTHÈSE
Le S&P 500 cède 1,2% après la décision de la Fed. La Banque centrale américaine maintient ses taux dans la fourchette 4,25-4,50%, alors que le marché anticipait un assouplissement plus net. Les rendements obligataires américains à 10 ans bondissent à 4,55%.

L'or profite de l'incertitude et signe un nouveau record à 2480$ l'once. Le dollar index se renforce face à l'euro, qui retombe sous 1,07. Les valeurs technologiques sont les plus pénalisées sur le Nasdaq.

À surveiller demain : l'inflation européenne et les premiers résultats trimestriels des grandes banques américaines.

⏱ CHAPITRES
00:00 Intro
01:30 S&P 500 face à la Fed

📌 À RETENIR
• S&P 500 -1,2% après la Fed
• Or +1,5% à 2480$ l'once
• EUR/USD sous 1,07

📊 SOURCES
Données : Yahoo Finance, FRED, Finnhub.

DISCLAIMER COMPLET
Ce contenu est à but informatif et éducatif. Il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, au sens de la directive MiFID II et de la réglementation AMF. Les performances passées ne préjugent pas des performances futures. Investir comporte des risques de perte en capital.

#Bourse #CAC40 #Marches`,
    chapters: [
      { time: '00:00', label: 'Intro — Le marché en 30 secondes' },
      { time: '00:45', label: 'S&P 500 face à la Fed' },
      { time: '02:30', label: 'Or : nouveau record' },
      { time: '04:15', label: 'EUR/USD sous pression' },
      { time: '06:00', label: 'À surveiller demain' },
      { time: '08:00', label: 'À retenir' },
    ],
    tags: [
      'bourse 28 avril',
      'analyse bourse',
      'recap marchés',
      'cac 40',
      'wall street',
      'bourse',
      'trading',
      'marchés financiers',
      'S&P 500',
      'Fed',
    ],
    hashtags: ['Bourse', 'CAC40', 'Marches'],
    ...overrides,
  };
}

function countBlockers(seo: SEOMetadata): number {
  return validateSEOMetadata(seo).filter(i => i.severity === 'blocker').length;
}

// ─── Zod schema acceptance ──────────────────────────────────
console.log('=== SEOMetadataSchema (Zod) ===');
ok(
  SEOMetadataSchema.safeParse(makeValidSEO()).success,
  'SEO valide passe le schéma Zod',
);
ok(
  !SEOMetadataSchema.safeParse({ ...makeValidSEO(), title: 'court' }).success,
  'title trop court rejeté par Zod',
);
ok(
  !SEOMetadataSchema.safeParse({ ...makeValidSEO(), chapters: [{ time: 'xx', label: 'a' }] }).success,
  'time format invalide rejeté par Zod',
);
ok(
  !SEOMetadataSchema.safeParse({ ...makeValidSEO(), tags: [] }).success,
  'tags vides rejetés par Zod',
);

// ─── validateSEOMetadata — title ──────────────────────────
console.log('\n=== validateSEOMetadata — title ===');
ok(countBlockers(makeValidSEO()) === 0, 'SEO valide → 0 blocker');

ok(
  countBlockers(makeValidSEO({ title: 'Le PROCHAIN KRACH IMMINENT EST LÀ — 28 avril' })) >= 1,
  'mots interdits dans title → blocker',
);

ok(
  countBlockers(makeValidSEO({ title: 'Marchés en 2026 : récap du jour' })) >= 1,
  'année 2026 dans title → blocker',
);

ok(
  countBlockers(makeValidSEO({ title: 'Wall Street recule après la Fed — 28 avril' })) === 0,
  'title sobre sans mot interdit, sans année → OK',
);

ok(
  countBlockers(makeValidSEO({ title: 'LA FED ASSOMME LE MARCHÉ ET TOUT LE MONDE PANIQUE' })) >= 2,
  'majuscules excessives + mot interdit → 2+ blockers',
);

ok(
  countBlockers(makeValidSEO({ title: 'Recap 🚀🔥📉 marchés du jour' })) >= 1,
  'plusieurs émojis → blocker',
);

// ─── validateSEOMetadata — description ────────────────────
console.log('\n=== validateSEOMetadata — description ===');
ok(
  countBlockers(makeValidSEO({ description: 'Trop court.' })) >= 1,
  'description trop courte → blocker',
);

ok(
  countBlockers(makeValidSEO({
    description: 'Récap du jour. '.repeat(50) + 'Lorem ipsum dolor sit amet '.repeat(20),
  })) >= 1,
  'description sans disclaimer (mots-clés AMF/conseil/informatif/risque) → blocker',
);

// ─── validateSEOMetadata — chapters ───────────────────────
console.log('\n=== validateSEOMetadata — chapters ===');
ok(
  countBlockers(makeValidSEO({ chapters: [
    { time: '01:00', label: 'Intro' },
    { time: '02:00', label: 'B' },
    { time: '03:00', label: 'C' },
  ] })) >= 1,
  'premier chapitre ≠ 00:00 → blocker',
);

ok(
  countBlockers(makeValidSEO({ chapters: [
    { time: '00:00', label: 'A' },
    { time: '03:00', label: 'B' },
    { time: '02:00', label: 'C (avant B)' },
  ] })) >= 1,
  'chapitres dans le désordre → blocker',
);

ok(
  countBlockers(makeValidSEO({ chapters: [
    { time: '00:00', label: 'Intro' },
    { time: '01:00', label: 'KRACH IMMINENT du marché' },
    { time: '03:00', label: 'C' },
  ] })) >= 1,
  'mot interdit dans label de chapitre → blocker',
);

// ─── validateSEOMetadata — tags ───────────────────────────
console.log('\n=== validateSEOMetadata — tags ===');
ok(
  countBlockers(makeValidSEO({ tags: ['#bourse', 'tag normal'] })) >= 1,
  'tag commençant par # → blocker',
);

ok(
  countBlockers(makeValidSEO({ tags: Array.from({ length: 30 }, (_, i) => `super tag ${i} avec beaucoup de mots dedans pour gonfler chars`) })) >= 1,
  'total tags > 480 chars → blocker',
);

// ─── validateSEOMetadata — hashtags ──────────────────────
console.log('\n=== validateSEOMetadata — hashtags ===');
ok(
  countBlockers(makeValidSEO({ hashtags: ['Bourse Trading'] })) >= 1,
  'hashtag avec espace → blocker',
);

// ─── computeChapterTimestamps — déterminisme ──────────────
console.log('\n=== computeChapterTimestamps ===');

const fakeScript = {
  date: '2026-04-28',
  title: 'X',
  description: 'X',
  coldOpen: { type: 'hook', title: 'CO', narration: 'A B C', durationSec: 8, wordCount: 3 },
  titleCard: { type: 'title_card', title: 'TC', narration: '', durationSec: 4, wordCount: 0 },
  thread: { type: 'thread', title: 'TH', narration: 'A B C', durationSec: 12, wordCount: 3 },
  segments: [
    { segmentId: 'seg_1', type: 'segment', title: 'S1', narration: 'x', depth: 'DEEP', topic: 't', assets: [], visualCues: [], durationSec: 60, wordCount: 14 },
    { segmentId: 'seg_2', type: 'segment', title: 'S2', narration: 'x', depth: 'FOCUS', topic: 't', assets: [], visualCues: [], durationSec: 45, wordCount: 12 },
    { segmentId: 'seg_3', type: 'segment', title: 'S3', narration: 'x', depth: 'FLASH', topic: 't', assets: [], visualCues: [], durationSec: 30, wordCount: 8 },
  ],
  closing: { type: 'closing', title: 'CL', narration: 'bye', durationSec: 6, wordCount: 1 },
  metadata: { totalWordCount: 200, totalDurationSec: 165, toneProfile: 'sobre', dominantTheme: 'Fed', threadSummary: 't', moodMarche: 'incertain', coverageTopics: [], segmentCount: 3 },
} as unknown as DraftScript;

const computed = computeChapterTimestamps(fakeScript);
ok(computed.length === 6, `6 chapters générés (cold_open + thread + 3 segments + closing) — ${computed.length}`);
ok(computed[0]?.time === '00:00', `1er chapter = 00:00 — "${computed[0]?.time}"`);
ok(computed[0]?.segmentId === 'cold_open', `1er chapter.segmentId = cold_open`);
// Thread starts after coldOpen + titleCard = 8+4 = 12s
ok(computed[1]?.time === '00:12', `2e chapter (thread) = 00:12 — trouvé "${computed[1]?.time}"`);
// Seg 1 starts after thread = 12 + 12 = 24s
ok(computed[2]?.time === '00:24', `3e chapter (seg_1) = 00:24 — trouvé "${computed[2]?.time}"`);
// Seg 2 starts after seg_1 = 24 + 60 = 84s = 01:24
ok(computed[3]?.time === '01:24', `4e chapter (seg_2) = 01:24 — trouvé "${computed[3]?.time}"`);
// Seg 3 starts after seg_2 = 84 + 45 = 129s = 02:09 — wait we have 5 chapters not 6
// Recheck: cold_open(0), thread(1), seg_1(2), seg_2(3), seg_3(4), closing(5) → 6
// Actually computed.length === 6: cold_open, thread, seg_1, seg_2, seg_3, closing
console.log(`    [debug] computed full: ${computed.map(c => `${c.time}=${c.segmentId}`).join(', ')}`);

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed === 0 ? 0 : 1);
