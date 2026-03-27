---
id: "cb-divergences-mecanismes"
title: "Divergences inter-banques centrales — Mecanismes"
source: "central-banks.md"
symbols: ["EURUSD=X", "USDJPY=X", "GBPUSD=X", "DX-Y.NYB"]
themes: ["banque-centrale", "fed", "bce", "boj", "boe", "taux", "inflation"]
conditions:
  flags: ["CAUSAL_CHAIN", "PRICE_MOVE"]
  actors: ["powell", "lagarde", "ueda", "fed", "bce", "boj"]
  regimes: ["risk-on", "risk-off", "incertain", "rotation"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["cb-divergences-historiques", "inter-taux-moteur-forex", "cb-boj-divergence-fed"]
---

## Divergences inter-banques centrales — Principe et detection

**Principe fondamental :** sur le Forex, on trade toujours une monnaie face a une autre. Les tendances majeures (mois, annees) viennent des divergences de politiques monetaires entre banques centrales. Ce n'est pas la politique d'une BC seule qui compte, mais le differentiel entre deux BC.

**Comment detecter une divergence :**

1. **Comparer les trajectoires d'inflation** entre deux zones. Exemple : US 7,6% vs Japon 0,6% en 2022 → divergence massive predisant un mouvement forex durable.

2. **Comparer les anticipations de taux** : si le marche prevoit -100bp pour la Fed vs -50bp pour la BoE → GBP/USD haussier. Les outils FedWatch et equivalents BCE permettent de quantifier.

3. **Comparer les bilans** : si le bilan Fed monte (injection) pendant que le bilan BCE baisse (resserrement) → EUR/USD hausse. Le bilan raconte parfois une histoire differente des taux.

4. **Spreads de previsions** : plus le spread entre deux BC se creuse, plus la tendance forex s'amplifie. Inversement, une convergence des politiques = aplatissement du trend.

**Regle pour la narration :**
- Identifier la divergence active du moment.
- Expliquer la chaine causale complete : inflation divergente → anticipation taux → pricing marche → mouvement forex.
- Toujours mentionner le consensus marche (FedWatch, Bloomberg surveys) pour ancrer l'analyse dans ce qui est deja price.
- Si le bilan raconte une histoire differente des taux, le signaler explicitement.
