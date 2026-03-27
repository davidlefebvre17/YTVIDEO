---
id: "asset-eurusd-profile"
title: "EUR/USD — Differentiel de taux et tendances longues"
source: "asset-profiles.md"
symbols: ["EURUSD=X", "DX-Y.NYB", "^FCHI"]
themes: ["bce", "fed", "taux", "geopolitique"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "MACRO_SURPRISE"]
  actors: ["lagarde", "powell"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["asset-dollar-index", "asset-cac40-profile"]
---

## EUR/USD (EURUSD=X)

**Driver #1** : differentiel de taux Fed vs BCE. Le spread 2 ans US-DE est le meilleur predicteur.

**Ce qui le fait monter** : BCE plus hawkish que la Fed, croissance EU surprise positive, dollar en repli, fin de conflit en Europe (Ukraine).
**Ce qui le fait baisser** : Fed plus hawkish, crise politique EU, spreads peripheriques en hausse.

**Amplitudes historiques** : des tendances de -22 a -25% sont possibles en EUR/USD. Les grosses tendances Forex peuvent durer 12-18 mois sans retracement significatif.

**Narration** : L'euro pese 57% du DXY — analyser l'euro est indispensable pour comprendre le dollar. Un mouvement EUR/USD est souvent le reflet d'une histoire de divergence de politique monetaire entre Fed et BCE plutot qu'une histoire purement europeenne.
