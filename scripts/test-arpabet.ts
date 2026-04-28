/**
 * Test Arpabet phoneme tags vs phonétisation actuelle dans Fish Audio.
 *
 * Compare 3 approches pour prononcer des mots anglais dans du texte français :
 *   A) Texte brut (le mot anglais tel quel)
 *   B) Phonétisation française actuelle (PRONUNCIATION_FIXES)
 *   C) Tags Arpabet Fish Audio (<|phoneme_start|>...<|phoneme_end|>)
 *
 * Usage: npx tsx scripts/test-arpabet.ts
 */
import 'dotenv/config';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const OUT_DIR = 'data/tts-arpabet-test';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const preset = FISH_PRESETS.DEEP;

// ── Phrases de test — chaque entrée a 3 variantes ─────────────
const TESTS: Array<{
  label: string;
  raw: string;       // A) mot anglais tel quel
  phonetic: string;  // B) phonétisation actuelle
  arpabet: string;   // C) tags Arpabet
}> = [
  {
    label: 'risk-on',
    raw: "Le marché est en mode risk-on. Les flux cherchent du rendement.",
    phonetic: "Le marché est en mode risque-on. Les flux cherchent du rendement.",
    arpabet: "Le marché est en mode <|phoneme_start|>R IH S K AA N<|phoneme_end|>. Les flux cherchent du rendement.",
  },
  {
    label: 'spread',
    raw: "Le spread se resserre, c'est un signal de confiance.",
    phonetic: "Le sprèdd se resserre, c'est un signal de confiance.",
    arpabet: "Le <|phoneme_start|>S P R EH D<|phoneme_end|> se resserre, c'est un signal de confiance.",
  },
  {
    label: 'pricing',
    raw: "Le marché a déjà pricé cette hypothèse depuis deux semaines.",
    phonetic: "Le marché a déjà praïcé cette hypothèse depuis deux semaines.",
    arpabet: "Le marché a déjà <|phoneme_start|>P R AY S T<|phoneme_end|> cette hypothèse depuis deux semaines.",
  },
  {
    label: 'hedge-trading',
    raw: "Les traders font du hedging massif sur le pétrole.",
    phonetic: "Les trèdeurse font du hèdjingue massif sur le pétrole.",
    arpabet: "Les <|phoneme_start|>T R EY D ER Z<|phoneme_end|> font du <|phoneme_start|>HH EH JH IH NG<|phoneme_end|> massif sur le pétrole.",
  },
  {
    label: 'bull-run',
    raw: "Ce bull run est alimenté par les institutionnels, pas par le retail.",
    phonetic: "Ce boull reune est alimenté par les institutionnels, pas par le retail.",
    arpabet: "Ce <|phoneme_start|>B UH L R AH N<|phoneme_end|> est alimenté par les institutionnels, pas par le retail.",
  },
  {
    label: 'short-squeeze',
    raw: "Un short squeeze pourrait faire remonter le titre de vingt pour cent.",
    phonetic: "Un shorte skouize pourrait faire remonter le titre de vingt pour cent.",
    arpabet: "Un <|phoneme_start|>SH AO R T<|phoneme_end|> <|phoneme_start|>S K W IY Z<|phoneme_end|> pourrait faire remonter le titre de vingt pour cent.",
  },
];

async function generateOne(label: string, variant: string, text: string, normalize: boolean): Promise<void> {
  const mp3 = join(OUT_DIR, `${label}_${variant}.mp3`);
  process.stdout.write(`  ${label} [${variant}]...`);
  try {
    const r = await fishTTS({
      text,
      outputPath: mp3,
      format: 'mp3',
      speed: preset.speed,
      temperature: preset.temperature,
      normalize,
    });
    console.log(` OK ${(r.bytes / 1024).toFixed(0)} KB`);
  } catch (e) {
    console.log(` FAIL ${(e as Error).message.slice(0, 120)}`);
  }
}

async function main() {
  console.log('=== Test Arpabet vs Phonétisation vs Raw ===\n');
  console.log(`Output: ${OUT_DIR}/\n`);

  for (const t of TESTS) {
    console.log(`\n── ${t.label} ──`);
    // A) raw
    await generateOne(t.label, 'A_raw', t.raw, true);
    // B) phonetic (current approach)
    await generateOne(t.label, 'B_phonetic', t.phonetic, true);
    // C) arpabet with normalize=true
    await generateOne(t.label, 'C_arpabet', t.arpabet, true);
    // D) arpabet with normalize=false (tags might get stripped by normalizer)
    await generateOne(t.label, 'D_arpabet_nonorm', t.arpabet, false);
  }

  console.log('\n\n=== Écoute ===');
  console.log('Compare A (raw) vs B (phonétisation actuelle) vs C/D (Arpabet) :\n');
  for (const t of TESTS) {
    console.log(`${t.label}:`);
    console.log(`  A raw:              start ${OUT_DIR}/${t.label}_A_raw.mp3`);
    console.log(`  B phonetic:         start ${OUT_DIR}/${t.label}_B_phonetic.mp3`);
    console.log(`  C arpabet:          start ${OUT_DIR}/${t.label}_C_arpabet.mp3`);
    console.log(`  D arpabet (nonorm): start ${OUT_DIR}/${t.label}_D_arpabet_nonorm.mp3`);
  }
}

main().catch(console.error);
