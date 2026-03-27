---
id: "narr-quality-criteria"
title: "Criteres de qualite et regles obligatoires"
source: "narrative-patterns.md"
symbols: []
themes: ["narration", "ton", "structure-episode"]
conditions:
  flags: []
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["narr-episode-structure", "narr-causal-chains", "narr-transitions"]
---

## Criteres de qualite

### Obligatoires (fail = re-generation)

- Zero terme interdit AMF
- Duree totale 420-540s
- Ratio 120-180 mots par 60s par section
- References au passe integrees naturellement (si memoire contextuelle fournie et lien pertinent)
- Cold open specifique au jour (pas generique)
- Pas de structure en liste dans les segments
- Chaque segment auto-contenu (news + data + analyse + niveaux)
- AUCUNE section de type "synthesis", "watchlist", "recap_cta", "news", "market_overview" ou "deep_dive"
- Toutes les sections segment utilisent type: "segment" avec depth: "flash" | "focus" | "deep"
- Au moins UNE chaine causale explicite par segment DEEP

### Qualite narrative (scoring)

| Critere | Bon | Mediocre |
|---------|-----|---------|
| Connecteurs causaux | "parce que", "ce qui explique" | "et", "aussi", "par ailleurs" |
| Specificite | "1.0845 — le support des 20 derniers jours" | "un niveau important" |
| Conditionnel | "Si le prix casse X, on pourrait aller chercher Y" | "Le prix va probablement monter" |
| Liens intermarche | "L'or profite de la faiblesse du dollar" | "L'or monte. Le dollar baisse." |
| Engagement | Question, suspense, surprise | Ton monotone descriptif |
| Variete structure | Ordre change selon contexte | Toujours le meme enchainement |
| Transitions | Chaque segment amene le suivant | Coupures seches |
| Donnees precises | Chiffres, %, niveaux, dates | Vague, generique |
| Zero redondance | Chaque fait cite 1 seule fois | Meme info dans 3 sections |
| Mecanisme explique | "Le marche a deja price X" | "Le marche reagit" (sans expliquer) |
| Temporalite des donnees | "C'est un indicateur avance" | "C'est une donnee importante" |
| Narration contre-intuitive | "Bad news is good news parce que..." | Ignorer le paradoxe |
