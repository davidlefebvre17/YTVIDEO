---
id: "macro-carry-trade-tarifs"
title: "Carry trade, douanes et transmission inflationniste"
source: "macro-indicators.md"
symbols: ["USDJPY=X", "AUDUSD=X", "^GSPC", "^N225", "BTC-USD"]
themes: ["carry-trade", "tarifs", "inflation", "volatilite", "geopolitique"]
conditions:
  flags: ["POLITICAL_TRIGGER", "EXTREME_MOVE", "NEWS_LINKED"]
  actors: ["trump", "biden", "ueda", "boj"]
  regimes: ["choc-exogene", "risk-off"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["macro-fed-decisions", "macro-inflation-cpi"]
---

## Carry Trade — Destabilisation systemique

L'emprunt en devises a bas taux (typiquement JPY, CHF) pour investir dans des actifs risques cree une vulnerabilite cachee. Une hausse surprise des taux de la banque centrale emettrice (ex: BoJ) declenche des liquidations de masse simultanees sur tous les actifs risques finances par ce carry. L'amplitude depend du volume total du trade non liquide. C'est un amplificateur de volatilite qui passe inapercu jusqu'a la casse.

### Mecanisme
- Yen faible -> carry trade JPY attractif -> investisseurs empruntent en JPY, achetent du risque.
- BoJ releve les taux ou intervient -> JPY se renforce -> liquidations forcees -> cascade sur actions, crypto, commodites.
- Impact : AUD/JPY, NZD/JPY sont les canaris dans la mine du carry trade.

## Douanes et transmission inflationniste

Des droits de douane eleves augmentent les couts d'importation. Le marche regarde attentivement : les entreprises vont-elles absorber ou repercuter sur le consommateur ? Cette incertitude cree un doute inflationniste persistant qui peut refouler les attentes de baisse de taux.

### Impact sur les actifs
- Tarifs sur la Chine -> pression sur les marges des importateurs -> potentiel inflationniste -> dollar peut se renforcer a court terme.
- L'or profite de l'incertitude tarifaire comme valeur refuge.
