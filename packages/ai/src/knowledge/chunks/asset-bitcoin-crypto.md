---
id: "asset-bitcoin-crypto"
title: "Bitcoin et Ethereum — Liquidite, cycles et adoption"
source: "asset-profiles.md"
symbols: ["BTC-USD", "ETH-USD", "SOL-USD", "^IXIC", "DX-Y.NYB"]
themes: ["liquidite", "m2", "risk-on", "momentum"]
conditions:
  flags: ["PRICE_MOVE", "EXTREME_MOVE", "ATH_PROXIMITY", "VOLUME_SPIKE", "NEWS_LINKED"]
  actors: ["trump"]
  regimes: ["risk-on", "risk-off", "choc-exogene"]
  vix_above: null
  any_symbol_move: true
  seasonality_months: []
always_if_symbol: true
always_if_theme: false
priority: "critical"
related_chunks: ["asset-sp500-profile", "asset-dollar-index"]
---

## Bitcoin (BTC-USD) et Ethereum (ETH-USD)

### Bitcoin
**Drivers principaux** : liquidite globale (M2), appetit pour le risque, adoption institutionnelle (ETF spot), cycle halving (~4 ans), reglementation crypto.
**Ce qui le fait monter** : liquidite en hausse, ETF inflows, adoption institutionnelle, dollar faible, halving supply shock.
**Ce qui le fait baisser** : hausse taux (liquidite aspiree), reglementation restrictive, hack/exploit majeur, contagion (type FTX).
**Correlation cle** : Nasdaq (positif ~0.6-0.8 en risk-on), DXY (inverse), liquidite globale (positif).
**Specificite** : marche 24/7, mouvements week-end possibles. BTC dominance en hausse = flight-to-quality intra-crypto.

### Ethereum
**Drivers principaux** : memes que BTC + activite DeFi/NFT, gas fees (demande reseau), ratio ETH/BTC (rotation intra-crypto), staking yields.
**Ratio ETH/BTC** : en hausse = risk-on crypto (altseason), en baisse = flight-to-BTC (prudence).

### Narration crypto
- Le Bitcoin est structurellement lie a la liquidite globale (M2) — quand les banques centrales injectent, BTC monte.
- Le cycle halving cree un choc d'offre previsible mais son timing d'impact sur les prix varie.
- Distinguer les mouvements ETF-driven (institutionnels) des mouvements retail (altcoins, memecoins).
- En risk-off severe, le BTC se comporte davantage comme un actif risque que comme un refuge.
