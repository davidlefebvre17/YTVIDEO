---
id: "asset-dollar-index"
title: "Dollar Index — Drivers, composition et reserves de change"
source: "asset-profiles.md"
symbols: ["DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GC=F", "BTC-USD", "^GSPC"]
themes: ["fed", "taux", "refuge", "geopolitique", "banque-centrale"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["powell", "trump"]
  regimes: ["risk-on", "risk-off", "incertain", "choc-exogene"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-gold-drivers", "asset-eurusd-profile", "asset-jpy-refuge"]
---

## Dollar Index (DX-Y.NYB) — Structure et mecanismes

**Drivers principaux** : differentiel de taux Fed vs reste du monde, flux refuge, balance commerciale US, reserves de change des banques centrales.
**Impact cross-market** : DXY en hausse → or en baisse, matieres premieres en baisse, emergents en baisse, BTC en baisse, EUR/USD en baisse.
**Seuils narratifs** : >105 = dollar fort (pression sur emergents), <100 = faiblesse structurelle.

**Composition du DXY** : EUR 57%, JPY 13,6%, GBP 11,9%, CAD 9,1%, SEK 4,2%, CHF 3,6%. L'euro pese 57% — un euro faible renforce automatiquement le DXY, meme si le dollar est neutre face aux autres devises.

**Methodologie de prediction des tendances USD** :
1. **Politique monetaire** : Fed hawkish → USD en hausse. Fed dovish → USD en baisse. Surveiller le CME FedWatch Tool.
2. **Donnees macro cles** : NFP, CPI/PCE (inflation surtout services), PMI manufacturier et services, taux de chomage.
3. **Valeur refuge** : en periode de crise, le dollar se renforce meme si les fondamentaux US sont mediocres (rapatriement de capitaux).
4. **Geopolitique** : fin de conflit → dollar perd son statut refuge → USD en baisse. Embrasement → USD en hausse.
5. **Asymetrie du pricing** : quand le marche a price peu de baisses, la moindre donnee d'affaiblissement suffit a faire chuter le dollar.

**Reserves de change — signal structurel** :
- Le dollar represente ~57% des reserves mondiales (en baisse depuis ~66% en 2015).
- La dedollarisation est un reequilibrage, pas une fin du dollar. La Chine vend du dollar pour acheter de l'or.
- En Forex, les tendances liees aux reserves de change durent longtemps : EUR/USD a fait -25% en une seule tendance (2014-2015).

**Commerce exterieur US** : principaux partenaires = Canada (18% exports), Mexique (15%), Chine (8% exports / 21% imports).
