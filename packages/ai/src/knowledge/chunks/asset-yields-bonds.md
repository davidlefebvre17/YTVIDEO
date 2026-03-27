---
id: "asset-yields-bonds"
title: "Yields US et obligations — Courbe des taux et refuges"
source: "asset-profiles.md"
symbols: ["TLT", "IDTL", "GC=F", "^GSPC", "DX-Y.NYB"]
themes: ["taux", "fed", "recession", "refuge"]
conditions:
  flags: ["PRICE_MOVE", "MACRO_SURPRISE"]
  actors: ["powell"]
  regimes: ["risk-off", "incertain", "risk-on"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-gold-drivers", "asset-dollar-index", "asset-sp500-profile"]
---

## Yields US et obligations

**10Y** : taux "sans risque" de reference mondiale. Impact direct sur immobilier, tech, valorisations. Quand le 10Y monte, les actifs a duration longue (tech, growth) souffrent.

**2Y** : proxy des attentes Fed a court terme. Bouge AVANT les decisions FOMC — c'est un indicateur avance de la politique monetaire.

**Spread 10Y-2Y** : inverse (<0) = signal historique de recession a 12-18 mois. Retour en positif = recession imminente ou passee. Ce spread est un des indicateurs les plus fiables de recession.

**Obligations vs or** : quand les taux baissent, les obligations prennent de la valeur (ETF type TLT/IDTL). En anticipation de recession, les obligations peuvent surperformer les actions. L'or et les obligations sont des refuges complementaires mais avec des drivers differents :
- Or = protection contre l'inflation et la perte de confiance
- Obligations = protection contre la recession et la deflation

**Narration** : Ne jamais parler des yields isolement — toujours relier a l'impact sur les autres classes d'actifs. "Le 10 ans US remonte a 4.5% — ca met la pression sur les valorisations tech et ca renforce le dollar."
