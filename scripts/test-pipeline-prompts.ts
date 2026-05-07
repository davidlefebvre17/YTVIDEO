/**
 * Vérifie que le calendrier unifié est bien injecté dans les 3 prompts
 * (C1, C2, C3) et que les anciens blocs redondants ne sont plus présents.
 *
 * Stratégie : on intercepte generateStructuredJSON pour dumper les prompts
 * sans appeler le LLM. On lance C1, C2, C3 en mode mocké et on cherche les
 * marqueurs textuels.
 */
import { readFileSync } from 'fs';
import path from 'path';

// ── Hook : intercepter generateStructuredJSON AVANT que les modules pipeline soient résolus ──
const captured: Array<{ stage: string; system: string; user: string }> = [];
let stageCounter = 0;
const stageNames = ['C1', 'C2', 'C3'];

const llmModulePath = require.resolve('../packages/ai/src/llm-client');
const original = require(llmModulePath);
require.cache[llmModulePath]!.exports = {
  ...original,
  generateStructuredJSON: async (system: string, user: string) => {
    const stage = stageNames[stageCounter] ?? `stage${stageCounter}`;
    captured.push({ stage, system, user });
    stageCounter++;
    // Return a minimal structurally-valid stub for each stage. We don't run
    // the pipeline end-to-end — we only need C1's user prompt, then we call
    // C2 with a hand-crafted editorial, etc.
    throw new Error(`__STOP_AFTER_PROMPT__:${stage}`);
  },
};

(async () => {
  const ai = await import('../packages/ai/src');
  const { runC1Editorial, runC2Analysis, runC3Writing, buildBriefingPack, buildCausalBrief, computeWordBudget } = ai as any;

  const date = '2026-05-05';
  const snapshot = JSON.parse(readFileSync(`./episodes/${date.slice(0,4)}/${date.slice(5)}/snapshot.json`, 'utf-8'));
  const flagged = JSON.parse(readFileSync(`./episodes/${date.slice(0,4)}/${date.slice(5)}/pipeline/snapshot_flagged.json`, 'utf-8'));
  const editorial = JSON.parse(readFileSync(`./episodes/${date.slice(0,4)}/${date.slice(5)}/pipeline/editorial.json`, 'utf-8'));
  const analysis = JSON.parse(readFileSync(`./episodes/${date.slice(0,4)}/${date.slice(5)}/pipeline/analysis.json`, 'utf-8'));

  // Build prevContext from manifest (last 7 episodes before current)
  const manifest = JSON.parse(readFileSync('./episodes/manifest.json', 'utf-8'));
  const before = manifest.filter((e: any) => e.date < date).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-7);
  const entries: Array<{ snapshot: any; script: any }> = [];
  for (const m of before) {
    try {
      entries.push({
        snapshot: JSON.parse(readFileSync(path.join(m.filePath, 'snapshot.json'), 'utf-8')),
        script: JSON.parse(readFileSync(path.join(m.filePath, 'script.json'), 'utf-8')),
      });
    } catch {}
  }
  const prevContext = { entries };

  const briefingPack = buildBriefingPack(flagged, snapshot);

  // ── Capture C1 user prompt ──
  try {
    await runC1Editorial({
      flagged,
      episodeSummaries: [],
      researchContext: '',
      weeklyBrief: '',
      briefingPack,
      newsDigest: { events: [] },
      snapshot,
      prevContext,
      lang: 'fr',
    });
  } catch (e: any) {
    if (!String(e.message).startsWith('__STOP_AFTER_PROMPT__')) throw e;
  }

  // ── Capture C2 user prompt ──
  const causalBrief = buildCausalBrief(flagged);
  try {
    await runC2Analysis({
      editorial,
      flagged,
      causalBrief,
      researchContext: '',
      snapshot,
      briefingPack,
      knowledgeBriefing: '',
      episodeSummaries: [],
      prevContext,
      lang: 'fr',
    });
  } catch (e: any) {
    if (!String(e.message).startsWith('__STOP_AFTER_PROMPT__')) {
      console.error('C2 unexpected error:', e.message);
    }
  }

  // ── Capture C3 user prompt ──
  const budget = computeWordBudget(editorial);
  try {
    await runC3Writing({
      editorial,
      analysis,
      budget,
      recentScripts: '',
      knowledgeBriefing: '',
      lang: 'fr',
      assetContext: {},
      flagged,
      cotPositioning: snapshot.cotPositioning,
      assets: snapshot.assets,
      briefing: {
        cbSpeechesYesterday: briefingPack.cbSpeechesYesterday,
        obligatoryMacroStats: briefingPack.obligatoryMacroStats,
      },
      snapshot,
      prevContext,
    });
  } catch (e: any) {
    if (!String(e.message).startsWith('__STOP_AFTER_PROMPT__')) {
      console.error('C3 unexpected error:', e.message);
    }
  }

  console.log(`Captured ${captured.length} prompts: ${captured.map(c => c.stage).join(', ')}`);
  console.log();

  let pass = 0, fail = 0;
  const must = [
    { stage: 'C1', text: '## CALENDRIER — SOURCE UNIQUE DE VÉRITÉ', should: true, why: 'calendrier injecté dans C1' },
    { stage: 'C1', text: '🏛 DÉCISIONS BANQUES CENTRALES MAJEURES', should: true, why: 'sentinelle CB en C1' },
    { stage: 'C1', text: '## CALENDRIER ÉCO\n', should: false, why: 'ancien titre fallback retiré du happy-path' },
    { stage: 'C1', text: '## CALENDAR HIGHLIGHTS', should: false, why: 'redondance briefing retirée' },
    { stage: 'C1', text: '## EARNINGS DU JOUR\n', should: false, why: 'redondance briefing retirée (sauf fallback path)' },
    { stage: 'C1', text: '## ÉVÉNEMENTS À VENIR', should: false, why: 'redondance briefing retirée' },
    { stage: 'C1', text: '## DISCOURS BANQUES CENTRALES HIER', should: false, why: 'remplacé par calendrier' },

    { stage: 'C2', text: '## CALENDRIER — SOURCE UNIQUE DE VÉRITÉ', should: true, why: 'calendrier injecté dans C2' },
    { stage: 'C2', text: '## ÉVÉNEMENTS À VENIR', should: false, why: 'redondance retirée du briefing minimal' },
    { stage: 'C2', text: '## EARNINGS À VENIR', should: false, why: 'redondance retirée du briefing minimal' },

    { stage: 'C3', text: '## CALENDRIER — SOURCE UNIQUE DE VÉRITÉ', should: true, why: 'calendrier injecté dans C3' },
    { stage: 'C3', text: '## RENDEZ-VOUS À VENIR', should: false, why: 'remplacé par calendrier' },
    { stage: 'C3', text: '## DISCOURS BANQUES CENTRALES (hier — contexte éditorial)', should: false, why: 'renommé en CONTENU DES DISCOURS BC' },
    // Le bloc ⚠ STATS MACRO n'est émis que si obligatoryMacroStats.length > 0.
    // Sur ce snapshot 2026-05-05, la liste est vide → on attend ABSENCE.
    // (Vérification : si tu fais tourner sur un snapshot avec macro tier-1, change should:true.)
    { stage: 'C3', text: '## ⚠ STATS MACRO OBLIGATOIRES À CITER', should: false, why: `bloc conditionnel — empty sur ce snapshot` },
  ];

  for (const m of must) {
    const cap = captured.find(c => c.stage === m.stage);
    if (!cap) { console.log(`❌ ${m.stage}: not captured`); fail++; continue; }
    const present = cap.user.includes(m.text);
    const ok = present === m.should;
    if (ok) pass++; else fail++;
    console.log(`${ok ? '✅' : '❌'} ${m.stage}: "${m.text.slice(0,50)}" → présent=${present} (attendu=${m.should}) — ${m.why}`);
  }

  console.log();
  console.log(`Prompts size : C1=${captured[0]?.user.length ?? 0}  C2=${captured[1]?.user.length ?? 0}  C3=${captured[2]?.user.length ?? 0}`);
  console.log(`\n═══ Total : ${pass} pass, ${fail} fail ═══`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
