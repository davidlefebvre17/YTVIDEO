/**
 * P7 — C6 Haiku : Adaptation TTS
 *
 * Architecture en 2 étapes :
 *   1. PRÉ-TRAITEMENT CODE (déterministe) — toute la prononciation
 *      Chiffres → lettres, sigles, indices, anglicismes, noms propres
 *   2. C6 HAIKU (LLM) — UNIQUEMENT placement de [pause]
 *      Ne touche PAS au texte, ne reformule rien, ne phonétise rien
 *
 * Le texte d'Opus arrive intact à Fish Audio, juste nettoyé par le code
 * et rythmé par les pauses de C6.
 *
 * Coût : ~$0.005/épisode (Haiku, ~10 segments × ~50 tokens)
 */

import type { BeatEmotion } from '@yt-maker/core';
import { generateStructuredJSON } from '../llm-client';
import type { BeatAnnotation } from './p7a5-beat-annotator';
import { phoneticRegistry } from '../p7-audio/phonetic-registry';

// ─── Source unique de phonétiques : phoneticRegistry ──
// Le registry agrège data/company-profiles.json (tickers + noms) +
// data/phonetics-registry.json (règles regex catégorisées).
// Voir packages/ai/src/p7-audio/phonetic-registry.ts

// ─── Types ──────────────────────────────────────────────────────

export interface TTSBeat {
  beatId: string;
  /** Texte original (C3) */
  original: string;
  /** Texte adapté pour TTS avec tags Fish Audio */
  adapted: string;
  /** Preset Fish Audio à utiliser */
  fishPreset: 'DEEP' | 'FOCUS' | 'FLASH' | 'COLD_OPEN';
}

interface C6Input {
  beats: Array<{
    beatId: string;
    narration: string;
    isSegmentStart: boolean;
    isSegmentEnd: boolean;
    isKeyMoment: boolean;
  }>;
}

interface C6Output {
  beats: Array<{
    beatId: string;
    adapted: string;
  }>;
}

const PACING_TO_PRESET: Record<string, TTSBeat['fishPreset']> = {
  rapide: 'FLASH',
  posé: 'FOCUS',
  lent: 'DEEP',
};

// ─── C6 System Prompt — PAUSE PLACEMENT ONLY ───────────────────

const C6_SYSTEM_PROMPT = `Tu es un directeur de respiration pour synthèse vocale. Le texte que tu reçois est DÉJÀ PRÊT à être lu (chiffres en lettres, prononciation corrigée). Tu n'as qu'UN SEUL job.

## Ton UNIQUE rôle
Placer des tags [pause] dans le texte pour guider le rythme et l'intonation de la voix.

## Le tag [pause]
- Silence court (~0.3s) qui force la voix à redescendre en intonation
- Place-le APRÈS un point (.) — quand la phrase finit et l'idée change, la pause marque la fin
- JAMAIS après une virgule (,) — la virgule crée déjà sa propre micro-respiration, ajouter [pause] casse le flow et donne un effet saccadé
- Pas obligatoire après CHAQUE point — seulement quand la phrase qui finit marque une vraie rupture d'idée
- Maximum 2-3 [pause] par beat — trop de pauses casse le flow

## RÈGLES ABSOLUES
1. **NE CHANGE AUCUN MOT.** Pas un seul. Le texte est déjà prêt. Tu ajoutes SEULEMENT des [pause].
2. **NE reformule PAS.** NE coupe PAS les phrases. NE réarrange PAS l'ordre des mots.
3. **NE phonétise PAS.** La prononciation est déjà gérée par le code. Si tu vois "essenne pi" ou "praïcé", laisse tel quel.
4. **NE supprime PAS de texte.** Chaque mot de l'input doit se retrouver dans l'output.
5. **JAMAIS [pause] après une virgule.** La virgule = respiration naturelle, le [pause] = fin d'idée.
6. **JAMAIS [pause] au début d'un beat isSegmentStart=true.** Les segments sont déjà joints par owl transitions, ajouter une pause au début crée un silence inutile.
7. **JAMAIS [pause] à la fin d'un beat isSegmentEnd=true.** La pause en fin de segment se confond avec la pause naturelle du changement de segment — ça fait une double respiration qui saccade. Terminer le beat sur le dernier mot, point final.
8. **isKeyMoment=true** → [pause] AVANT le passage clé (pas après).

## Où placer les pauses (guide)
- Après un point qui ferme une idée majeure → [pause] pour laisser absorber
- Avant un contraste ("Mais", "Sauf que", "Pourtant") en début de phrase → [pause] AVANT pour créer l'effet
- Avant un chiffre important qui arrive → [pause] pour créer l'attente
- PAS après une virgule, PAS en début/fin de segment

## Output JSON
\`\`\`json
{
  "beats": [
    { "beatId": "beat_001", "adapted": "[pause] Texte identique avec pauses ajoutées." },
    { "beatId": "beat_002", "adapted": "Suite du texte. [pause] Avec pauses stratégiques." }
  ]
}
\`\`\``;

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 1 — PRÉ-TRAITEMENT CODE (déterministe, toute la prononciation)
// ═══════════════════════════════════════════════════════════════

// Déterminants FR non élidés (suivis d'un espace puis d'un mot)
const FR_DET_SPACED = `(?:les|le|la|du|des|de|un|une|au|aux|cette|cet|ces|sa|son|ses|notre|nos|votre|vos|leur|leurs|mon|ma|mes|ton|ta|tes)`;
// Déterminants élidés FR (l', d') — suivis directement d'un mot sans espace
const FR_DET_ELIDED = `(?:l'|d')`;
// Union pour contextes où le déterminant PRÉCÈDE un ticker (toujours suivi d'un espace)
const FR_DETERMINER_RE = `(?:${FR_DET_ELIDED}|${FR_DET_SPACED})`;

// Stopwords phonétiques : mots qu'on ignore pour le calcul d'overlap
const PHONETIC_STOPWORDS = new Set([
  'de','du','des','la','le','les','l','d',
  'et','à','au','aux','un','une',
  'sur','en','dans','par','pour','avec','sans','sous','chez','vers',
]);

/**
 * Supprime le pattern redondant `"TICKER", <apposition>` quand l'apposition reprend
 * un mot du phonétique du ticker.
 *
 * Exemples :
 *   Le "CL=F", le brut américain     → Le brut américain   (overlap: américain)
 *   Le "GC=F", l'or, recule          → L'or, recule        (overlap: or)
 *   Le "SI=F", l'argent, -3%         → L'argent, -3%       (overlap: argent)
 *
 * Préserve :
 *   Le "STMPA.PA", le franco-italien → inchangé  (aucun mot commun phonétique/apposition)
 *
 * Le ticker reste disponible pour les overlays visuels via `assets[]`.
 */
function suppressRedundantAppositions(text: string, tickerMap: Map<string, string>): string {
  // Pattern : [déterminant optionnel + espace] "TICKER", <déterminant + contenu> (jusqu'à ,.;—)
  //   - Le déterminant précédent est optionnel pour gérer "Hier, "XYZ", le truc"
  //   - L'apposition accepte soit un élidé (l'or, d'or) soit un non-élidé + espace (le brut)
  const apposContentRe = `(?:${FR_DET_ELIDED}[^,.;—\\n]+?|${FR_DET_SPACED}\\s+[^,.;—\\n]+?)`;
  const re = new RegExp(
    `(?:\\b(${FR_DETERMINER_RE})\\s+)?"([A-Z0-9^=.\\-]{1,15})",\\s+(${apposContentRe})(?=[,.;—])`,
    'gi',
  );

  const tokenize = (s: string): string[] =>
    s.toLowerCase().split(/[\s''"]+/).filter(w => w.length >= 2 && !PHONETIC_STOPWORDS.has(w));

  return text.replace(re, (match, precDet: string | undefined, ticker: string, apposition: string) => {
    const phonetic = tickerMap.get(ticker);
    if (!phonetic) return match;

    const phoneticWords = new Set(tokenize(phonetic));
    const apposWords = tokenize(apposition);
    const hasOverlap = apposWords.some(w => phoneticWords.has(w));
    if (!hasOverlap) return match;

    // Redondance confirmée : ne garder que l'apposition, en préservant la capitalisation
    // du déterminant précédent (si début de phrase).
    if (precDet && precDet[0] === precDet[0].toUpperCase()) {
      return apposition.charAt(0).toUpperCase() + apposition.slice(1);
    }
    return apposition;
  });
}

/**
 * Pipeline unique de pré-traitement : C3 text → texte prêt pour Fish Audio.
 * Fusionne chiffres, symboles, sigles, indices, anglicismes, noms propres.
 * Appliqué AVANT C6 — C6 ne voit que du texte propre.
 */
export function preProcessForTTS(text: string): string {
  let result = text;
  const tickerMap = phoneticRegistry.getTickerMap();

  // ── Passe 1 : suppression des appositions redondantes ──
  // C3 écrit souvent "TICKER", <apposition humaine> (ex: "CL=F", le brut américain).
  // Le ticker sert au visuel (chart, overlay), l'apposition à l'audio.
  // Si l'apposition reprend un mot du phonétique du ticker, on supprime le ticker :
  // on n'entend que la forme orale voulue par l'auteur.
  result = suppressRedundantAppositions(result, tickerMap);

  // ── Passe 2 : Tickers entre guillemets → nom phonétique ──
  // "GS" → goldmane-sax, "AAPL" → apple, "CL=F" → pétrole américain
  // Safety net : si le phonétique répète un mot déjà prononcé 60 chars avant OU après,
  // on drop le phonétique (passe 1 aurait dû l'attraper, mais filet de sécurité).
  // Stopwords généraux + mots-nombres français : ces derniers apparaissent dans
  // les phonétiques d'indices ("Nikkei deux cent vingt-cinq", "S&P cinq cents",
  // "essenne pi dix ans") MAIS aussi dans le texte courant ("pour cent",
  // "vingt heures") — d'où des faux positifs d'overlap qui dropraient à tort
  // le nom de l'indice. On les exclut du matching.
  const TICKER_STOPWORDS = new Set([
    'de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'un', 'une',
    'sur', 'en', 'dans',
    // Mots-nombres FR
    'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
    'cent', 'cents', 'mille', 'million', 'milliards', 'milliard',
    'pour',
  ]);
  result = result.replace(/"([A-Z0-9^=.\-]{1,15})"/g, (match, ticker, offset, full) => {
    const phonetic = tickerMap.get(ticker);
    if (!phonetic) return match;
    const before = full.slice(Math.max(0, offset - 60), offset).toLowerCase();
    const after = full.slice(offset + match.length, offset + match.length + 60).toLowerCase();
    const tokenize = (s: string) => s
      .replace(/[.,;:!?—–"«»()]/g, '')
      .replace(/['']/g, ' ')
      .split(/\s+/).filter(Boolean);
    const precedingWords = tokenize(before).slice(-3);
    const followingWords = tokenize(after).slice(0, 5);
    const phoneticWords = phonetic.toLowerCase().split(/\s+/).filter(Boolean);
    const significantPhoneticWords = phoneticWords.filter(w => w.length >= 2 && !TICKER_STOPWORDS.has(w));
    const overlap = significantPhoneticWords.some(pw => precedingWords.includes(pw) || followingWords.includes(pw));
    if (overlap) return '';
    return phonetic;
  });
  // Nettoyer espaces doublés + ponctuation collée après dedup
  result = result.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1');

  // ── Nettoyage markdown ──
  result = result.replace(/\*\*/g, '');
  result = result.replace(/\*/g, '');
  result = result.replace(/#{1,6}\s/g, '');
  result = result.replace(/—/g, ' — ');
  result = result.replace(/\.\.\./g, '…');

  // ── Symboles → texte (AVANT conversion chiffres) ──
  result = result.replace(/\+(\d)/g, 'plus $1');
  // & → "et" SAUF dans S&P (traité par pronunciation fixes)
  result = result.replace(/(?<!S)&(?!P)/g, ' et ');

  // ── Chiffres → lettres françaises ──
  result = convertNumbersToFrench(result);

  // ── Résidus symboles post-conversion ──
  result = result.replace(/%/g, ' pour cent');
  result = result.replace(/\$/g, ' dollars');
  result = result.replace(/€/g, ' euros');

  // ── Phonétique des noms en texte clair (depuis company-profiles.json) ──
  // Applique automatiquement les phonetics aux noms d'entités quand C3 les
  // écrit en texte normal (ex: "Bitcoin", "KLM", "Goldman Sachs"). Les tickers
  // entre guillemets sont déjà gérés par la passe précédente.
  for (const [pattern, replacement] of phoneticRegistry.getNameRules()) {
    result = result.replace(pattern, replacement);
  }

  // ── Prononciation unifiée (un seul passage, ordre déterministe) ──
  // Cette table couvre les cas non-profilés : anglicismes (pricing, bullish),
  // sigles macro/CB (RSI, VIX, Fed, BCE), bugs Fish Audio (grimpe), etc.
  // Les overrides ici ont priorité sur les profiles (au cas où une règle
  // spécifique soit nécessaire).
  for (const [pattern, replacement] of phoneticRegistry.getRegexRules()) {
    result = result.replace(pattern, replacement);
  }

  // ── Élision automatique devant voyelle (post-substitution phonétique) ──
  // "Le indice du dollar" → "L'indice du dollar" (DX-Y.NYB)
  // "De or" → "D'or", "Que apple" → "Qu'apple"
  // Gère les phonétiques commençant par voyelle que C3 ne pouvait pas prévoir.
  //
  // EXCLUSION : sigles épelés en français commencent phonétiquement par le NOM
  // de la lettre ("èss", "èm", "èn", "èl", "èr", "èf", "essenne") — on dit
  // "le S&P", pas "l'S&P" (la consonne suit dans l'épellation). Reconnu par :
  //   - lettre initiale `è` (accent grave = nom de lettre : èm, èn, èl, èr, èf, èss)
  //   - patterns "essenne", "ème", "ène", "èle", "ère" (sigles composés)
  //
  // EXCLUSION : y semi-consonantique (yen, yaourt, yoga, York, Yémen) — en français
  // ces mots prennent "le/la" sans élision. On retire `y` et `Y` de VOWELS pour
  // éviter "Le yen" → "L'yen".
  const VOWELS = '[aâäàeéèêëiîïoôöuûüAÂÄÀEÉÈÊËIÎÏOÔÖUÛÜ]';
  // Exclut les sigles épelés : le mot suivant ne doit PAS être le nom d'une lettre
  // (é, èss, èm, èn, èl, èr, èf, ème, ène, èle, ère, em, ess, esse, en, el, er, ef)
  // ni commencer par "essenne" ("S&P" épelé). Règle : en français, on dit "le S&P",
  // pas "l'S&P" (l'épellation démarre phonétiquement par une consonne).
  // Utilise lookahead négatif avec frontière-mot (\b) pour ne pas matcher "emballage" etc.
  const SIGLE_NAMES = '(?!essenne|èm\\b|èn\\b|èl\\b|èr\\b|èf\\b|èss\\b|ème\\b|ène\\b|èle\\b|ère\\b|em\\s|en\\s|el\\s|er\\s|ef\\s|es\\s|ess\\s|esse\\s)';
  const BEFORE_VOWEL = `${SIGLE_NAMES}${VOWELS}`;
  result = result.replace(new RegExp(`\\b([Ll])e\\s+(?=${BEFORE_VOWEL})`, 'g'), "$1'");
  result = result.replace(new RegExp(`\\b([Dd])e\\s+(?=${BEFORE_VOWEL})`, 'g'), "$1'");
  result = result.replace(new RegExp(`\\b([Qq])ue\\s+(?=${BEFORE_VOWEL})`, 'g'), "$1u'");

  // ── Références visuelles ──
  result = result.replace(/comme (vous pouvez |on (peut )?)?le (voir|constater) (sur (le|ce) graphique)?/gi, '');
  result = result.replace(/observez /gi, '');
  result = result.replace(/ci-dessous/gi, '');

  // ── Nettoyage final ──
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

// ─── Table de prononciation MIGRÉE ──────────────────────────────
// Toutes les règles sont désormais dans data/phonetics-registry.json,
// chargées via phoneticRegistry.getRegexRules().
// Workflow d'ajout d'une nouvelle phonétique :
//   1. Ajouter une entrée dans data/phonetics-registry.json (catégorie pertinente)
//   2. Ajouter un test dans scripts/test-phonetics.ts
//   3. Run : npx tsx scripts/test-phonetics.ts

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 2 — C6 HAIKU (placement de pauses uniquement)
// ═══════════════════════════════════════════════════════════════

/**
 * Adapte les narrations pour Fish Audio TTS.
 *
 * 1. Pré-traite chaque beat avec preProcessForTTS() (code, déterministe)
 * 2. Envoie le texte propre à C6 Haiku qui ajoute SEULEMENT des [pause]
 * 3. Retourne le texte final prêt pour Fish Audio
 */
export async function adaptForTTS(
  beats: Array<{
    id: string;
    segmentId: string;
    narrationChunk: string;
    segmentDepth: string;
    isSegmentStart: boolean;
    isSegmentEnd: boolean;
  }>,
  annotations: BeatAnnotation[],
): Promise<TTSBeat[]> {
  const annotMap = new Map(annotations.map(a => [a.beatId, a]));
  const segmentIds = [...new Set(beats.map(b => b.segmentId))];
  const allResults: TTSBeat[] = [];

  for (const segId of segmentIds) {
    const segBeats = beats.filter(b => b.segmentId === segId);
    console.log(`    C6 TTS adapt segment ${segId}: ${segBeats.length} beats...`);

    // Step 1: Pre-process ALL beats with code (deterministic)
    const preProcessed = new Map<string, string>();
    for (const beat of segBeats) {
      preProcessed.set(beat.id, preProcessForTTS(beat.narrationChunk));
    }

    // Step 2: Send pre-processed text to C6 for pause placement only
    const c6Input: C6Input = {
      beats: segBeats.map(b => {
        const ann = annotMap.get(b.id);
        return {
          beatId: b.id,
          narration: preProcessed.get(b.id)!,
          isSegmentStart: b.isSegmentStart,
          isSegmentEnd: b.isSegmentEnd,
          isKeyMoment: ann?.isKeyMoment ?? false,
        };
      }),
    };

    try {
      const response = await generateStructuredJSON<C6Output>(
        C6_SYSTEM_PROMPT,
        JSON.stringify(c6Input),
        { role: 'fast', maxTokens: 4000 },
      );

      const adaptedBeats = response.beats ?? [];

      for (const beat of segBeats) {
        const ann = annotMap.get(beat.id);
        const c6Result = adaptedBeats.find(a => a.beatId === beat.id);
        const depth = beat.segmentDepth.toUpperCase();
        const pacing = ann?.beatPacing ?? 'posé';

        // Use C6 result if available, otherwise use pre-processed text as-is
        const adapted = c6Result?.adapted ?? preProcessed.get(beat.id)!;

        allResults.push({
          beatId: beat.id,
          original: beat.narrationChunk,
          adapted,
          fishPreset: depth === 'DEEP' ? 'DEEP'
            : depth === 'FLASH' ? 'FLASH'
            : PACING_TO_PRESET[pacing] ?? 'FOCUS',
        });
      }
    } catch (err) {
      console.warn(`    C6 failed for ${segId}, using fallback: ${(err as Error).message.slice(0, 80)}`);
      // Fallback: pre-processed text without pauses (still clean and pronounceable)
      for (const beat of segBeats) {
        const ann = annotMap.get(beat.id);
        allResults.push({
          beatId: beat.id,
          original: beat.narrationChunk,
          adapted: preProcessed.get(beat.id)!,
          fishPreset: 'FOCUS',
        });
      }
    }
  }

  console.log(`  C6 TTS adaptation: ${allResults.length} beats adapted`);
  return allResults;
}

// ─── Number-to-French converter ─────────────────────────────────

function convertNumbersToFrench(text: string): string {
  const numberToFrench = (n: string): string => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return n;
    if (num === 0) return 'zéro';
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
      'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u];
      if (u === 0) return tens[t] + (t === 8 ? 's' : '');
      if (u === 1 && t !== 8) return tens[t] + ' et un';
      return tens[t] + '-' + units[u];
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      const hPart = h === 1 ? 'cent' : units[h] + ' cent';
      if (rest === 0) return hPart + (h > 1 ? 's' : '');
      return hPart + ' ' + numberToFrench(String(rest));
    }
    if (num < 1000000) {
      const th = Math.floor(num / 1000);
      const rest = num % 1000;
      const thPart = th === 1 ? 'mille' : numberToFrench(String(th)) + ' mille';
      if (rest === 0) return thPart;
      return thPart + ' ' + numberToFrench(String(rest));
    }
    if (num < 1000000000) {
      const mil = Math.floor(num / 1000000);
      const rest = num % 1000000;
      const milPart = mil === 1 ? 'un million' : numberToFrench(String(mil)) + ' millions';
      if (rest === 0) return milPart;
      return milPart + ' ' + numberToFrench(String(rest));
    }
    return n;
  };

  let result = text;
  // Merge space-separated thousands (3 450 → 3450)
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
  }
  // Percentages with decimals
  result = result.replace(/(\d+)[.,](\d+)\s*%/g, (_, a, b) => `${numberToFrench(a)} virgule ${numberToFrench(b)} pour cent`);
  // Percentages without decimals
  result = result.replace(/(\d+)\s*%/g, (_, n) => `${numberToFrench(n)} pour cent`);
  // Prices with decimals
  result = result.replace(/(\d+)[.,](\d+)\s*\$/g, (_, a, b) => `${numberToFrench(a)} dollars ${numberToFrench(b)}`);
  // Prices without decimals
  result = result.replace(/(\d+)\s*\$/g, (_, n) => `${numberToFrench(n)} dollars`);
  // Euro prices
  result = result.replace(/(\d+)[.,](\d+)\s*€/g, (_, a, b) => `${numberToFrench(a)} euros ${numberToFrench(b)}`);
  result = result.replace(/(\d+)\s*€/g, (_, n) => `${numberToFrench(n)} euros`);
  // Plain numbers
  result = result.replace(/\b(\d{1,9})\b/g, (_, n) => numberToFrench(n));
  return result;
}
