---
id: "cb-fed-dual-mandate"
title: "Fed — Mandat dual et indicateurs cles"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "GC=F", "^GSPC", "^VIX"]
themes: ["banque-centrale", "fed", "taux", "inflation", "emploi"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "risk-on"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["cb-fed-transmission", "cb-fed-pivot-signals", "cb-fed-fedwatch"]
---

## Fed — Mandat dual et indicateurs cles

La Federal Reserve opere sous un **mandat dual** : stabilite des prix (cible 2% PCE) et plein emploi. Cette dualite cree une tension permanente — lutter contre l'inflation peut nuire a l'emploi et vice versa.

**Indicateurs cles surveilles par la Fed** :
- **Core PCE** : mesure d'inflation preferee de la Fed (hors alimentation et energie)
- **NFP (Non-Farm Payrolls)** + taux de chomage : sante du marche de l'emploi
- **Salaires horaires moyens** : aussi important que le NFP — si plus eleves que prevu, c'est inflationniste
- **ISM Services / Manufacturing** : pouls de l'activite economique
- **Croissance des salaires** : composante inflationniste souvent sous-estimee

**Calendrier** : 8 reunions FOMC par an, espacees d'environ 6 semaines. Les Minutes sont publiees 3 semaines apres chaque reunion. Les projections economiques et le dot plot ne sont publies que lors des reunions trimestrielles (mars, juin, septembre, decembre).

Quand la Fed est en mode "data-dependent", chaque publication macro devient un catalyseur de volatilite — le marche reagit a chaque stat comme si c'etait une decision de taux implicite.
