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
const DISCLAIMER_KEYWORDS = ['informatif', 'conseil', 'risque', 'éducatif'];

// Ligne de transparence production (mention IA discrète, signal préventif YouTube policy 15/07/2025)
const PRODUCTION_LINE =
  'Production : voix de synthèse Owl Street Journal, écriture et recherche éditoriale assistées.';
const PRODUCTION_LINE_KEYWORD = 'voix de synthèse';

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
  field: 'title' | 'description' | 'chapters' | 'tags' | 'hashtags' | 'pinnedComment';
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
  // First line (above-the-fold) must be 50-130 chars and look hook-y, not plain "Bourse du X : a-b-c"
  const firstLine = seo.description.split('\n')[0] ?? '';
  if (firstLine.length < 50) {
    issues.push({ field: 'description', severity: 'warning', description: `1ère ligne trop courte (${firstLine.length} chars, cible 100-130)` });
  }
  if (firstLine.length > 150) {
    issues.push({ field: 'description', severity: 'warning', description: `1ère ligne trop longue (${firstLine.length} chars — risque coupure dans snippet)` });
  }
  // Anti-pattern: plain "Bourse du JJ mois : keyword1, keyword2, keyword3" → descriptif sec, pas de hook
  if (/^Bourse du \d+\s+\w+\s*:\s*[^—.!?]+,\s*[^—.!?]+,/.test(firstLine)) {
    issues.push({ field: 'description', severity: 'warning', description: `1ère ligne en "Bourse du X : a, b, c" → trop descriptif/plat. Préférer un hook curiosity-gap ou paradoxe.` });
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

  // ── Pinned comment (optionnel) ─────────────────────────
  if (seo.pinnedComment !== undefined) {
    const pc = seo.pinnedComment;
    if (pc.length < 80) {
      issues.push({ field: 'pinnedComment', severity: 'warning', description: `pinnedComment trop court (${pc.length} chars, cible 150-350)` });
    }
    if (pc.length > 500) {
      issues.push({ field: 'pinnedComment', severity: 'blocker', description: `pinnedComment trop long (${pc.length} chars, max 500)` });
    }
    // Liens interdits (spam flag YouTube)
    if (/https?:\/\/|www\.|youtu\.be|youtube\.com|t\.co\/|@\w{3,}/.test(pc)) {
      issues.push({ field: 'pinnedComment', severity: 'blocker', description: `pinnedComment contient un lien ou @mention (filtré comme spam)` });
    }
    // Hashtags interdits dans commentaire
    if (/#\w{2,}/.test(pc)) {
      issues.push({ field: 'pinnedComment', severity: 'warning', description: `pinnedComment contient un hashtag (à mettre dans la description)` });
    }
    // Mots interdits
    const pcLower = pc.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (pcLower.includes(word)) {
        issues.push({ field: 'pinnedComment', severity: 'blocker', description: `mot interdit "${word}" dans pinnedComment` });
        break;
      }
    }
    // Emojis : max 3 (un peu plus tolérant que le titre)
    const pcEmojis = (pc.match(/\p{Extended_Pictographic}/gu) || []).length;
    if (pcEmojis > 3) {
      issues.push({ field: 'pinnedComment', severity: 'warning', description: `${pcEmojis} emojis dans pinnedComment (max 3)` });
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

# Compliance régulation française / européenne (NON-NÉGOCIABLE)
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
  "hashtags": string[],      // exactement 3, SANS le #
  "pinnedComment": string    // premier commentaire d'engagement (150-350 chars)
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

[Ligne 1 — 100-130 chars MAX, c'est le "above the fold" — 1ère LIGNE CRUCIALE pour le SEO + CTR]

⚠️ Cette ligne décide si le viewer clique "Plus" ou scroll. C'est la SEULE qui s'affiche dans les snippets de recherche YouTube et Google. Doit être un HOOK CURIOSITY-GAP, pas un résumé sec.

## Patterns à utiliser (curiosity-gap > description plate)

A) **Paradoxe / contradiction** :
   ✅ "Trump a suspendu une opération militaire et le pétrole a perdu 4% — pourtant la prime physique tient bon."
   ✅ "Le KOSPI bat un record absolu pendant que HSBC plonge sur des résultats... corrects."
   ❌ "Bourse du 6 mai : pétrole -3,9 %, KOSPI au sommet, S&P 500 à +0,81 %." (plat, descriptif)

B) **Cliffhanger / question implicite** :
   ✅ "Trois banques centrales en 24h, et c'est le dollar australien qui sort grand gagnant. Voici pourquoi."
   ✅ "Bitcoin à 80 000 $ malgré deux forces qui se tirent dessus. Le marché tranche aujourd'hui."

C) **Chiffre saillant + cause cachée** :
   ✅ "Samsung +17% sur la séance — un détail technique relance toute la chaîne IA."

## Règles dures
- 100-130 chars MAX (compté précisément, sinon coupé dans le snippet).
- Inclure le keyword principal du jour (le mouvement clé).
- Inclure la date courte ("6 mai" ou "06/05") MAIS pas comme préfixe — l'intégrer dans la phrase.
- Ton conditionnel + sobre (compliance AMF).
- AUCUN clickbait : pas de "INCROYABLE", "CHOC", "PERSONNE NE VOIT", "DOIT VOIR".
- Construit pour faire cliquer "Plus" → générer du watch time.

[Ligne vide]

⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement. Investir comporte un risque de perte en capital.

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
Production : voix de synthèse Owl Street Journal, écriture et recherche éditoriale assistées.

[Ligne vide]

DISCLAIMER COMPLET
Ce contenu est à but informatif et éducatif. Il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une sollicitation à l'achat ou à la vente d'instruments financiers. Les performances passées ne préjugent pas des performances futures. Investir comporte des risques de perte en capital, pouvant aller jusqu'à la totalité de la somme investie. Avant toute décision d'investissement, consultez un conseiller en investissement financier agréé.

[Ligne vide — DERNIÈRE LIGNE]
#Bourse #CAC40 #Marches  (ou variation pertinente — ces 3 hashtags répliquent le champ "hashtags" du JSON)

# RÈGLES CHAPITRES

Tu dois fournir UN LABEL pour chaque timestamp imposé (l'ordre et les temps sont fixés par le code, ne les modifie pas).

⚠️ FORMAT CRITIQUE pour la description (sinon YouTube ne détecte pas les chapitres) :
- Format STRICT : "MM:SS LABEL" (avec UN SEUL espace entre le timestamp et le label)
- INTERDIT : "MM:SS — LABEL" (tiret cadratin) → casse la détection YouTube
- INTERDIT : "MM:SS - LABEL" (tiret simple) → idem
- INTERDIT : "MM:SS : LABEL" (deux-points avant) → idem
- INTERDIT : "MM:SS | LABEL" → idem
- ✅ CORRECT : "00:00 Intro Le marché en 30 secondes"
- ✅ CORRECT : "01:30 CAC 40 la peur l'emporte"

Format label :
- 25-45 chars idéal (max 60).
- Hybride asset + micro-narrative ("CAC 40 : la peur l'emporte", "Or : nouveau record").
- Le label PEUT contenir des deux-points/tirets À L'INTÉRIEUR du label (ex: "Or : nouveau record"), juste pas comme séparateur après le timestamp.
- Pas de "Intro" tout court — préférer "Intro Le marché en 30 secondes" ou "[date courte] ce qui bouge".
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

# RÈGLES PINNED COMMENT (150-350 chars idéal, 500 max — premier commentaire d'engagement)

Ce commentaire est posté automatiquement par le bot après upload, en tant que propriétaire de chaîne. Sera épinglé manuellement (= "Commentaire le plus utile" en haut de la section commentaires). Objectif : engager les viewers à répondre + soft CTA abonnement.

## Structure recommandée (3 phrases, dans cet ordre)
1. **Hook éditorial** (1 phrase, 60-100 chars) : un fait saillant ou un paradoxe du jour, formulé pour faire réfléchir. PAS un résumé — un angle.
2. **Question ouverte** (1 phrase, 60-120 chars) : une question d'opinion liée au sujet du jour, qui invite les viewers à répondre. Format "Vous pensez que...?" ou "Pour vous, X ou Y ?". Termine par 👇 (un seul emoji).
3. **CTA soft** (optionnel, 1 phrase courte) : "Abonne-toi pour le récap quotidien." ou variante. Pas obligatoire.

## RÈGLES DURES
- 150-350 chars idéal (max 500). Trop court = pauvre, trop long = TLDR.
- AUCUN lien (URL, t.co, youtu.be, mention de chaîne par @) — YouTube anti-spam flag direct.
- AUCUN hashtag dans le commentaire (les hashtags sont dans la description).
- Tu peux utiliser 1-2 emojis MAX (👇 pour la question, ou 📊/🛢️/💱 selon le sujet, mais sobre).
- Pas de TOUT EN MAJUSCULES.
- Pas de "Salut tout le monde", "Hey les amis" — direct.
- Ton : éditorial humble, factuel. Comme un pote trader qui te raconte. Tutoiement OK.
- Conditionnel obligatoire si tu évoques le futur ("pourrait", "semble").
- Mots interdits : krach, crash, panique, urgent, "achetez", "vendez", "ne ratez pas".
- Pas de "first" ou "premier commentaire" (cringe).
- N'inclus PAS de timestamps ni de récap des chapitres (déjà dans la description).

## Bons exemples (pour calibrer le ton)

✅ "La désescalade efface 4% du brut en une séance, mais la prime de fret tient bon. Pour vous, le vrai signal cette semaine c'est l'emploi US vendredi ou la prochaine étape diplomatique dans le Golfe ? 👇

Abonne-toi pour le récap quotidien."

✅ "KOSPI au record absolu pendant que HSBC plonge sur des résultats... corrects. Vous pensez que c'est l'Asie qui mène le cycle IA ou Wall Street fait mine de pas voir ? 👇"

✅ "Trois banques centrales en 24h, et le dollar australien sort grand gagnant. Quelle banque centrale a le plus surpris pour vous ? 👇

Abonne-toi si tu veux décortiquer ça chaque jour."

❌ MAUVAIS : "Salut tout le monde ! N'oubliez pas de LIKER et de vous ABONNER pour ne rien rater ! 🚨🚨🚨" (clickbait + caps + spammy)
❌ MAUVAIS : "Voici le récap du jour. Bonne vidéo." (plat, zéro engagement)
❌ MAUVAIS : "Lien vers le suivant : youtu.be/..." (lien = spam flag)

# Discipline finale
- Ne JAMAIS inventer de chiffres : tous les % et niveaux doivent venir des données fournies.
- Ne JAMAIS faire de prédiction certaine : conditionnel obligatoire.
- Ne JAMAIS donner d'instruction d'achat/vente.
- Si un mouvement est ambigu, dis-le ("les marchés hésitent", "lecture mitigée").

# OUTPUT — TOUS LES 6 CHAMPS OBLIGATOIRES

Ton JSON DOIT contenir EXACTEMENT ces 6 champs : title, description, chapters, tags, hashtags, **pinnedComment**.

⚠️ Le champ \`pinnedComment\` est OBLIGATOIRE — sans lui le pipeline rejette ta réponse et te renvoie en retry. Suis la structure 3 phrases (hook éditorial → question ouverte avec 👇 → CTA soft) décrite dans la section RÈGLES PINNED COMMENT plus haut. 150-350 chars.

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

  // Sanitize chapter format dans la description : YouTube exige "MM:SS LABEL"
  // strict (espace simple). Le tiret cadratin/simple/deux-points entre timestamp
  // et label CASSE la détection des chapitres. Si Sonnet a glissé un séparateur,
  // on le retire ici.
  seo.description = seo.description.replace(
    /(^|\n)(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–\-:|·]\s+/g,
    '$1$2 ',
  );

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

  // Fallback : si Sonnet a omis le pinnedComment (champ .optional() dans le
  // schema, donc absence non-bloquante), on en synthétise un déterministe
  // depuis le top mover. Sans ça, l'upload script saute la pose du
  // commentaire d'engagement, donc plus de "first comment" épinglable.
  if (!seo.pinnedComment || seo.pinnedComment.trim().length < 80) {
    const topMover = input.topAssets[0];
    seo.pinnedComment = topMover
      ? `${topMover.name} ${topMover.changePct >= 0 ? '+' : ''}${topMover.changePct.toFixed(2)}% sur la séance — ${input.editorial.dominantTheme.toLowerCase()}. Pour vous, c'est le mouvement clé du jour ou un signal plus profond ? 👇\n\nAbonne-toi pour le récap quotidien.`
      : `${input.editorial.dominantTheme}. Vous le voyez comment côté positionnement ? 👇\n\nAbonne-toi pour le récap quotidien.`;
    console.log(`  C10: pinnedComment synthétisé (LLM l'avait omis)`);
  }

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
    const disclaimerLine = `⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement. Investir comporte un risque de perte en capital.\n\n`;
    description = `Récap des marchés du ${fmt.dateShort} : ${editorial.dominantTheme}.\n\n${disclaimerLine}${description}`;
  }

  // Safety net: ensure production transparency line is present (anti-"inauthentic content" signal).
  // If Sonnet strips it, re-inject before the disclaimer block (or append to SOURCES section if present).
  if (!description.toLowerCase().includes(PRODUCTION_LINE_KEYWORD)) {
    const sourcesMatch = description.match(/(📊 SOURCES[^\n]*\n[^\n]+)/);
    if (sourcesMatch) {
      description = description.replace(sourcesMatch[1], `${sourcesMatch[1]}\n${PRODUCTION_LINE}`);
    } else {
      description = description.replace(
        /(\n+DISCLAIMER COMPLET)/,
        `\n\n📊 SOURCES & MÉTHODOLOGIE\nDonnées : Yahoo Finance, FRED, Finnhub, RSS Reuters/Bloomberg.\n${PRODUCTION_LINE}$1`,
      );
    }
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

⚠️ Contenu informatif et pédagogique uniquement. Aucun conseil en investissement. Investir comporte un risque de perte en capital.

📊 SYNTHÈSE
${editorial.threadSummary}

Mood du jour : ${editorial.moodMarche}.

⏱ CHAPITRES
${chapters.map(c => `${c.time} ${c.defaultLabel}`).join('\n')}

📌 À RETENIR
• ${topAssets[0]?.name ?? 'Marchés'} : ${topAssets[0]?.changePct.toFixed(2) ?? '0'}%
• Theme dominant : ${editorial.dominantTheme}
• ${editorial.closingTeaser}

📊 SOURCES & MÉTHODOLOGIE
Données : Yahoo Finance, FRED, Finnhub, RSS Reuters/Bloomberg.
Production : voix de synthèse Owl Street Journal, écriture et recherche éditoriale assistées.

DISCLAIMER COMPLET
Ce contenu est à but informatif et éducatif. Il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une sollicitation à l'achat ou à la vente d'instruments financiers. Les performances passées ne préjugent pas des performances futures. Investir comporte des risques de perte en capital. Consultez un conseiller en investissement financier agréé avant toute décision.

#Bourse #CAC40 #Marches`;

  const topMover = topAssets[0];
  const pinnedComment = topMover
    ? `${topMover.name} ${topMover.changePct >= 0 ? '+' : ''}${topMover.changePct.toFixed(2)}% sur la séance — ${editorial.dominantTheme.toLowerCase()}. Pour vous, c'est le mouvement clé du jour ou un signal plus profond ? 👇\n\nAbonne-toi pour le récap quotidien.`
    : `${editorial.dominantTheme}. Vous le voyez comment côté positionnement ? 👇\n\nAbonne-toi pour le récap quotidien.`;

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
    pinnedComment,
  };
}
