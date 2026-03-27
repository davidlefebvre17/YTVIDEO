---
id: "cb-fed-money-supply"
title: "Fed — Masses monetaires M1, M2, M3"
source: "central-banks.md"
symbols: ["^GSPC", "DX-Y.NYB", "GC=F", "BTC-USD"]
themes: ["banque-centrale", "fed", "m2", "liquidite", "inflation"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["fed"]
  regimes: ["risk-on", "risk-off"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["cb-fed-qe-qt-bilan", "cb-fed-transmission"]
---

## Fed — Masses monetaires M1, M2, M3

Les agregats monetaires mesurent la quantite de monnaie en circulation dans l'economie :

- **M1** = monnaie en circulation + depots a vue (la plus liquide, les billets et comptes courants)
- **M2** = M1 + depots a terme + livrets d'epargne (l'indicateur le plus suivi)
- **M3** = M2 + instruments financiers a moyen terme (moins utilise aux US)

**Interpretation** :
- **Hausse M2** = plus de liquidite en circulation → inflationniste a terme, haussier actions court terme, souvent correle aux rallyes crypto et tech
- **Baisse M2** = resserrement monetaire reel, deflationniste, baissier actions

**Usage** : M2 est un indicateur de tendance de fond, pas de trading quotidien. Il sert a confirmer la direction globale de la politique monetaire et ses effets reels sur l'economie. Une expansion M2 en contradiction avec un discours hawkish de la Fed signale que les conditions financieres reelles sont moins restrictives que ce que la Fed communique — une divergence a surveiller.

La correlation entre M2 et le SP500 sur longue periode est bien documentee : les phases d'expansion monetaire coincident historiquement avec les marches haussiers.
