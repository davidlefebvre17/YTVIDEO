import 'dotenv/config';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';
import { join } from 'path';

const dir = 'packages/remotion-app/public/audio/beats-fish';

const coldOpen = '[emphase] Moins dix pour cent sur le pétrole. [pause] En une seule séance. [grave] Un tweet de Trump, et cinq semaines de prime géopolitique effacées d\'un coup.';
const deep = '[grave] Treize jours de hausse. Treize jours de prime géopolitique construite couche par couche. [pause] [emphase] Et tout s\'est effondré en quelques heures.';

const voices = [
  { id: '6e10fb8946b34ba6bec447789ccdc3de', name: 'stoic' },
  { id: '90c509388f5946e9805c41dcccd93fb7', name: 'penseur' },
  { id: '276bd156a53f4a0199fff081bf083fc8', name: 'bon-a-savoir' },
];

const preset = FISH_PRESETS.COLD_OPEN;

async function main() {
  console.log('=== Comparaison 3 voix × 2 textes ===\n');

  for (const v of voices) {
    for (const [label, text] of [['coldopen', coldOpen], ['deep', deep]]) {
      const mp3 = join(dir, `compare_${v.name}_${label}.mp3`);
      process.stdout.write(`  ${v.name} [${label}]...`);
      try {
        const r = await fishTTS({
          text,
          outputPath: mp3,
          voiceId: v.id,
          format: 'mp3',
          speed: preset.speed,
          temperature: preset.temperature,
        });
        console.log(` ✓ ${(r.bytes / 1024).toFixed(0)} KB`);
      } catch (e) {
        console.log(` ✗ ${(e as Error).message.slice(0, 80)}`);
      }
    }
  }

  console.log('\n--- Écoute ---');
  for (const v of voices) {
    console.log(`\n${v.name}:`);
    console.log(`  start ${dir}/compare_${v.name}_coldopen.mp3`);
    console.log(`  start ${dir}/compare_${v.name}_deep.mp3`);
  }
}

main().catch(console.error);
