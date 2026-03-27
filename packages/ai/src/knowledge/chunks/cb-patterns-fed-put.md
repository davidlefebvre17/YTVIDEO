---
id: "cb-patterns-fed-put"
title: "Patterns marche — Fed put, pivot et anticipations excessives"
source: "central-banks.md"
symbols: ["^GSPC", "^IXIC", "^VIX", "DX-Y.NYB"]
themes: ["fed", "banque-centrale", "taux", "pivot", "volatilite"]
conditions:
  flags: ["MACRO_SURPRISE", "SENTIMENT_EXTREME", "PRICE_MOVE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "incertain"]
  vix_above: 20
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["cb-fed-pivot-signals", "cb-fed-rate-cut-stats", "cb-patterns-hawkish-cuts"]
---

## Patterns marche — Fed put et anticipations de pivot

### Le "Fed Put"
Quand les marches subissent des degradations suffisamment prononcees, le ton de la Fed tend a devenir dovish, creant un mecanisme d'assurance psychologique percu comme implicite. Ce n'est pas un niveau de prix defini, mais un "seuil de douleur" — plus le marche souffre, plus le put devient tangible. Le retournement des faucons vers une posture dovish marque souvent un point d'inflexion : les faucons "capitulent" et provoquent un rebond brutal dans les probabilites de baisse.

### Pivot de cycle et anticipations excessives
Quand la Fed signale officiellement la fin d'un cycle de hausse, le marche anticipe immediatement un rythme plus agressif de baisses que le scenario communique. Une premiere baisse agressive (50bp au lieu de 25bp) est souvent deja fully pricee, et le marche deplace son attention sur la trajectoire future.

**Pattern cle :** reaction de baisse initiale completement pricee → demotivation court terme ("buy the rumor, sell the news") → reprise sur perspectives long terme.

### Independance et pression politique
Quand des pressions politiques cherchent a influencer la politique monetaire, la reaction marche porte moins sur les taux eux-memes que sur la peur de compromettre l'independance institutionnelle. La menace a l'institution cree une volatilite superieure a ce que justifierait la simple divergence de politique.

### Discours ignores du marche
Un discours de ton ferme ("les taux resteront eleves plus longtemps") provoque rarement un retournement durable. Le marche corrige en seance puis reprend sa hausse, car la "surprise" attendue serait un changement de direction, pas une confirmation de stance existante. Les probabilites FedWatch oscillent brievement mais ne changent pas de direction structurelle.
