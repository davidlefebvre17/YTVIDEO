---
id: "ta-confluences"
title: "Confluences techniques et methodologie point bas"
source: "technical-analysis.md"
symbols: []
themes: ["analyse-technique", "confluence", "volatilite", "risk-off"]
conditions:
  flags: ["RSI_EXTREME", "VOLUME_SPIKE", "SMA200_CROSS", "ATH_PROXIMITY", "EMA_BREAK", "EXTREME_MOVE"]
  actors: []
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 30
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["ta-rsi-zones", "ta-ema-sma", "ta-volume-signals", "ta-support-resistance", "ta-fibonacci", "ta-hierarchy"]
---

## Combinaisons a detecter (confluences)

Le narrateur doit chercher les CONFLUENCES — plusieurs signaux alignes. Un signal isole est faible ; la convergence de 3+ signaux est significative.

**Pression vendeuse forte** : prix sous EMA21 + RSI < 30 + volume eleve. "Tout converge vers une pression vendeuse forte. On surveille [support] pour un eventuel rebond."

**Hausse avec conviction** : prix au-dessus EMA21 + RSI > 60 + volume eleve. "Le mouvement haussier a la conviction du volume ET le momentum. Tant que [EMA21] tient, la dynamique est intacte."

**Rebond potentiel** : prix sur support + RSI en divergence haussiere. "Le support tient et le RSI diverge — configuration classique de rebond potentiel."

**Sommet fragile** : ATH + RSI > 80 + volume en baisse. "Record historique mais le volume ne suit pas et le RSI est en surachat — prudence."

**Changement de regime** : break SMA200 + trendline majeure cassee + volume en hausse sur baisses. "Plusieurs signaux structurels sont passes au rouge — un changement de regime est a envisager."

**Zone OTE confluence** : prix en zone Fibonacci 0.618-0.786 + support historique + RSI < 35. "Le retracement arrive sur une confluence de niveaux — zone de haute probabilite de reaction."

## Methodologie point bas — Multi-signaux

Un point bas ne se confirme JAMAIS par un seul indicateur. Checklist de confluence :

1. **Drawdown historique** : situer la baisse (-20% = correction standard, -30% = moyenne recession, -45%+ = crise majeure). "A -[X]% de son plus haut, on entre dans des niveaux qui historiquement precedent des reprises."
2. **Support technique majeur** : SMA200, zone long terme, Fibonacci 0.618
3. **RSI en zone extreme** : RSI < 30 (voire < 20 sur du weekly)
4. **Volume de capitulation** : volume exceptionnel sur la baisse. "Souvent le signe que les derniers vendeurs forces sortent du marche."
5. **VIX en spike** (equities) : VIX > 30 = peur elevee, VIX > 40 = panique
6. **Contexte fondamental** : est-ce que les raisons de la baisse commencent a s'attenuer ?
7. **Sentiment extreme** : si tout le monde est baissier, c'est souvent la que le rebond se construit

**Narration type** : "Plusieurs signaux convergent — drawdown historique, RSI en zone extreme, volume de capitulation — mais seule une stabilisation fondamentale confirmera le point bas."

**Regle absolue** : ne jamais affirmer qu'un point bas est atteint. Utiliser "zone potentielle", "elements qui commencent a se reunir", "historiquement, ces niveaux ont precede des reprises".
