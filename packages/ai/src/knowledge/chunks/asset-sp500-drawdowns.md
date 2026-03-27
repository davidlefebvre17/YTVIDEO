---
id: "asset-sp500-drawdowns"
title: "S&P 500 — Drawdowns historiques et saisonnalite"
source: "asset-profiles.md"
symbols: ["^GSPC", "^IXIC", "^DJI", "^VIX"]
themes: ["recession", "saisonnalite", "volatilite", "risk-off"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "ATH_PROXIMITY"]
  actors: []
  regimes: ["risk-off", "incertain", "choc-exogene"]
  vix_above: 25
  any_symbol_move: true
  seasonality_months: [9, 10]
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["asset-sp500-profile", "asset-vix-profile"]
---

## S&P 500 — Drawdowns historiques et saisonnalite

**Drawdowns historiques en recession** (depuis 1945) :
- Moyenne : -30%. Mediane autour de -20%.
- Corrections courantes : -10 a -20% (pas de recession, simple correction technique).
- Recessions moderees : -20 a -35% (2020 : -34%).
- Crises majeures : -50 a -57% (2008-2009 : -57%).
- Catastrophe : -86% (1929 — contexte radicalement different, non extrapolable).
- Meme un -57% aujourd'hui ne ramenerait qu'au niveau des points bas de 2020. Un -30% ramenerait seulement aux niveaux de 2023.

**Trouver le point bas du S&P** (methodologie) :
- Surveiller les zones -20%, -30%, -45% depuis ATH comme points de rachat potentiels.
- Le marche reagit souvent sur le SENTIMENT avant la recession reelle (il faut 2 trimestres consecutifs de PIB negatif pour confirmer).
- Quand le marche est rassure (negociations tarifs, donnees meilleures que prevu), le rebond peut etre brutal.
- Apres chaque recession, les hausses qui suivent sont historiquement massives.

**Saisonnalite** :
- Septembre = pire mois historique pour les equities (sur 70 ans de donnees).
- Mi-septembre a fin octobre = periode de sous-performance recurrente.
- Fin octobre a fin decembre = periode historiquement tres haussiere ("rally de fin d'annee").
- Lundi = pire jour en moyenne. Mercredi = meilleur jour.

**Narration** : Contextualiser les drawdowns avec les donnees historiques — "-20% c'est la moyenne d'une correction, pas d'une crise". Ne pas confondre surevaluation et signal de vente.
