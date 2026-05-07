import * as fs from 'fs';
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';

const date = process.argv[2] || '2026-05-05';
const [y, m, d] = date.split('-');
const script = JSON.parse(fs.readFileSync(`episodes/${y}/${m}-${d}/script.json`, 'utf-8'));

console.log('═══ OWL INTRO ═══\n');
console.log('▶ RAW (depuis Opus, ' + script.owlIntro.split(/\s+/).filter(Boolean).length + ' mots) :');
console.log(script.owlIntro);
console.log();
console.log('▶ ENVOYÉ À FISH (post preProcessForTTS) :');
console.log(preProcessForTTS(script.owlIntro));
