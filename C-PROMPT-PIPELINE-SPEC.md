# Bloc C — Prompt Pipeline Spec (C1→C5)

> Refactoring du monolithe `script-generator.ts` en 5 couches LLM séquentielles.
> Chaque couche a un rôle unique, un input précis, un output typé.
> Cohérent avec : BLUEPRINT v3, D2 NewsMemory, D3 MarketMemory, Bloc B Knowledge.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Flux de données global](#2-flux-de-données-global)
3. [Types & Interfaces](#3-types--interfaces)
4. [P1 — Pré-filtrage mécanique (Code)](#4-p1--pré-filtrage-mécanique-code)
5. [P2 — C1 Haiku : Sélection éditoriale](#5-p2--c1-haiku--sélection-éditoriale)
6. [P3 — C2 Sonnet : Analyse approfondie](#6-p3--c2-sonnet--analyse-approfondie)
7. [P4 — C3 Opus : Rédaction narrative](#7-p4--c3-opus--rédaction-narrative)
8. [P5 — C4 Code + Haiku : Validation](#8-p5--c4-code--haiku--validation)
9. [P6 — C5 Sonnet : Direction globale](#9-p6--c5-sonnet--direction-globale)
10. [Orchestrateur](#10-orchestrateur)
11. [Intégration mémoires (D2, D3, EpisodeMemory)](#11-intégration-mémoires)
12. [Migration depuis le monolithe](#12-migration-depuis-le-monolithe)
13. [Coût LLM estimé](#13-coût-llm-estimé)
14. [Ordre d'implémentation](#14-ordre-dimplémentation)
15. [Tests](#15-tests)

---

## 1. Vue d'ensemble

### Problème actuel

`script-generator.ts` est un monolithe : un seul appel LLM (Sonnet/Opus) reçoit TOUT
(données brutes, knowledge, mémoire, règles compliance, instructions de structure)
et produit TOUT (sélection éditoriale, analyse, narration, visual cues).

Résultat : prompt de ~15-20K tokens, qualité inconsistante, impossible à debugger,
pas de validation intermédiaire, pas de séparation des responsabilités.

### Solution

5 couches LLM séquentielles, chacune spécialisée :

```
P0 Ingestion (code existant — inchangé)
    ↓ snapshot.json
P1 Pré-filtrage mécanique (code pur — scoring)
    ↓ snapshot_flagged.json
P2 C1 Haiku — Sélection éditoriale (quoi couvrir, dans quel ordre)
    ↓ editorial.json
P3 C2 Sonnet — Analyse (chaînes causales, scénarios, chart instructions)
    ↓ analysis.json
P4 C3 Opus — Rédaction (narration spoken, visual cues abstraites)
    ↓ episode_draft.json
P5 C4 Code + Haiku — Validation (seule boucle, max 1 retry)
    ↓ episode_validated.json
P6 C5 Sonnet — Direction (arc, transitions, timing, thumbnail)
    ↓ episode_directed.json → branches P7 production
```

### Principes

- **Séparation stricte** : chaque couche a un job unique, ne duplique pas le travail des autres.
- **Code d'abord** : tout ce qui est déterministe est du code (scoring, vérification chiffres, CausalBrief).
- **Une seule boucle** : P5 uniquement. Si des boucles apparaissent ailleurs → bug de prompt à corriger.
- **Pas de boucle P3→P2** : si C2 ne trouve pas de causal pour un DEEP, c'est un bug C1.
- **Dégradation gracieuse** : si une mémoire (D2/D3/EpisodeMemory) est vide, la couche fonctionne sans.
- **Chaque output est un JSON persisté** : debuggable, rejouable couche par couche.

---

## 2. Flux de données global

```
┌──────────────────────────────────────────────────────────┐
│  INPUTS EXISTANTS (inchangés)                            │
│                                                          │
│  DailySnapshot ──────────────────────────────────────┐   │
│    ├─ assets[] (38 watchlist + screenResults)         │   │
│    ├─ news[] (30 RSS feeds)                           │   │
│    ├─ events[] (Supabase calendar)                    │   │
│    ├─ yields, sentiment, earnings, cotPositioning     │   │
│    └─ themesDuJour (pre-digested themes)              │   │
│                                                       │   │
│  D2 NewsMemory (SQLite) ─────────────────────────┐   │   │
│    ├─ researchContext (top movers, themes, events)│   │   │
│    └─ searchByAsset(), countByTheme()             │   │   │
│                                                   │   │   │
│  D3 MarketMemory (JSON par asset) ───────────┐   │   │   │
│    ├─ zones, events, indicators_daily         │   │   │   │
│    ├─ context.regime, context.impression      │   │   │   │
│    └─ market_weekly_brief.json                │   │   │   │
│                                               │   │   │   │
│  EpisodeMemory ──────────────────────────┐   │   │   │   │
│    ├─ 15 derniers épisodes (compact)     │   │   │   │   │
│    └─ 5 derniers scripts (complets)      │   │   │   │   │
│                                          │   │   │   │   │
│  Knowledge (Bloc B) ─────────────────┐   │   │   │   │   │
│    ├─ Tier 1: ton, narration, TA     │   │   │   │   │   │
│    ├─ Tier 2: central banks, macro   │   │   │   │   │   │
│    └─ Tier 3: asset profiles         │   │   │   │   │   │
└──┼───────────────────────────────────┼───┼───┼───┼───┼───┘
   │                                   │   │   │   │   │
   ▼                                   │   │   │   │   │
┌─────────────────────────────┐        │   │   │   │   │
│  P1 CODE — Pré-filtrage     │◄───────┘   │   │   │   │
│  Score matérialité par asset│             │   │   │   │
└──────────┬──────────────────┘             │   │   │   │
           ▼ snapshot_flagged               │   │   │   │
┌─────────────────────────────┐            │   │   │   │
│  P2 C1 HAIKU — Éditeur      │◄───────────┘   │   │   │
│  + episodeSummaries[15]      │◄───────────────┘   │   │
│  + researchContext (D2)      │                    │   │
│  + weeklyBrief (D3)         │                    │   │
└──────────┬──────────────────┘                    │   │
           ▼ editorial.json                        │   │
┌─────────────────────────────┐                   │   │
│  P3 C2 SONNET — Analyste    │◄──────────────────┘   │
│  + données assets sélectionnés                       │
│  + MarketMemory DEEP/FOCUS  │                       │
│  + CausalBrief (code)       │                       │
│  + researchContext (D2)     │◄──────────────────────┘
│  + Knowledge Tier 2/3      │
└──────────┬──────────────────┘
           ▼ analysis.json
┌─────────────────────────────┐
│  P4 C3 OPUS — Rédacteur     │
│  + editorial (C1)           │
│  + analysis (C2)            │
│  + recentScripts[3-5]       │
│  + Knowledge Tier 1         │
│  + règles compliance        │
│  + budget mots/segment      │
└──────────┬──────────────────┘
           ▼ episode_draft.json
┌─────────────────────────────┐
│  P5 C4 CODE + HAIKU — Valid. │
│  Code: chiffres, durée, regex│
│  Haiku: compliance, ton      │
│  Max 1 retry → C3            │
└──────────┬──────────────────┘
           ▼ episode_validated.json
┌─────────────────────────────┐
│  P6 C5 SONNET — Directeur   │
│  + episode_validated         │
│  + editorial (C1)           │
│  + globalContext (C2)        │
│  + chart_instructions (C2)  │
└──────────┬──────────────────┘
           ▼ episode_directed.json → P7 branches parallèles
```

### Qui reçoit quoi — Matrice complète

| Donnée                          | P1 Code | P2 C1 | P3 C2 | P4 C3 | P5 C4 | P6 C5 |
|---------------------------------|---------|-------|-------|-------|-------|-------|
| DailySnapshot (brut)            | ✅      | —     | —     | —     | —     | —     |
| snapshot_flagged (scores)       | output  | ✅    | —     | —     | —     | —     |
| ThemesDuJour                    | —       | ✅    | —     | —     | —     | —     |
| D2 researchContext              | —       | ✅    | ✅    | —     | —     | —     |
| D3 weeklyBrief                  | —       | ✅    | —     | —     | —     | —     |
| D3 MarketMemory (par asset)     | —       | —     | ✅*   | —     | —     | —     |
| CausalBrief (code)              | —       | —     | ✅    | —     | —     | —     |
| EpisodeSummaries (15j compact)  | —       | ✅    | —     | —     | —     | —     |
| RecentScripts (3-5j complets)   | —       | —     | —     | ✅    | —     | —     |
| Knowledge Tier 1 (ton/narr/TA)  | —       | —     | —     | ✅    | —     | —     |
| Knowledge Tier 2/3 (conditionnel)| —      | —     | ✅    | —     | —     | —     |
| Asset profiles (Tier 3)         | —       | —     | ✅*   | —     | —     | —     |
| editorial.json (C1 output)      | —       | output| ✅    | ✅    | ✅    | ✅    |
| analysis.json (C2 output)       | —       | —     | output| ✅    | ✅    | ✅    |
| episode_draft.json (C3 output)  | —       | —     | —     | output| ✅    | —     |
| episode_validated (C4 output)   | —       | —     | —     | —     | output| ✅    |
| Règles compliance               | —       | —     | —     | ✅    | ✅    | —     |
| Budget mots/segment (code)      | —       | —     | —     | ✅    | ✅    | —     |

*`✅*` = seulement pour les assets classés DEEP/FOCUS par C1

---

## 3. Types & Interfaces

### 3.1 P1 Output — `SnapshotFlagged`

```typescript
/** Flags de matérialité détectés par le code */
type MaterialityFlag =
  | 'PRICE_MOVE'        // variation >±2%
  | 'VOLUME_SPIKE'      // volume >150% moyenne 20j
  | 'EMA_BREAK'         // cassure EMA9 ou EMA21
  | 'RSI_EXTREME'       // RSI <25 ou >75
  | 'EARNINGS_SURPRISE'  // beat/miss >10%
  | 'SENTIMENT_EXTREME'  // Fear&Greed <10 ou >90
  | 'NEWS_LINKED'        // news associée dans les 12h
  | 'ZONE_EVENT'         // D3: événement zone détecté (CASSURE, REJET...)
  | 'ATH_PROXIMITY'      // <5% de l'ATH (multiTF)
  | 'SMA200_CROSS';      // croisement SMA200

interface FlaggedAsset {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  materialityScore: number;      // nombre de flags
  flags: MaterialityFlag[];
  // Données brutes préservées (ref vers AssetSnapshot)
  snapshot: AssetSnapshot;
}

interface SnapshotFlagged {
  date: string;
  assets: FlaggedAsset[];         // TOUS les assets, triés par score desc
  events: EconomicEvent[];        // calendrier éco du jour
  yields: BondYields;
  sentiment: MarketSentiment;
  earnings: StockScreenResult[];  // earnings du jour
  themesDuJour: ThemesDuJour;     // pré-digéré par code existant
  screenResults: StockScreenResult[];
}
```

### 3.2 P2 Output — `EditorialPlan`

```typescript
type SegmentDepth = 'DEEP' | 'FOCUS' | 'FLASH';

interface PlannedSegment {
  id: string;                     // "seg_1", "seg_2", etc.
  topic: string;                  // slug: "or-support-historique"
  depth: SegmentDepth;
  assets: string[];               // symboles: ["GC=F", "SLV"]
  angle: string;                  // "rebond technique après sell-off", "cassure résistance"
  justification: string;          // pourquoi ce sujet, cette profondeur
  continuityFromJ1?: string;      // ref à un épisode précédent si applicable
}

interface EditorialPlan {
  date: string;
  dominantTheme: string;          // slug du thème dominant
  threadSummary: string;          // fil conducteur en 1-2 phrases
  moodMarche: 'risk-on' | 'risk-off' | 'incertain' | 'rotation';
  coldOpenFact: string;           // le fait le plus frappant pour le hook
  closingTeaser: string;          // teaser pour la question de closing
  segments: PlannedSegment[];     // ordonnés narrativement (pas par score)
  skippedAssets: Array<{          // assets non retenus avec raison
    symbol: string;
    reason: string;               // "couvert hier", "score 0 sans continuité"
  }>;

  // Contraintes structurelles vérifiables
  deepCount: number;              // max 2
  flashCount: number;             // min 2
  totalSegments: number;          // 4-7
}
```

### 3.3 P3 Output — `AnalysisBundle`

```typescript
type ConfidenceLevel = 'high' | 'medium' | 'speculative';

interface SegmentAnalysis {
  segmentId: string;              // réf au segment C1
  keyFacts: string[];             // 3-5 faits saillants chiffrés
  technicalReading: string;       // lecture technique synthétique
  fundamentalContext: string;     // contexte macro/fondamental
  causalChain?: string;           // chaîne causale si applicable
  scenarios: {
    bullish: {
      target: string;             // niveau cible
      condition: string;          // "si le support 2900 tient"
    };
    bearish: {
      target: string;             // niveau d'invalidation
      condition: string;          // "en cas de cassure sous 2850"
    };
  };
  narrativeHook: string;          // l'accroche suggérée pour C3
  chartInstructions: ChartInstruction[];  // quoi afficher (sans timing)
  visualSuggestions: string[];    // idées visuels abstraites
  risk: string;                   // ce qui pourrait invalider l'analyse
  confidenceLevel: ConfidenceLevel;
}

interface ChartInstruction {
  type: 'support_line' | 'resistance_line' | 'annotation' | 'zone_highlight'
       | 'trend_line' | 'indicator_overlay' | 'price_label';
  asset: string;
  value?: number;
  label?: string;
  timeframe?: string;             // "H1", "D1", "W1"
  detail?: string;                // "bougie de cassure du 19/02"
}

interface GlobalContext {
  marketMood: string;             // "risk-off dominé par tensions commerciales"
  dominantTheme: string;          // fil rouge confirmé/ajusté depuis C1
  crossSegmentLinks: string[];    // liens inter-segments identifiés
  keyRisks: string[];             // risques transversaux
}

interface AnalysisBundle {
  segments: SegmentAnalysis[];
  globalContext: GlobalContext;
}
```

### 3.4 P4 Output — `DraftScript`

```typescript
interface NarrationSegment {
  segmentId: string;              // réf au segment C1
  type: 'segment';
  title: string;                  // titre affiché
  narration: string;              // texte parlé continu
  depth: SegmentDepth;
  topic: string;
  assets: string[];
  visualCues: VisualCue[];        // instructions visuels abstraites
  predictions?: Prediction[];     // pour DEEP/FOCUS uniquement
  transitionTo?: string;          // lien narratif vers segment suivant
  durationSec: number;            // estimé depuis wordCount
  wordCount: number;
}

interface NarrationBlock {
  type: 'hook' | 'title_card' | 'thread' | 'closing';
  title: string;
  narration: string;              // "" pour title_card
  durationSec: number;
  wordCount: number;
  visualCues?: VisualCue[];
}

interface DraftScript {
  date: string;
  title: string;                  // titre épisode
  description: string;            // description YouTube courte
  coldOpen: NarrationBlock;       // hook 5-10s
  titleCard: NarrationBlock;      // visuel only 3-5s
  thread: NarrationBlock;         // fil conducteur 15-25s
  segments: NarrationSegment[];   // 4-7 segments ordonnés
  closing: NarrationBlock;        // 20-30s
  metadata: {
    totalWordCount: number;
    totalDurationSec: number;     // estimé
    toneProfile: string;          // "analytique-accessible"
    dominantTheme: string;
    threadSummary: string;
    moodMarche: string;
    coverageTopics: string[];
    segmentCount: number;
  };
}
```

### 3.5 P5 Output — `ValidationResult`

```typescript
interface ValidationIssue {
  type: 'compliance' | 'factual' | 'length' | 'tone' | 'structure' | 'repetition';
  segmentId?: string;             // null si global
  description: string;
  severity: 'blocker' | 'warning';
  suggestedFix?: string;
  source: 'code' | 'haiku';      // qui a détecté
}

interface ValidationResult {
  status: 'pass' | 'needs_revision';
  issues: ValidationIssue[];
  // Si status=pass et il y a des warnings, le script est retourné avec fixes mineurs
  validatedScript: DraftScript;   // potentiellement modifié (fixes mineurs Haiku)
}
```

### 3.6 P6 Output — `DirectedEpisode`

```typescript
type MoodTag =
  | 'tension_geopolitique'
  | 'risk_off_calme'
  | 'bullish_momentum'
  | 'neutre_analytique'
  | 'incertitude';

type TransitionType = 'cut' | 'fade' | 'wipe' | 'zoom_out' | 'slide';

interface ArcBeat {
  segmentId: string;
  tensionLevel: number;           // 1-10
  role: 'montee' | 'pic' | 'respiration' | 'closing';
}

interface Transition {
  fromSegmentId: string;
  toSegmentId: string;
  type: TransitionType;
  durationMs: number;             // 300-1000ms
  soundEffect?: 'silence' | 'sting' | 'swoosh' | 'none';
  vocalShift?: string;            // "ralentir", "pause", "accélérer"
}

interface ChartTiming {
  chartInstruction: ChartInstruction;  // depuis C2
  showAtSec: number;              // timestamp vidéo
  hideAtSec: number;              // timestamp fin
}

interface ThumbnailMoment {
  segmentId: string;
  reason: string;                 // "chiffre exceptionnel" / "visual fort"
  keyFigure?: string;             // "2950$" — le chiffre à mettre en overlay
  emotionalTone: string;          // "choc" / "tension" / "triumph"
}

interface DirectedEpisode {
  // Narration inchangée depuis C4
  script: DraftScript;

  // Ajouts C5
  arc: ArcBeat[];
  transitions: Transition[];
  thumbnailMoment: ThumbnailMoment;
  moodMusic: MoodTag;
  chartTimings: ChartTiming[];

  // Métadonnées
  totalEstimatedDuration: number; // secondes, avant TTS
}
```

### 3.7 Types utilitaires

```typescript
/** Résumé compact d'un épisode pour C1 (15 derniers jours) */
interface EpisodeSummary {
  date: string;
  label: string;                  // "J-1", "J-2", etc.
  segmentTopics: string[];        // ["Or: rebond support", "SPX: test ATH"]
  predictions: Array<{
    asset: string;
    claim: string;
    resolved: boolean;
    outcome?: 'correct' | 'incorrect' | 'pending';
  }>;
  angles: string[];               // ["comparaison historique", "tension géopolitique"]
  dominantTheme: string;
  moodMarche: string;
}

/** Budget mots par segment, calculé par code */
interface WordBudget {
  hook: number;                   // ~25 mots (10s)
  titleCard: 0;                   // visuel only
  thread: number;                 // ~50 mots (20s)
  segments: Array<{
    segmentId: string;
    depth: SegmentDepth;
    targetWords: number;          // FLASH: 50-75, FOCUS: 100-150, DEEP: 175-225
    maxWords: number;             // target + 15% tolérance
  }>;
  closing: number;                // ~60 mots (25s)
  totalTarget: number;            // ~1200-1500 mots
}

/** CausalBrief — généré par CODE, pas LLM */
interface CausalBrief {
  chains: Array<{
    name: string;                 // "Dollar fort → pression commodities"
    confidence: number;           // 0-1
    steps: string[];              // ["DXY +0.8%", "→ GC=F -1.2%", "→ SLV -2.1%"]
    relatedAssets: string[];
  }>;
  intermarketSignals: Array<{
    signal: string;               // "yield_curve_steepening"
    implication: string;          // "banques favorisées, tech sous pression"
  }>;
}
```

---

## 4. P1 — Pré-filtrage mécanique (Code)

### Responsabilité

Scorer chaque asset avec des règles déterministes. **Ne filtre pas** — score seulement.
P2 (C1 Haiku) décide quoi garder.

### Input

- `DailySnapshot` complet (38 watchlist + screenResults)
- `MarketMemory` chargée (pour flag ZONE_EVENT)

### Algorithme

```typescript
function flagAssets(snapshot: DailySnapshot): SnapshotFlagged {
  const flagged: FlaggedAsset[] = [];

  for (const asset of snapshot.assets) {
    const flags: MaterialityFlag[] = [];

    // Prix
    if (Math.abs(asset.changePct) > 2) flags.push('PRICE_MOVE');

    // Volume
    if (asset.technicals?.volumeAnomaly) flags.push('VOLUME_SPIKE');

    // EMA
    const t = asset.technicals;
    if (t && asset.price) {
      if ((t.ema9 && asset.price > t.ema9 && asset.candles?.[asset.candles.length-2]?.c < t.ema9) ||
          (t.ema21 && asset.price > t.ema21 && asset.candles?.[asset.candles.length-2]?.c < t.ema21))
        flags.push('EMA_BREAK');
    }

    // RSI
    if (t?.rsi14 !== undefined && (t.rsi14 < 25 || t.rsi14 > 75))
      flags.push('RSI_EXTREME');

    // Earnings
    const earning = snapshot.earnings?.find(e => e.symbol === asset.symbol);
    if (earning?.earningsDetail) {
      const { epsActual, epsEstimate } = earning.earningsDetail;
      if (epsActual && epsEstimate && Math.abs((epsActual - epsEstimate) / epsEstimate) > 0.1)
        flags.push('EARNINGS_SURPRISE');
    }

    // Sentiment extrême
    if (snapshot.sentiment) {
      const fg = snapshot.sentiment.cryptoFearGreed;
      if (fg !== undefined && (fg < 10 || fg > 90))
        flags.push('SENTIMENT_EXTREME');
    }

    // News liée (vérification titre contient symbol ou nom)
    const hasLinkedNews = snapshot.news?.some(n =>
      n.title.toUpperCase().includes(asset.symbol) ||
      n.title.toUpperCase().includes(asset.name.toUpperCase())
    );
    if (hasLinkedNews) flags.push('NEWS_LINKED');

    // D3 MarketMemory zone event
    const memory = loadMemory(asset.symbol);
    if (memory?.last_events?.some(e =>
      e.date === snapshot.date || isToday(e.date)
    )) flags.push('ZONE_EVENT');

    // ATH proximity (multiTF)
    if (asset.multiTF?.daily3y?.distanceFromATH !== undefined &&
        asset.multiTF.daily3y.distanceFromATH < 5)
      flags.push('ATH_PROXIMITY');

    // SMA200 cross
    if (asset.multiTF?.daily3y?.sma200 !== undefined && asset.price) {
      const prevClose = asset.candles?.[asset.candles.length-2]?.c;
      if (prevClose && asset.multiTF.daily3y.sma200) {
        const crossUp = prevClose < asset.multiTF.daily3y.sma200 && asset.price > asset.multiTF.daily3y.sma200;
        const crossDown = prevClose > asset.multiTF.daily3y.sma200 && asset.price < asset.multiTF.daily3y.sma200;
        if (crossUp || crossDown) flags.push('SMA200_CROSS');
      }
    }

    flagged.push({
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      changePct: asset.changePct,
      materialityScore: flags.length,
      flags,
      snapshot: asset,
    });
  }

  // Tri par score décroissant
  flagged.sort((a, b) => b.materialityScore - a.materialityScore);

  return {
    date: snapshot.date ?? new Date().toISOString().slice(0, 10),
    assets: flagged,
    events: snapshot.events ?? [],
    yields: snapshot.yields!,
    sentiment: snapshot.sentiment!,
    earnings: snapshot.earnings ?? [],
    themesDuJour: snapshot.themesDuJour!,
    screenResults: snapshot.screenResults ?? [],
  };
}
```

### Seuils

| Flag               | Condition                              |
|---------------------|---------------------------------------|
| PRICE_MOVE          | `|changePct| > 2%`                    |
| VOLUME_SPIKE        | `volumeAnomaly = true` (>150% moy20j)|
| EMA_BREAK           | Prix croise EMA9 ou EMA21             |
| RSI_EXTREME         | `RSI < 25` ou `RSI > 75`             |
| EARNINGS_SURPRISE   | `|epsActual - epsEstimate| > 10%`     |
| SENTIMENT_EXTREME   | Fear & Greed `< 10` ou `> 90`        |
| NEWS_LINKED         | Titre de news contient symbol/nom     |
| ZONE_EVENT          | D3 événement zone détecté aujourd'hui |
| ATH_PROXIMITY       | `< 5%` de l'ATH (multiTF daily3y)    |
| SMA200_CROSS        | Prix croise SMA200 aujourd'hui        |

### Output

`snapshot_flagged.json` — tous les assets avec score + flags + données brutes intactes.

**Important** : aucun asset n'est supprimé. Score 0 = candidat skip, mais C1 peut le retenir
pour une continuité narrative J-1.

---

## 5. P2 — C1 Haiku : Sélection éditoriale

### Responsabilité

Décider **quoi couvrir, dans quel ordre, avec quel angle**. C'est l'éditeur en chef.

### Modèle

Haiku (`fast` role) — décisions rapides, pas de rédaction.

### Input prompt (~3-5K tokens)

```
SYSTEM:
  Tu es l'éditeur en chef d'une émission quotidienne de marché.
  Tu sélectionnes les sujets, leur profondeur, et l'ordre narratif.

USER:
  [1] THÈMES DU JOUR (~800 tokens)
  {themesDuJour} — thèmes pré-digérés avec editorialScore, causalChains

  [2] ASSETS SCORÉS (~1500 tokens)
  Format compact par asset :
  "{symbol} | {changePct}% | score:{materialityScore} | flags:{flags} | dramaScore:{dramaScore}"
  Triés par materialityScore desc. Tous les 38+ assets listés.

  [3] CALENDRIER ÉCO (~200 tokens)
  Events du jour : nom, heure, importance, consensus

  [4] EARNINGS DU JOUR (~200 tokens)
  Si applicable : symbol, EPS actual vs estimate, beat/miss %

  [5] RÉSUMÉ ÉPISODES RÉCENTS (~800 tokens)
  {episodeSummaries[15]}
  Par jour : date, sujets couverts, prédictions faites (résolues?), angles utilisés

  [6] CONTEXTE RECHERCHE D2 (~500 tokens)
  Top thèmes cette semaine, events éco récents

  [7] BRIEF HEBDO D3 (~300 tokens)
  {market_weekly_brief} — régime par asset, zones notables, watchlist de la semaine
```

### Contraintes injectées dans le prompt

```
CONTRAINTES STRUCTURELLES :
- Sélectionner 4 à 7 segments
- Maximum 2 DEEP, minimum 2 FLASH
- Le premier segment = le plus important
- Le dernier segment = toujours un FLASH
- Ne pas re-couvrir un sujet traité les 2 derniers jours avec le même angle
- Identifier au moins 1 continuité J-1 si une prédiction est résolue
- Le fil conducteur relie au moins 3 segments entre eux

FORMAT DE SORTIE — JSON strict :
{EditorialPlan}
```

### Ce que C1 décide (et personne d'autre)

1. **Quoi couvrir** — sélection parmi tous les assets/thèmes
2. **Profondeur** — DEEP / FOCUS / FLASH par segment
3. **Ordre narratif** — arc de la vidéo, pas tri par score
4. **Fil conducteur** — thème + lien entre segments
5. **Angle éditorial** — pour chaque segment, l'angle spécifique
6. **Continuités J-1** — prédictions à suivre, scénarios à mettre à jour
7. **Cold open** — le fait le plus frappant
8. **Closing teaser** — la question d'engagement

### Ce que C1 ne fait PAS

- Pas d'analyse technique (C2)
- Pas de rédaction (C3)
- Pas de chaîne causale détaillée (C2)
- Pas de visual cues (C3)

### Validation output (code)

```typescript
function validateEditorialPlan(plan: EditorialPlan): string[] {
  const errors: string[] = [];
  if (plan.segments.length < 4 || plan.segments.length > 7)
    errors.push(`Segments count ${plan.segments.length} hors range 4-7`);
  if (plan.deepCount > 2)
    errors.push(`${plan.deepCount} DEEP > max 2`);
  if (plan.flashCount < 2)
    errors.push(`${plan.flashCount} FLASH < min 2`);
  const lastSeg = plan.segments[plan.segments.length - 1];
  if (lastSeg.depth !== 'FLASH')
    errors.push(`Dernier segment doit être FLASH, got ${lastSeg.depth}`);
  if (!plan.threadSummary || plan.threadSummary.length < 10)
    errors.push('threadSummary trop court ou manquant');
  if (!plan.coldOpenFact)
    errors.push('coldOpenFact manquant');
  return errors;
}
```

Si la validation échoue → on re-call C1 une fois avec le feedback. Si toujours KO → fallback
sur sélection mécanique (top 5 par materialityScore, 1 DEEP, 2 FOCUS, 2 FLASH).

---

## 6. P3 — C2 Sonnet : Analyse approfondie

### Responsabilité

Produire une **analyse structurée** par segment + un contexte global.
Chaînes causales, scénarios chiffrés, chart instructions. **Zéro narration.**

### Modèle

Sonnet (`balanced` role) — raisonnement analytique.

### Input prompt (~5-8K tokens)

```
SYSTEM:
  Tu es un analyste de marché senior. Tu produis des analyses structurées
  avec chaînes causales, scénarios chiffrés et niveaux techniques.
  Tu ne rédiges PAS de narration — juste de l'analyse brute.

USER:
  [1] PLAN ÉDITORIAL (~500 tokens)
  {editorial.json} — segments sélectionnés avec profondeur et angle demandé

  [2] DONNÉES ASSETS SÉLECTIONNÉS (~2000-3000 tokens)
  Pour chaque asset dans les segments (DEEP/FOCUS uniquement, full data) :
  - Prix, change%, OHLCV
  - Technicals : EMA9/21, RSI, supports/résistances, trend
  - MultiTF : weekly10y, daily3y, daily1y (trend, SMA, RSI, volatilité)
  Pour les FLASH : données minimales (prix, change%, 1 ligne)

  [3] MARKET MEMORY D3 (~500-1000 tokens)
  Pour les assets DEEP/FOCUS uniquement :
  - Zones (support/résistance avec historique touch)
  - Derniers événements zone (CASSURE, REJET, etc.)
  - Régime (bull/bear/range)
  - Indicateurs daily (BB width, SMA20 slope, ATR ratio)

  [4] CAUSAL BRIEF (~300-500 tokens)
  {causalBrief} — chaînes causales pré-calculées par code :
  - Corrélations intermarché actives
  - Signaux yield curve
  - Implications sectorielles

  [5] CONTEXTE RECHERCHE D2 (~500 tokens)
  - Articles récents par asset (7 derniers jours)
  - Distribution thématique
  - Events éco récents avec outcome (beat/miss)

  [6] KNOWLEDGE CONDITIONNEL (~500-1500 tokens)
  - Tier 2 : fiches central banks / macro si signaux détectés
  - Tier 3 : profils assets pour les DEEP/FOCUS
```

### Contraintes prompt

```
CONTRAINTES :
- Pour chaque segment, produire EXACTEMENT les champs du schema SegmentAnalysis
- Les chart_instructions sont SÉMANTIQUES : quoi afficher, pas quand
  (le timing est décidé en P6 par C5)
- Les scénarios doivent être CHIFFRÉS avec niveaux précis
- Le confidenceLevel reflète la qualité des données :
  - high : données techniques claires + catalyst identifié + confirmedPattern
  - medium : données partielles ou signal ambigu
  - speculative : extrapolation, pas de catalyst clair
- Le globalContext doit identifier les liens ENTRE segments, pas résumer chaque segment

FORMAT DE SORTIE — JSON strict :
{AnalysisBundle}
```

### Ce que C2 produit

1. **Par segment** : keyFacts, technicalReading, fundamentalContext, causalChain, scenarios (bull/bear chiffrés), narrativeHook, chartInstructions, visualSuggestions, risk, confidenceLevel
2. **Global** : marketMood, dominantTheme (confirmé/ajusté depuis C1), crossSegmentLinks, keyRisks

### Ce que C2 ne fait PAS

- Pas de narration (C3)
- Pas de sélection/ordre (C1)
- Pas de timing vidéo (C5)
- Pas de visual cues concrets (C3/C7)
- Pas de fabrication de chaînes causales — il **enrichit** le CausalBrief code

### CausalBrief — Génération CODE

Le CausalBrief est généré par du code déterministe, pas par LLM.

```typescript
function buildCausalBrief(flagged: SnapshotFlagged): CausalBrief {
  const chains: CausalBrief['chains'] = [];
  const signals: CausalBrief['intermarketSignals'] = [];

  // Règle 1 : Dollar fort → pression commodities
  const dxy = flagged.assets.find(a => a.symbol === 'DX-Y.NYB');
  const gold = flagged.assets.find(a => a.symbol === 'GC=F');
  if (dxy && gold && dxy.changePct > 0.5 && gold.changePct < -0.5) {
    chains.push({
      name: 'Dollar fort → pression commodities',
      confidence: Math.min(Math.abs(dxy.changePct) * Math.abs(gold.changePct) / 4, 1),
      steps: [`DXY ${dxy.changePct > 0 ? '+' : ''}${dxy.changePct.toFixed(1)}%`,
              `→ GC=F ${gold.changePct.toFixed(1)}%`],
      relatedAssets: ['DX-Y.NYB', 'GC=F', 'SI=F', 'CL=F'],
    });
  }

  // Règle 2 : Yield spread → rotation sectorielle
  if (flagged.yields) {
    const spread = flagged.yields.spread10y2y;
    if (spread !== undefined) {
      if (spread > 0.5) {
        signals.push({
          signal: 'yield_curve_steepening',
          implication: 'banques et cycliques favorisées, growth sous pression'
        });
      } else if (spread < -0.2) {
        signals.push({
          signal: 'yield_curve_inversion',
          implication: 'signal récession, flight to quality'
        });
      }
    }
  }

  // Règle 3 : VIX spike → risk-off
  // Règle 4 : BTC/ETH corrélation
  // Règle 5 : Oil → airlines/transport
  // ... (20+ règles intermarché, extensibles)

  return { chains, intermarketSignals: signals };
}
```

Les règles complètes sont dans `packages/ai/src/knowledge/intermarket.md` et seront
traduites en code. C2 Sonnet reçoit le brief et l'intègre dans son analyse — il ne fabrique
pas les liens causaux, il les contextualise.

---

## 7. P4 — C3 Opus : Rédaction narrative

### Responsabilité

Écrire le script narré. **Le seul job créatif du pipeline.**
Reçoit tout pré-mâché (sélection, analyse, budget) et se concentre sur la qualité de l'écriture.

### Modèle

Opus (`quality` role) — rédaction narrative de haute qualité.

### Input prompt (~6-10K tokens)

```
SYSTEM:
  [PERSONA — ~200 tokens]
  Tu es un analyste de marché indépendant, 10 ans d'expérience.
  Tu tutoies ton audience. Tu crées des liens causaux, pas des listes.
  Phrases courtes + longues alternées. Suspense. Connecteurs causaux.

  [COMPLIANCE AMF/MiFID II — ~300 tokens]
  - Contenu éducatif uniquement
  - Langage conditionnel obligatoire ("pourrait", "si...")
  - JAMAIS de recommandation directe (même déguisée)
  - JAMAIS de disclaimer oral — bandeau visuel s'en charge
  - Formulations interdites : "vous devez", "il faut acheter/vendre",
    "c'est le moment de", "on recommande"

  [KNOWLEDGE TIER 1 — ~800 tokens]
  Ton, patterns narratifs, vocabulaire technique

  [RÈGLES D'ÉCRITURE — ~400 tokens]
  - Pacing : 150 mots par 60 secondes (NON-NÉGOCIABLE)
  - Chaque fait précis mentionné une seule fois
  - Transitions narratives par liens thématiques, jamais "Passons maintenant à"
  - Si confidenceLevel = speculative → langage plus conditionnel
  - Si confidenceLevel = high → affirmations directes acceptées
  - Cold open : max 15 mots, télégraphique, NO salutations
  - Thread : nomme le thème dominant, annonce la cascade, PAS de prix/%/niveaux
  - Closing : 1 phrase retour au fil + teaser demain + question CTA

USER:
  [1] PLAN ÉDITORIAL (~300 tokens)
  {editorial.json} — structure, fil rouge, cold open, teaser

  [2] ANALYSE COMPLÈTE (~2000-3000 tokens)
  {analysis.json} — SegmentAnalysis[] + globalContext
  Pour chaque segment : keyFacts, technicalReading, scenarios, narrativeHook, confidenceLevel

  [3] BUDGET MOTS (~200 tokens)
  {wordBudget} — calculé par code :
  hook: 25 mots | thread: 50 mots | seg_1 (DEEP): 200 mots | seg_2 (FOCUS): 130 mots | ...
  Total cible : {totalTarget} mots | Tolérance : ±15%

  [4] SCRIPTS RÉCENTS (~1500-2500 tokens)
  {recentScripts[3-5]} — narrations complètes des 3-5 derniers jours
  Utilise pour : varier le style, éviter les mêmes transitions, faire des callbacks naturels
  NE PAS résumer ces scripts — utilise comme référence de style uniquement

  [5] CONTINUITÉS J-1 (~200 tokens)
  {editorial.continuityFromJ1} — prédictions/scénarios à suivre depuis le plan C1

FORMAT DE SORTIE — JSON strict :
{DraftScript}
```

### Budget mots — Calcul code

```typescript
function computeWordBudget(plan: EditorialPlan): WordBudget {
  const WORDS_PER_SEC = 150 / 60; // 2.5 mots/sec

  const depthWords: Record<SegmentDepth, { min: number; target: number; max: number }> = {
    DEEP:  { min: 175, target: 200, max: 225 },
    FOCUS: { min: 100, target: 130, max: 150 },
    FLASH: { min: 50,  target: 62,  max: 75 },
  };

  const segments = plan.segments.map(seg => ({
    segmentId: seg.id,
    depth: seg.depth,
    targetWords: depthWords[seg.depth].target,
    maxWords: depthWords[seg.depth].max,
  }));

  const segTotal = segments.reduce((sum, s) => sum + s.targetWords, 0);

  return {
    hook: 25,
    titleCard: 0,
    thread: 50,
    segments,
    closing: 60,
    totalTarget: 25 + 0 + 50 + segTotal + 60,
  };
}
```

### Visual Cues — C3 les produit

C3 produit des visual cues **abstraites** par segment, synchronisées avec sa narration.
Ce ne sont pas des instructions Remotion — juste des indications créatives.

```typescript
// Exemples de visual cues que C3 peut produire :
const exampleCues: VisualCue[] = [
  { type: 'chart', asset: 'GC=F', label: 'support historique 2900' },
  { type: 'ticker', asset: 'GC=F', value: 2947, direction: 'up' },
  { type: 'comparison', label: 'Or vs Dollar DXY — corrélation inversée' },
  { type: 'highlight', label: 'RSI en zone de surachat' },
  { type: 'map', label: 'Tensions géopolitiques Moyen-Orient' },
];
```

C7 (Sonnet, P7 branche visuelle) traduit ces cues en instructions Remotion/Midjourney concrètes.

### Ce que C3 ne fait PAS

- Ne décide pas quoi couvrir (C1)
- Ne fait pas d'analyse technique (C2)
- Ne met pas de drama score dans le texte
- Ne met pas de disclaimer oral
- Ne décide pas des transitions vidéo (C5)
- Ne décide pas du timing des charts (C5)

---

## 8. P5 — C4 Code + Haiku : Validation

### Responsabilité

Vérifier le draft, corriger les problèmes mineurs, renvoyer à C3 si blocker.
**Seule boucle du pipeline. Max 1 retry.**

### Étape 1 — Validation mécanique (Code pur)

```typescript
function validateMechanical(
  draft: DraftScript,
  analysis: AnalysisBundle,
  plan: EditorialPlan,
  budget: WordBudget,
  flagged: SnapshotFlagged,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Durée totale dans les specs (390-520 secondes = 6.5-8.7 minutes)
  if (draft.metadata.totalDurationSec < 390 || draft.metadata.totalDurationSec > 520) {
    issues.push({
      type: 'length',
      description: `Durée ${draft.metadata.totalDurationSec}s hors range 390-520s`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 2. Budget mots par segment (±15% tolérance)
  for (const seg of draft.segments) {
    const budgetSeg = budget.segments.find(b => b.segmentId === seg.segmentId);
    if (budgetSeg && seg.wordCount > budgetSeg.maxWords * 1.15) {
      issues.push({
        type: 'length',
        segmentId: seg.segmentId,
        description: `${seg.wordCount} mots > max ${budgetSeg.maxWords} (+15%)`,
        severity: 'warning',
        suggestedFix: `Réduire à ~${budgetSeg.targetWords} mots`,
        source: 'code',
      });
    }
  }

  // 3. Regex : "drama score" absent du texte
  const fullText = [
    draft.coldOpen.narration,
    draft.thread.narration,
    ...draft.segments.map(s => s.narration),
    draft.closing.narration,
  ].join(' ');

  if (/drama\s*score/i.test(fullText)) {
    issues.push({
      type: 'compliance',
      description: 'Drama score mentionné dans la narration',
      severity: 'blocker',
      source: 'code',
    });
  }

  // 4. Disclaimer absent de la narration
  const disclaimerPatterns = [
    /ceci ne constitue pas un conseil/i,
    /ne constitue en aucun cas/i,
    /à titre informatif uniquement/i,
    /faites vos propres recherches/i,
    /DYOR/i,
    /pas un conseil (en investissement|financier)/i,
  ];
  for (const pattern of disclaimerPatterns) {
    if (pattern.test(fullText)) {
      issues.push({
        type: 'compliance',
        description: `Disclaimer détecté dans narration : ${pattern.source}`,
        severity: 'blocker',
        suggestedFix: 'Supprimer — le disclaimer est un bandeau visuel, pas oral',
        source: 'code',
      });
    }
  }

  // 5. Chiffres cohérents avec snapshot (±1% tolérance)
  const priceRegex = /(\d[\d\s,.]*)\s*\$/g;
  // ... extraction et comparaison avec les données source
  // (implémentation complète : parse les montants du texte,
  //  match avec les prix dans flagged.assets, vérifier ±1%)

  // 6. Segments dans l'ordre du plan éditorial
  const planOrder = plan.segments.map(s => s.id);
  const draftOrder = draft.segments.map(s => s.segmentId);
  if (JSON.stringify(planOrder) !== JSON.stringify(draftOrder)) {
    issues.push({
      type: 'structure',
      description: `Ordre segments incorrect. Attendu: ${planOrder.join(',')} Got: ${draftOrder.join(',')}`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 7. Nombre de segments respecté
  if (draft.segments.length !== plan.segments.length) {
    issues.push({
      type: 'structure',
      description: `${draft.segments.length} segments vs ${plan.segments.length} planifiés`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 8. Répétition de formulation vs J-3
  // (diff textuel avec les scripts récents — implémentation via similarity check)

  return issues;
}
```

### Étape 2 — Validation sémantique (Haiku C4)

Exécutée **seulement si la validation mécanique passe** (ou ne produit que des warnings).

```
SYSTEM:
  Tu es un validateur éditorial. Tu vérifies la qualité et la compliance
  d'un script de marché financier. Tu NE réécris PAS — tu identifies les problèmes.

USER:
  [1] SCRIPT DRAFT
  {episode_draft.json}

  [2] PLAN ÉDITORIAL
  {editorial.json} — pour vérifier que le plan est respecté

  [3] RÈGLES COMPLIANCE
  - Aucune recommandation directe, même déguisée
  - Langage conditionnel pour les prédictions
  - Pas de ton retail ("t'as vu", "c'est dingue", "pépite")
  - Cohérence temporelle (J vs J-1 clairement distingués)
  - Continuités J-1 promises par C1 doivent être dans la narration

  [4] ANALYSE C2 (résumé)
  confidenceLevel par segment — vérifier que le ton correspond

INSTRUCTIONS :
  - Pour chaque problème trouvé, produire un ValidationIssue
  - severity = blocker SI : recommandation directe, ton retail, continuité manquante
  - severity = warning SI : transition maladroite, formulation améliorable
  - Pour les warnings : proposer un suggestedFix (texte de remplacement)
  - Tu peux corriger directement les warnings dans le script retourné
  - NE PAS inventer de problèmes — si le script est bon, retourner status: pass

FORMAT : {ValidationResult}
```

### Logique de retry

```typescript
async function runValidation(
  draft: DraftScript,
  analysis: AnalysisBundle,
  plan: EditorialPlan,
  budget: WordBudget,
  flagged: SnapshotFlagged,
): Promise<{ script: DraftScript; issues: ValidationIssue[] }> {

  // Étape 1 : validation mécanique
  const mechIssues = validateMechanical(draft, analysis, plan, budget, flagged);
  const mechBlockers = mechIssues.filter(i => i.severity === 'blocker');

  if (mechBlockers.length > 0) {
    // Blockers mécaniques → renvoyer à C3 directement (pas de Haiku)
    return { script: draft, issues: mechIssues };
  }

  // Étape 2 : validation sémantique Haiku
  const haikuResult = await callC4Haiku(draft, plan, analysis);

  // Merge issues
  const allIssues = [...mechIssues, ...haikuResult.issues];

  // Haiku a corrigé les warnings dans validatedScript
  return {
    script: haikuResult.validatedScript,
    issues: allIssues,
  };
}
```

### Boucle de retry (orchestrateur)

```
C3 → draft → P5 validation
  Si pass → episode_validated.json → P6
  Si needs_revision (blockers) → feedback à C3 → retry draft → P5 validation
    Si pass → episode_validated.json → P6
    Si needs_revision encore → ALERTE DISCORD + meilleur résultat disponible → P6
```

**Max 1 retry.** Total max = 2 passes C3 + 2 passes C4. Si toujours KO → problème systémique
dans le prompt, pas dans le contenu. Logger l'erreur et continuer avec le meilleur résultat.

---

## 9. P6 — C5 Sonnet : Direction globale

### Responsabilité

Traduire les décisions narratives en **instructions techniques de montage**.
Seule couche qui voit l'épisode entier comme une séquence temporelle.
Point de synchronisation entre texte (P2-P5) et production (P7).

### Modèle

Sonnet (`balanced` role) — raisonnement structurel.

### Input prompt (~4-6K tokens)

```
SYSTEM:
  Tu es le directeur de production d'une émission de marché.
  Tu vois l'épisode entier comme une séquence et tu définis :
  l'arc de tension, les transitions, le timing des visuels, le mood musical,
  et le moment thumbnail.

  TRANSITIONS DISPONIBLES DANS REMOTION :
  - cut : coupure sèche (300ms)
  - fade : fondu enchaîné (500-800ms)
  - wipe : balayage latéral (400-600ms)
  - zoom_out : zoom arrière (500-700ms)
  - slide : glissement (400ms)

  MOODS MUSICAUX DISPONIBLES :
  - tension_geopolitique : piste sombre, rythme lent
  - risk_off_calme : ambient doux, peu de percussions
  - bullish_momentum : énergie positive, tempo moyen-rapide
  - neutre_analytique : minimal, focus voix
  - incertitude : textures instables, pauses

  EFFETS SONORES DISPONIBLES :
  - silence : pause dramatique (200-500ms)
  - sting : accent musical court
  - swoosh : transition rapide
  - none : enchaînement direct

USER:
  [1] SCRIPT VALIDÉ
  {episode_validated.json} — narration complète avec durées et wordCounts

  [2] PLAN ÉDITORIAL
  {editorial.json} — fil rouge, mood marché, cold open

  [3] CONTEXTE GLOBAL (C2)
  {analysis.globalContext} — marketMood, dominantTheme, crossSegmentLinks

  [4] CHART INSTRUCTIONS (C2)
  {analysis.segments[].chartInstructions} — instructions sémantiques par segment
  Chaque instruction a : type, asset, value, label, timeframe

  [5] VISUAL CUES (C3)
  {episode_validated.segments[].visualCues} — cues abstraites par segment

INSTRUCTIONS :
  1. ARC DE TENSION
     Attribuer à chaque segment un rôle dans l'arc :
     montee (segments 1-2) → pic (drama max) → respiration (FLASH léger) → closing
     tensionLevel de 1 à 10 pour chaque segment.

  2. TRANSITIONS
     Pour chaque jonction entre segments : type, durée, effet sonore, shift vocal.
     Règle : cut pour les ruptures thématiques, fade pour les continuités,
     zoom_out pour les prises de recul.

  3. THUMBNAIL MOMENT
     Le segment avec le plus fort potentiel CTR. Justifier pourquoi.
     Identifier le chiffre clé et le ton émotionnel pour le thumbnail.

  4. MOOD MUSICAL
     Un seul tag mood pour l'épisode entier (pas par segment).
     Le code sélectionne la piste depuis ce tag.

  5. CHART TIMINGS
     Pour chaque chartInstruction de C2 : ajouter showAtSec et hideAtSec
     basés sur le timing de la narration du segment correspondant.
     Règle : afficher 2 secondes AVANT la mention dans la narration,
     maintenir jusqu'à fin du point technique.

  NARRATION INCHANGÉE — tu ne modifies RIEN au texte de C3/C4.

FORMAT : {DirectedEpisode}
```

### Ce que C5 produit

1. **Arc de tension** — rôle + tensionLevel par segment
2. **Transitions** — type, durée, effet sonore, shift vocal entre chaque segment
3. **Thumbnail moment** — segment, reason, chiffre clé, ton émotionnel
4. **Mood musical** — 1 tag pour tout l'épisode
5. **Chart timings** — horodatage des chart_instructions de C2

### Ce que C5 ne fait PAS

- Ne modifie pas la narration (C3/C4 l'ont finalisée)
- Ne génère pas de nouvelles analyses (C2)
- Ne sélectionne pas de musique (code lookup)
- Ne génère pas de visuels (C7/C8)

### Pourquoi C5 est indispensable

Sans C5, les branches P7 travaillent sur des **hypothèses** :
- Audio (C6) ne sait pas le rythme vocal souhaité par segment
- Visuel (C7) ne sait pas quand afficher les charts
- Remotion (P8) ne sait pas les transitions entre scènes

Avec C5, tout P7 travaille sur des **specs précises**. C'est le point de synchronisation
qui sépare le monde du texte (avant) du monde audiovisuel (après).

---

## 10. Orchestrateur

### Architecture fichier

```
packages/ai/src/
  pipeline/
    index.ts              — orchestrateur principal
    types.ts              — tous les types C1→C5
    p1-flagging.ts        — pré-filtrage mécanique (code)
    p2-editorial.ts       — C1 Haiku prompt + appel
    p3-analysis.ts        — C2 Sonnet prompt + appel
    p4-writing.ts         — C3 Opus prompt + appel
    p5-validation.ts      — C4 Code + Haiku
    p6-direction.ts       — C5 Sonnet prompt + appel
    helpers/
      causal-brief.ts     — génération CausalBrief (code)
      word-budget.ts      — calcul budget mots
      episode-summary.ts  — formatage EpisodeSummary compact
      fact-checker.ts     — extraction et vérification chiffres
```

### Fonction principale

```typescript
interface PipelineOptions {
  snapshot: DailySnapshot;
  lang: 'fr' | 'en';
  episodeNumber: number;
  newsDb?: NewsMemoryDB;
  prevContext?: PrevContext;
  // Options de debug
  startFrom?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  stopAt?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  dryRun?: boolean;               // ne pas appeler les LLM, juste valider les inputs
}

interface PipelineResult {
  directedEpisode: DirectedEpisode;
  intermediates: {
    flagged: SnapshotFlagged;
    editorial: EditorialPlan;
    analysis: AnalysisBundle;
    draft: DraftScript;
    validation: ValidationResult;
  };
  stats: {
    totalDurationMs: number;
    llmCalls: number;
    retries: number;
    cost: number;                  // estimation coût LLM
  };
}

async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { snapshot, lang, episodeNumber, newsDb, prevContext } = options;
  const stats = { totalDurationMs: 0, llmCalls: 0, retries: 0, cost: 0 };
  const t0 = Date.now();

  // ── P1 : Pré-filtrage (code pur) ──────────────────────────
  const flagged = flagAssets(snapshot);
  saveIntermediate('snapshot_flagged', flagged);

  // ── Préparation inputs parallèles ─────────────────────────
  const [
    episodeSummaries,
    recentScripts,
    researchContext,
    weeklyBrief,
    causalBrief,
    knowledge,
    wordBudget,  // calculé après C1 — placeholder
  ] = await Promise.all([
    buildEpisodeSummaries(prevContext, 15),    // 15 jours compact
    loadRecentScripts(prevContext, 5),          // 5 scripts complets
    newsDb ? buildResearchContext(snapshot, newsDb) : '',
    loadWeeklyBrief(),
    buildCausalBrief(flagged),
    loadKnowledge(snapshot),
    Promise.resolve(null),                     // calculé après C1
  ]);

  // ── P2 : C1 Haiku — Sélection éditoriale ─────────────────
  const editorial = await runC1Editorial({
    flagged,
    themesDuJour: flagged.themesDuJour,
    episodeSummaries,
    researchContext,
    weeklyBrief,
    lang,
  });
  stats.llmCalls++;
  saveIntermediate('editorial', editorial);

  // Validation C1
  const c1Errors = validateEditorialPlan(editorial);
  if (c1Errors.length > 0) {
    // 1 retry C1
    const editorial2 = await runC1Editorial({ ...input, feedback: c1Errors });
    stats.llmCalls++;
    stats.retries++;
    // Si toujours KO → fallback mécanique
  }

  // Calcul budget mots (dépend du plan C1)
  const budget = computeWordBudget(editorial);

  // ── P3 : C2 Sonnet — Analyse ─────────────────────────────
  const analysis = await runC2Analysis({
    editorial,
    flagged,         // données uniquement des assets sélectionnés
    causalBrief,
    researchContext,
    knowledge,       // Tier 2/3 conditionnel
    lang,
  });
  stats.llmCalls++;
  saveIntermediate('analysis', analysis);

  // ── P4 : C3 Opus — Rédaction ─────────────────────────────
  let draft = await runC3Writing({
    editorial,
    analysis,
    budget,
    recentScripts,
    knowledge,       // Tier 1 seulement
    lang,
  });
  stats.llmCalls++;

  // ── P5 : C4 Validation ───────────────────────────────────
  let validation = await runValidation(draft, analysis, editorial, budget, flagged);
  stats.llmCalls++;    // Haiku call

  if (validation.issues.some(i => i.severity === 'blocker')) {
    // Retry C3 avec feedback
    draft = await runC3Writing({
      ...c3Input,
      feedback: validation.issues.filter(i => i.severity === 'blocker'),
    });
    stats.llmCalls++;
    stats.retries++;

    // Re-validation
    validation = await runValidation(draft, analysis, editorial, budget, flagged);
    stats.llmCalls++;

    if (validation.issues.some(i => i.severity === 'blocker')) {
      // Max retries atteint — alerter et continuer
      await alertDiscord('P5 validation failed after retry', validation.issues);
    }
  }

  const validatedScript = validation.validatedScript;
  saveIntermediate('episode_validated', validatedScript);

  // ── P6 : C5 Sonnet — Direction ───────────────────────────
  const directed = await runC5Direction({
    script: validatedScript,
    editorial,
    globalContext: analysis.globalContext,
    chartInstructions: analysis.segments.flatMap(s => s.chartInstructions),
    visualCues: validatedScript.segments.flatMap(s => s.visualCues ?? []),
    lang,
  });
  stats.llmCalls++;
  saveIntermediate('episode_directed', directed);

  stats.totalDurationMs = Date.now() - t0;
  stats.cost = estimateCost(stats.llmCalls, stats.retries);

  return {
    directedEpisode: directed,
    intermediates: { flagged, editorial, analysis, draft, validation },
    stats,
  };
}
```

### Persistance des intermédiaires

Chaque output est sauvegardé dans `data/pipeline/{date}/` :

```
data/pipeline/2026-03-11/
  snapshot_flagged.json
  editorial.json
  analysis.json
  episode_draft.json
  episode_validated.json
  episode_directed.json
```

Avantages :
- **Debug** : inspecter chaque étape en cas de problème
- **Rejeu** : relancer à partir de n'importe quelle étape (`startFrom`)
- **Comparaison** : A/B test de prompts sur les mêmes données

---

## 11. Intégration mémoires

### 11.1 EpisodeMemory

**Format compact pour C1** (15 derniers épisodes → ~800 tokens) :

```typescript
function buildEpisodeSummaries(
  prevContext: PrevContext | undefined,
  count: number
): EpisodeSummary[] {
  if (!prevContext?.entries?.length) return [];

  return prevContext.entries.slice(-count).map((entry, i) => {
    const script = entry.script;
    const daysAgo = count - i;

    return {
      date: entry.snapshot?.date ?? `J-${daysAgo}`,
      label: `J-${daysAgo}`,
      segmentTopics: script?.sections
        ?.filter(s => s.type === 'segment')
        .map(s => `${s.assets?.join('/') ?? '?'}: ${s.title}`) ?? [],
      predictions: script?.sections
        ?.flatMap(s => s.data?.predictions ?? [])
        .map(p => ({
          asset: p.asset,
          claim: `${p.direction} ${p.targetLevel ?? ''}`.trim(),
          resolved: false, // TODO: vérifier avec données actuelles
          outcome: undefined,
        })) ?? [],
      angles: script?.sections
        ?.filter(s => s.type === 'segment')
        .map(s => s.data?.topic ?? '') ?? [],
      dominantTheme: script?.threadSummary ?? '',
      moodMarche: (script as any)?.moodMarche ?? '',
    };
  });
}
```

**Format complet pour C3** (3-5 derniers scripts) :

Pas de transformation — on injecte les narrations brutes des 3-5 derniers épisodes.
C3 Opus les utilise comme référence de style, pas comme contenu à résumer.

```typescript
function formatRecentScriptsForC3(
  prevContext: PrevContext | undefined,
  count: number
): string {
  if (!prevContext?.entries?.length) return '';

  const recent = prevContext.entries.slice(-count);
  return recent.map((entry, i) => {
    const script = entry.script;
    if (!script) return '';
    const label = `J-${count - i}`;
    const segments = script.sections
      ?.filter(s => s.type === 'segment')
      .map(s => `[${s.data?.depth ?? '?'}] ${s.title}\n${s.narration}`)
      .join('\n\n');
    return `=== ${label} (${script.date ?? ''}) ===\n${segments}`;
  }).filter(Boolean).join('\n\n---\n\n');
}
```

### 11.2 NewsMemory (D2)

Déjà implémenté via `buildResearchContext()`. Injecté dans :
- **C1** : résumé thématique (top thèmes, events éco récents)
- **C2** : articles par asset pour les DEEP/FOCUS, distribution thématique 90j

```typescript
// Pour C1 : version compacte
function buildResearchContextCompact(snapshot: DailySnapshot, db: NewsMemoryDB): string {
  // Themes dominants cette semaine
  const themes = db.countByTheme(7);
  // Events éco récents (3 jours)
  const events = db.getEconomicEvents({ days: 3, strength: 'Strong' });
  // Format compact ~300-500 tokens
  return formatCompact(themes, events);
}

// Pour C2 : version détaillée (existante)
// buildResearchContext(snapshot, db) → ~500 tokens avec articles par asset
```

### 11.3 MarketMemory (D3)

Injecté dans :
- **C1** : `market_weekly_brief.json` seulement (~300 tokens) — régime global, zones notables
- **C2** : JSON complets des assets DEEP/FOCUS — zones, events, indicateurs

```typescript
// Pour C1 : brief hebdo
function loadWeeklyBrief(): string {
  const briefPath = 'data/market-memory/market_weekly_brief.json';
  if (!existsSync(briefPath)) return '';
  const brief = JSON.parse(readFileSync(briefPath, 'utf-8'));
  return formatWeeklyBriefForC1(brief); // ~300 tokens
}

// Pour C2 : mémoire par asset
function loadMarketMemoryForAssets(symbols: string[]): string {
  return symbols
    .map(sym => {
      const mem = loadMemory(sym);
      if (!mem) return '';
      return formatAssetMemoryForC2(sym, mem);
    })
    .filter(Boolean)
    .join('\n\n');
}
```

### 11.4 Dégradation gracieuse

Toutes les mémoires sont **optionnelles**. Si une mémoire est vide ou absente :

| Mémoire          | Si vide                                        |
|-------------------|-----------------------------------------------|
| EpisodeMemory     | C1 skip les continuités J-1, C3 skip la variété de style |
| NewsMemory (D2)   | "Base de données en cours d'accumulation"     |
| MarketMemory (D3) | C2 analyse sans zones/events historiques      |
| Knowledge (Bloc B)| Tier 2/3 non injecté, Tier 1 toujours présent |
| CausalBrief       | C2 construit ses propres liens (moins fiable) |

Le pipeline fonctionne **identiquement** avec 0 ou 5 mémoires actives.
La qualité s'améliore progressivement avec l'accumulation.

---

## 12. Migration depuis le monolithe

### État actuel

`script-generator.ts` (~400 lignes) fait tout en 1 appel LLM :
- `generateScript()` → appelle `formatSnapshotForPrompt()` → 1 LLM call → `EpisodeScript`
- `daily-recap.ts` → 1 prompt monolithique (~473 lignes)

### Stratégie de migration

**Phase 1 : Extraction types + P1**
- Créer `pipeline/types.ts` avec tous les types C1→C5
- Implémenter `p1-flagging.ts` (code pur, testable immédiatement)
- Aucun changement au pipeline existant

**Phase 2 : C1 + C2 (input layers)**
- Implémenter `p2-editorial.ts` et `p3-analysis.ts`
- Le monolithe reçoit `EditorialPlan` + `AnalysisBundle` au lieu de tout recalculer
- Transition douce : le monolithe continue de fonctionner mais avec des inputs plus riches

**Phase 3 : C3 (remplacement du monolithe)**
- Implémenter `p4-writing.ts` avec le nouveau prompt Opus
- Remplacer l'appel monolithique par C3
- C'est le changement le plus risqué — A/B test avec l'ancien pipeline

**Phase 4 : C4 + C5**
- Implémenter `p5-validation.ts` et `p6-direction.ts`
- Compléter le pipeline
- L'ancien `script-generator.ts` devient un wrapper de compatibilité

**Phase 5 : Nettoyage**
- Supprimer `daily-recap.ts` (prompt monolithique)
- Migrer `generateScript()` vers `runPipeline()`
- Adapter `scripts/generate.ts` pour utiliser le nouveau pipeline

### Compatibilité output

Le `DirectedEpisode` produit par C5 contient un `DraftScript` qui peut être converti
en `EpisodeScript` (type existant) pour Remotion :

```typescript
function toEpisodeScript(directed: DirectedEpisode, episodeNumber: number): EpisodeScript {
  const { script } = directed;
  return {
    episodeNumber,
    date: script.date,
    type: 'daily_recap',
    lang: 'fr',
    title: script.title,
    description: script.description,
    sections: [
      toScriptSection(script.coldOpen),
      toScriptSection(script.titleCard),
      toScriptSection(script.thread),
      ...script.segments.map(toScriptSection),
      toScriptSection(script.closing),
    ],
    totalDurationSec: script.metadata.totalDurationSec,
    threadSummary: script.metadata.threadSummary,
    segmentCount: script.metadata.segmentCount,
    coverageTopics: script.metadata.coverageTopics,
  };
}
```

Remotion continue de consommer `EpisodeScript` — aucun changement côté rendu en V1.
Les champs additionnels de `DirectedEpisode` (arc, transitions, chartTimings)
seront exploités quand Remotion sera mis à jour (Bloc E).

---

## 13. Coût LLM estimé

### Par épisode (cas normal — 0 retry)

| Couche | Modèle | Input tokens | Output tokens | Coût estimé |
|--------|--------|-------------|---------------|-------------|
| C1     | Haiku  | ~4000       | ~800          | ~$0.005     |
| C2     | Sonnet | ~6000       | ~2000         | ~$0.035     |
| C3     | Opus   | ~8000       | ~3000         | ~$0.150     |
| C4     | Haiku  | ~5000       | ~500          | ~$0.004     |
| C5     | Sonnet | ~5000       | ~1500         | ~$0.028     |
| **Total** |     |             |               | **~$0.22**  |

### Avec 1 retry C3+C4

| Extra  | Modèle | Coût       |
|--------|--------|------------|
| C3 retry | Opus | +$0.150   |
| C4 retry | Haiku | +$0.004  |
| **Total avec retry** |  | **~$0.37** |

### Avec le reste du pipeline (C6→C10, P7→P9)

| Couche | Modèle | Coût estimé |
|--------|--------|-------------|
| C6 Haiku (audio) | Haiku | ~$0.005 |
| C7 Sonnet (DA)   | Sonnet | ~$0.030 |
| C8 Haiku (prompts Midjourney) | Haiku | ~$0.004 |
| C9 Haiku (thumbnail) | Haiku | ~$0.003 |
| C10 Haiku (SEO) | Haiku | ~$0.005 |
| **Pipeline complet** | | **~$0.27 (C1-C5) + ~$0.05 (C6-C10) ≈ $0.32/épisode** |

### Comparaison avec le monolithe actuel

- Monolithe Sonnet : ~$0.04/épisode (1 appel)
- Pipeline C1-C5 : ~$0.22/épisode (5 appels)
- **×5.5 plus cher, mais :**
  - Qualité Opus pour la rédaction
  - Validation compliance automatique
  - Direction de production (arc, transitions)
  - Débug possible couche par couche
  - Résultats consistants et reproductibles

---

## 14. Ordre d'implémentation

### Étape 1 — Types + P1 (~2h)
- `pipeline/types.ts` — tous les types
- `pipeline/p1-flagging.ts` — scoring mécanique
- Tests unitaires P1

### Étape 2 — Helpers (~2h)
- `pipeline/helpers/causal-brief.ts`
- `pipeline/helpers/word-budget.ts`
- `pipeline/helpers/episode-summary.ts`
- Tests unitaires helpers

### Étape 3 — C1 Haiku (~3h)
- `pipeline/p2-editorial.ts` — prompt + appel + validation output
- Tests : prompt generation, output validation, fallback mécanique

### Étape 4 — C2 Sonnet (~3h)
- `pipeline/p3-analysis.ts` — prompt + appel
- Intégration CausalBrief, MarketMemory, NewsMemory, Knowledge
- Tests : prompt generation, output schema

### Étape 5 — C3 Opus (~4h)
- `pipeline/p4-writing.ts` — prompt + appel
- Budget mots, scripts récents, compliance rules
- C'est le prompt le plus critique — nécessite itération
- Tests : prompt generation, word count validation

### Étape 6 — C4 Validation (~3h)
- `pipeline/p5-validation.ts` — code mécanique + Haiku sémantique
- `pipeline/helpers/fact-checker.ts` — extraction et comparaison chiffres
- Tests : validation mécanique complète, retry logic

### Étape 7 — C5 Sonnet (~2h)
- `pipeline/p6-direction.ts` — prompt + appel
- Tests : arc generation, transition logic, chart timing

### Étape 8 — Orchestrateur + Migration (~3h)
- `pipeline/index.ts` — orchestrateur principal
- `toEpisodeScript()` — conversion vers type existant
- Adapter `scripts/generate.ts`
- Test intégration end-to-end

### Total estimé : ~22h de travail

---

## 15. Tests

### Tests unitaires par module

```
tests/pipeline/
  p1-flagging.test.ts        — 15 tests
  p2-editorial.test.ts       — 12 tests
  p3-analysis.test.ts        — 10 tests
  p4-writing.test.ts         — 12 tests
  p5-validation.test.ts      — 20 tests (le plus testé)
  p6-direction.test.ts       — 8 tests
  helpers/
    causal-brief.test.ts     — 10 tests
    word-budget.test.ts       — 8 tests
    episode-summary.test.ts   — 6 tests
    fact-checker.test.ts      — 12 tests
```

### P1 — Tests flagging

```typescript
// Exemples de cas de test
describe('P1 flagAssets', () => {
  it('devrait flagger PRICE_MOVE pour variation >2%', () => {
    const asset = mockAsset({ changePct: 3.5 });
    const result = flagAssets(mockSnapshot([asset]));
    expect(result.assets[0].flags).toContain('PRICE_MOVE');
  });

  it('devrait NE PAS flagger PRICE_MOVE pour variation <2%', () => {
    const asset = mockAsset({ changePct: 1.5 });
    const result = flagAssets(mockSnapshot([asset]));
    expect(result.assets[0].flags).not.toContain('PRICE_MOVE');
  });

  it('devrait cumuler les flags correctement', () => {
    const asset = mockAsset({ changePct: 3, rsi: 80, volumeAnomaly: true });
    const result = flagAssets(mockSnapshot([asset]));
    expect(result.assets[0].materialityScore).toBe(3);
    expect(result.assets[0].flags).toEqual(
      expect.arrayContaining(['PRICE_MOVE', 'RSI_EXTREME', 'VOLUME_SPIKE'])
    );
  });

  it('devrait garder les assets score 0 (pas de filtrage)', () => {
    const assets = [
      mockAsset({ symbol: 'A', changePct: 5 }),
      mockAsset({ symbol: 'B', changePct: 0.1 }),
    ];
    const result = flagAssets(mockSnapshot(assets));
    expect(result.assets).toHaveLength(2);
    expect(result.assets[1].materialityScore).toBe(0);
  });

  it('devrait trier par score décroissant', () => {
    const assets = [
      mockAsset({ symbol: 'A', changePct: 0.1 }),
      mockAsset({ symbol: 'B', changePct: 5, rsi: 80 }),
    ];
    const result = flagAssets(mockSnapshot(assets));
    expect(result.assets[0].symbol).toBe('B');
  });
});
```

### P5 — Tests validation mécanique

```typescript
describe('P5 validateMechanical', () => {
  it('devrait détecter durée hors range', () => {
    const draft = mockDraft({ totalDurationSec: 300 });
    const issues = validateMechanical(draft, ...mocks);
    expect(issues).toContainEqual(expect.objectContaining({
      type: 'length',
      severity: 'blocker',
    }));
  });

  it('devrait détecter "drama score" dans la narration', () => {
    const draft = mockDraft({
      segments: [mockSegment({ narration: 'Le drama score de lor est élevé' })],
    });
    const issues = validateMechanical(draft, ...mocks);
    expect(issues).toContainEqual(expect.objectContaining({
      type: 'compliance',
      severity: 'blocker',
    }));
  });

  it('devrait détecter disclaimer dans la narration', () => {
    const draft = mockDraft({
      closing: { narration: 'Ceci ne constitue pas un conseil en investissement' },
    });
    const issues = validateMechanical(draft, ...mocks);
    expect(issues).toContainEqual(expect.objectContaining({
      type: 'compliance',
      severity: 'blocker',
    }));
  });

  it('devrait accepter un script valide sans issues', () => {
    const draft = mockValidDraft();
    const issues = validateMechanical(draft, ...mocks);
    const blockers = issues.filter(i => i.severity === 'blocker');
    expect(blockers).toHaveLength(0);
  });

  it('devrait vérifier lordre des segments vs plan', () => {
    const plan = mockPlan({ segments: ['seg_1', 'seg_2', 'seg_3'] });
    const draft = mockDraft({
      segments: [
        mockSegment({ segmentId: 'seg_2' }),
        mockSegment({ segmentId: 'seg_1' }),
        mockSegment({ segmentId: 'seg_3' }),
      ],
    });
    const issues = validateMechanical(draft, ...mocks);
    expect(issues).toContainEqual(expect.objectContaining({
      type: 'structure',
      severity: 'blocker',
    }));
  });
});
```

### Test intégration (end-to-end mock)

```typescript
describe('Pipeline E2E', () => {
  it('devrait produire un DirectedEpisode valide', async () => {
    // Mock tous les appels LLM avec des réponses pré-définies
    mockLLM({
      c1: mockEditorialPlan(),
      c2: mockAnalysisBundle(),
      c3: mockDraftScript(),
      c4: mockValidationPass(),
      c5: mockDirectedEpisode(),
    });

    const result = await runPipeline({
      snapshot: mockSnapshot(),
      lang: 'fr',
      episodeNumber: 42,
    });

    expect(result.directedEpisode).toBeDefined();
    expect(result.stats.llmCalls).toBe(5);
    expect(result.stats.retries).toBe(0);
    expect(result.intermediates.editorial.segments.length).toBeGreaterThanOrEqual(4);
  });

  it('devrait gérer 1 retry C3 correctement', async () => {
    mockLLM({
      c1: mockEditorialPlan(),
      c2: mockAnalysisBundle(),
      c3: [mockBadDraft(), mockValidDraft()],  // premier KO, deuxième OK
      c4: [mockValidationFail(), mockValidationPass()],
      c5: mockDirectedEpisode(),
    });

    const result = await runPipeline({ ...options });

    expect(result.stats.retries).toBe(1);
    expect(result.stats.llmCalls).toBe(7); // 5 normal + 2 retry
  });

  it('devrait fonctionner sans mémoires (dégradation gracieuse)', async () => {
    const result = await runPipeline({
      snapshot: mockSnapshot(),
      lang: 'fr',
      episodeNumber: 1,
      // Pas de newsDb, pas de prevContext
    });

    expect(result.directedEpisode).toBeDefined();
  });

  it('devrait convertir en EpisodeScript compatible Remotion', () => {
    const directed = mockDirectedEpisode();
    const episodeScript = toEpisodeScript(directed, 42);

    expect(episodeScript.sections).toBeDefined();
    expect(episodeScript.sections[0].type).toBe('hook');
    expect(episodeScript.totalDurationSec).toBeGreaterThan(0);
  });
});
```

---

## Annexe A — Diagramme de séquence complet

```
Orchestrateur          P1(Code)   C1(Haiku)   C2(Sonnet)  C3(Opus)   C4(Code+Haiku)  C5(Sonnet)
     │                    │           │            │           │            │              │
     │─── flagAssets() ──►│           │            │           │            │              │
     │◄── flagged ────────│           │            │           │            │              │
     │                    │           │            │           │            │              │
     │── buildCausalBrief() ─┐       │            │           │            │              │
     │── buildEpisodeSummaries() ─┐  │            │           │            │              │
     │── buildResearchContext() ──┤  │            │           │            │              │
     │── loadWeeklyBrief() ───────┤  │            │           │            │              │
     │◄── parallel results ───────┘  │            │           │            │              │
     │                    │           │            │           │            │              │
     │─── editorial req ─────────►│            │           │            │              │
     │◄── EditorialPlan ─────────│            │           │            │              │
     │                    │           │            │           │            │              │
     │── computeWordBudget() ─┐  │            │           │            │              │
     │── filterAssetsForC2() ─┤  │            │           │            │              │
     │── loadMarketMemory() ──┤  │            │           │            │              │
     │◄── prep done ──────────┘  │            │           │            │              │
     │                    │           │            │           │            │              │
     │─── analysis req ───────────────────►│           │            │              │
     │◄── AnalysisBundle ─────────────────│           │            │              │
     │                    │           │            │           │            │              │
     │─── writing req ────────────────────────────►│            │              │
     │◄── DraftScript ───────────────────────────│            │              │
     │                    │           │            │           │            │              │
     │─── validate ──────────────────────────────────────►│              │
     │◄── ValidationResult ──────────────────────────────│              │
     │                    │           │            │           │            │              │
     │ [Si retry nécessaire]          │            │           │            │              │
     │─── C3 + feedback ──────────────────────────►│            │              │
     │◄── DraftScript v2 ────────────────────────│            │              │
     │─── re-validate ──────────────────────────────────►│              │
     │◄── ValidationResult v2 ──────────────────────────│              │
     │                    │           │            │           │            │              │
     │─── direction req ──────────────────────────────────────────────►│
     │◄── DirectedEpisode ────────────────────────────────────────────│
     │                    │           │            │           │            │              │
     │─── toEpisodeScript() ─┐       │            │           │            │              │
     │◄── EpisodeScript ─────┘       │            │           │            │              │
     │                    │           │            │           │            │              │
     ▼                    ▼           ▼            ▼           ▼            ▼              ▼
  → P7 branches parallèles (C6-C9) → P8 Remotion → P9 SEO (C10)
```

---

## Annexe B — Checklist de cohérence

Avant l'implémentation, vérifier :

- [ ] `SnapshotFlagged` préserve toutes les données de `DailySnapshot` (pas de perte)
- [ ] `EditorialPlan.segments[].id` est utilisé comme clé dans tous les outputs suivants
- [ ] `AnalysisBundle.segments` a exactement le même nombre que `EditorialPlan.segments`
- [ ] `DraftScript.segments` a exactement le même nombre et ordre que `EditorialPlan.segments`
- [ ] `DirectedEpisode.arc` a exactement le même nombre que `DraftScript.segments`
- [ ] `DirectedEpisode.transitions` a exactement N-1 éléments (N = nombre de segments)
- [ ] `ChartTiming.chartInstruction` réfère à une instruction existante dans `AnalysisBundle`
- [ ] `WordBudget.totalTarget` est cohérent avec la durée cible (390-520s × 2.5 mots/s)
- [ ] Tous les `segmentId` sont consistants entre C1 → C2 → C3 → C4 → C5
- [ ] Les `VisualCue` de C3 ne contiennent PAS d'instructions Remotion spécifiques
- [ ] Les `ChartInstruction` de C2 ne contiennent PAS de timing (ajouté par C5)
- [ ] C1 ne voit PAS les données brutes des assets (seulement scores + flags)
- [ ] C2 ne voit PAS les assets non sélectionnés par C1 (FLASH = données minimales)
- [ ] C3 ne voit PAS le Knowledge Tier 2/3 (seulement Tier 1 — ton/narration)
- [ ] C4 Code vérifie les chiffres, C4 Haiku vérifie le ton (pas l'inverse)
- [ ] C5 ne modifie PAS la narration

---

## Annexe C — Glossaire

| Terme | Définition |
|-------|------------|
| **DEEP** | Segment long (70-90s, 175-225 mots) avec chaîne causale complète |
| **FOCUS** | Segment moyen (40-60s, 100-150 mots) avec 1 niveau + 1 scénario |
| **FLASH** | Segment court (20-30s, 50-75 mots) fait-cause-conséquence |
| **CausalBrief** | Liens intermarché calculés par code, pas par LLM |
| **MaterialityScore** | Nombre de flags P1 — mesure mécanique de "l'importance" |
| **DramaScore** | Score existant (types.ts) — combinaison prix + volume + technique |
| **EditorialScore** | Score des ThemesDuJour — pertinence narrative d'un thème |
| **ChartInstruction** | Instruction sémantique (quoi afficher) — sans timing |
| **ChartTiming** | Instruction horodatée (quand afficher) — ajoutée par C5 |
| **VisualCue** | Indice créatif abstrait de C3 — traduit en Remotion par C7 |
| **ArcBeat** | Position d'un segment dans l'arc de tension narratif |
| **MoodTag** | Tag musical pour l'épisode — code lookup vers piste audio |
