/**
 * Test architecture 2-pass "narrative subject-mapping" :
 *
 *   PASS 1 (1 appel Haiku batch) :
 *     Lit le segment entier + tous les beats. Pour CHAQUE beat décide :
 *       - subject       : de qui/quoi parle SPÉCIFIQUEMENT ce beat
 *       - subjectKind   : named-actors | abstract-concept | downstream-actor | instrument | mechanism
 *     Sortie courte → batch fonctionne bien pour cette tâche simple.
 *
 *   PASS 2 (N appels Haiku parallèles) :
 *     Pour chaque beat reçoit le subject pré-identifié + contexte segment.
 *     Compose un prompt NARRATIF en 60-90 mots structuré autour de :
 *       - who               : le protagoniste de l'image (issu du subject)
 *       - whatTheyDo        : action concrète en cours
 *       - whyTheyDoIt       : motivation / conséquence visible
 *       - momentCaptured    : instant T figé (juste avant, pic, tournant)
 *       - identityAnchor    : comment le viewer identifie le sujet
 *       - referents         : 3-5 éléments visuels qui composent la scène
 *
 * Test sur 3 beats du seg_4 (beat_059, beat_063, beat_069).
 *
 * Usage : npx tsx scripts/test-narrative-prompts.ts
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

// ── Pass 1 schema (light) ──────────────────────────────────────────

interface BeatSubject {
  id: string;
  subject: string;            // De qui/quoi parle ce beat (8-25 mots)
  subjectKind: 'named-actors' | 'abstract-concept' | 'downstream-actor' | 'instrument' | 'mechanism';
}

// ── Pass 2 schema (rich narrative) ─────────────────────────────────

interface NarrativeBeat {
  who: string;                // Protagoniste de l'image
  whatTheyDo: string;         // Action concrète
  whyTheyDoIt: string;        // Motivation / conséquence
  momentCaptured: string;     // Instant T figé
  identityAnchor: string;     // Comment on reconnaît le sujet
  referents: string[];        // Éléments visuels (3-5)
  prompt: string;             // 60-90 mots narratif
}

function loadEpisode() {
  const episodeDir = path.join(ROOT, 'episodes', '2026', DATE.slice(5));
  const beatsRaw = JSON.parse(fs.readFileSync(path.join(episodeDir, 'beats.json'), 'utf-8'));
  const allBeats: Beat[] = Array.isArray(beatsRaw) ? beatsRaw : Object.values(beatsRaw);
  const script = JSON.parse(fs.readFileSync(path.join(episodeDir, 'script.json'), 'utf-8'));
  const section = script.sections.find((s: any) => s.id === SEG_ID);
  const beats = allBeats.filter((b) => BEAT_IDS.includes(b.id));
  beats.sort((a, b) => BEAT_IDS.indexOf(a.id) - BEAT_IDS.indexOf(b.id));
  return { beats, section, episodeDir };
}

// ── PASS 1 — subject mapping ───────────────────────────────────────

async function runPass1(beats: Beat[], section: any): Promise<BeatSubject[]> {
  const system = `You are an editorial visual director. You receive ALL beats of one segment and identify, for each beat, who or what the sentence is REALLY about.

A segment can have ONE recurring subject across all its beats, OR it can shift subjects from one beat to another. Read each sentence carefully — the segment title is just context; the actual subject of THIS beat may be different.

For each beat, output:
- "subject" : 8-25 words describing precisely who/what this specific beat is about. Use the segment context to disambiguate but stay faithful to the sentence.
- "subjectKind" : one of
   · "named-actors"      — the sentence is about specific named actors (companies, executives, institutions, countries) acting or being acted upon
   · "abstract-concept"  — the sentence is about an idea, a belief, a market sentiment (faith, doubt, fear, attention)
   · "downstream-actor"  — the sentence is about an effect on someone else (consumer, citizen, employee, household)
   · "instrument"        — the sentence is about a financial/technical instrument or measure (RSI, multiple, yield, ratio)
   · "mechanism"         — the sentence is about how a market or financial process works (causation, transmission, repricing)

OUTPUT STRICT JSON ARRAY in beat order:
[
  { "id": "<beatId>", "subject": "...", "subjectKind": "..." }
]`;

  const user = `=== SEGMENT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets in segment: ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== BEATS (${beats.length}) ===

${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nsentence: "${b.narrationChunk.slice(0, 280)}"`).join('\n\n')}

For each beat, identify its specific subject. Output the JSON array.`;

  return generateStructuredJSON<BeatSubject[]>(system, user, { role: 'fast' });
}

// ── PASS 2 — narrative rich prompt ─────────────────────────────────

async function runPass2OneBeat(
  beat: Beat,
  subjectInfo: BeatSubject,
  section: any,
): Promise<NarrativeBeat> {
  const subjectKindGuidance: Record<string, string> = {
    'named-actors': 'The subject is named actors (companies, executives, institutions). They MUST appear in the frame as the protagonists of the action. Use IDENTITY ANCHORS so the viewer recognizes them in 1-2 seconds (logos engraved on objects, name plaques, distinctive shapes/colors associated with them).',
    'abstract-concept': 'The subject is an abstract idea (faith, doubt, attention, fear). Build a STRUCTURAL metaphor that embodies this idea concretely — a physical scene where the viewer sees the abstract force at work. NO direct illustration of the abstraction (no praying figures, no question marks).',
    'downstream-actor': 'The subject is a downstream actor (consumer, citizen, household). Show them via a UNIVERSAL substitute (a hand, a wallet, a doorway, a queue, a kitchen counter) — never as a specific named person. The named actors of the segment can appear in the BACKGROUND as the cause of the effect, not as protagonists.',
    'instrument': 'The subject is a financial instrument or measure (RSI, multiple, yield). Show the instrument PHYSICALLY — gauge, scale, dial, lever — being read or affected. Add an actor only if their interaction with the instrument is the point.',
    'mechanism': 'The subject is a market/financial mechanism (transmission, repricing, capture). Show the mechanism in motion as a tangible PROCESS — gears, flows, levers, pressure systems. Named actors appear only if they ARE the mechanism (e.g. a central bank IS the transmission).',
  };

  const system = `You are an editorial visual director writing ONE rich NARRATIVE image prompt for a financial video panel, in WSJ hedcut illustration style.

═══ THE IMAGE MUST TELL A STORY ═══

Every prompt is a micro-story captured in one frame. Decompose into:

- who          : the protagonist of THIS frame (derived from the subject — could be the named actors, a substitute representing a downstream actor, an instrument personified, or an absent narrator embodied through their action)
- whatTheyDo   : the concrete action in progress (a gesture, a movement, an intent visible in the frame)
- whyTheyDoIt  : the motivation or visible consequence — what the action is FOR
- momentCaptured : the precise instant frozen in the frame — usually one of:
                   · "just before"  (tension before action lands)
                   · "the peak"     (action at its climax)
                   · "the turn"     (the very instant where things shift)
- identityAnchor : how the viewer recognizes WHO is at play (logo engraved on object, name plaque, document header, distinctive silhouette/material associated with the subject). MANDATORY whenever the subject is named-actors. For other kinds, the anchor may be the metaphor's defining trait.
- referents     : 3-5 concrete visual elements that compose the scene

═══ COMPOSE THE PROMPT (60-90 words) ═══

The prompt must READ like a story description, not a catalog of objects. Use action verbs in continuous form. Make the viewer follow what's happening: "X is doing Y, while Z is happening behind them, at the moment W appears."

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy with at least 4 distinct visual elements
- Sensory detail: texture, light direction, materials, motion
- Camera language: close-up, wide shot, over-shoulder, low angle, profile, extreme close-up
- Hedcut stipple style is added by code prefix — do NOT restate it

Anti-literal:
- For abstract concepts (foi, doute, attente), build a structural metaphor — NEVER a praying figure, question mark, or hourglass.
- For stage devices (projecteur, miroir, signal), show what they ACT UPON and what they OMIT — never just the device.

Forbidden: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background, lone analyst with magnifying glass.

═══ OUTPUT STRICT JSON ═══
{
  "who": "...",
  "whatTheyDo": "...",
  "whyTheyDoIt": "...",
  "momentCaptured": "...",
  "identityAnchor": "...",
  "referents": ["..."],
  "prompt": "<60-90 word narrative prompt that reads as a story unfolding in one frame>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets in segment: ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

=== SUBJECT (pre-identified by Pass 1) ===
subject     : ${subjectInfo.subject}
subjectKind : ${subjectInfo.subjectKind}

KIND-SPECIFIC GUIDANCE for "${subjectInfo.subjectKind}":
${subjectKindGuidance[subjectInfo.subjectKind] ?? subjectKindGuidance['named-actors']}

Now write the narrative prompt. Output the JSON.`;

  return generateStructuredJSON<NarrativeBeat>(system, user, { role: 'fast' });
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== Narrative 2-pass test (3 beats / seg_4) ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Topic: ${section.topic}`);
  console.log(`Beats: ${beats.map((b) => b.id).join(', ')}\n`);

  // PASS 1
  console.log('→ PASS 1: subject mapping (1 batch Haiku call)...');
  const t1 = Date.now();
  const subjects = await runPass1(beats, section);
  console.log(`  ✓ ${subjects.length} subjects mapped in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  for (const s of subjects) {
    console.log(`  [${s.id}] kind=${s.subjectKind.padEnd(20)} subject="${s.subject}"`);
  }

  // PASS 2
  console.log('\n→ PASS 2: narrative rich prompts (parallel Haiku calls)...');
  const t2 = Date.now();
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const results = await Promise.all(
    beats.map(async (beat) => {
      const subjectInfo = subjectById.get(beat.id);
      if (!subjectInfo) return { beat, subjectInfo: null, output: null, error: 'no subject mapped' };
      try {
        const output = await runPass2OneBeat(beat, subjectInfo, section);
        return { beat, subjectInfo, output, error: null as null | string };
      } catch (e) {
        return { beat, subjectInfo, output: null, error: (e as Error).message.slice(0, 120) };
      }
    }),
  );
  console.log(`  ✓ ${results.filter((r) => r.output).length}/${results.length} prompts in ${((Date.now() - t2) / 1000).toFixed(1)}s\n`);

  // Print + save
  for (const { beat, subjectInfo, output, error } of results) {
    console.log(`--- ${beat.id} (${beat.emotion}) — ${subjectInfo?.subjectKind} ---`);
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 140)}"`);
    if (error || !output) {
      console.log(`  ERROR: ${error}`);
      continue;
    }
    console.log(`  WHO            : ${output.who}`);
    console.log(`  WHAT THEY DO   : ${output.whatTheyDo}`);
    console.log(`  WHY            : ${output.whyTheyDoIt}`);
    console.log(`  MOMENT         : ${output.momentCaptured}`);
    console.log(`  IDENTITY ANCHOR: ${output.identityAnchor}`);
    console.log(`  PROMPT         : ${output.prompt}`);
    console.log(`  (${output.prompt.split(/\s+/).length} words)\n`);
  }

  const outputDir = path.join(episodeDir, 'images-narrative-test');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_narrative.json'),
    JSON.stringify({
      date: DATE, segId: SEG_ID, segmentTitle: section.title,
      results: results.map(({ beat, subjectInfo, output, error }) => ({
        beatId: beat.id, narration: beat.narrationChunk,
        subjectInfo, narrative: output, error,
      })),
    }, null, 2),
    'utf-8',
  );

  if (!process.env.COMFYUI_API_URL) {
    console.log('COMFYUI_API_URL not set — skipping image generation.');
    process.exit(0);
  }

  const items = results
    .filter((r) => r.output)
    .map(({ beat, output }) => ({ id: beat.id, prompt: STYLE_PREFIX + output!.prompt + MOOD_SUFFIX }));

  console.log(`→ Generating ${items.length} images via ComfyUI...`);
  const client = new ComfyUIClient({ apiUrl: process.env.COMFYUI_API_URL, apiKey: process.env.COMFYUI_API_KEY });
  const t0 = Date.now();
  const imgs = await client.generateBatch(items, outputDir, 3);
  console.log(`\n✓ ${imgs.size}/${items.length} images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  → ${outputDir}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
