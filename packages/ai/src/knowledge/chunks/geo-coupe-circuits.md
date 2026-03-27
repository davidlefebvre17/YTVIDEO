---
id: "geo-coupe-circuits"
title: "Coupe-circuits et flash crash crypto"
source: "geopolitics.md"
symbols: ["^GSPC", "^DJI", "BTC-USD", "ETH-USD", "SOL-USD"]
themes: ["volatilite", "liquidite", "risk-off"]
conditions:
  flags: ["EXTREME_MOVE", "VOLUME_SPIKE"]
  actors: []
  regimes: ["choc-exogene"]
  vix_above: 30
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["geo-flash-crash"]
---

## Coupe-circuits sur indices US

- -7% en une journée -> pause 15 minutes
- -13% -> deuxième pause 15 minutes
- -20% -> marché fermé pour la journée
- Introduits après le Black Monday 1987 (-22% en un jour)
- "Les coupe-circuits, c'est le bouton pause du marché — ça laisse le temps à tout le monde de respirer."

## Flash crash crypto — Spécificités

Le marché crypto a des caractéristiques qui amplifient les flash crashes :
- **Marché 24/7**, pas de coupe-circuit. Les chutes ne sont jamais interrompues.
- **Majorité du volume sur produits à levier** — une baisse de 5% déclenche des liquidations en cascade qui amplifient le mouvement à -15%, -20%.
- **Les altcoins sans liquidité prennent -90%** quand le Bitcoin ne perd "que" -15%. La liquidité se concentre sur BTC/ETH en période de stress.
- **Les exchanges peuvent bugger** pendant un crash : spreads aberrants, cotations faussées, ordres non exécutés.
- "Sur le marché crypto, quand la panique arrive, la liquidité disparaît — et sans liquidité, les prix deviennent absurdes."
