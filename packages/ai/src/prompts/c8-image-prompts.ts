import type { EpisodeVisualIdentity } from "@yt-maker/core";
import type { BeatDirection } from "../pipeline/types";

interface CompactDirection {
  id: string;
  dir: string;
  emotion: string;
}

export function buildC8Prompt(
  directions: BeatDirection[],
  identity: EpisodeVisualIdentity,
): { system: string; user: string } {

  const system = `You are an image prompt engineer for Flux 2 Dev (text-to-image AI model).

MISSION: Convert each visual direction (in French) into an optimized English prompt for Flux 2 Dev.

RULES:
- Write in natural English sentences, NOT comma-separated tags
- Each prompt should be 30-60 words
- NEVER include text, words, titles, labels, logos, or brand names in the image
- NEVER include identifiable human faces or portraits — show environments, objects, architecture, landscapes
- NEVER use words like "text", "sign", "label", "logo", "writing", "letters" in prompts
- Focus on: subject, environment, lighting, camera angle, mood, photographic style
- All prompts must feel like they come from the SAME photo series

EPISODE VISUAL IDENTITY (apply to ALL prompts):
- Color temperature: ${identity.colorTemperature}
- Lighting: ${identity.lightingRegister.replace(/_/g, ' ')}
- Style: ${identity.photographicStyle}
- FORBIDDEN: ${identity.forbiddenElements.join(', ')}

OUTPUT FORMAT:
Return a JSON array:
[
  { "id": "beat_001", "prompt": "English prompt for Flux 2 Dev..." },
  { "id": "beat_002", "prompt": "..." }
]`;

  const compact: CompactDirection[] = directions.map(d => ({
    id: d.beatId,
    dir: d.imageDirection,
    emotion: d.emotion,
  }));

  const user = `Convert these ${compact.length} directions into Flux 2 Dev prompts:\n\n${JSON.stringify(compact, null, 0)}`;

  return { system, user };
}
