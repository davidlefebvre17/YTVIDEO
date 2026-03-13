import { generateStructuredJSON } from "../llm-client";
import type {
  EditorialPlan, AnalysisBundle, DraftScript, WordBudget, ValidationIssue,
} from "./types";
import type { Language } from "@yt-maker/core";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

function buildC3SystemPrompt(lang: Language, knowledgeTier1: string): string {
  // French persona for now (lang param for future EN support)
  return `Tu es un analyste de marché indépendant avec 10 ans d'expérience. Tu présentes une émission quotidienne d'analyse de marché sur YouTube.

PERSONA :
- Tu tutoies ton audience
- Tu crées des liens causaux entre les événements, jamais des listes
- Phrases courtes et longues alternées — rythme irrégulier naturel
- Suspense, connecteurs causaux ("et c'est précisément ce qui...", "la raison ? ")
- Ton analytique professionnel — JAMAIS retail ("t'as vu", "c'est dingue", "pépite")

COMPLIANCE AMF/MiFID II (STRICT) :
- Contenu éducatif UNIQUEMENT
- Langage conditionnel obligatoire pour toute projection ("pourrait", "si...", "dans l'hypothèse où")
- JAMAIS de recommandation directe, même déguisée
- Formulations INTERDITES : "vous devez", "il faut acheter/vendre", "c'est le moment de", "on recommande", "achetez", "vendez"
- JAMAIS de disclaimer oral dans la narration — un bandeau visuel s'en charge
- Le closing se termine sur une question CTA, JAMAIS sur un disclaimer

PACING (NON-NÉGOCIABLE) :
- 150 mots par 60 secondes
- Le budget mots est une LIMITE ABSOLUE, pas une cible indicative
- DEEP : ne jamais dépasser 325 mots. FOCUS : ne jamais dépasser 150 mots. FLASH : ne jamais dépasser 75 mots.
- Si un segment dépasse sa limite, COUPER — jamais déborder sur la limite suivante
- Astuce : pour un FLASH (75 mots max), compte tes mots avant de finaliser. 75 mots = ~5-6 phrases courtes.

ÉCRITURE :
- Cold open : max 15 mots, télégraphique, ZÉRO salutation ("Bienvenue", "Bonjour")
- Title card : narration = "" (visuel uniquement)
- Thread : nomme le thème dominant, annonce la cascade, PAS de prix/pourcentages/niveaux
- Segments : chaque fait précis mentionné UNE SEULE FOIS, en détail
- Transitions entre segments : liens thématiques naturels, JAMAIS "Passons maintenant à"
- Si confidenceLevel = speculative → langage plus conditionnel ("on pourrait imaginer", "si l'hypothèse se confirme")
- Si confidenceLevel = high → affirmations directes acceptées
- Closing : 1 phrase retour au fil conducteur + teaser prochain épisode (utilise le jour de semaine exact fourni dans les ancres temporelles) + question d'engagement

VISUAL CUES :
- Pour chaque segment, produis 1-3 visualCues abstraites
- Types disponibles : highlight_asset, show_chart, show_level, direction_arrow, flash, transition, sector_heatmap, macro_stat, comparison

${knowledgeTier1 ? `\nKNOWLEDGE (ton et narration) :\n${knowledgeTier1}` : ''}

SORTIE : JSON strict, schéma DraftScript.`;
}

function buildC3UserPrompt(
  editorial: EditorialPlan,
  analysis: AnalysisBundle,
  budget: WordBudget,
  recentScripts: string,
  feedback?: ValidationIssue[],
): string {
  let prompt = '';

  // Temporal anchors — injected first so LLM anchors all temporal refs
  const anchors = buildTemporalAnchors(editorial.date);
  prompt += `${anchors.block}\n\n`;

  // Editorial plan
  prompt += `## PLAN ÉDITORIAL\n`;
  prompt += `Thème dominant: ${editorial.dominantTheme}\n`;
  prompt += `Fil conducteur: "${editorial.threadSummary}"\n`;
  prompt += `Mood: ${editorial.moodMarche}\n`;
  prompt += `Cold open: "${editorial.coldOpenFact}"\n`;
  prompt += `Closing teaser: "${editorial.closingTeaser}"\n\n`;

  // Analysis per segment
  prompt += `## ANALYSE PAR SEGMENT\n`;
  for (const seg of analysis.segments) {
    const planSeg = editorial.segments.find(s => s.id === seg.segmentId);
    prompt += `### ${seg.segmentId} [${planSeg?.depth ?? '?'}] — ${planSeg?.topic ?? '?'}\n`;
    prompt += `Assets: ${planSeg?.assets.join(', ') ?? '?'}\n`;
    prompt += `Angle: ${planSeg?.angle ?? '?'}\n`;
    prompt += `Faits clés: ${seg.keyFacts.join(' | ')}\n`;
    prompt += `Technique: ${seg.technicalReading}\n`;
    prompt += `Fondamental: ${seg.fundamentalContext}\n`;
    if (seg.causalChain) prompt += `Chaîne causale: ${seg.causalChain}\n`;
    prompt += `Scénario haussier: ${seg.scenarios.bullish.target} (${seg.scenarios.bullish.condition})\n`;
    prompt += `Scénario baissier: ${seg.scenarios.bearish.target} (${seg.scenarios.bearish.condition})\n`;
    prompt += `Accroche: "${seg.narrativeHook}"\n`;
    prompt += `Risque: ${seg.risk}\n`;
    prompt += `Confiance: ${seg.confidenceLevel}\n`;
    if (planSeg?.continuityFromJ1) prompt += `Continuité J-1: ${planSeg.continuityFromJ1}\n`;
    prompt += '\n';
  }

  // Global context
  prompt += `## CONTEXTE GLOBAL\n`;
  prompt += `Mood marché: ${analysis.globalContext.marketMood}\n`;
  prompt += `Thème dominant: ${analysis.globalContext.dominantTheme}\n`;
  prompt += `Liens inter-segments: ${analysis.globalContext.crossSegmentLinks.join(' | ')}\n`;
  prompt += `Risques clés: ${analysis.globalContext.keyRisks.join(' | ')}\n\n`;

  // Word budget
  prompt += `## BUDGET MOTS (STRICT — tolérance ±15%)\n`;
  prompt += `Cold open (hook): ${budget.hook} mots\n`;
  prompt += `Title card: 0 mots (narration vide)\n`;
  prompt += `Thread: ${budget.thread} mots\n`;
  for (const seg of budget.segments) {
    prompt += `${seg.segmentId} [${seg.depth}]: cible ${seg.targetWords} mots (max ${seg.maxWords})\n`;
  }
  prompt += `Closing: ${budget.closing} mots\n`;
  prompt += `TOTAL CIBLE: ${budget.totalTarget} mots\n\n`;

  // Recent scripts (style reference)
  if (recentScripts) {
    prompt += `## SCRIPTS RÉCENTS (référence de style — NE PAS résumer)\n`;
    prompt += `Utilise pour varier ton style, éviter les mêmes transitions, faire des callbacks naturels.\n\n`;
    prompt += recentScripts + '\n\n';
  }

  // Feedback from C4 (retry case)
  if (feedback?.length) {
    prompt += `## ⚠️ CORRECTIONS DEMANDÉES (C4 validation)\n`;
    for (const issue of feedback) {
      prompt += `- [${issue.severity}] ${issue.type}${issue.segmentId ? ` (${issue.segmentId})` : ''}: ${issue.description}`;
      if (issue.suggestedFix) prompt += ` → Fix: ${issue.suggestedFix}`;
      prompt += '\n';
    }
    prompt += '\n';
  }

  // Output format
  prompt += `## FORMAT DE SORTIE
Retourne un JSON avec cette structure exacte :
{
  "date": "${editorial.date}",
  "title": "Titre épisode (accrocheur, <70 chars)",
  "description": "Description YouTube courte (1-2 phrases)",
  "coldOpen": {
    "type": "hook",
    "title": "Cold Open",
    "narration": "Max 15 mots, télégraphique",
    "durationSec": 8,
    "wordCount": 15,
    "visualCues": []
  },
  "titleCard": {
    "type": "title_card",
    "title": "TradingRecap",
    "narration": "",
    "durationSec": 4,
    "wordCount": 0
  },
  "thread": {
    "type": "thread",
    "title": "Fil conducteur",
    "narration": "Le thème dominant, la cascade annoncée",
    "durationSec": 20,
    "wordCount": 50,
    "visualCues": []
  },
  "segments": [
    {
      "segmentId": "seg_1",
      "type": "segment",
      "title": "Titre du segment",
      "narration": "Texte parlé continu",
      "depth": "DEEP",
      "topic": "slug",
      "assets": ["SYMBOL"],
      "visualCues": [{"type": "show_chart", "asset": "SYMBOL"}],
      "predictions": [{"asset": "SYM", "direction": "bullish", "confidence": "medium", "reasoning": "..."}],
      "transitionTo": "Lien narratif vers le segment suivant",
      "durationSec": 80,
      "wordCount": 200
    }
  ],
  "closing": {
    "type": "closing",
    "title": "Closing",
    "narration": "Retour au fil + teaser + question CTA",
    "durationSec": 25,
    "wordCount": 60,
    "visualCues": []
  },
  "metadata": {
    "totalWordCount": 1300,
    "totalDurationSec": 480,
    "toneProfile": "analytique-accessible",
    "dominantTheme": "slug",
    "threadSummary": "...",
    "moodMarche": "risk-off",
    "coverageTopics": ["slug1", "slug2"],
    "segmentCount": 5
  }
}`;

  return prompt;
}

/**
 * Run C3 Opus — narrative writing.
 */
export async function runC3Writing(input: {
  editorial: EditorialPlan;
  analysis: AnalysisBundle;
  budget: WordBudget;
  recentScripts: string;
  knowledgeTier1: string;
  lang: Language;
  feedback?: ValidationIssue[];
}): Promise<DraftScript> {
  const systemPrompt = buildC3SystemPrompt(input.lang, input.knowledgeTier1);
  const userPrompt = buildC3UserPrompt(
    input.editorial,
    input.analysis,
    input.budget,
    input.recentScripts,
    input.feedback,
  );

  console.log('  P4 C3 Opus — rédaction narrative...');
  console.log(`  C3 prompt: ${systemPrompt.length + userPrompt.length} chars`);

  const draft = await generateStructuredJSON<DraftScript>(
    systemPrompt,
    userPrompt,
    { role: 'quality', maxTokens: 8192 },
  );

  // Post-process: compute actual word counts
  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

  if (draft.coldOpen) draft.coldOpen.wordCount = countWords(draft.coldOpen.narration);
  if (draft.thread) draft.thread.wordCount = countWords(draft.thread.narration);
  if (draft.closing) draft.closing.wordCount = countWords(draft.closing.narration);

  let totalWords = (draft.coldOpen?.wordCount ?? 0) + (draft.thread?.wordCount ?? 0) + (draft.closing?.wordCount ?? 0);

  for (const seg of draft.segments ?? []) {
    seg.wordCount = countWords(seg.narration);
    totalWords += seg.wordCount;
  }

  // Ensure titleCard exists
  if (!draft.titleCard) {
    draft.titleCard = {
      type: 'title_card',
      title: 'TradingRecap',
      narration: '',
      durationSec: 4,
      wordCount: 0,
    };
  }

  // Update metadata
  draft.metadata = draft.metadata ?? {} as DraftScript['metadata'];
  draft.metadata.totalWordCount = totalWords;
  draft.metadata.totalDurationSec = Math.round(totalWords / 2.5) + (draft.titleCard?.durationSec ?? 4);
  draft.metadata.segmentCount = draft.segments?.length ?? 0;
  draft.metadata.dominantTheme = draft.metadata.dominantTheme ?? input.editorial.dominantTheme;
  draft.metadata.threadSummary = draft.metadata.threadSummary ?? input.editorial.threadSummary;
  draft.metadata.moodMarche = draft.metadata.moodMarche ?? input.editorial.moodMarche;
  draft.metadata.coverageTopics = draft.metadata.coverageTopics ?? input.editorial.segments.map(s => s.topic);
  draft.date = input.editorial.date;

  console.log(`  C3 output: ${totalWords} mots, ~${draft.metadata.totalDurationSec}s`);

  return draft;
}
