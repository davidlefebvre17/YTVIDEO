---
id: "geo-asymetries-regionales"
title: "Asymétries régionales face aux chocs énergétiques"
source: "geopolitics.md"
symbols: ["CL=F", "BZ=F", "NG=F", "^GSPC", "^GDAXI", "^FCHI", "^N225", "^HSI", "XLE", "USDJPY=X"]
themes: ["geopolitique", "moyen-orient", "inflation", "rotation-sectorielle"]
conditions:
  flags: ["POLITICAL_TRIGGER", "CAUSAL_CHAIN", "PRICE_MOVE"]
  actors: []
  regimes: ["choc-exogene"]
  vix_above: 0
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["geo-moyen-orient-chaine", "geo-russie-ukraine-chaine"]
---

## Asymétries régionales face aux chocs énergétiques

Un même choc pétrolier n'a PAS le même impact selon la région. Le narrateur doit toujours distinguer QUI souffre et QUI en profite.

**États-Unis — net exporteur, autonome** : Premier producteur mondial (>12 Mb/j), net exporteur depuis 2019. Un choc pétrolier AUGMENTE les revenus des producteurs US. Le S&P 500 contient les majors (XOM, CVX) — l'indice peut monter malgré un choc. "Les US sont les moins vulnérables — c'est l'Europe et l'Asie qui paient."

**Europe — dépendante, exposée** : Importe ~90% de son pétrole, ~80% de son gaz. Pétrole à 100$+ = inflation importée directe. Le DAX souffre plus que le S&P (industrie lourde). Le CAC résiste mieux (TotalEnergies compense, luxe moins exposé). La BCE est plus contrainte que la Fed.

**Japon — importateur total, double peine** : Importe ~95% de son énergie. Un yen faible AMPLIFIE le coût (prix + devises). Mais les sogo shosha (Mitsui, Mitsubishi) sont des BÉNÉFICIAIRES en tant que traders de commodities. Le Nikkei peut monter grâce à eux même si l'économie souffre.

**Chine — importateur stratégique** : Peut acheter du pétrole russe/iranien à prix réduit. Réagit moins aux chocs Moyen-Orient. Levier diplomatique sur l'Iran.

| Choc | US (^GSPC) | Europe (^GDAXI) | Japon (^N225) | Chine (^HSI) |
|------|-----------|-----------------|---------------|--------------|
| Pétrole +10% | Mixte | Négatif | Mixte | Faible impact |
| Pétrole -10% | Mixte | Positif | Positif | Neutre |
| Gaz +20% | Neutre | Très négatif | Négatif | Négatif |
| Sanctions Iran | Haussier pétrole | Négatif | Négatif | Positif (discount) |
