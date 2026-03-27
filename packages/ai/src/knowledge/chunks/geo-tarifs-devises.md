---
id: "geo-tarifs-devises"
title: "Devises en période d'incertitude commerciale"
source: "geopolitics.md"
symbols: ["EURUSD=X", "GBPUSD=X", "AUDUSD=X", "NZDUSD=X", "DX-Y.NYB"]
themes: ["tarifs", "geopolitique", "refuge"]
conditions:
  flags: ["POLITICAL_TRIGGER", "PRICE_MOVE"]
  actors: ["trump"]
  regimes: ["choc-exogene", "incertain"]
  vix_above: 0
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "medium"
related_chunks: ["geo-tarifs-chaine", "geo-tarifs-obligataire"]
---

## Devises clés en période d'incertitude commerciale

- **EUR vs GBP** : l'euro agit TOUJOURS comme valeur refuge face à la livre. Pattern récurrent en période de crise — l'EUR/GBP monte systématiquement.

- **AUD/NZD** : devises les plus sensibles au risque mondial. Chutent en premier, rebondissent en premier à la désescalade. Ce sont les "canaris dans la mine" du forex.

- **USD — comportement DUAL** : refuge en crise militaire (le monde achète des dollars par réflexe), mais peut CHUTER si les tarifs sapent la crédibilité US. C'est la distinction clé : crise géopolitique = USD monte, crise auto-infligée (tarifs) = USD peut baisser.

- **Dollar : ne pas extrapoler** : des baisses de 11-15% du dollar sont historiquement normales (2017, 2020, 2022). Ne pas transformer chaque correction en "la fin du dollar". "Il y a une différence entre une correction et un changement de paradigme."

Le narrateur doit toujours qualifier le TYPE de crise pour anticiper la direction du dollar. Une confusion entre "crise militaire" et "crise de crédibilité" mène à des conclusions opposées sur le forex.
