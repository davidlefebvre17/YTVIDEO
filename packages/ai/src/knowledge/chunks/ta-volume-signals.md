---
id: "ta-volume-signals"
title: "Volume — Ratios, conviction et distribution institutionnelle"
source: "technical-analysis.md"
symbols: []
themes: ["analyse-technique", "confluence", "liquidite"]
conditions:
  flags: ["VOLUME_SPIKE"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["ta-confluences", "ta-ema-sma", "ta-hierarchy"]
---

## Volume — Grille d'interpretation

| Ratio (jour / moy 20j) | Interpretation |
|-------------------------|----------------|
| < 0.5 | "Journee calme, peu de conviction — les operateurs attendent" |
| 0.5 - 0.8 | "Volume en retrait, le mouvement manque de confirmation" |
| 0.8 - 1.2 | Normal — ne pas mentionner |
| 1.2 - 2.0 | "Volume [X]% au-dessus de la moyenne — les operateurs se positionnent" |
| > 2.0 | "Volume exceptionnel, [X] fois la moyenne — mouvement avec conviction" |

## Regle fondamentale

Un mouvement de prix SANS volume = suspect. Un mouvement AVEC volume = credible. Cette regle s'applique dans les deux sens : une hausse sans volume est fragile, une baisse sans volume peut etre un simple pullback.

## Distribution institutionnelle

Sur les indices boursiers, analyser si le volume accompagne les baisses ou les hausses :
- Volume en hausse sur les baisses + volume en baisse sur les rebonds = distribution institutionnelle
- "Les volumes montrent que les institutionnels se positionnent a la vente sur les rebonds — un signal de prudence."

A l'inverse, volume en hausse sur les hausses + volume faible sur les baisses = accumulation. Les institutionnels construisent des positions a l'achat.

## Volume de capitulation

Un spike de volume exceptionnel (> 3x la moyenne) sur une baisse prolongee = capitulation potentielle. "Le volume de capitulation — souvent le signe que les derniers vendeurs forces sortent du marche." Ce signal est particulierement pertinent quand combine avec un RSI en zone extreme et un support technique majeur.
