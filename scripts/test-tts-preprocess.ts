/**
 * Tests unitaires du preProcessForTTS.
 *
 * Focus : suppression des appositions redondantes "TICKER", apposition
 * qui créaient des doublons audibles (cas épisode 2026-04-24).
 *
 * Run : npx tsx scripts/test-tts-preprocess.ts
 */
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

interface TestCase {
  name: string;
  input: string;
  expectIncludes?: string[];
  expectExcludes?: string[];
}

const CASES: TestCase[] = [
  // ── Cas doublon épisode 04-24 ──
  {
    name: 'CL=F + brut américain (apposition redondante)',
    input: 'Hier, le "CL=F", le brut américain, plus trois pour cent à presque quatre-vingt-dix-huit dollars.',
    expectIncludes: ['le brut américain'],
    expectExcludes: ['pétrole américain', '"CL=F"'],
  },
  {
    name: 'GC=F + l\'or (apposition élidée redondante)',
    input: 'Le "GC=F", l\'or, recule.',
    expectIncludes: ['L\'or, recule'],
    expectExcludes: ['"GC=F"', 'or, l\'or'],
  },
  {
    name: 'SI=F + l\'argent (apposition élidée redondante)',
    input: 'Le "SI=F", l\'argent, moins trois virgule un.',
    expectIncludes: ['L\'argent'],
    expectExcludes: ['"SI=F"', 'argent, l\'argent'],
  },

  // ── Cas à PRÉSERVER (apposition non redondante) ──
  {
    name: 'STMPA.PA + franco-italien (apposition descriptive légitime)',
    input: 'Le "STMPA.PA", le franco-italien qui fabrique des puces, plus quatorze pour cent.',
    expectIncludes: ['èsse té èm micro électronique', 'le franco-italien'],
  },
  {
    name: 'TXN + spécialiste texan (apposition descriptive légitime)',
    input: 'Le "TXN", le spécialiste texan des puces analogiques, plus dix-neuf pour cent.',
    expectIncludes: ['texas instruments', 'le spécialiste texan'],
  },

  // ── Cas ticker seul (pas d'apposition) ──
  {
    name: 'Ticker seul sans apposition (CL=F → phonétique)',
    input: 'Le "CL=F" continue de monter.',
    expectIncludes: ['pétrole américain'],
    expectExcludes: ['"CL=F"'],
  },

  // ── Cas phonétique corrigées ──
  {
    name: 'IXIC → nazdak composite (pas nazdac)',
    input: 'Le "^IXIC" recule.',
    expectIncludes: ['nazdak'],
    expectExcludes: ['nazdac'],
  },
  {
    name: 'N225 → nikèï (pas nikkèï)',
    input: 'Le "^N225" dort.',
    expectIncludes: ['nikèï'],
    expectExcludes: ['nikkèï'],
  },
  {
    name: 'XLE → secteur énergie (pas énergie eu té èf)',
    input: 'Le "XLE" n\'a pris que zéro virgule huit.',
    expectIncludes: ['secteur énergie'],
    expectExcludes: ['eu té èf'],
  },
  {
    name: 'WST → west pharmaceutical (pas pharmaceutique)',
    input: 'Et "WST", plus douze virgule neuf.',
    expectIncludes: ['west pharmaceutical'],
    expectExcludes: ['pharmaceutique'],
  },

  // ── Pas d'élision devant y semi-consonantique ──
  {
    name: 'Le yen dort (pas L\'yen)',
    input: 'La Banque du Japon n\'a pas bougé ses taux. Le yen dort.',
    expectIncludes: ['Le yen'],
    expectExcludes: ['L\'yen'],
  },
  {
    name: 'le yaourt (pas l\'yaourt)',
    input: 'Il mange le yaourt.',
    expectIncludes: ['le yaourt'],
    expectExcludes: ['l\'yaourt'],
  },
];

let passed = 0;
let failed = 0;

for (const tc of CASES) {
  const output = preProcessForTTS(tc.input);
  const failures: string[] = [];

  for (const inc of tc.expectIncludes ?? []) {
    if (!output.includes(inc)) failures.push(`missing: "${inc}"`);
  }
  for (const exc of tc.expectExcludes ?? []) {
    if (output.includes(exc)) failures.push(`unexpected: "${exc}"`);
  }

  if (failures.length === 0) {
    passed++;
    console.log(`✓ ${tc.name}`);
  } else {
    failed++;
    console.log(`✗ ${tc.name}`);
    console.log(`  input:  ${tc.input}`);
    console.log(`  output: ${output}`);
    for (const f of failures) console.log(`  → ${f}`);
  }
}

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed === 0 ? 0 : 1);
