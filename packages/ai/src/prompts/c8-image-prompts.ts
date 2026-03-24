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

IMPORTANT: Do NOT include style instructions (hedcut, stipple, crosshatching, cream paper, 16:9) in your prompts — the system appends the style automatically. Focus ONLY on CONTENT: what is in the scene, the composition, the lighting, the mood.

COLOR ACCENTS: Mention selective color when relevant:
  • "with golden color accent" for precious metals
  • "with orange color accent" for oil/energy
  • "with cool blue accent" for tech/crypto
  • Everything else: no color mention (will be black ink)

RULES:
- Write in natural English SENTENCES (subject first, details after)
- Each prompt: 30-50 words (CONTENT ONLY, no style words)
- Describe human figures by PHYSICAL TRAITS: "silver-haired man in dark suit at podium" NOT "Jerome Powell"
- Human figures shown as silhouettes, from behind, in profile, or at distance — NEVER front-facing portraits
- Physical/tangible metaphors OK: melting, crumbling, sinking, splitting, towering
- Max 3 focal elements per image (Flux limitation — more = muddy result)
- Split compositions: "left half shows X, right half shows Y, sharp vertical divide"
- NEVER include readable text, labels, logos, signs, or writing in the image
- NEVER use words: "text", "label", "sign", "logo", "writing", "letters", "caption"
- NEVER describe dark, black, or colored backgrounds — the background is ALWAYS aged cream/beige paper (enforced by style prefix). Do not write "black background", "dark surface", "black velvet", etc.

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

REMINDER: WSJ hedcut stipple style, black ink on cream paper, selective color accents only on key elements. Describe figures by physical traits, never names. Max 3 focal elements. Natural English sentences, subject first.

${JSON.stringify(compact, null, 0)}`;

  return { system, user };
}
