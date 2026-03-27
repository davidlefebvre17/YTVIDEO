---
id: "season-etfs-sectoriels"
title: "Saisonnalite — ETFs sectoriels (XLK, XLF, XLE)"
source: "seasonality.md"
symbols: ["XLK", "XLF", "XLE"]
themes: ["saisonnalite", "rotation-sectorielle", "earnings"]
conditions:
  flags: []
  actors: []
  regimes: ["risk-on", "rotation"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: [1, 4, 5, 6, 9, 10, 11, 12]
always_if_symbol: true
always_if_theme: true
priority: "medium"
related_chunks: ["season-indices-actions", "season-energie", "macro-triple-witching"]
---

## Saisonnalite des ETFs sectoriels

### Tech ETF (XLK)
- **Force Q4** (01/10-30/11) — Haussier — 68% WR (20 ans). Resultats Q3 tech (FAANG/MAG7), Black Friday e-commerce, rebalancement vers growth en fin d'annee. Le tech surperforme le marche large dans cette fenetre.
- **Effet septembre** (01/09-30/09) — Baissier — 62% WR (20 ans). Rotation sectorielle vers defensifs, fin du momentum estival tech, ventes institutionnelles.

### Financials ETF (XLF)
- **Force janvier** (01/01-31/01) — Haussier — 63% WR (20 ans). Debut de cycle de resultats bancaires, repositionnement si taux hauts, guides favorables. Les banques profitent de l'environnement de taux en debut d'annee.
- **Pression printemps** (01/04-30/06) — Neutre/Baissier — 55% WR (20 ans). Depend fortement de la courbe des taux : aplatissement = pression sur marges bancaires. Pattern faible, a croiser avec le spread 10Y-2Y.

### Energy ETF (XLE)
- **Force driving season** (01/04-30/06) — Haussier — 64% WR (20 ans). Suit le petrole : saison de conduite, demande raffinerie, marges elevees. Correle a CL=F et BZ=F.
- **Faiblesse Q4** (01/11-31/12) — Baissier — 57% WR (20 ans). Anticipation de baisse de la demande hivernale, pression sur les marges de raffinage.

### Rotation sectorielle saisonniere
La saisonnalite sectorielle reflete les cycles economiques comprimes : tech domine en Q4, financieres en Q1, energie au printemps, defensives en ete/septembre. Croiser avec la phase du business cycle pour confirmer.
