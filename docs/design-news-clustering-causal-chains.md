# Design : News Clustering & Causal Chain System

> **Auteur** : NLP Expert Agent
> **Date** : 2026-02-20
> **Statut** : Document de design (pas d'implementation)
> **Contrainte architecturale** : Tout en CODE (regles), PAS de LLM pour le tagging/clustering

---

## Table des matieres

1. [Contexte et probleme](#1-contexte-et-probleme)
2. [Systeme de clustering thematique](#2-systeme-de-clustering-thematique)
3. [Algorithme de clustering](#3-algorithme-de-clustering)
4. [Strategie de deduplication](#4-strategie-de-deduplication)
5. [Detection de chaines causales](#5-detection-de-chaines-causales)
6. [Liaison stock movers <-> news](#6-liaison-stock-movers--news)
7. [Liaison calendar events <-> market reaction](#7-liaison-calendar-events--market-reaction)
8. [Format de sortie "Themes du jour"](#8-format-de-sortie-themes-du-jour)
9. [Exemple concret : 19 fevrier 2026](#9-exemple-concret--19-fevrier-2026)

---

## 1. Contexte et probleme

### Situation actuelle

- **~316 articles/jour** (160 EN + 156 FR) provenant de 14+ sources RSS
- Articles presentes au LLM en **liste plate**, separes par langue (FR puis EN)
- Le LLM doit **deviner** les connexions entre news, assets, events et movers
- Resultat : le LLM rate des connexions evidentes (ex: 7 airlines en baisse = theme sectoriel petrole/Iran)

### Objectif

Remplacer la liste plate par un bloc structure "**Themes du jour**" qui :
1. Regroupe les articles par theme (clusters)
2. Detecte les chaines causales connues (regles)
3. Lie les stock movers a leurs news explicatives
4. Lie les events calendar a la reaction marche
5. Deduplique (4 articles "CAC en baisse" = 1 info)

Le LLM recoit alors un contexte **pre-digere** qui lui permet de raconter une histoire au lieu de lister des faits.

---

## 2. Systeme de clustering thematique

### 2.1 — Les 18 clusters thematiques

Chaque cluster a un ID, un nom lisible, et des listes de mots-cles FR + EN. Un article peut appartenir a 0, 1 ou plusieurs clusters.

| # | ID | Nom | Mots-cles FR | Mots-cles EN |
|---|---|---|---|---|
| 1 | `geopolitique_iran` | Tensions Iran/Moyen-Orient | iran, teheran, tehéran, moyen-orient, golfe persique, detroit d'ormuz, houthis, hezbollah, tensions geopolitiques | iran, tehran, middle east, persian gulf, strait of hormuz, houthis, hezbollah, geopolitical tensions |
| 2 | `geopolitique_russie_ukraine` | Conflit Russie-Ukraine | russie, ukraine, kremlin, poutine, zelensky, sanctions russes, gazoduc, nord stream | russia, ukraine, kremlin, putin, zelensky, russian sanctions, nord stream, pipeline |
| 3 | `geopolitique_chine_taiwan` | Tensions Chine-Taiwan | chine, taiwan, xi jinping, pekin, mer de chine, semi-conducteurs taiwan | china, taiwan, xi jinping, beijing, south china sea, taiwan semiconductor |
| 4 | `tarifs_douane` | Tarifs douaniers / Commerce | tarifs douaniers, droits de douane, guerre commerciale, balance commerciale, deficit commercial, protectionnisme | tariffs, trade war, customs duties, trade deficit, trade balance, protectionism, import duties |
| 5 | `fed_monetary` | Fed / Politique monetaire US | fed, fomc, powell, taux directeur, politique monetaire, assouplissement, hawkish, dovish, pivot, baisse des taux, hausse des taux, minutes de la fed | fed, fomc, powell, interest rate, monetary policy, rate cut, rate hike, hawkish, dovish, pivot, fed minutes, quantitative tightening |
| 6 | `ecb_monetary` | BCE / Politique monetaire EU | bce, ecb, lagarde, taux directeur bce, politique monetaire europeenne | ecb, lagarde, european central bank, ecb rate, eurozone monetary policy |
| 7 | `boj_monetary` | BoJ / Politique monetaire JP | boj, banque du japon, ueda, kazuo ueda, politique monetaire japon, yen | boj, bank of japan, ueda, japan monetary policy, yen policy |
| 8 | `inflation_cpi` | Inflation / CPI / Prix | inflation, cpi, indice des prix, prix a la consommation, deflation, desinflation, core inflation | inflation, cpi, consumer price, deflation, disinflation, core inflation, pce, price index |
| 9 | `emploi_labor` | Emploi / Marche du travail | emploi, chomage, nfp, non-farm payrolls, marche du travail, licenciements, creation d'emplois, great resignation | employment, unemployment, nfp, non-farm payrolls, labor market, jobless claims, layoffs, job openings |
| 10 | `earnings_tech` | Resultats Tech / GAFAM | resultats apple, resultats meta, resultats google, resultats amazon, resultats microsoft, resultats nvidia, mag7, magnificent seven, earnings tech | apple earnings, meta earnings, google earnings, amazon earnings, microsoft earnings, nvidia earnings, mag7, magnificent seven, tech earnings |
| 11 | `earnings_general` | Resultats d'entreprises (hors tech) | resultats, benefice, chiffre d'affaires, ebitda, bpa, eps, previsions, guidance, publication resultats | earnings, revenue, profit, ebitda, eps, guidance, beat estimates, missed estimates, quarterly results |
| 12 | `petrole_energie` | Petrole / Energie | petrole, wti, brent, opep, opec, stocks petrole, production petrole, raffinerie, gaz naturel, prix du baril | oil, wti, brent, opec, crude oil, oil inventory, oil production, refinery, natural gas, barrel price, energy |
| 13 | `airlines_transport` | Aviation / Transport | compagnie aerienne, aviation, airline, air france, lufthansa, ryanair, kerosene, cout du carburant, fret aerien, transport aerien | airline, aviation, air france, lufthansa, ryanair, fuel cost, jet fuel, air freight, air transport |
| 14 | `crypto_regulation` | Crypto / Regulation | regulation crypto, sec crypto, stablecoin, cbdc, etf bitcoin, etf ethereum, defi, nft | crypto regulation, sec crypto, stablecoin, cbdc, bitcoin etf, ethereum etf, defi, nft, tokenized securities |
| 15 | `crypto_market` | Marche crypto / Prix | bitcoin, ethereum, solana, altcoin, crypto crash, bull run crypto, fear and greed, btc dominance, liquidation, halving | bitcoin, ethereum, solana, altcoin, crypto crash, bull run, fear and greed, btc dominance, liquidation, halving |
| 16 | `immobilier_credit` | Immobilier / Credit prive | immobilier, credit prive, private credit, private equity, leveraged loans, reits, blue owl, kkr, apollo, carlyle, blackstone | real estate, private credit, private equity, leveraged loans, reits, blue owl, kkr, apollo, carlyle, blackstone |
| 17 | `ai_semiconductors` | IA / Semi-conducteurs | intelligence artificielle, ia, gpu, nvidia, amd, data center, semi-conducteur, chip, puce, tsmc | artificial intelligence, ai, gpu, nvidia, amd, data center, semiconductor, chip, tsmc |
| 18 | `or_metaux_precieux` | Or / Metaux precieux | or, gold, argent metal, silver, platine, palladium, metal precieux, valeur refuge, xauusd | gold, silver, platinum, palladium, precious metal, safe haven, xauusd, bullion |

### 2.2 — Regles de conception des mots-cles

1. **Minuscule toujours** : la comparaison est insensible a la casse
2. **Preferer les bigrammes** aux unigrammes ambigus : "or" seul matche trop de faux positifs → utiliser " or " (avec espaces) ou "gold" ou "xauusd"
3. **Pas de stemming** : les regles sont explicites, pas de NLP lourd
4. **Mots de 4+ caracteres** pour eviter les faux positifs (sauf acronymes : "fed", "bce", "sec", "ecb")
5. **Tickers comme mots-cles** : les tickers d'assets watchlist (CL=F, GC=F, etc.) sont automatiquement inclus via les `ASSET_KEYWORDS` existants du `news-selector.ts`

### 2.3 — Clusters specifiques vs generiques

Les clusters 1-9 sont **thematiques** (geopolitique, macro). Les clusters 10-18 sont **sectoriels/asset**. Cette distinction est importante pour les chaines causales : les themes thematiques CAUSENT des mouvements dans les clusters sectoriels.

---

## 3. Algorithme de clustering

### 3.1 — Pseudo-code principal

```
FUNCTION clusterNews(news: NewsItem[], snapshot: DailySnapshot) -> ClusteredThemes

  // Phase 1 : Matcher chaque article aux clusters
  FOR EACH article IN news:
    text = normalize(article.title + " " + article.summary)
    article.clusters = []
    FOR EACH cluster IN CLUSTERS:
      keywords = cluster.keywords[article.lang] + cluster.keywords_common
      IF countMatches(text, keywords) >= cluster.minMatchThreshold:
        article.clusters.push(cluster.id)

  // Phase 2 : Agreger par cluster
  FOR EACH cluster IN CLUSTERS:
    matchedArticles = news.filter(a => a.clusters.includes(cluster.id))
    cluster.rawCount = matchedArticles.length
    cluster.articles = matchedArticles
    cluster.buzzScore = computeBuzzScore(cluster)

  // Phase 3 : Deduplication intra-cluster
  FOR EACH cluster WITH rawCount > 0:
    cluster.dedupedArticles = deduplicateCluster(cluster.articles)
    cluster.uniqueInfoCount = cluster.dedupedArticles.length

  // Phase 4 : Trier les clusters par pertinence
  activeThemes = clusters.filter(c => c.uniqueInfoCount >= 1)
                         .sort(BY buzzScore DESC)
                         .slice(0, 6)  // max 6 themes actifs

  RETURN activeThemes
```

### 3.2 — Seuil de match (`minMatchThreshold`)

- Clusters thematiques (1-9) : **1 match** suffit (un article qui mentionne "Iran" est geopolitique)
- Clusters sectoriels (10-18) : **1 match** aussi, mais les mots-cles sont deja specifiques (tickers, noms propres)

### 3.3 — Calcul du Buzz Score

Le buzz score mesure l'intensite mediatique d'un theme. Il sert a prioriser les themes dans le prompt.

```
FUNCTION computeBuzzScore(cluster) -> number:
  base = cluster.rawCount                           // nombre brut d'articles
  sourceDiversity = countUniqueSources(cluster)      // combien de sources differentes
  bilingual = hasBothLangs(cluster) ? 1.5 : 1.0     // bonus si FR+EN couvrent le theme
  timeliness = avgTimeliness(cluster, targetDate)    // boost si articles du jour meme

  // Un theme couvert par 5 sources differentes en FR+EN = plus important
  // qu'un theme avec 10 articles d'une seule source
  buzzScore = (base * 0.4) + (sourceDiversity * 3) * bilingual * timeliness

  RETURN buzzScore
```

**Seuils indicatifs** :
- buzzScore < 3 : theme mineur (mentionnable en passant)
- buzzScore 3-8 : theme notable (merite une mention)
- buzzScore > 8 : theme dominant (fil rouge potentiel de l'episode)

---

## 4. Strategie de deduplication

### 4.1 — Probleme

Sur 316 articles le 19 fevrier, on voit :
- "CAC en baisse apres resultats" (ZoneBourse), "La Bourse de Paris dans le rouge apres resultats" (Google News FR x2), "Entre geopolitique et resultats decevants, le CAC 40 cloture sous les 8400" (Les Echos) → **1 seule info**
- "Gold near $5,000 on Iran tensions" (FXStreet) vs "Gold drifts higher on heightened US-Iran tensions" (FXStreet) → **1 seule info**

### 4.2 — Algorithme de deduplication (Jaccard sur mots signifiants)

```
FUNCTION deduplicateCluster(articles: NewsItem[]) -> NewsItem[]:
  // Trier par qualite source (SOURCE_TIER) puis par date DESC
  sorted = articles.sort(BY sourceTier DESC, THEN publishedAt DESC)

  kept = []
  FOR EACH article IN sorted:
    tokens = extractSignificantTokens(article.title)
    isDuplicate = false
    FOR EACH existing IN kept:
      existingTokens = extractSignificantTokens(existing.title)
      similarity = jaccardSimilarity(tokens, existingTokens)
      IF similarity > 0.45:  // seuil de deduplication
        isDuplicate = true
        BREAK
    IF NOT isDuplicate:
      kept.push(article)

  RETURN kept

FUNCTION extractSignificantTokens(text: string) -> Set<string>:
  // Retirer les mots vides FR + EN
  stopwords = FRENCH_STOPWORDS + ENGLISH_STOPWORDS
  tokens = text.toLowerCase()
    .replace(/[^a-zàâéèêëïîôùûüç0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !stopwords.has(t))
  RETURN new Set(tokens)

FUNCTION jaccardSimilarity(a: Set, b: Set) -> number:
  intersection = a.intersect(b).size
  union = a.union(b).size
  RETURN union > 0 ? intersection / union : 0
```

### 4.3 — Stopwords (listes minimales)

**FR** : le, la, les, un, une, des, de, du, en, et, ou, au, aux, est, a, par, pour, sur, dans, que, qui, ce, cette, son, sa, ses, mais, avec, plus, apres, avant, entre, vers, sous, chez, sans, depuis, lors, lors, comme, bien, selon, meme, fait, alors, tout, autre, aussi, tres, peu, tant, tant, donc

**EN** : the, a, an, and, or, of, to, in, on, at, for, by, with, from, is, are, was, were, has, have, had, its, this, that, these, those, but, not, also, more, than, about, into, after, before, over, under, between, some, how, why, what, which, as, so, than

### 4.4 — Seuil Jaccard = 0.45

- < 0.3 : trop permissif (garde des doublons)
- 0.45 : bon compromis — "CAC 40 baisse resultats" et "Bourse Paris rouge resultats" partagent ~50% des tokens signifiants
- > 0.6 : trop strict (ne fusionne que les titres quasi-identiques)

Le seuil est applique **intra-cluster** seulement, pas globalement. Deux articles dans des clusters differents ne sont pas dedupliques entre eux (ils eclairent des angles differents).

---

## 5. Detection de chaines causales

### 5.1 — Principe

Les chaines causales sont des **regles SI/ALORS** qui connectent un theme (cluster + conditions de marche) a un enchainement de consequences. Elles sont declenchees par la combinaison :
- **Buzz** : un cluster a un buzz score suffisant
- **Market data** : les assets concernes bougent dans la direction attendue

### 5.2 — Les 12 chaines causales

#### Chaine 1 : Geopolitique Moyen-Orient → Petrole → Airlines → Inflation

```
DECLENCHEUR:
  cluster "geopolitique_iran" buzz >= 3
  AND (CL=F changePct > +1% OR BZ=F changePct > +1%)

CHAINE:
  1. Tensions Moyen-Orient → risque sur approvisionnement petrole
  2. Petrole hausse → cout carburant airlines augmente
  3. Airlines en baisse (verifier: stock movers airlines < -2%)
  4. Si petrole > +3% → anticipations inflation montent → pression Fed

NARRATION SUGGESTED:
  "Les tensions avec l'Iran font monter le brut de X% — et dans la foulee,
  les compagnies aeriennes decrochent. Le kerosene, c'est leur premier poste de couts."

VERIFICATION:
  airlines_impacted = stockMovers.filter(sector_match("airlines") AND changePct < -2%)
```

#### Chaine 2 : Tarifs douaniers → Balance commerciale → Dollar → Yields

```
DECLENCHEUR:
  cluster "tarifs_douane" buzz >= 3
  AND (DX-Y.NYB changePct != 0  OR news mentioning "deficit commercial")

CHAINE:
  1. Tarifs douaniers annonces/appliques → incertitude commerciale
  2. Balance commerciale se deteriore / s'ameliore
  3. Dollar reagit (tarifs protectionnistes → dollar plus fort court terme)
  4. Yields suivent le dollar (capitaux entrants → rendements baissent)

NARRATION SUGGESTED:
  "Le deficit commercial US atteint un record malgre les tarifs de Trump —
  et pourtant le dollar monte, attire par les flux de capitaux vers la securite."
```

#### Chaine 3 : Earnings surprise → Secteur → Indice

```
DECLENCHEUR:
  stockMover avec earningsDetail.publishingToday = true
  AND |changePct| > 5%

CHAINE:
  1. Entreprise publie resultats (beat ou miss)
  2. Reaction sur le titre (>5% mouvement)
  3. Contagion sectorielle (chercher d'autres movers dans le meme index/secteur)
  4. Impact sur l'indice si le titre est un poids lourd

NARRATION SUGGESTED:
  "Deere bondit de 11% apres des resultats au-dessus des attentes —
  et ca donne le ton au secteur industriel."
```

#### Chaine 4 : Banque centrale (Fed) → Taux → Dollar → Or/Tech

```
DECLENCHEUR:
  cluster "fed_monetary" buzz >= 2
  OR event avec "FOMC" ou "Fed" dans le nom

CHAINE:
  1. Fed communique (minutes, discours, decision)
  2. Taux reagissent (10Y monte/baisse)
  3. Dollar suit les taux (taux US montent → dollar monte)
  4. Or inverse du dollar (si dollar monte → or sous pression)
  5. Tech sensible aux taux (taux montent → Nasdaq sous pression)

NARRATION SUGGESTED:
  "Les minutes de la Fed confirment un ton hawkish — les taux remontent,
  le dollar aussi, et le Nasdaq accuse le coup."
```

#### Chaine 5 : Banque centrale (BCE) → Euro → DAX/CAC

```
DECLENCHEUR:
  cluster "ecb_monetary" buzz >= 2
  OR event avec "ECB" ou "Lagarde" dans le nom

CHAINE:
  1. BCE communique (decision, discours Lagarde)
  2. Euro reagit (baisse taux → euro faiblit)
  3. DAX/CAC beneficient si euro faiblit (exportateurs)
  4. OU : BCE hawkish → euro monte → pression sur exportateurs

NARRATION SUGGESTED:
  "Lagarde s'exprime et l'euro reagit — ce qui n'est pas neutre
  pour les exportateurs europeens qui pesent lourd dans le CAC et le DAX."
```

#### Chaine 6 : Petrole hausse → Inflation → Fed hawkish → Tech baisse

```
DECLENCHEUR:
  CL=F changePct > +2% OR BZ=F changePct > +2%
  AND cluster "petrole_energie" buzz >= 2

CHAINE:
  1. Petrole en forte hausse
  2. Anticipations d'inflation montent (petrole = composante CPI)
  3. La Fed devra rester hawkish plus longtemps
  4. Tech sous pression (taux futurs plus eleves → valorisations tech diminuent)

NARRATION SUGGESTED:
  "Le petrole repart a la hausse et ca complique le travail de la Fed —
  mauvaise nouvelle pour la tech qui est la plus sensible aux taux."
```

#### Chaine 7 : Dollar fort → Matieres premieres → Emergents

```
DECLENCHEUR:
  DX-Y.NYB changePct > +0.5%

CHAINE:
  1. Dollar monte
  2. Matieres premieres sous pression (pricees en dollars)
  3. Or baisse (mecaniquement)
  4. Pays emergents souffrent (dette en dollars plus chere)

NARRATION SUGGESTED:
  "Le dollar index progresse — et dans son sillage, tout ce qui est price
  en dollars subit une pression mecanique. L'or, le petrole, les emergents."
```

#### Chaine 8 : VIX spike → Risk-off → Or monte → Crypto baisse

```
DECLENCHEUR:
  ^VIX changePct > +5% OR VIX value > 25

CHAINE:
  1. VIX explose (peur sur les marches)
  2. S&P baisse (correlation negative quasi-mecanique)
  3. Flight to safety → Or monte
  4. Crypto baisse (BTC traite comme risk-on depuis 2020)

NARRATION SUGGESTED:
  "Le VIX grimpe de X% — la peur s'installe. Les investisseurs fuient
  vers l'or pendant que le bitcoin, lui, suit le Nasdaq vers le bas."
```

#### Chaine 9 : CPI/Inflation surprise → Taux → Tout le marche

```
DECLENCHEUR:
  event contient "CPI" ou "inflation" avec actual != forecast
  OR cluster "inflation_cpi" buzz >= 3

CHAINE:
  1. CPI sort au-dessus des attentes (surprise haussiere)
  2. Yields 10Y montent (inflation → taux montent)
  3. Dollar monte (rendement plus attractif)
  4. Actions baissent (surtout tech/growth)
  5. Or mixte (inflation positive mais dollar fort negatif)

NARRATION SUGGESTED:
  "L'inflation surprend a la hausse — les taux reagissent immediatement,
  et tout le marche recalcule ses anticipations."
```

#### Chaine 10 : Private credit stress → Contagion financieres → Banques

```
DECLENCHEUR:
  cluster "immobilier_credit" buzz >= 3
  AND au moins 1 mover dans private equity/credit en baisse > 3%

CHAINE:
  1. Stress sur un acteur de credit prive (gel, defaut, liquidation)
  2. Contagion aux autres acteurs PE/credit (KKR, Apollo, Ares, Carlyle)
  3. Peur sur la qualite du credit globale
  4. Banques sous pression (XLF baisse)

NARRATION SUGGESTED:
  "Blue Owl gele les rachats et vend 1.4 milliard d'actifs — et tout le
  private equity trinque par contagion. La question, c'est : est-ce que
  ca deborde sur les banques ?"
```

#### Chaine 11 : BoJ / Yen → Carry trade → Volatilite globale

```
DECLENCHEUR:
  cluster "boj_monetary" buzz >= 2
  OR USDJPY=X |changePct| > 1%

CHAINE:
  1. BoJ signale un changement de politique
  2. Yen se renforce → debouclage carry trade
  3. Ventes forcees sur actifs risques (Nikkei, Nasdaq)
  4. VIX monte

NARRATION SUGGESTED:
  "La BoJ bouge — et quand le yen se renforce, c'est tout le carry trade
  qui se deboucle. On l'a vu en aout 2024, ca peut faire tres mal."
```

#### Chaine 12 : AI/Semis boom → Nasdaq → Rotation sectorielle

```
DECLENCHEUR:
  cluster "ai_semiconductors" buzz >= 3
  AND (NVIDIA ou AMD dans les movers OU ^IXIC |changePct| > 1%)

CHAINE:
  1. News IA majeure (resultats Nvidia, investissement data center, regulation)
  2. Semis reagissent (Nvidia, AMD, TSMC)
  3. Nasdaq tire par le secteur
  4. Possible rotation : argent sort des defensives vers la tech (ou l'inverse)

NARRATION SUGGESTED:
  "L'IA continue de dominer les flux — NVIDIA et AMD tirent le Nasdaq,
  mais attention a la concentration : quand tout repose sur 5 titres,
  le moindre faux pas peut faire mal."
```

### 5.3 — Algorithme de detection

```
FUNCTION detectCausalChains(
  clusters: ClusteredTheme[],
  snapshot: DailySnapshot,
  movers: StockScreenResult[]
) -> ActiveCausalChain[]

  activeChains = []

  FOR EACH chain IN CAUSAL_CHAINS:
    // Verifier le declencheur
    triggerMet = evaluateTrigger(chain.trigger, clusters, snapshot, movers)
    IF NOT triggerMet: CONTINUE

    // Verifier les etapes de la chaine (au moins 2 etapes confirmees par les donnees)
    confirmedSteps = []
    FOR EACH step IN chain.steps:
      IF verifyStep(step, snapshot, movers):
        confirmedSteps.push(step)

    // Une chaine est "active" si le declencheur est vrai ET >= 2 etapes confirmees
    IF confirmedSteps.length >= 2:
      activeChains.push({
        id: chain.id,
        name: chain.name,
        confidence: confirmedSteps.length / chain.steps.length, // 0.5 = partiel, 1.0 = complet
        confirmedSteps: confirmedSteps,
        suggestedNarration: chain.narration,
        relatedClusters: chain.relatedClusters,
        relatedAssets: chain.relatedAssets,
      })

  RETURN activeChains.sort(BY confidence DESC)
```

### 5.4 — Verification d'etape (`verifyStep`)

Chaque etape a une condition de verification basee sur les donnees du snapshot :

| Type de verification | Donnee utilisee | Exemple |
|---|---|---|
| `asset_move` | `snapshot.assets[symbol].changePct` | "CL=F > +1%" |
| `mover_count` | `movers.filter(sector).length` | "airlines movers < -2% count >= 3" |
| `buzz_threshold` | `cluster.buzzScore` | "geopolitique_iran buzz >= 3" |
| `event_exists` | `snapshot.events` | "event contains FOMC" |
| `event_surprise` | `event.actual vs event.forecast` | "CPI actual > forecast" |
| `yield_move` | `snapshot.yields` | "10Y change > +0.05" |

---

## 6. Liaison stock movers <-> news

### 6.1 — Matching direct : mover → news explicative

Pour chaque stock mover dans `snapshot.stockScreen`, on cherche une news qui l'explique :

```
FUNCTION matchMoverToNews(mover: StockScreenResult, clusteredNews: Map<string, NewsItem[]>) -> MoverExplanation

  explanations = []

  // 1. Earnings (explication la plus forte)
  IF mover.earningsDetail?.publishingToday:
    explanations.push({
      type: "earnings",
      confidence: "high",
      text: formatEarningsExplanation(mover.earningsDetail)
    })

  // 2. News directe (nom de l'entreprise dans le titre)
  directNews = findNewsWithCompanyName(mover.name, mover.symbol, allNews)
  IF directNews.length > 0:
    explanations.push({
      type: "news_direct",
      confidence: "high",
      article: directNews[0],
      text: directNews[0].title
    })

  // 3. Cluster sectoriel (le mover est dans un secteur qui bouge)
  sectorCluster = detectSectorCluster(mover, allMovers)
  IF sectorCluster:
    explanations.push({
      type: "sector_theme",
      confidence: "medium",
      cluster: sectorCluster,
      text: "Mouvement sectoriel : " + sectorCluster.name
    })

  // 4. Chaine causale (le mover est affecte par une chaine active)
  FOR EACH chain IN activeChains:
    IF mover.symbol IN chain.relatedAssets OR moverMatchesSector(mover, chain):
      explanations.push({
        type: "causal_chain",
        confidence: "medium",
        chain: chain,
        text: "Via chaine causale : " + chain.name
      })

  RETURN bestExplanation(explanations) // highest confidence first
```

### 6.2 — Detection de clusters sectoriels (movers)

Quand N stocks du meme secteur/theme bougent dans la meme direction, c'est un cluster sectoriel :

```
FUNCTION detectSectorClusters(movers: StockScreenResult[]) -> SectorCluster[]

  // Regles de detection sectorielle basees sur les noms/tickers
  SECTOR_RULES = {
    airlines:    { keywords: ["air", "airline", "airlines", "aviation", "wizz", "ryanair", "delta air", "united air", "southwest", "alaska air"], minCount: 3, threshold: -2% },
    banks:       { keywords: ["bank", "bnp", "societe generale", "barclays", "hsbc", "jpmorgan", "goldman"], minCount: 3, threshold: +/-3% },
    energy:      { keywords: ["total", "shell", "bp", "exxon", "chevron", "eni", "equinor"], minCount: 2, threshold: +/-2% },
    luxury:      { keywords: ["lvmh", "hermes", "kering", "moncler", "richemont"], minCount: 2, threshold: +/-2% },
    auto:        { keywords: ["stellantis", "volkswagen", "bmw", "mercedes", "renault", "toyota"], minCount: 2, threshold: +/-2% },
    tech_us:     { keywords: ["apple", "meta", "google", "amazon", "microsoft", "nvidia", "amd"], minCount: 2, threshold: +/-2% },
    pharma:      { keywords: ["sanofi", "bayer", "novartis", "roche", "astrazeneca", "pfizer", "biontech"], minCount: 2, threshold: +/-2% },
    private_eq:  { keywords: ["blue owl", "apollo", "kkr", "carlyle", "ares", "blackstone"], minCount: 2, threshold: -3% },
  }

  clusters = []
  FOR EACH sector IN SECTOR_RULES:
    matched = movers.filter(m =>
      sector.keywords.some(kw => m.name.toLowerCase().includes(kw))
      AND m.changePct meets sector.threshold direction
    )
    IF matched.length >= sector.minCount:
      avgChange = average(matched.map(m => m.changePct))
      clusters.push({
        sector: sector.name,
        movers: matched,
        count: matched.length,
        avgChangePct: avgChange,
        direction: avgChange > 0 ? "up" : "down"
      })

  RETURN clusters
```

### 6.3 — Exemple concret (19 fevrier)

Avec les donnees reelles du 19 fevrier :
- **Airlines cluster** : ALK (-6.6%), UAL (-5.9%), WIZZ.L (-5.7%), AAL (-5.3%), DAL (-5.2%), LUV (-5.0%) → 6 airlines, moyenne -5.6%, direction DOWN
- **Explication** : cluster "geopolitique_iran" (buzz ~8) + CL=F +1.9% → chaine causale #1 activee
- **Resultats** : Deere +11.6% (earnings beat) = explication directe, Airbus -6.8% (resultats decevants + petrole) = double explication

---

## 7. Liaison calendar events <-> market reaction

### 7.1 — Surprise Score

Pour chaque evenement avec `actual` et `forecast`, calculer un score de surprise :

```
FUNCTION computeSurpriseScore(event: EconomicEvent) -> SurpriseResult | null

  IF NOT event.actual OR NOT event.forecast: RETURN null

  actual = parseFloat(event.actual)
  forecast = parseFloat(event.forecast)
  previous = event.previous ? parseFloat(event.previous) : null

  IF isNaN(actual) OR isNaN(forecast): RETURN null

  // Surprise absolue et relative
  absSurprise = actual - forecast
  relSurprise = forecast !== 0 ? (absSurprise / Math.abs(forecast)) * 100 : 0

  // Classification
  magnitude = "neutral"
  IF Math.abs(relSurprise) > 20: magnitude = "major"
  ELSE IF Math.abs(relSurprise) > 10: magnitude = "notable"
  ELSE IF Math.abs(relSurprise) > 5: magnitude = "minor"

  direction = absSurprise > 0 ? "above" : absSurprise < 0 ? "below" : "inline"

  // Trend vs previous
  trend = null
  IF previous !== null:
    IF actual > previous: trend = "improving"
    ELSE IF actual < previous: trend = "deteriorating"
    ELSE: trend = "stable"

  RETURN {
    event: event,
    absSurprise, relSurprise,
    magnitude, direction, trend,
    label: `${event.name}: ${actual} vs ${forecast} attendu (${direction === "above" ? "+" : ""}${relSurprise.toFixed(1)}%)`
  }
```

### 7.2 — Matching event → reaction marche

```
// Mapping evenements → assets impactes
EVENT_ASSET_MAP = {
  "CPI":            { primary: ["^GSPC", "GC=F", "DX-Y.NYB"], secondary: ["^IXIC", "EURUSD=X"] },
  "Non-Farm":       { primary: ["^GSPC", "DX-Y.NYB", "GC=F"], secondary: ["USDJPY=X"] },
  "FOMC":           { primary: ["^GSPC", "DX-Y.NYB", "GC=F", "^IXIC"], secondary: ["BTC-USD"] },
  "Unemployment":   { primary: ["^GSPC", "DX-Y.NYB"], secondary: ["GC=F"] },
  "GDP":            { primary: ["^GSPC", "DX-Y.NYB"], secondary: ["EURUSD=X"] },
  "PMI":            { primary: ["^GSPC"], secondary: ["DX-Y.NYB", "CL=F"] },
  "ECB":            { primary: ["EURUSD=X", "^FCHI", "^GDAXI"], secondary: ["^STOXX"] },
  "BoJ":            { primary: ["USDJPY=X", "^N225"], secondary: ["BTC-USD"] },
  "Philly Fed":     { primary: ["DX-Y.NYB", "^GSPC"], secondary: [] },
  "Consumer Conf":  { primary: ["^GSPC"], secondary: ["DX-Y.NYB"] },
  "Oil Inventory":  { primary: ["CL=F", "BZ=F"], secondary: ["XLE"] },
  "Retail Sales":   { primary: ["^GSPC"], secondary: ["DX-Y.NYB"] },
}

FUNCTION matchEventToReaction(surprise: SurpriseResult, snapshot: DailySnapshot) -> EventReaction | null

  // Chercher le mapping le plus specifique
  mapping = findBestEventMapping(surprise.event.name, EVENT_ASSET_MAP)
  IF NOT mapping: RETURN null

  // Verifier si les assets primaires ont bouge dans la direction attendue
  reactions = []
  FOR EACH assetSymbol IN mapping.primary:
    asset = snapshot.assets.find(a => a.symbol === assetSymbol)
    IF asset AND Math.abs(asset.changePct) > 0.1:
      reactions.push({
        asset: asset.name,
        symbol: assetSymbol,
        changePct: asset.changePct,
      })

  IF reactions.length === 0: RETURN null

  RETURN {
    event: surprise,
    reactions: reactions,
    narrative: buildEventNarrative(surprise, reactions)
  }
```

### 7.3 — Narrative generation helper

```
FUNCTION buildEventNarrative(surprise, reactions) -> string:
  // Ex: "Le Philly Fed ressort a 44.3 contre 19.4 attendu — une surprise massive
  //      de +128%. Le dollar reagit a la hausse, les taux aussi."

  parts = []
  parts.push(`${surprise.event.name}: ${surprise.event.actual} vs ${surprise.event.forecast} attendu`)

  IF surprise.magnitude === "major":
    parts.push(`surprise ${surprise.direction === "above" ? "haussiere" : "baissiere"} massive`)

  reactionStr = reactions.map(r => {
    dir = r.changePct > 0 ? "en hausse" : "en baisse"
    return `${r.asset} ${dir} (${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%)`
  }).join(", ")

  parts.push(`Reaction: ${reactionStr}`)

  RETURN parts.join(" — ")
```

---

## 8. Format de sortie "Themes du jour"

### 8.1 — Structure TypeScript proposee

```typescript
interface ThemesDuJour {
  // Top themes tries par buzz score (max 6)
  themes: Theme[];
  // Chaines causales actives (max 3)
  causalChains: ActiveCausalChain[];
  // Clusters sectoriels detectes parmi les movers
  sectorClusters: SectorCluster[];
  // Events avec surprise significative
  eventSurprises: EventReaction[];
  // Regime de marche detecte (risk-on, risk-off, rotation, etc.)
  marketRegime: string;
}

interface Theme {
  id: string;
  name: string;
  buzzScore: number;
  uniqueInfoCount: number;   // nombre d'infos uniques apres dedup
  rawArticleCount: number;   // nombre brut d'articles
  sourceCount: number;       // diversite des sources
  topArticles: NewsItem[];   // 2-3 articles les plus representatifs (dedupes)
  relatedAssets: string[];   // symbols d'assets concernes
  relatedMovers: string[];   // symbols de movers concernes
}
```

### 8.2 — Format texte pour injection dans le prompt LLM

Le bloc "Themes du jour" remplace la section `## News du jour` actuelle dans `formatSnapshotForPrompt()`.

```
## Themes du jour (analyse editoriale pre-digeree)

### REGIME : Risk-off modere
VIX +3.1%, S&P -0.28%, Or stable, Dollar +0.24%, BTC -1.8%

### Theme dominant : Tensions US-Iran [buzz=9, 8 articles de 5 sources]
- [FXStreet] Gold drifts higher to near $5,000 on heightened US-Iran tensions
- [ZoneBourse] Devises : la hausse du $ largement alimentee par le 'geopolitique'
- [Marketaux] Sensex sinks 1.2k pts on US-Iran tensions
→ Impact detecte : CL=F +1.9%, GC=F -0.2% (contenu par dollar fort), airlines -5.6% en moyenne

### Chaine causale activee : Iran → Petrole → Airlines → Inflation
  1. Tensions Moyen-Orient → risque approvisionnement [CONFIRME: buzz Iran = 9]
  2. Petrole hausse [CONFIRME: CL=F +1.9%, BZ=F +1.9%]
  3. Airlines en baisse [CONFIRME: 6 airlines, moyenne -5.6%]
  4. Anticipations inflation [A SURVEILLER: petrole < 3%, pas encore critique]
  Confiance : 75% (3/4 etapes confirmees)

### Theme #2 : Resultats d'entreprises [buzz=7, 12 articles de 6 sources]
- [ZoneBourse] Newmont depasse les attentes grace a la flambee des prix de l'or
- [TradingSat/BFM] Airbus et Renault ont pese sur le CAC 40
- [Les Echos] Coface devoile une baisse de 15% de son benefice net
→ Movers lies : DE +11.6% (earnings beat), AIR.PA -6.8% (guidance decevante), ORA.PA +7.5% (52w high)

### Cluster sectoriel : Airlines en chute (-5.6% moy, 6 titres)
  ALK -6.6%, UAL -5.9%, WIZZ.L -5.7%, AAL -5.3%, DAL -5.2%, LUV -5.0%
  Cause probable : Petrole +1.9% sur tensions Iran (chaine causale #1)

### Theme #3 : Credit prive / Private equity [buzz=5, 4 articles de 3 sources]
- [ZoneBourse] Blue Owl defend la solidite du credit de son fonds cote malgre des cessions d'actifs
- [Yahoo] Wall Street ends down as private equity stocks sink
→ Contagion detectee : Blue Owl, Apollo, KKR, Carlyle en baisse

### Theme #4 : Crypto sous pression [buzz=5, 15 articles de 4 sources]
- [CoinDesk] Bitcoin steadies near $67,000 as traders pay for crash protection
- [CoinTelegraph] Bitcoin options market structure leans toward $60K retest
→ BTC-USD -1.8%, regime risk-off defavorable au crypto

### Events avec surprise :
- Balance commerciale US : deficit record $901Md malgre tarifs (cluster tarifs_douane)
- Stocks petrole : repli surprise (cluster petrole_energie) → soutient les prix

### News individuelles restantes (non-clusterisees, haute qualite)
- [L'Agefi] Le FMI cherche a moderer le programme economique du PM japonais
- [Les Echos] Netflix peut renforcer son offre pour Warner Bros
- [ZoneBourse] Visa rachete Prisma et Newpay pour renforcer sa presence en Argentine
```

### 8.3 — Regles de formatage

1. **Max 6 themes** dans le bloc (sinon le prompt est trop long)
2. **Max 3 articles par theme** (les plus representatifs, apres dedup)
3. **Toujours montrer les donnees de marche** associees (changePct des assets)
4. **Les chaines causales** sont presentees avec leur niveau de confiance
5. **Les news non clusterisees** de haute qualite (source tier >= 5) sont gardees en fin de bloc
6. **Le regime de marche** est en haut, avant les themes (donne le ton)
7. **Le format est en francais** (meme les titres EN sont presentes tels quels — le LLM comprend les deux)

### 8.4 — Estimation de tokens

- Format actuel (liste plate 40 news) : ~2000-3000 tokens
- Format propose (themes structures) : ~1500-2500 tokens
- **Gain** : meme volume de tokens, mais information 3x plus riche car pre-structuree

---

## 9. Exemple concret : 19 fevrier 2026

### Donnees reelles du snapshot

| Asset | ChangePct |
|---|---|
| CL=F (WTI) | +1.90% |
| BZ=F (Brent) | +1.86% |
| GC=F (Gold) | -0.21% |
| DX-Y.NYB (Dollar) | +0.24% |
| ^GSPC (S&P 500) | -0.28% |
| ^VIX | +3.11% |
| ^FCHI (CAC 40) | -0.36% |

316 articles, 84 stock movers, 53 events, 159 earnings.

### Application de l'algorithme

**Phase 1 — Clustering** :
- `geopolitique_iran` : 8 articles (FXStreet, Marketaux, ZoneBourse...) → buzz = 9
- `earnings_general` : 45+ articles → buzz = 12 (mais bruit de fond, pas forcément dominant)
- `petrole_energie` : 6 articles (stocks petrole, prix du baril) → buzz = 6
- `airlines_transport` : 4 articles (American Airlines, Airbus) → buzz = 5
- `immobilier_credit` : 4 articles (Blue Owl, private equity) → buzz = 5
- `crypto_market` : 15 articles (bitcoin, ethereum) → buzz = 5
- `tarifs_douane` : 3 articles (deficit commercial, tarifs) → buzz = 4
- `ai_semiconductors` : 3 articles (AMD, Super Micro) → buzz = 3

**Phase 2 — Deduplication** :
- `earnings_general` : 45 articles → 18 infos uniques (beaucoup de doublons ZoneBourse/Les Echos)
- `geopolitique_iran` : 8 articles → 5 infos uniques
- `crypto_market` : 15 articles → 8 infos uniques (CoinDesk/CoinTelegraph se repetent)

**Phase 3 — Chaines causales** :
- **Chaine #1 activee** : Iran → Petrole → Airlines (3/4 etapes confirmees = 75%)
  - Iran buzz >= 3 : OUI (9)
  - CL=F > +1% : OUI (+1.9%)
  - Airlines movers >= 3 en baisse : OUI (6 airlines, -5.6% moy)
  - Inflation signal : NON (petrole +1.9% < seuil 3%)

- **Chaine #10 activee** : Private credit stress → Contagion (2/4 = 50%)
  - immobilier_credit buzz >= 3 : OUI (5)
  - Mover PE en baisse > 3% : OUI (Blue Owl)
  - Contagion autres PE : PROBABLE (article mentionne Apollo, KKR, Carlyle)
  - Banques sous pression : NON CONFIRME

**Phase 4 — Clusters sectoriels (movers)** :
- Airlines : 6 titres, -5.6% moyenne → DETECTE
- Private equity : Blue Owl + mentions contagion → DETECTE (2+ movers)

**Phase 5 — Event surprises** :
- Deficit commercial US record $901Md → surprise majeure
- Stocks petrole repli surprise → soutien prix, lie a cluster petrole

### Resultat : fil rouge suggere

Le theme dominant est clairement **Iran → Petrole → Airlines** avec un buzz eleve et une chaine causale 75% confirmee. Le fil rouge de l'episode serait : **"Les tensions avec l'Iran font monter le brut — et les compagnies aeriennes decrochent."**

Le theme secondaire (credit prive / Blue Owl) est un angle complementaire interessant pour la partie "risques" de l'episode.

---

## Annexe A — Integration dans le pipeline existant

### Ou s'insere ce module

```
news-selector.ts          ← EXISTE (scoring individuel)
news-clusterer.ts         ← NOUVEAU (clustering + dedup)
causal-chain-detector.ts  ← NOUVEAU (detection chaines)
mover-explainer.ts        ← NOUVEAU (liaison movers↔news)
event-analyzer.ts         ← NOUVEAU (surprise score + matching)
script-generator.ts       ← MODIFIE (formatSnapshotForPrompt utilise les themes)
```

### Ordre d'appel

```
1. selectRelevantNews()          // existant — pre-filtre les 40 meilleures
2. clusterNews()                 // NOUVEAU — regroupe en themes
3. detectSectorClusters()        // NOUVEAU — detecte les clusters dans les movers
4. detectCausalChains()          // NOUVEAU — active les chaines
5. matchMoversToNews()           // NOUVEAU — explique chaque mover
6. analyzeEventSurprises()       // NOUVEAU — calcule les surprises
7. buildThemesDuJour()           // NOUVEAU — assemble le bloc final
8. formatSnapshotForPrompt()     // MODIFIE — injecte les themes au lieu de la liste plate
```

### Impact sur le prompt

Le bloc `## News du jour` (lignes 206-236 de `script-generator.ts`) est remplace par le bloc `## Themes du jour` structure. Le reste du prompt (assets, events, earnings, etc.) ne change pas.

---

## Annexe B — Maintenance des regles

### Ajout d'un nouveau cluster

1. Ajouter l'entree dans la table CLUSTERS avec id, nom, mots-cles FR/EN
2. Si le cluster est implique dans une chaine causale, ajouter/modifier la chaine
3. Tester sur 5 snapshots historiques pour valider le seuil de buzz

### Ajout d'une chaine causale

1. Definir le declencheur (cluster buzz + condition marche)
2. Definir les etapes avec conditions de verification
3. Definir la narration suggeree
4. Tester sur au moins 3 scenarios historiques

### Monitoring

- Logger le nombre d'articles par cluster chaque jour
- Logger les chaines activees avec leur confiance
- Si un cluster a buzz > 10 regulierement, il est peut-etre trop large (affiner les mots-cles)
- Si un cluster n'est jamais active en 2 semaines, les mots-cles sont peut-etre trop restrictifs
