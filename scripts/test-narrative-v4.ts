/**
 * Test narrative v4 — sans texte forcé, sans exemples.
 *
 * Différences vs v3 :
 *   - Plus aucun « TEXT MUST appear » mandate (Flux écrit mal de toute façon)
 *   - Plus AUCUN exemple concret dans le prompt système (évite le priming
 *     « 4 corporate towers » où Haiku recopie la forme de l'exemple)
 *   - Guidance par kind = principe abstrait seulement, à charge du LLM
 *     d'interpréter visuellement le sujet
 *
 * Usage : npx tsx scripts/test-narrative-v4.ts
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

type SubjectKind =
  | 'named-company'
  | 'named-institution'
  | 'named-person'
  | 'unnamed-actor'
  | 'financial-symbol'
  | 'economic-indicator'
  | 'physical-object'
  | 'document-screen';

type SubjectRole = 'protagonist' | 'antagonist' | 'context' | 'instrument';

interface Subject {
  ref: string;
  kind: SubjectKind;
  role: SubjectRole;
}

interface BeatSubjects {
  id: string;
  subjects: Subject[];
}

interface NarrativeBeat {
  whatHappens: string;
  momentCaptured: string;
  prompt: string;
}

interface Beat {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
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

// ── PASS 1 — multi-subject mapping (no examples) ──────────────────

async function runPass1(beats: Beat[], section: any): Promise<BeatSubjects[]> {
  const system = `You are an editorial visual director. You receive ALL beats of one segment and identify, for each beat, the LIST of concrete subjects the sentence is about.

A beat can have ONE or SEVERAL subjects, of DIFFERENT kinds. Identify EVERY concrete subject the sentence names or implies — do not collapse multiple actors into one.

═══ THE 8 SUBJECT KINDS (all concrete — no abstractions) ═══

- named-company       : a specific company named in the sentence
- named-institution   : a named institution / central bank / cartel / country acting as agent
- named-person        : a specific named individual
- unnamed-actor       : a role-identifiable actor without a specific name
- financial-symbol    : a tradeable instrument referenced by ticker
- economic-indicator  : a measure / ratio / data point
- physical-object     : a real-world object that embodies what is at stake
- document-screen     : a document, screen, press release, terminal, filing

═══ THE 4 ROLES ═══

- protagonist : drives the action of the beat
- antagonist  : opposes or pressures the protagonist
- context     : present in the scene to anchor it
- instrument  : used or manipulated by another subject

═══ RULES ═══

- Use the segment context to disambiguate but stay faithful to the sentence.
- If the sentence seems abstract, find the concrete actors who EMBODY the abstraction.
- Each beat must have at least 1 subject. Most have 1-3.

OUTPUT STRICT JSON ARRAY in beat order:
[
  {
    "id": "<beatId>",
    "subjects": [
      { "ref": "<exact name>", "kind": "<one of 8>", "role": "<one of 4>" }
    ]
  }
]`;

  const user = `=== SEGMENT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets: ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== BEATS (${beats.length}) ===

${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nsentence: "${b.narrationChunk.slice(0, 280)}"`).join('\n\n')}

For each beat, identify all concrete subjects. Output the JSON array.`;

  return generateStructuredJSON<BeatSubjects[]>(system, user, { role: 'fast' });
}

// ── PASS 2 — narrative rich prompt, no examples, no text mandate ──

const KIND_GUIDANCE: Record<SubjectKind, string> = {
  'named-company':
    'Represent the company through its DEFINING VISUAL CHARACTERISTICS — chosen freely by you: architecture, signature products, work environment, materials, gestures of its activity. The viewer should sense WHO it is from the visuals alone. Do NOT rely on a written name; do NOT impose a logo.',
  'named-institution':
    'Represent the institution through its iconic architecture, ritual settings, attire, or signature objects of its function. The visual must communicate WHICH institution without writing its name.',
  'named-person':
    'Represent as a hedcut-style portrait or silhouette in profile, recognizable through distinctive physical traits and contextual cues (the setting they occupy, their posture, their instruments). No nameplate.',
  'unnamed-actor':
    'Show the role through gestures, clothing, environment, posture, tools — never through a name. The viewer reads the role from what they DO, not from a label.',
  'financial-symbol':
    'Show the underlying asset PHYSICALLY (the matter, the commodity, the instrument). The viewer reads what asset it is from material and context, not a ticker label.',
  'economic-indicator':
    'Show as a physical instrument (gauge, dial, lever, scale, thermometer). The state of the indicator (overbought, neutral, breaking) is communicated through the instrument\'s position and visual stress.',
  'physical-object':
    'Render the object precisely with sensory detail (texture, material, scale). Place it in a context that carries its meaning — work, danger, abundance, scarcity, decay.',
  'document-screen':
    'Render the document or screen with content that carries meaning visually — layouts, charts, tables, columns. Text content may appear if it directly serves the meaning, but never as a forced label.',
};

async function runPass2OneBeat(
  beat: Beat,
  subjects: Subject[],
  section: any,
): Promise<NarrativeBeat> {
  const subjectsBlock = subjects.map((s, i) => {
    const guidance = KIND_GUIDANCE[s.kind] ?? KIND_GUIDANCE['unnamed-actor'];
    return `[${i + 1}] ref="${s.ref}"  kind=${s.kind}  role=${s.role}\nguidance: ${guidance}`;
  }).join('\n\n');

  const system = `You are an editorial visual director writing ONE rich NARRATIVE image prompt for a financial video panel, in WSJ hedcut illustration style.

═══ THE IMAGE TELLS A STORY WITH ITS CHARACTERS ═══

You receive a LIST of subjects (1 or more). The image must:
- Place ALL subjects in ONE coherent scene where they cohabit or interact
- Each subject's role (protagonist / antagonist / context / instrument) drives spatial hierarchy
- Render each subject according to its kind-specific guidance
- Tell a clear story: WHO does WHAT, WHY, AT WHAT MOMENT

═══ CRITICAL — DO NOT WRITE NAMES ═══

You are not allowed to require text rendering of names, tickers, or labels in the frame. The diffusion model renders text poorly. Identify each subject through VISUAL means: architecture, materials, gestures, environments, instruments, products, posture. The viewer must recognize WHO and WHAT from the imagery itself.

═══ INTERPRET FREELY ═══

Each kind-guidance you receive describes a PRINCIPLE, not a form. Choose the visual representation that best embodies the subject and the meaning of THIS specific beat. Do not default to skylines, towers, podiums, or any recurring visual pattern. Each beat deserves a unique composition.

═══ ANTI-LITERAL ═══

If the sentence contains an abstract noun (foi, doute, attente), build a STRUCTURAL metaphor — never a praying figure or question marks. Anchor the metaphor to the concrete subjects you received.

If the sentence mentions a stage device (projecteur, miroir, signal), show what it ACTS UPON and what it OMITS, with the named subjects in frame.

═══ COMPOSE THE PROMPT (60-90 words) ═══

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy
- Sensory detail: texture, light direction, materials, motion
- Camera language naturally (close-up, wide shot, over-shoulder, low angle, profile, extreme close-up)
- Hedcut stipple style is added by code prefix — do NOT restate it
- Forbidden: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background

═══ OUTPUT STRICT JSON ═══
{
  "whatHappens": "<the story in one sentence: who does what why>",
  "momentCaptured": "<the precise instant frozen — just-before / peak / turn>",
  "prompt": "<60-90 word narrative prompt that reads as a story unfolding in one frame, integrating all subjects per their kind-guidance, NEVER requiring written names or labels>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets: ${(section.assets ?? []).join(', ') || 'none'}

Full segment narration:
${section.narration}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${beat.narrationChunk}"

=== SUBJECTS (pre-identified — ALL must appear in your scene) ===
${subjectsBlock}

Now write the narrative prompt. Output the JSON.`;

  return generateStructuredJSON<NarrativeBeat>(system, user, { role: 'fast' });
}

async function main() {
  console.log('=== Narrative v4 (no examples, no text mandate) — 3 beats ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Beats: ${beats.map((b) => b.id).join(', ')}\n`);

  console.log('→ PASS 1: multi-subject mapping...');
  const t1 = Date.now();
  const subjectsByBeat = await runPass1(beats, section);
  console.log(`  ✓ in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  for (const sb of subjectsByBeat) {
    console.log(`  [${sb.id}] ${sb.subjects.length} subjects:`);
    for (const s of sb.subjects) console.log(`     - "${s.ref}" (${s.kind}, ${s.role})`);
  }

  console.log('\n→ PASS 2: narrative rich prompts (parallel)...');
  const t2 = Date.now();
  const subjectsById = new Map(subjectsByBeat.map((s) => [s.id, s.subjects]));
  const results = await Promise.all(
    beats.map(async (beat) => {
      const subjects = subjectsById.get(beat.id) ?? [];
      try {
        const output = await runPass2OneBeat(beat, subjects, section);
        return { beat, subjects, output, error: null as null | string };
      } catch (e) {
        return { beat, subjects, output: null, error: (e as Error).message.slice(0, 120) };
      }
    }),
  );
  console.log(`  ✓ ${results.filter((r) => r.output).length}/${results.length} prompts in ${((Date.now() - t2) / 1000).toFixed(1)}s\n`);

  for (const { beat, subjects, output, error } of results) {
    console.log(`--- ${beat.id} (${beat.emotion}) — ${subjects.length} subjects ---`);
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 130)}"`);
    if (error || !output) { console.log(`  ERROR: ${error}`); continue; }
    console.log(`  WHAT HAPPENS : ${output.whatHappens}`);
    console.log(`  MOMENT       : ${output.momentCaptured}`);
    console.log(`  PROMPT       : ${output.prompt}`);
    console.log(`  (${output.prompt.split(/\s+/).length} words)\n`);
  }

  const outputDir = path.join(episodeDir, 'images-narrative-v4');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_v4.json'),
    JSON.stringify({
      date: DATE, segId: SEG_ID, segmentTitle: section.title,
      results: results.map(({ beat, subjects, output, error }) => ({
        beatId: beat.id, narration: beat.narrationChunk, subjects, narrative: output, error,
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
