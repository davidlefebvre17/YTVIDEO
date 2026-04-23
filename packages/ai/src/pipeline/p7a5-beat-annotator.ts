import type { OverlayType, BeatEmotion, DailySnapshot } from "@yt-maker/core";
import type { RawBeat, SegmentAnalysis, AnalysisBundle } from "./types";
import { generateStructuredJSON } from "../llm-client";

// ─── Types ──────────────────────────────────────────────────────────────

export interface BeatAnnotation {
  beatId: string;
  primaryAsset: string | null;
  overlayType: OverlayType | 'none';
  overlaySpec: Record<string, unknown> | null;
  triggerWord: string | null;
  emotion: BeatEmotion;
  visualScale: 'macro' | 'moyen' | 'micro';
  beatPacing: 'rapide' | 'posé' | 'lent';
  overlayAnimation: 'pop' | 'slide_up' | 'fade' | 'count_up';
  isKeyMoment: boolean;
}

interface HaikuAnnotationRequest {
  assets: Array<{ symbol: string; name: string; price: number; changePct: number; rsi?: number }>;
  segments: Array<{
    id: string;
    topic: string;
    causalChain?: string;
    scenarios?: { bullish: { target: string; condition: string }; bearish: { target: string; condition: string } };
    technicalReading?: string;
    coreMechanism?: string;
  }>;
  beats: Array<{
    id: string;
    segmentId: string;
    narrationChunk: string;
    durationSec: number;
    depth: string;
    isSegmentStart: boolean;
    isSegmentEnd: boolean;
  }>;
  specialBlocks: Array<{ type: string; narrationChunk: string }>;
}

interface HaikuAnnotationResponse {
  annotations: Array<{
    beatId: string;
    primaryAsset: string | null;
    overlayType: string;
    overlaySpec: Record<string, unknown> | null;
    triggerWord: string | null;
    emotion: string;
    visualScale: string;
    beatPacing: string;
    overlayAnimation: string;
    isKeyMoment: boolean;
  }>;
}

// ─── Main Function ──────────────────────────────────────────────────────

export async function annotateBeats(
  beats: RawBeat[],
  snapshot: DailySnapshot,
  analysis: AnalysisBundle,
): Promise<BeatAnnotation[]> {
  try {
    // Build compact input for Haiku
    const haikuInput = buildHaikuInput(beats, snapshot, analysis);

    // Call Haiku per segment to avoid token overflow
    const allAnnotations: BeatAnnotation[] = [];
    const segmentIds = [...new Set(beats.map(b => b.segmentId))];

    for (const segId of segmentIds) {
      const segBeats = beats.filter(b => b.segmentId === segId);
      const segInput = buildHaikuInput(segBeats, snapshot, analysis);

      console.log(`    P7a.5 segment ${segId}: ${segBeats.length} beats...`);

      const response = await generateStructuredJSON<BeatAnnotation[] | { annotations: BeatAnnotation[] }>(
        SYSTEM_PROMPT_ANNOTATOR,
        JSON.stringify(segInput),
        { role: 'fast', maxTokens: 4000 },
      );

      // Handle both array and { annotations: [...] } format
      const rawAnns = Array.isArray(response) ? response : (response as any).annotations ?? [];
      const validated = validateAnnotations(rawAnns, segBeats, snapshot);
      // PANORAMA beats: force overlayType='none' — visuals handled by StampOverlay
      if (segId === 'seg_panorama') {
        for (const ann of validated) {
          ann.overlayType = 'none';
          ann.overlaySpec = null;
        }
      }
      allAnnotations.push(...validated);
    }

    return allAnnotations;
  } catch (err) {
    console.warn(`Beat annotation failed: ${err instanceof Error ? err.message : String(err)}. Returning fallback.`);
    return beats.map(beat => ({
      beatId: beat.id,
      primaryAsset: null,
      overlayType: 'none',
      overlaySpec: null,
      triggerWord: null,
      emotion: 'contexte' as BeatEmotion,
      visualScale: 'moyen',
      beatPacing: 'posé',
      overlayAnimation: 'fade',
      isKeyMoment: false,
    }));
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT_ANNOTATOR = `Tu es un expert en annotation de séquences vidéo de trading. Ton rôle est d'enrichir chaque beat (moment de narration) avec des directives visuelles précises pour le rendu Remotion.

## Tâches

Pour CHAQUE beat:

1. **primaryAsset** (string|null): Identifie l'actif principal mentionné (symbole ticker exact). Résous les pronoms en lisant les beats précédents. Si aucun actif: null.

2. **overlayType** (enum): Classe le type d'overlay visuel. RESPECTE CET ORDRE DE PRIORITÉ — en cas de doute, choisis le type le plus haut dans la liste :

   **PRIORITÉ 1 — GRAPHIQUES (c'est une chaîne de FINANCE, le spectateur veut VOIR les courbes) :**
   - 'chart': Dès qu'un PRIX, NIVEAU technique, support, résistance, SMA, moyenne mobile, ou seuil est mentionné → TOUJOURS chart. C'est le type par DÉFAUT pour une chaîne financière. Inclure levels dans overlaySpec. Si la narration parle d'un actif et de son prix, c'est un chart.
   - 'spread_chart': Quand la narration parle d'un SPREAD ou ÉCART entre deux actifs. Affiche les deux courbes superposées.
   - 'gauge': RSI extrême (<30 ou >70), Fear&Greed, VIX → jauge circulaire

   **PRIORITÉ 2 — DONNÉES :**
   - 'stat': Quand la narration donne un CHIFFRE CLÉ (variation %, volume) SANS prix ni niveau technique → stat avec count-up animé
   - 'comparison': Quand la narration COMPARE explicitement 2+ actifs côte à côte

   **PRIORITÉ 3 — CONTEXTE :**
   - 'causal_chain': UNIQUEMENT quand la narration explique un mécanisme cause→effet ET qu'aucun prix/niveau n'est mentionné dans le beat. Si un prix est cité dans le même beat, utiliser 'chart' à la place.
   - 'scenario_fork': Quand la narration présente des SCÉNARIOS haussier/baissier avec cibles
   - 'headline': Quand la narration cite une ACTUALITÉ spécifique ou déclaration politique
   - 'none': Transitions, contexte général, respiration — pas de données à afficher

   RÈGLE CRITIQUE : dès que la narration cite un PRIX ou NIVEAU (ex: "à 6506", "SMA 200 à 6624", "résistance à 99", "RSI à 30", "clôture à 88 dollars"), c'est TOUJOURS un chart ou gauge, JAMAIS stat, causal_chain, ou none. Le CHART est le cœur visuel de la chaîne — vise minimum 25% de beats avec chart/spread_chart.

3. **overlaySpec** (object|null): Données structurées type-spécifiques:
   - chart: { asset, levels: [support, resistance], type: "price_line"|"zone_highlight"|... }
   - stat: { asset, value, unit, format: "%" ou "€" }
   - causal_chain: { steps: ["step1", "step2", ...] } — les maillons du raisonnement que le narrateur explique DANS CE BEAT. Chaque step = un maillon logique. Illustre la parole en cours.
   - scenario_fork: { trunk: "question courte max 60 chars", asset: "SYMBOL", bullTarget: "prix COURT max 15 chars (ex: 'Or 4800$', 'WTI < 90$')", bullCondition: "condition max 50 chars", bearTarget: "prix COURT max 15 chars", bearCondition: "condition max 50 chars" }
   - gauge: { type: "rsi"|"fear_greed", value, asset }
   - comparison: { assets: [symbol1, symbol2], values: [val1, val2] }
   - spread_chart: { asset1: "CL=F", asset2: "BZ=F", label: "Spread WTI-Brent" } pour des actifs du snapshot, OU { asset1: "DGS10", asset2: "DGS2", label: "Courbe des taux 10Y-2Y" } pour les yields FRED. NE PAS inventer de symboles — utiliser les symboles Yahoo existants ou DGS10/DGS2/T10Y2Y pour les yields.
   - headline: { text, actor?, source? }
   - none: null

4. **triggerWord** (string|null): Mot EXACT du narrationChunk qui déclenche l'overlay. Extrais du texte français (ex: "baisse", "pic", "rebond").

5. **emotion** (enum): Ton émotionnel du beat:
   - 'tension': Suspense, zone dangereuse
   - 'impact': Nouvelle majeura choc
   - 'revelation': Insight inattendu
   - 'analyse': Ton pédagogique, neutre
   - 'contexte': Background, contextuel
   - 'respiration': Pause, relief après tension
   - 'conclusion': Fermeture, résolution

6. **visualScale** (enum):
   - 'macro': Vue globale (indices, corrélations multi-asset)
   - 'moyen': Secteur/couple de devises
   - 'micro': Single asset, détail technique

7. **beatPacing** (enum):
   - 'rapide': Débit rapide, urgent (news, events)
   - 'posé': Pédagogique, analytique
   - 'lent': Dramatique, grave

8. **overlayAnimation** (enum):
   - 'pop': Apparition instantanée
   - 'slide_up': Coulisse vers le haut
   - 'fade': Fondu (default, safe)
   - 'count_up': Numération animée (stat seulement)

9. **isKeyMoment** (boolean): true si beat majeur (max 5 par épisode). Critères: chiffre clé, annonce politique, pic dramatique.

## Contraintes

- **Chaîne causale = ce que le narrateur enseigne MAINTENANT**: Si overlayType='causal_chain', lis le narrationChunk du beat et extrais le MÉCANISME que le narrateur est en train d'expliquer. Les steps illustrent la logique de la narration en cours, pas un résumé du segment. Si le narrateur dit "quand les taux montent, l'or perd de son attrait", les steps doivent être : "Taux réels montent → Coût d'opportunité augmente → Or moins attractif vs obligations → Pression vendeuse". Chaque step est un maillon du raisonnement, pas un fait daté.
- **Extraction numérique**: "un virgule cinquante et un pour cent" → {value: 1.51, format: "%"}
- **Ratio overlay**: Max 65% de beats avec overlay (non-'none'). Minimum 25% de beats avec chart ou spread_chart — le spectateur regarde une chaîne de FINANCE, il veut voir des courbes.
- **Pas 3 consécutifs**: Interdiction de 3 beats consécutifs avec le même overlayType
- **causal_chain ≤ 15%**: Ne pas sur-indexer sur les chaînes causales textuelles — si tu hésites entre causal_chain et chart, choisis chart.
- **Asset validation**: primaryAsset doit exister dans la snapshot ou être null
- **triggerWord**: Doit être trouvé dans narrationChunk (case-insensitive)
- **Stat plausibilité**: % ≤ 50, niveaux chart ±50% autour du prix spot
- **Key moments**: Max 5, échelonnés, pas de faux positifs

## Output JSON — ARRAY PLAT (pas d'objet wrapper)

\`\`\`json
[
  {
    "beatId": "beat_001",
    "primaryAsset": "GC=F",
    "overlayType": "stat",
    "overlaySpec": { "value": -9, "suffix": "%", "label": "Gold" },
    "triggerWord": "neuf",
    "emotion": "impact",
    "visualScale": "micro",
    "beatPacing": "lent",
    "overlayAnimation": "count_up",
    "isKeyMoment": true
  }
]
\`\`\`

IMPORTANT: Retourne un JSON ARRAY directement, PAS un objet { "annotations": [...] }.`;

// ─── Input Builder ──────────────────────────────────────────────────────

function buildHaikuInput(beats: RawBeat[], snapshot: DailySnapshot, analysis: AnalysisBundle): HaikuAnnotationRequest {
  // Filter assets: ne garder que ceux pertinents pour les segments traités
  // (assets C2 analysis + primaryAssets beats). Avant : injectait les 38-50 assets
  // de la watchlist à CHAQUE appel (×10 segments) = ~3k chars × 10 gaspillés.
  const relevantSymbols = new Set<string>();
  const beatSegIds = new Set(beats.map(b => b.segmentId));
  for (const seg of analysis.segments) {
    if (beatSegIds.has(seg.segmentId)) {
      // Derive assets from chartInstructions (contient `asset` par chart)
      for (const inst of seg.chartInstructions ?? []) {
        if (inst.asset) relevantSymbols.add(inst.asset);
      }
    }
  }
  for (const b of beats) {
    if ((b as any).primaryAsset) relevantSymbols.add((b as any).primaryAsset);
  }
  // Fallback minimal si aucun asset identifié : garder les indices majeurs pour contexte
  if (relevantSymbols.size === 0) {
    ['^GSPC', '^VIX', 'GC=F', 'CL=F'].forEach(s => relevantSymbols.add(s));
  }

  // Asset price table (compact, filtered)
  const assets = snapshot.assets
    .filter(a => relevantSymbols.has(a.symbol))
    .map(a => ({
      symbol: a.symbol,
      name: a.name,
      price: a.price,
      changePct: a.changePct,
      rsi: a.technicals?.rsi14,
    }));

  // Segments with C2 data
  const segments = analysis.segments.map(seg => ({
    id: seg.segmentId,
    topic: seg.narrativeHook || 'N/A',
    causalChain: seg.causalChain,
    scenarios: seg.scenarios,
    technicalReading: seg.technicalReading,
    coreMechanism: seg.coreMechanism,
  }));

  // Beats per segment
  const beatsBySegment = beats.map(b => ({
    id: b.id,
    segmentId: b.segmentId,
    narrationChunk: b.narrationChunk,
    durationSec: b.durationSec,
    depth: b.segmentDepth,
    isSegmentStart: b.isSegmentStart,
    isSegmentEnd: b.isSegmentEnd,
  }));

  // Special blocks (hook, title_card, thread, closing) — for context
  const specialBlocks = beats
    .filter(b => ['hook', 'title_card', 'thread', 'closing'].includes(b.segmentId))
    .map(b => ({
      type: b.segmentId,
      narrationChunk: b.narrationChunk,
    }));

  return {
    assets,
    segments,
    beats: beatsBySegment,
    specialBlocks,
  };
}

// ─── Validation ──────────────────────────────────────────────────────

function validateAnnotations(
  raw: HaikuAnnotationResponse['annotations'],
  beats: RawBeat[],
  snapshot: DailySnapshot,
): BeatAnnotation[] {
  const symbols = new Set(snapshot.assets.map(a => a.symbol));
  const validated: BeatAnnotation[] = [];
  let keyMomentCount = 0;
  let lastThreeTypes: string[] = [];

  for (const ann of raw) {
    const beat = beats.find(b => b.id === ann.beatId);
    if (!beat) continue;

    // Normalize emotion
    const emotion = normalizeEmotion(ann.emotion as string);

    // Validate primaryAsset
    const primaryAsset = ann.primaryAsset && symbols.has(ann.primaryAsset) ? ann.primaryAsset : null;

    // Validate triggerWord in narration (case-insensitive)
    const triggerWord = ann.triggerWord && beat.narrationChunk.toLowerCase().includes(ann.triggerWord.toLowerCase())
      ? ann.triggerWord
      : null;

    // Validate overlayType
    const overlayType = isValidOverlayType(ann.overlayType) ? (ann.overlayType as OverlayType) : 'none';

    // Validate overlaySpec based on type
    const overlaySpec = validateOverlaySpec(overlayType, ann.overlaySpec, snapshot);

    // Track 3 consecutive overlay types
    lastThreeTypes.push(overlayType);
    if (lastThreeTypes.length > 3) lastThreeTypes.shift();
    let isKeyMoment = ann.isKeyMoment && keyMomentCount < 5;

    // Enforce no 3 consecutive same type
    if (lastThreeTypes.length === 3 && lastThreeTypes[0] === lastThreeTypes[1] && lastThreeTypes[1] === lastThreeTypes[2]) {
      isKeyMoment = false;
    } else if (ann.isKeyMoment && keyMomentCount < 5) {
      isKeyMoment = true;
      keyMomentCount++;
    }

    // Normalize enums
    const visualScale = ['macro', 'moyen', 'micro'].includes(ann.visualScale) ? (ann.visualScale as any) : 'moyen';
    const beatPacing = ['rapide', 'posé', 'lent'].includes(ann.beatPacing) ? (ann.beatPacing as any) : 'posé';
    const overlayAnimation = ['pop', 'slide_up', 'fade', 'count_up'].includes(ann.overlayAnimation)
      ? (ann.overlayAnimation as any)
      : 'fade';

    validated.push({
      beatId: ann.beatId,
      primaryAsset,
      overlayType,
      overlaySpec,
      triggerWord,
      emotion,
      visualScale,
      beatPacing,
      overlayAnimation,
      isKeyMoment,
    });
  }

  return validated;
}

function normalizeEmotion(raw: string): BeatEmotion {
  const valid: BeatEmotion[] = ['tension', 'impact', 'revelation', 'analyse', 'contexte', 'respiration', 'conclusion'];
  return valid.includes(raw as BeatEmotion) ? (raw as BeatEmotion) : 'contexte';
}

function isValidOverlayType(type: string): boolean {
  const valid = ['chart', 'stat', 'causal_chain', 'scenario_fork', 'gauge', 'comparison', 'spread_chart', 'headline', 'none'];
  return valid.includes(type);
}

function validateOverlaySpec(type: string, spec: any, snapshot: DailySnapshot): Record<string, unknown> | null {
  if (type === 'none' || !spec) return null;

  // Basic validation by type
  if (type === 'stat' && spec.value !== undefined) {
    // Cap percentage values
    if (spec.format === '%' && Math.abs(spec.value) > 50) {
      spec.value = Math.sign(spec.value) * 50;
    }
  }

  if (type === 'chart' && spec.asset && spec.levels) {
    const asset = snapshot.assets.find(a => a.symbol === spec.asset);
    if (asset && Array.isArray(spec.levels)) {
      // Validate levels within 50%-200% of current price
      spec.levels = spec.levels.map((lv: number) => {
        const ratio = lv / asset.price;
        if (ratio < 0.5) return asset.price * 0.5;
        if (ratio > 2) return asset.price * 2;
        return lv;
      });
    }
  }

  return spec;
}
