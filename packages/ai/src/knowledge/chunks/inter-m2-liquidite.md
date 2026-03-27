---
id: "inter-m2-liquidite"
title: "M2 masse monetaire — Indicateur avance de liquidite"
source: "intermarket.md"
symbols: ["^GSPC", "^IXIC", "BTC-USD"]
themes: ["liquidite", "m2", "qe-qt"]
conditions:
  flags: ["CAUSAL_CHAIN"]
  actors: ["fed"]
  regimes: ["risk-on", "risk-off"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "high"
related_chunks: ["inter-bitcoin-hybride", "inter-taux-moteur-forex"]
---

## M2 (masse monetaire) : indicateur avance des marches

La masse monetaire M2 est un indicateur PREDICTIF pour les actions et le bitcoin, avec un delai de 2 a 4 mois (~90 jours).

### Mecanisme

Fed cree de la monnaie -> banques centrales -> banques commerciales (multiplicateur via reserves fractionnaires) -> credit -> economie -> marches.

### Signaux

- **M2 monte -> Actions/BTC montent 2-4 mois plus tard** : plus de liquidite dans le systeme = plus d'argent disponible pour les actifs risques.
- **M2 baisse -> Pression baissiere a venir** : le robinet se ferme.
- **M2 globale en hausse -> anticipe un marche haussier** dans 2-4 mois. La liquidite mondiale est en expansion.
- **M2 globale en baisse -> anticipe une pression baissiere**. La liquidite se contracte — un signal de prudence.

### Flux et carburant

Flux vers or physique = sentiment institutionnel. Flux vers fonds monetaires = argent gare en attente de redeploiement (carburant potentiel du prochain rallye).

### Application narration

- "La masse monetaire M2 accelere depuis 3 mois — historiquement, ca presage un rallye actions dans les semaines a venir."
- "M2 se contracte — attention, le marche pourrait suivre."
- Ne pas citer M2 comme indicateur magique. Presenter comme "un des elements qui eclairent les prochains mois".
