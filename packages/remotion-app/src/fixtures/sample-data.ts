import type {
  AssetSnapshot,
  NewsItem,
  EpisodeScript,
  Candle,
  Prediction,
} from "@yt-maker/core";

// Helper to generate realistic candles
function generateCandles(
  basePrice: number,
  count: number = 30,
  volatility: number = 0.02
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const startDate = new Date("2026-02-19");

  for (let i = count; i > 0; i--) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Random walk with slight uptrend
    const change = (Math.random() - 0.48) * basePrice * volatility;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(Math.random() * 1000000000) + 100000000;

    candles.push({
      t: Math.floor(date.getTime() / 1000),
      date: dateStr,
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v: volume,
    });

    currentPrice = close;
  }

  return candles;
}

export const SAMPLE_ASSETS: AssetSnapshot[] = [
  {
    symbol: "GC=F",
    name: "Gold",
    price: 2954.50,
    change: 18.50,
    changePct: 0.63,
    high24h: 2958.75,
    low24h: 2936.00,
    candles: generateCandles(2954.5, 30, 0.015),
  },
  {
    symbol: "EURUSD=X",
    name: "EUR/USD",
    price: 1.0412,
    change: 0.0032,
    changePct: 0.31,
    high24h: 1.0425,
    low24h: 1.0385,
    candles: generateCandles(1.0412, 30, 0.008),
  },
  {
    symbol: "USDJPY=X",
    name: "USD/JPY",
    price: 152.45,
    change: 0.85,
    changePct: 0.56,
    high24h: 152.65,
    low24h: 151.35,
    candles: generateCandles(152.45, 30, 0.012),
  },
  {
    symbol: "GBPUSD=X",
    name: "GBP/USD",
    price: 1.2645,
    change: 0.0045,
    changePct: 0.36,
    high24h: 1.2665,
    low24h: 1.2600,
    candles: generateCandles(1.2645, 30, 0.009),
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    price: 97325.00,
    change: 2185.00,
    changePct: 2.29,
    high24h: 97850.00,
    low24h: 94250.00,
    candles: generateCandles(97325, 30, 0.035),
  },
  {
    symbol: "^GSPC",
    name: "S&P 500",
    price: 6142.85,
    change: 65.25,
    changePct: 1.07,
    high24h: 6155.50,
    low24h: 6078.00,
    candles: generateCandles(6142.85, 30, 0.018),
  },
  {
    symbol: "DXY=F",
    name: "Dollar Index",
    price: 107.28,
    change: -0.42,
    changePct: -0.39,
    high24h: 107.85,
    low24h: 106.95,
    candles: generateCandles(107.28, 30, 0.011),
  },
  {
    symbol: "CL=F",
    name: "Crude Oil",
    price: 71.45,
    change: 1.25,
    changePct: 1.78,
    high24h: 72.10,
    low24h: 70.05,
    candles: generateCandles(71.45, 30, 0.025),
  },
];

export const SAMPLE_NEWS: NewsItem[] = [
  {
    title: "La Fed maintient ses taux d'intérêt inchangés",
    source: "Reuters",
    url: "https://reuters.com/fed-rates-2026",
    publishedAt: "2026-02-19T14:30:00Z",
    summary:
      "La Réserve fédérale américaine a décidé de maintenir les taux directeurs à leur niveau actuel, citant une inflation persistante.",
  },
  {
    title: "Données PCE européennes surpassent les attentes",
    source: "Bloomberg",
    url: "https://bloomberg.com/ecb-inflation-2026",
    publishedAt: "2026-02-19T11:00:00Z",
    summary:
      "L'inflation en zone euro recule légèrement mais reste au-dessus des objectifs de la BCE.",
  },
  {
    title: "Bitcoin franchit la barre des 97 000 dollars",
    source: "CNBC",
    url: "https://cnbc.com/bitcoin-record-2026",
    publishedAt: "2026-02-19T09:45:00Z",
    summary:
      "Le Bitcoin atteint un nouveau sommet historique, porté par l'adoption institutionnelle et les pressions inflationnistes.",
  },
  {
    title: "Pétrole brut en hausse après les données OPEP",
    source: "MarketWatch",
    url: "https://marketwatch.com/oil-production-2026",
    publishedAt: "2026-02-18T16:20:00Z",
    summary:
      "Les prix du brut grimpent après un rapport indiquant une réduction de la production mondiale.",
  },
  {
    title: "L'or atteint un nouveau record face aux tensions géopolitiques",
    source: "Reuters",
    url: "https://reuters.com/gold-record-2026",
    publishedAt: "2026-02-18T13:00:00Z",
    summary:
      "L'or monte à plus de 2950 dollars l'once, alimenté par la demande de valeurs refuges.",
  },
  {
    title: "Le CAC 40 clôt en hausse de 1,2%",
    source: "AFP",
    url: "https://afp.com/cac40-2026",
    publishedAt: "2026-02-19T17:30:00Z",
    summary:
      "Le marché parisien profite des bons résultats d'entreprises de l'indice vedette.",
  },
  {
    title: "USD/JPY à son plus haut en trois mois",
    source: "FX Street",
    url: "https://fxstreet.com/usdjpy-2026",
    publishedAt: "2026-02-19T10:15:00Z",
    summary:
      "La paire dollar-yen renforce sa tendance haussière, portée par les écarts de rendement.",
  },
  {
    title: "Les technologiques américaines montent en flèche",
    source: "Reuters",
    url: "https://reuters.com/tech-stocks-2026",
    publishedAt: "2026-02-19T15:45:00Z",
    summary:
      "Le secteur technologique tire l'indice S&P 500 vers de nouveaux sommets historiques.",
  },
  {
    title: "Annonces de dividendes stimulent les valeurs bancaires",
    source: "Bloomberg",
    url: "https://bloomberg.com/banks-dividends-2026",
    publishedAt: "2026-02-18T18:00:00Z",
    summary:
      "Les banques européennes annoncent des augmentations de dividendes suite à de bons résultats.",
  },
  {
    title: "Données d'emploi américaines déçoivent",
    source: "CNBC",
    url: "https://cnbc.com/jobs-data-2026",
    publishedAt: "2026-02-18T08:30:00Z",
    summary:
      "Le rapport sur l'emploi aux États-Unis montre un ralentissement inattendu des créations de postes.",
  },
];

const samplePredictions: Prediction[] = [
  {
    asset: "GC=F",
    direction: "bullish",
    confidence: "high",
    targetLevel: 3050,
    keyLevel: 2920,
    reasoning:
      "L'or continue de bénéficier des tensions géopolitiques. Le niveau de 2920 est un support crucial.",
  },
  {
    asset: "BTC-USD",
    direction: "bullish",
    confidence: "high",
    targetLevel: 105000,
    keyLevel: 90000,
    reasoning:
      "Bitcoin casse les résistances historiques. L'adoption institutionnelle continue de progresser.",
  },
  {
    asset: "EURUSD=X",
    direction: "neutral",
    confidence: "medium",
    keyLevel: 1.0350,
    reasoning:
      "La paire oscille dans une fourchette. Les données de la BCE seront décisives.",
  },
];

export const SAMPLE_SCRIPT: EpisodeScript = {
  episodeNumber: 1,
  date: "2026-02-19",
  type: "daily_recap",
  lang: "fr",
  title: "Récap Marché - 19 février 2026",
  description:
    "Les marchés mondiaux restent haussiers. Or et Bitcoin franchissent de nouveaux records tandis que les indices actions consolident.",
  totalDurationSec: 540,
  sections: [
    {
      id: "intro",
      type: "intro",
      title: "Introduction",
      narration:
        "Bonjour et bienvenue dans votre récapitulatif des marchés pour le 19 février 2026. Je suis votre animateur trading, et aujourd'hui nous explorons une séance riche en mouvements.",
      durationSec: 20,
      visualCues: [
        {
          type: "transition",
          direction: "down",
        },
      ],
      data: {},
    },
    {
      id: "market_overview",
      type: "market_overview",
      title: "Vue d'ensemble des marchés",
      narration:
        "Commençons par l'aperçu global. L'or a franchi la barre des 2950 dollars, consolidant sa tendance haussière. L'indice dollar recule légèrement de 0,39%, tandis que les paires de devises affichent une relative stabilité. Les indices actions américains progressent, le S&P 500 gagnant 1,07%. Bitcoin fait la une, dépassant les 97 000 dollars avec un gain impressionnant de 2,29%.",
      durationSec: 90,
      visualCues: [
        {
          type: "highlight_asset",
          asset: "GC=F",
        },
        {
          type: "highlight_asset",
          asset: "BTC-USD",
        },
        {
          type: "show_level",
          value: 6142.85,
          label: "S&P 500",
        },
      ],
      data: {
        topPerformers: ["BTC-USD", "CL=F", "^GSPC"],
      },
    },
    {
      id: "deep_dive_1",
      type: "deep_dive",
      title: "Analyse approfondie - Or",
      narration:
        "Plongeons dans l'analyse de l'or. Le cours a progressé de 18,50 dollars aujourd'hui, soit 0,63%. Cette hausse s'inscrit dans un contexte de tensions géopolitiques continues et de recherche de valeurs refuges. Le graphique montre une consolidation au-dessus du niveau de 2900 dollars. Les supports clés se situent à 2850 et 2920 dollars. Si le cours dépasse la résistance à 3000 dollars, nous pourrions voir une accélération haussière jusqu'à 3050 dollars.",
      durationSec: 110,
      visualCues: [
        {
          type: "highlight_asset",
          asset: "GC=F",
        },
        {
          type: "show_chart",
          asset: "GC=F",
        },
        {
          type: "show_level",
          value: 2920,
          label: "Support clé",
        },
        {
          type: "show_level",
          value: 3000,
          label: "Résistance",
        },
      ],
      data: {
        asset: "GC=F",
        keyLevels: {
          support1: 2920,
          support2: 2850,
          resistance: 3000,
        },
      },
    },
    {
      id: "deep_dive_2",
      type: "deep_dive",
      title: "Analyse approfondie - Bitcoin",
      narration:
        "Intéressons-nous maintenant au Bitcoin, la star de la journée. Avec un gain de 2,29%, le cours atteint 97 325 dollars. Cette trajectoire haussière ininterrompue témoigne de l'augmentation de l'adoption institutionnelle et de la perspective d'approbation des ETF Bitcoin au comptant. Techniquement, le Bitcoin consolide légèrement après son dépassement des 96 000 dollars. Le prochain objectif majeur se situe à 105 000 dollars. En cas de correction, le support se trouve à 90 000 dollars.",
      durationSec: 100,
      visualCues: [
        {
          type: "highlight_asset",
          asset: "BTC-USD",
        },
        {
          type: "show_chart",
          asset: "BTC-USD",
        },
        {
          type: "direction_arrow",
          direction: "up",
        },
      ],
      data: {
        asset: "BTC-USD",
        keyLevels: {
          support: 90000,
          target: 105000,
        },
      },
    },
    {
      id: "news",
      type: "news",
      title: "Actualités importantes",
      narration:
        "Passons aux actualités du jour. La Réserve fédérale a annoncé le maintien de ses taux, une décision qui a stabilisé les marchés. L'inflation PCE en zone euro recule légèrement, offrant un espoir tempéré à la BCE. Les données d'emploi américaines ont déçu, montrant un ralentissement des créations d'emplois. Sur le front du pétrole, un rapport de l'OPEP indiquant une réduction de la production mondiale a soutenu les cours. Les technologiques restent en force, poursuivant leur ascension.",
      durationSec: 85,
      visualCues: [
        {
          type: "flash",
        },
      ],
      data: {
        topStories: [
          "Fed maintient ses taux",
          "Inflation PCE modérée",
          "Données emploi faibles",
        ],
      },
    },
    {
      id: "predictions",
      type: "predictions",
      title: "Prédictions et niveaux clés",
      narration:
        "Pour les prochains jours, je surveille plusieurs points d'attention. L'or devrait continuer sa route haussière vers 3050 dollars si le momentum persiste. Bitcoin, malgré sa volatilité inhérente, a un potentiel haussier jusqu'à 105 000 dollars. L'EUR/USD oscille dans une fourchette sans tendance marquée pour l'instant, attendant les données de la BCE. Les technologiques américaines restent notre domaine favori pour une exposition haussière.",
      durationSec: 80,
      visualCues: [
        {
          type: "direction_arrow",
          direction: "up",
        },
        {
          type: "show_level",
          value: 3050,
          label: "Cible Or",
        },
      ],
      data: {
        predictions: samplePredictions,
      },
    },
    {
      id: "outro",
      type: "outro",
      title: "Conclusion",
      narration:
        "Voilà pour ce récapitulatif du marché du 19 février 2026. Les tendances haussières persistent sur les actifs refuges et les crypto-monnaies. Restez vigilants face aux données économiques à venir. N'oubliez pas de vous abonner et de valider les notifications pour ne manquer aucune de nos analyses. À bientôt pour un nouvel épisode!",
      durationSec: 25,
      visualCues: [
        {
          type: "transition",
          direction: "up",
        },
      ],
      data: {},
    },
  ],
};
