/**
 * P10 — C10 SEO Sonnet
 *
 * Génère titre + description + chapitres + tags + hashtags YouTube optimisés
 * pour un récap quotidien des marchés en français.
 *
 * Stratégie :
 * - Timestamps des chapitres calculés MÉCANIQUEMENT depuis script.durations (déterministe).
 * - Le LLM ne fournit que les LABELS de chapitres + titre + description + tags + hashtags.
 * - Validation Zod + checks mécaniques (mots interdits, ratio MAJ, année dans titre, etc.)
 * - 1 retry max avec feedback.
 *
 * Source : recherche SEO YouTube finance FR 2025-2026 (Backlinko, VidIQ, TubeBuddy,
 * Bourse Direct/Zonebourse patterns, AMF/MiFID II compliance).
 */
import type { Language } from "@yt-maker/core";
import { generateStructuredJSON } from "../llm-client";
import { zodValidator } from "./schemas";
import { SEOMetadataSchema } from "./schemas";
import type {
  DraftScript,
  EditorialPlan,
  SEOMetadata,
  SEOChapter,
  ArcBeat,
  ThumbnailMoment,
  FlaggedAsset,
} from "./types";

// ─── Mots interdits (compliance + démonétisation YouTube) ────────────

const FORBIDDEN_WORDS = [
  'krach', 'crash', 'effondrement', 'panique', 'imminent', 'catastrophe',
  'urgent', 'arnaque', 'escroquerie', 'garanti', 'devenir riche',
  // Phrases injunctives — pas le mot isolé pour éviter faux positifs ("achetez à 100€")
  'achetez maintenant', 'vendez tout', 'ne ratez pas', 'ne manquez pas',
  '100% sûr', 'sans risque', 'pump and dump',
];

// Mots qui doivent apparaître dans la description pour signaler le disclaimer
const DISCLAIMER_KEYWORDS = ['informatif', 'conseil', 'amf', 'mifid', 'risque'];

// ─── Helpers déterministes ─────────────────────────────────────────────

/**
 * Compute chapter boundary timestamps from a draft script.
 * Maps directly to script blocks: coldOpen, thread, each segment, closing.
 * Title card is merged with whatever follows since it has no narration.
 */
export function computeChapterTimestamps(script: DraftScript): Array<{ time: string; segmentId: string; defaultLabel: string }> {
  const out: Array<{ time: string; segmentId: string; defaultLabel: string }> = [];
  let cursor = 0;

  out.push({ time: secToMMSS(0), segmentId: 'cold_open', defaultLabel: 'Intro' });
  cursor += script.coldOpen.durationSec;

  // Title card (3-5s) is purely visual: skip its own chapter, merge into thread
  cursor += script.titleCard.durationSec;

  out.push({ time: secToMMSS(cursor), segmentId: 'thread', defaultLabel: 'Le fil du jour' });
  cursor += script.thread.durationSec;

  for (const seg of script.segments) {
    out.push({
      time: secToMMSS(cursor),
      segmentId: seg.segmentId,
      defaultLabel: seg.title || seg.topic || seg.segmentId,
    });
    cursor += seg.durationSec;
  }

  out.push({ time: secToMMSS(cursor), segmentId: 'closing', defaultLabel: 'À retenir' });

  return out;
}

function secToMMSS(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Jour de la semaine + date FR : "lundi 28 avril" — pas d'année (kill long-tail SEO) */
function formatDateFR(isoDate: string): { dateShort: string; dayLabel: string; ddmm: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const day = days[date.getUTCDay()];
  const month = months[(m ?? 1) - 1];
  return {
    dateShort: `${d} ${month}`,
    dayLabel: day ?? '',
    ddmm: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
  };
}

// ─── Validation mécanique ─────────────────────────────────────────────

export interface SEOValidationIssue {
  field: 'title' | 'description' | 'chapters' | 'tags' | 'hashtags';
  severity: 'blocker' | 'warning';
  description: string;
}

export function validateSEOMetadata(seo: SEOMetadata): SEOValidationIssue[] {
  const issues: SEOValidationIssue[] = [];

  // ── Title ──────────────────────────────────────────────
  if (seo.title.length < 30) {
    issues.push({ field: 'title', severity: 'warning', description: `title court (${seo.title.length} chars, cible 50-65)` });
  }
  if (seo.title.length > 75) {
    issues.push({ field: 'title', severity: 'blocker', description: `title trop long (${seo.title.length} chars, max 75)` });
  }
  // Pas d'année (tue le SEO long-tail evergreen)
  if (/20\d{2}/.test(seo.title)) {
    issues.push({ field: 'title', severity: 'blocker', description: `année trouvée dans title (interdit, utiliser DD/MM ou jour de semaine)` });
  }
  // Ratio MAJ (hors abréviations connues)
  const titleNoAbbr = seo.title
    .replace(/S&P|CAC|USD|EUR|JPY|GBP|BTC|ETH|RSI|VIX|EUR\/USD|GBP\/USD|USD\/JPY|FOMC|FED|BCE|BOJ|PIB|PBOC|OPEP|US|UE|UK|NYSE|EBIT|EBITDA|ETF|IPO|CEO|CFO/g, '');
  const upperChars = (titleNoAbbr.match(/[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ]/g) || []).length;
  const letterChars = (titleNoAbbr.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letterChars > 0 && upperChars / letterChars > 0.4) {
    issues.push({ field: 'title', severity: 'blocker', description: `trop de MAJUSCULES dans title (${(upperChars/letterChars*100).toFixed(0)}%)` });
  }
  // Émojis (autorisé 0-1, mais on warn dès 1 sur format finance)
  const emojiCount = (seo.title.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (emojiCount > 1) {
    issues.push({ field: 'title', severity: 'blocker', description: `${emojiCount} émojis dans title (max 1)` });
  }
  // Mots interdits
  const titleLower = seo.title.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (titleLower.includes(word)) {
      issues.push({ field: 'title', severity: 'blocker', description: `mot interdit "${word}" dans title` });
    }
  }
  // Pas de point d'exclamation multiples ou en cascade
  if ((seo.title.match(/!/g) || []).length > 1) {
    issues.push({ field: 'title', severity: 'warning', description: `points d'exclamation multiples dans title` });
  }

  // ── Description ────────────────────────────────────────
  const wordCount = seo.description.split(/\s+/).filter(Boolean).length;
  if (wordCount < 150) {
    issues.push({ field: 'description', severity: 'blocker', description: `description trop courte (${wordCount} mots, min 150)` });
  }
  if (wordCount > 700) {
    issues.push({ field: 'description', severity: 'warning', description: `description longue (${wordCount} mots, cible 200-400)` });
  }
  // Disclaimer above-the-fold (300 premiers chars)
  const above = seo.description.slice(0, 350).toLowerCase();
  const hasDisclaimer = DISCLAIMER_KEYWORDS.some(k => above.includes(k));
  if (!hasDisclaimer) {
    issues.push({ field: 'description', severity: 'blocker', description: `disclaimer absent des 350 premiers chars (mots-clés attendus: ${DISCLAIMER_KEYWORDS.join('/')})` });
  }
  // Mots interdits dans description (tolérés en contexte explicatif mais flag warning)
  const descLower = seo.description.toLowerCase();
  for (const word of FORBIDDEN_WORDS.slice(0, 6)) {
    if (descLower.includes(word)) {
      issues.push({ field: 'description', severity: 'warning', description: `mot sensible "${word}" dans description (vérifier contexte)` });
    }
  }

  // ── Chapters ───────────────────────────────────────────
  if (seo.chapters.length < 4) {
    issues.push({ field: 'chapters', severity: 'warning', description: `peu de chapitres (${seo.chapters.length}, cible 5-7)` });
  }
  if (seo.chapters[0]?.time !== '00:00') {
    issues.push({ field: 'chapters', severity: 'blocker', description: `premier chapitre doit être 00:00 (trouvé "${seo.chapters[0]?.time}")` });
  }
  // Order check
  const seconds = seo.chapters.map(c => mmssToSec(c.time));
  for (let i = 1; i < seconds.length; i++) {
    if (seconds[i]! <= seconds[i - 1]!) {
      issues.push({ field: 'chapters', severity: 'blocker', description: `chapitres non ordonnés à l'index ${i} (${seo.chapters[i]?.time})` });
      break;
    }
    if (seconds[i]! - seconds[i - 1]! < 10) {
      issues.push({ field: 'chapters', severity: 'warning', description: `chapitres trop rapprochés à l'index ${i} (<10s)` });
    }
  }
  for (const c of seo.chapters) {
    if (c.label.length > 60) {
      issues.push({ field: 'chapters', severity: 'warning', description: `label "${c.label.slice(0, 30)}..." trop long (${c.label.length} chars)` });
    }
    const labelLower = c.label.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (labelLower.includes(word)) {
        issues.push({ field: 'chapters', severity: 'blocker', description: `mot interdit "${word}" dans label "${c.label}"` });
        break;
      }
    }
  }

  // ── Tags ────────────────────────────────────────────────
  if (seo.tags.length < 7) {
    issues.push({ field: 'tags', severity: 'warning', description: `peu de tags (${seo.tags.length}, cible 8-12)` });
  }
  const totalTagChars = seo.tags.join(',').length;
  if (totalTagChars > 480) {
    issues.push({ field: 'tags', severity: 'blocker', description: `total tags ${totalTagChars} chars (max 480)` });
  }
  for (const tag of seo.tags) {
    const wc = tag.split(/\s+/).filter(Boolean).length;
    if (wc > 5) {
      issues.push({ field: 'tags', severity: 'warning', description: `tag "${tag}" >5 mots` });
    }
    if (tag.startsWith('#')) {
      issues.push({ field: 'tags', severity: 'blocker', description: `tag "${tag}" ne doit pas commencer par # (c'est un hashtag, pas un tag)` });
    }
  }

  // ── Hashtags ───────────────────────────────────────────
  if (seo.hashtags.length !== 3) {
    issues.push({ field: 'hashtags', severity: 'warning', description: `${seo.hashtags.length} hashtags (recommandé exactement 3 pour placement above-title)` });
  }
  for (const tag of seo.hashtags) {
    if (tag.startsWith('#')) {
      issues.push({ field: 'hashtags', severity: 'warning', description: `hashtag "${tag}" contient déjà # (devrait être sans préfixe)` });
    }
    if (/\s/.test(tag)) {
      issues.push({ field: 'hashtags', severity: 'blocker', description: `hashtag "${tag}" contient un espace (interdit)` });
    }
  }

  return issues;
}

function mmssToSec(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return 0;
}

// ─── Prompt C10 ───────────────────────────────────────────

function buildC10SystemPrompt(): string {
  return `Tu es éditeur SEO senior pour TradingRecap, une chaîne YouTube de récap quotidien des marchés financiers en français.

# Audience
Traders particuliers et investisseurs amateurs francophones (FR/BE/CH/QC), niveau intermédiaire. Ils cherchent : "que s'est-il passé aujourd'hui sur les marchés", "comprendre un mouvement", "se faire une opinion".

# Positionnement éditorial
- Sobre, factuel, jamais clickbait. JAMAIS de "PROCHAIN KRACH" ou "EFFONDREMENT IMMINENT".
- Humble : on raconte ce qu'on observe, pas ce qu'il "faut faire".
- Pédagogique : intermarché, causalité, pas de jargon gratuit.

# Compliance AMF / MiFID II (NON-NÉGOCIABLE)
- Interdit de donner un conseil en investissement.
- Langage conditionnel obligatoire ("pourrait", "semble", "tend à").
- Disclaimer visible dans les 300 premiers chars de la description.
- Aucune recommandation explicite ("achetez X", "vendez Y").

# Tu dois produire un objet JSON STRICTEMENT à ce format :
{
  "title": string,           // 50-65 chars
  "description": string,     // 250-400 mots structurée (voir TEMPLATE)
  "chapters": [{ "time": "MM:SS", "label": string }],   // labels uniquement, timestamps imposés
  "tags": string[],          // 8-12 tags
  "hashtags": string[]       // exactement 3, SANS le #
}

# RÈGLES TITRE (35-65 chars cible, 70 max)

## Structure recommandée — choisir le pattern le plus pertinent au jour
A) "[Cause/event] [verbe] [asset principal] | [asset secondaire] — DD mois"
   Ex: "La Fed assomme Wall Street | CAC, S&P 500 — 28 avril"
B) "[Asset] : [narrative courte] | DD/MM"
   Ex: "CAC 40 : record battu, mais doutes persistants | 28/04"
C) "[Macro/event] : ce qui bouge sur [asset 1, asset 2] — DD mois"
   Ex: "Inflation US à 3,2% : ce qui bouge sur le CAC et l'or — 28 avril"
D) "[Asset] [verbe d'action sobre] [contexte court] — DD/MM"
   Ex: "Wall Street recule après la Fed — 28/04"

## Verbes d'action AUTORISÉS (sobres, factuels)
cède, recule, rebondit, ignore, doute, surveille, tente, retrouve, retombe, hésite, peine,
plonge (réservé > -3%), s'envole (réservé > +3%), flirte avec, casse (au sens technique).

## INTERDITS dans le titre (BLOCKER)
- Mots : krach, crash, effondrement, panique, imminent, catastrophe, urgent, arnaque, escroquerie, "ne ratez pas".
- Année : JAMAIS "2026" — utiliser "DD/MM" ou "DD mois" (ex: "28/04" ou "28 avril").
- TOUT EN MAJUSCULES (sauf abréviations standards : CAC, S&P, USD, Fed, BCE, BoJ).
- Plus d'un point d'exclamation. Plus d'un point d'interrogation.
- Émojis (0 émoji recommandé, 1 max et seulement 📉 ou 📈 si vraiment pertinent).
- Recommandation explicite ("achetez", "vendez", "investissez").

## Capitalisation
Sentence case (1ère lettre + noms propres). 1 mot capitalisé MAX pour emphase, et seulement si la news le justifie (ex: "Le CAC tente de REPARTIR" si rebond significatif après plusieurs séances).

# RÈGLES DESCRIPTION (250-400 mots, structurée en blocs)

Structure OBLIGATOIRE (respecte l'ordre et les marqueurs) :

[Ligne 1 — 100-130 chars MAX, c'est le "above the fold"]
Synthèse du jour avec le keyword principal et la date courte. Inclure : le mouvement principal du jour + asset clé.

[Ligne vide]

⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement (AMF/MiFID II). Investir comporte un risque de perte en capital.

[Ligne vide]

📊 SYNTHÈSE
3 paragraphes courts (2-3 phrases chacun) :
- Para 1 : Le mouvement principal — quel asset, quel %, quelle cause apparente.
- Para 2 : Les news à retenir — banque centrale, macro, géopolitique, earnings.
- Para 3 : Ce qu'on surveille demain — events calendar, niveaux techniques.
Inclure naturellement (densité 1-2%, pas de stuffing) : bourse, marchés financiers, CAC 40, et autres assets traités.

[Ligne vide]

⏱ CHAPITRES
[BLOCK_CHAPITRES] (sera rempli par le code)

[Ligne vide]

📌 À RETENIR
3 puces factuelles (pas de conseils) :
• [fait 1 chiffré]
• [fait 2 chiffré]
• [fait 3 contexte ou catalyseur attendu]

[Ligne vide]

🔗 RESSOURCES
Suivez la chaîne pour le récap quotidien des marchés.
(Pas de liens broker affiliés dans cette version automatisée.)

[Ligne vide]

📊 SOURCES & MÉTHODOLOGIE
Données : Yahoo Finance, FRED, Finnhub, RSS Reuters/Bloomberg. Mise à jour quotidienne.

[Ligne vide]

DISCLAIMER COMPLET
Ce contenu est à but informatif et éducatif. Il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une sollicitation à l'achat ou à la vente d'instruments financiers, au sens de la directive MiFID II et de la réglementation AMF. Les performances passées ne préjugent pas des performances futures. Investir comporte des risques de perte en capital, pouvant aller jusqu'à la totalité de la somme investie. Avant toute décision d'investissement, consultez un conseiller en investissement financier (CIF) agréé.

[Ligne vide — DERNIÈRE LIGNE]
#Bourse #CAC40 #Marches  (ou variation pertinente — ces 3 hashtags répliquent le champ "hashtags" du JSON)

# RÈGLES CHAPITRES

Tu dois fournir UN LABEL pour chaque timestamp imposé (l'ordre et les temps sont fixés par le code, ne les modifie pas).

Format label :
- 25-45 chars idéal (max 60).
- Hybride asset + micro-narrative ("CAC 40 : la peur l'emporte", "Or : nouveau record").
- Pas de "Intro" sec — préférer "Intro — Le marché en 30 secondes" ou "[date courte] : ce qui bouge".
- Pas de mots interdits (krach, etc.).
- Sentence case.

# RÈGLES TAGS (8-12 tags, total ≤ 400 chars)

Mix obligatoire :
- 1 tag = keyword exact du titre (ex: "cac 40 28 avril").
- 2-3 tags niche FR ("analyse bourse cac 40", "recap marchés français", "point bourse quotidien").
- 1-2 tags asset principal FR ("CAC 40", "bourse de paris", "wall street").
- 2-3 tags larges FR ("bourse", "trading", "marchés financiers", "investissement bourse").
- 1-2 tags EN si la vidéo couvre un asset US/EN ("S&P 500", "Fed", "stock market today").
- 0-1 variante orthographe ("cac40", "sp500").

Pas de # dans les tags. Pas de phrases > 5 mots.

# RÈGLES HASHTAGS (exactement 3, sans #)

Le 1er apparaît au-dessus du titre = placement premium. Ordre par importance.
Pour daily recap finance FR, recommandation par défaut : ["Bourse", "CAC40", "Marches"]
Adapter au jour : si journée Wall Street dominante, "WallStreet" peut remplacer "CAC40".
Si crypto dominante, "Bitcoin" ou "Crypto" possible.

# Discipline finale
- Ne JAMAIS inventer de chiffres : tous les % et niveaux doivent venir des données fournies.
- Ne JAMAIS faire de prédiction certaine : conditionnel obligatoire.
- Ne JAMAIS donner d'instruction d'achat/vente.
- Si un mouvement est ambigu, dis-le ("les marchés hésitent", "lecture mitigée").

Réponds UNIQUEMENT par le JSON, sans markdown wrapper.`;
}

function buildC10UserPrompt(input: {
  script: DraftScript;
  editorial: EditorialPlan;
  arc: ArcBeat[];
  thumbnailMoment: ThumbnailMoment;
  topAssets: FlaggedAsset[];
  chapters: Array<{ time: string; segmentId: string; defaultLabel: string }>;
  feedback?: string[];
}): string {
  const { script, editorial, topAssets, chapters, feedback } = input;
  const fmt = formatDateFR(script.date);

  const segmentSummaries = script.segments
    .map(s => {
      const narration = s.narration.slice(0, 200).replace(/\n/g, ' ');
      return `- ${s.segmentId} [${s.depth}] "${s.title}" (${s.assets.join(', ')}, ${s.durationSec}s) :\n    ${narration}${s.narration.length > 200 ? '...' : ''}`;
    })
    .join('\n');

  const movers = topAssets
    .slice(0, 8)
    .map(a => `${a.symbol} (${a.name}) : ${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}%`)
    .join(' | ');

  const chaptersBlock = chapters
    .map(c => `${c.time} — segmentId=${c.segmentId} (sujet par défaut: "${c.defaultLabel}")`)
    .join('\n');

  let userPrompt = `# DONNÉES ÉPISODE — ${fmt.dayLabel} ${fmt.dateShort}

## Theme dominant
${editorial.dominantTheme}

## Mood marché
${editorial.moodMarche}

## Top movers du jour
${movers || '(aucun)'}

## Cold open (la phrase d'accroche)
"${script.coldOpen.narration.slice(0, 300)}"

## Thread (annonce du fil narratif)
"${script.thread.narration.slice(0, 300)}"

## Segments couverts
${segmentSummaries}

## Closing
"${script.closing.narration.slice(0, 200)}"

## Titre actuel proposé par C3 (à RÉÉCRIRE en mode SEO)
"${script.title}"

## Description actuelle proposée par C3 (à RÉÉCRIRE COMPLÈTEMENT)
"${script.description}"

# CHAPITRES — TIMESTAMPS IMPOSÉS (ne pas modifier les "time")

${chaptersBlock}

# TÂCHE

Génère le JSON SEO YouTube complet en respectant TOUTES les règles du system prompt.
Date à mentionner : "${fmt.dateShort}" ou "${fmt.ddmm}" — JAMAIS l'année.
`;

  if (feedback?.length) {
    userPrompt += `\n# FEEDBACK (corrige IMPÉRATIVEMENT ces erreurs)\n${feedback.map(f => `- ${f}`).join('\n')}\n`;
  }

  return userPrompt;
}

/**
 * Run C10 SEO — generates YouTube SEO metadata.
 */
export async function runC10SEO(input: {
  script: DraftScript;
  editorial: EditorialPlan;
  arc: ArcBeat[];
  thumbnailMoment: ThumbnailMoment;
  topAssets: FlaggedAsset[];
  lang: Language;
  feedback?: string[];
}): Promise<SEOMetadata> {
  if (input.lang !== 'fr') {
    // English path not implemented yet — return a minimal fallback
    return mechanicalFallbackSEO(input.script, input.editorial, input.topAssets);
  }

  const chapters = computeChapterTimestamps(input.script);
  const systemPrompt = buildC10SystemPrompt();
  const userPrompt = buildC10UserPrompt({
    ...input,
    chapters,
  });

  console.log('  P10 C10 Sonnet — SEO metadata...');

  let seo: SEOMetadata;
  try {
    seo = await generateStructuredJSON<SEOMetadata>(systemPrompt, userPrompt, {
      role: 'balanced',
      validate: zodValidator(SEOMetadataSchema) as any,
    });
  } catch (err) {
    console.warn(`  C10 LLM failed: ${(err as Error).message.slice(0, 120)}`);
    return mechanicalFallbackSEO(input.script, input.editorial, input.topAssets);
  }

  // Force timestamps to be the deterministic ones (LLM only chose labels)
  seo.chapters = enforceTimestamps(seo.chapters, chapters);

  // Mechanical validation
  const issues = validateSEOMetadata(seo);
  const blockers = issues.filter(i => i.severity === 'blocker');

  if (blockers.length > 0 && !input.feedback) {
    console.log(`  C10 validation: ${blockers.length} blockers — retry with feedback`);
    return runC10SEO({
      ...input,
      feedback: blockers.map(b => `[${b.field}] ${b.description}`),
    });
  }

  if (blockers.length > 0) {
    console.warn(`  C10 still has ${blockers.length} blockers after retry — applying mechanical fixes`);
    seo = applyMechanicalFixes(seo, input.script, input.editorial);
  }

  // Hashtags should be without # prefix — strip if LLM added them
  seo.hashtags = seo.hashtags.map(h => h.replace(/^#+/, '').trim()).filter(Boolean);
  seo.tags = seo.tags.map(t => t.replace(/^#+/, '').trim()).filter(Boolean);

  return seo;
}

/**
 * Replace LLM-provided timestamps with the deterministic ones, matching by index.
 * This guarantees chapters align with actual segment durations.
 */
function enforceTimestamps(
  llmChapters: SEOChapter[],
  computed: Array<{ time: string; segmentId: string; defaultLabel: string }>,
): SEOChapter[] {
  // If LLM produced same number, map 1:1 by index
  if (llmChapters.length === computed.length) {
    return computed.map((c, i) => ({
      time: c.time,
      label: llmChapters[i]?.label ?? c.defaultLabel,
    }));
  }

  // If LLM produced fewer, pad with default labels
  if (llmChapters.length < computed.length) {
    return computed.map((c, i) => ({
      time: c.time,
      label: llmChapters[i]?.label ?? c.defaultLabel,
    }));
  }

  // If LLM produced more, truncate but keep its labels for the first N
  return computed.map((c, i) => ({
    time: c.time,
    label: llmChapters[i]?.label ?? c.defaultLabel,
  }));
}

/**
 * Apply targeted mechanical fixes to a near-valid SEO output.
 */
function applyMechanicalFixes(seo: SEOMetadata, script: DraftScript, editorial: EditorialPlan): SEOMetadata {
  const fmt = formatDateFR(script.date);

  // Strip year from title
  let title = seo.title.replace(/\s*20\d{2}\s*/g, ' ').replace(/\s+/g, ' ').trim();
  // Remove forbidden words (replace with milder synonym)
  for (const word of FORBIDDEN_WORDS) {
    if (title.toLowerCase().includes(word)) {
      title = title.replace(new RegExp(word, 'gi'), '').replace(/\s+/g, ' ').trim();
    }
  }
  // Truncate if too long
  if (title.length > 70) title = title.slice(0, 67).trim() + '...';

  // Ensure description has disclaimer above-the-fold
  let description = seo.description;
  const above = description.slice(0, 350).toLowerCase();
  const hasDisclaimer = DISCLAIMER_KEYWORDS.some(k => above.includes(k));
  if (!hasDisclaimer) {
    const disclaimerLine = `⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement (AMF/MiFID II). Investir comporte un risque de perte en capital.\n\n`;
    description = `Récap des marchés du ${fmt.dateShort} : ${editorial.dominantTheme}.\n\n${disclaimerLine}${description}`;
  }

  return { ...seo, title, description };
}

/**
 * Pure mechanical fallback when LLM completely fails.
 */
function mechanicalFallbackSEO(
  script: DraftScript,
  editorial: EditorialPlan,
  topAssets: FlaggedAsset[],
): SEOMetadata {
  const fmt = formatDateFR(script.date);
  const chapters = computeChapterTimestamps(script);

  const title = `${editorial.dominantTheme} — ${fmt.dateShort}`.slice(0, 65);

  const moversLine = topAssets.slice(0, 5)
    .map(a => `${a.name} ${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}%`)
    .join(', ');

  const description = `Récap des marchés du ${fmt.dayLabel} ${fmt.dateShort} : ${editorial.dominantTheme}. Tour d'horizon : ${moversLine}.

⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement (AMF/MiFID II). Investir comporte un risque de perte en capital.

📊 SYNTHÈSE
${editorial.threadSummary}

Mood du jour : ${editorial.moodMarche}.

⏱ CHAPITRES
${chapters.map(c => `${c.time} ${c.defaultLabel}`).join('\n')}

📌 À RETENIR
• ${topAssets[0]?.name ?? 'Marchés'} : ${topAssets[0]?.changePct.toFixed(2) ?? '0'}%
• Theme dominant : ${editorial.dominantTheme}
• ${editorial.closingTeaser}

📊 SOURCES
Données : Yahoo Finance, FRED, Finnhub, RSS Reuters/Bloomberg.

DISCLAIMER COMPLET
Ce contenu est à but informatif et éducatif. Il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, au sens de la directive MiFID II et de la réglementation AMF. Les performances passées ne préjugent pas des performances futures. Investir comporte des risques de perte en capital. Consultez un conseiller en investissement financier (CIF) agréé avant toute décision.

#Bourse #CAC40 #Marches`;

  return {
    title,
    description,
    chapters: chapters.map(c => ({ time: c.time, label: c.defaultLabel })),
    tags: [
      `bourse ${fmt.ddmm}`,
      'analyse bourse',
      'recap marches',
      'cac 40',
      'wall street',
      'bourse',
      'trading',
      'marches financiers',
      'investissement bourse',
    ],
    hashtags: ['Bourse', 'CAC40', 'Marches'],
  };
}
