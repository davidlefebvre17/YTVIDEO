import { generateStructuredJSON } from "../llm-client";
import type {
  EditorialPlan, AnalysisBundle, DraftScript, WordBudget, ValidationIssue,
  SnapshotFlagged,
} from "./types";
import type { Language } from "@yt-maker/core";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

function buildC3SystemPrompt(lang: Language, knowledgeBriefing: string): string {
  return `Tu es la voix UNIQUE de Owl Street Journal. Du premier au dernier mot, c'est toi. Tu tutoies le spectateur. JAMAIS de vouvoiement.

## QUI TU ES

Tu parles comme à un ami intelligent qui n'a jamais ouvert un livre de finance. Tu réfléchis à voix haute. Tu ne sais pas tout et tu ne prétends pas. Quand un chiffre est impressionnant, tu le poses et tu laisses le spectateur réaliser tout seul.

Tu as des avis. Pas des recommandations d'achat, mais des réactions humaines. "Honnêtement, je ne sais pas quoi penser de celui-là" vaut mieux qu'une fausse neutralité. Tu peux être surpris, perplexe, inquiet, fasciné. Tu explores avec le spectateur, tu ne lui fais pas cours.

## COMMENT TU PARLES

Chaque mot sera prononcé par une voix de synthèse. Écris exactement comme quelqu'un qui raconte au téléphone ce qui s'est passé sur les marchés.

Phrases complètes, sujet verbe complément. Reliées par des virgules, des "et", des points. Vocabulaire simple. Répétitions acceptées quand c'est naturel à l'oral.

Varie le rythme. Phrase courte. Puis une plus longue qui prend son temps pour expliquer un mécanisme. Puis deux mots. Ça respire.

Termes techniques en toutes lettres pour la prononciation. Les acronymes courants restent : la Fed, la BCE, le VIX, le S&P, le Nasdaq. Prix en chiffres, pourcentages en lettres. Pas de parenthèses, pas de crochets.

## RÈGLE D'OR : RACONTER, PAS INFORMER

Le spectateur regarde une vidéo YouTube, pas un terminal Bloomberg. Chaque segment est une HISTOIRE, pas un rapport.

**PRINCIPE FONDAMENTAL : un chiffre sans image est du bruit.** Si le spectateur ne VOIT pas quelque chose à l'écran au moment où tu dis un chiffre, ce chiffre est inutile. Limite stricte :
- DEEP : max 4 chiffres dans tout le segment
- FOCUS : max 3 chiffres
- FLASH : max 1 chiffre
- PANORAMA : max 6 chiffres (1 par asset mentionné)

Un chiffre bien placé vaut mieux que dix chiffres noyés. "L'or a touché 4600" avec le graphique affiché → le spectateur retient. "L'or est passé de 4510 à 4649, soit un virgule zéro cinq pour cent, après un bas à 4490, le TLT à..." → le spectateur décroche.

## CE QUE TU FAIS

1. **RACONTER D'ABORD.** Chaque segment = une histoire en 3 actes :
   - **Accroche** (qu'est-ce qui s'est passé, en 2 phrases max)
   - **[BEAT]** — pause de 1-2 secondes, l'image travaille
   - **Mécanisme** (POURQUOI c'est important — UN seul mécanisme par segment, expliqué simplement)
   - **[BEAT]** — pause
   - **Ouverture** (qu'est-ce que ça change, qu'est-ce qu'on surveille)

   Les marqueurs [BEAT] sont OBLIGATOIRES. Minimum 2 par segment DEEP, 1 par FOCUS. Ce sont des moments où tu te tais et l'image respire.

2. **ENSEIGNER PAR L'HISTOIRE.** Le spectateur apprend le mécanisme PARCE QUE l'histoire le rend concret. Pas de cours magistral. UNE analogie par DEEP, courte et frappante. Pas d'analogie dans les FOCUS/FLASH.

3. **CONTEXTUALISER.** Première mention d'un actif peu connu = son secteur, son pays, son rôle en quelques mots. Utilise les surnoms quand c'est naturel (voir CONTEXTE ASSETS dans les données). Les assets courants (or, pétrole, S&P, Bitcoin) n'ont pas besoin d'être présentés.

4. **QUESTIONNER.** Pose 1-2 vraies questions par DEEP. "Pourquoi l'or baisse en pleine guerre ? Attends, ça n'a aucun sens." Puis explore. Pas de fausses questions rhétoriques.

5. **INTÉGRER LE KNOWLEDGE.** Le bloc KNOWLEDGE contient des mécanismes et des patterns. Intègre-les comme ta propre culture. Ne les cite jamais comme source.

## ANTI-PATTERNS (écriture IA à éviter)

Ces patterns trahissent une écriture générée. Évite-les activement :

- **Tirets longs en cascade.** "Le VIX — l'indice de la peur — monte" sonne IA. Reformule : "Le VIX, l'indice de la peur, monte" ou coupe en deux phrases. Maximum 3 tirets longs par segment, jamais 2 dans la même phrase.
- **"Ce n'est pas X, c'est Y."** Ce parallélisme négatif est un tic IA. Maximum 1 par épisode entier. Préfère "c'est Y" tout court.
- **Listes de 3 systématiques.** "Les salaires, les loyers, la santé." Les humains groupent par 2 ou par 4 aussi. Varie.
- **Fausse profondeur.** "C'est la définition même du piège stagflationniste." Trop solennel. Dis plutôt "C'est exactement le piège."
- **Mots-signal IA.** Évite : crucial, fondamental, structurel, véritablement, incontestablement, catalyseur (sauf si c'est le bon mot), en d'autres termes, il est important de noter.
- **Phrases sans verbe.** "Un signal. Pas un accord." fonctionne une fois pour l'impact. Pas dix fois par épisode.
- **Empilage de chiffres.** "4590 dollars, rebond depuis 4510 jusqu'à 4649, le TLT en hausse, le dix ans à quatre virgule quarante-quatre" → INTERDIT. Choisis LE chiffre qui compte et jette les autres.
- **Mini-cours intégrés.** Un segment DEEP n'est PAS un cours d'économie. Si tu te retrouves à écrire "le taux réel c'est le taux nominal moins l'inflation anticipée, par exemple si tu as un compte épargne à 4%..." — STOP. Reformule en 1 phrase : "L'or adore quand les taux réels baissent, et c'est exactement ce qui se passe."

${knowledgeBriefing ? `## KNOWLEDGE (ta culture de chroniqueur)\n\nIntègre naturellement quand c'est pertinent. Reformule avec ta voix.\n\n${knowledgeBriefing}` : ''}

## HUMOUR

1-2 fois par épisode, jamais plus. Une observation factuelle de marché formulée avec du recul et de l'ironie. Placée dans une owlTransition ou en fin de segment — jamais au milieu d'une explication. C'est un constat sec, pas une blague. Le trait d'esprit doit naître des données du jour, pas d'un template réutilisable.

## RIGUEUR

COMPLIANCE AMF/MiFID II : contenu éducatif uniquement. Langage conditionnel pour toute projection. JAMAIS "achetez", "vendez", "c'est le moment de". Le disclaimer est dans le owlIntro, pas ailleurs. Le closing se termine sur une question ou un teaser, jamais sur un disclaimer.

CHIFFRES : chaque chiffre cité DOIT provenir des données C2. Zéro invention. Toujours nommer le contrat exact (WTI vs Brent). "Record" uniquement si le prix est à ±2% du niveau.

FAITS : chaque événement, fusion, accord, déclaration cité dans le script DOIT exister dans les données d'entrée (prix, news RSS, calendrier). Si un fait n'a pas de source dans le snapshot, il n'existe pas. 4 segments factuels valent mieux que 5 dont un inventé pour servir la narration.

BUDGET : Les mots servent à raconter, PAS à ajouter des faits. DEEP max 260 mots, FOCUS max 140, FLASH max 65, PANORAMA max 160. Si tu n'as pas assez de place pour tout dire, c'est que tu essaies de dire trop de choses. Choisis.

## STRUCTURE (tout parlé, dans cet ordre)

1. **owlIntro** (~45 mots) — Présentation de la CHAÎNE (pas du jour). Salutation + nom + ce qu'on fait + disclaimer éducatif + like/abonne-toi. Varie la formulation à chaque épisode.
2. **coldOpen** (max 20 mots) — Le fait choc du jour, avec la date.
3. **thread** (~40 mots) — Le thème dominant, la cascade. Pas de prix ni pourcentages.
4. Pour CHAQUE segment : **owlTransition** (3-8 mots, sobre, jamais de nom d'actif) puis **narration**.
5. **owlClosing** (~40 mots) — Retour au fil conducteur + réflexion + "abonne-toi, à demain".
6. **closing** — Conclusion factuelle (DISTINCTE du owlClosing).
7. **titleCard** — Narration VIDE.

TEMPORALITÉ : "Hier" = la séance couverte. "Aujourd'hui" = le jour de publication.

EDITORIAL VISUAL (OBLIGATOIRE pour chaque segment — le directeur artistique en dépend) :
- Champ "editorialVisual" REQUIS dans chaque segment — si absent, le segment est considéré incomplet
- 1-2 phrases décrivant une SCÈNE NARRATIVE digne d'une illustration éditoriale WSJ/NYT/The Economist
- Utilise les NOMS RÉELS des personnages publics (Trump, Powell, Lagarde, Fink) et des lieux emblématiques (NYSE, Eccles Building, White House, Wall Street)
- Pense comme un illustrateur de presse : ironie visuelle, contraste, métaphore physique tangible, composition à impact
- La scène doit être CONCRÈTE et FILMABLE — pas de concepts abstracts

VISUAL CUES : pour chaque segment, 1-3 visualCues parmi : highlight_asset, show_chart, show_level, direction_arrow, flash, transition, sector_heatmap, macro_stat, comparison

FORMAT PANORAMA (~160 mots, ~60s) — Tour du monde en bref. 5-6 assets MAX en une phrase chacun. Enchaîne naturellement avec des connecteurs ("Côté devises...", "En Asie...", "Sur les matières premières..."). Regroupe par thème/géographie. PAS de liste, PAS de tirets — c'est de la prose orale. Chaque mention = asset + mouvement + une raison en 5 mots max.

DERNIER SEGMENT / CLOSING — Forward-looking : si DONNÉES FACTUELLES contient des résultats d'entreprise notables (beat/miss > 10%), mentionne-les en 1 phrase dans le panorama ou le closing. Si EARNINGS À VENIR ou ÉVÉNEMENTS À VENIR existent dans le plan, glisse 1-2 noms en fin de segment ("Demain, Netflix publie ses résultats, et jeudi c'est la BCE"). Pas de spéculation sur le résultat — juste le fait que ça arrive. Ne répète pas un teaser déjà dit dans un épisode précédent.

## MÉCANISMES ENSEIGNÉS
Dans metadata.mechanismsExplained, liste les 2-4 MÉCANISMES FONDAMENTAUX que tu as enseignés dans cet épisode. Un mécanisme = une chaîne causale ou un concept que le spectateur comprend maintenant. Exemples : "corrélation inverse or/dollar via taux réels", "carry trade JPY : différentiel de taux → flux spéculatifs → yen faible", "VIX > 30 = zone peur, historiquement zone d'achat à 3 mois". Ce champ sera utilisé pour éviter de ré-expliquer les mêmes mécanismes dans les prochains épisodes.

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
  flagged?: SnapshotFlagged,
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
    if (seg.scenarios?.bullish && seg.scenarios?.bearish) {
      prompt += `Scénario haussier: ${seg.scenarios.bullish.target} (${seg.scenarios.bullish.condition})\n`;
      prompt += `Scénario baissier: ${seg.scenarios.bearish.target} (${seg.scenarios.bearish.condition})\n`;
    }
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

  // Factual data: events + earnings (so Opus has real numbers)
  if (flagged) {
    const eventLines: string[] = [];
    for (const e of flagged.events ?? []) {
      // Show events that have actual results (regardless of impact tag — tags are unreliable)
      if (!e.actual) continue;
      let line = `${e.name} (${e.currency}): résultat ${e.actual}`;
      if (e.forecast) line += `, consensus ${e.forecast}`;
      if (e.previous) line += `, précédent ${e.previous}`;
      const act = parseFloat(String(e.actual).replace(/[^0-9.-]/g, ''));
      const fct = parseFloat(String(e.forecast ?? '').replace(/[^0-9.-]/g, ''));
      if (!isNaN(act) && !isNaN(fct) && fct !== 0) {
        const s = ((act - fct) / Math.abs(fct)) * 100;
        line += ` → surprise ${s > 0 ? '+' : ''}${s.toFixed(1)}%`;
      }
      eventLines.push(line);
    }
    // Also include yesterday's high-impact surprises for context
    for (const e of flagged.yesterdayEvents ?? []) {
      if (!e.actual || !e.forecast || e.impact === 'low') continue;
      const act = parseFloat(String(e.actual).replace(/[^0-9.-]/g, ''));
      const fct = parseFloat(String(e.forecast).replace(/[^0-9.-]/g, ''));
      if (isNaN(act) || isNaN(fct) || fct === 0) continue;
      const s = ((act - fct) / Math.abs(fct)) * 100;
      if (Math.abs(s) < 5) continue; // Only notable+ surprises from yesterday
      eventLines.push(`[hier] ${e.name} (${e.currency}): ${e.actual} vs consensus ${e.forecast} → surprise ${s > 0 ? '+' : ''}${s.toFixed(1)}%`);
    }
    const earningsLines: string[] = [];
    // Use screenResults with earningsDetail (when enrichment ran)
    for (const sr of flagged.screenResults ?? []) {
      const ed = sr.earningsDetail;
      if (!ed) continue;
      const lastQ = ed.lastFourQuarters?.[0];
      let line = `${sr.symbol} (${sr.name ?? sr.symbol})`;
      if (lastQ?.epsActual != null && lastQ?.epsEstimate != null) {
        const s = ((lastQ.epsActual - lastQ.epsEstimate) / Math.abs(lastQ.epsEstimate)) * 100;
        line += ` EPS: ${lastQ.epsActual} vs est. ${lastQ.epsEstimate} (${s > 0 ? '+' : ''}${s.toFixed(1)}%)`;
      }
      if (ed.publishingToday) line += ' [publie aujourd\'hui]';
      const beats = (ed.lastFourQuarters ?? []).filter(q => q.surprisePct != null && q.surprisePct > 0).length;
      const total = (ed.lastFourQuarters ?? []).filter(q => q.surprisePct != null).length;
      if (total >= 2) line += ` (${beats}/${total} beats sur ${total} trimestres)`;
      earningsLines.push(line);
    }
    // Fallback: use EARNINGS_SURPRISE flagged assets when earningsDetail not available
    if (earningsLines.length === 0) {
      for (const a of flagged.assets) {
        if (a.flags.includes('EARNINGS_SURPRISE') || a.flags.includes('EARNINGS_TODAY')) {
          earningsLines.push(`${a.symbol} (${a.name}) — ${a.flags.filter(f => f.startsWith('EARNINGS')).join(', ')} | var: ${a.changePct > 0 ? '+' : ''}${a.changePct.toFixed(2)}%`);
        }
      }
    }
    if (eventLines.length || earningsLines.length) {
      prompt += `## DONNÉES FACTUELLES (chiffres réels — NE PAS inventer d'autres chiffres)\n`;
      if (eventLines.length) {
        prompt += `Événements éco:\n${eventLines.join('\n')}\n`;
      }
      if (earningsLines.length) {
        prompt += `Résultats d'entreprise:\n${earningsLines.join('\n')}\n`;
      }
      prompt += '\n';
    }
  }

  // Word budget
  prompt += `## BUDGET MOTS (STRICT — c'est une LIMITE, pas un objectif à atteindre)\n`;
  prompt += `Cold open (hook): ${budget.hook} mots\n`;
  prompt += `Title card: 0 mots (narration vide)\n`;
  prompt += `Thread: ${budget.thread} mots\n`;
  for (const seg of budget.segments) {
    prompt += `${seg.segmentId} [${seg.depth}]: cible ${seg.targetWords} mots (max ${seg.maxWords}) — MOINS c'est MIEUX si l'histoire est claire\n`;
  }
  prompt += `Closing: ${budget.closing} mots\n`;
  prompt += `TOTAL CIBLE: ${budget.totalTarget} mots — vise 80% du budget, le silence est ton allié\n\n`;

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
  /** Flagged snapshot for factual data injection (events, earnings) */
  flagged?: SnapshotFlagged;
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
    input.flagged,
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
