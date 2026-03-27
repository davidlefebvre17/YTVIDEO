---
id: "geo-tarifs-chaine"
title: "Tarifs douaniers — Chaîne causale et pattern d'escalade"
source: "geopolitics.md"
symbols: ["^GSPC", "^IXIC", "^GDAXI", "^FCHI", "DX-Y.NYB", "^VIX", "EURUSD=X", "TLT"]
themes: ["tarifs", "geopolitique", "inflation", "volatilite"]
conditions:
  flags: ["POLITICAL_TRIGGER", "NEWS_CLUSTER", "CAUSAL_CHAIN"]
  actors: ["trump", "xi-jinping"]
  regimes: ["choc-exogene", "incertain"]
  vix_above: 0
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["geo-tarifs-obligataire", "geo-tarifs-acteurs", "geo-tarifs-devises"]
---

## Tarifs douaniers — Chaîne causale et pattern d'escalade

### Chaîne causale
```
Annonce de tarifs -> Incertitude commerciale
  -> Importations plus chères -> Inflation importée
    -> Banque centrale sous pression
  -> Dollar : fort court terme, PUIS faible si risque systémique
  -> Pays ciblés ripostent (tarifs réciproques)
    -> Secteurs exportateurs sous pression des deux côtés
  -> Supply chains perturbées -> VIX monte
  -> Rendements obligataires : hausse = inquiétude (prime de risque), pas signal hawkish
```

### Pattern d'escalade répétitif (cycle)
1. **Barre haute** : annonce de tarifs extrêmes (30%, 50%, 145%)
2. **Panique marché** : USD chute, VIX monte, actions baissent
3. **Ouverture négociations** : appels téléphoniques, déclarations d'intention
4. **Suspension/allègement** : "pause 30 jours", exemptions sectorielles
5. **Le marché respire** : rally de soulagement, USD rebondit
6. **Cycle recommence** : nouvelle annonce, nouvelle cible

**ATTENTION** : le marché peut se lasser de ce pattern. Chaque cycle produit moins de rebond — l'effet de surprise diminue, la fatigue s'installe.

Historique : les guerres commerciales 2018-2019 ont coûté ~2000 points au Dow en quelques mois. Le marché ne peut se concentrer que sur un thème à la fois — quand les tarifs dominent, les annonces macro passent au second plan.
