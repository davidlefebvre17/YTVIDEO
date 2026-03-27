---
id: "season-indices-actions"
title: "Saisonnalite — Indices boursiers (S&P, Nasdaq, CAC, DAX, FTSE, Nikkei, HSI, STOXX)"
source: "seasonality.md"
symbols: ["^GSPC", "^IXIC", "^FCHI", "^GDAXI", "^FTSE", "^N225", "^HSI"]
themes: ["saisonnalite", "rotation-sectorielle", "momentum", "earnings"]
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
related_chunks: ["season-etfs-sectoriels", "macro-triple-witching"]
---

## Saisonnalite des indices boursiers

### S&P 500 (^GSPC)
- **Effet janvier** (01/01-15/01) — Haussier — 65% WR, +1.8% moy. Reallocations fonds de pension, rachats d'actions, optimisme institutionnel.
- **Sell in May** (01/05-31/10) — Baissier relatif — 60% WR. Sous-performance vs Nov-Apr. Reduction des positions, volumes faibles.
- **Effet septembre** (01/09-30/09) — Baissier — 58% WR, -0.7% moy. Retour institutionnels, rebalancement portefeuilles.
- **Rallye de fin d'annee** (22/12-02/01) — Haussier — 75% WR, +1.3% moy. Santa Claus Rally : faibles volumes, window dressing.
- **Saison forte** (01/11-30/04) — Haussier — 70% WR. Resultats Q3/Q4, Black Friday, consommation.

### Nasdaq (^IXIC)
- **Effet janvier tech** (01/01-31/01) — Haussier — 67% WR, +2.2% moy. Repositionnement post-vente decembre, espoirs guidance tech.
- **Effet septembre tech** (01/09-30/09) — Baissier — 62% WR, -1.2% moy. Rotation sectorielle vers defensifs.
- **Rallye Q4 tech** (01/10-30/11) — Haussier — 68% WR. Resultats Q3 FAANG, Black Friday e-commerce.

### CAC 40 (^FCHI)
- **Detachement dividendes** (01/05-30/06) — Baissier technique — 72% WR. Pression mecanique des detachements massifs de dividendes.
- **Saison forte** (01/11-31/03) — Haussier — 63% WR. Flux institutionnels europeens.

### DAX 40 (^GDAXI)
- **Effet janvier** (01/01-28/02) — Haussier — 66% WR, +2.5% moy. Donnees industrielles solides, commandes export.
- **Ete faible** (01/07-31/08) — Baissier — 57% WR. Volumes faibles, fermetures estivales.

### FTSE 100 (^FTSE)
- **Effet libra** (01/04-30/06) — Haussier — 62% WR. Debut exercice fiscal UK, flux pensions.
- **Periode faible** (01/07-31/08) — Baissier — 58% WR.

### Nikkei 225 (^N225)
- **Fin exercice fiscal** (01/03-31/03) — Volatile/Baissier — 60% WR. Rapatriement capitaux, pression yen.
- **Saison forte** (01/10-28/02) — Haussier — 65% WR. Nouvel exercice fiscal, flux GPIF.

### Hang Seng (^HSI)
- **Pre-Nouvel An chinois** (15/01-15/02) — Volatile — 55% WR. Prises de profits avant conges.
- **Post-Nouvel An** (16/02-31/03) — Haussier — 63% WR. Reprise flux, stimulus Pekin.

### STOXX Europe 600
- **Saison forte** (01/11-30/04) — Haussier — 64% WR.
- **Creux estival** (01/07-31/08) — Baissier relatif — 58% WR.
