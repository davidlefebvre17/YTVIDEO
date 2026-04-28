import 'dotenv/config';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';
import { join } from 'path';

const dir = 'packages/remotion-app/public/audio/beats-fish';
const voiceId = '966a09df9c194c04818dbb9bf27e6ae0'; // frances 1
const preset = FISH_PRESETS.COLD_OPEN;

async function main() {
  console.log('=== frances 1 ===\n');

  const texts: [string, string][] = [
    ['coldopen', '[emphase] Moins dix pour cent sur le pétrole. [pause] En une seule séance. [grave] Un tweet de Trump, et cinq semaines de prime géopolitique effacées d\'un coup.'],
    ['deep', '[grave] Treize jours de hausse. Treize jours de prime géopolitique construite couche par couche. [pause] [emphase] Et tout s\'est effondré en quelques heures.'],
  ];

  for (const [label, text] of texts) {
    const mp3 = join(dir, `compare_frances1_${label}.mp3`);
    process.stdout.write(`  frances1 [${label}]...`);
    try {
      const r = await fishTTS({ text, outputPath: mp3, voiceId, format: 'mp3', speed: preset.speed, temperature: preset.temperature });
      console.log(` ✓ ${(r.bytes / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(` ✗ ${(e as Error).message.slice(0, 100)}`);
    }
  }

  console.log('\nÉcoute:');
  console.log(`  start ${dir}/compare_frances1_coldopen.mp3`);
  console.log(`  start ${dir}/compare_frances1_deep.mp3`);
}

main().catch(console.error);
