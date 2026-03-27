---
id: "macro-nfp-emploi"
title: "NFP, chomage et emploi — Indicateurs et paradoxes"
source: "macro-indicators.md"
symbols: ["^GSPC", "DX-Y.NYB", "TLT", "GC=F"]
themes: ["emploi", "fed", "taux", "recession"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["macro-recession-signals", "macro-fed-decisions", "macro-anticipation-vs-realisation"]
---

## NFP (Non-Farm Payrolls) — 1er vendredi du mois

Ce que ca mesure : creations d'emplois aux US (hors agriculture pour exclure la saisonnalite). Sort EN MEME TEMPS que le taux de chomage ET la croissance des salaires.

### Interpretation
- Actual > Forecast -> economie forte -> moins de chances de baisse de taux -> dollar monte.
- Actual < Forecast -> economie faiblit -> plus de chances de baisse de taux -> dollar baisse.
- **ATTENTION au salaire moyen** : un bon NFP avec des salaires en chute peut INVERSER la reaction attendue.

"Le chiffre est sorti a [X] contre [Y] attendu — mais la croissance des salaires a [Z] change la donne."

## Taux de chomage

Ce n'est PAS le niveau absolu qui compte, mais la DIRECTION (montee depuis un creux). Chomage qui passe de 3.5% a 4.3% -> signal FORT, meme si 4.3% semble "bas" historiquement. Les recessions sont precedees d'une HAUSSE du chomage depuis un point bas, pas d'un chomage deja eleve. Jolts et inscriptions hebdomadaires au chomage = indicateurs complementaires.

## Paradoxe "Mauvaise nouvelle = Bonne nouvelle"

Le marche cherche l'equilibre entre crainte de recession et espoir de baisse de taux. Un NFP legerement sous attentes = positif (les taux peuvent baisser). Un NFP tres faible = peur de contraction. C'est asymetrique et instable.
