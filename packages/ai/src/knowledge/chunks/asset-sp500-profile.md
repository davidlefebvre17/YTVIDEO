---
id: "asset-sp500-profile"
title: "S&P 500 — Drivers, MAG7 et rendement historique"
source: "asset-profiles.md"
symbols: ["^GSPC", "^IXIC", "^DJI", "^VIX", "XLK", "XLF"]
themes: ["earnings", "fed", "taux", "risk-on", "recession"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "ATH_PROXIMITY", "EARNINGS_SURPRISE", "MACRO_SURPRISE"]
  actors: ["powell", "trump"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-sp500-drawdowns", "asset-vix-profile", "asset-cac40-profile"]
---

## S&P 500 (^GSPC) — Drivers et structure

**Drivers principaux** : earnings corporates US, politique Fed, emploi US, consommation, confiance.
**Ce qui le fait monter** : earnings beats, baisses de taux, ISM > 50, NFP solide mais pas trop chaud.
**Ce qui le fait baisser** : recession fears, hausse taux, earnings misses MAG7, VIX spike, crise geopolitique, tarifs douaniers.
**Correlation cle** : VIX (inverse ~-0.85), Nasdaq (positif ~0.95), yields (variable selon regime).

**MAG7** : Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta, Tesla. Representent ~30% de l'indice — leur poids est disproportionne. Un earnings miss sur un seul MAG7 peut faire chuter tout l'indice.

**Rendement historique** : ~8,5% par an sur 100 ans, ~10,5% par an depuis 1926 (dividendes reinvestis). Ce taux sert de ligne de reference pour evaluer si le marche est surevalue ou sous-evalue.

**Surevaluation** : Quand le S&P est >15-20% au-dessus de sa moyenne historique de 8,19%/an — marche potentiellement surevalue. Mais attention : avant la bulle 2000, le marche etait 50% au-dessus et a encore monte de 126% avant de craquer. Ne pas vendre uniquement sur la surevaluation.

**Smart Money Flow Index** : Quand les institutions reduisent leur exposition pendant que les indices montent — divergence dangereuse, signal de retournement potentiel. Inversement, au point bas du Covid (mars 2020), le smart money etait a ses niveaux les plus hauts (achat massif).
