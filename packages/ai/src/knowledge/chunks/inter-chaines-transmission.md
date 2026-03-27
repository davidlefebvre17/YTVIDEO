---
id: "inter-chaines-transmission"
title: "Chaînes de transmission cross-market"
source: "intermarket.md"
symbols: ["^GSPC", "^IXIC", "DX-Y.NYB", "EURUSD=X", "GC=F", "CL=F", "TLT"]
themes: ["taux", "inflation", "fed", "banque-centrale", "risk-on", "risk-off", "croissance"]
conditions:
  flags: ["CAUSAL_CHAIN", "MACRO_SURPRISE", "NEWS_LINKED"]
  actors: ["powell", "lagarde"]
  regimes: ["risk-on", "risk-off", "choc-exogene"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["inter-dollar-cascade", "inter-taux-moteur-forex", "inter-petrole-inflation"]
---

## Chaînes de transmission cross-market

Les marchés ne bougent pas en isolation. Chaque donnée macro déclenche une cascade ordonnée : **macro -> devises -> commodities -> actions**. Comprendre la chaîne permet d'anticiper les dominoes suivants.

### Chaîne 1 : Donnée macro US -> Devise -> Actions

Emploi US solide -> marché anticipe maintien taux Fed -> USD haussier -> EURUSD baisse -> exportateurs européens soutenus, importateurs US pénalisés -> or sous pression -> émergents en difficulté (dette USD).

Inflation US recule -> marché anticipe pivot Fed -> USD baissier -> EURUSD monte -> matières premières rebondissent -> émergents respirent -> or rebondit -> Nasdaq rebondit (actualisation plus favorable).

### Chaîne 2 : Pétrole -> Inflation -> Banques centrales

Tensions géopolitiques -> pétrole monte -> CPI accélère -> Fed contrainte de rester restrictive -> taux restent hauts -> USD soutenu -> actions tech sous pression -> crédit se resserre.

C'est la boucle énergétique : le pétrole est le maillon entre géopolitique et politique monétaire. Une hausse de 4% du brut sur des tensions en Mer Rouge ne pèse pas directement sur les actions -- c'est l'enchaînement pétrole -> inflation tenace -> Fed bloquée qui pénalise tout le complexe risque.

### Chaîne 3 : Taux -> Tech -> Rotation

Taux US montent -> Nasdaq trinque (les valeurs de croissance sont les plus sensibles au taux d'actualisation) -> rotation vers value/défensif -> Dow surperforme Nasdaq -> signal de rotation sectorielle classique.

### Application narration

Toujours remonter la chaîne causale. Ne jamais dire "le Nasdaq baisse" sans expliquer POURQUOI : quel maillon en amont a déclenché le mouvement. Le spectateur doit voir les dominoes tomber.
