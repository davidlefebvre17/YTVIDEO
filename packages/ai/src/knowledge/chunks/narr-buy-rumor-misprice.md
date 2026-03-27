---
id: "narr-buy-rumor-misprice"
title: "Patterns F et G — Buy the rumor et misprice"
source: "narrative-patterns.md"
symbols: []
themes: ["narration", "structure-episode", "mean-reversion"]
conditions:
  flags: ["MACRO_SURPRISE", "EXTREME_MOVE", "NEWS_LINKED"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["narr-counter-intuitive", "narr-discounting-mechanism"]
---

## Pattern F — Acheter la rumeur, vendre la nouvelle (usage : avant/apres event)

Le marche a deja price un evenement — la reaction a l'annonce peut etre contre-intuitive.

**Structure** :
- **Hook** : "La RBA vient de monter ses taux. Et le dollar australien s'effondre. Paradoxe ?"
- **Thread** : expliquer que le marche n'attend pas les annonces, il les anticipe
- **Segment DEEP** : montrer la phase "rumeur" — le mouvement d'anticipation avant l'event
- **Segment FOCUS** : l'annonce elle-meme et le "sell the fact" — pourquoi le prix fait l'inverse
- **Segment FLASH** : les actifs qui reagissent en cascade
- **Closing** : "La prochaine fois qu'on vous annonce une bonne nouvelle et que le prix chute — vous saurez pourquoi." + CTA

**Template narratif** :
> "Depuis [date], le marche avait deja price [X]. Au moment de l'annonce, il ne restait plus d'acheteurs.
> C'est le mecanisme classique du buy the rumor, sell the news — et c'est exactement ce qui vient de se passer sur [asset]."

## Pattern G — Le misprice (usage : quand reaction disproportionnee)

Une nouvelle provoque une reaction excessive qui va se corriger.

**Structure** :
- **Hook** : "[Asset] a bouge de [X]% en [Y]h — mais rien n'a fondamentalement change."
- **Thread** : distinguer la reaction emotionnelle du changement reel
- **Segment DEEP** : l'evenement, la reaction, pourquoi c'est disproportionne
- **Segment FOCUS** : ce qu'il faudrait pour que ce mouvement soit justifie
- **Closing** : "Le prix n'est pas toujours la verite — parfois c'est juste du bruit." + CTA

**Template narratif** :
> "Ce commentaire de [personne] a fait bouger [asset] de [X]%. Mais quand on regarde le STIR market,
> les probabilites n'ont pas bouge d'un iota. Autrement dit, le marche des taux n'y croit pas.
> Ce qu'on a la, c'est un misprice — et ca, c'est une opportunite."
