---
id: "asset-cac40-profile"
title: "CAC 40 — Luxe, BCE et dependance Chine"
source: "asset-profiles.md"
symbols: ["^FCHI", "EURUSD=X", "^GSPC"]
themes: ["bce", "earnings", "taux", "rotation-sectorielle"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "ATH_PROXIMITY", "EARNINGS_SURPRISE", "NEWS_LINKED"]
  actors: ["lagarde"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["asset-sp500-profile", "asset-eurusd-profile"]
---

## CAC 40 (^FCHI) — Specificites francaises

**Drivers principaux** : politique BCE, resultats des champions (LVMH, TotalEnergies, Sanofi), demande chinoise (luxe), spread BTP-Bund.

**Specificite FR** : forte composante luxe (~25% de l'indice), exportateurs sensibles a EUR/USD.

**Ce qui le fait monter** : consommation Chine (luxe), euro faible (exports), baisse taux BCE.
**Ce qui le fait baisser** : crise politique FR, spreads OAT-Bund en hausse, luxe en panne (Chine en ralentissement).

**Narration** : Le CAC est un proxy de la demande chinoise via le luxe. Quand la Chine tousse, le CAC s'enrhume. Quand l'euro faiblit, les exportateurs francais en profitent — mais cela cache parfois un probleme de fond en zone euro.
