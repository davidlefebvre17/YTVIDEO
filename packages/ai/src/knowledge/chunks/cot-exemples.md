---
id: "cot-exemples"
title: "COT — Exemples de narration"
source: "cot-positioning.md"
symbols: ["EURUSD=X", "GC=F", "^GSPC", "BTC-USD"]
themes: ["cot-positioning", "narration"]
conditions:
  flags: ["COT_DIVERGENCE", "SENTIMENT_EXTREME"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "medium"
related_chunks: ["cot-signaux-cles", "cot-narration-rules", "cot-categories-traders"]
---

## COT — Exemples de narration par type de signal

### Extreme + confirmation prix
"Les hedge funds sont net short sur l'euro a un niveau qu'on n'avait pas vu depuis 18 mois — percentile 8 sur un an. Et effectivement, l'euro a perdu 3% en un mois. La question maintenant : est-ce que ce positionnement extreme va declencher un short squeeze si la moindre bonne nouvelle arrive de la BCE ?"

**Pattern :** extreme + prix dans la meme direction → poser la question du retournement, sans le predire.

### Flip de positionnement
"Retournement majeur sur l'or. Les managed money sont passes de net short a net long cette semaine — premiere fois depuis septembre. Combinee avec la baisse du dollar et les achats des banques centrales, cette rotation institutionnelle pourrait signaler le debut d'une nouvelle jambe haussiere."

**Pattern :** flip + catalyseur fondamental → signal de conviction. Toujours associer le flip a un contexte macro.

### Divergence prix/COT
"Le S&P 500 enchaine les records, mais en coulisses, les asset managers reduisent leur exposition depuis 3 semaines consecutives. Ce type de divergence — les prix qui montent pendant que les institutionnels vendent — c'est exactement le pattern qui a precede la correction de septembre dernier."

**Pattern :** divergence → reference historique pour ancrer la credibilite, sans predire le timing.

### Contexte complementaire (crypto)
"Pour mettre les choses en perspective : les speculateurs sont net long Bitcoin a 15 000 contrats sur le CME. C'est en hausse de 40% par rapport au mois dernier. Quand on voit ce genre d'accumulation institutionnelle sur les futures reglementes, ca confirme que le rallye n'est pas qu'un phenomene retail."

**Pattern :** chiffres + perspective temporelle + distinction retail/institutionnel.
