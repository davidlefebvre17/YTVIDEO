---
id: "cb-boj-divergence-fed"
title: "BoJ — Divergence 2022 et enseignements"
source: "central-banks.md"
symbols: ["USDJPY=X", "^N225", "DX-Y.NYB"]
themes: ["boj", "fed", "banque-centrale", "taux", "carry-trade", "inflation"]
conditions:
  flags: ["CAUSAL_CHAIN", "PRICE_MOVE"]
  actors: ["ueda", "boj", "powell", "fed"]
  regimes: ["incertain", "rotation"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["cb-boj-carry-trade", "cb-boj-mandat-specificites", "cb-divergences-mecanismes"]
---

## Cas d'ecole — Divergence USD/JPY 2022

En janvier 2022, l'inflation US etait a 7,6% contre 0,6% au Japon — une divergence massive. La Fed devait monter les taux agressivement tandis que la BoJ n'avait aucune raison d'agir.

**Resultat :** USD/JPY en hausse spectaculaire de mars a octobre 2022, environ +30%. Le yen a subi sa plus forte depreciation en decades.

**Enseignement fondamental :** les divergences d'inflation predisent les divergences de politique monetaire, qui predisent les tendances forex sur des mois, voire des annees. C'est la chaine causale la plus fiable du forex :

Inflation divergente → Politique monetaire divergente → Differentiel de taux → Tendance forex durable

**Pattern BoJ-Fed permanent :**
Quand la Fed maintient des taux eleves et la BoJ reste accommodante, le differentiel de taux se creuse et pese mecaniquement sur le yen. Le dollar se renforce, le yen s'affaiblit, et le Nikkei souffre. Le seuil psychologique vers 150-155 USD/JPY provoque des inquietudes d'intervention — d'abord verbale (declarations du ministere des Finances), puis reelle (achats massifs de yen).

**Regle narrative :** quand USD/JPY bouge fortement, toujours chercher la divergence de politique monetaire sous-jacente. Le mouvement de change n'est que le symptome — la cause est toujours dans le differentiel d'inflation et de taux.
