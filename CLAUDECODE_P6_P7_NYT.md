# TradingRecap — Brief Claude Code
## P6 Direction Globale + P7 Production Parallèle + Identité Visuelle NYT

> Document de travail pour Claude Code.  
> Lire intégralement avant de coder quoi que ce soit.  
> Ce document supercède les specs Bloc E du Blueprint v2 sur tout ce qui concerne le rendu visuel.

---

## Contexte de la session qui a produit ce document

Ce brief est issu d'une session d'analyse approfondie du pipeline TradingRecap v3.
Nous avons audité les couches P1→C4 sur un épisode réel (12 mars 2026 — escalade Iran, Brent >100$),
produit des outputs P6 et C7 complets, et arrêté une direction artistique définitive.

**Les fichiers de référence produits lors de cette session :**
- `episode_directed_2026-03-12.json` — output P6 de référence (90 slots, 548s)
- `c7_storyboard_2026-03-12.json` — storyboard C7 complet (104 slots)
- `p6-director-view-2026-03-12.html` — visualisation P6
- `p7-production-parallele-2026-03-12.html` — visualisation P7
- `c7-storyboard-view-2026-03-12.html` — visualisation storyboard

---

## 1. La décision la plus importante : l'identité visuelle

### Le style retenu : NYT Editorial / Encre sur Papier

**Ce n'est pas un thème graphique parmi d'autres. C'est le positionnement de la chaîne.**

Aucune chaîne YouTube Finance FR n'a ce style. Les chaînes existantes font toutes :
fond noir + graphiques néon + rouge urgent + voix énergique.

TradingRecap fait l'inverse total :
- **Fond crème** `#f5f0e8` — papier journal de qualité
- **Graphiques à l'encre** — tracés noirs sur fond clair, texture légèrement granuleuse
- **Animations lentes et précises** — les lignes se tracent à la vitesse d'un stylo
- **Palette ultra-restreinte** — 4 couleurs maximum dans toute la vidéo
- **Rythme posé** — tranche radicalement avec le YouTube Finance habituel

### Références visuelles exactes

1. Les infographies data du New York Times (section économie/marchés)
2. The Economist — graphiques hebdomadaires
3. Financial Times — style editorial print transposé en vidéo
4. Bloomberg Businessweek — illustrations éditoriales

### Pourquoi ce style pour la monétisation

- Indistinguable d'un contenu humain de qualité → anti-démonétisation
- Audience 30-55 ans, revenus élevés → RPM 15-25€/1000 vues vs 5-15€ standard
- Identité si forte qu'elle devient le "visage" de la chaîne (compense l'absence de narrateur à l'écran)
- Zéro concurrent direct → algorithme YouTube le traite comme contenu unique

---

## 2. Stack technique arrêté

### Génération d'images : ComfyUI

**Pas Midjourney** (pas d'API officielle stable, risque ban ToS).  
**Pas Flux via API cloud seul** (pas de contrôle de style cohérent inter-épisodes).

**ComfyUI en local ou cloud GPU** avec :
- Modèle base : Flux.2 ou SDXL
- **LoRA "gravure encre éditoriale"** chargé en permanence → cohérence de style garantie
- ControlNet pour contraindre la composition (réserver l'espace pour les overlays Remotion)
- Workflow JSON fixe exporté une fois, prompt texte change à chaque appel

**API ComfyUI native :**
```
POST http://localhost:8188/prompt   → queue un workflow
GET  http://localhost:8188/history/{id}  → polling résultat
GET  http://localhost:8188/view     → télécharger l'image
```

Appel depuis TypeScript pipeline :
```typescript
async function generateInkImage(prompt: string): Promise<Buffer> {
  const workflowJson = loadWorkflow('ink-editorial.json') // workflow fixe
  workflowJson['6']['inputs']['text'] = prompt // seul le prompt change
  const { prompt_id } = await fetch('http://localhost:8188/prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt: workflowJson })
  }).then(r => r.json())
  
  // polling
  while (true) {
    const history = await fetch(`http://localhost:8188/history/${prompt_id}`).then(r => r.json())
    if (history[prompt_id]?.outputs) {
      const { filename, subfolder } = history[prompt_id].outputs['9'].images[0]
      return fetchImage(filename, subfolder)
    }
    await sleep(500)
  }
}
```

### Background removal : Remove.bg API

Pour les sujets humains/objets générés par ComfyUI qui nécessitent d'être posés sur le fond crème Remotion.

```typescript
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData()
  formData.append('image_file', new Blob([imageBuffer]))
  formData.append('size', 'auto')
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.REMOVEBG_API_KEY },
    body: formData
  })
  return Buffer.from(await response.arrayBuffer())
}
```

Coût : ~$0.01/image. Pour 7-10 images/épisode = $0.07-0.10/épisode.

### Rendu vidéo : Remotion (inchangé)

Remotion reste le renderer central. Ce qui change : tous les composants sont refondus
pour le style encre/papier. Voir section 5.

### TTS : ElevenLabs (inchangé)

Clone vocal de la voix du créateur. Voir Blueprint v2 Bloc F.

---

## 3. Architecture P6 — Direction Globale (Sonnet C5)

### Rôle exact de P6

P6 est le **point de synchronisation critique** du pipeline.
Tout ce qui vient avant (P0→P5) est du texte et de la logique.
Tout ce qui vient après (P7→P8) est de la production audiovisuelle.

C5 Sonnet est la **seule couche** qui voit l'épisode entier comme séquence temporelle.

### Ce que P6 produit : `episode_directed.json`

```typescript
interface EpisodeDirected {
  date: string
  episodeId: string
  totalDurationSec: number
  moodTag: MoodTag // 'tension_geopolitique' | 'risk_off_calme' | 'bullish_momentum' | 'neutre_analytique' | 'incertitude'
  musicTrack: string
  musicFadeInSec: number
  musicFadeOutSec: number  // toujours 8s avant fin
  musicVolumeDb: number
  colorPalette: {
    dominant: string    // hex — pilote les accents de couleur Remotion
    accent: string
    background: string  // toujours #f5f0e8 (crème) pour ce style
    note: string
  }
  sequence: DirectedBlock[]
  globalDirectorNotes: {
    moodEvolution: string
    musicStrategy: string
    colorStrategy: string
    disclaimerBar: DisclaimerConfig
    shortVersion: ShortConfig
  }
}

interface DirectedBlock {
  id: string              // 'cold_open' | 'title_card' | 'thread' | 'seg_1'...'seg_N' | 'closing'
  type: RemotionSceneType // 'ColdOpenScene' | 'ChartDeepDiveScene' | 'ComparisonScene' | 'FlashScene' | 'OutroScene' | 'ThreadScene' | 'TitleCardScene'
  tStart: number          // secondes absolues depuis début vidéo
  tEnd: number
  durationSec: number
  transition: {
    in: TransitionSpec
    out: TransitionSpec
  }
  visual: VisualSpec      // spécifique au type de scène
  chartInstructions: ChartInstruction[] // de C2, enrichies avec tShow/tHide
  voicePacing: PacingTag
  rythmeChange: RythmeBreakpoint[]
}

interface ChartInstruction {
  type: 'resistance_line' | 'support_line' | 'annotation' | 'trend_line'
  asset: string           // ticker Yahoo Finance
  value: number           // niveau de prix
  label: string
  tShow: number           // seconde absolue d'apparition
  tHide: number           // seconde absolue de disparition
  style: ChartLineStyle
  animate?: 'draw_from_left' | 'fade_in' | 'pulse'
}

type ChartLineStyle =
  | 'solid_red' | 'dashed_red' | 'dashed_red_bold'
  | 'solid_green' | 'dashed_green'
  | 'solid_yellow' | 'dashed_yellow'
  | 'dashed_orange' | 'dashed_dim' | 'dashed_blue'

type TransitionType =
  | 'cut'                    // 0ms — instantané
  | 'fade_from_black'        // fondu depuis noir
  | 'fade_to_black'
  | 'dissolve'               // fondu enchaîné
  | 'wipe_left'              // balayage horizontal
  | 'wipe_right'
  | 'ink_sweep'              // NOUVEAU — trait d'encre qui balaie (signature visuelle)
  | 'zoom_in_from_ticker'    // zoom depuis le nom du ticker
  | 'split_screen_appear'    // split screen qui s'ouvre
  | 'dissolve_to_dark'
  | 'flash_to_black'
  | 'cut_to_black_brief'

type PacingTag =
  | 'lent_martelé'           // cold open — chaque mot séparé
  | 'pose_fluide'            // thread, fil conducteur
  | 'energique_debut_pose_milieu_tension_fin'  // DEEP complexe
  | 'analytique_pose'        // DEEP analytique
  | 'pose_suspense'          // FOCUS avec angle inattendu
  | 'rapide_factuel'         // FLASH
  | 'pose_pedagogique'       // explication mécanique
  | 'pose_synthese_puis_engagement'  // closing

interface RythmeBreakpoint {
  tAt: number       // seconde absolue du changement
  pacing: string    // nouveau pacing à partir de ce point
  note: string      // instruction pour C6 Haiku
}
```

### Règles de construction de la séquence P6

**Budget temps strict :**
```
Cold open    :  5-8s  (1 phrase choc)
Title card   :  4-6s
Thread       : 18-25s
Segments     : variable selon depth (DEEP=90-130s, FOCUS=45-70s, FLASH=25-40s)
Closing      : 80-100s (recap 3pts + CTA + teaser)
Total cible  : 480-600s (jamais dépasser 620s)
```

**Règle des transitions :**
- Entre DEEP et FOCUS → `ink_sweep` (signature visuelle) + son `whoosh_ink.mp3`
- Entre FOCUS et FLASH → `cut` sec (rythme s'accélère)
- Entre FLASH et FLASH → `cut` sec
- Avant closing → `dissolve_to_dark` + respiration musicale

**Règle de couleur par mood :**
```
tension_geopolitique → accent #c0392b (rouge sang encre)
risk_off_calme       → accent #2c3e50 (encre bleue marine)
bullish_momentum     → accent #1a6b3a (vert encre foncé)
neutre_analytique    → accent #4a4a4a (encre grise)
incertitude          → accent #8b6914 (amber encre)
```

**Règle du Short automatique :**
C5 sélectionne le segment avec le drama score le plus élevé.
Format : cold_open (max 7s) + début du segment sélectionné (jusqu'à 60s total).
Recadrage 9:16 géré par Remotion en P8.

---

## 4. Architecture P7 — Production Parallèle

### Vue d'ensemble

```
P6 episode_directed.json
         │
         ├──────────────────────────────────┐──────────────────────────────┐
         │                                  │                              │
    BRANCHE AUDIO                    BRANCHE VISUELLE              BRANCHE THUMBNAIL
    C6 Haiku (~4 min)               C7 Sonnet (~2 min)             C9 Haiku (~90s)
         │                                  │                              │
    Adaptation TTS                  Storyboard 90 slots            2 prompts A/B
         │                           C8 Haiku → prompts                   │
    Config ElevenLabs                        │                        Flux via
         │                          ComfyUI (style encre)           ComfyUI
    ElevenLabs API                           │                              │
         │                          Remove.bg (si besoin)          Sharp.js overlay
    WAV × 13 segments                        │                              │
         │                         PNG transparents                thumbnail_a/b.png
    Whisper → SRT/ASS                        │
         │                         visual_routing.json
    audio_manifest.json            (PNG ready for Remotion)
```

Les 3 branches démarrent simultanément. Aucune dépendance inter-branches.
Goulot : ElevenLabs (~4 min pour 548s de narration).

### Branche Audio — détail

**C6 Haiku — Adaptation vocale**

Reçoit : narrations C3 + breakpoints pacing de P6.
Produit : `narrations_adapted.json` avec SSML et corrections TTS.

Transformations obligatoires :
```
WTI         → Le W.T.I.
RSI=73      → le R.S.I. est à soixante-treize
SMA200      → la moyenne deux cents jours
DXY         → le D.X.Y.
COT         → le rapport C.O.T.
+9,72%      → plus neuf virgule sept pour cent
—           → <break time="0.4s"/>
```

**Code — Config ElevenLabs par breakpoint**

Mapping pacing → paramètres ElevenLabs :
```typescript
const PACING_TO_EL: Record<string, ElevenLabsConfig> = {
  'lent_martelé':       { speed: 0.82, stability: 0.85, style: 0.6 },
  'pose_fluide':        { speed: 0.93, stability: 0.72, style: 0.3 },
  'rapide':             { speed: 1.08, stability: 0.65, style: 0.7 },
  'pose':               { speed: 0.90, stability: 0.78, style: 0.25 },
  'tension_montante':   { speed: 0.88, stability: 0.80, style: 0.55 },
  'analytique':         { speed: 0.95, stability: 0.75, style: 0.2 },
  'suspense':           { speed: 0.87, stability: 0.82, style: 0.45 },
  'rapide_factuel':     { speed: 1.10, stability: 0.62, style: 0.6 },
  'pose_pedagogique':   { speed: 0.88, stability: 0.80, style: 0.2 },
  'direct_engagement':  { speed: 0.97, stability: 0.70, style: 0.45 },
  'teaser_dynamique':   { speed: 1.04, stability: 0.68, style: 0.5 },
}
```

Un segment peut générer plusieurs fichiers WAV si il contient des breakpoints.
Ex: seg_1 avec 3 breakpoints → 3 appels ElevenLabs → seg_1_a.wav, seg_1_b.wav, seg_1_c.wav.

`audio_manifest.json` contient les durées WAV **réelles** — c'est le timing maître de Remotion en P8.
Les durées estimées de C3 sont ignorées à partir de P7.

**Whisper — Sous-titres**

Input : tous les WAV.
Output :
- `subtitles_main.srt` — format standard pour vidéo principale
- `subtitles_short.ass` — format animé pour Short vertical (style TikTok)
- `word_timestamps.json` — timestamps mot par mot (pour animations Remotion futures)

Dictionnaire custom pour corrections :
```json
{
  "W.T.I.": "WTI",
  "D.X.Y.": "DXY",
  "R.S.I.": "RSI",
  "C.O.T.": "COT",
  "S and P": "S&P"
}
```

### Branche Visuelle — détail

**C7 Sonnet — Storyboard complet**

C'est la couche la plus importante de P7. Elle produit le `visual_storyboard.json` —
**90 slots visuels distincts** pour une vidéo de 548s (moyenne 6.1s/slot).

C7 reçoit :
- `episode_directed.json` (timing, transitions, pacing)
- Les narrations C3 découpées par segment
- L'historique des 7 derniers storyboards (pour forcer la variété)

C7 produit pour chaque slot :
```typescript
interface VisualSlot {
  slot: number
  tStart: number
  tEnd: number
  segId: string
  source: VisualSource
  type: VisualType
  description: string     // instruction lisible par humain
  asset?: string          // ticker si graphique financier
  prompt?: string         // prompt ComfyUI si image générée
  query?: string          // query stock photo si Pexels/Unsplash
  duration: number
}

type VisualSource =
  | 'REMOTION_CHART'    // graphique de prix animé
  | 'REMOTION_TEXT'     // infographie texte / mécanique causale
  | 'REMOTION_DATA'     // gauge, heatmap, badge, countdown
  | 'REMOTION_LOWER'    // lower third
  | 'COMFYUI'           // image style encre générée (remplace MIDJOURNEY)
  | 'STOCK'             // photo libre de droits Pexels/Unsplash

type VisualType =
  // REMOTION_CHART
  | 'chart_principal'       // chart asset avec niveaux annotés
  | 'chart_comparaison'     // deux assets côte à côte
  | 'chart_spark'           // sparkline minimaliste
  | 'chart_split'           // split screen deux charts
  | 'chart_correlation'     // deux courbes overlay
  | 'chart_indicateur'      // RSI ou autre indicateur seul
  | 'yield_curve'           // courbe des taux
  // REMOTION_TEXT
  | 'infographie_chaine'    // chaîne causale animée
  | 'infographie_definition'// définition d'un terme
  | 'infographie_scenario'  // fork haussier/baissier
  | 'infographie_alerte'    // badge alerte niveau clé
  | 'infographie_schema'    // schéma technique (Bollinger, etc.)
  | 'infographie_paradoxe'  // deux affirmations contradictoires
  | 'transition_segment'    // phrase de transition plein écran
  | 'question_cta'          // question CTA finale
  // REMOTION_DATA
  | 'chiffre_geant_animé'   // cold open
  | 'gauge_animee'          // Fear&Greed, RSI
  | 'multi_badge'           // 3-5 assets avec variations
  | 'callout_mover'         // mover exceptionnel en évidence
  | 'heatmap_sectorielle'   // heatmap 11 secteurs S&P
  | 'donnee_animee'         // stat avec compteur
  | 'countdown_event'       // countdown vers event éco
  | 'carte_annotee'         // carte géographique Remotion
  | 'calendrier_eco'        // calendrier éco du lendemain
  | 'recap_point'           // un point du recap closing
  | 'teaser_demain'         // teaser final
  | 'end_card'              // end card YouTube
  | 'lower_third_recap'     // bandeau recap segment
  // COMFYUI
  | 'image_conceptuelle'    // illustration style encre
  // STOCK
  | 'photo_actualite'       // photo libre droits
```

**Règle de bifurcation C7 :**
```
Asset financier avec ticker → REMOTION_CHART (jamais ComfyUI sur les prix)
Concept géopolitique/macro → COMFYUI (style encre)
Personne réelle (Powell, Lagarde) → STOCK (Pexels/Unsplash)
Mécanique causale → REMOTION_TEXT
Données chiffrées → REMOTION_DATA
```

**Règle de rythme variable obligatoire :**
C7 NE DOIT PAS produire des slots uniformes.
Pattern obligatoire : alterner court (2-4s sur chiffre fort) / long (8-12s sur mécanique).
Un segment de 60s doit avoir au minimum 3 durées différentes de slots.

**Contrainte de variété inter-épisodes :**
C7 reçoit la liste des types visuels utilisés dans les 7 derniers épisodes.
Aucun type ne peut être utilisé plus de 2 fois dans la même position narrative.

**C8 Haiku — Prompts ComfyUI style encre**

Reçoit : liste des slots COMFYUI du storyboard C7.
Produit : prompts optimisés pour le LoRA encre éditoriale.

Règles de prompt obligatoires :
```
TOUJOURS inclure : "ink illustration, editorial style, cream paper texture,
                    crosshatching, etching, New York Times infographic aesthetic,
                    muted palette, grain texture, no text"

TOUJOURS inclure : "empty [left/right/top] third for text overlay"
                   (laisser de l'espace pour Remotion)

JAMAIS inclure : visages reconnaissables de personnages publics
                 (utiliser STOCK pour Powell, Lagarde, etc.)

FORMAT : 1920x1080, negative prompt: "color, bright, neon, photorealistic,
          modern design, UI elements, charts, graphs, text, numbers"
```

Exemple :
```
Input C7: "Détroit d'Ormuz vu du ciel nuit, tankers"
Output C8: "Aerial view narrow strait at night, oil tankers crossing dark water,
            ink illustration, editorial style, cream paper texture, crosshatching,
            etching aesthetic, muted palette, grain texture, no text,
            empty left third for text overlay, cinematic composition,
            negative: color, bright, neon, photorealistic, text, numbers"
```

**Code — Appel ComfyUI**

```typescript
interface ComfyUIClient {
  baseUrl: string  // 'http://localhost:8188' en local
  workflowPath: string  // chemin vers ink-editorial.json
}

async function generateInkImage(
  client: ComfyUIClient,
  prompt: string,
  negativePrompt: string,
  seed?: number
): Promise<Buffer> {
  const workflow = JSON.parse(fs.readFileSync(client.workflowPath, 'utf8'))
  
  // Injecter le prompt dans le workflow (IDs dépendent du workflow)
  workflow['6']['inputs']['text'] = prompt
  workflow['7']['inputs']['text'] = negativePrompt
  if (seed) workflow['3']['inputs']['seed'] = seed
  
  // Queue
  const { prompt_id } = await fetch(`${client.baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow })
  }).then(r => r.json())
  
  // Poll jusqu'à completion (max 60s)
  const startTime = Date.now()
  while (Date.now() - startTime < 60000) {
    const history = await fetch(`${client.baseUrl}/history/${prompt_id}`)
      .then(r => r.json())
    
    if (history[prompt_id]?.outputs) {
      const img = history[prompt_id].outputs['9'].images[0]
      const response = await fetch(
        `${client.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=output`
      )
      return Buffer.from(await response.arrayBuffer())
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`ComfyUI timeout for prompt_id: ${prompt_id}`)
}
```

**Code — Remove.bg**

```typescript
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData()
  formData.append('image_file', new Blob([imageBuffer]), 'image.png')
  formData.append('size', 'auto')
  
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.REMOVEBG_API_KEY! },
    body: formData
  })
  
  if (!response.ok) throw new Error(`Remove.bg error: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

// Décision : remove background ou non ?
function needsBackgroundRemoval(slot: VisualSlot): boolean {
  // Seulement pour les images COMFYUI posées sur fond Remotion
  // PAS pour les images qui occupent tout l'écran
  return slot.source === 'COMFYUI' && slot.type !== 'image_conceptuelle_plein_ecran'
}
```

**Branche Thumbnail — détail**

**C9 Haiku — Prompts thumbnail A/B**

Reçoit : titre, chiffre clé, moodTag, accent couleur.
Produit : 2 concepts visuels différenciés.

Règles :
- Variante A : focus sur le chiffre/asset principal (ex: "100$")
- Variante B : focus sur l'angle narratif (ex: "Fed piégée")
- Style : même LoRA encre que les images — cohérence totale
- Espace réservé en haut pour overlay titre Sharp.js

**Code — Overlay Sharp.js**

```typescript
async function addThumbnailOverlay(
  imageBuffer: Buffer,
  title: string,
  keyFigure: string,
  accentColor: string
): Promise<Buffer> {
  // SVG overlay avec typographie charte
  const svgOverlay = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <!-- Chiffre fort en grand -->
      <text x="64" y="180" 
        font-family="'Bebas Neue'" font-size="160" fill="${accentColor}"
        filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.3))">
        ${keyFigure}
      </text>
      <!-- Titre en dessous -->
      <text x="64" y="240" 
        font-family="'Playfair Display'" font-size="38" fill="#1a1612"
        font-style="italic">
        ${title.substring(0, 45)}
      </text>
      <!-- Badge chaîne -->
      <rect x="64" y="650" width="200" height="36" fill="#1a1612" rx="3"/>
      <text x="74" y="673" 
        font-family="'JetBrains Mono'" font-size="12" fill="#f5f0e8"
        letter-spacing="3">
        TRADING RECAP
      </text>
    </svg>
  `
  
  return await sharp(imageBuffer)
    .resize(1280, 720)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer()
}
```

---

## 5. Composants Remotion à construire (Bloc E revu)

### Design System — `brand.ts`

```typescript
export const BRAND = {
  // Couleurs base (NYT style)
  cream:        '#f5f0e8',  // fond principal — jamais changer
  creamDark:    '#ede7d9',  // fond légèrement plus sombre
  ink:          '#1a1612',  // encre principale
  inkMid:       '#3d342a',  // encre texte courant
  inkLight:     '#7a6e62',  // encre annotations
  inkFaint:     '#b8afa4',  // encre très légère
  rule:         '#c8bfb0',  // lignes de séparation
  
  // Accents (par mood — injectés depuis episode_directed.json)
  accentDefault:  '#c0392b',  // rouge sang encre
  accentBull:     '#1a6b3a',  // vert encre foncé
  accentBear:     '#c0392b',  // rouge sang encre
  accentWarning:  '#8b6914',  // amber encre
  accentNeutral:  '#4a4a4a',  // encre grise
  
  // Typographie
  fontDisplay:  "'Playfair Display', Georgia, serif",
  fontBody:     "'Source Serif 4', Georgia, serif",
  fontMono:     "'JetBrains Mono', monospace",
  fontCondensed:"'Bebas Neue', sans-serif",  // chiffres forts
  
  // Textures
  grainOpacity: 0.06,       // grain papier sur toutes les scènes
  grainFrequency: 0.9,      // fréquence du bruit
  
  // Chart style (encre)
  chartLineWidth:     2.5,  // épaisseur ligne de prix
  chartInkColor:      '#1a1612',
  chartResistColor:   '#8b1a1a',  // rouge encre foncé
  chartSupportColor:  '#1a4d2e',  // vert encre foncé
  chartAnnotColor:    '#8b6914',  // amber encre
  
  // Animation timings
  inkDrawSpeed:    0.8,    // secondes pour tracer 1cm de ligne
  fadeInDuration:  0.3,
  labelAppearDelay: 0.2,   // délai après la ligne
  
  // Layout
  safeZoneHorizontal: 96, // px — marges pour sous-titres
  safeZoneVertical:   54, // px
  disclaimerHeight:   32, // px — bandeau bas permanent
}
```

### Composant `<GrainOverlay />`

À inclure dans TOUTES les scènes. Permanent.

```typescript
// Ajoute la texture grain papier sur toute la scène
export function GrainOverlay({ opacity = BRAND.grainOpacity }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
        <svg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'>
          <filter id='noise'>
            <feTurbulence type='fractalNoise' baseFrequency='${BRAND.grainFrequency}'
              numOctaves='4' stitchTiles='stitch'/>
          </filter>
          <rect width='100%' height='100%' filter='url(#noise)' opacity='0.04'/>
        </svg>
      `)}")`,
      pointerEvents: 'none',
      zIndex: 1000,
      opacity,
    }} />
  )
}
```

### Composant `<DisclaimerBar />`

Bandeau permanent en bas, toutes les scènes, toute la durée.

```typescript
export function DisclaimerBar() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: BRAND.disclaimerHeight,
      background: 'rgba(26,22,18,0.75)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: BRAND.safeZoneHorizontal,
      zIndex: 999,
    }}>
      <span style={{
        fontFamily: BRAND.fontMono,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(245,240,232,0.6)',
      }}>
        Contenu strictement éducatif — pas un conseil en investissement
      </span>
    </div>
  )
}
```

### Composant `<InkChart />` — LE composant central

C'est le composant le plus important du pipeline. Il anime les graphiques de prix
**à la vitesse d'un stylo** en sync avec la narration.

```typescript
interface InkChartProps {
  // Données
  asset: string              // ticker Yahoo Finance
  candles: OHLCV[]           // données OHLCV du snapshot
  timeframe: '1d' | '1h' | '1w'
  
  // Niveaux à afficher (depuis chartInstructions P6)
  levels: ChartInstruction[]
  
  // Timing (depuis audio_manifest.json P7)
  tStartAbsolute: number     // seconde absolue dans la vidéo
  
  // Style
  accentColor: string        // depuis moodTag
  showRSI?: boolean
  splitWith?: string         // ticker second asset pour split screen
}

// Le composant anime:
// 1. La courbe de prix qui se trace de gauche à droite (inkDrawSpeed)
// 2. Chaque niveau qui apparaît au bon tShow (draw_from_left animation)
// 3. Les labels qui pop après la ligne (labelAppearDelay)
// 4. Optionnel: RSI en dessous avec sa propre animation
```

**Implémentation de l'animation "tracé encre" :**

La courbe ne s'affiche pas d'un coup. Elle se dessine progressivement.
Technique : SVG `stroke-dashoffset` animé.

```typescript
// Pseudo-code de l'animation
const totalLength = pathRef.current.getTotalLength()
const progress = interpolate(frame, [0, durationFrames], [totalLength, 0])
// stroke-dasharray = totalLength
// stroke-dashoffset = progress (animé de totalLength à 0)
```

**Style encre pour les graphiques :**
- Fond : `#f5f0e8` (crème) — pas de fond sombre
- Courbe de prix : ligne `#1a1612` (encre noire), épaisseur 2.5px, légère irrégularité
- Volume : barres encre très légère `#c8bfb0`
- Résistances : `#8b1a1a` tiretée — se tracent de gauche à droite quand la voix en parle
- Supports : `#1a4d2e` tiretée
- Labels : Playfair Display italic, couleur de la ligne

### Composant `<CausalChain />`

Anime une chaîne causale nœud par nœud en sync avec la voix.

```typescript
interface CausalChainProps {
  steps: Array<{
    label: string
    tReveal: number  // seconde absolue d'apparition du nœud
  }>
  accentColor: string
}
// Animation: chaque nœud apparaît au tReveal, relié par une flèche qui se trace
// Style: Playfair Display italic, encre sur fond crème, flèches style calligraphie
```

### Composant `<ScenarioFork />`

```typescript
interface ScenarioForkProps {
  trunk: string           // "Si PCE sort demain..."
  bullish: { label: string; target: string; prob: number }
  bearish: { label: string; target: string; prob: number }
  tReveal: number
}
// Animation: trunk apparaît, puis bifurcation se trace, puis les deux branches
// Couleurs: vert encre pour bull, rouge encre pour bear
```

### Composant `<InkReveal />` — transition signature

La transition entre segments DEEP/FOCUS. Un trait d'encre balaie l'écran.

```typescript
// Remotion spring animation
// Un SVG rect noir qui part de x=0, width=0 → width=1920 (sweep left to right)
// Puis width=1920 → width=0 (repartant de droite)
// La nouvelle scène apparaît derrière pendant le balayage
// Son: 'ink_sweep.mp3' — frottement de plume sur papier
```

### Composant `<PermanentTicker />`

Bandeau en bas (juste au-dessus du disclaimer) avec l'asset du segment en cours.

```typescript
interface PermanentTickerProps {
  asset: string
  price: number
  change: number
  changePercent: number
}
// S'affiche dès le début du segment, disparaît à la fin
// Style: DM Mono, petite taille, encre légère
// Position: bottom 32px (juste au-dessus du disclaimer)
```

### Composant `<HeatmapGrid />`

Pour les rotations sectorielles.

```typescript
interface HeatmapGridProps {
  sectors: Array<{
    name: string
    change: number    // % variation
    tReveal: number   // apparition progressive
  }>
}
// Chaque cellule s'allume au tReveal
// Couleur: gradient encre — rouge foncé (baisse) → crème (neutre) → vert foncé (hausse)
// Jamais de rouge/vert criard — toujours dans la palette encre
```

---

## 6. Structure de fichiers P7

```
packages/
  ai/
    src/
      p6-director/
        director.ts          # C5 Sonnet — construit episode_directed.json
        types.ts             # EpisodeDirected, DirectedBlock, etc.
        
      p7-audio/
        c6-adapter.ts        # C6 Haiku — adapte narrations pour TTS
        elevenlabs.ts        # Appels ElevenLabs avec config par breakpoint
        whisper.ts           # Transcription → SRT/ASS
        audio-manifest.ts    # Construit audio_manifest.json
        
      p7-visual/
        c7-storyboard.ts     # C7 Sonnet — storyboard 90 slots
        c8-prompts.ts        # C8 Haiku — prompts ComfyUI style encre
        comfyui.ts           # Client ComfyUI API
        remove-bg.ts         # Remove.bg API
        stock-photos.ts      # Pexels/Unsplash API
        visual-assembler.ts  # Orchestre les 3 sources → visual_routing.json
        
      p7-thumbnail/
        c9-thumbnail.ts      # C9 Haiku — prompts thumbnail A/B
        sharp-overlay.ts     # Overlay titre/chiffre avec Sharp.js
        
  remotion-app/
    src/
      brand.ts               # Design system NYT (BRAND constants)
      scenes/
        ColdOpenScene.tsx
        TitleCardScene.tsx
        ThreadScene.tsx
        ChartDeepDiveScene.tsx
        ComparisonScene.tsx
        FlashScene.tsx
        OutroScene.tsx
      components/
        shared/
          GrainOverlay.tsx        # Texture grain papier — dans TOUTES les scènes
          DisclaimerBar.tsx       # Bandeau compliance — permanent
          PermanentTicker.tsx     # Asset en cours en bas
        chart/
          InkChart.tsx            # Graphique tracé à l'encre — COMPOSANT CENTRAL
          LevelReveal.tsx         # Ligne de niveau qui se trace
          InkRSI.tsx              # RSI style encre
          YieldCurve.tsx          # Courbe des taux
        infographic/
          CausalChain.tsx         # Chaîne causale animée
          ScenarioFork.tsx        # Fork haussier/baissier
          InkDefinition.tsx       # Définition d'un terme
          InkAlert.tsx            # Badge alerte niveau
        data/
          FearGreedGauge.tsx      # Gauge Fear & Greed style encre
          HeatmapGrid.tsx         # Heatmap sectorielle
          MultiAssetBadge.tsx     # 3-5 badges d'assets
          EcoCalendar.tsx         # Calendrier éco
          CountdownEvent.tsx      # Countdown vers event
        transitions/
          InkSweep.tsx            # Balayage d'encre — transition signature
          InkReveal.tsx           # Variantes de transitions
```

---

## 7. Workflow de développement recommandé

### Sprint 1 — Fondations (priorité absolue)

1. `brand.ts` — design system complet
2. `GrainOverlay.tsx` + `DisclaimerBar.tsx` — présents dans toutes les scènes
3. `InkChart.tsx` — composant central, tracer une courbe à l'encre
4. `LevelReveal.tsx` — ligne de niveau animée
5. `ColdOpenScene.tsx` — chiffre géant sur fond crème

**Test de validation Sprint 1 :**
Générer une scène de 30s avec un chart WTI qui se trace, une résistance à 100$ qui apparaît,
et le grain papier en overlay. Si c'est beau — continuer. Sinon — itérer le style.

### Sprint 2 — Infographies et Data

6. `CausalChain.tsx`
7. `ScenarioFork.tsx`
8. `HeatmapGrid.tsx`
9. `FearGreedGauge.tsx`
10. `InkSweep.tsx` (transition signature)

### Sprint 3 — ComfyUI + Audio

11. `comfyui.ts` — client API
12. Workflow ComfyUI `ink-editorial.json` — à construire dans l'interface ComfyUI
13. `c6-adapter.ts` — adaptation TTS
14. `elevenlabs.ts` — config par breakpoint
15. `whisper.ts` — sous-titres

### Sprint 4 — Direction et Storyboard

16. `c7-storyboard.ts` — C7 Sonnet prompt
17. `c8-prompts.ts` — C8 Haiku prompts encre
18. `director.ts` — C5 Sonnet P6
19. Assemblage complet P7 → P8

---

## 8. Contraintes non négociables

### Style visuel
- **Jamais de fond sombre** dans les scènes principales — c'est `#f5f0e8` partout
- **Jamais de couleurs vives** — tout dans la palette encre (rouge sombre, vert sombre, amber sombre)
- **Grain obligatoire** — `GrainOverlay` dans chaque scène, aucune exception
- **Typographie stricte** — Playfair Display pour titres, Source Serif pour corps, JetBrains Mono pour chiffres
- **Jamais de font générique** (Inter, Roboto, Arial sont interdits)

### Compliance AMF
- `DisclaimerBar` permanent sur toutes les scènes, toute la durée
- Aucun terme interdit dans les narrations (vérification regex en P5 Quality Gate)
- Conditionnel obligatoire : "pourrait", "si...alors", "zone à surveiller"

### Performance
- Chaque scène Remotion doit se rendre en < 2x realtime sur CPU standard
- `InkChart` ne doit pas recalculer à chaque frame — mémoïsation obligatoire
- ComfyUI : max 5 appels parallèles (limiter la charge GPU)

### Anti-démonétisation
- `PatternInterrupt` : aucun template visuel répété plus de 2x dans la même position
- C7 reçoit l'historique 7 jours pour forcer la variété
- Variation de la durée des slots : jamais uniforme dans un épisode

---

## 9. Variables d'environnement nécessaires

```bash
# ComfyUI
COMFYUI_URL=http://localhost:8188          # ou URL cloud GPU
COMFYUI_WORKFLOW_PATH=./workflows/ink-editorial.json

# Remove.bg
REMOVEBG_API_KEY=xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx                    # clone vocal du créateur

# Stock photos
PEXELS_API_KEY=xxx

# Pipeline existant (inchangé)
ANTHROPIC_API_KEY=xxx
OPENROUTER_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
```

---

## 10. Fichiers de référence à lire avant de coder

1. **Blueprint v2** (`BLUEPRINT.md`) — architecture globale, compliance AMF, stratégie LLM
2. **episode_directed_2026-03-12.json** — exemple réel de output P6 (référence de structure)
3. **c7_storyboard_2026-03-12.json** — exemple réel de storyboard C7 (104 slots)
4. **tradingrecap-script-2026-03-12-educatif-v2.html** — style narration éducatif de référence

Ces fichiers documentent des décisions prises sur un épisode réel du 12 mars 2026
(escalade Iran, Brent >100$, S&P -1.52%, VIX +12.6%).
Toutes les structures de données, types, et exemples de prompts sont issus de cet épisode réel.

---

*Document généré le 15 mars 2026 — Session d'analyse pipeline TradingRecap v3*
*Prochaine étape : Sprint 1 — brand.ts + InkChart.tsx*
