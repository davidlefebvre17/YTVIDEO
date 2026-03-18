# TradingRecap — Blueprint v3

> Ce document est un GUIDE VIVANT, pas une specification figee.
> Chaque section doit etre questionnee au moment de l'implementation.
> Avant de coder : "Est-ce que ca sert la qualite de la video finale ? Est-ce coherent avec ce qui existe ?"
>
> **Mis a jour : 2026-03-11** — Architecture pipeline multi-couches v3, MarketMemory, separation stricte des responsabilites LLM.

---

## 1. Vision (immuable)

**"Le journal de 20h des marches"** — un narrateur qui raconte l'HISTOIRE du jour avec du contexte, de l'analyse fondamentale, et une identite visuelle forte.

### Regles absolues

- **100% educatif, 0% conseil** — compliance AMF / MiFID II non negociable
- **Publier > Perfectionner** — la regularite prime sur la perfection (l'algo YouTube recompense la constance)
- **Chaque video doit etre unique** — jamais de template repetitif, chaque episode raconte une histoire differente
- **Honnetete totale** — admettre les erreurs de prediction, pas de certitudes, conditionnel obligatoire
- **Anti-AI-slop** — la video doit etre indistinguable d'un contenu cree par un humain passionne

### Specs video

| Parametre | Valeur |
|-----------|--------|
| Resolution | 1920x1080 (16:9) |
| FPS | 30 |
| Codec | h264, CRF 18 |
| Duree cible | 7-11 minutes (420-660s) |
| Langue | FR prioritaire, EN pret a activer |
| Pacing | ~150 mots / 60 secondes |

### Audience

Debutants et intermediaires en trading/investissement, francophones. Le ton est direct, tutoiement, phrases courtes. Le narrateur est un analyste avec 10 ans d'experience qui vulgarise sans infantiliser.

---

## 2. Etat actuel du code

> Mis a jour : 2026-02-19. Actualiser cette section a chaque milestone.

### Ce qui FONCTIONNE

| Composant | Fichier | Statut |
|-----------|---------|--------|
| Types core | `core/types.ts` | Complet — DailySnapshot, EpisodeScript, AssetSnapshot, etc. |
| Design tokens | `core/brand.ts` | Complet — palette, typo, spacing, shadows |
| Layout engine | `core/layout.ts` | Complet — responsive landscape/portrait |
| Animations | `core/animations.ts` | Complet — fadeIn/Out, slide, spring, stagger |
| Yahoo Finance | `data/yahoo.ts` | Phase 1 — 21 assets, candles 1h 2j + 1d 1mois. Phase 2 : 38 assets + multi-timeframe |
| RSS News | `data/news.ts` | Phase 2 — ~30 feeds, sans limite, filtering par asset |
| FRED client | `data/fred.ts` | Complet — yields 10Y, 2Y, spread (graceful degradation) |
| Finnhub client | `data/finnhub.ts` | Complet — earnings calendar (eco calendar = plan payant) |
| Finnhub News | `data/finnhub.ts` | Complet — news, earnings calendar, sentiment |
| COT positioning | `data/cot.ts` | Complet — CFTC COT data + positioning analyzer |
| Snapshot orchestrateur | `data/market-snapshot.ts` | Complet — 7 fetchers paralleles, enriched snapshot |
| LLM client | `ai/llm-client.ts` | Complet — OpenRouter, 4 modeles free, retry |
| Script generator | `ai/script-generator.ts` | Complet — thématique v3, mémoire contextuelle dégradée 15j |
| Prompt daily recap | `ai/prompts/daily-recap.ts` | Complet — FR/EN, schema JSON, structure 6-10 sections (no previously_on) |
| Episode history | `ai/episode-history.ts` | Complet — manifest R/W |
| 6 scenes Remotion | `remotion-app/scenes/*` | Complet — Intro, MarketOverview, ChartDeepDive, News, Predictions, Outro |
| 4 composants shared | `remotion-app/scenes/shared/*` | Complet — AssetCard, AnimatedText, Sparkline, TransitionWipe |
| Pipeline full | `scripts/generate.ts` | Complet — fetch → script → render |
| Prompt Studio UI | `scripts/prompt-studio.ts` | Complet — web UI port 3030 |
| Fixtures test | `remotion-app/fixtures/sample-data.ts` | Complet — 8 assets, 10 news, script FR |
| Knowledge: analyse technique | `ai/knowledge/technical-analysis.md` | Complet — EMA, RSI, S/R, volume, ATH, combinaisons |
| Knowledge: intermarche | `ai/knowledge/intermarket.md` | Complet — correlations, regimes, decorrelations |
| Knowledge: macro | `ai/knowledge/macro-indicators.md` | Complet — VIX, yields, DXY, F&G, events eco |
| Knowledge: narration | `ai/knowledge/narrative-patterns.md` | Complet — 7 patterns (A-G), structure thématique v3, critères qualité |
| Knowledge: geopolitics | `ai/knowledge/geopolitics.md` | Complet — géopolitique, sanctions, tensions |
| Knowledge: central-banks | `ai/knowledge/central-banks.md` | Complet — banques centrales, politiques monétaires |
| Knowledge: asset-profiles | `ai/knowledge/asset-profiles.md` | Complet — profils 763 sociétés, secteurs, caractéristiques |
| Knowledge: COT patterns | `ai/knowledge/cot-positioning.md` | Complet — positionnement CFTC, contrarian signals |
| Knowledge: tone-references | `ai/knowledge/tone-references.md` | Complet — registre de ton, transitions, expressivité |
| Knowledge loader | `ai/knowledge-loader.ts` | Complet — 3-tier injection (always/conditional/filtered) |
| Editorial score | `ai/editorial-score.ts` | Complet — drama score, impact score, 52-week contextual |
| News selector | `ai/news-selector.ts` | Complet — sélection intelligente par relevance asset |
| Company profiles | `data/company-profiles.ts` | Complet — profils 763 stocks FMP |

### Ce qui est STUBBE

| Composant | Fichier | Etat |
|-----------|---------|------|
| Calendrier economique | `data/calendar.ts` | Delegue a Finnhub — retourne [] si pas de cle ou plan free |
| Prompt chart analysis | `ai/prompts/chart-analysis.ts` | Texte placeholder |

### Ce qui N'EXISTE PAS encore (a construire)

- ~~Enrichissement data (CoinGecko, FRED, Fear&Greed, Finnhub calendar, calculs techniques)~~ **FAIT**
- ~~Knowledge loader (`knowledge-loader.ts` — selectionne et injecte les fiches pertinentes)~~ **FAIT**
- ~~Fiches Knowledge: central-banks, asset-profiles~~ **FAIT**
- **Pipeline multi-couches C1→C10** (refactoring majeur du script-generator.ts — voir Bloc C)
  - C1 prompt editorial (Haiku) + `editorial_plan.json`
  - C2 prompt analytique (Sonnet) + `analytical_brief.json`
  - C3 prompt narratif (Opus) + `episode_draft.json`
  - C4 validation (code + Haiku) avec boucle max 2 iterations
  - C5 direction globale (Sonnet) + `episode_directed.json`
  - C6→C10 prompts production (Haiku/Sonnet selon couche)
- **MarketMemory** (`@yt-maker/ai/market-memory/`)
  - JSONs par actif (`data/market-memory/{symbol}.json`)
  - Détection événements zones (code pur) : TOUCH/REJET/CASSURE/PULLBACK_TENU/PULLBACK_RATE
  - Calcul indicators_daily (pandas-ta) : bb_width_pct_rank, mm20_slope_deg, atr_ratio, volume_ratio_20d
  - Enrichissement soir Haiku (conditionnel, ~4-8 actifs)
  - Job hebdomadaire Sonnet (zones, impression, market_weekly_brief.json)
- **EpisodeMemory** (continuite inter-episodes) — mémoire contextuelle dégradée 15j PARTIELLEMENT FAIT
- **NewsMemory** (`@yt-maker/ai/memory/` — tagging rules-based, SQLite FTS5, research context) — voir Bloc D2
- Types enrichis (EnrichedSnapshot, EnrichedEpisodeScript, editorial_plan, analytical_brief, episode_directed)
- Fiches Knowledge manquantes (seasonal-patterns)
- Scenes Remotion v2 (ColdOpen, Dashboard, Correlation, Macro, Zones, Recap)
- Composants visuels (HeatmapGrid, Gauge, ChartOverlay, LevelAnnotation, etc.)
- TTS (ElevenLabs + C6 Haiku adaptation + Whisper sous-titres)
- SEO generator (C10 Haiku)
- Pipeline resilience (fallbacks, retry, notifications)
- Automation (cron, upload YouTube)
- Assets library (SVGs)
- Thumbnail generator (C9 Haiku + Flux A/B)
- Quality gate (code + C4 Haiku)

### Bugs et dettes connues

- `CLAUDE.md` : dit "Gemini 2.0 Flash" mais on utilise OpenRouter multi-modeles — a corriger
- **BLOQUANT** : pas de validation du JSON retourne par le LLM — un JSON malformed crash le pipeline.
  Fix : ajouter validation zod/ajv + retry si malformed. Priorite 0 avant toute autre implementation.
- **DETTE ARCHITECTURE** : `script-generator.ts` est un LLM monolithique (1 appel Opus).
  A refactoriser en pipeline C1→C5 lors du Bloc C. Ne pas ajouter de features au monolithe en attendant.

---

## 3. Architecture cible

### Pipeline complet — 10 couches, 9 phases (vision finale v3)

> **Principe fondateur** : LLM uniquement là où le code est insuffisant.
> Chaque couche a UNE responsabilité. Aucun LLM ne fait deux choses à la fois.
> La séparation éditorial / analytique / narratif / validation est NON NÉGOCIABLE.

```
P0 — INGESTION (5h45, code pur, parallèle)
┌──────────────────────────────────────────────────────────────────┐
│ Yahoo (38 assets multi-TF) │ RSS ~30 feeds │ Finnhub news/earnings│
│ FRED yields │ CoinGecko │ Alternative.me F&G │ Supabase cal. eco  │
│ MarketMemory JSONs par actif (zones S/R + last_events)           │
│ EpisodeMemory J-1 à J-5                                          │
└──────────────────────────────┬───────────────────────────────────┘
                               │ snapshot.json
                               ▼
P1 — PRÉ-FILTRAGE MÉCANIQUE (code pur, ~5s)
┌──────────────────────────────────────────────────────────────────┐
│ Seuils déterministes — score numérique par actif                 │
│ variation >2% │ volume >150% │ cassure EMA │ RSI <25/>75         │
│ earnings beat/miss >10% │ F&G <10/>90 │ événement zone MM détecté│
│ TOUS les actifs passent à P2 même score=0                        │
│ (continuités narratives J-1 non détectables mécaniquement)       │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
P2 — SÉLECTION ÉDITORIALE (C1 — Haiku, ~25s)
┌──────────────────────────────────────────────────────────────────┐
│ RÔLE UNIQUE : décider ce que le code ne peut pas décider         │
│ • News vraiment liée à un actif ? (pas juste co-occurrence)      │
│ • Continuité narrative J-1 à exploiter ?                         │
│ • Angle éditorial du jour ?                                       │
│ Attribution : DEEP / FOCUS / FLASH / skip                        │
│ Ordre narratif global                                            │
│ Reçoit : market_weekly_brief.json (Bloc MarketMemory)            │
│ RÈGLE : si actif classé DEEP → matière à chaîne causale garantie │
│ Pas de boucle retour P3→P2                                       │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
P3 — ANALYSE ANALYTIQUE (C2 — Sonnet, ~60s)
┌──────────────────────────────────────────────────────────────────┐
│ RÔLE UNIQUE : produire la matière analytique complète            │
│ • Chaîne causale complète par actif sélectionné                  │
│ • Scénarios haussier/baissier CHIFFRÉS                           │
│ • Risque d'invalidation explicite                                │
│ • Continuité J-1 explicite (via EpisodeMemory + MarketMemory)    │
│ • chart_instructions niveau SÉMANTIQUE                           │
│   ("afficher support 8400", "marquer cassure EMA21")             │
│   PAS de timing vidéo (décidé en P6)                             │
│ Reçoit : Knowledge Base (intermarket, macro, AT, asset-profiles) │
│ Reçoit : MarketMemory JSONs des actifs DEEP/FOCUS                │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
P4 — RÉDACTION NARRATIVE (C3 — Opus, ~90s)
┌──────────────────────────────────────────────────────────────────┐
│ RÔLE UNIQUE : écrire la narration                                │
│ • Ne décide PAS quoi couvrir (C1 l'a fait)                       │
│ • Ne décide PAS comment analyser (C2 l'a fait)                   │
│ • Varie les formulations vs EpisodeMemory J-3                    │
│ • Ton analytique strict, jamais générique                        │
│ • Few-shot exemples Bondain/Zonebourse injectés (registre oral)  │
│ Output → episode_draft.json                                      │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
P5 — VALIDATION (code + C4 — Haiku, ~20s) ← SEULE BOUCLE DU PIPELINE
┌──────────────────────────────────────────────────────────────────┐
│ CODE (mécanique) :                                               │
│   • drama_score absent dans le script ?                          │
│   • durées dans les specs (7-11 min total) ?                     │
│   • disclaimer absent de la narration ?                          │
│   • chiffres cohérents avec snapshot (±1%) ?                     │
│   • répétitions de formulations vs J-3 ?                        │
│ C4 HAIKU (sémantique) :                                          │
│   • recommandation directe déguisée ?                            │
│   • ton "retail" glissé dans la narration ?                      │
│   • cohérence temporelle ambiguë ?                               │
│ Max 2 itérations → sinon alerte Discord + review manuelle        │
└──────────────────────────────┬───────────────────────────────────┘
                               │ episode_draft validé
                               ▼
P6 — DIRECTION GLOBALE (C5 — Sonnet, ~35s) — POINT DE SYNCHRONISATION
┌──────────────────────────────────────────────────────────────────┐
│ RÔLE UNIQUE : seule couche qui voit l'épisode ENTIER             │
│ • Arc de tension global (montée → pic → respiration → closing)   │
│ • Transitions entre segments (type, durée ms, effet sonore)      │
│   depuis liste Remotion disponible injectée dans le prompt       │
│ • Mood musical (tag parmi liste prédéfinie)                      │
│ • Timing des chart_instructions (horodatées par rapport à l'audio)│
│ • Thumbnail moment (segment à CTR max)                           │
│ Output → episode_directed.json (fichier maître Remotion)         │
└──────────────────┬───────────────────────────────────────────────┘
                   │ episode_directed.json
                   ▼
P7 — PRODUCTION PARALLÈLE (~4 min, 3 branches simultanées)
┌─────────────────┬──────────────────┬──────────────────────────────┐
│ BRANCHE AUDIO   │ BRANCHE VISUELLE │ BRANCHE THUMBNAIL + MUSIQUE  │
│                 │                  │                              │
│ C6 Haiku        │ Code : routage   │ C9 Haiku :                   │
│ adaptation TTS  │ ticker financier │ 2 prompts Flux variants A/B  │
│ (raccourcit     │ → Remotion       │ depuis thumbnail_moment (C5) │
│ phrases,        │ conceptuel       │                              │
│ supprime refs   │ → C7 Sonnet DA   │ Flux : génération            │
│ visuelles,      │                  │ + overlay titre/chiffre      │
│ SSML pauses)    │ C7 Sonnet DA :   │ en post-traitement code      │
│                 │ direction artis- │                              │
│ Config ElevenL. │ tique par segm.  │ Code : sélection musique     │
│ statique par    │ dans charte fixe │ bibliothèque par mood tag     │
│ type segment :  │ voit TOUS les    │ fade calculé depuis durée    │
│ DEEP 0.75/0.92  │ segments en 1    │ WAV réelle                   │
│ FLASH 0.65/1.02 │ appel           │                              │
│                 │                  │ A/B test YouTube planifié    │
│ ElevenLabs :    │ C8 Haiku :       │ J+2 auto (500 impressions)   │
│ WAV horodatés   │ prompts Midj/    │                              │
│ = timing maître │ Flux optimisés   │                              │
│                 │ (switching para- │                              │
│ Whisper :       │ métrable sans    │                              │
│ SRT + ASS auto  │ toucher LLM)     │                              │
│ dictionnaire    │                  │                              │
│ custom tickers  │                  │                              │
└─────────────────┴──────────────────┴──────────────────────────────┘
                               │ WAV réels = timing maître
                               ▼
P8 — MONTAGE (Remotion + FFmpeg, ~2-3 min)
┌──────────────────────────────────────────────────────────────────┐
│ Remotion consomme episode_directed.json comme référence maître   │
│ WAV réels = timing (ignore durées estimées de C3)                │
│ Graphiques prix animés depuis chart_instructions (jamais IA gen.)│
│ QC auto : durée 7-11 min, sync <50ms, -14 LUFS                   │
│ Short auto : segment drama_score max + cold open, format 9:16    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
P9 — SEO & DISTRIBUTION (C10 — Haiku + code, ~30s)
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ DÉPENDANCE CACHÉE : chapitres horodatés = durées WAV réelles  │
│ P9 ne peut pas tourner COMPLÈTEMENT en parallèle de P8           │
│ C10 peut commencer titre+tags+thread X pendant P8                │
│ description+chapitres attendent fin render                       │
│ Code : upload YouTube + Shorts                                   │
│ EpisodeMemory sauvegardée AVANT upload                           │
│ Notification Discord (succès/warning/erreur)                     │
└──────────────────────────────────────────────────────────────────┘
```

**Coût LLM total estimé : ~0.39$/épisode**
| Couche | Modèle | Coût ~estimé |
|--------|--------|-------------|
| C1 Sélection éditoriale | Haiku | ~0.01$ |
| C2 Analyse analytique | Sonnet | ~0.04$ |
| C3 Rédaction narrative | Opus | ~0.15$ |
| C4 Validation | Haiku | ~0.01$ |
| C5 Direction globale | Sonnet | ~0.04$ |
| C6 Adaptation TTS | Haiku | ~0.01$ |
| C7 Direction artistique visuelle | Sonnet | ~0.04$ |
| C8 Prompts image | Haiku | ~0.01$ |
| C9 Prompts thumbnail | Haiku | ~0.01$ |
| C10 SEO | Haiku | ~0.01$ |
| **Total** | | **~0.33-0.45$/épisode** |

### Stratégie LLM — Principe de séparation stricte

> **Règle absolue** : un LLM = une responsabilité. Ne jamais combiner "décider quoi couvrir" et "écrire la narration" dans le même appel.

| Couche | Rôle | Modèle | Pourquoi ce modèle |
|--------|------|--------|-------------------|
| C1 | Sélection éditoriale | Haiku | Décision binaire rapide, pas de créativité |
| C2 | Analyse technique + causale | Sonnet | Raisonnement structuré, chiffres |
| C3 | Rédaction narrative | **Opus** | Cœur du produit — qualité narrative non négociable |
| C4 | Validation sémantique | Haiku | Détection patterns, pas de créativité |
| C5 | Direction globale | Sonnet | Vision d'ensemble + cohérence arc narratif |
| C6 | Adaptation vocale TTS | Haiku | Transformation mécanique texte→audio |
| C7 | Direction artistique | Sonnet | Cohérence visuelle multi-segments |
| C8 | Prompts image | Haiku | Optimisation mécanique de prompts |
| C9 | Prompts thumbnail | Haiku | Variants A/B mécaniques |
| C10 | SEO | Haiku | Tâche mécanique, coût négligeable |

### LLM Routing — Architecture du client

Un seul point d'entree : `generateStructuredJSON<T>(systemPrompt, userMessage, options?)`.
Le routing se fait en 2 axes : **provider** (ou envoyer la requete) et **role** (quel modele choisir).

**Axe 1 — Provider** (env var `LLM_PROVIDER`)

| Provider | Base URL | Auth | Quand |
|----------|----------|------|-------|
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `OPENROUTER_API_KEY` | Dev, test, iteration prompt |
| `anthropic` | `https://api.anthropic.com/v1/messages` | `ANTHROPIC_API_KEY` | Production |

Les deux APIs acceptent `system` + `messages`. Anthropic a un format legerement different (`system` est un champ top-level, pas un message role=system). Le client doit abstraire cette difference.

**Axe 2 — Role** (parametre `role` dans options)

| Role | Anthropic | OpenRouter (free) | Usage |
|------|-----------|-------------------|-------|
| `fast` | claude-haiku-4-5-20251001 | qwen/qwen3-4b:free | C1, C4, C6, C8, C9, C10 |
| `balanced` | claude-sonnet-4-6 | qwen/qwen3-235b-a22b-thinking-2507 | C2, C5, C7 |
| `quality` | claude-opus-4-6 | meta-llama/llama-3.3-70b-instruct:free | C3 uniquement |

Le role par defaut est `quality` (on veut le meilleur script possible).

**Comportement fallback** :
- En mode `anthropic` : si le modele principal echoue (429, 500), retry 3x avec backoff. Si toujours KO, fallback vers OpenRouter.
- En mode `openrouter` : cascade de modeles free (comportement actuel).

**Interface cible** :
```
generateStructuredJSON<T>(systemPrompt, userMessage)                    → role=quality, provider=env
generateStructuredJSON<T>(systemPrompt, userMessage, { role: "fast" })  → role=fast, provider=env
```

Pas de SDK externe. Les deux providers sont appeles via `fetch()` natif. La seule difference est le format du body et les headers.

### Monorepo
### Monorepo

```
packages/
  core/       → Types, brand, layout, animations (dependance de tout)
  data/       → Fetch + enrichissement (Yahoo multi-TF, FRED, Finnhub, CoinGecko, sentiment, ~30 RSS,
                stock screening, candle cache)
  ai/         → LLM client, prompts C1-C10, knowledge base, episode memory, SEO,
                news memory (SQLite+FTS5, tagging rules, research context), causal analysis,
                market-memory (JSONs par actif, enrichissement soir, job hebdo Sonnet)
  remotion-app/ → Scenes, composants, compositions
scripts/      → CLI (generate, fetch, script, render, prompt-studio)
knowledge/    → Fiches markdown d'analyse fondamentale
data/         → Snapshots, scripts, episodes, news-memory.db, market-memory/*.json,
                indices/*.json, candles/, logs (gitignore)
assets/       → SVGs, backgrounds, icones
```

> NOTE : pas de packages separes `memory/` ou `market-rag/`. Le code est trop petit pour justifier
> des packages distincts. `data/` gere le fetch et le stockage, `ai/` gere l'analyse et les prompts.

---

## 4. Compliance AMF / MiFID II

> Section separee car elle impacte TOUT : prompt, narration, visuels, SEO, TTS.
> A relire avant chaque modification de prompt ou de scene.

### Regles de langage

**INTERDIT (jamais, dans aucun contexte)** :
- Imperatifs : "achete", "vends", "place ton stop a"
- Promesses : "va monter", "objectif garanti", "profit assure"
- Recommandations : "je recommande", "la meilleure strategie"
- Signaux : "signal d'achat", "opportunite a ne pas manquer"

**OBLIGATOIRE** :
- Conditionnel : "pourrait", "si le prix venait a", "un scenario possible serait"
- Zones, pas ordres : "zone a surveiller entre X et Y" pas "achetez a X"
- Risque mentionne : chaque analyse doit evoquer le risque
- Disclaimer : present en bandeau permanent + lu en voix + description YouTube

**Vocabulaire autorise** :
- "scenarios techniques", "zones a surveiller", "configuration interessante"
- "les acheteurs/vendeurs pourraient", "on observe que", "historiquement"
- "si ... alors potentiellement", "a surveiller dans les prochaines seances"

### Disclaimer legal

Texte exact a afficher et prononcer :
```
Contenu strictement educatif et informatif.
Ne constitue pas un conseil en investissement.
Les performances passees ne prejugent pas des performances futures.
```

### Implementation

- **Bandeau permanent** : `DisclaimerBar` en bas de TOUTE la video (semi-transparent)
- **Rappel oral** : une mention dans le corps de la video (pas uniquement debut/fin)
- **Quality gate** : regex sur le script genere pour detecter le vocabulaire interdit
- **Description YouTube** : disclaimer complet + mention AMF

---

## 5. Contenu & Narration

> C'est LE coeur du produit. Le pipeline est de la plomberie. Le contenu est ce qui fait revenir les viewers.
> Les fiches detaillees sont dans `packages/ai/src/knowledge/`. Cette section est le resume strategique.

### 5.1 Donnees disponibles et leur interpretation

Chaque donnee envoyee au LLM doit etre accompagnee de son CONTEXTE d'interpretation.
Le LLM ne recoit pas juste "RSI = 38" — il recoit "RSI = 38 (zone de survente, potentiel rebond technique)".

**Sources confirmees (gratuites)** :

| Source | Donnees | Cle ? |
|--------|---------|-------|
| Yahoo v8 Chart | OHLCV candles (1h 2j + 1d 3ans + 1wk 10ans), 52w range | Non |
| Yahoo v7 Quote | Batch quote ~763 actions (prix, change%, volume, 52w) | Non |
| Yahoo RSS (10 feeds) | News par ticker (indices, forex, commodities, crypto) | Non |
| RSS FR natifs (6 feeds) | ZoneBourse, TradingSat, Les Echos x2, L'Agefi, EasyBourse | Non |
| RSS CNBC (2 feeds) | Investing + Economy (journalisme pro US) | Non |
| RSS Crypto (2 feeds) | CoinDesk, CoinTelegraph | Non |
| RSS Forex (1 feed) | FXStreet (analyses forex pro) | Non |
| RSS Investing.com FR (3 feeds) | Commodities, Forex, Overview (complement FR) | Non |
| Google News RSS (6 feeds) | Requetes ciblees EN+FR (macro, commodities, crypto) | Non |
| Finnhub news API | News generales + per-symbol | Oui (gratuite) |
| CoinGecko /global | Market cap total crypto, BTC dominance %, 24h change | Oui (gratuite) |
| CoinGecko /trending | Top 15 trending coins | Non |
| Alternative.me | Fear & Greed Index 0-100 + historique | Non |
| FRED | Treasury 10Y/2Y/30Y, yield spread | Oui (gratuite) |
| Finnhub earnings | Calendrier earnings | Oui (gratuite) |
| Supabase | Calendrier eco ForexFactory 19K+ events (J-1, J, J+7) | Oui (anon key) |

**Total : ~30 RSS feeds + 5 APIs = 500-800 articles uniques/jour + 38 assets multi-timeframe + ~763 actions scannees.**

**Calculs locaux sur les candles** :
- Weekly 10 ans : trend seculaire, EMA 52w, ATH/ATL, S/R majeurs
- Daily 3 ans : SMA 200/50, RSI 14, golden/death cross
- Daily 1 an : high/low 52w, volatilite 20j, volume vs avg 20j, breakout
- Intraday 2j : EMA 9/21, sparkline

**Fiches d'interpretation** : `packages/ai/src/knowledge/`
- `technical-analysis.md` — Seuils EMA, RSI, volume, S/R, combinaisons a detecter
- `intermarket.md` — Correlations (DXY/or, VIX/S&P, taux/tech, petrole/inflation, BTC/Nasdaq), regimes de marche, decorrelations
- `macro-indicators.md` — VIX zones, yield curve, DXY impact, F&G, events eco (NFP, CPI, FOMC)
- `narrative-patterns.md` — Patterns de storytelling, structure episode, regles narration, criteres qualite

### 5.2 Relations intermarches — Ce qui transforme une liste en histoire

Le narrateur CONNECTE les mouvements. Les correlations cles :
- DXY ↔ Or (inverse), EUR/USD (inverse), matieres premieres (inverse), BTC (inverse)
- VIX ↔ S&P (inverse), Or (positive en stress)
- Taux US ↔ Tech (inverse), Or (inverse), Dollar (positive)
- Petrole ↔ Inflation (positive)
- BTC ↔ Nasdaq (positive)

Les DECORRELATIONS sont plus interessantes que les correlations normales (or + dollar en hausse simultanée = signal de peur profonde).

5 regimes de marche : Risk-on, Risk-off, Rotation sectorielle, Incertitude/Range, Choc exogene. Chaque regime donne le TON de l'episode.

### 5.3 Patterns narratifs

| Pattern | Quand l'utiliser | Frequence |
|---------|-----------------|-----------|
| **Fil rouge** | Un theme domine la journee | ~70% des episodes |
| **Effet domino** | Un event macro declenche une chaine | Quand event |
| **Contraste** | Deux assets divergent anormalement | Quand decorrelation |
| **Surprise** | Stat historique, record, fait inattendu | 1x/semaine max |
| **Patience** | Marche calme, < 0.3% partout | Marche plat |

### 5.4 Criteres de qualite du script

**Bloquants** (fail = re-generation) : zero terme interdit AMF, disclaimer present, duree 390-520s, ratio mots correct, références au passé intégrées naturellement dans les segments (si mémoire contextuelle disponible), cold open specifique, pas de liste dans le recit.

**Qualitatifs** (scoring) : connecteurs causaux ("parce que" pas "et"), specificite (chiffres precis), conditionnel, liens intermarche, engagement (questions, suspense), transitions fluides, variete de structure.

Detail complet dans `knowledge/narrative-patterns.md`.

---

## 6. Blocs de construction

> Ordre de priorite. Chaque bloc a des dependances explicites.
> AVANT de coder un bloc : relire cette section, verifier que les dependances sont satisfaites,
> et se demander "est-ce que l'approche prevue est toujours la meilleure ?"

---

### Bloc A — Data Enrichment ✅ PARTIEL

**Dependances** : aucune (premier bloc)
**Impact** : alimente tout le reste — la qualite de la video depend de la richesse des donnees
**Statut** : Phase 1 implementee le 2026-02-19. Phase 2 concue. Phase 3 a faire.

**Phase 1 (FAIT)** : 21 macro assets, 8 feeds RSS (limite 20), FRED yields, Finnhub earnings,
CoinGecko sentiment, Supabase calendrier eco (J-1/J/J+7). Graceful degradation sur toutes les APIs.

**Phase 2 (A FAIRE — pre-requis avant Bloc B)** :

| Tache | Description | Statut |
|-------|-------------|--------|
| Watchlist 21 → 38 assets | Elargir avec forex top 10, commodities 8, crypto 3, indices Asie (voir A.1b) | A faire |
| Analyse multi-timeframe | Weekly 10 ans + Daily 3 ans par asset watchlist (voir A.1c) | A faire |
| RSS 8 → ~30 feeds | Sources FR natives + CNBC + crypto + forex + Google News cibles (voir A.1d) | A faire |
| Finnhub news API | Ajouter `/api/v1/news?category=general` comme source complementaire aux RSS | A faire |
| Retirer limite 20 articles | `fetchNews()` retourne TOUS les articles uniques, pas de maxItems | A faire |
| Supprimer FMP | Retourne 403, hors scope recap macro. Retirer l'appel de l'orchestrateur | A faire |
| Scan ~763 actions | Screen SP500, CAC40, DAX40, FTSE100, Nikkei top 50, HSI top 30 (voir A.1e) | A faire |
| Constituants indices | Fichiers JSON statiques `data/indices/*.json`. Maj manuelle 1-2x/an | A faire |
| Types enrichis | `AssetAnalysis` (multi-timeframe), `StockScreenResult`, update `DailySnapshot` | A faire |

**Phase 3 (FUTUR — apres Bloc D2)** :
- Stablecoins monitoring (USDT/USDC depeg detection via news)
- Index reconstitution auto-detection
- Cache J-1 par source (fallback si API down)

#### A.1b Watchlist elargie (38 assets avec analyse multi-timeframe)

La watchlist passe de 21 a 38 assets. Chaque asset recoit une analyse sur 3 niveaux temporels.

**Indices (13)** :

| Region | Symbole | Nom |
|--------|---------|-----|
| US | `^GSPC` | S&P 500 |
| US | `^IXIC` | Nasdaq Composite |
| US | `^DJI` | Dow Jones |
| US | `^VIX` | VIX |
| EU | `^FCHI` | CAC 40 |
| EU | `^GDAXI` | DAX 40 |
| EU | `^FTSE` | FTSE 100 |
| EU | `^STOXX` | STOXX Europe 600 |
| JP | `^N225` | Nikkei 225 |
| CN | `000001.SS` | Shanghai Composite |
| CN | `^HSI` | Hang Seng |
| CN | `399001.SZ` | Shenzhen Component |
| KR | `^KS11` | KOSPI (optionnel) |

**Forex — Top 10 pairs + DXY (11)** :

| Symbole | Pair |
|---------|------|
| `DX-Y.NYB` | Dollar Index |
| `EURUSD=X` | EUR/USD |
| `USDJPY=X` | USD/JPY |
| `GBPUSD=X` | GBP/USD |
| `USDCHF=X` | USD/CHF |
| `AUDUSD=X` | AUD/USD |
| `USDCAD=X` | USD/CAD |
| `NZDUSD=X` | NZD/USD |
| `EURGBP=X` | EUR/GBP |
| `EURJPY=X` | EUR/JPY |
| `GBPJPY=X` | GBP/JPY |

**Commodities (8)** :

| Symbole | Nom | Raison |
|---------|-----|--------|
| `GC=F` | Or | Valeur refuge, inflation |
| `SI=F` | Argent | Industriel + refuge |
| `HG=F` | Cuivre | Barometre economique mondial ("Dr. Copper") |
| `CL=F` | Petrole WTI | Geopolitique, inflation |
| `BZ=F` | Brent | Reference europeenne |
| `NG=F` | Gaz naturel | Energie, saisonnalite |
| `ZW=F` | Ble | Geopolitique (Russie/Ukraine) |
| `PL=F` | Platine | Industriel + auto |

**Crypto (3)** :

| Symbole | Nom |
|---------|-----|
| `BTC-USD` | Bitcoin |
| `ETH-USD` | Ethereum |
| `SOL-USD` | Solana |

Note : les stablecoins (USDT, USDC) ne sont pas dans la watchlist OHLC.
Leur monitoring se fait via news RSS (detection de depeg events).

**ETFs sectoriels US (3)** :

| Symbole | Nom |
|---------|-----|
| `XLK` | Tech |
| `XLF` | Financials |
| `XLE` | Energy |

**Total : 38 assets** avec analyse multi-timeframe complete.

#### A.1c Analyse multi-timeframe (3 niveaux)

Pour chaque asset de la watchlist, on recupere 2 series de candles Yahoo (pas 3 — le 1 an est un sous-ensemble du 3 ans) :

| Niveau | Intervalle Yahoo | Range | Candles/asset | Ce que ca revele |
|--------|-----------------|-------|:---:|------------------|
| **Macro** | `interval=1wk` | `range=10y` | ~520 | Tendance seculaire, ATH/ATL, S/R majeurs |
| **Moyen terme** | `interval=1d` | `range=3y` | ~750 | 200 DMA, 50 DMA, cycles, patterns |
| **Court terme** | (slice du 3y) | (derniere annee) | ~250 | Tendance recente, breakouts, momentum |

**On n'envoie PAS les candles brutes au LLM.** On calcule des indicateurs et on envoie un resume structure :

```typescript
interface AssetAnalysis {
  symbol: string;
  name: string;
  category: "index" | "forex" | "commodity" | "crypto" | "etf";

  // Prix actuel (intraday)
  price: number;
  changePct: number;

  // Niveau MACRO (weekly 10 ans)
  weekly10y: {
    trend: "bull" | "bear" | "range";
    distanceFromATH: number;         // ex: -5.2%
    distanceFromATL: number;         // ex: +340%
    majorSupport: number;
    majorResistance: number;
    ema52w: number;                  // EMA 52 semaines ≈ 200 DMA
  };

  // Niveau MOYEN TERME (daily 3 ans)
  daily3y: {
    trend: "bull" | "bear" | "range";
    sma200: number;
    sma50: number;
    rsi14: number;
    aboveSma200: boolean;
    goldenCross: boolean;            // SMA50 > SMA200
  };

  // Niveau COURT TERME (daily 1 an, slice du 3y)
  daily1y: {
    trend: "bull" | "bear" | "range";
    high52w: number;
    low52w: number;
    volatility20d: number;
    volumeVsAvg: number;             // ratio vs moyenne 20j
    recentBreakout: boolean;
  };
}
```

**Volume d'appels Yahoo** :
```
38 assets × 2 timeframes (weekly 10y + daily 3y) = 76 appels
+ 38 assets × 1 intraday (1h, 2j — existant)    = 38 appels
Total watchlist                                    = ~114 appels
```

**Strategie de cache candles** (reduit les appels au quotidien) :
Les candles weekly et daily ne changent que de 1 point par jour/semaine.
Pas besoin de re-fetcher 10 ans de weekly chaque jour.

```
Jour 1 (cold start) : fetch complet 38 × 2 = 76 appels → cache dans data/candles/
Jours suivants      : fetch seulement les candles recentes (range=5d + range=2wk)
                      → append au cache local → recalculer les indicateurs
                      = 38 × 2 = 76 appels mais avec des ranges COURTS (plus rapide)
```

Alternative plus simple : re-fetcher tout chaque jour (Yahoo gere bien les ranges longs)
et ne cacher que si on observe des rate limits. Le cache est une optimisation, pas un pre-requis.

Le LLM recoit 38 resumes structures au lieu de milliers de candles brutes.
Chaque resume pese ~200-300 tokens → ~8K-11K tokens pour l'ensemble de la watchlist.

#### A.1d Feeds RSS elargis (~30 feeds)

Passage de 8 a ~30 feeds, avec sources FR natives confirmees fonctionnelles (testees fev 2026).

**Yahoo Finance per-symbole (10 feeds, EN)** :
```
^GSPC, ^DJI, ^IXIC, ^FCHI      (indices)
GC=F, CL=F                      (commodities)
BTC-USD, ETH-USD                 (crypto)
EURUSD=X, DX-Y.NYB              (forex)
```
Note : ^VIX et SI=F retires des RSS car doublonnent trop avec ^GSPC et GC=F.
Yahoo per-symbole : 50-70% contenu unique par feed, sources pro (Barron's, MarketWatch, Zacks).

**Sources FR natives (6 feeds — TIER 1)** :
```
ZoneBourse        : https://www.zonebourse.com/sitemap/GOOGL5500A55A2Q1QS24QS9A87A/news-our-articles.rss
                    (~153 articles, volume massif, CAC + resultats + macro)
TradingSat/BFM    : https://www.tradingsat.com/rssbourse.xml
                    (~67 articles, recap CAC 40 quotidien, analyses actions FR)
Les Echos Marches : https://feeds.feedburner.com/lesechos/4MR4suAcqTl
                    (~20 articles, premium, macro + indices + previews J+1)
Les Echos Valeurs : https://feeds.feedburner.com/lesechos/BrFLB6ZLde7
                    (~20 articles, premium, analyse action par action)
L'Agefi           : https://www.agefi.fr/news/economie-marches.rss
                    (~30 articles, angle institutionnel, FMI, deficit, BCE)
EasyBourse        : https://www.easybourse.com/feeds/media/
                    (~20 articles, fil Reuters/AFP traduit en FR)
```

**CNBC (2 feeds, EN — journalisme pro)** :
```
CNBC Investing : https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069
CNBC Economy   : https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258
```

**Crypto specialise (2 feeds, EN)** :
```
CoinDesk      : https://www.coindesk.com/arc/outboundfeeds/rss/
                (~28 articles, top tier crypto)
CoinTelegraph : https://cointelegraph.com/rss
                (~40 articles, haut volume)
```

**Forex specialise (1 feed, EN)** :
```
FXStreet : https://www.fxstreet.com/rss/news
           (~30 articles, analyses forex pro)
```

**Investing.com FR (3 feeds, FR — complement thematique)** :
```
Commodities : https://fr.investing.com/rss/commodities.rss
Forex       : https://fr.investing.com/rss/forex.rss
Overview    : https://fr.investing.com/rss/market_overview.rss
```

**Google News cible (6 feeds, EN+FR — agregation multi-sources)** :
```
EN: "Federal Reserve ECB interest rate inflation"
EN: "gold oil commodity price"
EN: "bitcoin ethereum crypto market"
FR: "bourse CAC 40 Paris"
FR: "BCE Fed taux inflation"
FR: "or petrole matieres premieres"
```

**Total : ~30 feeds. Volume estime : 500-800 articles uniques/jour apres dedup.**

**Sources testees mais NON RETENUES** :
- MarketWatch : 403 (mort)
- Reuters : mort depuis 2020
- Bloomberg : contenu lifestyle melange, non fiable
- Boursorama : pas de RSS
- ABC Bourse, Bourse Direct, Boursier.com : 403 (anti-bot)
- Capital.fr : trop general (auto, immo melange)

**Complement API : Finnhub news** (on a deja la cle) :
- `GET /api/v1/news?category=general` — news marche generales
- `GET /api/v1/company-news?symbol=AAPL&from=...&to=...` — par symbole
- 60 req/min, centaines d'articles/jour
- Integre dans `fetchNews()` comme source supplementaire

**Architecture du fetcher** :
- `Promise.allSettled()` pour les 30+ feeds en parallele (pas sequentiel)
- Dedup par titre normalise (existant) + similarite Jaccard (mots, seuil 0.6)
- Chaque article enrichi avec `category` (indices, forex, commodities, crypto, macro, geopolitics) et `lang` (en/fr)
- Plus de `maxItems` — on retourne TOUT. Le formateur de prompt selectionne ensuite.

#### A.1e Stock screening elargi (~763 actions)

Scan quotidien des constituants des grands indices mondiaux via Yahoo batch quote.
Couverture inegale : full US/EU, leger Asie (top par capitalisation).

| Indice | Constituants scannes | Region | Justification |
|--------|:---:|--------|---------------|
| S&P 500 | ~503 | US | Marche directeur mondial |
| CAC 40 | 40 | FR | Audience cible |
| DAX 40 | 40 | DE | 1ere economie EU |
| FTSE 100 | 100 | UK | Place financiere majeure |
| Nikkei 225 | Top 50 | JP | Couverture Asie — top par market cap |
| Hang Seng | Top 30 | CN/HK | Proxy Chine accessible via Yahoo |
| **Total** | **~763** | | |

Fichiers constituants : `data/indices/{sp500,cac40,dax40,ftse100,nikkei50,hsi30}.json`
Mise a jour manuelle 1-2x/an (les reconstitutions sont annoncees a l'avance).

**Flow screening** :
```
1. Charger constituants depuis data/indices/*.json
2. Yahoo batch quote: GET /v7/finance/quote?symbols=AAPL,MSFT,...(50-100 par call)
   → ~16 calls pour 763 actions
3. Flag movers: |changePct| > 2% OU volume > 2x moyenne OU 52w high/low
   → ~20-40 actions flaggees par jour typique
4. Deep-dive flaggees: fetch candles daily 1 mois → EMA, RSI, S/R, breakout
   → ~30 calls supplementaires
5. Stocker dans snapshot.stockScreen (nouveau champ DailySnapshot)
```

```typescript
interface StockScreenResult {
  symbol: string;
  name: string;
  index: string;               // "SP500" | "CAC40" | "DAX40" | "FTSE100" | "NIKKEI50" | "HSI30"
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  high52w: number;
  low52w: number;
  reason: string[];            // ["mover_up", "volume_spike", "52w_high"]
  technicals?: TechnicalIndicators;  // seulement pour les movers (pass 2)
}
```

**Volume total d'appels Yahoo (watchlist + screening)** :
```
Watchlist multi-timeframe : 38 × 2 = 76 appels
Watchlist intraday        : 38 × 1 = 38 appels
Screening batch quote     : ~16 appels
Deep-dive movers          : ~30 appels
TOTAL                     : ~160 appels Yahoo
```
Raisonnable avec un delai de 100-200ms entre les appels.

#### A.2 Sources API existantes (deja implementees)

| Source | Donnees | Cle ? | Statut |
|--------|---------|-------|--------|
| Yahoo v8 Chart | OHLCV candles (1h + 1d + 1wk), 52w range | Non | FAIT |
| Yahoo v7 Quote | Batch quote 763 actions | Non | A faire |
| CoinGecko /global | BTC dominance, market cap crypto | Oui (gratuite) | FAIT |
| CoinGecko /trending | Top 15 trending coins | Non | FAIT |
| Alternative.me | Fear & Greed Index 0-100 | Non | FAIT |
| FRED | Treasury 10Y/2Y/spread | Oui (gratuite) | FAIT |
| Finnhub earnings | Calendrier earnings | Oui (gratuite) | FAIT |
| Finnhub news | News generales + per-symbol | Oui (gratuite) | A faire |
| Supabase | Calendrier eco ForexFactory 19K+ events | Oui (anon key) | FAIT |

#### A.3 Calculs techniques locaux (pas d'API)

Sur les candles multi-timeframe, calculer pour chaque asset de la watchlist :

**Weekly 10 ans** :
- Trend seculaire (EMA 52w direction)
- Distance ATH / ATL
- Support/Resistance majeurs (high/low significatifs)

**Daily 3 ans** :
- SMA 200 et SMA 50 (position relative + golden/death cross)
- RSI 14
- Trend direction

**Daily 1 an** (slice du 3 ans) :
- High/Low 52 semaines
- Volatilite 20 jours
- Volume vs moyenne 20 jours
- Detection breakout recent

**Sur les actions flaggees du screening** :
- EMA 9/21, RSI 14, S/R, trend
- Volume anomaly

#### A.4 Drama Score

Score d'importance par asset pour allocation dynamique du temps video :

```
dramaScore = (
  abs(changePct) * 3            // Amplitude du mouvement
  + volumeAnomaly * 2           // Volume inhabituel
  + breakingLevel * 5           // ATH, round number, S/R casse
  + newsCorrelation * 3         // L'asset est dans les news
  + crossAssetImpact * 2        // Mouvement correle notable
  + historicalContext * 4        // Plus gros move en N jours
)
```

Les 2-3 assets avec les plus hauts drama scores obtiennent un deep dive. Les autres passent dans le dashboard flash.

> QUESTION : les coefficients sont arbitraires. Il faudra les calibrer apres quelques episodes reels.
> Prevoir un fichier de config editable (`drama-weights.json`) plutot que des constantes hardcodees.

**Probleme identifie (audit fev. 2026 — comparaison vs Bondin/ZoneBourse) : le drama score ne capture pas l'importance editoriale**

Le drama score est purement quantitatif (amplitude × volume × breakout). Il est aveugle a la market cap et a la signification editoriale. Resultat observe :

- Solana +7.6% → drama=32.9 → deep dive #1 (210s)
- Apple -5% → drama~15 (dans le stockScreen SP500) → non cite
- Cisco -12% → non detecte (hors watchlist 38 assets)

Pourtant editorialement, Apple qui perd plus que la fortune de Bernard Arnault (200Md$) EST la story du jour — et Solana n'en est que la consequence indirecte.

**Pistes de solution a explorer avant Bloc C :**

Piste A — Ponderation par market cap :
```
dramaScore += log10(marketCap / 1e9) * 1.5   // Apple(3000Md) >> Solana(40Md)
```
Necessite de stocker la market cap dans AssetSnapshot (deja disponible depuis Yahoo Finance).

Piste B — Categorie editoriale dans les weights :
- Assets "phares" (SPX, NDX, CAC, Gold, BTC) : multiplicateur x1.3
- Crypto altcoins : multiplicateur x0.7 (volatils mais editorialement secondaires pour audience FR)
- Forex mineurs : multiplicateur x0.6

Piste C — Score d'importance contextuelle (heuristique) :
- Si l'asset est cite dans >5 news du jour → boost +4
- Si l'asset est le top mover du stockScreen par valeur absolue de perte marche → boost +6
- Si l'asset est dans un indice majeur avec >50Md$ de market cap → boost +3

**Decision : ne pas implementer avant d'avoir 5-10 episodes de reference.** Observer le pattern sur plusieurs episodes, puis calibrer. Documenter les cas ou le drama score "rate" la story principale pour alimenter le calibrage.

#### A.5 Type EnrichedSnapshot

Nouveau type dans `core/types.ts` qui ETEND `DailySnapshot` :

```typescript
interface EnrichedSnapshot extends DailySnapshot {
  // Macro
  vix: number
  fearGreedIndex: number
  fearGreedLabel: string
  yieldUS10Y: number
  yieldUS2Y: number
  yieldSpread: number              // 10Y - 2Y

  // Crypto global
  btcDominance: number
  totalCryptoMarketCap: number
  topCryptoMovers: Array<{ symbol: string; changePct: number }>

  // Calculs techniques par asset
  technicals: Record<string, {
    supports: number[]
    resistances: number[]
    trend: "bullish" | "bearish" | "neutral"
    ema9: number
    ema21: number
    volumeAnomaly: number
    isATH: boolean
    isATL: boolean
    dramaScore: number
  }>

  // Correlations notables (3-5 max, PAS une matrice 38x38)
  notableCorrelations: Array<{
    pair: [string, string];
    expected: "positive" | "inverse";
    actual: "confirmed" | "divergent";
    signal?: string;           // "flight-to-safety" si divergent
  }>

  // Calendrier
  calendarToday: EconomicEvent[]
  calendarTomorrow: EconomicEvent[]

  // Meta
  moodMarche: "risk-on" | "risk-off" | "incertain" | "rotation"
  topDramaAssets: string[]         // Top 3 par drama score
}
```

> DECISION : `moodMarche` est calcule en CODE, pas par LLM. 20 lignes de regles deterministes :
> VIX > 25 && S&P < -1% = "risk-off", VIX < 18 && S&P > 0.5% = "risk-on",
> ETFs sectoriels divergent significativement = "rotation", sinon "incertain".
> Le LLM recoit le mood calcule et adapte le ton du script en consequence.

#### Livrable Bloc A
Fonction `fetchEnrichedSnapshot(date)` qui retourne un `EnrichedSnapshot` complet :
- 38 assets avec analyse multi-timeframe (weekly 10y, daily 3y, intraday 2j)
- ~500-800 news articles (RSS ~30 feeds + Finnhub news API)
- Stock screening ~763 actions avec movers flagges
- Calendrier eco Supabase (J-1, J, J+7) + earnings Finnhub
- Yields FRED, sentiment CoinGecko/Alternative.me
- Indicateurs techniques calcules a chaque timeframe

---

### Bloc A2 — Market Intelligence

**Dependances** : Bloc A (snapshot enrichi), Bloc D2 (News Memory)
**Impact** : transforme le pipeline d'un "commentateur du jour" en "desk d'analyse" avec vision passee, presente et future
**Code** : screening dans `@yt-maker/data`, analyse causale + scenarios dans `@yt-maker/ai`

> Ce bloc est le cerveau analytique du pipeline. Il combine 3 axes temporels
> (passe, present, futur) et 2 sources (prix, news) en croisant les signaux
> pour produire une analyse causale que le LLM Writer recoit pre-machee.

#### A2.1 Vision d'ensemble — Le chasse-croise

L'analyse fonctionne en chasse-croise entre prix et news :

```
Chemin A : Prix → Pourquoi ?
  Gros mouvement detecte (NVDA +8%)
  → Chercher dans le News RAG : "Nvidia earnings beat"
  → Verifier le timing : article 16h, mouvement 16h30 → ✅ causal
  → Croiser : Nasdaq +1.2% en meme temps → confirme l'impact sectoriel

Chemin B : News → Verifie ?
  Article "Fed signals pause"
  → Verifier dans le Market RAG : dollar a baisse ? or a monte ? yields ?
  → Si oui → lien causal confirme, impact = high
  → Si non → article non market-moving, impact = low

Les deux chemins se croisent et se CONFIRMENT mutuellement.
```

#### A2.2 Market RAG — Scanner ~763 actions quotidiennement

Le scan journalier est deja decrit en detail dans Bloc A (section A.1e).
Ici on se concentre sur le STOCKAGE et la REQUETE historique.

**Constituants** (listes statiques, maj 1-2x/an) :
- S&P 500 : ~503 actions
- CAC 40 : 40 actions
- DAX 40 : 40 actions
- FTSE 100 : 100 actions
- Nikkei 225 : top 50 (par market cap)
- Hang Seng : top 30 (proxy Chine)
- Total : ~763 actions uniques

**Storage SQLite** (table `market_daily`) :
```sql
CREATE TABLE market_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL,
  change_pct REAL,
  volume REAL,
  volume_avg REAL,
  is_mover BOOLEAN DEFAULT 0,
  mover_reason TEXT,              -- "price_move", "volume_anomaly", "52w_high"
  sector TEXT,
  index_membership TEXT,          -- "SP500,NASDAQ" etc
  UNIQUE(symbol, date)
);

CREATE TABLE market_technicals (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  ema9 REAL, ema21 REAL, rsi14 REAL,
  trend TEXT,
  supports TEXT,                  -- JSON array
  resistances TEXT,               -- JSON array
  drama_score REAL,
  PRIMARY KEY(symbol, date)
);
```

**Scale** : ~700 lignes/jour × 250 jours/an = ~175K lignes/an. SQLite gere sans probleme.

Queries :
- `getTopMovers(date)` → actions avec les plus gros mouvements
- `getMoversForSector(sector, days)` → rotation sectorielle
- `getHistory(symbol, days)` → historique prix d'une action
- `findBreakouts(date)` → actions cassant un niveau technique

#### A2.3 Analyse causale — Le croisement (CODE, pas LLM)

Le step central qui croise prix et news. **Entierement en code deterministe** — pas d'appel LLM.
Le LLM scripteur (Opus) recoit le resultat pre-formate et construit le recit lui-meme.

```typescript
interface CausalLink {
  asset: string;
  movement: string;            // "+2.5% en 2h"
  cause: {
    type: "news" | "event" | "contagion" | "technical" | "unknown";
    source?: string;           // Article title ou event name
    confidence: "high" | "medium" | "low";
  };
  correlatedAssets: string[];  // Autres assets qui bougent dans la meme direction attendue
}

interface CausalBrief {
  date: string;
  links: CausalLink[];
  unexplainedMoves: string[];  // Mouvements sans cause identifiee
  notableCorrelations: Array<{ // 3-5 max, PAS une matrice 38x38
    pair: [string, string];
    expected: "positive" | "inverse";
    actual: "confirmed" | "divergent";
    signal?: string;           // "flight-to-safety" si divergent
  }>;
}
```

Le flow (100% code) :
```
1. Identifier movers : |changePct| > seuil dans watchlist + stockScreen
2. Pour chaque mover : query SQLite article_assets → articles recents sur cet asset
3. Pour chaque mover : query economic_events → events du jour pour cette devise/region
4. Matching simple : si articles trouvés → cause = "news", sinon si event → "event", sinon "unknown"
5. Correlations notables : comparer les pairs connues (intermarket.md) avec les mouvements reels
   → Si DXY up ET XAUUSD up → divergent → "flight-to-safety"
   → 20 lignes de regles basees sur knowledge/intermarket.md
6. Formater en CausalBrief → injecter dans le prompt Opus
```

Avantage : 0$ de cout LLM, execution instantanee, resultat deterministe et testable.
Opus recoit le brief et construit les phrases causales dans le script ("l'or monte PARCE QUE...").

#### A2.4 Calendrier forward — Scenarios hypothetiques

Ne pas seulement analyser le passe : ANTICIPER l'avenir.

**Sources du calendrier forward** :
- Finnhub earnings calendar (fonctionne — 159 events aujourd'hui)
- Calendrier economique (alternative a Finnhub — a integrer)
- Dates banques centrales (statiques : FOMC, BCE, BoJ, BoE — 8 reunions/an chacune)

**Generation de scenarios** (Haiku) :

Pour chaque event important a venir (J+1 a J+7) :

```typescript
interface ForwardScenario {
  event: string;               // "US Non-Farm Payrolls"
  date: string;                // "2026-02-21"
  consensus?: string;          // "180K jobs"

  scenarios: Array<{
    condition: string;         // "NFP > 200K (hot labor market)"
    probability: "likely" | "possible" | "unlikely";
    impacts: Array<{
      asset: string;
      direction: "up" | "down";
      magnitude: "strong" | "moderate" | "slight";
      reasoning: string;
    }>;
  }>;

  watchLevels: Array<{
    asset: string;
    level: number;
    significance: string;     // "Resistance 52 semaines"
  }>;
}
```

Exemple genere :
```
Event: NFP vendredi 14h30
Consensus: 180K

Scenario A (NFP > 220K — marché de l'emploi tendu) :
  → Dollar ↑ fort (la Fed ne peut pas baisser)
  → Or ↓ modere (yields remontent)
  → S&P ↓ leger (crainte de taux plus hauts)
  A surveiller : DXY resistance a 98.50, or support a $4900

Scenario B (NFP < 150K — ralentissement) :
  → Dollar ↓ fort (la Fed va devoir agir)
  → Or ↑ fort (anticipation de baisse de taux)
  → S&P ↑ modere (good news = bad news inversee)
  A surveiller : or resistance $5100, S&P 6900
```

**Le cycle vertueux** :
```
Jour N   : Generer scenarios pour NFP de vendredi
Jour N+1 : Rappeler les scenarios dans l'episode ("demain c'est NFP, voici les scenarios")
Vendredi : NFP publie → quel scenario s'est realise ?
           → Suivi J+1 : "notre scenario A s'est joue, le dollar a effectivement..."
           → Credibilite + retention viewer (il revient pour savoir)
```

C'est LE mecanisme de retention : le viewer revient chaque jour pour voir si les scenarios se realisent.

#### A2.5 Architecture complete — Les 3 axes temporels

```
     PASSE                      PRESENT                     FUTUR
  ┌──────────────┐         ┌──────────────┐         ┌──────────────────┐
  │ News RAG     │         │ ~763 actions │         │ Calendrier eco   │
  │ (articles    │         │ scannees     │         │ (J+1 a J+7)      │
  │ des 14 derniers│       │ + 38 macro   │         │ Earnings a venir │
  │ jours)       │         │ multi-TF     │         │ Dates banques    │
  ├──────────────┤         ├──────────────┤         │ centrales        │
  │ Market RAG   │         │ Movers       │         ├──────────────────┤
  │ (prix des    │         │ flagges      │         │ ForwardScenarios │
  │ 14 derniers  │         │ (~30/jour)   │         │ (templates code  │
  │ jours)       │         │              │         │ + donnees eco)   │
  └──────┬───────┘         └──────┬───────┘         └────────┬─────────┘
         │                        │                          │
         └────────────┬───────────┘                          │
                      ▼                                      │
              ┌───────────────┐                              │
              │ CAUSAL        │                              │
              │ ANALYSIS      │◄─────────────────────────────┘
              │ (CODE)        │
              │               │
              │ SQL queries + │
              │ regles inter- │
              │ market +      │
              │ correlations  │
              └───────┬───────┘
                      │
                CausalBrief + ForwardScenarios
                      │
                      ▼
              ┌───────────────┐
              │ SCRIPT (Opus) │
              │ Recoit brief  │
              │ pre-formate + │
              │ scenarios     │
              │ conditionnels │
              └───────────────┘
```

#### A2.6 Cout et scale

| Operation | Volume | Frequence | Cout |
|-----------|--------|-----------|------|
| Screen ~763 actions (Yahoo batch) | ~16 calls | Quotidien | 0$ |
| Watchlist 38 assets multi-timeframe | ~114 calls | Quotidien | 0$ |
| Deep-dive ~30 movers (candles) | ~30 calls | Quotidien | 0$ |
| Storage SQLite (market_daily) | ~800 lignes | Quotidien | 0$ |
| RSS ~30 feeds | ~30 calls HTTP | Quotidien | 0$ |
| Finnhub news API | 2-5 calls | Quotidien | 0$ |
| Analyse causale (CODE) | — | Quotidien | 0$ |
| Scenarios forward (Haiku) | 1 call | Quotidien | ~0.30$/mois |
| **Total Bloc A2** | | | **~0.30$/mois** |

En 1 an : ~200K lignes prix + ~25K articles tagues. SQLite gere sans probleme (<10ms queries).

Les listes de constituants (S&P 500, CAC 40, DAX 40, FTSE 100, Nikkei top 50, HSI top 30)
sont des fichiers JSON statiques dans `data/indices/`.
Mise a jour manuelle 1-2x/an (les reconstitutions d'indices sont annoncees a l'avance).

#### A2.7 Dependances et ordre

```
Bloc A Phase 2 → Bloc D2 (News Memory) → Bloc A2 (Market Intelligence)
                                              │
                                              ├── A2.2 Market RAG (peut commencer independamment)
                                              ├── A2.3 Causal Analysis (depend de D2 + A2.2)
                                              └── A2.4 Forward Calendar (depend du calendrier eco)
```

A2.2 (screen actions) peut etre construit avant D2 (News Memory) car il est independant.
A2.3 (analyse causale) a besoin des deux RAGs pour croiser les signaux.
A2.4 (scenarios forward) a besoin du calendrier economique fonctionnel.

#### Livrable Bloc A2
Fonctions dans `@yt-maker/data` : `screenAllStocks()`, `flagMovers()`, `deepDiveMovers()`.
Fonctions dans `@yt-maker/ai` : `buildCausalBrief()` (code), `generateForwardScenarios()` (Haiku).
Integration pipeline : fetch → screen → tag (code) → cross-analyze (code) → scenarios (Haiku) → script (Opus).

---

### Bloc B — Knowledge Base

**Dependances** : aucune (peut etre fait en parallele du Bloc A)
**Impact** : donne au LLM le contexte d'un analyste pro — transforme la qualite narrative

#### B.1 Fiches de connaissance

Emplacement : `packages/ai/src/knowledge/`

| Fiche | Statut | Contenu | Quand injectee |
|-------|--------|---------|----------------|
| `technical-analysis.md` | FAIT | EMA 9/21, RSI 14, S/R, volume, ATH/ATL, combinaisons | Pour chaque deep dive asset |
| `intermarket.md` | FAIT | Correlations (DXY/or, VIX/S&P, taux/tech, petrole/inflation, BTC/Nasdaq), regimes, decorrelations | Toujours |
| `macro-indicators.md` | FAIT | VIX zones, yields, yield curve, DXY, F&G, events eco (NFP, CPI, FOMC) | Toujours + renforce quand event macro |
| `narrative-patterns.md` | FAIT | 5 patterns, structure episode, regles narration, criteres qualite script | Toujours |
| `central-banks.md` | A FAIRE | Fed, BCE, BoJ : politique actuelle, biais, prochaines reunions | Quand event banque centrale |
| `asset-profiles.md` | A FAIRE | Drivers fondamentaux de chaque asset (or, BTC, EUR/USD, S&P, petrole) | Pour chaque deep dive asset |
| `seasonal-patterns.md` | A FAIRE (V1.5) | Sell in May, Santa rally, window dressing, expirations | Quand pattern saisonnier actif |

#### B.2 Knowledge Loader

RAG simplifie (pas de vector DB, pas d'embeddings) :

1. Analyse `EnrichedSnapshot` → detecte les themes (quels assets bougent, quels events, quel regime)
2. Selectionne les sections pertinentes (pas tout le fichier, juste les paragraphes utiles)
3. Injecte dans le system prompt comme bloc `[CONTEXTE ANALYSTE]`

Taille cible du contexte injecte : **500-1500 tokens** (pas plus, sinon dilution).

> QUESTION : le loader doit-il utiliser un LLM (Haiku) pour selectionner les sections pertinentes,
> ou un systeme de tags/keywords simples suffit ?
> Recommandation V1 : tags simples. Si la qualite est insuffisante, passer a Haiku.

#### Livrable Bloc B
Fiches markdown ecrites + `loadKnowledge(snapshot: EnrichedSnapshot): string` qui retourne le contexte pertinent.

---

### Bloc C — Prompts multi-couches (C1 → C10)

**Dependances** : Bloc A (EnrichedSnapshot) + Bloc B (knowledge base) + Bloc D (EpisodeMemory) + Bloc MarketMemory
**Impact** : c'est LE coeur du produit — la qualite du script fait ou defait la video

> **DÉCISION FONDAMENTALE v3** : le Bloc C n'est plus UN prompt Opus monolithique.
> C'est 5 prompts sequentiels avec responsabilites strictement separees (C1→C5),
> plus 5 prompts production (C6→C10). Chaque couche recoit exactement ce dont elle a besoin.

#### C.1 — C1 : Prompt sélection éditoriale (Haiku, ~25s)

**Rôle unique** : décider ce que le code ne peut pas décider.

Input reçu :
- Snapshot P1 annoté (scores numériques par actif)
- market_weekly_brief.json (MarketMemory hebdomadaire)
- EpisodeMemory J-1 à J-3 (résumé des angles couverts)

Ce que C1 décide :
- Cette news est-elle vraiment liée à cet actif ? (pas juste co-occurrence de mots)
- Y a-t-il une continuité narrative depuis J-1 à exploiter ?
- Quel angle éditorial aujourd'hui ? (rupture de tendance, confirmation, surprise)
- Attribution de chaque actif : `DEEP` / `FOCUS` / `FLASH` / `skip`
- Ordre narratif global (quel actif ouvre, lequel clôture)

**Règle critique** : si un actif est classé DEEP, cela garantit qu'il y a matière à chaîne causale. C1 ne classe pas DEEP un actif sans raison narrative solide.

Output → `editorial_plan.json` : liste ordonnée avec type + raison éditoriale par actif.

#### C.2 — C2 : Prompt analyse analytique (Sonnet, ~60s)

**Rôle unique** : produire la matière analytique. Ne pas écrire le script.

Input reçu :
- editorial_plan.json (actifs DEEP/FOCUS/FLASH uniquement)
- MarketMemory JSONs pour chaque actif sélectionné (zones, last_events, regime)
- Knowledge Base sélectionnée (intermarket, AT, macro, asset-profiles pertinents)
- EpisodeMemory (niveaux mentionnés J-1 à J-5)
- CausalBrief (Bloc A2)

Ce que C2 produit pour chaque actif DEEP :
- Chaîne causale complète ("or monte PARCE QUE DXY faiblit PARCE QUE...")
- Scénario haussier chiffré avec niveau d'invalidation
- Scénario baissier chiffré avec niveau d'invalidation
- Continuité J-1 explicite ("niveau 8400 testé hier, maintenant cassé")
- chart_instructions SÉMANTIQUES (pas de timing — décidé en C5) :
  - "afficher support 8400 avec label 'support J-1'"
  - "marquer la zone de cassure EMA21"
  - "overlay volume avec barre rouge sur la bougie de rupture"

Ce que C2 ne fait PAS : écrire la narration. Seulement la matière.

Output → `analytical_brief.json`

#### C.3 — C3 : Prompt rédaction narrative (Opus, ~90s)

**Rôle unique** : écrire. Ne décide rien, n'analyse rien.

Input reçu :
- editorial_plan.json (structure + ordre)
- analytical_brief.json (toute la matière analytique)
- EpisodeMemory J-3 (formulations déjà utilisées à éviter)
- Few-shot exemples Bondain/Zonebourse (3-4 extraits injectés pour registre oral naturel)
- Compliance AMF (vocabulaire interdit/autorisé)

Ce que C3 écrit :
- Cold open (1 phrase choc, élément date-spécifique, jamais générique)
- Narration de chaque segment dans l'ordre défini par C1
- Variation de formulations vs J-3 (pas "on observe que" 3 fois de suite)
- Ton oral naturel, tutoiement, phrases courtes
- Respect strict du conditionnel AMF

Ce que C3 ne décide PAS :
- L'ordre des segments (C1)
- Les chiffres (C2)
- Les transitions (C5)
- Les timings (C5)

Output → `episode_draft.json`

#### C.4 — C4 : Prompt validation (Haiku, ~20s) — SEULE BOUCLE

**Rôle unique** : détecter les violations. Max 2 passes.

Check CODE (avant C4, mécanique) :
- Drama score absent dans sections qui devaient en avoir
- Durées totales hors specs (7-11 min)
- Disclaimer absent
- Chiffres incohérents avec snapshot (±1%)
- Répétitions de formulations vs J-3

Check C4 HAIKU (sémantique) :
- Recommandation directe déguisée ("ce niveau est une excellente entrée...")
- Ton "retail" glissé ("cette opportunité ne se représente pas...")
- Cohérence temporelle ambiguë (mélange ouverture EU / clôture US sans préciser)
- Vocabulaire AMF interdit passé entre les mailles du code

Si violations → retour à C3 avec liste précise des problèmes.
Max 2 itérations → sinon alerte Discord + review manuelle.

#### C.5 — C5 : Prompt direction globale (Sonnet, ~35s)

**Rôle unique** : mettre en scène l'épisode entier. Seul LLM qui voit tout.

Input reçu :
- episode_draft.json validé (épisode complet)
- Liste des transitions Remotion disponibles (injectée dans le prompt)
- Liste des tags musicaux disponibles
- Drama scores par segment

Ce que C5 décide :
- Arc de tension global : montée → pic → respiration → closing
- Transitions entre chaque segment (type, durée ms, effet sonore) depuis la liste Remotion
- Mood musical global → tag parmi liste prédéfinie → transmis à la branche musique
- Timing des chart_instructions (horodatées par rapport à la durée audio estimée)
- Thumbnail moment : quel segment a le plus fort potentiel CTR, quelle frame

Output → `episode_directed.json` (fichier maître consommé par Remotion en P8)

#### C.6 — C10 : Prompts production (voir Pipeline P7 et P9)

Ces couches sont documentées dans les Blocs F et G.
Résumé :
- C6 (Haiku) : adaptation TTS (raccourcit phrases, SSML pauses, supprime refs visuelles)
- C7 (Sonnet) : direction artistique visuelle (cohérence globale en 1 appel pour tous segments)
- C8 (Haiku) : prompts Midjourney/Flux optimisés (switching paramétrable sans toucher LLM)
- C9 (Haiku) : 2 prompts Flux variants A/B pour thumbnails depuis thumbnail_moment C5
- C10 (Haiku) : SEOPackage complet (titre, description, chapitres, tags)

#### C.7 Segments disponibles (inchangés, allocation décidée par C1/C5)

| Segment | Duree | Obligatoire |
|---------|-------|-------------|
| Cold open (hook) | 5-10s | Oui — UNE phrase choc |
| Titre anime (title_card) | 3-5s | Oui |
| Fil conducteur (thread) | 15-25s | Oui — theme dominant + cascade |
| Segments thematiques (segment x4-7) | 300-420s total | Oui — DEEP/FOCUS/FLASH |
| Closing | 20-30s | Oui — retour fil rouge + CTA |

**Note** : La section previously_on/suivi J-1 n'existe plus. Les references au passe s'integrent naturellement dans les segments concernes via la memoire contextuelle.

#### C.8 Injection stockScreen dans le prompt C3 (problème densité — résolution)

**Probleme identifie (audit fev. 2026)** : le stockScreen detecte 77 movers mais seuls 15 etaient injectes. Le LLM n'en utilisait que 2-3.

**Solutions implementees dans C2 et C3** :

Solution 1 — C2 remonte les top 5 movers du stockScreen en tête de l'analytical_brief
- Les top 5 par amplitude → "urgences du jour" avec chaîne causale si disponible

Solution 2 — Slice augmenté à 30 movers dans C2, groupés par indice :
```
## Top movers par indice (screening 763 actions)
### SP500 (top 8 movers)
### CAC40 (top 5 movers)
### DAX (top 3 movers)
```

Solution 3 — Section "actu societes" dans C3 :
Segment dédié 60-90s, 8-12 sociétés, format flash info ("X fait +Y% parce que Z").
Instruction explicite dans C3 : ce segment DOIT mentionner au moins 8 movers en narration rapide.

#### C.9 Type EnrichedEpisodeScript

Nouveau type dans `core/types.ts` :

```typescript
interface EnrichedEpisodeScript {
  episodeNumber: number
  date: string
  type: EpisodeType
  lang: Language
  title: string
  description: string
  tags: string[]

  // Narratif
  coldOpen: string
  dominantTheme: string
  moodMarche: "risk-on" | "risk-off" | "incertain" | "rotation"
  couleurDominante: string

  // Suivi J-1
  suiviJ1: {
    predictions: Array<{
      asset: string
      prediction: string
      realite: string
      correct: boolean
    }>
    narration: string
  }

  // Contenu unique quotidien
  surpriseDuJour: string
  questionCTA: {
    question: string
    optionA: string
    optionB: string
  }

  // Sections dynamiques
  sections: EnrichedSection[]
  threeKeyPoints: string[]
  teaserTomorrow: string
  disclaimer: string
  totalDurationSec: number
}
```

#### Livrable Bloc C
5 prompts séquentiels C1→C5 + 5 prompts production C6→C10.
Type `EnrichedEpisodeScript` dans types.ts.
Tests via Prompt Studio pour chaque couche indépendamment.
`episode_directed.json` comme contrat d'interface entre C5 et Remotion.

---

### Bloc D — Episode Memory

**Dependances** : Bloc C (le type EnrichedEpisodeScript doit exister pour savoir quoi sauvegarder)
**Impact** : continuite narrative = pilier anti-demonetisation + credibilite

#### D.1 Ce qu'on sauvegarde par episode

```typescript
interface EpisodeMemory {
  episodeNumber: number
  date: string
  lang: Language

  // Predictions faites
  predictions: Array<{
    asset: string
    biais: "haussier" | "baissier" | "neutre"
    niveauCle: string
    scenario: string
  }>

  // Resultats J+1 (rempli le lendemain)
  resultatsJ1?: Array<{
    asset: string
    correct: boolean
    prixReel: string
    ecart: string
  }>

  // Meta pour continuite
  dominantTheme: string
  moodMarche: string
  surpriseDuJour: string
  threeKeyPoints: string[]
  teaserTomorrow: string

  // Niveaux cles mentionnes
  niveauxMentionnes: Array<{
    asset: string
    niveau: string
    type: "support" | "resistance" | "pivot" | "psychologique"
  }>
}
```

#### D.2 Cycle de vie

1. **Fin de generation J** : extraire `EpisodeMemory` du script genere → sauvegarder dans `/data/episodes/memory-DATE.json`
2. **Debut pipeline J+1** : fetch prix reels → comparer avec predictions J → remplir `resultatsJ1`
3. **Injection prompt J+1** : charger les 5 derniers memories → formater en texte → injecter dans le system prompt

#### D.3 Regles

- 15 episodes max en contexte (degraded: J-1 to J-3 detailed, J-4 to J-7 summary, J-8 to J-15 thread only)
- Niveaux cles expires apres 10 jours (sauf si retestes)
- Les references au passe s'integrent naturellement dans les segments (pas de section dediee)
- Les predictions fausses sont aussi importantes que les correctes

> QUESTION : faut-il un `EpisodeMemory` simplifie pour le Bloc C (prompt) ou est-ce qu'on peut
> developper C et D simultanement ? Recommandation : developper C d'abord avec un mock memory,
> puis brancher D quand la structure est stabilisee.

#### Livrable Bloc D
`saveEpisodeMemory(script)`, `loadLastNEpisodes(n)`, `buildMemoryContext(memories)`.

---

### Bloc D2 — News Memory & Research Brief

**Dependances** : Bloc A (snapshot enrichi)
**Impact** : transforme le LLM d'un commentateur du jour en analyste avec memoire historique
**Code** : dans `@yt-maker/ai/memory/` (pas de package separe — ~400 lignes de code total)

#### D2.1 Concept

Le LLM ecrit aujourd'hui a partir des donnees du jour uniquement. Avec News Memory,
il fait une etape de RECHERCHE avant d'ecrire : il interroge une base d'articles accumules
pour comprendre le contexte historique de chaque mouvement.

Pipeline en 2 etapes :
```
Etape 1 — Ingest (a chaque fetch, 0$/jour — code pur)
  fetchNews() → tous articles → tagArticles(rules-based) → SQLite store

Etape 2 — Research (avant chaque script, 0$/jour — SQL queries)
  DailySnapshot → identifier top movers
  → query SQLite par asset + theme (fenetres variables : 7j pour contexte immédiat, 90j pour themes recurrents)
  → formatResearchContext() construit le contexte en code
  → Le contexte est injecte dans le prompt du Writer (Opus)
```

Resultat : le LLM peut ecrire "L'or franchit les $5000, 3eme seance consecutive de hausse
depuis que les tensions US-Iran se sont intensifiees le 12 fevrier" au lieu de juste constater le prix.

**Retention cible : 6 mois minimum (180 jours)**

Pourquoi 6 mois et pas 7 jours :
- 7 jours : contexte de la semaine uniquement (momentum tres court terme)
- 30 jours : un cycle macro Fed (reunions toutes les 6 semaines), une earnings saison
- 90 jours : tendances geopolitiques (tensions Iran qui durent 3 mois), rotations sectorielles
- 6 mois : deux earnings seasons, comparaisons saisonnieres (or en debut d'annee, crypto apres halving)
- 1 an : "il y a un an Bitcoin etait a X" — references temporelles dans la narration

A 600 articles/jour x 180 jours = ~108 000 articles. SQLite + FTS5 gere facilement 500K+ lignes
avec des queries < 10ms. Stockage : ~80-100 Mo. Aucune raison de se limiter a 7 jours.

Nettoyage : DELETE articles WHERE published_at < date('now', '-180 days') — cron mensuel.

#### D2.2 Tagging rules-based (CODE, pas LLM)

A l'ingest, chaque article est tague par un systeme de regles deterministe.
**Les regles doivent etre extremement bien concues — c'est un chantier de reflexion a part entiere.**

```typescript
interface NewsTags {
  assets: string[];           // ex: ["XAUUSD", "DXY", "SPX"]
  themes: MacroTheme[];       // ex: ["monetary_policy", "geopolitics"]
  impact: "high" | "medium" | "low";
}

type MacroTheme =
  | "monetary_policy"    // Fed, ECB, BOJ
  | "inflation"          // CPI, PPI, wages
  | "employment"         // NFP, unemployment
  | "geopolitics"        // Wars, sanctions, trade
  | "earnings"           // Corporate results
  | "regulation"         // Crypto reg, banking rules
  | "commodities"        // Supply/demand, OPEC
  | "technical"          // Breakouts, key levels
  | "risk_sentiment"     // Risk-on/off, VIX, F&G
  | "other";
```

**Approche du tagging rules-based** :

Couche 1 — Matching direct (couvre ~60% des cas) :
- Noms d'assets dans le titre/summary : "gold", "or", "XAUUSD", "S&P", "Bitcoin", etc.
- Noms de societes → mapping vers leur symbole et index
- Noms d'institutions : "Fed", "ECB", "OPEC", "FMI"

Couche 2 — Regles causales (couvre ~20% supplementaires) :
- "Fed" + "pause|cut|hold|hike" → tag [XAUUSD, DXY, SPX, US10Y] + theme monetary_policy
- "OPEC" + "cut|production|quota" → tag [CL=F, BZ=F] + theme commodities
- "inflation|CPI|PPI" → tag [XAUUSD, DXY, ^VIX] + theme inflation
- "tariff|sanctions|trade war" → tag [DXY, ^GSPC] + theme geopolitics
- "earnings|revenue|profit" + company_name → tag company + theme earnings

Couche 3 — Metadata source (couvre le reste) :
- Source = "CoinDesk" ou "CoinTelegraph" → theme = crypto
- Source = "FXStreet" → theme = forex
- Feed category (deja renseignee dans le RSS) → theme par defaut

**Impact scoring** :
- Source tier 1 (Reuters, Les Echos, CNBC) + keyword fort = "high"
- Source tier 2 + keyword modere = "medium"
- Blog/generique = "low"

> NOTE : Les regles causales (couche 2) sont le morceau critique. Elles encodent les MEMES
> correlations que knowledge/intermarket.md. Il faudra un fichier de config dedie
> (`data/tagging-rules.json` ou `ai/knowledge/tagging-rules.ts`) a brainstormer en profondeur.
> Ce brainstorm est un pre-requis avant l'implementation du Bloc D2.

> UPGRADE PATH : si les regles s'averent insuffisantes apres analyse des resultats sur 2-4 semaines,
> ajouter un appel Haiku en enrichissement pour les articles classes "other" ou a faible confidence.

#### D2.3 Storage : SQLite + FTS5

Un seul fichier : `data/news-memory.db`. Pas de vector DB (overkill a ~219K articles/an).
Volume reel avec retention 6 mois : ~108K articles en DB a tout moment (600/jour × 180 jours).
SQLite + FTS5 gere facilement 500K+ lignes avec queries < 10ms, stockage ~80-100 Mo.

```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  published_at TEXT NOT NULL,
  summary TEXT,
  digest TEXT,                     -- Resume LLM 1 ligne
  impact TEXT,                     -- high/medium/low
  snapshot_date TEXT
);

CREATE VIRTUAL TABLE articles_fts USING fts5(
  title, summary, digest,
  content=articles, content_rowid=id,
  tokenize='porter unicode61'      -- Stemming + Unicode
);

CREATE TABLE article_assets (
  article_id INTEGER REFERENCES articles(id),
  asset_symbol TEXT NOT NULL,
  sentiment TEXT,                   -- bullish/bearish/neutral
  confidence TEXT,                  -- high/medium/low
  PRIMARY KEY (article_id, asset_symbol)
);

CREATE TABLE article_themes (
  article_id INTEGER REFERENCES articles(id),
  theme TEXT NOT NULL,
  PRIMARY KEY (article_id, theme)
);
```

Queries principales :
- `searchByAsset(symbol, { days: 7 })` — contexte immédiat d'un asset (7j)
- `searchByAsset(symbol, { days: 90 })` — themes recurrents sur un asset (90j)
- `searchByTheme(theme, { days: 14 })` — articles recents par theme macro
- `searchFullText(query)` — recherche BM25 dans title+summary+digest
- `getHighImpactRecent(days)` — articles a fort impact

Performance : <10ms sur 100K+ documents avec FTS5.

> UPGRADE PATH : si la recherche semantique devient necessaire, ajouter `sqlite-vec`
> pour des embeddings sans changer le schema ni l'infra.

#### D2.4 Research Context (CODE, pas LLM)

Avant la generation du script, une fonction `buildResearchContext()` construit le contexte
historique par **queries SQL + formatage code**. Pas d'appel LLM — les donnees structurees
suffisent, c'est Opus qui fait la synthese narrative.

1. Identifie les top movers du snapshot (drama score > seuil ou |changePct| > 0.5%)
2. Pour chaque mover, deux queries en parallele :
   - `... WHERE symbol = ? AND published_at > date(-7 days)` → contexte immédiat (top 5)
   - `... WHERE symbol = ? AND published_at > date(-90 days)` → themes recurrents (top 3 par theme)
3. Query themes dominants : `SELECT theme, COUNT(*) FROM article_themes WHERE ... GROUP BY theme ORDER BY count DESC LIMIT 5`
4. Charge les 3-5 derniers episode summaries (Bloc D)
5. Formate le tout en texte structure (pas de type complexe — juste du markdown/texte)

**Format injecte dans le prompt Opus** (section `## Contexte historique`) :

```
## Contexte historique

### XAUUSD (or) — 7 derniers jours
- 2026-02-18 : "Fed signals pause, gold rallies to $5050" (source: CNBC)
- 2026-02-17 : "Gold extends gains for 3rd session" (source: Yahoo Finance)
- 2026-02-15 : "US-Iran tensions boost safe havens" (source: Reuters via EasyBourse)

### XAUUSD (or) — tendances 90 derniers jours
- monetary_policy (8 articles) : plusieurs signaux de pause Fed depuis janv.
- geopolitics (5 articles) : tensions US-Iran recurrentes depuis dec.

### Themes dominants cette semaine
- monetary_policy : 12 articles (Fed pause, ECB signal)
- geopolitics : 8 articles (Iran, trade tensions)
- earnings : 15 articles (NVDA, AAPL, earnings season)

### Predictions J-1
- XAUUSD : biais haussier, niveau $5020 → resultat: $5055 (+0.7%) ✓
- SPX : biais neutre, zone 6850-6900 → resultat: 6823 (-0.4%) ✗
```

C'est du texte brut, pas un objet JSON complexe. Opus le lit et construit le recit.
Pas de `ResearchBrief` type — le formatage texte est plus flexible et moins fragile.

#### D2.5 Considerations financieres specifiques

**Multi-asset impact** : un article "Fed rate pause" tague 4-5 assets via les regles causales (couche 2).
Gere par la relation many-to-many `article_assets`.

**Decay temporel** : les articles recents comptent plus. Approche simple : fenetres variables
par contexte (7j pour momentum immédiat, 90j pour themes macro recurrents). Pas de fonction
de decay complexe en V1 — les fenetres SQL suffisent.

**Narrative threads** : detection implicite via groupement par theme + fenetre temporelle.
Les articles partageant le meme theme dans les 7-90 derniers jours forment un "fil narratif".
C'est Opus (le scripteur) qui synthetise l'evolution a partir de la liste chronologique formatee.

#### D2.6 Bootstrapping

Accumulation organique (strategie principale) :
- **Jour 1-3** : DB vide → Research brief vide → le Writer fonctionne comme aujourd'hui (pas de regression)
- **Jour 7+** : contexte commence a emerger (1-2 articles par asset)
- **Jour 14+** : narrative threads detectables ("3eme seance de hausse consecutive")
- **Mois 3+** : base solide pour tous les themes macro recurrents

Backfill optionnel (voir D2.12 pour les sources) :
- Snapshots existants (`data/snapshot-*.json`) : tagger et stocker les news deja fetches
- Finnhub `/company-news` : 1 an d'historique pour les equity symbols — **deja integre** dans la pipeline historique
- Marketaux : 100 req/jour gratuit, backfill ~1 mois de news multilingues en quelques jours
- Strategie recommandee : lancer le backfill Marketaux sur les 30 derniers jours apres implementation D2

#### D2.7 Package structure

Le News Memory est integre dans `@yt-maker/ai` (pas un package separe — trop peu de code
pour justifier un package, et evite les dependances circulaires ai ↔ memory).

```
packages/ai/
  src/
    memory/
      news-db.ts            # SQLite wrapper (init, store, search)
      news-tagger.ts        # Tagging rules-based (code deterministe)
      research-context.ts   # Construit le contexte historique depuis DB + snapshot
      tagging-rules.ts      # Regles de tagging (keywords, causales, metadata)
      types.ts              # NewsTags, MacroTheme, etc.
```

#### D2.8 Couts

| Operation | Methode | Frequence | Cout/mois |
|-----------|---------|-----------|-----------|
| Tagging articles | Code (rules-based) | Quotidien | 0$ |
| Research context | Code (SQL queries) | Quotidien | 0$ |
| **Total News Memory** | | | **0$/mois** |

Tout le Bloc D2 est gratuit. Le seul LLM qui intervient est Opus pour le script final.

#### D2.9 Calendrier economique — Supabase + sync locale

Le calendrier economique provient d'une base Supabase existante (`new_economic_calendar`,
19K+ events, source ForexFactory, mise a jour quotidienne a 8h).

**Phase 1 — Fetch direct (Bloc A, immediat)** :
A chaque `fetchMarketSnapshot()`, query Supabase en parallele avec les autres sources :
- J-1 avec actuals remplis → "NFP sorti a 250K vs 180K consensus = beat massif"
- J events du jour → "Unemployment Claims a 13h30, consensus 223K"
- J+1 a J+7 upcoming → calendrier forward pour scenarios conditionnels
Les events sont mappes vers le type `EconomicEvent` et injectes dans le snapshot.
Env : `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

**Phase 2 — Sync locale dans SQLite (Bloc D2)** :
Quand le News Memory SQLite est implemente, ajouter une table `economic_events` :
```sql
CREATE TABLE economic_events (
  id TEXT PRIMARY KEY,           -- event_key de Supabase
  name TEXT NOT NULL,
  currency TEXT,
  event_date TEXT NOT NULL,
  strength TEXT,                 -- Strong/Moderate/Weak
  forecast REAL,
  previous REAL,
  actual REAL,
  outcome TEXT,                  -- beat/miss/inline/pending
  source TEXT DEFAULT 'forexfactory',
  synced_at TEXT
);
CREATE INDEX idx_eco_events_date ON economic_events(event_date);
CREATE INDEX idx_eco_events_currency ON economic_events(currency);
```

Sync quotidienne : a chaque fetch, stocker les events J-7 a J+7 en local.
Permet au Causal Analysis (Bloc A2) de croiser dans UNE SEULE base :
- Articles tagues (news) + events eco (calendrier) + prix (market RAG)
- Query : "qu'est-ce qui a impacte le dollar cette semaine ?"
  → 3 articles + NFP beat + Unemployment Claims miss → CausalBrief

La Supabase reste la source de verite (19K+ events). Le SQLite local est un cache
de travail pour les 14 derniers jours, optimise pour le cross-referencing rapide.

#### D2.10 Pre-requis : pipeline RSS elargi

Avant d'implementer le Bloc D2, le pipeline RSS doit etre elargi pour alimenter la memoire.
**Detail complet des ~30 feeds dans Bloc A section A.1d.**

Resume : 10 Yahoo per-symbole, 6 sources FR natives (ZoneBourse, TradingSat, Les Echos x2,
L'Agefi, EasyBourse), 2 CNBC, 2 crypto (CoinDesk, CoinTelegraph), 1 FXStreet,
3 Investing.com FR, 6 Google News ciblees + Finnhub news API en complement.

**Suppression de la limite de 20 articles** :
- `fetchNews()` retourne TOUS les articles uniques (pas de `maxItems`)
- Le snapshot JSON stocke tout (~500-800 articles uniques apres dedup)
- Chaque article enrichi avec `category` et `lang`
- C'est le formateur de prompt (dans `ai/`) qui selectionne les 20-30 plus pertinents pour le LLM
- SQLite (Bloc D2) indexe TOUT pour la memoire historique

#### D2.11 Suppression du FMP (Top Movers)

Le endpoint FMP `/stock_market/gainers|losers` necessite un plan payant et retourne des actions
individuelles US. Hors scope — on le remplace par notre propre stock screening (Bloc A, A.1e)
qui scanne 763 actions et detecte les movers quotidiennement.
Le champ `topMovers` dans `DailySnapshot` sera calcule a partir du screening.

#### D2.12 Sources de news historiques — Etat des lieux (audit fev. 2026)

**Probleme** : les flux RSS ont une fenetre de ~48h. Pour des dates > J-2, zero articles RSS cibles.
La SQLite archive accumule going forward, mais le bootstrapping et les dates passees necessitent
des sources avec profondeur historique.

**Etat de la pipeline actuelle** :
- RSS (toutes sources) : ~48h seulement — live uniquement
- Finnhub `/news` general : live uniquement (date params silencieusement ignores — confirme)
- Finnhub `/company-news` : 1 an d'historique, `from`/`to` supportes — **DEJA INTEGRE** en mode historique
  - Limitation : equities US/EU uniquement (skipe indices ^, futures =F, forex =X, crypto -USD)
  - Max 5 articles/symbole/jour, 60 req/min rate limit
- FRED (yields) : historique complet, `observation_start`/`observation_end` — **DEJA INTEGRE**
- Alternative.me F&G : 90 jours d'historique via `?limit=90` — **DEJA INTEGRE**

**Providers avec profondeur historique — comparatif** :

| Provider | Profondeur | Gratuit | Params date | Langues | Notes |
|----------|-----------|---------|-------------|---------|-------|
| **Marketaux** | ~1 an | 100 req/j | `published_before/after` | 30+ dont FR | **Recommande** — 5000+ sources |
| **GDELT** | 3+ mois garanti | Illimite | `startdatetime` | EN majoritaire | Complexe a parser, format propre |
| **NewsAPI.org** | 24 mois | 500 req/j (dev only) | `from/to` | EN majoritaire | Plan dev interdit en prod ($40/mois prod) |
| **The Guardian** | 25+ ans | 5000 req/j | `from-date/to-date` | EN uniquement | Surtout UK/macro global |
| **NewsData.io** | 6 mois (Basic) | 200 credits/j | `timeframe` | FR + EN | Upgrade payant pour 2 ans |
| **Finnhub /company-news** | 1 an | 60 req/min | `from/to` | EN | Deja integre, equities only |

**Recommandation : Marketaux comme source de backfill principale**

Raisons :
1. Sources financieres FR/EN : Les Echos, BFM Business, Capital, Reuters FR inclus
2. `published_before` / `published_after` avec granularite minute
3. Gratuit 100 req/jour = ~3000 articles/jour en backfill (30 articles/req)
4. API simple : `GET /v1/news?published_after=2026-01-01&published_before=2026-01-02&language=fr,en`
5. Env : `MARKETAUX_API_KEY` (signup gratuit sur marketaux.com)

**Strategie de backfill Marketaux** (a implementer apres D2 SQLite) :
```typescript
// scripts/backfill-news.ts
// Pour chaque jour des 30 derniers jours (3 req/jour — FR, EN, crypto)
// → store dans news-memory.db avec tagging rules
// Total : 30 jours × 3 req = 90 req sur 1 jour de quota gratuit
```

**Ce qu'on ne peut PAS recuperer facilement** :
- News ZoneBourse / TradingSat (pas d'API, scraping fragile)
- Contenu derriere paywall (Les Echos complet, L'Agefi premium)
- News intraday en temps reel (webhooks payants partout)

**Conclusion** : la SQLite accumule going forward (strategy principale). Marketaux permet un
backfill utile sur 30 jours pour le bootstrapping. Au-dela, les snapshots historiques ne sont
pas critiques — le pipeline fonctionne sans memoire historique (degradation gracieuse).

#### Livrable Bloc D2
Dans `@yt-maker/ai/memory/` : `tagArticles()` (rules), `NewsMemoryDB` (SQLite), `buildResearchContext()` (SQL + format).
Integration dans le pipeline generate : fetch → tag & store (code) → research context (SQL) → script (Opus).

---

### Bloc D3 — MarketMemory (zones techniques + événements prix)

**Dependances** : Bloc A (candles + indicateurs), indépendant de D2
**Impact** : transforme C2 d'un analyste sans mémoire en desk qui suit chaque actif au quotidien
**Code** : dans `@yt-maker/ai/market-memory/`

> **DÉCISION v3** : troisième type de mémoire distinct de EpisodeMemory (narrative) et NewsMemory (articles).
> Un fichier JSON par actif, enrichi chaque soir. Donne à C2 le contexte technique pré-mâché.

#### D3.1 Structure JSON par actif

Fichier : `data/market-memory/{symbol}.json` — un par actif de la watchlist (38 + movers récurrents)

```typescript
interface AssetMarketMemory {
  symbol: string
  context: {
    regime: "bull" | "bear" | "range"        // calculé code sur EMA + trend
    regime_since: string                      // date ISO
    impression: string                        // résumé hebdo Sonnet (job dominical)
    impression_updated: string               // date dernière MAJ
  }
  zones: Array<{                             // 3-5 zones max par actif
    level: number
    type: "support" | "resistance" | "pivot"
    created: string                          // date création
    age_days: number                         // calculé à la lecture
    touches: number                          // nb fois testé
    last_touch: string
    last_event_type: EventType | null
    cassure_date: string | null
    cassure_confirmed: boolean | null        // null = en attente, true/false = résolu
    last_behavior: string                    // note libre Sonnet
  }>
  indicators_daily: {                        // calculés code pur (pandas-ta), zéro lag
    bb_width_pct: number                     // largeur BB en % du prix
    bb_width_pct_rank: number                // rang sur 90j (0-100)
    mm20_slope_deg: number                   // inclinaison MM20 en degrés
    atr14: number
    atr90: number                            // ATR 90j pour normalisation
    atr_ratio: number                        // atr14 / atr90
    volume_ratio_20d: number                 // volume J / moyenne 20j
    rsi14: number
  }
  last_events: Array<{                       // 5 max, FIFO
    date: string
    event_type: EventType
    detail: string
  }>
}

type EventType = "TOUCH" | "REJET" | "CASSURE" | "PULLBACK_TENU" | "PULLBACK_RATE"
```

#### D3.2 Les 5 types d'événements (détection code pur sur prix brut, zéro lag)

| Événement | Définition code |
|-----------|----------------|
| `TOUCH` | prix ±0.3% du level |
| `REJET` | TOUCH + clôture repart du côté d'origine |
| `CASSURE` | clôture >1% au-delà du level sur volume_ratio >1.2 → cassure_confirmed = null |
| `PULLBACK_TENU` | après CASSURE, retour sur level, clôture reste au-delà → confirmed = true |
| `PULLBACK_RATE` | après CASSURE, retour sur level, clôture repasse → confirmed = false |

> Pas de timeout post-cassure — le code guette indéfiniment, Haiku juge la signification.

#### D3.3 Enrichissement quotidien — Flow soir (après P0)

```
1. Code : détecter événements sur les zones pour tous les actifs watchlist
2. Code : calculer indicators_daily (pandas-ta sur candles J)
3. Filtrage déclenchement Haiku (soir, ~4-8 actifs typiquement) :
   Déclencheurs ZÉRO LAG (utilisés comme triggers) :
     - événement détecté sur zone aujourd'hui (principal)
     - OU variation >1.5×ATR14
     - OU volume_ratio >1.5
   Indicateurs BB/ATR/MM (CONTEXTE uniquement, jamais triggers — ils ont du lag)
4. Haiku (1 appel multi-actifs) : pour chaque actif déclenché
     - Mettre à jour last_behavior (note libre)
     - Qualifier cassure_confirmed si applicable
     - Formuler l'impression tactique
5. Sauvegarder JSONs mis à jour
```

**⚠️ Règle critique sur les indicateurs** : bb_width_pct, atr_ratio, mm20_slope sont du CONTEXTE
injecté dans le prompt Haiku pour qu'il comprenne l'état de l'actif. Ce ne sont JAMAIS des
déclencheurs d'enrichissement — ils ont du lag (calculés sur candles passées). Seuls les
événements sur zones et les mouvements prix bruts déclenchent.

#### D3.4 Job hebdomadaire Sonnet (dimanche soir, pipeline séparé)

Input : tous les JSONs watchlist + candles weekly 6 mois.

Actions :
- Identifier nouvelles zones (pivots weekly/daily significatifs)
- Supprimer zones obsolètes (cassure confirmed > 3 semaines sans retour)
- Mettre à jour `impression` et `regime` pour chaque actif
- Générer `market_weekly_brief.json` (injecté dans C1 chaque matin)

Output : JSONs MAJ + `data/market-memory/market_weekly_brief.json`

#### D3.5 Intégration pipeline

```
P0 : détecte événements prix brut + calcule indicators_daily
     → met à jour market-memory/*.json (code pur)
P1 : score via variation jour + volume (pas indicators laggards)
P2 (C1) : reçoit market_weekly_brief.json
           règle anti-répétition via last_event_type
           ("même event TOUCH sur ce level hier → pas DEEP aujourd'hui")
P3 (C2) : reçoit JSON complet pour actifs DEEP/FOCUS
           contexte pré-mâché → chaînes causales plus précises
```

#### D3.6 Grille d'interprétation indicateurs (dans system prompt Haiku)

| Indicateur | Seuil | Interprétation |
|------------|-------|----------------|
| bb_width_pct_rank < 20 | Compression | Mouvement violent imminent (direction inconnue) |
| mm20_slope_deg > 10° | Tendance forte | Momentum directionnel confirmé |
| atr_ratio > 1.3 | Volatilité anormale | Journée hors-norme, prudence sur les niveaux |
| volume_ratio > 1.5 | Participation institutionnelle | Signal significatif |
| Prix hors BB + volume_ratio > 1.5 | Breakout potentiellement valide | Surveiller confirmation J+1 |

#### D3.7 Scénarios narratifs couverts

| Scénario | Situation | Action pipeline |
|----------|-----------|-----------------|
| S1 Rien | Aucun événement | Pas de mention zone dans la narration |
| S2 Approche | Prix s'approche d'une zone | C1 classe FOCUS si contexte fort |
| S3 Rejet | REJET détecté | "La résistance à X tient" |
| S4 Cassure | CASSURE, confirmed=null | "Cassure en cours, confirmation attendue" |
| S5 Pullback tenu | confirmed=true | "Cassure validée, le niveau devient support" |
| S6 Pullback raté | confirmed=false | "Faux breakout — piège haussier" |
| S7 Cassure sans pullback longue | confirmed=null depuis >3 semaines | Job hebdo Sonnet évalue |
| S8 Stagnation zone | Asset stagne sur une zone | Haiku met à jour last_behavior chaque soir |

#### Livrable Bloc D3
- `data/market-memory/{symbol}.json` pour les 38 actifs watchlist (init manuel ou script bootstrap)
- `detectZoneEvents(candles, zones)` : code pur, détection 5 types d'événements
- `calculateDailyIndicators(candles)` : pandas-ta, zéro lag
- `enrichMarketMemory(snapshot)` : flow soir (code + Haiku conditionnel)
- `weeklyMarketMemoryJob()` : job Sonnet dominical
- `loadMarketMemoryForAssets(symbols[])` : lecture rapide pour C2

---

### Bloc E — Scenes Remotion v2

**Dependances** : Bloc C (les types enrichis definissent ce que les scenes doivent afficher)
**Impact** : le "look" de la video — ce que le viewer voit

#### E.1 Scenes existantes a faire evoluer

| Scene actuelle | Evolution necessaire |
|----------------|---------------------|
| IntroScene | Ajouter cold open (phrase choc geante) avant le titre |
| MarketOverviewScene | Transformer en dashboard heatmap (pas juste des cards) |
| ChartDeepDiveScene | Ajouter niveaux S/R annotes, zones colorees, overlays |
| NewsScene | Ajouter sentiment indicator par news |
| PredictionsScene | Renommer "Zones a surveiller", conditionnel obligatoire |
| PreviouslyOnScene | SUPPRIME — les references au passe sont integrees dans les segments |
| OutroScene | Ajouter teaser tomorrow, recap 3 points |

#### E.2 Nouvelles scenes a creer

| Scene | Role | Priorite |
|-------|------|----------|
| ColdOpenScene | Chiffre geant anime + phrase choc | V1 |
| DashboardScene | Grille heatmap de tous les assets | V1 |
| DisclaimerBar | Bandeau permanent en bas | V1 (compliance) |
| RecapScene | 3 bullet points animes | V1 |
| CorrelationScene | 2 courbes overlay + coefficient | V1.5 |
| MacroScene | Gauges (VIX, F&G) + yield curve | V1.5 |
| ZonesScene | Chart avec zones colorees S/R | V2 |
| CalendarScene | Timeline events eco | V2 |

#### E.3 Nouveaux composants shared

> **Convention palette visuelle** : tous les composants réutilisables sont dans `packages/remotion-app/src/scenes/shared/`.
> Le prompt C7 (direction artistique) doit scanner ce dossier pour connaître la palette disponible avant de générer ses instructions visuelles.
> Le code EST la source de vérité — pas de catalogue séparé à maintenir.

| Composant | Usage | Priorite |
|-----------|-------|----------|
| HeatmapGrid | Dashboard — couleur par % change | V1 |
| DisclaimerBar | Bandeau permanent | V1 |
| LowerThird | Bandeau nom asset pendant analyse | V1 |
| GaugeAnimated | Fear & Greed, VIX | V1.5 |
| ChartOverlay | 2 courbes superposees | V1.5 |
| LevelAnnotation | Lignes S/R sur les charts | V1.5 |
| SectorBars | Barres perf sectorielle | V2 |
| TickerTape | Bandeau defilant | V2 |

> QUESTION : faut-il reconstruire les scenes de zero ou faire evoluer les existantes ?
> Recommandation : evoluer les existantes pour V1 (IntroScene → ajouter cold open), creer les nouvelles en parallele.
> Attention a ne pas tout faire d'un coup — 3-4 scenes V1 suffisent pour la premiere video.

#### E.4 Assets library

```
assets/
  crypto/     → btc.svg, eth.svg, sol.svg
  forex/      → drapeaux (flag-icons npm), paires
  indices/    → sp500.svg, nasdaq.svg
  commodities/→ gold.svg, oil.svg
  macro/      → fed.svg, bce.svg
  mood/       → bull.svg, bear.svg, neutral.svg
  ui/         → arrows.svg, badges.svg, frames.svg
```

`ASSET_MAP[symbol]` dans `asset-library.ts` pour que Remotion resolve les icones automatiquement.

> QUESTION : SVGs customs ou utiliser une lib d'icones existante (lucide-react, simple-icons) ?
> Recommandation V1 : simple-icons pour les logos connus + lucide-react pour les icones UI.
> SVGs customs uniquement pour les elements de branding uniques.

#### Livrable Bloc E
Scenes V1 fonctionnelles avec EnrichedEpisodeScript + DisclaimerBar + assets de base.

---

### Bloc F — TTS (ElevenLabs)

**Dependances** : Bloc C (le script contient les narrations a convertir), Bloc E (le render a besoin de la duree audio)
**Impact** : transforme la video de "diaporama anime" en "vrai contenu audiovisuel"

#### F.1 Clone vocal

- Enregistrer 3-5 min de voix naturelle du createur
- Upload sur ElevenLabs → voice clone API
- Voix du createur = authenticite legale pour YouTube
- Cout : selon plan (voir Section 9 Couts)

#### F.2 Architecture TTS — Couche C6 + config statique

> **DÉCISION v3** : le paramétrage ElevenLabs est une CONFIG STATIQUE par type de segment.
> Pas de LLM pour décider stability/speed. C6 (Haiku) fait uniquement l'adaptation textuelle.

**Étape 1 — C6 Haiku : adaptation vocale du texte**

C6 reçoit episode_directed.json et transforme chaque section pour la voix :
- Raccourcit les phrases > 20 mots
- Supprime les références visuelles ("comme vous pouvez le voir sur le graphique")
- Ajoute des balises SSML de pauses naturelles (`<break time="300ms"/>`)
- Adapte le rythme selon le type de segment

**Étape 2 — Config statique ElevenLabs par type**

```typescript
const ELEVENLABS_CONFIG: Record<SegmentType, ElevenLabsParams> = {
  DEEP:    { stability: 0.75, similarity_boost: 0.85, speed: 0.92 },  // Posé, analytique
  FOCUS:   { stability: 0.70, similarity_boost: 0.82, speed: 0.96 },
  FLASH:   { stability: 0.65, similarity_boost: 0.78, speed: 1.02 },  // Dynamique, flash
  COLD_OPEN: { stability: 0.60, similarity_boost: 0.80, speed: 1.00 }, // Impactant
  RECAP:   { stability: 0.75, similarity_boost: 0.85, speed: 0.95 },
  OUTRO:   { stability: 0.70, similarity_boost: 0.82, speed: 0.94 },
}
```

Un appel TTS par section → WAV horodatés.

**⚠️ Les durées WAV réelles = timing MAÎTRE de tout le pipeline.**
- Remotion en P8 utilise les WAV réels, PAS les durées estimées par C3
- P9 (chapitres horodatés) attend la fin de P8 pour les durées exactes

**Étape 3 — Whisper : sous-titres automatiques**

- SRT + ASS depuis les WAV
- Dictionnaire custom pour les tickers (XAUUSD → "or", EURUSD → "euro dollar")
- Word-level timestamps pour sous-titres synchronisés en V2

#### F.3 Decision texte a l'ecran (V1 vs V2)

**V1 (immediate)** : supprimer `AnimatedText` des scenes, remplacer par `DisclaimerBar` permanent en bas. La voix raconte, les visuels montrent.

**V2** : sous-titres synchronises depuis word timestamps ElevenLabs → SRT → Remotion.

**Non retenu** : `displayText` court par section — ajoute de la complexite LLM pour un resultat inferieur aux sous-titres auto.

#### F.4 Sanitizer TTS (filet de securite)

Le champ `narration` reste la source de verite unique (prose lisible par un humain).
Un module `sanitizeForTTS(text, lang)` dans `packages/ai/src/tts-sanitizer.ts` transforme avant envoi.

| Symbole dans `narration` | ElevenLabs lirait | Ce qu'on veut |
|---|---|---|
| `→` | "fleche" | "vers" |
| `EMA9` | "emaneuf" | "E-M-A 9" |
| `RSI=68` | "RSI egal 68" | "le RSI est a 68" |
| `+5,53%` | OK en FR | OK |
| `$` | variable | "dollars" |

#### F.5 Anti-robot (imperfections volontaires)

Via SSML dans C6 et config stability ElevenLabs :
- Pauses naturelles sur les niveaux cles
- Ton energique sur les mouvements forts (stability basse)
- Rythme variable : ralentir sur le contexte macro (speed 0.92), accelerer sur le flash

#### Livrable Bloc F
`adaptForTTS(script)` (C6) + `generateAudio(adaptedScript)` (ElevenLabs + config statique) + `generateSubtitles(wav)` (Whisper) + `sanitizeForTTS(text)` + integration dans le pipeline render.

---

### Bloc G — SEO & Upload (C10)

**Dependances** : Bloc C (script), Bloc F (video renderee)
**Impact** : decouvabilite sur YouTube — inutile de faire une bonne video si personne ne la voit

> **⚠️ DÉPENDANCE CACHÉE** : les chapitres horodatés nécessitent les durées WAV réelles (P8).
> C10 peut commencer titre + tags + thread X pendant P8.
> La description complète avec chapitres attend la fin du render.

#### G.1 SEOPackage (généré par C10 Haiku)

```typescript
interface SEOPackage {
  titre: string                  // 50-60 chars
  titreAlternatif: string        // A/B test
  descriptionAbove: string       // 150 chars (visible avant "voir plus")
  descriptionFull: string        // 300-500 mots
  chapters: Array<{ timecode: string; label: string }>  // nécessite durées WAV réelles
  tags: string[]                 // 5-8
  hashtags: string[]             // 3-5
  pinnedComment: string
  nomFichier: string             // MP4 renomme
  playlistId: string
  categoryId: "27" | "25"        // Education=27, News=25
  threadX: string                // Thread court pour partage Twitter/X
}
```

#### G.2 Coherence semantique

Le mot-cle principal doit apparaitre dans : titre, description, tags, chapters, transcript (prononce par le narrateur), sous-titres, thumbnail, nom fichier. C3 (Opus) doit inclure l'instruction de prononcer le mot-cle dans les 30 premieres secondes.

#### G.3 Upload YouTube + Shorts

- YouTube Data API v3
- Upload video + metadata + thumbnail
- Post pinned comment automatique
- Ajout a la bonne playlist
- Short auto (segment drama_score max + cold open, 9:16) uploadé simultanément

> QUESTION : OAuth 2.0 YouTube requiert une verification Google pour les apps "publiques".
> Pour un usage personnel (sa propre chaine), un token OAuth "testing" suffit-il indefiniment ?
> A verifier avant de coder — si limitation, envisager un upload semi-auto via CLI.

#### G.4 EpisodeMemory — ordre de sauvegarde critique

**EpisodeMemory est sauvegardée AVANT l'upload YouTube.**
Raison : si l'upload échoue, la mémoire narrative est quand même préservée pour J+1.

#### Livrable Bloc G
`generateSEO(script, durationsFromWav): SEOPackage` (C10) + `uploadToYouTube(video, seo)` + `saveEpisodeMemory(script)` appelé avant upload.

---

### Bloc H — Pipeline Resilience & Automation

**Dependances** : tous les blocs precedents (c'est la couche qui orchestre tout)
**Impact** : la video sort CHAQUE JOUR, meme si un service est down

#### H.1 Modes degrades

| Mode | Declencheur | Comportement |
|------|-------------|--------------|
| Nominal | Tout OK | Pipeline complet |
| Data partielle | Source secondaire down | Continue sans, mentionne dans le script |
| LLM fallback | Anthropic down | OpenRouter en fallback |
| TTS fallback | ElevenLabs down | Voix de fallback ou texte a l'ecran |
| SKIP | Yahoo Finance down | Pas de video, retry dans 1h |

#### H.2 Fallbacks par etape

| Etape | Primaire | Fallback 1 | Fallback 2 | Timeout |
|-------|----------|------------|------------|---------|
| Yahoo Finance | API directe | Cache J-1 | SKIP | 30s |
| CoinGecko | API free | Cache J-1 | Omis | 15s |
| FRED | API free | Cache derniere valeur | Omis | 15s |
| News | RSS ~30 feeds + Finnhub | Google News | Cache J-1 | 30s |
| LLM Script | Anthropic Opus | Anthropic Sonnet | OpenRouter | 120s |
| TTS | ElevenLabs | Fallback voix | Sans audio | 90s |
| Render | Remotion | — | Alerte humaine | 300s |

#### H.3 Notifications

Discord webhook pour :
- Succes : "Episode #42 publie (8m32s, mode nominal)"
- Warning : "Episode #42 en mode degrade 2 (CoinGecko down)"
- Erreur : "Episode #42 echoue a l'etape TTS, retry 30min"
- Critique : "Pipeline bloque depuis 2h — intervention requise"

#### H.4 Cron quotidien

```
5:45  Health check (ping APIs, verif .env, espace disque)
6:00  Pipeline complet
6:xx  Notification succes/echec
```

#### H.5 Quality gate (avant publication)

Check automatique du script genere :
- Nombre de sections dans fourchette attendue
- Duree totale 480-600s
- Ratio mots/duree acceptable par section (~150 mots/60s +/- 20%)
- Disclaimer present
- Pas de vocabulaire interdit (regex sur les termes AMF)
- `suiviJ1` present si ce n'est pas l'episode 1
- JSON bien forme et conforme au type attendu
- **Narration non tronquee** : chaque section doit se terminer par un signe de ponctuation final (`.`, `!`, `?`). Une narration se terminant par une virgule, deux-points, ou une conjonction ("et", "mais", "car", "ce soir") est rejetee — c'est le signal d'une phrase coupee (ex: "les Minutes de la Fed sont tombees ce soir." est OK, "les Minutes de la Fed" ne l'est pas).
- **volumeAnomaly valide** : toute valeur `< 0.01` dans les technicals est un artefact (Yahoo retourne v=0 sur les indices en mode historique). Le quality gate doit logger un warning et forcer `volumeAnomaly = 1` (neutre) avant generation du script. Ne jamais laisser "-100%" atteindre le LLM.
- Si fail → re-generation (1 retry max) ou alerte humaine

#### Livrable Bloc H
`withRetry()`, fallback par etape, quality gate, cron setup, Discord notifications.

---

## 7. Anti-demonetisation

> Section TRANSVERSALE — ces principes s'appliquent a CHAQUE bloc ci-dessus.
> A relire systematiquement avant de valider un prompt, une scene, ou un comportement pipeline.

### Pourquoi c'est critique

Depuis juillet 2025, YouTube penalise le contenu "non authentique" (AI slop). L'IA est autorisee comme OUTIL, pas comme substitut a l'intention creative. Une chaine detectee comme "full AI" = enterree dans l'algorithme.

### Les 5 piliers anti-detection

**1. Unicite narrative (dans le prompt C3 Opus)**
- Hook contenant un element date-specifique (jamais generique)
- Biais directionnel clair et assume — jamais "ca peut monter ou descendre"
- Surprise du jour obligatoire (element inattendu)
- Connecter l'actualite mondiale aux actifs (pas juste les chiffres)
- Mood marche adapte le registre emotionnel
- **Few-shot Bondain injectes** : 3-4 extraits de journalisme financier FR de qualite pour calibrer le registre oral naturel

**1b. Leçons de l'audit comparatif (fev. 2026 — scripts vs Bondain/Zonebourse)**

Cinq ameliorations concretes integrees dans le pipeline v3 :
1. **Verification donnees** : snapshot.json = source unique, C2 contraint de citer uniquement les donnees presentes (elimine les niveaux inventés ou perimés)
2. **Contexte YTD** : calcule en P0, injecte dans snapshot (ex: "Arcelor +45% YTD"), utilise par C2 quand l'actif est en vedette
3. **Lecture business model** : Knowledge Base enrichie avec fiches sectorielles pour connexions type "Salesforce subit la disruption IA sur son CRM"
4. **Discipline temporelle** : chaque donnee horodatee dans le JSON, C2 utilise les timestamps (elimine la confusion ouverture EU / cloture US)
5. **Densite societes** : section "actu societes" dediee dans C3 (60-90s, 8-12 societes, format flash info)

**2. Continuite et memoire (EpisodeMemory — Bloc D + MarketMemory — Bloc D3)**
- Suivi J-1 obligatoire avec resultats honnetes
- References a des episodes passes : "comme je le disais il y a 3 jours..."
- Fil directeur hebdomadaire (les themes de la semaine)
- Niveaux precis avec dates : "1.0823 — niveau du 12 fevrier"

**3. Interaction audience (dans le prompt + SEO)**
- Question ouverte unique en CTA final (liee a l'analyse du jour)
- 1x/semaine : integrer un commentaire de viewer (reel ou simule au debut)
- Expressions signatures recurrentes (contribuent a l'identite)

**4. Imperfections volontaires (C6 + ElevenLabs config statique — Bloc F)**
- Pauses naturelles via SSML dans C6
- Config stability variable par type de segment (DEEP=0.75, FLASH=0.65)
- Ton energique sur les mouvements forts (stability basse), pose sur le contexte macro (stability haute)
- Rythme variable via speed parameter (FLASH=1.02, DEEP=0.92)

**5. Variations visuelles (C5 direction globale + Remotion — Bloc E)**
- Couleur dominante pilotee par le mood du jour (decide par C5)
- Arc de tension global decide par C5 (montee → pic → respiration → closing)
- Transitions dynamiques depuis liste Remotion (decide par C5, pas hardcode)
- Ordre des segments variable selon drama scores (decide par C1)
- Nombre d'assets variable (2-3 deep dives selon editorial_plan.json)
- 1x/semaine : element special (stat historique, citation, graphique inhabituel)

---

## 8. Segments speciaux (hebdomadaires)

| Jour | Format | Difference |
|------|--------|------------|
| Lundi | Recap weekly | Segment "7 jours en 60s" remplace suivi J-1 |
| Mercredi | Setup semaine | Deep dive unique 4-5 min au lieu de 3x1.5 min |
| Vendredi | Bilan + calendrier | Segment "semaine prochaine" + calendrier eco J+7 |
| Event majeur | Format FLASH | Breaking news, structure libre, 5-6 min |

> QUESTION : ces variantes sont V2+. Pour V1, tous les episodes sont "daily_recap" standard.
> Ne pas complexifier le prompt avec ca avant que le format de base soit solide.

---

## 9. Couts & Business

### Couts mensuels (production)

| Service | Cout/mois | Notes |
|---------|-----------|-------|
| Data pipeline | 0 EUR | Yahoo, RSS, FRED, Finnhub, CoinGecko, Supabase — tout gratuit |
| News Memory + Causal | 0 EUR | Tagging rules-based + SQL queries — tout en code |
| Anthropic API (script) | ~8-12 EUR | 22 videos × 10 couches LLM (~0.39$/video) |
| ElevenLabs | ~22-99 EUR | Creator (100min/mois) ou Scale (500min) si 22 videos × 10min depasse |
| Flux AI (fal.ai) | ~3-5 EUR | Thumbnails (V2) |
| Hosting | ~5-10 EUR | VPS ou Railway |
| **Total** | **~55-154 EUR/mois** | Fourchette large selon plan ElevenLabs |

> NOTE : le cout ElevenLabs depend de la duree totale. 22 videos × 10min = 220 min/mois.
> Le plan Creator (100 min) ne suffit PAS. Options : plan Scale (~99 EUR), ou batch API,
> ou reduire a 15 videos/mois, ou utiliser des voix non-clonees moins cheres.
> A evaluer au moment du Bloc F.

**Cout par video : ~1.5-2.5 EUR** (LLM ~0.39$, ElevenLabs ~0.50-1.00€, infra ~0.20€)

### Revenus projetes (hypotheses conservatrices)

| Periode | Abonnes | Vues/mois | Revenus |
|---------|---------|-----------|---------|
| M1-M3 | 0-300 | 5K-15K | 0 EUR (pas YPP) |
| M4-M6 | 300-1K | 15K-50K | 0-50 EUR |
| M6-M9 | 1K-2.5K | 50K-120K | 150-550 EUR |
| M9-M12 | 2.5K-5K | 120K-300K | 550-1600 EUR |
| M12-M18 | 5K-15K | 300K-800K | 1600-5500 EUR |

CPM niche finance FR = 8-15 EUR (premium).
Sources additionnelles : affiliation courtiers (CPA 50-200 EUR), sponsoring, formation, duplication EN.
Point de rentabilite estime : **mois 7-8**.

### Metriques YouTube a tracker

| Metrique | Seuil correct | Seuil excellent | Action si bas |
|----------|---------------|-----------------|---------------|
| CTR | >4% | >7% | Thumbnails + titres |
| Retention moyenne | >50% | >65% | Structure + rythme |
| Retention 30s | >70% | >85% | Hook |
| Commentaires/vue | >0.5% | >1% | CTA |

### YPP (monetisation)

- 1000 abonnes + 4000h de visionnage sur 12 mois
- Delai realiste : 4-6 mois avec pipeline quotidien

---

## 10. Roadmap

> Les dates sont indicatives. L'ordre de priorite est plus important que le calendrier.
> A chaque etape : "Est-ce que cette implementation sert la premiere video publiable ?"

### V1 — Premiere video publiable

**Objectif** : une video complete (data enrichie + pipeline multi-couches C1→C10 + TTS) publiee sur YouTube.

| Priorite | Bloc | Taches cles |
|----------|------|-------------|
| 1a | ~~A Phase 1~~ | ~~21 assets + 8 RSS + FRED + Finnhub + CoinGecko + Supabase~~ **FAIT** |
| 1b | A Phase 2 | 38 assets multi-TF + ~30 RSS + Finnhub news + screening 763 actions + suppr FMP | **A FAIRE** |
| 2 | B (knowledge) | Knowledge loader + fiches manquantes (central-banks, asset-profiles) |
| 3 | D (EpisodeMemory) | Version simple : sauvegarde predictions + suivi J-1 |
| 3.5 | D2 (NewsMemory) | SQLite + tagging rules + research context |
| 3.6 | D3 (MarketMemory) | JSONs par actif + détection événements + enrichissement Haiku soir + job hebdo Sonnet |
| 4 | C (prompts C1→C5) | **Refactoring majeur** — 5 prompts séquentiels avec responsabilités séparées |
| 5 | A2 (market intel) | Market RAG (~763 actions), analyse causale, scenarios forward |
| 6 | E (scenes) | 4-5 scenes essentielles + DisclaimerBar + quelques composants |
| 7 | F (TTS) | C6 adaptation + ElevenLabs config statique par segment + Whisper sous-titres |
| 8 | G (SEO) | C10 SEOPackage + upload semi-auto |

### V1.5 — Stabilisation

- Knowledge base complete (toutes les fiches + asset-profiles + central-banks)
- MarketMemory complète pour les 38 actifs watchlist (zones calibrées sur 6 mois)
- EpisodeMemory complet avec fil directeur hebdomadaire
- Quality gate automatique (code + C4 Haiku)
- Pipeline resilience basique (fallbacks, retry)
- Thumbnail A/B test automatique J+2

### V2 — Qualite professionnelle

- Toutes les scenes (12) + composants visuels avances
- Drama Score calibre sur episodes reels (drama-weights.json editable)
- Segments speciaux hebdomadaires
- Sous-titres word-level depuis ElevenLabs timestamps
- Assets library SVGs complete

### V3 — Automation totale

- Cron quotidien
- Upload YouTube automatique
- Notifications Discord
- Health check
- Dashboard monitoring

### V4 — Expansion

- Duplication chaine anglaise
- Format FLASH (breaking news)
- Analyse concurrents (yt-dlp + whisper)
- Flux AI pour thumbnails premium

---

## 11. Principes de travail

> Regles pour MOI (Claude) quand je travaille sur ce projet.

1. **Lire avant de coder** — toujours relire le code existant et cette section du blueprint avant d'implementer
2. **Coherence avant fonctionnalite** — ne pas ajouter un feature si ca casse l'harmonie de l'ensemble
3. **Questionner le plan** — si une approche prevue semble suboptimale au moment de l'implementation, le signaler et proposer mieux
4. **Petit et testable** — chaque PR/modification doit etre testable independamment
5. **Le type d'abord** — definir le type TypeScript avant de coder la logique
6. **Prompt Studio** — tester chaque modification de prompt dans le Prompt Studio avant de la considerer terminee
7. **La video prime** — chaque decision doit servir la qualite de la video finale pour le viewer
8. **Pas de sur-ingenierie** — V1 est volontairement imparfaite. La regularite de publication vaut plus que la perfection technique
9. **Compliance non negociable** — verifier AMF/MiFID II a CHAQUE modification de prompt ou de contenu genere
10. **Anti-demonetisation transversal** — relire la section 6 avant chaque modification de prompt, scene, ou TTS
