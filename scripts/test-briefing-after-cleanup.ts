/**
 * Sanity-check after the temporal-calendar cleanup :
 * - formatBriefingPack ne doit plus émettre les sections désormais
 *   couvertes par le calendrier unifié (CALENDAR HIGHLIGHTS, EARNINGS DU JOUR,
 *   EARNINGS À VENIR, ÉVÉNEMENTS À VENIR, DISCOURS BANQUES CENTRALES HIER).
 * - formatBriefingPackMinimal ne doit plus émettre ÉVÉNEMENTS À VENIR /
 *   EARNINGS À VENIR.
 * - Les sections conservées (POLITICAL TRIGGERS, MOVERS, NEWS, COT, MACRO
 *   OBLIGATOIRES, SENTIMENT) doivent toujours apparaître si présentes.
 */
import { readFileSync } from 'fs';
import {
  buildBriefingPack,
  formatBriefingPack,
} from '../packages/ai/src/pipeline/helpers/briefing-pack';
import { formatBriefingPackMinimal } from '../packages/ai/src/pipeline/helpers/briefing-pack';

const snapshot = JSON.parse(readFileSync('./episodes/2026/05-05/snapshot.json', 'utf-8'));
const flagged = JSON.parse(readFileSync('./episodes/2026/05-05/pipeline/snapshot_flagged.json', 'utf-8'));

const pack = buildBriefingPack(flagged, snapshot);
const full = formatBriefingPack(pack);
const min = formatBriefingPackMinimal(pack);

interface Check { name: string; section: string; mustContain: boolean; output: string; label: string; }

const checksFull: Check[] = [
  { label: 'FULL', name: 'CALENDAR HIGHLIGHTS retiré', section: '## CALENDAR HIGHLIGHTS', mustContain: false, output: full },
  { label: 'FULL', name: 'EARNINGS DU JOUR retiré', section: '## EARNINGS DU JOUR', mustContain: false, output: full },
  { label: 'FULL', name: 'EARNINGS À VENIR retiré', section: '## EARNINGS À VENIR', mustContain: false, output: full },
  { label: 'FULL', name: 'DISCOURS BANQUES CENTRALES HIER retiré', section: '## DISCOURS BANQUES CENTRALES HIER', mustContain: false, output: full },
  { label: 'FULL', name: 'ÉVÉNEMENTS À VENIR retiré', section: '## ÉVÉNEMENTS À VENIR', mustContain: false, output: full },
];
const checksMin: Check[] = [
  { label: 'MIN', name: 'ÉVÉNEMENTS À VENIR retiré', section: '## ÉVÉNEMENTS À VENIR', mustContain: false, output: min },
  { label: 'MIN', name: 'EARNINGS À VENIR retiré', section: '## EARNINGS À VENIR', mustContain: false, output: min },
  { label: 'MIN', name: 'DISCOURS BANQUES CENTRALES HIER retiré', section: '## DISCOURS BANQUES CENTRALES HIER', mustContain: false, output: min },
];

// Sections qu'on doit retrouver SI présentes
const presenceCheckers: Array<{ label: string; condition: boolean; section: string; output: string; name: string }> = [
  { label: 'FULL', condition: pack.politicalTriggers.length > 0, section: '## DÉCLENCHEURS POLITIQUES', output: full, name: 'POLITICAL TRIGGERS conservé' },
  { label: 'FULL', condition: pack.topScreenMovers.length > 0, section: '## MOVERS HORS WATCHLIST', output: full, name: 'MOVERS conservé' },
  { label: 'FULL', condition: pack.topNewsTitles.length > 0, section: '## TITRES NEWS CLÉS', output: full, name: 'NEWS conservé' },
  { label: 'FULL', condition: pack.cotHighlights.length > 0, section: '## POSITIONNEMENT COT', output: full, name: 'COT conservé' },
  { label: 'FULL', condition: pack.obligatoryMacroStats.length > 0, section: '## ⚠ STATS MACRO OBLIGATOIRES', output: full, name: 'MACRO OBLIGATOIRES conservé' },
  { label: 'FULL', condition: !!pack.sentimentTrend, section: '## SENTIMENT TREND', output: full, name: 'SENTIMENT conservé' },
  { label: 'MIN',  condition: pack.politicalTriggers.length > 0, section: '## DÉCLENCHEURS POLITIQUES', output: min, name: 'POLITICAL TRIGGERS conservé' },
  { label: 'MIN',  condition: pack.cbSpeechesYesterday.length > 0, section: '## CONTENU DES DISCOURS BC', output: min, name: 'CONTENU DISCOURS BC (renommé) conservé' },
  { label: 'MIN',  condition: pack.cotDivergences.length > 0, section: '## DIVERGENCES COT vs PRIX', output: min, name: 'COT DIVERGENCES conservé' },
];

let pass = 0, fail = 0;
console.log('═══ Test cleanup briefing-pack post-temporal-calendar ═══\n');

console.log(`Pack content snapshot:`);
console.log(`  politicalTriggers: ${pack.politicalTriggers.length}`);
console.log(`  topScreenMovers:   ${pack.topScreenMovers.length}`);
console.log(`  topNewsTitles:     ${pack.topNewsTitles.length}`);
console.log(`  calendarHighlights: ${pack.calendarHighlights.length} (data toujours là, juste plus émise)`);
console.log(`  earnings reported: ${pack.earningsBuckets.reported.length}`);
console.log(`  earnings pending:  ${pack.earningsBuckets.pending.length}`);
console.log(`  earnings upcoming: ${pack.earningsBuckets.upcoming.length}`);
console.log(`  cotHighlights:     ${pack.cotHighlights.length}`);
console.log(`  cotDivergences:    ${pack.cotDivergences.length}`);
console.log(`  upcomingHighImpact: ${pack.upcomingHighImpact.length}`);
console.log(`  obligatoryMacro:   ${pack.obligatoryMacroStats.length}`);
console.log(`  cbSpeechesYesterday: ${pack.cbSpeechesYesterday.length}`);
console.log(`  sentimentTrend:    ${pack.sentimentTrend ? 'present' : 'absent'}`);
console.log();

console.log('--- Sections retirées (mustContain=false) ---');
for (const c of [...checksFull, ...checksMin]) {
  const present = c.output.includes(c.section);
  const ok = present === c.mustContain;
  console.log(`${ok ? '✅' : '❌'} [${c.label}] ${c.name} (présent=${present})`);
  if (ok) pass++; else fail++;
}

console.log('\n--- Sections conservées (présentes si data présente) ---');
for (const c of presenceCheckers) {
  if (!c.condition) {
    console.log(`⏩ [${c.label}] ${c.name} — skip (data absente)`);
    continue;
  }
  const present = c.output.includes(c.section);
  const ok = present;
  console.log(`${ok ? '✅' : '❌'} [${c.label}] ${c.name} (présent=${present})`);
  if (ok) pass++; else fail++;
}

console.log(`\n═══ Total : ${pass} pass, ${fail} fail ═══`);

console.log(`\nFULL output length: ${full.length} chars`);
console.log(`MIN output length:  ${min.length} chars`);

process.exit(fail > 0 ? 1 : 0);
