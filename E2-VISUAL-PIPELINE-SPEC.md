# Bloc E v2 — Visual Pipeline : Beat-based + ComfyUI Image Generation

> **Remplace** l'ancien Bloc E (scenes Remotion statiques par section).
> Ce document est la spec de reference pour le nouveau systeme visuel.
> Mis a jour : 2026-03-19 — v2 : alignement C7/C8 du BLUEPRINT

---

## 1. Vision

**Avant** : 1 scene Remotion = 1 section du script (45-90s de la meme image/chart). Statique, ennuyeux.

**Apres** : La video est une succession rapide de **beats visuels** (~5-8s chacun), chaque beat etant une **image generee par IA** (ComfyUI + Flux 2 Dev) avec des **overlays data animes** (charts, stats, liens causaux) quand c'est pertinent. Transitions dynamiques entre chaque beat.

**Inspiration** : chaines YouTube d'analyse/vulgarisation premium (pas de talking head — images evocatrices + narration voix off + data overlays).

---

## 2. Architecture Pipeline

```
Pipeline existant (P0→P6)
    ↓ EpisodeScript (avec narration, direction, sections)
    ↓
P7a — BEAT GENERATOR (CODE pur)
    ↓ Decoupe narration → Beat[] (~80-120 beats, 5-8s chacun)
    ↓ Classification overlay automatique (heuristiques texte)
    ↓
P7b — C7 SONNET : DIRECTION ARTISTIQUE VISUELLE
    ↓ Voit TOUS les beats d'un coup (1 appel)
    ↓ Pour chaque beat : registre visuel, intention emotionnelle,
    ↓ type d'image, overlay valide/corrige, transition, effet
    ↓ Coherence globale : palette, progression, rythme visuel
    ↓
P7c — C8 HAIKU : PROMPTS IMAGE OPTIMISES
    ↓ Transforme chaque direction C7 en prompt Flux 2 Dev
    ↓ Ajoute suffixe technique (style, lighting, camera)
    ↓ Detecte beats similaires → reutilisation image
    ↓
P7d — COMFYUI CLOUD : GENERATION IMAGES
    ↓ ~60-100 images uniques 1344x768 → data/images/ep-{DATE}/
    ↓ (certains beats partagent une image — C8 regroupe)
    ↓
P8 — REMOTION RENDER (TransitionSeries)
    ↓ Images de fond (ken burns) + overlays data animes + transitions
    ↓
MP4
```

### Separation des responsabilites (alignee BLUEPRINT C7/C8)

| Etape | Modele | Role UNIQUE | Ce qu'il NE fait PAS |
|-------|--------|-------------|----------------------|
| P7a | Code | Decouper la narration en beats, classer les overlays | Pas de decision creative |
| P7b (C7) | **Sonnet** | Direction artistique — quel registre visuel, quelle emotion, quelle coherence | Ne genere PAS les prompts Flux |
| P7c (C8) | **Haiku** | Optimiser les prompts image pour Flux 2 Dev | Ne decide PAS quoi montrer |
| P7d | ComfyUI | Generer les images | Pas de LLM |

### Cout additionnel par episode

| Etape | Cout estime |
|-------|-------------|
| P7a Beat Generator (code) | 0$ |
| P7b C7 Sonnet Direction Artistique | ~0.04$ |
| P7c C8 Haiku Prompts Image | ~0.01$ |
| P7d ComfyUI Cloud (Flux 2 Dev, ~60-100 images) | ~0.40-0.70$ |
| **Total ajout visuel** | **~0.45-0.75$/episode** |
| **Total pipeline complet (LLM + images)** | **~0.80-1.20$/episode** |

---

## 3. Le Beat — Unite de base

Chaque beat = 1 moment visuel de 4-8 secondes.

```typescript
interface Beat {
  id: string;                    // "beat_001", "beat_002", ...
  segmentId: string;             // Relie a la section du script
  startSec: number;              // Position absolue dans l'episode
  durationSec: number;           // 4-8s typiquement

  // Narration
  narrationChunk: string;        // Le bout de texte lu pendant ce beat

  // Image de fond (generee par ComfyUI)
  imagePrompt: string;           // Prompt Flux 2 Dev (EN, langage naturel)
  imagePath?: string;            // Rempli apres generation : "data/images/ep-2026-03-19/beat_001.png"
  imageEffect: ImageEffect;      // Animation sur l'image statique

  // Overlay data (optionnel — pas sur tous les beats)
  overlay?: BeatOverlay;

  // Transition VERS le beat suivant
  transitionOut: TransitionType;
}

type ImageEffect =
  | 'ken_burns_in'       // Zoom lent vers l'avant (le plus courant)
  | 'ken_burns_out'      // Zoom lent vers l'arriere
  | 'slow_pan_left'      // Pan lent vers la gauche
  | 'slow_pan_right'     // Pan lent vers la droite
  | 'static';            // Pas de mouvement (rare)

type TransitionType =
  | 'cut'                // Coupe franche (dynamique, pour chiffres chocs)
  | 'fade'               // Fondu enchaine (pour changements de sujet)
  | 'slide_left'         // Glissement gauche (pour enchainements logiques)
  | 'slide_up'           // Glissement haut (pour progression)
  | 'wipe'               // Balayage (pour contrastes)
  | 'zoom_in'            // Zoom avant puis cut (pour impact)
  | 'cross_dissolve';    // Dissolution croisee (pour atmospheres)

interface BeatOverlay {
  type: OverlayType;
  data: Record<string, unknown>;
  position: 'center' | 'bottom_third' | 'top_right' | 'full';
  enterAnimation: 'pop' | 'slide_up' | 'fade' | 'count_up';
  enterDelayMs: number;  // Delai avant apparition (0 = immediat)
}

type OverlayType =
  | 'stat'               // Gros chiffre anime (ex: "-11.94%")
  | 'chart'              // InkChart ou CandlestickChart anime
  | 'chart_zone'         // Chart avec zoom sur zone S/R
  | 'causal_chain'       // Animation A → B → C
  | 'comparison'         // 2-4 assets cote a cote avec barres
  | 'headline'           // Carte news (source + titre)
  | 'text_card'          // Phrase cle sur fond semi-transparent
  | 'heatmap'            // Grille sectorielle
  | 'scenario_fork'      // Fork bullish/bearish
  | 'gauge'              // Jauge VIX ou Fear&Greed
  | 'ticker_strip';      // Bandeau defilant d'assets
```

---

## 4. Beat Generator (P7a — CODE pur)

### Decoupage mecanique, pas creatif

P7a est 100% code. Pas de LLM. Il prend l'EpisodeScript et produit un Beat[] brut.

**Etape 1 — Decoupage en chunks de narration**

On decoupe chaque `section.narration` en chunks de ~5-8 secondes (basé sur le word count, ~150 mots/60s = ~12-20 mots par beat). Le decoupage respecte les phrases (jamais couper au milieu).

```
Section narration (90s, ~225 mots)
  → chunk 1: "Le WTI a 83,45 dollars ce soir — moins douze pour cent en une seance." (6s)
  → chunk 2: "Le Brent suit a 87,80, moins onze." (4s)
  → chunk 3: "Et le premier reflexe serait de dire : tensions Iran, le petrole devrait monter." (6s)
  → ...
```

**Etape 2 — Pre-classification overlay (heuristiques)**

Pattern matching sur le texte du chunk :
- Contient un chiffre % ou $ → overlay `stat`
- Mentionne un asset de la watchlist → overlay `chart`
- Contient "a cause de", "parce que", "entraine" → overlay `causal_chain`
- Mentionne 2+ assets → overlay `comparison`
- Mentionne une news/actu → overlay `headline`
- Contient "scenario", "si...alors" → overlay `scenario_fork`
- Sinon → `none` (image seule — C7 decidera)

**Etape 3 — Metadonnees segment**

Chaque beat recoit : `segmentId`, `segmentDepth` (DEEP/FOCUS/FLASH), `segmentTopic`, `assets[]` du segment parent. C7 en aura besoin.

**Output** : `Beat[]` brut avec `narrationChunk`, `durationSec`, `overlayHint`, metadonnees. Pas d'image, pas de transition — c'est le boulot de C7.

---

## 5. Direction Artistique (P7b — C7 Sonnet)

### Le scenariste visuel

C7 est le **directeur artistique** de l'episode. Il recoit TOUS les beats d'un coup (1 seul appel Sonnet) et decide la mise en scene visuelle globale.

**Input** :
- `Beat[]` brut (de P7a) avec narrationChunks et overlayHints
- `EpisodeDirection` (de P6/C5) : mood, arc de tension, thumbnail moment
- `moodMarche` : risk-on / risk-off / incertain / rotation
- Liste des assets du jour avec prix/variation

**Output** : `BeatDirection[]` — chaque beat enrichi avec :

```typescript
interface BeatDirection {
  beatId: string;

  // Direction image (C7 decide quoi montrer)
  imageDirection: string;     // "Raffinerie petroliere au crepuscule, angle en contre-plongee,
                              //  ambiance menacante, ciel lourd — registre tension"
  imageReuse?: string;        // "same_as:beat_012" si reutilisation d'image

  // Overlay (C7 valide/corrige/supprime le hint de P7a)
  overlay: OverlayType | 'none';
  overlayNotes?: string;      // "Montrer le chiffre -11.94% en geant, spring agressif"

  // Rythme et transition
  imageEffect: ImageEffect;
  transitionOut: TransitionType;

  // Intention emotionnelle (guide C8 pour le style du prompt)
  emotion: 'tension' | 'analyse' | 'revelation' | 'contexte' | 'impact' | 'respiration' | 'conclusion';
}
```

### Ce que C7 decide (et que le code ne peut pas decider)

| Decision | Pourquoi c'est un job LLM |
|----------|---------------------------|
| Quel registre visuel pour ce beat ? | "Raffinerie" vs "salle de marche" vs "carte du monde" — depend du sens narratif |
| Reutiliser l'image precedente ? | Si 2 beats consecutifs parlent du meme sujet, C7 dit "same_as" — economise une generation |
| Supprimer un overlay prevu ? | Si le texte mentionne un chiffre mais que l'image seule est plus forte, C7 dit "none" |
| Quelle emotion ? | "tension" vs "respiration" — le code ne comprend pas le ton |
| Quel enchainement de transitions ? | Cuts rapides sur une rafale FLASH, fades lents sur un DEEP — logique editoriale |

### Regles injectees dans le prompt C7

1. **Coherence palette** : toutes les images du meme segment doivent partager un registre visuel (pas de raffinerie puis plage puis bureau)
2. **Ratio overlay/image pure** : viser ~35% overlay, ~65% image seule
3. **Reutilisation images** : beats consecutifs sur le meme asset/sujet → meme image, overlay different
4. **Rythme en vagues** : alterner beats rapides (4-5s, cuts) et beats poses (7-8s, fades)
5. **Jamais 2 overlays chart consecutifs** : alterner chart et image pure pour la lisibilite
6. **L'acte 1 (hook)** : 3-4s/beat, cuts francs, images fortes
7. **Les segments DEEP** : commencer par images contextuelles (pas d'overlay), puis data, puis chart, puis reflexion
8. **Les segments FLASH** : 4-5s/beat, cuts rapides, 1 stat max par beat

---

## 5b. Prompts Image Optimises (P7c — C8 Haiku)

### Le traducteur technique

C8 prend les directions artistiques de C7 et les transforme en **prompts Flux 2 Dev optimises**.

**Input** : `BeatDirection[]` (de C7) + mood global
**Output** : `Beat[]` avec `imagePrompt` rempli (string EN, langage naturel)

### Ce que C8 fait

1. Traduit la direction en prompt Flux : "Raffinerie au crepuscule, menacant" → "Massive oil refinery at twilight, steam rising against heavy overcast sky, low angle dramatic shot, industrial atmosphere"
2. Ajoute le **suffixe technique** selon le mood (voir table ci-dessous)
3. Detecte les `imageReuse` de C7 et ne genere PAS de prompt pour ces beats
4. Verifie les contraintes (pas de texte, pas de visages, pas de logos)

### Table de registres visuels (reference C8)

| Sujet | Direction typique C7 | Prompt optimise C8 |
|-------|---------------------|-------------------|
| Chute actif | "Salle de marche sombre, ecrans rouges" | "Dark moody trading floor, red screens glowing, dramatic low-angle shot, cinematic lighting, film grain" |
| Hausse | "District financier, lumiere doree" | "Modern financial district at golden hour, glass buildings reflecting warm sunlight, upward perspective" |
| Petrole | "Raffinerie, industriel, crepuscule" | "Massive oil refinery at twilight, steam rising, orange industrial lights, dramatic sky, photojournalistic" |
| Tech / crypto | "Reseau digital, abstrait" | "Abstract visualization of digital network, flowing data streams, dark background with cyan accent lights" |
| Fed / banques centrales | "Batiment institutionnel, pouvoir" | "Federal Reserve building facade, neoclassical columns, overcast sky, low angle, editorial documentary" |
| Or / refuge | "Or physique, vault, intemporel" | "Close-up of gold bars stacked in a vault, warm tungsten lighting, shallow depth of field, cinematic" |
| Macro / economie | "Port, vue aerienne, commerce mondial" | "Aerial view of busy container port, hundreds of shipping containers, drone shot, documentary style" |
| Marche calme | "Bureau vide, ecrans plats, apres-bourse" | "Empty trading desk after hours, screens showing flat charts, soft ambient lighting, contemplative mood" |
| Geopolitique | "Newsroom, urgence, ecrans multiples" | "Press room with breaking news on multiple screens, blurred journalists in motion, documentary photography" |
| Conclusion | "Skyline, aube, perspective" | "Panoramic city skyline at dawn, financial district emerging from morning fog, peaceful, wide angle" |

### Suffixe style par mood (ajoute a CHAQUE prompt)

| Mood (de C5) | Suffixe |
|--------------|---------|
| `tension_geopolitique` | ", dramatic lighting, high contrast, desaturated, photojournalistic" |
| `risk_off_calme` | ", cool tones, soft lighting, serene, editorial photography" |
| `bullish_momentum` | ", warm golden lighting, dynamic angle, vibrant, cinematic" |
| `neutre_analytique` | ", neutral tones, clean composition, professional, documentary style" |
| `incertitude` | ", overcast, muted colors, atmospheric haze, contemplative mood" |

### Contraintes prompt (hardcodees, pas dans le LLM)

- **Jamais de texte dans l'image** — le code filtre tout prompt contenant "text", "words", "title", "label"
- **Pas de visages identifiables** — C8 recoit l'instruction, le code verifie "face", "portrait", "person looking"
- **Resolution** : 1344x768 (ratio ~16:9, taille native Flux 2 Dev)
- **Pas de logos / marques** dans les prompts

---

## 6. ComfyUI Cloud Integration (P7d)

### Provider : Comfy Cloud (cloud.comfy.org)

- **GPU** : RTX 6000 Pro Blackwell (96 Go VRAM)
- **Modele** : Flux 2 Dev (pre-installe)
- **API** : REST compatible avec le format local ComfyUI
- **Plan** : Standard 20$/mois (~4200 credits, couvre ~30+ episodes)

### Workflow JSON

Un workflow minimaliste txt2img Flux 2 Dev :

```
CheckpointLoader (Flux 2 Dev)
  → CLIPTextEncode (prompt dynamique)
  → KSampler (steps=25, cfg=3.5, sampler=euler, scheduler=normal)
  → VAEDecode
  → SaveImage (1344x768)
```

Le workflow est stocke dans `packages/ai/src/comfyui/workflow-flux-txt2img.json`.
Le prompt est injecte dynamiquement avant chaque appel.

### Client ComfyUI

```typescript
// packages/ai/src/comfyui/comfyui-client.ts

interface ComfyUIClientConfig {
  apiUrl: string;       // "https://cloud.comfy.org/api" ou "http://localhost:8188"
  apiKey?: string;      // Pour Comfy Cloud
}

interface GenerateImageResult {
  imagePath: string;    // Chemin local apres download
  promptId: string;
  durationMs: number;
}

class ComfyUIClient {
  constructor(config: ComfyUIClientConfig);

  // Genere une image a partir d'un prompt
  generateImage(prompt: string, outputPath: string): Promise<GenerateImageResult>;

  // Genere un batch d'images (parallele, max concurrency configurable)
  generateBatch(
    beats: Array<{ id: string; imagePrompt: string }>,
    outputDir: string,
    concurrency?: number   // defaut: 4
  ): Promise<GenerateImageResult[]>;
}
```

### Flow API

```
1. POST /api/prompt
   Body: { prompt: workflowJSON, client_id: uuid }
   → Response: { prompt_id: "abc123" }

2. Poll GET /api/job/{prompt_id}/status
   → { status: "running" | "completed" | "failed" }

3. GET /api/view?filename=...&type=output
   → Download image binaire
   → Save dans data/images/ep-{DATE}/beat_{NNN}.png
```

### Parallelisme et timing

- ~100 images × ~5s/image sur RTX 6000 = ~8 min sequentiel
- Avec concurrency 4 : ~2-3 min
- Batch optimal : envoyer tous les prompts, poll les resultats

### Fallback

Si Comfy Cloud est down :
1. Retry 3x avec backoff
2. Fallback : utiliser des images de stock (bibliotheque locale `assets/stock/`)
3. Fallback extreme : video sans images de fond (juste overlays data sur fond creme, comme actuellement)

---

## 7. Remotion Render (P8 modifie)

### Nouvelle composition : BeatEpisode

Remplace `DailyRecapEpisode` comme composition principale.

```typescript
// packages/remotion-app/src/compositions/BeatEpisode.tsx

interface BeatEpisodeProps {
  script: EpisodeScript;
  beats: Beat[];
  assets: AssetSnapshot[];
  news: NewsItem[];
}
```

### Architecture du render

```
TransitionSeries
  ├── BeatSequence (beat_001) ─── transition: fade ──┐
  │   ├── BackgroundImage (ken_burns_in)              │
  │   ├── DataOverlay (stat, pop animation)           │
  │   └── DisclaimerBar + PermanentTicker             │
  │                                                    │
  ├── BeatSequence (beat_002) ─── transition: cut ───┐│
  │   ├── BackgroundImage (slow_pan_left)             ││
  │   ├── DataOverlay (chart, slide_up)               ││
  │   └── DisclaimerBar + PermanentTicker             ││
  │                                                    ││
  ├── BeatSequence (beat_003) ─── transition: slide ──┘│
  │   ├── BackgroundImage (ken_burns_out)               │
  │   └── DisclaimerBar + PermanentTicker (pas d'overlay)
  │                                                      │
  └── ... (~100 beats)                                    │
```

### Composants

**BackgroundImage** — Affiche l'image generee avec un effet de mouvement
```
- Ken Burns : scale 1.0 → 1.08 sur la duree du beat (ou inverse)
- Slow Pan : translateX de 0 → -3% sur la duree
- Static : rien
```

**DataOverlay** — Les composants existants (InkChart, CausalChain, AnimatedStat, etc.) rendus par-dessus l'image, avec un fond semi-transparent pour la lisibilite.

**Transitions** — Utilise `@remotion/transitions` (TransitionSeries + presentations)
```
- fade : linearTiming({ durationInFrames: 15 })
- slide_left : slide({ direction: 'from-right' })
- wipe : wipe({ direction: 'from-left' })
- cut : linearTiming({ durationInFrames: 1 })
```

### Overlays sur image — Lisibilite

Les overlays data doivent etre lisibles sur n'importe quelle image de fond :
- **Fond semi-transparent** sous l'overlay (rgba(0,0,0,0.55) ou rgba(245,240,232,0.85) selon le mood)
- **Ombre portee** sur le texte overlay
- **Position strategique** : stats en haut, charts en bas 2/3, titres en bas 1/3
- **Ne jamais couvrir >50% de l'image** (l'image doit rester visible)

---

## 8. Structure fichiers

```
packages/ai/src/
  comfyui/
    comfyui-client.ts              # Client API Comfy Cloud / local
    workflow-flux-txt2img.json      # Workflow JSON Flux 2 Dev
    index.ts                       # Barrel export
  pipeline/
    p7a-beat-generator.ts          # Script → Beat[] (CODE pur, decoupage + heuristiques)
    p7b-direction-artistique.ts    # C7 Sonnet — direction visuelle globale
    p7c-image-prompts.ts           # C8 Haiku — prompts Flux optimises
    p7d-image-generation.ts        # Beat[] → images via ComfyUI

packages/remotion-app/src/
  compositions/
    BeatEpisode.tsx                # Nouvelle composition principale
  scenes/
    BeatSequence.tsx               # 1 beat = image + overlay + effet
    BackgroundImage.tsx            # Image de fond avec ken burns / pan
    DataOverlay.tsx                # Router d'overlay (stat/chart/causal/...)
  scenes/shared/
    (existants: InkChart, CausalChain, AnimatedStat, etc. — reutilises)

data/images/
  ep-2026-03-19/                   # Images generees pour cet episode
    beat_001.png
    beat_002.png
    ...
```

---

## 9. Env vars additionnelles

```
COMFYUI_API_URL=https://cloud.comfy.org/api    # Comfy Cloud
COMFYUI_API_KEY=...                             # Cle API Comfy Cloud
# OU
COMFYUI_API_URL=http://localhost:8188           # Local (dev/test)
```

---

## 10. Exemple concret — 1 segment de 45s

**Section script** :
```json
{
  "id": "seg_1",
  "type": "segment",
  "depth": "focus",
  "title": "WTI — Le paradoxe petrolier",
  "narration": "Le WTI a 83,45 dollars ce soir — moins douze pour cent en une seance. Le Brent suit a 87,80, moins onze. Et le premier reflexe serait de dire tensions Iran, le petrole devrait monter. La raison ? Le marche ne price pas l'offre menacee. Il price la destruction de demande. La Chine importe moins, l'OPEP surproduit, et les stocks americains gonflent. Le support a 83 dollars tient pour l'instant, mais un passage sous 80 ouvrirait la voie vers les niveaux de 2024.",
  "durationSec": 45,
  "assets": ["CL=F"]
}
```

**Beats generes** :

| Beat | Duree | Narration | Image | Overlay | Transition |
|------|-------|-----------|-------|---------|------------|
| beat_012 | 6s | "Le WTI a 83,45 dollars ce soir — moins douze pour cent en une seance." | Plateforme petroliere sombre, ciel orageux | `stat` : -11.94% (count-up geant) | cut |
| beat_013 | 5s | "Le Brent suit a 87,80, moins onze." | Tankers petroliers en mer, vue aerienne grise | `comparison` : WTI vs Brent cote a cote | slide_left |
| beat_014 | 6s | "Et le premier reflexe serait de dire tensions Iran, le petrole devrait monter." | Carte du Moyen-Orient stylisee, tons chauds | aucun (image seule) | fade |
| beat_015 | 6s | "La raison ? Le marche ne price pas l'offre menacee. Il price la destruction de demande." | Ecrans de trading rouges, salle vide | `causal_chain` : Iran→Offre ✗ / Demande→Prix ↓ | cut |
| beat_016 | 7s | "La Chine importe moins, l'OPEP surproduit, et les stocks americains gonflent." | Port chinois avec conteneurs, vue drone | `comparison` : 3 badges (Chine imports ↓, OPEP prod ↑, Stocks US ↑) | slide_left |
| beat_017 | 7s | "Le support a 83 dollars tient pour l'instant, mais un passage sous 80 ouvrirait la voie vers les niveaux de 2024." | Raffinerie au coucher de soleil, tons ambre | `chart_zone` : InkChart WTI avec S/R a 83$ et 80$ | fade |

**Resultat** : 6 changements visuels en 45 secondes au lieu de 1 scene statique. Dynamique, engageant.

---

## 11. Integration avec le pipeline existant

### Modification de generate.ts

```
Apres Step 2 (script generation) :
  Step 2b : Beat generation (P7a + P7b)
  Step 2c : Image generation (P7c via ComfyUI)

Step 5 (render) :
  Passe les beats + images a BeatEpisode au lieu de DailyRecapEpisode
```

### Backward compatibility

- `DailyRecapEpisode` reste disponible (flag `--legacy-render`)
- `NewspaperEpisode` reste disponible (flag `--newspaper`)
- `BeatEpisode` devient le defaut

### Props Remotion

```json
{
  "script": { ... },
  "beats": [ ... ],
  "assets": [ ... ],
  "news": [ ... ]
}
```

---

## 12. Decisions prises

| Decision | Choix | Raison |
|----------|-------|--------|
| Provider images | Comfy Cloud (cloud.comfy.org) | API officielle, GPU puissant, modeles pre-installes, 0 setup |
| Modele image | Flux 2 Dev | Meilleur open-source 2026, langage naturel, pas de negative prompts |
| Duree beat | 5-8s | Dynamique sans etre epileptique, aligné YouTube retention |
| Overlay sur image | Oui, semi-transparent | Montre les data quand pertinent sans perdre l'immersion visuelle |
| Ken Burns | Oui, par defaut | Donne de la vie aux images statiques, standard YouTube |
| Transitions | @remotion/transitions | Librairie officielle Remotion, fluide |
| Direction artistique (C7) | **Sonnet** | Decision creative — coherence visuelle, registre, emotion |
| Prompts image (C8) | Haiku | Tache mecanique d'optimisation, pas de decision creative |
| Beat generator (P7a) | Code pur | Decoupage mecanique, pas de LLM |

---

## 13. Questions ouvertes

1. **Images identiques pour des beats consecutifs du meme sujet ?** On pourrait reutiliser la meme image pour 2-3 beats consecutifs parlant du meme asset, avec juste un changement d'overlay. Economise des credits ComfyUI et donne un rythme plus naturel.

2. **Ratio beats avec overlay vs sans overlay ?** Estimation initiale : ~40% avec overlay, ~60% image seule. A calibrer apres les premiers episodes.

3. **Cache d'images thematiques ?** Certaines images sont reutilisables entre episodes (Fed building, trading floor, gold bars). Maintenir un cache `assets/generated/` pour eviter de regenerer les memes themes.

4. **Resolution upscale ?** Flux 2 Dev genere en 1344x768 (ratio ~16:9). Faut-il upscaler a 1920x1080 via Real-ESRGAN dans le workflow, ou laisser Remotion scaler ?

5. **Musique de fond ?** Le pipeline prevoit un mood musical (C5 direction). A integrer avec les beats — la musique suit l'arc de tension.
