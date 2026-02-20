/**
 * Enrich company profiles that Finnhub couldn't fetch (European, Asian stocks).
 * Manual sector mapping for known companies.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const OUTPUT_FILE = join(process.cwd(), "data", "company-profiles.json");

// Manual sector mapping for non-US stocks
const MANUAL_SECTORS: Record<string, { sector: string; correlation: string }> = {
  // ─── CAC 40 ────────────────────────────────────────
  "AI.PA":     { sector: "Chemicals", correlation: "Gaz industriels — cyclique, industrie mondiale" },
  "AIR.PA":    { sector: "Aerospace & Defense", correlation: "Géopolitique ↑, commandes aériennes, supply chain moteurs" },
  "AXA.PA":    { sector: "Insurance", correlation: "Yields ↑ — portefeuille obligataire" },
  "BN.PA":     { sector: "Food Products", correlation: "Défensif, consommation de base" },
  "BNP.PA":    { sector: "Banks", correlation: "Yields ↑, spread 10Y-2Y ↑ — modèle bancaire" },
  "CA.PA":     { sector: "Retail", correlation: "Consommateur FR, inflation alimentaire" },
  "CAP.PA":    { sector: "Technology", correlation: "Services IT, ^IXIC ↑, transformation digitale" },
  "ACA.PA":    { sector: "Banks", correlation: "Yields ↑, spread 10Y-2Y ↑" },
  "DSY.PA":    { sector: "Software", correlation: "^IXIC ↑, taux ↓↓ — valorisation tech" },
  "ENGI.PA":   { sector: "Utilities", correlation: "Gaz naturel, défensif, transition énergétique" },
  "EL.PA":     { sector: "Medical Devices", correlation: "Défensif, optique/santé visuelle" },
  "RMS.PA":    { sector: "Luxury Goods", correlation: "Chine ↑↑, EUR/USD, tourisme asiatique" },
  "KER.PA":    { sector: "Luxury Goods", correlation: "Chine ↑↑, EUR/USD — Gucci, Saint-Laurent" },
  "LR.PA":     { sector: "Electrical Equipment", correlation: "Construction, rénovation bâtiment" },
  "OR.PA":     { sector: "Consumer products", correlation: "Consommateur mondial, Chine, cosmétiques" },
  "MC.PA":     { sector: "Luxury Goods", correlation: "Chine ↑↑, EUR/USD — LVMH Louis Vuitton, Dior" },
  "ML.PA":     { sector: "Metals & Mining", correlation: "Manganèse, nickel — métaux industriels" },
  "ORA.PA":    { sector: "Telecom Services", correlation: "Défensif, dividendes, régulation télécom" },
  "RI.PA":     { sector: "Beverages", correlation: "Défensif, consommation de base — Pernod Ricard" },
  "PUB.PA":    { sector: "Media", correlation: "Publicité, cycle économique" },
  "RNO.PA":    { sector: "Automobiles", correlation: "EUR/USD, tarifs, transition EV" },
  "SAF.PA":    { sector: "Aerospace & Defense", correlation: "Aéronautique, défense, moteurs — corrélé AIR.PA" },
  "SAN.PA":    { sector: "Drug Manufacturers", correlation: "FDA, pipelines R&D, pharma défensif" },
  "SGO.PA":    { sector: "Building Products", correlation: "Construction, immobilier, taux" },
  "SU.PA":     { sector: "Electrical Equipment", correlation: "Automatisation, transition énergétique, industrie" },
  "GLE.PA":    { sector: "Banks", correlation: "Yields ↑, spread 10Y-2Y ↑" },
  "STMPA.PA":  { sector: "Semiconductors", correlation: "^IXIC ↑, ^KS11 — semi-conducteurs européens" },
  "TEP.PA":    { sector: "Technology", correlation: "Services BPO, externalisation, emploi" },
  "HO.PA":     { sector: "Aerospace & Defense", correlation: "Géopolitique ↑↑, défense, cybersécurité" },
  "TTE.PA":    { sector: "Oil & Gas Integrated", correlation: "CL=F (pétrole) ↑↑ — major pétrolière" },
  "VIE.PA":    { sector: "Utilities", correlation: "Eau, déchets, transition écologique — défensif" },
  "DG.PA":     { sector: "Construction", correlation: "Infrastructure, concessions autoroutières, taux" },
  "VIV.PA":    { sector: "Media", correlation: "Médias, streaming, Canal+" },
  "WLN.PA":    { sector: "Technology", correlation: "Paiements digitaux, fintech" },
  "EN.PA":     { sector: "Construction", correlation: "Bouygues — construction, télécom, médias" },
  "MT.AS":     { sector: "Metals & Mining", correlation: "Acier, ArcelorMittal — cycle industriel mondial" },
  "SW.PA":     { sector: "Hotels, Restaurants & Leisure", correlation: "Restauration collective, services" },
  "URW.AS":    { sector: "Real Estate", correlation: "Taux ↓↓, centres commerciaux, commerce physique" },
  "STLAM.MI":  { sector: "Automobiles", correlation: "EUR/USD, tarifs — Stellantis (Peugeot/Fiat/Chrysler)" },

  // ─── DAX 40 ────────────────────────────────────────
  "ADS.DE":    { sector: "Consumer products", correlation: "Consommateur sport, Chine" },
  "ALV.DE":    { sector: "Insurance", correlation: "Yields ↑ — Allianz, assurance/gestion actifs" },
  "BAS.DE":    { sector: "Chemicals", correlation: "Cycle industriel, gaz naturel Europe — BASF" },
  "BAYN.DE":   { sector: "Drug Manufacturers", correlation: "Pharma + agriculture — Bayer, litiges glyphosate" },
  "BMW.DE":    { sector: "Automobiles", correlation: "EUR/USD, tarifs, transition EV — BMW" },
  "CON.DE":    { sector: "Auto Parts", correlation: "Cycle auto, pneus, capteurs" },
  "1COV.DE":   { sector: "Chemicals", correlation: "Cycle industriel — Covestro, polymères" },
  "DAI.DE":    { sector: "Automobiles", correlation: "EUR/USD, tarifs, transition EV — Mercedes" },
  "DBK.DE":    { sector: "Banks", correlation: "Yields ↑, spread — Deutsche Bank" },
  "DB1.DE":    { sector: "Financial Services", correlation: "Volumes de marché — Deutsche Börse" },
  "DHL.DE":    { sector: "Air Freight & Logistics", correlation: "Commerce mondial, CL=F ↓ — DHL/Deutsche Post" },
  "DTE.DE":    { sector: "Telecom Services", correlation: "Défensif, T-Mobile US — Deutsche Telekom" },
  "EOAN.DE":   { sector: "Utilities", correlation: "Gaz naturel, transition énergétique — E.ON" },
  "FRE.DE":    { sector: "Medical Devices", correlation: "Défensif, dialyse — Fresenius" },
  "HEI.DE":    { sector: "Utilities", correlation: "Gaz naturel, ciment — HeidelbergCement" },
  "HEN3.DE":   { sector: "Consumer products", correlation: "Consommation de base — Henkel" },
  "IFX.DE":    { sector: "Semiconductors", correlation: "^IXIC ↑, auto EV — Infineon" },
  "LIN.DE":    { sector: "Chemicals", correlation: "Gaz industriels — Linde" },
  "MBG.DE":    { sector: "Automobiles", correlation: "EUR/USD, tarifs — Mercedes-Benz" },
  "MRK.DE":    { sector: "Drug Manufacturers", correlation: "Pharma, semi-conducteurs — Merck KGaA" },
  "MUV2.DE":   { sector: "Insurance", correlation: "Yields ↑, catastrophes naturelles — Munich Re" },
  "RWE.DE":    { sector: "Utilities", correlation: "Énergie renouvelable, charbon, gaz — RWE" },
  "SAP.DE":    { sector: "Software", correlation: "^IXIC ↑, taux ↓↓ — ERP, cloud" },
  "SIE.DE":    { sector: "Industrial Conglomerates", correlation: "Cycle industriel, automatisation — Siemens" },
  "SHL.DE":    { sector: "Medical Devices", correlation: "Défensif, dialyse — Siemens Healthineers" },
  "SY1.DE":    { sector: "Technology", correlation: "Semi-conducteurs, Infineon spin-off — Siemens Energy" },
  "VOW3.DE":   { sector: "Automobiles", correlation: "EUR/USD, tarifs, transition EV — Volkswagen" },
  "ZAL.DE":    { sector: "Retail", correlation: "E-commerce mode, consommateur EU — Zalando" },
  "PAH3.DE":   { sector: "Automobiles", correlation: "Volkswagen, Porsche, Bugatti — holding auto" },
  "P911.DE":   { sector: "Automobiles", correlation: "Luxe auto, Chine — Porsche AG" },
  "RHM.DE":    { sector: "Aerospace & Defense", correlation: "Géopolitique ↑↑, défense Europe — Rheinmetall" },
  "MTX.DE":    { sector: "Chemicals", correlation: "Gaz spéciaux — MTU Aero Engines" },
  "BEI.DE":    { sector: "Consumer products", correlation: "Consommation de base — Beiersdorf (Nivea)" },
  "QIA.DE":    { sector: "Software", correlation: "Cybersécurité, véhicules connectés — Qiagen" },
  "HNR1.DE":   { sector: "Utilities", correlation: "Énergie — Hannover Rück" },
  "SRT.DE":    { sector: "Technology", correlation: "E-commerce, delivery — Sartorius" },
  "DTG.DE":    { sector: "Consumer products", correlation: "Défensif — Daimler Truck" },
  "ENR.DE":    { sector: "Utilities", correlation: "Transition énergétique — Siemens Energy" },
  "AIR.DE":    { sector: "Aerospace & Defense", correlation: "= AIR.PA Airbus — double listing" },
  "DHER.DE":   { sector: "Technology", correlation: "Delivery, e-commerce — Delivery Hero" },

  // ─── FTSE 100 ──────────────────────────────────────
  "AZN.L":     { sector: "Drug Manufacturers", correlation: "Pharma défensif — AstraZeneca" },
  "SHEL.L":    { sector: "Oil & Gas Integrated", correlation: "CL=F ↑↑ — Shell, major pétrolière" },
  "HSBA.L":    { sector: "Banks", correlation: "Yields ↑, Asie — HSBC" },
  "ULVR.L":    { sector: "Consumer products", correlation: "Défensif, consommation de base — Unilever" },
  "BP.L":      { sector: "Oil & Gas Integrated", correlation: "CL=F ↑↑ — BP, major pétrolière" },
  "GSK.L":     { sector: "Drug Manufacturers", correlation: "Pharma défensif — GSK" },
  "DGE.L":     { sector: "Beverages", correlation: "Défensif, spiritueux — Diageo" },
  "RIO.L":     { sector: "Metals & Mining", correlation: "Fer, cuivre, Chine — Rio Tinto" },
  "LSEG.L":    { sector: "Financial Services", correlation: "Volumes de marché — London Stock Exchange" },
  "REL.L":     { sector: "Media", correlation: "Édition scientifique — RELX" },
  "NG.L":      { sector: "Utilities", correlation: "Gaz, électricité UK — National Grid" },
  "AAL.L":     { sector: "Metals & Mining", correlation: "Platine, diamants, cuivre — Anglo American" },
  "BHP.L":     { sector: "Metals & Mining", correlation: "Fer, cuivre, charbon, Chine — BHP" },
  "GLEN.L":    { sector: "Metals & Mining", correlation: "Matières premières diversifiées — Glencore" },
  "BA.L":      { sector: "Aerospace & Defense", correlation: "Défense UK — BAE Systems" },
  "BATS.L":    { sector: "Tobacco", correlation: "Défensif, dividendes — British American Tobacco" },
  "CPG.L":     { sector: "Consumer products", correlation: "Défensif — Compass Group" },
  "RKT.L":     { sector: "Consumer products", correlation: "Consommation de base — Reckitt" },
  "PRU.L":     { sector: "Insurance", correlation: "Asie, yields — Prudential" },
  "VOD.L":     { sector: "Telecom Services", correlation: "Défensif, dividendes — Vodafone" },
  "LLOY.L":    { sector: "Banks", correlation: "Yields ↑, immobilier UK — Lloyds" },
  "BARC.L":    { sector: "Banks", correlation: "Yields ↑, investment banking — Barclays" },
  "AV.L":      { sector: "Insurance", correlation: "Yields ↑ — Aviva" },
  "NWG.L":     { sector: "Banks", correlation: "Yields ↑, retail banking UK — NatWest" },
  "SMT.L":     { sector: "Financial Services", correlation: "Tech growth — Scottish Mortgage Trust" },
  "CRH.L":     { sector: "Building Products", correlation: "Construction, infrastructure — CRH" },
  "IMB.L":     { sector: "Tobacco", correlation: "Défensif, dividendes — Imperial Brands" },
  "ABF.L":     { sector: "Food Products", correlation: "Primark + agriculture — Associated British Foods" },
  "EXPN.L":    { sector: "Financial Services", correlation: "Données crédit — Experian" },
  "III.L":     { sector: "Financial Services", correlation: "Gestion actifs — 3i Group" },
  "SSE.L":     { sector: "Utilities", correlation: "Énergie renouvelable UK — SSE" },
  "IAG.L":     { sector: "Airlines", correlation: "CL=F ↓↓ — British Airways, Iberia" },
  "MNDI.L":    { sector: "Packaging", correlation: "Cycle industriel — Mondi" },
  "WPP.L":     { sector: "Media", correlation: "Publicité mondiale — WPP" },
  "ANTO.L":    { sector: "Metals & Mining", correlation: "Cuivre, Chine — Antofagasta" },
  "TSCO.L":    { sector: "Retail", correlation: "Consommateur UK — Tesco" },
  "RR.L":      { sector: "Aerospace & Defense", correlation: "Moteurs d'avion, défense — Rolls-Royce" },
  "PSON.L":    { sector: "Media", correlation: "Éducation — Pearson" },
  "FLTR.L":    { sector: "Gambling", correlation: "Paris sportifs — Flutter (FanDuel)" },
  "IHG.L":     { sector: "Hotels, Restaurants & Leisure", correlation: "Tourisme, voyage — InterContinental" },
  "AHT.L":     { sector: "Mining", correlation: "Cuivre, or — Ashtead Group" },
  "KGF.L":     { sector: "Retail", correlation: "Bricolage, immobilier UK — Kingfisher" },
  "SGRO.L":    { sector: "Real Estate", correlation: "Immobilier UK — Segro" },
  "STJ.L":     { sector: "Financial Services", correlation: "Gestion patrimoine — St James's Place" },
  "SVT.L":     { sector: "Utilities", correlation: "Eau UK — Severn Trent" },
  "UU.L":      { sector: "Utilities", correlation: "Eau UK — United Utilities" },
  "LAND.L":    { sector: "Real Estate", correlation: "Immobilier UK — Land Securities" },
  "LGEN.L":    { sector: "Insurance", correlation: "Yields ↑, retraites — Legal & General" },
  "JD.L":      { sector: "Retail", correlation: "Sport, consommateur jeune — JD Sports" },

  // ─── Nikkei 50 ─────────────────────────────────────
  "7203.T":    { sector: "Automobiles", correlation: "JPY, tarifs — Toyota" },
  "6758.T":    { sector: "Consumer Electronics", correlation: "Gaming, semi-conducteurs — Sony" },
  "6861.T":    { sector: "Electronic Components", correlation: "Automatisation — Keyence" },
  "6098.T":    { sector: "Technology", correlation: "Recrutement, RH — Recruit Holdings" },
  "9984.T":    { sector: "Technology", correlation: "Tech VC, Alibaba — SoftBank" },
  "8035.T":    { sector: "Semiconductors", correlation: "Équipement semi-conducteurs — Tokyo Electron" },
  "4063.T":    { sector: "Chemicals", correlation: "Semi-conducteurs, silicone — Shin-Etsu Chemical" },
  "6367.T":    { sector: "Industrial Conglomerates", correlation: "Climatisation, industrie — Daikin" },
  "9432.T":    { sector: "Telecom Services", correlation: "Défensif, dividendes — NTT" },
  "4519.T":    { sector: "Drug Manufacturers", correlation: "Pharma, oncologie — Chugai Pharma" },
  "6501.T":    { sector: "Industrial Conglomerates", correlation: "Infrastructure, énergie — Hitachi" },
  "6902.T":    { sector: "Auto Parts", correlation: "Pièces auto, Toyota supplier — Denso" },
  "7741.T":    { sector: "Medical Devices", correlation: "Endoscopie — HOYA" },
  "4502.T":    { sector: "Drug Manufacturers", correlation: "Pharma — Takeda" },
  "8306.T":    { sector: "Banks", correlation: "BOJ yields, JPY — MUFG" },
  "8058.T":    { sector: "Trading Companies", correlation: "Matières premières diversifiées — Mitsubishi Corp" },
  "9433.T":    { sector: "Telecom Services", correlation: "Défensif — KDDI" },
  "7267.T":    { sector: "Automobiles", correlation: "JPY, tarifs — Honda" },
  "7974.T":    { sector: "Consumer Electronics", correlation: "Gaming, JPY — Nintendo" },
  "4568.T":    { sector: "Drug Manufacturers", correlation: "Pharma, vaccins — Daiichi Sankyo" },
  "6594.T":    { sector: "Electronic Components", correlation: "Moteurs EV — Nidec" },
  "6981.T":    { sector: "Electronic Components", correlation: "Composants passifs — Murata" },
  "8031.T":    { sector: "Trading Companies", correlation: "Matières premières — Mitsui & Co" },
  "3382.T":    { sector: "Retail", correlation: "Consommateur JP — Seven & i Holdings" },
  "8316.T":    { sector: "Banks", correlation: "BOJ yields, JPY — SMFG" },
  "8766.T":    { sector: "Insurance", correlation: "Yields, catastrophes — Tokio Marine" },
  "4503.T":    { sector: "Drug Manufacturers", correlation: "Pharma — Astellas" },
  "2914.T":    { sector: "Tobacco", correlation: "Défensif, dividendes — Japan Tobacco" },
  "6273.T":    { sector: "Machinery", correlation: "Pelles mécaniques — SMC Corp" },
  "6723.T":    { sector: "Industrial Conglomerates", correlation: "Industrie diversifiée — Renesas" },
  "9434.T":    { sector: "Telecom Services", correlation: "Tech, télécom — SoftBank Corp" },
  "6146.T":    { sector: "Semiconductors", correlation: "Équipement semi-conducteurs — DISCO" },
  "6645.T":    { sector: "Electronic Components", correlation: "Automatisation — Omron" },
  "7751.T":    { sector: "Technology", correlation: "Imprimantes, optique — Canon" },
  "8801.T":    { sector: "Real Estate", correlation: "Immobilier JP, taux BOJ — Mitsui Fudosan" },
  "6971.T":    { sector: "Electronic Components", correlation: "Céramiques, composants — Kyocera" },
  "4452.T":    { sector: "Consumer products", correlation: "Consommation de base JP — Kao" },
  "6954.T":    { sector: "Industrial Conglomerates", correlation: "Automatisation, robots — Fanuc" },
  "7832.T":    { sector: "Consumer products", correlation: "Gaming, jouets — Bandai Namco" },
  "9613.T":    { sector: "Technology", correlation: "IT services JP — NTT Data" },

  // ─── HSI 30 ────────────────────────────────────────
  "0700.HK":   { sector: "Technology", correlation: "Chine tech, régulation — Tencent" },
  "9988.HK":   { sector: "Technology", correlation: "E-commerce Chine, régulation — Alibaba" },
  "0005.HK":   { sector: "Banks", correlation: "Yields, Asie — HSBC HK" },
  "0941.HK":   { sector: "Telecom Services", correlation: "Télécom Chine — China Mobile" },
  "2318.HK":   { sector: "Insurance", correlation: "Chine, yields — Ping An" },
  "1299.HK":   { sector: "Insurance", correlation: "Asie, yields — AIA Group" },
  "0388.HK":   { sector: "Financial Services", correlation: "Volumes HK — HKEX" },
  "3690.HK":   { sector: "Technology", correlation: "E-commerce Chine — Meituan" },
  "1810.HK":   { sector: "Consumer Electronics", correlation: "Smartphones Chine — Xiaomi" },
  "0002.HK":   { sector: "Utilities", correlation: "Défensif HK — CLP Holdings" },
  "0016.HK":   { sector: "Real Estate", correlation: "Immobilier HK — SHK Properties" },
  "0001.HK":   { sector: "Industrial Conglomerates", correlation: "Conglomérat HK — CK Hutchison" },
  "0003.HK":   { sector: "Utilities", correlation: "Gaz HK — HK & China Gas" },
  "0011.HK":   { sector: "Real Estate", correlation: "Immobilier HK — Hang Seng Bank" },
  "0027.HK":   { sector: "Real Estate", correlation: "Immobilier Chine — Galaxy Entertainment" },
  "1038.HK":   { sector: "Utilities", correlation: "Énergie HK — CK Infrastructure" },
  "1109.HK":   { sector: "Real Estate", correlation: "Immobilier Chine — China Resources Land" },
  "2388.HK":   { sector: "Banks", correlation: "Banque Chine — BOC HK" },
  "0883.HK":   { sector: "Oil & Gas", correlation: "CL=F ↑↑, pétrole offshore Chine — CNOOC" },
  "0066.HK":   { sector: "Telecom Services", correlation: "Infrastructure MTR — MTR Corp" },
  "1928.HK":   { sector: "Real Estate", correlation: "Immobilier HK — Sands China" },
  "0006.HK":   { sector: "Utilities", correlation: "Énergie HK — Power Assets" },
  "2269.HK":   { sector: "Biotechnology", correlation: "Pharma Chine — WuXi Biologics" },
  "0012.HK":   { sector: "Real Estate", correlation: "Immobilier HK — Henderson Land" },
  "0017.HK":   { sector: "Real Estate", correlation: "Immobilier HK — New World Development" },
  "0101.HK":   { sector: "Real Estate", correlation: "Immobilier HK — Hang Lung Properties" },
  "0267.HK":   { sector: "Real Estate", correlation: "Immobilier HK — CITIC" },
  "0688.HK":   { sector: "Real Estate", correlation: "Immobilier Chine — China Overseas Land" },
  "0823.HK":   { sector: "Real Estate", correlation: "REITs HK — Link REIT" },
  "1997.HK":   { sector: "Real Estate", correlation: "Immobilier Chine — Wharf REIC" },
};

function main() {
  const profiles = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  let enriched = 0;

  for (const profile of profiles) {
    if (profile.finnhubIndustry) continue; // Already has data

    const manual = MANUAL_SECTORS[profile.symbol];
    if (manual) {
      profile.finnhubIndustry = manual.sector;
      profile.sector = manual.sector;
      profile.correlation = manual.correlation;
      enriched++;
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2));

  const total = profiles.length;
  const withSector = profiles.filter((p: any) => p.finnhubIndustry).length;
  const withCorrelation = profiles.filter((p: any) => p.correlation).length;

  console.log(`Enriched ${enriched} profiles`);
  console.log(`Total: ${total} | With sector: ${withSector} | With correlation: ${withCorrelation}`);
  console.log(`Missing sector: ${total - withSector}`);
}

main();
