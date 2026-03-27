---
id: "geo-tarifs-acteurs"
title: "Tarifs — Impact par acteur"
source: "geopolitics.md"
symbols: ["^GSPC", "^IXIC", "^GDAXI", "^FCHI", "^VIX", "DX-Y.NYB"]
themes: ["tarifs", "geopolitique"]
conditions:
  flags: ["POLITICAL_TRIGGER", "NEWS_CLUSTER"]
  actors: ["trump", "xi-jinping"]
  regimes: ["choc-exogene", "incertain"]
  vix_above: 0
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "medium"
related_chunks: ["geo-tarifs-chaine", "geo-tarifs-obligataire"]
---

## Tarifs — Narration selon l'acteur

| Acteur | Impact principal | Narration |
|--------|-----------------|-----------|
| US impose tarifs sur Chine | Tech US mitigé, luxe EU en baisse, yuan baisse | "Les tarifs sur la Chine, c'est un double tranchant — ça protège l'industrie US mais ça renchérit les composants" |
| US impose tarifs sur Europe | Automobiles EU, luxe, agriculture | "L'Europe dans le viseur — les exportateurs du CAC et du DAX sont en première ligne" |
| Chine riposte | Commodités, agriculture US, soja, Boeing | "Pékin riposte — et les secteurs US exposés à la Chine trinquent" |
| Tarifs généralisés (multi-pays) | Risk-off généralisée, VIX spike | "Quand tout le monde taxe tout le monde, personne ne gagne — le marché vote risk-off" |
| Administration US fait marche arrière | Rally soulagement, USD rebondit | "Désescalade commerciale — le marché respire, mais pour combien de temps ?" |

Le narrateur doit identifier l'acteur précis et l'impact sectoriel ciblé plutôt que de généraliser. Chaque configuration tarifaire a ses gagnants et ses perdants spécifiques.
