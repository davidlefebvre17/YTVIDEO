---
id: "cb-fed-pivot-signals"
title: "Fed — Signaux de pivot et frontloading"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "GC=F", "^GSPC", "^IXIC", "TLT"]
themes: ["banque-centrale", "fed", "pivot", "taux", "ton"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["powell", "fed"]
  regimes: ["risk-off", "risk-on", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cb-fed-dual-mandate", "cb-fed-fedwatch", "cb-patterns-fed-put"]
---

## Fed — Signaux de pivot et frontloading

**Pivot signal** : le changement de langage entre deux communications successives est le signal le plus fiable d'un virage de politique monetaire. La gradation typique :
- "some progress" → "significant progress" → "substantial progress" sur l'inflation
- "premature to declare victory" → "risks are balanced" → "we can begin to ease"

Chaque changement de vocabulaire est delibere et calibre — la Fed ne modifie jamais son langage par hasard.

**Frontloading** : quand la Fed demarre un cycle de baisse avec un cut de 50bp au lieu de 25bp, c'est un signal fort a double interpretation :
- Soit stimulation urgente face a une deterioration economique rapide
- Soit alarme economique sous-jacente que la Fed detecte avant le marche

Le marche doit alors trancher entre les deux lectures — ce qui genere une volatilite considerable.

**Mode "data-dependent"** : quand la Fed utilise cette expression, elle refuse de s'engager sur la direction. Consequence : le marche reagit a CHAQUE publication de statistique macro comme a une mini-decision de taux. NFP, CPI, PMI deviennent des catalyseurs de volatilite amplifiee.

**Minutes vs conference de presse** : la conference de presse donne le message officiel; les Minutes (publiees 3 semaines apres) revelent les dissidences internes et les debats — souvent plus informatifs que le discours public.
