---
id: "asset-copper-gas"
title: "Cuivre et Gaz naturel — Barometre economique et saisonnalite"
source: "asset-profiles.md"
symbols: ["HG=F", "NG=F", "CL=F"]
themes: ["recession", "croissance", "saisonnalite", "volatilite"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "MACRO_SURPRISE"]
  actors: []
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: [1, 2, 3, 4, 7, 8, 11, 12]
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["asset-oil-wti-brent", "asset-aud-nzd-commodity"]
---

## Cuivre (HG=F) — "Dr. Copper"

**Barometre de la sante economique mondiale.**
**Drivers** : demande Chine (50% de la consommation mondiale), construction, transition energetique (vehicules electriques, reseaux).
**Signal macro** : cuivre en hausse = economie mondiale en expansion. Cuivre en baisse = ralentissement anticipe.

Le cuivre est un des meilleurs indicateurs avances de la conjoncture economique car il est utilise dans pratiquement tous les secteurs industriels. Une divergence cuivre/indices actions merite toujours d'etre signalee.

## Gaz naturel (NG=F) — Extreme volatilite

**Drivers** : meteo (chauffage hiver, climatisation ete), stocks EIA, exports LNG, prix TTF Europe.
**Extremement saisonnier** : injection season (avril-oct) vs withdrawal season (nov-mars).
**Volatilite** : l'asset le plus volatil de la watchlist — mouvements de 5-10% en une journee frequents.

**Narration** : Toujours mentionner la saison (injection vs withdrawal) pour contextualiser les mouvements du gaz. La meteo est le driver dominant a court terme — les fondamentaux reprennent la main sur le moyen terme.
