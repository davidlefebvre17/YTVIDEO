---
id: "ta-rsi-zones"
title: "RSI 14 — Zones, divergences et failure swings"
source: "technical-analysis.md"
symbols: []
themes: ["analyse-technique", "confluence", "momentum"]
conditions:
  flags: ["RSI_EXTREME"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["ta-confluences", "ta-hierarchy", "ta-ema-sma"]
---

## RSI 14 — Zones d'interpretation

| Zone | Valeur | Interpretation |
|------|--------|----------------|
| Survendu | < 30 | "RSI en zone de survente — historiquement, c'est la que les rebonds techniques se construisent." |
| Faible | 30-45 | "Le momentum reste oriente a la baisse." |
| Neutre | 45-55 | Equilibre. Pas besoin de le mentionner sauf contexte. |
| Fort | 55-70 | "Le momentum pousse vers le haut." |
| Surachat | > 70 | "RSI en surachat — ca ne veut pas dire que ca va baisser, mais la prudence est de mise." |

## Interpretation contextuelle (pas juste les seuils)

- RSI < 30 en tendance haussiere de fond = opportunite de rebond (retracement sain)
- RSI < 30 en tendance baissiere de fond = confirmation de faiblesse (pas un signal d'achat)
- RSI > 70 en tendance haussiere forte = momentum puissant, pas forcement un sommet
- RSI > 70 en tendance baissiere = probable rebond technique temporaire (dead cat bounce)

## Divergence RSI (signal avance)

- Prix monte + RSI baisse = divergence baissiere. "Le prix monte mais le RSI faiblit — divergence baissiere, un signe de fatigue."
- Prix baisse + RSI monte = divergence haussiere. "Le RSI commence a remonter malgre la baisse des prix — les vendeurs s'essoufflent."
- Sur indices boursiers : divergences moins fiables que sur Forex/commodities. Utiliser comme signal complementaire, pas primaire sur les equities.

## Failure swing (signal avance fort)

RSI casse un support/resistance propre sans que le prix le fasse — le prix suit generalement. "Le RSI a casse son support avant le prix — signal a surveiller de pres."

**Regle narrative** : toujours utiliser "historiquement", "statistiquement", "souvent" — jamais de certitude.
