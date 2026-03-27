---
id: "inter-carry-trade"
title: "Carry Trade — Mecanique, paires et impact cross-market"
source: "asset-profiles.md"
symbols: ["USDJPY=X", "AUDUSD=X", "NZDUSD=X", "GBPUSD=X", "^GSPC", "^VIX"]
themes: ["carry-trade", "taux", "volatilite", "risk-on", "risk-off", "boj", "boe"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE"]
  actors: ["ueda", "powell"]
  regimes: ["risk-on", "risk-off", "choc-exogene"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["asset-jpy-refuge", "asset-chf-refuge", "asset-aud-nzd-commodity"]
---

## Carry Trade — Mecanique et impact cross-market

**Definition** : emprunter une devise a taux faible (funding currency) pour investir dans une devise a taux eleve (carry currency). Le trader est paye chaque soir le differentiel de taux (swap positif).

**Funding currencies** (taux bas) : JPY (-0,1% a 0,5%), CHF (~1%).
**Carry currencies** (taux eleves) : USD (~4-5%), AUD (~4%), NZD (~4-5%), GBP (~5%), MXN (>10%).

**Paires classiques** : USD/JPY, AUD/JPY, NZD/JPY, USD/CHF, EUR/AUD (short = carry positif).

**Calcul** : differentiel de taux directeurs x taille de position x effet de levier. Ex : USD/JPY long = 4,75% - (-0,1%) = 4,85%/an credite sur le compte.

**Pourquoi ca impacte le marche** :
- **Risk-on** : les investisseurs augmentent leur carry trade → vendent JPY/CHF, achetent USD/AUD/NZD → JPY et CHF baissent, AUD et NZD montent.
- **Risk-off** : les investisseurs debouclent leur carry trade → rachetent JPY/CHF, vendent USD/AUD/NZD → JPY et CHF explosent a la hausse.
- Ce mecanisme explique pourquoi les devises refuge montent quand les marches boursiers chutent.

**Historique** : le carry trade a ete quasi inexistant 2020-2022 (tous les taux a 0). Il est revenu en force depuis 2023 avec la divergence des politiques monetaires.

**Risque de debouclage** : quand le carry trade se deboucle (BoJ qui monte les taux, crise soudaine), les mouvements sont extremement violents car tout le monde sort en meme temps. Flash crashes typiques sur JPY.

**Filtre de trading** : ne jamais ignorer le swap. Un short USD/JPY tenu 3 mois avec un swap debiteur de 4,85%/an peut couter >1% du capital.
