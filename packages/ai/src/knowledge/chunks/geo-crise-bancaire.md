---
id: "geo-crise-bancaire"
title: "Crises bancaires — Mécanique et chaîne causale"
source: "geopolitics.md"
symbols: ["XLF", "GC=F", "BTC-USD", "TLT", "^VIX"]
themes: ["risk-off", "refuge", "taux", "liquidite"]
conditions:
  flags: ["EXTREME_MOVE", "NEWS_CLUSTER", "CAUSAL_CHAIN"]
  actors: ["fed", "bce"]
  regimes: ["choc-exogene", "risk-off"]
  vix_above: 25
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["geo-crise-bancaire-cas", "geo-krachs-patterns"]
---

## Crises bancaires — Mécanique d'un bank run

```
Doutes sur la solvabilité -> Clients retirent leurs dépôts
  -> La banque doit vendre des actifs en urgence (souvent à perte)
    -> Les pertes aggravent les doutes
      -> Plus de retraits -> spirale auto-réalisatrice
        -> Intervention régulateur ou faillite
```

### Chaîne causale bancaire complète
```
Hausse de taux agressive -> Portefeuille obligataire des banques se déprécie
  -> Banques avec clientèle fragile voient les dépôts fuir
    -> Vente forcée d'obligations à perte -> Pertes révélées
      -> Bank run s'accélère -> CDS explosent
        -> Contagion : "qui est le prochain ?"
          -> Refuges montent (or, Bitcoin, CHF, obligations courtes)
          -> Marché price un pivot dovish de la Fed
```

### CDS comme indicateur avancé
Les Credit Default Swaps = coût d'assurer la dette d'une banque contre un défaut. Les CDS de Crédit Suisse ont explosé bien AVANT la faillite. "Les CDS, c'est le thermomètre de la confiance. Quand ils explosent, c'est que le marché vote avec son argent."

### "Too Big To Fail" — Prudence
Les régulateurs interviendront pour les banques systémiques (CS racheté par UBS sous pression SNB). Mais le précédent Lehman montre que ce n'est pas garanti. FDIC assure $250k — dérisoire pour les entreprises. "Pour une entreprise avec 487 millions chez SVB, 250 000 dollars d'assurance, c'est une goutte d'eau."
