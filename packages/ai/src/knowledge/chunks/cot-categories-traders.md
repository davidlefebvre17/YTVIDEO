---
id: "cot-categories-traders"
title: "COT — Categories de traders et rapports"
source: "cot-positioning.md"
symbols: ["EURUSD=X", "GC=F", "CL=F", "^GSPC", "BTC-USD"]
themes: ["cot-positioning"]
conditions:
  flags: ["COT_DIVERGENCE", "SENTIMENT_EXTREME"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cot-signaux-cles", "cot-narration-rules", "cot-exemples"]
---

## COT — Categories de traders

Chaque mardi, la CFTC prend un snapshot des positions ouvertes sur les marches a terme americains. Publication le vendredi suivant a 15h30 ET. Le COT montre QUI est positionne et DANS QUEL SENS — pas le prix, mais les mains qui tiennent les positions.

### Rapport TFF (Financial Futures — devises, indices, crypto)

- **Asset Managers** : fonds de pension, fonds mutuels, assureurs. Positionnement directionnel, tendance long terme. "Les mains patientes." Leur positionnement reflete une conviction a horizon mois/trimestres.
- **Leveraged Funds** : hedge funds, CTAs, managed futures. Positionnement speculatif, souvent contrarian. "Les mains rapides." Signal principal pour les retournements.
- **Dealers** : grandes banques, market makers. Souvent en contrepartie des speculateurs. "Le miroir du marche." Rarement un signal directionnel en soi.

### Rapport Disaggregate (Commodities — or, petrole, cuivre)

- **Managed Money** : hedge funds speculatifs (equivalent des Leveraged Funds). Le signal principal pour les commodities — c'est sur cette categorie que se concentre l'analyse.
- **Producers/Merchants** : hedgers commerciaux (mineurs d'or, petroliers). Positionnement INVERSE au prix = normal (ils couvrent leur production). Utiles comme confirmation contrariante.
- **Swap Dealers** : intermediaires financiers. Signal secondaire, rarement exploitable seul.

**Regle :** toujours identifier la bonne categorie selon l'actif. Pour les devises et indices → Leveraged Funds/Asset Managers (TFF). Pour l'or, petrole, cuivre → Managed Money (Disaggregate).
