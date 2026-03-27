---
id: "asset-vix-profile"
title: "VIX — Volatilite implicite et zones de stress"
source: "asset-profiles.md"
symbols: ["^VIX", "^GSPC", "^IXIC"]
themes: ["volatilite", "risk-off", "risk-on"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "RSI_EXTREME"]
  actors: []
  regimes: ["risk-off", "choc-exogene", "risk-on"]
  vix_above: 20
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-sp500-profile", "asset-sp500-drawdowns"]
---

## VIX (^VIX) — L'indice de la peur

**Ce n'est PAS un prix** — c'est la volatilite implicite des options S&P 500 a 30 jours.

**Zones** :
- <15 = complaisance (calme extreme)
- 15-20 = normal
- 20-25 = nervosite
- 25-35 = peur
- >35 = panique

**Correlation** : inverse au S&P (~-0.85). Un VIX qui monte sans que le S&P baisse = divergence dangereuse, signal que les options pricent un risque que le spot ne reflete pas encore.

**"VIX of VIX" (VVIX)** : la volatilite de la volatilite — un VVIX eleve signale que le marche ne sait pas pricer le risque.

**Narration** : Toujours contextualiser le VIX avec sa zone. "Le VIX a 28, c'est de la peur, pas de la panique" est plus informatif que "le VIX monte". Signaler les divergences VIX/S&P comme des alertes precoces.
