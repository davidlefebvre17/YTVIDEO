---
id: "macro-treasury-yields"
title: "Treasury Yields — Mecanisme et interpretation"
source: "macro-indicators.md"
symbols: ["TLT", "IDTL", "DX-Y.NYB", "^GSPC"]
themes: ["taux", "inflation", "recession", "refuge"]
conditions:
  flags: ["MACRO_SURPRISE", "EXTREME_MOVE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: true
always_if_theme: true
priority: "critical"
related_chunks: ["macro-yield-curve", "macro-inflation-cpi", "macro-fed-decisions"]
---

## Treasury Yields — Le prix de l'argent

### Fonctionnement des obligations
Une obligation = un pret a un gouvernement ou une societe, avec un coupon fixe. Yield = coupon / prix de marche. **Relation INVERSE prix/rendement** : prix monte -> yield baisse, et inversement.

### Facteurs qui drivent les yields
1. **Qualite/risque** : US = AAA, rendements plus bas. Emergents = rendements plus hauts (prime de risque).
2. **Cycles economiques** : economie ralentit -> flight-to-quality -> achat obligations -> yields baissent.
3. **Taux d'interet** : yields suivent les taux directeurs AVEC AVANCE (forward looking).
4. **Inflation** : inflation monte -> obligations moins attractives -> vente -> yields montent.

### 10Y US (DGS10)
Le cout de l'argent long terme, anticipations d'inflation et de croissance. Au-dessus de 4.5% -> pression forte sur actions et immobilier. Mouvement de +/- 10 bps en une seance = notable. Correle au dollar (DXY) : quand US10Y montent, le dollar se renforce.

### 2Y US (DGS2)
Anticipe la politique Fed a court terme. Si le 2Y monte sans annonce Fed -> le marche anticipe un durcissement. Si le 2Y baisse -> le marche price des baisses de taux.

### Yields comme indicateur avance
Les yields commencent typiquement a baisser plusieurs mois AVANT que la banque centrale ne coupe ses taux. "Les rendements obligataires anticipent deja les baisses de taux — le marche ne nous attend pas."
