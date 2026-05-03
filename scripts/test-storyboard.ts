/**
 * Test "storyboard pass" — tout un segment écrit en UN appel Haiku.
 *
 * Améliorations vs rich-prompts test :
 *   1. Tous les beats du segment passent à Haiku ENSEMBLE → cohérence storyboard,
 *      anti-répétition cross-beat, exploitation de l'établissement.
 *   2. Modulation explicite par emotion (revelation = close-up dramatique,
 *      tension = confrontation, contexte = wide, impact = moment figé, etc.).
 *   3. Forbidden patterns : max 1 figure humaine pour 5 beats, jamais
 *      "lone analyst with magnifying glass" répété, etc.
 *   4. Décomposition subject/action/idea/referents conservée.
 *
 * Usage : npx tsx scripts/test-storyboard.ts                 # 04-29 / seg_4
 *         npx tsx scripts/test-storyboard.ts 2026-04-29 seg_1
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateStructuredJSON } from '../packages/ai/src/llm-client';
import { ComfyUIClient } from '../packages/ai/src/comfyui/comfyui-client';

const ROOT = process.cwd();

const STYLE_PREFIX = 'WSJ hedcut stipple pen and ink illustration on aged cream paper, fine crosshatching and dot shading, black ink dominant, rich editorial composition with multiple distinct elements arranged with clear spatial hierarchy. ';
const MOOD_SUFFIX = ', dramatic ink shading, high contrast crosshatching, cinematic editorial framing, wide 16:9';

interface Beat {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
}

interface StoryboardItem {
  id: string;
  decomposition: {
    subject: string;
    action: string;
    idea: string;
    referents: string[];
  };
  cameraDistance: 'wide' | 'medium' | 'close' | 'extreme-close';
  prompt: string;
}

function loadSegment(date: string, segId: string) {
  const episodeDir = path.join(ROOT, 'episodes', '2026', date.slice(5));
  const beatsRaw = JSON.parse(fs.readFileSync(path.join(episodeDir, 'beats.json'), 'utf-8'));
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(path.join(episodeDir, 'script.json'), 'utf-8'));
  const section = script.sections.find((s: any) => s.id === segId);
  const beats = allBeats.filter((b) => b.segmentId === segId);
  const mood = script.direction?.moodMusic ?? 'neutre_analytique';
  return { beats, section, episodeDir, mood };
}

async function generateStoryboard(
  beats: Beat[],
  section: any,
  mood: string,
): Promise<StoryboardItem[]> {
  const system = `You are an editorial visual director writing a STORYBOARD for one segment of a financial video, in WSJ hedcut illustration style. You receive ALL beats of the segment at once. Plan all prompts as a coherent visual sequence — not isolated vignettes.

═══ HARD RULES ═══

1. DECOMPOSE EACH BEAT before writing its prompt:
   - subject : what this beat is REALLY about given the segment context (always integrates the segment's recurring subject/assets)
   - action : the gesture or metaphor in the sentence
   - idea : the meaning to transmit
   - referents : 3-5 concrete identifiable visual elements drawn from the segment assets/topic

2. STORYBOARD COHERENCE — vary across consecutive beats:
   - Camera distance must rotate: do not use the same cameraDistance for >2 beats in a row
   - Background/setting must rotate: do not repeat the SAME setting more than twice in the segment
   - Exploit establishment: once a "4 corporate towers" wide shot is used, later beats prefer ONE tower close-up, or interior shot, or detail of a single artifact
   - Distribute the segment's referents across beats — don't pile them all into one frame
   - Each prompt must be DIFFERENT from neighbors in composition

3. EMOTION MODULATION (apply to the prompt's composition):
   - "revelation"  → dramatic close-up on ONE specific element (an underlined line, an encircled number, a single gesture)
   - "tension"     → asymmetric composition, two forces opposing, visual confrontation
   - "contexte"    → wider establishing or contextual frame, multiple elements
   - "impact"      → frozen moment of impact (object breaking, scale tipping, ink spilling)
   - "respiration" → calm, sky, negative space, single object at ease
   - "conclusion"  → panoramic or summary view, resolution

4. FORBIDDEN PATTERNS (anti-fatigue):
   - Max 1 human figure per 5 beats. Prefer pure object / architecture / abstraction compositions.
   - NEVER use these recurring tropes: "lone analyst at desk", "investor with magnifying glass", "trader silhouette gazing at chart", "figure walking away", "person holding briefcase"
   - Avoid clichés unless genuinely apt: hourglass, dominos, broken chain, scales of justice
   - Forbidden words in prompt: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background, lone analyst, magnifying glass

5. ANTI-LITERAL:
   - If the sentence contains an abstract noun (foi, doute, peur, attente), DO NOT illustrate it as praying figures, question marks, clocks. Use a STRUCTURAL metaphor that integrates the segment subject.
   - If the sentence mentions a stage device (projecteur, miroir, voile, signal), DO NOT just draw the device — show what it ACTS UPON and what it MISSES.
   - Always weave the segment's recurring subject (the assets/HQs/products) into the visual.

6. PROMPT RICHNESS (40-80 words):
   - Foreground / midground / background hierarchy
   - Multiple distinct elements arranged spatially
   - Sensory details: texture, light direction, materials, motion
   - Hedcut stipple style is enforced by code prefix — do NOT restate "stipple" or "hedcut" in your prompt

═══ OUTPUT STRICT JSON ARRAY in beat order ═══

[
  {
    "id": "<beatId>",
    "decomposition": {
      "subject": "<who/what>",
      "action": "<gesture/metaphor>",
      "idea": "<meaning>",
      "referents": ["<3-5 concrete visual elements>"]
    },
    "cameraDistance": "wide" | "medium" | "close" | "extreme-close",
    "prompt": "<40-80 word rich storyboard prompt, modulated by emotion, varied from neighboring beats>"
  }
]`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Mood: ${mood}
Recurring subject (assets the entire segment is REALLY about): ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration (read this to grasp the argument):
${section.narration}

=== ALL BEATS (${beats.length} total, in order) ===

${beats.map((b, i) => `[${i + 1}] id=${b.id}  emotion=${b.emotion ?? 'context'}
sentence: "${b.narrationChunk.slice(0, 280)}"`).join('\n\n')}

Plan and write the full storyboard. Output the JSON array in beat order.`;

  const result = await generateStructuredJSON<StoryboardItem[]>(system, user, { role: 'fast' });
  return result;
}

async function main() {
  const date = process.argv[2] || '2026-04-29';
  const segId = process.argv[3] || 'seg_4';

  console.log('=== Storyboard pass test ===');
  console.log(`Episode: ${date}  Segment: ${segId}\n`);

  const { beats, section, episodeDir, mood } = loadSegment(date, segId);
  console.log(`Segment: "${section.title}"`);
  console.log(`Topic: ${section.topic}`);
  console.log(`Mood: ${mood}`);
  console.log(`Assets: ${(section.assets ?? []).join(', ')}`);
  console.log(`Beats: ${beats.length}\n`);

  console.log('→ Generating full storyboard (Haiku, 1 batch call)...');
  const t0 = Date.now();
  const storyboard = await generateStoryboard(beats, section, mood);
  console.log(`  ✓ ${storyboard.length} prompts received in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // Print summary table
  console.log('Camera distance distribution:');
  const camCounts: Record<string, number> = {};
  for (const item of storyboard) camCounts[item.cameraDistance] = (camCounts[item.cameraDistance] ?? 0) + 1;
  console.log('  ' + Object.entries(camCounts).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('');

  // Print each beat for review
  for (const item of storyboard) {
    const beat = beats.find((b) => b.id === item.id);
    if (!beat) continue;
    console.log(`--- ${item.id}  emotion=${beat.emotion ?? 'context'}  cam=${item.cameraDistance} ---`);
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 140)}"`);
    console.log(`SUBJECT  : ${item.decomposition.subject}`);
    console.log(`PROMPT   : ${item.prompt}`);
    console.log('');
  }

  // Save
  const outputDir = path.join(episodeDir, 'images-storyboard-test');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_storyboard.json'),
    JSON.stringify({ date, segId, segmentTitle: section.title, mood, storyboard }, null, 2),
    'utf-8',
  );
  console.log(`Plan saved → ${path.join(outputDir, '_storyboard.json')}`);

  // ComfyUI
  if (!process.env.COMFYUI_API_URL) {
    console.log('\nCOMFYUI_API_URL not set — skipping image generation.');
    process.exit(0);
  }

  const items = storyboard.map((it) => ({
    id: it.id,
    prompt: STYLE_PREFIX + it.prompt + MOOD_SUFFIX,
  }));

  console.log(`\n→ Generating ${items.length} images via ComfyUI Cloud...`);
  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL,
    apiKey: process.env.COMFYUI_API_KEY,
  });

  const imgT0 = Date.now();
  const results = await client.generateBatch(items, outputDir, 4);
  const elapsed = ((Date.now() - imgT0) / 1000).toFixed(1);

  console.log(`\n✓ ${results.size}/${items.length} images in ${elapsed}s`);
  console.log(`  → ${outputDir}`);
  console.log('\nCompare with originals:');
  console.log(`  ${path.join(episodeDir, 'images')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
