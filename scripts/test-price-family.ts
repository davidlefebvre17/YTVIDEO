import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

const tests = [
  'Le marché pricait cette hypothèse.',
  'Le marché avait pricé cette hypothèse.',
  'Le pricing du risque est cassé.',
  'Le marché price un deal rapide.',
  'Impossible de pricer ce scénario.',
  'Les opérateurs pricent la paix.',
];

for (const t of tests) {
  console.log(`IN:  ${t}`);
  console.log(`OUT: ${preProcessForTTS(t)}`);
  console.log();
}
