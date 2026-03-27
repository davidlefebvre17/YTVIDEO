---
id: "asset-chf-refuge"
title: "Franc suisse — Refuge, BNS et funding currency"
source: "asset-profiles.md"
symbols: ["EURUSD=X", "DX-Y.NYB", "USDJPY=X"]
themes: ["refuge", "carry-trade", "taux", "volatilite"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "VOLUME_SPIKE"]
  actors: []
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 25
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["inter-carry-trade", "asset-jpy-refuge"]
---

## Franc suisse (CHF) — Refuge et intervention BNS

**Statut** : valeur refuge historique, monnaie de carry trade (funding currency).

**Pourquoi le CHF est une valeur refuge** :
1. **Stabilite economique exceptionnelle** : taux de chomage historiquement ~2% (meme en crise des subprimes, jamais >4,5%). PIB par habitant le plus eleve du G20.
2. **Neutralite politique** : la Suisse ne participe pas aux conflits internationaux — reduit la volatilite economique interne.
3. **Systeme bancaire solide** : les banques suisses sont reconnues mondialement pour leur solidite et discretion — attire les capitaux en periode de stress.
4. **Intervention de la BNS** : la Banque nationale suisse intervient regulierement pour plafonner l'appreciation du CHF (protege les exportations suisses). Paradoxalement, cela offre de la stabilite aux investisseurs.

**Taux d'interet** : historiquement tres bas (~1% ou moins). Fait du CHF une funding currency ideale pour le carry trade. En periode risk-off, le debouclage des carry trades fait monter le CHF violemment.

**Economie d'export** : la Suisse exporte massivement (pharma, montres, machines). Un CHF trop fort nuit aux exports — la BNS intervient pour maintenir la competitivite.

**Narration** : Comme le JPY, le CHF monte en risk-off par debouclage de carry trades. Mentionner ce mecanisme systematiquement quand le CHF bouge fortement.
