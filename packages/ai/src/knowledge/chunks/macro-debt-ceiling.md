---
id: "macro-debt-ceiling"
title: "Plafond de la dette americaine — Mecanisme et impact"
source: "macro-indicators.md"
symbols: ["TLT", "DX-Y.NYB", "^GSPC", "^VIX"]
themes: ["dette", "geopolitique", "volatilite"]
conditions:
  flags: ["POLITICAL_TRIGGER", "NEWS_LINKED"]
  actors: ["biden", "trump"]
  regimes: ["incertain", "choc-exogene"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["macro-treasury-yields", "macro-notation-souveraine"]
---

## Plafond de la dette americaine (Debt Ceiling)

Le gouvernement US depense plus qu'il ne gagne -> deficit budgetaire chronique -> finance par emission de Treasuries. Le "debt ceiling" = plafond fixe par le Congres sur le montant total de dette autorise.

### Specificites
- Mecanisme specifique aux US (et au Danemark). Les autres pays n'ont pas ce systeme.
- En pratique, c'est un outil de negociation POLITIQUE, pas une vraie limite. Le plafond a ete releve des dizaines de fois depuis 1917.
- Les US n'ont JAMAIS fait defaut. Mais la menace suffit a creer de la volatilite (credit downgrade S&P en 2011).

### Pattern recurrent
Approche de la date limite -> negociation tendue -> accord de derniere minute -> relevement du plafond.

### Impact marches
- Volatilite accrue sur les Treasuries et le dollar a l'approche de la deadline.
- Le VIX peut monter de 2-5 points sur la seule incertitude politique.
- Les marches actions reagissent surtout si un defaut technique semble probable.

Narration type : "Le debat sur le plafond de la dette revient — comme a chaque fois, c'est plus du theatre politique qu'un vrai risque de defaut. Mais ca peut quand meme secouer les marches a court terme."
