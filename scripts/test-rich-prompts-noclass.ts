/**
 * Variante "no-classification" — on retire le beatType obligatoire,
 * on laisse Haiku composer librement avec juste la décomposition
 * subject/action/idea/referents + règles anti-littéralité et
 * anti-tour-forcée.
 *
 * Usage : npx tsx scripts/test-rich-prompts-noclass.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateStructuredJSON } from '../packages/ai/src/llm-client';
import { ComfyUIClient } from '../packages/ai/src/comfyui/comfyui-client';

const ROOT = process.cwd();
const DATE = '2026-04-29';
const SEG_ID = 'seg_4';
const BEAT_IDS = ['beat_059', 'beat_069', 'beat_063'];

const STYLE_PREFIX = 'WSJ hedcut stipple pen and ink illustration on aged cream paper, fine crosshatching and dot shading, black ink dominant, rich editorial composition with multiple distinct elements arranged with clear spatial hierarchy. ';
const MOOD_SUFFIX = ', dramatic ink shading, high contrast crosshatching, cinematic editorial framing, wide 16:9';

interface Beat {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
}

interface RichPromptResult {
  decomposition: {
    subject: string;
    action: string;
    idea: string;
    concreteReferents: string[];
  };
  prompt: string;
}

function loadEpisode() {
  const episodeDir = path.join(ROOT, 'episodes', '2026', DATE.slice(5));
  const beatsRaw = JSON.parse(fs.readFileSync(path.join(episodeDir, 'beats.json'), 'utf-8'));
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(path.join(episodeDir, 'script.json'), 'utf-8'));
  const section = script.sections.find((s: any) => s.id === SEG_ID);
  const beats = allBeats.filter((b) => BEAT_IDS.includes(b.id));
  return { beats, section, episodeDir };
}

async function generateRichPrompt(beat: Beat, section: any): Promise<RichPromptResult> {
  const system = `You are an editorial visual director for a financial video in WSJ hedcut illustration style. Write ONE rich, meaningful image prompt that carries the FULL MEANING of a sentence — not a literal one-word illustration.

═══ DECOMPOSE THE SENTENCE ═══

- subject : what this beat is REALLY about (formulated using the segment context, not just the sentence in isolation)
- action : the gesture or metaphor present in the sentence
- idea : the meaning the image must transmit
- concreteReferents : 3-5 visual elements you'll integrate. Choose the BEST referents for THIS beat — don't default to the segment's recurring assets if the sentence is not about the actors themselves.

═══ COMPOSE A RICH PROMPT (60-90 words) ═══

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy with at least 4 distinct visual elements arranged spatially
- Sensory detail: texture, light direction, materials, motion
- Camera language naturally (close-up, wide shot, over-shoulder, low angle, profile, extreme close-up)
- Hedcut stipple style is added by code prefix — do NOT restate it

Anti-literal:
- If the sentence contains an abstract noun (foi, doute, attente, peur), do NOT illustrate it as a praying figure or question marks. Build a STRUCTURAL metaphor.
- If the sentence mentions a stage device (projecteur, miroir, signal), do NOT just draw the device. Show what it acts upon AND what it omits.

Asset use:
- The segment's recurring assets are NOT a mandatory element of every prompt.
- Use them ONLY when the sentence is about the actors themselves or an action they directly perform.
- For sentences describing market mechanisms, analytical claims, contrasts, or downstream effects, prefer metaphor-driven referents (materials, forces, structures, light, instruments) — do NOT force corporate towers/HQs/logos into frame.

Anti-cliché : avoid these recurring tropes (use ONLY if genuinely apt) — lone analyst with magnifying glass, trader silhouette gazing at chart, broken chain, hourglass, dominos, scales of justice.

Forbidden words : cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background.

═══ OUTPUT STRICT JSON ═══
{
  "decomposition": {
    "subject": "...",
    "action": "...",
    "idea": "...",
    "concreteReferents": ["..."]
  },
  "prompt": "<60-90 word rich prompt>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets (use ONLY when relevant — the sentence is about them or an action they perform): ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

Decompose, compose the rich prompt. Output the JSON.`;

  return generateStructuredJSON<RichPromptResult>(system, user, { role: 'fast' });
}

async function main() {
  console.log('=== Rich prompts NO-CLASS test (3 beats / seg_4) ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Topic: ${section.topic}`);
  console.log(`Assets: ${(section.assets ?? []).join(', ')}\n`);

  const outputDir = path.join(episodeDir, 'images-rich-noclass');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`→ Generating rich prompts (Haiku, parallel)...\n`);
  const results = await Promise.all(
    beats.map(async (beat) => {
      try {
        const r = await generateRichPrompt(beat, section);
        return { beat, result: r, error: null as null | string };
      } catch (e) {
        return { beat, result: null, error: (e as Error).message.slice(0, 120) };
      }
    }),
  );

  for (const { beat, result, error } of results) {
    console.log(`--- ${beat.id} (${beat.emotion}) ---`);
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 140)}"`);
    if (error || !result) {
      console.log(`  ERROR: ${error}`);
      continue;
    }
    console.log(`  SUBJECT  : ${result.decomposition.subject}`);
    console.log(`  REFERENTS: ${result.decomposition.concreteReferents.join(' | ')}`);
    console.log(`  PROMPT   : ${result.prompt}`);
    console.log(`  (${result.prompt.split(/\s+/).length} words)\n`);
  }

  fs.writeFileSync(
    path.join(outputDir, '_plan.json'),
    JSON.stringify({
      date: DATE, segId: SEG_ID, segmentTitle: section.title,
      results: results.map(({ beat, result, error }) => ({
        beatId: beat.id, narration: beat.narrationChunk,
        decomposition: result?.decomposition, prompt: result?.prompt, error,
      })),
    }, null, 2),
    'utf-8',
  );

  if (!process.env.COMFYUI_API_URL) {
    console.log('COMFYUI_API_URL not set — skipping image generation.');
    process.exit(0);
  }

  const items = results.filter((r) => r.result).map(({ beat, result }) => ({
    id: beat.id, prompt: STYLE_PREFIX + result!.prompt + MOOD_SUFFIX,
  }));

  console.log(`→ Generating ${items.length} images via ComfyUI...`);
  const client = new ComfyUIClient({ apiUrl: process.env.COMFYUI_API_URL, apiKey: process.env.COMFYUI_API_KEY });
  const t0 = Date.now();
  const imgs = await client.generateBatch(items, outputDir, 3);
  console.log(`\n✓ ${imgs.size}/${items.length} images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  → ${outputDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
