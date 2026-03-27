---
id: "cb-fed-fedwatch"
title: "Fed — FedWatch Tool utilisation avancee"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "^GSPC", "TLT"]
themes: ["banque-centrale", "fed", "taux"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "risk-on", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cb-fed-dot-plot", "cb-fed-dual-mandate", "cb-fed-pivot-signals"]
---

## Fed — FedWatch Tool : utilisation avancee

Le CME FedWatch Tool montre les probabilites implicites du marche sur les decisions de taux futures. C'est un outil puissant mais souvent mal utilise.

**Erreurs courantes** :
- **Erreur #1** : ne regarder que la prochaine reunion. Il faut analyser au minimum 3 reunions d'affilee pour voir la trajectoire anticipee.
- **Erreur #2** : reagir a de petites variations (82% → 85%) sans trigger fondamental. FedWatch evolue constamment — ne prendre position que sur des mouvements nets et confirmes par des data macro.

**Ce qui est deja price ne bouge plus** : si le marche anticipe a 90% une baisse, c'est deja dans le prix du dollar. La volatilite vient de la surprise, pas de la confirmation.

**Zones d'opportunite** : quand les probabilites sont serrees (45/55%) entre deux scenarios, les prochaines data macro feront basculer → fort mouvement sur le dollar. C'est dans ces moments d'incertitude que la narration a le plus de valeur.

**Outils avances** :
- **Compare** : comparer les probabilites a 1 jour, 1 semaine, 1 mois — permet de voir la direction du pricing
- **Historical** : correler l'evolution des probabilites avec le prix du dollar — la correlation est souvent chirurgicale

**Regle d'or** : FedWatch + analyse fondamentale. Un mouvement de probabilites sans trigger fondamental peut se retourner. Un mouvement confirme par des data = mouvement durable.
