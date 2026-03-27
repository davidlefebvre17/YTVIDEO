---
id: "cb-fed-rate-cut-stats"
title: "Fed — Statistiques historiques des baisses de taux"
source: "central-banks.md"
symbols: ["^GSPC", "DX-Y.NYB", "TLT"]
themes: ["banque-centrale", "fed", "taux", "recession"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cb-fed-pivot-signals", "cb-fed-transmission"]
---

## Fed — Statistiques historiques des baisses de taux (depuis 1950)

Sur les 12 cycles de baisse post-hausse depuis 1950 :
- **75% ont ete positifs pour les actions** : hausse moyenne de +25,5% du SP500 pendant le cycle de baisse
- Les 3 echecs : bulle dot-com (2001), subprimes (2008), Covid (2020) — tous lies a des crises structurelles, pas a la politique monetaire elle-meme

**Paradoxe recession/marche** :
- **80% des cycles de baisse ont coincide avec une recession**
- MAIS recession ≠ baisse du marche actions — le PIB peut etre negatif alors que la bourse monte (le marche anticipe la reprise avant la fin officielle de la recession)

**Baisse de taux + ATH** : quand la Fed coupe les taux alors que le SP500 est a un ATH (a 2% pres) :
- A 1 mois : le marche est plus haut dans **45%** des cas
- A 6 mois : le marche est plus haut dans environ **70%** des cas

**Enseignement pour la narration** : ne jamais automatiquement dire "baisse de taux = haussier actions". La question est toujours : POURQUOI la Fed baisse — si c'est preventif (economie ralentit mais pas de crise), c'est positif. Si c'est reactif (crise en cours), le marche peut continuer de baisser malgre les cuts.
