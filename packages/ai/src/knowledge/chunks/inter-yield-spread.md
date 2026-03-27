---
id: "inter-yield-spread"
title: "Yield spread — Ecart de rendement obligataire"
source: "intermarket.md"
symbols: ["EURUSD=X", "TLT", "IDTL", "DX-Y.NYB"]
themes: ["taux", "fed", "bce"]
conditions:
  flags: ["CAUSAL_CHAIN", "MACRO_SURPRISE"]
  actors: ["powell", "lagarde"]
  regimes: ["risk-on", "risk-off"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["inter-taux-moteur-forex", "macro-treasury-yields", "ta-leading-indicators"]
---

## Yield spread : predicteur de direction forex

Le spread entre les obligations de deux economies predit la direction forex. Les bond yields 10 ans sont un forward-looking indicator : ils bougent AVANT la devise et AVANT la decision de la banque centrale.

### Mecanisme

- **Spread US-Allemagne s'elargit -> EURUSD baisse** : les capitaux preferent le rendement US.
- **Spread se retrecit -> EURUSD remonte** : la BCE rattrape ou la Fed ralentit.
- **Yield spread US-EU en hausse -> anticipe un dollar plus fort** : le marche anticipe un differentiel de taux plus favorable au dollar.
- **Yield spread diverge du prix de la devise -> opportunite** : le spread de taux s'est ecarte du prix depuis plusieurs semaines — historiquement, le prix finit par rattraper les taux.

### Application visuelle et narration

- Utiliser le graphique du yield spread SUPERPOSE a la paire forex pour montrer la correlation.
- "Le spread de taux US-Allemagne se resserre — ca explique le rebond de l'euro cette semaine."
- "Les rendements obligataires americains surperforment — le marche anticipe un differentiel de taux plus favorable au dollar."
