import { generateStructuredJSON } from "../llm-client";
import type { DirectedEpisode } from "../pipeline/types";
import type { VisualStoryboard, VisualSlot } from "./types";
import type { Language } from "@yt-maker/core";

function buildC7SystemPrompt(): string {
  return `Tu es le directeur artistique d'une émission quotidienne d'analyse financière sur YouTube.
Tu reçois l'épisode dirigé (script + arc + timings) et tu produis le STORYBOARD VISUEL COMPLET.

## RÈGLE D'OR
Jamais d'IA générative sur les graphiques de prix (risque d'erreurs factuelles).
- Les graphiques de prix → REMOTION_CHART (généré depuis les données JSON)
- Les images conceptuelles/géopolitiques → MIDJOURNEY
- Les personnes (Powell, Lagarde, Bailey, etc.) → STOCK
- Les schémas/infographies → REMOTION_TEXT
- Les chiffres/données → REMOTION_DATA

## COMPOSANTS REMOTION DISPONIBLES

### REMOTION_CHART (graphiques prix)
- chart_principal : InkChart complet avec niveaux support/résistance annotés
- chart_comparaison : 2 barres côte à côte (J-1 vs J0, ou 2 assets)
- chart_split : split screen 2 assets simultanés
- chart_correlation : 2 courbes overlay (corrélation inverse DXY/Or par exemple)
- chart_spark : sparkline 5 jours minimaliste
- chart_indicateur : panel RSI ou MACD seul
- yield_curve : courbe des taux 2Y/10Y animée

### REMOTION_TEXT (infographies)
- infographie_chaine : chaîne causale animée step-by-step (ex: Iran → Ormuz → Supply → Prix)
- infographie_definition : définition terme (ex: STAGFLATION, COT)
- infographie_schema : schéma technique (Bollinger, SMA)
- infographie_scenario : fork bull/bear avec niveaux chiffrés
- infographie_alerte : alerte clignotante (SMA200, RSI extreme)
- infographie_paradoxe : callout paradoxe/contradiction
- transition_segment : texte de transition entre segments

### REMOTION_DATA (données)
- chiffre_geant_animé : chiffre géant count-up (cold open)
- gauge_animee : gauge RSI (0-100) ou Fear & Greed
- multi_badge : 4 badges assets avec prix/variation
- donnee_animee : chiffre ou barre animée unique
- callout_mover : mover screen highlight (+13%, badge géant)
- heatmap_sectorielle : heatmap 11 secteurs S&P
- countdown_event : compte à rebours vers événement économique
- calendrier_eco : calendrier économique du lendemain
- lower_third_recap : bandeau récap segment
- recap_point : bullet point animé (closing)
- teaser_demain : teaser lendemain avec countdown
- end_card : end card YouTube (abonnement + playlist)

## RÈGLES DE DENSITÉ
- DEEP (>90s) : ~1 slot toutes les 5-6 secondes → 15-25 slots
- FOCUS (50-90s) : ~1 slot toutes les 6-7 secondes → 8-14 slots
- FLASH (<50s) : ~1 slot toutes les 7-8 secondes → 3-6 slots
- cold_open : 1-2 slots maximum (chiffre géant + optional image)
- thread : 2-4 slots (image conceptuelle + badges + sparkline)
- closing : 5-8 slots (recap points + calendrier + teaser + end_card)

## PRIORITÉS PAR TYPE DE SEGMENT
- DEEP : chart_principal → infographie_chaine → scenario_fork → gauge → chart_comparaison → STOCK/MIDJOURNEY si géopolitique
- FOCUS : chart_principal → multi_badge ou heatmap → infographie_scenario → STOCK si applicable
- FLASH : callout_mover ou donnee_animee → chart_spark → badge géant

## MIDJOURNEY : uniquement pour
1. Scènes géopolitiques (guerre, tensions, bâtiments gouvernementaux vus de nuit)
2. Concepts abstraits (stagflation, cage Fed, échiquier)
3. Title card / scènes d'ambiance

## STOCK PHOTOS : pour
1. Personnes connues (Powell, Lagarde, Bailey, Trump)
2. Lieux physiques (bâtiment Fed, tour Eiffel, pétrole/tanker)
3. Matières premières physiques (or, usine, champ agricole)

## FORMAT SORTIE
JSON strict avec :
- slots[] : tableau de VisualSlot (TOUS les slots dans l'ordre chronologique)
- midjourneyPrompts[] : prompts pour slots MIDJOURNEY uniquement
- stockPhotoNeeds[] : keywords pour slots STOCK uniquement

Contraintes prompts Midjourney :
- Toujours "no text, no UI" à la fin
- Style : dark cinematic, hyperrealistic, 16:9
- Jamais de visages reconnaissables pour MIDJOURNEY (utilise STOCK pour les personnalités)`;
}

function buildC7UserPrompt(directed: DirectedEpisode, lang: Language): string {
  let prompt = '';

  const script = directed.script;
  const totalSec = script.metadata?.totalDurationSec ?? 400;

  prompt += `## ÉPISODE\n`;
  prompt += `Titre: "${script.title}"\n`;
  prompt += `Durée: ${totalSec}s | Mood: ${directed.moodMusic}\n`;
  prompt += `Thumbnail: segment=${directed.thumbnailMoment.segmentId}, chiffre="${directed.thumbnailMoment.keyFigure}", tone=${directed.thumbnailMoment.emotionalTone}\n\n`;

  // Segment timeline
  prompt += `## SEGMENTS (timeline)\n`;
  let t = script.coldOpen.durationSec + (script.titleCard?.durationSec ?? 4) + script.thread.durationSec;

  prompt += `cold_open  0-${script.coldOpen.durationSec}s: "${script.coldOpen.narration}"\n`;
  prompt += `thread     ${script.coldOpen.durationSec}-${t}s: "${script.thread.narration}"\n\n`;

  const segStarts: Record<string, number> = {};
  for (const seg of script.segments) {
    const startSec = t;
    const endSec = t + seg.durationSec;
    segStarts[seg.segmentId] = startSec;

    const arcBeat = directed.arc.find(a => a.segmentId === seg.segmentId);
    prompt += `### ${seg.segmentId} [${seg.depth}] ${startSec}-${endSec}s (tension=${arcBeat?.tensionLevel ?? '?'})\n`;
    prompt += `Titre: "${seg.title}"\n`;
    prompt += `Assets: ${seg.assets.join(', ')}\n`;
    prompt += `Narration: "${seg.narration.slice(0, 300)}${seg.narration.length > 300 ? '...' : ''}"\n`;

    // Chart timings for this segment
    const segCharts = directed.chartTimings.filter(ct =>
      ct.showAtSec >= startSec && ct.showAtSec < endSec
    );
    if (segCharts.length > 0) {
      prompt += `Chart timings disponibles (${segCharts.length}):\n`;
      segCharts.slice(0, 6).forEach(ct => {
        prompt += `  t=${ct.showAtSec}-${ct.hideAtSec}s : ${ct.chartInstruction.type} ${ct.chartInstruction.asset} "${ct.chartInstruction.label ?? ''}"\n`;
      });
      if (segCharts.length > 6) prompt += `  ... et ${segCharts.length - 6} autres\n`;
    }

    // Audio breakpoints
    const segBreakpoints = directed.audioBreakpoints.filter(b => b.segmentId === seg.segmentId);
    if (segBreakpoints.length > 1) {
      prompt += `Pacing audio: ${segBreakpoints.map(b => `t${b.subIndex}=[${b.pacingTag}]`).join(' → ')}\n`;
    }

    // Transition out
    const transOut = directed.transitions.find(tr => tr.fromSegmentId === seg.segmentId);
    if (transOut) {
      prompt += `Transition → ${transOut.toSegmentId}: [${transOut.type}] ${transOut.soundEffect !== 'none' ? transOut.soundEffect : ''} "${transOut.vocalShift ?? ''}"\n`;
    }

    prompt += '\n';
    t = endSec;
  }

  prompt += `closing  ${t}-${t + script.closing.durationSec}s: "${script.closing.narration}"\n\n`;

  // Arc summary
  prompt += `## ARC DE TENSION\n`;
  prompt += directed.arc.map(a => `${a.segmentId}:T${a.tensionLevel}[${a.role}]`).join(' → ') + '\n\n';

  // Output format
  prompt += `## FORMAT DE SORTIE ATTENDU
Retourne un JSON avec cette structure :
{
  "slots": [
    {
      "slot": 1,
      "tStart": 0,
      "tEnd": 7,
      "segId": "cold_open",
      "source": "REMOTION_DATA",
      "type": "chiffre_geant_animé",
      "desc": "description courte de ce qui s'affiche",
      "asset": "BZ=F"
    }
  ],
  "midjourneyPrompts": [
    {
      "segId": "thread",
      "type": "image_conceptuelle",
      "prompt": "..., dark cinematic, no text, no UI",
      "variant": "prompt alternatif optionnel"
    }
  ],
  "stockPhotoNeeds": [
    {
      "segId": "seg_1",
      "keywords": "jerome powell federal reserve speech",
      "subject": "Powell Fed"
    }
  ]
}

IMPORTANT :
- Couvre TOUT l'épisode du slot 1 jusqu'à end_card
- Respecte la densité par type de segment (DEEP ~20 slots, FOCUS ~10, FLASH ~5)
- Les chartInstructions de P6 doivent être utilisés — aligne les chart slots sur les show/hide times
- Chaque DEEP segment doit avoir : au moins 1 chart_principal, 1 infographie_chaine ou scenario_fork, 1 gauge ou multi_badge
- Le closing se termine TOUJOURS par : calendrier_eco → teaser_demain → end_card
- Préfixe "DEEP:" / "FOCUS:" / "FLASH:" non nécessaire dans la desc
`;

  return prompt;
}

export async function runC7Storyboard(
  directed: DirectedEpisode,
  lang: Language = 'fr',
): Promise<VisualStoryboard> {
  const systemPrompt = buildC7SystemPrompt();
  const userPrompt = buildC7UserPrompt(directed, lang);

  console.log('  C7 Sonnet — direction artistique storyboard...');
  console.log(`  C7 prompt: ${systemPrompt.length + userPrompt.length} chars`);

  const output = await generateStructuredJSON<{
    slots: VisualSlot[];
    midjourneyPrompts: Array<{ segId: string; type: string; prompt: string; variant?: string }>;
    stockPhotoNeeds: Array<{ segId: string; keywords: string; subject: string }>;
  }>(
    systemPrompt,
    userPrompt,
    { role: 'balanced', maxTokens: 16384 },
  );

  // Normalize slots — ensure sequential numbering
  const slots = (output.slots ?? []).map((s, i) => ({ ...s, slot: i + 1 }));

  // Count by source
  const counts = { remotionChart: 0, remotionText: 0, remotionData: 0, remotionLower: 0, midjourney: 0, stock: 0 };
  for (const s of slots) {
    if (s.source === 'REMOTION_CHART') counts.remotionChart++;
    else if (s.source === 'REMOTION_TEXT') counts.remotionText++;
    else if (s.source === 'REMOTION_DATA') counts.remotionData++;
    else if (s.source === 'REMOTION_LOWER') counts.remotionLower++;
    else if (s.source === 'MIDJOURNEY') counts.midjourney++;
    else if (s.source === 'STOCK') counts.stock++;
  }

  const totalDurationSec = directed.script.metadata?.totalDurationSec ?? 400;

  return {
    date: directed.script.date,
    episodeTitle: directed.script.title,
    moodMusic: directed.moodMusic,
    totalSlots: slots.length,
    totalDurationSec,
    slots,
    summary: counts,
    midjourneyPrompts: output.midjourneyPrompts ?? [],
    stockPhotoNeeds: output.stockPhotoNeeds ?? [],
  };
}
