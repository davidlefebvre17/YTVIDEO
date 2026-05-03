---
id: "macro-fed-decisions"
title: "FOMC, ECB et decisions de taux — Lecture et impact"
source: "macro-indicators.md"
symbols: ["^GSPC", "^IXIC", "DX-Y.NYB", "EURUSD=X", "TLT", "GC=F"]
themes: ["fed", "bce", "taux", "banque-centrale", "pivot"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["powell", "fed", "lagarde", "bce"]
  regimes: ["risk-on", "risk-off", "incertain"]
  vix_above: 0
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "critical"
related_chunks: ["macro-inflation-cpi", "macro-treasury-yields", "cb-fed-fedwatch"]
---

## FOMC / Decisions de taux — 8x par an

### Avant la decision
"Le marche price [X]% de probabilite de [hausse/baisse/maintien]" (source: CME FedWatch). Ne pas regarder que la prochaine reunion — les reunions a 3, 6, 9 mois sont souvent plus revelateurs.

### Apres la decision
Ce qui compte c'est le DOT PLOT et la conference de presse, pas juste le taux. Le marche peut reagir a l'INVERSE de la decision si le discours change les anticipations futures. Exemple : la Fed monte les taux mais le president (Warsh depuis mars 2025) dit "c'etait la derniere hausse" -> dollar CHUTE.

"La Fed maintient ses taux — mais le ton du president de la Fed est [plus/moins] hawkish qu'attendu."

## ECB — 8x par an

Impact direct sur EUR/USD et taux europeens. Comparer la divergence Fed/BCE : "Si la Fed baisse et la BCE non, ca soutient l'euro."

## CME FedWatch — Les probabilites du marche

Le marche price les decisions de la Fed des MOIS a l'avance via les futures sur les Fed Funds. Ces probabilites changent VITE apres chaque donnee economique. "Le marche price maintenant une premiere baisse de taux en [mois] a [X]% de probabilite — ca a change depuis [evenement]."
