---
id: "macro-recession-signals"
title: "Signaux de recession — Checklist indicateurs avances et coincidents"
source: "macro-indicators.md"
symbols: ["^GSPC", "^IXIC", "TLT", "^VIX"]
themes: ["recession", "emploi", "croissance", "pib"]
conditions:
  flags: ["MACRO_SURPRISE", "SENTIMENT_EXTREME"]
  actors: ["fed", "powell"]
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 25
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["macro-yield-curve", "macro-cycles-economiques", "macro-nfp-emploi"]
---

## Signaux de recession — La checklist

### Indicateurs avances (signalent une recession 6-18 mois avant)
- **Yield curve inversee** puis re-pentification -> signal le plus fiable (50/50 historiquement).
- **ISM/PMI manufacturing < 50** pendant 3+ mois -> contraction industrielle confirmee.
- **Consumer confidence** en chute rapide.
- **Housing starts** en baisse -> immobilier = canari dans la mine.
- **Leading Economic Index (LEI)** en baisse 6+ mois consecutifs.

### Indicateurs coincidents (confirment qu'on est en recession)
- **Taux de chomage en hausse** : ce n'est PAS un taux HAUT qui signale la recession, mais sa MONTEE depuis un point bas.
- **Sahm Rule** : si la moyenne mobile 3 mois du chomage monte de 0.5% par rapport au plus bas des 12 derniers mois -> recession quasi certaine.
- **PIB negatif 2 trimestres consecutifs** -> recession officielle (mais les marches ont deja chute avant).

### Le lag signal-realite
Les indicateurs avances precedent la recession de 12-18 mois typiquement. Les marches bougent AVANT les indicateurs : le S&P 500 chute souvent 6-9 mois avant la recession officielle.

"Les signaux sont la, mais le timing exact reste incertain — historiquement, il faut 12 a 18 mois entre les premiers signes et la materialisation."
