/**
 * P7c — Narrative image prompts (2-pass architecture).
 *
 * Replaces the per-beat-isolated prompter. For each segment :
 *   PASS 1 (1 batch Haiku) : multi-subject mapping + visualRepresentations + staging
 *   PASS 2 (N parallel Haiku) : narrative rich prompts that realize the staging
 *
 * Tickers (CL=F, USDJPY=X, ^N225) are humanized via company-profiles.json
 * before reaching the LLM (the technical suffixes have no semantic value).
 *
 * Output : Map<beatId, prompt string> — caller wraps in STYLE_PREFIX + suffix.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateStructuredJSON } from '../llm-client';

// ── Types ─────────────────────────────────────────────────────────

export type SubjectKind =
  | 'named-company'
  | 'named-institution'
  | 'named-person'
  | 'unnamed-actor'
  | 'financial-symbol'
  | 'economic-indicator'
  | 'physical-object'
  | 'document-screen';

export type SubjectRole = 'protagonist' | 'antagonist' | 'context' | 'instrument';

export type StagingMode = 'co-located' | 'confronted' | 'anchored' | 'solo';

export interface Subject {
  ref: string;
  kind: SubjectKind;
  role: SubjectRole;
  visualRepresentations: string[];
}

export interface Staging {
  mode: StagingMode;
  compositionHint: string;
}

export interface BeatSubjects {
  id: string;
  subjects: Subject[];
  staging: Staging;
}

export interface NarrativeBeat {
  whatHappens: string;
  momentCaptured: string;
  prompt: string;
}

export interface BeatLite {
  id: string;
  segmentId: string;
  narrationChunk: string;
  emotion?: string;
}

export interface SectionLite {
  id: string;
  type?: string;
  title?: string;
  narration: string;
  topic?: string;
  assets?: string[];
}

// ── Ticker humanization ───────────────────────────────────────────

interface ProfileEntry { symbol: string; name: string; }

let _tickerToName: Map<string, string> | null = null;
function getTickerMap(): Map<string, string> {
  if (_tickerToName) return _tickerToName;
  _tickerToName = new Map();
  const file = join(process.cwd(), 'data', 'company-profiles.json');
  if (!existsSync(file)) return _tickerToName;
  try {
    const profiles: ProfileEntry[] = JSON.parse(readFileSync(file, 'utf-8'));
    for (const p of profiles) _tickerToName.set(p.symbol, p.name);
  } catch { /* non-critical */ }
  return _tickerToName;
}

/** Replace technical tickers ("CL=F", "USDJPY=X", "^N225") with their human name. */
export function humanizeTickers(text: string): string {
  const map = getTickerMap();
  return text.replace(/"([A-Z0-9^=.\-]{1,15})"/g, (match, sym) => {
    const name = map.get(sym);
    return name ? name : match.replace(/"/g, '');
  });
}

export function humanizeAssetList(assets: string[]): string[] {
  const map = getTickerMap();
  return assets.map((a) => map.get(a) ?? a);
}

// ── PASS 1 — multi-subject mapping with visual representations ────

export async function runPass1Subjects(
  beats: BeatLite[],
  section: SectionLite,
): Promise<BeatSubjects[]> {
  const cleanNarration = humanizeTickers(section.narration);
  const cleanAssets = humanizeAssetList(section.assets ?? []);

  const system = `You are an editorial visual director. You receive ALL beats of one segment and identify, for each beat, the LIST of concrete subjects the sentence is about.

For each subject, you ALSO produce 2-4 VISUAL REPRESENTATIONS — concrete ways an illustrator could render this subject. The LLM (you) must use its world-knowledge of each subject to suggest specific imagery; the image generator cannot invent representations on its own. Provide enough material that the next stage has options.

═══ THE 8 SUBJECT KINDS ═══

- named-company       : a specific company named in the sentence
- named-institution   : a named institution / central bank / cartel / country acting as agent
- named-person        : a specific named individual
- unnamed-actor       : a role-identifiable actor without a specific name
- financial-symbol    : a tradeable instrument. The ref MUST be the HUMAN NAME — never a raw ticker with =X, =F, or ^ prefix.
- economic-indicator  : a measure / ratio / data point
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

═══ DO NOT DESCRIBE LOGOS BY THEIR SHAPES ═══

When representing a recognizable brand, institution, or product, NEVER describe its logo as a composition of shapes, letters, or color combinations. The image generator will hallucinate distorted versions. Instead:
  - Reference the logo by NAME ONLY (no shape decomposition), letting the model recall it from training.
  - OR — strongly preferred — describe the subject through PHYSICAL imagery: buildings, products, environments, materials, gestures, tools of its activity. Identify by the tangible, never by graphic composition.

═══ STAGING — coordinate the subjects into ONE unified scene ═══

Beyond identifying individual subjects, you must define HOW they coexist within the SAME image. When several subjects share a beat, they must share a coordinated composition — not appear as juxtaposed isolated vignettes.

Choose one staging mode per beat:

- "co-located"  : multiple subjects share the same setting and participate together in the same action (use when several subjects share the same role and act in parallel)
- "confronted"  : a protagonist and an antagonist face each other in tension or opposition (use when one subject is acting upon or against another)
- "anchored"    : one central protagonist with secondary subjects arranged around them as context (use when one subject dominates the action and others provide setting)
- "solo"        : a single subject occupies the frame on its own (use when there is essentially one subject)

Provide a compositionHint (10-30 words) describing the unified scene where ALL listed subjects coexist coherently — a single space, single moment, single composition. Do not list separate vignettes per subject.

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
        "visualRepresentations": ["<8-25 words>", ...]
      }
    ],
    "staging": {
      "mode": "<one of 4>",
      "compositionHint": "<10-30 words describing the unified scene>"
    }
  }
]`;

  const user = `=== SEGMENT ===
Title: ${section.title ?? '(untitled)'}
Topic: ${section.topic ?? '(unspecified)'}
Recurring assets (humanized): ${cleanAssets.join(', ') || 'none'}

Full segment narration (humanized — tickers replaced with names):
${cleanNarration}

=== BEATS (${beats.length}) ===

${beats.map((b, i) => `[${i + 1}] id=${b.id} emotion=${b.emotion ?? 'context'}\nsentence: "${humanizeTickers(b.narrationChunk).slice(0, 280)}"`).join('\n\n')}

For each beat, identify all concrete subjects with their visual representations and the unified staging. Output the JSON array.`;

  return generateStructuredJSON<BeatSubjects[]>(system, user, { role: 'fast' });
}

// ── PASS 2 — narrative rich prompt for ONE beat ───────────────────

export async function runPass2NarrativeBeat(
  beat: BeatLite,
  subjects: Subject[],
  staging: Staging,
  section: SectionLite,
): Promise<NarrativeBeat> {
  const subjectsBlock = subjects.map((s, i) => {
    const reps = s.visualRepresentations.map((r, ri) => `   ${ri + 1}. ${r}`).join('\n');
    return `[${i + 1}] ref="${s.ref}"  kind=${s.kind}  role=${s.role}\nvisualRepresentations:\n${reps}`;
  }).join('\n\n');

  const system = `You are an editorial visual director writing ONE rich NARRATIVE image prompt for a financial video panel, in WSJ hedcut illustration style.

═══ THE IMAGE TELLS A STORY WITH ITS CHARACTERS ═══

You receive a LIST of subjects with pre-computed visualRepresentations PLUS a STAGING (a unified composition where all subjects coexist in ONE single scene). The image must:
- Place ALL subjects in ONE coherent unified scene per the staging instruction
- Never juxtapose isolated vignettes per subject — they share one space, one moment, one composition
- Use the visualRepresentations as MATERIAL — pick one per subject, OR combine elements from several, OR adapt them to fit the staging
- Each subject's role drives spatial hierarchy within the unified scene (protagonist front, antagonist opposing, context background, instrument in use)
- Tell a clear story: WHO does WHAT, WHY, AT WHAT MOMENT

═══ FREE INTERPRETATION ═══

The visualRepresentations are options to draw from — not a fixed checklist. If the beat's narrative calls for a specific blend or angle, you may adapt or pick one over another. The goal is that the image generator receives concrete imagery to render, not abstract concepts.

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
  "prompt": "<60-90 word narrative prompt that reads as a story unfolding in one frame, drawing concrete imagery from the provided visualRepresentations and realizing the staging>"
}`;

  const user = `=== SEGMENT CONTEXT ===
Title: ${section.title ?? '(untitled)'}
Topic: ${section.topic ?? '(unspecified)'}

Full segment narration (humanized):
${humanizeTickers(section.narration)}

=== THIS BEAT ===
id: ${beat.id}
emotion: ${beat.emotion ?? 'context'}
sentence: "${humanizeTickers(beat.narrationChunk)}"

=== SUBJECTS (with visualRepresentations to draw from) ===
${subjectsBlock}

=== STAGING (the unified composition where ALL subjects coexist) ===
mode            : ${staging.mode}
compositionHint : ${staging.compositionHint}

Now write the narrative prompt that realizes this unified staging. Output the JSON.`;

  return generateStructuredJSON<NarrativeBeat>(system, user, { role: 'fast' });
}

// ── Top-level : one segment → Map<beatId, prompt> ─────────────────

export async function generateNarrativePromptsForSegment(
  beats: BeatLite[],
  section: SectionLite,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (beats.length === 0) return result;

  let pass1: BeatSubjects[];
  try {
    pass1 = await runPass1Subjects(beats, section);
  } catch (err) {
    console.warn(`  P7c narrative Pass 1 failed for ${section.id}: ${(err as Error).message.slice(0, 100)}`);
    return result;
  }

  const pass1ById = new Map(pass1.map((p) => [p.id, p]));

  await Promise.all(
    beats.map(async (beat) => {
      const data = pass1ById.get(beat.id);
      if (!data) return;
      try {
        const out = await runPass2NarrativeBeat(beat, data.subjects, data.staging, section);
        if (out?.prompt) result.set(beat.id, out.prompt);
      } catch (err) {
        console.warn(`    P7c narrative Pass 2 failed for ${beat.id}: ${(err as Error).message.slice(0, 100)}`);
      }
    }),
  );

  return result;
}
