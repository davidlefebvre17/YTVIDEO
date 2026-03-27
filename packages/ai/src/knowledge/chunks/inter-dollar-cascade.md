---
id: "inter-dollar-cascade"
title: "Dollar — Cascade DXY sur tous les marches"
source: "intermarket.md"
symbols: ["DX-Y.NYB", "GC=F", "EURUSD=X", "CL=F", "BTC-USD", "SI=F", "HG=F"]
themes: ["risk-off", "refuge", "carry-trade", "taux", "risk-on"]
conditions:
  flags: ["PRICE_MOVE", "CAUSAL_CHAIN"]
  actors: []
  regimes: ["risk-off", "risk-on"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["inter-yield-spread", "inter-taux-moteur-forex", "inter-chaines-transmission"]
---

## Dollar : variable maitresse et mecanisme de transmission

Le dollar est LA variable maitresse du forex. Toutes les devises majeures sont definies PAR RAPPORT au dollar. Quand le dollar se renforce, il se renforce contre TOUT (EUR, JPY, GBP, AUD, etc.). Ce n'est pas l'euro qui baisse — c'est le dollar qui monte.

### Correlations directes du DXY

- **DXY monte -> Or baisse** : l'or est price en dollars. Dollar fort = or plus cher pour le reste du monde = pression vendeuse.
- **DXY monte -> EUR/USD baisse** : l'euro est ~57% du panier DXY, c'est quasi-mecanique.
- **DXY monte -> Matieres premieres sous pression** : toutes pricees en dollars (petrole, metaux).
- **DXY monte -> Bitcoin sous pression** : BTC traite comme un risk asset, dollar fort = risk-off.
- **DXY monte -> Emergents souffrent** : dettes en dollars plus couteuses a rembourser.

### Mecanisme de transmission

Donnee macro US forte -> marche anticipe hausse/maintien taux Fed -> rendements obligataires US montent -> flux de capitaux vers USD -> DXY monte -> pression sur or, matieres premieres, emergents, crypto.

### Dynamique d'aspiration et de dispersion

Quand le dollar baisse fortement, les capitaux sortent des actifs USD et se repartissent vers Europe, emergents, matieres premieres. A l'inverse, un dollar fort "aspire" tous les capitaux. Dollar faible -> or ET actions montent simultanement (suspension temporaire de la correlation inverse). Divergence DXY/taux US -> signal de perte de confiance fiscale ou repositionnement structurel des reserves.

### Application narration

- "L'emploi US depasse les attentes — immediatement le dollar reagit, et par ricochet l'euro recule, le yen plonge, l'or hesite."
- "Ce n'est pas que l'euro est faible — c'est que le dollar aspire tous les capitaux."
