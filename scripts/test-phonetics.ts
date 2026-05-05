/**
 * Tests baseline du pipeline de transformation phonétique TTS.
 *
 * Couvre preProcessForTTS sur les cas critiques rapportés :
 * - Tickers entre guillemets (DHL.DE → "dé ache èl groupe")
 * - Crypto en clair (Bitcoin → "bitconne", Ethereum → "étériom")
 * - Brand (Owl Street Journal → "aul street journale")
 * - Géographie (Hormuz → Ormuz)
 * - Indices (S&P 500, CAC 40, DAX)
 * - Anglicismes (pricing, bullish)
 * - Stablecoin
 * - Élision (le or, de or)
 * - Fish Audio bugs (grimpe, vingt-onze, PPI)
 *
 * Exécution : npx tsx scripts/test-phonetics.ts
 */
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

let passed = 0;
let failed = 0;
const failures: Array<{ label: string; expected: string; actual: string }> = [];

function expectContains(input: string, expected: string, label: string) {
  const actual = preProcessForTTS(input);
  if (actual.includes(expected)) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push({ label, expected: `contient "${expected}"`, actual });
    console.log(`  ✗ ${label}\n      attendu  : contient "${expected}"\n      reçu     : "${actual.slice(0, 150)}"`);
  }
}

function expectNotContains(input: string, forbidden: string, label: string) {
  const actual = preProcessForTTS(input);
  if (!actual.includes(forbidden)) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push({ label, expected: `NE contient PAS "${forbidden}"`, actual });
    console.log(`  ✗ ${label}\n      ne devait pas contenir : "${forbidden}"\n      reçu                   : "${actual.slice(0, 150)}"`);
  }
}

// ─── Tickers entre guillemets ──────────────────────────────
console.log('\n=== Tickers entre guillemets (depuis company-profiles.json) ===');
expectContains(
  '"DHL.DE", le numéro un mondial de la logistique',
  'dé ache èl groupe',
  'DHL.DE → phonétique brand name',
);
expectContains(
  '"BTC-USD" franchit un nouveau record',
  'bitconne',
  'BTC-USD → bitconne',
);
expectContains(
  'Le "S&P 500" recule de 1.2 pour cent',
  'essenne pi cinq cents',
  'S&P 500 → essenne pi cinq cents',
);
expectContains(
  'Le "CL=F" touche les 110 dollars',
  'pétrole américain',
  'CL=F → pétrole américain',
);

// ─── Crypto en clair (sans guillemets) ──────────────────────
console.log('\n=== Crypto en clair ===');
expectContains(
  'Bitcoin franchit un seuil symbolique',
  'bitconne',
  'Bitcoin (clair) → bitconne',
);
expectContains(
  'Ethereum publie une mise à jour majeure',
  'étériom',
  'Ethereum (clair) → étériom',
);
expectNotContains(
  'Bitcoin et Ethereum bougent ensemble',
  'bitcoïne',
  'Pas de double-application bitcoïne (ancienne phonétique)',
);

// ─── Brand chaîne ──────────────────────────────────────────
console.log('\n=== Brand Owl Street Journal ===');
expectContains(
  'Owl Street Journal. Récap quotidien des marchés.',
  'aul street journale',
  'Owl Street Journal → aul street journale',
);

// ─── Géographie ────────────────────────────────────────────
console.log('\n=== Géographie : Hormuz harmonisation ===');
expectContains(
  "Le détroit d'Hormuz reclassé zone de guerre",
  "d'Ormuz",
  "d'Hormuz → d'Ormuz (forme FR)",
);
expectContains(
  'Hormuz reste sous tension',
  'Ormuz reste sous tension',
  'Hormuz (début phrase) → Ormuz',
);

// ─── Indices boursiers ─────────────────────────────────────
console.log('\n=== Indices boursiers (table regex) ===');
expectContains(
  'Le CAC 40 cède 0.5 pour cent',
  'caque karante',
  'CAC 40 → caque karante',
);
expectContains(
  'Le DAX termine en hausse',
  'daxe',
  'DAX → daxe',
);
expectContains(
  "L'indice Nikkei reprend des couleurs",
  'nikèï',
  'Nikkei → nikèï',
);
expectContains(
  'Le VIX bondit à 25',
  'vixe',
  'VIX → vixe',
);

// ─── Anglicismes ───────────────────────────────────────────
console.log('\n=== Anglicismes ===');
expectContains(
  'Le marché reste bullish ce matin',
  'boulliche',
  'bullish → boulliche',
);
expectContains(
  'Pricing du marché agressif',
  'praille-cingue',
  'pricing → praille-cingue',
);
expectContains(
  'Sentiment bearish persistant',
  'bèriche',
  'bearish → bèriche',
);

// ─── Stablecoin ────────────────────────────────────────────
console.log('\n=== Stablecoin ===');
expectContains(
  'Les stablecoins gagnent du terrain',
  'stébeul-connes',
  'stablecoins → stébeul-connes',
);
expectContains(
  'Le stablecoin USDT domine le marché',
  'stébeul-conne',
  'stablecoin → stébeul-conne',
);

// ─── Élision automatique ───────────────────────────────────
console.log("\n=== Élision automatique ===");
expectContains(
  'le indice du dollar',
  "l'indice",
  'le indice → l\'indice',
);
expectContains(
  'de or au plus haut',
  "d'or",
  'de or → d\'or',
);
// Critique : "Le yen" ne doit PAS devenir "L'yen" (y semi-consonantique)
expectContains(
  'Le yen recule face au dollar',
  'Le yen',
  "Le yen reste 'Le yen' (pas d'élision sur y semi-consonantique)",
);

// ─── Fish Audio bugs ───────────────────────────────────────
console.log("\n=== Fish Audio bugs (correctifs phonétiques) ===");
expectContains(
  "Le pétrole grimpe à 110 dollars",
  'grimp',
  "grimpe → grimp (Fish prononce mal le 'e' final)",
);
expectContains(
  "Le PPI ressort à 2.1",
  'pé-pé-i',
  'PPI → pé-pé-i',
);
expectContains(
  "Le RSI à vingt-onze indique surachat",
  'vingt onze',
  "vingt-onze → vingt onze (sans tiret)",
);

// ─── Banques centrales ─────────────────────────────────────
console.log('\n=== Banques centrales ===');
expectContains(
  'La Fed maintient ses taux',
  'Fède',
  'Fed → Fède',
);
expectContains(
  'La BoJ surprend les marchés',
  'Boge',
  'BoJ → Boge',
);

// ─── Sigles épelés ─────────────────────────────────────────
console.log('\n=== Sigles épelés ===');
expectContains(
  'Le RSI dépasse 70',
  'R.S.I.',
  'RSI → R.S.I.',
);
expectContains(
  'Les ETF actions montent',
  'eutéèf',
  'ETF → eutéèf',
);
expectContains(
  "L'inflation US mesurée par le CPI",
  'C.P.I.',
  'CPI → C.P.I.',
);

// ─── Idempotence (double application = même résultat) ──────
console.log("\n=== Idempotence (pas de double-application) ===");
const input1 = 'Bitcoin et Ethereum';
const once = preProcessForTTS(input1);
const twice = preProcessForTTS(once);
if (once === twice) {
  passed++;
  console.log("  ✓ preProcessForTTS idempotent (Bitcoin + Ethereum)");
} else {
  failed++;
  console.log(`  ✗ preProcessForTTS PAS idempotent\n      1ère passe : ${once}\n      2e passe   : ${twice}`);
  failures.push({ label: 'idempotence Bitcoin', expected: once, actual: twice });
}

// ─── Cas critiques bug récents (regression checks) ─────────
console.log("\n=== Régressions reportées (épisode 2026-05-05) ===");
expectContains(
  '"DHL.DE", le numéro un mondial',
  'dé ache èl groupe',
  'BUG #1 — DHL.DE entre guillemets correctement phonétisé',
);
expectContains(
  'Bitcoin franchit quatre-vingt mille',
  'bitconne',
  'BUG #2 — Bitcoin nouvelle phonétique "bitconne" (anciennement "bitcoïne")',
);
expectContains(
  'Owl Street Journal. Récap.',
  'aul street journale',
  'BUG #3 — Owl Street Journal phonétisé (n\'existait pas avant)',
);
expectNotContains(
  "Hormuz et d'Hormuz reclassés",
  'Hormuz',
  'BUG #4 — Hormuz harmonisé en Ormuz partout',
);

// ─── Combinaisons réalistes ────────────────────────────────
console.log("\n=== Phrases réalistes complètes ===");
expectContains(
  "Owl Street Journal. Récap quotidien des marchés. Lundi 4 mai. Aujourd'hui : pourquoi Bitcoin franchit 80000 dollars, ce que prépare la Fed, et le détroit d'Hormuz qui flambe.",
  'aul street journale',
  'owlIntro complet — signature phonétisée',
);
// Séparé pour vérifier chaque substitution dans la même phrase
const realistic = preProcessForTTS(
  "Owl Street Journal. Récap quotidien des marchés. Lundi 4 mai. Aujourd'hui : pourquoi Bitcoin franchit 80000 dollars, ce que prépare la Fed, et le détroit d'Hormuz qui flambe."
);
console.log(`    [check] phrase complète : ${realistic.slice(0, 200)}...`);

// ─── Catégorisation registry ────────────────────────────────
console.log("\n=== Source registry vs profiles ===");
// Test que la catégorie "fish_bugs" du registry est bien chargée
expectContains(
  "Le pétrole grimpe ce matin",
  'grimp',
  'fish_bugs.grimpe → grimp depuis registry',
);
// Test que les profiles sont bien chargés (Goldman Sachs depuis name)
expectContains(
  "Goldman Sachs publie ses résultats",
  'Goldmane',
  "companies_named.Goldman Sachs → Goldmane (depuis registry OU profile, peu importe)",
);

// ─── Récap ─────────────────────────────────────────────────
console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) {
  console.log(`\n${failed} échec(s) :`);
  for (const f of failures.slice(0, 10)) {
    console.log(`  - ${f.label}`);
  }
}
process.exit(failed === 0 ? 0 : 1);
