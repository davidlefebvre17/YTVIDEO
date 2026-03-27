---
id: "macro-donnees-pieges"
title: "Pieges des donnees mensuel vs trimestriel vs annuel"
source: "macro-indicators.md"
symbols: ["^GSPC"]
themes: ["inflation", "pib", "croissance", "narration"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: []
  regimes: ["incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["macro-inflation-cpi", "macro-pmi-gdp-retail"]
---

## Donnees mensuel vs trimestriel vs annuel — Pieges classiques

Ne JAMAIS se baser uniquement sur la donnee annuelle. Les divergences temporelles sont frequentes et trompeuses.

### PIB
Un PIB annuel positif peut cacher un dernier trimestre negatif (debut de recession). Toujours regarder le trimestriel ET l'annuel.

### CPI / Inflation
Un CPI annuel en baisse peut masquer les 2-3 derniers mois en hausse (rebond inflationniste). Un IPC core mensuel qui remonte alors que le headline baisse -> inflation sous-jacente pas vaincue.

"En glissement annuel, l'inflation baisse — mais attention, les donnees mensuelles montrent une reprise ces derniers mois."

### Presentation des events a venir
Format pour le teaser (closing) : "Demain 14h30, on a le CPI americain. Le consensus attend [X]% contre [Y]% le mois dernier. Si c'est en dessous, ca pourrait relancer les espoirs de baisse de taux. Si c'est au-dessus, attention au dollar et aux taux."

Toujours presenter avec : QUOI + QUAND + CONSENSUS + SCENARIOS CONDITIONNELS.
