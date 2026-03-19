# REMOTION + CLAUDE CODE — Knowledge Base Complete

> Extraction exhaustive de 9 videos YouTube de reference.
> Sources : 5 EN, 4 FR — tous createurs specialises Remotion + IA.
> Objectif : tout savoir pour produire des videos top niveau avec Remotion.

---

## TABLE DES MATIERES

1. [Paradigme fondamental : HTML-First](#1-paradigme-fondamental--html-first)
2. [Setup complet Remotion + Skills](#2-setup-complet-remotion--skills)
3. [Architecture 3 niveaux](#3-architecture-3-niveaux)
4. [APIs Remotion detaillees](#4-apis-remotion-detaillees)
5. [Catalogue animations](#5-catalogue-animations)
6. [Prompting Remotion — guide complet](#6-prompting-remotion--guide-complet)
7. [3D avec React Three Fiber](#7-3d-avec-react-three-fiber)
8. [Audio / TTS / ElevenLabs](#8-audio--tts--elevenlabs)
9. [Automation, scaling, publication](#9-automation-scaling-publication)
10. [Troubleshooting et erreurs courantes](#10-troubleshooting-et-erreurs-courantes)
11. [Outils et ressources externes](#11-outils-et-ressources-externes)
12. [Application a TradingRecap](#12-application-a-tradingrecap)

---

## 1. PARADIGME FONDAMENTAL : HTML-FIRST

### Le probleme du "text-to-video"

La majorite des debutants font :
```
Prompt vague → Claude genere animation → resultat mediocre → 10+ iterations
```

C'est l'equivalent du "text-to-video" en IA generative : le modele doit IMAGINER le design ET l'animation en meme temps. Resultat : imprecis, lent, couteux.

### La solution : "image-to-video"

Le workflow optimal (consensus de 4 videos sur 9) :
```
1. Generer HTML statique (design pur, pas d'animation)
2. Valider visuellement (couleurs, layout, typo, positions)
3. Pointer Claude Code vers le HTML → animer
4. Iterer sur les animations uniquement (2-3 passes)
```

### Pourquoi ca marche

| Aspect | Text-to-Video | HTML-to-Video |
|--------|---------------|---------------|
| Reference Claude | Concept abstrait | Fichier concret |
| Iterations design | 8-12 | 2-3 |
| Controle visuel | Faible | Pixel-perfect |
| Cout LLM | Eleve (plus de tokens) | Reduit |
| Separation concerns | Non (tout melange) | Oui (design vs animation) |

### Outils pour generer le HTML statique

- **Claude Desktop** : "Please reconstruct this diagram beautifully in HTML"
- **Gemini** : excellent pour designs esthetiques (recommande par video 7)
- **Screenshot + Claude** : fournir capture d'ecran → Claude reconstruit en HTML
- **Figma → HTML** : exporter design Figma, donner a Claude comme reference

### Cas ou le HTML-first ne s'applique pas

- Animations procedurales pures (particules, generatif)
- Prototypage rapide / exploration creative
- Videos tres courtes (< 5 sec) ou tres simples

---

## 2. SETUP COMPLET REMOTION + SKILLS

### 2.1 Installation Remotion

```bash
# Methode 1 : create-video (recommande)
npx create-video@latest mon-projet
# Options :
#   Template : blank (feuille blanche)
#   Tailwind : OUI (toujours, consensus unanime)
#   Agent skills : OUI

# Methode 2 : via Claude Code skill (1 prompt)
# "Clone the Remotion repository, install Remotion skills,
#  provide exact terminal command to open Remotion Studio"

# Methode 3 : npm classique
npm create remotion test-video
```

### 2.2 Structure projet resultante

```
mon-projet/
├── .cloud/              # Skills installes (local au projet)
│   └── skills/
│       └── remotion-best-practices/
│           ├── 3d.md
│           ├── fonts.md
│           ├── parameters.md
│           └── ... (~10 fichiers .md)
├── src/
│   ├── Root.tsx          # Composition racine
│   ├── MyComp.tsx        # Composition principale
│   └── components/       # Composants reutilisables
├── public/               # Assets statiques (images, logos, audio)
├── package.json
├── .env                  # Cles API (ELEVENLABS_API_KEY, etc.)
└── node_modules/
```

### 2.3 Skills Remotion

**Concept** : Les skills sont des bundles de fichiers `.md` contenant regles et bonnes pratiques. Claude les lit automatiquement et applique les patterns sans qu'on ait besoin de les mentionner.

**Installation :**
```bash
# Via npx (recommande)
npx skills add remotion dev skills

# Verification
/skills
# Affiche : remotion-best-practices (installe globalement)
```

**Scope d'installation :**
- **Global** (`~/.cloud/skills/`) : disponible dans tous les projets
- **Local** (`.cloud/` dans le projet) : specifique au projet
- **Recommandation** : global pour Remotion, local pour regles projet-specifiques

**Remotion Best Practices Skill** (3eme plus telecharge) :
- ~10 fichiers .md couvrant :
  - Gestion 3D (`/3d`)
  - Polices de caracteres (Google Fonts via `remotion Google font`)
  - Parametres et configuration
  - Patterns de composition
  - Bonnes pratiques animations
  - Gestion assets

**Remotion Prompts Library** :
- URL : `remotion.dev/prompts`
- Bibliotheque de prompts/templates prets a copier-adapter
- Cartes interactives, visualisations, data viz, etc.

### 2.4 Commandes essentielles

```bash
npm run dev          # Lancer Remotion Studio (localhost:3000)
npm run start        # Variante selon config
npm run build        # Compiler videos (batch)
npm run render       # Export final MP4
npx remotion render  # Rendu via CLI
npx remotion studio  # Studio via CLI
Ctrl+C               # Arreter le serveur
```

### 2.5 Remotion Studio

- Interface web sur localhost:3000
- Page d'accueil affichant toutes les compositions disponibles
- Preview live avec play/pause
- Recompilation auto apres chaque changement de code
- Bouton "render video" pour export MP4
- Timeline interactive pour verifier les timings
- Feedback instantane (30-60 sec par cycle d'iteration)

---

## 3. ARCHITECTURE 3 NIVEAUX

### Niveau 1 : Video simple (1-2 prompts)

**Quand** : animations texte, counters, data viz simples, demos produit basiques

**Process** :
1. Un prompt descriptif → Claude genere le code Remotion
2. Preview dans Studio
3. Corrections mineures
4. Render

**Exemple prompt** :
```
Cree une animation Remotion simple :
- Fond noir
- Texte "Hello World" blanc centre
- Police moderne sans-serif
- Fade in 1s, visible 3s, fade out 1s
- Duration : 5 secondes @ 30fps
```

**Ce que Claude genere** :
- Composition avec AbsoluteFill
- interpolate() pour opacity
- useCurrentFrame() pour timing
- Rendu H264

### Niveau 2 : Skill Stacking (multi-skills)

**Quand** : videos avec branding, voiceover, images generees, coherence stylistique

**Skills combines** :
- **Remotion** : generation video
- **ElevenLabs / Wavespeed** : voiceover TTS
- **Nano Banana Pro** : generation images AI
- **Custom skills** : regles projet-specifiques

**Le fichier CLAUDE.MD (cle du Niveau 2)** :
```markdown
# Instructions pour Claude

## Skills disponibles
- Remotion : pour creer des videos
- ElevenLabs V3 : pour voiceovers (cle API dans .env)
- Nano Banana Pro : pour images generees

## Regles de branding
- Palette : cream #F5F0E8, ink #1A1A2E, cyan #00b4d8
- Police : Inter pour titres, JetBrains Mono pour code
- Logo : public/logo.png (toujours utiliser)

## Workflow
1. Si video demandee → utiliser Remotion
2. Si audio demande → utiliser ElevenLabs V3
3. Si image demandee → utiliser Nano Banana Pro
4. Mettre a jour ce doc avec chaque apprentissage
```

**Avantage** : Claude maintient coherence branding sur TOUTES les videos car il lit CLAUDE.MD a chaque session.

### Niveau 3 : Video Chaining (videos longues)

**Quand** : episodes 8-10 min, multi-sections, format YouTube

**Process** :
```
Script complet (6-7 sections)
    ↓
Section 1 → Claude genere video1.mp4
Section 2 → Claude genere video2.mp4
Section 3 → Claude genere video3.mp4
    ...
    ↓
Claude stitch : "Assemble ces videos dans l'ordre avec transitions"
    ↓
Episode final.mp4
```

**Avantages** :
- Chaque section est independante (iteration isolee)
- Parallelisation possible
- Remplacement d'une section sans tout refaire
- Controle granulaire sur chaque partie

**Mapping TradingRecap** :
```
hook     → video hook (5-10 sec, accroche visuelle)
thread   → video market overview (60-90 sec)
segment1 → video deep dive asset 1 (90-120 sec)
segment2 → video deep dive asset 2 (90-120 sec)
segment3 → video news / macro (60-90 sec)
closing  → video predictions + disclaimer (60-90 sec)
    ↓
Stitch → episode-YYYY-MM-DD.mp4 (8-10 min total)
```

---

## 4. APIS REMOTION DETAILLEES

### 4.1 Composants de base

```tsx
// Container video (obligatoire)
<Composition
  id="MonVideo"
  component={MonComposant}
  durationInFrames={300}   // 10 sec @ 30fps
  fps={30}
  width={1920}
  height={1080}
/>

// Layout plein ecran
<AbsoluteFill style={{ backgroundColor: '#0b0f1a' }}>
  {/* contenu */}
</AbsoluteFill>

// Segments timeline
<Sequence from={0} durationInFrames={90}>
  {/* Scene 1 : frames 0-89 (3 sec) */}
</Sequence>
<Sequence from={90} durationInFrames={90}>
  {/* Scene 2 : frames 90-179 (3 sec) */}
</Sequence>
```

### 4.2 Hooks principaux

```tsx
// Frame courante (cle de toute animation)
const frame = useCurrentFrame();

// Config video (fps, dimensions)
const { fps, width, height, durationInFrames } = useVideoConfig();
```

### 4.3 Interpolation (coeur des animations)

```tsx
import { interpolate } from 'remotion';

// Fade in sur les 30 premieres frames (1 sec @ 30fps)
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp',
});

// Slide depuis la gauche
const translateX = interpolate(frame, [0, 30], [-100, 0], {
  extrapolateRight: 'clamp',
});

// Scale avec easing
const scale = interpolate(frame, [0, 30], [0.5, 1]);
```

### 4.4 Spring (animation elastique/naturelle)

```tsx
import { spring } from 'remotion';

const bounce = spring({
  frame,
  fps,
  config: {
    damping: 10,     // amortissement (plus bas = plus de rebond)
    stiffness: 100,  // rigidite
    mass: 1,         // masse
  },
});

// Utilisation : scale, position, opacity
<div style={{ transform: `scale(${bounce})` }}>
```

### 4.5 Formule timing

```
frames = secondes * fps

Exemples @ 30fps :
- 0.5 sec =  15 frames
- 1 sec   =  30 frames
- 2 sec   =  60 frames
- 5 sec   = 150 frames
- 10 sec  = 300 frames
- 60 sec  = 1800 frames

Video standard TradingRecap :
- 8 min = 480 sec = 14,400 frames @ 30fps
- 10 min = 600 sec = 18,000 frames @ 30fps
```

---

## 5. CATALOGUE ANIMATIONS

### 5.1 Animations de base

**Fade In/Out** (opacity)
```
Usage : apparition/disparition d'elements
Timing typique : 1s in, 3s visible, 1s out
API : interpolate(frame, [start, end], [0, 1])
```

**Slide In** (translateX/Y)
```
Usage : elements qui glissent depuis un bord
Directions : gauche, droite, haut, bas
API : interpolate() sur translateX/translateY
Easing recommande : spring() pour naturel
```

**Scale** (transform: scale)
```
Usage : elements qui apparaissent en grossissant
Pattern : scale 0 → 1 avec spring bounce
API : spring() + transform: scale()
```

### 5.2 Animations intermediaires

**Spring Bounce** (rebond elastique)
```
Usage : apparition dynamique d'icones, boutons, elements
Rendu : element arrive avec rebond naturel
Config : damping=10, stiffness=100 (ajuster selon besoin)
Tres utilise dans les product demos et explainers
```

**Pulse / Glow** (pulsation lumineuse)
```
Usage : mettre en valeur un element (serveur, database, indicateur)
Implementation : oscillation opacity ou box-shadow via sin(frame)
Timing : cycle de 30-60 frames
```

**Typewriter** (texte caractere par caractere)
```
Usage : code qui s'ecrit, narration textuelle
Implementation : text.slice(0, Math.floor(frame / speed))
Speed typique : 2-3 frames par caractere
Combine avec : curseur clignotant
```

**Counter Animate** (compteur numerique incremental)
```
Usage : KPIs, statistiques, prix, pourcentages
Implementation : interpolate(frame, [start, end], [0, targetValue])
Format : Math.round() pour entiers, toFixed(2) pour decimales
Tres pertinent pour TradingRecap (prix, %change, volumes)
```

**Progress Bar** (barre de progression)
```
Usage : tableaux de bord, metriques, satisfaction
Implementation : interpolate() sur width
Combine avec : counter, labels, couleurs conditionnelles
```

### 5.3 Animations avancees

**Drawing** (tracer formes au fil du temps)
```
Usage : bordures de terminal, graphiques SVG, lignes
Implementation : SVG strokeDashoffset anime
API : interpolate() sur stroke-dashoffset
Tres pertinent pour InkChart (tracer courbes de prix)
```

**Morphing** (transformation d'element)
```
Usage : logo qui se transforme, transitions entre etats
Implementation : interpolate sur multiple proprietes simultanement
Exemple : logo branches → point lumineux → bordure terminal
Complexite : elevee, necessite prompting detaille
```

**Camera Trajectory** (3D)
```
Usage : reveal progressif, rankings, exploration 3D
Implementation : React Three Fiber camera position animate
Pattern : bas→haut avec pauses sur chaque element
Timing : quelques ms de pause par position
```

**Stacking 3D** (piles d'objets)
```
Usage : comparaisons, rankings, visualisation metriques
Implementation : React Three Fiber + geometries empilees
Hauteur pile = valeur metrique
Assets SketchFab pour realisme
```

### 5.4 Patterns d'orchestration

**Cascade sequentielle** :
```
Element 1 apparait (frame 0-30)
  → Element 2 apparait (frame 15-45)  // overlap leger
    → Element 3 apparait (frame 30-60)
```

**Reveal progressif** :
```
Fond degrade (frame 0)
  → Titre fade in (frame 30)
    → Sous-titre slide in (frame 60)
      → Donnees counter animate (frame 90)
        → CTA spring bounce (frame 150)
```

**Transition entre scenes** :
```
Scene 1 fade out (dernieres 30 frames)
Scene 2 fade in (premieres 30 frames)
// OU
Wipe transition (clip-path anime)
// OU
Scale down scene 1 → scale up scene 2
```

---

## 6. PROMPTING REMOTION — GUIDE COMPLET

### 6.1 Regles d'or

**TOUJOURS faire :**
1. Specifier timings exacts ("2 second fade in", pas "slow fade")
2. Decrire le vibe global : energetic, minimal, corporate, playful, calming
3. Declarer aspect ratio upfront (16:9 YouTube, 9:16 Short/TikTok, 1:1 Instagram)
4. Decouper en scenes (max 3-4 par prompt)
5. Mentionner assets brand ("use logo from public/logo.png")
6. Lister animations dans l'ordre d'execution
7. Inclure couleurs et polices explicitement
8. Fournir assets concrets (fichiers PNG, SVG, HTML)
9. Specifier resolution et fps (1920x1080 @ 30fps)
10. Demander "ultra-moderne avec animations" (pas "simple")

**JAMAIS faire :**
1. Demander video de 15 scenes en 1 prompt (max 3-4)
2. Rester vague ("fix the diagram" → "remove the circle at position 98")
3. Se contenter du premier resultat (iterer 2-3x minimum)
4. Prompt abstrait sans reference visuelle
5. Melanger design et animation dans le meme prompt
6. Oublier de specifier la duree totale

### 6.2 Templates de prompts par type

**Template : Animation simple (texte + fond)**
```
Cree une animation Remotion :
- Resolution : 1920x1080, 30fps
- Duree : 5 secondes (150 frames)
- Fond : degrade sombre (#0b0f1a vers #1a1a2e)
- Texte : "[TEXTE]" en blanc, centre, police Inter 48px
- Animation : fade in 1s, visible 3s, fade out 1s
- Style : minimal, elegant
```

**Template : Data visualization (counters + barres)**
```
Cree une composition Remotion "MarketOverview" :
- Resolution : 1920x1080, 30fps, 15 secondes
- Fond : degrade sombre
- Layout : grille 2x4 de cards

Chaque card contient :
- Icone/symbole de l'asset (texte)
- Prix actuel (counter animate de 0 vers valeur)
- Variation % (couleur verte si +, rouge si -)
- Mini sparkline SVG

Animations :
- Cards apparaissent en cascade (spring bounce, 200ms delay entre chaque)
- Counters demarrent quand card visible (2s pour atteindre valeur)
- Sparklines se dessinent (drawing animation, 1s)

Palette : fond #0b0f1a, cards #1a1a2e, texte #F5F0E8, accent cyan #00b4d8, vert #22c55e, rouge #ef4444
```

**Template : Explainer video (multi-scenes)**
```
Cree une composition Remotion "RESTAPIExplainer" :
- 1920x1080, 30fps, 15 secondes total
- Fond degrade sombre

Scene 1 (0-5s) :
- 3 elements horizontaux : Navigateur | Serveur | Database
- Chaque element apparait avec spring bounce (0.5s delay cascade)
- Icones + labels

Scene 2 (5-10s) :
- Fleche animee Navigateur → Serveur (label "GET /users")
- Serveur pulse/glow 1s
- Fleche animee Serveur → Database (label "SELECT *")
- Database pulse 1s

Scene 3 (10-15s) :
- Fleche retour Database → Serveur (label "rows[]")
- Fleche retour Serveur → Navigateur (label "200 OK", couleur verte)
- Tous elements glow simultanement 1s
- Fade out global 1s

Style : tech/developer, couleurs Claude Code (degrade violet/orange)
```

**Template : Product demo (SaaS)**
```
Cree une demo produit animee pour [NOM_PRODUIT] :
- Scraper les assets depuis [URL_SITE]
- Utiliser les couleurs du site ([couleur1], [couleur2], [accent])
- Logo : public/logo.png

Structure (30s total) :
1. Intro (5s) : Logo animate + tagline slide in
2. Feature 1 (8s) : Screenshot UI + highlight zones cles
3. Feature 2 (8s) : Mockup interactif avec transitions
4. CTA (9s) : "Start Free Trial" + URL + fade out

Style : [vibe - ex: energetic, corporate, minimal]
Voiceover : non (visuel pur)
```

**Template : Morphing / Transition complexe**
```
Base sur le fichier [image1.png] :
Cree une animation Remotion qui transforme l'image en [description resultat final].

Etapes de morphing :
1. Image originale visible 2s
2. Elements se fragmentent vers le centre (1s)
3. Point lumineux central pulse (0.5s)
4. Point s'expand vers forme finale (1s)
5. Resultat final visible 2s

Fournir image objectif : [image2.png]
Duration totale : 6.5 secondes
```

### 6.3 Vocabulaire de vibe (mots-cles qui influencent le rendu)

| Mot-cle | Effet sur le rendu |
|---------|-------------------|
| energetic | Animations rapides, couleurs vives, mouvement constant |
| minimal | Espace blanc, peu d'elements, transitions douces |
| corporate | Couleurs sobres, structure grille, polices serif |
| playful | Rebonds exageres, couleurs saturees, formes rondes |
| calming | Transitions lentes, couleurs pastel, opacite reduite |
| tech | Fonds sombres, monospace, glow/neon, grids |
| premium | Noir/or, animations slow, espacement genereux |
| editorial | Typo forte, blanc/noir, grid magazine |
| cinematic | Letterbox, grain, mouvements lents, profondeur |

### 6.4 Iteration efficace

**Cycle optimal (6-8 iterations) :**
```
Prompt 1 : Structure globale + donnees + tech stack
Prompt 2 : Ajuster proportions ("balls 50% smaller")
Prompt 3 : Fixer debordements camera / layout
Prompt 4 : Ameliorer assets (modeles realistes vs generiques)
Prompt 5 : Peaufiner typographie et couleurs
Prompt 6 : Timing et easing finals
Prompt 7 : Polish (shadows, borders, micro-animations)
Prompt 8 : Export final
```

**Feedback efficace (exemples) :**
```
BON : "Reduce les ballons de 50%, centrer horizontalement, pause camera 500ms sur chaque position"
MAUVAIS : "C'est pas aligne, corrige"

BON : "Change le degrade de fond en #0b0f1a → #1a1a2e (gauche vers droite)"
MAUVAIS : "Change la couleur"

BON : "Le counter S&P500 doit aller de 0 a 5,892.47 en 2 secondes avec easing ease-out"
MAUVAIS : "Anime le prix"
```

---

## 7. 3D AVEC REACT THREE FIBER

### 7.1 Stack technique

```
Remotion (framework video)
  └── React Three Fiber (abstraction React pour Three.js)
       └── Three.js (moteur 3D : camera, lumieres, geometries)
            └── WebGL (rendu GPU)
```

**Avantages React Three Fiber dans Remotion :**
- Systeme 3D complet (camera, lumieres, materiaux) inclus
- Declaratif (React) pour objets 3D
- Compatible avec les timings Remotion (frames, durees)
- Pas besoin de Three.js imperatif

### 7.2 Setup 3D

```tsx
// Dans une composition Remotion
import { Canvas } from '@react-three/fiber';

const My3DScene = () => {
  const frame = useCurrentFrame();

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <PerspectiveCamera
        position={[0, interpolate(frame, [0, 300], [0, 10]), 5]}
      />
      {/* Objets 3D ici */}
    </Canvas>
  );
};
```

### 7.3 Patterns 3D documentes

**Camera Trajectory (reveal progressif)** :
```
- Demarrer camera en bas (vue des bases)
- Animer vers le haut (vue des sommets)
- Pauses sur chaque element : ~500ms
- Ideal pour rankings, classements, comparaisons
```

**Stacking 3D (piles metriques)** :
```
- Petits objets empiles verticalement
- Hauteur pile = valeur metrique (prix, volume, etc.)
- Taille objets : reduire a ~0.5 pour rendu dense
- Aligner bases sur plan de reference
```

**Modeles 3D externes** :
```
- Source : SketchFab (gratuit + payant)
- Telecharger dans dossier projet
- Passer chemin a Claude Code
- Claude importe et anime automatiquement
- Attention : assets volumineux (~1 GB possible)
```

### 7.4 Pertinence pour TradingRecap

- Visualisation 3D des assets (barres 3D pour variations %)
- Globe avec flux de capitaux
- Graphiques 3D interactifs
- Rankings visuels des top movers
- **Attention** : plus lourd a rendre, reserve pour moments cles

---

## 8. AUDIO / TTS / ELEVENLABS

### 8.1 Options TTS

| Service | Avantage | Integration |
|---------|----------|-------------|
| **ElevenLabs V3** | Meilleure qualite vocale (consensus) | Cle API dans .env |
| **Wavespeed** | Wrapper ElevenLabs + meilleure integration Claude | API unifiee |
| **Edge TTS** | Gratuit, Microsoft | Deja dans notre projet |
| **Nano Banana Pro** | Generation images AI (complement) | Via Wavespeed |

### 8.2 Configuration ElevenLabs

```bash
# .env
ELEVENLABS_API_KEY=sk-...
ELEVENLABS_VOICE_ID=...   # Optionnel, voix specifique
```

**Plans tarifaires :**
- **Gratuit** : 10 credits de test
- **Starter** (~10-15$/mois) : usage personnel, recommande pour debuter
- **Creator** : scale progressif
- **Pro** : volume massif (Scale ~99E)
- **Ne PAS commencer par annuel** (tester d'abord)

**Securite API :**
- Settings → Developer → Create API Key
- Si acces partage : LIMITER permissions (eviter abus)
- Full access uniquement pour usage personnel

### 8.3 Workflow audio optimal

```
1. Generer video visuelle COMPLETE (sans audio)
2. Valider visuellement (layout, animations, timing)
3. Generer voiceover TTS (ElevenLabs V3)
4. Claude synchronise audio par scene automatiquement
5. Ajuster timings video pour matcher audio si necessaire
6. Ajouter bruitages/musique en derniere passe
```

**Pourquoi audio APRES video :**
- Plus facile d'ajuster audio au visuel que l'inverse
- Si video change, pas besoin de re-generer audio
- Permet validation visuelle independante

### 8.4 Voice cloning

- ElevenLabs supporte voice cloning
- Enregistrement vocal custom : "Here's my recording, attach it to Remotion"
- Possibilite de creer voix de marque consistante
- Claude gere l'integration automatiquement

---

## 9. AUTOMATION, SCALING, PUBLICATION

### 9.1 Batch generation (1000 videos)

**Process (video 7 — prospection B2B)** :
```
1. Import liste CSV/Excel :
   Colonnes : Nom, Prenom, Entreprise, URL

2. Agent loop pour chaque ligne :
   - LLM genere script personalise
   - Remplir variables : {FIRST_NAME}, {COMPANY_NAME}, etc.
   - Remotion encode video
   - Export MP4

3. Output : dossier avec N videos personnalisees
```

**Variables de personnalisation :**
```
{FIRST_NAME}        → Prenom client
{LAST_NAME}         → Nom client
{COMPANY_NAME}      → Nom entreprise
{WEBSITE_INSIGHTS}  → Opportunites detectees
{DATE}              → Date
{ASSET_NAME}        → Nom de l'asset (pour TradingRecap)
{PRICE}             → Prix actuel
{CHANGE_PCT}        → Variation %
```

### 9.2 Pipeline publication automatique

**Architecture Zapier MCP (video 3)** :
```
Claude Code (Remotion)
    ↓
Zapier MCP Server (zapier.com/mcp)
    ↓ Connecter apps :
├── Slack → Demander approbation manager
├── Metricool → Scheduler posting social
├── YouTube → Upload video
├── Gmail → Notification email
├── Google Sheets → Log des episodes
└── Discord → Webhook notification
```

**Commande unique :**
```
"Ask my manager if this is approved. If yes, publish with Metricool"
```

**Zapier = 8000+ apps, 30000+ actions connectables**

### 9.3 Templates Remotion disponibles

| Template | Usage |
|----------|-------|
| Blank | Feuille blanche (recommande) |
| Motion Graphics | Presentations produits SaaS |
| Auto-subtitles | Sous-titrage automatise IA |
| Audio-to-visual | Transcription audio → texte (style TikTok) |
| Prompt Video | Prompt → motion graphics |
| Overlay | Couches superposees |
| Next.js | Dev UI avances |

### 9.4 Gains de temps

| Methode | Temps par video | Pour 100 videos |
|---------|-----------------|-----------------|
| Manuel (Premiere/DaVinci) | 30-60 min | 50-100h |
| Claude + Remotion (simple) | 5-15 min | 8-25h |
| Claude + Remotion (batch) | 2-5 min | 3-8h |
| Pipeline full auto | ~1 min (render) | ~2h |

---

## 10. TROUBLESHOOTING ET ERREURS COURANTES

### 10.1 Erreurs de setup

**PowerShell bloque `npm run dev`** :
- Solution : executer `cd` et `npm run dev` separement
- Ou : utiliser Git Bash au lieu de PowerShell

**"Remotion Studio server is running, but I'm running a sandboxed VM"** :
- Solution : switcher de Co-work vers Code mode dans Claude Desktop
- Claude Code est plus robuste que Co-work pour Remotion

**Assets/logo incorrects** :
- Solution : drag-drop du bon fichier + prompt de confirmation
- Toujours specifier le chemin exact du fichier

### 10.2 Erreurs de prompting

**Prompt trop ambitieux (resultat desastreux)** :
```
ERREUR : "Cree une video de 30 secondes avec 10 scenes differentes"
SOLUTION : Decouper en 3-4 scenes max par prompt
```

**Resultat "trop simple"** :
```
ERREUR : "Cree une animation"
SOLUTION : "Cree une animation ULTRA-MODERNE avec plein d'animations,
            slides, texte, transitions fluides. Je veux un effet waouh."
```

**Design vague** :
```
ERREUR : "Corrige le diagram"
SOLUTION : "Supprime le cercle en position (98, 50), aligne les fleches,
            change la couleur du label en #00b4d8"
```

### 10.3 Erreurs de qualite

**Se contenter du premier resultat** :
- Le premier resultat = ~80% de qualite
- TOUJOURS iterer 2-3x minimum
- Ajuster : couleurs, timing, easing, positions
- C'est dans l'iteration que la magie se fait

**Ne pas verifier les transparences** :
- Bug frequent : transparence residuelle en fin d'animation
- Solution : verifier premiere ET derniere frame dans Studio

**Timings trop longs** :
- Les animations par defaut sont souvent trop longues
- Specifier durees exactes dans le prompt
- Tester avec playback dans Studio

### 10.4 Erreurs d'architecture

**Tout dans un fichier (monolithique)** :
```
ERREUR : 1 fichier de 500 lignes avec toute la video
SOLUTION : Composants separes + composition orchestratrice
  - components/Card.tsx
  - components/Chart.tsx
  - scenes/IntroScene.tsx
  - scenes/DataScene.tsx
  - Root.tsx (orchestration)
```

**Scope skills global quand local suffit** :
```
ERREUR : Installer skills specifiques au projet en global
SOLUTION :
  - Global : Remotion best practices (utilise partout)
  - Local : regles branding specifiques au projet
```

---

## 11. OUTILS ET RESSOURCES EXTERNES

### 11.1 Outils de creation

| Outil | Usage | Prix |
|-------|-------|------|
| **Remotion** | Framework video React | Gratuit (open source, $75/mois equipe) |
| **Claude Code** | Generation de code | $20/mois (Pro) |
| **Claude Desktop** | Meilleure gestion fichiers | $100/mois (Max) |
| **Cursor IDE** | IDE avec Claude Code integre | ~$20/mois |
| **VS Code** | IDE gratuit | Gratuit |

### 11.2 Outils audio/visuel

| Outil | Usage | Prix |
|-------|-------|------|
| **ElevenLabs** | TTS haute qualite | Gratuit → Pro |
| **Wavespeed** | Wrapper ElevenLabs unifie | Via API |
| **Nano Banana Pro** | Generation images AI | Via Wavespeed |
| **SketchFab** | Modeles 3D | Gratuit + payant |

### 11.3 Outils automation

| Outil | Usage | Prix |
|-------|-------|------|
| **Zapier MCP** | Pipeline publication | Gratuit → payant |
| **Metricool** | Scheduling social media | Freemium |
| **Glido** | Transcription oral → texte | Freemium |

### 11.4 Ressources d'apprentissage

- `remotion.dev/prompts` — Bibliotheque de prompts Remotion
- `remotion.dev/docs` — Documentation officielle
- Discord cc-france.org — 300+ membres, support FR
- GitHub Remotion — Exemples et templates
- Skills registry : `skills.sh` — Recherche de skills par mots-cles

### 11.5 Modeles IA recommandes par tache

| Tache | Modele recommande |
|-------|-------------------|
| Code Remotion | **Opus** (meilleur qualite, plus cher) |
| Design HTML statique | **Gemini** (excellent graphisme) |
| Scripts/narration | **Sonnet** ou **GPT-4** |
| Iterations rapides | **Sonnet** (bon rapport qualite/prix) |
| Prompting avance | **Claude** (reasoning superieur) |

---

## 12. APPLICATION A TRADINGRECAP

### 12.1 Mapping pipeline existant → techniques apprises

```
NOTRE PIPELINE ACTUEL :
Yahoo+APIs → DailySnapshot → LLM Script → Remotion → MP4

PIPELINE ENRICHI (avec knowledge base) :
Yahoo+APIs → DailySnapshot → LLM Script
    ↓
HTML stills par scene (Claude genere design statique)
    ↓
Validation visuelle (Remotion Studio)
    ↓
Animation Remotion (Claude Code + skill best practices)
    ↓
ElevenLabs TTS (voiceover FR)
    ↓
Stitch sections → episode final
    ↓
Zapier → YouTube upload + Discord notif
```

### 12.2 Scenes TradingRecap → animations recommandees

| Scene | Animations recommandees |
|-------|------------------------|
| **ColdOpen / Hook** | Morphing logo, counter animate (indice du jour), spring bounce titre, fade in rapide, vibe: energetic |
| **ThreadScene / Market Overview** | Grille de cards avec cascade spring, counters pour chaque asset, sparklines drawing, palette verte/rouge, vibe: tech |
| **Segment / Deep Dive** | InkChart drawing animation (courbe SVG), zoom sur zone cle, pulse/glow sur niveaux S/R, typewriter pour analyse, vibe: editorial |
| **News** | Slide in des headlines, fade entre news, icones sources, timeline horizontale, vibe: minimal |
| **Predictions / Closing** | Counter animate scenarios, barres de probabilite, fade out elegant, disclaimer slide in, vibe: premium |
| **Disclaimer permanent** | Opacity reduite, position basse, pas d'animation (statique) |
| **Ticker permanent** | Scroll horizontal continu, couleurs conditionnelles vert/rouge |

### 12.3 Actions immediates (par priorite)

**P1 — Setup (30 min)**
1. Installer Remotion skill best practices : `npx skills add remotion dev skills`
2. Verifier avec `/skills`
3. Documenter dans CLAUDE.MD nos composants existants

**P2 — HTML-First workflow (2h)**
4. Pour chaque type de scene, creer un template HTML statique de reference
5. Valider visuellement les designs
6. Stocker dans `packages/remotion-app/templates/`

**P3 — Animations upgrade (4h)**
7. Remplacer animations basiques par spring() + interpolate()
8. Ajouter drawing animation sur InkChart (SVG strokeDashoffset)
9. Implementer cascade spring sur les cards MarketOverview
10. Counter animate pour prix/variations

**P4 — Video chaining (2h)**
11. Rendre chaque scene → video independante
12. Orchestrer stitch dans Root.tsx via Sequence

**P5 — Audio (quand Bloc F)**
13. Integrer ElevenLabs V3 apres validation visuelle
14. Sync audio par scene via Remotion

**P6 — Automation (quand Bloc G)**
15. Zapier MCP → YouTube upload + Discord webhook

### 12.4 Decisions de design issues des videos

| Decision | Justification |
|----------|---------------|
| HTML-first pour design | 3x moins d'iterations, pixel-perfect |
| spring() partout | Rendu pro naturel vs lineaire robotique |
| Scenes independantes | Iteration isolee, remplacement facile |
| Opus pour code final | Meilleur qualite Remotion (consensus) |
| Sonnet pour iterations | Rapport qualite/cout pour tests |
| Audio APRES video | Plus facile ajuster audio que video |
| 30fps standard | Notre config actuelle, suffisant pour motion graphics |
| Tailwind toujours | Styling rapide, coherent, maintenable |
