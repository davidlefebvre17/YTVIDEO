import type { EpisodeScript, AssetSnapshot, NewsItem } from '@yt-maker/core';

export const SAMPLE_SCRIPT: EpisodeScript = {
  "episodeNumber": 42,
  "date": "2026-03-12",
  "type": "daily_recap",
  "lang": "fr",
  "title": "Pétrole à 100$ : la Fed prise en étau, les marchés capitulent",
  "description": "Le Brent franchit les 100$/bbl sur l'escalade Iran, créant un dilemme stagflationniste pour la Fed. Risk-off généralisé, dollar refuge, or paradoxalement en baisse.",
  "sections": [
    {
      "id": "hook",
      "type": "hook",
      "title": "Cold Open",
      "narration": "Le Brent franchit les cent dollars. La Fed ne peut plus rien faire.",
      "durationSec": 6,
      "visualCues": [
        {
          "type": "flash",
          "asset": "BZ=F"
        },
        {
          "type": "show_level",
          "asset": "BZ=F",
          "level": "100.46"
        }
      ]
    },
    {
      "id": "title_card",
      "type": "title_card",
      "title": "TradingRecap",
      "narration": "",
      "durationSec": 4,
      "visualCues": []
    },
    {
      "id": "thread",
      "type": "thread",
      "title": "Fil conducteur",
      "narration": "Aujourd'hui, tout part du pétrole. L'escalade iranienne propulse le brut au-dessus d'un seuil que le marché n'avait pas revu depuis des mois — et c'est précisément ce choc énergétique qui paralyse la Fed, fait craquer les indices, envoie le dollar en mode refuge, et compresse l'or de manière contre-intuitive. On va dérouler toute la chaîne.",
      "durationSec": 22,
      "visualCues": [
        {
          "type": "direction_arrow",
          "asset": "CL=F",
          "direction": "up"
        },
        {
          "type": "sector_heatmap"
        }
      ]
    },
    {
      "id": "seg_1",
      "type": "segment",
      "title": "Pétrole à 100$ : le piège stagflationniste de la Fed",
      "narration": "Le WTI bondit de neuf virgule sept pour cent en une seule séance, à 95 dollars 73. Le Brent, lui, franchit les cent dollars — 100 dollars 46 exactement. Premier test de ce seuil psychologique depuis le pic à cinquante-deux semaines. La raison ? L'escalade militaire iranienne dans le Golfe. Les attaques sur les tankers activent une prime géopolitique sur toute la chaîne pétrolière — le détroit d'Ormuz, c'est vingt pour cent du brut mondial qui transite par là. Rien que la menace suffit à faire décoller les prix.\n\nEt c'est là que le vrai problème commence. La Fed se retrouve dans un piège stagflationniste classique. D'un côté, le pétrole au-dessus de cent dollars relance mécaniquement les anticipations d'inflation — le PCE core est directement sensible à l'énergie. Baisser les taux dans ce contexte, c'est jeter de l'huile sur le feu. De l'autre côté, la croissance vacille. Le S&P lâche un virgule cinq pour cent, RSI à 35, sous ses moyennes vingt et cinquante jours. Le support critique, c'est la SMA 200 à 6604 — si on y arrive, on entre dans un autre régime.\n\nLe dollar, lui, en profite. DXY à 99 virgule 74, plus zéro virgule cinq pour cent, qui confirme le flip long du COT il y a neuf jours. Les capitaux se réfugient dans le billet vert — et c'est précisément ce mouvement qui compresse l'or, on en reparlera. La courbe des taux raconte la même histoire de deux manières simultanées : le spread dix ans moins deux ans s'élargit à 51 points de base. Le marché price de l'inflation à court terme ET une récession à moyen terme. Les deux en même temps. C'est la signature d'un pricing stagflationniste.\n\nTechniquement, le WTI affiche un RSI à 73 avec un ATR ratio à deux virgule cinq fois la moyenne — momentum extrême, mais zone de résistance dense entre 96 et 100 dollars. Le DXY bute sur la résistance 99 virgule 86 puis le seuil rond des 100. Si le GDP préliminaire de demain sort faible, la Fed pourrait être perçue comme dovish par défaut — et le dollar reculerait. Si le chiffre surprend à la hausse, le DXY franchit les cent, et la compression sur tout le reste s'amplifie. Le Fear and Greed est à 15. Peur extrême. Mais attention — le COT sur le S&P reste en position extrême longue. Les institutionnels n'ont pas encore capitulé. Cette divergence entre le positionnement et le prix, c'est une tension qui devra se résoudre. Dans un sens ou dans l'autre.",
      "durationSec": 130,
      "visualCues": [
        {
          "type": "show_chart",
          "asset": "CL=F"
        },
        {
          "type": "show_level",
          "asset": "BZ=F",
          "level": "100.46"
        },
        {
          "type": "show_chart",
          "asset": "DX-Y.NYB"
        },
        {
          "type": "show_level",
          "asset": "^GSPC",
          "level": "6604"
        },
        {
          "type": "macro_stat",
          "asset": "T10Y2Y"
        }
      ],
      "depth": "deep",
      "topic": "oil-price-shock-fed-paralysis",
      "assets": [
        "CL=F",
        "BZ=F",
        "DX-Y.NYB",
        "^GSPC",
        "GC=F"
      ],
      "data": {
        "depth": "DEEP",
        "topic": "oil-price-shock-fed-paralysis",
        "predictions": [
          {
            "asset": "CL=F",
            "direction": "bullish",
            "confidence": "high",
            "reasoning": "Prime géopolitique active + disruption supply Ormuz + résistance technique 96-100$ comme prochaine zone de combat"
          },
          {
            "asset": "DX-Y.NYB",
            "direction": "bullish",
            "confidence": "high",
            "reasoning": "Flux refuge confirmés par COT flip + résistance 100 en test imminent + Fed paralysée"
          },
          {
            "asset": "^GSPC",
            "direction": "bearish",
            "confidence": "high",
            "reasoning": "RSI 35, sous SMA20/50, support SMA200 à 6604 en danger si GDP faible demain"
          }
        ]
      }
    },
    {
      "id": "seg_2",
      "type": "segment",
      "title": "L'Europe craque : le CAC passe sous sa SMA 200",
      "narration": "Le CAC 40 lâche zéro virgule sept pour cent à 7984 — et ce chiffre est trompeur. Ce qui compte, c'est qu'il vient de casser sous sa SMA 200 à 7992. Un signal structurel que les gérants institutionnels ne peuvent pas ignorer. Le STOXX 600 suit, moins zéro virgule six, le DAX aussi. Bear régime uniforme sur les trois indices européens majeurs.\n\nPourquoi l'Europe souffre plus ? Parce que la zone euro est importatrice nette de pétrole. Quand le Brent passe au-dessus de cent dollars, c'est de l'inflation importée directe — et ça compresse les marges industrielles d'un continent déjà fragile. La BCE se retrouve piégée : baisser les taux pour soutenir la croissance risquerait d'élargir les spreads souverains périphériques. L'euro-dollar en paie le prix — moins zéro virgule six pour cent à 1.1543, sous la SMA 200 à 1.1674, RSI à 33 en zone de survente. Si le DXY franchit les cent, l'euro pourrait aller tester 1.1504.",
      "durationSec": 60,
      "visualCues": [
        {
          "type": "show_chart",
          "asset": "^FCHI"
        },
        {
          "type": "show_level",
          "asset": "^FCHI",
          "level": "7992"
        },
        {
          "type": "highlight_asset",
          "asset": "EURUSD=X"
        }
      ],
      "depth": "focus",
      "topic": "european-equity-contagion-cac40-bund-tension",
      "assets": [
        "^FCHI",
        "^STOXX",
        "EURUSD=X"
      ],
      "data": {
        "depth": "FOCUS",
        "topic": "european-equity-contagion-cac40-bund-tension",
        "predictions": [
          {
            "asset": "^FCHI",
            "direction": "bearish",
            "confidence": "high",
            "reasoning": "Cassure SMA200 confirmée, support immédiat 7900 puis 7768"
          },
          {
            "asset": "EURUSD=X",
            "direction": "bearish",
            "confidence": "high",
            "reasoning": "RSI 33, sous SMA200, DXY en breakout potentiel"
          }
        ]
      }
    },
    {
      "id": "seg_3",
      "type": "segment",
      "title": "Pétrole vs cuivre : le marché se contredit",
      "narration": "Le pétrole flambe, mais le cuivre recule de zéro virgule quatre pour cent. Et ces deux signaux ne peuvent pas avoir raison en même temps. Le pétrole price la peur — la disruption d'offre au Moyen-Orient. Le cuivre, lui, price la réalité de la demande industrielle. Et cette réalité dit : ralentissement.\n\nL'ETF énergie XLE monte de zéro virgule neuf pour cent, proche de son plus haut annuel à 58 dollars 22. La rotation vers les producteurs est active. Le gaz naturel, lui, reste en compression — plus zéro virgule huit pour cent seulement, Bollinger width au septième percentile. Une bombe à retardement directionnelle. Le chiffre EIA Storage demain pourrait déclencher le mouvement.\n\nLe tipping point, c'est 105 à 110 dollars le baril. Au-delà, historiquement, la demande mondiale casse — en 2008, elle avait reculé de un virgule sept million de barils par jour. On n'y est pas encore. Mais on s'en rapproche.",
      "durationSec": 55,
      "visualCues": [
        {
          "type": "comparison",
          "asset": "CL=F",
          "versus": "HG=F"
        },
        {
          "type": "show_chart",
          "asset": "XLE"
        },
        {
          "type": "show_level",
          "asset": "CL=F",
          "level": "105"
        }
      ],
      "depth": "focus",
      "topic": "energy-complex-rally-vs-demand-destruction",
      "assets": [
        "CL=F",
        "HG=F",
        "XLE",
        "NG=F"
      ],
      "data": {
        "depth": "FOCUS",
        "topic": "energy-complex-rally-vs-demand-destruction",
        "predictions": [
          {
            "asset": "CL=F",
            "direction": "bullish",
            "confidence": "medium",
            "reasoning": "Prime géopolitique active mais plafond fondamental 105-110$ via destruction demande"
          },
          {
            "asset": "HG=F",
            "direction": "bearish",
            "confidence": "medium",
            "reasoning": "Divergence cuivre/pétrole signale contraction industrielle anticipée"
          }
        ]
      }
    },
    {
      "id": "seg_4",
      "type": "segment",
      "title": "Trump ouvre un deuxième front contre la Chine",
      "narration": "En pleine panique iranienne, Trump lance une sonde Section 301 contre la Chine — quelques semaines avant le sommet de Pékin. Calcul politique ou levier de négociation ? Les chimistes américains, eux, n'attendent pas la réponse : CF Industries bondit de treize pour cent, LyondellBasell de dix. Ils anticipent des exemptions tarifaires qui renforceraient leur avantage compétitif. Le problème, c'est que si cette sonde aboutit à des tarifs larges, c'est une couche inflationniste supplémentaire — et la Fed se retrouve encore plus coincée.",
      "durationSec": 30,
      "visualCues": [
        {
          "type": "flash",
          "asset": "^GSPC"
        },
        {
          "type": "highlight_asset",
          "asset": "DX-Y.NYB"
        }
      ],
      "depth": "flash",
      "topic": "trump-tariff-leverage-against-backdrop-crisis",
      "assets": [
        "^GSPC",
        "DX-Y.NYB"
      ],
      "data": {
        "depth": "FLASH",
        "topic": "trump-tariff-leverage-against-backdrop-crisis",
        "predictions": [
          {
            "asset": "^GSPC",
            "direction": "bearish",
            "confidence": "medium",
            "reasoning": "Tarifs cumulés au choc pétrolier amplifient la pression inflationniste et le risk-off"
          }
        ]
      }
    },
    {
      "id": "seg_5",
      "type": "segment",
      "title": "L'or baisse pendant une guerre — le paradoxe du dollar roi",
      "narration": "L'or recule d'un pour cent malgré l'escalade. Paradoxe apparent — mais la mécanique est limpide. Quand le dollar et l'or se disputent le statut de refuge, c'est le dollar qui gagne à court terme. L'or est pricé en dollars : billet vert en hausse, or nominal compressé. L'argent suit, moins zéro virgule cinq pour cent, écrasé par la double pression du dollar fort et de la demande industrielle fragile. Le pivot, c'est demain : si le GDP sort faible, le dollar recule — et l'or se libère mécaniquement vers les 5200.",
      "durationSec": 30,
      "visualCues": [
        {
          "type": "show_chart",
          "asset": "GC=F"
        },
        {
          "type": "direction_arrow",
          "asset": "DX-Y.NYB",
          "direction": "up"
        }
      ],
      "depth": "flash",
      "topic": "gold-volatility-and-rate-expectations-inversion",
      "assets": [
        "GC=F",
        "SI=F",
        "DX-Y.NYB"
      ],
      "data": {
        "depth": "FLASH",
        "topic": "gold-volatility-and-rate-expectations-inversion",
        "predictions": [
          {
            "asset": "GC=F",
            "direction": "bullish",
            "confidence": "medium",
            "reasoning": "Structure bull intacte au-dessus SMA20/50, compression temporaire par USD — libération si DXY recule demain"
          }
        ]
      }
    },
    {
      "id": "seg_6",
      "type": "segment",
      "title": "La crypto ignore la panique — pour combien de temps ?",
      "narration": "Bitcoin plus zéro virgule quatre pour cent à 70 204 dollars. Ethereum plus zéro virgule sept. Solana plus zéro virgule neuf. Le S&P perd un et demi pour cent et la crypto monte — découplage rare. Le catalyseur ? Le Sénat a voté un ban des CBDC, intégré dans un projet de loi bipartisan. Le marché crypto y lit un signal d'adoption institutionnelle. Mais la question reste : si le pétrole dépasse les 105 dollars et que la liquidité globale se comprime, le plancher des 70 000 dollars sur Bitcoin tiendra-t-il ?",
      "durationSec": 30,
      "visualCues": [
        {
          "type": "highlight_asset",
          "asset": "BTC-USD"
        },
        {
          "type": "flash",
          "asset": "SOL-USD"
        }
      ],
      "depth": "flash",
      "topic": "crypto-decoupling-from-geopolitics-brief-rally",
      "assets": [
        "BTC-USD",
        "ETH-USD",
        "SOL-USD"
      ],
      "data": {
        "depth": "FLASH",
        "topic": "crypto-decoupling-from-geopolitics-brief-rally",
        "predictions": [
          {
            "asset": "BTC-USD",
            "direction": "neutral",
            "confidence": "medium",
            "reasoning": "Découplage fragile — tient tant que liquidité macro ne se dégrade pas davantage, plancher 70K à risque si risk-off s'amplifie"
          }
        ]
      }
    },
    {
      "id": "closing",
      "type": "closing",
      "title": "Closing",
      "narration": "Tout ramène au même point : le pétrole au-dessus de cent dollars tient la Fed en otage, écrase l'Europe, compresse l'or, et seule la crypto semble encore jouer sa propre partition. Demain, treize heures trente, GDP préliminaire et Core PCE — c'est LE double release qui va trancher. Faible, et le dollar recule, l'or décolle, la Fed retrouve une marge de manœuvre. Fort, et la compression s'amplifie sur tout le spectre. D'après toi — le marché a-t-il déjà pricé le pire, ou est-ce que le vrai choc arrive demain ?",
      "durationSec": 28,
      "visualCues": [
        {
          "type": "macro_stat",
          "asset": "GDP"
        },
        {
          "type": "macro_stat",
          "asset": "PCE"
        }
      ]
    }
  ],
  "totalDurationSec": 463,
  "threadSummary": "L'escalade iranienne propulse le pétrole au-dessus de 100$/bbl, créant un piège stagflationniste pour la Fed qui ne peut ni couper ni monter les taux. Le dollar aspire les flux refuges, compressant l'or et l'euro. L'Europe craque sous l'inflation importée. Trump ajoute une couche tarifaire. Seule la crypto résiste — provisoirement. Tout se joue demain sur le GDP/PCE.",
  "segmentCount": 6,
  "coverageTopics": [
    "oil-price-shock-fed-paralysis",
    "european-equity-contagion-cac40-bund-tension",
    "energy-complex-rally-vs-demand-destruction",
    "trump-tariff-leverage-against-backdrop-crisis",
    "gold-volatility-and-rate-expectations-inversion",
    "crypto-decoupling-from-geopolitics-brief-rally"
  ],
  "direction": {
    "arc": [
      {
        "segmentId": "cold_open",
        "tensionLevel": 8,
        "role": "accroche"
      },
      {
        "segmentId": "thread",
        "tensionLevel": 5,
        "role": "setup"
      },
      {
        "segmentId": "seg_1",
        "tensionLevel": 7,
        "role": "montee"
      },
      {
        "segmentId": "seg_2",
        "tensionLevel": 9,
        "role": "pic"
      },
      {
        "segmentId": "seg_3",
        "tensionLevel": 8,
        "role": "pic"
      },
      {
        "segmentId": "seg_4",
        "tensionLevel": 6,
        "role": "respiration"
      },
      {
        "segmentId": "seg_5",
        "tensionLevel": 7,
        "role": "rebond"
      },
      {
        "segmentId": "seg_6",
        "tensionLevel": 5,
        "role": "respiration"
      },
      {
        "segmentId": "closing",
        "tensionLevel": 9,
        "role": "closing_memorabel"
      }
    ],
    "transitions": [
      {
        "fromSegmentId": "cold_open",
        "toSegmentId": "thread",
        "type": "fade",
        "durationMs": 600,
        "soundEffect": "sting",
        "vocalShift": "décompresser légèrement, ouvrir le débit"
      },
      {
        "fromSegmentId": "thread",
        "toSegmentId": "seg_1",
        "type": "cut",
        "durationMs": 300,
        "soundEffect": "swoosh",
        "vocalShift": "monter en intensité, attaquer le chiffre WTI directement"
      },
      {
        "fromSegmentId": "seg_1",
        "toSegmentId": "seg_2",
        "type": "fade",
        "durationMs": 700,
        "soundEffect": "none",
        "vocalShift": "ralentir légèrement, passer en mode analytique"
      },
      {
        "fromSegmentId": "seg_2",
        "toSegmentId": "seg_3",
        "type": "wipe",
        "durationMs": 500,
        "soundEffect": "silence",
        "vocalShift": "pause dramatique avant divergence cuivre/pétrole, ton interrogatif"
      },
      {
        "fromSegmentId": "seg_3",
        "toSegmentId": "seg_4",
        "type": "cut",
        "durationMs": 300,
        "soundEffect": "swoosh",
        "vocalShift": "couper net, accélérer — flash sectoriel, ton incisif"
      },
      {
        "fromSegmentId": "seg_4",
        "toSegmentId": "seg_5",
        "type": "slide",
        "durationMs": 400,
        "soundEffect": "none",
        "vocalShift": "enchaîner direct, même énergie flash"
      },
      {
        "fromSegmentId": "seg_5",
        "toSegmentId": "seg_6",
        "type": "slide",
        "durationMs": 400,
        "soundEffect": "none",
        "vocalShift": "rester dans le rythme flash, légèrement plus détendu"
      },
      {
        "fromSegmentId": "seg_6",
        "toSegmentId": "closing",
        "type": "zoom_out",
        "durationMs": 650,
        "soundEffect": "sting",
        "vocalShift": "prise de recul totale — ton sentencieux, martelé sur 'tout ramène au même point'"
      }
    ],
    "chartTimings": [
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "CL=F",
          "value": 95.73,
          "label": "WTI spot"
        },
        "showAtSec": 30,
        "hideAtSec": 60
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "BZ=F",
          "value": 100.46,
          "label": "Brent spot — franchissement 100$"
        },
        "showAtSec": 36,
        "hideAtSec": 75
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "CL=F",
          "value": 100,
          "label": "Seuil psychologique 100$"
        },
        "showAtSec": 36,
        "hideAtSec": 100
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "CL=F",
          "value": 119.48,
          "label": "Résistance High52w"
        },
        "showAtSec": 80,
        "hideAtSec": 115
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "CL=F",
          "value": 78.4,
          "label": "Pivot structurel pré-escalade"
        },
        "showAtSec": 88,
        "hideAtSec": 115
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "CL=F",
          "value": 95,
          "label": "Support round number"
        },
        "showAtSec": 55,
        "hideAtSec": 80
      },
      {
        "chartInstruction": {
          "type": "gauge_rsi",
          "asset": "CL=F",
          "value": 73,
          "label": "RSI surachat — risque consolidation"
        },
        "showAtSec": 100,
        "hideAtSec": 130
      },
      {
        "chartInstruction": {
          "type": "chart_comparaison",
          "asset": "CL=F",
          "assets": [
            "CL=F"
          ],
          "label": "J-1 consensus bearish",
          "label2": "J0 +9.72% — narratif inversé"
        },
        "showAtSec": 42,
        "hideAtSec": 70
      },
      {
        "chartInstruction": {
          "type": "causal_chain",
          "asset": "CL=F",
          "detail": "Escalade Iran → Risque Ormuz (-20% transit) → Prime géopolitique +15$ → WTI >100$ → CPI importé → Fed bloquée"
        },
        "showAtSec": 108,
        "hideAtSec": 158
      },
      {
        "chartInstruction": {
          "type": "scenario_fork",
          "asset": "CL=F",
          "value": 119,
          "value2": 85,
          "label": "Bull : High52w 119$ (escalade)",
          "label2": "Bear : 85$ (désescalade / SPR)"
        },
        "showAtSec": 140,
        "hideAtSec": 160
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "^GSPC",
          "value": 6672.62,
          "label": "S&P spot"
        },
        "showAtSec": 160,
        "hideAtSec": 185
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "^GSPC",
          "value": 6604,
          "label": "SMA200 — ligne de défense bull"
        },
        "showAtSec": 163,
        "hideAtSec": 200
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "^GSPC",
          "value": 6636,
          "label": "Support S1"
        },
        "showAtSec": 170,
        "hideAtSec": 200
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "^GSPC",
          "value": 6831,
          "label": "SMA20 — cap baissier"
        },
        "showAtSec": 178,
        "hideAtSec": 210
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "DX-Y.NYB",
          "value": 100,
          "label": "Résistance psychologique DXY"
        },
        "showAtSec": 185,
        "hideAtSec": 215
      },
      {
        "chartInstruction": {
          "type": "gauge_rsi",
          "asset": "^GSPC",
          "value": 35,
          "label": "RSI approche survente"
        },
        "showAtSec": 193,
        "hideAtSec": 218
      },
      {
        "chartInstruction": {
          "type": "yield_curve",
          "asset": "DX-Y.NYB",
          "value": 0.57,
          "label": "Spread 2Y-10Y +57bp — courbe pentifiante"
        },
        "showAtSec": 198,
        "hideAtSec": 218
      },
      {
        "chartInstruction": {
          "type": "causal_chain",
          "asset": "^GSPC",
          "detail": "Trump (Iran+Tariffs) → Pétrole 100$ + Tarifs → Double inflation → Fed bloquée → Taux hauts → Multiple PE compressé → Selloff S&P"
        },
        "showAtSec": 203,
        "hideAtSec": 218
      },
      {
        "chartInstruction": {
          "type": "countdown_event",
          "asset": "^GSPC",
          "label": "PCE Core demain 13:30 — catalyst pivot Fed"
        },
        "showAtSec": 210,
        "hideAtSec": 220
      },
      {
        "chartInstruction": {
          "type": "scenario_fork",
          "asset": "^GSPC",
          "value": 6800,
          "value2": 6500,
          "label": "Bull : PCE in-line → rebond 6800",
          "label2": "Bear : PCE chaud → cassure SMA200 → 6500"
        },
        "showAtSec": 213,
        "hideAtSec": 220
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "^VIX",
          "value": 27.29,
          "label": "VIX spot — zone peur"
        },
        "showAtSec": 220,
        "hideAtSec": 250
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "GC=F",
          "value": 5115.8,
          "label": "Or spot"
        },
        "showAtSec": 225,
        "hideAtSec": 270
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "^VIX",
          "value": 35,
          "label": "VIX — zone panique suivante"
        },
        "showAtSec": 235,
        "hideAtSec": 265
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "GC=F",
          "value": 5100,
          "label": "Support critique or"
        },
        "showAtSec": 233,
        "hideAtSec": 270
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "GC=F",
          "value": 4847.8,
          "label": "Support S2 or"
        },
        "showAtSec": 248,
        "hideAtSec": 270
      },
      {
        "chartInstruction": {
          "type": "chart_split",
          "asset": "^VIX",
          "assets": [
            "^VIX",
            "GC=F"
          ],
          "label": "VIX +12.6%",
          "label2": "Or -1% — divergence refuge"
        },
        "showAtSec": 238,
        "hideAtSec": 270
      },
      {
        "chartInstruction": {
          "type": "gauge_rsi",
          "asset": "^VIX",
          "value": 62,
          "label": "RSI VIX — momentum haussier"
        },
        "showAtSec": 243,
        "hideAtSec": 265
      },
      {
        "chartInstruction": {
          "type": "causal_chain",
          "asset": "GC=F",
          "detail": "Iran → VIX spike → DXY bid → Or compressé mécaniquement (USD > Gold) → Argent pénalisé (composante industrielle)"
        },
        "showAtSec": 253,
        "hideAtSec": 275
      },
      {
        "chartInstruction": {
          "type": "stat_callout",
          "asset": "^VIX",
          "value": 27.29,
          "label": "VIX au-dessus de 25 : stress confirmé"
        },
        "showAtSec": 222,
        "hideAtSec": 240
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "XLE",
          "value": 57.51,
          "label": "XLE spot +0.93%"
        },
        "showAtSec": 275,
        "hideAtSec": 298
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "XLK",
          "value": 137.84,
          "label": "XLK spot -1.84%"
        },
        "showAtSec": 275,
        "hideAtSec": 298
      },
      {
        "chartInstruction": {
          "type": "chart_comparaison",
          "asset": "XLE",
          "assets": [
            "XLE",
            "XLK"
          ],
          "label": "XLE +0.93%",
          "label2": "XLK -1.84% — rotation asymétrique"
        },
        "showAtSec": 277,
        "hideAtSec": 298
      },
      {
        "chartInstruction": {
          "type": "heatmap_sectorielle",
          "asset": "XLE",
          "label": "XLE/XLK/XLF — rotation sectorielle choc pétrolier"
        },
        "showAtSec": 280,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "XLE",
          "value": 58.22,
          "label": "High52w XLE — résistance ATF"
        },
        "showAtSec": 283,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "XLK",
          "value": 134.99,
          "label": "Support critique XLK"
        },
        "showAtSec": 286,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "gauge_rsi",
          "asset": "XLF",
          "value": 29,
          "label": "RSI XLF — survente extrême"
        },
        "showAtSec": 289,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "gauge_rsi",
          "asset": "XLE",
          "value": 69,
          "label": "RSI XLE — approche surachat"
        },
        "showAtSec": 289,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "annotation",
          "asset": "XLK",
          "value": 137.84,
          "label": "EMA_BREAK + volume +62% — distribution institutionnelle"
        },
        "showAtSec": 293,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "XLF",
          "value": 48.79,
          "label": "Support XLF — défense survente"
        },
        "showAtSec": 291,
        "hideAtSec": 305
      },
      {
        "chartInstruction": {
          "type": "stat_callout",
          "asset": "CF",
          "value": 13.21,
          "label": "CF Industries +13.21% — signal stagflation durable"
        },
        "showAtSec": 305,
        "hideAtSec": 330
      },
      {
        "chartInstruction": {
          "type": "annotation",
          "asset": "CF",
          "value": 13.21,
          "label": "Volume spike — couverture short + momentum institutionnel"
        },
        "showAtSec": 308,
        "hideAtSec": 330
      },
      {
        "chartInstruction": {
          "type": "multi_badge",
          "asset": "CF",
          "assets": [
            "CF",
            "ZAL.DE",
            "LYB"
          ],
          "label": "CF +13.21% / ZAL.DE +9.50% / LYB +10.33%"
        },
        "showAtSec": 312,
        "hideAtSec": 330
      },
      {
        "chartInstruction": {
          "type": "causal_chain",
          "asset": "CF",
          "detail": "Pétrole +9.7% → Gaz cher anticipé → Coûts engrais → Pricing-power CF → Inflation alimentaire +3-6 mois"
        },
        "showAtSec": 318,
        "hideAtSec": 333
      },
      {
        "chartInstruction": {
          "type": "countdown_event",
          "asset": "CF",
          "label": "Natural Gas Storage demain 13:30 — catalyst direct CF"
        },
        "showAtSec": 328,
        "hideAtSec": 335
      },
      {
        "chartInstruction": {
          "type": "price_line",
          "asset": "GBPUSD=X",
          "value": 1.3382,
          "label": "GBP/USD spot -0.28%"
        },
        "showAtSec": 335,
        "hideAtSec": 358
      },
      {
        "chartInstruction": {
          "type": "support_line",
          "asset": "GBPUSD=X",
          "value": 1.33,
          "label": "Support psychologique"
        },
        "showAtSec": 338,
        "hideAtSec": 360
      },
      {
        "chartInstruction": {
          "type": "resistance_line",
          "asset": "GBPUSD=X",
          "value": 1.345,
          "label": "Résistance — target short squeeze"
        },
        "showAtSec": 342,
        "hideAtSec": 360
      },
      {
        "chartInstruction": {
          "type": "causal_chain",
          "asset": "GBPUSD=X",
          "detail": "Pétrole +9.7% → Inflation importée UK → BOE dilemme (hawkish = short squeeze / dovish = test 1.33$)"
        },
        "showAtSec": 347,
        "hideAtSec": 362
      },
      {
        "chartInstruction": {
          "type": "scenario_fork",
          "asset": "GBPUSD=X",
          "value": 1.35,
          "value2": 1.325,
          "label": "Bull : Bailey hawkish → 1.35$",
          "label2": "Bear : Bailey dovish → 1.3250$"
        },
        "showAtSec": 353,
        "hideAtSec": 363
      },
      {
        "chartInstruction": {
          "type": "annotation",
          "asset": "GBPUSD=X",
          "value": 1.3382,
          "label": "COT extreme_short (J-9) — risque short squeeze si surprise hawkish"
        },
        "showAtSec": 356,
        "hideAtSec": 365
      },
      {
        "chartInstruction": {
          "type": "countdown_event",
          "asset": "GBPUSD=X",
          "label": "BOE Bailey 08:30 + GDP UK demain 06:00"
        },
        "showAtSec": 358,
        "hideAtSec": 365
      }
    ],
    "moodMusic": "tension_geopolitique",
    "thumbnailMoment": {
      "segmentId": "seg_1",
      "reason": "Le Brent qui franchit 100$ est le chiffre-choc de l'épisode — seuil psychologique non revu depuis des mois, visible en une fraction de seconde sur une thumbnail, directement lisible sans contexte. C'est le déclencheur causal de tout l'arc.",
      "keyFigure": "100,46$",
      "emotionalTone": "choc"
    }
  }
} as EpisodeScript;

export const SAMPLE_ASSETS: AssetSnapshot[] = [
  {
    "symbol": "^GSPC",
    "name": "S&P 500",
    "price": 6672.6201171875,
    "change": -103.1796875,
    "changePct": -1.5227676506708516,
    "candles": [],
    "high24h": 6740.8798828125,
    "low24h": 6670.39990234375,
    "dailyCandles": [
      {
        "t": 1770993000,
        "date": "2026-02-13T14:30:00.000Z",
        "o": 6834.27001953125,
        "h": 6881.9599609375,
        "l": 6794.5498046875,
        "c": 6836.169921875,
        "v": 5718360000
      },
      {
        "t": 1771338600,
        "date": "2026-02-17T14:30:00.000Z",
        "o": 6819.85986328125,
        "h": 6866.990234375,
        "l": 6775.5,
        "c": 6843.22021484375,
        "v": 5418480000
      },
      {
        "t": 1771425000,
        "date": "2026-02-18T14:30:00.000Z",
        "o": 6855.47998046875,
        "h": 6909.1201171875,
        "l": 6849.66015625,
        "c": 6881.31005859375,
        "v": 5098160000
      },
      {
        "t": 1771511400,
        "date": "2026-02-19T14:30:00.000Z",
        "o": 6861.33984375,
        "h": 6879.1201171875,
        "l": 6833.06005859375,
        "c": 6861.89013671875,
        "v": 5151690000
      },
      {
        "t": 1771597800,
        "date": "2026-02-20T14:30:00.000Z",
        "o": 6843.259765625,
        "h": 6915.85986328125,
        "l": 6836.330078125,
        "c": 6909.509765625,
        "v": 5432480000
      },
      {
        "t": 1771857000,
        "date": "2026-02-23T14:30:00.000Z",
        "o": 6901.25,
        "h": 6916.9599609375,
        "l": 6819.81982421875,
        "c": 6837.75,
        "v": 5638350000
      },
      {
        "t": 1771943400,
        "date": "2026-02-24T14:30:00.000Z",
        "o": 6837.3701171875,
        "h": 6899.169921875,
        "l": 6815.43017578125,
        "c": 6890.06982421875,
        "v": 5266090000
      },
      {
        "t": 1772029800,
        "date": "2026-02-25T14:30:00.000Z",
        "o": 6915.14990234375,
        "h": 6952.509765625,
        "l": 6915.14990234375,
        "c": 6946.1298828125,
        "v": 5328060000
      },
      {
        "t": 1772116200,
        "date": "2026-02-26T14:30:00.000Z",
        "o": 6944.740234375,
        "h": 6947.25,
        "l": 6859.72998046875,
        "c": 6908.85986328125,
        "v": 5889550000
      },
      {
        "t": 1772202600,
        "date": "2026-02-27T14:30:00.000Z",
        "o": 6856.5400390625,
        "h": 6882.9599609375,
        "l": 6831.740234375,
        "c": 6878.8798828125,
        "v": 6665660000
      },
      {
        "t": 1772461800,
        "date": "2026-03-02T14:30:00.000Z",
        "o": 6824.35986328125,
        "h": 6901.009765625,
        "l": 6796.85009765625,
        "c": 6881.6201171875,
        "v": 6079080000
      },
      {
        "t": 1772548200,
        "date": "2026-03-03T14:30:00.000Z",
        "o": 6800.259765625,
        "h": 6840.0498046875,
        "l": 6710.419921875,
        "c": 6816.6298828125,
        "v": 6442080000
      },
      {
        "t": 1772634600,
        "date": "2026-03-04T14:30:00.000Z",
        "o": 6831.68994140625,
        "h": 6885.93994140625,
        "l": 6811.64013671875,
        "c": 6869.5,
        "v": 5252170000
      },
      {
        "t": 1772721000,
        "date": "2026-03-05T14:30:00.000Z",
        "o": 6851.080078125,
        "h": 6870.43017578125,
        "l": 6770.77978515625,
        "c": 6830.7099609375,
        "v": 5989300000
      },
      {
        "t": 1772807400,
        "date": "2026-03-06T14:30:00.000Z",
        "o": 6769.02978515625,
        "h": 6773.419921875,
        "l": 6711.56005859375,
        "c": 6740.02001953125,
        "v": 5793120000
      },
      {
        "t": 1773063000,
        "date": "2026-03-09T13:30:00.000Z",
        "o": 6699.7998046875,
        "h": 6810.43994140625,
        "l": 6636.0400390625,
        "c": 6795.990234375,
        "v": 6709410000
      },
      {
        "t": 1773149400,
        "date": "2026-03-10T13:30:00.000Z",
        "o": 6796.56005859375,
        "h": 6845.080078125,
        "l": 6759.740234375,
        "c": 6781.47998046875,
        "v": 5944950000
      },
      {
        "t": 1773235800,
        "date": "2026-03-11T13:30:00.000Z",
        "o": 6790.08984375,
        "h": 6811.14990234375,
        "l": 6745.58984375,
        "c": 6775.7998046875,
        "v": 5511090000
      },
      {
        "t": 1773322200,
        "date": "2026-03-12T13:30:00.000Z",
        "o": 6740.8798828125,
        "h": 6740.8798828125,
        "l": 6670.39990234375,
        "c": 6672.6201171875,
        "v": 6292170000
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -4.707890545413188,
        "distanceFromATL": 235.02469961251774,
        "majorSupport": 4835.0400390625,
        "majorResistance": 7002.27978515625,
        "ema52w": 6418.649385892428
      },
      "daily3y": {
        "trend": "range",
        "sma200": 6604.263835449219,
        "sma50": 6884.94498046875,
        "rsi14": 35.44395500446987,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 7002.27978515625,
        "low52w": 4835.0400390625,
        "volatility20d": 11.25582328017292,
        "volumeVsAvg": 0.6181585710194482,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 6831.538989257812,
      "sma50": 6884.94498046875,
      "rsi14": 35.44395500446987,
      "trend": "bearish",
      "volumeAnomaly": 0.5989766054945671,
      "supports": [
        6636.0400390625,
        6600
      ],
      "resistances": [
        6700,
        6952.509765625
      ],
      "high20d": 6952.509765625,
      "low20d": 6636.0400390625,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 8.766256163001689
    }
  },
  {
    "symbol": "^IXIC",
    "name": "Nasdaq Composite",
    "price": 22311.98046875,
    "change": -404.150390625,
    "changePct": -1.7791339252573737,
    "candles": [],
    "high24h": 22550.75,
    "low24h": 22290.48046875,
    "dailyCandles": [
      {
        "t": 1770993000,
        "date": "2026-02-13T14:30:00.000Z",
        "o": 22561.4609375,
        "h": 22742.060546875,
        "l": 22402.380859375,
        "c": 22546.669921875,
        "v": 7964830000
      },
      {
        "t": 1771338600,
        "date": "2026-02-17T14:30:00.000Z",
        "o": 22394.759765625,
        "h": 22690.830078125,
        "l": 22256.759765625,
        "c": 22578.380859375,
        "v": 7654300000
      },
      {
        "t": 1771425000,
        "date": "2026-02-18T14:30:00.000Z",
        "o": 22629.849609375,
        "h": 22895.9609375,
        "l": 22597.76953125,
        "c": 22753.630859375,
        "v": 7705590000
      },
      {
        "t": 1771511400,
        "date": "2026-02-19T14:30:00.000Z",
        "o": 22639.880859375,
        "h": 22768.830078125,
        "l": 22583.609375,
        "c": 22682.73046875,
        "v": 6984780000
      },
      {
        "t": 1771597800,
        "date": "2026-02-20T14:30:00.000Z",
        "o": 22542.279296875,
        "h": 22948.869140625,
        "l": 22539.05078125,
        "c": 22886.0703125,
        "v": 8063070000
      },
      {
        "t": 1771857000,
        "date": "2026-02-23T14:30:00.000Z",
        "o": 22840.970703125,
        "h": 22893.220703125,
        "l": 22547.119140625,
        "c": 22627.26953125,
        "v": 8263920000
      },
      {
        "t": 1771943400,
        "date": "2026-02-24T14:30:00.000Z",
        "o": 22641.599609375,
        "h": 22895.48046875,
        "l": 22528.259765625,
        "c": 22863.6796875,
        "v": 7932270000
      },
      {
        "t": 1772029800,
        "date": "2026-02-25T14:30:00.000Z",
        "o": 23005.009765625,
        "h": 23169.6796875,
        "l": 23004.689453125,
        "c": 23152.080078125,
        "v": 8427450000
      },
      {
        "t": 1772116200,
        "date": "2026-02-26T14:30:00.000Z",
        "o": 23100.580078125,
        "h": 23109.4609375,
        "l": 22670.80078125,
        "c": 22878.380859375,
        "v": 9033470000
      },
      {
        "t": 1772202600,
        "date": "2026-02-27T14:30:00.000Z",
        "o": 22615.4296875,
        "h": 22735.779296875,
        "l": 22538.30078125,
        "c": 22668.2109375,
        "v": 9552610000
      },
      {
        "t": 1772461800,
        "date": "2026-03-02T14:30:00.000Z",
        "o": 22322.119140625,
        "h": 22802.80078125,
        "l": 22306.080078125,
        "c": 22748.859375,
        "v": 8303030000
      },
      {
        "t": 1772548200,
        "date": "2026-03-03T14:30:00.000Z",
        "o": 22292.369140625,
        "h": 22601.58984375,
        "l": 22124.779296875,
        "c": 22516.689453125,
        "v": 9705500000
      },
      {
        "t": 1772634600,
        "date": "2026-03-04T14:30:00.000Z",
        "o": 22620.890625,
        "h": 22891.880859375,
        "l": 22570.669921875,
        "c": 22807.48046875,
        "v": 10918410000
      },
      {
        "t": 1772721000,
        "date": "2026-03-05T14:30:00.000Z",
        "o": 22707.470703125,
        "h": 22877.01953125,
        "l": 22500.2890625,
        "c": 22748.990234375,
        "v": 10994660000
      },
      {
        "t": 1772807400,
        "date": "2026-03-06T14:30:00.000Z",
        "o": 22421.169921875,
        "h": 22614.41015625,
        "l": 22328.130859375,
        "c": 22387.6796875,
        "v": 9300220000
      },
      {
        "t": 1773063000,
        "date": "2026-03-09T13:30:00.000Z",
        "o": 22184.05078125,
        "h": 22741.029296875,
        "l": 22061.970703125,
        "c": 22695.94921875,
        "v": 9797740000
      },
      {
        "t": 1773149400,
        "date": "2026-03-10T13:30:00.000Z",
        "o": 22722.939453125,
        "h": 22906.720703125,
        "l": 22608.23046875,
        "c": 22697.099609375,
        "v": 8800580000
      },
      {
        "t": 1773235800,
        "date": "2026-03-11T13:30:00.000Z",
        "o": 22771.26953125,
        "h": 22877.7109375,
        "l": 22602.330078125,
        "c": 22716.130859375,
        "v": 8348570000
      },
      {
        "t": 1773322200,
        "date": "2026-03-12T13:30:00.000Z",
        "o": 22526.58984375,
        "h": 22550.75,
        "l": 22290.48046875,
        "c": 22311.98046875,
        "v": 8490850000
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -7.110784596326221,
        "distanceFromATL": 387.7735250314259,
        "majorSupport": 14784.0302734375,
        "majorResistance": 24019.990234375,
        "ema52w": 21328.76472355769
      },
      "daily3y": {
        "trend": "range",
        "sma200": 22160.8595703125,
        "sma50": 23113.4384375,
        "rsi14": 40.391101060163344,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 24019.990234375,
        "low52w": 14784.0302734375,
        "volatility20d": 16.608426849533224,
        "volumeVsAvg": 0.9698445103101055,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 22693.2556640625,
      "sma50": 23113.4384375,
      "rsi14": 40.391101060163344,
      "trend": "bearish",
      "volumeAnomaly": 0.9619544867738834,
      "supports": [
        22061.970703125,
        22000
      ],
      "resistances": [
        23169.6796875
      ],
      "high20d": 23169.6796875,
      "low20d": 22061.970703125,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 12.261310749319888
    }
  },
  {
    "symbol": "^DJI",
    "name": "Dow Jones",
    "price": 46677.8515625,
    "change": -739.41796875,
    "changePct": -1.5593853801781903,
    "candles": [],
    "high24h": 47242.51953125,
    "low24h": 46662.23046875,
    "dailyCandles": [
      {
        "t": 1770993000,
        "date": "2026-02-13T14:30:00.000Z",
        "o": 49439.578125,
        "h": 49743.98046875,
        "l": 49084.3515625,
        "c": 49500.9296875,
        "v": 597100000
      },
      {
        "t": 1771338600,
        "date": "2026-02-17T14:30:00.000Z",
        "o": 49525.37109375,
        "h": 49732.37109375,
        "l": 49169.83984375,
        "c": 49533.19140625,
        "v": 558570000
      },
      {
        "t": 1771425000,
        "date": "2026-02-18T14:30:00.000Z",
        "o": 49571.921875,
        "h": 49897.30859375,
        "l": 49469.05859375,
        "c": 49662.66015625,
        "v": 493390000
      },
      {
        "t": 1771511400,
        "date": "2026-02-19T14:30:00.000Z",
        "o": 49576.21875,
        "h": 49606.171875,
        "l": 49197.53125,
        "c": 49395.16015625,
        "v": 439980000
      },
      {
        "t": 1771597800,
        "date": "2026-02-20T14:30:00.000Z",
        "o": 49323,
        "h": 49712.55859375,
        "l": 49158.28125,
        "c": 49625.96875,
        "v": 574810000
      },
      {
        "t": 1771857000,
        "date": "2026-02-23T14:30:00.000Z",
        "o": 49536.5390625,
        "h": 49695.609375,
        "l": 48731.4609375,
        "c": 48804.05859375,
        "v": 574610000
      },
      {
        "t": 1771943400,
        "date": "2026-02-24T14:30:00.000Z",
        "o": 48827.80078125,
        "h": 49295.2109375,
        "l": 48752.73828125,
        "c": 49174.5,
        "v": 524270000
      },
      {
        "t": 1772029800,
        "date": "2026-02-25T14:30:00.000Z",
        "o": 49357.62890625,
        "h": 49517.359375,
        "l": 49206.87109375,
        "c": 49482.1484375,
        "v": 541620000
      },
      {
        "t": 1772116200,
        "date": "2026-02-26T14:30:00.000Z",
        "o": 49544.578125,
        "h": 49815.21875,
        "l": 49237.37890625,
        "c": 49499.19921875,
        "v": 684630000
      },
      {
        "t": 1772202600,
        "date": "2026-02-27T14:30:00.000Z",
        "o": 49253.5703125,
        "h": 49253.5703125,
        "l": 48678.78125,
        "c": 48977.921875,
        "v": 811800000
      },
      {
        "t": 1772461800,
        "date": "2026-03-02T14:30:00.000Z",
        "o": 48794.421875,
        "h": 49064.671875,
        "l": 48377.9609375,
        "c": 48904.78125,
        "v": 552340000
      },
      {
        "t": 1772548200,
        "date": "2026-03-03T14:30:00.000Z",
        "o": 48493.109375,
        "h": 48695.359375,
        "l": 47626.8515625,
        "c": 48501.26953125,
        "v": 533540000
      },
      {
        "t": 1772634600,
        "date": "2026-03-04T14:30:00.000Z",
        "o": 48589.76953125,
        "h": 48854.05078125,
        "l": 48354.37109375,
        "c": 48739.41015625,
        "v": 511380000
      },
      {
        "t": 1772721000,
        "date": "2026-03-05T14:30:00.000Z",
        "o": 48526.73046875,
        "h": 48526.73046875,
        "l": 47577.109375,
        "c": 47954.73828125,
        "v": 625110000
      },
      {
        "t": 1772807400,
        "date": "2026-03-06T14:30:00.000Z",
        "o": 47634.55078125,
        "h": 47634.55078125,
        "l": 47009.01171875,
        "c": 47501.55078125,
        "v": 541850000
      },
      {
        "t": 1773063000,
        "date": "2026-03-09T13:30:00.000Z",
        "o": 47371.28125,
        "h": 47876.05859375,
        "l": 46615.51953125,
        "c": 47740.80078125,
        "v": 560020000
      },
      {
        "t": 1773149400,
        "date": "2026-03-10T13:30:00.000Z",
        "o": 47771.4296875,
        "h": 48220.5390625,
        "l": 47444.23046875,
        "c": 47706.51171875,
        "v": 490360000
      },
      {
        "t": 1773235800,
        "date": "2026-03-11T13:30:00.000Z",
        "o": 47690.76171875,
        "h": 47711.26171875,
        "l": 47185.890625,
        "c": 47417.26953125,
        "v": 419500000
      },
      {
        "t": 1773322200,
        "date": "2026-03-12T13:30:00.000Z",
        "o": 47242.51953125,
        "h": 47242.51953125,
        "l": 46662.23046875,
        "c": 46677.8515625,
        "v": 535900000
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -7.592012975674322,
        "distanceFromATL": 173.5605257009921,
        "majorSupport": 36611.78125,
        "majorResistance": 50512.7890625,
        "ema52w": 45470.112830528844
      },
      "daily3y": {
        "trend": "range",
        "sma200": 46439.9949609375,
        "sma50": 49021.349453125,
        "rsi14": 28.716580424844793,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "bear",
        "high52w": 50512.7890625,
        "low52w": 36611.78125,
        "volatility20d": 12.399349002743975,
        "volumeVsAvg": 0.9454734071269535,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 48712.5951171875,
      "sma50": 49021.349453125,
      "rsi14": 28.716580424844793,
      "trend": "bearish",
      "volumeAnomaly": 0.9426892766676048,
      "supports": [
        46615.51953125,
        46000
      ],
      "resistances": [
        47000,
        50447.01171875
      ],
      "high20d": 50447.01171875,
      "low20d": 46615.51953125,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 15.56353469386978
    }
  },
  {
    "symbol": "^VIX",
    "name": "VIX",
    "price": 27.290000915527344,
    "change": 3.0600013732910156,
    "changePct": 12.628978254650805,
    "candles": [],
    "high24h": 27.329999923706055,
    "low24h": 24.600000381469727,
    "dailyCandles": [
      {
        "t": 1770993000,
        "date": "2026-02-13T14:30:00.000Z",
        "o": 21.479999542236328,
        "h": 22.399999618530273,
        "l": 18.920000076293945,
        "c": 20.600000381469727,
        "v": 0
      },
      {
        "t": 1771338600,
        "date": "2026-02-17T14:30:00.000Z",
        "o": 21.739999771118164,
        "h": 22.959999084472656,
        "l": 19.760000228881836,
        "c": 20.290000915527344,
        "v": 0
      },
      {
        "t": 1771425000,
        "date": "2026-02-18T14:30:00.000Z",
        "o": 19.780000686645508,
        "h": 20.34000015258789,
        "l": 18.479999542236328,
        "c": 19.6200008392334,
        "v": 0
      },
      {
        "t": 1771511400,
        "date": "2026-02-19T14:30:00.000Z",
        "o": 19.34000015258789,
        "h": 21.110000610351562,
        "l": 19.229999542236328,
        "c": 20.229999542236328,
        "v": 0
      },
      {
        "t": 1771597800,
        "date": "2026-02-20T14:30:00.000Z",
        "o": 20.040000915527344,
        "h": 21.209999084472656,
        "l": 18.760000228881836,
        "c": 19.09000015258789,
        "v": 0
      },
      {
        "t": 1771857000,
        "date": "2026-02-23T14:30:00.000Z",
        "o": 20.489999771118164,
        "h": 22.040000915527344,
        "l": 19.5,
        "c": 21.010000228881836,
        "v": 0
      },
      {
        "t": 1771943400,
        "date": "2026-02-24T14:30:00.000Z",
        "o": 21.239999771118164,
        "h": 22.079999923706055,
        "l": 19.229999542236328,
        "c": 19.549999237060547,
        "v": 0
      },
      {
        "t": 1772029800,
        "date": "2026-02-25T14:30:00.000Z",
        "o": 19.59000015258789,
        "h": 19.6200008392334,
        "l": 17.860000610351562,
        "c": 17.93000030517578,
        "v": 0
      },
      {
        "t": 1772116200,
        "date": "2026-02-26T14:30:00.000Z",
        "o": 18.06999969482422,
        "h": 20.540000915527344,
        "l": 17.5,
        "c": 18.6299991607666,
        "v": 0
      },
      {
        "t": 1772202600,
        "date": "2026-02-27T14:30:00.000Z",
        "o": 19.280000686645508,
        "h": 21.739999771118164,
        "l": 18.770000457763672,
        "c": 19.860000610351562,
        "v": 0
      },
      {
        "t": 1772461800,
        "date": "2026-03-02T14:30:00.000Z",
        "o": 24.65999984741211,
        "h": 25.239999771118164,
        "l": 20.3700008392334,
        "c": 21.440000534057617,
        "v": 0
      },
      {
        "t": 1772548200,
        "date": "2026-03-03T14:30:00.000Z",
        "o": 24.56999969482422,
        "h": 28.149999618530273,
        "l": 22.18000030517578,
        "c": 23.56999969482422,
        "v": 0
      },
      {
        "t": 1772634600,
        "date": "2026-03-04T14:30:00.000Z",
        "o": 24.389999389648438,
        "h": 24.8700008392334,
        "l": 20.399999618530273,
        "c": 21.149999618530273,
        "v": 0
      },
      {
        "t": 1772721000,
        "date": "2026-03-05T14:30:00.000Z",
        "o": 22.110000610351562,
        "h": 25.84000015258789,
        "l": 20.549999237060547,
        "c": 23.75,
        "v": 0
      },
      {
        "t": 1772807400,
        "date": "2026-03-06T14:30:00.000Z",
        "o": 23.200000762939453,
        "h": 29.93000030517578,
        "l": 22.920000076293945,
        "c": 29.489999771118164,
        "v": 0
      },
      {
        "t": 1773063000,
        "date": "2026-03-09T13:30:00.000Z",
        "o": 35.119998931884766,
        "h": 35.29999923706055,
        "l": 24.760000228881836,
        "c": 25.5,
        "v": 0
      },
      {
        "t": 1773149400,
        "date": "2026-03-10T13:30:00.000Z",
        "o": 24.389999389648438,
        "h": 26.010000228881836,
        "l": 22.190000534057617,
        "c": 24.93000030517578,
        "v": 0
      },
      {
        "t": 1773235800,
        "date": "2026-03-11T13:30:00.000Z",
        "o": 24.899999618530273,
        "h": 26.229999542236328,
        "l": 23.75,
        "c": 24.229999542236328,
        "v": 0
      },
      {
        "t": 1773322200,
        "date": "2026-03-12T13:30:00.000Z",
        "o": 25.479999542236328,
        "h": 27.329999923706055,
        "l": 24.600000381469727,
        "c": 27.290000915527344,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -68.07066745552243,
        "distanceFromATL": 0,
        "majorSupport": 0,
        "majorResistance": 65.7300033569336,
        "ema52w": 19.516346289561344
      },
      "daily3y": {
        "trend": "bull",
        "sma200": 17.528250031471252,
        "sma50": 18.74200004577637,
        "rsi14": 62.004090952639984,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "bull",
        "high52w": 60.130001068115234,
        "low52w": 13.380000114440918,
        "volatility20d": 153.6074484372084,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 21.949000072479247,
      "sma50": 18.74200004577637,
      "rsi14": 62.004090952639984,
      "trend": "bullish",
      "volumeAnomaly": 1,
      "supports": [
        27,
        17.079999923706055
      ],
      "resistances": [
        28,
        35.29999923706055
      ],
      "high20d": 35.29999923706055,
      "low20d": 17.079999923706055,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 41.88693476395242
    }
  },
  {
    "symbol": "^FCHI",
    "name": "CAC 40",
    "price": 7984.43994140625,
    "change": -57.3701171875,
    "changePct": -0.7133980629919549,
    "candles": [],
    "high24h": 8037.830078125,
    "low24h": 7916.5,
    "dailyCandles": [
      {
        "t": 1770883200,
        "date": "2026-02-12T08:00:00.000Z",
        "o": 8432.150390625,
        "h": 8437.349609375,
        "l": 8332.73046875,
        "c": 8340.5595703125,
        "v": 84767100
      },
      {
        "t": 1770969600,
        "date": "2026-02-13T08:00:00.000Z",
        "o": 8315.5,
        "h": 8331.9599609375,
        "l": 8275.0400390625,
        "c": 8311.740234375,
        "v": 80704400
      },
      {
        "t": 1771228800,
        "date": "2026-02-16T08:00:00.000Z",
        "o": 8322.849609375,
        "h": 8354.75,
        "l": 8313.9404296875,
        "c": 8316.5,
        "v": 50019300
      },
      {
        "t": 1771315200,
        "date": "2026-02-17T08:00:00.000Z",
        "o": 8310.8896484375,
        "h": 8368.25,
        "l": 8292.1298828125,
        "c": 8361.4599609375,
        "v": 58135600
      },
      {
        "t": 1771401600,
        "date": "2026-02-18T08:00:00.000Z",
        "o": 8370.48046875,
        "h": 8438.51953125,
        "l": 8365.6298828125,
        "c": 8429.0302734375,
        "v": 68796900
      },
      {
        "t": 1771488000,
        "date": "2026-02-19T08:00:00.000Z",
        "o": 8412.25,
        "h": 8415.8798828125,
        "l": 8350.3603515625,
        "c": 8398.7802734375,
        "v": 72333000
      },
      {
        "t": 1771574400,
        "date": "2026-02-20T08:00:00.000Z",
        "o": 8442.1796875,
        "h": 8529,
        "l": 8421.1103515625,
        "c": 8515.490234375,
        "v": 72160200
      },
      {
        "t": 1771833600,
        "date": "2026-02-23T08:00:00.000Z",
        "o": 8496.33984375,
        "h": 8532.9501953125,
        "l": 8485.23046875,
        "c": 8497.169921875,
        "v": 58801900
      },
      {
        "t": 1771920000,
        "date": "2026-02-24T08:00:00.000Z",
        "o": 8471.4404296875,
        "h": 8548.2900390625,
        "l": 8461.8798828125,
        "c": 8519.2099609375,
        "v": 59104100
      },
      {
        "t": 1772006400,
        "date": "2026-02-25T08:00:00.000Z",
        "o": 8539.6201171875,
        "h": 8560.91015625,
        "l": 8528.6298828125,
        "c": 8559.0703125,
        "v": 61295000
      },
      {
        "t": 1772092800,
        "date": "2026-02-26T08:00:00.000Z",
        "o": 8568.759765625,
        "h": 8642.23046875,
        "l": 8562.8603515625,
        "c": 8620.9296875,
        "v": 75205600
      },
      {
        "t": 1772179200,
        "date": "2026-02-27T08:00:00.000Z",
        "o": 8609.4599609375,
        "h": 8638.9296875,
        "l": 8553.9404296875,
        "c": 8580.75,
        "v": 109240900
      },
      {
        "t": 1772438400,
        "date": "2026-03-02T08:00:00.000Z",
        "o": 8404.9501953125,
        "h": 8461.75,
        "l": 8378.1796875,
        "c": 8394.3203125,
        "v": 97231700
      },
      {
        "t": 1772524800,
        "date": "2026-03-03T08:00:00.000Z",
        "o": 8292.419921875,
        "h": 8298.3095703125,
        "l": 8086.68017578125,
        "c": 8103.83984375,
        "v": 111030800
      },
      {
        "t": 1772611200,
        "date": "2026-03-04T08:00:00.000Z",
        "o": 8122.60009765625,
        "h": 8210.41015625,
        "l": 8089.81005859375,
        "c": 8167.72998046875,
        "v": 80568200
      },
      {
        "t": 1772697600,
        "date": "2026-03-05T08:00:00.000Z",
        "o": 8135.06982421875,
        "h": 8215.01953125,
        "l": 8028.1298828125,
        "c": 8045.7998046875,
        "v": 80365500
      },
      {
        "t": 1772784000,
        "date": "2026-03-06T08:00:00.000Z",
        "o": 8083.669921875,
        "h": 8104.77001953125,
        "l": 7913.02001953125,
        "c": 7993.490234375,
        "v": 82534400
      },
      {
        "t": 1773043200,
        "date": "2026-03-09T08:00:00.000Z",
        "o": 7809.740234375,
        "h": 7929.52978515625,
        "l": 7768.10986328125,
        "c": 7915.35986328125,
        "v": 80316200
      },
      {
        "t": 1773129600,
        "date": "2026-03-10T08:00:00.000Z",
        "o": 8064.81982421875,
        "h": 8107.18994140625,
        "l": 7995.81005859375,
        "c": 8057.35986328125,
        "v": 81753500
      },
      {
        "t": 1773216000,
        "date": "2026-03-11T08:00:00.000Z",
        "o": 7992.66015625,
        "h": 8057.22021484375,
        "l": 7961.31982421875,
        "c": 8041.81005859375,
        "v": 61992200
      },
      {
        "t": 1773302400,
        "date": "2026-03-12T08:00:00.000Z",
        "o": 8006.72998046875,
        "h": 8037.830078125,
        "l": 7916.5,
        "c": 7984.43994140625,
        "v": 78924200
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "range",
        "distanceFromATH": -7.611351371874394,
        "distanceFromATL": 0,
        "majorSupport": 0,
        "majorResistance": 8642.23046875,
        "ema52w": 7922.761934720553
      },
      "daily3y": {
        "trend": "range",
        "sma200": 7992.205847167968,
        "sma50": 8248.6187890625,
        "rsi14": 37.16727204355354,
        "aboveSma200": false,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 8642.23046875,
        "low52w": 6763.759765625,
        "volatility20d": 18.782372563387312,
        "volumeVsAvg": 1.038125538633788,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 8290.714038085938,
      "sma50": 8248.6187890625,
      "rsi14": 37.16727204355354,
      "trend": "neutral",
      "volumeAnomaly": 1.034151589094684,
      "supports": [
        7900,
        7768.10986328125
      ],
      "resistances": [
        8000,
        8642.23046875
      ],
      "high20d": 8642.23046875,
      "low20d": 7768.10986328125,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 27.208497367165233
    }
  },
  {
    "symbol": "^GDAXI",
    "name": "DAX 40",
    "price": 23589.650390625,
    "change": -50.37890625,
    "changePct": -0.21310847637849434,
    "candles": [],
    "high24h": 23703.55078125,
    "low24h": 23368.0703125,
    "dailyCandles": [
      {
        "t": 1770883200,
        "date": "2026-02-12T08:00:00.000Z",
        "o": 25060.80078125,
        "h": 25239.009765625,
        "l": 24813.23046875,
        "c": 24852.689453125,
        "v": 83215100
      },
      {
        "t": 1770969600,
        "date": "2026-02-13T08:00:00.000Z",
        "o": 24822.30078125,
        "h": 24953.150390625,
        "l": 24750.470703125,
        "c": 24914.880859375,
        "v": 83099200
      },
      {
        "t": 1771228800,
        "date": "2026-02-16T08:00:00.000Z",
        "o": 24988.609375,
        "h": 25020.830078125,
        "l": 24793.580078125,
        "c": 24800.91015625,
        "v": 47149400
      },
      {
        "t": 1771315200,
        "date": "2026-02-17T08:00:00.000Z",
        "o": 24796.8203125,
        "h": 25020.640625,
        "l": 24734.0390625,
        "c": 24998.400390625,
        "v": 64755400
      },
      {
        "t": 1771401600,
        "date": "2026-02-18T08:00:00.000Z",
        "o": 25127.130859375,
        "h": 25315.009765625,
        "l": 25100.919921875,
        "c": 25278.2109375,
        "v": 67611600
      },
      {
        "t": 1771488000,
        "date": "2026-02-19T08:00:00.000Z",
        "o": 25198.380859375,
        "h": 25228.939453125,
        "l": 24983.890625,
        "c": 25043.5703125,
        "v": 57793900
      },
      {
        "t": 1771574400,
        "date": "2026-02-20T08:00:00.000Z",
        "o": 25070,
        "h": 25331.060546875,
        "l": 25004.810546875,
        "c": 25260.689453125,
        "v": 61964100
      },
      {
        "t": 1771833600,
        "date": "2026-02-23T08:00:00.000Z",
        "o": 25114.390625,
        "h": 25194.9296875,
        "l": 24937.560546875,
        "c": 24991.970703125,
        "v": 51828500
      },
      {
        "t": 1771920000,
        "date": "2026-02-24T08:00:00.000Z",
        "o": 24952.16015625,
        "h": 25091.94921875,
        "l": 24878.099609375,
        "c": 24986.25,
        "v": 60643200
      },
      {
        "t": 1772006400,
        "date": "2026-02-25T08:00:00.000Z",
        "o": 25051.83984375,
        "h": 25184.41015625,
        "l": 24988.609375,
        "c": 25175.939453125,
        "v": 55165100
      },
      {
        "t": 1772092800,
        "date": "2026-02-26T08:00:00.000Z",
        "o": 25095.859375,
        "h": 25318.94921875,
        "l": 25088.490234375,
        "c": 25289.01953125,
        "v": 57068300
      },
      {
        "t": 1772179200,
        "date": "2026-02-27T08:00:00.000Z",
        "o": 25294.369140625,
        "h": 25405.970703125,
        "l": 25188.30078125,
        "c": 25284.259765625,
        "v": 95190700
      },
      {
        "t": 1772438400,
        "date": "2026-03-02T08:00:00.000Z",
        "o": 24695.439453125,
        "h": 24897.609375,
        "l": 24577.419921875,
        "c": 24638,
        "v": 78329800
      },
      {
        "t": 1772524800,
        "date": "2026-03-03T08:00:00.000Z",
        "o": 24207.439453125,
        "h": 24239.51953125,
        "l": 23601.109375,
        "c": 23790.650390625,
        "v": 105244400
      },
      {
        "t": 1772611200,
        "date": "2026-03-04T08:00:00.000Z",
        "o": 23901.3203125,
        "h": 24242.490234375,
        "l": 23814.890625,
        "c": 24205.359375,
        "v": 74842200
      },
      {
        "t": 1772697600,
        "date": "2026-03-05T08:00:00.000Z",
        "o": 24145.439453125,
        "h": 24366.810546875,
        "l": 23754.650390625,
        "c": 23815.75,
        "v": 77049300
      },
      {
        "t": 1772784000,
        "date": "2026-03-06T08:00:00.000Z",
        "o": 23942.890625,
        "h": 24028.439453125,
        "l": 23342.880859375,
        "c": 23591.029296875,
        "v": 88264600
      },
      {
        "t": 1773043200,
        "date": "2026-03-09T08:00:00.000Z",
        "o": 22998.939453125,
        "h": 23470.80078125,
        "l": 22927.55078125,
        "c": 23409.369140625,
        "v": 71540700
      },
      {
        "t": 1773129600,
        "date": "2026-03-10T08:00:00.000Z",
        "o": 23886.380859375,
        "h": 24061.150390625,
        "l": 23765.240234375,
        "c": 23968.630859375,
        "v": 76604500
      },
      {
        "t": 1773216000,
        "date": "2026-03-11T08:00:00.000Z",
        "o": 23725.2109375,
        "h": 23824.73046875,
        "l": 23533.69921875,
        "c": 23640.029296875,
        "v": 59778300
      },
      {
        "t": 1773302400,
        "date": "2026-03-12T08:00:00.000Z",
        "o": 23577.8203125,
        "h": 23703.55078125,
        "l": 23368.0703125,
        "c": 23589.650390625,
        "v": 78270100
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -7.519815485282222,
        "distanceFromATL": 185.73945448820209,
        "majorSupport": 17024.8203125,
        "majorResistance": 25507.7890625,
        "ema52w": 23825.09123347356
      },
      "daily3y": {
        "trend": "range",
        "sma200": 24166.3006640625,
        "sma50": 24756.6054296875,
        "rsi14": 37.87665260637385,
        "aboveSma200": false,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "bear",
        "high52w": 25507.7890625,
        "low52w": 18489.91015625,
        "volatility20d": 21.745430754399916,
        "volumeVsAvg": 1.108489892991278,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 24533.628515625,
      "sma50": 24756.6054296875,
      "rsi14": 37.87665260637385,
      "trend": "bearish",
      "volumeAnomaly": 1.1046218989353402,
      "supports": [
        23000,
        22927.55078125
      ],
      "resistances": [
        24000,
        25405.970703125
      ],
      "high20d": 25405.970703125,
      "low20d": 22927.55078125,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 2.8485692270061636
    }
  },
  {
    "symbol": "^FTSE",
    "name": "FTSE 100",
    "price": 10305.2001953125,
    "change": -48.599609375,
    "changePct": -0.46938911599389227,
    "candles": [],
    "high24h": 10355.2998046875,
    "low24h": 10258.400390625,
    "dailyCandles": [
      {
        "t": 1770883200,
        "date": "2026-02-12T08:00:00.000Z",
        "o": 10472.2001953125,
        "h": 10535.7998046875,
        "l": 10392,
        "c": 10402.400390625,
        "v": 1022354000
      },
      {
        "t": 1770969600,
        "date": "2026-02-13T08:00:00.000Z",
        "o": 10402.5,
        "h": 10454.5,
        "l": 10380.900390625,
        "c": 10446.400390625,
        "v": 1406698800
      },
      {
        "t": 1771228800,
        "date": "2026-02-16T08:00:00.000Z",
        "o": 10446.2998046875,
        "h": 10490.099609375,
        "l": 10446.2998046875,
        "c": 10473.7001953125,
        "v": 540732700
      },
      {
        "t": 1771315200,
        "date": "2026-02-17T08:00:00.000Z",
        "o": 10474,
        "h": 10556.2001953125,
        "l": 10472.7001953125,
        "c": 10556.2001953125,
        "v": 650471900
      },
      {
        "t": 1771401600,
        "date": "2026-02-18T08:00:00.000Z",
        "o": 10556,
        "h": 10715.7998046875,
        "l": 10554,
        "c": 10686.2001953125,
        "v": 1080504800
      },
      {
        "t": 1771488000,
        "date": "2026-02-19T08:00:00.000Z",
        "o": 10686.400390625,
        "h": 10687.400390625,
        "l": 10597.599609375,
        "c": 10627,
        "v": 1134090700
      },
      {
        "t": 1771574400,
        "date": "2026-02-20T08:00:00.000Z",
        "o": 10627,
        "h": 10745.7998046875,
        "l": 10626.7001953125,
        "c": 10686.900390625,
        "v": 798124100
      },
      {
        "t": 1771833600,
        "date": "2026-02-23T08:00:00.000Z",
        "o": 10686.7998046875,
        "h": 10738.7001953125,
        "l": 10660,
        "c": 10684.7001953125,
        "v": 702118900
      },
      {
        "t": 1771920000,
        "date": "2026-02-24T08:00:00.000Z",
        "o": 10684.900390625,
        "h": 10717.7001953125,
        "l": 10645.7998046875,
        "c": 10680.599609375,
        "v": 999959100
      },
      {
        "t": 1772006400,
        "date": "2026-02-25T08:00:00.000Z",
        "o": 10680.7001953125,
        "h": 10806.400390625,
        "l": 10680.7001953125,
        "c": 10806.400390625,
        "v": 1270688000
      },
      {
        "t": 1772092800,
        "date": "2026-02-26T08:00:00.000Z",
        "o": 10806.400390625,
        "h": 10856.7998046875,
        "l": 10770.7998046875,
        "c": 10846.7001953125,
        "v": 853819000
      },
      {
        "t": 1772179200,
        "date": "2026-02-27T08:00:00.000Z",
        "o": 10846.900390625,
        "h": 10934.900390625,
        "l": 10845.5,
        "c": 10910.599609375,
        "v": 1531094400
      },
      {
        "t": 1772438400,
        "date": "2026-03-02T08:00:00.000Z",
        "o": 10911,
        "h": 10911,
        "l": 10731.900390625,
        "c": 10780.099609375,
        "v": 1305516300
      },
      {
        "t": 1772524800,
        "date": "2026-03-03T08:00:00.000Z",
        "o": 10780.2998046875,
        "h": 10780.2998046875,
        "l": 10406.099609375,
        "c": 10484.099609375,
        "v": 1502778100
      },
      {
        "t": 1772611200,
        "date": "2026-03-04T08:00:00.000Z",
        "o": 10483.900390625,
        "h": 10588.7998046875,
        "l": 10443.5,
        "c": 10567.7001953125,
        "v": 1040017600
      },
      {
        "t": 1772697600,
        "date": "2026-03-05T08:00:00.000Z",
        "o": 10567.7001953125,
        "h": 10636.099609375,
        "l": 10402,
        "c": 10413.900390625,
        "v": 978325000
      },
      {
        "t": 1772784000,
        "date": "2026-03-06T08:00:00.000Z",
        "o": 10413.599609375,
        "h": 10481.099609375,
        "l": 10234.5,
        "c": 10284.7998046875,
        "v": 1060629000
      },
      {
        "t": 1773043200,
        "date": "2026-03-09T08:00:00.000Z",
        "o": 10285,
        "h": 10285,
        "l": 10082,
        "c": 10249.5,
        "v": 1073211800
      },
      {
        "t": 1773129600,
        "date": "2026-03-10T08:00:00.000Z",
        "o": 10249.2001953125,
        "h": 10447.5,
        "l": 10235.400390625,
        "c": 10412.2001953125,
        "v": 1224090500
      },
      {
        "t": 1773216000,
        "date": "2026-03-11T08:00:00.000Z",
        "o": 10412.2998046875,
        "h": 10412.2998046875,
        "l": 10293.7998046875,
        "c": 10353.7998046875,
        "v": 1036944800
      },
      {
        "t": 1773302400,
        "date": "2026-03-12T08:00:00.000Z",
        "o": 10353.7998046875,
        "h": 10355.2998046875,
        "l": 10258.400390625,
        "c": 10305.2001953125,
        "v": 1083987200
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -5.758627630960144,
        "distanceFromATL": 110.3617336118082,
        "majorSupport": 7544.7998046875,
        "majorResistance": 10934.900390625,
        "ema52w": 9384.366361177885
      },
      "daily3y": {
        "trend": "range",
        "sma200": 9567.552504882813,
        "sma50": 10350.03001953125,
        "rsi14": 43.364023372673984,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 10934.900390625,
        "low52w": 7544.7998046875,
        "volatility20d": 16.37578502819459,
        "volumeVsAvg": 1.0190817460199535,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 10562.83505859375,
      "sma50": 10350.03001953125,
      "rsi14": 43.364023372673984,
      "trend": "neutral",
      "volumeAnomaly": 1.0220427476784022,
      "supports": [
        10082,
        10000
      ],
      "resistances": [
        10934.900390625
      ],
      "high20d": 10934.900390625,
      "low20d": 10082,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 6.452252843338481
    }
  },
  {
    "symbol": "^STOXX",
    "name": "STOXX Europe 600",
    "price": 598.8599853515625,
    "change": -3.67999267578125,
    "changePct": -0.6107466408833455,
    "candles": [],
    "high24h": 602.7000122070312,
    "low24h": 595.02001953125,
    "dailyCandles": [
      {
        "t": 1770883200,
        "date": "2026-02-12T08:00:00.000Z",
        "o": 623.8599853515625,
        "h": 625.9000244140625,
        "l": 617.75,
        "c": 618.52001953125,
        "v": 243319700
      },
      {
        "t": 1770969600,
        "date": "2026-02-13T08:00:00.000Z",
        "o": 618.3699951171875,
        "h": 618.9299926757812,
        "l": 614.8400268554688,
        "c": 617.7000122070312,
        "v": 287886300
      },
      {
        "t": 1771228800,
        "date": "2026-02-16T08:00:00.000Z",
        "o": 618.9400024414062,
        "h": 620.5700073242188,
        "l": 618.2100219726562,
        "c": 618.52001953125,
        "v": 147835600
      },
      {
        "t": 1771315200,
        "date": "2026-02-17T08:00:00.000Z",
        "o": 617.739990234375,
        "h": 621.6300048828125,
        "l": 617.0700073242188,
        "c": 621.2899780273438,
        "v": 170014700
      },
      {
        "t": 1771401600,
        "date": "2026-02-18T08:00:00.000Z",
        "o": 622.5900268554688,
        "h": 629.3900146484375,
        "l": 622.5900268554688,
        "c": 628.6900024414062,
        "v": 223774400
      },
      {
        "t": 1771488000,
        "date": "2026-02-19T08:00:00.000Z",
        "o": 628.469970703125,
        "h": 628.5,
        "l": 623.3499755859375,
        "c": 625.3300170898438,
        "v": 227376600
      },
      {
        "t": 1771574400,
        "date": "2026-02-20T08:00:00.000Z",
        "o": 626.5599975585938,
        "h": 632.3099975585938,
        "l": 625.8300170898438,
        "c": 630.5599975585938,
        "v": 207904200
      },
      {
        "t": 1771833600,
        "date": "2026-02-23T08:00:00.000Z",
        "o": 629.6300048828125,
        "h": 631.0700073242188,
        "l": 626.5,
        "c": 627.7000122070312,
        "v": 182028100
      },
      {
        "t": 1771920000,
        "date": "2026-02-24T08:00:00.000Z",
        "o": 627.5599975585938,
        "h": 631.3800048828125,
        "l": 625.7000122070312,
        "c": 629.1400146484375,
        "v": 224921100
      },
      {
        "t": 1772006400,
        "date": "2026-02-25T08:00:00.000Z",
        "o": 630.489990234375,
        "h": 633.52001953125,
        "l": 630.489990234375,
        "c": 633.469970703125,
        "v": 262993900
      },
      {
        "t": 1772092800,
        "date": "2026-02-26T08:00:00.000Z",
        "o": 633.6099853515625,
        "h": 634.8800048828125,
        "l": 631.0999755859375,
        "c": 633.1799926757812,
        "v": 219627800
      },
      {
        "t": 1772179200,
        "date": "2026-02-27T08:00:00.000Z",
        "o": 633.0700073242188,
        "h": 636.1599731445312,
        "l": 631.739990234375,
        "c": 633.8499755859375,
        "v": 376798900
      },
      {
        "t": 1772438400,
        "date": "2026-03-02T08:00:00.000Z",
        "o": 628.7000122070312,
        "h": 628.7000122070312,
        "l": 621.2999877929688,
        "c": 623.6300048828125,
        "v": 296061900
      },
      {
        "t": 1772524800,
        "date": "2026-03-03T08:00:00.000Z",
        "o": 620.3800048828125,
        "h": 620.3800048828125,
        "l": 600.6400146484375,
        "c": 604.4400024414062,
        "v": 358464800
      },
      {
        "t": 1772611200,
        "date": "2026-03-04T08:00:00.000Z",
        "o": 605.280029296875,
        "h": 614.4500122070312,
        "l": 604.5499877929688,
        "c": 612.7100219726562,
        "v": 257002000
      },
      {
        "t": 1772697600,
        "date": "2026-03-05T08:00:00.000Z",
        "o": 612.9000244140625,
        "h": 616.9099731445312,
        "l": 604.22998046875,
        "c": 604.8300170898438,
        "v": 247793100
      },
      {
        "t": 1772784000,
        "date": "2026-03-06T08:00:00.000Z",
        "o": 606.8599853515625,
        "h": 608.6400146484375,
        "l": 593.5399780273438,
        "c": 598.6900024414062,
        "v": 263900800
      },
      {
        "t": 1773043200,
        "date": "2026-03-09T08:00:00.000Z",
        "o": 593.8800048828125,
        "h": 595.4600219726562,
        "l": 583.97998046875,
        "c": 594.9199829101562,
        "v": 257931100
      },
      {
        "t": 1773129600,
        "date": "2026-03-10T08:00:00.000Z",
        "o": 598.0800170898438,
        "h": 608.969970703125,
        "l": 598.0800170898438,
        "c": 606.1199951171875,
        "v": 264176700
      },
      {
        "t": 1773216000,
        "date": "2026-03-11T08:00:00.000Z",
        "o": 604.22998046875,
        "h": 604.7000122070312,
        "l": 598.9299926757812,
        "c": 602.5399780273438,
        "v": 224094400
      },
      {
        "t": 1773302400,
        "date": "2026-03-12T08:00:00.000Z",
        "o": 601.0800170898438,
        "h": 602.7000122070312,
        "l": 595.02001953125,
        "c": 598.8599853515625,
        "v": 244936800
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -5.863303157631146,
        "distanceFromATL": 0,
        "majorSupport": 0,
        "majorResistance": 636.1599731445312,
        "ema52w": 565.178463275616
      },
      "daily3y": {
        "trend": "range",
        "sma200": 572.6364016723633,
        "sma50": 613.4010009765625,
        "rsi14": 39.754154358634054,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 636.1599731445312,
        "low52w": 464.260009765625,
        "volatility20d": 17.45844210153646,
        "volumeVsAvg": 0.9905394842753947,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 617.3084991455078,
      "sma50": 613.4010009765625,
      "rsi14": 39.754154358634054,
      "trend": "neutral",
      "volumeAnomaly": 0.9908634793852578,
      "supports": [
        590,
        583.97998046875
      ],
      "resistances": [
        600,
        636.1599731445312
      ],
      "high20d": 636.1599731445312,
      "low20d": 583.97998046875,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 6.813966881420552
    }
  },
  {
    "symbol": "^N225",
    "name": "Nikkei 225",
    "price": 54452.9609375,
    "change": -572.41015625,
    "changePct": -1.0402658716735427,
    "candles": [],
    "high24h": 54733.078125,
    "low24h": 53796.01171875,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 57197.328125,
        "h": 57407.25,
        "l": 56652.48046875,
        "c": 56941.96875,
        "v": 210000000
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 57212.96875,
        "h": 57219.19921875,
        "l": 56748.1796875,
        "c": 56806.41015625,
        "v": 137400000
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 56819.37109375,
        "h": 56926.23828125,
        "l": 56135.12109375,
        "c": 56566.48828125,
        "v": 132600000
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 56734.26953125,
        "h": 57392.890625,
        "l": 56734.26953125,
        "c": 57143.83984375,
        "v": 130100000
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 57472.078125,
        "h": 57709.8203125,
        "l": 57362.01171875,
        "c": 57467.828125,
        "v": 135500000
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 56979.73828125,
        "h": 56979.73828125,
        "l": 56680.87890625,
        "c": 56825.69921875,
        "v": 152400000
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 56764.140625,
        "h": 57421.671875,
        "l": 56732.9296875,
        "c": 57321.08984375,
        "v": 157800000
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 57695.3984375,
        "h": 58875.171875,
        "l": 57656.5,
        "c": 58583.12109375,
        "v": 167100000
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 58995.390625,
        "h": 59332.4296875,
        "l": 58577.83984375,
        "c": 58753.390625,
        "v": 155300000
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 58606.03125,
        "h": 58924.171875,
        "l": 58130.5703125,
        "c": 58850.26953125,
        "v": 192400000
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 57976.19921875,
        "h": 58365.2109375,
        "l": 57285.76953125,
        "c": 58057.23828125,
        "v": 162400000
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 57729.80078125,
        "h": 57890.76171875,
        "l": 56091.5390625,
        "c": 56279.05078125,
        "v": 179000000
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 55470.87890625,
        "h": 55701.26953125,
        "l": 53618.19921875,
        "c": 54245.5390625,
        "v": 214000000
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 55204.16015625,
        "h": 56619.98046875,
        "l": 54910.328125,
        "c": 55278.05859375,
        "v": 184900000
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 54674.6015625,
        "h": 55686.55859375,
        "l": 54513.4296875,
        "c": 55620.83984375,
        "v": 142800000
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 54608.62890625,
        "h": 54608.62890625,
        "l": 51407.66015625,
        "c": 52728.71875,
        "v": 219400000
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 53524.08984375,
        "h": 54694.890625,
        "l": 53487.19140625,
        "c": 54248.390625,
        "v": 162500000
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 54917.9296875,
        "h": 55745.37890625,
        "l": 54882.578125,
        "c": 55025.37109375,
        "v": 146900000
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 54387.8984375,
        "h": 54733.078125,
        "l": 53796.01171875,
        "c": 54452.9609375,
        "v": 154100000
      },
      {
        "t": 1773379925,
        "date": "2026-03-13T05:32:05.000Z",
        "o": 53587.30078125,
        "h": 54065.30859375,
        "l": 53286.69140625,
        "c": 53801.7890625,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -8.223948986582617,
        "distanceFromATL": 266.34099274766163,
        "majorSupport": 30792.740234375,
        "majorResistance": 59332.4296875,
        "ema52w": 45478.11598557692
      },
      "daily3y": {
        "trend": "bull",
        "sma200": 46852.590703125,
        "sma50": 54529.56390625,
        "rsi14": 43.587269088764344,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "bear",
        "high52w": 59332.4296875,
        "low52w": 30792.740234375,
        "volatility20d": 30.963471826429195,
        "volumeVsAvg": 0,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 56249.903125,
      "sma50": 54529.56390625,
      "rsi14": 43.587269088764344,
      "trend": "neutral",
      "volumeAnomaly": 1,
      "supports": [
        54000,
        51407.66015625
      ],
      "resistances": [
        55000,
        59332.4296875
      ],
      "high20d": 59332.4296875,
      "low20d": 51407.66015625,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 7.120797615020628
    }
  },
  {
    "symbol": "000001.SS",
    "name": "Shanghai Composite",
    "price": 4129.10302734375,
    "change": -4.330078125,
    "changePct": -0.10475742595836565,
    "candles": [],
    "high24h": 4141.64892578125,
    "low24h": 4103.1640625,
    "dailyCandles": [
      {
        "t": 1770946200,
        "date": "2026-02-13T01:30:00.000Z",
        "o": 4115.923828125,
        "h": 4123.84423828125,
        "l": 4079.77001953125,
        "c": 4082.072998046875,
        "v": 500800
      },
      {
        "t": 1771896600,
        "date": "2026-02-24T01:30:00.000Z",
        "o": 4129.1337890625,
        "h": 4131.5498046875,
        "l": 4105.93701171875,
        "c": 4117.4091796875,
        "v": 566300
      },
      {
        "t": 1771983000,
        "date": "2026-02-25T01:30:00.000Z",
        "o": 4123.78076171875,
        "h": 4167.84423828125,
        "l": 4122.69921875,
        "c": 4147.22998046875,
        "v": 724800
      },
      {
        "t": 1772069400,
        "date": "2026-02-26T01:30:00.000Z",
        "o": 4151.06787109375,
        "h": 4152.19189453125,
        "l": 4127.15283203125,
        "c": 4146.630859375,
        "v": 651700
      },
      {
        "t": 1772155800,
        "date": "2026-02-27T01:30:00.000Z",
        "o": 4128.89697265625,
        "h": 4166.23388671875,
        "l": 4128.35986328125,
        "c": 4162.880859375,
        "v": 682000
      },
      {
        "t": 1772415000,
        "date": "2026-03-02T01:30:00.000Z",
        "o": 4151.80078125,
        "h": 4188.77001953125,
        "l": 4131.3681640625,
        "c": 4182.5908203125,
        "v": 861600
      },
      {
        "t": 1772501400,
        "date": "2026-03-03T01:30:00.000Z",
        "o": 4189.408203125,
        "h": 4197.22802734375,
        "l": 4116.01123046875,
        "c": 4122.67578125,
        "v": 921100
      },
      {
        "t": 1772587800,
        "date": "2026-03-04T01:30:00.000Z",
        "o": 4087.632080078125,
        "h": 4106.0400390625,
        "l": 4055.4130859375,
        "c": 4082.47412109375,
        "v": 765200
      },
      {
        "t": 1772674200,
        "date": "2026-03-05T01:30:00.000Z",
        "o": 4109.77685546875,
        "h": 4125.6171875,
        "l": 4090.62109375,
        "c": 4108.56689453125,
        "v": 689700
      },
      {
        "t": 1772760600,
        "date": "2026-03-06T01:30:00.000Z",
        "o": 4085.89599609375,
        "h": 4129.46484375,
        "l": 4085.89599609375,
        "c": 4124.19384765625,
        "v": 646800
      },
      {
        "t": 1773019800,
        "date": "2026-03-09T01:30:00.000Z",
        "o": 4098.69921875,
        "h": 4106.5341796875,
        "l": 4052.544921875,
        "c": 4096.60302734375,
        "v": 797800
      },
      {
        "t": 1773106200,
        "date": "2026-03-10T01:30:00.000Z",
        "o": 4098.5869140625,
        "h": 4123.9580078125,
        "l": 4098.5869140625,
        "c": 4123.13818359375,
        "v": 674900
      },
      {
        "t": 1773192600,
        "date": "2026-03-11T01:30:00.000Z",
        "o": 4123.6669921875,
        "h": 4135.8388671875,
        "l": 4112.7998046875,
        "c": 4133.43310546875,
        "v": 707700
      },
      {
        "t": 1773279000,
        "date": "2026-03-12T01:30:00.000Z",
        "o": 4133.2001953125,
        "h": 4141.64892578125,
        "l": 4103.1640625,
        "c": 4129.10302734375,
        "v": 786200
      },
      {
        "t": 1773379925,
        "date": "2026-03-13T05:32:05.000Z",
        "o": 4117.57373046875,
        "h": 4134.07958984375,
        "l": 4108.80078125,
        "c": 4116.09521484375,
        "v": 707831
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -1.623095041684296,
        "distanceFromATL": 69.16265376269448,
        "majorSupport": 2689.695068359375,
        "majorResistance": 4197.22802734375,
        "ema52w": 3733.1570434570312
      },
      "daily3y": {
        "trend": "range",
        "sma200": 3810.0227319335936,
        "sma50": 4096.543071289063,
        "rsi14": 50.62950789123011,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 4197.22802734375,
        "low52w": 3040.693115234375,
        "volatility20d": 11.148882649012391,
        "volumeVsAvg": 1.0123136659120444,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 4122.907336425781,
      "sma50": 4096.543071289063,
      "rsi14": 50.62950789123011,
      "trend": "bullish",
      "volumeAnomaly": 1.0182918090410567,
      "supports": [
        4100,
        4029.972900390625
      ],
      "resistances": [
        4197.22802734375,
        4200
      ],
      "high20d": 4197.22802734375,
      "low20d": 4029.972900390625,
      "isNear52wHigh": true,
      "isNear52wLow": false,
      "dramaScore": 12.35085589595721
    }
  },
  {
    "symbol": "^HSI",
    "name": "Hang Seng",
    "price": 25716.759765625,
    "change": -182,
    "changePct": -0.7027363535823272,
    "candles": [],
    "high24h": 25932.580078125,
    "low24h": 25521.150390625,
    "dailyCandles": [
      {
        "t": 1770946200,
        "date": "2026-02-13T01:30:00.000Z",
        "o": 26640.16015625,
        "h": 26774.439453125,
        "l": 26444.4609375,
        "c": 26567.119140625,
        "v": 2489000000
      },
      {
        "t": 1771205400,
        "date": "2026-02-16T01:30:00.000Z",
        "o": 26501.19921875,
        "h": 26734.41015625,
        "l": 26382.41015625,
        "c": 26705.939453125,
        "v": 808500000
      },
      {
        "t": 1771551000,
        "date": "2026-02-20T01:30:00.000Z",
        "o": 26657.83984375,
        "h": 26694.33984375,
        "l": 26356.9609375,
        "c": 26413.349609375,
        "v": 1694800000
      },
      {
        "t": 1771810200,
        "date": "2026-02-23T01:30:00.000Z",
        "o": 26798.970703125,
        "h": 27156.279296875,
        "l": 26798.970703125,
        "c": 27081.91015625,
        "v": 1816400000
      },
      {
        "t": 1771896600,
        "date": "2026-02-24T01:30:00.000Z",
        "o": 26913.6796875,
        "h": 26913.6796875,
        "l": 26480.859375,
        "c": 26590.3203125,
        "v": 2683800000
      },
      {
        "t": 1771983000,
        "date": "2026-02-25T01:30:00.000Z",
        "o": 26745.19921875,
        "h": 26870.029296875,
        "l": 26632.529296875,
        "c": 26765.720703125,
        "v": 2499400000
      },
      {
        "t": 1772069400,
        "date": "2026-02-26T01:30:00.000Z",
        "o": 27019.740234375,
        "h": 27024.0703125,
        "l": 26373.009765625,
        "c": 26381.01953125,
        "v": 2901200000
      },
      {
        "t": 1772155800,
        "date": "2026-02-27T01:30:00.000Z",
        "o": 26447.05078125,
        "h": 26701.5,
        "l": 26375.69921875,
        "c": 26630.5390625,
        "v": 3294400000
      },
      {
        "t": 1772415000,
        "date": "2026-03-02T01:30:00.000Z",
        "o": 26305.580078125,
        "h": 26403.849609375,
        "l": 25882.94921875,
        "c": 26059.849609375,
        "v": 4593500000
      },
      {
        "t": 1772501400,
        "date": "2026-03-03T01:30:00.000Z",
        "o": 26190.240234375,
        "h": 26218.9296875,
        "l": 25727,
        "c": 25768.080078125,
        "v": 4705200000
      },
      {
        "t": 1772587800,
        "date": "2026-03-04T01:30:00.000Z",
        "o": 25469.33984375,
        "h": 25470.05078125,
        "l": 24958.4296875,
        "c": 25249.48046875,
        "v": 4703700000
      },
      {
        "t": 1772674200,
        "date": "2026-03-05T01:30:00.000Z",
        "o": 25583.650390625,
        "h": 25736.599609375,
        "l": 25236.6796875,
        "c": 25321.33984375,
        "v": 3484200000
      },
      {
        "t": 1772760600,
        "date": "2026-03-06T01:30:00.000Z",
        "o": 25358.560546875,
        "h": 25806.720703125,
        "l": 25267.630859375,
        "c": 25757.2890625,
        "v": 3669800000
      },
      {
        "t": 1773019800,
        "date": "2026-03-09T01:30:00.000Z",
        "o": 25075.740234375,
        "h": 25442.619140625,
        "l": 24906,
        "c": 25408.4609375,
        "v": 5300800000
      },
      {
        "t": 1773106200,
        "date": "2026-03-10T01:30:00.000Z",
        "o": 25740.2890625,
        "h": 25959.900390625,
        "l": 25611.7890625,
        "c": 25959.900390625,
        "v": 3518600000
      },
      {
        "t": 1773192600,
        "date": "2026-03-11T01:30:00.000Z",
        "o": 26112.080078125,
        "h": 26149.640625,
        "l": 25819.099609375,
        "c": 25898.759765625,
        "v": 3144800000
      },
      {
        "t": 1773279000,
        "date": "2026-03-12T01:30:00.000Z",
        "o": 25719.470703125,
        "h": 25932.580078125,
        "l": 25521.150390625,
        "c": 25716.759765625,
        "v": 3046500000
      },
      {
        "t": 1773379926,
        "date": "2026-03-13T05:32:06.000Z",
        "o": 25583.55078125,
        "h": 25697.169921875,
        "l": 25475.439453125,
        "c": 25564.58984375,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -23.1970500438408,
        "distanceFromATL": 76.17465493728275,
        "majorSupport": 16044.4501953125,
        "majorResistance": 28056.099609375,
        "ema52w": 25085.554950420672
      },
      "daily3y": {
        "trend": "range",
        "sma200": 25636.560166015624,
        "sma50": 26525.7943359375,
        "rsi14": 41.85422508115164,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "bear",
        "high52w": 28056.099609375,
        "low52w": 19260.2109375,
        "volatility20d": 21.586457039479967,
        "volumeVsAvg": 0,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 26206.9673828125,
      "sma50": 26525.7943359375,
      "rsi14": 41.85422508115164,
      "trend": "bearish",
      "volumeAnomaly": 1,
      "supports": [
        25000,
        24906
      ],
      "resistances": [
        26000,
        27325.98046875
      ],
      "high20d": 27325.98046875,
      "low20d": 24906,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 9.108209060746981
    }
  },
  {
    "symbol": "^KS11",
    "name": "KOSPI",
    "price": 5583.25,
    "change": -26.7001953125,
    "changePct": -0.47594353573423615,
    "candles": [],
    "high24h": 5629.06982421875,
    "low24h": 5527.47021484375,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 5513.7099609375,
        "h": 5583.740234375,
        "l": 5480.919921875,
        "c": 5507.009765625,
        "v": 1290700
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 5642.08984375,
        "h": 5681.64990234375,
        "l": 5614.97021484375,
        "c": 5677.25,
        "v": 1185800
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 5696.89013671875,
        "h": 5809.91015625,
        "l": 5684.580078125,
        "c": 5808.52978515625,
        "v": 1749300
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 5903.10986328125,
        "h": 5931.85986328125,
        "l": 5792.56982421875,
        "c": 5846.08984375,
        "v": 1477800
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 5853.47998046875,
        "h": 5969.64013671875,
        "l": 5775.60986328125,
        "c": 5969.64013671875,
        "v": 1602000
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 6022.7001953125,
        "h": 6144.7099609375,
        "l": 5984.27978515625,
        "c": 6083.85986328125,
        "v": 1415300
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 6121.02978515625,
        "h": 6313.27001953125,
        "l": 6107.41015625,
        "c": 6307.27001953125,
        "v": 1409600
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 6197.490234375,
        "h": 6347.41015625,
        "l": 6153.8701171875,
        "c": 6244.1298828125,
        "v": 1166100
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 6165.14990234375,
        "h": 6180.4501953125,
        "l": 5791.64990234375,
        "c": 5791.91015625,
        "v": 1227200
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 5592.58984375,
        "h": 5672.1201171875,
        "l": 5059.4501953125,
        "c": 5093.5400390625,
        "v": 1637600
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 5250.919921875,
        "h": 5715.2998046875,
        "l": 5248.1298828125,
        "c": 5583.89990234375,
        "v": 1660700
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 5491.02001953125,
        "h": 5609.97998046875,
        "l": 5381.27001953125,
        "c": 5584.8701171875,
        "v": 1223000
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 5265.3701171875,
        "h": 5327.419921875,
        "l": 5096.16015625,
        "c": 5251.8701171875,
        "v": 1026200
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 5523.2099609375,
        "h": 5595.8798828125,
        "l": 5427.8798828125,
        "c": 5532.58984375,
        "v": 923200
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 5658.72021484375,
        "h": 5746.35986328125,
        "l": 5559.68994140625,
        "c": 5609.9501953125,
        "v": 1050900
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 5567.64990234375,
        "h": 5629.06982421875,
        "l": 5527.47021484375,
        "c": 5583.25,
        "v": 801300
      },
      {
        "t": 1773379620,
        "date": "2026-03-13T05:27:00.000Z",
        "o": 5412.39013671875,
        "h": 5537.58984375,
        "l": 5392.52001953125,
        "c": 5486.9501953125,
        "v": 801069
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -12.03892827845018,
        "distanceFromATL": 287.87921549963784,
        "majorSupport": 2284.719970703125,
        "majorResistance": 6347.41015625,
        "ema52w": 3724.1409677358774
      },
      "daily3y": {
        "trend": "bull",
        "sma200": 3863.190458984375,
        "sma50": 5156.40140625,
        "rsi14": 50.39665507057901,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 6347.41015625,
        "low52w": 2284.719970703125,
        "volatility20d": 71.6168496993492,
        "volumeVsAvg": 0.6713486899708516,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 5657.053002929688,
      "sma50": 5156.40140625,
      "rsi14": 50.39665507057901,
      "trend": "neutral",
      "volumeAnomaly": 0.6765471198550743,
      "supports": [
        5500,
        5059.4501953125
      ],
      "resistances": [
        5600,
        6347.41015625
      ],
      "high20d": 6347.41015625,
      "low20d": 5059.4501953125,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 7.780924846912857
    }
  },
  {
    "symbol": "399001.SZ",
    "name": "Shenzhen Component",
    "price": 14374.8701171875,
    "change": -90.5400390625,
    "changePct": -0.6259071680963073,
    "candles": [],
    "high24h": 14478.0498046875,
    "low24h": 14245.76953125,
    "dailyCandles": [
      {
        "t": 1770946200,
        "date": "2026-02-13T01:30:00.000Z",
        "o": 14188.349609375,
        "h": 14258.830078125,
        "l": 14092.83984375,
        "c": 14100.1904296875,
        "v": 2321200
      },
      {
        "t": 1771896600,
        "date": "2026-02-24T01:30:00.000Z",
        "o": 14313.8603515625,
        "h": 14376.9599609375,
        "l": 14214.419921875,
        "c": 14291.5703125,
        "v": 2549400
      },
      {
        "t": 1771983000,
        "date": "2026-02-25T01:30:00.000Z",
        "o": 14322.240234375,
        "h": 14512.83984375,
        "l": 14314.150390625,
        "c": 14475.8701171875,
        "v": 2913400
      },
      {
        "t": 1772069400,
        "date": "2026-02-26T01:30:00.000Z",
        "o": 14495.8603515625,
        "h": 14536.080078125,
        "l": 14408.8798828125,
        "c": 14503.7900390625,
        "v": 2828100
      },
      {
        "t": 1772155800,
        "date": "2026-02-27T01:30:00.000Z",
        "o": 14375.25,
        "h": 14497.9599609375,
        "l": 14366.349609375,
        "c": 14495.08984375,
        "v": 2880000
      },
      {
        "t": 1772415000,
        "date": "2026-03-02T01:30:00.000Z",
        "o": 14327.650390625,
        "h": 14509.6904296875,
        "l": 14285.669921875,
        "c": 14465.7900390625,
        "v": 3351600
      },
      {
        "t": 1772501400,
        "date": "2026-03-03T01:30:00.000Z",
        "o": 14498.7001953125,
        "h": 14526.0595703125,
        "l": 14007.650390625,
        "c": 14022.3896484375,
        "v": 3414000
      },
      {
        "t": 1772587800,
        "date": "2026-03-04T01:30:00.000Z",
        "o": 13854.3701171875,
        "h": 14112.01953125,
        "l": 13854.3701171875,
        "c": 13917.75,
        "v": 2582100
      },
      {
        "t": 1772674200,
        "date": "2026-03-05T01:30:00.000Z",
        "o": 14160.2001953125,
        "h": 14202.759765625,
        "l": 13999.7001953125,
        "c": 14088.83984375,
        "v": 2626200
      },
      {
        "t": 1772760600,
        "date": "2026-03-06T01:30:00.000Z",
        "o": 14015.5400390625,
        "h": 14212.83984375,
        "l": 13969.33984375,
        "c": 14172.6298828125,
        "v": 2400800
      },
      {
        "t": 1773019800,
        "date": "2026-03-09T01:30:00.000Z",
        "o": 13920.2900390625,
        "h": 14103.6298828125,
        "l": 13701.669921875,
        "c": 14067.5,
        "v": 2942900
      },
      {
        "t": 1773106200,
        "date": "2026-03-10T01:30:00.000Z",
        "o": 14239.2998046875,
        "h": 14357.8203125,
        "l": 14239.2998046875,
        "c": 14354.0703125,
        "v": 2528000
      },
      {
        "t": 1773192600,
        "date": "2026-03-11T01:30:00.000Z",
        "o": 14373.740234375,
        "h": 14531.01953125,
        "l": 14373.009765625,
        "c": 14465.41015625,
        "v": 2690600
      },
      {
        "t": 1773279000,
        "date": "2026-03-12T01:30:00.000Z",
        "o": 14457.6298828125,
        "h": 14478.0498046875,
        "l": 14245.76953125,
        "c": 14374.8701171875,
        "v": 2698400
      },
      {
        "t": 1773379927,
        "date": "2026-03-13T05:32:07.000Z",
        "o": 14300.9248046875,
        "h": 14454.306640625,
        "l": 14292.890625,
        "c": 14363.04296875,
        "v": 2699080
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -11.77321026863622,
        "distanceFromATL": 105.0234400179843,
        "majorSupport": 7908.52001953125,
        "majorResistance": 14536.080078125,
        "ema52w": 12182.224290114184
      },
      "daily3y": {
        "trend": "bull",
        "sma200": 12514.396625976562,
        "sma50": 14131.5578515625,
        "rsi14": 54.61999450450705,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 14536.080078125,
        "low52w": 9119.599609375,
        "volatility20d": 18.769882070545144,
        "volumeVsAvg": 0.9803581305311024,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 14246.426708984374,
      "sma50": 14131.5578515625,
      "rsi14": 54.61999450450705,
      "trend": "bullish",
      "volumeAnomaly": 0.9804002111676339,
      "supports": [
        14000,
        13701.669921875
      ],
      "resistances": [
        14536.080078125
      ],
      "high20d": 14536.080078125,
      "low20d": 13701.669921875,
      "isNear52wHigh": true,
      "isNear52wLow": false,
      "dramaScore": 10.838521926624189
    }
  },
  {
    "symbol": "DX-Y.NYB",
    "name": "US Dollar Index",
    "price": 99.73999786376953,
    "change": 0.5099945068359375,
    "changePct": 0.5139519193620002,
    "candles": [],
    "high24h": 99.76000213623047,
    "low24h": 99.25,
    "dailyCandles": [
      {
        "t": 1770958800,
        "date": "2026-02-13T05:00:00.000Z",
        "o": 96.94000244140625,
        "h": 97.16000366210938,
        "l": 96.80000305175781,
        "c": 96.87999725341797,
        "v": 0
      },
      {
        "t": 1771304400,
        "date": "2026-02-17T05:00:00.000Z",
        "o": 97.12000274658203,
        "h": 97.55000305175781,
        "l": 97.06999969482422,
        "c": 97.16000366210938,
        "v": 0
      },
      {
        "t": 1771390800,
        "date": "2026-02-18T05:00:00.000Z",
        "o": 97.13999938964844,
        "h": 97.73999786376953,
        "l": 97.12000274658203,
        "c": 97.69999694824219,
        "v": 0
      },
      {
        "t": 1771477200,
        "date": "2026-02-19T05:00:00.000Z",
        "o": 97.7300033569336,
        "h": 98.06999969482422,
        "l": 97.56999969482422,
        "c": 97.93000030517578,
        "v": 0
      },
      {
        "t": 1771563600,
        "date": "2026-02-20T05:00:00.000Z",
        "o": 97.9000015258789,
        "h": 98.08000183105469,
        "l": 97.58999633789062,
        "c": 97.80000305175781,
        "v": 0
      },
      {
        "t": 1771822800,
        "date": "2026-02-23T05:00:00.000Z",
        "o": 97.69999694824219,
        "h": 97.8499984741211,
        "l": 97.36000061035156,
        "c": 97.69999694824219,
        "v": 0
      },
      {
        "t": 1771909200,
        "date": "2026-02-24T05:00:00.000Z",
        "o": 97.69999694824219,
        "h": 97.98999786376953,
        "l": 97.69999694824219,
        "c": 97.87999725341797,
        "v": 0
      },
      {
        "t": 1771995600,
        "date": "2026-02-25T05:00:00.000Z",
        "o": 97.8499984741211,
        "h": 98,
        "l": 97.62000274658203,
        "c": 97.69999694824219,
        "v": 0
      },
      {
        "t": 1772082000,
        "date": "2026-02-26T05:00:00.000Z",
        "o": 97.58999633789062,
        "h": 97.9800033569336,
        "l": 97.48999786376953,
        "c": 97.79000091552734,
        "v": 0
      },
      {
        "t": 1772168400,
        "date": "2026-02-27T05:00:00.000Z",
        "o": 97.75,
        "h": 97.8499984741211,
        "l": 97.55999755859375,
        "c": 97.61000061035156,
        "v": 0
      },
      {
        "t": 1772427600,
        "date": "2026-03-02T05:00:00.000Z",
        "o": 97.87000274658203,
        "h": 98.75,
        "l": 97.7699966430664,
        "c": 98.37999725341797,
        "v": 0
      },
      {
        "t": 1772514000,
        "date": "2026-03-03T05:00:00.000Z",
        "o": 98.55999755859375,
        "h": 99.68000030517578,
        "l": 98.44000244140625,
        "c": 99.05000305175781,
        "v": 0
      },
      {
        "t": 1772600400,
        "date": "2026-03-04T05:00:00.000Z",
        "o": 99.11000061035156,
        "h": 99.33000183105469,
        "l": 98.69999694824219,
        "c": 98.7699966430664,
        "v": 0
      },
      {
        "t": 1772686800,
        "date": "2026-03-05T05:00:00.000Z",
        "o": 98.7699966430664,
        "h": 99.41000366210938,
        "l": 98.66999816894531,
        "c": 99.31999969482422,
        "v": 0
      },
      {
        "t": 1772773200,
        "date": "2026-03-06T05:00:00.000Z",
        "o": 99.01000213623047,
        "h": 99.44000244140625,
        "l": 98.83999633789062,
        "c": 98.98999786376953,
        "v": 0
      },
      {
        "t": 1773028800,
        "date": "2026-03-09T04:00:00.000Z",
        "o": 98.86000061035156,
        "h": 99.69999694824219,
        "l": 98.72000122070312,
        "c": 99.18000030517578,
        "v": 0
      },
      {
        "t": 1773115200,
        "date": "2026-03-10T04:00:00.000Z",
        "o": 98.80000305175781,
        "h": 98.94999694824219,
        "l": 98.48999786376953,
        "c": 98.83000183105469,
        "v": 0
      },
      {
        "t": 1773201600,
        "date": "2026-03-11T04:00:00.000Z",
        "o": 98.94000244140625,
        "h": 99.30000305175781,
        "l": 98.69999694824219,
        "c": 99.2300033569336,
        "v": 0
      },
      {
        "t": 1773288000,
        "date": "2026-03-12T04:00:00.000Z",
        "o": 99.44999694824219,
        "h": 99.76000213623047,
        "l": 99.25,
        "c": 99.73999786376953,
        "v": 0
      },
      {
        "t": 1773380227,
        "date": "2026-03-13T05:37:07.000Z",
        "o": 99.69200134277344,
        "h": 99.85600280761719,
        "l": 99.58599853515625,
        "c": 99.79499816894531,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "range",
        "distanceFromATH": -13.103329042934389,
        "distanceFromATL": 13.019827607670855,
        "majorSupport": 95.55000305175781,
        "majorResistance": 110.18000030517578,
        "ema52w": 98.80278807419997
      },
      "daily3y": {
        "trend": "range",
        "sma200": 98.39032512664795,
        "sma50": 98.10789962768554,
        "rsi14": 66.4815566532848,
        "aboveSma200": true,
        "goldenCross": false
      },
      "daily1y": {
        "trend": "range",
        "high52w": 104.68000030517578,
        "low52w": 95.55000305175781,
        "volatility20d": 5.429111112891912,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 98.37174949645996,
      "sma50": 98.10789962768554,
      "rsi14": 66.4815566532848,
      "trend": "bullish",
      "volumeAnomaly": 1,
      "supports": [
        99,
        96.80000305175781
      ],
      "resistances": [
        99.85600280761719,
        100
      ],
      "high20d": 99.85600280761719,
      "low20d": 96.80000305175781,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 6.541855758086001
    }
  },
  {
    "symbol": "EURUSD=X",
    "name": "EUR/USD",
    "price": 1.1543211936950684,
    "change": -0.006808757781982422,
    "changePct": -0.5863906768851439,
    "candles": [],
    "high24h": 1.156738042831421,
    "low24h": 1.151145339012146,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 1.1869717836380005,
        "h": 1.1879446506500244,
        "l": 1.1848762035369873,
        "c": 1.1868449449539185,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 1.186704158782959,
        "h": 1.1870845556259155,
        "l": 1.1847639083862305,
        "c": 1.1867464780807495,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 1.1850868463516235,
        "h": 1.1852554082870483,
        "l": 1.180553913116455,
        "c": 1.1849884986877441,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 1.185157060623169,
        "h": 1.1853959560394287,
        "l": 1.1810418367385864,
        "c": 1.185185194015503,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 1.1791062355041504,
        "h": 1.1807769536972046,
        "l": 1.1743016242980957,
        "c": 1.1788839101791382,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 1.1769136190414429,
        "h": 1.1806097030639648,
        "l": 1.1745498180389404,
        "c": 1.1769136190414429,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 1.1829839944839478,
        "h": 1.183445930480957,
        "l": 1.1775233745574951,
        "c": 1.1834739446640015,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 1.1793148517608643,
        "h": 1.1796625852584839,
        "l": 1.1767336130142212,
        "c": 1.1793843507766724,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 1.1775511503219604,
        "h": 1.180790901184082,
        "l": 1.1771352291107178,
        "c": 1.1775233745574951,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 1.181544303894043,
        "h": 1.1830118894577026,
        "l": 1.1782448291778564,
        "c": 1.181516408920288,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 1.1803449392318726,
        "h": 1.182396411895752,
        "l": 1.1790506839752197,
        "c": 1.1803030967712402,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 1.1760140657424927,
        "h": 1.1795791387557983,
        "l": 1.1672834157943726,
        "c": 1.1759449243545532,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 1.1694538593292236,
        "h": 1.1707134246826172,
        "l": 1.153203010559082,
        "c": 1.1697274446487427,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 1.161089539527893,
        "h": 1.1654876470565796,
        "l": 1.1576753854751587,
        "c": 1.161224365234375,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 1.1635212898254395,
        "h": 1.164686679840088,
        "l": 1.1561896800994873,
        "c": 1.1635618209838867,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 1.1607122421264648,
        "h": 1.16225004196167,
        "l": 1.1547610759735107,
        "c": 1.1608065366744995,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 1.1525650024414062,
        "h": 1.159366488456726,
        "l": 1.150814175605774,
        "c": 1.152325987815857,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 1.1616694927215576,
        "h": 1.1663848161697388,
        "l": 1.1608469486236572,
        "c": 1.1617234945297241,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 1.1613187789916992,
        "h": 1.164401888847351,
        "l": 1.1566978693008423,
        "c": 1.1611299514770508,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 1.1541746854782104,
        "h": 1.156738042831421,
        "l": 1.151145339012146,
        "c": 1.1543211936950684,
        "v": 0
      },
      {
        "t": 1773380814,
        "date": "2026-03-13T05:46:54.000Z",
        "o": 1.151410460472107,
        "h": 1.1532695293426514,
        "l": 1.15035080909729,
        "c": 1.1506155729293823,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -8.081403527957045,
        "distanceFromATL": 25.590156413968817,
        "majorSupport": 1.0183818340301514,
        "majorResistance": 1.2023565769195557,
        "ema52w": 1.1594404257260835
      },
      "daily3y": {
        "trend": "range",
        "sma200": 1.1674499052762985,
        "sma50": 1.1748343849182128,
        "rsi14": 32.86629349516974,
        "aboveSma200": false,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 1.2023565769195557,
        "low52w": 1.0742061138153076,
        "volatility20d": 6.2776894323527,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 1.1713150084018706,
      "sma50": 1.1748343849182128,
      "rsi14": 32.86629349516974,
      "trend": "bearish",
      "volumeAnomaly": 1,
      "supports": [
        1.15035080909729
      ],
      "resistances": [
        1.1870845556259155
      ],
      "high20d": 1.1870845556259155,
      "low20d": 1.15035080909729,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 3.7591720306554315
    }
  },
  {
    "symbol": "USDJPY=X",
    "name": "USD/JPY",
    "price": 159.0749969482422,
    "change": 0.96099853515625,
    "changePct": 0.6077883962212893,
    "candles": [],
    "high24h": 159.28399658203125,
    "low24h": 158.572998046875,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 152.7570037841797,
        "h": 153.65499877929688,
        "l": 152.7449951171875,
        "c": 152.8209991455078,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 152.78799438476562,
        "h": 153.61900329589844,
        "l": 152.77000427246094,
        "c": 152.7790069580078,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 153.5500030517578,
        "h": 153.88699340820312,
        "l": 152.7010040283203,
        "c": 153.60899353027344,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 153.11599731445312,
        "h": 154.47900390625,
        "l": 153.06300354003906,
        "c": 153.1490020751953,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 154.6840057373047,
        "h": 155.31199645996094,
        "l": 154.53799438476562,
        "c": 154.6929931640625,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 155.1739959716797,
        "h": 155.625,
        "l": 154.718994140625,
        "c": 155.16000366210938,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 154.3560028076172,
        "h": 155.02200317382812,
        "l": 153.9949951171875,
        "c": 154.33900451660156,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 154.63699340820312,
        "h": 156.24200439453125,
        "l": 154.61900329589844,
        "c": 154.63499450683594,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 155.91200256347656,
        "h": 156.80799865722656,
        "l": 155.35699462890625,
        "c": 155.8800048828125,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 156.14300537109375,
        "h": 156.26100158691406,
        "l": 155.74600219726562,
        "c": 156.1999969482422,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 155.87100219726562,
        "h": 156.2169952392578,
        "l": 155.54100036621094,
        "c": 155.85899353027344,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 156.60800170898438,
        "h": 157.74400329589844,
        "l": 156.1479949951172,
        "c": 156.63299560546875,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 157.27200317382812,
        "h": 157.96600341796875,
        "l": 157.1529998779297,
        "c": 157.2570037841797,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 157.781005859375,
        "h": 157.84500122070312,
        "l": 156.88299560546875,
        "c": 157.7729949951172,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 156.9709930419922,
        "h": 157.76800537109375,
        "l": 156.4739990234375,
        "c": 156.98300170898438,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 157.52200317382812,
        "h": 158.07400512695312,
        "l": 157.41200256347656,
        "c": 157.53399658203125,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 158.38400268554688,
        "h": 158.8939971923828,
        "l": 158.0030059814453,
        "c": 158.427001953125,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 157.8560028076172,
        "h": 157.95899963378906,
        "l": 157.27699279785156,
        "c": 157.84800720214844,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 158.0679931640625,
        "h": 158.83900451660156,
        "l": 157.8699951171875,
        "c": 158.11399841308594,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 159.09300231933594,
        "h": 159.28399658203125,
        "l": 158.572998046875,
        "c": 159.0749969482422,
        "v": 0
      },
      {
        "t": 1773380827,
        "date": "2026-03-13T05:47:07.000Z",
        "o": 159.35699462890625,
        "h": 159.6840057373047,
        "l": 159.00100708007812,
        "c": 159.41700744628906,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -1.7703896276191031,
        "distanceFromATL": 59.75716315517187,
        "majorSupport": 139.5780029296875,
        "majorResistance": 161.94200134277344,
        "ema52w": 150.5134024986854
      },
      "daily3y": {
        "trend": "range",
        "sma200": 151.57276962280272,
        "sma50": 156.29437957763673,
        "rsi14": 65.71241944598262,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 159.6840057373047,
        "low52w": 139.89199829101562,
        "volatility20d": 6.575736484431465,
        "volumeVsAvg": 1,
        "recentBreakout": true
      }
    },
    "technicals": {
      "sma20": 156.2681999206543,
      "sma50": 156.29437957763673,
      "rsi14": 65.71241944598262,
      "trend": "neutral",
      "volumeAnomaly": 1,
      "supports": [
        152.7010040283203
      ],
      "resistances": [
        159.6840057373047,
        160
      ],
      "high20d": 159.6840057373047,
      "low20d": 152.7010040283203,
      "isNear52wHigh": true,
      "isNear52wLow": false,
      "dramaScore": 13.823365188663868
    }
  },
  {
    "symbol": "GBPUSD=X",
    "name": "GBP/USD",
    "price": 1.338186502456665,
    "change": -0.003717184066772461,
    "changePct": -0.27700826103271436,
    "candles": [],
    "high24h": 1.3409498929977417,
    "low24h": 1.3341693878173828,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 1.361952543258667,
        "h": 1.364628791809082,
        "l": 1.3592127561569214,
        "c": 1.3620266914367676,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 1.3647406101226807,
        "h": 1.3662508726119995,
        "l": 1.3627134561538696,
        "c": 1.3647778034210205,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 1.36286199092865,
        "h": 1.3629549741744995,
        "l": 1.349800944328308,
        "c": 1.3627691268920898,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 1.3564103841781616,
        "h": 1.3582342863082886,
        "l": 1.3534547090530396,
        "c": 1.3564472198486328,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 1.349545955657959,
        "h": 1.3517532348632812,
        "l": 1.3435261249542236,
        "c": 1.349582314491272,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 1.3460580110549927,
        "h": 1.3514243364334106,
        "l": 1.3436344861984253,
        "c": 1.3461124897003174,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 1.352868676185608,
        "h": 1.3535646200180054,
        "l": 1.3477815389633179,
        "c": 1.3533265590667725,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 1.3496370315551758,
        "h": 1.353747844696045,
        "l": 1.3471460342407227,
        "c": 1.34969162940979,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 1.3496370315551758,
        "h": 1.3551236391067505,
        "l": 1.349199891090393,
        "c": 1.3497462272644043,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 1.355821967124939,
        "h": 1.3574045896530151,
        "l": 1.3497098684310913,
        "c": 1.3558034896850586,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 1.3492363691329956,
        "h": 1.350548267364502,
        "l": 1.3441762924194336,
        "c": 1.3491452932357788,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 1.340752124786377,
        "h": 1.3456594944000244,
        "l": 1.3316820859909058,
        "c": 1.3406623601913452,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 1.3408960103988647,
        "h": 1.3425161838531494,
        "l": 1.325486421585083,
        "c": 1.3410578966140747,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 1.335309624671936,
        "h": 1.3404645919799805,
        "l": 1.3305480480194092,
        "c": 1.3353630304336548,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 1.3369520902633667,
        "h": 1.3386342525482178,
        "l": 1.3301233053207397,
        "c": 1.3369520902633667,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 1.3356841802597046,
        "h": 1.3408780097961426,
        "l": 1.3313806056976318,
        "c": 1.3357375860214233,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 1.3307074308395386,
        "h": 1.3398720026016235,
        "l": 1.3284975290298462,
        "c": 1.3301055431365967,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 1.3423900604248047,
        "h": 1.3481448888778687,
        "l": 1.3415075540542603,
        "c": 1.3424980640411377,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 1.3421918153762817,
        "h": 1.3457320928573608,
        "l": 1.3395847082138062,
        "c": 1.3419036865234375,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 1.3380612134933472,
        "h": 1.3409498929977417,
        "l": 1.3341693878173828,
        "c": 1.338186502456665,
        "v": 0
      },
      {
        "t": 1773380814,
        "date": "2026-03-13T05:46:54.000Z",
        "o": 1.334507703781128,
        "h": 1.337005615234375,
        "l": 1.332924485206604,
        "c": 1.3333511352539062,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "range",
        "distanceFromATH": -10.471307368375214,
        "distanceFromATL": 28.93159328378609,
        "majorSupport": 1.2101263999938965,
        "majorResistance": 1.3846771717071533,
        "ema52w": 1.3392123029782221
      },
      "daily3y": {
        "trend": "range",
        "sma200": 1.344193441271782,
        "sma50": 1.3519588804244995,
        "rsi14": 39.34335044919906,
        "aboveSma200": false,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 1.3846771717071533,
        "low52w": 1.2722808122634888,
        "volatility20d": 6.181839885282385,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 1.3456610023975373,
      "sma50": 1.3519588804244995,
      "rsi14": 39.34335044919906,
      "trend": "bearish",
      "volumeAnomaly": 1,
      "supports": [
        1.325486421585083,
        1.3
      ],
      "resistances": [
        1.3662508726119995
      ],
      "high20d": 1.3662508726119995,
      "low20d": 1.325486421585083,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 7.831024783098143
    }
  },
  {
    "symbol": "USDCHF=X",
    "name": "USD/CHF",
    "price": 0.7817400097846985,
    "change": 0.0031620264053344727,
    "changePct": 0.4061284126748505,
    "candles": [],
    "high24h": 0.7850300073623657,
    "low24h": 0.7800999879837036,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 0.7694200277328491,
        "h": 0.7715100049972534,
        "l": 0.7675600051879883,
        "c": 0.7695500254631042,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 0.7681800127029419,
        "h": 0.7703199982643127,
        "l": 0.767799973487854,
        "c": 0.7682099938392639,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 0.7696099877357483,
        "h": 0.7738400101661682,
        "l": 0.7684999704360962,
        "c": 0.769599974155426,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 0.7701900005340576,
        "h": 0.7722300291061401,
        "l": 0.7698000073432922,
        "c": 0.7702000141143799,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 0.7724599838256836,
        "h": 0.7762200236320496,
        "l": 0.7718999981880188,
        "c": 0.7721999883651733,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 0.77538001537323,
        "h": 0.7771099805831909,
        "l": 0.7731900215148926,
        "c": 0.7753400206565857,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 0.7718899846076965,
        "h": 0.7766900062561035,
        "l": 0.7710300087928772,
        "c": 0.7717000246047974,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 0.7742400169372559,
        "h": 0.7764999866485596,
        "l": 0.7730000019073486,
        "c": 0.7742300033569336,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 0.7738000154495239,
        "h": 0.7756699919700623,
        "l": 0.7717999815940857,
        "c": 0.7737299799919128,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 0.772072970867157,
        "h": 0.7753199934959412,
        "l": 0.7710000276565552,
        "c": 0.7721400260925293,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 0.7732399702072144,
        "h": 0.773829996585846,
        "l": 0.7670999765396118,
        "c": 0.7732300162315369,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 0.7695000171661377,
        "h": 0.7812700271606445,
        "l": 0.7678099870681763,
        "c": 0.7695299983024597,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 0.7787700295448303,
        "h": 0.7878000140190125,
        "l": 0.7785199880599976,
        "c": 0.7787100076675415,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 0.7820199728012085,
        "h": 0.7833999991416931,
        "l": 0.7789000272750854,
        "c": 0.7819200158119202,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 0.7791600227355957,
        "h": 0.7832000255584717,
        "l": 0.777999997138977,
        "c": 0.7791500091552734,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 0.7807499766349792,
        "h": 0.7825400233268738,
        "l": 0.7771999835968018,
        "c": 0.7806599736213684,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 0.7811200022697449,
        "h": 0.7824599742889404,
        "l": 0.7777000069618225,
        "c": 0.781220018863678,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 0.7779600024223328,
        "h": 0.778219997882843,
        "l": 0.7746000289916992,
        "c": 0.7778800129890442,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 0.7784900069236755,
        "h": 0.7805299758911133,
        "l": 0.7764999866485596,
        "c": 0.778577983379364,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 0.7818599939346313,
        "h": 0.7850300073623657,
        "l": 0.7800999879837036,
        "c": 0.7817400097846985,
        "v": 0
      },
      {
        "t": 1773380827,
        "date": "2026-03-13T05:47:07.000Z",
        "o": 0.7857699990272522,
        "h": 0.7872800230979919,
        "l": 0.7846500277519226,
        "c": 0.7869200110435486,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bear",
        "distanceFromATH": -24.34090438416396,
        "distanceFromATL": 2.469526158306,
        "majorSupport": 0.7628999948501587,
        "majorResistance": 0.922249972820282,
        "ema52w": 0.8033128254688703
      },
      "daily3y": {
        "trend": "range",
        "sma200": 0.7962358927726746,
        "sma50": 0.7810618793964386,
        "rsi14": 61.309405395100995,
        "aboveSma200": false,
        "goldenCross": false
      },
      "daily1y": {
        "trend": "range",
        "high52w": 0.8852999806404114,
        "low52w": 0.7628999948501587,
        "volatility20d": 6.377712861626381,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 0.7758444041013718,
      "sma50": 0.7810618793964386,
      "rsi14": 61.309405395100995,
      "trend": "neutral",
      "volumeAnomaly": 1,
      "supports": [
        0.78,
        0.7670999765396118
      ],
      "resistances": [
        0.7878000140190125,
        0.79
      ],
      "high20d": 0.7878000140190125,
      "low20d": 0.7670999765396118,
      "isNear52wHigh": false,
      "isNear52wLow": false,
      "dramaScore": 11.218385238024553
    }
  },
  {
    "symbol": "AUDUSD=X",
    "name": "AUD/USD",
    "price": 0.7129209637641907,
    "change": 0.0008208751678466797,
    "changePct": 0.11527525146988082,
    "candles": [],
    "high24h": 0.7161097526550293,
    "low24h": 0.7073701620101929,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 0.7087298035621643,
        "h": 0.7096999883651733,
        "l": 0.7045498490333557,
        "c": 0.7087101936340332,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 0.7070286273956299,
        "h": 0.7096476554870605,
        "l": 0.7068701386451721,
        "c": 0.7070400714874268,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 0.7074001431465149,
        "h": 0.7076299786567688,
        "l": 0.7030000686645508,
        "c": 0.7072985768318176,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 0.7083502411842346,
        "h": 0.7086167335510254,
        "l": 0.7052186131477356,
        "c": 0.708320140838623,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 0.7044098973274231,
        "h": 0.7080999612808228,
        "l": 0.7028394937515259,
        "c": 0.704379141330719,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 0.7056799530982971,
        "h": 0.7090101838111877,
        "l": 0.7016707062721252,
        "c": 0.7056102752685547,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 0.7107800245285034,
        "h": 0.7107901573181152,
        "l": 0.7049899101257324,
        "c": 0.7111399173736572,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 0.7060800194740295,
        "h": 0.7073501348495483,
        "l": 0.7027500867843628,
        "c": 0.706070065498352,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 0.7058901786804199,
        "h": 0.7117002010345459,
        "l": 0.7057900428771973,
        "c": 0.7060999870300293,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 0.7120001912117004,
        "h": 0.7137249112129211,
        "l": 0.7069686055183411,
        "c": 0.7120498418807983,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 0.7103100419044495,
        "h": 0.7132998704910278,
        "l": 0.7086700201034546,
        "c": 0.71017986536026,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 0.7058010101318359,
        "h": 0.7117002010345459,
        "l": 0.7045598030090332,
        "c": 0.7058109045028687,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 0.7101717591285706,
        "h": 0.7122502326965332,
        "l": 0.694550096988678,
        "c": 0.710580050945282,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 0.7038684487342834,
        "h": 0.7075598239898682,
        "l": 0.6986899971961975,
        "c": 0.7040701508522034,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 0.7073701620101929,
        "h": 0.7088498473167419,
        "l": 0.6985001564025879,
        "c": 0.7075998783111572,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 0.7009299993515015,
        "h": 0.7047101855278015,
        "l": 0.6978698372840881,
        "c": 0.7011299729347229,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 0.6968786716461182,
        "h": 0.7048498392105103,
        "l": 0.6956908702850342,
        "c": 0.6966199278831482,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 0.706669807434082,
        "h": 0.7153300642967224,
        "l": 0.705390214920044,
        "c": 0.7068586349487305,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 0.7121898531913757,
        "h": 0.7184578776359558,
        "l": 0.7118704319000244,
        "c": 0.712100088596344,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 0.7128300070762634,
        "h": 0.7161097526550293,
        "l": 0.7073701620101929,
        "c": 0.7129209637641907,
        "v": 0
      },
      {
        "t": 1773380814,
        "date": "2026-03-13T05:46:54.000Z",
        "o": 0.7076139450073242,
        "h": 0.7094714641571045,
        "l": 0.7061647772789001,
        "c": 0.7065140604972839,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bull",
        "distanceFromATH": -13.138925675603055,
        "distanceFromATL": 29.152337797634477,
        "majorSupport": 0.5923082828521729,
        "majorResistance": 0.7184578776359558,
        "ema52w": 0.6606836937941037
      },
      "daily3y": {
        "trend": "bull",
        "sma200": 0.6648784777522088,
        "sma50": 0.6946426069736481,
        "rsi14": 52.55596464279336,
        "aboveSma200": true,
        "goldenCross": true
      },
      "daily1y": {
        "trend": "range",
        "high52w": 0.7184578776359558,
        "low52w": 0.5923082828521729,
        "volatility20d": 10.662068034655078,
        "volumeVsAvg": 1,
        "recentBreakout": true
      }
    },
    "technicals": {
      "sma20": 0.7071196258068084,
      "sma50": 0.6946426069736481,
      "rsi14": 52.55596464279336,
      "trend": "bullish",
      "volumeAnomaly": 1,
      "supports": [
        0.71,
        0.694550096988678
      ],
      "resistances": [
        0.7184578776359558,
        0.72
      ],
      "high20d": 0.7184578776359558,
      "low20d": 0.694550096988678,
      "isNear52wHigh": true,
      "isNear52wLow": false,
      "dramaScore": 12.345825754409642
    }
  },
  {
    "symbol": "USDCAD=X",
    "name": "USD/CAD",
    "price": 1.3601700067520142,
    "change": 0.001880049705505371,
    "changePct": 0.13841298728243465,
    "candles": [],
    "high24h": 1.3632800579071045,
    "low24h": 1.3574999570846558,
    "dailyCandles": [
      {
        "t": 1770940800,
        "date": "2026-02-13T00:00:00.000Z",
        "o": 1.3611700534820557,
        "h": 1.3636499643325806,
        "l": 1.3597899675369263,
        "c": 1.3610700368881226,
        "v": 0
      },
      {
        "t": 1771200000,
        "date": "2026-02-16T00:00:00.000Z",
        "o": 1.361780047416687,
        "h": 1.363420009613037,
        "l": 1.3602900505065918,
        "c": 1.3617899417877197,
        "v": 0
      },
      {
        "t": 1771286400,
        "date": "2026-02-17T00:00:00.000Z",
        "o": 1.3635900020599365,
        "h": 1.3691500425338745,
        "l": 1.3631999492645264,
        "c": 1.3636200428009033,
        "v": 0
      },
      {
        "t": 1771372800,
        "date": "2026-02-18T00:00:00.000Z",
        "o": 1.3637399673461914,
        "h": 1.3677699565887451,
        "l": 1.363700032234192,
        "c": 1.3637700080871582,
        "v": 0
      },
      {
        "t": 1771459200,
        "date": "2026-02-19T00:00:00.000Z",
        "o": 1.3696199655532837,
        "h": 1.371399998664856,
        "l": 1.3669999837875366,
        "c": 1.3696099519729614,
        "v": 0
      },
      {
        "t": 1771545600,
        "date": "2026-02-20T00:00:00.000Z",
        "o": 1.3687900304794312,
        "h": 1.3707799911499023,
        "l": 1.3673900365829468,
        "c": 1.3686800003051758,
        "v": 0
      },
      {
        "t": 1771804800,
        "date": "2026-02-23T00:00:00.000Z",
        "o": 1.3651399612426758,
        "h": 1.3698699474334717,
        "l": 1.3649100065231323,
        "c": 1.3648500442504883,
        "v": 0
      },
      {
        "t": 1771891200,
        "date": "2026-02-24T00:00:00.000Z",
        "o": 1.3693699836730957,
        "h": 1.3724700212478638,
        "l": 1.36899995803833,
        "c": 1.369379997253418,
        "v": 0
      },
      {
        "t": 1771977600,
        "date": "2026-02-25T00:00:00.000Z",
        "o": 1.3702000379562378,
        "h": 1.3705799579620361,
        "l": 1.367400050163269,
        "c": 1.3700300455093384,
        "v": 0
      },
      {
        "t": 1772064000,
        "date": "2026-02-26T00:00:00.000Z",
        "o": 1.3675700426101685,
        "h": 1.3710500001907349,
        "l": 1.3657000064849854,
        "c": 1.3675800561904907,
        "v": 0
      },
      {
        "t": 1772150400,
        "date": "2026-02-27T00:00:00.000Z",
        "o": 1.3676300048828125,
        "h": 1.3683899641036987,
        "l": 1.3628699779510498,
        "c": 1.3675800561904907,
        "v": 0
      },
      {
        "t": 1772409600,
        "date": "2026-03-02T00:00:00.000Z",
        "o": 1.3667999505996704,
        "h": 1.3716800212860107,
        "l": 1.3640700578689575,
        "c": 1.3668400049209595,
        "v": 0
      },
      {
        "t": 1772496000,
        "date": "2026-03-03T00:00:00.000Z",
        "o": 1.3672300577163696,
        "h": 1.375249981880188,
        "l": 1.3660399913787842,
        "c": 1.3671000003814697,
        "v": 0
      },
      {
        "t": 1772582400,
        "date": "2026-03-04T00:00:00.000Z",
        "o": 1.3675299882888794,
        "h": 1.369920015335083,
        "l": 1.3644399642944336,
        "c": 1.3674099445343018,
        "v": 0
      },
      {
        "t": 1772668800,
        "date": "2026-03-05T00:00:00.000Z",
        "o": 1.3644100427627563,
        "h": 1.3714699745178223,
        "l": 1.3615599870681763,
        "c": 1.364400029182434,
        "v": 0
      },
      {
        "t": 1772755200,
        "date": "2026-03-06T00:00:00.000Z",
        "o": 1.367050051689148,
        "h": 1.3671200275421143,
        "l": 1.3596999645233154,
        "c": 1.3669899702072144,
        "v": 0
      },
      {
        "t": 1773014400,
        "date": "2026-03-09T00:00:00.000Z",
        "o": 1.3603099584579468,
        "h": 1.3605300188064575,
        "l": 1.3525999784469604,
        "c": 1.3602099418640137,
        "v": 0
      },
      {
        "t": 1773100800,
        "date": "2026-03-10T00:00:00.000Z",
        "o": 1.3589999675750732,
        "h": 1.3601100444793701,
        "l": 1.354200005531311,
        "c": 1.358739972114563,
        "v": 0
      },
      {
        "t": 1773187200,
        "date": "2026-03-11T00:00:00.000Z",
        "o": 1.3581199645996094,
        "h": 1.3602700233459473,
        "l": 1.3553999662399292,
        "c": 1.3582899570465088,
        "v": 0
      },
      {
        "t": 1773273600,
        "date": "2026-03-12T00:00:00.000Z",
        "o": 1.360319972038269,
        "h": 1.3632800579071045,
        "l": 1.3574999570846558,
        "c": 1.3601700067520142,
        "v": 0
      },
      {
        "t": 1773380828,
        "date": "2026-03-13T05:47:08.000Z",
        "o": 1.3636800050735474,
        "h": 1.3646999597549438,
        "l": 1.361799955368042,
        "c": 1.3645999431610107,
        "v": 0
      }
    ],
    "multiTF": {
      "weekly10y": {
        "trend": "bear",
        "distanceFromATH": -8.040699281649378,
        "distanceFromATL": 24.73360582484216,
        "majorSupport": 1.090459942817688,
        "majorResistance": 1.479099988937378,
        "ema52w": 1.3823446195859175
      },
      "daily3y": {
        "trend": "range",
        "sma200": 1.3799441027641297,
        "sma50": 1.3701613998413087,
        "rsi14": 48.91002762456512,
        "aboveSma200": false,
        "goldenCross": false
      },
      "daily1y": {
        "trend": "range",
        "high52w": 1.4413800239562988,
        "low52w": 1.3483999967575073,
        "volatility20d": 3.368389407987841,
        "volumeVsAvg": 1,
        "recentBreakout": false
      }
    },
    "technicals": {
      "sma20": 1.3650819957256317,
      "sma50": 1.3701613998413087,
      "rsi14": 48.91002762456512,
      "trend": "bearish",
      "volumeAnomaly": 1,
      "supports": [
        1.3525999784469604
      ],
      "resistances": [
        1.375249981880188,
        1.4000000000000001
      ],
      "high20d": 1.375249981880188,
      "low20d": 1.3525999784469604,
      "isNear52wHigh": false,
      "isNear52wLow": true,
      "dramaScore": 7.4152389618473045
    }
  }
];

export const SAMPLE_NEWS: NewsItem[] = [
  {
    "title": "Review &amp; Preview: Economic Fallout",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/m/b387516d-9edd-3857-bb5b-2779d9978d08/review-%26-preview%3A-economic.html?.tsrc=rss",
    "publishedAt": "2026-03-12T23:55:00.000Z",
    "summary": "Investors are coming to grips with the potential for a longer war in Iran—and its impact on the U.S. economy.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Asia-Pacific markets set to open lower as investors brace for a prolonged Iran war",
    "source": "Marketaux/cnbc.com",
    "url": "https://www.cnbc.com/2026/03/13/asia-pacific-markets-today-nikkei-225-kospi-hang-seng-csi300.html",
    "publishedAt": "2026-03-12T23:54:58.000000Z",
    "summary": "Iran's new Supreme Leader Mojtaba Khamenei said in a late Thursday speech that the Strait of Hormuz, a vital artery for global oil trade, should remain shut.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "SACO online sales up 59% in 2025, expansion plans under review: CEO",
    "source": "Marketaux/argaam.com",
    "url": "https://www.argaam.com/en/article/articledetail/id/1887662",
    "publishedAt": "2026-03-12T23:51:00.000000Z",
    "summary": "Abdel-Salam Bdeir, CEO of Saudi Company for Hardware (SACO), said the company’s online sales grew notably in 2025, leaping 59% compared with 2024.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "The S&amp;P 500’s 1.5% Selloff Is Driven By A Few Key Factors",
    "source": "Yahoo Finance",
    "url": "https://247wallst.com/investing/2026/03/12/the-sp-500s-1-5-selloff-is-driven-by-a-few-key-factors/?.tsrc=rss",
    "publishedAt": "2026-03-12T23:48:20.000Z",
    "summary": "The S&amp;P 500 closed at 666.06 on Thursday, falling 1.52% as Iranian strikes on two oil tankers sent crude prices surging toward $100 a barrel, reigniting inflation fears and triggering a broad selloff that spared almost no sector except energy. Reuters described it as the S&amp;P 500’s biggest three-day percentage drop in a month, with ... The S&amp;P 500’s 1.5% Selloff Is Driven By A Few Key Factors",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Forte Energy Completes Acquisition of Large Oil Lease Position in Alaska",
    "source": "Marketaux/smallcaps.com.au",
    "url": "https://smallcaps.com.au/article/forte-energy-completes-acquisition-of-large-oil-lease-position-in-alaska",
    "publishedAt": "2026-03-12T23:47:01.000000Z",
    "summary": "Forte Energy clinches 143,368-acre Alaska NPR-A lease position; 2026 suspension cuts ~$430k fees, fueling farmouts as Harrier targets >1B barrels.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Ben Affleck Once Criticized AI, Now Netflix Is Buying His AI Startup For $600 Million",
    "source": "Marketaux/zerohedge.com",
    "url": "https://www.zerohedge.com/markets/ben-affleck-once-criticized-ai-now-netflix-buying-his-ai-startup-600-million",
    "publishedAt": "2026-03-12T23:45:00.000000Z",
    "summary": "ZeroHedge - On a long enough timeline, the survival rate for everyone drops to zero",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Funko targets $70M–$80M adjusted EBITDA for 2026 as company advances international growth and licensing renewals (NASDAQ:FNKO)",
    "source": "Marketaux/seekingalpha.com",
    "url": "https://seekingalpha.com/news/4564097-funko-targets-70m-80m-adjusted-ebitda-for-2026-as-company-advances-international-growth-and",
    "publishedAt": "2026-03-12T23:42:45.000000Z",
    "summary": "Funko (FNKO) Q4 2025 earnings call recap: net sales +9%, 2026 guidance up to $80M EBITDA, margin outlook, tariffs, growth plans—read now.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Funko, Inc. (FNKO) Q4 2025 Earnings Call Transcript",
    "source": "Marketaux/seekingalpha.com",
    "url": "https://seekingalpha.com/article/4881905-funko-inc-fnko-q4-2025-earnings-call-transcript",
    "publishedAt": "2026-03-12T23:42:21.000000Z",
    "summary": "Funko, Inc. (FNKO) Q4 2025 Earnings Call March 12, 2026 4:30 PM EDTCompany ParticipantsKatie WilsonJosh Simon - CEO & DirectorYves Le Pendeven - CFO,...",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Turtle Beach targets $335M–$355M revenue for 2026 as product launches and GTA 6 drive outlook (NASDAQ:TBCH)",
    "source": "Marketaux/seekingalpha.com",
    "url": "https://seekingalpha.com/news/4564095-turtle-beach-targets-335m-355m-revenue-for-2026-as-product-launches-and-gta-6-drive-outlook",
    "publishedAt": "2026-03-12T23:32:59.000000Z",
    "summary": "Turtle Beach (TBCH) Q4 2025 earnings call recap: revenue down, margins up, 2026 outlook, GTA 6 impact, and buybacks.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Karat Packaging outlines low double-digit sales growth for 2026 while advancing paper bag expansion (NASDAQ:KRT)",
    "source": "Marketaux/seekingalpha.com",
    "url": "https://seekingalpha.com/news/4564093-karat-packaging-outlines-low-double-digit-sales-growth-for-2026-while-advancing-paper-bag",
    "publishedAt": "2026-03-12T23:32:57.000000Z",
    "summary": "Karat Packaging (KRT) Q4 2025 earnings call recap: 13.7% sales growth, paper bag momentum, margins and 2026 guidance.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Turtle Beach Corporation (TBCH) Q4 2025 Earnings Call Transcript",
    "source": "Marketaux/seekingalpha.com",
    "url": "https://seekingalpha.com/article/4881928-turtle-beach-corporation-tbch-q4-2025-earnings-call-transcript",
    "publishedAt": "2026-03-12T23:32:22.000000Z",
    "summary": "Turtle Beach Corporation (TBCH) Q4 2025 Earnings Call March 12, 2026 5:00 PM EDTCompany ParticipantsCristopher Keirn - CEO & DirectorMark Weinswig - CFO...",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "Gold pulls back as IEA fires historic reserve salvo — but the market is still not buying it - KITCO",
    "source": "Google News EN",
    "url": "https://news.google.com/rss/articles/CBMitwFBVV95cUxQY3ctdmdGZmZYTVNSVkF6ODdOVWs3OVdWVi1vLVRCYkQyc3A3QTNER1RabG82NGQ1UV9XSzVWNzJKbGFkR0dTbWZKVDRsaVNOcnBXRFhROU5LX3ZFanNvaks1bUhkci1OSjFaQ2dHd3o1UnY1Ni1QODFBLTZ6RVgwUVp1dS0td0tEbDBvUEFyX3M5aGNQU3NwOVZUQld3ck1pVjQ4RWIxUFQ5VnZ4eHNDUVQ3Q2k4blE?oc=5",
    "publishedAt": "2026-03-12T23:30:35.000Z",
    "summary": "&lt;a href=\"https://news.google.com/rss/articles/CBMitwFBVV95cUxQY3ctdmdGZmZYTVNSVkF6ODdOVWs3OVdWVi1vLVRCYkQyc3A3QTNER1RabG82NGQ1UV9XSzVWNzJKbGFkR0dTbWZKVDRsaVNOcnBXRFhROU5LX3ZFanNvaks1bUhkci1OSjFaQ2dHd3o1UnY1Ni1QODFBLTZ6RVgwUVp1dS0td0tEbDBvUEFyX3M5aGNQU3NwOVZUQld3ck1pVjQ4RWIxUFQ5VnZ4eHNDUVQ3Q2k4blE?oc=5\" target=\"_blank\"&gt;Gold pulls back as IEA fires historic reserve salvo — but the market is still not buying it&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color=\"#6f6f6f\"&gt;KITCO&lt;/font&gt;",
    "category": "commodities",
    "lang": "en"
  },
  {
    "title": "As Crude Oil Prices Whipsaw, Buy These 3 High-Yield Dividend Stocks Now",
    "source": "Yahoo Finance",
    "url": "https://www.barchart.com/story/news/725714/as-crude-oil-prices-whipsaw-buy-these-3-high-yield-dividend-stocks-now?.tsrc=rss",
    "publishedAt": "2026-03-12T23:30:02.000Z",
    "summary": "With WTI swinging as high as $119 before settling in the mid‑$90s on Hormuz disruption, Westlake Chemical Partners, SunCoke Energy, and AngloGold Ashanti give income investors a rare combination of high yields, low betas, and real‑asset exposure that can cushion portfolios if energy-driven volatility sticks around.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Friday&apos;s big stock stories: What’s likely to move the market in the next trading session",
    "source": "CNBC Investing",
    "url": "https://www.cnbc.com/2026/03/12/fridays-big-stock-stories-whats-likely-to-move-the-market.html",
    "publishedAt": "2026-03-12T23:24:40.000Z",
    "summary": "Stocks fell on Thursday as oil prices continued their surge. The Dow Industrials closed below 47,000 for the first time in 2026.",
    "category": "macro",
    "lang": "en"
  },
  {
    "title": "LKQ and Caesars Entertainment Shares Plummet, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/lkq-caesars-entertainment-shares-plummet-230651288.html?.tsrc=rss",
    "publishedAt": "2026-03-12T23:06:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "YETI, Callaway Golf Company, Clarus, American Airlines, and United Airlines Shares Are Falling, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/yeti-callaway-golf-company-clarus-230651550.html?.tsrc=rss",
    "publishedAt": "2026-03-12T23:06:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "H Partners Buys Another $19 Million in Advance Auto Parts Amid Stock's Ongoing Turnaround",
    "source": "Yahoo Finance",
    "url": "https://www.fool.com/coverage/filings/2026/03/12/h-partners-buys-another-usd19-million-in-advance-auto-parts-amid-stock-s-ongoing-turnaround/?.tsrc=rss",
    "publishedAt": "2026-03-12T23:03:50.000Z",
    "summary": "Advance Auto Parts delivers automotive parts and services to both professional installers and retail customers across North America.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Norwegian Cruise Line, Hilton Grand Vacations, Marriott Vacations, United Parks &amp; Resorts, and Polaris Stocks Trade Down, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/norwegian-cruise-line-hilton-grand-230151018.html?.tsrc=rss",
    "publishedAt": "2026-03-12T23:01:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Latham, Peloton, Zillow, AMC Networks, and Charter Shares Plummet, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/latham-peloton-zillow-amc-networks-225651998.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:56:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Stock market today: Dow, S&amp;P 500, Nasdaq futures climb after stocks sink to lowest levels since November",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/live/stock-market-today-dow-sp-500-nasdaq-futures-climb-after-stocks-sink-to-lowest-levels-since-november-225332094.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:53:32.000Z",
    "summary": "Oil prices continue to surge as the Iran war escalates, damaging supply chains across the region.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Funko, Matthews, Lovesac, iHeartMedia, and Caleres Shares Plummet, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/funko-matthews-lovesac-iheartmedia-caleres-225151729.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:51:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Wall Street en nette baisse, la guerre et les prix du pétrole pèsent",
    "source": "EasyBourse",
    "url": "https://www.easybourse.com/marches/point-tendance/66371/wall-street-en-nette-baisse-guerre-prix-petrole-pesent.html",
    "publishedAt": "2026-03-12T22:49:22.000Z",
    "summary": "par Stephen Culp NEW YORK, 12 mars (Reuters) -     La Bourse de New York a ?fini en nette baisse jeudi, alors que les frappes de l&amp;apos;Iran contre deux p&eacute;troliers ont mis en exergue l&amp;apos;intensification ?du conflit au Moyen-Orient et fait remonter les prix du p&eacute;trole au-dessus...",
    "category": "macro",
    "lang": "fr"
  },
  {
    "title": "Wall Street en nette baisse, la guerre et les prix du pÃ©trole pÃ¨sent",
    "source": "Marketaux/easybourse.com",
    "url": "https://www.easybourse.com/marches/point-tendance/66371/wall-street-en-nette-baisse-guerre-prix-petrole-pesent.html",
    "publishedAt": "2026-03-12T22:49:22.000000Z",
    "summary": "Tendance publiÃ©e le 12/03/2026. par Stephen Culp   NEW YORK, 12 mars (Reuters) -     La Bourse de New York a ?fini en nette...",
    "category": "macro",
    "lang": "fr"
  },
  {
    "title": "Stricter MiCA rules could thin crypto industry across the EU, says Swiss wealth manager",
    "source": "CoinDesk",
    "url": "https://www.coindesk.com/policy/2026/03/12/stricter-mica-rules-could-thin-crypto-industry-across-the-european-union-swissborg-says",
    "publishedAt": "2026-03-12T22:47:43.000Z",
    "summary": "Crypto wealth manager Swissborg gets MiCA approval and prepares to move its European operations to France while targeting growth in markets including Germany, Italy and Spain.",
    "category": "crypto",
    "lang": "en"
  },
  {
    "title": "VF Corp, Oxford Industries, Gray Television, Steven Madden, and Hyatt Hotels Stocks Trade Down, What You Need To Know",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/vf-corp-oxford-industries-gray-224651097.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:46:51.000Z",
    "summary": "A number of stocks fell in the afternoon session after the war with Iran pushed oil prices back to US$100 per barrel, fueling fears of a prolonged conflict and its impact on global inflation.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Wall St ends sharply lower as Iran war, soaring crude prompt selloff",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/video/wall-st-ends-sharply-lower-224418366.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:44:18.000Z",
    "summary": "&lt;body&gt;&lt;p&gt;STORY: U.S. stocks fell sharply on Thursday, with the Dow and S&amp;P 500 losing more than one-and-a-half percent and the Nasdaq sliding over one-and-three-quarters of a percent.&lt;/p&gt;&lt;p&gt;Iranian strikes on two oil tankers sent crude prices above $100 per barrel, further exacerbating inflation fears.&lt;/p&gt;&lt;p&gt;The surge in oil prices comes as the U.S. Federal Reserve prepares for its policy meeting next week.&lt;/p&gt;&lt;p&gt;While investors just a few weeks ago were betting on a June interest rate cut from the Fed, those odds have shifted significantly, says Kevin Nicholson, global fixed income chief investment officer at RiverFront Investment Group.&lt;/p&gt;&lt;p&gt;\"There's a strong possibility that there might not be any rate cuts this year, especially, a lot of that is going to depend on the length of this war, and how quickly we can turn the pumps back on for the oil market. Because the longer that delay goes, it's going to mean that oil prices will stay elevated for longer. That will create more inflation, that can also hurt the economy and potentially the labor market and slow down growth. And so if you have slower growth with higher inflation, you get stagflation and that's just going to feed on itself.\"&lt;/p&gt;&lt;p&gt;Among Thursday's stock moves, big banks fell on rising credit quality concerns.&lt;/p&gt;&lt;p&gt;Morgan Stanley slid 4% after limiting redemptions at one of its private credit funds, while shares of JPMorgan Chase dropped after the bank reduced the value of some loans to private credit funds.&lt;/p&gt;&lt;p&gt;Shares of Adobe, which closed lower, slid more than 7% in extended trading after the company's longtime CEO said he will leave his role once a successor is appointed, as the software firm grapples with AI disruption.&lt;/p&gt;&lt;p&gt;Shares of Dollar General slid 6% after the discount retailer forecast soft full-year sales, as budget‑conscious shoppers grow more selective with their purchases.&lt;/p&gt;&lt;p&gt;And shares of once-popular digital media company BuzzFeed, down 6% at the close, dropped another 16% in extended trading after the company flagged doubts about its future and said it will not provide a forecast for 2026.&lt;/p&gt;&lt;/body&gt;",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "1 S&amp;P 500 Stock Worth Your Attention and 2 We Question",
    "source": "Yahoo Finance",
    "url": "https://finance.yahoo.com/news/1-p-500-stock-worth-223651876.html?.tsrc=rss",
    "publishedAt": "2026-03-12T22:36:51.000Z",
    "summary": "The S&amp;P 500 (^GSPC) is often seen as a benchmark for strong businesses, but that doesn’t mean every stock is worth owning. Some companies face significant challenges, whether it’s stagnating growth, heavy debt, or disruptive new competitors.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Should You Really Buy Stocks During Market Turbulence? These Words From Investing Giant Warren Buffett Offer an Answer That's Strikingly Clear.",
    "source": "Yahoo Finance",
    "url": "https://www.fool.com/investing/2026/03/12/should-you-really-buy-stocks-during-market-turbule/?.tsrc=rss",
    "publishedAt": "2026-03-12T22:35:00.000Z",
    "summary": "The famous investor has delivered 60 years of market-beating returns.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Weak Jobs Data and Rising Oil Prices at the Same Time: Why Investors Are Now Facing a Much Harder Market to Read",
    "source": "Yahoo Finance",
    "url": "https://www.fool.com/investing/2026/03/12/weak-jobs-data-and-rising-oil-prices-at-the-same-t/?.tsrc=rss",
    "publishedAt": "2026-03-12T22:35:00.000Z",
    "summary": "Uncertainty is a big problem on Wall Street, and the outlook is highly uncertain today.",
    "category": "indices",
    "lang": "en"
  },
  {
    "title": "Crypto Price Prediction Today 12 March – XRP, Bitcoin, Ethereum - Cryptonews",
    "source": "Google News EN",
    "url": "https://news.google.com/rss/articles/CBMikgFBVV95cUxQeWtPcXN3ZW9YdGpoYVJWckdSN2YzbnpMUjNVbFc4YndUUTFpdzNoTkdYSlRJVGFSV3daUXUycWhpeVZiWk5fUHoyRmw1cGlnZEgtRWlQaHRfdFhtNzk3RFkyZ1NzSldsSmlYend5XzQ0WmFpWk5Bc1oycTRaN0hWcGVYQWIzbkM0SUNxSkVUTS1SZw?oc=5",
    "publishedAt": "2026-03-12T22:35:00.000Z",
    "summary": "&lt;a href=\"https://news.google.com/rss/articles/CBMikgFBVV95cUxQeWtPcXN3ZW9YdGpoYVJWckdSN2YzbnpMUjNVbFc4YndUUTFpdzNoTkdYSlRJVGFSV3daUXUycWhpeVZiWk5fUHoyRmw1cGlnZEgtRWlQaHRfdFhtNzk3RFkyZ1NzSldsSmlYend5XzQ0WmFpWk5Bc1oycTRaN0hWcGVYQWIzbkM0SUNxSkVUTS1SZw?oc=5\" target=\"_blank\"&gt;Crypto Price Prediction Today 12 March – XRP, Bitcoin, Ethereum&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color=\"#6f6f6f\"&gt;Cryptonews&lt;/font&gt;",
    "category": "crypto",
    "lang": "en"
  }
];

export const SAMPLE_STORYBOARD = {
  "slots": [
    {
      "slot": 1,
      "tStart": 0,
      "tEnd": 6,
      "segId": "cold_open",
      "source": "REMOTION_DATA",
      "type": "chiffre_geant_animé",
      "desc": "Count-up animé vers '100,46$' — texte sous-titré 'Brent Crude — seuil franchi' sur fond noir, impact maximal",
      "asset": "BZ=F"
    },
    {
      "slot": 2,
      "tStart": 6,
      "tEnd": 18,
      "segId": "thread",
      "source": "MIDJOURNEY",
      "type": "image_conceptuelle",
      "desc": "Vue aérienne dramatique du Golfe Persique de nuit — tanker illuminé, reflets de flammes sur l'eau, ciel orageux",
      "asset": null
    },
    {
      "slot": 3,
      "tStart": 18,
      "tEnd": 32,
      "segId": "thread",
      "source": "REMOTION_DATA",
      "type": "multi_badge",
      "desc": "4 badges assets : BZ=F +4.2% | CL=F +9.7% | ^GSPC -1.5% | GC=F -1.0% — setup visuel de toute la chaîne du jour",
      "asset": "BZ=F"
    },
    {
      "slot": 4,
      "tStart": 32,
      "tEnd": 55,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart BZ=F — price_line Brent spot avec franchissement 100,46$ annoté, ligne rouge horizontale 100$ épaisse, label 'SEUIL PSYCHOLOGIQUE' clignotant",
      "asset": "BZ=F"
    },
    {
      "slot": 5,
      "tStart": 36,
      "tEnd": 60,
      "segId": "seg_1",
      "source": "REMOTION_TEXT",
      "type": "infographie_chaine",
      "desc": "Chaîne causale step-by-step : 🇮🇷 Escalade iranienne → 🛢 Disruption Golfe Ormuz → ⬆ Supply shock → 💥 Brent 100$ → 📈 Inflation importée → 🔒 Fed paralysée",
      "asset": "CL=F"
    },
    {
      "slot": 6,
      "tStart": 55,
      "tEnd": 80,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart CL=F — WTI avec support 'round number' à 90$ annoté, spike +9.7% de la séance visible, zone de prix surlignée en rouge",
      "asset": "CL=F"
    },
    {
      "slot": 7,
      "tStart": 55,
      "tEnd": 80,
      "segId": "seg_1",
      "source": "STOCK",
      "type": "image_lieu",
      "desc": "Plateforme pétrolière ou tanker dans le Golfe Persique — incrustation basse droite (lower third) pendant le chart principal",
      "asset": null
    },
    {
      "slot": 8,
      "tStart": 80,
      "tEnd": 100,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart CL=F — résistance High 52 semaines annotée, ligne pointillée orange au-dessus du prix actuel avec label 'Résistance High52w'",
      "asset": "CL=F"
    },
    {
      "slot": 9,
      "tStart": 80,
      "tEnd": 115,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_indicateur",
      "desc": "Panel RSI CL=F en surimpression basse — gauge RSI surachat >70, zone rouge surlignée, label 'RSI SURACHAT — risque consolidation'",
      "asset": "CL=F"
    },
    {
      "slot": 10,
      "tStart": 88,
      "tEnd": 115,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart CL=F — pivot structurel pré-escalade affiché comme support vert à ~85$, distance au prix actuel annotée en pourcentage",
      "asset": "CL=F"
    },
    {
      "slot": 11,
      "tStart": 100,
      "tEnd": 130,
      "segId": "seg_1",
      "source": "REMOTION_DATA",
      "type": "gauge_animee",
      "desc": "Gauge RSI animée 0-100 pour CL=F — aiguille qui monte jusqu'à la zone rouge (>72), texte 'SURACHAT EXTRÊME' pulsant",
      "asset": "CL=F"
    },
    {
      "slot": 12,
      "tStart": 115,
      "tEnd": 140,
      "segId": "seg_1",
      "source": "REMOTION_TEXT",
      "type": "infographie_scenario",
      "desc": "Fork bull/bear pétrole : BULL → consolidation 95-100$ si pas d'escalade | BEAR → dépassement 105$ si fermeture Ormuz — niveaux chiffrés sur chaque branche",
      "asset": "CL=F"
    },
    {
      "slot": 13,
      "tStart": 125,
      "tEnd": 145,
      "segId": "seg_1",
      "source": "REMOTION_CHART",
      "type": "chart_correlation",
      "desc": "2 courbes overlay : CL=F (rouge, +9.7%) vs DX-Y.NYB (bleu, corrélation dollar/pétrole) — divergence visible, annotations des pics simultanés",
      "asset": "DX-Y.NYB"
    },
    {
      "slot": 14,
      "tStart": 140,
      "tEnd": 162,
      "segId": "seg_1",
      "source": "REMOTION_TEXT",
      "type": "infographie_paradoxe",
      "desc": "Callout paradoxe : '⚠ PIÈGE STAGFLATIONNISTE — Pétrole haut = inflation ↑ ET récession ↑ — La Fed ne peut ni monter ni baisser' — texte rouge clignotant sur fond sombre",
      "asset": null
    },
    {
      "slot": 15,
      "tStart": 155,
      "tEnd": 162,
      "segId": "seg_1",
      "source": "REMOTION_DATA",
      "type": "lower_third_recap",
      "desc": "Bandeau récap seg_1 : 'Brent 100,46$ | WTI +9.7% | RSI surachat | Fed paralysée'",
      "asset": null
    },
    {
      "slot": 16,
      "tStart": 162,
      "tEnd": 170,
      "segId": "seg_2",
      "source": "REMOTION_TEXT",
      "type": "transition_segment",
      "desc": "Transition fade — texte centré : 'L'EUROPE CRAQUE' — wipe horizontal vers droite sur fond gris anthracite",
      "asset": null
    },
    {
      "slot": 17,
      "tStart": 163,
      "tEnd": 200,
      "segId": "seg_2",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart ^FCHI — CAC 40 avec SMA200 à 7992 annotée en orange, prix à 7984 en dessous, zone de cassure surlignée, label 'CASSURE SMA200 — SIGNAL STRUCTUREL'",
      "asset": "^FCHI"
    },
    {
      "slot": 18,
      "tStart": 170,
      "tEnd": 200,
      "segId": "seg_2",
      "source": "REMOTION_TEXT",
      "type": "infographie_alerte",
      "desc": "Alerte clignotante rouge : 'CAC 40 SOUS SA SMA 200 — 7984 vs 7992 — BEAR REGIME CONFIRMÉ' — animation pulse toutes les 2 secondes",
      "asset": "^FCHI"
    },
    {
      "slot": 19,
      "tStart": 178,
      "tEnd": 210,
      "segId": "seg_2",
      "source": "REMOTION_CHART",
      "type": "chart_comparaison",
      "desc": "2 barres côte à côte : ^FCHI -0.7% vs ^STOXX -0.6% — couleurs rouges dégradées, labels prix et variation, titre 'Europe en Bear Regime Uniforme'",
      "asset": "^STOXX"
    },
    {
      "slot": 20,
      "tStart": 185,
      "tEnd": 215,
      "segId": "seg_2",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart DX-Y.NYB — Dollar Index avec résistance psychologique annotée, spike haussier de la séance, label 'DXY EN MODE REFUGE'",
      "asset": "DX-Y.NYB"
    },
    {
      "slot": 21,
      "tStart": 193,
      "tEnd": 218,
      "segId": "seg_2",
      "source": "REMOTION_DATA",
      "type": "gauge_animee",
      "desc": "Gauge RSI ^GSPC approchant la zone de survente (30-35), aiguille animée vers le bas, texte 'RSI APPROCHE SURVENTE — ZONE D'ATTENTION'",
      "asset": "^GSPC"
    },
    {
      "slot": 22,
      "tStart": 198,
      "tEnd": 218,
      "segId": "seg_2",
      "source": "REMOTION_CHART",
      "type": "yield_curve",
      "desc": "Courbe des taux 2Y/10Y animée — spread +57bp affiché, courbe pentifiante visualisée, label 'SPREAD 2Y-10Y +57bp — PENTIFICATION SOUS STRESS'",
      "asset": "DX-Y.NYB"
    },
    {
      "slot": 23,
      "tStart": 210,
      "tEnd": 222,
      "segId": "seg_2",
      "source": "REMOTION_DATA",
      "type": "lower_third_recap",
      "desc": "Bandeau récap seg_2 : 'CAC -0.7% sous SMA200 | STOXX -0.6% | DXY refuge | Spread 2Y-10Y +57bp'",
      "asset": null
    },
    {
      "slot": 24,
      "tStart": 222,
      "tEnd": 228,
      "segId": "seg_3",
      "source": "REMOTION_TEXT",
      "type": "transition_segment",
      "desc": "Wipe transition avec silence dramatique — texte : 'LE MARCHÉ SE CONTREDIT' en blanc sur noir, pause 2s",
      "asset": null
    },
    {
      "slot": 25,
      "tStart": 225,
      "tEnd": 250,
      "segId": "seg_3",
      "source": "REMOTION_CHART",
      "type": "chart_split",
      "desc": "Split screen : gauche CL=F +9.7% (rouge, flamme), droite HG=F -0.4% (bleu, descente) — titre central 'DIVERGENCE PÉTROLE vs CUIVRE'",
      "asset": "HG=F"
    },
    {
      "slot": 26,
      "tStart": 233,
      "tEnd": 255,
      "segId": "seg_3",
      "source": "REMOTION_TEXT",
      "type": "infographie_paradoxe",
      "desc": "Callout paradoxe : '🛢 Pétrole price la PEUR (disruption offre) vs 🔧 Cuivre price la RÉALITÉ (demande industrielle en baisse)' — animation opposée gauche/droite",
      "asset": null
    },
    {
      "slot": 27,
      "tStart": 235,
      "tEnd": 265,
      "segId": "seg_3",
      "source": "REMOTION_CHART",
      "type": "chart_principal",
      "desc": "InkChart ^VIX — VIX +12.6% avec résistance 'zone panique suivante' annotée, spike visible, zone rouge au-dessus du prix actuel",
      "asset": "^VIX"
    },
    {
      "slot": 28,
      "tStart": 238,
      "tEnd": 270,
      "segId": "seg_3",
      "source": "REMOTION_CHART",
      "type": "chart_correlation",
      "desc": "2 courbes overlay : GC=F (or spot, orange) avec support critique et support S2 annotés, fond de graphique sombre, divergence avec VIX visible",
      "asset": "GC=F"
    },
    {
      "slot": 29,
      "tStart": 243,
      "tEnd": 265,
      "segId": "seg_3",
      "source": "REMOTION_DATA",
      "type": "gauge_animee",
      "desc": "Gauge RSI VIX — momentum haussier, aiguille dans zone haute (>60), label 'VIX MOMENTUM HAUSSIER — PEUR INSTITUTIONNELLE'",
      "asset": "^VIX"
    },
    {
      "slot": 30,
      "tStart": 258,
      "tEnd": 277,
      "segId": "seg_3",
      "source": "REMOTION_TEXT",
      "type": "infographie_chaine",
      "desc": "Chaîne causale : Cuivre ↓ → Demande industrielle faible → Croissance ralentie → Récession latente → Pétrole ↑ isolé de la réalité macro — contradiction visualisée",
      "asset": "HG=F"
    },
    {
      "slot": 31,
      "tStart": 265,
      "tEnd": 277,
      "segId": "seg_3",
      "source": "REMOTION_DATA",
      "type": "lower_third_recap",
      "desc": "Bandeau récap seg_3 : 'Pétrole price la peur | Cuivre price le ralentissement | VIX +12.6% | Contradiction macro'",
      "asset": null
    },
    {
      "slot": 32,
      "tStart": 277,
      "tEnd": 285,
      "segId": "seg_4",
      "source": "REMOTION_DATA",
      "type": "callout_mover",
      "desc": "Badge géant : 'CF INDUSTRIES +13.21%' sur fond noir — animation flash rapide, cut net depuis seg_3",
      "asset": "CF"
    },
    {
      "slot": 33,
      "tStart": 277,
      "tEnd": 298,
      "segId": "seg_4",
      "source": "REMOTION_CHART",
      "type": "chart_comparaison",
      "desc": "2 barres : XLE +0.93% (vert) vs XLK -1.2% (rouge) — rotation sectorielle choc pétrolier visualisée, labels clairs",
      "asset": "XLE"
    },
    {
      "slot": 34,
      "tStart": 280,
      "tEnd": 305,
      "segId": "seg_4",
      "source": "REMOTION_DATA",
      "type": "heatmap_sectorielle",
      "desc": "Heatmap 11 secteurs S&P — XLE en vert intense, XLK et XLF en rouge, XLE/XLK/XLF labels visibles, titre 'ROTATION SECTORIELLE — CHOC PÉTROLIER'",
      "asset": "XLE"
    },
    {
      "slot": 35,
      "tStart": 286,
      "tEnd": 305,
      "segId": "seg_4",
      "source": "REMOTION_DATA",
      "type": "multi_badge",
      "desc": "4 badges : CF +13.21% | LYB +10.33% | XLE +0.93% | XLF (RSI survente) — affichage simultané, couleurs vert/rouge contrastées",
      "asset": "CF"
    },
    {
      "slot": 36,
      "tStart": 289,
      "tEnd": 307,
      "segId": "seg_4",
      "source": "STOCK",
      "type": "image_personne",
      "desc": "Donald Trump en conférence de presse — incrustation coin supérieur droit pendant heatmap, label 'Section 301 — Sonde Chine'",
      "asset": null
    },
    {
      "slot": 37,
      "tStart": 307,
      "tEnd": 315,
      "segId": "seg_5",
      "source": "REMOTION_TEXT",
      "type": "infographie_paradoxe",
      "desc": "Callout paradoxe : '🥇 OR -1% MALGRÉ LA GUERRE — LE DOLLAR GAGNE LE STATUT REFUGE' — animation choc visuel, fond rouge sombre",
      "asset": "GC=F"
    },
    {
      "slot": 38,
      "tStart": 308,
      "tEnd": 330,
      "segId": "seg_5",
      "source": "REMOTION_CHART",
      "type": "chart_correlation",
      "desc": "2 courbes overlay : GC=F (or, orange, descente -1%) vs DX-Y.NYB (dollar, bleu, montée) — corrélation inverse parfaitement visible, labels annotés",
      "asset": "GC=F"
    },
    {
      "slot": 39,
      "tStart": 312,
      "tEnd": 330,
      "segId": "seg_5",
      "source": "REMOTION_DATA",
      "type": "multi_badge",
      "desc": "3 badges : GC=F (Or) -1.0% | SI=F (Argent) -0.7% | DX-Y.NYB (Dollar) +0.8% — dynamique refuge dollar vs métaux compressés",
      "asset": "GC=F"
    },
    {
      "slot": 40,
      "tStart": 318,
      "tEnd": 333,
      "segId": "seg_5",
      "source": "REMOTION_TEXT",
      "type": "infographie_chaine",
      "desc": "Chaîne causale : Escalade Iran → Dollar refuge ↑ → Or pricé en USD → Or nominal ↓ — mécanique explicative step-by-step",
      "asset": "GC=F"
    },
    {
      "slot": 41,
      "tStart": 328,
      "tEnd": 337,
      "segId": "seg_5",
      "source": "REMOTION_DATA",
      "type": "countdown_event",
      "desc": "Compte à rebours : 'Natural Gas Storage demain 13:30 — Catalyst direct CF Industries' — timer animé, fond sombre urgent",
      "asset": "NG=F"
    },
    {
      "slot": 42,
      "tStart": 337,
      "tEnd": 347,
      "segId": "seg_6",
      "source": "REMOTION_DATA",
      "type": "callout_mover",
      "desc": "Badge géant : 'BITCOIN +0.4% à 70 204$' sur fond violet/orange — contraste avec S&P rouge visible, animation slide in depuis droite",
      "asset": "BTC-USD"
    },
    {
      "slot": 43,
      "tStart": 338,
      "tEnd": 360,
      "segId": "seg_6",
      "source": "REMOTION_CHART",
      "type": "chart_split",
      "desc": "Split screen : gauche ^GSPC -1.5% (rouge), droite BTC-USD +0.4% (vert) — titre 'DÉCOUPLAGE RARE — CRYPTO vs ACTIONS'",
      "asset": "BTC-USD"
    },
    {
      "slot": 44,
      "tStart": 342,
      "tEnd": 360,
      "segId": "seg_6",
      "source": "REMOTION_DATA",
      "type": "multi_badge",
      "desc": "3 badges crypto : BTC +0.4% | ETH +0.7% | SOL +0.9% — tous en vert pendant panique générale, effet visuel fort",
      "asset": "BTC-USD"
    },
    {
      "slot": 45,
      "tStart": 347,
      "tEnd": 362,
      "segId": "seg_6",
      "source": "REMOTION_TEXT",
      "type": "infographie_chaine",
      "desc": "Chaîne causale : Vote Sénat → Ban CBDC bipartisan → Narratif liberté monétaire → Flux entrant crypto → BTC/ETH/SOL découplés",
      "asset": "BTC-USD"
    },
    {
      "slot": 46,
      "tStart": 353,
      "tEnd": 367,
      "segId": "seg_6",
      "source": "REMOTION_TEXT",
      "type": "infographie_scenario",
      "desc": "Fork crypto : BULL → découplage tient si CBDC ban confirmé et GDP faible demain | BEAR → corrélation risk-off reprend si choc GDP fort — niveaux BTC annotés",
      "asset": "BTC-USD"
    },
    {
      "slot": 47,
      "tStart": 367,
      "tEnd": 378,
      "segId": "closing",
      "source": "REMOTION_TEXT",
      "type": "transition_segment",
      "desc": "Zoom out sting — texte martelé en gros : 'TOUT RAMÈNE AU MÊME POINT' — 3 mots apparaissent en cascade, fond noir, effet sentencieux",
      "asset": null
    },
    {
      "slot": 48,
      "tStart": 367,
      "tEnd": 380,
      "segId": "closing",
      "source": "REMOTION_DATA",
      "type": "recap_point",
      "desc": "Bullet points animés en cascade : 🛢 Brent 100$ → Fed paralysée | 🇪🇺 Europe en bear regime | 🥇 Or compressé par le dollar | ₿ Crypto seule partition libre",
      "asset": null
    },
    {
      "slot": 49,
      "tStart": 375,
      "tEnd": 385,
      "segId": "closing",
      "source": "REMOTION_DATA",
      "type": "calendrier_eco",
      "desc": "Calendrier économique demain : GDP Préliminaire 13:30 🔴 HAUTE IMPORTANCE | Core PCE 13:30 🔴 HAUTE IMPORTANCE | Natural Gas Storage 13:30 🟡 CF catalyst — fond sombre, icônes couleur",
      "asset": null
    },
    {
      "slot": 50,
      "tStart": 383,
      "tEnd": 392,
      "segId": "closing",
      "source": "REMOTION_DATA",
      "type": "teaser_demain",
      "desc": "Teaser : 'DEMAIN 13:30 — GDP + Core PCE — Le double release qui tranche tout' — countdown vers 13:30, question finale 'Le marché a-t-il déjà pricé le pire ?' en surimpression",
      "asset": null
    },
    {
      "slot": 51,
      "tStart": 390,
      "tEnd": 395,
      "segId": "closing",
      "source": "REMOTION_DATA",
      "type": "end_card",
      "desc": "End card YouTube standard — bouton abonnement animé, lien playlist 'Analyse Quotidienne', miniature prochain épisode en bas droite, fond aux couleurs de la chaîne",
      "asset": null
    }
  ]
} as const;
