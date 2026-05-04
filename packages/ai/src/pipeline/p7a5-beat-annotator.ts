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
  /** Variant visuel optionnel — null = default. Validé/sanitisé côté code. */
  variant?: string | null;
}

/** Mapping des variants autorisés par overlayType. */
const ALLOWED_VARIANTS: Record<string, string[]> = {
  stat: ['stamp-press', 'avalanche'],
  causal_chain: ['domino'],
  gauge: ['strip', 'liquid'],
  comparison: ['sparklines', 'lane-race'],
  headline: ['tabloid'],
  scenario_fork: ['battle'],
  heatmap: ['treemap'],
};

/** Variants à parcimonie (max 2 par épisode). */
const HIGH_IMPACT_VARIANTS = new Set(['stamp-press', 'tabloid', 'battle']);

interface HaikuAnnotationRequest {
  assets: Array<{ symbol: string; name: string; price: number; changePct: number; rsi?: number }>;
  segments: Array<{
    id: string;
    topic: string;
    /** Authoritative list of tickers this segment can reference. Haiku MUST
     *  pick overlay symbols from this list (or from beat.assets) — never
     *  invent a ticker. */
    assets: string[];
    causalChain?: string;
    scenarios?: { bullish: { target: string; condition: string }; bearish: { target: string; condition: string } };
    technicalReading?: string;
    coreMechanism?: string;
  }>;
  beats: Array<{
    id: string;
    segmentId: string;
    narrationChunk: string;
    /** Tickers explicitly bound to this beat by C3/C5. Haiku MUST pick the
     *  overlay symbol from this list when the beat references a single asset. */
    assets: string[];
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
    variant?: string | null;
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

## LANGUE — RÈGLE NON NÉGOCIABLE

**TOUS les textes destinés à l'écran doivent être écrits EN FRANÇAIS.** Sans exception. Cela inclut chaque champ texte de overlaySpec : \`label\`, \`steps\`, \`title\`, \`source\`, \`text\`, \`eventLabel\`, \`stake\`, \`trunk\`, \`bullTarget\`, \`bullCondition\`, \`bearTarget\`, \`bearCondition\`, \`name\`, \`sectors[].name\`.

Termes anglais autorisés UNIQUEMENT :
- Noms propres d'entités (Goldman Sachs, Apple, Microsoft)
- Tickers tels quels (^GSPC, CL=F, USDJPY=X)
- Acronymes consacrés (RSI, ATH, ATL, IA, ETF, PIB)
- Préférer les versions françaises quand elles existent : "OPEP" pas "OPEC", "Émirats" pas "UAE", "Arabie saoudite" pas "Saudi", "pétrole WTI" pas "WTI" seul, "Réserve fédérale" pas "Federal Reserve".

JAMAIS de phrase complète en anglais — même si la donnée d'analyse C2 contient des termes anglais. Reformule TOUT en français. Exemples :
- ❌ "UAE exits OPEC" → ✅ "Les Émirats quittent l'OPEP"
- ❌ "Saudi must cut deeper" → ✅ "Riyad doit couper davantage"
- ❌ "Cartel discipline collapse imminent?" → ✅ "Effondrement de la discipline du cartel ?"
- ❌ "Hormuz blockade OR Saudi +500k cuts" → ✅ "Blocus d'Hormuz OU coupe saoudienne +500k"
- ❌ "Iran deal + UAE production disappoints" → ✅ "Accord Iran + production émiratie décevante"
- ❌ "Goldman Sachs upgrades 2026 energy" → ✅ "Goldman Sachs relève ses prévisions énergie 2026"
- ❌ "Each member receives production quota" → ✅ "Chaque membre reçoit un quota de production"
- ❌ label "Gold" → ✅ label "Or"

Avant de finaliser un overlay, relis chaque chaîne de caractères : si elle contient un mot anglais qui a un équivalent français courant, traduis-le.

## NOMBRES — RÈGLES DE FORMATAGE

**Préfère les unités compactes pour les gros chiffres** (le code formatte automatiquement, mais Haiku doit aider en choisissant la bonne unité dès la génération) :
- Ne JAMAIS écrire \`5000000\` brut dans un \`label\`. Préfère \`value=5\` + \`suffix="M b/j"\` ou \`value=5_000_000\` + \`suffix="b/j"\` (le rendu compactera).
- Pour les volumes pétroliers : suffix \`"b/j"\` (barils par jour) plutôt que \`"bbl/day"\`. Le code traduit aussi automatiquement, mais préfère le format court.
- Pour les capitalisations : suffix \`"Md$"\` (200 milliards de dollars) plutôt que \`"$"\` avec \`200_000_000_000\`.
- Pour les pourcentages, suffix \`"%"\`. Pour les niveaux de prix, suffix \`"$"\` ou \`"€"\`.
- **JAMAIS de \`.0\` superflu** : \`value=3\` plutôt que \`value=3.0\`. \`value=14\` plutôt que \`value=14.00\`. Le code retire automatiquement le \`.0\` final, mais ne l'écris pas non plus.

**Labels concis et lisibles** : un label de stat doit tenir en 4-6 mots maximum. Préfère "Quota OPEP des Émirats" à "UAE former OPEC quota" ou "Ancien quota d'extraction des Émirats au sein de l'OPEP". Coupe les acronymes anglais.

## Tâches

Pour CHAQUE beat:

1. **primaryAsset** (string|null): Identifie l'actif principal mentionné (symbole ticker exact). Résous les pronoms en lisant les beats précédents. Si aucun actif: null.

2. **overlayType** (enum): Classe le type d'overlay visuel. RESPECTE CET ORDRE DE PRIORITÉ — en cas de doute, choisis le type le plus haut dans la liste :

   **PRIORITÉ 1 — GRAPHIQUES (c'est une chaîne de FINANCE, le spectateur veut VOIR les courbes) :**
   - 'chart': Deux déclencheurs équivalents — l'un ou l'autre suffit :
     (a) **Niveau technique cité** : prix, support, résistance, moyenne mobile, ou seuil mentionné dans la narration → chart, inclure levels dans overlaySpec.
     (b) **Forte variation individuelle** : le beat cite un actif non-indice avec |changePct| ≥ 3% dans la table des prix → chart. Le spectateur veut voir la courbe quand la performance est notable, même si la narration ne cite que le % et pas le prix.
   - 'spread_chart': Quand la narration parle d'un SPREAD ou ÉCART entre deux actifs. Affiche les deux courbes superposées.
   - 'gauge': RSI extrême (<30 ou >70), Fear&Greed, VIX → jauge circulaire

   **PRIORITÉ 2 — DONNÉES :**
   - 'stat': Quand la narration donne un CHIFFRE CLÉ (variation %, volume) SANS prix ni niveau technique → stat avec count-up animé
   - 'comparison': Quand la narration COMPARE explicitement 2+ actifs côte à côte

   **PRIORITÉ 3 — CONTEXTE :**
   - 'causal_chain': UNIQUEMENT quand la narration explique un mécanisme cause→effet ET qu'aucun prix/niveau n'est mentionné dans le beat. Si un prix est cité dans le même beat, utiliser 'chart' à la place.
   - 'scenario_fork': Quand la narration présente des SCÉNARIOS haussier/baissier avec cibles
   - 'headline': Quand la narration cite une ACTUALITÉ spécifique ou déclaration politique
   - 'countdown_event': Quand la narration évoque un RENDEZ-VOUS futur (réunion banque centrale, publication macro, earnings majeur) avec une date claire. Affiche J-N + event + asset impacté.
   - 'none': Transitions, contexte général, respiration — pas de données à afficher

   RÈGLE CRITIQUE : dès qu'un niveau technique est cité OU qu'un actif non-indice mentionné dans le beat affiche |changePct| ≥ 3% dans la table, c'est TOUJOURS un chart ou gauge, JAMAIS stat, causal_chain, ou none. Le CHART est le cœur visuel de la chaîne — vise minimum 25% de beats avec chart/spread_chart.

3. **overlaySpec** (object|null): Données structurées type-spécifiques:
   - chart: { asset, levels: [support, resistance], type: "price_line"|"zone_highlight"|... }
   - stat: { asset, value, unit, format: "%" ou "€" }
   - causal_chain: { steps: ["step1", "step2", ...] } — les maillons du raisonnement que le narrateur explique DANS CE BEAT. Chaque step = un maillon logique. Illustre la parole en cours.
   - scenario_fork: { trunk: "question courte max 60 chars", asset: "SYMBOL", bullTarget: "prix COURT max 15 chars (ex: 'Or 4800$', 'WTI < 90$')", bullCondition: "condition max 50 chars", bearTarget: "prix COURT max 15 chars", bearCondition: "condition max 50 chars" }
   - gauge: { type: "rsi"|"fear_greed", value, asset }
   - comparison: { assets: [symbol1, symbol2], values: [val1, val2] }
   - spread_chart: { asset1: "CL=F", asset2: "BZ=F", label: "Spread WTI-Brent" } pour des actifs du snapshot, OU { asset1: "DGS10", asset2: "DGS2", label: "Courbe des taux 10Y-2Y" } pour les yields FRED. NE PAS inventer de symboles — utiliser les symboles Yahoo existants ou DGS10/DGS2/T10Y2Y pour les yields.
   - headline: { text, actor?, source? }
   - countdown_event: { eventLabel: "Fed / CPI / earnings AMAT", targetDate: "29 avril" ou "mercredi", daysUntil: 3, affectedAsset: "^GSPC" (optionnel), stake: "enjeu en une ligne" }
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

10. **variant** (string|null): Variant visuel optionnel pour donner plus d'impact ou de variété. Choisis selon le ton du beat et la nature de la donnée. **Vise la VARIÉTÉ** — alterne les variants pour ne pas avoir un look monotone.

   **Variants disponibles par overlayType** :
   - **stat** :
     - 'stamp-press' : tampon imprimerie + halo encre + ligne déployée. Pour CHIFFRE CHOC dramatique (perte/gain notable, ATH, record). overlaySpec doit contenir : '{ value, label, suffix?, prefix? }'
     - 'avalanche' : cascade de chiffres en arrière-plan + héros central. Pour CHIFFRE QUI MARQUE (résultat trimestriel, levée de fonds). overlaySpec : '{ value, label, suffix?, prefix? }'
     - null = default (stat propre, count-up animé)
   - **causal_chain** :
     - 'domino' : cartes inclinées avec ombre portée + flèches manuscrites. Pour ENCHAÎNEMENT TANGIBLE en 2-4 étapes. overlaySpec : '{ steps: [...] }' (max 4 steps idéalement, plus = surchargé)
     - null = default (chaîne textuelle simple)
   - **gauge** :
     - 'strip' : 50 cellules linéaires colorées + aiguille. Pour SCORE/PERCENTILE 0-100 (RSI, F&G, percentile rank). overlaySpec : '{ label, value, min?, max? }'
     - 'liquid' : tube liquide ondulé + bulles. Pour PROGRESSION VOLUMÉTRIQUE (sentiment qui monte). overlaySpec : '{ label, value, min?, max? }'
     - null = default (jauge circulaire)
   - **comparison** :
     - 'sparklines' : mini-courbes draw-in par actif. Pour COMPARER TRAJECTOIRES de 2-4 actifs. overlaySpec : '{ assets: [{symbol}, ...] }' (les courbes sont fetchées du snapshot)
     - 'lane-race' : course de chevaux avec traces de cendre. Pour COMPÉTITION entre 3+ actifs alignés sur axe 0%. overlaySpec : '{ assets: [{symbol}, ...] }' (les % sont fetchés du snapshot, ne pas mettre les valeurs)
     - null = default (badges côte-à-côte)
   - **headline** :
     - 'tabloid' : slam + shake + flash blanc. Pour ANNONCE CHOC / breaking news. overlaySpec : '{ title: "Format: 'SUJET: VERBE COURT' avec ':' pour bon split, max 8 mots" }'. EXEMPLE : "BCE: BAISSE.", "FED: PIVOT". Si le titre est trop long ou pas séparable, mieux vaut default.
     - null = default (carte horizontale propre)
   - **scenario_fork** :
     - 'battle' : diptyque haussier/baissier avec triangles + barres prob. Pour SCÉNARIOS DRAMATIQUEMENT OPPOSÉS. overlaySpec : '{ trunk, bullTarget, bullCondition, bearTarget, bearCondition, bullProb?, bearProb? }' (les prob optionnels affichent une barre)
     - null = default (chart qui se sépare bull/bear)
   - **heatmap** :
     - 'treemap' : cellules de tailles variables avec remplissage couleur graduel + pulse. Pour PALMARÈS SECTORIEL avec 6-8 secteurs. overlaySpec : '{ sectors: [{name, ticker?, change}, ...] }'
     - null = default (grille uniforme)

   **RÈGLES VARIANT — IMPORTANTES** :
   - Vise minimum **3 variants différents** par épisode (variété visuelle obligatoire)
   - **Pas 2 mêmes variants consécutifs** — si beat précédent a 'stamp-press', le suivant doit être autre chose
   - **Pas plus de 2 variants 'tabloid' OU 2 variants 'battle' OU 2 variants 'stamp-press' par épisode** (variants à fort impact = parcimonie)
   - **JAMAIS de variant audacieux dans seg_panorama** (zone calme — laisse 'default' ou null)
   - Si tu doutes → null = default (jamais bloquant)
   - Si tu manques de données pour le variant (ex: tabloid sans titre courtable) → null

## Contraintes

- **Chaîne causale = ce que le narrateur enseigne MAINTENANT**: Si overlayType='causal_chain', lis le narrationChunk du beat et extrais le MÉCANISME que le narrateur est en train d'expliquer. Les steps illustrent la logique de la narration en cours, pas un résumé du segment. Si le narrateur dit "quand les taux montent, l'or perd de son attrait", les steps doivent être : "Taux réels montent → Coût d'opportunité augmente → Or moins attractif vs obligations → Pression vendeuse". Chaque step est un maillon du raisonnement, pas un fait daté.
- **Extraction numérique**: "un virgule cinquante et un pour cent" → {value: 1.51, format: "%"}
- **Ratio overlay**: Vise **75-85% de beats avec overlay** (non-'none'). Le spectateur préfère un visuel qui supporte chaque idée plutôt qu'un fond statique. Seules les transitions / respirations / phrases de liaison restent en 'none'.
- **Minimum 25% de beats avec chart/spread_chart** — le spectateur regarde une chaîne de FINANCE, il veut voir des courbes.
- **Pas 3 consécutifs**: Interdiction de 3 beats consécutifs avec le même overlayType.
- **Variété variant**: au moins 3 variants différents par épisode (cf. règles variant ci-dessus). Si tu sors trop de 'default' dans le même épisode → varie.
- **causal_chain ≤ 15%**: Ne pas sur-indexer sur les chaînes causales textuelles — si tu hésites entre causal_chain et chart, choisis chart.
- **Asset validation**: primaryAsset et tout symbole d'overlay (chart.asset, comparison.assets[].symbol, stat.label asset, etc.) DOIVENT être pris dans beat.assets ou à défaut dans segment.assets. JAMAIS inventer un ticker depuis ta mémoire — si l'asset cible n'est pas dans cette liste, mets 'none' plutôt qu'un symbole approximatif.
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
    "overlaySpec": { "value": -9, "suffix": "%", "label": "Or" },
    "triggerWord": "neuf",
    "emotion": "impact",
    "visualScale": "micro",
    "beatPacing": "lent",
    "overlayAnimation": "count_up",
    "isKeyMoment": true,
    "variant": "stamp-press"
  }
]
\`\`\`

IMPORTANT: Retourne un JSON ARRAY directement, PAS un objet { "annotations": [...] }.`;

// ─── Input Builder ──────────────────────────────────────────────────────

function buildHaikuInput(beats: RawBeat[], snapshot: DailySnapshot, analysis: AnalysisBundle): HaikuAnnotationRequest {
  // Collect all symbols actually referenced by beats / segment analyses.
  // We propagate beat.assets (already validated by C3/C5) AND analysis assets
  // so Haiku has the full editorial context to pick from — but ONLY this set,
  // never a free-form ticker.
  const relevantSymbols = new Set<string>();
  const beatSegIds = new Set(beats.map(b => b.segmentId));
  for (const seg of analysis.segments) {
    if (beatSegIds.has(seg.segmentId)) {
      for (const inst of seg.chartInstructions ?? []) {
        if (inst.asset) relevantSymbols.add(inst.asset);
      }
      for (const a of (seg as any).assets ?? []) {
        if (typeof a === 'string') relevantSymbols.add(a);
      }
    }
  }
  for (const b of beats) {
    for (const a of b.assets ?? []) relevantSymbols.add(a);
    if ((b as any).primaryAsset) relevantSymbols.add((b as any).primaryAsset);
  }
  if (relevantSymbols.size === 0) {
    ['^GSPC', '^VIX', 'GC=F', 'CL=F'].forEach(s => relevantSymbols.add(s));
  }

  // Asset price table — pull from BOTH watchlist (snapshot.assets) AND stock
  // screen movers, so tickers like DHL.DE or STLAM.MI (mentioned by C3 but not
  // in the watchlist) are visible to Haiku with their price/change. Without
  // this, Haiku saw "DHL" in the narration but couldn't find the symbol in its
  // table and hallucinated a similar ticker (DHL.DE → DHER.DE).
  const fromWatchlist = snapshot.assets
    .filter(a => relevantSymbols.has(a.symbol))
    .map(a => ({
      symbol: a.symbol,
      name: a.name,
      price: a.price,
      changePct: a.changePct,
      rsi: a.technicals?.rsi14,
    }));
  const fromScreen = (snapshot.stockScreen ?? [])
    .filter((m: any) => relevantSymbols.has(m.symbol))
    .map((m: any) => ({
      symbol: m.symbol,
      name: m.name ?? m.symbol,
      price: m.price ?? 0,
      changePct: m.changePct ?? 0,
      rsi: m.technicals?.rsi14,
    }));
  const assets = [...fromWatchlist, ...fromScreen];

  // Segments with C2 data + their bound assets (sourced from analysis if
  // present, fallback to the union of beat.assets in this segment).
  const segments = analysis.segments.map(seg => {
    const segAssets = new Set<string>();
    for (const inst of seg.chartInstructions ?? []) if (inst.asset) segAssets.add(inst.asset);
    for (const a of (seg as any).assets ?? []) if (typeof a === 'string') segAssets.add(a);
    for (const b of beats.filter(x => x.segmentId === seg.segmentId)) {
      for (const a of b.assets ?? []) segAssets.add(a);
    }
    return {
      id: seg.segmentId,
      topic: seg.narrativeHook || 'N/A',
      assets: [...segAssets],
      causalChain: seg.causalChain,
      scenarios: seg.scenarios,
      technicalReading: seg.technicalReading,
      coreMechanism: seg.coreMechanism,
    };
  });

  // Beats per segment — now include the asset whitelist explicitly.
  const beatsBySegment = beats.map(b => ({
    id: b.id,
    segmentId: b.segmentId,
    narrationChunk: b.narrationChunk,
    assets: b.assets ?? [],
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
  const watchlistSymbols = new Set(snapshot.assets.map(a => a.symbol));
  const screenSymbols = new Set((snapshot.stockScreen ?? []).map((m: any) => m.symbol));
  // Build per-segment allowed symbol set (union of all beat.assets in that segment).
  const segmentAllowed = new Map<string, Set<string>>();
  for (const b of beats) {
    if (!segmentAllowed.has(b.segmentId)) segmentAllowed.set(b.segmentId, new Set());
    for (const s of b.assets ?? []) segmentAllowed.get(b.segmentId)!.add(s);
  }

  const validated: BeatAnnotation[] = [];
  let keyMomentCount = 0;
  let lastThreeTypes: string[] = [];
  const variantCounts: Record<string, number> = {};
  let lastVariant: string | null = null;

  for (const ann of raw) {
    const beat = beats.find(b => b.id === ann.beatId);
    if (!beat) continue;

    // Build the strict allow-list for this beat: beat.assets ∪ segment.assets.
    // Any overlay symbol outside this set is treated as a hallucination and
    // dropped (Haiku confused DHL.DE → DHER.DE in 05-02 because no such
    // constraint existed).
    const beatAllowed = new Set<string>([
      ...(beat.assets ?? []),
      ...(segmentAllowed.get(beat.segmentId) ?? []),
    ]);

    // Normalize emotion
    const emotion = normalizeEmotion(ann.emotion as string);

    // Validate primaryAsset against the editorial allow-list (not the global
    // snapshot — that's how DHER.DE slipped through previously).
    const primaryAsset = ann.primaryAsset && beatAllowed.has(ann.primaryAsset) ? ann.primaryAsset : null;

    // Validate triggerWord in narration (case-insensitive)
    const triggerWord = ann.triggerWord && beat.narrationChunk.toLowerCase().includes(ann.triggerWord.toLowerCase())
      ? ann.triggerWord
      : null;

    // Validate overlayType
    let overlayType: OverlayType | 'none' = isValidOverlayType(ann.overlayType) ? (ann.overlayType as OverlayType) : 'none';

    // Validate overlaySpec based on type. If the spec is invalid (hallucinated
    // symbols, missing data), validateOverlaySpec returns null — coerce the
    // type to 'none' so DataOverlay doesn't try to render a broken overlay.
    let overlaySpec = validateOverlaySpec(overlayType, ann.overlaySpec, snapshot, beatAllowed);
    if (overlayType !== 'none' && overlaySpec == null) {
      overlayType = 'none';
    }

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

    // ── Validation variant ──
    let variant: string | null = null;
    const rawVariant = (ann as any).variant;
    if (typeof rawVariant === 'string' && rawVariant !== 'default' && rawVariant !== 'null') {
      const allowed = ALLOWED_VARIANTS[overlayType] ?? [];
      if (allowed.includes(rawVariant)) {
        // Pas de variant audacieux dans seg_panorama
        if (beat.segmentId === 'seg_panorama') {
          variant = null;
        }
        // Pas 2 mêmes variants consécutifs
        else if (lastVariant === rawVariant) {
          variant = null;
        }
        // Cap variants à fort impact (max 2 par épisode)
        else if (HIGH_IMPACT_VARIANTS.has(rawVariant) && (variantCounts[rawVariant] ?? 0) >= 2) {
          variant = null;
        }
        // Validation des données requises pour le variant
        else if (!validateVariantSpec(rawVariant, overlaySpec)) {
          variant = null;
        }
        else {
          variant = rawVariant;
          variantCounts[rawVariant] = (variantCounts[rawVariant] ?? 0) + 1;
        }
      }
    }
    if (variant) lastVariant = variant;
    else if (overlayType === 'none') {
      // ne pas reset lastVariant pendant transitions, garder l'historique
    } else {
      lastVariant = null; // beat avec overlay default → reset (suivant peut être audacieux)
    }

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
      variant,
    });
  }

  return validated;
}

/**
 * Vérifie que les données requises pour un variant sont présentes.
 * Si le variant a besoin de data spécifique qui manque → false → fallback default.
 */
function validateVariantSpec(variant: string, spec: Record<string, unknown> | null): boolean {
  if (!spec) return false;
  switch (variant) {
    case 'stamp-press':
    case 'avalanche':
      return typeof spec.value === 'number' && Number.isFinite(spec.value) && spec.value !== 0;
    case 'domino':
      return Array.isArray(spec.steps) && spec.steps.length >= 2 && spec.steps.length <= 5;
    case 'strip':
    case 'liquid':
      return typeof spec.value === 'number' && Number.isFinite(spec.value);
    case 'sparklines':
    case 'lane-race':
      return Array.isArray(spec.assets) && spec.assets.length >= 2 && spec.assets.length <= 6;
    case 'tabloid':
      // Besoin d'un titre courtable (séparateur ":" ou "—" recommandé, ou ≤ 30 chars)
      const title = spec.title ?? spec.text;
      if (typeof title !== 'string') return false;
      return title.length >= 5 && title.length <= 80;
    case 'battle':
      return typeof spec.trunk === 'string' && spec.trunk.length > 5
        && (typeof spec.bullTarget === 'string' || typeof spec.bull === 'string')
        && (typeof spec.bearTarget === 'string' || typeof spec.bear === 'string');
    case 'treemap':
      return Array.isArray(spec.sectors) && spec.sectors.length >= 4;
    default:
      return false;
  }
}

function normalizeEmotion(raw: string): BeatEmotion {
  const valid: BeatEmotion[] = ['tension', 'impact', 'revelation', 'analyse', 'contexte', 'respiration', 'conclusion'];
  return valid.includes(raw as BeatEmotion) ? (raw as BeatEmotion) : 'contexte';
}

function isValidOverlayType(type: string): boolean {
  const valid = [
    'chart', 'chart_zone', 'spread_chart',
    'stat', 'causal_chain', 'scenario_fork',
    'gauge', 'comparison', 'headline',
    'countdown_event', 'heatmap',
    'none',
  ];
  return valid.includes(type);
}

/**
 * Validate an overlay spec strictly. Returns null if the spec doesn't make
 * sense (invalid symbols, missing data, hallucinated tokens). The caller
 * should treat null as "no overlay for this beat" — better than rendering
 * a degraded fallback.
 *
 * `beatAllowed` (optional) is the editorial allow-list for THIS beat —
 * `beat.assets ∪ segment.assets`. When provided, symbols outside this set
 * are rejected even if they exist in the snapshot. This catches Haiku
 * confusing similar tickers (e.g. DHL.DE → DHER.DE) by picking from training
 * memory instead of the editorial input.
 */
function validateOverlaySpec(
  type: string,
  spec: any,
  snapshot: DailySnapshot,
  beatAllowed?: Set<string>,
): Record<string, unknown> | null {
  if (type === 'none' || !spec) return null;

  const watchlistSymbols = new Set(snapshot.assets.map((a) => a.symbol));
  const screenSymbols = new Set((snapshot.stockScreen ?? []).map((m: any) => m.symbol));
  const knownSymbols = new Set([...watchlistSymbols, ...screenSymbols]);
  const isAllowed = (sym: string): boolean => {
    if (beatAllowed && beatAllowed.size > 0) return beatAllowed.has(sym);
    return knownSymbols.has(sym);
  };

  // Helper: extract a symbol string from various LLM output shapes
  // Sometimes Haiku produces nested { symbol: { symbol, label } } — unwrap.
  const extractSymbol = (raw: any): string | null => {
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      if (typeof raw.symbol === 'string') return raw.symbol;
      if (raw.symbol && typeof raw.symbol === 'object' && typeof raw.symbol.symbol === 'string') {
        return raw.symbol.symbol;
      }
    }
    return null;
  };

  if (type === 'stat') {
    // value MUST be a finite, non-zero number — otherwise the overlay is
    // meaningless (would render as "+0.00%" or trigger TextCard fallback).
    const v = spec.value;
    if (typeof v !== 'number' || !Number.isFinite(v) || v === 0) return null;
    if (spec.format === '%' && Math.abs(v) > 50) spec.value = Math.sign(v) * 50;
    // Normalize suffix: should be a short unit ("%", "$", "€", "pb", "M$"…).
    // Haiku sometimes packs a descriptor into it (e.g. "$ écart WTI-Brent")
    // which overflows the giant hero font in NumberAvalanche/StatStampPress.
    // Split: keep the leading unit as suffix, move the rest into label.
    if (typeof spec.suffix === 'string') {
      const raw = spec.suffix.trim();
      const unitMatch = raw.match(/^(%|\$|€|£|¥|pb|bps|bp|M\$|Md\$|M€|Md€|x|°C?|j|h|min|s|y|an|ans)(?:\s+(.+))?$/i);
      if (unitMatch) {
        spec.suffix = unitMatch[1];
        const extra = unitMatch[2]?.trim();
        if (extra) {
          spec.label = (typeof spec.label === 'string' && spec.label.trim())
            ? `${spec.label.trim()} — ${extra}`
            : extra;
        }
      } else if (raw.length > 4) {
        // No unit prefix → fold the whole thing into label, drop suffix.
        spec.label = (typeof spec.label === 'string' && spec.label.trim())
          ? `${spec.label.trim()} — ${raw}`
          : raw;
        spec.suffix = '';
      }
    }
    return spec;
  }

  if (type === 'comparison') {
    // assets must be an array of items whose .symbol is in the snapshot AND
    // in the beat allow-list. Hallucinated labels (FED_PAUSE) or wrong-ticker
    // confusions (DHER.DE picked instead of DHL.DE) are both filtered.
    if (!Array.isArray(spec.assets)) return null;
    const cleaned = spec.assets
      .map((a: any) => {
        const sym = extractSymbol(a) ?? extractSymbol(a?.symbol);
        if (!sym || !isAllowed(sym)) return null;
        return { ...a, symbol: sym };
      })
      .filter(Boolean);
    if (cleaned.length < 2) return null;
    spec.assets = cleaned;
    return spec;
  }

  if (type === 'chart' || type === 'chart_zone') {
    const asset = extractSymbol(spec.asset);
    if (!asset || !isAllowed(asset)) return null;
    spec.asset = asset;
    // Look up reference price from watchlist OR stockScreen.
    const refAsset = snapshot.assets.find((x) => x.symbol === asset);
    const refScreen = (snapshot.stockScreen ?? []).find((m: any) => m.symbol === asset);
    const refPrice = refAsset?.price ?? (refScreen as any)?.price ?? 0;
    if (Array.isArray(spec.levels) && refPrice > 0) {
      spec.levels = spec.levels.map((lv: number) => {
        if (typeof lv !== 'number' || !Number.isFinite(lv)) return refPrice;
        const ratio = lv / refPrice;
        if (ratio < 0.5) return refPrice * 0.5;
        if (ratio > 2) return refPrice * 2;
        return lv;
      });
    }
    return spec;
  }

  // Other types (headline, gauge, countdown_event, causal_chain, etc.) :
  // pass through. Their renderers tolerate flexible shapes.
  return spec;
}
