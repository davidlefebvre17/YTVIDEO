/**
 * Test narrative v5 — visual representations + ticker cleanup.
 *
 * Différences vs v4 :
 *   - Tickers techniques (=X, =F, ^) DÉNOYAUTÉS avant d'atteindre le LLM
 *     via lookup dans company-profiles.json. "USDJPY=X" → "USD/JPY",
 *     "CL=F" → "WTI crude oil", "^N225" → "Nikkei 225".
 *   - Pass 1 enrichi : chaque sujet sort avec une LISTE de
 *     `visualRepresentations` (2-4 options concrètes pour rendre ce sujet
 *     visuellement). Le LLM utilise sa connaissance du sujet pour donner
 *     de la matière à ComfyUI.
 *   - Pass 2 reçoit ces représentations et CHOISIT/COMBINE selon le
 *     contexte du beat. Plus de "no text mandate" — laissé libre.
 *
 * Usage : npx tsx scripts/test-narrative-v5.ts
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
  visualRepresentations: string[];
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

// ── Ticker cleanup ────────────────────────────────────────────────

interface Profile { symbol: string; name: string; }

let _tickerToName: Map<string, string> | null = null;
function getTickerMap(): Map<string, string> {
  if (_tickerToName) return _tickerToName;
  _tickerToName = new Map();
  const file = path.join(ROOT, 'data', 'company-profiles.json');
  if (!fs.existsSync(file)) return _tickerToName;
  try {
    const profiles: Profile[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const p of profiles) _tickerToName.set(p.symbol, p.name);
  } catch { /* non-critical */ }
  return _tickerToName;
}

/** Replace technical tickers (CL=F, USDJPY=X, ^N225, BTC-USD) with human names. */
function humanizeTickers(text: string): string {
  const map = getTickerMap();
  return text.replace(/"([A-Z0-9^=.\-]{1,15})"/g, (match, sym) => {
    const name = map.get(sym);
    return name ? name : match.replace(/"/g, '');
  });
}

function humanizeAssetList(assets: string[]): string[] {
  const map = getTickerMap();
  return assets.map((a) => map.get(a) ?? a);
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

// ── PASS 1 — multi-subject mapping with visual representations ────

async function runPass1(beats: Beat[], section: any): Promise<BeatSubjects[]> {
  const cleanNarration = humanizeTickers(section.narration);
  const cleanAssets = humanizeAssetList(section.assets ?? []);

  const system = `You are an editorial visual director. You receive ALL beats of one segment and identify, for each beat, the LIST of concrete subjects the sentence is about.

For each subject, you ALSO produce 2-4 VISUAL REPRESENTATIONS — concrete ways an illustrator could render this subject. The LLM (you) must use its world-knowledge of each subject to suggest specific imagery; ComfyUI cannot invent representations on its own. Provide enough material that the next stage has options.

═══ THE 8 SUBJECT KINDS ═══

- named-company       : a specific company named in the sentence
- named-institution   : a named institution / central bank / cartel / country acting as agent
- named-person        : a specific named individual
- unnamed-actor       : a role-identifiable actor without a specific name
- financial-symbol    : a tradeable instrument. The ref MUST be the HUMAN NAME (e.g. "WTI crude oil", "USD/JPY", "Gold", "Bitcoin", "Nikkei 225") — NEVER a raw ticker like CL=F, USDJPY=X, ^N225.
- economic-indicator  : a measure / ratio / data point (RSI, P/E multiple, yield, CPI)
- physical-object     : a real-world object that embodies what is at stake
- document-screen     : a document, screen, press release, terminal, filing

═══ THE 4 ROLES ═══

- protagonist : drives the action of the beat
- antagonist  : opposes or pressures the protagonist
- context     : present in the scene to anchor it
- instrument  : used or manipulated by another subject

═══ VISUAL REPRESENTATIONS — what to provide ═══

For EACH subject, provide 2-4 distinct visualRepresentations. Each is a short concrete description (8-25 words) of HOW an illustrator could render this subject visually, drawing from your knowledge:

- For a named-company: visual elements that uniquely identify this company — drawing on what is known about its identity
- For a named-institution: visual elements that uniquely identify this institution
- For a named-person: physical traits and contextual cues that make them recognizable
- For an unnamed-actor: visible cues that reveal the role
- For a financial-symbol: physical embodiment of the underlying asset
- For an economic-indicator: a physical visualization that materializes the measure
- For a physical-object: precise sensory detail
- For a document-screen: visual elements that carry the meaning

Each representation is an OPTION — Pass 2 will choose or combine them based on the beat's narrative.

═══ RULES ═══

- Identify EVERY concrete subject the sentence names or implies.
- Each beat must have at least 1 subject. Most have 1-3.
- Do NOT collapse multiple actors into one.

OUTPUT STRICT JSON ARRAY in beat order:
[
  {
    "id": "<beatId>",
    "subjects": [
      {
        "ref": "<exact human name>",
        "kind": "<one of 8>",
        "role": "<one of 4>",
        "visualRepresentations": ["<8-25 words>", "<8-25 words>", ...]
      }
    ]
  }
]`;

  const user = `=== SEGMENT ===
Title: ${section.title}
Topic: ${section.topic}
Recurring assets (humanized): ${cleanAssets.join(', ') || 'none'}

Full segment narration (humanized — tickers replaced with names):
${cleanNarration}

=== BEATS (${beats.length}) ===

${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nsentence: "${humanizeTickers(b.narrationChunk).slice(0, 280)}"`).join('\n\n')}

For each beat, identify all concrete subjects with their visual representations. Output the JSON array.`;

  return generateStructuredJSON<BeatSubjects[]>(system, user, { role: 'fast' });
}

// ── PASS 2 — narrative rich prompt using visualRepresentations ────

async function runPass2OneBeat(
  beat: Beat,
  subjects: Subject[],
  section: any,
): Promise<NarrativeBeat> {
  const subjectsBlock = subjects.map((s, i) => {
    const reps = s.visualRepresentations.map((r, ri) => `   ${ri + 1}. ${r}`).join('\n');
    return `[${i + 1}] ref="${s.ref}"  kind=${s.kind}  role=${s.role}\nvisualRepresentations:\n${reps}`;
  }).join('\n\n');

  const system = `You are an editorial visual director writing ONE rich NARRATIVE image prompt for a financial video panel, in WSJ hedcut illustration style.

═══ THE IMAGE TELLS A STORY WITH ITS CHARACTERS ═══

You receive a LIST of subjects with pre-computed visualRepresentations. The image must:
- Place ALL subjects in ONE coherent scene
- Use the visualRepresentations as MATERIAL — pick one per subject, OR combine elements from several, OR adapt them to fit the beat's specific narrative
- Each subject's role drives spatial hierarchy (protagonist front and center, antagonist opposing, context background, instrument in use)
- Tell a clear story: WHO does WHAT, WHY, AT WHAT MOMENT

═══ FREE INTERPRETATION ═══

The visualRepresentations are options to draw from — not a fixed checklist. If the beat's narrative calls for a specific blend or angle, you may adapt or pick one over another. The goal is that ComfyUI receives concrete imagery to render, not abstract concepts.

═══ ANTI-LITERAL ═══

If the sentence contains an abstract noun (foi, doute, attente), build a STRUCTURAL metaphor anchored to the concrete subjects.

If the sentence mentions a stage device (projecteur, miroir, signal), show what it ACTS UPON and what it OMITS.

═══ COMPOSE THE PROMPT (60-90 words) ═══

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy
- Sensory detail: texture, light direction, materials, motion
- Camera language naturally
- Hedcut stipple style is added by code prefix — do NOT restate it
- Forbidden: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background

═══ OUTPUT STRICT JSON ═══
{
  "whatHappens": "<the story in one sentence: who does what why>",
  "momentCaptured": "<the precise instant frozen — just-before / peak / turn>",
  "prompt": "<60-90 word narrative prompt that reads as a story unfolding in one frame, drawing concrete imagery from the provided visualRepresentations>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title}
Topic: ${section.topic}

Full segment narration (humanized):
${humanizeTickers(section.narration)}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${humanizeTickers(beat.narrationChunk)}"

=== SUBJECTS (with visualRepresentations to draw from) ===
${subjectsBlock}

Now write the narrative prompt. Output the JSON.`;

  return generateStructuredJSON<NarrativeBeat>(system, user, { role: 'fast' });
}

async function main() {
  console.log('=== Narrative v5b (no priming examples in guidance) — 3 beats ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Beats: ${beats.map((b) => b.id).join(', ')}\n`);

  // PASS 1
  console.log('→ PASS 1: multi-subject mapping with visual representations...');
  const t1 = Date.now();
  const subjectsByBeat = await runPass1(beats, section);
  console.log(`  ✓ in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  for (const sb of subjectsByBeat) {
    console.log(`  [${sb.id}] ${sb.subjects.length} subjects:`);
    for (const s of sb.subjects) {
      console.log(`     ▸ "${s.ref}" (${s.kind}, ${s.role})`);
      for (const r of s.visualRepresentations) console.log(`         · ${r}`);
    }
  }

  // PASS 2
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
    console.log(`SENTENCE: "${humanizeTickers(beat.narrationChunk).slice(0, 130)}"`);
    if (error || !output) { console.log(`  ERROR: ${error}`); continue; }
    console.log(`  WHAT HAPPENS : ${output.whatHappens}`);
    console.log(`  MOMENT       : ${output.momentCaptured}`);
    console.log(`  PROMPT       : ${output.prompt}`);
    console.log(`  (${output.prompt.split(/\s+/).length} words)\n`);
  }

  const outputDir = path.join(episodeDir, 'images-narrative-v5b');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_v5b.json'),
    JSON.stringify({
      date: DATE, segId: SEG_ID, segmentTitle: section.title, version: 'v5b',
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
