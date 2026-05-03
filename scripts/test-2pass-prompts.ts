/**
 * Test architecture 2-passes :
 *
 *   PASS 1 (1 appel batch Haiku, output court) : storyboard plan
 *     → pour chaque beat: cameraDistance, sceneType, primaryReferent,
 *       emotionFocus. Garantit cohérence cross-beat (anti-répétition,
 *       rotation cadrages) sans saturer le budget output.
 *
 *   PASS 2 (N appels parallèles Haiku) : rich prompts
 *     → chaque beat reçoit contexte segment + son plan individuel +
 *       instruction simple "riche 60-90 mots, foreground/midground/
 *       background, intégrer les assets". Chaque appel a tout son
 *       budget pour la richesse.
 *
 * Test sur 3 beats du seg_4 (beat_059, beat_063, beat_069) pour comparer
 * directement avec les passes précédentes (rich-haiku, storyboard).
 *
 * Usage : npx tsx scripts/test-2pass-prompts.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateStructuredJSON } from '../packages/ai/src/llm-client';
import { ComfyUIClient } from '../packages/ai/src/comfyui/comfyui-client';

const ROOT = process.cwd();
const DATE = '2026-04-29';
const SEG_ID = 'seg_4';
const BEAT_IDS = ['beat_059', 'beat_063', 'beat_069'];

const STYLE_PREFIX = 'WSJ hedcut stipple pen and ink illustration on aged cream paper, fine crosshatching and dot shading, black ink dominant, rich editorial composition with multiple distinct elements arranged with clear spatial hierarchy. ';
const MOOD_SUFFIX = ', dramatic ink shading, high contrast crosshatching, cinematic editorial framing, wide 16:9';

interface Beat {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
}

// ── Pass 1 schema (light) ──────────────────────────────────────────

interface BeatPlan {
  id: string;
  cameraDistance: 'wide' | 'medium' | 'close' | 'extreme-close';
  sceneType: 'establishment' | 'detail' | 'abstraction' | 'confrontation' | 'panorama' | 'metaphor' | 'interior' | 'instrument';
  primaryReferent: string;       // 4-12 mots, élément visuel central de CE beat
  emotionFocus: string;           // 5-15 mots, le pivot dramatique
}

// ── Pass 2 output ──────────────────────────────────────────────────

interface RichPromptOutput {
  prompt: string;
  decomposition: {
    subject: string;
    action: string;
    idea: string;
    referents: string[];
  };
}

// ── Load ───────────────────────────────────────────────────────────

function load() {
  const episodeDir = path.join(ROOT, 'episodes', '2026', DATE.slice(5));
  const beatsRaw = JSON.parse(fs.readFileSync(path.join(episodeDir, 'beats.json'), 'utf-8'));
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(path.join(episodeDir, 'script.json'), 'utf-8'));
  const section = script.sections.find((s: any) => s.id === SEG_ID);
  const beats = allBeats.filter((b) => BEAT_IDS.includes(b.id));
  beats.sort((a, b) => BEAT_IDS.indexOf(a.id) - BEAT_IDS.indexOf(b.id));
  const mood = script.direction?.moodMusic ?? 'neutre_analytique';
  return { beats, section, episodeDir, mood };
}

// ── PASS 1 — light storyboard plan ─────────────────────────────────

async function runPass1(beats: Beat[], section: any, mood: string): Promise<BeatPlan[]> {
  const system = `You are an editorial visual director. You receive ALL beats of a segment and produce a LIGHT STORYBOARD PLAN — one short JSON entry per beat. This plan ensures coherence ACROSS the segment (anti-repetition, camera rotation, narrative pacing). Each entry is intentionally concise — the actual rich prompt comes in a later step.

Rules:
- Vary cameraDistance across beats — do NOT use the same value for >2 consecutive beats
- Vary sceneType across beats — distribute across the segment
- primaryReferent: the SINGLE most central visual element of THIS beat (4-12 words). Each beat must have a DIFFERENT primary referent — no two beats share the same one
- emotionFocus: the dramatic pivot of the beat (5-15 words)
- The segment's recurring assets (corporate HQs, products, etc.) MUST appear across multiple beats — distribute, don't pile

OUTPUT STRICT JSON ARRAY in beat order:
[
  {
    "id": "<beatId>",
    "cameraDistance": "wide" | "medium" | "close" | "extreme-close",
    "sceneType": "establishment" | "detail" | "abstraction" | "confrontation" | "panorama" | "metaphor" | "interior" | "instrument",
    "primaryReferent": "<4-12 words>",
    "emotionFocus": "<5-15 words>"
  }
]`;

  const user = `=== SEGMENT ===
Title: ${section.title}
Topic: ${section.topic}
Mood: ${mood}
Recurring assets: ${(section.assets ?? []).join(', ')}

Full narration:
${section.narration}

=== BEATS (${beats.length}) ===
${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nsentence: "${b.narrationChunk.slice(0, 220)}"`).join('\n\n')}

Produce the light storyboard plan JSON.`;

  return generateStructuredJSON<BeatPlan[]>(system, user, { role: 'fast' });
}

// ── PASS 2 — rich prompt for ONE beat ──────────────────────────────

async function runPass2OneBeat(beat: Beat, plan: BeatPlan, section: any, mood: string): Promise<RichPromptOutput> {
  const system = `You are an editorial visual director writing ONE rich image prompt for a financial video panel, in WSJ hedcut illustration style. You receive the SEGMENT context and a pre-assigned PLAN for THIS specific beat (camera distance, scene type, primary referent, emotion focus). Your job is to write the actual rich prompt.

═══ MUST DO ═══
- Write 60-90 words, with FOREGROUND / MIDGROUND / BACKGROUND hierarchy
- Include AT LEAST 4 distinct visual elements arranged spatially
- Integrate the segment's recurring assets (HQs, logos, products) when relevant — never make a financial-video panel that omits the subject
- Honor the assigned cameraDistance and sceneType — they enforce variety across the segment
- The primaryReferent is the central element of THIS panel
- Use sensory details: texture, light direction, materials, motion
- Use camera language naturally (close-up of, wide shot of, over-shoulder, profile, low angle)

═══ MUST NOT ═══
- Restate "stipple", "hedcut" or style words (added by code prefix)
- Use cliché-fatigue tropes mechanically: "lone analyst with magnifying glass", "trader silhouette gazing at chart", "praying figure", "broken chain"
- Be literal: if the sentence says "projecteur", do not just draw a projector — show what it points at AND what it ignores
- Use forbidden words: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background

OUTPUT STRICT JSON:
{
  "decomposition": {
    "subject": "<who/what>",
    "action": "<gesture/metaphor>",
    "idea": "<meaning>",
    "referents": ["<3-5 concrete visual elements integrated in the prompt>"]
  },
  "prompt": "<60-90 word rich prompt with spatial hierarchy and 4+ distinct elements>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Mood: ${mood}
Recurring assets (must appear when relevant): ${(section.assets ?? []).join(', ')}
Full segment narration (so you grasp the argument):
${section.narration}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

=== ASSIGNED PLAN (honor this) ===
cameraDistance : ${plan.cameraDistance}
sceneType      : ${plan.sceneType}
primaryReferent: ${plan.primaryReferent}
emotionFocus   : ${plan.emotionFocus}

Write the rich prompt. Output the JSON.`;

  return generateStructuredJSON<RichPromptOutput>(system, user, { role: 'fast' });
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== 2-pass prompt test (3 beats / seg_4) ===\n');

  const { beats, section, episodeDir, mood } = load();
  console.log(`Segment: "${section.title}"  mood=${mood}`);
  console.log(`Beats: ${beats.map((b) => b.id).join(', ')}\n`);

  // PASS 1
  console.log('→ PASS 1: light storyboard plan (1 batch Haiku call)...');
  const t1 = Date.now();
  const plans = await runPass1(beats, section, mood);
  console.log(`  ✓ ${plans.length} plans in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  for (const p of plans) {
    console.log(`  [${p.id}] cam=${p.cameraDistance.padEnd(13)} scene=${p.sceneType.padEnd(13)} ref="${p.primaryReferent}"`);
  }

  // PASS 2
  console.log('\n→ PASS 2: rich prompts (parallel Haiku calls, 1 per beat)...');
  const t2 = Date.now();
  const planById = new Map(plans.map((p) => [p.id, p]));
  const results = await Promise.all(
    beats.map(async (beat) => {
      const plan = planById.get(beat.id);
      if (!plan) return { beat, plan: null, output: null, error: 'no plan' };
      try {
        const output = await runPass2OneBeat(beat, plan, section, mood);
        return { beat, plan, output, error: null as null | string };
      } catch (e) {
        return { beat, plan, output: null, error: (e as Error).message.slice(0, 120) };
      }
    }),
  );
  console.log(`  ✓ ${results.filter((r) => r.output).length}/${results.length} prompts in ${((Date.now() - t2) / 1000).toFixed(1)}s\n`);

  // Print + save
  for (const { beat, plan, output, error } of results) {
    console.log(`--- ${beat.id}  emotion=${beat.emotion}  cam=${plan?.cameraDistance}  scene=${plan?.sceneType} ---`);
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 120)}"`);
    if (error || !output) {
      console.log(`  ERROR: ${error}`);
      continue;
    }
    console.log(`SUBJECT  : ${output.decomposition.subject}`);
    console.log(`PROMPT   : ${output.prompt}`);
    console.log(`(${output.prompt.split(/\s+/).length} words)\n`);
  }

  const outputDir = path.join(episodeDir, 'images-2pass-test');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_2pass.json'),
    JSON.stringify({
      date: DATE, segId: SEG_ID, segmentTitle: section.title, mood,
      results: results.map(({ beat, plan, output, error }) => ({
        beatId: beat.id, narration: beat.narrationChunk, plan, output, error,
      })),
    }, null, 2),
    'utf-8',
  );

  // ComfyUI
  if (!process.env.COMFYUI_API_URL) {
    console.log('COMFYUI_API_URL not set — skipping image generation.');
    process.exit(0);
  }

  const items = results
    .filter((r) => r.output)
    .map(({ beat, output }) => ({ id: beat.id, prompt: STYLE_PREFIX + output!.prompt + MOOD_SUFFIX }));

  console.log(`→ Generating ${items.length} images via ComfyUI...`);
  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL,
    apiKey: process.env.COMFYUI_API_KEY,
  });

  const t0 = Date.now();
  const imgResults = await client.generateBatch(items, outputDir, 3);
  console.log(`\n✓ ${imgResults.size}/${items.length} images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  → ${outputDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
