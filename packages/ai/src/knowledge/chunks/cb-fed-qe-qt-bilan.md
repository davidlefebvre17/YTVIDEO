---
id: "cb-fed-qe-qt-bilan"
title: "Fed — QE, QT et bilan de la Fed"
source: "central-banks.md"
symbols: ["DX-Y.NYB", "^GSPC", "^IXIC", "^VIX", "TLT", "EURUSD=X"]
themes: ["banque-centrale", "fed", "qe-qt", "liquidite", "taux"]
conditions:
  flags: ["MACRO_SURPRISE", "POLITICAL_TRIGGER"]
  actors: ["fed", "powell"]
  regimes: ["risk-off", "risk-on"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: true
priority: "critical"
related_chunks: ["cb-fed-transmission", "cb-fed-money-supply", "cb-divergences-mecanismes"]
---

## Fed — QE, QT et bilan

**QE (Quantitative Easing)** : rachat massif d'obligations d'Etat → injection de liquidite → masse monetaire ↑ → indices ↑, dollar ↓, inflation future ↑. C'est l'arme non-conventionnelle quand les taux sont deja a zero.

**QT (Quantitative Tightening)** : reduction du bilan → liquidite ↓ → tech ↓, indices ↓, VIX ↑. Le QT est l'inverse silencieux du QE — moins mediatise mais tout aussi impactant.

**Correlation bilan / SP500** : quasi chirurgicale. Le SP500 a chute debut 2022 exactement quand le bilan Fed a commence a stagner puis diminuer. Visible sur TradingView : "United States Central Bank Balance Sheet".

**Regles d'interpretation** :
- Hausse du bilan = injection monetaire = dovish → indices ↑, dollar ↓
- Baisse du bilan = resserrement = hawkish → pression baissiere indices, dollar ↑

**Cas d'ecole — avril 2023** : faillites banques regionales US → bilan Fed explose en hausse (sauvetage d'urgence) alors que la BCE continuait son QT → divergence massive → EUR/USD explose a la hausse. Une fois le sauvetage termine, bilan repart en baisse → dollar reprend sa hausse.

**Point crucial** : le bilan n'est pas toujours correle aux taux. On peut avoir un bilan qui monte avec des taux qui restent eleves (ex: sauvetage bancaire 2023). C'est pourquoi il faut toujours contextualiser avec le bilan — si le marche parle des taux mais que le bilan raconte une autre histoire, le mentionner.
