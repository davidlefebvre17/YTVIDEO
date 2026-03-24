import type {
  DirectMatchRule,
  CausalRule,
  MetadataRule,
  SourceTier,
} from "./types";

// ============================================================
// 3.1 Normalisation du texte (CRITIQUE)
// ============================================================

/**
 * Normalise le texte avant matching.
 * - Lowercase
 * - Accents FR → ASCII
 * - Ponctuation → espaces
 * - Multi-espaces → simple
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Accents FR → ASCII (é→e, è→e, ê→e, à→a, ù→u, ç→c, ô→o, î→i, û→u, ë→e, ï→i, ü→u)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Ponctuation → espaces (pour word boundary matching)
    .replace(/['']/g, " ")     // apostrophes typographiques
    .replace(/[""«»]/g, " ")   // guillemets
    .replace(/[-–—]/g, " ")    // tirets
    .replace(/[.,;:!?()[\]{}]/g, " ")
    // Multi-espaces → simple
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// 3.2 Matching : word boundary vs substring
// ============================================================

/**
 * Cherche un pattern dans le texte normalisé.
 * Si wordBoundary=true, le pattern doit être entouré d'espaces ou en début/fin de string.
 * Si wordBoundary=false, simple substring match (indexOf).
 */
export function matchPattern(
  normalizedText: string,
  pattern: string,
  wordBoundary: boolean
): boolean {
  if (wordBoundary) {
    // Approche par espaces sur le texte déjà normalisé
    const padded = ` ${normalizedText} `;
    return padded.includes(` ${pattern} `);
  }
  return normalizedText.includes(pattern);
}

// ============================================================
// 3.3.a Watchlist 38 assets — Dictionnaire statique (~200 entrées)
// ============================================================

export const DIRECT_MATCH_RULES: DirectMatchRule[] = [
  // ==================== INDICES ====================
  {
    id: "direct_sp500",
    patterns: ["s&p 500", "s&p500", "s&p", "sp500", "spx", "^gspc", "standard & poor"],
    asset: "^GSPC",
    word_boundary: false,
  },
  {
    id: "direct_nasdaq",
    patterns: ["nasdaq", "^ixic", "nasdaq composite", "nasdaq 100", "qqq", "ndx"],
    asset: "^IXIC",
    word_boundary: false,
  },
  {
    id: "direct_djia",
    patterns: ["dow jones", "dow", "^dji", "djia"],
    asset: "^DJI",
    word_boundary: true,
  },
  {
    id: "direct_vix",
    patterns: ["vix", "^vix", "indice de la peur", "fear index", "volatility index", "cboe volatility", "volatilite"],
    asset: "^VIX",
    word_boundary: true,
  },
  {
    id: "direct_cac40",
    patterns: ["cac 40", "cac40", "^fchi", "cac quarante", "bourse de paris"],
    asset: "^FCHI",
    word_boundary: false,
  },
  {
    id: "direct_dax",
    patterns: ["dax 40", "dax40", "^gdaxi", "dax"],
    asset: "^GDAXI",
    word_boundary: true,
  },
  {
    id: "direct_ftse",
    patterns: ["ftse 100", "ftse100", "^ftse", "footsie", "ftse", "bourse de londres"],
    asset: "^FTSE",
    word_boundary: true,
  },
  {
    id: "direct_stoxx",
    patterns: ["stoxx 600", "stoxx600", "eurostoxx", "euro stoxx", "^stoxx", "marches europeens", "bourses europeennes"],
    asset: "^STOXX",
    word_boundary: false,
  },
  {
    id: "direct_nikkei",
    patterns: ["nikkei", "nikkei 225", "^n225", "bourse de tokyo", "tokyo stock"],
    asset: "^N225",
    word_boundary: false,
  },
  {
    id: "direct_shanghai",
    patterns: ["shanghai composite", "shanghai", "sse composite", "000001.ss", "bourse de shanghai"],
    asset: "000001.SS",
    word_boundary: true,
  },
  {
    id: "direct_hangseng",
    patterns: ["hang seng", "hsi", "^hsi", "hong kong bourse", "bourse de hong kong"],
    asset: "^HSI",
    word_boundary: false,
  },
  {
    id: "direct_shenzhen",
    patterns: ["shenzhen component", "399001.sz", "shenzhen"],
    asset: "399001.SZ",
    word_boundary: true,
  },
  {
    id: "direct_kospi",
    patterns: ["kospi", "^ks11", "bourse de seoul", "bourse coreenne"],
    asset: "^KS11",
    word_boundary: true,
  },

  // ==================== FOREX ====================
  {
    id: "direct_dxy",
    patterns: ["dollar index", "dxy", "dx-y.nyb", "indice dollar", "usd index", "billet vert", "greenback"],
    asset: "DX-Y.NYB",
    word_boundary: false,
  },
  {
    id: "direct_eurusd",
    patterns: ["eur/usd", "eurusd", "euro dollar", "euro/dollar", "eurusd=x"],
    asset: "EURUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_usdjpy",
    patterns: ["usd/jpy", "usdjpy", "dollar yen", "usdjpy=x"],
    asset: "USDJPY=X",
    word_boundary: false,
  },
  {
    id: "direct_gbpusd",
    patterns: ["gbp/usd", "gbpusd", "livre sterling", "cable", "gbpusd=x"],
    asset: "GBPUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_usdchf",
    patterns: ["usd/chf", "usdchf", "dollar franc suisse", "usdchf=x"],
    asset: "USDCHF=X",
    word_boundary: false,
  },
  {
    id: "direct_audusd",
    patterns: ["aud/usd", "audusd", "dollar australien", "aussie", "audusd=x"],
    asset: "AUDUSD=X",
    word_boundary: true,
  },
  {
    id: "direct_usdcad",
    patterns: ["usd/cad", "usdcad", "dollar canadien", "loonie", "usdcad=x"],
    asset: "USDCAD=X",
    word_boundary: false,
  },
  {
    id: "direct_nzdusd",
    patterns: ["nzd/usd", "nzdusd", "dollar neo zelandais", "kiwi dollar", "nzdusd=x"],
    asset: "NZDUSD=X",
    word_boundary: false,
  },
  {
    id: "direct_eurgbp",
    patterns: ["eur/gbp", "eurgbp", "euro livre", "eurgbp=x"],
    asset: "EURGBP=X",
    word_boundary: false,
  },
  {
    id: "direct_eurjpy",
    patterns: ["eur/jpy", "eurjpy", "euro yen", "eurjpy=x"],
    asset: "EURJPY=X",
    word_boundary: false,
  },
  {
    id: "direct_gbpjpy",
    patterns: ["gbp/jpy", "gbpjpy", "livre yen", "gbpjpy=x"],
    asset: "GBPJPY=X",
    word_boundary: false,
  },

  // ==================== COMMODITIES ====================
  {
    id: "direct_gold",
    patterns: [
      "xauusd", "xau/usd", "gc=f", "gold price", "gold futures",
      "cours de l or", "once d or", "prix de l or", "or spot",
      "gold rallies", "gold drops", "gold surges", "gold falls",
      "lingot", "valeur refuge or"
    ],
    asset: "GC=F",
    word_boundary: false,
  },
  {
    id: "direct_gold_fr_keyword",
    patterns: [
      "marche de l or", "mine d or", "production d or", "reserve d or", "demande d or",
      "offre d or", "investir dans l or", "l or a", "l or en", "l or monte",
      "l or baisse", "l or recule", "l or progresse"
    ],
    asset: "GC=F",
    word_boundary: false,
  },
  {
    id: "direct_silver",
    patterns: [
      "silver", "argent metal", "l'argent", "xagusd", "xag/usd", "si=f", "silver price",
      "cours de l argent", "once d argent", "silver futures"
    ],
    asset: "SI=F",
    word_boundary: false,
  },
  {
    id: "direct_copper",
    patterns: ["copper", "cuivre", "hg=f", "copper futures", "dr copper", "doctor copper",
               "cours du cuivre", "copper price"],
    asset: "HG=F",
    word_boundary: true,
  },
  {
    id: "direct_oil_wti",
    patterns: [
      "wti", "cl=f", "west texas", "crude oil", "petrole wti", "wti crude",
      "oil futures", "cours du petrole", "prix du petrole", "baril de petrole",
      "petrole brut", "oil prices", "oil price", "oil drops", "oil falls",
      "oil surges", "oil rises", "oil slump", "oil rally", "oil market",
      "cours du baril", "barrel price", "prix du baril",
      "opec", "opep"
    ],
    asset: "CL=F",
    word_boundary: false,
  },
  {
    id: "direct_oil_brent",
    patterns: [
      "brent", "bz=f", "brent crude", "brent oil", "petrole brent",
      "oil prices", "oil price", "oil drops", "oil falls",
      "oil surges", "oil rises", "oil slump", "oil rally", "oil market",
      "cours du baril", "barrel price", "prix du baril",
      "opec", "opep", "crude"
    ],
    asset: "BZ=F",
    word_boundary: false,
  },
  {
    id: "direct_natgas",
    patterns: ["natural gas", "gaz naturel", "ng=f", "natgas", "henry hub"],
    asset: "NG=F",
    word_boundary: false,
  },
  {
    id: "direct_wheat",
    patterns: ["wheat", "ble", "zw=f", "wheat futures", "cours du ble", "prix du ble"],
    asset: "ZW=F",
    word_boundary: true,
  },
  {
    id: "direct_platinum",
    patterns: ["platinum", "platine", "pl=f", "platinum futures", "cours du platine"],
    asset: "PL=F",
    word_boundary: true,
  },

  // ==================== CRYPTO ====================
  {
    id: "direct_btc",
    patterns: [
      "bitcoin", "btc", "btc-usd", "btc/usd", "btcusd",
      "satoshi", "halvingbitcoin", "bitcoin halving"
    ],
    asset: "BTC-USD",
    word_boundary: true,
  },
  {
    id: "direct_eth",
    patterns: ["ethereum", "eth", "eth-usd", "eth/usd", "ethusd", "ether"],
    asset: "ETH-USD",
    word_boundary: true,
  },
  {
    id: "direct_sol",
    patterns: ["solana", "sol-usd", "sol/usd", "solusd"],
    asset: "SOL-USD",
    word_boundary: false,
  },

  // ==================== ETFs SECTORIELS ====================
  {
    id: "direct_xlk",
    patterns: ["xlk", "tech sector etf", "technology select sector", "tech sector", "secteur tech"],
    asset: "XLK",
    word_boundary: true,
  },
  {
    id: "direct_xlf",
    patterns: ["xlf", "financial sector etf", "financial select sector", "financial sector", "secteur financier", "bank etf"],
    asset: "XLF",
    word_boundary: true,
  },
  {
    id: "direct_xle",
    patterns: ["xle", "energy sector etf", "energy select sector", "energy sector", "secteur energie", "energy etf"],
    asset: "XLE",
    word_boundary: true,
  },

  // ==================== YIELDS (pseudo-assets) ====================
  {
    id: "direct_us10y",
    patterns: [
      "us 10 year", "us10y", "10 year treasury", "treasury 10y",
      "taux 10 ans", "obligation 10 ans", "yield 10y", "10y yield",
      "rendement 10 ans", "us 10y"
    ],
    asset: "US10Y",
    word_boundary: false,
  },
  {
    id: "direct_us2y",
    patterns: [
      "us 2 year", "us2y", "2 year treasury", "treasury 2y",
      "taux 2 ans", "obligation 2 ans"
    ],
    asset: "US2Y",
    word_boundary: false,
  },
];

// ============================================================
// 3.3.b Stock Alias Rules — Comprehensive manual dictionary
// ============================================================

export const STOCK_ALIAS_RULES: DirectMatchRule[] = [

  // ================================================================
  // CAC 40 (40 valeurs)
  // ================================================================

  {
    id: "alias_ai",
    patterns: ["air liquide", "le gazier"],
    asset: "AI.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_air",
    patterns: ["airbus group", "avionneur europeen"],
    asset: "AIR.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_alo",
    patterns: ["alstom transport"],
    asset: "ALO.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_mt",
    patterns: ["arcelormittal", "arcelor", "mittal"],
    asset: "MT.AS",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_cs",
    patterns: ["axa assurance", "axa group"],
    asset: "CS.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_bnp",
    patterns: ["bnp", "la bnp", "bnp paribas fortis", "banque bnp"],
    asset: "BNP.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_en",
    patterns: ["bouygues telecom", "bouygues construction", "bouygues immobilier", "groupe bouygues"],
    asset: "EN.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_cap",
    patterns: ["capgemini consulting", "cap gemini", "capge"],
    asset: "CAP.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_ca",
    patterns: [
      "credit agricole", "casa", "le credit agricole",
      "banque verte"
    ],
    asset: "ACA.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_sgo",
    patterns: ["compagnie de saint gobain", "saint gobain", "saint-gobain"],
    asset: "SGO.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_dg",
    patterns: ["vinci construction", "vinci autoroutes", "groupe vinci"],
    asset: "DG.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_dte",
    patterns: ["dassault systemes", "3ds"],
    asset: "DSY.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_ei",
    patterns: ["essilor luxottica", "essilor", "luxottica"],
    asset: "EL.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_engi",
    patterns: ["engie", "gdf suez", "groupe engie"],
    asset: "ENGI.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_erm",
    patterns: ["hermes international", "hermes", "hermès", "maison hermes", "birkin"],
    asset: "RMS.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_ker",
    patterns: ["kering", "gucci", "groupe kering", "saint laurent", "ysl", "bottega veneta", "balenciaga", "francois henri pinault", "francois-henri pinault"],
    asset: "KER.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_or",
    patterns: ["l oreal", "loreal", "l'oreal", "groupe l oreal"],
    asset: "OR.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_mc",
    patterns: [
      "lvmh", "moet hennessy", "louis vuitton",
      "groupe arnault", "bernard arnault", "arnault",
      "christian dior", "dior", "tiffany lvmh",
      "sephora"
    ],
    asset: "MC.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_ml",
    patterns: ["michelin", "manufacture michelin", "bibendum"],
    asset: "ML.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_oran",
    patterns: ["orange telecom", "france telecom", "groupe orange"],
    asset: "ORA.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_pub",
    patterns: ["publicis groupe", "publicis sapient", "groupe publicis"],
    asset: "PUB.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_ri",
    patterns: ["pernod ricard", "pernod", "ricard"],
    asset: "RI.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_saf",
    patterns: ["safran aircraft", "groupe safran"],
    asset: "SAF.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_san",
    patterns: ["sanofi aventis", "groupe sanofi"],
    asset: "SAN.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_su",
    patterns: ["schneider electric", "schneider se"],
    asset: "SU.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_gle",
    patterns: ["societe generale", "socgen", "soc gen", "la sg", "banque sg", "generale"],
    asset: "GLE.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_stla",
    patterns: [
      "stellantis", "peugeot", "citroen", "fiat chrysler",
      "opel", "ds automobiles", "carlos tavares"
    ],
    asset: "STLAP.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_stm",
    patterns: ["stmicroelectronics", "stmicro", "st micro"],
    asset: "STMPA.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_tte",
    patterns: [
      "totalenergies", "total energies", "total sa",
      "groupe total", "le petrolier francais",
      "total petrole"
    ],
    asset: "TTE.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_ure",
    patterns: ["unibail rodamco", "unibail", "urw", "westfield"],
    asset: "URW.AS",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_vie",
    patterns: ["veolia environnement", "groupe veolia"],
    asset: "VIE.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_dn",
    patterns: ["danone", "groupe danone", "danone waters"],
    asset: "BN.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_rno",
    patterns: [
      "renault", "groupe renault", "renault nissan",
      "alliance renault", "luca de meo"
    ],
    asset: "RNO.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_te",
    patterns: ["technip energies", "technipfmc"],
    asset: "TE.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_lhn",
    patterns: ["lafargeholcim", "lafarge", "holcim"],
    asset: "LHN.SW",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_leg",
    patterns: ["legrand electrique", "groupe legrand"],
    asset: "LR.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },
  {
    id: "alias_tms",
    patterns: ["thales defense", "thales group", "groupe thales"],
    asset: "HO.PA",
    word_boundary: false,
    related_index: "^FCHI",
  },

  // ================================================================
  // MEGA CAPS US
  // ================================================================

  {
    id: "alias_aapl",
    patterns: [
      "iphone", "ipad", "macbook", "apple intelligence",
      "tim cook", "app store", "cupertino",
      "le geant de cupertino", "la firme a la pomme",
      "apple vision pro"
    ],
    asset: "AAPL",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_msft",
    patterns: [
      "microsoft azure", "azure", "copilot microsoft",
      "satya nadella", "nadella", "le geant de redmond",
      "redmond", "xbox", "windows", "github", "linkedin"
    ],
    asset: "MSFT",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_goog",
    patterns: [
      "google", "alphabet", "youtube", "deepmind",
      "sundar pichai", "pichai", "gemini google",
      "android", "waymo", "google cloud"
    ],
    asset: "GOOGL",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_amzn",
    patterns: [
      "amazon web services", "aws", "prime video",
      "andy jassy", "jassy", "amazon prime",
      "alexa amazon", "bezos"
    ],
    asset: "AMZN",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_nvda",
    patterns: [
      "nvidia", "geforce", "jensen huang", "huang",
      "gpu nvidia", "cuda", "nvidia a100", "nvidia h100",
      "nvidia blackwell", "nvidia grace"
    ],
    asset: "NVDA",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_meta",
    patterns: [
      "meta platforms", "facebook", "instagram",
      "mark zuckerberg", "zuckerberg", "zuck",
      "whatsapp", "threads meta",
      "metaverse", "reality labs", "llama meta"
    ],
    asset: "META",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_tsla",
    patterns: [
      "tesla motors", "elon musk", "musk",
      "model 3", "model y", "cybertruck",
      "gigafactory", "supercharger", "autopilot tesla",
      "full self driving", "fsd tesla",
      "spacex"
    ],
    asset: "TSLA",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_brk",
    patterns: [
      "berkshire hathaway", "berkshire", "warren buffett",
      "buffett", "charlie munger", "oracle of omaha",
      "oracle d omaha"
    ],
    asset: "BRK-B",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_jpm",
    patterns: [
      "jpmorgan", "jp morgan", "jamie dimon", "dimon",
      "chase bank", "jpmorgan chase"
    ],
    asset: "JPM",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_v",
    patterns: ["visa inc", "visa card", "visa network", "reseau visa"],
    asset: "V",
    word_boundary: false,
    related_index: "^GSPC",
  },
  {
    id: "alias_unh",
    patterns: ["unitedhealth", "united health group", "optum"],
    asset: "UNH",
    word_boundary: false,
    related_index: "^GSPC",
  },
  {
    id: "alias_xom",
    patterns: ["exxon mobil", "exxon", "exxonmobil"],
    asset: "XOM",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_lly",
    patterns: ["eli lilly", "lilly", "mounjaro", "zepbound", "tirzepatide"],
    asset: "LLY",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_avgo",
    patterns: ["broadcom", "broadcom inc", "vmware broadcom"],
    asset: "AVGO",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_crm",
    patterns: ["salesforce", "marc benioff", "benioff", "salesforce einstein"],
    asset: "CRM",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_cost",
    patterns: ["costco", "costco wholesale"],
    asset: "COST",
    word_boundary: true,
    related_index: "^GSPC",
  },
  {
    id: "alias_amd",
    patterns: ["advanced micro devices", "lisa su", "radeon", "ryzen", "epyc amd"],
    asset: "AMD",
    word_boundary: true,
    related_index: "^GSPC",
  },

  // ================================================================
  // DAX 40
  // ================================================================

  {
    id: "alias_sap",
    patterns: ["sap se", "sap erp", "sap cloud"],
    asset: "SAP.DE",
    word_boundary: true,
    related_index: "^GDAXI",
  },
  {
    id: "alias_sie",
    patterns: ["siemens ag", "siemens energy", "siemens healthineers"],
    asset: "SIE.DE",
    word_boundary: false,
    related_index: "^GDAXI",
  },
  {
    id: "alias_alv",
    patterns: ["allianz", "allianz se", "assureur allemand"],
    asset: "ALV.DE",
    word_boundary: true,
    related_index: "^GDAXI",
  },
  {
    id: "alias_dtegy",
    patterns: ["deutsche telekom", "t mobile", "telekom"],
    asset: "DTE.DE",
    word_boundary: true,
    related_index: "^GDAXI",
  },
  {
    id: "alias_dbk",
    patterns: ["deutsche bank", "db bank"],
    asset: "DBK.DE",
    word_boundary: false,
    related_index: "^GDAXI",
  },
  {
    id: "alias_bmw",
    patterns: ["bmw group", "bayerische motoren"],
    asset: "BMW.DE",
    word_boundary: false,
    related_index: "^GDAXI",
  },
  {
    id: "alias_vow",
    patterns: ["volkswagen", "vw", "porsche volkswagen", "wolfsburg"],
    asset: "VOW3.DE",
    word_boundary: true,
    related_index: "^GDAXI",
  },
  {
    id: "alias_bas",
    patterns: ["basf", "basf se", "chimiste allemand"],
    asset: "BAS.DE",
    word_boundary: true,
    related_index: "^GDAXI",
  },

  // ================================================================
  // FTSE 100
  // ================================================================

  {
    id: "alias_shel",
    patterns: ["shell", "royal dutch shell", "shell plc"],
    asset: "SHEL.L",
    word_boundary: true,
    related_index: "^FTSE",
  },
  {
    id: "alias_hsba",
    patterns: ["hsbc", "hsbc holdings", "hsbc bank"],
    asset: "HSBA.L",
    word_boundary: true,
    related_index: "^FTSE",
  },
  {
    id: "alias_azn",
    patterns: ["astrazeneca", "astra zeneca"],
    asset: "AZN.L",
    word_boundary: false,
    related_index: "^FTSE",
  },
  {
    id: "alias_bp",
    patterns: ["bp plc", "british petroleum", "beyond petroleum"],
    asset: "BP.L",
    word_boundary: false,
    related_index: "^FTSE",
  },
  {
    id: "alias_gsk",
    patterns: ["glaxosmithkline", "glaxo"],
    asset: "GSK.L",
    word_boundary: true,
    related_index: "^FTSE",
  },
  {
    id: "alias_rio",
    patterns: ["rio tinto", "riotinto"],
    asset: "RIO.L",
    word_boundary: false,
    related_index: "^FTSE",
  },
  {
    id: "alias_ulvr",
    patterns: ["unilever", "unilever plc"],
    asset: "ULVR.L",
    word_boundary: true,
    related_index: "^FTSE",
  },
  {
    id: "alias_barc",
    patterns: ["barclays", "barclays bank", "barclays plc"],
    asset: "BARC.L",
    word_boundary: true,
    related_index: "^FTSE",
  },

  // ================================================================
  // NIKKEI 50
  // ================================================================

  {
    id: "alias_7203",
    patterns: ["toyota", "toyota motor", "toyota motors"],
    asset: "7203.T",
    word_boundary: true,
    related_index: "^N225",
  },
  {
    id: "alias_6758",
    patterns: ["sony", "sony group", "playstation"],
    asset: "6758.T",
    word_boundary: true,
    related_index: "^N225",
  },
  {
    id: "alias_6861",
    patterns: ["keyence", "keyence corp"],
    asset: "6861.T",
    word_boundary: true,
    related_index: "^N225",
  },
  {
    id: "alias_8306",
    patterns: ["mitsubishi ufj", "mufg", "mitsubishi financial"],
    asset: "8306.T",
    word_boundary: true,
    related_index: "^N225",
  },
  {
    id: "alias_6501",
    patterns: ["hitachi", "hitachi ltd"],
    asset: "6501.T",
    word_boundary: true,
    related_index: "^N225",
  },
  {
    id: "alias_9984",
    patterns: ["softbank", "soft bank", "masayoshi son", "son masayoshi", "vision fund"],
    asset: "9984.T",
    word_boundary: true,
    related_index: "^N225",
  },

  // ================================================================
  // HANG SENG 30
  // ================================================================

  {
    id: "alias_0700",
    patterns: ["tencent", "tencent holdings", "wechat tencent"],
    asset: "0700.HK",
    word_boundary: true,
    related_index: "^HSI",
  },
  {
    id: "alias_9988",
    patterns: ["alibaba", "baba", "jack ma", "alicloud", "taobao"],
    asset: "9988.HK",
    word_boundary: true,
    related_index: "^HSI",
  },
  {
    id: "alias_3690",
    patterns: ["meituan", "meituan dianping"],
    asset: "3690.HK",
    word_boundary: true,
    related_index: "^HSI",
  },
  {
    id: "alias_1810",
    patterns: ["xiaomi", "xiaomi corp"],
    asset: "1810.HK",
    word_boundary: true,
    related_index: "^HSI",
  },
  {
    id: "alias_9618",
    patterns: ["jd.com", "jd com", "jingdong"],
    asset: "9618.HK",
    word_boundary: false,
    related_index: "^HSI",
  },
  {
    id: "alias_9888",
    patterns: ["baidu", "baidu inc", "ernie bot"],
    asset: "9888.HK",
    word_boundary: true,
    related_index: "^HSI",
  },
];

// ============================================================
// 3.3.c Auto-génération depuis company-profiles
// ============================================================

/**
 * Génère des DirectMatchRule pour chaque stock des company-profiles.
 * Appelé une fois au boot (pas à chaque article).
 */
// Tickers that are common French/English words — skip as patterns, match by name only
const SKIP_TICKER_PATTERNS = new Set([
  // 2-char tickers that are common words
  "de",  // Deere — French "de" (of/from)
  "ce",  // Celanese — French "ce" (this/that)
  "so",  // Southern Co — English "so"
  "on",  // ON Semi — English/French "on"
  "it",  // Gartner — English "it"
  "at",  // — English "at"
  "or",  // — French "or" (gold/or)
  "an",  // — French "an" (year)
  "ai",  // C3.ai — French "ai" (have)
  "re",  // — French "re"
  "el",  // — Spanish/French article
  "hd",  // Home Depot — English "hd" (high definition)
  "pm",  // Philip Morris — English "pm" (post meridiem)
  // 3-char tickers that are ultra-common words
  "all", // Allstate — English "all"
  "are", // — English "are"
  "les", // — French "les" (the)
  "has", // — English "has"
  "now", // ServiceNow — English "now"
  "low", // Lowe's — English "low"
  "ice", // ICE — English "ice"
  "net", // Cloudflare — English "net/internet"
  // 4-char tickers that are common financial words
  "cost", // Costco — English "cost"
  "fast", // Fastenal — English "fast"
  // 5-char tickers that are substrings of common words
  "googl", // Alphabet — substring of "google" everywhere
]);

// Company short names that are too common in financial context — skip as patterns
const SKIP_NAME_PATTERNS = new Set([
  "target",     // Target Corp — "price target" in every analyst article
]);

export function generateStockDirectRules(
  profiles: Array<{ symbol: string; name: string; index: string }>
): DirectMatchRule[] {
  return profiles.map((p) => {
    const patterns: string[] = [];

    // 1. Ticker (ex: "AAPL", "MSFT")
    // Skip tickers ≤1 char and common-word tickers
    const tickerClean = p.symbol.replace(/\..+$/, "").toLowerCase();
    if (tickerClean.length > 1 && !SKIP_TICKER_PATTERNS.has(tickerClean)) {
      patterns.push(p.symbol.toLowerCase());
    }

    // 2. Nom complet lowercase (ex: "apple inc", "microsoft corporation")
    const nameLower = p.name.toLowerCase();
    patterns.push(nameLower);

    // 3. Nom court (avant "inc", "corp", "ltd", "sa", "se", "plc", "ag", "nv", "group")
    const suffixes = /\s+(inc\.?|corp\.?|corporation|ltd\.?|limited|sa|se|plc|ag|nv|group|co\.?|& co\.?)$/i;
    const shortName = nameLower.replace(suffixes, "").trim();
    if (shortName !== nameLower && shortName.length > 2 && !SKIP_NAME_PATTERNS.has(shortName)) {
      patterns.push(shortName);
    }

    // word_boundary for all tickers ≤4 chars AND short names <6 chars
    // Prevents false positives: "meta" → "metals", "coin" → "bitcoin"
    const needsWordBoundary = p.symbol.replace(/\..+$/, "").length <= 4 || shortName.length < 6;

    return {
      id: `direct_stock_${p.symbol.toLowerCase()}`,
      patterns,
      asset: p.symbol,
      word_boundary: needsWordBoundary,
      related_index: p.index === "SP500" ? "^GSPC"
                   : p.index === "CAC40" ? "^FCHI"
                   : p.index === "DAX40" ? "^GDAXI"
                   : p.index === "FTSE100" ? "^FTSE"
                   : p.index === "NIKKEI50" ? "^N225"
                   : p.index === "HSI30" ? "^HSI"
                   : undefined,
    };
  });
}

// ============================================================
// 3.4 Couche 2 — Règles causales (20 règles V1)
// ============================================================

export const CAUSAL_RULES: CausalRule[] = [

  // ================================================================
  // POLITIQUE MONÉTAIRE (5 règles)
  // ================================================================

  {
    id: "fed_rate",
    triggers: [
      "fed", "fomc", "federal reserve", "jerome powell", "powell",
      "reserve federale", "banque centrale americaine",
      "taux directeur americain", "fed funds", "federal open market"
    ],
    modifiers: {
      bullish: [
        "cut", "pause", "dovish", "baisse", "accommodant", "assouplissement",
        "lower", "easing", "pivot", "souple", "reduction", "dovish tilt"
      ],
      bearish: [
        "hike", "hawkish", "hausse", "restrictif", "resserrement", "durcissement",
        "raise", "tightening", "higher for longer", "aggressive", "plus haut plus longtemps"
      ],
    },
    assets: ["GC=F", "DX-Y.NYB", "^GSPC", "US10Y"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "GC=F": "bullish",
        "DX-Y.NYB": "bearish",
        "^GSPC": "bullish",
        "US10Y": "bearish",
      },
      bearish_modifier: {
        "GC=F": "bearish",
        "DX-Y.NYB": "bullish",
        "^GSPC": "bearish",
        "US10Y": "bullish",
      },
    },
    confidence: "medium",
  },

  {
    id: "ecb_rate",
    triggers: [
      "ecb", "bce", "lagarde", "christine lagarde",
      "banque centrale europeenne", "european central bank",
      "taux directeur europeen", "taux de la bce"
    ],
    modifiers: {
      bullish: ["cut", "pause", "dovish", "baisse", "accommodant", "assouplissement", "easing"],
      bearish: ["hike", "hawkish", "hausse", "restrictif", "resserrement", "tightening"],
    },
    assets: ["EURUSD=X", "^FCHI", "^STOXX"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "EURUSD=X": "bearish",
        "^FCHI": "bullish",
        "^STOXX": "bullish",
      },
      bearish_modifier: {
        "EURUSD=X": "bullish",
        "^FCHI": "bearish",
        "^STOXX": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "boj_rate",
    triggers: [
      "boj", "bank of japan", "banque du japon", "ueda", "kazuo ueda",
      "politique monetaire japonaise", "taux japonais", "yield curve control", "ycc"
    ],
    modifiers: {
      bullish: ["cut", "dovish", "unchanged", "maintien", "statu quo", "ultra loose", "negatif"],
      bearish: ["hike", "hawkish", "hausse", "exit ycc", "normalisation", "abandon ycc"],
    },
    assets: ["USDJPY=X", "^N225", "EURJPY=X"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: {
        "USDJPY=X": "bullish",
        "^N225": "bullish",
        "EURJPY=X": "bullish",
      },
      bearish_modifier: {
        "USDJPY=X": "bearish",
        "^N225": "bearish",
        "EURJPY=X": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "boe_rate",
    triggers: [
      "boe", "bank of england", "banque d angleterre", "bailey", "andrew bailey",
      "taux britannique", "monetary policy committee", "mpc"
    ],
    modifiers: {
      bullish: ["cut", "dovish", "baisse", "pause", "easing"],
      bearish: ["hike", "hawkish", "hausse", "tightening"],
    },
    assets: ["GBPUSD=X", "^FTSE"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: { "GBPUSD=X": "bearish", "^FTSE": "bullish" },
      bearish_modifier: { "GBPUSD=X": "bullish", "^FTSE": "bearish" },
    },
    confidence: "medium",
  },

  {
    id: "pboc_rate",
    triggers: [
      "pboc", "people s bank of china", "banque populaire de chine",
      "taux chinois", "lpr", "loan prime rate", "rrr", "reserve requirement"
    ],
    modifiers: {
      bullish: ["cut", "baisse", "stimulus", "injection", "easing", "assouplissement"],
      bearish: ["hike", "hausse", "tightening", "resserrement"],
    },
    assets: ["^HSI", "000001.SS", "HG=F"],
    theme: "monetary_policy",
    sentiment_map: {
      bullish_modifier: { "^HSI": "bullish", "000001.SS": "bullish", "HG=F": "bullish" },
      bearish_modifier: { "^HSI": "bearish", "000001.SS": "bearish", "HG=F": "bearish" },
    },
    confidence: "medium",
  },

  // ================================================================
  // DONNÉES MACRO (5 règles)
  // ================================================================

  {
    id: "inflation_data",
    triggers: [
      "inflation", "cpi", "ppi", "consumer price", "producer price",
      "prix a la consommation", "indice des prix", "core inflation",
      "inflation sous jacente", "pce", "personal consumption expenditure",
      "deflation", "desinflation", "disinflationary"
    ],
    modifiers: {
      bullish: [
        "above", "beat", "hot", "higher than", "accelerating", "surprise",
        "au dessus", "superieur", "acceleration", "hausse"
      ],
      bearish: [
        "below", "miss", "cool", "lower than", "decelerating", "slowing",
        "en dessous", "inferieur", "deceleration", "baisse", "ralentissement"
      ],
    },
    assets: ["GC=F", "DX-Y.NYB", "^VIX", "US10Y"],
    theme: "inflation",
    sentiment_map: {
      bullish_modifier: {
        "GC=F": "bullish",
        "DX-Y.NYB": "bullish",
        "^VIX": "bullish",
        "US10Y": "bullish",
      },
      bearish_modifier: {
        "GC=F": "bearish",
        "DX-Y.NYB": "bearish",
        "^VIX": "bearish",
        "US10Y": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "employment_data",
    triggers: [
      "nfp", "non farm payroll", "payrolls", "jobs report", "employment",
      "unemployment", "jobless claims", "initial claims", "chomage",
      "taux de chomage", "emploi americain", "marche de l emploi",
      "adp employment", "jolts", "job openings", "labour market", "labor market"
    ],
    modifiers: {
      bullish: [
        "beat", "strong", "above", "robust", "surging", "hot",
        "superieur", "solide", "dynamique", "au dessus"
      ],
      bearish: [
        "miss", "weak", "below", "declining", "slowing", "rising unemployment",
        "inferieur", "faible", "en baisse", "hausse du chomage"
      ],
    },
    assets: ["DX-Y.NYB", "^GSPC", "US10Y"],
    theme: "employment",
    sentiment_map: {
      bullish_modifier: {
        "DX-Y.NYB": "bullish",
        "^GSPC": "bullish",
        "US10Y": "bullish",
      },
      bearish_modifier: {
        "DX-Y.NYB": "bearish",
        "^GSPC": "bearish",
        "US10Y": "bearish",
      },
    },
    confidence: "medium",
  },

  {
    id: "gdp_growth",
    triggers: [
      "gdp", "pib", "gross domestic product", "produit interieur brut",
      "economic growth", "croissance economique", "recession",
      "contraction", "soft landing", "atterrissage en douceur",
      "hard landing", "stagflation"
    ],
    assets: ["^GSPC", "DX-Y.NYB", "US10Y"],
    theme: "gdp_growth",
    confidence: "medium",
  },

  {
    id: "retail_consumer",
    triggers: [
      "retail sales", "consumer spending", "consumer confidence",
      "consumer sentiment", "university of michigan", "michigan sentiment",
      "ventes au detail", "consommation des menages", "confiance des consommateurs",
      "depenses de consommation"
    ],
    assets: ["^GSPC"],
    theme: "gdp_growth",
    confidence: "medium",
  },

  {
    id: "pmi_ism",
    triggers: [
      "pmi", "ism", "purchasing managers", "manufacturing pmi", "services pmi",
      "indice pmi", "indice ism", "indice manufacturier", "indice des directeurs d achat",
      "flash pmi", "composite pmi", "pmi manufacturier", "pmi services"
    ],
    assets: ["^GSPC", "DX-Y.NYB"],
    theme: "gdp_growth",
    confidence: "medium",
  },

  // ================================================================
  // GÉOPOLITIQUE ET COMMODITIES (4 règles)
  // ================================================================

  {
    id: "opec_oil",
    triggers: [
      "opec", "opep", "opec+", "opec plus",
      "production petroliere", "oil production", "oil output",
      "quota petrole", "oil quota", "oil supply cut",
      "arabie saoudite petrole", "saudi oil", "saudi arabia oil"
    ],
    modifiers: {
      bullish: [
        "cut", "reduction", "baisse production", "restrict", "quotas"
      ],
      bearish: [
        "increase", "raise", "augmentation", "hausse production", "boost output"
      ],
    },
    assets: ["CL=F", "BZ=F"],
    theme: "commodities",
    sentiment_map: {
      bullish_modifier: { "CL=F": "bullish", "BZ=F": "bullish" },
      bearish_modifier: { "CL=F": "bearish", "BZ=F": "bearish" },
    },
    confidence: "high",
  },

  {
    id: "trade_war",
    triggers: [
      "tariff", "tariffs", "droits de douane", "trade war", "guerre commerciale",
      "trade tensions", "tensions commerciales", "sanctions economiques",
      "trade deficit", "deficit commercial", "protectionism", "protectionnisme",
      "embargo", "import duty", "export ban", "trade restrictions"
    ],
    assets: ["DX-Y.NYB", "^GSPC", "GC=F"],
    theme: "geopolitics",
    confidence: "medium",
  },

  {
    id: "geopolitical_tension",
    triggers: [
      "guerre", "war", "conflit", "conflict", "missile", "frappe",
      "strike", "invasion", "militaire", "military", "tensions",
      "escalade", "escalation", "bombardement", "bombing",
      "nuclear", "nucleaire", "ceasefire", "cessez le feu",
      "armistice", "peace deal", "accord de paix"
    ],
    assets: ["GC=F", "CL=F", "^VIX"],
    theme: "geopolitics",
    confidence: "medium",
    min_triggers: 1,
  },

  {
    id: "china_macro",
    triggers: [
      "chine", "china", "chinois", "chinese", "pekin", "beijing",
      "stimulus chinois", "china stimulus", "deflation chinoise", "china deflation",
      "yuan", "renminbi", "cny", "evergrande", "property crisis china",
      "crise immobiliere chinoise"
    ],
    assets: ["^HSI", "000001.SS", "HG=F", "CL=F"],
    theme: "geopolitics",
    confidence: "medium",
    min_triggers: 1,
    exclude_patterns: ["chinese food", "cuisine chinoise", "chinese new year"],
  },

  // ================================================================
  // EARNINGS ET CORPORATE (2 règles)
  // ================================================================

  {
    id: "earnings_generic",
    triggers: [
      "earnings", "resultats", "benefice", "benefices", "chiffre d affaires",
      "revenue", "guidance", "profit warning", "avertissement sur resultats",
      "earnings season", "saison des resultats", "quarterly results",
      "resultats trimestriels", "eps", "earnings per share",
      "beat expectations", "miss expectations"
    ],
    assets: [],
    theme: "earnings",
    confidence: "medium",
  },

  {
    id: "mega_cap_earnings",
    triggers: [
      "apple earnings", "microsoft earnings", "google earnings", "alphabet earnings",
      "amazon earnings", "nvidia earnings", "meta earnings", "tesla earnings",
      "magnificent seven", "mag 7", "mag7", "big tech earnings",
      "resultats apple", "resultats microsoft", "resultats nvidia",
      "resultats google", "resultats amazon", "resultats meta", "resultats tesla",
      "gafam", "faang"
    ],
    assets: ["^GSPC", "^IXIC"],
    theme: "earnings",
    confidence: "high",
  },

  // ================================================================
  // CRYPTO (2 règles)
  // ================================================================

  {
    id: "crypto_regulation",
    triggers: [
      "sec crypto", "sec bitcoin", "sec ethereum",
      "crypto regulation", "regulation crypto", "reglementation crypto",
      "gensler", "gary gensler", "stablecoin regulation",
      "crypto ban", "interdiction crypto",
      "bitcoin etf", "ethereum etf", "spot etf", "etf bitcoin", "etf crypto",
      "mifid crypto", "mica regulation"
    ],
    assets: ["BTC-USD", "ETH-USD", "SOL-USD"],
    theme: "regulation",
    confidence: "medium",
  },

  {
    id: "crypto_adoption",
    triggers: [
      "bitcoin adoption", "adoption crypto", "institutional crypto",
      "institutional bitcoin", "crypto institutional",
      "halving", "bitcoin halving", "halvening",
      "whale", "whale alert", "whale transfer",
      "defi", "decentralized finance", "finance decentralisee",
      "nft market", "marche nft"
    ],
    assets: ["BTC-USD", "ETH-USD"],
    theme: "crypto_market",
    confidence: "medium",
  },

  // ================================================================
  // SENTIMENT ET RISK (2 règles)
  // ================================================================

  {
    id: "risk_sentiment",
    triggers: [
      "risk off", "risk-off", "aversion au risque", "risk aversion",
      "fuite vers la qualite", "flight to quality", "flight to safety",
      "safe haven", "valeur refuge", "risk appetite", "appetit pour le risque",
      "risk on", "risk-on", "rally", "selloff", "sell off", "sell-off",
      "correction", "bear market", "bull market", "marche baissier", "marche haussier",
      "capitulation", "panic selling", "vente panique"
    ],
    assets: ["^VIX", "GC=F", "USDJPY=X", "^GSPC"],
    theme: "risk_sentiment",
    confidence: "medium",
  },

  {
    id: "banking_crisis",
    triggers: [
      "bank run", "bank failure", "faillite bancaire", "bank collapse",
      "banking crisis", "crise bancaire", "liquidity crisis", "crise de liquidite",
      "bank stress", "stress bancaire", "bank contagion", "contagion bancaire",
      "deposit flight", "fuite des depots", "svb", "silicon valley bank",
      "credit suisse", "systemic risk", "risque systemique"
    ],
    assets: ["^VIX", "GC=F", "^GSPC", "BTC-USD", "XLF"],
    theme: "risk_sentiment",
    confidence: "high",
  },
];

// ============================================================
// 3.5 Couche 3 — Metadata source
// ============================================================

export const METADATA_RULES: MetadataRule[] = [
  // Crypto
  {
    id: "meta_coindesk",
    source_patterns: ["coindesk", "coindesk.com"],
    default_theme: "crypto_market",
    default_assets: ["BTC-USD"],
  },
  {
    id: "meta_cointelegraph",
    source_patterns: ["cointelegraph", "cointelegraph.com"],
    default_theme: "crypto_market",
    default_assets: ["BTC-USD"],
  },

  // Forex
  {
    id: "meta_fxstreet",
    source_patterns: ["fxstreet", "fxstreet.com"],
    default_theme: "other",
  },

  // Commodities FR
  {
    id: "meta_investing_commodities",
    source_patterns: ["fr.investing.com/rss/commodities"],
    default_theme: "commodities",
  },

  // Forex FR
  {
    id: "meta_investing_forex",
    source_patterns: ["fr.investing.com/rss/forex"],
    default_theme: "other",
  },
];

// ============================================================
// 3.6 Source Tiers pour Impact Scoring
// ============================================================

export const SOURCE_TIERS: SourceTier[] = [
  // ========== TIER 1 — Journalisme pro, sources primaires ==========
  { patterns: ["reuters", "afp"], tier: 1 },
  { patterns: ["cnbc.com", "cnbc"], tier: 1 },
  { patterns: ["les echos", "lesechos", "feedburner.com/lesechos"], tier: 1 },
  { patterns: ["l agefi", "agefi.fr", "lagefi"], tier: 1 },
  { patterns: ["financial times", "ft.com"], tier: 1 },
  { patterns: ["wall street journal", "wsj"], tier: 1 },
  { patterns: ["bloomberg"], tier: 1 },
  { patterns: ["barron s", "barrons"], tier: 1 },
  { patterns: ["finnhub"], tier: 1 },

  // ========== TIER 2 — Sources spécialisées, analyse ==========
  { patterns: ["zonebourse", "zonebourse.com"], tier: 2 },
  { patterns: ["tradingsat", "tradingsat.com", "bfm bourse"], tier: 2 },
  { patterns: ["easybourse", "easybourse.com"], tier: 2 },
  { patterns: ["fxstreet", "fxstreet.com"], tier: 2 },
  { patterns: ["coindesk", "coindesk.com"], tier: 2 },
  { patterns: ["cointelegraph", "cointelegraph.com"], tier: 2 },
  { patterns: ["investing.com", "fr.investing.com"], tier: 2 },
  { patterns: ["bfm business", "bfmbusiness"], tier: 2 },
  { patterns: ["marketwatch"], tier: 2 },
  { patterns: ["zacks"], tier: 2 },
  { patterns: ["motley fool"], tier: 2 },
  { patterns: ["seekingalpha", "seeking alpha"], tier: 2 },

  // ========== TIER 3 — Agrégateurs, blogs, reste ==========
  { patterns: ["yahoo finance", "yahoo"], tier: 3 },
  { patterns: ["google news", "news.google"], tier: 3 },
];

/**
 * Détermine le tier d'une source.
 * Cherche dans source name ET feed_url (si disponible).
 * Défaut : tier 3.
 */
export function getSourceTier(source: string, feedUrl?: string): 1 | 2 | 3 {
  const normalizedSource = source.toLowerCase();
  const normalizedFeed = feedUrl?.toLowerCase() ?? "";

  for (const tier of SOURCE_TIERS) {
    for (const pattern of tier.patterns) {
      if (normalizedSource.includes(pattern) || normalizedFeed.includes(pattern)) {
        return tier.tier;
      }
    }
  }
  return 3; // défaut
}

// ============================================================
// 3.7 Impact Scoring
// ============================================================

/**
 * Calcule l'impact d'un article à partir de :
 * - Le tier de sa source
 * - Présence d'un keyword fort (trigger couche 2 matché)
 * - Nombre d'assets taggés (proxy de portée macro)
 */
export function computeImpact(
  sourceTier: 1 | 2 | 3,
  hasCausalRuleMatch: boolean,
  assetCount: number
): "high" | "medium" | "low" {
  // Tier 1 + causal rule → always high
  if (sourceTier === 1 && hasCausalRuleMatch) return "high";

  // Tier 1 sans causal, ou Tier 2 + causal → medium
  if (sourceTier === 1) return "medium";
  if (sourceTier === 2 && hasCausalRuleMatch) return "medium";

  // Tier 2 + multi-asset (≥3 assets) → medium (probablement macro)
  if (sourceTier === 2 && assetCount >= 3) return "medium";

  // Tout le reste → low
  return "low";
}
