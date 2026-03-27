---
id: "cot-signaux-cles"
title: "COT — Signaux cles a detecter"
source: "cot-positioning.md"
symbols: ["EURUSD=X", "GC=F", "CL=F", "^GSPC", "BTC-USD", "USDJPY=X"]
themes: ["cot-positioning", "volatilite", "mean-reversion"]
conditions:
  flags: ["COT_DIVERGENCE", "SENTIMENT_EXTREME"]
  actors: []
  regimes: []
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["cot-categories-traders", "cot-narration-rules", "cot-exemples"]
---

## COT — 5 signaux cles a detecter

### 1. Positionnement extreme (percentile >= 90 ou <= 10)
Les speculateurs sont massivement d'un cote → signal CONTRARIAN.
- **Extreme long** (P >= 90) : complaisance haussiere, precedant souvent des retournements.
- **Extreme short** (P <= 10) : pessimisme excessif, souvent suivi de rebonds.
- ATTENTION : un extreme peut durer des semaines. Ce n'est PAS un signal de timing, c'est un signal de ZONE DE RISQUE.

### 2. Flip de positionnement (changement de signe)
Les speculateurs passent de net long a net short (ou inversement) → signal FORT de conviction.
- Un flip confirme par le prix (meme direction) = signal fort.
- Un flip CONTRE le prix = divergence a surveiller de pres.

### 3. Changement net hebdomadaire important
Un changement brutal (> 20% de l'Open Interest) signale une conviction soudaine. C'est le "plus gros positionnement depuis X" — toujours contextualiser avec une reference temporelle.

### 4. Divergence COT vs prix
Le prix monte mais les speculateurs reduisent leurs longs (ou augmentent leurs shorts) → DIVERGENCE.
- Prix en hausse + positions en baisse = "la hausse manque de conviction institutionnelle."
- Prix en baisse + ajout de longs = "accumulation silencieuse."

### 5. Commercials vs Speculateurs (commodities)
Les commercials (producteurs) sont generalement en contrepartie des speculateurs.
- Commercials extremement short → ils hedgent a des prix hauts → probable sommet.
- Commercials reduisent massivement leurs shorts → ne couvrent plus = anticipent des prix plus bas.
