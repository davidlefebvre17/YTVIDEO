import 'dotenv/config';
import { fishTTS } from '../packages/ai/src/p7-audio/fish-tts';
import { join } from 'path';

const dir = 'packages/remotion-app/public/audio/beats-fish';
const voiceArg = process.argv[2];
const voiceId = voiceArg || '966a09df9c194c04818dbb9bf27e6ae0';
const voiceName = voiceArg ? 'custom' : 'frances1';
const text = '[emphase] Moins dix pour cent sur le pétrole. [pause] En une seule séance. [grave] Un tweet de Trump, et cinq semaines de prime géopolitique effacées d\'un coup.';

async function main() {
  const speeds = [1.0, 1.05, 1.1];

  for (const speed of speeds) {
    const mp3 = join(dir, `${voiceName}_speed${(speed * 100).toFixed(0)}.mp3`);
    process.stdout.write(`  speed=${speed}...`);
    try {
      const r = await fishTTS({ text, outputPath: mp3, voiceId, format: 'mp3', speed, temperature: 0.8, topP: 0.8, repetitionPenalty: 1.2 });
      console.log(` ✓ ${(r.bytes / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(` ✗ ${(e as Error).message.slice(0, 100)}`);
    }
  }

  console.log('\nÉcoute:');
  for (const s of speeds) console.log(`  start ${dir}/${voiceName}_speed${(s * 100).toFixed(0)}.mp3`);
}

main().catch(console.error);
