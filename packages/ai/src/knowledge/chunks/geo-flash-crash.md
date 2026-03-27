---
id: "geo-flash-crash"
title: "Flash crashes — Types et réaction"
source: "geopolitics.md"
symbols: ["BTC-USD", "ETH-USD", "^GSPC", "^IXIC", "EURUSD=X", "USDJPY=X"]
themes: ["volatilite", "liquidite", "risk-off"]
conditions:
  flags: ["EXTREME_MOVE", "VOLUME_SPIKE"]
  actors: []
  regimes: ["choc-exogene"]
  vix_above: 25
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["inter-bitcoin-hybride", "geo-coupe-circuits"]
---

## Flash crashes — Types et réaction appropriée

| Type | Cause | Durée | Narration |
|------|-------|-------|-----------|
| Crypto | Cascade de liquidations, carnet d'ordres peu profond | Minutes | "Une cascade de liquidations — 19 milliards effacés en 10 minutes. Les altcoins les moins liquides prennent -90%." |
| Forex (fat finger) | Erreur humaine sur un ordre bancaire | Minutes | "Un mouvement sans nouvelle derrière — probablement un fat finger. Le marché corrige déjà." |
| Forex (événement) | Décision banque centrale, géopolitique imprévu | Heures/jours | "La Swiss National Bank a dépeg le franc suisse en 2015 — -30% en quelques minutes. Des brokers ont fait faillite." |
| Indices (algorithmique) | Boucle rétroactive : algos vendent -> prix baisse -> algos vendent plus | Heures | "Les algos amplifient la chute — c'est exactement pour ça que les coupe-circuits existent." |

Le narrateur doit d'abord identifier le TYPE de flash crash pour calibrer sa réponse. Un fat finger = non-événement à ignorer. Un flash crash événementiel = potentiellement le début d'un mouvement durable.
