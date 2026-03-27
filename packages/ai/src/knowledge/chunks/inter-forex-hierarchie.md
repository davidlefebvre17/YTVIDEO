---
id: "inter-forex-hierarchie"
title: "Forex — Hierarchie des devises et paires derivees"
source: "intermarket.md"
symbols: ["DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GBPUSD=X", "AUDUSD=X", "NZDUSD=X"]
themes: ["carry-trade", "taux"]
conditions:
  flags: ["PRICE_MOVE", "EMA_BREAK"]
  actors: []
  regimes: ["risk-on", "risk-off"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["inter-dollar-cascade", "inter-taux-moteur-forex"]
---

## Hierarchie Forex : le USD domine tout

Seules 8 devises comptent : USD, EUR, JPY, GBP, AUD, CAD, CHF, NZD. Ces 8 devises representent ~95% des echanges forex.

### Paires derivees

Les paires mineures derivent des majeures : EURJPY = EURUSD x USDJPY. Un mouvement sur CADJPY reflete souvent un mouvement USD, pas une histoire CAD/JPY propre. Toujours verifier si le mouvement vient du dollar avant d'attribuer une cause specifique a la devise secondaire.

### JPY : la victime preferee du USD fort

Quand le dollar monte, le yen souffre le plus (ecart de taux maximal, carry trade). Le USDJPY est la paire la plus sensible aux differentiels de taux car le Japon maintient des taux proches de zero depuis des decennies.

### Application narration

- Toujours identifier le MOTEUR d'un mouvement forex : est-ce le dollar (facteur commun) ou la devise specifique (facteur local) ?
- "L'euro et le dollar c'est un jeu a somme nulle."
- Quand toutes les devises bougent dans le meme sens contre le dollar, c'est un mouvement USD, pas des histoires individuelles.
