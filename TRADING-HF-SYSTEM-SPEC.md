# Trading HF System — Spec V1

> Système de trading automatisé multi-agent, inspiré du fonctionnement d'un hedge fund.
> Réutilise la data, les mémoires et les connaissances déjà produites par le pipeline TradingRecap.
> Pont d'exécution via MT5 IC Markets (CFD uniquement). Stratégies autorisées : intraday strict OU carry positif multi-jours.
> Cohérent avec : BLUEPRINT v3, D2 NewsMemory, D3 MarketMemory, Bloc B Knowledge, Bloc C Pipeline.

---

## Table des matières

1. [Vue d'ensemble & principes](#1-vue-densemble--principes)
2. [Contraintes opérationnelles](#2-contraintes-opérationnelles)
3. [Univers d'instruments](#3-univers-dinstruments)
4. [Modes de trading autorisés](#4-modes-de-trading-autorisés)
5. [Architecture en couches](#5-architecture-en-couches)
6. [Hiérarchie temporelle](#6-hiérarchie-temporelle)
7. [Casting multi-agent (trading floor)](#7-casting-multi-agent-trading-floor)
8. [Débat orchestré (5 rounds)](#8-débat-orchestré-5-rounds)
9. [Evidence-first — anti-hallucination](#9-evidence-first--anti-hallucination)
10. [Toolkit complet](#10-toolkit-complet)
11. [Data sources](#11-data-sources)
12. [Risk framework](#12-risk-framework)
13. [Correlation & exposure management](#13-correlation--exposure-management)
14. [Exit logic & calendar awareness](#14-exit-logic--calendar-awareness)
15. [MT5 bridge & exposure feedback](#15-mt5-bridge--exposure-feedback)
16. [Dashboard de supervision](#16-dashboard-de-supervision)
17. [Journal & boucle d'apprentissage](#17-journal--boucle-dapprentissage)
18. [Backtester](#18-backtester)
19. [Types & interfaces clés](#19-types--interfaces-clés)
20. [Coûts LLM estimés](#20-coûts-llm-estimés)
21. [Roadmap build V1](#21-roadmap-build-v1)
22. [Extensions V2/V3](#22-extensions-v2v3)
23. [Questions ouvertes](#23-questions-ouvertes)

---

## 1. Vue d'ensemble & principes

### Pourquoi ce système

Le pipeline vidéo produit chaque matin une **compréhension structurée du marché** (EnrichedSnapshot, CausalBrief, MarketMemory, NewsMemory, ForwardScenarios, knowledge RAG). Cette matière première est exactement ce qu'une salle de trading consomme pour prendre des décisions. L'objectif est de brancher un collectif d'agents LLM + règles quantitatives sur cette data, générer des signaux auditables, les exécuter via MT5, et apprendre de chaque décision.

### Principes directeurs

- **Aucune hallucination tolérée** : tout claim chiffré d'un agent doit être backé par un tool call récent (`evidence_id`). Le validateur refuse sinon.
- **Code d'abord, LLM en jugement** : les règles déterministes (corrélation, sizing, stops, limits) sont du code ; les LLMs décident de *thèse*, pas de *chiffres*.
- **Risk indépendant du PnL** : l'agent Risk a droit de veto, ne voit pas les convictions des specialists avant son verdict chiffré.
- **Hiérarchie temporelle explicite** : thèse trimestrielle → révision hebdo → décision quotidienne → monitoring intraday. Chaque niveau contraint le suivant.
- **Evidence first, narrative second** : la thèse vient après les chiffres, jamais avant.
- **Paper avant live, toujours** : minimum 3 mois paper trading + ≥50 trades avant micro-capital réel.
- **Auditabilité intégrale** : chaque trade a un transcript de débat complet rejouable.

---

## 2. Contraintes opérationnelles

### Broker : IC Markets (MT5)

- **Instruments dispo** : FX majors/minors/exotics, indices CFD (SPX500, NAS100, DJI, GER40, CAC40, UK100, JP225, AUS200, HK50), commos CFD (XAUUSD, XAGUSD, WTI, BRENT, NATGAS), crypto CFD (BTCUSD, ETHUSD + quelques alts), parfois actions CFD US/EU.
- **Pas d'options**, **pas de COT data native**, **pas de futures fiables**.
- **Swaps** appliqués chaque soir sur positions overnight (positifs ou négatifs selon pair + direction).
- **Spreads Raw / Standard** : utiliser compte Raw si possible (spreads mini + commission fixe).
- **Horaires** : FX 24/5, indices et commos selon sessions, crypto 24/7.

### Ce qu'on perd sans options/COT

- Pas de hedging optionnel (couvrir une longue avec puts)
- Pas de lecture IV / skew / put-call ratio
- Pas de positionnement futures smart money

### Ce qu'on compense avec

- Sentiment NewsMemory (déjà en place)
- Volatilité réalisée rolling (proxy IV)
- Flows sectoriels actions (via ETFs quand CFD dispo)
- Retail sentiment Finnhub / Marketaux (proxy positionnement)

---

## 3. Univers d'instruments

### Watchlist V1 (22 instruments priorisés)

**FX** (6) : EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF
**FX carry** (3) : AUDJPY, NZDJPY, EURJPY (historique bons swaps positifs long JPY-side)
**Indices** (5) : SPX500, NAS100, GER40, JP225, UK100
**Commos** (4) : XAUUSD (Gold), XAGUSD (Silver), WTI, NATGAS
**Crypto** (2) : BTCUSD, ETHUSD
**DXY proxy** (1) : USDX CFD ou panier calculé
**Bonds proxy** (1) : US10Y via CFD si dispo, sinon ETF TLT

### Critères de sélection

- Liquidité CFD suffisante chez IC Markets
- Spread acceptable en session active
- Historique 10+ ans dispo (pour MarketMemory + backtest)
- Présence dans NewsMemory + knowledge chunks

### À évaluer pour V2

- Actions CFD individuelles (AAPL, NVDA, TSLA, MSFT) si disponibles ICM
- Indices secondaires (CAC40, AUS200, HK50)
- Crypto étendus (SOL, XRP) si liquidité suffisante

---

## 4. Modes de trading autorisés

### Mode A — Intraday strict

- Ouverture et fermeture **dans la même session** (pas de swap).
- Horizon : quelques heures à 1 journée.
- Sources de signal : momentum multi-TF, break de zone MarketMemory, news shock ±2σ, events macro.
- Stop systématique < 1% risk/trade.
- Fermeture forcée 30 min avant close de session si position encore ouverte.

### Mode B — Carry positif multi-jours

- Autorisé **uniquement si swap overnight > 0** sur la direction du trade.
- Vérification automatique avant entrée : `get_swap(symbol, direction)` → si ≤ 0 → rejet auto.
- Historiquement favorable : long AUDJPY, long NZDJPY, long USDTRY (mais risqué), short EURJPY parfois.
- Horizon : 3-30 jours, jusqu'à invalidation thèse ou retournement swap.
- Sizing réduit vs intraday (× 0.5) à cause du risque overnight prolongé.

### Mode C — Stat arb pair trading (V2, pas V1)

- Paires cointégrées (ex. Gold/Silver ratio, EURUSD/GBPUSD spread)
- Market-neutral, peut passer en overnight même sans carry positif si spread en Z-score extrême
- Laissé V2 — besoin d'un moteur de cointégration dédié.

### Règle d'or

**Si ni intraday, ni carry positif, ni stat arb — on ne trade pas.** On ne paye pas de swap négatif.

---

## 5. Architecture en couches

```
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 0 — Data & Mémoires (existant, réutilisé)                │
│  EnrichedSnapshot · MarketMemory · NewsMemory · Knowledge · FRED│
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 1 — Thèse & Contexte (LLM, faible fréquence)             │
│  Thèse trimestrielle · Playbook mensuel · Thème hebdo            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓ context
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 2 — Evidence Toolkit (code, haute fréquence)             │
│  20+ tools déterministes, caching, evidence_id                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓ sur demande des agents
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 3 — Trading Floor (multi-agent, quotidien + intraday)    │
│  Analysts · Specialists · Strategist · Risk · Head of Trading    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓ TradeDecision[]
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 4 — Risk & Sizing (code, dur)                            │
│  Limits · Correlation · VaR · Kelly fractional                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓ SizedOrder[]
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 5 — MT5 Bridge (code)                                    │
│  Send orders · Read positions · Update stops · Monitor           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓ exposure live
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 6 — Sentinel & Journal (code + Haiku)                    │
│  Monitoring 15min · News shock wakeups · Exits · SQLite journal  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 7 — Dashboard (web UI)                                   │
│  Portfolio live · Risk gauges · Agent feed · Attribution         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Hiérarchie temporelle

Chaque niveau **lit** les décisions du niveau supérieur et les contraint.

| Cadence | Agent principal | Output | Durée | Coût/run |
|---|---|---|---|---|
| Trimestriel (J-1 trimestre) | Opus 4.7 | `QuarterlyThesis` : régime dominant, thèmes porteurs, playbook, allocations cibles | ~15 min | ~$2 |
| Mensuel (1er du mois) | Sonnet | `MonthlyAttribution` + tuning prompts, révision thèse si nécessaire | ~10 min | ~$0.80 |
| Hebdo (dimanche soir) | Sonnet | `WeeklyTheme` : preview calendar, positionnement, thèses confirmées/challengées | ~8 min | ~$0.60 |
| **Quotidien 07:30** | **Opus (PM) + team** | **`DailyDecision[]`** : entries, exits, adjustments | **~5 min** | **~$3-4** |
| Intraday 12:30 | Haiku + Sonnet | `IntradayReview` : risk check, trailing, news scan | ~2 min | ~$0.30 |
| Intraday 15:30 (US open) | Haiku + Sonnet | `USOpenReview` : nouveaux setups US, adjustments | ~2 min | ~$0.30 |
| Close 22:00 | Haiku | `DailyJournal` : P&L, outcomes, preparation J+1 | ~1 min | ~$0.10 |
| Event-driven | Haiku Sentinel | `RiskAlert` + action suggérée si shock | 30 sec | ~$0.05/event |

**Budget LLM quotidien ≈ $4-5** (hors post-mortem hebdo/mensuel/trimestriel).

### Règles de cohérence

- Le **daily** ne contredit pas la **thèse trimestrielle** sans justification explicite (logged).
- Le **hebdo** peut flagger "thèse trimestrielle à réviser" → réunion spéciale (Opus).
- Un trade qui contredit la thèse active est autorisé mais doit être **justifié et loggé** comme "tactique contraire".

---

## 7. Casting multi-agent (trading floor)

### Researchers / Analysts (round parallèle, Haiku)

Chacun lit les mêmes inputs de base (EnrichedSnapshot + mémoires) + invoque ses tools spécifiques, produit un **memo structuré** (200-400 mots + claims chiffrés avec `evidence_id`).

| Agent | Focus | Tools privilégiés |
|---|---|---|
| **Macro Analyst** | Taux, inflation, banques centrales, cycle éco | `get_fred`, `get_yield_curve`, `get_calendar`, `get_news(macro themes)` |
| **Technical Analyst** | Zones, patterns, multi-TF, structure de marché | `get_candles`, `get_52w_context`, MarketMemory zones |
| **News/Narrative Analyst** | Narrative dominant, story decay, angles inédits | `get_news`, NewsMemory FTS5, theme clusters |
| **Sentiment/Flows Analyst** | Vol réalisée, breadth, DXY triangle, retail sentiment | `get_vix_proxy`, `get_correlation`, retail data |
| **Intermarket Analyst** | Corrélations rolling, rotations, causalité | `get_correlation`, CausalBrief étendu |

### Specialists / Traders (round parallèle, Sonnet)

Chacun **lit tous les memos analysts**, se concentre sur sa classe d'actifs, propose **0-3 trades** avec thèse, entry, invalidation, target, horizon, conviction (0-1), et cite les evidence_ids qu'il utilise.

| Agent | Univers |
|---|---|
| **FX Specialist** | EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, paires carry |
| **Indices Specialist** | SPX500, NAS100, GER40, JP225, UK100 |
| **Commos Specialist** | XAUUSD, XAGUSD, WTI, NATGAS |
| **Crypto Specialist** | BTCUSD, ETHUSD |

### Strategist (Sonnet)

Lit **toutes les propositions**. Son rôle :
- Détecter les **trades redondants** (ex. long SPX + long BTC + short JPY = même pari risk-on)
- Challenger les incohérences avec la thèse trimestrielle
- Proposer des **regroupements** ou des **suppressions** ("trop corrélé au reste du book")
- Suggérer des **paires naturelles** (long X / short Y pour exprimer une vue sans prendre le bêta marché)

### Risk Manager (code + Haiku validation)

**Phase code (déterministe)** :
- Calcule corrélation moyenne de chaque candidat avec les positions existantes + les autres candidats
- Applique limits (gross, net, cluster, VaR)
- Rejette automatiquement ce qui dépasse

**Phase LLM (Haiku, validation narrative)** :
- "Cette position est-elle cohérente avec le régime actuel ? Le calendrier à 48h ?"
- Peut soft-veto avec raison (PM peut override avec justification)

### Head of Trading — Opus 4.7 (PM)

Lit :
- Thèse trimestrielle active
- Memos analysts (5)
- Propositions specialists (4)
- Challenge strategist
- Verdict risk (hard rules + soft veto)

Produit :
- `DailyDecision[]` final : liste des orders à envoyer (entries, exits, adjustments)
- Pour chaque : conviction finale, size recommandée (fractional Kelly modulé), invalidation, horizon, justification liée aux evidence
- Optionnellement : un 2e round si Opus juge que les propositions manquent de profondeur

---

## 8. Débat orchestré (5 rounds)

Pas de conversation libre (cher, non reproductible). **5 rounds structurés**, orchestrateur code pur.

```
ROUND 1 — Briefing (code)
  Inputs servis à tous : EnrichedSnapshot + MarketMemory + NewsMemory diff + QuarterlyThesis active
  Pas de LLM ici.

ROUND 2 — Research (5 Haikus en parallèle)
  Chaque analyst invoque ses tools + produit son memo.
  Output : 5 AnalystMemo (JSON structuré avec claims + evidence_ids).

ROUND 3 — Propositions (4 Sonnets en parallèle)
  Chaque specialist lit les 5 memos + ses tools spécifiques.
  Output : 0-3 TradeProposal par specialist (max 12 total).

ROUND 4 — Challenge & Risk (séquentiel rapide)
  Strategist lit toutes les propositions → StrategyReview (regroupements, suppressions).
  Risk code applique hard rules → RiskVerdict (approuvé / rejeté / warning).
  Risk Haiku relit → soft veto narratif.

ROUND 5 — Arbitrage Opus (1 Opus)
  Lit l'intégralité : thèse + memos + propositions + strategy + risk.
  Produit DailyDecision[] final avec justifications liées aux evidence.
  Peut demander 1 re-round research si thèse majeure manque d'evidence.

LOG : tout le débat est persisté dans SQLite (trades.db) avec transcript complet.
```

### Garde-fous

- **Timeout dur** par agent (Haiku 30s, Sonnet 60s, Opus 120s). Si timeout → memo vide, le débat continue sans.
- **Max tokens** par memo (évite la dérive verbale).
- **Pas de re-round** sauf demande explicite Opus.
- **Schema validation** (Zod) à chaque étape — un output non conforme → fallback dégradé.

---

## 9. Evidence-first — anti-hallucination

### Principe

**Aucun agent n'affirme un chiffre qu'il n'a pas récupéré via un tool call de cette session.**

### Implémentation

Chaque `tool call` retourne un wrapper :

```ts
interface ToolResult<T> {
  evidence_id: string;       // hash(tool_name + args + timestamp)
  timestamp: string;         // ISO 8601
  tool: string;              // nom du tool
  args: Record<string, any>; // args normalisés
  data: T;                   // payload
  ttl_seconds: number;       // fraîcheur acceptable
}
```

Les memos d'agents sont structurés :

```ts
interface AnalystMemo {
  agent: string;
  thesis: string;                    // narratif
  claims: Array<{
    statement: string;               // ex. "EURUSD a cassé la zone 1.0820 hier"
    evidence_ids: string[];          // hashes des tool results qui supportent
    confidence: number;              // 0-1
  }>;
  recommended_focus: string[];       // pour les specialists en aval
}
```

### Validator (code, après Round 2 et Round 3)

Pour chaque `claim` :
1. Extraire les chiffres mentionnés (regex)
2. Vérifier qu'au moins un `evidence_id` cité est présent et contient ces chiffres (tolérance ±0.5%)
3. Si mismatch → claim **flaggée** → le memo est renvoyé à l'agent (max 1 retry) avec feedback
4. Après retry échoué → claim supprimée du memo + warning loggé

### Cas limites

- **Assertions qualitatives** (ex. "le sentiment est baissier") n'ont pas besoin de chiffre mais doivent citer un evidence (ex. `get_news` result).
- **Inférences** (ex. "ce pattern suggère X") sont autorisées mais doivent citer le pattern sous-jacent + au moins un précédent historique via `get_historical_precedent`.
- **Thèse non-chiffrée** (ex. "je pense que la BCE va être dovish") est tolérée **uniquement au niveau Opus** et doit être flaggée comme `speculative` dans le journal.

---

## 10. Toolkit complet

### Market data (cache 60s-5min selon tool)

```ts
get_quote(symbol): { bid, ask, last, change_pct, volume, session_high, session_low }
get_candles(symbol, timeframe, n): OHLCV[]    // tf: M5, M15, H1, H4, D, W
get_52w_context(symbol): { high52w, low52w, pct_from_high, pct_from_low }
get_spread(symbol): number
get_swap(symbol, direction): { swap_long, swap_short, broker_note }
```

### Technical

```ts
get_indicators(symbol, tf): { rsi14, atr14, sma20, sma50, sma200, ema9, ema21, bb_upper, bb_lower }
get_zones(symbol): { support[], resistance[], pivots } // depuis MarketMemory
get_patterns(symbol, tf): Pattern[]                      // engulfing, HH/HL, etc.
get_correlation(symbols[], window_days): Matrix
get_cointegration(a, b, window): { is_cointegrated, z_score, half_life }
```

### Macro & calendar

```ts
get_fred(series_id, months): TimeSeries
get_yield_curve(): { y2, y5, y10, y30, spread_2_10, spread_5_30 }
get_calendar(days_ahead): EconomicEvent[]
get_pending_events(hours_ahead, filter_importance): EconomicEvent[]
```

### News & sentiment

```ts
get_news(query, since, limit): NewsItem[]              // FTS5 NewsMemory
get_news_sentiment(symbol, window): { polarity, volume, dominant_themes }
get_narrative_decay(theme): { age_days, intensity, peak_date }
get_retail_sentiment(symbol): { bull_pct, bear_pct, source } // Finnhub/Marketaux si dispo
```

### Historical intelligence

```ts
get_historical_precedent(symbol, pattern_description): Case[]
  // "RSI>80 + DXY haussier → médiane -3.2% à 10j (n=12, 2010-2026)"
get_seasonality(symbol, month): { avg_return, hit_rate, best_year, worst_year }
get_regime_history(since_date): Regime[]
```

### Portfolio state

```ts
get_portfolio_exposure(): { positions[], gross, net, by_cluster, by_currency }
get_pnl(window): { intraday, mtd, ytd }
get_open_orders(): Order[]
get_mt5_account_state(): { equity, balance, margin, free_margin, margin_level }
```

### Simulation

```ts
monte_carlo(symbol, horizon_days, n_paths, base_price?): Distribution
  // Returns: { p10, p25, p50, p75, p90, prob_up, expected_return, expected_drawdown }
stress_test(scenario): PortfolioPnL
  // scenarios: "VIX+50%", "DXY+3%", "risk_off", "oil_shock"
kelly_sizing(win_rate, avg_win, avg_loss, conviction): fraction
```

### Execution (Couche 5)

```ts
mt5_send_order(order): { ticket, execution_price, slippage }
mt5_modify_order(ticket, new_sl, new_tp): boolean
mt5_close_position(ticket, partial_pct?): { realized_pnl }
mt5_sync(): snapshot complet positions + pending
```

### Caching strategy

- Quotes : 60s
- Candles intraday : 5 min (M5/M15)
- Candles daily+ : 1h
- FRED : 24h
- News : temps réel (pas de cache) mais FTS5 déjà rapide
- Calendar : 6h
- Corrélation : 1h
- Precedents : 24h (recalcul quotidien)

---

## 11. Data sources

### Déjà disponibles (réutiliser)

- **Yahoo Finance** : quotes, candles 20+ années, multi-TF
- **FRED** : rates, inflation, macro US (+ indirect EU/UK)
- **Finnhub** : earnings, calendar partiel, retail sentiment (quota limité)
- **CoinGecko** : crypto étendu
- **NewsMemory SQLite** : 3105 articles tagués, FTS5
- **MarketMemory** : 35 assets, zones, indicators, régime
- **RSS 30 feeds** : news live
- **Knowledge RAG** : 133 chunks

### À ajouter (priorité V1)

- **CBOE VIX + term structure** (scraping simple) — compense l'absence d'options
- **Economic calendar premium** (Forexfactory ou TradingEconomics) pour importance + consensus/actual
- **DXY intraday** (déjà via Yahoo mais à prioriser)

### À ajouter (V2)

- **Marketaux API** pour sentiment NLP pré-calculé
- **Alternative.me Fear & Greed Index** (crypto + stocks)
- **CFTC COT report** (gratuit, hebdo) — on l'utilise comme signal même si pas tradable via options

### Non accessible / abandonné

- Options chains (pas de broker options ICM classique)
- Futures curve complète (pas de compte)
- Bloomberg data (coût prohibitif)

---

## 12. Risk framework

### Limits durs (code, immuables sans override humain)

```yaml
per_trade:
  max_risk_pct: 1.0              # Intraday
  max_risk_pct_carry: 0.5        # Carry overnight (réduit)
  min_rr: 1.5                    # reward/risk minimum

portfolio:
  max_gross_exposure_pct: 200    # sum(abs(position_size))
  max_net_exposure_pct: 100      # sum(position_size, signed)
  max_risk_cumulative_pct: 8     # sum(risk_per_trade) si tous stops touchés
  max_drawdown_pct: 10           # kill switch absolu

correlation:
  max_cluster_risk_pct: 3        # par cluster de corrélation
  max_corr_new_trade: 0.7        # vs positions existantes
  correlation_window_days: 30

var:
  var_95_daily_max_pct: 4        # perte max attendue 95% des jours
  cvar_95_max_pct: 6             # expected shortfall queue
```

### Kelly sizing fractional

$$f^* = \frac{bp - q}{b}$$

Avec :
- `p` = probabilité de gain (estimée via `get_historical_precedent` + conviction agent)
- `q = 1 - p`
- `b` = ratio gain/perte (target - entry) / (entry - stop)
- `f*` = fraction Kelly optimale

**Appliqué à 0.25×** (quarter Kelly) pour réduire variance, capé par les limits ci-dessus.

### VaR computation

- Monte Carlo daily, 10 000 paths
- Base : volatilité réalisée 30j + corrélation 30j du portefeuille
- Si VaR95 > limit → Risk refuse nouveaux trades tant que pas réduction

### Kill switch

- Drawdown 10% → **flat all positions**, plus de nouveaux trades 48h, Opus post-mortem obligatoire
- 3 trades perdants consécutifs → review hebdo avancée, réduction size × 0.5 pour 1 semaine
- Discrepancy MT5 vs journal interne → halt + alerte

---

## 13. Correlation & exposure management

### Matrice corrélation rolling

- Mise à jour toutes les heures
- 3 fenêtres : 30j (tactique), 90j (stratégique), 250j (long terme)
- Assets : watchlist complète + DXY + VIX proxy

### Clustering hiérarchique

- Algo : Ward linkage sur distance = `1 - |corr|`
- Nombre de clusters : déterminé par coupure à distance 0.4 (corr ≈ 0.6)
- Clusters typiques attendus :
  - `risk_on_tech` : NAS100, SPX500, BTCUSD, ETHUSD
  - `safe_haven` : XAUUSD, USDCHF, USDJPY (selon régime)
  - `cyclicals` : AUD, CAD, WTI, copper proxy
  - `dxy_inverse` : EURUSD, GBPUSD, XAUUSD
  - `jpy_pairs` : USDJPY, EURJPY, AUDJPY

### Règle d'entrée

Avant chaque nouvelle position :
1. Calculer `corr(nouveau_trade, each_existing_position)` sur 30j
2. Si max corr > 0.7 dans le **même sens directionnel** → vérifier cluster risk
3. Si cluster risk + nouveau trade > limit → reject ou size réduite

### Beta-weighted exposure

- Chaque position pondérée par son beta vs SPX500 (pour le cluster risk-on) ou vs DXY (pour FX)
- Net exposure calculé en beta-adjusted, pas en notionnel brut
- Affiché dans dashboard en priorité vs brut

---

## 14. Exit logic & calendar awareness

### Types d'exits

| Type | Trigger | Décideur |
|---|---|---|
| **Stop technique** | Prix ≤ stop (long) ou ≥ stop (short) | Code, auto |
| **Trailing stop** | Prix > high_since_entry - atr14 × K | Code, auto (K défini à l'entrée) |
| **Target** | Prix atteint TP défini | Code, auto |
| **Time stop** | Horizon dépassé sans progression | Code, auto |
| **Thesis invalidation** | Narrative / catalyst original disparu | Sentinel Haiku → PM confirm |
| **Regime shift** | `moodMarché` change de catégorie | PM (Opus) review toutes positions |
| **Event pre-hedge** | Event macro < 24h + position exposée + IV proxy élevée | Code + PM |
| **Kill switch** | Drawdown portfolio > 10% | Code, auto, flat tout |

### Calendar-aware exits

**H-24 avant un event macro `high_importance`** affectant un asset en position :

```
Pour chaque position ouverte:
  events_affecting = get_pending_events(24h) filtré par symbol/currency/theme
  for event in events_affecting:
    if event.importance == "high":
      if position.carry_positive and position.thesis_still_valid:
        → reduce 50%, garder le reste, pas de nouveaux trades sur l'asset
      elif position.intraday:
        → close before event
      else:
        → alert PM pour décision manuelle
```

**Events qui déclenchent** :
- FOMC / ECB / BoE / BoJ decisions
- CPI US / EU
- NFP
- GDP flash
- Referendums / élections
- OPEC meetings (pour oil)

### Thesis invalidation (LLM)

Chaque position a un `thesis_statement` structuré à l'entrée. Toutes les 4h, Sentinel Haiku :
1. Re-pull news depuis entrée
2. Récupère price action
3. Question : "La thèse originale tient-elle ? Y a-t-il invalidation partielle ?"
4. Output : `{ still_valid, confidence, reasons[] }`
5. Si `still_valid == false && confidence > 0.7` → flag PM pour décision

### Regime shift detection

- `moodMarché` recalculé toutes les 30 min (code, via VIX proxy + SPX breadth)
- Changement de catégorie (ex. `risk_on` → `risk_off`) → PM réveillé
- PM Opus fait un mini-round de review (15 min, ~$1) et décide des adjustments

---

## 15. MT5 bridge & exposure feedback

### Stack technique

- **Package Python `MetaTrader5`** (officiel MetaQuotes)
- Tourne sur même machine que MT5 terminal (Windows, déjà OK)
- Exposé au reste du système via **FastAPI local** (port 8765)
- Endpoints :
  ```
  GET  /positions          → live positions
  GET  /account            → equity, balance, margin
  POST /orders             → send market/pending
  POST /orders/{ticket}    → modify SL/TP
  DELETE /positions/{id}   → close
  GET  /history?since=...  → filled orders history
  WS   /stream             → push real-time updates
  ```

### Polling vs push

- **Positions state** : polling 15s (ou WS push si dispo)
- **Orders** : WS push pour confirmations
- **Account equity** : polling 60s
- Tout écrit en temps réel dans `data/mt5-state.json` + SQLite `trades.db`

### Reconciliation

- Toutes les 5 min, compare MT5 state vs journal interne
- Discrepancy (position unknown, size différent, ticket orphelin) → halt + alert
- Journal quotidien compare `[positions MT5] == [positions journal]` à 22:00

### Order types utilisés

- **Market** : pour entries sur signal "immediate" (news shock, breakout confirmé)
- **Limit** : pour entries sur zones (la majorité des trades)
- **Stop-loss / Take-profit** : toujours attachés à l'envoi, jamais mentaux

### Safety

- Dry-run mode par défaut (log only) tant que `PAPER_MODE=true`
- Max orders/jour : 10 (hard limit)
- Max size/order : 1% equity (hard limit au niveau bridge, même si le décideur demande plus)
- Disconnection détection : heartbeat 5s, si perdu → flat tout positions ouvertes (paranoid)

---

## 16. Dashboard de supervision

### Stack

- Extension du Prompt Studio existant (port 3030) ou app dédiée Next.js
- WebSocket push depuis le bridge MT5 + workers agents
- Auth locale simple (pas exposé public)

### Sections prioritaires

**1. Portfolio Live**
- Positions : symbol, direction, size, entry, current, PnL intraday, PnL total, swap accumulé, distance stop, distance TP
- Equity curve intraday
- Account metrics : equity, balance, margin used, free margin, margin level %

**2. Risk Gauges**
- VaR 95% actuel / limit (barre de progression)
- Drawdown actuel / limit
- Gross exposure / net exposure (beta-adjusted)
- Kill switch status (green/amber/red)

**3. Exposure Map**
- Heatmap clusters de corrélation avec exposition actuelle
- Matrice corrélation live (top 10 instruments)
- Net exposure par currency (FX breakdown)

**4. Pending Events**
- Calendrier 48h avec events importants
- Flags rouges si positions exposées
- Countdown + suggestions (hedge/close/hold)

**5. Agent Feed**
- Stream en temps réel des memos analysts, propositions specialists, verdict risk, décision PM
- Filtres par agent, par asset, par date
- Clic sur un memo → voir les evidence_ids + données sources

**6. Thesis Board**
- Thèse trimestrielle active, thème hebdo, mood marché
- Status : "confirmée", "challengée", "à réviser"

**7. Journal & Attribution**
- Trades clos récents : thèse, entry, exit, PnL, durée, raison d'exit
- Attribution : PnL par stratégie, par asset, par agent, par régime
- Win rate, avg win/loss, profit factor, Sharpe local

**8. Admin**
- Toggle PAPER_MODE / LIVE_MODE (avec double confirmation pour LIVE)
- Kill switch manuel
- Limits adjuster
- Agents activation (enable/disable par agent)

---

## 17. Journal & boucle d'apprentissage

### SQLite schema `trades.db`

```sql
-- Décisions et débats
CREATE TABLE debates (
  id INTEGER PRIMARY KEY,
  run_date TEXT,
  run_type TEXT,        -- daily|intraday|event|weekly|...
  transcript_json TEXT, -- tout le débat (memos, propositions, risk, opus decision)
  cost_usd REAL,
  duration_seconds INTEGER
);

-- Trades proposés vs exécutés
CREATE TABLE trade_candidates (
  id INTEGER PRIMARY KEY,
  debate_id INTEGER,
  symbol TEXT,
  direction TEXT,
  thesis TEXT,
  entry_price REAL,
  stop REAL,
  target REAL,
  horizon TEXT,
  conviction REAL,
  evidence_ids TEXT,    -- JSON array
  decision TEXT,        -- approved|rejected_risk|rejected_strategy|rejected_pm
  rejection_reason TEXT
);

-- Trades exécutés
CREATE TABLE trades (
  id INTEGER PRIMARY KEY,
  candidate_id INTEGER,
  mt5_ticket INTEGER,
  entry_time TEXT,
  entry_price REAL,
  size REAL,
  stop REAL,
  target REAL,
  exit_time TEXT,
  exit_price REAL,
  exit_reason TEXT,
  pnl REAL,
  pnl_pct REAL,
  swap_total REAL,
  commission REAL
);

-- Evidence utilisée (audit trail)
CREATE TABLE evidence (
  evidence_id TEXT PRIMARY KEY,
  timestamp TEXT,
  tool TEXT,
  args_json TEXT,
  data_json TEXT
);

-- Exposure snapshots
CREATE TABLE exposure_snapshots (
  timestamp TEXT PRIMARY KEY,
  positions_json TEXT,
  gross_exposure REAL,
  net_exposure REAL,
  var_95 REAL,
  drawdown_pct REAL
);

-- Agent performance tracking
CREATE TABLE agent_performance (
  agent_name TEXT,
  period_start TEXT,
  period_end TEXT,
  memos_count INTEGER,
  trades_influenced INTEGER,
  win_rate REAL,
  avg_pnl REAL,
  PRIMARY KEY (agent_name, period_start)
);
```

### Post-mortem hebdo (dimanche 20:00, Sonnet)

1. Lit tous les trades clos de la semaine + transcripts debates
2. Calcule stats par agent, par régime, par asset class
3. Identifie :
   - Quels analysts ont vu juste (citations dans trades profitables)
   - Quelles thèses ont tenu vs été invalidées
   - Quels evidence_ids ont été décisifs
4. Output `WeeklyPostMortem` :
   ```yaml
   insights:
     - "Macro Analyst a correctement identifié X fois le pivot dovish Fed"
     - "Technical Analyst a été défavorable sur les breakouts en régime choppy"
     - "Cluster risk_on a généré 70% du PnL"
   recommendations:
     - "Augmenter poids Macro Analyst ×1.2 sur régimes transition"
     - "Reduce size sur entrées techniques en régime range"
     - "Scan renforcé JPY pairs, best carry performer"
   ```

### Post-mortem mensuel (1er du mois, Opus)

- Attribution détaillée (PnL par stratégie, par agent, par régime)
- Révision prompts système par agent (propose modifications, validation humaine requise)
- Factor exposure analysis (si tenable sur CFD)
- Sharpe, Sortino, max drawdown, profit factor, calmar
- Confrontation thèse trimestrielle vs réalité → révision éventuelle

### Tuning auto

- Poids de vote des agents ajustables (quand Opus arbitre, il peut être biaisé vers les agents historiquement justes)
- Paramètres risk (stops, sizing) ajustables après N trades (ex. après 50)
- **Tout tuning loggé** + validation humaine hebdo avant application

---

## 18. Backtester

### Objectif

Valider la logique signal → decision → exit **sans LLM** (trop cher) puis avec LLM sur périodes ciblées.

### Deux modes

**Mode A — Règles déterministes (sans LLM)**
- Extrait les règles code du system : entrées sur zones MarketMemory, exits sur atr trailing, risk rules
- Rejoue sur historique 10 ans MarketMemory
- Output : equity curve, stats, drawdowns
- Coût : gratuit, peut tourner en 10 min

**Mode B — LLM replay (onéreux, ciblé)**
- Rejoue N jours historiques avec le débat complet (tous les agents)
- Nécessite : snapshot daté reconstruisible (EnrichedSnapshot figé à cette date)
- Utilisé pour valider le système complet sur **20-30 jours représentatifs** (pas 10 ans)
- Coût estimé : 30 jours × $4 = $120
- Bilan : win rate, drawdown, cohérence vs règles seules

### Données d'input reconstructibles

- Candles : dispo
- NewsMemory : dispo si dates dans la base
- FRED : dispo
- Calendar passé : reconstructible via FRED + archives
- Quotes intraday anciennes : **limite** (Yahoo a 60j max intraday) → backtest M15+ seulement au-delà

### Métriques

```
Return:       total, CAGR, monthly avg
Risk:         max_dd, avg_dd, time_in_dd, volatility
Risk-adjusted: sharpe, sortino, calmar
Trading:      win_rate, avg_win, avg_loss, profit_factor, expectancy
Frequency:    trades/month, avg_hold_time, exposure_time
Cost:         LLM_total, spread_cost, swap_total, commission
```

### Out-of-sample discipline

- **Ne jamais tuner sur out-of-sample**
- Split : 70% in-sample (tuning) / 30% out-of-sample (validation finale)
- Walk-forward optionnel pour robustesse

---

## 19. Types & interfaces clés

```ts
// Thèses
interface QuarterlyThesis {
  quarter: string;                        // "2026-Q2"
  regime: 'risk_on' | 'risk_off' | 'transition' | 'choppy';
  dominant_themes: string[];
  playbook: {
    favored_clusters: string[];
    avoided_clusters: string[];
    preferred_assets: string[];
    mental_model: string;
  };
  written_at: string;
  active: boolean;
  revisions: Array<{ at: string; reason: string; diff: string }>;
}

// Memo analyst
interface AnalystMemo {
  agent: 'macro' | 'technical' | 'news' | 'sentiment' | 'intermarket';
  run_id: string;
  timestamp: string;
  thesis: string;
  claims: Claim[];
  recommended_focus: string[];
  raw_tool_calls: ToolCall[];
}

interface Claim {
  statement: string;
  evidence_ids: string[];
  confidence: number;
  validated: boolean;
}

// Proposition specialist
interface TradeProposal {
  specialist: string;
  symbol: string;
  direction: 'long' | 'short';
  mode: 'intraday' | 'carry';
  thesis: string;
  entry_type: 'market' | 'limit';
  entry_price?: number;                   // si limit
  entry_zone?: [number, number];
  stop: number;
  target: number;
  horizon_hours: number;
  conviction: number;                     // 0-1
  evidence_ids: string[];
  risk_factors: string[];
  invalidation_scenarios: string[];
}

// Risk verdict
interface RiskVerdict {
  proposal_id: string;
  hard_rules_pass: boolean;
  hard_rules_failures: string[];         // si false
  correlation_score: number;
  cluster_impact: { cluster: string; new_risk_pct: number };
  soft_verdict: 'ok' | 'warning' | 'veto';
  soft_reasoning: string;
}

// Décision finale PM
interface DailyDecision {
  run_id: string;
  timestamp: string;
  pm_note: string;                        // narratif global Opus
  actions: Action[];
}

type Action =
  | { type: 'enter'; proposal: TradeProposal; size_pct: number; kelly_fraction: number }
  | { type: 'exit'; ticket: number; reason: string; partial_pct?: number }
  | { type: 'modify'; ticket: number; new_stop?: number; new_target?: number; reason: string }
  | { type: 'hold'; ticket: number; reason: string };

// Position runtime
interface OpenPosition {
  ticket: number;
  symbol: string;
  direction: 'long' | 'short';
  size: number;
  entry_price: number;
  entry_time: string;
  current_price: number;
  stop: number;
  target: number;
  pnl: number;
  pnl_pct: number;
  swap_accumulated: number;
  thesis_id: string;                      // lié à TradeProposal d'origine
  thesis_statement: string;
  mode: 'intraday' | 'carry';
  last_reviewed: string;
  thesis_still_valid: boolean;
}
```

---

## 20. Coûts LLM estimés

| Run | Fréquence | Modèles | Tokens in/out | Coût |
|---|---|---|---|---|
| Daily debate complet | 1/jour | 5 Haiku + 4 Sonnet + 1 Sonnet + 1 Opus + 1 Haiku | ~80k in, ~15k out total | ~$3.50 |
| Intraday review | 2/jour | 1 Haiku + 1 Sonnet | ~20k in, ~3k out | ~$0.30 × 2 = $0.60 |
| Close journal | 1/jour | 1 Haiku | ~10k in, ~2k out | ~$0.10 |
| Sentinel event-driven | ~3-5/jour | 1 Haiku | ~5k in, ~1k out | ~$0.05 × 4 = $0.20 |
| Weekly post-mortem | 1/semaine | 1 Sonnet | ~40k in, ~5k out | ~$0.80 / 7 = $0.11/j |
| Monthly attribution | 1/mois | 1 Opus | ~50k in, ~8k out | ~$2 / 30 = $0.07/j |
| Quarterly thesis | 1/trimestre | 1 Opus | ~60k in, ~10k out | ~$3 / 90 = $0.03/j |

**Total quotidien moyen : ~$4.50 / jour ≈ $135 / mois**

Soutenable pour un bot solo. Coût negligeable vs spread + swap si capital > 5 000€.

### Si on veut réduire

- Passer Sonnet → Haiku sur les specialists (garder Opus PM) → ~$2/jour
- Réduire à 3 analysts (macro, tech, news) → ~$3/jour
- Skipper intraday review 12:30 (garder seulement 15:30) → -$0.30/jour

---

## 21. Roadmap build V1

### Phase 1 — Foundations (2-3 semaines)

1. **Package `@yt-maker/trading`** scaffolding + types (section 19)
2. **Evidence Toolkit** : 20 tools de base avec caching + `evidence_id` wrapper
3. **MT5 Bridge** : FastAPI Python, polling positions, dry-run mode
4. **SQLite schema** `trades.db` + migrations
5. **Dashboard V0** : portfolio live + exposure + account metrics (read-only)
6. **Typecheck clean** + tests unitaires tools (mocks MT5)

### Phase 2 — Trading floor minimal (2-3 semaines)

7. **4 agents core** (pas 5) : Macro, Technical, News, Risk — prompts versionnés
8. **Specialist unique** : FX (le plus liquide) — prompt + integration tools
9. **Opus PM** : prompt arbitrage + génération `DailyDecision[]`
10. **Orchestrateur 5-rounds** : parallel Haikus, séquence Sonnets, Opus final
11. **Validator evidence-first** : check claims vs evidence_ids
12. **Logging débat complet** dans SQLite

### Phase 3 — Risk & exposure (1-2 semaines)

13. **Risk manager code** : limits, corrélation, clustering, VaR MC
14. **Exposure feedback loop** : MT5 → state → risk agent input
15. **Kill switch** + safety rails
16. **Dashboard risk gauges** + exposure map

### Phase 4 — Paper trading live (minimum 3 mois)

17. **Activer PAPER_MODE** avec capital virtuel 10 000€
18. **Scheduler** : daily 07:30 + 2 intraday + close + sentinels
19. **Collect data** : tous les trades, attributions, performance agents
20. **Weekly post-mortem** Sonnet + rapport
21. **Itérer prompts** sur retours réels

### Phase 5 — Backtester (parallélisable à Phase 4)

22. **Mode A (règles seules)** sur 10 ans — valider la logique non-LLM
23. **Mode B (LLM replay)** sur 20-30 jours représentatifs — coût ~$100
24. **Metrics & comparison** vs paper

### Phase 6 — Autres specialists + carry (1 mois)

25. **Specialists** : Indices, Commos, Crypto (ajoutés un par un)
26. **Carry mode** : check swap systématique, positions multi-jours
27. **Strategist agent** (intermarket deep challenge)

### Phase 7 — Live micro (si paper OK)

28. **Audit humain complet** des paper trades, confirmation des stats
29. **Capital test 500-1000€ MT5 live**
30. **Limits renforcées** × 0.5 tous paramètres
31. **Monitoring intensif** 1 semaine puis normal

**Total V1 : ~4-5 mois** de l'idée à live micro (dont 3 mois paper obligatoires).

---

## 22. Extensions V2/V3

### V2 (après 6 mois de live)

- **Stat Arb agent** : cointégration + mean reversion sur 5-10 paires
- **Monte Carlo avancé** : stress tests scenario-based, factor exposure
- **Quarterly macro thesis** plus structurée (scenarios + trigger events)
- **Agent auto-tuning** : modification de prompts proposée auto, validée hebdo
- **COT data intégration** (gratuit, même si pas tradable options on compense avec futures watch)
- **Marketaux / alt-sentiment** sources

### V3 (vision long terme)

- **Multi-compte** : paper + live + stratégie alternative en parallèle
- **LLM fine-tuning** sur journal cumulé (si volume suffisant, ~1000 trades+)
- **Stratégie vol** si on débloque options un jour (compte IB dédié ?)
- **Copy-trading inversé** : publier signaux, mesurer vs retail
- **Auto-publication vers le pipeline vidéo** : "voici ce que notre bot a trade hier"

---

## 23. Questions ouvertes

À trancher avant de coder :

1. **Framework orchestration** : Claude Agent SDK natif, ou orchestrateur TypeScript maison cohérent avec `@yt-maker/ai` existant ?
2. **Bridge MT5** : Python FastAPI séparé, ou Node directement via un wrapper type `mt5-socket-api` ? (Python officiel = safe, Node = pas de context switch)
3. **Capital paper initial** : 10k€ virtuel adéquat, ou démarrer 5k€ pour être plus dur ?
4. **Seuil de passage paper → live** : 3 mois + 50 trades + Sharpe > 1 + max_dd < 8% — accord sur ces critères ?
5. **Live capital initial** : 500€ (apprentissage) ou 2000€ (meaningful stats plus vite) ?
6. **Intraday cadence** : 12:30 + 15:30 + event-driven suffisant, ou ajouter 09:00 (open EU) ?
7. **Prompts agents versionnés** : git-tracked dans `prompts/trading/*.md` ou DB ? (j'ai un biais git)
8. **Langue débats** : FR ou EN pour les LLM ? FR cohérent avec reste du repo mais EN parfois mieux performant techniquement.

### Dette assumée V1

- Pas de Monte Carlo avancé (juste daily VaR basique)
- Pas de stat arb
- Un seul specialist (FX) avant extension
- Pas de COT (limitation broker)
- Pas de fine-tuning LLM
- Dashboard basique (pas de mobile, pas d'alerting multi-canal)

---

## Cohérence avec l'écosystème existant

Ce système **n'est pas un repo séparé**. Il réutilise :

- **EnrichedSnapshot** du pipeline vidéo (inputs identiques)
- **MarketMemory** (zones, indicators, régime)
- **NewsMemory** (sentiment, FTS5)
- **Knowledge RAG** (contexte macro/intermarket)
- **CausalBrief** (règles intermarché)
- **`@yt-maker/ai` llm-client** (provider switching, role routing)
- **Scheduler** : peut tourner sur la même machine que le pipeline vidéo (décalé horaire)

Le seul package **nouveau** : `@yt-maker/trading`.
Nouveau process Python : `mt5-bridge` (service local).

La vidéo continue de sortir chaque matin. Le bot trade sur la base des mêmes données. À terme, le bot peut **nourrir** la vidéo ("notre bot systématique a positionné long gold hier, voici pourquoi" = contenu unique).

---

**Prochaine étape suggérée** : valider les 8 questions ouvertes de §23, puis démarrer Phase 1 par l'Evidence Toolkit (c'est la fondation dont tout le reste dépend).

---

## 24. Annexe — Revue littérature (discussion ouverte, rien tranché)

> Notes issues d'une revue 2026-04-18 sur l'état de l'art multi-agent LLM trading + reality check retail CFD.
> **Aucun point ci-dessous n'est décidé.** Tout est à discuter, challenger, accepter ou rejeter.

### Pistes à discuter

- **Rounds de débat** : passer de 5 à 2-3 ? (littérature : au-delà = echo chamber)
- **Critères go-live** : alourdir à 6 mois paper + Sharpe > 0.8 + max_dd < 15% + régime shift survécu ?
- **Calibration performance** : ancrer les attentes sur Sharpe 0.5-1.0 / DD 15-25% / return 8-20% ?
- **CVRF (FinCon)** : intégrer l'apprentissage verbal inter-épisodes (manager met à jour beliefs analysts post-trade) ?
- **Backtesting contamination-free (StockBench)** : forcer modèles cutoff > période testée ?
- **Sizing Carver** : adopter volatility-targeted + inverse-vol weighting comme méthode principale, Kelly en complément ?
- **Transaction costs** : imposer spread + commission + swap + slippage dans tous les backtests ?
- **MT5 bridge** : package Python officiel (pas ZeroMQ), idempotent order IDs, soft stop secours, flatten auto pre-news ?
- **Human veto phase 1** : le système propose, l'humain valide — pendant combien de temps ?

### Références cataloguées

- TradingAgents (arXiv:2412.20138) — archi LangGraph proche de notre vision, à lire
- FinCon (arXiv:2407.06567, NeurIPS 2024) — pour CVRF
- FinAgent (arXiv:2402.18485, KDD 2024) — multimodal + tool-augmented
- StockBench (arXiv:2510.02209) — benchmark contamination-free
- virattt/ai-hedge-fund — template LangGraph open source
- Carver, *Leveraged Trading* (2019) — spécifique petits comptes
- López de Prado, *Deflated Sharpe Ratio* (SSRN 2460551) + *Advances in FML*
- Chain-of-Verification (arXiv:2309.11495) — anti-hallucination
- Faith, *Way of the Turtle* — N-based sizing
- Chan, *Quantitative Trading* — Kelly haircut, réalisme

### Moats structurels potentiels (à valider)

- Multi-asset cross-corrélé (littérature = single stock US 95%)
- Exécution MT5 live avec frictions réelles (absente des papiers)
- Intraday + carry discriminé (littérature = daily close)
- Explicabilité native via pipeline vidéo (moat unique)
- CausalBrief intermarché code-pur (rigueur supérieure aux approches LLM pures)

### Réalités à intégrer dans notre posture

- 70-85% retail CFD perdent (ESMA)
- 60-80% chance de sous-performer B&H sur 3-5 ans
- 12-18 mois break-even probables avant d'éventuellement tourner
- Sharpe > 2 live persistant retail : n'existe probablement pas
- Macro discrétionnaire institutionnel 10 ans = Sharpe 0.66

**Statut** : tout ouvert, à reprendre en discussion.
