---
id: "asset-aud-nzd-commodity"
title: "AUD et NZD — Commodity currencies et proxy Chine"
source: "asset-profiles.md"
symbols: ["AUDUSD=X", "NZDUSD=X", "USDJPY=X", "HG=F"]
themes: ["carry-trade", "risk-on", "risk-off", "recession"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "MACRO_SURPRISE"]
  actors: []
  regimes: ["risk-on", "risk-off", "choc-exogene"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "high"
related_chunks: ["inter-carry-trade", "asset-copper-gas"]
---

## Dollar australien (AUD) et Dollar neo-zelandais (NZD)

### AUD (AUDUSD=X)
**Statut** : commodity currency, risk-on proxy, tres correle a la Chine.
**Drivers** : taux RBA, economie chinoise, prix des matieres premieres (minerai de fer, charbon).
**Sensibilite extreme** : le dollar australien est la devise majeure la plus sensible au sentiment de risque. En recession : AUD chute violemment (2008, 2020). En reprise : AUD rebondit fortement.
**Correlation Chine** : si la Chine va bien → AUD en hausse. Si la Chine va mal → AUD en baisse (l'Australie exporte massivement vers la Chine).
**Carry trade** : historiquement une des devises a taux eleve (carry currency). Le couple AUD/JPY est un barometre du risk-on/risk-off mondial.

### NZD (NZDUSD=X)
**Statut** : commodity currency, tres correle a l'AUD et au sentiment de risque.
**Specificite** : la RBNZ (banque centrale NZ) peut surprendre le marche avec des decisions dovish inattendues — creer des opportunites short NZD. Correlation forte avec l'AUD mais economie plus petite et plus volatile.

**Narration** : AUD et NZD sont des barometres du risk appetite mondial. AUD/JPY est la paire qui synthetise le mieux le risk-on (carry currency vs funding currency). Quand l'AUD monte et le JPY baisse, le marche est confiant.
