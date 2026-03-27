---
id: "ta-support-resistance"
title: "Support / Resistance — Types de niveaux et ATH/ATL"
source: "technical-analysis.md"
symbols: []
themes: ["analyse-technique", "confluence"]
conditions:
  flags: ["ZONE_EVENT", "ATH_PROXIMITY"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["ta-fibonacci", "ta-ema-sma", "ta-confluences"]
---

## Types de niveaux detectes

- **Low/High 20 jours** : "Le support des 20 derniers jours a [X]"
- **52-week low/high** : "On n'est plus qu'a [Y]% du plus haut annuel"
- **ATH/ATL** : evenements narratifs majeurs (voir ci-dessous)
- **Nombre rond** : "Le niveau psychologique des [X] — un seuil que le marche surveille"
- **EMA/SMA comme S/R dynamique** : "L'EMA21 fait office de support dynamique"
- **Zone de congestion** : "Cette zone entre [X] et [Y] ou le prix a consolide pendant plusieurs semaines"

## Presentation narrative

Toujours presenter comme scenarios conditionnels : "Si le prix casse [support], le prochain niveau a surveiller serait [X]. A l'inverse, un rebond ici pourrait ramener vers [resistance]."

## ATH / ATL — Evenements narratifs

- Nouveau ATH : "Nouveau record historique — territoire inexplore"
- A < 2% de l'ATH : "On frole le record — la question c'est : est-ce qu'il va aller le chercher ?"
- A < 5% de l'ATH + RSI > 70 : "Proche du record avec un RSI tendu — configuration ou la prudence est de mise"
- Nouveau ATL : "Plus bas historique — un niveau qu'on n'avait jamais vu"
- Rebond depuis ATL : "Apres avoir touche un plus bas, [asset] tente un rebond"

**Regle** : les niveaux de support/resistance sont des zones, pas des prix exacts. Toujours presenter avec une marge et en scenario conditionnel. Ne jamais affirmer qu'un niveau "va tenir" ou "va casser".
