---
id: "inter-patterns-comportement"
title: "Patterns intermarchés et comportement de marché"
source: "intermarket.md"
symbols: ["^GSPC", "^IXIC", "^DJI", "^VIX", "GC=F", "TLT", "XLK", "XLE", "XLF", "HG=F"]
themes: ["momentum", "mean-reversion", "rotation-sectorielle", "earnings", "volatilite", "refuge", "liquidite", "narration"]
conditions:
  flags: ["SENTIMENT_EXTREME", "ATH_PROXIMITY", "VOLUME_SPIKE", "EARNINGS_SURPRISE", "EARNINGS_TODAY", "RSI_EXTREME"]
  actors: []
  regimes: ["risk-on", "risk-off", "rotation", "incertain"]
  vix_above: null
  any_symbol_move: false
  seasonality_months: []
always_if_symbol: false
always_if_theme: false
priority: "high"
related_chunks: ["inter-vix-peur", "inter-regimes-marche", "inter-chaines-transmission"]
---

## Patterns intermarchés et comportement de marché

### Le marché obligataire dirige

Les obligations anticipent les décisions de banques centrales de 2-3 mois. Les actions suivent. Flight to quality (panique) = rendements baissent brutalement. Toujours vérifier ce que le marché obligataire "dit" avant d'interpréter les actions.

### Rotations growth/value et taux

Taux en hausse -> rotation vers value (banques, énergie, industrie). Taux en baisse -> rotation vers growth (tech). Quand le Dow surperforme le Nasdaq, c'est le signal classique. Small caps (Russell 2000) s'activent quand la BC pivote vers l'assouplissement -- mais ces rallyes sont souvent éphémères.

### FOMO et boucles autorenforçantes

Achats -> prix monte -> plus de FOMO -> encore plus d'achats. Le cycle casse sur un catalyseur externe ou quand le marché arrête d'absorber les mauvaises nouvelles. Signal de fin : quand le marché baisse sur de BONNES nouvelles (inversion du "bad news is good news").

### Fatigue de momentum et ATH

Le vrai signal de fin de rallye n'est pas le nombre de jours de hausse mais la fatigue : volumes en baisse malgré prix montants, rétrécissement de la participation. Après un ATH, acheter produit souvent des rendements positifs à 12 mois. Mais ATH + volumes faibles = conviction faible. ATH + VIX durablement bas = complaisance, prochain choc amplifié.

### Earnings : whisper number et cascades

Le "whisper number" (ce que les insiders ont pricé) est souvent 3-8% au-dessus du consensus publié pour les valeurs momentum. Un leader sectoriel qui déçoit crée une cascade sur tout le secteur. Les guidances futures comptent plus que les résultats passés. Les 2 premières semaines de la saison donnent le ton.

### Cuivre : indicateur avancé

Le cuivre anticipe souvent un rebond industriel avant que les données PMI le confirment. Divergence cuivre/PMI = signal directionnel.

### Corrections : flash vs progressive

Corrections flash (spike VIX intraday) se réparent en 24-48h. Corrections progressives multi-jours sont plus dangereuses -- changement de régime possible. Les moyennes mobiles 50 et 200 jours testent et valident la tendance.
