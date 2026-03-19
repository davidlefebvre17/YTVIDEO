# Synthese Knowledge — Remotion + Claude Code (9 videos analysees)

> Extraction de 9 videos YouTube de reference pour produire des videos Remotion top niveau.

---

## 1. WORKFLOW OPTIMAL : HTML-FIRST (consensus 4/9 videos)

**Le pattern #1 le plus repete** : ne JAMAIS demander une video from scratch.

```
MAUVAIS : "Claude, fais-moi une video de trading recap"
BON     : HTML statique → validation visuelle → animation Remotion
```

### Etapes :
1. **Generer un still HTML** via Claude Desktop ou Gemini (design pur)
2. **Valider visuellement** le rendu statique (couleurs, layout, typo)
3. **Pointer Claude Code** vers le HTML : "Anime ce fichier en video Remotion"
4. **Iterer** sur les animations (2-3 passes suffisent)

### Pourquoi ca marche :
- Claude a une reference visuelle concrete, pas un concept abstrait
- Moins d'iterations (3 vs 8+)
- Controle pixel-perfect sur le design final
- Separation design / animation = meilleure qualite

---

## 2. SETUP REMOTION + SKILLS

### Installation
```bash
npx create-video@latest mon-projet
# Options recommandees :
#   Template : blank
#   Tailwind : OUI (toujours)
#   Skills : OUI (agent skills)
```

### Skill Remotion Best Practices
- ~10 fichiers .md avec regles et bonnes pratiques
- 3eme skill le plus telecharge
- Installation : `npx skills add remotion dev skills`
- Scope : global (`~/.cloud/skills/`) ou local (`.cloud/`)
- Verification : `/skills` dans Claude Code

### Remotion Prompts Library
- URL : `remotion.dev/prompts`
- Bibliotheque de prompts/templates prets a copier-adapter
- Cartes interactives, visualisations, etc.

---

## 3. ARCHITECTURE VIDEO — 3 NIVEAUX

### Niveau 1 : Video simple
- Un seul prompt → Claude genere → preview dans Studio → render
- Cas : animations texte, counters, data viz simples

### Niveau 2 : Skill Stacking
- Remotion + ElevenLabs (TTS) + Nano Banana Pro (images AI)
- `CLAUDE.MD` persistant avec instructions pour chaque skill
- Centraliser assets (logos, images) dans un dossier unique
- Coherence branding automatique

### Niveau 3 : Chaining (videos longues)
- Script → sections individuelles → videos par section → stitch final
- Claude orchestre : intro + corps + outro
- Pattern ideal pour videos 8-10 min (comme nos Daily Recaps)

```
Section 1 → video1.mp4
Section 2 → video2.mp4   → Claude stitch → episode-final.mp4
Section 3 → video3.mp4
...
```

---

## 4. TECHNIQUES D'ANIMATION REMOTION

### APIs et Composants cles
| API/Composant | Usage |
|---|---|
| `<Composition>` | Container video principal |
| `<Sequence>` | Segments timeline (groupes de frames) |
| `<AbsoluteFill>` | Layout plein ecran |
| `useCurrentFrame()` | Frame courante pour animations conditionnelles |
| `useVideoConfig()` | Acces fps, width, height |
| `spring()` | Animation elastique/rebond naturel |
| `interpolate()` | Valeurs interpolees (opacity, transform, etc.) |

### Timing et durees
```
duration_in_frames = duration_in_seconds * fps
Exemple : 5 sec @ 30fps = 150 frames
```

### Animations documentees (par complexite)
1. **Fade In/Out** : opacity 0→1→0 (1s in, 3s visible, 1s out)
2. **Spring bounce** : elements qui apparaissent avec rebond
3. **Pulse/Glow** : pulsation lumineuse (serveurs, databases)
4. **Typewriter** : texte caractere par caractere
5. **Counter animate** : compteurs numeriques incrementaux
6. **Drawing** : tracer formes/bordures au fil du temps
7. **Morphing** : transformation d'element en autre (logo → terminal)
8. **Camera trajectory** : deplacement 3D bas→haut (React Three Fiber)
9. **Stacking** : piles d'objets 3D representant des metriques

### Patterns visuels pro
- Fonds degrades sombres (pas couleurs pleines)
- Polices modernes sans-serif
- Spring effect sur apparition des elements
- Animations sequentielles (cascade, pas simultanee)
- Fleches annotees pour flux de donnees
- Curseur clignotant pour elements interactifs

---

## 5. PROMPTING REMOTION — REGLES D'OR

### DO (faire)
- **Specifier timings exacts** : "2 second fade in" (pas "slow fade")
- **Decrire le vibe** : energetic, minimal, corporate, playful, calming
- **Declarer aspect ratio** upfront : 16:9 YouTube, 9:16 TikTok
- **Decouper en scenes** : "Scene 1 shows X, Scene 2 transitions Y"
- **Mentionner assets brand** : "use logo from my files"
- **Lister animations dans l'ordre** d'execution
- **Inclure couleurs et polices** explicitement
- **Fournir assets concrets** quand disponibles (PNG, SVG)

### DON'T (eviter)
- **Demander trop en 1 prompt** : max 3-4 scenes par requete
- **Rester vague** : "fix the diagram" → "remove the circle at position 98"
- **Se contenter du premier resultat** : iterer 2-3x minimum
- **Prompt abstrait sans reference** : toujours fournir HTML/screenshot

### Template prompt efficace
```
En te basant sur [fichier/screenshot/HTML],
cree une animation Remotion de [duree] secondes:
- Fond : [couleur/degrade]
- Scene 1 : [description + timing]
- Scene 2 : [description + timing]
- Transitions : [type]
- Style : [vibe]
- Assets : [chemins fichiers]
```

---

## 6. 3D DANS REMOTION (React Three Fiber)

### Stack
- **React Three Fiber** : abstraction React pour Three.js
- **Three.js** : systeme 3D complet (camera, lumieres, geometries)
- **SketchFab** : source de modeles 3D gratuits/payants

### Capacites
- Camera animee (trajectoires, pauses, zooms)
- Modeles 3D importes (stades, objets, assets)
- Stacking 3D (piles d'objets representant des metriques)
- Eclairage et materiaux configurables
- Rankings/classements en 3D

### Process
1. Telecharger asset 3D depuis SketchFab
2. Mettre dans dossier projet
3. Claude Code + React Three Fiber → composition 3D
4. 6-8 iterations typiques pour resultat final

---

## 7. AUDIO / TTS INTEGRATION

### ElevenLabs (consensus 5/9 videos)
- **Config** : cle API dans `.env` → `ELEVENLABS_API_KEY=sk-...`
- **Wavespeed** : wrapper ElevenLabs avec meilleure integration Claude
- **V3 recommande** pour meilleure qualite vocale
- Voice cloning possible
- Sync audio/video gere par Remotion automatiquement

### Workflow audio
1. Generer video visuelle d'abord
2. Valider visuellement
3. Ajouter voiceover en 2eme passe
4. Claude synchronise audio par scene

---

## 8. AUTOMATION & SCALING

### Batch generation (video 7)
- Import liste CSV/Excel (nom, prenom, entreprise, URL)
- Agent loop : generer script → remplir variables → encoder → exporter
- Variables : `{FIRST_NAME}`, `{COMPANY_NAME}`, `{WEBSITE_INSIGHTS}`
- <15 min par video vs 30+ min manuel

### Pipeline publication (video 3)
```
Claude Code (Remotion) → Zapier MCP → Slack (approval) → Metricool/YouTube (publish)
```
- 8000+ apps connectables via Zapier
- Single command : "Ask manager approval, if yes publish to YouTube"

### Templates Remotion disponibles
- Blank, Motion Graphics, Auto-subtitles, Audio-to-visual
- Overlay, Prompt Video, Next.js, React composition

---

## 9. ITERATION ET QUALITE

### Cycle d'iteration optimal
```
Prompt 1 : Structure globale + donnees + tech stack
Prompts 2-4 : Refinements (proportions, positions, couleurs)
Prompts 5-6 : Polish (timing, easing, assets finaux)
= 6-8 iterations pour resultat production-ready
```

### Modeles IA recommandes
- **Opus** : meilleur qualite, plus couteux (recommande pour production)
- **Sonnet** : bon rapport qualite/prix
- **Gemini** : excellent pour graphismes/visuel (alternative)

### Tips qualite pro
1. Toujours commencer par un still visuel
2. Comparer pixel-par-pixel avec la reference
3. Remotion Studio = feedback immediat
4. Transformer compositions validees en composants reutilisables
5. Recompilation auto apres chaque changement
6. 2-5 min pour generer video 30sec

---

## 10. APPLICATION A TRADINGRECAP

### Mapping direct sur notre pipeline

| Video Technique | Notre Implementation |
|---|---|
| HTML-first workflow | Generer HTML statique par scene AVANT animation |
| Skill stacking (Remotion + TTS) | Bloc E (Remotion) + Bloc F (ElevenLabs) |
| Video chaining (Niveau 3) | 6-7 sections → videos individuelles → stitch final |
| Spring/fade animations | InkChart, ColdOpenScene, ThreadScene |
| Brand tokens centralisees | `core/brand.ts` (cream/ink palette) |
| Data viz animated | Counters, progress bars, charts pour market data |
| Batch generation | Pipeline quotidien automatise |
| Zapier → YouTube | Bloc G (SEO + upload) |

### Actions immediates
1. **Installer Remotion skill** dans notre projet
2. **Creer HTML stills** pour chaque type de scene (hook, thread, segment, closing)
3. **Documenter dans CLAUDE.MD** les composants Remotion existants
4. **Utiliser spring()** et interpolate() pour animations pro
5. **Separer design/animation** : HTML statique → animation Remotion
6. **Template prompt** pour chaque type de scene avec timings fixes

### Architecture cible
```
DailySnapshot data
    ↓
Pipeline C1→C5 (LLM script)
    ↓
HTML stills par scene (Claude genere)
    ↓
Remotion animate (Claude Code + skill)
    ↓
ElevenLabs TTS (Bloc F)
    ↓
Stitch final + render MP4
    ↓
YouTube upload (Bloc G)
```
