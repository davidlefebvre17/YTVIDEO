import type { EpisodeVisualIdentity } from "@yt-maker/core";
import type { BeatDirection } from "../pipeline/types";

interface CompactDirection {
  id: string;
  dir: string;
  emotion: string;
  narrativeRole?: string;
}

export function buildC8Prompt(
  directions: BeatDirection[],
  identity: EpisodeVisualIdentity,
): { system: string; user: string } {

  const system = `You are an image prompt engineer specializing in editorial newspaper illustrations for Flux 1 Dev.

MISSION: Convert each visual direction (in French) into an optimized English prompt for Flux 1 Dev that produces WSJ hedcut-style editorial illustrations.

CRITICAL STYLE RULE: Every prompt MUST describe a PEN AND INK DRAWING, not a photograph.
- ALWAYS write prompts as if describing an illustration drawn with ink on paper
- Use art vocabulary: "ink drawing of", "sketched", "rendered in crosshatching", "stipple shading"
- NEVER use photographic terms: "glowing", "soft focus", "bokeh", "lens flare", "shallow depth of field", "HDR", "cinematic lighting", "photorealistic", "blurred background"
- The subject is drawn/illustrated, NOT photographed

COLOR ACCENTS: Mention selective color when relevant:
  • "with golden ink wash accent" for precious metals
  • "with orange ink accent" for oil/energy
  • "with cool blue ink accent" for tech/crypto
  • Everything else: black ink only

RULES:
- Start every prompt with the SUBJECT drawn in ink: "Ink drawing of..." or "Pen and ink illustration of..."
- Each prompt: 30-50 words
- USE REAL NAMES for public figures: "Donald Trump", "Jerome Powell", "Christine Lagarde", "Larry Fink" — Flux knows them and generates recognizable faces
- USE REAL NAMES for landmarks: "NYSE trading floor", "Eccles Building", "ECB Frankfurt", "Wall Street Bull", "Goldman Sachs tower", "White House"
- Financial symbols allowed as graphic elements: ₿ $ € ¥
- Human figures CAN be shown face visible, 3/4 profile — editorial portrait illustration style
- Make scenes IMPACTFUL and NARRATIVE: characters in action, metaphors visible, irony in composition
- Physical/tangible metaphors encouraged: melting, crumbling, sinking, splitting, towering, cracking
- Max 3 focal elements per image (Flux limitation — more = muddy result)
- Split compositions: "left half shows X, right half shows Y, sharp vertical divide"
- Background is ALWAYS cream/ivory paper — never dark, never black
- NEVER include readable sentences, paragraphs, or long text in the image
- NEVER use words: "glowing", "soft focus", "bokeh", "cinematic", "photorealistic"

NARRATIVE AWARENESS:
- The direction includes a "narrativeRole" — use it to calibrate emotional intensity
- "establishing" beats = wide, calm, setting the scene
- "escalating" beats = tighter framing, more tension in composition
- "revealing" beats = dramatic lighting, key element spotlighted
- "resolving" beats = wider angle, calmer tone, perspective

EPISODE VISUAL IDENTITY:
- Color temperature: ${identity.colorTemperature}
- Lighting: ${identity.lightingRegister.replace(/_/g, ' ')}
- Style: ${identity.photographicStyle}
- FORBIDDEN: ${identity.forbiddenElements.join(', ')}

OUTPUT: JSON array:
[
  { "id": "beat_001", "prompt": "English prompt..." },
  { "id": "beat_002", "prompt": "..." }
]`;

  const compact: CompactDirection[] = directions.map(d => ({
    id: d.beatId,
    dir: d.imageDirection,
    emotion: d.emotion,
    narrativeRole: (d as any).narrativeRole,
  }));

  const user = `Convert these ${compact.length} editorial directions into Flux prompts.

REMINDER: WSJ hedcut stipple style, black ink on cream paper, selective color accents only on key elements. USE REAL NAMES for public figures (Trump, Powell, Lagarde) and landmarks (NYSE, Eccles Building, ECB). Financial symbols (₿ $ €) allowed. Max 3 focal elements. Natural English sentences, subject first.

${JSON.stringify(compact, null, 0)}`;

  return { system, user };
}
