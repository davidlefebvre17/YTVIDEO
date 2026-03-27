---
id: "cb-boe-mandat-fiscal"
title: "BoE — Mandat inflation et interaction fiscale UK"
source: "central-banks.md"
symbols: ["GBPUSD=X", "^FTSE"]
themes: ["boe", "banque-centrale", "taux", "inflation"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: []
  regimes: ["incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "medium"
related_chunks: ["cb-divergences-mecanismes", "cb-divergences-historiques"]
---

## BoE — Mandat et interaction fiscale

La Bank of England a un mandat inflation cible a 2% CPI. L'economie UK est particulierement sensible a l'immobilier en raison de la prevalence des taux variables — les hausses de taux se transmettent directement aux menages via leurs prets hypothecaires.

**Mecanisme de transmission :**
- GBP/USD est correle au differentiel de taux vs Fed. Si la BoE monte plus vite que la Fed → GBP hausse ; si elle baisse plus vite → GBP baisse.
- Les split votes du MPC (Monetary Policy Committee, 9 membres) sont frequents et constituent un signal important. Le decompte des voix revele les tensions internes : un 5-4 est tres different d'un 9-0.

**Specificite UK — interaction politique fiscale :**
Les politiques fiscales du gouvernement britannique peuvent etre inflationnistes (depenses publiques expansionnistes, investissements massifs). Dans ce cas, la BoE est forcee de garder des taux plus eleves pour compenser → GBP hausse. C'est un mecanisme unique : la politique budgetaire pousse l'inflation, la BoE reagit en maintenant des taux restrictifs, et la livre en beneficie.

Le cas extreme fut le "mini-budget" Truss/Kwarteng de septembre 2022 : des baisses d'impots non financees ont provoque un effondrement de la livre et des gilts, forcant la BoE a intervenir en urgence sur le marche obligataire.

**Regle narrative :** pour la GBP, toujours verifier le differentiel de taux vs Fed ET les annonces fiscales du gouvernement UK. Le vote count du MPC est un signal de direction a ne pas ignorer.
