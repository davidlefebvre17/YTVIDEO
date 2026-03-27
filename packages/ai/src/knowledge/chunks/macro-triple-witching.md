---
id: "macro-triple-witching"
title: "Triple witching et expiration d'options"
source: "macro-indicators.md"
symbols: ["^GSPC", "^IXIC", "XLK"]
themes: ["volatilite", "saisonnalite", "momentum", "analyse-technique"]
conditions:
  flags: ["VOLUME_SPIKE"]
  actors: []
  regimes: ["risk-on", "risk-off"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: [3, 6, 9, 12]
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["macro-vix-zones", "season-indices-actions"]
---

## Triple Witching et expiration d'options

### Expirations mensuelles
Chaque 3eme vendredi du mois : expiration d'options mensuelles — volatilite accrue en fin de seance.

### Triple Witching — 4x par an
Chaque 3eme vendredi du 3eme mois de chaque trimestre (mars, juin, septembre, decembre) : expiration simultanee des options sur actions, options sur indices, et futures sur indices. Les volumes echanges explosent (plusieurs milliers de milliards en options expirant en une seance).

### Effet comportemental
Les debouclages de positions creent des mouvements exageres, surtout la veille et le jour meme. Apres une serie de hausse prolongee, le triple witching devient le moment naturel de prise de profits.

### Impact sectoriel
Les valeurs a forte composante options (tech, growth) sont disproportionnellement affectees — elles peuvent chuter de 2-3% pendant que les defensives montent.

### Puts massifs
L'achat de puts massif sur un titre = signal de couverture institutionnelle, pas necessairement de conviction baissiere. Mais la pression vendeuse a l'expiration est reelle.

Narration type : "C'est jour de triple witching — les volumes explosent, et les mouvements de fin de seance sont amplifies par les debouclages de positions."
