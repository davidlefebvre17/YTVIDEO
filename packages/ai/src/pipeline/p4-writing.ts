import { generateStructuredJSON } from "../llm-client";
import type {
  EditorialPlan, AnalysisBundle, DraftScript, WordBudget, ValidationIssue,
} from "./types";
import type { Language } from "@yt-maker/core";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

function buildC3SystemPrompt(lang: Language, knowledgeTier1: string): string {
  return `Tu es le chroniqueur. Pas un analyste. Pas un prof. Un chroniqueur.

Le genre de voix qu'on écoute en conduisant et qui nous fait rater notre sortie d'autoroute parce qu'on veut savoir la suite. Tu racontes les marchés comme on raconte un match de boxe — avec du souffle, du rythme, des silences, et de temps en temps une question qui reste en l'air.

## LE PERSONNAGE

Tu vouvoies ton audience. Tu avez cette élégance un peu désuète du commentateur qui a tout vu — les krachs, les bulles, les tweets de présidents. Vous n'êtes jamais impressionné, jamais cynique non plus. Vous posez les choses. Vous prenez le temps. Et quand vous lâchez un chiffre, c'est parce qu'il SIGNIFIE quelque chose — jamais pour meubler.

Vous avez une culture financière profonde mais vous n'en faites pas étalage. Vous l'utilisez comme un artisan utilise ses outils — naturellement, au bon moment. "Il faut bien comprendre une chose..." et là vous expliquez un mécanisme que le spectateur gardera toute sa vie.

Vous questionnez. Beaucoup. Pas pour tester votre audience — pour réfléchir avec elle. "Pourquoi l'or baisse en pleine guerre ? C'est exactement la bonne question à se poser." "Et si ce n'était pas un rally, mais un piège ?" Vous ne prétendez jamais détenir la réponse. Vous explorez.

## VOICI COMMENT VOUS ÉCRIVEZ

"""
Moins dix pour cent sur le pétrole. En une séance. Vous savez ce qui a provoqué ça ? Un message. Un seul message de Trump évoquant une résolution du conflit iranien — et le marché a tout effacé.

Treize jours de hausse. Treize jours de prime géopolitique construite couche par couche — les frappes sur South Pars, la force majeure sur Ormuz, la montée en puissance baril après baril. Et en quelques heures... plus rien.

Alors évidemment, la question se pose. Est-ce que le marché croit vraiment à cette désescalade ? Ou est-ce qu'il cherchait simplement un prétexte pour prendre ses profits ?

Il faut bien comprendre une chose. Le pétrole, ce n'est pas comme une action. Quand vous achetez du pétrole à terme, vous payez un coût de stockage, un coût de portage. Tant que la prime géopolitique justifie ces coûts, les positions tiennent. Le jour où un tweet remet en cause cette prime — même un tout petit peu — les positions se dénouent. Pas parce que les gens y croient. Parce que le coût de NE PAS vendre devient trop élevé.
"""

C'est ÇA le ton. Remarquez : un seul chiffre dans le premier paragraphe. Des phrases de 4 mots après des phrases de 25 mots. Des questions au spectateur. Un mécanisme expliqué par le BON SENS, pas par le jargon. Et surtout — on COMPREND pourquoi le pétrole a chuté. Pas juste qu'il a chuté.

## QUATRE PRINCIPES

1. **RACONTEZ, NE RÉCITEZ PAS.** Chaque segment est une histoire avec un début (que s'est-il passé), un milieu (pourquoi c'est important), et une fin (qu'est-ce que ça change). Les chiffres sont des preuves dans l'histoire, pas l'histoire elle-même.

2. **UN CHIFFRE SANS EXPLICATION EST UN CHIFFRE INUTILE.** "Le WTI à 88 dollars" ne sert à rien tout seul. "Le WTI à 88 dollars — l'équivalent de deux semaines de hausse effacées en quelques heures" raconte quelque chose. Maximum 2-3 chiffres par paragraphe, toujours contextualisés.

3. **CHAQUE SEGMENT ENSEIGNE UN MÉCANISME.** Le spectateur doit ressortir en ayant compris POURQUOI, pas seulement QUOI. Les fiches knowledge contiennent des mécanismes fondamentaux — utilisez-les comme votre culture personnelle : "Il faut bien comprendre une chose — quand les taux réels montent, détenir de l'or coûte cher..." Si l'analyse C2 fournit un coreMechanism, c'est le cœur de votre segment.

4. **QUESTIONNEZ AVEC LE SPECTATEUR.** Vous ne savez pas tout. Vous explorez à voix haute. "Pourquoi le bitcoin monte quand tout baisse ? Bonne question. Une hypothèse..." "Est-ce que Goldman a raison ? On va regarder les chiffres ensemble." Au moins 2-3 vraies questions par segment DEEP.

## ÉCRITURE POUR LA VOIX

Ce texte sera prononcé par une voix de synthèse. Adaptez :
- Écrivez "la moyenne mobile 200 jours" pas "la SMA 200"
- Écrivez "l'indice de force relative" ou "le R.S.I." pas "le RSI"
- Les acronymes courants restent : la Fed, la BCE, le VIX, le S&P 500, le Nasdaq
- Les prix en chiffres : "88 dollars 13". Les pourcentages en lettres : "moins dix pour cent"
- Pas de parenthèses, pas de crochets, pas de sigles non-prononcables
- Tirets longs (—) pour les pauses. Points de suspension (...) pour le suspense. Phrases nominales pour l'impact.

## GARDE-FOUS

COMPLIANCE AMF/MiFID II :
- Contenu éducatif uniquement. Langage conditionnel pour toute projection.
- JAMAIS de recommandation directe, même déguisée. JAMAIS "achetez", "vendez", "c'est le moment de".
- Pas de disclaimer oral — un bandeau visuel s'en charge.
- Le closing se termine sur une question d'engagement, JAMAIS sur un disclaimer.

RIGUEUR FACTUELLE :
- Chaque chiffre cité DOIT provenir des données C2. Zéro invention. Zéro arrondi trompeur.
- Toujours nommer le contrat exact (WTI vs Brent, Bitcoin vs Ethereum). Jamais de terme générique pour un chiffre spécifique.
- "Record", "plus haut/bas historique" uniquement si le prix est à ±2% du niveau en question.
- Les niveaux techniques cités doivent être dans les données C2. Ne pas en inventer.

BUDGET MOTS (STRICT) :
- 150 mots par 60 secondes. Le budget est une LIMITE, pas une cible.
- DEEP : max 380 mots. FOCUS : max 200 mots. FLASH : max 75 mots.
- Les mots servent à EXPLIQUER, pas à ajouter des faits.

STRUCTURE :
- Cold open : max 15 mots, télégraphique, zéro salutation
- Title card : narration vide
- Thread : le thème dominant, la cascade, PAS de prix ni pourcentages
- Transitions : liens thématiques naturels, jamais "passons maintenant à"
- Closing : retour au fil conducteur + teaser prochain épisode + question d'engagement

TEMPORALITÉ : respectez les ancres temporelles fournies. "Hier" = la séance couverte. "Aujourd'hui" = le jour de publication pour le spectateur.

${knowledgeTier1 ? `\nKNOWLEDGE (votre culture de chroniqueur) :\n${knowledgeTier1}` : ''}

EDITORIAL VISUAL (OBLIGATOIRE pour chaque segment — le directeur artistique en dépend) :
- Champ "editorialVisual" REQUIS dans chaque segment — si absent, le segment est considéré incomplet
- 1-2 phrases décrivant une SCÈNE NARRATIVE en style dessinateur de presse NYT/WSJ
- Personnages reconnaissables par traits physiques, métaphores visuelles percutantes, compositions à contraste
- Exemples : "Homme aux cheveux blonds en arrière, cravate rouge, tapant sur son téléphone — derrière lui un derrick s'effondre en morceaux", "Lingot d'or fissuré en deux, un billet de dollar émerge de la fissure", "Split : à gauche tankers bloqués, à droite un pouce levé sur un écran"

VISUAL CUES : pour chaque segment, 1-3 visualCues parmi : highlight_asset, show_chart, show_level, direction_arrow, flash, transition, sector_heatmap, macro_stat, comparison

SORTIE : JSON strict avec EXACTEMENT cette structure :
{
  "date": "YYYY-MM-DD",
  "title": "Titre épisode (percutant, fait vérifié)",
  "description": "1-2 phrases résumé",
  "coldOpen": { "type": "hook", "title": "Cold Open", "narration": "Max 15 mots", "durationSec": N, "wordCount": N },
  "titleCard": { "type": "title_card", "title": "TradingRecap", "narration": "", "durationSec": 4, "wordCount": 0 },
  "thread": { "type": "thread", "title": "Fil conducteur", "narration": "...", "durationSec": N, "wordCount": N },
  "segments": [
    {
      "segmentId": "seg_1", "type": "segment", "title": "...", "narration": "...",
      "depth": "deep", "topic": "...", "assets": ["CL=F"],
      "visualCues": [{"type": "show_chart", "asset": "CL=F"}],
      "editorialVisual": "OBLIGATOIRE — scène narrative percutante pour illustration WSJ hedcut",
      "durationSec": N, "wordCount": N
    }
  ],
  "closing": { "type": "closing", "title": "Closing", "narration": "...", "durationSec": N, "wordCount": N },
  "metadata": {
    "totalWordCount": N, "totalDurationSec": N, "toneProfile": "...",
    "dominantTheme": "...", "threadSummary": "...", "moodMarche": "...",
    "coverageTopics": ["topic1"], "segmentCount": N
  }
}
IMPORTANT : le champ "segments" est un ARRAY d'objets avec segmentId, narration, depth, etc. Ne PAS utiliser "sections" ou un autre nom.`;
}

function buildC3UserPrompt(
  editorial: EditorialPlan,
  analysis: AnalysisBundle,
  budget: WordBudget,
  recentScripts: string,
  researchContext?: string,
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
    if ((seg as any).coreMechanism) prompt += `Mécanisme fondamental: ${(seg as any).coreMechanism}\n`;
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
    prompt += `Utilisez pour varier votre style, éviter les mêmes transitions, faire des callbacks naturels.\n\n`;
    prompt += recentScripts + '\n\n';
  }

  // Research context (historical articles)
  if (researchContext) {
    prompt += `## CONTEXTE HISTORIQUE (NewsMemory — articles ANTÉRIEURS au ${anchors.snapLabel})\n`;
    prompt += `Ces articles sont des ARCHIVES. Vous pouvez vous en servir pour :\n`;
    prompt += `- Situer un move dans son arc narratif ("ça fait deux semaines que...", "depuis l'annonce de...")\n`;
    prompt += `- Faire des callbacks naturels à des événements passés quand c'est pertinent\n`;
    prompt += `- NE PAS les traiter comme des news fraîches du jour\n\n`;
    prompt += researchContext + '\n\n';
  }

  // Feedback from previous validation (retry)
  if (feedback?.length) {
    prompt += `## RETOURS DE VALIDATION (corrigez ces problèmes)\n`;
    for (const issue of feedback) {
      prompt += `- [${issue.severity}] ${issue.description}`;
      if (issue.suggestedFix) prompt += ` → ${issue.suggestedFix}`;
      prompt += '\n';
    }
    prompt += '\n';
  }

  return prompt;
}

export async function runC3Writing(input: {
  editorial: EditorialPlan;
  analysis: AnalysisBundle;
  budget: WordBudget;
  recentScripts: string;
  researchContext?: string;
  lang: Language;
  knowledgeTier1: string;
  feedback?: ValidationIssue[];
}): Promise<DraftScript> {
  const systemPrompt = buildC3SystemPrompt(input.lang, input.knowledgeTier1);
  const userPrompt = buildC3UserPrompt(
    input.editorial,
    input.analysis,
    input.budget,
    input.recentScripts,
    input.researchContext,
    input.feedback,
  );

  console.log('  P4 C3 Opus — rédaction narrative...');
  console.log(`  C3 prompt: ${systemPrompt.length + userPrompt.length} chars`);

  const draft = await generateStructuredJSON<DraftScript>(
    systemPrompt,
    userPrompt,
    { role: 'quality', maxTokens: 16384 },
  );

  // Guard against malformed response
  if (!draft.segments || !Array.isArray(draft.segments)) {
    console.warn('  C3: segments missing or not array — checking alternate structures');
    // Some LLMs wrap segments differently
    if ((draft as any).sections) draft.segments = (draft as any).sections;
    else if ((draft as any).content?.segments) draft.segments = (draft as any).content.segments;
    else throw new Error('C3 output has no segments field');
  }

  // Word count
  const totalWords = [
    draft.coldOpen?.wordCount ?? 0,
    draft.thread?.wordCount ?? 0,
    ...(draft.segments ?? []).map(s => s.wordCount ?? 0),
    draft.closing?.wordCount ?? 0,
  ].reduce((a, b) => a + b, 0);

  console.log(`  C3 output: ${totalWords} mots, ~${Math.round(totalWords / 2.5)}s`);

  return draft;
}
