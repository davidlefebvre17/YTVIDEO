import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

const tests = [
  '"GS", la banque d\'investissement américaine, publie ses résultats.',
  'Le "CL=F" a perdu huit pour cent en une séance.',
  '"AAPL" publie sa meilleure performance en Chine.',
  'Le "^GSPC" a clôturé en hausse d\'un pour cent.',
  '"TSMC", le fondeur taïwanais, hausse son capex.',
  '"ON", le fabricant de semi-conducteurs, bondit de dix pour cent.',
  'Le "^VIX" retombe sous sa moyenne deux cents jours.',
  '"MS" et "GS" publient le même jour.',
];

for (const t of tests) {
  console.log(`IN:  ${t}`);
  console.log(`OUT: ${preProcessForTTS(t)}`);
  console.log();
}
