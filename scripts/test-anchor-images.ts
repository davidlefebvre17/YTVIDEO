/**
 * Test "B+C" — métaphore-fil + chaîne causale, sans décor partagé.
 *
 * Approche :
 *   1. Sonnet analyse la narration du segment et produit :
 *      - 1 métaphore-objet récurrente (qui se transforme à travers le segment)
 *      - les personnages connus mentionnés (Powell, Trump, MBZ… JAMAIS
 *        un perso générique)
 *      - une chaîne causale 4-6 étapes
 *   2. Haiku mappe chaque beat à une étape causale et choisit son focus visuel :
 *      - métaphore (phase 1/N de la transformation)
 *      - personnage connu (uniquement si nommé dans le beat)
 *      - scène riche illustrant l'étape
 *   3. ComfyUI batch → 1 PNG par beat dans episodes/{date}/images-anchor-test/
 *
 * Le décor change à chaque beat. Seule la métaphore-objet est récurrente
 * (mais elle évolue). Pas de personnage générique : Flux dériverait.
 *
 * Usage :
 *   npx tsx scripts/test-anchor-images.ts                 # 04-29 / seg_1
 *   npx tsx scripts/test-anchor-images.ts 2026-04-29 seg_2
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateStructuredJSON } from '../packages/ai/src/llm-client';
import { ComfyUIClient } from '../packages/ai/src/comfyui/comfyui-client';

const ROOT = process.cwd();

const STYLE_PREFIX = 'WSJ hedcut stipple pen and ink illustration on aged cream paper, fine crosshatching and dot shading, black ink dominant, rich editorial composition with detailed textures. ';
const MOOD_SUFFIX = ', dramatic ink shading, high contrast crosshatching, cinematic editorial composition, wide 16:9';

interface Beat {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
  imagePrompt?: string;
}

interface ScriptSection {
  id: string;
  type: string;
  title?: string;
  narration: string;
  assets?: string[];
  topic?: string;
}

// ── Visual plan schema ────────────────────────────────────────────────────

interface SegmentVisualPlan {
  metaphor: {
    object: string;
    transformation: string;
    visualDetails: string;
  };
  knownCharacters: Array<{
    name: string;
    role: string;
    descriptors: string;
    nameVariants?: string[];  // alternate spellings to match in beat narration
  }>;
  causalChain: Array<{
    step: number;
    label: string;
    coreIdea: string;
  }>;
}

interface BeatPlanItem {
  id: string;
  causalStep: number;
  focus: 'metaphor' | 'character' | 'scene';
  metaphorPhase?: number;       // 1..N (only if focus=metaphor)
  characterName?: string;       // only if focus=character (must be in knownCharacters)
  prompt: string;
}

// ── Step 1: load segment ──────────────────────────────────────────────────

function loadSegment(date: string, segId: string): {
  beats: Beat[];
  section: ScriptSection;
  episodeDir: string;
} {
  const episodeDir = path.join(ROOT, 'episodes', '2026', date.slice(5));
  const beatsPath = path.join(episodeDir, 'beats.json');
  const scriptPath = path.join(episodeDir, 'script.json');
  if (!fs.existsSync(beatsPath)) throw new Error(`No beats.json at ${beatsPath}`);
  if (!fs.existsSync(scriptPath)) throw new Error(`No script.json at ${scriptPath}`);

  const beatsRaw = JSON.parse(fs.readFileSync(beatsPath, 'utf-8'));
  // beats.json may be either an array or an object {"0":{...},"1":{...}}
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const section: ScriptSection = script.sections.find((s: any) => s.id === segId);
  if (!section) throw new Error(`Segment "${segId}" not found in script`);

  const beats = allBeats.filter((b) => b.segmentId === segId);
  if (beats.length === 0) throw new Error(`No beats for ${segId}`);
  return { beats, section, episodeDir };
}

// ── Step 2: Sonnet — segment visual plan ─────────────────────────────────

async function generateVisualPlan(section: ScriptSection): Promise<SegmentVisualPlan> {
  const system = `You are an editorial visual director for a financial video in WSJ hedcut illustration style. Your job is to design a SEGMENT VISUAL PLAN composed of:

1. ONE recurring metaphor-OBJECT (NOT a human). It must be a physical object/symbol that evolves across the segment to embody the narrative arc. Examples: "a brass barrel sealed with an iron ring that fissures", "a balance scale that tilts then tips over", "a coiled spring that compresses then snaps". The metaphor must be PRECISE and EVOCATIVE (no clichés, no chains/dominoes/hourglasses unless genuinely apt).

2. KNOWN CHARACTERS only — real, named, recognizable public figures EXPLICITLY mentioned in the narration (Powell, Lagarde, Trump, Bin Zayed, Xi, Modi, Putin, Bessent, Macron, Le Maire, etc.). Include name variants for matching (e.g. "Mohammed bin Zayed" / "MBZ" / "le président des Émirats"). DO NOT invent generic characters. If no known person is named, return an empty array.

3. A CAUSAL CHAIN of 4-6 ordered steps. Each step is one logical link of the segment's reasoning (Trigger → Mechanism → Market reaction → Consequence → Outlook). Label each clearly.

Output STRICT JSON:
{
  "metaphor": {
    "object": "<one specific recurring object, 5-15 words, includes material and distinctive feature>",
    "transformation": "<how it evolves across phases — 10-25 words describing 3-5 distinct visual phases>",
    "visualDetails": "<rendering details for stipple/hedcut: textures, hatching density, where ink concentrates — 20-40 words>"
  },
  "knownCharacters": [
    {
      "name": "<full real name>",
      "role": "<their position>",
      "descriptors": "<distinctive recognizable features for hedcut illustration: build, hair, glasses, typical attire — 12-25 words>",
      "nameVariants": ["<alternate name forms or French translations as they may appear in narration>"]
    }
  ],
  "causalChain": [
    { "step": 1, "label": "<short label e.g. Trigger>", "coreIdea": "<the idea this step illustrates, 8-15 words>" }
  ]
}

Constraints:
- The metaphor must accommodate ALL beats' content
- NEVER include generic characters
- NO cliché metaphors (avoid hourglass, domino, falling cards, broken chain unless genuinely the best fit)
- Editorial style, never cartoon, never photorealistic`;

  const user = `Segment title: ${section.title}
Topic: ${section.topic ?? 'unspecified'}
Assets cited: ${(section.assets ?? []).join(', ') || 'none'}

Narration (full):
${section.narration}

Output the visual plan JSON.`;

  return generateStructuredJSON<SegmentVisualPlan>(system, user, { role: 'balanced' });
}

// ── Step 3: Haiku — per-beat plan + prompt ────────────────────────────────

async function generateBeatPlan(
  beats: Beat[],
  plan: SegmentVisualPlan,
): Promise<Map<string, BeatPlanItem>> {
  const charNames = plan.knownCharacters.map((c) => c.name).join(', ') || 'none';
  const phasesCount = Math.min(beats.length, 6);

  const system = `You are an editorial visual director assigning each beat of a segment to ONE of three focuses:
- "metaphor" : show the recurring metaphor-object in a specific phase of its transformation (phase 1 to ${phasesCount}). Use this as the BACKBONE of the segment.
- "character" : show a KNOWN named figure (must be in the provided knownCharacters list) doing something the beat describes. Use ONLY when this character is explicitly mentioned in this beat's narration.
- "scene" : show a rich, contextual scene that illustrates the causal step (refinery yard, port at night, ministerial corridor, trading floor, satellite view, etc.). Use for variety and to advance the narrative.

CRITICAL constraints:
- Each beat picks exactly one focus.
- "character" focus is FORBIDDEN unless that character's name (or a variant) literally appears in this beat's narration.
- Aim for visual VARIETY across the segment: do not pick "metaphor" or "scene" for every beat in a row. Suggested mix for a typical segment: ~30% metaphor (anchored on key moments), 0-20% character (only when named), ~50% scene (rich diverse contexts).
- Each prompt must be RICH (40-70 words), with concrete sensory details, materials, light, action, framing. NO minimalist iconography. NO generic "trader at desk".
- WSJ hedcut stipple style is enforced by the parent prefix — DO NOT restate "stipple" or "hedcut" in your prompt. Focus on CONTENT.
- Forbidden words: cartoon, caricature, selfie, looking at camera, photorealistic, lens flare, glowing, soft focus, bokeh, dark background.
- Use camera language naturally (close-up, wide establishing shot, over-shoulder, low angle, profile).
- VARY camera distance and angle across beats.

Output STRICT JSON array, one item per beat in input order:
[
  {
    "id": "<beatId>",
    "causalStep": <1..N>,
    "focus": "metaphor" | "character" | "scene",
    "metaphorPhase": <1..${phasesCount}>,         // only if focus="metaphor"
    "characterName": "<exact name>",              // only if focus="character"
    "prompt": "<40-70 word rich visual prompt>"
  }
]`;

  const user = `=== SEGMENT METAPHOR (recurring object across phases) ===
Object: ${plan.metaphor.object}
Transformation arc: ${plan.metaphor.transformation}
Render details: ${plan.metaphor.visualDetails}

=== KNOWN CHARACTERS (allowed for "character" focus) ===
${plan.knownCharacters.length === 0
  ? '(none — character focus is FORBIDDEN for every beat)'
  : plan.knownCharacters.map((c) => `- ${c.name} (${c.role}). Variants: ${(c.nameVariants ?? []).join(', ') || 'none'}. Render: ${c.descriptors}`).join('\n')}

Allowed character names: ${charNames}

=== CAUSAL CHAIN ===
${plan.causalChain.map((s) => `${s.step}. ${s.label}: ${s.coreIdea}`).join('\n')}

=== BEATS (in order, ${beats.length} total) ===
${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nNarration: ${b.narrationChunk.slice(0, 280)}`).join('\n\n')}

Assign each beat to a causal step + focus + write its rich prompt. Output the JSON array.`;

  const result = await generateStructuredJSON<BeatPlanItem[]>(system, user, { role: 'fast' });
  const map = new Map<string, BeatPlanItem>();
  for (const item of result) {
    if (item.id && item.prompt) map.set(item.id, item);
  }
  return map;
}

// ── Step 4: assemble + ComfyUI ───────────────────────────────────────────

function assemble(beatPrompt: string): string {
  return STYLE_PREFIX + beatPrompt + MOOD_SUFFIX;
}

async function main() {
  const date = process.argv[2] || '2026-04-29';
  const segId = process.argv[3] || 'seg_1';

  console.log('=== B+C Visual Plan test ===');
  console.log(`Episode: ${date}  Segment: ${segId}\n`);

  const { beats, section, episodeDir } = loadSegment(date, segId);
  console.log(`Loaded ${beats.length} beats for "${section.title}"`);

  // Step 2: Sonnet plan
  console.log('\n→ Generating segment visual plan (Sonnet)...');
  const plan = await generateVisualPlan(section);
  console.log('\n--- METAPHOR ---');
  console.log(`object        : ${plan.metaphor.object}`);
  console.log(`transformation: ${plan.metaphor.transformation}`);
  console.log(`render        : ${plan.metaphor.visualDetails.slice(0, 140)}...`);
  console.log(`\n--- KNOWN CHARACTERS (${plan.knownCharacters.length}) ---`);
  for (const c of plan.knownCharacters) {
    console.log(`  ${c.name} (${c.role}) — variants: ${(c.nameVariants ?? []).join(', ') || '—'}`);
  }
  console.log(`\n--- CAUSAL CHAIN (${plan.causalChain.length} steps) ---`);
  for (const s of plan.causalChain) {
    console.log(`  ${s.step}. ${s.label}: ${s.coreIdea}`);
  }

  // Step 3: Haiku per-beat plan
  console.log(`\n→ Mapping ${beats.length} beats to plan + prompts (Haiku)...`);
  const beatPlanMap = await generateBeatPlan(beats, plan);
  console.log(`  ${beatPlanMap.size}/${beats.length} beats planned`);

  // Mix stats
  const focusCounts = { metaphor: 0, character: 0, scene: 0 };
  for (const item of beatPlanMap.values()) focusCounts[item.focus]++;
  console.log(`  Focus mix: metaphor=${focusCounts.metaphor} character=${focusCounts.character} scene=${focusCounts.scene}`);

  // Save plan + prompts for inspection
  const outputDir = path.join(episodeDir, 'images-anchor-test');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_plan.json'),
    JSON.stringify({ date, segId, segmentTitle: section.title, plan, beatPlan: Object.fromEntries(beatPlanMap) }, null, 2),
    'utf-8',
  );
  console.log(`  Plan saved → ${path.join(outputDir, '_plan.json')}`);

  // Step 4: ComfyUI generation
  if (!process.env.COMFYUI_API_URL) {
    console.error('\nCOMFYUI_API_URL not set — skipping image generation. Showing 3 sample prompts:');
    for (const beat of beats.slice(0, 3)) {
      const item = beatPlanMap.get(beat.id);
      if (item) {
        console.log(`\n  [${beat.id}] step=${item.causalStep} focus=${item.focus}${item.metaphorPhase ? ` phase=${item.metaphorPhase}` : ''}${item.characterName ? ` char=${item.characterName}` : ''}`);
        console.log(`  ${assemble(item.prompt).slice(0, 320)}...`);
      }
    }
    process.exit(0);
  }

  console.log(`\n→ Generating ${beatPlanMap.size} images via ComfyUI Cloud...`);
  const client = new ComfyUIClient({
    apiUrl: process.env.COMFYUI_API_URL,
    apiKey: process.env.COMFYUI_API_KEY,
  });

  const items = beats
    .filter((b) => beatPlanMap.has(b.id))
    .map((b) => ({ id: b.id, prompt: assemble(beatPlanMap.get(b.id)!.prompt) }));

  const t0 = Date.now();
  const results = await client.generateBatch(items, outputDir);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n✓ Done in ${elapsed}s — ${results.size}/${items.length} images.`);
  console.log(`  → ${outputDir}`);
  console.log('\nCompare with canonical images at:');
  console.log(`  ${path.join(episodeDir, 'images')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
