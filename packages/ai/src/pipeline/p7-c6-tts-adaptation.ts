/**
 * P7 — C6 Haiku : Adaptation TTS
 *
 * Prend les beats annotés (P7a.5) et adapte le texte de narration
 * pour Fish Audio S2-Pro :
 *   - Injection de tags émotionnels ([grave], [calme], [emphase]...)
 *   - Raccourcissement des phrases > 20 mots
 *   - Suppression des références visuelles ("comme on le voit")
 *   - Ajout de [pause] aux transitions
 *   - Respect du beatPacing et de l'emotion annotés
 *
 * Coût : ~$0.01/épisode (Haiku, ~40 beats × ~100 tokens)
 */

import type { BeatEmotion } from '@yt-maker/core';
import { generateStructuredJSON } from '../llm-client';
import type { BeatAnnotation } from './p7a5-beat-annotator';

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
    emotion: BeatEmotion;
    pacing: string;
    depth: string;
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

// ─── Emotion → Fish Audio tag mapping ───────────────────────────

const EMOTION_TAG_MAP: Record<BeatEmotion, string> = {
  tension: '[grave]',
  impact: '[emphase]',
  revelation: '[emphase]',
  analyse: '[calme]',
  contexte: '',
  respiration: '[calme]',
  conclusion: '[calme]',
};

const PACING_TO_PRESET: Record<string, TTSBeat['fishPreset']> = {
  rapide: 'FLASH',
  posé: 'FOCUS',
  lent: 'DEEP',
};

// ─── System Prompt ──────────────────────────────────────────────

const C6_SYSTEM_PROMPT = `Tu es un adaptateur de texte pour synthèse vocale (TTS) Fish Audio S2-Pro.

## Ton rôle
Transformer la narration écrite en texte optimisé pour être LU À VOIX HAUTE par un narrateur d'âge mûr, posé, style professoral.

## Tags disponibles (Fish Audio S2 — crochets)
- [grave] — ton sérieux, solennel (pour chiffres négatifs, risques, VIX élevé)
- [calme] — posé, mesuré (analyses, explications techniques)
- [emphase] — insistance sur le mot/phrase suivant (chiffres clés, surprises)
- [triste] — ton solennel (pertes, records négatifs)
- [confident] — assuré (conclusions, prédictions)
- [pause] — silence court (avant un chiffre clé, transition)

INTERDIT : [whispering], [shouting], [laughing] — ces tags produisent un rendu artificiel.

## Règles strictes

1. **Tags en DÉBUT de phrase** : "[grave] Le VIX explose." PAS "Le [grave] VIX explose."
2. **Max 1 tag émotion par phrase**. On peut ajouter [pause] séparément.
3. **Phrases > 20 mots** : couper en 2 phrases distinctes.
4. **Supprimer** les références visuelles : "comme vous pouvez le voir", "sur ce graphique", "observez".
5. **Ajouter [pause]** : entre les segments, avant un chiffre clé, après une révélation.
6. **Ne PAS changer le sens** — reformuler pour l'oral, pas réécrire.
7. **isSegmentStart=true** → commencer par [pause] pour marquer la transition.
8. **isKeyMoment=true** → utiliser [emphase] ou [grave] selon le contexte.
9. **Garder la prose française naturelle** — pas de bullet points, pas de tirets.
10. **CHIFFRES → LETTRES** : TOUS les nombres doivent être écrits en toutes lettres. "105$" → "cent cinq dollars". "4,34%" → "quatre virgule trente-quatre pour cent". "48 heures" → "quarante-huit heures". C'est OBLIGATOIRE, le TTS ne sait pas lire les chiffres.
11. **MOTS ANGLAIS → PHONÉTIQUE FR** : Écrire les mots anglais comme ils se PRONONCENT en français. "stablecoin" → "stéïbeul coïne". "spread" → "sprède". "squeeze" → "squize". "rally" → "rallye". "dovish" → "doviche". "hawkish" → "hokiche". "breakout" → "brèk-aoutt". Tous les mots anglais dans le texte financier doivent être phonétisés.
12. **SIGLES** : Séparer les lettres avec des points. "ETF" → "É.T.F.". "USDC" → "U.S.D.C.". "RSI" → "R.S.I.". "Fed" → "Fède". "S&P" → "S. ande P.".

## Exemples

Input: "L'or enregistre sa pire semaine en 40 ans avec une baisse de -9%, un chiffre historique."
Output: "[emphase] L'or enregistre sa pire semaine en quarante ans. [pause] [grave] Moins neuf pour cent. Un chiffre historique."

Input: "Le spread du Brent s'est resserré à 2.5$ après le short squeeze, le Fear & Greed reste à 11."
Output: "[calme] Le sprède du Brent s'est resserré à deux dollars cinquante après le shorte squize. [pause] Le Fir ande Gride reste à onze."

Input: "Le S&P 500 a reculé de 1.5% hier, entraîné par les valeurs technologiques comme on peut le voir sur le graphique."
Output: "[grave] Le S. ande P. cinq cents a reculé de un virgule cinq pour cent hier. [calme] Les valeurs technologiques ont mené la baisse."

## Output JSON

\`\`\`json
{
  "beats": [
    { "beatId": "beat_001", "adapted": "[grave] Texte adapté..." },
    { "beatId": "beat_002", "adapted": "[calme] Suite..." }
  ]
}
\`\`\``;

// ─── Main function ──────────────────────────────────────────────

/**
 * Adapte les narrations pour Fish Audio TTS.
 * Traite par segments pour rester dans les limites de tokens Haiku.
 *
 * @param beats - Beats bruts avec narrationChunk
 * @param annotations - Annotations P7a.5 (emotion, pacing, isKeyMoment)
 * @returns TTSBeat[] avec texte adapté + preset Fish Audio
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

    const c6Input: C6Input = {
      beats: segBeats.map(b => {
        const ann = annotMap.get(b.id);
        return {
          beatId: b.id,
          narration: b.narrationChunk,
          emotion: ann?.emotion ?? 'contexte',
          pacing: ann?.beatPacing ?? 'posé',
          depth: b.segmentDepth,
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
        const adapted = adaptedBeats.find(a => a.beatId === beat.id);
        const depth = beat.segmentDepth.toUpperCase();
        const pacing = ann?.beatPacing ?? 'posé';

        allResults.push({
          beatId: beat.id,
          original: beat.narrationChunk,
          adapted: adapted?.adapted ?? fallbackAdapt(beat.narrationChunk, ann),
          fishPreset: depth === 'DEEP' ? 'DEEP'
            : depth === 'FLASH' ? 'FLASH'
            : PACING_TO_PRESET[pacing] ?? 'FOCUS',
        });
      }
    } catch (err) {
      console.warn(`    C6 failed for ${segId}, using fallback: ${(err as Error).message.slice(0, 80)}`);
      for (const beat of segBeats) {
        const ann = annotMap.get(beat.id);
        allResults.push({
          beatId: beat.id,
          original: beat.narrationChunk,
          adapted: fallbackAdapt(beat.narrationChunk, ann),
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
    if (num < 10000) {
      const th = Math.floor(num / 1000);
      const rest = num % 1000;
      const thPart = th === 1 ? 'mille' : numberToFrench(String(th)) + ' mille';
      if (rest === 0) return thPart;
      return thPart + ' ' + numberToFrench(String(rest));
    }
    return n;
  };

  let result = text;
  // Percentages with decimals
  result = result.replace(/(\d+)[.,](\d+)\s*%/g, (_, a, b) => `${numberToFrench(a)} virgule ${numberToFrench(b)} pour cent`);
  // Percentages without decimals
  result = result.replace(/(\d+)\s*%/g, (_, n) => `${numberToFrench(n)} pour cent`);
  // Prices with decimals
  result = result.replace(/(\d+)[.,](\d+)\s*\$/g, (_, a, b) => `${numberToFrench(a)} dollars ${numberToFrench(b)}`);
  // Prices without decimals
  result = result.replace(/(\d+)\s*\$/g, (_, n) => `${numberToFrench(n)} dollars`);
  // Plain numbers
  result = result.replace(/\b(\d{1,4})\b/g, (_, n) => numberToFrench(n));
  return result;
}

// ─── Fallback mécanique (si Haiku échoue) ───────────────────────

function fallbackAdapt(text: string, ann?: BeatAnnotation): string {
  let adapted = text;

  // Convert numbers to French first
  adapted = convertNumbersToFrench(adapted);

  // Supprimer références visuelles
  adapted = adapted.replace(/comme (vous pouvez |on (peut )?)?le (voir|constater) (sur (le|ce) graphique)?/gi, '');
  adapted = adapted.replace(/observez /gi, '');
  adapted = adapted.replace(/ci-dessous/gi, '');
  adapted = adapted.replace(/\s{2,}/g, ' ').trim();

  // Ajouter tag émotion basé sur annotation
  if (ann) {
    const tag = EMOTION_TAG_MAP[ann.emotion];
    if (tag) {
      adapted = `${tag} ${adapted}`;
    }
  }

  // Ajouter [pause] en début de segment
  if (ann?.isKeyMoment) {
    adapted = `[pause] ${adapted}`;
  }

  return adapted;
}
