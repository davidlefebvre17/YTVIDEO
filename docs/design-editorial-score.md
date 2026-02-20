# Editorial Score — Document de Design

> Auteur : quant-analyst agent
> Date : 2026-02-20
> Statut : Proposition de design (pas de code)

---

## 1. Probleme

Le **drama score** actuel (dans `technicals.ts:228-239`) est un score par **asset individuel** :

```
dramaScore = |changePct| * 3 + volumeAnomaly * 2 + breakingLevel + min(newsCount, 5) * 3
```

### Limites identifiees

| Situation | Drama Score | Pertinence editoriale reelle |
|-----------|-------------|------------------------------|
| Gold a $5,000 (doji -0.21%) | ~5.6 | TRES HAUTE — niveau historique psychologique |
| Shitcoin +8% sans volume | ~24 | BASSE — mouvement isole sans contexte |
| Balance commerciale USA -$98.5B vs -$86B attendu | 0 (pas un asset) | TRES HAUTE — chiffre choc lie aux tarifs |
| 6 airlines baissent de 3% le meme jour | 6 scores separes ~12 chacun | TRES HAUTE en tant que THEME (petrole → airlines) |
| VIX +15%, SPX -1.5%, Gold +1%, DXY +0.5% | 4 scores separes | TRES HAUTE — c'est un REGIME risk-off coherent |

**Le probleme fondamental** : le drama score optimise la volatilite individuelle, pas la pertinence editoriale. Un bon recap marche raconte des **histoires thematiques**, pas une liste d'assets tries par volatilite.

---

## 2. Architecture proposee

### Vue d'ensemble

```
DailySnapshot
    |
    v
[Asset Score]     [Event Score]     [News Clustering]
per-asset          per-event         par mots-cles
    |                  |                  |
    v                  v                  v
         ┌──── THEME BUILDER ────┐
         │  Regroupe assets,     │
         │  events, news par     │
         │  theme narratif       │
         └──────────┬────────────┘
                    |
                    v
         ┌──── EDITORIAL SCORE ──┐
         │  Score par theme       │
         │  = f(amplitude,        │
         │    breadth, surprise,  │
         │    causal depth,       │
         │    symbolic weight)    │
         └──────────┬────────────┘
                    |
                    v
         Themes tries par score
         → Top 3-5 pour le script
```

### Unites de scoring

| Niveau | Actuel | Propose |
|--------|--------|---------|
| Asset individuel | `dramaScore` (conserve comme sous-composant) | `assetSignal` — refactorise avec z-score |
| Evenement economique | Aucun | `eventSurpriseScore` — nouveau |
| News cluster | `scoreItem()` (par article) | `themNewsWeight` — par cluster |
| **Theme** | **N'existe pas** | **`editorialScore`** — NOUVEAU, unite principale |

---

## 3. Composant 1 : Asset Signal Score (refactorisation du drama score)

### Formule

```
assetSignal = zMove * 25 + volumeConviction * 15 + technicalEvent * 20 + symbolicWeight * 20 + newsWeight * 20
```

Chaque composant est normalise sur [0, 20] sauf zMove qui peut depasser pour les mouvements exceptionnels.

### 3.1 Z-Score du mouvement (zMove)

**Probleme resolu** : Un mouvement de -0.21% sur l'or est-il banal ou exceptionnel ?

```
zMove = |changePct_jour| / volatilite_20d_daily

ou volatilite_20d_daily = stdev(daily_returns, 20 jours)
```

**Interpretation** :
| zMove | Signification | Multiplicateur |
|-------|---------------|----------------|
| < 0.5 | Mouvement normal | 0 |
| 0.5 - 1.0 | Mouvement notable | 1 |
| 1.0 - 2.0 | Mouvement significatif | 2 |
| 2.0 - 3.0 | Mouvement exceptionnel | 3 |
| > 3.0 | Evenement rare (tail event) | 4 (cap) |

**Calcul** : On dispose deja de `volatility20d` dans `MultiTimeframeAnalysis.daily1y` (annualise). Pour obtenir la vol quotidienne :

```
dailyVol = volatility20d_annualized / sqrt(252) / 100
zMove = |changePct / 100| / dailyVol
```

**Exemple** : Or, volatilite annualisee 15%, changePct -0.21%
- dailyVol = 15 / sqrt(252) / 100 = 0.945%
- zMove = 0.21 / 0.945 = 0.22 → mouvement normal (score = 0)

**Exemple** : Or, volatilite annualisee 15%, changePct -3.5%
- zMove = 3.5 / 0.945 = 3.7 → evenement rare ! (score = 4)

### 3.2 Volume Conviction

Conserve du drama score actuel mais ajuste :

```
volumeConviction:
  volumeVsAvg < 0.5   → -5  (volume mort = signal negatif, absence de conviction)
  0.5 - 0.8           → 0
  0.8 - 1.5           → 0   (normal)
  1.5 - 2.5           → 5   (notable)
  2.5 - 5.0           → 10  (fort)
  > 5.0               → 15  (exceptionnel, cap a 15)
```

Note : pour les futures (=F) et forex (=X), volumeAnomaly vaut deja 1 (neutre). On garde ce comportement.

### 3.3 Technical Event (nouveau : binaire, pas continu)

Detecte des **evenements techniques ponctuels** qui meritent mention editoriale :

| Event | Score | Condition |
|-------|-------|-----------|
| Breakout 52w high | 10 | `multiTF.daily1y.recentBreakout && changePct > 0` |
| Breakdown 52w low | 10 | `price <= multiTF.daily1y.low52w * 1.01 && changePct < 0` |
| Golden cross fresh | 8 | `multiTF.daily3y.goldenCross` ET n'etait pas golden cross la veille |
| Death cross fresh | 8 | inverse |
| RSI extreme (< 20 ou > 80) | 5 | `rsi14 < 20 \|\| rsi14 > 80` |
| RSI notable (< 30 ou > 70) | 2 | `30 > rsi14 > 20 \|\| 70 < rsi14 < 80` |
| Proximite ATH (< 2%) | 8 | `multiTF.weekly10y.distanceFromATH > -2` |

Max: prendre les 2 plus hauts events (pas d'accumulation infinie). Cap a 20.

### 3.4 Symbolic Weight (nouveau)

Detecte les niveaux psychologiques et historiques qui sont editorialement importants meme sans mouvement :

```
symbolicWeight = roundLevelScore + milestoneScore
```

**Round Levels** — amelioration de `findRoundNumbers()` :

| Asset class | Magnitude | Exemples | Proximite requise | Score |
|-------------|-----------|----------|-------------------|-------|
| Commodities (or, petrole) | 1000 / 100 | $5,000 or, $100 petrole | < 0.5% | 15 |
| Indices | 1000 | 10,000 DAX, 7,000 CAC | < 0.3% | 12 |
| Crypto | 10000 / 100000 | $100K BTC | < 1% | 12 |
| Forex | 0.01 (big figure) | EUR/USD 1.10, USD/JPY 150 | < 0.2% | 8 |

**Milestone Score** — nouveau concept :

| Condition | Score | Exemple |
|-----------|-------|---------|
| Premier passage d'un round level depuis > 1 an | 15 | Or franchit $5,000 pour la premiere fois |
| ATH absolu (10y) touche ou depasse | 15 | `distanceFromATH > -0.5%` |
| ATL absolu (10y) touche | 15 | `distanceFromATL < 2%` |
| Distance ATH < 5% et mouvement vers ATH | 5 | S'approche de l'ATH |

Cap total symbolicWeight : 20.

### 3.5 News Weight per Asset

Compte du `news-selector.ts` actuel, les articles lies a un asset. Amelioration :

```
newsWeightAsset = min(assetNewsCount, 8) * 2.5
```

ou `assetNewsCount` = nombre d'articles du jour matchant les keywords de l'asset (via ASSET_KEYWORDS existant).

Cap : 20.

### Score final par asset

```
assetSignal = clamp(zMove_score * 25 + volumeConviction + technicalEvent + symbolicWeight + newsWeightAsset, 0, 100)
```

**Retrocompatibilite** : `dramaScore` reste dans `TechnicalIndicators` tel quel. `assetSignal` est un nouveau champ ajoute au meme objet.

---

## 4. Composant 2 : Event Surprise Score

### Probleme resolu

Les evenements economiques (CPI, NFP, balance commerciale) n'ont pas de score. Or "CPI +3.5% vs +3.1% attendu" est un evenement editorial majeur.

### Formule

Pour chaque `EconomicEvent` ayant `actual` ET `forecast` :

```
rawSurprise = |parseFloat(actual) - parseFloat(forecast)| / max(|parseFloat(forecast)|, epsilon)

ou epsilon = 0.01 (evite division par zero quand forecast = 0)
```

**Ajustements par type** :

| Impact level | Multiplicateur | Justification |
|-------------|----------------|---------------|
| high | 3.0 | NFP, CPI, Fed rate = front page |
| medium | 1.5 | PMI, retail sales |
| low | 0.5 | minor reports |

```
eventSurpriseScore = min(rawSurprise * impact_mult * 25, 30)
```

**Echelle** :

| eventSurpriseScore | Interpretation |
|-------------------|----------------|
| 0 - 5 | En ligne avec le consensus |
| 5 - 15 | Surprise notable |
| 15 - 25 | Surprise significative (editoriale) |
| > 25 | Choc (headline material) |

**Exemples concrets** :
- Balance commerciale : actual = -98.5, forecast = -86 → rawSurprise = 12.5/86 = 14.5% → si high impact: 14.5% * 3 * 25 = 10.9 ✓
- CPI : actual = 3.5%, forecast = 3.1% → rawSurprise = 0.4/3.1 = 12.9% → si high: 9.7 ✓
- Chomage : actual = 4.1%, forecast = 4.2% → rawSurprise = 0.1/4.2 = 2.4% → si high: 1.8 (faible) ✓

### Events sans forecast

Si `forecast` est absent mais `actual` et `previous` existent :

```
rawSurprise = |parseFloat(actual) - parseFloat(previous)| / max(|parseFloat(previous)|, epsilon)
```

Avec un discount de 0.5x (car le previous n'est pas un consensus).

Si ni `forecast` ni `previous` : score = 0 (pas assez de contexte).

---

## 5. Composant 3 : Theme Builder

### Definition d'un theme

Un **theme** est un regroupement narratif de :
- 0-N assets (qui bougent de facon coherente)
- 0-N articles (qui parlent du meme sujet)
- 0-N evenements economiques (qui s'y rattachent)
- Une **chaine causale** qui les connecte

### Identification des themes : approche hybride

#### Methode 1 : Themes predefinis (dictionnaire)

Un ensemble de themes recurrents avec des regles de detection :

```typescript
interface ThemeDefinition {
  id: string;                        // "risk_off", "oil_shock", "fed_hawkish", ...
  label: { fr: string; en: string }; // "Risk-Off", "Choc petrolier", ...
  assetPatterns: AssetPattern[];     // regles sur les assets
  newsKeywords: string[][];          // groupes de mots-cles (OR dans un groupe, AND entre groupes si >1)
  eventKeywords: string[];           // mots-cles pour events
  causalChain: string[];             // assets dans l'ordre causal
}
```

**Themes predefinis** (liste initiale, extensible) :

| ID | Label FR | Assets | Keywords news | Chaine causale |
|----|----------|--------|---------------|----------------|
| `risk_off` | Risk-Off | VIX↑, SPX↓, Gold↑, DXY↑, BTC↓ | crash, selloff, recession, peur, correction | VIX → SPX → Gold/DXY → BTC |
| `risk_on` | Risk-On | VIX↓, SPX↑, BTC↑, DXY↓ | rally, optimisme, rebond | VIX → SPX → BTC |
| `oil_shock` | Choc petrolier | CL=F ou BZ=F ≥ z1.5 | opep, petrole, oil, geopolitique, iran, arabie | Petrole → Airlines → CPI → Fed |
| `dollar_move` | Dollar en force/faiblesse | DXY ≥ z1.0 | dollar, fed, taux, treasury | DXY → EUR/USD → Gold → Commodites |
| `rate_shock` | Choc de taux | 10Y yield move > 10bp | taux, yields, obligations, fed, bce, inflation | Taux → Tech → Immo → Banques |
| `gold_milestone` | Or historique | GC=F symbolic > 10 | or, gold, refuge, safe haven | Geopolitique → Gold → Silver → Miners |
| `crypto_move` | Mouvement crypto | BTC-USD ≥ z1.5 ou ETH ≥ z1.5 | bitcoin, ethereum, crypto, sec, etf | BTC → ETH → SOL → Altcoins |
| `china_trade` | Commerce/Chine | via keywords | chine, tarifs, trade war, douane, commerce | Tarifs → Imports → USD → Emergents |
| `earnings_wave` | Saison resultats | ≥ 3 earnings le meme jour | resultats, earnings, benefice, chiffre affaires | Entreprise → Secteur → Indice |
| `sector_rotation` | Rotation sectorielle | ecart > 2% entre XLE/XLK/XLF | rotation, growth, value, secteur | De [X] vers [Y] |
| `inflation_signal` | Signal inflation | via events (CPI, PPI, PCE) | inflation, prix, cpi, ppi, hausse des prix | CPI → Fed → Taux → Gold |
| `geopolitical` | Geopolitique | Gold↑, Oil↑, VIX↑ | guerre, conflit, sanctions, missile, nucleaire | Event → Oil/Gold → VIX → Indices |
| `bce_fed` | Banque centrale | via events (rate decision) | bce, fed, taux directeur, monetary policy | Decision → Taux → Devises → Actions |

#### Methode 2 : Themes emergents (bottom-up clustering)

Pour les situations non couvertes par les themes predefinis :

1. **Grouper les articles par similarite** : utiliser les ASSET_KEYWORDS existants pour tagger chaque article avec les assets mentionnes
2. **Detecter les clusters** : si ≥ 3 articles mentionnent les memes assets/keywords → theme emergent
3. **Creer un theme ad-hoc** avec label = titre du premier article le mieux score

#### Algorithme de matching

Pour chaque theme predefini :

```
1. Verifier les conditions sur les assets (directions + z-scores)
2. Compter les articles matchant les keywords du theme
3. Verifier si des events economiques matchent
4. Si au moins 2 des 3 dimensions sont actives → theme detecte
```

**Seuils d'activation** :

| Dimension | Seuil minimum |
|-----------|---------------|
| Assets | Au moins 1 asset avec z-score > 0.5 dans la direction attendue |
| News | Au moins 2 articles matchant les keywords |
| Events | Au moins 1 event matchant |
| Total | Au moins 2 dimensions actives sur 3 |

---

## 6. Composant 4 : Editorial Score par theme

### Formule principale

```
editorialScore = amplitudeScore * 0.25
               + breadthScore * 0.20
               + surpriseScore * 0.15
               + causalDepthScore * 0.15
               + symbolicScore * 0.10
               + newsFrequency * 0.10
               + regimeCoherence * 0.05
```

Chaque composant est normalise sur [0, 100]. Score final sur [0, 100].

### 6.1 Amplitude Score (25%)

Le mouvement le plus fort parmi les assets du theme, mesure en z-score :

```
amplitudeScore = min(max_zMove_in_theme * 25, 100)
```

| z-score max | amplitudeScore |
|-------------|---------------|
| 0.5 | 12.5 |
| 1.0 | 25 |
| 2.0 | 50 |
| 3.0 | 75 |
| 4.0+ | 100 |

### 6.2 Breadth Score (20%)

Combien d'assets sont impactes dans le theme :

```
breadthScore = min(count_assets_zscore_above_0.5 * 15, 100)
```

| # assets z > 0.5 | breadthScore |
|-------------------|-------------|
| 1 | 15 |
| 2 | 30 |
| 3 | 45 |
| 5 | 75 |
| 7+ | 100 |

**Justification** : un theme qui fait bouger 6 assets est plus important qu'un mouvement isole.

### 6.3 Surprise Score (15%)

Le plus gros `eventSurpriseScore` parmi les events lies au theme :

```
surpriseScore = min(max_eventSurpriseScore_in_theme * 3.33, 100)
```

Si aucun event dans le theme : `surpriseScore = 0`.

### 6.4 Causal Depth Score (15%)

Nombre de maillons dans la chaine causale active :

```
causalDepthScore = min((active_links - 1) * 25, 100)
```

Un maillon est **actif** si l'asset correspondant a un z-score > 0.3 (meme faible).

| Maillons actifs | causalDepthScore |
|----------------|-----------------|
| 1 (isole) | 0 |
| 2 | 25 |
| 3 | 50 |
| 4 | 75 |
| 5+ | 100 |

**Exemple** : Theme "oil_shock", chaine `Petrole → Airlines → CPI → Fed`
- Petrole z=2.1 (actif) ✓
- Airlines (via stockScreen, 3 airlines down) ✓
- CPI (pas d'event aujourd'hui) ✗
- Fed (pas d'event) ✗
→ 2 maillons actifs → score = 25

### 6.5 Symbolic Score (10%)

Le plus haut `symbolicWeight` parmi les assets du theme :

```
symbolicScore = max_symbolicWeight_in_theme * 5  (cap 100)
```

### 6.6 News Frequency (10%)

Nombre d'articles lies au theme :

```
newsFrequency = min(theme_article_count * 8, 100)
```

| # articles | newsFrequency |
|-----------|--------------|
| 1 | 8 |
| 3 | 24 |
| 5 | 40 |
| 8 | 64 |
| 13+ | 100 |

### 6.7 Regime Coherence (5%)

Bonus si le theme est **coherent avec le regime de marche global** (risk-on, risk-off, etc.) :

```
regimeCoherence:
  Theme IS the dominant regime → 100
  Theme is consistent with regime → 50
  Theme is neutral to regime → 0
  Theme contradicts regime (decorrelation!) → 75  // les decorrelations sont interessantes
```

**La decorrelation est valorisee** (score 75, pas 0) parce qu'une contradiction est editoralement plus interessante qu'un mouvement neutre, conformement au guide `intermarket.md` : "Les decorrelations sont souvent PLUS interessantes que les correlations normales."

---

## 7. Gestion des cas edge

### Cas 1 : Beaucoup de news, peu de mouvement prix

**Exemple** : 15 articles sur les tarifs US-Chine, mais les marches n'ont presque pas bouge.

- `amplitudeScore` = faible (~10)
- `breadthScore` = faible (~15)
- `newsFrequency` = eleve (~100)
- **Score final** : ~25-35 (medium)

**Traitement editorial** : C'est un theme "en gestation" — merite mention dans la section news mais pas de deep dive. Le LLM peut dire : "Les marches n'ont pas encore reagi aux annonces de tarifs, mais c'est a surveiller."

### Cas 2 : Gros mouvement, zero news

**Exemple** : USD/JPY +1.5% (z=2.3) sans aucune nouvelle.

- `amplitudeScore` = eleve (~57)
- `newsFrequency` = 0
- **Score final** : ~30-40 (medium-high)

**Traitement editorial** : C'est un mouvement technique pur — merite mention dans le market overview avec analyse du chart.

### Cas 3 : Asset a niveau historique mais doji

**Exemple** : Or a $5,000 avec variation -0.21%

- `amplitudeScore` = faible (~5, z=0.22)
- `symbolicScore` = tres eleve (round level $5,000 → 15, milestone → 15, cap 20 → symbolicScore = 100)
- **Score final** : ~35-45 (medium-high)

**Traitement editorial** : Le symbolic weight compense le manque d'amplitude. Le LLM doit mentionner le niveau psychologique.

### Cas 4 : Un seul event economique choc

**Exemple** : NFP -200K vs +180K attendu, mais on est dimanche et les marches sont fermes.

- `surpriseScore` = tres eleve (~100)
- `amplitudeScore` = 0 (pas encore de reaction)
- **Score final** : ~35 (medium)

**Traitement editorial** : L'event surprise est le headline. A combiner avec le forward-looking : "On attend lundi pour voir la reaction des marches."

### Cas 5 : Theme marginal mais decorrelation notable

**Exemple** : BTC +3% alors que Nasdaq -1.5% (decorrelation inhabituelle).

- `amplitudeScore` = eleve (~50)
- `regimeCoherence` = 75 (decorrelation)
- `causalDepthScore` = eleve (2-3 maillons)
- **Score final** : ~50-60 (high)

**Traitement editorial** : Excellent materiel narratif. Le LLM peut construire l'histoire "or numerique vs risk asset".

---

## 8. Ponderations : justification

| Facteur | Poids | Justification |
|---------|-------|---------------|
| Amplitude (z-score) | 25% | Le mouvement reste le signal primaire — les viewers veulent savoir "qu'est-ce qui a bouge". Mais normalise par volatilite, pas brut. |
| Breadth | 20% | Un theme large est plus important. 6 airlines qui baissent = pattern, 1 airline = anecdote. Aussi important que l'amplitude. |
| Surprise | 15% | Les chiffres economiques chocs sont du contenu editorial premium ("la balance commerciale explose"). Mais pas toujours present. |
| Causal depth | 15% | La valeur ajoutee du narrateur est de CONNECTER les points. "Petrole → airlines → inflation → Fed" = 4 maillons = haute valeur narrative. |
| Symbolic | 10% | Les niveaux ronds et historiques attirent l'attention des viewers (thumbnail material). Important mais pas decisif seul. |
| News frequency | 10% | Plus d'articles = plus de couverture = plus d'importance percue. Mais peut etre bruyant (BTC/CAC toujours surcouvert). Poids modere. |
| Regime coherence | 5% | Bonus contextuel, pas un driver principal. Le regime donne le ton mais ne determine pas les themes. |

### Calibration

Les poids sont initiaux et devront etre ajustes apres observation sur 10-20 snapshots reels. Methode :

1. Calculer les scores sur les snapshots existants (data/snapshot-2026-02-12 a 19)
2. Comparer le classement des themes au jugement editorial humain
3. Ajuster les poids si les themes "evidents" ne sont pas en top 3

---

## 9. Selection finale pour le script

### Nombre de themes

- **3 a 5 themes** pour un episode de 8-10 minutes
- Theme #1 = deep dive (section `deep_dive`, 120-180s)
- Theme #2 = overview long (dans `market_overview`, 90s)
- Theme #3 = overview moyen (60s)
- Themes #4-5 = mentions breves dans le market overview ou news

### Algorithme de selection

```
1. Calculer editorialScore pour chaque theme detecte
2. Trier par score decroissant
3. Filtrer : exclure les themes avec score < 15 (seuil de pertinence)
4. Diversification : si les 3 premiers themes sont du meme type (ex: 3 themes "dollar"),
   remplacer le 3e par le meilleur theme d'un autre type
5. Le theme #1 avec le score le plus haut → deep_dive section
6. Themes #2-3 → market_overview bullets principaux
7. Themes #4-5 → mentions dans news/outlook
```

### Seuils

| Score | Interpretation | Traitement editorial |
|-------|---------------|---------------------|
| 0-15 | Bruit / non pertinent | Ignore |
| 15-30 | Mineur | Mention breve possible |
| 30-50 | Notable | Bullet dans market_overview |
| 50-70 | Important | Segment dedie (60-90s) |
| 70-100 | Majeur / Headline | Deep dive (120-180s) |

---

## 10. Integration avec le systeme existant

### Ce qui ne change PAS

- `dramaScore` dans `TechnicalIndicators` — conserve tel quel pour retrocompatibilite
- `scoreItem()` dans `news-selector.ts` — continue de filtrer les news pour le prompt LLM
- `formatSnapshotForPrompt()` — le format du prompt reste le meme

### Ce qui change

1. **Nouveau fichier** : `packages/data/src/editorial-score.ts`
   - `computeAssetSignal(asset, newsCount)` → `assetSignal` (ajout au type `TechnicalIndicators`)
   - `computeEventSurprise(event)` → `eventSurpriseScore`
   - `buildThemes(snapshot)` → `Theme[]`
   - `scoreTheme(theme)` → `editorialScore`
   - `selectTopThemes(themes, maxCount)` → `Theme[]`

2. **Nouveau type** dans `core/types.ts` :

```typescript
interface Theme {
  id: string;
  label: { fr: string; en: string };
  editorialScore: number;
  assets: AssetSnapshot[];           // assets concernes
  events: EconomicEvent[];           // events concernes
  newsItems: NewsItem[];             // articles concernes
  causalChain: string[];             // maillons causaux actifs
  breakdown: {                       // decomposition du score
    amplitude: number;
    breadth: number;
    surprise: number;
    causalDepth: number;
    symbolic: number;
    newsFrequency: number;
    regimeCoherence: number;
  };
}
```

3. **Ajout dans `DailySnapshot`** :

```typescript
interface DailySnapshot {
  // ... existant ...
  themes?: Theme[];                  // top themes classes par editorialScore
}
```

4. **Modification de `formatSnapshotForPrompt()`** :
   - Ajouter une section `## Themes du jour (tries par importance editoriale)` avant les assets
   - Chaque theme avec son score, ses assets, sa chaine causale
   - Le LLM utilise cette info pour structurer sa narration

### Calcul dans le pipeline

Le calcul des themes se fait **apres** le fetch et les enrichments techniques, **avant** l'appel au LLM :

```
fetch → computeTechnicals → computeMultiTF → computeAssetSignals → buildThemes → scoreThemes → formatPrompt → LLM
```

---

## 11. Donnees necessaires mais absentes

### Disponibles immediatement (pas de nouveau fetch)
- `changePct` pour chaque asset ✓
- `volatility20d` dans multiTF ✓
- `volumeVsAvg` ✓
- `high52w`, `low52w`, `distanceFromATH` ✓
- Candles historiques ✓
- Events avec actual/forecast ✓
- News avec titres ✓

### Manquantes mais calculables localement
- **Vol quotidienne** : `volatility20d / sqrt(252)` — trivial
- **Asset-news mapping** : les `ASSET_KEYWORDS` existent deja dans `news-selector.ts` — a reutiliser
- **Theme-event mapping** : matching par keywords sur `event.name` — a implementer

### Manquantes et necessitant un changement
- **Golden cross "fresh"** : faudrait stocker l'etat golden/death cross de la veille → utiliser `prevContext`
- **Stock screen dans les themes** : les `StockScreenResult` (airlines, etc.) doivent etre mappees aux themes via leur `index` et `reason[]` — faisable avec les donnees existantes

---

## 12. Exemples de scoring sur des cas reels

### Scenario : "Or proche de $5,000 avec tension Iran"

**Assets actifs** :
- GC=F: $4,997 (-0.21%), z=0.22, symbolicWeight = 20 (round $5000 + proche ATH)
- SI=F: +1.2%, z=0.8
- VIX: +5%, z=1.2
- SPX: -0.3%, z=0.4

**News** : 8 articles (Iran, gold, geopolitique, safe haven)
**Events** : aucun notable

**Theme detecte** : `geopolitical` (Gold↑ implicite par symbolic, VIX↑, Oil stable)

| Composant | Calcul | Score |
|-----------|--------|-------|
| Amplitude | max(0.22, 0.8, 1.2, 0.4) = 1.2 → 30 | 30 |
| Breadth | 3 assets z > 0.5 → 45 | 45 |
| Surprise | 0 events → 0 | 0 |
| Causal depth | VIX → SPX → Gold → Silver = 3 actifs → 50 | 50 |
| Symbolic | 20 * 5 = 100 (cap) | 100 |
| News freq | 8 * 8 = 64 | 64 |
| Regime | consistent avec regime risk-off → 50 | 50 |

**editorialScore** = 30*0.25 + 45*0.20 + 0*0.15 + 50*0.15 + 100*0.10 + 64*0.10 + 50*0.05
= 7.5 + 9.0 + 0 + 7.5 + 10 + 6.4 + 2.5
= **42.9** → "Notable" — segment dedie dans market overview

C'est correct : l'or n'a pas vraiment bouge en prix, mais le contexte symbolique et geopolitique merite attention.

### Scenario : "Balance commerciale USA -$98.5B vs -$86B, tarifs douaniers"

**Events** : Balance commerciale, surprise = 12.5/86 = 14.5%, high impact
- eventSurpriseScore = 14.5% * 3 * 25 = 10.9

**Assets actifs** :
- DXY: -0.5%, z=0.8
- EURUSD: +0.6%, z=0.7
- SPX: -0.8%, z=0.6

**News** : 12 articles (trade deficit, tariffs, commerce, chine)

**Theme detecte** : `china_trade`

| Composant | Calcul | Score |
|-----------|--------|-------|
| Amplitude | max(0.8, 0.7, 0.6) = 0.8 → 20 | 20 |
| Breadth | 3 assets z > 0.5 → 45 | 45 |
| Surprise | 10.9 * 3.33 = 36.3 | 36 |
| Causal depth | Tarifs → USD → EUR/USD → SPX = 3 actifs → 50 | 50 |
| Symbolic | 0 | 0 |
| News freq | 12 * 8 = 96 | 96 |
| Regime | neutre | 0 |

**editorialScore** = 20*0.25 + 45*0.20 + 36*0.15 + 50*0.15 + 0*0.10 + 96*0.10 + 0*0.05
= 5 + 9 + 5.4 + 7.5 + 0 + 9.6 + 0
= **36.5** → "Notable" — merite un segment

Correct : le chiffre choc avec forte couverture news et chaine causale active.

---

## 13. Questions ouvertes

1. **Faut-il un minimum d'historique pour les themes ?** Si on vient de lancer le projet, on n'a pas de golden cross "fresh" detection. → Solution : les themes sont optionnels, le drama score per-asset reste le fallback.

2. **Comment gerer les weekends/jours feries ?** Les marches US sont fermes mais des news sortent. → Les themes news-only (sans amplitude) auront un score faible (~15-25), suffisant pour une mention breve.

3. **Faut-il persister les themes ?** Pour la continuite inter-episodes ("hier on parlait de la rotation sectorielle, aujourd'hui ca se confirme"). → Oui, stocker les themes du jour dans le snapshot. Le `prevContext` les rend accessibles au LLM.

4. **Combien de themes predefinis au lancement ?** Les 13 listes sont un bon point de depart. On peut en ajouter facilement sans changer la formule.

5. **Quid des themes emergents sans match predefini ?** Le clustering bottom-up (methode 2) les capture. Le label sera generique ("cluster: airlines + petrole") mais le LLM peut nommer le theme dans sa narration.

---

## 14. Priorite d'implementation

1. **Phase 1** : `computeAssetSignal()` — refactorisation immediate, remplace le drama score comme signal de tri
2. **Phase 2** : `computeEventSurprise()` — trivial, parsing forecast/actual
3. **Phase 3** : Dictionnaire de themes predefinis + matching rules
4. **Phase 4** : `scoreTheme()` — la formule editorial score
5. **Phase 5** : Integration dans `formatSnapshotForPrompt()` — section themes pour le LLM
6. **Phase 6** : Clustering bottom-up pour themes emergents (plus complexe, peut etre reporte)

Les phases 1-5 sont realisables avec le code et les donnees existants, sans aucun nouveau fetch API.
