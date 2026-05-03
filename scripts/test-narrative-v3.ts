/**
 * Test narrative v3 — multi-subjects + 8 kinds concrets + texte forcé.
 *
 * PASS 1 (1 batch Haiku) :
 *   Pour chaque beat, identifie une LISTE de sujets (≥1) avec :
 *     - ref     : nom littéral (Microsoft, Donald Trump, CL=F, "un consommateur américain"…)
 *     - kind    : un des 8 kinds concrets (named-company, named-institution,
 *                 named-person, unnamed-actor, financial-symbol,
 *                 economic-indicator, physical-object, document-screen)
 *     - role    : protagonist | antagonist | context | instrument
 *
 * PASS 2 (N appels parallèles) :
 *   Reçoit la liste complète des subjects + guidance par kind. Compose un
 *   prompt narratif où tous les sujets cohabitent avec leurs identity
 *   anchors respectifs. Pour named-*  / financial-symbol, le NOM doit
 *   apparaître comme TEXTE physique dans la frame (Flux gère mieux le
 *   texte que les logos).
 *
 * Test sur 3 beats du seg_4 — comparaison avec les 4 versions précédentes.
 *
 * Usage : npx tsx scripts/test-narrative-v3.ts
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
  whatHappens: string;       // l'histoire en une phrase (qui fait quoi pourquoi)
  momentCaptured: string;    // l'instant T figé
  identityAnchors: string[]; // 1 entrée par subject named-* / financial-symbol — comment il apparaît visuellement (texte forcé)
  prompt: string;            // 60-90 mots narratif
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

// ── PASS 1 — multi-subject mapping ─────────────────────────────────

async function runPass1(beats: Beat[], section: any): Promise<BeatSubjects[]> {
  const system = `You are an editorial visual director. You receive ALL beats of one segment and identify, for each beat, the LIST of concrete subjects the sentence is about.

A beat can have ONE or SEVERAL subjects, and they can be of DIFFERENT kinds. Examples:
- "Microsoft signs a deal with Trump"          → 2 subjects: Microsoft (named-company) + Trump (named-person)
- "Le pétrole comprime le portefeuille US"     → 2 subjects: CL=F (financial-symbol, antagonist) + un consommateur américain (unnamed-actor, protagonist)
- "Les 4 titans publient ce soir"              → 4 subjects: Microsoft, Google, Meta, Amazon (all named-company)
- "Powell parle pour la dernière fois"         → 1 subject: Jerome Powell (named-person)
- "L'OPEP se fissure quand l'UAE part"         → 2 subjects: OPEP (named-institution) + UAE (named-institution / named-country)
- "Le RSI de NVDA atteint 76"                  → 2 subjects: RSI (economic-indicator) + NVDA (named-company)

═══ THE 8 SUBJECT KINDS (all CONCRETE — no abstractions) ═══

- named-company       : a named company (Microsoft, Air Liquide, BP, Tencent)
- named-institution   : a named institution / central bank / cartel / country-as-actor (Fed, ECB, OPEC, US Treasury, China)
- named-person        : a named individual (Powell, Trump, Lagarde, MBZ, Bessent)
- unnamed-actor       : a role-identifiable actor without a specific name (an analyst, a CFO, a Geneva trader, an American consumer, a refinery worker)
- financial-symbol    : a tradeable instrument with a ticker (CL=F, GC=F, USDJPY=X, ^VIX, BTC-USD, MSFT)
- economic-indicator  : a measure / ratio / data point (RSI, CPI, P/E multiple, yield, NFP, unemployment rate)
- physical-object     : a real-world object that embodies what is at stake (a barrel, a valve, a pump, a container, a mining shaft, a rooftop AC)
- document-screen     : a document, a screen, a press release, a Bloomberg terminal, an earnings filing

═══ THE 4 ROLES ═══

- protagonist : the subject whose action drives the beat
- antagonist  : the subject opposing or pressuring the protagonist
- context     : present in the scene to anchor it (background)
- instrument  : used/manipulated by the protagonist

═══ RULES ═══

- Identify EVERY subject the sentence concretely names or implies — do NOT collapse multiple actors into one.
- Use the segment context to disambiguate but stay faithful to the sentence.
- If the sentence seems abstract ("la foi tient", "les projecteurs sur les bénéfices"), find the concrete actors who EMBODY the abstraction (the analysts who watch, the fund managers who price, the consumer who pays).
- Each beat must have at least 1 subject. Most have 1-3. Some have up to 5.

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

// ── PASS 2 — narrative rich prompt with multi-subjects ─────────────

const KIND_GUIDANCE: Record<SubjectKind, string> = {
  'named-company': 'Render the company NAME as readable TEXT on a physical surface in the frame: nameplate, banner, document header, signage, ticker tape. Example: "nameplate reading \'MICROSOFT\' in serif type". You may add iconic architecture as secondary cue (Apple Park ring, Microsoft prism towers, Googleplex geodesic dome, Amazon spheres). DO NOT rely on logos alone — Flux renders text more reliably than logos.',
  'named-institution': 'Render the institution NAME as readable TEXT on the building façade, a banner, a podium plaque. Example: "stone fronton with engraved letters \'FEDERAL RESERVE\'", "podium banner reading \'OPEC\'". Use distinctive architectural cues (neoclassical pediment for central banks, glass tower for OPEC HQ, etc.).',
  'named-person': 'Render as a hedcut-style portrait or silhouette in profile. Add a NAMEPLATE with the name in serif type, OR a clearly evocative context (Oval Office desk for POTUS, podium with press microphones, Senate chamber). Distinctive features matter: Powell\'s rimless glasses, Trump\'s combover, Lagarde\'s short white hair.',
  'unnamed-actor': 'Show the role through GESTURES, CLOTHING, ENVIRONMENT — not a name. A trader: hunched at multi-monitor desk. A CFO: at a podium with microphone. A consumer: hand holding a wallet, foot in supermarket aisle. A refinery worker: hard hat, gloved hands, gauges. NO nameplate (they are not named).',
  'financial-symbol': 'Show the asset PHYSICALLY (barrel for CL=F, gold bars for GC=F, copper coil for HG=F, Yen banknotes for USDJPY=X) PLUS the ticker as readable TEXT on a screen, label, or stamp. Example: "an oil barrel with a stenciled \'CL=F\' label", "a Bloomberg terminal showing the ticker \'BTC-USD\' in amber digits".',
  'economic-indicator': 'Show the indicator as a PHYSICAL INSTRUMENT (gauge, dial, lever, thermometer, scale) with the indicator name as TEXT on the dial or label. Example: "an RSI gauge labeled \'AMZN RSI 74\' in the red overbought zone".',
  'physical-object': 'Render the object precisely with sensory detail (texture, material, scale). Place it in a context that carries its meaning — the barrel in a refinery, the valve in a pipeline yard, the pump at a deserted gas station.',
  'document-screen': 'Render the document or screen with READABLE content (headlines, numbers, paragraphs). The text MUST carry meaning. Example: "an earnings report page with the bold heading \'Q4 EPS: $2.47\' and a smaller line below reading \'2026 CAPEX guidance: $55B+\'".',
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

  const namedKinds: SubjectKind[] = ['named-company', 'named-institution', 'named-person', 'financial-symbol'];
  const namedSubjects = subjects.filter((s) => namedKinds.includes(s.kind));

  const system = `You are an editorial visual director writing ONE rich NARRATIVE image prompt for a financial video panel, in WSJ hedcut illustration style.

═══ THE IMAGE TELLS A STORY WITH ITS CHARACTERS ═══

You receive a LIST of subjects (1 or more). The image must:
- Place ALL subjects in ONE coherent scene where they cohabit or interact
- Each subject's role (protagonist / antagonist / context / instrument) drives spatial hierarchy
- Render each subject according to its kind-specific guidance below
- Tell a clear story: WHO is doing WHAT, WHY, AT WHAT MOMENT

═══ TEXT IS YOUR FRIEND ═══

For named-company / named-institution / named-person / financial-symbol, you MUST render the NAME as readable TEXT on a physical surface in the frame (nameplate, banner, document header, ticker tape, signage, badge, plaque). Flux renders text more reliably than logos. The viewer must read the name DIRECTLY in 1-2 seconds.

═══ ANTI-LITERAL ═══

If the sentence contains an abstract noun (foi, doute, attente), do NOT illustrate it as a praying figure or question marks. Build a STRUCTURAL metaphor — but always anchored to the concrete subjects you received.

If the sentence mentions a stage device (projecteur, miroir, signal), show what it ACTS UPON and what it OMITS, with the named subjects in frame.

═══ COMPOSE THE PROMPT (60-90 words) ═══

Hard rules:
- FOREGROUND / MIDGROUND / BACKGROUND hierarchy
- Sensory detail: texture, light direction, materials, motion
- Camera language naturally
- Hedcut stipple style is added by code prefix — do NOT restate it
- Forbidden: cartoon, caricature, selfie, photorealistic, lens flare, glowing, soft focus, bokeh, dark background, lone analyst with magnifying glass

═══ OUTPUT STRICT JSON ═══
{
  "whatHappens": "<the story in one sentence: who does what why>",
  "momentCaptured": "<the precise instant frozen — just-before / peak / turn>",
  "identityAnchors": [<one entry per named-* / financial-symbol subject — describe how its NAME appears as text in the frame>],
  "prompt": "<60-90 word narrative prompt that reads as a story unfolding in one frame, integrating all subjects per their kind-guidance>"
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

=== SUBJECTS (pre-identified by Pass 1 — ALL must appear in your scene) ===
${subjectsBlock}

${namedSubjects.length > 0
  ? `=== TEXT MANDATE — these names MUST appear as readable TEXT in the frame ===\n${namedSubjects.map((s) => `• "${s.ref}"`).join('\n')}`
  : '=== TEXT MANDATE — none (no named subjects) ==='}

Now write the narrative prompt. Output the JSON.`;

  return generateStructuredJSON<NarrativeBeat>(system, user, { role: 'fast' });
}

async function main() {
  console.log('=== Narrative v3 test (multi-subjects, 3 beats / seg_4) ===\n');

  const { beats, section, episodeDir } = loadEpisode();
  console.log(`Segment: "${section.title}"`);
  console.log(`Beats: ${beats.map((b) => b.id).join(', ')}\n`);

  // PASS 1
  console.log('→ PASS 1: multi-subject mapping (1 batch)...');
  const t1 = Date.now();
  const subjectsByBeat = await runPass1(beats, section);
  console.log(`  ✓ in ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  for (const sb of subjectsByBeat) {
    console.log(`  [${sb.id}] ${sb.subjects.length} subjects:`);
    for (const s of sb.subjects) {
      console.log(`     - "${s.ref}" (${s.kind}, ${s.role})`);
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
    console.log(`SENTENCE: "${beat.narrationChunk.slice(0, 130)}"`);
    if (error || !output) { console.log(`  ERROR: ${error}`); continue; }
    console.log(`  WHAT HAPPENS    : ${output.whatHappens}`);
    console.log(`  MOMENT          : ${output.momentCaptured}`);
    console.log(`  IDENTITY ANCHORS: ${output.identityAnchors.join(' | ')}`);
    console.log(`  PROMPT          : ${output.prompt}`);
    console.log(`  (${output.prompt.split(/\s+/).length} words)\n`);
  }

  const outputDir = path.join(episodeDir, 'images-narrative-v3');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, '_v3.json'),
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
