---
id: "cb-discours-analyse"
title: "Analyse des discours de banquiers centraux"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "EURUSD=X", "USDJPY=X", "^GSPC"]
themes: ["banque-centrale", "fed", "bce", "boj", "taux", "pivot", "ton"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["powell", "lagarde", "ueda", "fed", "bce", "boj"]
  regimes: ["incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["cb-fed-pivot-signals", "cb-boj-mandat-specificites", "cb-patterns-fed-put"]
---

## Analyse des discours de banquiers centraux

**Regle de rarete :** plus un banquier central parle rarement, plus son prochain discours aura d'impact. La presidente de la BCE parle tres souvent (parfois 3 fois par semaine) → impact dilue. Le gouverneur de la BoJ parle rarement → chaque mot compte. Cette regle est fondamentale pour calibrer l'importance d'un discours.

**Quand un discours est-il important ?**
1. **Rarete** du locuteur : gouverneur > adjoint > membre junior.
2. **Attentes elevees** du marche : premiere indication sur la fin d'un cycle, changement de direction.
3. **Contexte macro tendu** : probabilites FedWatch serrees (45/55%), data ambigues.
4. **Evenement majeur recent** non encore commente par la BC.

**Phrases-cles a surveiller :**
- **Hawkish** : "data-dependent", "premature to declare victory", "inflation risks remain", "we will stay the course"
- **Dovish** : "progress on inflation", "labor market cooling", "we can begin to ease", "risks are balanced"
- **Pivot signal** : changement de vocabulaire entre deux discours successifs — passer de "some progress" a "significant progress" = signal fort.

**Ce qui compte dans une decision de taux :**
- Le discours (ton, vocabulaire, nuances) = **60%** de la reaction marche.
- Les projections (trajectoire inflation, croissance, chomage) = **30%**.
- La decision de taux elle-meme = **10%** (sauf surprise totale).

**Outils de suivi :** Financial Juice (extraits temps reel), Bloomberg (articles detailles), Trading Economics (resume + reaction), calendrier economique (planification hebdomadaire).
