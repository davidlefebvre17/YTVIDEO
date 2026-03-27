---
id: "macro-vix-zones"
title: "VIX — Zones de volatilite et signaux"
source: "macro-indicators.md"
symbols: ["^VIX", "^GSPC", "^IXIC"]
themes: ["volatilite", "risk-off", "risk-on", "analyse-technique"]
conditions:
  flags: ["SENTIMENT_EXTREME", "EXTREME_MOVE"]
  actors: []
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 20
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["macro-recession-signals", "macro-anticipation-vs-realisation"]
---

## VIX — Indice de volatilite implicite

### Grille d'interpretation par zone

| Zone | Valeur | Regime | Narration |
|------|--------|--------|-----------|
| Calme | < 15 | Complaisance | "VIX sous les 15 — le marche est serein, peut-etre trop serein" |
| Normal | 15-20 | Standard | Ne pas mentionner sauf changement notable |
| Nerveux | 20-25 | Stress modere | "Le VIX monte — les operateurs achetent de la protection" |
| Peur | 25-35 | Risk-off | "VIX au-dessus de 25 — c'est clairement du stress" |
| Panique | > 35 | Capitulation | "VIX en zone de panique — historiquement, c'est dans ces moments que les opportunites se creent pour les patients" |

### Le changement compte plus que le niveau
- VIX +30% en une seance = evenement notable
- VIX qui passe de 12 a 20 en 3 jours = "reveil brutal de la volatilite"

### VIX > 45 — Signal historique
Chaque spike au-dessus de 45 a historiquement ete un bon point d'achat pour le S&P 500 : 1998, 2001, 2008, 2011, 2015, 2018, 2020 Covid — tous suivis d'un rebond. ATTENTION : un VIX > 45 seul n'est pas un signal de timing, c'est un signal de zone d'opportunite.

### Goldman Panic Index
Similaire au Fear & Greed crypto mais pour les actions. Quand il atteint des extremes, historiquement correle a des points d'achat.
