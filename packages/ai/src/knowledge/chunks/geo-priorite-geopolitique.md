---
id: "geo-priorite-geopolitique"
title: "Règle de priorité géopolitique vs technique"
source: "geopolitics.md"
symbols: []
themes: ["geopolitique", "analyse-technique", "narration"]
conditions:
  flags: ["POLITICAL_TRIGGER", "NEWS_CLUSTER"]
  actors: []
  regimes: ["choc-exogene"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["geo-regle-fondamentale", "geo-sur-narrativisation"]
---

## Quand la géopolitique PRIME sur le technique

La géopolitique prend le dessus quand :
1. **Buzz >= 5** sur un cluster géopolitique (8+ articles de 4+ sources)
2. **Impact marché confirmé** : au moins 2 assets réagissent dans la direction attendue
3. **Chaîne causale active** : au moins 2 maillons confirmés

Dans ce cas :
- Le FIL CONDUCTEUR de l'épisode est géopolitique.
- Les segments COMMENCENT par le contexte géopolitique, puis montrent les prix.
- L'analyse technique devient SECONDAIRE (niveaux clés restent, mais pas de RSI/EMA en détail).
- Les scénarios sont géopolitiques d'abord : "Si désescalade -> pétrole revient à X" plutôt que "Si cassure du support à X".

## Quand la géopolitique est un CONTEXTE (pas le fil rouge)

Si buzz < 5 ou si l'impact marché n'est pas confirmé :
- La géopolitique est mentionnée comme CAUSE possible dans un segment.
- L'analyse technique reste prioritaire.
- "Les tensions avec l'Iran sont en toile de fond — mais pour l'instant, le pétrole réagit surtout à ses niveaux techniques."
