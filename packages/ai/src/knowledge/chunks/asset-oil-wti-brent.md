---
id: "asset-oil-wti-brent"
title: "Petrole WTI/Brent — OPEP+ et geopolitique"
source: "asset-profiles.md"
symbols: ["CL=F", "BZ=F", "XLE", "GC=F"]
themes: ["geopolitique", "moyen-orient", "inflation", "recession"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "NEWS_LINKED", "POLITICAL_TRIGGER"]
  actors: ["poutine", "trump", "xi-jinping"]
  regimes: ["risk-off", "choc-exogene", "risk-on"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-copper-gas", "asset-dollar-index"]
---

## Petrole WTI/Brent (CL=F / BZ=F)

**Drivers principaux** : OPEP+ (quotas production), demande Chine/US, geopolitique Moyen-Orient, stocks hebdomadaires EIA/API.

**Ce qui le fait monter** : coupes OPEP+, tensions Iran/Russie, reprise demande Chine, stocks en baisse, driving season US.
**Ce qui le fait baisser** : surproduction, ralentissement economique mondial, accord nucleaire Iran, stocks en hausse, substitution energie.

**Correlation cle** : inflation anticipee (positif), compagnies aeriennes (inverse), XLE (positif), CAD (positif — Canada exportateur).

**Spread Brent-WTI** : >5$ = tensions logistiques ou geopolitiques sur le Brent. Ce spread est un indicateur de stress sur l'offre internationale vs domestique US.

**Chaine causale type** : Tensions Iran → petrole en hausse → compagnies aeriennes sous pression → inflation importee → banque centrale coincee.
