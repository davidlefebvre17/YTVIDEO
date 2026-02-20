import type {
  DailySnapshot,
  ActiveCausalChain,
  AssetSnapshot,
  StockScreenResult,
} from "@yt-maker/core";
import type { ClusteredResult } from "./news-clusterer";

// ── Step verification types ─────────────────────────────────────────────────

type StepVerifier = (ctx: VerificationContext) => boolean;

interface VerificationContext {
  snapshot: DailySnapshot;
  clusters: ClusteredResult;
  movers: StockScreenResult[];
  assetMap: Map<string, AssetSnapshot>;
}

// ── Causal chain definition ─────────────────────────────────────────────────

interface CausalChainDef {
  id: string;
  name: string;
  trigger: (ctx: VerificationContext) => boolean;
  steps: Array<{
    label: string;
    verify: StepVerifier;
  }>;
  suggestedNarration: string;
  relatedClusters: string[];
  relatedAssets: string[];
}

// ── Helper functions ────────────────────────────────────────────────────────

function getAssetChange(assetMap: Map<string, AssetSnapshot>, symbol: string): number | null {
  const asset = assetMap.get(symbol);
  return asset ? asset.changePct : null;
}

function getAssetPrice(assetMap: Map<string, AssetSnapshot>, symbol: string): number | null {
  const asset = assetMap.get(symbol);
  return asset ? asset.price : null;
}

function getClusterBuzz(clusters: ClusteredResult, clusterId: string): number {
  const cluster = clusters.clusters.find((c) => c.id === clusterId);
  return cluster?.buzzScore ?? 0;
}

function countMoversBySectorKeywords(
  movers: StockScreenResult[],
  keywords: string[],
  direction: "down" | "up",
  threshold: number,
): number {
  return movers.filter((m) => {
    const nameMatch = keywords.some((kw) =>
      m.name.toLowerCase().includes(kw),
    );
    if (!nameMatch) return false;
    if (direction === "down") return m.changePct < threshold;
    return m.changePct > threshold;
  }).length;
}

function hasEventContaining(
  snapshot: DailySnapshot,
  keywords: string[],
): boolean {
  const allEvents = [
    ...(snapshot.events ?? []),
    ...(snapshot.yesterdayEvents ?? []),
  ];
  return allEvents.some((e) => {
    const name = e.name.toLowerCase();
    return keywords.some((kw) => name.includes(kw.toLowerCase()));
  });
}

function hasEventSurprise(
  snapshot: DailySnapshot,
  keywords: string[],
  direction: "above" | "below" | "any",
): boolean {
  const allEvents = [
    ...(snapshot.events ?? []),
    ...(snapshot.yesterdayEvents ?? []),
  ];
  return allEvents.some((e) => {
    const name = e.name.toLowerCase();
    const matches = keywords.some((kw) => name.includes(kw.toLowerCase()));
    if (!matches || !e.actual || !e.forecast) return false;

    const actual = parseFloat(e.actual);
    const forecast = parseFloat(e.forecast);
    if (isNaN(actual) || isNaN(forecast)) return false;

    if (direction === "any") return actual !== forecast;
    if (direction === "above") return actual > forecast;
    return actual < forecast;
  });
}

// ── The 12 causal chains ────────────────────────────────────────────────────

const AIRLINE_KEYWORDS = [
  "air", "airline", "airlines", "aviation", "wizz", "ryanair",
  "delta air", "united air", "southwest", "alaska air", "american air",
];

const PE_KEYWORDS = [
  "blue owl", "apollo", "kkr", "carlyle", "ares", "blackstone",
];

const CAUSAL_CHAINS: CausalChainDef[] = [
  // Chain 1: Geopolitique Moyen-Orient → Petrole → Airlines → Inflation
  {
    id: "iran_oil_airlines",
    name: "Iran → Pétrole → Airlines → Inflation",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "geopolitique_iran");
      const clChange = getAssetChange(ctx.assetMap, "CL=F");
      const bzChange = getAssetChange(ctx.assetMap, "BZ=F");
      return buzz >= 3 && ((clChange !== null && clChange > 1) || (bzChange !== null && bzChange > 1));
    },
    steps: [
      {
        label: "Tensions Moyen-Orient → risque approvisionnement pétrole",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "geopolitique_iran") >= 3,
      },
      {
        label: "Pétrole en hausse",
        verify: (ctx) => {
          const cl = getAssetChange(ctx.assetMap, "CL=F");
          const bz = getAssetChange(ctx.assetMap, "BZ=F");
          return (cl !== null && cl > 1) || (bz !== null && bz > 1);
        },
      },
      {
        label: "Airlines en baisse",
        verify: (ctx) => countMoversBySectorKeywords(ctx.movers, AIRLINE_KEYWORDS, "down", -2) >= 3,
      },
      {
        label: "Anticipations inflation (pétrole > +3%)",
        verify: (ctx) => {
          const cl = getAssetChange(ctx.assetMap, "CL=F");
          return cl !== null && cl > 3;
        },
      },
    ],
    suggestedNarration: "Les tensions avec l'Iran font monter le brut — et dans la foulée, les compagnies aériennes décrochent. Le kérosène, c'est leur premier poste de coûts.",
    relatedClusters: ["geopolitique_iran", "petrole_energie", "airlines_transport"],
    relatedAssets: ["CL=F", "BZ=F"],
  },

  // Chain 2: Tarifs douaniers → Balance commerciale → Dollar → Yields
  {
    id: "tariffs_dollar_yields",
    name: "Tarifs → Dollar → Yields",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "tarifs_douane");
      const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
      return buzz >= 3 && dxy !== null;
    },
    steps: [
      {
        label: "Tarifs douaniers → incertitude commerciale",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "tarifs_douane") >= 3,
      },
      {
        label: "Balance commerciale impactée",
        verify: (ctx) => hasEventContaining(ctx.snapshot, ["trade balance", "balance commerciale", "deficit commercial"]),
      },
      {
        label: "Dollar réagit",
        verify: (ctx) => {
          const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
          return dxy !== null && Math.abs(dxy) > 0.2;
        },
      },
      {
        label: "Yields suivent le dollar",
        verify: (ctx) => {
          if (!ctx.snapshot.yields) return false;
          return Math.abs(ctx.snapshot.yields.us10y) > 0;
        },
      },
    ],
    suggestedNarration: "Le déficit commercial US atteint un record malgré les tarifs — et pourtant le dollar monte, attiré par les flux de capitaux vers la sécurité.",
    relatedClusters: ["tarifs_douane"],
    relatedAssets: ["DX-Y.NYB"],
  },

  // Chain 3: Earnings surprise → Secteur → Indice
  {
    id: "earnings_sector_index",
    name: "Earnings surprise → Secteur → Indice",
    trigger: (ctx) => {
      return ctx.movers.some((m) =>
        m.earningsDetail?.publishingToday === true && Math.abs(m.changePct) > 5,
      );
    },
    steps: [
      {
        label: "Entreprise publie résultats (beat ou miss)",
        verify: (ctx) => ctx.movers.some((m) => m.earningsDetail?.publishingToday === true),
      },
      {
        label: "Réaction forte sur le titre (>5%)",
        verify: (ctx) => ctx.movers.some((m) =>
          m.earningsDetail?.publishingToday === true && Math.abs(m.changePct) > 5,
        ),
      },
      {
        label: "Contagion sectorielle",
        verify: (ctx) => {
          // Check if there are multiple movers in same index moving in same direction
          const earningsMovers = ctx.movers.filter((m) =>
            m.earningsDetail?.publishingToday === true && Math.abs(m.changePct) > 5,
          );
          for (const em of earningsMovers) {
            const sameIndex = ctx.movers.filter((m) =>
              m.index === em.index &&
              m.symbol !== em.symbol &&
              Math.sign(m.changePct) === Math.sign(em.changePct) &&
              Math.abs(m.changePct) > 1,
            );
            if (sameIndex.length >= 2) return true;
          }
          return false;
        },
      },
      {
        label: "Impact sur l'indice",
        verify: (ctx) => {
          const sp = getAssetChange(ctx.assetMap, "^GSPC");
          const cac = getAssetChange(ctx.assetMap, "^FCHI");
          const dax = getAssetChange(ctx.assetMap, "^GDAXI");
          return [sp, cac, dax].some((c) => c !== null && Math.abs(c) > 0.3);
        },
      },
    ],
    suggestedNarration: "Des résultats au-dessus des attentes donnent le ton au secteur.",
    relatedClusters: ["earnings_general", "earnings_tech"],
    relatedAssets: ["^GSPC", "^FCHI", "^GDAXI"],
  },

  // Chain 4: Fed → Taux → Dollar → Or/Tech
  {
    id: "fed_rates_dollar_gold",
    name: "Fed → Taux → Dollar → Or/Tech",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "fed_monetary");
      return buzz >= 2 || hasEventContaining(ctx.snapshot, ["fomc", "fed"]);
    },
    steps: [
      {
        label: "Fed communique (minutes, discours, décision)",
        verify: (ctx) => {
          return getClusterBuzz(ctx.clusters, "fed_monetary") >= 2 ||
            hasEventContaining(ctx.snapshot, ["fomc", "fed"]);
        },
      },
      {
        label: "Taux réagissent",
        verify: (ctx) => ctx.snapshot.yields !== undefined,
      },
      {
        label: "Dollar suit les taux",
        verify: (ctx) => {
          const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
          return dxy !== null && Math.abs(dxy) > 0.15;
        },
      },
      {
        label: "Or inverse du dollar",
        verify: (ctx) => {
          const gold = getAssetChange(ctx.assetMap, "GC=F");
          const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
          if (gold === null || dxy === null) return false;
          return Math.sign(gold) !== Math.sign(dxy);
        },
      },
      {
        label: "Tech sensible aux taux",
        verify: (ctx) => {
          const nasdaq = getAssetChange(ctx.assetMap, "^IXIC");
          return nasdaq !== null && Math.abs(nasdaq) > 0.3;
        },
      },
    ],
    suggestedNarration: "Les minutes de la Fed confirment un ton hawkish — les taux remontent, le dollar aussi, et le Nasdaq accuse le coup.",
    relatedClusters: ["fed_monetary"],
    relatedAssets: ["DX-Y.NYB", "GC=F", "^IXIC"],
  },

  // Chain 5: BCE → Euro → DAX/CAC
  {
    id: "ecb_euro_dax_cac",
    name: "BCE → Euro → DAX/CAC",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "ecb_monetary");
      return buzz >= 2 || hasEventContaining(ctx.snapshot, ["ecb", "lagarde"]);
    },
    steps: [
      {
        label: "BCE communique",
        verify: (ctx) => {
          return getClusterBuzz(ctx.clusters, "ecb_monetary") >= 2 ||
            hasEventContaining(ctx.snapshot, ["ecb", "lagarde"]);
        },
      },
      {
        label: "Euro réagit",
        verify: (ctx) => {
          const eur = getAssetChange(ctx.assetMap, "EURUSD=X");
          return eur !== null && Math.abs(eur) > 0.15;
        },
      },
      {
        label: "DAX/CAC impactés",
        verify: (ctx) => {
          const cac = getAssetChange(ctx.assetMap, "^FCHI");
          const dax = getAssetChange(ctx.assetMap, "^GDAXI");
          return (cac !== null && Math.abs(cac) > 0.3) ||
            (dax !== null && Math.abs(dax) > 0.3);
        },
      },
    ],
    suggestedNarration: "Lagarde s'exprime et l'euro réagit — ce qui n'est pas neutre pour les exportateurs européens qui pèsent lourd dans le CAC et le DAX.",
    relatedClusters: ["ecb_monetary"],
    relatedAssets: ["EURUSD=X", "^FCHI", "^GDAXI"],
  },

  // Chain 6: Petrole hausse → Inflation → Fed hawkish → Tech baisse
  {
    id: "oil_inflation_fed_tech",
    name: "Pétrole → Inflation → Fed hawkish → Tech",
    trigger: (ctx) => {
      const cl = getAssetChange(ctx.assetMap, "CL=F");
      const bz = getAssetChange(ctx.assetMap, "BZ=F");
      const buzz = getClusterBuzz(ctx.clusters, "petrole_energie");
      return ((cl !== null && cl > 2) || (bz !== null && bz > 2)) && buzz >= 2;
    },
    steps: [
      {
        label: "Pétrole en forte hausse",
        verify: (ctx) => {
          const cl = getAssetChange(ctx.assetMap, "CL=F");
          const bz = getAssetChange(ctx.assetMap, "BZ=F");
          return (cl !== null && cl > 2) || (bz !== null && bz > 2);
        },
      },
      {
        label: "Anticipations inflation montent",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "inflation_cpi") >= 1,
      },
      {
        label: "Fed doit rester hawkish",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "fed_monetary") >= 1,
      },
      {
        label: "Tech sous pression",
        verify: (ctx) => {
          const nasdaq = getAssetChange(ctx.assetMap, "^IXIC");
          return nasdaq !== null && nasdaq < -0.3;
        },
      },
    ],
    suggestedNarration: "Le pétrole repart à la hausse et ça complique le travail de la Fed — mauvaise nouvelle pour la tech qui est la plus sensible aux taux.",
    relatedClusters: ["petrole_energie", "inflation_cpi", "fed_monetary"],
    relatedAssets: ["CL=F", "BZ=F", "^IXIC"],
  },

  // Chain 7: Dollar fort → Matières premières → Émergents
  {
    id: "dollar_commodities_em",
    name: "Dollar fort → Matières premières → Émergents",
    trigger: (ctx) => {
      const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
      return dxy !== null && dxy > 0.5;
    },
    steps: [
      {
        label: "Dollar monte",
        verify: (ctx) => {
          const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
          return dxy !== null && dxy > 0.5;
        },
      },
      {
        label: "Matières premières sous pression",
        verify: (ctx) => {
          const gold = getAssetChange(ctx.assetMap, "GC=F");
          const oil = getAssetChange(ctx.assetMap, "CL=F");
          const copper = getAssetChange(ctx.assetMap, "HG=F");
          // At least one commodity under pressure
          return [gold, oil, copper].some((c) => c !== null && c < -0.3);
        },
      },
      {
        label: "Or baisse (mécaniquement)",
        verify: (ctx) => {
          const gold = getAssetChange(ctx.assetMap, "GC=F");
          return gold !== null && gold < 0;
        },
      },
    ],
    suggestedNarration: "Le dollar index progresse — et dans son sillage, tout ce qui est pricé en dollars subit une pression mécanique. L'or, le pétrole, les émergents.",
    relatedClusters: [],
    relatedAssets: ["DX-Y.NYB", "GC=F", "CL=F", "HG=F"],
  },

  // Chain 8: VIX spike → Risk-off → Or monte → Crypto baisse
  {
    id: "vix_riskoff_gold_crypto",
    name: "VIX → Risk-off → Or → Crypto",
    trigger: (ctx) => {
      const vixChange = getAssetChange(ctx.assetMap, "^VIX");
      const vixPrice = getAssetPrice(ctx.assetMap, "^VIX");
      return (vixChange !== null && vixChange > 5) || (vixPrice !== null && vixPrice > 25);
    },
    steps: [
      {
        label: "VIX explose",
        verify: (ctx) => {
          const vixChange = getAssetChange(ctx.assetMap, "^VIX");
          const vixPrice = getAssetPrice(ctx.assetMap, "^VIX");
          return (vixChange !== null && vixChange > 5) || (vixPrice !== null && vixPrice > 25);
        },
      },
      {
        label: "S&P baisse",
        verify: (ctx) => {
          const sp = getAssetChange(ctx.assetMap, "^GSPC");
          return sp !== null && sp < -0.2;
        },
      },
      {
        label: "Flight to safety → Or monte",
        verify: (ctx) => {
          const gold = getAssetChange(ctx.assetMap, "GC=F");
          return gold !== null && gold > 0;
        },
      },
      {
        label: "Crypto baisse (BTC risk-on)",
        verify: (ctx) => {
          const btc = getAssetChange(ctx.assetMap, "BTC-USD");
          return btc !== null && btc < -1;
        },
      },
    ],
    suggestedNarration: "Le VIX grimpe — la peur s'installe. Les investisseurs fuient vers l'or pendant que le bitcoin, lui, suit le Nasdaq vers le bas.",
    relatedClusters: [],
    relatedAssets: ["^VIX", "^GSPC", "GC=F", "BTC-USD"],
  },

  // Chain 9: CPI/Inflation surprise → Taux → Tout le marché
  {
    id: "cpi_surprise_rates",
    name: "CPI surprise → Taux → Marchés",
    trigger: (ctx) => {
      return hasEventSurprise(ctx.snapshot, ["cpi", "inflation", "pce"], "any") ||
        getClusterBuzz(ctx.clusters, "inflation_cpi") >= 3;
    },
    steps: [
      {
        label: "CPI sort au-dessus/dessous des attentes",
        verify: (ctx) => hasEventSurprise(ctx.snapshot, ["cpi", "inflation", "pce"], "any"),
      },
      {
        label: "Yields 10Y réagissent",
        verify: (ctx) => ctx.snapshot.yields !== undefined,
      },
      {
        label: "Dollar réagit",
        verify: (ctx) => {
          const dxy = getAssetChange(ctx.assetMap, "DX-Y.NYB");
          return dxy !== null && Math.abs(dxy) > 0.15;
        },
      },
      {
        label: "Actions baissent (surtout tech/growth)",
        verify: (ctx) => {
          const sp = getAssetChange(ctx.assetMap, "^GSPC");
          const nasdaq = getAssetChange(ctx.assetMap, "^IXIC");
          return (sp !== null && sp < -0.2) || (nasdaq !== null && nasdaq < -0.3);
        },
      },
      {
        label: "Or mixte",
        verify: (ctx) => {
          const gold = getAssetChange(ctx.assetMap, "GC=F");
          return gold !== null;
        },
      },
    ],
    suggestedNarration: "L'inflation surprend — les taux réagissent immédiatement, et tout le marché recalcule ses anticipations.",
    relatedClusters: ["inflation_cpi"],
    relatedAssets: ["^GSPC", "^IXIC", "DX-Y.NYB", "GC=F"],
  },

  // Chain 10: Private credit stress → Contagion → Banques
  {
    id: "private_credit_contagion",
    name: "Crédit privé stress → Contagion → Banques",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "immobilier_credit");
      const peDown = countMoversBySectorKeywords(ctx.movers, PE_KEYWORDS, "down", -3);
      return buzz >= 3 && peDown >= 1;
    },
    steps: [
      {
        label: "Stress sur un acteur de crédit privé",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "immobilier_credit") >= 3,
      },
      {
        label: "Contagion aux autres acteurs PE/credit",
        verify: (ctx) => countMoversBySectorKeywords(ctx.movers, PE_KEYWORDS, "down", -2) >= 2,
      },
      {
        label: "Peur sur la qualité du crédit",
        verify: (ctx) => {
          // Check if financials ETF is down
          const xlf = getAssetChange(ctx.assetMap, "XLF");
          return xlf !== null && xlf < -0.5;
        },
      },
      {
        label: "Banques sous pression",
        verify: (ctx) => {
          const bankKeywords = ["bank", "bnp", "societe generale", "barclays", "hsbc", "jpmorgan", "goldman"];
          return countMoversBySectorKeywords(ctx.movers, bankKeywords, "down", -1) >= 2;
        },
      },
    ],
    suggestedNarration: "Le private equity trinque par contagion. La question, c'est : est-ce que ça déborde sur les banques ?",
    relatedClusters: ["immobilier_credit"],
    relatedAssets: ["XLF"],
  },

  // Chain 11: BoJ / Yen → Carry trade → Volatilité globale
  {
    id: "boj_yen_carry_trade",
    name: "BoJ → Yen → Carry trade → Volatilité",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "boj_monetary");
      const usdjpy = getAssetChange(ctx.assetMap, "USDJPY=X");
      return buzz >= 2 || (usdjpy !== null && Math.abs(usdjpy) > 1);
    },
    steps: [
      {
        label: "BoJ signale un changement de politique",
        verify: (ctx) => {
          return getClusterBuzz(ctx.clusters, "boj_monetary") >= 2 ||
            hasEventContaining(ctx.snapshot, ["boj", "bank of japan"]);
        },
      },
      {
        label: "Yen se renforce → débouclage carry trade",
        verify: (ctx) => {
          // USDJPY down = yen strengthening
          const usdjpy = getAssetChange(ctx.assetMap, "USDJPY=X");
          return usdjpy !== null && usdjpy < -0.5;
        },
      },
      {
        label: "Ventes forcées sur actifs risqués",
        verify: (ctx) => {
          const nikkei = getAssetChange(ctx.assetMap, "^N225");
          const nasdaq = getAssetChange(ctx.assetMap, "^IXIC");
          return (nikkei !== null && nikkei < -1) || (nasdaq !== null && nasdaq < -1);
        },
      },
      {
        label: "VIX monte",
        verify: (ctx) => {
          const vix = getAssetChange(ctx.assetMap, "^VIX");
          return vix !== null && vix > 3;
        },
      },
    ],
    suggestedNarration: "La BoJ bouge — et quand le yen se renforce, c'est tout le carry trade qui se déboucle. On l'a vu en août 2024, ça peut faire très mal.",
    relatedClusters: ["boj_monetary"],
    relatedAssets: ["USDJPY=X", "^N225", "^IXIC", "^VIX"],
  },

  // Chain 12: AI/Semis boom → Nasdaq → Rotation sectorielle
  {
    id: "ai_semis_nasdaq_rotation",
    name: "IA/Semis → Nasdaq → Rotation",
    trigger: (ctx) => {
      const buzz = getClusterBuzz(ctx.clusters, "ai_semiconductors");
      const nasdaqChange = getAssetChange(ctx.assetMap, "^IXIC");
      const hasNvidiaMover = ctx.movers.some((m) =>
        m.name.toLowerCase().includes("nvidia") || m.symbol === "NVDA",
      );
      const hasAmdMover = ctx.movers.some((m) =>
        m.name.toLowerCase().includes("amd") || m.symbol === "AMD",
      );
      return buzz >= 3 && (hasNvidiaMover || hasAmdMover || (nasdaqChange !== null && Math.abs(nasdaqChange) > 1));
    },
    steps: [
      {
        label: "News IA majeure",
        verify: (ctx) => getClusterBuzz(ctx.clusters, "ai_semiconductors") >= 3,
      },
      {
        label: "Semis réagissent (Nvidia, AMD, TSMC)",
        verify: (ctx) => {
          const semiKeywords = ["nvidia", "nvda", "amd", "tsmc", "broadcom", "qualcomm"];
          return ctx.movers.some((m) =>
            semiKeywords.some((kw) =>
              m.name.toLowerCase().includes(kw) || m.symbol.toLowerCase().includes(kw),
            ),
          );
        },
      },
      {
        label: "Nasdaq tiré par le secteur",
        verify: (ctx) => {
          const nasdaq = getAssetChange(ctx.assetMap, "^IXIC");
          return nasdaq !== null && Math.abs(nasdaq) > 0.5;
        },
      },
      {
        label: "Rotation sectorielle",
        verify: (ctx) => {
          // Check if XLK (tech) and non-tech sectors diverge
          const xlk = getAssetChange(ctx.assetMap, "XLK");
          const sp = getAssetChange(ctx.assetMap, "^GSPC");
          if (xlk === null || sp === null) return false;
          return Math.abs(xlk - sp) > 0.5;
        },
      },
    ],
    suggestedNarration: "L'IA continue de dominer les flux — attention à la concentration : quand tout repose sur 5 titres, le moindre faux pas peut faire mal.",
    relatedClusters: ["ai_semiconductors"],
    relatedAssets: ["^IXIC", "XLK"],
  },
];

// ── Main detection function ─────────────────────────────────────────────────

export function detectCausalChains(
  clusters: ClusteredResult,
  snapshot: DailySnapshot,
  movers: StockScreenResult[],
): ActiveCausalChain[] {
  // Build asset lookup map for fast access
  const assetMap = new Map<string, AssetSnapshot>();
  for (const asset of snapshot.assets) {
    assetMap.set(asset.symbol, asset);
  }

  const ctx: VerificationContext = {
    snapshot,
    clusters,
    movers,
    assetMap,
  };

  const activeChains: ActiveCausalChain[] = [];

  for (const chain of CAUSAL_CHAINS) {
    // Check trigger
    let triggerMet = false;
    try {
      triggerMet = chain.trigger(ctx);
    } catch {
      // Trigger evaluation failed (missing data), skip
      continue;
    }
    if (!triggerMet) continue;

    // Verify steps
    const confirmedSteps: string[] = [];
    for (const step of chain.steps) {
      try {
        if (step.verify(ctx)) {
          confirmedSteps.push(step.label);
        }
      } catch {
        // Step verification failed, skip this step
      }
    }

    // A chain is active if trigger is met AND >= 2 steps confirmed
    if (confirmedSteps.length >= 2) {
      activeChains.push({
        id: chain.id,
        name: chain.name,
        confidence: confirmedSteps.length / chain.steps.length,
        confirmedSteps,
        suggestedNarration: chain.suggestedNarration,
        relatedAssets: chain.relatedAssets,
      });
    }
  }

  // Sort by confidence DESC, limit to 3
  activeChains.sort((a, b) => b.confidence - a.confidence);
  return activeChains.slice(0, 3);
}
