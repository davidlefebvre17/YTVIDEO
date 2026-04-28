/**
 * Valide le preProcessForTTS sur le beats-raw.json d'un épisode existant.
 * Détecte les patterns de bugs connus après préprocessing.
 */
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';
import { readFileSync } from 'fs';

const EPISODE_PATH = process.argv[2] || 'episodes/2026/04-24/beats-raw.json';

const raw = JSON.parse(readFileSync(EPISODE_PATH, 'utf-8'));
const list = (raw.beats || raw) as Array<{ id: string; narrationChunk?: string }>;

const needles = [
  { name: 'CL=F doublon (pétrole américain + brut)', match: /pétrole américain, le brut/i },
  { name: 'GC=F doublon (or or)', match: /l'or,\s*l'or/i },
  { name: 'SI=F doublon (argent argent)', match: /l'argent,\s*l'argent/i },
  { name: 'WST → pharmaceutique (devrait être pharmaceutical)', match: /west pharmaceutique/i },
  { name: 'nazdac (IXIC)', match: /nazdac/i },
  { name: 'énergie eu té èf (XLE)', match: /eu té èf/i },
  { name: 'nikkèï double-k (N225)', match: /nikkèï/i },
];

console.log(`Scanning ${list.length} beats in ${EPISODE_PATH}...\n`);

let hits = 0;
for (const b of list) {
  if (!b.narrationChunk) continue;
  const output = preProcessForTTS(b.narrationChunk);
  for (const n of needles) {
    if (n.match.test(output)) {
      hits++;
      console.log(`[HIT] ${b.id} — ${n.name}`);
      console.log(`  input:  ${b.narrationChunk.slice(0, 150)}`);
      console.log(`  output: ${output.slice(0, 180)}\n`);
    }
  }
}

console.log(hits === 0 ? '✓ Zéro bug détecté — preprocessing clean' : `✗ ${hits} bugs restants`);
process.exit(hits === 0 ? 0 : 1);
