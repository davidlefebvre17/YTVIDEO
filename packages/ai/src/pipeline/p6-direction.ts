import { generateStructuredJSON } from "../llm-client";
import type {
  DraftScript, EditorialPlan, AnalysisBundle, DirectedEpisode,
  ArcBeat, Transition, ChartTiming, ThumbnailMoment, MoodTag, AudioBreakpoint,
} from "./types";
import type { Language } from "@yt-maker/core";

function buildC5SystemPrompt(): string {
  return `Tu es le directeur de production d'une émission quotidienne d'analyse de marché (vidéo YouTube).
Tu vois l'épisode ENTIER comme une séquence temporelle et tu définis l'arc narratif, les transitions, le mood, et le timing.

TRANSITIONS DISPONIBLES (Remotion) :
- cut : coupure sèche (300ms) — pour les ruptures thématiques
- fade : fondu enchaîné (500-800ms) — pour les continuités
- wipe : balayage latéral (400-600ms) — pour les changements de contexte
- zoom_out : zoom arrière (500-700ms) — pour les prises de recul
- slide : glissement (400ms) — pour les enchaînements rapides

MOODS MUSICAUX :
- tension_geopolitique : piste sombre, rythme lent
- risk_off_calme : ambient doux, peu de percussions
- bullish_momentum : énergie positive, tempo moyen-rapide
- neutre_analytique : minimal, focus voix
- incertitude : textures instables, pauses

EFFETS SONORES :
- silence : pause dramatique (200-500ms)
- sting : accent musical court
- swoosh : transition rapide
- none : enchaînement direct

RÈGLES :
1. ARC DE TENSION : montée (segments 1-2) → pic (drama max) → respiration (FLASH) → closing mémorable
2. tensionLevel de 1 à 10 pour chaque segment
3. THUMBNAIL MOMENT : le segment avec le plus fort potentiel CTR, avec raison et chiffre clé
4. Un seul tag mood pour l'épisode entier
5. Chart timings : showAtSec = 2 secondes AVANT la mention dans la narration, hideAtSec = fin du point technique
6. Tu ne MODIFIES JAMAIS la narration — elle est figée depuis C3/C4
7. AUDIO BREAKPOINTS : Pour chaque segment, découper la narration en sous-segments selon le pacing naturel.
   - Identifie les ruptures de rythme dans la narration (fait dense → explication → montée → respiration)
   - Chaque sous-segment = pacingTag + wordIndex de début/fin + paramètres ElevenLabs estimés
   - Maximum 3 sous-segments par DEEP, 2 par FOCUS, 1 par FLASH
   - Les segments cold_open et thread sont des sous-segments uniques
   PACING TAGS et paramètres ElevenLabs typiques :
   • lent_martelé : speed=0.82, stability=0.85, style=0.6 (cold open dramatique)
   • pose_fluide : speed=0.93, stability=0.72, style=0.3 (thread, fluide)
   • rapide : speed=1.08-1.10, stability=0.62-0.65, style=0.6-0.7 (info dense)
   • posé : speed=0.88-0.93, stability=0.75-0.80, style=0.2-0.3 (analyse)
   • tension : speed=0.87-0.88, stability=0.78-0.82, style=0.45-0.55 (build-up)
   • analytique : speed=0.95, stability=0.75, style=0.2 (données)
   • synthèse : speed=0.92, stability=0.78, style=0.2 (closing recap)
   • engagement : speed=0.97, stability=0.70, style=0.45 (CTA)
   • teaser : speed=1.04, stability=0.68, style=0.5 (teaser demain)

SORTIE : JSON strict.`;
}

function buildC5UserPrompt(
  draft: DraftScript,
  editorial: EditorialPlan,
  analysis: AnalysisBundle,
): string {
  let prompt = '';

  // Script validated
  prompt += `## SCRIPT VALIDÉ\n`;
  prompt += `Titre: "${draft.title}"\n`;
  prompt += `Durée estimée: ${draft.metadata?.totalDurationSec ?? '?'}s\n`;
  prompt += `Mood marché: ${editorial.moodMarche}\n\n`;

  // Segments with timing
  let cumulativeSec = (draft.coldOpen?.durationSec ?? 8) + (draft.titleCard?.durationSec ?? 4) + (draft.thread?.durationSec ?? 20);
  prompt += `Cold open (0-${draft.coldOpen?.durationSec ?? 8}s): "${draft.coldOpen?.narration ?? ''}"\n`;
  prompt += `Thread (${draft.coldOpen?.durationSec ?? 8}-${cumulativeSec}s): "${draft.thread?.narration ?? ''}"\n\n`;

  for (const seg of draft.segments) {
    const startSec = cumulativeSec;
    const endSec = startSec + seg.durationSec;
    const analysisForSeg = analysis.segments.find(s => s.segmentId === seg.segmentId);
    prompt += `### ${seg.segmentId} [${seg.depth}] (${startSec}-${endSec}s)\n`;
    prompt += `"${seg.narration.slice(0, 200)}${seg.narration.length > 200 ? '...' : ''}"\n`;
    if (analysisForSeg?.chartInstructions?.length) {
      prompt += `Chart instructions (C2): ${JSON.stringify(analysisForSeg.chartInstructions)}\n`;
    }
    if (seg.visualCues?.length) {
      prompt += `Visual cues (C3): ${JSON.stringify(seg.visualCues)}\n`;
    }
    prompt += '\n';
    cumulativeSec = endSec;
  }

  prompt += `Closing (${cumulativeSec}-${cumulativeSec + (draft.closing?.durationSec ?? 25)}s): "${draft.closing?.narration ?? ''}"\n\n`;

  // Global context from C2
  prompt += `## CONTEXTE GLOBAL (C2)\n`;
  prompt += `Mood: ${analysis.globalContext.marketMood}\n`;
  prompt += `Thème: ${analysis.globalContext.dominantTheme}\n`;
  prompt += `Liens inter-segments: ${analysis.globalContext.crossSegmentLinks.join(' | ')}\n\n`;

  // Output format
  prompt += `## FORMAT DE SORTIE
{
  "arc": [
    { "segmentId": "seg_1", "tensionLevel": 6, "role": "montee" }
  ],
  "transitions": [
    {
      "fromSegmentId": "seg_1",
      "toSegmentId": "seg_2",
      "type": "fade",
      "durationMs": 600,
      "soundEffect": "none",
      "vocalShift": "ralentir légèrement"
    }
  ],
  "thumbnailMoment": {
    "segmentId": "{SEG_ID_PLUS_FORT_CTR}",
    "reason": "Pourquoi ce segment accroche le plus",
    "keyFigure": "{CHIFFRE_CLE_DU_SEGMENT}",
    "emotionalTone": "choc | surprise | tension | espoir"
  },
  "moodMusic": "tension_geopolitique",
  "chartTimings": [
    {
      "chartInstruction": { "type": "{TYPE_FROM_C2}", "asset": "{SYMBOL}", "value": "{LEVEL_FROM_C2}", "label": "{LABEL}" },
      "showAtSec": 45,
      "hideAtSec": 80
    }
  ],
  "audioBreakpoints": [
    {
      "segmentId": "cold_open",
      "subIndex": 0,
      "startWordIndex": 0,
      "endWordIndex": 999,
      "pacingTag": "lent_martelé",
      "durationSec": 7,
      "elevenLabsParams": { "speed": 0.82, "stability": 0.85, "style": 0.6 }
    },
    {
      "segmentId": "seg_1",
      "subIndex": 0,
      "startWordIndex": 0,
      "endWordIndex": 80,
      "pacingTag": "rapide",
      "durationSec": 33,
      "elevenLabsParams": { "speed": 1.08, "stability": 0.65, "style": 0.7 }
    },
    {
      "segmentId": "seg_1",
      "subIndex": 1,
      "startWordIndex": 80,
      "endWordIndex": 220,
      "pacingTag": "tension",
      "durationSec": 50,
      "elevenLabsParams": { "speed": 0.88, "stability": 0.80, "style": 0.55 }
    }
  ]
}`;

  return prompt;
}

/**
 * Run C5 Sonnet — global direction.
 */
export async function runC5Direction(input: {
  draft: DraftScript;
  editorial: EditorialPlan;
  analysis: AnalysisBundle;
  lang: Language;
}): Promise<DirectedEpisode> {
  const systemPrompt = buildC5SystemPrompt();
  const userPrompt = buildC5UserPrompt(input.draft, input.editorial, input.analysis);

  console.log('  P6 C5 Sonnet — direction globale...');
  console.log(`  C5 prompt: ${systemPrompt.length + userPrompt.length} chars`);

  const c5Output = await generateStructuredJSON<{
    arc: ArcBeat[];
    transitions: Transition[];
    thumbnailMoment: ThumbnailMoment;
    moodMusic: MoodTag;
    chartTimings: ChartTiming[];
    audioBreakpoints: AudioBreakpoint[];
  }>(
    systemPrompt,
    userPrompt,
    { role: 'balanced' },
  );

  // ── Normalize LLM output field names ──
  // Arc: ensure segmentId exists (LLM might return "id" or "segment")
  if (Array.isArray(c5Output.arc)) {
    for (const beat of c5Output.arc) {
      if (!beat.segmentId) {
        beat.segmentId = (beat as any).id ?? (beat as any).segment ?? 'unknown';
      }
    }
  }

  // Transitions: normalize from/to field names
  if (Array.isArray(c5Output.transitions)) {
    for (const t of c5Output.transitions) {
      if (!t.fromSegmentId) {
        t.fromSegmentId = (t as any).from ?? (t as any).fromId ?? (t as any).from_segment ?? '';
      }
      if (!t.toSegmentId) {
        t.toSegmentId = (t as any).to ?? (t as any).toId ?? (t as any).to_segment ?? '';
      }
    }
  }

  // ChartTimings: normalize nested vs flat structure
  if (Array.isArray(c5Output.chartTimings)) {
    for (const ct of c5Output.chartTimings) {
      if (!ct.chartInstruction && (ct as any).type) {
        // LLM returned flat structure, wrap it
        ct.chartInstruction = {
          type: (ct as any).type,
          asset: (ct as any).asset,
          value: (ct as any).value,
          label: (ct as any).label,
          timeframe: (ct as any).timeframe,
        };
      }
      if (ct.showAtSec === undefined) {
        ct.showAtSec = (ct as any).show ?? (ct as any).startSec ?? 0;
      }
      if (ct.hideAtSec === undefined) {
        ct.hideAtSec = (ct as any).hide ?? (ct as any).endSec ?? ct.showAtSec + 15;
      }
    }
  }

  // AudioBreakpoints: ensure array exists
  if (!Array.isArray(c5Output.audioBreakpoints)) {
    c5Output.audioBreakpoints = [];
  }

  // ── Ensure arc has all segments (including blocks) ──
  const allIds = [
    'cold_open',
    'thread',
    ...input.draft.segments.map(s => s.segmentId ?? (s as any).id ?? `seg_${input.draft.segments.indexOf(s) + 1}`),
    'closing',
  ];

  // Fix draft segments missing segmentId
  for (let i = 0; i < input.draft.segments.length; i++) {
    const seg = input.draft.segments[i];
    if (!seg.segmentId) {
      seg.segmentId = (seg as any).id ?? `seg_${i + 1}`;
    }
  }

  for (const id of allIds) {
    if (!c5Output.arc.find(a => a.segmentId === id)) {
      c5Output.arc.push({
        segmentId: id,
        tensionLevel: 5,
        role: 'montee',
      });
    }
  }

  // Ensure transitions between consecutive segments
  const segIds = input.draft.segments.map(s => s.segmentId);
  const expectedTransitions = segIds.length - 1;
  while (c5Output.transitions.length < expectedTransitions) {
    const idx = c5Output.transitions.length;
    c5Output.transitions.push({
      fromSegmentId: segIds[idx] ?? `seg_${idx + 1}`,
      toSegmentId: segIds[idx + 1] ?? `seg_${idx + 2}`,
      type: 'cut',
      durationMs: 400,
      soundEffect: 'none',
    });
  }

  return {
    script: input.draft,
    arc: c5Output.arc,
    transitions: c5Output.transitions,
    thumbnailMoment: c5Output.thumbnailMoment ?? {
      segmentId: segIds[0] ?? 'seg_1',
      reason: 'Premier segment',
      emotionalTone: 'neutre',
    },
    moodMusic: c5Output.moodMusic ?? 'neutre_analytique',
    chartTimings: c5Output.chartTimings ?? [],
    audioBreakpoints: c5Output.audioBreakpoints ?? [],
    totalEstimatedDuration: input.draft.metadata?.totalDurationSec ?? 420,
  };
}
