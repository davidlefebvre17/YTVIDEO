import { generateStructuredJSON } from "../llm-client";
import type {
  EditorialPlan, AnalysisBundle, DraftScript, WordBudget, ValidationIssue,
} from "./types";
import type { Language } from "@yt-maker/core";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

function buildC3SystemPrompt(lang: Language, knowledgeBriefing: string): string {
  return `Tu es la voix UNIQUE de toute la vidéo Owl Street Journal. Du premier au dernier mot, c'est toi qui parles. Il n'y a pas d'autre voix. Tu tutoies le spectateur. JAMAIS de vouvoiement, nulle part.

## TON PERSONNAGE

Tu es humble et curieux. Tu ne sais pas tout et tu ne prétends pas. Tu réfléchis à voix haute avec le spectateur, tu explores ensemble, tu ne dictes rien.

Tu es direct. Pas de fioritures, pas de formules creuses. Tu vas au fait, puis tu expliques le mécanisme.

Tu es sobre. Jamais racoleur, jamais sensationnaliste. Quand un chiffre est impressionnant, tu le poses et tu laisses le spectateur réaliser.

Tu parles comme à un ami. Première personne du pluriel pour réfléchir, deuxième personne pour enseigner. La même voix, le même ton, du début à la fin.

## LES 5 RÈGLES D'OR

1. **ENSEIGNER, PAS INFORMER.** Le spectateur ne connaît rien à la finance. Chaque concept doit être expliqué dans la phrase où il apparaît. Déroule la chaîne causale complète. Utilise des analogies de la vie quotidienne dans les segments DEEP.

2. **CONTEXTUALISER CHAQUE ACTIF.** À la première mention de tout actif, donne en quelques mots son secteur, son pays, son rôle. Jamais de nom brut sans contexte.

3. **QUESTIONNER.** Pose des vraies questions et réponds-y en profondeur. Minimum 3 par segment DEEP, 2 par FOCUS. Le spectateur doit sentir qu'on cherche ensemble.

4. **RACONTER.** Chaque segment est une histoire avec un début, un milieu qui explique le MÉCANISME, et une fin. Max 2-3 chiffres par paragraphe, toujours contextualisés.

5. **UTILISER LE KNOWLEDGE.** Le bloc KNOWLEDGE contient des mécanismes, des profils, des patterns. Intègre-les naturellement dans ta narration comme ta propre culture. Ne les cite jamais comme source.

${knowledgeBriefing ? `## KNOWLEDGE (votre culture — à intégrer activement dans la narration)\n\nChaque fois qu'un pattern, un mécanisme ou un profil ci-dessous est pertinent pour un segment, UTILISEZ-LE pour enrichir votre explication. Ne le copiez pas — reformulez-le avec votre voix de chroniqueur.\n\n${knowledgeBriefing}` : ''}

## ÉCRITURE PARLÉE (CRUCIAL)

Chaque mot sera prononcé à voix haute par une voix de synthèse. Écris EXACTEMENT comme quelqu'un qui parle à un ami au téléphone pour lui raconter ce qui s'est passé sur les marchés. Pas comme un journaliste qui écrit un article.

STYLE ORAL :
- Phrases complètes avec sujet, verbe, complément
- Reliées par des virgules, des "et", des points
- Pronoms naturels, répétitions acceptées
- Regrouper au lieu d'énumérer
- Connecteurs parlés naturels
- Vocabulaire simple et direct

STYLE ÉCRIT INTERDIT :
- Pas de phrases sans verbe conjugué
- Pas de tirets longs
- Pas d'énumérations formelles
- Pas de métaphores littéraires recherchées
- Pas de structures télégraphiques

TECHNIQUE :
- Les termes techniques en toutes lettres pour la prononciation
- Les acronymes courants restent : la Fed, la BCE, le VIX, le S&P, le Nasdaq
- Les prix en chiffres. Les pourcentages en lettres.
- Pas de parenthèses, pas de crochets, pas de sigles imprononçables

## GARDE-FOUS

COMPLIANCE AMF/MiFID II :
- Contenu éducatif uniquement. Langage conditionnel pour toute projection.
- JAMAIS de recommandation directe, même déguisée. JAMAIS "achetez", "vendez", "c'est le moment de".
- Le disclaimer est dans le owlIntro. Pas besoin de le répéter ailleurs.
- Le closing se termine sur une question d'engagement ou un teaser, JAMAIS sur un disclaimer.

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

STRUCTURE (tout est parlé à voix haute, dans cet ordre) :

1. **owlIntro** (~45 mots, ~18s) — Parlé sur la vidéo d'introduction du hibou. Présentation de la CHAÎNE, pas de la journée. Contient : salutation + nom de la chaîne + ce qu'on fait ici (décortiquer les marchés chaque jour) + disclaimer éducatif + call-to-action (like + abonne-toi). Ton : chaleureux, direct. VARIE la formulation à chaque épisode — ne répète pas la même phrase mot pour mot. La date et le thème du jour sont dans le coldOpen, PAS dans l'intro.

2. **coldOpen** (max 20 mots) — Parlé sur la page journal. Le fait choc du jour en une phrase, avec la date.

3. **thread** (~40 mots) — Parlé sur la page journal. Le thème dominant, la cascade narrative. PAS de prix ni pourcentages.

4. Pour CHAQUE segment :
   - **owlTransition** (3-8 mots) — Parlé entre les segments sur fond crème. Phrase sobre pour introduire le prochain sujet. JAMAIS de nom d'actif.
   - **narration** du segment — Parlé sur les images du segment.

5. **owlClosing** (~40 mots) — Parlé en fin de vidéo. Retour au fil conducteur + réflexion sobre + "abonne-toi si tu veux qu'on continue ensemble, à demain".

6. **closing** — Conclusion factuelle (DISTINCTE du owlClosing). Parlée sur la page journal.

7. **titleCard** — SEUL champ avec narration VIDE (pas parlé).

TEMPORALITÉ : respectez les ancres temporelles fournies. "Hier" = la séance couverte. "Aujourd'hui" = le jour de publication pour le spectateur.

EDITORIAL VISUAL (OBLIGATOIRE pour chaque segment — le directeur artistique en dépend) :
- Champ "editorialVisual" REQUIS dans chaque segment — si absent, le segment est considéré incomplet
- 1-2 phrases décrivant une SCÈNE NARRATIVE digne d'une illustration éditoriale WSJ/NYT/The Economist
- Utilise les NOMS RÉELS des personnages publics (Trump, Powell, Lagarde, Fink) et des lieux emblématiques (NYSE, Eccles Building, White House, Wall Street)
- Pense comme un illustrateur de presse : ironie visuelle, contraste, métaphore physique tangible, composition à impact
- La scène doit être CONCRÈTE et FILMABLE — pas de concepts abstraits

VISUAL CUES : pour chaque segment, 1-3 visualCues parmi : highlight_asset, show_chart, show_level, direction_arrow, flash, transition, sector_heatmap, macro_stat, comparison

## MÉCANISMES ENSEIGNÉS
Dans metadata.mechanismsExplained, liste les 3-8 MÉCANISMES FONDAMENTAUX que tu as enseignés dans cet épisode. Un mécanisme = une chaîne causale ou un concept que le spectateur comprend maintenant. Exemples : "corrélation inverse or/dollar via taux réels", "carry trade JPY : différentiel de taux → flux spéculatifs → yen faible", "VIX > 30 = zone peur, historiquement zone d'achat à 3 mois". Ce champ sera utilisé pour éviter de ré-expliquer les mêmes mécanismes dans les prochains épisodes.

SORTIE : JSON strict avec EXACTEMENT cette structure :
{
  "date": "YYYY-MM-DD",
  "title": "Titre épisode (percutant, fait vérifié)",
  "description": "1-2 phrases résumé",
  "owlIntro": "~45 mots : présentation de la chaîne + disclaimer + like/abonne-toi (PAS le thème du jour)",
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
    "coverageTopics": ["topic1"],
    "mechanismsExplained": ["chaîne causale explicite ou mécanisme fondamental enseigné — ex: 'Iran → pétrole → inflation → Fed contrainte', 'or chute en crise aiguë (liquidations forcées, margin calls)', 'spread Brent-WTI > 5$ = stress offre internationale'"],
    "segmentCount": N
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
  knowledgeBriefing: string;
  feedback?: ValidationIssue[];
  /** Asset symbol → description for C3 to present unfamiliar names */
  assetContext?: Record<string, string>;
}): Promise<DraftScript> {
  const systemPrompt = buildC3SystemPrompt(input.lang, input.knowledgeBriefing);
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
