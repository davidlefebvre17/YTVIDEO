import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load all phonetic chunks
const allPhonetics = new Map<string, string>();
for (let i = 1; i <= 8; i++) {
  const path = `data/phonetic-chunk-${i}.json`;
  if (!existsSync(path)) { console.log(`chunk-${i}: MISSING`); continue; }
  const chunk = JSON.parse(readFileSync(path, 'utf-8'));
  for (const e of chunk) allPhonetics.set(e.symbol, e.phonetic);
  console.log(`chunk-${i}: ${chunk.length} entries`);
}
console.log(`Total from chunks: ${allPhonetics.size}`);

// Load profiles
const profiles = JSON.parse(readFileSync('data/company-profiles.json', 'utf-8'));
const missing: Array<{symbol: string; name: string}> = [];
for (const p of profiles) {
  if (!allPhonetics.has(p.symbol)) missing.push({ symbol: p.symbol, name: p.name });
}
console.log(`Missing from chunks: ${missing.length}`);

// Auto-phonetize missing entries
function phonetize(name: string): string {
  let p = name;
  p = p.replace(/\s+(Inc\.?|Corp\.?|Co\.?|Ltd\.?|PLC|plc|NV|SA|SE|AG|N\.V\.)$/i, '');
  p = p.replace(/\s*\(The\)$/i, '');
  p = p.replace(/\s*\(Class [AB]\)$/i, '');

  // Currency pairs
  if (/\/(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)/.test(p)) return p;
  // French commodities
  if (/^(Or|Cuivre|Argent|Gaz naturel|Blé|Platine)$/.test(p)) return p;

  const fixes: Record<string, string> = {
    'Analog Devices': 'Analog Devaïces',
    'Archer Daniels Midland': 'Artcher Danielse Midlande',
    'Automatic Data Processing': 'Automatic Data Processing',
    'Autodesk': 'Otodèsk',
    'American Electric Power': 'Américane Électrique Paouer',
    'AES Corporation': 'A.E.S.',
    'Aflac': 'Aflak',
    'American International Group': 'Américane International Groupe',
    'Align Technology': 'Alaïne Tèknolodji',
    'Alaska Air Group': 'Alaska Air',
    'Allstate': 'Olstate',
    'Allegion': 'Alègione',
    'Applied Materials': 'Aplaïd Matérials',
    'Advanced Micro Devices': 'A.M.D.',
    'AMETEK': 'Amétèk',
    'Amgen': 'Amdjène',
    'Ameriprise Financial': 'Améripraise Financial',
    'American Tower': 'Américane Taouer',
    'Amazon.com': 'Amazon',
    'Arista Networks': 'Arista Nètoueurks',
    'Antofagasta': 'Antofagasta',
    'Aon': 'Éone',
    'A. O. Smith': 'A. O. Smith',
    'APA Corporation': 'A.P.A.',
    'Air Products and Chemicals': 'Air Products',
    'Amphenol': 'Amfénol',
    'Apollo Global Management': 'Apollo Global',
    'Applovin': 'Aplouvine',
    'Aptiv': 'Aptiv',
    'Alexandria Real Estate': 'Alexandria Real Estate',
    'Ares Management': 'Arèsse Management',
    'Consolidated Edison': 'Consolidated Edison',
    'Equifax': 'Equifaxe',
    'Everest Group': 'Everest Groupe',
    'Edison International': 'Edison International',
    'Estée Lauder': 'Estée Lauder',
    'EssilorLuxottica': 'EssilorLuxottica',
    'Elevance Health': 'Élevance Health',
    'Emcor': 'Emcor',
    'Emerson Electric': 'Emerson',
    'Bouygues': 'Bouygues',
    'Engie': 'Engie',
    'Siemens Energy': 'Siemens Énergie',
    'E.ON': 'É-onne',
    'EOG Resources': 'É.O.G.',
    'EPAM Systems': 'É-pam',
    'Equinix': 'Équinix',
    'Equity Residential': 'Equity Résidentiel',
    'EQT Corporation': 'É.Q.T.',
    'Eurofins Scientific': 'Eurofins Scientifique',
    'Erie Indemnity': 'Éri',
    'Eversource Energy': 'Éversource',
    'Essex Property Trust': 'Essex',
    'Ethereum': 'Éthéréom',
    'Eaton Corporation': 'Itone',
    'Entergy': 'Entergy',
    'Evergy': 'Évergy',
    'Edwards Lifesciences': 'Edouardse Laïfesaïences',
    'Exelon': 'Exélon',
    'Expand Energy': 'Expand Énergie',
    'Expeditors International': 'Expéditeurs International',
    'Expedia Group': 'Expédia',
    'Experian': 'Expérian',
    'Extra Space Storage': 'Extra Space Storage',
    'easyJet': 'Izidjèt',
    'Ford Motor': 'Ford',
    'Diamondback Energy': 'Daïamondback Énergie',
    'Fastenal': 'Fasstenol',
    'Freeport-McMoRan': 'Friport-McMoran',
    'Factset Research Systems': 'Factset',
    'FedEx': 'Fédèx',
    'FirstEnergy': 'First Énergie',
    'Ferguson': 'Feurgusonne',
    '"F5': 'F cinq',
    'Fair Isaac': 'Fère Aïzak',
    'Fidelity National Information Services': 'Fidelity National',
    'Fiserv': 'Faïzeurv',
    'Fifth Third Bancorp': 'Fifth Third',
    'Comfort Systems USA': 'Comfort Systèmes',
    'Flutter Entertainment': 'Fleuteur',
    'Fox Corporation': 'Fox',
    'Fresenius': 'Frésénius',
    'Federal Realty Investment Trust': 'Fédéral Réalty',
    'First Solar': 'First Solar',
    'Fortinet': 'Fortinèt',
    'Fortive': 'Fortiv',
    'General Dynamics': 'Général Dynamics',
    'GoDaddy': 'Go-Daddy',
    'General Electric': 'Général Électrique',
    'GE HealthCare': 'Général Électrique Santé',
    'Gen Digital': 'Djène Digital',
    'GE Vernova': 'Djé-i Vernova',
    'Gilead Sciences': 'Guiléad',
    'General Mills': 'Général Mills',
    'Globe Life': 'Globe Laïfe',
    'Société Générale': 'Société Générale',
    'Glencore': 'Glèncore',
    'Corning': 'Corning',
    'General Motors': 'Général Motors',
    'Generac': 'Djénérak',
    'Alphabet': 'Alphabet',
    'Genuine Parts Company': 'Genuine Parts',
    'Global Payments': 'Global Pèïments',
    'Garmin': 'Garmine',
    'Goldman Sachs': 'Goldmane Sax',
    'GSK': 'Djé-èss-ké',
    'WW Grainger': 'Grainger',
    'Hyatt Hotels': 'Haïatt Hôtels',
    'Halliburton': 'Halibeurton',
    'Hasbro': 'Hazbro',
    'Huntington Bancshares': 'Huntington',
    'HCA Healthcare': 'Eïtch-ci-é Healthcare',
    'Home Depot': 'Home Dipo',
    'HeidelbergMaterials': 'Heidelberg Matériaux',
    'HelloFresh': 'Hélo-frèche',
    'Cuivre': 'Cuivre',
    'Hartford': 'Hartford',
    'Huntington Ingalls Industries': 'Huntington Ingalls',
    'Haleon': 'Haléon',
    'Hilton Worldwide Holdings': 'Hilton',
    'Michelin': 'Michelin',
    'Martin Marietta Materials': 'Martin Marietta',
    'Marsh & McLennan': 'Marsh McLennan',
    '3M': 'Trois-M',
    'Mondi': 'Mondi',
    'M&G': 'M et G',
    'Monster Beverage': 'Monsteur Bévéridj',
    'Altria Group': 'Altria',
    'Molina Healthcare': 'Molina',
    'Mosaic': 'Mozaïk',
    'Marathon Petroleum': 'Marathon Pétroleum',
    'Monolithic Power Systems': 'Monolithic Paouer',
    'Merck & Co': 'Merck',
    'Merck KGaA': 'Merck',
    'Moderna': 'Moderna',
    'Marsh McLennan': 'Marsh McLennan',
    'Morgan Stanley': 'Morgane Stanlé',
    'MSCI': 'èmm-èss-ci-aï',
    'Microsoft': 'Microsoft',
    'Motorola Solutions': 'Motorola',
    'ArcelorMittal': 'ArcelorMittal',
    'M&T Bank': 'M et T Bank',
    'Match Group': 'Match Groupe',
    'Mettler-Toledo International': 'Metleur-Tolédo',
    'MTU Aero Engines': 'M.T.U. Aéro',
    'Micron Technology': 'Maïkronne',
    'Munich Re': 'Munik Ré',
    'Norwegian Cruise Line': 'Norvégiane Crouze Laïne',
    '"Nasdaq': 'Nazdak',
    'Nordson': 'Nordsonne',
    'Nextera Energy': 'Nextéra Énergie',
    'Newmont': 'Nioumonnt',
    'Cloudflare': 'Claudflère',
    'Netflix': 'Netflix',
    'National Grid': 'National Grid',
    'NiSource': 'NiSource',
    'Nike': 'Naïki',
    'Northrop Grumman': 'Northrop Grumman',
    'ServiceNow': 'Seurvissnao',
    'NRG Energy': 'N.R.G.',
    'Norfolk Southern': 'Norfolk Southern',
    'NetApp': 'Nètapp',
    'Northern Trust': 'Northern Trust',
    'Nucor': 'Nioucor',
    'PPG Industries': 'P.P.G.',
    'Prudential': 'Prudentiel',
    'Paramount Skydance': 'Paramount Skaïdance',
    'Pearson': 'Pirsonne',
    'Publicis Groupe': 'Publicis Groupe',
    'Quanta Services': 'Kouanta Services',
    'Pioneer Natural Resources': 'Païonir Natural',
    'Qnity Electronics': 'Kuniti',
    'Qiagen': 'Kiaguène',
    'RELX': 'R.E.L.X.',
    'Regions Financial': 'Régions Financial',
    'Rheinmetall': 'Raïnmétal',
    'Pernod Ricard': 'Pernod Ricard',
    'Rio Tinto': 'Rio Tinto',
    'Raymond James Financial': 'Raymond James',
    'Reckitt': 'Réckit',
    'Ralph Lauren': 'Ralph Lorène',
    'Hermès': 'Hermès',
    'Renault': 'Renault',
    'Rollins': 'Rollinse',
    'Rolls-Royce': 'Rolls-Royce',
    'Revvity': 'Réviti',
    'RWE': 'R.W.E.',
    'Safran': 'Safran',
    'Science Applications International': 'Science Applications',
    'Sanofi': 'Sanofi',
    'SAP': 'S.A.P.',
    'SBA Communications': 'S.B.A.',
    'Starbucks': 'Starbeuks',
    'Charles Schwab': 'Charlse Chouab',
    'Schroders': 'Chrodeurse',
    'Sage Group': 'Sèïdj Groupe',
    'Saint-Gobain': 'Saint-Gobain',
    'Shell': 'Shell',
    'Siemens Healthineers': 'Siemens Healthineers',
    'Shopify': 'Chopifile',
    'Sherwin-Williams': 'Cheurouine-Williams',
    'Siemens': 'Siemens',
    'J.M. Smucker Company': 'J.M. Smeuker',
    'Smurfit Kappa': 'Smeurfit Kappa',
    'Slb NV': 'Schlumberger',
    'Super Micro Computer': 'Super Micro Computer',
    'Snap-on': 'Snap-on',
    'Snap': 'Snap',
    'Sandisk': 'Sandisk',
    'Snowflake': 'Snoflèke',
    'Synopsys': 'Sinopsisse',
    'Southern': 'Southern',
    'Solana': 'Solana',
    'Solventum': 'Solventum',
    'Simon Property Group': 'Simon Property',
    "S&P Global": 'essenne pi Global',
    'Block (Square)': 'Block',
    'Sempra': 'Sempra',
    'Sartorius': 'Sartorius',
    'SSE': 'S.S.E.',
    'Standard Chartered': 'Standard Chartered',
    'Steris': 'Stéris',
    'Stellantis': 'Stellantis',
    'Steel Dynamics': 'Steel Dynamics',
    'STMicroelectronics': 'STMicroelectronics',
    'State Street': 'State Street',
    'Seagate Technology': 'Sigate',
    'Constellation Brands': 'Constellation Brands',
    'Schneider Electric': 'Schneider Électrique',
    'Serco': 'Serco',
    'Severn Trent': 'Severn Trent',
    'Smurfit Westrock': 'Smeurfit Westrock',
    'Sodexo': 'Sodexo',
    'Stanley Black & Decker': 'Stanley Black et Decker',
    'Skyworks Solutions': 'Skaïoueurks Solutions',
    'Symrise': 'Simrise',
    'Synchrony Financial': 'Sincroni Financial',
    'Stryker': 'Straïker',
    'Sysco': 'Saïsko',
    'AT&T': 'A.T. et T.',
    'Molson Coors Beverage Company': 'Molson Coors',
  };

  for (const [key, val] of Object.entries(fixes)) {
    if (p.startsWith(key) || name.startsWith(key)) return val;
  }
  return p;
}

// Generate phonetics for missing entries
for (const m of missing) {
  allPhonetics.set(m.symbol, phonetize(m.name));
}
console.log(`After fixes: ${allPhonetics.size} total`);

// Merge into profiles
let filled = 0, stillMissing = 0;
for (const p of profiles) {
  const ph = allPhonetics.get(p.symbol);
  if (ph) { p.phonetic = ph; filled++; }
  else { stillMissing++; console.log(`STILL MISSING: ${p.symbol} ${p.name}`); }
}
console.log(`Filled: ${filled}/${profiles.length}`);
if (stillMissing) console.log(`Still missing: ${stillMissing}`);

writeFileSync('data/company-profiles.json', JSON.stringify(profiles, null, 2));
console.log('company-profiles.json saved');

// Verify a few
for (const sym of ['NVDA', 'GS', 'AAPL', 'BTC-USD', 'CL=F', 'TSMC', '^GSPC', 'ML.PA', 'ON']) {
  const p = profiles.find((x: any) => x.symbol === sym);
  if (p) console.log(`  ${sym}: ${p.name} → ${p.phonetic}`);
}
