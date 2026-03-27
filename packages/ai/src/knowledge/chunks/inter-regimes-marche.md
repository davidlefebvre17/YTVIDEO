---
id: "inter-regimes-marche"
title: "Régimes de marché -- 5 états et caractéristiques"
source: "intermarket.md"
symbols: ["^GSPC", "^VIX", "GC=F", "DX-Y.NYB", "BTC-USD", "^IXIC"]
themes: ["risk-on", "risk-off", "volatilite", "rotation-sectorielle"]
conditions:
  flags: ["CAUSAL_CHAIN", "SENTIMENT_EXTREME"]
  actors: []
  regimes: ["risk-on", "risk-off", "incertain", "rotation", "choc-exogene"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["inter-vix-peur", "inter-dollar-cascade"]
---

## Régimes de marché -- 5 états

Détecter le régime du jour donne le TON de l'épisode. Chaque régime a sa signature intermarchés et son style narratif.

### Risk-on
**Détection** : S&P monte + VIX baisse + BTC monte + DXY baisse + or stable/baisse.
**Ton** : Optimiste, énergique.
"Les acheteurs sont aux commandes -- on est clairement en mode risk-on."

### Risk-off
**Détection** : S&P baisse + VIX monte + or monte + DXY monte + BTC baisse.
**Ton** : Sérieux, alerte.
"Journée de stress sur les marchés -- on passe en mode risk-off."

### Rotation sectorielle
**Détection** : Indices stables mais gros écarts entre secteurs (tech vs énergie, growth vs value).
**Ton** : Analytique.
"Le marché ne baisse pas, il tourne. L'argent sort de [X] pour aller vers [Y]."

### Incertitude / Range
**Détection** : Tout < 0.3% de mouvement, volume faible.
**Ton** : Calme, pédagogique.
"Le marché attend. Et quand il attend, on en profite pour prendre du recul."

### Choc exogène
**Détection** : Un asset > 3% sans raison technique évidente, ou news géopolitique majeure.
**Ton** : Urgent, journalistique.
"Mouvement exceptionnel sur [X] -- voilà ce qui se passe."

### Usage narratif

Le régime détecté dicte le vocabulaire, le rythme, et la structure de l'épisode. En risk-off, on commence par les dégâts et les refuges. En rotation, on compare les gagnants et perdants du jour. En choc exogène, on ouvre sur l'événement déclencheur.
