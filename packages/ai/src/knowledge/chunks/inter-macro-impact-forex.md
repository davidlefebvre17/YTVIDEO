---
id: "inter-macro-impact-forex"
title: "Données macro clés et leur impact forex"
source: "intermarket.md"
symbols: ["DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GBPUSD=X", "^GSPC", "TLT"]
themes: ["emploi", "inflation", "croissance", "pib", "fed", "bce", "boj", "boe", "banque-centrale", "taux"]
conditions:
  flags: ["MACRO_SURPRISE", "NEWS_LINKED", "CAUSAL_CHAIN"]
  actors: ["powell", "lagarde", "ueda"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["inter-taux-moteur-forex", "inter-chaines-transmission", "inter-dollar-cascade"]
---

## Données macro clés et leur impact forex

Chaque publication macro majeure déclenche une réaction en chaîne. Ce qui compte n'est pas le chiffre absolu mais l'ECART par rapport aux attentes du marché.

### Table d'impact

**NFP (emploi US)** : supérieur aux attentes -> USD haussier (Fed maintient restrictive). Inférieur -> USD baissier (Fed peut pivoter). L'emploi est le mandat dual de la Fed avec l'inflation.

**CPI (inflation US)** : supérieur -> USD haussier (taux hauts plus longtemps). Inférieur -> USD baissier (pivot possible). Le CPI est la donnée la plus surveillée pour anticiper les décisions Fed.

**PIB US** : supérieur -> USD haussier (économie résiliente, pas besoin de baisser les taux). Inférieur -> USD baissier (ralentissement, la Fed pourrait agir).

**Décision Fed** : ton hawkish -> USD monte. Ton dovish -> USD baisse. Le dot plot et la conférence de presse comptent autant que la décision elle-même.

**BCE / BoJ / BoE** : l'impact se mesure en divergence vs la Fed. Divergence = direction claire de la paire. Convergence = range. Si la BCE monte ses taux pendant que la Fed attend, EURUSD monte.

### PMI (indicateurs avancés)

Les PMI manufacturier et services anticipent le PIB de 1-2 mois. PMI > 50 = expansion, < 50 = contraction. Un PMI qui passe sous 50 est un signal de récession sectorielle. Impact USD indirect mais fort : PMI faible -> marché price un ralentissement -> anticipation de baisse des taux -> USD baissier.

### Règle narrative

Toujours nommer le chiffre, le consensus attendu, et l'écart. "Le NFP sort à 280K contre 200K attendus -- le marché ajuste immédiatement ses anticipations de taux." Le spectateur doit voir le mécanisme, pas juste le résultat.
