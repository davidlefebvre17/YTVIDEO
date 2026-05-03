/**
 * Variante "no-example" du test rich-prompts.
 * On vire l'exemple GOOD/BAD du prompt système — qui amorcait Haiku à
 * recopier le pattern « 4 corporate towers in the background » sur tous
 * les beats. On garde uniquement les règles abstraites.
 *
 * Usage : npx tsx scripts/test-rich-prompts-noexample.ts
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
    beatType: 'subject-centered' | 'mechanism' | 'argument' | 'consequence';
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
  // Prompt système ABSTRAIT — aucun exemple concret pour ne pas amorcer Haiku
  const system = `You are an editorial visual director for a financial video in WSJ hedcut illustration style. Write ONE rich, meaningful image prompt that carries the FULL MEANING of a sentence — not a literal one-word illustration.

═══ STEP 1 — CLASSIFY THE BEAT (governs how to compose) ═══

Read the sentence + segment context, then choose ONE beatType:

- "subject-centered" : the sentence names or describes the actors/companies/entities themselves (who they are, what they announce, where they are). The image should SHOW these actors directly via identifiable elements (HQ silhouettes, logos, products, facilities).

- "mechanism" : the sentence describes a market mechanism, a financial process, a causal link (how something works). The image should show the mechanism METAPHORICALLY — a structural metaphor that embodies the process. Actors should NOT dominate the frame — at most appear in margin if genuinely relevant.

- "argument" : the sentence makes an analytical claim, a contrast, an opposition (A vs B, what people see vs what matters). The image should show the CONTRAST itself — the two sides — without forcing actors into frame unless they ARE the two sides.

- "consequence" : the sentence describes an effect, a downstream impact, a result on someone (a consumer, a market, an outcome). The image should show the EFFECT directly — the visible result — not the actors who caused it.

═══ STEP 2 — DECOMPOSE THE SENTENCE ═══

- subject : what this beat is REALLY about (formulated using the segment context, not just the sentence in isolation)
- action : the gesture or metaphor present in the sentence
- idea : the meaning the image must transmit
- concreteReferents : 3-5 visual elements you'll integrate. Choose them from:
  · for "subject-centered" beats : pull from segment assets (HQs, products, logos)
  · for "mechanism" / "argument" / "consequence" beats : invent metaphor-driven referents that embody the idea (stones, instruments, pressure gauges, fabric, water, light, coins). DO NOT default to corporate towers.

═══ STEP 3 — COMPOSE A RICH PROMPT (60-90 words) ═══

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy with at least 4 distinct visual elements arranged spatially
- Sensory detail : texture, light direction, materials, motion
- Camera language naturally (close-up, wide shot, over-shoulder, low angle, profile, extreme close-up)
- Hedcut stipple style is added by code prefix — do NOT restate it

Anti-literal :
- If the sentence contains an abstract noun (foi, doute, attente, peur), do NOT illustrate it as a praying figure or question marks. Build a STRUCTURAL metaphor.
- If the sentence mentions a stage device (projecteur, miroir, signal), do NOT just draw the device. Show what it acts upon AND what it omits.
- If the beat is "mechanism" or "argument", the corporate HQs/towers/logos are NOT mandatory and often counterproductive. Lean on materials, forces, structures.

Anti-cliché : avoid these recurring tropes (use ONLY if genuinely apt) — lone analyst with magnifying glass, trader silhouette gazing at chart, broken chain, hourglass, dominos, scales of justice.

Forbidden words : cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background.

═══ OUTPUT STRICT JSON ═══
{
  "decomposition": {
    "beatType": "subject-centered" | "mechanism" | "argument" | "consequence",
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
Recurring assets (DO NOT force into every image — only when the beat is subject-centered or genuinely calls for them): ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

Classify, decompose, compose the rich prompt. Output the JSON.`;

  return generateStructuredJSON<RichPromptResult>(system, user, { role: 'fast' });
}

async function main() {
  console.log('=== Rich prompts NO-EXAMPLE test (3 beats / seg_4) ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Topic: ${section.topic}`);
  console.log(`Assets: ${(section.assets ?? []).join(', ')}\n`);

  const outputDir = path.join(episodeDir, 'images-rich-noexample');
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
    console.log(`  TYPE     : ${result.decomposition.beatType}`);
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
