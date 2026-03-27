---
id: "cb-fed-transmission"
title: "Fed — Mecanisme de transmission aux marches"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "GC=F", "^GSPC", "^IXIC", "TLT", "^VIX"]
themes: ["banque-centrale", "fed", "taux", "refuge", "volatilite"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "risk-on"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["cb-fed-dual-mandate", "cb-fed-qe-qt-bilan"]
---

## Fed — Mecanisme de transmission aux marches

Les decisions de la Fed se transmettent aux marches selon des chaines causales previsibles :

**Hausse des taux** :
- Dollar ↑ (rendement plus attractif)
- Or ↓ (cout d'opportunite accru)
- Tech ↓ (duration longue, actualisation des cashflows futurs)
- Yields obligataires ↑

**Baisse des taux** :
- Dollar ↓
- Or ↑ (rendement reel en baisse)
- Tech ↑ (valorisations plus genereuses)
- Yields ↓

**Pause** : l'interpretation depend du contexte. Une "pause hawkish" (la Fed arrete de monter mais maintient un ton ferme) n'a pas le meme effet qu'une "pause dovish" (la Fed signale qu'elle a fini et regarde vers la baisse).

**Ce qui compte reellement dans une decision de taux** :
- La decision elle-meme = **10%** de la reaction marche (souvent deja pricee)
- Le discours (ton, vocabulaire, nuances) = **60%** de la reaction
- Les projections (trajectoire inflation, croissance, chomage) = **30%**

Exception : une surprise totale (hausse inattendue, baisse de 50bp au lieu de 25bp) provoque un mouvement violent car tout le pricing doit se recalibrer.
