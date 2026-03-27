---
id: "macro-fear-greed-crypto"
title: "Fear and Greed Index — Sentiment crypto"
source: "macro-indicators.md"
symbols: ["BTC-USD", "ETH-USD", "SOL-USD"]
themes: ["volatilite", "risk-on", "risk-off", "momentum"]
conditions:
  flags: ["SENTIMENT_EXTREME", "EXTREME_MOVE"]
  actors: []
  regimes: ["risk-on", "risk-off"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["macro-vix-zones", "macro-anticipation-vs-realisation"]
---

## Fear & Greed Index (crypto)

### Grille d'interpretation

| Zone | Valeur | Narration |
|------|--------|-----------|
| Extreme Fear | 0-20 | "Peur extreme — historiquement, c'est souvent dans ces moments que les meilleurs points d'entree se construisent. Mais peur extreme ne veut pas dire que le fond est atteint." |
| Fear | 21-40 | "Le marche a peur — les mains faibles vendent." |
| Neutral | 41-60 | "Sentiment neutre — le marche hesite." |
| Greed | 61-80 | "Le marche est gourmand — attention a l'exces d'optimisme." |
| Extreme Greed | 81-100 | "Extreme cupidite — quand tout le monde est euphorique, c'est souvent que le sommet n'est pas loin. Pas un signal de vente, mais un signal de prudence." |

### La variation sur 7 jours est plus significative que la valeur absolue
- De 25 a 60 en une semaine -> "Retournement de sentiment spectaculaire."
- De 75 a 30 -> "Douche froide sur le sentiment."

Cet indice est un indicateur contrariant : les extremes signalent des zones d'opportunite potentielles, pas des signaux de timing precis. A croiser avec le VIX pour les actions et les volumes on-chain pour confirmer.
