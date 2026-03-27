---
id: "cot-narration-rules"
title: "COT — Regles de narration et vocabulaire"
source: "cot-positioning.md"
symbols: []
themes: ["cot-positioning", "narration", "ton"]
conditions:
  flags: ["COT_DIVERGENCE"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "medium"
related_chunks: ["cot-signaux-cles", "cot-categories-traders", "cot-exemples"]
---

## COT — Regles de narration

**6 regles pour integrer le COT dans un episode :**

1. **Jamais citer des chiffres bruts sans contexte** : "Net long 45 000 contrats" ne veut rien dire pour l'auditeur. Toujours relativiser : "au plus haut depuis 6 mois", "percentile 85 sur 10 semaines", "le plus gros positionnement depuis mars."

2. **Toujours relier au prix** : le COT seul n'a pas de valeur narrative. Combiner position + mouvement de prix pour creer du sens : "Les hedge funds sont massivement short sur le yen — et effectivement, USD/JPY continue de grimper. Mais attention : ce niveau de concentration short a historiquement precede des short squeezes violents."

3. **Signal contrarian = conditionnel** : ne JAMAIS dire "le marche va se retourner parce que le COT est extreme." Dire : "historiquement, ces niveaux de positionnement ont precede des mouvements dans l'autre sens — c'est un signal de prudence."

4. **Delai de 3 jours** : les donnees du mardi sont publiees le vendredi. Le marche a pu bouger entre-temps. Si pertinent : "Ces positions datent de mardi — depuis, le prix a deja bouge de X%."

5. **Frequence hebdomadaire** : le COT ne change qu'une fois par semaine. Ne pas sur-analyser un changement mineur. Se concentrer sur les tendances de 3+ semaines et les extremes.

6. **Vocabulaire institutionnel obligatoire** :
   - "Les institutionnels se positionnent" (pas "les investisseurs")
   - "Accumulation de positions longues" (pas "achat")
   - "Debouclage de shorts" (pas "vente")
   - "Positionnement speculatif" (pas "pari")
   - "Conviction du marche" (pas "confiance")
