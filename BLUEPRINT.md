# TradingRecap — Blueprint v2

> Ce document est un GUIDE VIVANT, pas une specification figee.
> Chaque section doit etre questionnee au moment de l'implementation.
> Avant de coder : "Est-ce que ca sert la qualite de la video finale ? Est-ce coherent avec ce qui existe ?"

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
| Duree cible | 8-10 minutes (480-600s) |
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
| RSS News | `data/news.ts` | Phase 1 — 8 feeds, dedup, spread horaire, max 20. Phase 2 : ~30 feeds, sans limite |
| FRED client | `data/fred.ts` | Complet — yields 10Y, 2Y, spread (graceful degradation) |
| Finnhub client | `data/finnhub.ts` | Complet — earnings calendar (eco calendar = plan payant) |
| FMP client | `data/fmp.ts` | Complet — top movers gainers/losers (plan payant requis) |
| Sentiment client | `data/sentiment.ts` | Complet — Alternative.me F&G + CoinGecko BTC dom + trending |
| Snapshot orchestrateur | `data/market-snapshot.ts` | Complet — 7 fetchers paralleles, enriched snapshot |
| LLM client | `ai/llm-client.ts` | Complet — OpenRouter, 4 modeles free, retry |
| Script generator | `ai/script-generator.ts` | Complet — formatage snapshot + appel LLM |
| Prompt daily recap | `ai/prompts/daily-recap.ts` | Complet — FR/EN, schema JSON |
| Episode history | `ai/episode-history.ts` | Complet — manifest R/W |
| 7 scenes Remotion | `remotion-app/scenes/*` | Complet — Intro, MarketOverview, ChartDeepDive, News, Predictions, PreviouslyOn, Outro |
| 4 composants shared | `remotion-app/scenes/shared/*` | Complet — AssetCard, AnimatedText, Sparkline, TransitionWipe |
| Pipeline full | `scripts/generate.ts` | Complet — fetch → script → render |
| Prompt Studio UI | `scripts/prompt-studio.ts` | Complet — web UI port 3030 |
| Fixtures test | `remotion-app/fixtures/sample-data.ts` | Complet — 8 assets, 10 news, script FR |
| Knowledge: analyse technique | `ai/knowledge/technical-analysis.md` | Complet — EMA, RSI, S/R, volume, ATH, combinaisons |
| Knowledge: intermarche | `ai/knowledge/intermarket.md` | Complet — correlations, regimes, decorrelations |
| Knowledge: macro | `ai/knowledge/macro-indicators.md` | Complet — VIX, yields, DXY, F&G, events eco |
| Knowledge: narration | `ai/knowledge/narrative-patterns.md` | Complet — 5 patterns, structure, criteres qualite |

### Ce qui est STUBBE

| Composant | Fichier | Etat |
|-----------|---------|------|
| Calendrier economique | `data/calendar.ts` | Delegue a Finnhub — retourne [] si pas de cle ou plan free |
| Prompt chart analysis | `ai/prompts/chart-analysis.ts` | Texte placeholder |
| Prompt previously-on | `ai/prompts/previously-on.ts` | Texte placeholder |

### Ce qui N'EXISTE PAS encore (a construire)

- ~~Enrichissement data (CoinGecko, FRED, Fear&Greed, Finnhub calendar, calculs techniques)~~ **FAIT**
- Knowledge loader (`knowledge-loader.ts` — selectionne et injecte les fiches pertinentes)
- Prompt Opus v2 (persona, compliance, structure narrative)
- EpisodeMemory (continuite inter-episodes)
- **News Memory** (`@yt-maker/memory` — tagging LLM, SQLite index, research brief agentic) — voir Bloc D2
- Types enrichis (EnrichedSnapshot, EnrichedEpisodeScript)
- Scenes Remotion v2 (ColdOpen, Dashboard, Correlation, Macro, Zones, Recap)
- Composants visuels (HeatmapGrid, Gauge, ChartOverlay, LevelAnnotation, etc.)
- TTS (ElevenLabs)
- SEO generator
- Pipeline resilience (fallbacks, retry, notifications)
- Automation (cron, upload YouTube)
- Assets library (SVGs)
- Thumbnail generator
- Quality gate

### Bugs et dettes connues

- `PredictionsScene.tsx` : labels de confiance hardcodes en francais ("HAUTE", "MOYENNE") — devrait utiliser `lang`
- `PreviouslyOnScene.tsx` : titre hardcode "Precedemment..." — idem
- `CLAUDE.md` : dit "Gemini 2.0 Flash" mais on utilise OpenRouter multi-modeles — a corriger
- **BLOQUANT** : pas de validation du JSON retourne par le LLM — un JSON malformed crash le pipeline.
  Fix : ajouter validation zod/ajv + retry si malformed. Priorite 0 avant toute autre implementation.

---

## 3. Architecture cible

### Pipeline complet (vision finale)

```
FETCH (parallele)                    ENRICHMENT (local)              LLM CHAIN (sequentiel)
┌─────────────────┐                 ┌──────────────────┐
│ Yahoo (38 assets│──┐              │ Multi-timeframe  │
│   multi-TF)     │  │              │   10y/3y/1y      │
│ Yahoo batch     │──┤              │ Drama Score      │
│   (763 actions) │  │              │ Support/Resist   │
│ RSS (~30 feeds) │──┤              │ Correlations     │
│ Finnhub news    │──┼─→ Snapshot ──┼─→ Volume anomaly ┼─→ Enriched
│ Finnhub earnings│──┤              │ Trend direction  │  Snapshot
│ FRED            │──┤              │ ATH/ATL detect   │     │
│ CoinGecko       │──┤              │ Stock screening  │     │
│ Alternative.me  │──┤              │ Mover flagging   │     │
│ Supabase cal.   │──┘              └──────────────────┘     │
                                                              │
                  ┌───────────────────────────────────────────┤
                  │                                           │
                  ▼                                           ▼
         ┌────────────────┐                          ┌────────────────────┐
         │ NEWS MEMORY    │                          │ 1. Haiku: tag news │
         │ (SQLite+FTS5)  │◄─── store tagged news ──│    (batch, ingest) │
         │ articles_fts   │                          └────────────────────┘
         │ article_assets │                                   │
         │ article_themes │                                   ▼
         └───────┬────────┘                          ┌────────────────────┐
                 │                                   │ 2. Haiku: research │
                 │  query by asset/theme/FTS         │    (build brief)   │
                 └──────────────────────────────────→│                    │
                                                     └─────────┬──────────┘
                                                               │
                                                        ResearchBrief
                                                               │
                                    ┌──────────────────┐       │
                                    │ Knowledge Base   │───┐   │
                                    │ + EpisodeMemory  │   │   │
                                    └──────────────────┘   │   │
                                                           ▼   ▼
                                                     ┌────────────────────┐
                                                     │ 3. Opus: script    │
                                                     │    (enriched ctx)  │
                                                     └─────────┬──────────┘
                                                               │
                                                     ┌────────────────────┐
                                                     │ 4. Haiku: SEO      │
                                                     └─────────┬──────────┘
                                                               ▼
                                                     EnrichedEpisodeScript
                                                               │
                                                               ▼
                                                     ┌────────────────┐
                                                     │ TTS ElevenLabs │
                                                     └───────┬────────┘
                                                             │
                                                             ▼
                                                     ┌────────────────┐
                                                     │ Remotion Render │
                                                     └───────┬────────┘
                                                             │
                                                             ▼
                                                     ┌────────────────┐
                                                     │ Quality Gate   │
                                                     └───────┬────────┘
                                                             │
                                                             ▼
                                                     ┌────────────────┐
                                                     │ Upload YouTube │
                                                     │ + SEO + Notif  │
                                                     └────────────────┘
```

### Strategie LLM

| Tache | Production | Dev/Test | Raison |
|-------|-----------|----------|--------|
| Formatage data | Claude Haiku | OpenRouter free | Mecanique, pas de creativite |
| Analyse + knowledge | Claude Sonnet | OpenRouter free | Raisonnement marche |
| **Script narratif** | **Claude Opus** | OpenRouter free | Coeur du produit |
| SEO / thumbnails | Claude Haiku | OpenRouter free | Mecanique |

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
| `fast` | claude-haiku-4-5-20251001 | qwen/qwen3-4b:free | Formatage, SEO, taches mecaniques |
| `balanced` | claude-sonnet-4-6 | qwen/qwen3-235b-a22b-thinking-2507 | Analyse, knowledge loading |
| `quality` | claude-opus-4-6 | meta-llama/llama-3.3-70b-instruct:free | Script narratif (coeur produit) |

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

> QUESTION : faut-il pouvoir forcer le provider par appel (ex: toujours OpenRouter pour le SEO meme en prod) ?
> Recommandation : non en V1. Si le cout Haiku est negligeable (~0.01$/appel), autant rester coherent sur un seul provider en prod.

**Cout production estime** : ~0.80-1.00 EUR/video (Haiku 2x + Sonnet 1x + Opus 1x).

### Monorepo

```
packages/
  core/       → Types, brand, layout, animations (dependance de tout)
  data/       → Fetch + enrichissement (Yahoo multi-TF, FRED, Finnhub, CoinGecko, sentiment, ~30 RSS,
                stock screening, candle cache)
  ai/         → LLM client, prompts, knowledge base, episode memory, SEO,
                news memory (SQLite+FTS5, tagging rules, research context), causal analysis
  remotion-app/ → Scenes, composants, compositions
scripts/      → CLI (generate, fetch, script, render, prompt-studio)
knowledge/    → Fiches markdown d'analyse fondamentale
data/         → Snapshots, scripts, episodes, news-memory.db, indices/*.json, candles/, logs (gitignore)
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

**Bloquants** (fail = re-generation) : zero terme interdit AMF, disclaimer present, duree 480-600s, ratio mots correct, suivi J-1 present, cold open specifique, pas de liste dans le recit.

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

### Bloc C — Prompt Engineering v2

**Dependances** : Bloc A (EnrichedSnapshot) + Bloc B (knowledge base)
**Impact** : c'est LE coeur du produit — la qualite du script fait ou defait la video

#### C.1 Structure du system prompt

Le prompt est organise en blocs clairs, chacun avec un role precis :

| Bloc | Role | Tokens ~estimes |
|------|------|----------------|
| Identite & persona | Definir le narrateur, son ton, ses expressions | 200 |
| Compliance AMF | Regles de langage, vocabulaire autorise/interdit | 300 |
| Structure narrative | Template de script, drama scores, budget temps | 400 |
| Obligations par episode | Ce qui doit apparaitre (suiviJ1, surprise, CTA) | 200 |
| Knowledge context | Injecte par le loader — varie chaque jour | 500-1500 |
| Episode memory | Contexte des 5 derniers episodes | 300-800 |
| Format de sortie | Schema JSON exact attendu | 500 |

**Total prompt** : ~2500-4000 tokens selon le jour.

> QUESTION : avec un prompt de 4000 tokens + un user message de ~2000 tokens (snapshot),
> et une reponse de ~3000 tokens (script), on est a ~9000 tokens total.
> Opus peut gerer ca facilement. Mais il faut surveiller le cout.

#### C.2 Persona narrateur

```
Tu es [NOM], analyste de marche independant, 10 ans d'experience.
Tu tutoies ton audience. Ton analyse est directe, jamais generique.
Tu fais des liens entre les marches — tu ne fais JAMAIS de liste.
Tu crees du suspense. Phrases courtes, rythmees. Maximum 15 mots en analyse technique.
Tu vulgarises les termes techniques en UNE phrase naturelle.
Tu as des expressions signatures : [a definir — contribue a l'identite de la chaine]
```

> QUESTION : quel nom pour le persona ? Ca contribue au branding.
> Il faut un nom qui sonne analyste FR, memorable, coherent avec "TradingRecap".

#### C.3 Structure narrative dynamique

Le LLM recoit :
- Les drama scores de chaque asset
- Un budget temps total (480-600s)
- Les themes du jour (risk-on/off, event macro, breakout, etc.)

Il decide :
- Le nombre de deep dives (1-3) et leur duree
- L'angle du "recit du jour" (pas une liste, une HISTOIRE)
- L'ordre des segments (variable selon contexte)

Segments disponibles :

| Segment | Duree | Obligatoire |
|---------|-------|-------------|
| Cold open | 5-8s | Oui — UNE phrase choc sur le top mover |
| Titre anime | 3-5s | Oui |
| Suivi J-1 | 20-40s | Oui (sauf episode 1) |
| Recit du jour | 60-90s | Oui — l'HISTOIRE, pas une liste |
| Dashboard flash | 30-45s | Oui — vue rapide de tous les assets |
| Deep dive(s) | 60-150s chacun | 1 a 3 selon drama scores |
| Correlation spotlight | 45-60s | Optionnel — quand correlation notable |
| Macro & sentiment | 45-60s | Oui si event macro ou shift sentiment |
| News impact | 30-45s | Oui si news significative |
| Zones a surveiller | 45-60s | Oui — les 3 niveaux cles du jour |
| Recap 3 points | 15-20s | Oui |
| Outro + teaser | 10-15s | Oui — CTA + "demain on surveille..." |

#### C.4 Type EnrichedEpisodeScript

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

> QUESTION : le champ `variationStructure` de l'ancien blueprint est-il necessaire ?
> Si le LLM decide deja l'ordre des segments et le nombre de deep dives, c'est redondant.
> Recommandation : ne pas l'inclure. Laisser le LLM structurer librement dans les sections[].

#### Livrable Bloc C
Nouveau system prompt complet + type `EnrichedEpisodeScript` dans types.ts + tests via Prompt Studio.

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

- 5 episodes max en contexte (au-dela = tokens gaspilles pour peu de valeur)
- Niveaux cles expires apres 10 jours (sauf si retestes)
- Le suivi J-1 est OBLIGATOIRE — mode degrade si indisponible ("donnees non disponibles")
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
  → query SQLite par asset + theme (7-14 derniers jours)
  → formatResearchContext() construit le contexte en code
  → Le contexte est injecte dans le prompt du Writer (Opus)
```

Resultat : le LLM peut ecrire "L'or franchit les $5000, 3eme seance consecutive de hausse
depuis que les tensions US-Iran se sont intensifiees le 12 fevrier" au lieu de juste constater le prix.

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

Un seul fichier : `data/news-memory.db`. Pas de vector DB (overkill a ~7000 articles/an).

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
- `searchByAsset(symbol, { days: 7 })` — articles recents liés a un asset
- `searchByTheme(theme, { days: 14 })` — articles recents par theme macro
- `searchFullText(query)` — recherche BM25 dans title+summary+digest
- `getHighImpactRecent(days)` — articles a fort impact

Performance : <10ms sur 50K+ documents avec FTS5.

> UPGRADE PATH : si la recherche semantique devient necessaire, ajouter `sqlite-vec`
> pour des embeddings sans changer le schema ni l'infra.

#### D2.4 Research Context (CODE, pas LLM)

Avant la generation du script, une fonction `buildResearchContext()` construit le contexte
historique par **queries SQL + formatage code**. Pas d'appel LLM — les donnees structurees
suffisent, c'est Opus qui fait la synthese narrative.

1. Identifie les top movers du snapshot (drama score > seuil ou |changePct| > 0.5%)
2. Pour chaque mover : `SELECT title, published_at FROM articles JOIN article_assets ... WHERE symbol = ? AND published_at > date(-7 days) ORDER BY published_at DESC LIMIT 5`
3. Query themes dominants : `SELECT theme, COUNT(*) FROM article_themes WHERE ... GROUP BY theme ORDER BY count DESC LIMIT 5`
4. Charge les 3-5 derniers episode summaries (Bloc D)
5. Formate le tout en texte structure (pas de type complexe — juste du markdown/texte)

**Format injecte dans le prompt Opus** (section `## Contexte historique`) :

```
## Contexte historique (7 derniers jours)

### XAUUSD (or) — 5 articles recents
- 2026-02-18 : "Fed signals pause, gold rallies to $5050" (source: CNBC)
- 2026-02-17 : "Gold extends gains for 3rd session" (source: Yahoo Finance)
- 2026-02-15 : "US-Iran tensions boost safe havens" (source: Reuters via EasyBourse)

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

**Decay temporel** : les articles recents comptent plus. Approche simple : limiter les queries SQL
a 7-14 jours. Pas de fonction de decay complexe en V1.

**Narrative threads** : detection implicite via groupement par theme + fenetre temporelle.
Les articles partageant le meme theme dans les 7 derniers jours forment un "fil narratif".
C'est Opus (le scripteur) qui synthetise l'evolution a partir de la liste chronologique formatee.

#### D2.6 Bootstrapping

- **Jour 1-3** : DB vide → Research brief vide → le Writer fonctionne comme aujourd'hui (pas de regression)
- **Jour 7+** : contexte commence a emerger (1-2 articles par asset)
- **Jour 14+** : narrative threads detectables ("3eme seance de hausse consecutive")
- **Backfill possible** : tagger les news des snapshots existants dans `data/snapshot-*.json`

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

#### Livrable Bloc D2
Dans `@yt-maker/ai/memory/` : `tagArticles()` (rules), `NewsMemoryDB` (SQLite), `buildResearchContext()` (SQL + format).
Integration dans le pipeline generate : fetch → tag & store (code) → research context (SQL) → script (Opus).

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
| PreviouslyOnScene | Devenir "Suivi J-1" avec resultats (check/cross) |
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
- Cout : ~22 EUR/mois (plan Creator)

#### F.2 Integration technique

- Un appel TTS par section du script
- Word-level timestamps → sous-titres animes dans Remotion
- `AudioManifest` (type existant dans `core/types.ts`) contient les segments + timing

#### F.3 Anti-robot (imperfections volontaires)

Le prompt de narration doit inclure :
- Pauses naturelles ("... enfin, plus precisement ...")
- Variations de ton : energique sur les mouvements forts, pose sur le macro
- Rythme variable : ralentir sur les niveaux cles, accelerer sur le contexte

> QUESTION : ElevenLabs supporte-t-il les instructions de prosodie (pauses, emphase) ?
> A tester. Si non, les "imperfections" devront etre dans le texte (ellipses, tirets).

#### Livrable Bloc F
`generateAudio(script): AudioManifest` + integration dans le pipeline render.

---

### Bloc G — SEO & Upload

**Dependances** : Bloc C (script), Bloc F (video renderee)
**Impact** : decouvabilite sur YouTube — inutile de faire une bonne video si personne ne la voit

#### G.1 SEOPackage

```typescript
interface SEOPackage {
  titre: string                  // 50-60 chars
  titreAlternatif: string        // A/B test
  descriptionAbove: string       // 150 chars (visible avant "voir plus")
  descriptionFull: string        // 300-500 mots
  chapters: Array<{ timecode: string; label: string }>
  tags: string[]                 // 5-8
  hashtags: string[]             // 3-5
  pinnedComment: string
  nomFichier: string             // MP4 renomme
  playlistId: string
  categoryId: "27" | "25"        // Education=27, News=25
}
```

Genere par Haiku a partir du script. Cout negligeable.

#### G.2 Coherence semantique

Le mot-cle principal doit apparaitre dans : titre, description, tags, chapters, transcript (prononce par le narrateur), sous-titres, thumbnail, nom fichier. Le prompt Opus doit inclure l'instruction de prononcer le mot-cle dans les 30 premieres secondes.

#### G.3 Upload YouTube

- YouTube Data API v3
- Upload video + metadata + thumbnail
- Post pinned comment automatique
- Ajout a la bonne playlist

> QUESTION : OAuth 2.0 YouTube requiert une verification Google pour les apps "publiques".
> Pour un usage personnel (sa propre chaine), un token OAuth "testing" suffit-il indefiniment ?
> A verifier avant de coder — si limitation, envisager un upload semi-auto via CLI.

#### Livrable Bloc G
`generateSEO(script): SEOPackage` + `uploadToYouTube(video, seo)`.

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

**1. Unicite narrative (dans le prompt Opus)**
- Hook contenant un element date-specifique (jamais generique)
- Biais directionnel clair et assume — jamais "ca peut monter ou descendre"
- Surprise du jour obligatoire (element inattendu)
- Connecter l'actualite mondiale aux actifs (pas juste les chiffres)
- Mood marche adapte le registre emotionnel

**2. Continuite et memoire (EpisodeMemory — Bloc D)**
- Suivi J-1 obligatoire avec resultats honnetes
- References a des episodes passes : "comme je le disais il y a 3 jours..."
- Fil directeur hebdomadaire (les themes de la semaine)
- Niveaux precis avec dates : "1.0823 — niveau du 12 fevrier"

**3. Interaction audience (dans le prompt + SEO)**
- Question ouverte unique en CTA final (liee a l'analyse du jour)
- 1x/semaine : integrer un commentaire de viewer (reel ou simule au debut)
- Expressions signatures recurrentes (contribuent a l'identite)

**4. Imperfections volontaires (TTS — Bloc F)**
- Pauses naturelles, hesitations legeres
- Ton energique sur les mouvements forts, pose sur le contexte macro
- Rythme variable (pas monotone)
- References a l'observation : "ce matin en regardant les donnees..."

**5. Variations visuelles (Remotion — Bloc E)**
- Couleur dominante pilotee par le mood du jour
- Ordre des segments variable selon drama scores
- Nombre d'assets variable (2-3 deep dives)
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
| Anthropic API (script) | ~25-40 EUR | 22 videos × Opus (~30K input tokens). Scenarios forward Haiku ~0.30$ |
| ElevenLabs | ~22-99 EUR | Creator (100min/mois) ou Scale (500min) si 22 videos × 10min depasse |
| Flux AI (fal.ai) | ~3-5 EUR | Thumbnails (V2) |
| Hosting | ~5-10 EUR | VPS ou Railway |
| **Total** | **~55-154 EUR/mois** | Fourchette large selon plan ElevenLabs |

> NOTE : le cout ElevenLabs depend de la duree totale. 22 videos × 10min = 220 min/mois.
> Le plan Creator (100 min) ne suffit PAS. Options : plan Scale (~99 EUR), ou batch API,
> ou reduire a 15 videos/mois, ou utiliser des voix non-clonees moins cheres.
> A evaluer au moment du Bloc F.

**Cout par video : ~2-3 EUR**

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

**Objectif** : une video complete (data enrichie + script Opus + scenes ameliorees + TTS) publiee sur YouTube.

| Priorite | Bloc | Taches cles |
|----------|------|-------------|
| 1a | ~~A Phase 1~~ | ~~21 assets + 8 RSS + FRED + Finnhub + CoinGecko + Supabase~~ **FAIT** |
| 1b | A Phase 2 | 38 assets multi-TF + ~30 RSS + Finnhub news + screening 763 actions + suppr FMP | **A FAIRE** |
| 2 | B (knowledge) | Knowledge loader + fiches manquantes (central-banks, asset-profiles) |
| 3 | D (memory) | Version simple : sauvegarde predictions + suivi J-1 |
| 3.5 | D2 (news memory) | SQLite + tagging Haiku + research brief |
| 4 | C (prompt) | Prompt Opus v2 avec compliance + persona + structure narrative |
| 5 | A2 (market intel) | Market RAG (~763 actions), analyse causale, scenarios forward |
| 6 | E (scenes) | 4-5 scenes essentielles + DisclaimerBar + quelques composants |
| 7 | F (TTS) | ElevenLabs clone + integration audio |
| 8 | G (SEO) | SEOPackage basique + upload semi-auto |

### V1.5 — Stabilisation

- Knowledge base complete (toutes les fiches)
- EpisodeMemory complet avec fil directeur hebdomadaire
- Quality gate automatique
- Pipeline resilience basique (fallbacks, retry)

### V2 — Qualite professionnelle

- Toutes les scenes (12) + composants visuels avances
- Drama Score calibre sur episodes reels
- Segments speciaux hebdomadaires
- Thumbnail generator (Sharp.js)
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
