# Bloc E v2 — Roadmap d'implementation detaillee

> Ce document decrit CHAQUE etape pour implementer le pipeline visuel beat-based.
> Lire `E2-VISUAL-PIPELINE-SPEC.md` avant pour le contexte.
> Mis a jour : 2026-03-19 — v2 : ajout sync audio/visuel

---

## Vue d'ensemble

```
Phase 0 — Fondations (types, deps, fixtures)
Phase 1 — P7a Beat Generator (CODE pur)
Phase 2 — P7b C7 Sonnet Direction Artistique
Phase 3 — P7c C8 Haiku Prompts Image
Phase 4 — P7d ComfyUI Client + Generation
Phase 5 — Remotion BeatEpisode (composition + composants)
Phase 6 — Integration pipeline (generate.ts, render, CLI)
Phase 7 — Polish DA + tests visuels
```

Chaque phase a des **pre-requis**, **livrables**, et **criteres de validation**.

---

## Phase 0 — Fondations

> Pre-requis : aucun
> Impact : tous les phases suivantes dependent de Phase 0

### 0.1 Types Beat dans core/types.ts

Ajouter les interfaces Beat dans `packages/core/src/types.ts` (apres EpisodeDirection).

```typescript
// ── Beat Pipeline Types (Bloc E v2) ──

export type ImageEffect =
  | 'ken_burns_in'
  | 'ken_burns_out'
  | 'slow_pan_left'
  | 'slow_pan_right'
  | 'static';

export type BeatTransition =
  | 'cut'
  | 'fade'
  | 'slide_left'
  | 'slide_up'
  | 'wipe'
  | 'cross_dissolve';

export type BeatEmotion =
  | 'tension'
  | 'analyse'
  | 'revelation'
  | 'contexte'
  | 'impact'
  | 'respiration'
  | 'conclusion';

export type OverlayType =
  | 'stat'
  | 'chart'
  | 'chart_zone'
  | 'causal_chain'
  | 'comparison'
  | 'headline'
  | 'text_card'
  | 'heatmap'
  | 'scenario_fork'
  | 'gauge'
  | 'ticker_strip';

export interface BeatOverlay {
  type: OverlayType;
  data: Record<string, unknown>;
  position: 'center' | 'bottom_third' | 'lower_third' | 'top_right' | 'full';
  enterAnimation: 'pop' | 'slide_up' | 'fade' | 'count_up';
  enterDelayMs: number;         // Delay avant apparition, relatif au debut du beat
  triggerWord?: string;         // Le mot dans la narration qui declenche l'overlay (pour sync TTS)
}

// Timing d'un beat — supporte mode estime ET mode TTS
export interface BeatTiming {
  estimatedDurationSec: number;   // Calculé par word count (toujours present)
  audioDurationSec?: number;      // Rempli par TTS (WAV reel) — quand dispo, REMPLACE estimated
  wordTimestamps?: Array<{        // Rempli par TTS (word-level) — pour sync overlay precise
    word: string;
    startMs: number;
    endMs: number;
  }>;
}

export interface Beat {
  id: string;
  segmentId: string;
  startSec: number;
  durationSec: number;            // Duree effective (= audioDurationSec si TTS dispo, sinon estimated)

  // Narration
  narrationChunk: string;

  // Timing (supporte mode estime + mode TTS)
  timing: BeatTiming;

  // Image
  imagePrompt: string;
  imagePath?: string;
  imageReuse?: string;            // "same_as:beat_012"
  imageEffect: ImageEffect;

  // Overlay
  overlay?: BeatOverlay;

  // Transition
  transitionOut: BeatTransition;

  // Direction (from C7)
  emotion: BeatEmotion;

  // Audio (rempli par Bloc F quand TTS disponible)
  audioPath?: string;             // WAV du beat
}

export interface EpisodeVisualIdentity {
  colorTemperature: 'warm' | 'cool' | 'neutral';
  lightingRegister: 'soft_natural' | 'golden_hour' | 'overcast' | 'studio_warm';
  photographicStyle: string;
  forbiddenElements: string[];
}

export interface BeatEpisodeData {
  beats: Beat[];
  visualIdentity: EpisodeVisualIdentity;
  totalBeats: number;
  uniqueImages: number;       // beats avec imageReuse ne comptent pas
  stats: {
    overlayCount: number;
    imageOnlyCount: number;
    avgBeatDurationSec: number;
  };
}
```

**Validation** : `npm run typecheck` passe.

### 0.2 Installer @remotion/transitions

```bash
cd packages/remotion-app
npm install @remotion/transitions
```

**Validation** : import fonctionne dans un fichier test.

### 0.3 Types pipeline intermediaires

Dans `packages/ai/src/pipeline/types.ts`, ajouter :

```typescript
// Output P7a (beat generator brut)
export interface RawBeat {
  id: string;
  segmentId: string;
  startSec: number;
  durationSec: number;
  narrationChunk: string;
  overlayHint: OverlayType | 'none';
  overlayData?: Record<string, unknown>;  // Données réelles extraites du snapshot (prix, candles, etc.)
  segmentDepth: 'flash' | 'focus' | 'deep';
  segmentTopic?: string;
  assets: string[];
  isSegmentEnd: boolean;                  // Dernier beat du segment → C7 met une transition forte
  isSegmentStart: boolean;                // Premier beat du segment → C7 peut marquer le changement
}

// Output P7b (direction artistique C7)
export interface BeatDirection {
  beatId: string;
  imageDirection: string;
  imageReuse?: string;
  overlay: OverlayType | 'none';
  overlayNotes?: string;
  imageEffect: ImageEffect;
  transitionOut: BeatTransition;
  emotion: BeatEmotion;
}

export interface C7DirectionResult {
  visualIdentity: EpisodeVisualIdentity;
  directions: BeatDirection[];
}

// Output P7c (prompts image C8)
export interface ImagePromptResult {
  beatId: string;
  imagePrompt: string;        // prompt Flux 2 Dev EN
  skip: boolean;              // true si imageReuse
}
```

**Validation** : `npm run typecheck` passe.

### 0.4 Fixtures beat pour tests Remotion

Creer `packages/remotion-app/src/fixtures/sample-beats.ts` avec ~10 beats de test.
Utiliser les images existantes ou des placeholders pour le dev Remotion avant que ComfyUI soit wire.

```typescript
export const SAMPLE_BEATS: Beat[] = [
  {
    id: 'beat_001',
    segmentId: 'hook',
    startSec: 0,
    durationSec: 4,
    narrationChunk: "Le WTI perd douze pour cent en une seance.",
    imagePrompt: '',
    imagePath: undefined,     // sera un placeholder ou staticFile
    imageEffect: 'ken_burns_in',
    transitionOut: 'cross_dissolve',
    emotion: 'impact',
  },
  // ... 9 autres beats couvrant tous les types d'overlay et transitions
];

export const SAMPLE_VISUAL_IDENTITY: EpisodeVisualIdentity = {
  colorTemperature: 'warm',
  lightingRegister: 'soft_natural',
  photographicStyle: 'editorial documentary, warm tones, medium contrast',
  forbiddenElements: ['neon', 'dramatic_red', 'extreme_angles', 'text_in_image'],
};
```

**Validation** : import dans Root.tsx sans erreur.

### 0.5 Images placeholder

Creer `public/placeholders/` dans remotion-app avec 5-6 images libres de droits (Unsplash)
en 1344x768 pour le dev Remotion. Themes : trading floor, skyline, or, petrole, macro.

```
packages/remotion-app/public/placeholders/
  trading-floor.jpg
  skyline-dawn.jpg
  gold-bars.jpg
  oil-tanker.jpg
  port-aerial.jpg
  office-desk.jpg
```

**Validation** : `staticFile('placeholders/trading-floor.jpg')` charge dans Remotion Studio.

### Livrable Phase 0
- Types Beat complets dans core
- Types pipeline intermediaires dans ai/pipeline
- @remotion/transitions installe
- Fixtures beats + images placeholders
- Typecheck clean

---

## Phase 1 — P7a Beat Generator (CODE pur)

> Pre-requis : Phase 0
> Fichier : `packages/ai/src/pipeline/p7a-beat-generator.ts`

### 1.1 Chunker de narration

Fonction qui decoupe `section.narration` en chunks de phrases respectant ~5-8s.

```typescript
function chunkNarration(narration: string, targetDurationSec: number): NarrationChunk[]
```

**Regles** :
- Decouper sur les points (`.`), points-virgules (`;`), tirets longs (` — `)
- Ne JAMAIS couper au milieu d'une phrase
- Pacing : 150 mots / 60s = 2.5 mots/s
- Chunk min : 3s (~8 mots), max : 10s (~25 mots)
- Si une phrase depasse 10s seule, la garder entiere (pas de coupure)

**Tests unitaires** :
- Narration vide → []
- Narration 1 phrase courte → 1 chunk
- Narration 225 mots → ~6-8 chunks
- Respecte les frontieres de phrases
- Durees dans la fourchette 3-10s

### 1.2 Classificateur d'overlay

Fonction qui pre-classe chaque chunk par pattern matching.

```typescript
function classifyOverlay(
  chunk: string,
  watchlistSymbols: string[]
): OverlayType | 'none'
```

**Regles heuristiques** :
- Regex chiffre avec % ou $ → `stat`
- Mentionne un symbole de la watchlist → `chart`
- Contient "parce que", "a cause de", "entraine", "provoque", "declenche" → `causal_chain`
- Mentionne 2+ symboles → `comparison`
- Contient "scenario", "si.*alors", "haussier.*baissier" → `scenario_fork`
- Sinon → `none`

**Tests unitaires** :
- "Le WTI a 83 dollars" → `stat`
- "a cause de la demande chinoise" → `causal_chain`
- "WTI et Brent en baisse" → `comparison`
- "Si le support casse alors on vise 80" → `scenario_fork`
- "Les marches respirent" → `none`

### 1.3 Resolution des donnees overlay (CRITIQUE)

L'overlay `data` doit contenir les vraies donnees du snapshot — pas juste un type.
Quand le DataOverlay Remotion recoit un overlay `stat`, il a besoin de la valeur,
du label, du suffixe. Quand c'est un `chart`, il faut les candles reelles.

```typescript
function resolveOverlayData(
  chunk: string,
  overlayType: OverlayType,
  snapshot: DailySnapshot,
  segmentAssets: string[]
): Record<string, unknown>
```

**Resolution par type** :

| Type | Donnees extraites | Source |
|------|-------------------|--------|
| `stat` | `{ value: -11.94, label: "WTI", suffix: "%", prefix: "" }` | Regex sur le chunk + asset match dans snapshot |
| `chart` | `{ symbol: "CL=F", candles: [...], levels: [...] }` | Premier asset du segment + snapshot.assets[].candles + visualCues show_level |
| `chart_zone` | `{ symbol, candles, zoomRange: { min, max }, levels }` | Idem + zoom sur la zone S/R |
| `causal_chain` | `{ steps: ["Chine imports ↓", "Demande ↓", "WTI ↓"] }` | Extraction des maillons causaux du chunk (regex "parce que"/"entraine") |
| `comparison` | `{ assets: [{ symbol, price, changePct }, ...] }` | Assets mentionnes dans le chunk → lookup snapshot |
| `headline` | `{ title: "...", source: "Reuters" }` | News la plus pertinente pour le segment (match asset) |
| `scenario_fork` | `{ trunk: "WTI", bull: "Si > 85$...", bear: "Si < 80$..." }` | Extraction regex des branches conditionnelles |
| `heatmap` | `{ sectors: [...] }` | snapshot.stockScreen groupé par secteur |
| `gauge` | `{ label: "VIX", value: 28.5, min: 10, max: 80 }` | snapshot.vix ou sentiment.fearGreed |

**Fallback** : si la resolution echoue (asset introuvable, pas de candles), retourner `{}` et
le DataOverlay Remotion affichera un PlaceholderSlot.

**Tests** :
- Chunk avec "-11.94%" + asset CL=F dans snapshot → data avec value/label/suffix
- Chunk avec 2 assets → data comparison avec les 2 prix
- Chunk sans asset identifiable → data vide, overlay degrade gracieusement

### 1.4 Calcul du overlay enterDelayMs (sync narration)

Le delay de l'overlay est calcule par rapport au mot-cle dans le chunk.
C'est une heuristique — remplacee par les word timestamps TTS quand disponibles.

```typescript
function computeOverlayDelay(
  chunk: string,
  overlayType: OverlayType,
  beatDurationMs: number
): { delayMs: number; triggerWord?: string }
```

**Logique par type** :
- `stat` : trouver le premier chiffre (regex `[\d]+[,.]?[\d]*\s*[%$€]`), calculer sa position relative dans le texte → delayMs = position * durationMs
- `chart` : trouver le nom de l'asset → delayMs = sa position relative
- `causal_chain` : trouver "parce que" / "a cause de" → delayMs = sa position
- `comparison` : trouver le deuxieme asset mentionne → delayMs = sa position
- `scenario_fork` : trouver "si" → delayMs = sa position
- `headline` : delayMs = 0 (apparait immediatement)
- Defaut : delayMs = 0

**Le `triggerWord` est stocke** pour que le Bloc F (TTS) puisse recalculer le delay
avec les word timestamps reels.

### 1.4 Mapping chartTimings de P6 aux beats

P6 (C5 Sonnet) genere des `chartTimings` avec `showAtSec` et `hideAtSec` en temps absolu.
P7a doit mapper ces timings aux beats correspondants :

```typescript
function mapChartTimingsToBeats(
  rawBeats: RawBeat[],
  chartTimings: EpisodeDirection['chartTimings']
): void  // mute les rawBeats en place (overlay = chart/chart_zone)
```

**Logique** :
1. Pour chaque chartTiming, trouver le beat dont `startSec <= showAtSec < startSec + durationSec`
2. Si ce beat n'a pas deja un overlay plus important, lui assigner overlay `chart` ou `chart_zone`
3. Calculer `enterDelayMs = (showAtSec - beat.startSec) * 1000`
4. Si le chart dure plus qu'un beat, les beats suivants heritent du meme chart avec `enterDelayMs = 0`

### 1.5 Fonction principale generateBeats()

```typescript
export function generateBeats(
  script: EpisodeScript,
  chartTimings?: EpisodeDirection['chartTimings']
): RawBeat[]
```

**Flow** :
1. Pour chaque section du script :
   - Calculer l'offset cumule (startSec)
   - Chunker la narration
   - Classifier chaque chunk (overlay heuristique)
   - Resoudre overlay.data depuis le snapshot (resolveOverlayData)
   - Calculer enterDelayMs pour chaque overlay (sync narration)
   - Enrichir avec les metadonnees segment (depth, topic, assets)
   - Marquer `isSegmentStart` / `isSegmentEnd` sur le premier et dernier beat de chaque section
2. Assigner les IDs sequentiels (beat_001, beat_002, ...)
3. Mapper les chartTimings de P6 aux beats (overrides les overlays heuristiques si conflit)
4. Retourner RawBeat[]

**Tests** :
- Script fixture → ~60-80 beats
- Tous les beats ont un id unique
- startSec est monotone croissant
- La somme des durations ≈ script.totalDurationSec (tolerance 5%)
- Chaque beat a un segmentId valide
- Les chartTimings sont mappes aux bons beats (test avec fixture P6)
- Les overlay delays sont > 0 et < beatDurationMs

### Livrable Phase 1
- `p7a-beat-generator.ts` avec fonctions exportees :
  - `chunkNarration()` — decoupage phrases
  - `classifyOverlay()` — heuristiques
  - `resolveOverlayData()` — donnees reelles depuis snapshot
  - `computeOverlayDelay()` — sync narration
  - `mapChartTimingsToBeats()` — P6 → beats
  - `generateBeats()` — orchestrateur
- Tests unitaires pour chaque fonction
- Testable en isolation : `npx ts-node -e "...generateBeats(SAMPLE_SCRIPT)..."`

---

## Phase 2 — P7b C7 Sonnet Direction Artistique

> Pre-requis : Phase 1
> Fichier : `packages/ai/src/pipeline/p7b-direction-artistique.ts`

### 2.1 Prompt C7

Creer le system prompt pour C7 Sonnet. C'est le prompt le plus important du pipeline visuel.

**Contenu du prompt** :

1. **Role** : "Tu es le directeur artistique d'un recapitulatif marche video. Tu recois une liste de beats (morceaux de narration de 5-8s) et tu decides la mise en scene visuelle de chaque beat."

2. **Personnalite visuelle** (les regles DA humbles) :
   - Registre editorial/documentaire (Arte, The Economist, Bloomberg Originals)
   - Jamais dramatique, jamais putaclic, jamais sensationnel
   - Images belles et evocatrices, pas alarmantes
   - L'emotion est dans la narration, pas dans l'image
   - Lumiere naturelle douce, compositions propres
   - Le dynamisme vient du montage (variete + rythme), pas de l'intensite des images

3. **Regles structurelles** :
   - Definir un `EpisodeVisualIdentity` en tete (temperature, eclairage, style, interdits)
   - Coherence : toutes les images semblent prises par le meme photographe
   - Ratio overlay : ~35% avec overlay, ~65% image seule
   - Reutilisation : beats consecutifs meme sujet → `imageReuse: "same_as:beat_XXX"`
   - Jamais 2 overlays chart consecutifs
   - Rythme en vagues (pas monotone)
   - **Frontieres de segment** (`isSegmentStart`/`isSegmentEnd`) : transition FORTE entre segments (cross_dissolve ou fade long), transition legere intra-segment (cut ou fade court)
   - **Beats `isSegmentStart`** : image plus evocatrice pour marquer le debut d'un nouveau sujet

4. **Input JSON** : RawBeat[] (compresses) + moodMusic + arc de tension + assets avec prix

   **Compression input** : pour rester dans un budget tokens raisonnable (~8K total),
   envoyer les beats en format compact :
   ```json
   { "id": "beat_012", "seg": "seg_1", "depth": "deep", "hint": "stat",
     "text": "Le WTI a 83 dollars — moins douze pour cent...", "dur": 6,
     "segStart": true, "segEnd": false, "assets": ["CL=F"] }
   ```
   Si >80 beats : tronquer les narrationChunks a ~15 mots (suffisant pour que C7 comprenne le contexte).
   Si <60 beats : envoyer les chunks complets.

5. **Output JSON** : C7DirectionResult (visualIdentity + BeatDirection[])

**Validation prompt** :
- Tester sur le script fixture
- Verifier que le ratio overlay est ~35%
- Verifier que imageReuse est utilise (devrait reduire de ~100 beats a ~60-70 images uniques)
- Verifier que les emotions ne sont pas toutes "tension" ou "impact"
- Verifier la coherence du registre visuel (pas de melange sombre/lumineux aleatoire)

### 2.2 Fonction runC7Direction()

```typescript
export async function runC7Direction(
  rawBeats: RawBeat[],
  direction: EpisodeDirection,
  assets: AssetSnapshot[],
  options: { lang: Language }
): Promise<C7DirectionResult>
```

**Flow** :
1. Construire le prompt avec les regles DA
2. Injecter les RawBeats en JSON compact (id, narrationChunk, overlayHint, segmentDepth)
3. Injecter le mood, l'arc de tension, les assets avec prix/variation
4. Appeler `generateStructuredJSON<C7DirectionResult>(system, user, { role: 'balanced' })`
5. Valider le retour (chaque beatId existe, overlay dans les types valides, etc.)
6. Fallback si echec : garder les overlayHints de P7a, defaulter les transitions a 'fade', emotions a 'contexte'

**Tests** :
- Mock LLM : verifier la construction du prompt
- Integration : appel reel sur script fixture, inspecter la coherence du resultat

### Livrable Phase 2
- `p7b-direction-artistique.ts`
- Prompt C7 complet dans `packages/ai/src/prompts/c7-direction-artistique.ts`
- Validation JSON du retour C7
- Fallback mecanique si LLM echoue

---

## Phase 3 — P7c C8 Haiku Prompts Image

> Pre-requis : Phase 2
> Fichier : `packages/ai/src/pipeline/p7c-image-prompts.ts`

### 3.1 Prompt C8

Prompt pour C8 Haiku — traduction mecanique des directions en prompts Flux 2 Dev.

**Contenu** :
1. Role : "Transforme chaque direction visuelle en prompt optimise pour Flux 2 Dev."
2. Regles :
   - Prompts en anglais, langage naturel (pas de tags separes par virgules)
   - Jamais de texte dans l'image (pas de mots, labels, titres)
   - Pas de visages identifiables
   - Pas de logos ou marques
   - Chaque prompt ~30-60 mots
3. Input : BeatDirection[] + EpisodeVisualIdentity (pour le suffixe style)
4. Output : ImagePromptResult[] (beatId + prompt + skip)

### 3.2 Suffixe style automatique

Le code (pas le LLM) ajoute un suffixe apres chaque prompt genere par C8 :

```typescript
function buildStyleSuffix(
  identity: EpisodeVisualIdentity,
  mood: string
): string
```

Combine :
- Le `photographicStyle` de l'identite visuelle
- Le suffixe mood (table dans la spec E2)
- Resolution hint : "wide angle 16:9 composition"

### 3.3 Validation et filtrage

Apres C8, le code valide chaque prompt :
- Filtre les mots interdits ("text", "words", "title", "label", "logo", "face", "portrait")
- Si un prompt contient un mot interdit → le retirer et logger un warning
- Si un prompt est vide → utiliser un fallback generique basé sur l'emotion du beat

### 3.4 Fonction runC8ImagePrompts()

```typescript
export async function runC8ImagePrompts(
  directions: C7DirectionResult,
  mood: string,
  options: { lang: Language }
): Promise<ImagePromptResult[]>
```

**Flow** :
1. Filtrer les beats avec `imageReuse` → marquer skip=true
2. Envoyer les beats restants a Haiku pour generation de prompts
3. Recevoir les prompts, ajouter le suffixe style
4. Valider chaque prompt (mots interdits)
5. Retourner ImagePromptResult[]

**Tests** :
- Mock : prompt construction correcte
- Validation : mots interdits detectes et retires
- Skip : beats avec imageReuse ne generent pas de prompt

### Livrable Phase 3
- `p7c-image-prompts.ts`
- Prompt C8 dans `packages/ai/src/prompts/c8-image-prompts.ts`
- Suffixe builder
- Validation/filtrage post-LLM

---

## Phase 4 — P7d ComfyUI Client + Generation

> Pre-requis : Phase 3
> Fichier : `packages/ai/src/comfyui/comfyui-client.ts`

### 4.1 Workflow JSON Flux 2 Dev

Creer `packages/ai/src/comfyui/workflow-flux-txt2img.json` — le workflow ComfyUI minimaliste.

Structure du workflow :
```
Node 1: CheckpointLoaderSimple → Flux 2 Dev
Node 2: CLIPTextEncode → prompt (placeholder "__PROMPT__")
Node 3: KSampler → steps=25, cfg=3.5, sampler=euler, scheduler=normal, seed=random
Node 4: VAEDecode
Node 5: SaveImage → 1344x768
```

**Le prompt est injecte en remplacant "__PROMPT__" dans le JSON avant envoi.**

**Resolution image** : generer en **1920x1080 directement** dans ComfyUI.
Flux 2 Dev supporte des resolutions arbitraires (pas contraint a 1024x1024).
1920x1080 = 2 073 600 pixels — un peu plus lourd que 1344x768 (1 032 192 px)
mais ca evite tout probleme de crop/upscale dans Remotion.
Si trop lent ou trop cher, fallback a 1344x768 + object-fit:cover (crop ~1.7% lateral negligeable).

**Validation** : tester le workflow en local ou via Comfy Cloud UI manuellement.

### 4.2 Client API ComfyUI

```typescript
export class ComfyUIClient {
  constructor(config: { apiUrl: string; apiKey?: string });

  // Envoie un workflow et attend le resultat
  async generateImage(prompt: string, outputPath: string): Promise<{
    imagePath: string;
    promptId: string;
    durationMs: number;
  }>;

  // Batch avec concurrence limitee
  async generateBatch(
    items: Array<{ id: string; prompt: string }>,
    outputDir: string,
    concurrency?: number
  ): Promise<Map<string, string>>;  // id → imagePath
}
```

**Implementation** :
1. `generateImage()` :
   - Charger le workflow JSON template
   - Injecter le prompt dans le noeud CLIPTextEncode
   - POST `/api/prompt` avec le workflow
   - Poll `/api/job/{id}/status` toutes les 2s
   - Download l'image depuis `/api/view`
   - Sauvegarder dans outputPath
   - Retry 2x si echec

2. `generateBatch()` :
   - Creer le dossier output (`data/images/ep-{DATE}/`)
   - Utiliser un pool de concurrence (p-limit ou manual)
   - Concurrence default : 4
   - Progress log : "Image 23/67 generated (beat_023)"
   - Retourner Map<beatId, imagePath>

### 4.3 Fonction runImageGeneration()

```typescript
export async function runImageGeneration(
  prompts: ImagePromptResult[],
  directions: C7DirectionResult,
  date: string,
): Promise<Map<string, string>>  // beatId → imagePath
```

**Flow** :
1. Filtrer les prompts avec `skip=true`
2. Creer le dossier `data/images/ep-{date}/`
3. Appeler `comfyClient.generateBatch()`
4. Pour les beats avec `imageReuse`, copier le chemin de l'image source
5. Retourner la map complete beatId → imagePath

### 4.4 Mode dev (sans ComfyUI)

Flag `--skip-images` ou env `COMFYUI_API_URL` absent :
- Utiliser les images placeholder de `public/placeholders/`
- Assigner round-robin les placeholders aux beats
- Permet de tester tout le pipeline Remotion sans ComfyUI

### 4.5 Env vars

```
COMFYUI_API_URL=https://cloud.comfy.org/api
COMFYUI_API_KEY=...
```

### Livrable Phase 4
- `comfyui-client.ts` — client API avec batch et retry
- `workflow-flux-txt2img.json` — workflow template
- `p7d-image-generation.ts` — orchestrateur
- Mode dev sans ComfyUI (placeholders)
- `index.ts` barrel export dans comfyui/

---

## Phase 5 — Remotion BeatEpisode

> Pre-requis : Phase 0 (types + transitions + fixtures)
> **Peut etre developpe en PARALLELE des Phases 1-4**
> Fichiers dans `packages/remotion-app/src/`

### 5.1 BackgroundImage component

```
Fichier : scenes/beat/BackgroundImage.tsx
```

Affiche une image en fond avec un effet de mouvement.

**Props** :
```typescript
interface BackgroundImageProps {
  src: string;              // staticFile path ou URL
  effect: ImageEffect;
  durationInFrames: number;
}
```

**Implementation** :
- `ken_burns_in` : `transform: scale(${interpolate(frame, [0, dur], [1.0, 1.06], { extrapolateRight: 'clamp' })})` — zoom subtil 6% max (pas 8%, eviter le flou)
- `ken_burns_out` : inverse (1.06 → 1.0)
- `slow_pan_left` : `translateX(${interpolate(frame, [0, dur], [0, -2])}%)` — 2% max
- `slow_pan_right` : inverse
- `static` : rien
- Image en `object-fit: cover` sur tout le cadre 1920x1080
- `will-change: transform` pour performance GPU

**Tests dans Remotion Studio** : previsualiser chaque effet sur une image placeholder.

### 5.2 DataOverlay component

```
Fichier : scenes/beat/DataOverlay.tsx
```

Router qui rend le bon overlay par-dessus l'image.

**Props** :
```typescript
interface DataOverlayProps {
  overlay: BeatOverlay;
  assets: AssetSnapshot[];
  accentColor: string;
  durationInFrames: number;
}
```

**Fond semi-transparent** : chaque overlay est wrappé dans un conteneur avec :
```css
background: rgba(245, 240, 232, 0.82);  /* creme translucide */
border-radius: 10px;
padding: 16px 24px;
box-shadow: 0 2px 12px rgba(0,0,0,0.08);
```

**Routing par type** :
| overlay.type | Composant existant | Position par defaut | Notes |
|---|---|---|---|
| `stat` | `AnimatedStat` | `lower_third` | Taille modeste, pas geant |
| `chart` | `InkChart` | `center` (60% ecran) | Avec cadre editorial |
| `chart_zone` | `InkChart` + niveaux | `center` | Zoom sur zone S/R |
| `causal_chain` | `CausalChain` | `center` | 3-5 noeuds max |
| `comparison` | `MultiAssetBadge` | `bottom_third` | 2-4 assets |
| `headline` | Nouveau `HeadlineCard` | `lower_third` | Source + titre |
| `text_card` | Nouveau `TextCard` | `center` | Phrase cle, fond translucide |
| `heatmap` | `HeatmapGrid` | `center` | Grille sectorielle |
| `scenario_fork` | `ScenarioFork` | `center` | 2 branches |
| `gauge` | Nouveau `GaugeOverlay` | `top_right` | VIX ou F&G |
| `ticker_strip` | `PermanentTicker` etendu | `bottom` | Bandeau assets |

**Animations d'entree** (selon overlay.enterAnimation) :
- `pop` : spring scale 0→1 (stiffness 220, damping 14)
- `slide_up` : translateY(30px→0) + fade
- `fade` : opacity 0→1 en 15 frames
- `count_up` : animateNumber de 0 a valeur

**Delay** : `overlay.enterDelayMs` converti en frames → Sequence `from={delayFrames}`

### 5.3 Nouveaux composants overlay

3 petits composants a creer :

**HeadlineCard** (`scenes/shared/HeadlineCard.tsx`) :
- Source (mono, petite, accent color) + titre (serif, 2 lignes max)
- Fond translucide, bordure fine
- Fade in

**TextCard** (`scenes/shared/TextCard.tsx`) :
- Phrase cle centree, fonte serif
- Fond translucide large
- Utilise pour les moments de reflexion / conclusion

**GaugeOverlay** (`scenes/shared/GaugeOverlay.tsx`) :
- Jauge semi-circulaire simple (arc SVG)
- Label + valeur (count-up)
- Pour VIX et Fear&Greed Index

### 5.4 BeatSequence component

```
Fichier : scenes/beat/BeatSequence.tsx
```

1 beat = image de fond + overlay optionnel + disclaimer + grain.

**Props** :
```typescript
interface BeatSequenceProps {
  beat: Beat;
  assets: AssetSnapshot[];
  accentColor: string;
}
```

**Structure** :
```tsx
<AbsoluteFill>
  <BackgroundImage src={beat.imagePath} effect={beat.imageEffect} ... />
  {beat.overlay && (
    <DataOverlay overlay={beat.overlay} assets={assets} ... />
  )}
  {/* GrainOverlay et DisclaimerBar sont en VIEWPORT-LEVEL dans BeatEpisode,
      PAS ici — sinon ils se dissolvent avec les transitions entre beats */}
</AbsoluteFill>
```

### 5.5 BeatEpisode composition

```
Fichier : compositions/BeatEpisode.tsx
```

La composition principale — `TransitionSeries` de tous les beats.

**Props** :
```typescript
interface BeatEpisodeProps {
  script: EpisodeScript;
  beats: Beat[];
  assets: AssetSnapshot[];
  news: NewsItem[];
}
```

**Implementation** :

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { fade, slide, wipe } from '@remotion/transitions/presentations';
import { linearTiming, springTiming } from '@remotion/transitions/timings';

const transitionDuration = 15; // frames (0.5s @ 30fps)

function mapTransition(type: BeatTransition) {
  switch (type) {
    case 'cut':            return { presentation: fade(), timing: linearTiming({ durationInFrames: 1 }) };
    case 'fade':           return { presentation: fade(), timing: linearTiming({ durationInFrames: 15 }) };
    case 'slide_left':     return { presentation: slide({ direction: 'from-right' }), timing: springTiming({ config: { damping: 14 } }) };
    case 'slide_up':       return { presentation: slide({ direction: 'from-bottom' }), timing: linearTiming({ durationInFrames: 15 }) };
    case 'wipe':           return { presentation: wipe({ direction: 'from-left' }), timing: linearTiming({ durationInFrames: 20 }) };
    case 'cross_dissolve': return { presentation: fade(), timing: linearTiming({ durationInFrames: 24 }) };
  }
}

export const BeatEpisode: React.FC<BeatEpisodeProps> = ({ script, beats, assets }) => {
  const { fps } = useVideoConfig();
  const mood = script.direction?.moodMusic ?? 'neutre_analytique';
  const accentColor = BRAND.moodAccent[mood] ?? BRAND.colors.accentDefault;

  // Sous-titres : chaque beat = 1 ligne de sous-titre
  const subtitleLines = useMemo(() => buildSubtitleLines(beats, fps), [beats, fps]);

  return (
    <AbsoluteFill>
      {/* Couche 1 : les beats avec transitions (images + overlays) */}
      <TransitionSeries>
        {beats.map((beat, i) => {
          const durationInFrames = Math.round(getEffectiveDuration(beat) * fps);
          const nextTransition = i < beats.length - 1 ? mapTransition(beat.transitionOut) : null;

          return (
            <React.Fragment key={beat.id}>
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                <BeatSequence beat={beat} assets={assets} accentColor={accentColor} />
              </TransitionSeries.Sequence>
              {nextTransition && (
                <TransitionSeries.Transition
                  presentation={nextTransition.presentation}
                  timing={nextTransition.timing}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Couche 2 : overlays VIEWPORT-LEVEL (ne bougent JAMAIS pendant les transitions) */}
      <InkSubtitle lines={subtitleLines} />
      <GrainOverlay opacity={0.04} />
      <DisclaimerBar lang={script.lang} />
    </AbsoluteFill>
  );
};

// Sous-titres generes depuis les beats (chaque beat = 1 ligne)
function buildSubtitleLines(beats: Beat[], fps: number): SubtitleLine[] {
  return beats.map(beat => ({
    text: beat.narrationChunk,
    startFrame: Math.round(beat.startSec * fps),
    endFrame: Math.round((beat.startSec + getEffectiveDuration(beat)) * fps),
  }));
}
```

**ATTENTION — Gotcha TransitionSeries** : les transitions REDUISENT la duree totale.
Avec N beats et N-1 transitions de T frames chacune :
`dureeTotale = somme(beatDurations) - (N-1) * T`
Il faut compenser dans `calculateMetadata` pour que la duree totale reste correcte.

### 5.6 Enregistrement dans Root.tsx

Ajouter la composition `BeatDaily` dans Root.tsx :

```tsx
<Folder name="BeatEpisodes">
  <Composition
    id="BeatDaily"
    component={BeatEpisode}
    durationInFrames={SAMPLE_SCRIPT.totalDurationSec * 30}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{
      script: SAMPLE_SCRIPT,
      beats: SAMPLE_BEATS,
      assets: SAMPLE_ASSETS,
      news: SAMPLE_NEWS,
    }}
    calculateMetadata={({ props }) => {
      const beats = props.beats as Beat[];
      const fps = 30;
      const totalBeatFrames = beats.reduce(
        (sum, b) => sum + Math.round(getEffectiveDuration(b) * fps), 0
      );
      // Chaque transition a sa propre duree — sommer les overlaps reels
      const transitionOverlap = beats.slice(0, -1).reduce((sum, b) => {
        return sum + getTransitionDurationFrames(b.transitionOut);
      }, 0);
      return {
        durationInFrames: totalBeatFrames - transitionOverlap,
        fps, width: 1920, height: 1080,
      };
    }}
    // Helper :
    // function getTransitionDurationFrames(type: BeatTransition): number {
    //   switch (type) {
    //     case 'cut': return 1;
    //     case 'fade': return 15;
    //     case 'slide_left': case 'slide_up': return 15;
    //     case 'wipe': return 20;
    //     case 'cross_dissolve': return 24;
    //   }
    // }
  />
</Folder>
```

### 5.7 Sync overlay dans BeatSequence

L'overlay n'apparait PAS au frame 0 du beat. Il apparait apres le `enterDelayMs`.

```tsx
// Dans BeatSequence.tsx
const { fps } = useVideoConfig();
const delayFrames = Math.round((beat.overlay?.enterDelayMs ?? 0) / 1000 * fps);

return (
  <AbsoluteFill>
    <BackgroundImage ... />
    {beat.overlay && (
      <Sequence from={delayFrames}>
        <DataOverlay overlay={beat.overlay} ... />
      </Sequence>
    )}
    ...
  </AbsoluteFill>
);
```

**Le delay est relatif au debut du beat**, pas au debut de l'episode.
La `Sequence from={delayFrames}` gere ca naturellement car on est dans un TransitionSeries.Sequence.

### 5.8 Duree du beat (mode estime vs TTS)

Le BeatEpisode utilise la duree effective :

```typescript
function getEffectiveDuration(beat: Beat): number {
  // TTS disponible → duree reelle du WAV
  if (beat.timing.audioDurationSec !== undefined) {
    return beat.timing.audioDurationSec;
  }
  // Sinon → duree estimee par word count
  return beat.timing.estimatedDurationSec;
}
```

Quand Bloc F (TTS) sera implemente :
1. TTS genere un WAV par beat
2. On mesure la duree reelle du WAV
3. On met a jour `beat.timing.audioDurationSec`
4. Si word timestamps dispo, on recalcule `overlay.enterDelayMs` avec precision
5. Remotion utilise `<Audio src={beat.audioPath} />` synchronise au beat

```tsx
// Futur : audio par beat
<TransitionSeries.Sequence durationInFrames={durationInFrames}>
  <BeatSequence beat={beat} ... />
  {beat.audioPath && <Audio src={staticFile(beat.audioPath)} />}
</TransitionSeries.Sequence>
```

### 5.9 Image loading (delayRender)

Pour les images locales chargees via `staticFile()` ou `<Img>` de Remotion :
- Les images ne sont montees que quand leur `Sequence` est active (lazy loading naturel)
- Utiliser `<Img>` de Remotion (pas `<img>` HTML) pour le retry/timeout automatique
- Si image manquante → `PlaceholderSlot` existant en fallback

Pour les images externes (si jamais) : `delayRender()` + `continueRender()` dans un hook custom.

### Livrable Phase 5
- `BackgroundImage.tsx` — 5 effets (ken burns, pan, static)
- `DataOverlay.tsx` — routeur de 11 types d'overlay, fond translucide, animations
- `BeatSequence.tsx` — 1 beat (image + overlay delay + sync)
- `BeatEpisode.tsx` — TransitionSeries + viewport-level overlays (Grain, Disclaimer, Subtitles)
- `HeadlineCard.tsx`, `TextCard.tsx`, `GaugeOverlay.tsx` — 3 nouveaux composants
- `getEffectiveDuration()`, `getTransitionDurationFrames()` — helpers timing
- `buildSubtitleLines()` — sous-titres depuis beats
- Composition `BeatDaily` dans Root.tsx avec `calculateMetadata` correct (overlaps variables)
- **Testable dans Remotion Studio avec les fixtures/placeholders**

---

## Phase 6 — Integration pipeline

> Pre-requis : Phases 1-5 toutes terminees
> Fichiers : `packages/ai/src/pipeline/index.ts`, `scripts/generate.ts`

### 6.1 Orchestrateur P7 dans pipeline/index.ts

Ajouter les etapes P7a→P7d dans l'orchestrateur existant.

```typescript
export async function runVisualPipeline(
  script: EpisodeScript,
  snapshot: DailySnapshot,
  options: { lang: Language; date: string; skipImages?: boolean }
): Promise<BeatEpisodeData>
```

**Flow** :
1. P7a : `generateBeats(script)` → RawBeat[]
2. P7b : `runC7Direction(rawBeats, script.direction, snapshot.assets)` → C7DirectionResult
3. P7c : `runC8ImagePrompts(c7Result, script.direction.moodMusic)` → ImagePromptResult[]
4. P7d : `runImageGeneration(prompts, c7Result, options.date)` → Map<beatId, imagePath>
   (ou skip si `--skip-images`)
5. Assembler : fusionner RawBeat[] + C7 directions + prompts + imagePaths → Beat[]
6. Retourner BeatEpisodeData

### 6.2 Modification generate.ts

Inserer entre Step 2 et Step 3 :

```typescript
// Step 2.5: Visual Pipeline (P7a→P7d)
console.log("\n--- Step 2.5: Visual Pipeline ---");
let beatData: BeatEpisodeData | undefined;
const skipImages = !!opts['skip-images'] || !process.env.COMFYUI_API_URL;

try {
  beatData = await runVisualPipeline(script, snapshot, {
    lang,
    date,
    skipImages,
  });
  console.log(`  Beats: ${beatData.totalBeats} (${beatData.uniqueImages} images uniques)`);
  console.log(`  Overlays: ${beatData.stats.overlayCount}/${beatData.totalBeats} (${Math.round(beatData.stats.overlayCount/beatData.totalBeats*100)}%)`);
} catch (err) {
  console.warn(`  Visual pipeline failed: ${(err as Error).message.slice(0, 100)}`);
  console.warn(`  Falling back to legacy render`);
}
```

### 6.3 Modification du render (Step 5)

```typescript
// Choisir la composition selon le mode
const compositionId = beatData ? 'BeatDaily' : 'DailyRecap';

const remotionProps = {
  script,
  assets: snapshot.assets,
  news: snapshot.news,
  ...(beatData ? { beats: beatData.beats } : {}),
  ...(storyboard ? { storyboard } : {}),
};
```

### 6.4 CLI flags

| Flag | Effet |
|------|-------|
| `--skip-images` | P7a-P7c tournent mais P7d utilise des placeholders |
| `--legacy-render` | Ignore P7 entierement, utilise DailyRecapEpisode |
| `--no-render` | (existant) Skip le render |
| `--beats-only` | Genere les beats et s'arrete (debug) |
| `--cleanup-images` | Supprime les images des episodes > 7 jours |

### 6.4b Nettoyage images

~60 images × ~1-2MB = ~60-120MB par episode. Sur un mois = ~1.3-2.6GB.
Ajouter un nettoyage optionnel en fin de pipeline :

```typescript
if (opts['cleanup-images']) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const imgBase = path.resolve(__dirname, '..', 'data', 'images');
  for (const dir of fs.readdirSync(imgBase)) {
    const dateStr = dir.replace('ep-', '');
    if (dateStr < cutoff.toISOString().split('T')[0]) {
      fs.rmSync(path.join(imgBase, dir), { recursive: true });
      console.log(`  Cleaned up images: ${dir}`);
    }
  }
}
```

Aussi nettoyer `packages/remotion-app/public/episode-images/` apres le render.

### 6.5 Props file pour Remotion

Le fichier `data/props-{DATE}.json` doit inclure les beats :

```json
{
  "script": { ... },
  "beats": [ ... ],
  "assets": [ ... ],
  "news": [ ... ]
}
```

**Attention taille** : ~80 beats avec narration + prompts peut depasser 100KB.
C'est OK pour Remotion (il accepte des props JSON volumineux).

### 6.6 Images dans Remotion

Les images generees sont dans `data/images/ep-{DATE}/`.
Remotion a besoin que les images soient dans `public/` ou accessibles via `staticFile()`.

**Solution** : avant le render, copier (ou symlink) les images dans `packages/remotion-app/public/episode-images/`.
Le beat.imagePath est relatif : `episode-images/beat_001.png`.

```typescript
// Dans generate.ts, avant le render
if (beatData) {
  const imgDest = path.join(remotionAppDir, 'public', 'episode-images');
  fs.mkdirSync(imgDest, { recursive: true });
  for (const beat of beatData.beats) {
    if (beat.imagePath) {
      const dest = path.join(imgDest, path.basename(beat.imagePath));
      fs.copyFileSync(beat.imagePath, dest);
      beat.imagePath = `episode-images/${path.basename(beat.imagePath)}`;
    }
  }
}
```

### Livrable Phase 6
- `runVisualPipeline()` dans pipeline/index.ts
- generate.ts mis a jour (Step 2.5 + render adapte)
- CLI flags (--skip-images, --legacy-render, --beats-only)
- Copie images vers public/ pour Remotion
- Pipeline complet testable de bout en bout

---

## Phase 7 — Polish DA + tests visuels

> Pre-requis : Phase 6 (pipeline fonctionnel)
> Pas de nouveaux fichiers — ajustements et calibration

### 7.1 Test sur donnees reelles

1. Lancer le pipeline complet sur un snapshot reel :
   ```bash
   npm run generate -- --type daily_recap --lang fr --date 2026-03-18
   ```
2. Inspecter le resultat dans Remotion Studio (`npm run dev`)
3. Verifier :
   - Les images sont coherentes visuellement (meme photographe)
   - Le ratio overlay/image est ~35%
   - Les transitions sont fluides, pas saccadees
   - Les overlays sont lisibles sur les images de fond
   - Le rythme est varie (pas monotone)
   - Les ken burns ne causent pas de flou
   - Le disclaimer est visible en permanence

### 7.2 Calibration DA

Ajuster les prompts C7 et C8 en fonction des resultats visuels :

| Probleme observe | Correction |
|------------------|------------|
| Images trop dramatiques | Renforcer les interdits dans C7, ajouter "calm", "quiet" dans suffixe C8 |
| Images trop similaires entre elles | Demander a C7 plus de variete de lieux/sujets |
| Overlays illisibles sur certaines images | Augmenter l'opacite du fond translucide (0.82 → 0.88) |
| Ken burns trop visible | Reduire le zoom de 6% a 4% |
| Transitions trop rapides | Augmenter la duree de 15 a 20 frames |
| Rythme monotone | Ajuster les regles C7 sur l'alternance beat rapide/lent |
| Images avec du texte | Renforcer le filtre post-C8 |

### 7.3 Performance render

Avec ~65 beats et ~60 images 1344x768 :
- Verifier la memoire (les images sont lazy-loaded via Sequence)
- Tester le render complet : `npx remotion render ... --log=verbose`
- Si lent : reduire la concurrence render `--concurrency=2`
- Si OOM : verifier que les images ne sont pas toutes chargees en memoire

### 7.4 Fallbacks gracieux

Tester chaque mode degrade :
1. `--skip-images` → placeholders, pipeline visuel complet
2. `--legacy-render` → DailyRecapEpisode classique
3. ComfyUI down → fallback placeholders automatique
4. C7 Sonnet echoue → fallback mecanique (transitions fade, emotions contexte)
5. C8 Haiku echoue → prompts generiques par emotion
6. Image manquante → PlaceholderSlot dans BeatSequence

### 7.5 Fixtures mises a jour

Mettre a jour `sample-beats.ts` avec des beats generes par le vrai pipeline (pas des mocks).
Garder des images placeholder pour que Remotion Studio fonctionne sans ComfyUI.

### Livrable Phase 7
- Pipeline teste sur donnees reelles
- DA calibree (prompts ajustes)
- Performance validee
- Fallbacks testes
- Fixtures a jour

---

---

## Synchronisation Audio/Visuel — Architecture a 2 modes

> Cette section est TRANSVERSALE — elle impacte Phases 1, 5 et 6.
> Le BLUEPRINT dit : "WAV reels = timing MAITRE" (P8).

### Le probleme

L'overlay doit apparaitre quand le narrateur dit le chiffre, pas avant, pas apres.
Le chart doit s'afficher quand le narrateur parle de l'analyse technique.
La duree du beat doit correspondre a la duree reelle de la voix.

### Mode A — Sans TTS (Phase actuelle)

```
Narration estimee : 150 mots/60s = 2.5 mots/sec
Beat duration = wordCount / 2.5
Overlay delay = position relative du mot-cle dans le texte × duree beat
Chart timing = chartTimings P6 mappes au beat le plus proche
```

C'est approximatif (~±0.5s de precision) mais suffisant pour une video sans voix.
Le viewer voit l'image changer et l'overlay apparaitre de facon logique.

### Mode B — Avec TTS (futur Bloc F)

```
1. P7a genere les beats avec durees estimees + triggerWords
2. Bloc F genere un WAV par beat via ElevenLabs
3. ElevenLabs retourne word-level timestamps
4. RECALCUL :
   - beat.timing.audioDurationSec = duree reelle du WAV
   - beat.durationSec = audioDurationSec (remplace l'estimation)
   - beat.startSec = recalcule sequentiellement
   - beat.overlay.enterDelayMs = timestamp du triggerWord dans le WAV
5. Remotion utilise les durees WAV + <Audio> par beat
```

**Precision** : ~50ms (ElevenLabs word timestamps). Le viewer entend "moins douze pour cent"
et voit le chiffre -12% apparaitre exactement a ce moment.

### Ce que l'architecture doit garantir DES MAINTENANT

1. **`BeatTiming` a 2 champs** : `estimatedDurationSec` (toujours) + `audioDurationSec` (optionnel TTS)
2. **`BeatOverlay.triggerWord`** : stocke le mot-cle pour que TTS puisse recalculer le delay
3. **`Beat.audioPath`** : optionnel, rempli par Bloc F
4. **`BeatEpisode` utilise `getEffectiveDuration()`** : prend TTS si dispo, sinon estimation
5. **Les chartTimings de P6 sont mappes aux beats en P7a** : pas de timing absolu qui "flotte"

### Impact sur les phases

| Phase | Ajout sync |
|-------|-----------|
| Phase 0 | Types `BeatTiming`, `triggerWord`, `audioPath` |
| Phase 1 | `computeOverlayDelay()` avec triggerWord, `mapChartTimingsToBeats()` |
| Phase 5 | `Sequence from={delayFrames}` pour overlay, `getEffectiveDuration()`, futur `<Audio>` |
| Phase 6 | Quand TTS dispo : recalcul des durees + delays avant render |

---

## Dependances entre phases

```
Phase 0 (fondations)
  ├── Phase 1 (P7a beat gen)
  │     └── Phase 2 (P7b C7 direction)
  │           └── Phase 3 (P7c C8 prompts)
  │                 └── Phase 4 (P7d ComfyUI)
  │                       └──┐
  └── Phase 5 (Remotion)     │  ← peut demarrer des Phase 0
        (en parallele)       │
                             ├── Phase 6 (integration)
                             │     └── Phase 7 (polish)
```

**Phase 5 (Remotion) est independante des Phases 1-4.** On peut developper le BeatEpisode
avec des fixtures/placeholders pendant que le pipeline LLM+ComfyUI est construit.

---

## Estimation de travail

| Phase | Complexite | Ce qui prend du temps |
|-------|------------|----------------------|
| 0 | Faible | Types + deps + fixtures |
| 1 | Moyenne | Chunker de narration (frontieres de phrases FR), tests |
| 2 | **Elevee** | Prompt C7 — le plus important, necessite iterations |
| 3 | Faible | C8 est mecanique, prompt simple |
| 4 | Moyenne | Client API ComfyUI, batch, retry, mode dev |
| 5 | **Elevee** | TransitionSeries, BackgroundImage, DataOverlay, 3 composants |
| 6 | Moyenne | Wiring, copie images, CLI flags |
| 7 | **Variable** | Calibration DA — depend de la qualite des premieres images |

---

## Checklist pre-lancement

Avant de considerer le Bloc E v2 comme DONE :

**Pipeline**
- [ ] `npm run typecheck` — 0 erreurs
- [ ] Pipeline complet sur 3 dates differentes (donnees reelles)
- [ ] Ratio overlay ~30-40% sur les 3 episodes
- [ ] overlay.data correctement peuple (prix, candles, steps causaux — pas de `{}` vide)

**Images**
- [ ] Images coherentes visuellement intra-episode (meme photographe)
- [ ] Aucune image avec du texte visible
- [ ] Aucun visage identifiable
- [ ] Resolution correcte (1920x1080 ou 1344x768 sans deformation)
- [ ] Ken Burns fluide, pas de flou (zoom ≤6%)

**Composition Remotion**
- [ ] Transitions fluides, pas de frames blanches
- [ ] Overlays lisibles sur toutes les images (fond translucide)
- [ ] DisclaimerBar visible en PERMANENCE (viewport-level, ne bouge pas pendant transitions)
- [ ] GrainOverlay en viewport-level (ne se dissout pas)
- [ ] Sous-titres (InkSubtitle) affiches en viewport-level
- [ ] Duree totale video correcte (7-11 min) — calculateMetadata avec overlaps variables
- [ ] Transitions fortes aux frontieres de segment, legeres intra-segment

**Sync narration/visuel**
- [ ] Overlays apparaissent au bon moment (quand la narration mentionne le chiffre/asset)
- [ ] chartTimings de P6 correctement mappes aux beats
- [ ] Chaque overlay a un triggerWord stocke (pret pour sync TTS future)
- [ ] BeatTiming supporte les 2 modes (estime + audioDurationSec)

**Modes et fallbacks**
- [ ] Mode `--skip-images` fonctionne (placeholders)
- [ ] Mode `--legacy-render` fonctionne (DailyRecapEpisode)
- [ ] Mode `--beats-only` fonctionne (debug)
- [ ] Fallback ComfyUI down → placeholders automatique
- [ ] Fallback C7 echoue → directions mecaniques
- [ ] Fallback image manquante → PlaceholderSlot

**Performance**
- [ ] Render complet en temps raisonnable (<5 min)
- [ ] Memoire stable pendant le render (~65 images lazy-loaded)
- [ ] `--cleanup-images` supprime les images >7 jours
