---
id: "cb-boj-mandat-specificites"
title: "BoJ — Mandat, YCC et interventions forex"
source: "central-banks.md"
symbols: ["USDJPY=X", "^N225"]
themes: ["boj", "banque-centrale", "taux"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["ueda", "boj"]
  regimes: ["risk-off", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["cb-boj-carry-trade", "cb-boj-divergence-fed"]
---

## BoJ — Mandat et specificites

La Bank of Japan a un double mandat : stabilite des prix et soutien a la croissance. Historiquement, elle est la plus accommodante des grandes banques centrales.

**Specificites uniques :**
- Seule grande banque centrale a avoir maintenu des taux negatifs pendant des annees.
- **Yield Curve Control (YCC)** : controle direct du rendement JGB 10 ans — un outil sans equivalent chez les autres BC. Toute modification de la bande YCC est un signal fort de normalisation.
- **Intervention forex** : la BoJ peut intervenir directement sur USD/JPY. Le seuil historique se situe vers 150-155 — au-dela, intervention verbale puis reelle.
- **Rarete des communications** : contrairement a la BCE qui parle 3 fois par semaine, la BoJ communique peu. Chaque declaration du gouverneur est un evenement majeur a fort impact.

**Mecanisme de transmission :**
- Normalisation BoJ (hausse taux ou fin YCC) → yen fort, Nikkei en baisse, carry trade inverse (AUD/JPY, NZD/JPY en baisse).
- Maintien accommodant → yen faible, exportateurs japonais en hausse.

**Signaux a detecter :**
- USD/JPY au-dessus de 150 : zone d'intervention verbale puis reelle.
- Modification de la bande YCC : signal fort de normalisation.
- Vocabulaire : "patiently" vs "appropriately" = gradation d'urgence.

**Calendrier** : 8 reunions par an. Outlook Report trimestriel (janvier, avril, juillet, octobre).
