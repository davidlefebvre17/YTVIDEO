---
id: "macro-yield-curve"
title: "Yield Curve — Spread 10Y-2Y et signal de recession"
source: "macro-indicators.md"
symbols: ["TLT", "IDTL", "^GSPC"]
themes: ["taux", "recession", "croissance", "analyse-technique", "banque-centrale"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["fed", "powell"]
  regimes: ["risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["macro-treasury-yields", "macro-recession-signals"]
---

## Yield Curve — Le signal le plus fiable de recession

### Spread 10Y-2Y (T10Y2Y)

| Spread | Signal | Narration |
|--------|--------|-----------|
| > 1.0% | Expansion | "La courbe des taux est en bonne sante — le marche anticipe de la croissance" |
| 0.3-1.0% | Aplatissement | "La courbe des taux s'aplatit — un signal a surveiller" |
| 0-0.3% | Quasi-plat | "Courbe quasi-plate — le marche hesite entre croissance et ralentissement" |
| < 0 | Inversion | "Courbe inversee — historiquement, ca precede une recession dans les 12 a 18 mois" |

### Mecanique de l'inversion
- **Courbe normale** : maturites longues > maturites courtes (plus de risque = plus de rendement).
- **Courbe inversee** : rendements court terme > long terme. Plus de risque percu a court terme qu'a long terme.
- La Fed de New York regarde le spread 3 mois / 10 ans. Wall Street regarde le 2 ans / 10 ans.
- **L'inversion a precede les 50 dernieres recessions sans exception.**

### Le vrai signal : la re-pentification
Apres une inversion, la RE-pentification (retour en positif) est le signal de danger IMMINENT. Pattern historique : inversion -> retour a la normale -> recession dans les mois qui suivent. En 2000, 2008, 2019 : a chaque fois, le retour a la normale a precede la recession, pas l'inversion elle-meme.

"Ne pas confondre le retour a la normale avec un signal de fin d'alerte — c'est le contraire."
