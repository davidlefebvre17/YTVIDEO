---
id: "macro-cycles-economiques"
title: "Cycles economiques — Cadre de reference long/moyen/court terme"
source: "macro-indicators.md"
symbols: ["^GSPC", "^IXIC", "^DJI", "^FCHI", "^GDAXI"]
themes: ["croissance", "recession", "pib", "rotation-sectorielle", "emploi"]
conditions:
  flags: ["MACRO_SURPRISE"]
  actors: []
  regimes: ["risk-on", "risk-off", "rotation", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["macro-recession-signals", "macro-bourse-vs-economie"]
---

## Trois cycles emboites gouvernent les marches

### Cycle long terme (tendance seculaire) — 5 a 10+ ans
Moteurs : innovation (IA, Internet, electrification), demographie, endettement/desendettement. Quand le PIB reel passe negatif 2 trimestres consecutifs, c'est une recession officielle. Narration type : "On est dans une tendance seculaire haussiere portee par [innovation/demographie]."

### Cycle moyen terme (business cycle) — 2 a 5 ans
Quatre phases distinctes :
- **Early cycle** (reprise) : taux bas, credit facile, PIB repart, chomage baisse, PMI > 50. Actions explosent, risk-on.
- **Mid cycle** (maturite) : croissance stable, emploi solide, consommation forte. Hausse moderee, faible volatilite.
- **Late cycle** (surchauffe) : inflation monte, CPI accelere, Fed hawkish, credit se durcit. Rotation defensive, volatilite monte.
- **Contraction** : PMI < 50, chomage monte, yields chutent. Correction -10 a -20%, VIX spike.

Chaque contraction n'est PAS forcement une recession. Le drawdown annuel moyen du S&P 500 est de ~16% (1928-2023). Une baisse de 5-10% arrive dans 94% des annees.

### Cycle court terme — 6 a 24 mois
Dirige par les donnees economiques (CPI, NFP, PMI), decisions de politique monetaire, evenements geopolitiques.

### Analogie pour la narration
Cycle long = le **climat**, moyen = la **saison**, court = la **meteo du jour**. "Deux jours de pluie en juin ne signifient pas qu'on rentre dans une ere glaciaire." Les marches sont un mecanisme forward looking : ils bougent AVANT les evenements, pas apres.
