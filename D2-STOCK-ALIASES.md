# D2 — Complément : Dictionnaire d'alias stocks prioritaires

> **Compagnon du D2-NEWS-MEMORY-SPEC.md**
> Ce fichier contient les alias manuels pour les ~50 stocks les plus couverts
> par les médias FR et US. Ces alias s'ajoutent au auto-gen de `generateStockDirectRules()`.
>
> Objectif : capturer les surnoms, abréviations courantes, noms FR alternatifs
> que le auto-gen (ticker + nom officiel + shortName) ne capte pas.
>
> Dernière mise à jour : 2026-03-11

---

## Comment intégrer

Dans `tagging-rules.ts`, ce dictionnaire est un array de `DirectMatchRule` supplémentaires
qui se merge avec les règles auto-générées. En cas de conflit (même asset),
le merge est naturel car on dedup par symbol dans le Map.

```typescript
// Dans tagging-rules.ts
export const STOCK_ALIAS_RULES: DirectMatchRule[] = [ ... ];

// Dans news-tagger.ts, initTagger()
const allDirectRules = [
  ...DIRECT_MATCH_RULES,           // watchlist 38 assets statiques
  ...generateStockDirectRules(profiles),  // 763 stocks auto-gen
  ...STOCK_ALIAS_RULES,            // alias manuels (ce fichier)
];
```

---

## CAC 40 — Alias complets

Les articles FR utilisent massivement des noms courts, des sigles, et des surnoms.
Chaque entrée ci-dessous ne liste QUE les patterns qui NE SONT PAS déjà capturés
par le auto-gen (ticker + nom officiel + shortName).

```typescript
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
    word_boundary: true,  // "bnp" est court
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
      "banque verte"  // surnom historique
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
    // Dassault Systèmes — souvent confondu avec Dassault Aviation
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
    patterns: ["hermes international", "hermes", "hermès", "maison hermes",
               "birkin"],  // Le sac Birkin est tellement associé à Hermès
    asset: "RMS.PA",
    word_boundary: true,
    related_index: "^FCHI",
  },
  {
    id: "alias_ker",
    patterns: ["kering", "gucci", "groupe kering",
               "saint laurent", "ysl", "bottega veneta",
               "balenciaga",
               "francois henri pinault", "francois-henri pinault"],
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
    // NOTE: le ticker "OR" est dangereux (métal "or") → word_boundary géré par auto-gen
  },
  {
    id: "alias_mc",
    patterns: [
      "lvmh", "moet hennessy", "louis vuitton",
      "groupe arnault", "bernard arnault", "arnault",
      "christian dior", "dior", "tiffany lvmh",
      "sephora"  // filiale retail très médiatisée
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
    // NOTE: "orange" seul est le fruit → on ne le met PAS seul
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
    patterns: [
      "societe generale", "socgen", "soc gen",
      "la sg", "banque sg", "generale"
      // "generale" → word_boundary obligatoire (mot commun)
    ],
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
    // NOTE: "total" seul est trop générique → PAS inclus
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
  // MEGA CAPS US — Surnoms et noms alternatifs
  // ================================================================
  // (le auto-gen capture déjà ticker + nom officiel + shortName)
  // Ici : surnoms journalistiques, noms de produits associés, dirigeants

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
      // NOTE: "windows" et "linkedin" seuls → word_boundary
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
      "spacex"  // Musk news impacte TSLA même si SpaceX est privé
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
    // Visa — ticker "V" est 1 char → auto-gen l'exclut
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
  // DAX 40 — Principales valeurs allemandes
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
    // "bmw" seul est capté par auto-gen via ticker
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
  // FTSE 100 — Principales valeurs britanniques
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
    // "bp" seul → 2 chars, word_boundary géré par auto-gen
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
  // NIKKEI 50 — Principales valeurs japonaises
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
  // HANG SENG 30 — Principales valeurs HK/Chine
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
```

---

## Couverture finale — Récapitulatif

| Source de matching | Stocks couverts | Ce qu'il capture |
|---|:---:|---|
| Auto-gen ticker | 763 | `"AAPL"`, `"NVDA"`, `"MC.PA"` dans le texte |
| Auto-gen nom officiel | 763 | `"apple inc"`, `"nvidia corporation"`, `"lvmh moet hennessy"` |
| Auto-gen shortName | ~700 | `"apple"`, `"nvidia"`, `"lvmh moet hennessy"` |
| **Alias manuels CAC 40** | **~35** | `"socgen"`, `"la bnp"`, `"arnault"`, `"kering gucci"`, etc. |
| **Alias manuels US mega** | **~17** | `"tim cook"`, `"jensen huang"`, `"geant de redmond"`, `"iphone"`, etc. |
| **Alias manuels DAX** | **~8** | `"volkswagen vw"`, `"deutsche bank"`, etc. |
| **Alias manuels FTSE** | **~8** | `"shell"`, `"hsbc"`, `"barclays"`, etc. |
| **Alias manuels Nikkei** | **~6** | `"toyota"`, `"sony"`, `"softbank"`, etc. |
| **Alias manuels HSI** | **~6** | `"tencent"`, `"alibaba"`, `"baidu"`, etc. |
| **Total alias manuels** | **~80 règles** | Surnoms, dirigeants, produits, noms FR courants |

### Ce qui passe encore à travers (acceptable V1)

| Cas | Exemple | Pourquoi on accepte |
|---|---|---|
| Périphrases journalistiques | "le géant du streaming" (Netflix) | Impossible en rules-based, ~5% des cas |
| Références indirectes | "le concurrent d'Airbus" (Boeing) | Requiert compréhension sémantique |
| Conglomérats via filiale obscure | "Moët & Chandon" (→ LVMH) | On a "moet hennessy" mais pas chaque marque |
| Sociétés mid-cap sans alias | "Worldline" en FR | Le auto-gen capture ticker+nom, suffisant |
| Noms dans d'autres alphabets | Articles JP/CN en caractères natifs | Hors scope — on ne traite que les feeds FR/EN |

→ **Couverture estimée avec alias : ~85-90% des mentions d'actions dans les articles FR/EN.**
→ Les 10-15% restants sont le terrain du futur upgrade Haiku (Bloc D2 upgrade path).

---

## Points d'attention implémentation

1. **Ne pas dupliquer** : si `generateStockDirectRules` génère déjà `"nvidia"` pour NVDA,
   les alias ajoutent `"jensen huang"`, `"geforce"`, etc. — pas de redondance.

2. **Normalisation** : tous les patterns ci-dessus sont écrits en minuscules sans accents.
   Le `normalizeText()` du moteur de tagging s'en charge automatiquement.

3. **word_boundary** : attention aux mots courts. `"vw"`, `"bp"`, `"bnp"` → `word_boundary: true`.

4. **Dirigeants** : on tague le stock quand le dirigeant est mentionné. C'est un choix éditorial :
   "Elon Musk tweet" → tag TSLA. C'est correct dans 95% des cas en contexte finance.
   Le 5% restant (Musk parle de SpaceX, pas de Tesla) → faux positif acceptable.

5. **Produits** : `"iphone"` → AAPL, `"playstation"` → 6758.T. Même logique.
   En contexte finance/news, la mention d'un produit référence quasi-toujours le stock.

6. **Mise à jour** : ce dictionnaire est statique. À revoir :
   - Si un dirigeant change (nouveau CEO)
   - Si une acquisition majeure crée de nouveaux alias
   - Après 2 semaines de data, analyser les articles "other" pour trouver des patterns manquants
