---
id: "cb-bce-fragmentation"
title: "BCE — Spreads peripheriques et risque de fragmentation"
source: "central-banks.md"
symbols: ["EURUSD=X", "^FCHI", "^GDAXI", "IDTL"]
themes: ["banque-centrale", "bce", "taux", "dette", "risk-off"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["lagarde", "bce"]
  regimes: ["risk-off", "choc-exogene"]
  vix_above: 25
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cb-bce-mandat-transmission", "cb-divergences-mecanismes"]
---

## BCE — Spreads peripheriques et risque de fragmentation

La fragmentation est le risque specifique a la zone euro : les ecarts de taux entre pays membres divergent, menacant la cohesion monetaire.

**Spread BTP-Bund (Italie-Allemagne)** — le barometre :
- **> 200bp** : stress significatif, le marche commence a questionner la soutenabilite de la dette italienne
- **> 250bp** : seuil critique, le TPI (Transmission Protection Instrument) devient activable par la BCE

**Le TPI** : cree en 2022, c'est l'outil anti-fragmentation de la BCE. Il permet d'acheter des obligations d'un pays specifique pour resserrer le spread. Sa simple existence agit comme un filet de securite — le marche sait que la BCE interviendra si les spreads deviennent trop larges.

**Mecanisme** : quand la BCE monte les taux, les pays a dette elevee (Italie, Grece, Espagne) souffrent plus que l'Allemagne car le cout de refinancement explose proportionnellement. La BCE doit donc equilibrer entre sa lutte contre l'inflation et le risque d'exploser la zone euro.

**Signal pour la narration** : un spread BTP-Bund en hausse rapide est un indicateur avance de stress europeen. Il precede souvent la baisse de l'euro et une rotation vers les actifs refuges (Bund allemand, dollar, or).
