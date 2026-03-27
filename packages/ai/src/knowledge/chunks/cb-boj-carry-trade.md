---
id: "cb-boj-carry-trade"
title: "BoJ — Carry trade et risque systemique"
source: "central-banks.md"
symbols: ["USDJPY=X", "^N225", "AUDUSD=X", "NZDUSD=X"]
themes: ["boj", "carry-trade", "banque-centrale", "risk-off", "volatilite"]
conditions:
  flags: ["CAUSAL_CHAIN", "EXTREME_MOVE"]
  actors: ["ueda", "boj"]
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 25
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cb-boj-mandat-specificites", "inter-carry-trade", "cb-boj-divergence-fed"]
---

## BoJ — Carry trade et effet cascade

Le carry trade yen est l'un des mecanismes systemiques les plus dangereux des marches. Le principe : emprunter en yen (taux quasi nuls) pour investir dans des actifs a rendement eleve (obligations US, actions, AUD, NZD).

**Mecanisme de debouclage :**
Un relevement de taux par la BoJ declenche deux effets simultanement :
1. Emprunter en yen devient plus couteux (cote financement).
2. Le yen se renforce (cote rendement de change negatif).

C'est une double perte pour les portefeuilles finances en yen. Les liquidations commencent par les actifs les plus liquides et les plus abondamment finances par le carry, provoquant un effet cascade de contagion — le debouclage sur un actif force des liquidations sur d'autres.

**Actifs touches en priorite :**
- AUD/JPY et NZD/JPY (les paires carry classiques).
- Actions a beta eleve financees par la liquidite yen.
- Nikkei 225 (double effet : yen fort + risk-off).

**Pattern comportemental :**
La BoJ communiquant rarement, chaque declaration est un evenement majeur. Le marche reste traumatise longtemps apres un carry trade unwind — la volatilite implicite sur le yen reste elevee des semaines apres l'evenement. Les faux calmes post-unwind sont des pieges : les positions se reconstruisent graduellement avant le prochain choc.

**Regle narrative :** toujours mentionner le mecanisme a double levier (cout + change) et l'effet cascade. Ne jamais dire "le carry trade est termine" — il se reconstruit toujours.
