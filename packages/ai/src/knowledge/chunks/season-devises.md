---
id: "season-devises"
title: "Saisonnalite — Devises (DXY, EUR/USD, USD/JPY, GBP/USD)"
source: "seasonality.md"
symbols: ["DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GBPUSD=X"]
themes: ["saisonnalite", "carry-trade", "taux"]
conditions:
  flags: []
  actors: []
  regimes: ["risk-on", "risk-off"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
always_if_symbol: true
always_if_theme: true
priority: "high"
related_chunks: ["macro-carry-trade-tarifs", "macro-fed-decisions", "season-indices-actions"]
---

## Saisonnalite des devises

### Dollar Index (DX-Y.NYB)
- **Faiblesse decembre** (01/12-31/12) — Baissier — 62% WR. Rapatriement de capitaux etrangers vers devises locales, flux de fin d'annee, reduction du risque.
- **Force janvier** (01/01-31/01) — Haussier — 60% WR. Repositionnement institutionnel, demande de liquidite en dollar, risk-off de debut d'annee.
- **Faiblesse avril-mai** (01/04-31/05) — Baissier — 58% WR. Risk-on printanier, flux vers actifs emergents, donnees europeennes solides.

### EUR/USD (EURUSD=X)
- **Faiblesse Q1** (01/01-31/03) — Baissier EUR — 60% WR. Rapatriements de capitaux americains, differentiel de taux Fed/BCE favorable au dollar en debut d'annee.
- **Force estivale** (01/06-31/08) — Haussier EUR — 62% WR. Tourisme zone euro, reduction positions short EUR, flux de capitaux vers Europe.

### USD/JPY (USDJPY=X)
- **Faiblesse yen mars-avril** (15/03-30/04) — Haussier USD/JPY — 68% WR. Fin exercice fiscal japonais (31 mars), institutionnels japonais vendent JPY pour acheter actifs etrangers. C'est un des patterns saisonniers les plus fiables sur le forex.
- **Force yen automne** (01/09-31/10) — Baissier USD/JPY — 60% WR. Risk-off saisonnier, retour flux vers refuges, rapatriement capitaux japonais.

### GBP/USD (GBPUSD=X)
- **Faiblesse automnale** (01/09-30/11) — Baissier GBP — 58% WR (10 ans). Incertitudes budgetaires britanniques en automne, negociations commerciales. Pattern plus recent, fiabilite moindre que les autres (base 10 ans seulement).
