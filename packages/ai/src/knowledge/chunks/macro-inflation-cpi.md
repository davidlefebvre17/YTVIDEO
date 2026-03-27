---
id: "macro-inflation-cpi"
title: "Inflation / CPI / PCE — Interpretation et composantes"
source: "macro-indicators.md"
symbols: ["^GSPC", "TLT", "DX-Y.NYB", "GC=F"]
themes: ["inflation", "taux", "fed", "banque-centrale"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["macro-treasury-yields", "macro-fed-decisions", "macro-donnees-pieges"]
---

## Inflation / CPI — L'indicateur que la Fed surveille le plus

### Headline CPI vs Core CPI
- **Headline CPI** : mesure TOUS les prix (nourriture, energie, logement, services, transports).
- **Core CPI** : exclut alimentation et energie (elements les plus volatils).
- La Fed ne peut pas "creer du petrole" en montant ses taux -> elle regarde surtout le CORE CPI.

### Composantes par poids
- **Shelter/logement** : ~25% du panier — le plus lourd et le plus persistant.
- Transport : ~15% (tres sensible au petrole). Nourriture : ~13%.
- Services : poids croissant, inflation des services = la plus difficile a combattre.

### Lecture et interpretation
- Regarder CPI mensuel ET annuel : un CPI annuel en baisse peut masquer une reprise mensuelle.
- Si headline CPI baisse mais core CPI stagne -> "La baisse est en grande partie due au petrole — l'inflation sous-jacente reste collante."

### PCE (Personal Consumption Expenditures)
L'indicateur PREFERE de la Fed (plus que le CPI). PCE core au-dessus de 2% -> la Fed hesite a baisser les taux. "La derniere ligne droite est toujours la plus dure."

### Inflation et obligations — La boucle
Inflation monte -> obligations moins attractives -> vente -> yields montent. Inflation baisse -> obligations redeviennent attractives -> achat -> yields baissent.

### Le shelter lag
L'inflation immobiliere a un retard de 12-18 mois sur les loyers reels. Tant que shelter reste au-dessus de 5%, le core CPI aura du mal a revenir vers 2%.
