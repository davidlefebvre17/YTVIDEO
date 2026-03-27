---
id: "asset-jpy-refuge"
title: "Yen japonais — Refuge, carry trade et normalisation BoJ"
source: "asset-profiles.md"
symbols: ["USDJPY=X", "GC=F", "^N225", "^GSPC"]
themes: ["refuge", "carry-trade", "boj", "taux", "volatilite"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "MACRO_SURPRISE"]
  actors: ["ueda"]
  regimes: ["risk-off", "choc-exogene", "incertain"]
  vix_above: 25
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["inter-carry-trade", "asset-chf-refuge", "asset-dollar-index"]
---

## Yen japonais (JPY) — Refuge et carry trade

**Statut** : valeur refuge, funding currency du carry trade mondial.

**Pourquoi le JPY est une valeur refuge** :
1. **Excedent de la balance courante** : le Japon exporte bien plus qu'il n'importe (automobile, machinerie, electronique). L'excedent commercial renforce structurellement le yen.
2. **Creancier net mondial** : le Japon detient massivement d'actifs a l'etranger. En crise, les Japonais rapatrient leurs capitaux — flux d'achat de yen.
3. **Dette detenue a 90% en interne** : malgre une dette >240% du PIB, elle est detenue par des banques et institutions japonaises, pas par l'etranger — pas de pression de creanciers externes.
4. **Taux d'interet les plus bas au monde** : -0,1% a 0,5% historiquement sur 25 ans.

**Self-fulfilling prophecy** : tout le monde sait que le JPY est une valeur refuge — en risk-off, tout le monde achete du JPY — le JPY monte — confirme son statut refuge. L'effet s'autoalimente.

**Risque de normalisation BoJ** : si la Bank of Japan monte ses taux (ce qui a commence), le debouclage massif des carry trades USD/JPY peut provoquer des mouvements violents sur TOUS les marches. Flash crashes typiques sur JPY.

**Narration** : Toujours mentionner le carry trade quand le JPY bouge fortement — "le yen monte, probablement un debouclage de carry trades". Expliquer pourquoi le mouvement JPY a des consequences sur les actions et matieres premieres.
