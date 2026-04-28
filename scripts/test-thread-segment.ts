import 'dotenv/config';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';

const text = `Le cessez-le-feu américano-iranien s'effondre et Hormuz est de nouveau bloqué.
[pause] Sauf que cette fois, l'horizon a changé.
Ce n'est plus une question de jours.
[pause] C'est une question d'années.
Et cette pression énergétique se diffuse partout, des banques centrales jusqu'à la crédibilité du prochain patron de la banque centrale américaine.`;

const out = 'out/test-thread-segment.mp3';
const preset = FISH_PRESETS.FOCUS;

async function main() {
  console.log(`Preset: speed=${preset.speed} temp=${preset.temperature} latency=normal`);
  console.log(`Text (${text.length} chars):\n${text}\n`);

  const r = await fishTTS({
    text,
    outputPath: out,
    format: 'mp3',
    speed: preset.speed,
    temperature: preset.temperature,
  });

  console.log(`\nOK → ${r.outputPath} (${(r.bytes / 1024).toFixed(0)} KB)`);
  console.log(`Écoute: start ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
