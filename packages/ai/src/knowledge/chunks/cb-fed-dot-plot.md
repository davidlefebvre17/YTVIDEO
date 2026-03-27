---
id: "cb-fed-dot-plot"
title: "Fed — Projections FOMC et dot plot"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "^GSPC", "TLT", "^VIX"]
themes: ["banque-centrale", "fed", "taux", "inflation", "croissance", "emploi"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "risk-on", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: [3, 6, 9, 12]
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["cb-fed-dual-mandate", "cb-fed-fedwatch", "cb-fed-pivot-signals"]
---

## Fed — Projections economiques et dot plot

Les projections economiques du FOMC sont publiees trimestriellement (mars, juin, septembre, decembre). Elles incluent un tableau avec PIB, PCE inflation, Core PCE et chomage pour les annees N, N+1 et N+2.

**Le dot plot** : chaque point represente la prevision anonyme d'un membre du FOMC sur le taux cible en fin d'annee. 7 gouverneurs + 12 presidents de Fed regionales = 19 points. Le dot median est la reference marche.

**Source principale de volatilite** : l'ecart entre le dot plot et les anticipations de marche (CME FedWatch). Si le dot plot median est plus hawkish que ce que le marche a price, le dollar monte et les indices baissent. Inversement, un dot plot plus dovish que les attentes = dollar ↓, indices ↑.

**Projections et signal** : si les projections montrent un PCE en hausse → signal que les taux resteront eleves plus longtemps → haussier dollar. Les projections comptent pour environ 30% de la reaction marche lors d'une reunion trimestrielle.

**Attention aux Minutes** : publiees 3 semaines apres la reunion, les Minutes revelent les dissidences internes du FOMC — combien de membres voulaient aller plus vite ou plus lentement. Un FOMC divise = incertitude = volatilite.
