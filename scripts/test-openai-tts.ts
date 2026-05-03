/**
 * Test OpenAI TTS (gpt-4o-mini-tts) sur un vrai segment de l'épisode du jour.
 *
 * Génère 1 MP3 à partir de seg_1 du script 2026-04-28 (segment pétrole, ~175s)
 * avec voix `onyx` + instructions FR optimisées pour un rendu naturel
 * de chroniqueur radio (type France Inter / France Info).
 *
 * Usage:
 *   npx tsx scripts/test-openai-tts.ts                 # voix par défaut (onyx)
 *   npx tsx scripts/test-openai-tts.ts shimmer         # tester une autre voix
 *   npx tsx scripts/test-openai-tts.ts onyx 2026-04-28 seg_2  # autre date / segment
 */

import 'dotenv/config';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { openaiTTS, type OpenAIVoice } from '../packages/ai/src/p7-audio/openai-tts';
import { replaceTickersInQuotes } from '../packages/ai/src/p7-audio/phonetic-tickers';

const ROOT = process.cwd();

const INSTRUCTIONS_FR_DYNAMIC_YOUNG = `
Voice: A young French male voice, late twenties, sharp and visibly engaged. Think of an energetic French YouTuber explaining markets to other young people — Hugo Décrypte or Heu?reka style, applied to finance. Smart, fast, alive.

Audience: Young viewers, 20 to 35 years old. They are intelligent but they will mentally check out the second the voice goes flat. Energy is non-negotiable.

Tone: Direct, conversational, modern. Like you are explaining something genuinely fascinating to a friend at a bar. There are real stakes in what you are saying — let that show in your voice. Never lecture, never preach.

Pacing: BRISK. Around 180 to 200 words per minute. Snap forward through setup sentences. Slow down briefly only to land a punch line, an irony, or a key revelation. Then accelerate again. Never drag.

Energy and dynamics: WIDE pitch and volume range. Hit key words — proper nouns, numbers, surprising verbs — with clear emphasis. Make the listener feel the contrast between calm fact-stating and dramatic reveals. No flat stretch longer than one sentence is allowed.

Emotion: Lean into the drama when the content is dramatic. Phrases like "a doublé ses profits grâce à la guerre" or "personne ne dépense seize milliards en cash sur un pic temporaire" are moments where the irony or weight should breathe through your voice.

Accent: Modern neutral metropolitan French (Paris). Urban, contemporary, no regional marker. Absolutely no English or anglo-saxon accent on French words. Nasal vowels (an, on, in, un) must sound native.

Forbidden: News-anchor monotone, formal radio gravitas, robotic delivery, sing-song rhythm, droning, any flat passage. The single worst sin here is being boring.
`.trim();

interface ScriptSection {
  id: string;
  type: string;
  narration: string;
}

interface Script {
  sections: ScriptSection[];
}

function loadSegment(date: string, segmentId: string): string {
  const scriptPath = join(ROOT, 'episodes', '2026', date.slice(5), 'script.json');
  if (!existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  const script: Script = JSON.parse(readFileSync(scriptPath, 'utf-8'));
  const segment = script.sections.find((s) => s.id === segmentId);
  if (!segment) {
    const available = script.sections.map((s) => s.id).join(', ');
    throw new Error(`Segment "${segmentId}" not found. Available: ${available}`);
  }
  return segment.narration;
}

/** Léger nettoyage : retire markdown, normalise dashes, garde le reste tel quel
 *  (le script est déjà adapté TTS par p7-c6-tts-adaptation). */
function lightSanitize(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/—/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const voice = (process.argv[2] as OpenAIVoice) || 'ash';
  const date = process.argv[3] || '2026-04-28';
  const segmentId = process.argv[4] || 'seg_1';

  console.log('=== Test OpenAI TTS ===\n');
  console.log(`Model:    gpt-4o-mini-tts`);
  console.log(`Voice:    ${voice}`);
  console.log(`Episode:  ${date} → ${segmentId}`);
  console.log(`API Key:  ${process.env.OPENAI_API_KEY ? '✓ set' : '✗ missing'}\n`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in .env');
    process.exit(1);
  }

  const rawNarration = loadSegment(date, segmentId);
  const sanitized = lightSanitize(rawNarration);
  const { output: text, replaced } = replaceTickersInQuotes(sanitized);

  console.log(`Text length: ${text.length} chars`);
  if (replaced.length > 0) {
    console.log(`Tickers replaced (${replaced.length}):`);
    for (const r of replaced) console.log(`   ${r}`);
  }
  console.log(`Preview:     "${text.slice(0, 140)}..."\n`);

  const outDir = join(ROOT, 'packages/remotion-app/public/audio/openai-test');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outFile = join(outDir, `${date}-${segmentId}-${voice}.mp3`);

  console.log(`Calling OpenAI TTS... (this may take 10-30s for ~3min audio)\n`);
  const t0 = Date.now();

  try {
    const result = await openaiTTS({
      text,
      outputPath: outFile,
      voice,
      model: 'gpt-4o-mini-tts',
      instructions: INSTRUCTIONS_FR_DYNAMIC_YOUNG,
      format: 'mp3',
      speed: 1.15,
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const sizeKB = (result.bytes / 1024).toFixed(0);
    const estCost = (text.length / 1000) * 0.015;

    console.log(`✓ Done in ${elapsed}s — ${sizeKB} KB`);
    console.log(`  → ${outFile}`);
    console.log(`  Estimated cost: ~$${estCost.toFixed(3)} (text input pricing)\n`);
    console.log(`Pour écouter:`);
    console.log(`  start "${outFile}"\n`);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
