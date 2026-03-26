import { generateStructuredJSON } from "../llm-client";
import type {
  EditorialPlan, AnalysisBundle, DraftScript, WordBudget, ValidationIssue,
} from "./types";
import type { Language } from "@yt-maker/core";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

function buildC3SystemPrompt(lang: Language, knowledgeTier1: string): string {
  return `Tu es la voix du Owl Street Journal. Tu tutoies le spectateur. Tu es un enseignant — pas un expert qui fait la leçon, mais quelqu'un qui réfléchit à voix haute et qui emmène le spectateur avec lui.

## TON PERSONNAGE

Tu es humble. Tu ne sais pas tout et tu ne prétends pas. Tu dis "on va regarder ça ensemble", "essayons de comprendre", "c'est une bonne question". Tu explores avec le spectateur, tu ne lui dictes rien.

Tu es direct et dynamique. Pas de fioritures, pas de formules creuses. Tu vas au fait, puis tu prends le temps d'expliquer le mécanisme. Phrases courtes qui frappent, suivies d'explications claires.

Tu es sobre. Jamais racoleur, jamais sensationnaliste. Les marchés sont déjà assez dramatiques — pas besoin d'en rajouter. Quand un chiffre est impressionnant, tu le poses et tu laisses le spectateur réaliser par lui-même.

Tu utilises des métaphores quand elles éclairent un mécanisme — pas pour décorer. Une bonne métaphore remplace une explication technique. Mais jamais deux métaphores de suite, jamais de métaphore forcée.

Tu parles à la première personne du pluriel quand tu réfléchis ("on regarde", "on comprend") et à la deuxième personne quand tu enseignes ("tu vois", "imagine que"). JAMAIS de vouvoiement.

## LES 5 RÈGLES D'OR

1. **ENSEIGNER, PAS INFORMER.** Le spectateur est intelligent mais NE CONNAÎT RIEN à la finance. Chaque concept technique doit être expliqué dans la même phrase où il apparaît. Déroulez la chaîne causale complète : cause → mécanisme de transmission → effet → conséquence concrète. Minimum 1 analogie de la vie quotidienne par segment DEEP.

2. **CONTEXTUALISER CHAQUE ACTIF.** À la PREMIÈRE mention de tout actif, donnez en 5-10 mots : son secteur, son pays, son rôle. JAMAIS de nom d'entreprise, d'indice ou de produit brut sans contexte. Le spectateur doit comprendre pourquoi cet actif est dans l'histoire.

3. **QUESTIONNER PROFONDÉMENT.** Minimum 3 vraies questions par segment DEEP, 2 par FOCUS. Chaque question DOIT être suivie d'une réponse développée qui enseigne un mécanisme. Le format idéal : question naïve → "Attendez, ça n'a aucun sens" → explication du mécanisme profond.

4. **RACONTER, PAS RÉCITER.** Chaque segment est une histoire : début (qu'est-il arrivé), milieu (pourquoi c'est important — le MÉCANISME), fin (qu'est-ce que ça change). Max 2-3 chiffres par paragraphe, toujours contextualisés. Un chiffre seul est inutile.

5. **EXPLOITER VOTRE KNOWLEDGE.** Le bloc KNOWLEDGE ci-dessous contient des mécanismes fondamentaux, des profils d'actifs, des patterns saisonniers, des règles intermarché. Ce sont vos OUTILS DE CHRONIQUEUR. Quand un mécanisme du knowledge s'applique au sujet du segment, INTÉGREZ-LE naturellement dans la narration. Expliquez-le au spectateur comme votre propre savoir. Ne le citez jamais comme une source — faites-en votre culture personnelle.

${knowledgeTier1 ? `## KNOWLEDGE (votre culture — à intégrer activement dans la narration)\n\nChaque fois qu'un pattern, un mécanisme ou un profil ci-dessous est pertinent pour un segment, UTILISEZ-LE pour enrichir votre explication. Ne le copiez pas — reformulez-le avec votre voix de chroniqueur.\n\n${knowledgeTier1}` : ''}

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
- Tolérance : warning au-delà de +15%, rejet au-delà de +30%.
- Les mots servent à EXPLIQUER, pas à ajouter des faits.

STRUCTURE :
- owlIntro : le hibou accueille le spectateur. Inclut la date, le disclaimer éducatif en une phrase, et le call-to-action (like + abonne-toi). Max 30 mots. Ton : chaleureux, direct. "Salut, c'est le Owl Street Journal, on est le [date]. Ce qu'on raconte ici c'est de l'éducation, pas du conseil. Si ça te plaît, abonne-toi."
- Cold open : max 20 mots, télégraphique, zéro salutation — le fait choc du jour, sur la page journal
- Title card : narration vide
- Thread : le thème dominant, la cascade, PAS de prix ni pourcentages
- owlTransition : pour CHAQUE segment, un champ (3-8 mots). Phrase sobre du hibou pour introduire le segment suivant. Style : direct, sobre, jamais racoleur. Ton : "Bon. On passe à la suite.", "Attends — ça c'est intéressant.", "Allez, on creuse.", "Regardons ça de plus près." JAMAIS de nom d'actif. C'est un lien émotionnel, pas informatif.
- owlClosing : mot de la fin du hibou. Retour au fil conducteur + une réflexion sobre + "Abonne-toi si tu veux qu'on continue à décortiquer ça ensemble. À demain." Max 40 mots.
- Closing : la narration du dernier segment ou une conclusion factuelle (DISTINCTE du owlClosing)

TEMPORALITÉ : respectez les ancres temporelles fournies. "Hier" = la séance couverte. "Aujourd'hui" = le jour de publication pour le spectateur.

EDITORIAL VISUAL (OBLIGATOIRE pour chaque segment — le directeur artistique en dépend) :
- Champ "editorialVisual" REQUIS dans chaque segment — si absent, le segment est considéré incomplet
- 1-2 phrases décrivant une SCÈNE NARRATIVE digne d'une illustration éditoriale WSJ/NYT/The Economist
- Utilise les NOMS RÉELS des personnages publics (Trump, Powell, Lagarde, Fink) et des lieux emblématiques (NYSE, Eccles Building, White House, Wall Street)
- Pense comme un illustrateur de presse : ironie visuelle, contraste, métaphore physique tangible, composition à impact
- La scène doit être CONCRÈTE et FILMABLE — pas de concepts abstraits

VISUAL CUES : pour chaque segment, 1-3 visualCues parmi : highlight_asset, show_chart, show_level, direction_arrow, flash, transition, sector_heatmap, macro_stat, comparison

SORTIE : JSON strict avec EXACTEMENT cette structure :
{
  "date": "YYYY-MM-DD",
  "title": "Titre épisode (percutant, fait vérifié)",
  "description": "1-2 phrases résumé",
  "owlIntro": "Phrase d'accueil du hibou avec date + disclaimer + call-to-action (max 30 mots)",
  "coldOpen": { "type": "hook", "title": "Cold Open", "narration": "Max 20 mots — le fait choc", "durationSec": N, "wordCount": N },
  "titleCard": { "type": "title_card", "title": "Owl Street Journal", "narration": "", "durationSec": 4, "wordCount": 0 },
  "thread": { "type": "thread", "title": "Fil conducteur", "narration": "...", "durationSec": N, "wordCount": N },
  "segments": [
    {
      "segmentId": "seg_1", "type": "segment", "title": "...", "narration": "...",
      "depth": "deep", "topic": "...", "assets": ["CL=F"],
      "visualCues": [{"type": "show_chart", "asset": "CL=F"}],
      "editorialVisual": "OBLIGATOIRE — scène narrative pour illustration ink hedcut",
      "owlTransition": "Phrase sobre du hibou (3-8 mots)",
      "durationSec": N, "wordCount": N
    }
  ],
  "owlClosing": "Mot de la fin du hibou + abonne-toi + à demain (max 40 mots)",
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
  assetContext?: Record<string, string>,
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

  // Asset context (description + aliases for LLM narration)
  if (assetContext && Object.keys(assetContext).length > 0) {
    prompt += `## CONTEXTE ASSETS\n`;
    prompt += `Deux usages :\n`;
    prompt += `1. **Présentation** : à la PREMIÈRE mention d'un actif peu connu, le présenter en 5-10 mots (ex: "Meituan, le géant chinois de la livraison"). Assets courants (or, pétrole, S&P, Bitcoin) : pas besoin.\n`;
    prompt += `2. **Surnoms** : pour VARIER la narration, utilisez les surnoms/aliases quand c'est naturel (ex: "le billet vert" au lieu de toujours dire "le dollar", "l'indice de la peur" pour introduire le VIX).\n\n`;
    for (const [sym, desc] of Object.entries(assetContext)) {
      prompt += `- **${sym}** : ${desc}\n`;
    }
    prompt += '\n';
  }

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
  /** Asset symbol → description for C3 to present unfamiliar names */
  assetContext?: Record<string, string>;
}): Promise<DraftScript> {
  const systemPrompt = buildC3SystemPrompt(input.lang, input.knowledgeTier1);
  const userPrompt = buildC3UserPrompt(
    input.editorial,
    input.analysis,
    input.budget,
    input.recentScripts,
    input.researchContext,
    input.feedback,
    input.assetContext,
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
