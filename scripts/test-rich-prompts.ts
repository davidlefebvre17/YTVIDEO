/**
 * Test "rich semantic prompts" — chaque image porte le SENS de la phrase,
 * pas un mot littéral.
 *
 * Approche : pour chaque beat, Sonnet
 *   1. Reçoit le contexte segment (titre, topic, assets concrets, narration entière)
 *   2. Décompose la phrase du beat en {subject, action, idea}
 *   3. Identifie les référents concrets (logos, HQ, produits) à intégrer
 *   4. Compose un prompt riche (60-90 mots) qui marie les 4 dimensions
 *
 * Test ciblé sur 3 beats de seg_4 (tech earnings 04-29) — incl. beat_069.
 *
 * Usage : npx tsx scripts/test-rich-prompts.ts
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

// CLI: npx tsx scripts/test-rich-prompts.ts fast    → Haiku
//       npx tsx scripts/test-rich-prompts.ts balanced → Sonnet (default)
const ROLE: 'fast' | 'balanced' = (process.argv[2] === 'fast') ? 'fast' : 'balanced';
const OUTPUT_SUFFIX = ROLE === 'fast' ? '-haiku' : '';

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
    subject: string;        // CE dont on parle (entité concrète)
    action: string;         // geste/métaphore exprimée
    idea: string;           // sens à transmettre
    concreteReferents: string[]; // logos/HQ/produits identifiables
  };
  prompt: string;            // 60-90 mots
}

function loadEpisode(): { beats: Beat[]; section: any; episodeDir: string } {
  const episodeDir = path.join(ROOT, 'episodes', '2026', DATE.slice(5));
  const beatsPath = path.join(episodeDir, 'beats.json');
  const scriptPath = path.join(episodeDir, 'script.json');
  const beatsRaw = JSON.parse(fs.readFileSync(beatsPath, 'utf-8'));
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const section = script.sections.find((s: any) => s.id === SEG_ID);
  const beats = allBeats.filter((b) => BEAT_IDS.includes(b.id));
  return { beats, section, episodeDir };
}

async function generateRichPrompt(
  beat: Beat,
  section: any,
): Promise<RichPromptResult> {
  const system = `You are an editorial visual director for a financial video in WSJ hedcut illustration style. Your job is to write ONE rich, meaningful image prompt that carries the FULL MEANING of a sentence — not a literal one-word illustration.

CRITICAL FAILURE MODE TO AVOID:
A bad prompt picks a single noun from the sentence and illustrates it in isolation. Example: "Les projecteurs sont braqués sur les bénéfices [des 4 géants tech]" → BAD prompt = "a vintage cinema projector pointing at a journal page". The 4 tech giants are absent. The money idea is absent. The point is lost.

GOOD prompt for the same sentence integrates ALL of:
- The recurring SUBJECT of the segment (the 4 tech giants — show them as recognizable corporate towers, distinctive HQ silhouettes, or stylized logos),
- The ACTION/metaphor (spotlights, beams),
- The IDEA (financial attention focused on profits — dollar bills floating in beams, ticker numbers).

So a GOOD prompt would be: "Wide editorial scene at night: four corporate towers in the distance — Apple's curved glass HQ, Microsoft's prism shape, Google's colorful cube structure, Meta's signage — each bathed in harsh stage spotlights from above. Dollar bills and stock-ticker numerals float visibly in the light beams between viewer and towers. Foreground: a small silhouetted analyst reading a report on a wooden bench, one specific line on the page underlined in red ink, untouched by the spotlight. Heavy crosshatching on the night sky, dense stipple on tower facades."

Notice: subject (4 tech towers, recognizable) + action (spotlights) + idea (money attention vs. ignored detail) + concrete referents (Apple HQ, Microsoft prism, ticker numbers).

DECOMPOSE THEN COMPOSE:
1. Identify what the sentence is REALLY about given the segment context (subject)
2. Identify the gesture / metaphor used (action)
3. Identify the meaning to transmit (idea)
4. Pick concrete identifiable visual referents from the segment's assets
5. Write a 60-90 word prompt that weaves all four into ONE coherent rich scene

Output STRICT JSON:
{
  "decomposition": {
    "subject": "<who/what is REALLY being talked about, including the segment's recurring subject>",
    "action": "<the gesture or metaphor in the sentence>",
    "idea": "<the meaning the image must transmit>",
    "concreteReferents": ["<3-5 specific identifiable visual elements drawn from the segment assets/topic>"]
  },
  "prompt": "<60-90 word rich image prompt weaving subject + action + idea + concrete referents into ONE coherent scene with clear spatial hierarchy. NEVER pick a single literal noun in isolation. NEVER produce a generic newspaper or trader vignette. Use camera language. Hedcut stipple style is added by code prefix — do not restate it.>"
}

FORBIDDEN words in prompt: cartoon, caricature, selfie, looking at camera, photorealistic, lens flare, glowing, soft focus, bokeh, dark background.`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring subject (the things this entire segment is REALLY about): ${(section.assets ?? []).join(', ')}
Full segment narration (so you know the argument):
${section.narration}

=== THIS BEAT TO ILLUSTRATE ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

Decompose this sentence and write the rich prompt that integrates the segment's recurring subject + the sentence's action + the meaning + concrete identifiable referents. Output the JSON.`;

  return generateStructuredJSON<RichPromptResult>(system, user, { role: ROLE });
}

async function main() {
  console.log('=== Rich semantic prompt test (3 beats / seg_4) ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Topic: ${section.topic}`);
  console.log(`Assets: ${(section.assets ?? []).join(', ')}\n`);

  const outputDir = path.join(episodeDir, `images-rich-test${OUTPUT_SUFFIX}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: generate rich prompts (Sonnet, 3 calls in parallel)
  console.log(`→ Generating rich prompts (Sonnet, ${beats.length} parallel calls)...\n`);
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
    console.log(`SENTENCE: "${beat.narrationChunk}"`);
    if (error || !result) {
      console.log(`  ERROR: ${error}`);
      continue;
    }
    console.log(`  SUBJECT  : ${result.decomposition.subject}`);
    console.log(`  ACTION   : ${result.decomposition.action}`);
    console.log(`  IDEA     : ${result.decomposition.idea}`);
    console.log(`  REFERENTS: ${result.decomposition.concreteReferents.join(' | ')}`);
    console.log(`  PROMPT   : ${result.prompt}\n`);
  }

  // Save plan
  fs.writeFileSync(
    path.join(outputDir, '_rich-plan.json'),
    JSON.stringify(
      {
        date: DATE, segId: SEG_ID, segmentTitle: section.title,
        results: results.map(({ beat, result, error }) => ({
          beatId: beat.id,
          narration: beat.narrationChunk,
          decomposition: result?.decomposition,
          prompt: result?.prompt,
          error,
        })),
      },
      null, 2,
    ),
    'utf-8',
  );

  // Step 2: ComfyUI generation
  if (!process.env.COMFYUI_API_URL) {
    console.log('\nCOMFYUI_API_URL not set — skipping image generation.');
    process.exit(0);
  }

  const items = results
    .filter((r) => r.result)
    .map(({ beat, result }) => ({
      id: beat.id,
      prompt: STYLE_PREFIX + result!.prompt + MOOD_SUFFIX,
    }));

  if (items.length === 0) {
    console.log('No prompts generated — skipping ComfyUI.');
    process.exit(0);
  }

  console.log(`\n→ Generating ${items.length} images via ComfyUI...`);
  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL,
    apiKey: process.env.COMFYUI_API_KEY,
  });

  const t0 = Date.now();
  const imgResults = await client.generateBatch(items, outputDir, 3);
  console.log(`\n✓ ${imgResults.size}/${items.length} images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  → ${outputDir}`);
  console.log('\nCompare with originals at:');
  for (const id of BEAT_IDS) {
    console.log(`  ${path.join(episodeDir, 'images', `${id}.png`)}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
