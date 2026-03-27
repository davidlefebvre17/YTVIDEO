---
id: "inter-vix-peur"
title: "VIX — Indice de la peur et mean-reversion"
source: "intermarket.md"
symbols: ["^VIX", "^GSPC", "GC=F"]
themes: ["volatilite", "risk-off", "refuge", "mean-reversion"]
conditions:
  flags: ["RSI_EXTREME", "EXTREME_MOVE"]
  actors: []
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 20
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: true
always_if_theme: true
priority: "critical"
related_chunks: ["inter-regimes-marche", "inter-correlations-cassees"]
---

## VIX : indice de la peur et mecanique de mean-reversion

Le VIX mesure la volatilite implicite des options S&P 500. C'est l'indicateur de reference pour jauger le stress du marche.

### Correlations directes

- **VIX monte -> S&P 500 baisse** : c'est la meme chose (VIX = volatilite implicite des options S&P). La peur s'installe.
- **VIX monte -> Or monte** : flight to safety. L'or et le VIX montent ensemble — le marche cherche des refuges.
- **VIX bas (< 12) -> Signal de complaisance** : le calme precede souvent la tempete. Le marche est serein, peut-etre trop serein.

### Seuils interpretatifs

- VIX < 12 : complaisance extreme, prochain choc amplifie
- VIX 12-20 : zone normale
- VIX 20-30 : stress eleve
- VIX > 30 : peur elevee
- VIX > 40 : panique

### Mean-reversion

VIX eleve signale panique. VIX bas signale complaisance. VIX mean-reverts toujours — les pics sont historiquement des opportunites d'achat (horizon > 3 mois). Les corrections flash (intraday spike VIX) se reparent en 24-48h.

### Application narration

- "Le VIX grimpe pendant que le S&P recule — la peur s'installe."
- "VIX sous les 12 — le marche est serein, peut-etre trop serein."
- "Record + VIX durablement bas = complaisance -> prochain choc amplifie."
