---
id: "season-energie"
title: "Saisonnalite — Energie (petrole WTI, Brent, gaz naturel)"
source: "seasonality.md"
symbols: ["CL=F", "BZ=F", "NG=F", "XLE"]
themes: ["saisonnalite", "geopolitique", "moyen-orient", "inflation"]
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
related_chunks: ["macro-inflation-cpi", "macro-carry-trade-tarifs", "season-etfs-sectoriels"]
---

## Saisonnalite de l'energie

### Petrole WTI (CL=F)
- **Faiblesse hivernale** (01/01-28/02) — Baissier — 62% WR, -3.1% moy (25 ans). Maintenance raffineries, demande chauffage en baisse post-janvier, stocks en exces.
- **Force driving season** (01/05-30/06) — Haussier — 65% WR, +4.2% moy (25 ans). Saison estivale de conduite americaine, hausse de la demande d'essence raffinee. C'est le pattern saisonnier le plus fiable sur le petrole.
- **Saison des ouragans** (01/08-30/10) — Volatile/Haussier — 58% WR (25 ans). Perturbations potentielles des infrastructures petrolieres du Golfe du Mexique. Volatilite accrue meme sans ouragan effectif (prime de risque).
- **Faiblesse Q4** (01/11-31/12) — Baissier — 58% WR (25 ans). Prises de profit fin d'annee, anticipation de surcapacite OPEP, reduction achats industriels.

### Brent Crude (BZ=F)
Memes patterns que WTI avec une prime geopolitique Moyen-Orient/Europe.
- **Force printemps europeenne** (01/04-30/06) — Haussier — 63% WR (20 ans). Saison touristique europeenne, hausse demande transport aerien/terrestre.

### Gaz naturel (NG=F)
- **Force hivernale** (01/11-31/03) — Haussier — 72% WR, +8.1% moy (25 ans). Demande de chauffage residentiel et industriel en hiver. C'est le pattern saisonnier le plus puissant de toutes les commodites.
- **Saison de refroidissement** (01/07-31/08) — Haussier secondaire — 58% WR (25 ans). Climatisation US (Texas, Sud-Est), pics de demande electrique.
- **Creux printanier** (01/04-30/06) — Baissier — 65% WR (25 ans). Shoulder season : ni chauffage ni climatisation, stocks se reconstituent, prix au plus bas.
