# Plan : Vidéo "Page de Journal" — Zoom In/Out par Segment

## Vision

La vidéo n'est plus une séquence linéaire de beats. C'est un **journal filmé** :
- La page journal est le HOME BASE — on y revient entre chaque segment
- Chaque segment est une "plongée" dans un article du journal
- Le zoom anime la transition entre la page et le contenu

## Flow Vidéo

```
1. Disclaimer (3s) — texte légal, plein écran, fondu
2. Page Journal (thread narration ~20s)
   - Layout journal complet : titre, date, colonnes, images par segment
   - La narration du thread joue PAR-DESSUS la page
   - Effet machine à écrire sur le titre (avec SFX frappe)
   - Les headlines des segments apparaissent en cascade

3. Pour CHAQUE segment :
   a. ZOOM IN — la caméra zoome sur l'image du segment dans la page journal (~1.5s)
   b. BEATS DU SEGMENT — les beats défilent normalement (images + overlays + voix)
   c. ZOOM OUT — retour à la page journal (~1.5s)
   d. Highlight visuel sur le prochain segment (l'image s'illumine)

4. Closing — dernier retour à la page journal, vue d'ensemble, narration closing
```

## Composants à Créer/Modifier

### 1. `NewspaperPage.tsx` (refonte de FrontPage.tsx)

Layout multi-images inspiré d'un vrai journal :

```
┌─────────────────────────────────────────────┐
│ TRADINGRECAP                    23 mars 2026│
├─────────────────────────────────────────────┤
│                                             │
│  UN TWEET, -10% SUR LE PÉTROLE             │
│  — et Goldman dit récession                 │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ IMAGE    │  │ IMAGE    │  │ IMAGE    │  │
│  │ SEG_1    │  │ SEG_2    │  │ SEG_3    │  │
│  │          │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  Pétrole:      Or en bear    Wall Street   │
│  le crash      market        vs Goldman    │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ IMAGE    │  │ IMAGE    │  │ IMAGE    │  │
│  │ SEG_4    │  │ SEG_5    │  │ SEG_6    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  Bitcoin &     IA continue   Asie: pas     │
│  BlackRock                   le même script│
├─────────────────────────────────────────────┤
│ [threadSummary en petit texte italique]     │
└─────────────────────────────────────────────┘
```

- Chaque image = le premier beat du segment (editorial/beat_XXX.png)
- Layout responsive : 3 colonnes pour 6 segments, 2 pour 4, etc.
- Style : crème, encre noire, filets fins, typographie serif

### 2. `ZoomTransition.tsx` (nouveau)

Anime le zoom de la page journal vers un segment :
- Input : position (x, y, width, height) de l'image du segment dans la page
- Animation : scale + translateX/Y interpolés sur ~45 frames (1.5s)
- Reverse pour le zoom out
- Utilise `interpolate()` de Remotion

### 3. `TypewriterAudio.tsx` (nouveau)

SFX machine à écrire synchronisé avec le TypewriterTitle :
- Fichier audio : frappe de touche mécanique (~50ms par frappe)
- Un son par caractère affiché
- Volume bas (~0.3) pour ne pas couvrir la voix
- Besoin : 1 fichier MP3 de frappe de touche dans public/sfx/

### 4. `BeatEpisode.tsx` (refonte majeure)

Le flow actuel :
```
Disclaimer → FrontPage → Beat1 → Beat2 → ... → BeatN
```

Nouveau flow :
```
Disclaimer (90 frames)
→ NewspaperPage + thread audio (600 frames = 20s)
→ Pour chaque segment :
    → ZoomIn vers image segment (45 frames)
    → Beats du segment (variable)
    → ZoomOut vers NewspaperPage (45 frames)
→ Closing sur NewspaperPage (variable)
```

La difficulté : calculer les frames cumulées dynamiquement car chaque segment a un nombre variable de beats.

### 5. Données nécessaires (TOUTES DÉJÀ DISPONIBLES)

| Donnée | Source | Déjà dans props ? |
|--------|--------|-------------------|
| Titre épisode | script.title | ✅ |
| Date | script.date | ✅ |
| Segments (titre, depth) | script.sections | ✅ |
| Image par segment | beats[].imagePath (premier beat de chaque segment) | ✅ |
| Thread narration audio | beat audio du thread | ✅ |
| Thread text | script.sections[type=thread].narration | ✅ |

Aucun changement pipeline nécessaire.

## Assets à Créer

1. **SFX frappe machine à écrire** — `public/sfx/typewriter-key.mp3` (~50ms, son mécanique)
2. **SFX retour chariot** — `public/sfx/typewriter-return.mp3` (optionnel, en fin de titre)
3. **SFX page flip** — déjà existant dans `public/sfx/`

## Estimation

| Tâche | Effort |
|-------|--------|
| NewspaperPage layout | 2-3h |
| ZoomTransition animations | 2h |
| BeatEpisode refonte flow | 3-4h |
| TypewriterAudio sync | 1h |
| Tests + polish | 2h |
| **Total** | **~1 journée** |

## Priorité d'implémentation

1. **NewspaperPage** — le layout est le cœur visuel
2. **BeatEpisode refonte** — le nouveau flow segment par segment
3. **ZoomTransition** — l'animation zoom in/out
4. **TypewriterAudio** — le SFX (polish final)

## Contraintes

- Le nombre de segments varie (4 à 7) — le layout doit s'adapter
- Les images de segments peuvent être des placeholders — fallback gradient
- Le zoom doit être fluide (pas de saccade) — utiliser spring() de Remotion
- La voix thread doit être synchronisée avec l'affichage de la page
- Performance : la page journal est une composition complexe, éviter les re-renders
