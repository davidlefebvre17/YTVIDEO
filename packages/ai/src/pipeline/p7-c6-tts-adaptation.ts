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
  tension: '',
  impact: '[emphasis]',
  revelation: '[emphasis]',
  analyse: '',
  contexte: '',
  respiration: '',
  conclusion: '',
};

const PACING_TO_PRESET: Record<string, TTSBeat['fishPreset']> = {
  rapide: 'FLASH',
  posé: 'FOCUS',
  lent: 'DEEP',
};

// ─── System Prompt ──────────────────────────────────────────────

const C6_SYSTEM_PROMPT = `Tu es un adaptateur de texte pour synthèse vocale (TTS) Fish Audio S2-Pro.

## Ton rôle
Transformer la narration écrite en texte vivant pour l'oreille. Tu places des tags d'intonation DEVANT les mots clés pour guider la voix.

## Tags Fish Audio S2 — UNIQUEMENT ces 3 tags
- [emphasis] — insistance sur le mot qui suit. 2-4 par beat max. Sur les chiffres importants, les mots de surprise, les contrastes.
- [pause] — silence court. Entre deux idées, avant un chiffre clé, après une révélation.
- [long pause] — silence plus long. Entre deux sous-parties d'un segment, ou avant un retournement.

PAS D'AUTRES TAGS. Pas de [soft], [breathy], [whispering], [excited], [sighing]. Ils déforment la voix.

## Règles

1. **[emphasis] DEVANT le mot** : "un aller-retour de [emphasis]quinze dollars". Le tag accentue le MOT qui le suit immédiatement.
2. **2-4 [emphasis] par beat** — pas plus. Choisis les mots qui COMPTENT.
3. **[pause] entre les idées** — pas à chaque phrase. Avant un chiffre clé, après une révélation.
4. **Phrases > 20 mots** : couper en 2 phrases distinctes.
5. **Supprimer** les références visuelles : "comme tu peux le voir", "sur ce graphique".
6. **Ne PAS changer le sens** — reformuler pour l'oral, pas réécrire.
7. **isSegmentStart=true** → commencer par [pause].
8. **isSegmentEnd=true** → ajouter [long pause] avant les 2-3 derniers mots ET terminer par un point final bien marqué. La dernière phrase doit être COURTE et CONCLUSIVE.
9. **isKeyMoment=true** → utiliser [emphasis] sur le mot clé.
10. **CHIFFRES → LETTRES** : TOUS les nombres en toutes lettres. C'est OBLIGATOIRE.
11. **MOTS ANGLAIS** : phonétiser pour qu'un francophone lise la prononciation anglaise correcte. Exemples : "spread" → "sprèdd", "squeeze" → "skouize", "pricing" → "praïcingue", "pricé" → "praïcé", "price" → "praïce", "bull run" → "boull reune", "dead cat bounce" → "dèdd catt baounce", "hedge" → "hèdje", "hedging" → "hèdjingue", "trader" → "trèdeur", "short" → "shorte", "spike" → "spikke", "spot" → "spotte", "move" → "mouve". Applique ce principe à TOUT mot anglais, même conjugué en français ("pric��", "pricait", "shortait").
12. **NOMS DE SOCIÉTÉS ÉTRANGÈRES** : phonétiser. "Nvidia" → "Ènvidia", "Sysco" ��� "Saïsko", "Ciena" → "Siéna", "Teradyne" → "Téradaïne", "Micron" → "Maïkronne", "Coinbase" → "Coïnbèïse", "BlackRock" → "Blakroke", "JPMorgan" → "Djéï-Pi Morganne". Noms français (TotalEnergies, Pernod Ricard) inchangés.
13. **INDICES ET MOTS-SIGLES** (se prononcent comme des MOTS, PAS épelés lettre par lettre) : "S&P" ��� "èss-enne-pi", "CAC 40" → "caque quarante", "DAX" → "daxe", "FTSE" → "fouttsi", "Nasdaq" → "nazdak", "Dow Jones" → "daou djonnze", "Nikkei" → "nikèï", "VIX" → "vixe", "ETF" → laisser "ETF", "Russell 2000" → "reussèl deux mille".
14. **SIGLES ÉPELÉS** (se prononcent lettre par lettre, séparés par des points) : "WTI" → "W.T.I.", "RSI" → "R.S.I.", "DXY" → "D.X.Y.", "COT" → "C.O.T.", "PMI" → "P.M.I.", "CPI" → "C.P.I.", "BCE" → "B.C.E.", "PIB" → "P.I.B.".
15. **BANQUES CENTRALES** : "BoJ" → "Boge" (PAS "B.C.E." — la BoJ est la banque du Japon, la BCE est européenne), "Fed" → "Fède", "BCE" → "B.C.E.", "BoE" → "bi-eau-i", "PBoC" → "pi-bi-eau-ci".

## Exemples

Input: "Le Brent a touché 105$ hier — un aller-retour de 15$ en moins de 48 heures."
Output: "Le Brent a touché [emphasis]cent cinq dollars hier. [pause] Un aller-retour de [emphasis]quinze dollars en moins de quarante-huit heures."

Input: "L'or enregistre sa pire semaine en 40 ans avec une baisse de -9%."
Output: "L'or enregistre sa [emphasis]pire semaine en quarante ans. [pause] Moins neuf pour cent."

Input: "Le marché avait pricé la reconquête. Le VIX est à 23."
Output: "Le marché avait [emphasis]praïcé la reconquête. Le vixe est à vingt-trois."

## Output JSON

\`\`\`json
{
  "beats": [
    { "beatId": "beat_001", "adapted": "[pause] Texte adapté..." },
    { "beatId": "beat_002", "adapted": "Suite du texte..." }
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

        const rawAdapted = adapted?.adapted ?? fallbackAdapt(beat.narrationChunk, ann);
        allResults.push({
          beatId: beat.id,
          original: beat.narrationChunk,
          adapted: applyPronunciationFixes(rawAdapted),
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
          adapted: applyPronunciationFixes(fallbackAdapt(beat.narrationChunk, ann)),
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
  // First: merge space-separated thousands (3 450 → 3450, 1 000 000 → 1000000)
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
  // Plain numbers (up to 999 999 999)
  result = result.replace(/\b(\d{1,9})\b/g, (_, n) => numberToFrench(n));
  return result;
}

// ─── Pronunciation fixes (Fish Audio quirks) ────────────────────

/**
 * Words Fish Audio mispronounces or reads in wrong language.
 * Key = word as written, Value = phonetic hint for Fish Audio.
 */
const PRONUNCIATION_FIXES: [RegExp, string][] = [
  // Fish Audio stutters on "grimpe" → force clean pronunciation
  [/\bgrimpe\b/gi, 'grimp'],
  [/\bgrimpé\b/gi, 'grimpé'],
  [/\bgrimper\b/gi, 'grimper'],
  // English finance terms Fish Audio reads as French
  [/\bpricer\b/gi, 'praille-cé'],
  [/\bpricing\b/gi, 'praille-cingue'],
  [/\bpricé\b/gi, 'praïcé'],
  [/\bprice\b/gi, 'praïce'],
  [/\bpricait\b/gi, 'praïcait'],
  [/\bpricent\b/gi, 'praïcent'],
  [/\bspread\b/gi, 'sprèdd'],
  [/\bshort squeeze\b/gi, 'shorte skouize'],
  [/\bsqueeze\b/gi, 'skouize'],
  [/\bdead cat bounce\b/gi, 'dèdd catt baounnce'],
  [/\bdeath cross\b/gi, 'dèss crosse'],
  [/\bbull run\b/gi, 'boull reune'],
  [/\bbullish\b/gi, 'boulliche'],
  [/\bbearish\b/gi, 'bèriche'],
  [/\brisk-off\b/gi, 'risque-off'],
  [/\brisk-on\b/gi, 'risque-on'],
  [/\bhedge\b/gi, 'hèdje'],
  [/\bhedging\b/gi, 'hèdjingue'],
  [/\btrading\b/gi, 'trèdingue'],
  [/\btrader\b/gi, 'trèdeur'],
  [/\btraders\b/gi, 'trèdeurse'],
  // Indices boursiers (both raw and post-sanitize forms)
  [/\bS&P 500\b/gi, 'èss-enne-pi cinq cents'],
  [/\bS\. and P\./g, 'èss-enne-pi'],
  [/\bS&P\b/gi, 'èss-enne-pi'],
  [/\bCAC 40\b/gi, 'caque quarante'],
  [/\bC\.A\.C\./g, 'caque'],
  [/\bCAC\b/g, 'caque'],
  [/\bDAX\b/gi, 'daxe'],
  [/\bD\.A\.X\./g, 'daxe'],
  [/\bFTSE\b/gi, 'fouttsi'],
  [/\bF\.T\.S\.E\./g, 'fouttsi'],
  [/\bKOSPI\b/gi, 'kospi'],
  [/\bNasdaq\b/gi, 'nazdak'],
  [/\bDow Jones\b/gi, 'daou djonnze'],
  [/\bNikkei\b/gi, 'nikèï'],
  [/\bVIX\b/gi, 'vixe'],
  [/\bV\.I\.X\./g, 'vixe'],
  [/\bRussell 2000\b/gi, 'reussèl deux mille'],
  [/\bMSCI\b/gi, 'èmm-èss-ci-aï'],
  [/\bM\.S\.C\.I\./g, 'èmm-èss-ci-aï'],
  // Mots prononcés tels quels (pas épelés) — rattrapage post-sanitize
  [/\bE\.T\.F\./g, 'ETF'],
  [/\bÉ\.T\.F\./g, 'ETF'],
];

function applyPronunciationFixes(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PRONUNCIATION_FIXES) {
    result = result.replace(pattern, replacement);
  }
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
