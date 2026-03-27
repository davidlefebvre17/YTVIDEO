---
id: "inter-or-refuge"
title: "Or — Refuge complexe et non lineaire"
source: "intermarket.md"
symbols: ["GC=F", "SI=F", "DX-Y.NYB", "^VIX", "TLT"]
themes: ["refuge", "risk-off", "geopolitique", "inflation"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "CAUSAL_CHAIN"]
  actors: []
  regimes: ["risk-off", "choc-exogene", "incertain"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["inter-dollar-cascade", "inter-vix-peur", "inter-correlations-cassees"]
---

## Or : refuge complexe et non lineaire

L'or n'est pas un refuge simple. Son comportement est nuance et depend du type de stress sur le marche.

### Mecanismes

- L'or monte rarement dans les crashes aigus (liquidations forcees). Il joue son role de refuge APRES la phase de liquidation.
- L'or reagit aux taux reels ANTICIPES, pas actuels. Quand l'argent sans risque rapporte plus, l'or perd de son attrait.
- Or + dollar montent ensemble -> signal d'incertitude geopolitique extreme (tous les refuges actives).
- Or ignore parfois les taux reels eleves -> achat structurel des banques centrales (diversification hors USD).
- Panique aigue -> or peut baisser aussi (appels de marge, liquidations forcees).

### Correlations normales

- DXY monte -> or baisse (mecanique classique, or price en dollars)
- VIX monte -> or monte (flight to safety)
- Taux reels montent -> or baisse (cout d'opportunite)

### Decorrelation = signal

Quand l'or et le dollar montent ensemble, c'est pas cense arriver. Ca traduit une inquietude profonde — les deux refuges sont actives simultanement.

### Application narration

- "L'or recule, pese par la hausse du dollar — mecanique classique."
- "L'or et le dollar montent tous les deux — quand ces deux refuges montent en meme temps, ca traduit une inquietude profonde du marche."
