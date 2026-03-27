---
id: "macro-pmi-gdp-retail"
title: "PMI, PIB, ventes au detail et balance commerciale"
source: "macro-indicators.md"
symbols: ["^GSPC", "^FCHI", "^GDAXI", "EURUSD=X", "AUDUSD=X", "NZDUSD=X"]
themes: ["croissance", "pib", "recession", "emploi"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: []
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["macro-recession-signals", "macro-donnees-pieges"]
---

## PMI Manufacturing/Services — Debut de mois

- Au-dessus de 50 = expansion, en dessous = contraction.
- PMI services > PMI manufacturing en importance (services = 70%+ des economies occidentales).
- PMI composite = moyenne ponderee de tous les secteurs.
- Pour la zone euro, le PMI manufacturer est CRUCIAL car l'UE est en excedent commercial.
- PMI chinois : impact direct sur AUD et NZD (economies dependantes des exports vers la Chine).

"Le PMI des services est passe sous les 50 pour la premiere fois en [X] mois — c'est un signal d'alarme."

## PIB (GDP) — Trimestriel

Regarder le trimestriel ET l'annuel — ne JAMAIS se baser sur un seul. Un PIB annuel bon peut masquer un dernier trimestre catastrophique. 2 trimestres consecutifs negatifs = recession officielle.

## Retail Sales (Ventes au detail) — Milieu de mois

Sante du consommateur : 70%+ de l'economie US = consommation. Mention rapide sauf surprise majeure.

## Balance commerciale

Peu d'impact pour les US (deficit chronique). TRES important pour : AUD, NZD, CNY, EUR (economies en excedent commercial / exportatrices). Si la zone euro passe en deficit commercial -> bearish EUR.
