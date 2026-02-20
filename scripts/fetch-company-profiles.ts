/**
 * Fetch company profiles from Finnhub for all stocks in our screening indices.
 * Stores results in data/company-profiles.json
 *
 * Rate limit: 60 req/min on free plan → we batch with delays.
 * Run once, then refresh monthly: npx tsx scripts/fetch-company-profiles.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config(); // Load .env

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;
const INDICES_DIR = join(process.cwd(), "data", "indices");
const OUTPUT_FILE = join(process.cwd(), "data", "company-profiles.json");

// Sector → correlation rules
const SECTOR_CORRELATIONS: Record<string, string> = {
  // Mining & Metals
  "Gold": "GC=F (or) ↑↑ — quand l'or monte, les minières en profitent",
  "Silver": "SI=F (argent) ↑↑",
  "Metals & Mining": "GC=F, SI=F — corrélé aux métaux précieux",
  "Steel": "HRC1! (acier) — cyclique industriel",

  // Energy
  "Oil & Gas": "CL=F (pétrole) ↑↑ — corrélé au brut",
  "Oil & Gas E&P": "CL=F (pétrole) ↑↑ — exploration & production",
  "Oil & Gas Refining": "CL=F (pétrole) ↑ — marges de raffinage",
  "Oil & Gas Midstream": "CL=F (pétrole) ↑ — transport & stockage",
  "Oil & Gas Integrated": "CL=F (pétrole) ↑↑",
  "Energy": "CL=F (pétrole) ↑↑",

  // Airlines & Transport
  "Airlines": "CL=F (pétrole) ↓↓ — kérosène = 1er poste de coûts",
  "Air Freight & Logistics": "CL=F ↓ — coûts carburant",

  // Banks & Financial
  "Banks": "Yields ↑, spread 10Y-2Y ↑ — modèle bancaire dépend du spread de taux",
  "Banks - Regional": "Yields ↑ — sensible aux taux courts",
  "Banks - Diversified": "Yields ↑, spread ↑",
  "Insurance": "Yields ↑ — portefeuille obligataire",
  "Capital Markets": "^GSPC ↑ — volumes de marché",
  "Financial Services": "Yields, ^GSPC",

  // Tech
  "Software": "^IXIC ↑, taux ↓↓ — valorisation sensible au taux d'actualisation",
  "Semiconductors": "^IXIC ↑, ^KS11 — supply chain asiatique",
  "Technology": "^IXIC ↑, taux ↓↓",
  "Information Technology": "^IXIC ↑, taux ↓↓",
  "Electronic Components": "Semi-conducteurs, supply chain",
  "Consumer Electronics": "^IXIC, consommateur",
  "Internet Content & Information": "^IXIC ↑, publicité digitale",
  "Software - Application": "^IXIC ↑, taux ↓↓",
  "Software - Infrastructure": "^IXIC ↑, cloud spending",

  // Luxury & Consumer
  "Luxury Goods": "Chine (demande), EUR/USD — tourisme & consommation asiatique",
  "Apparel Luxury Goods": "Chine, EUR/USD",
  "Textiles, Apparel & Luxury Goods": "Chine, EUR/USD",

  // Auto
  "Auto Manufacturers": "EUR/USD, tarifs, transition électrique",
  "Automobiles": "EUR/USD, tarifs douaniers",
  "Auto Parts": "Cycle auto, transition EV",

  // Defense
  "Aerospace & Defense": "Géopolitique ↑↑ — tensions = commandes",

  // Pharma & Health
  "Drug Manufacturers": "Régulation FDA, pipelines R&D",
  "Biotechnology": "FDA, pipelines — très binaire (approbation ou rejet)",
  "Healthcare": "Défensif — décorrélé du cycle",
  "Medical Devices": "Défensif, vieillissement population",

  // Real Estate
  "Real Estate": "Taux ↓↓ — sensible aux taux hypothécaires",
  "REITs": "Taux ↓↓ — rendement vs obligations",

  // Utilities
  "Utilities": "Taux ↓ — défensif, proxy obligataire",
  "Utilities - Regulated": "Taux ↓, défensif",

  // Agriculture
  "Farm & Heavy Construction Machinery": "Prix agricoles (blé, maïs, soja) — santé économie agricole",
  "Agricultural Inputs": "Prix agricoles, météo",

  // Retail
  "Retail": "Consommateur US, confiance, emploi",
  "Specialty Retail": "Consommateur US",
  "Discount Stores": "Défensif — surperforme en récession",

  // Telecom
  "Telecom Services": "Défensif, dividendes — proxy obligataire",
  "Telecommunications": "Défensif, dividendes",

  // Food & Beverage
  "Beverages": "Défensif, consommation de base",
  "Food Products": "Défensif, inflation alimentaire",
  "Consumer Staples": "Défensif — décorrélé du cycle",

  // Industrial
  "Industrial Conglomerates": "Cycle économique, PMI Manufacturing",
  "Industrials": "Cycle économique, PMI",
  "Building Products": "Immobilier, taux",
  "Construction": "Immobilier, infrastructure, taux",

  // Crypto-related
  "Cryptocurrency": "BTC-USD ↑↑ — corrélé au bitcoin",
};

interface IndexConstituent {
  symbol: string;
  name: string;
}

interface CompanyProfile {
  symbol: string;
  name: string;
  finnhubIndustry: string;
  sector: string;
  correlation: string;
  index: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProfile(symbol: string): Promise<{
  name?: string;
  finnhubIndustry?: string;
} | null> {
  // Finnhub uses US symbols without exchange suffix
  // For European stocks (.PA, .DE, .L), the profile endpoint may not work
  const url = `${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        console.log(`    Rate limited on ${symbol}, waiting 60s...`);
        await sleep(60000);
        return fetchProfile(symbol); // Retry
      }
      return null;
    }
    const data = await res.json();
    if (!data || !data.name) return null;
    return { name: data.name, finnhubIndustry: data.finnhubIndustry };
  } catch {
    return null;
  }
}

function findCorrelation(industry: string): string {
  if (!industry) return "";

  // Exact match first
  if (SECTOR_CORRELATIONS[industry]) return SECTOR_CORRELATIONS[industry];

  // Partial match
  const lower = industry.toLowerCase();
  for (const [key, value] of Object.entries(SECTOR_CORRELATIONS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  return "";
}

async function main() {
  if (!API_KEY) {
    console.error("FINNHUB_API_KEY not set");
    process.exit(1);
  }

  // Load existing profiles if any (to resume)
  let existing: Record<string, CompanyProfile> = {};
  if (existsSync(OUTPUT_FILE)) {
    const data = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    if (Array.isArray(data)) {
      for (const p of data) existing[p.symbol] = p;
    }
    console.log(`Loaded ${Object.keys(existing).length} existing profiles`);
  }

  // Load all index constituents
  const indexFiles: Record<string, string> = {
    SP500: "sp500.json",
    CAC40: "cac40.json",
    DAX40: "dax40.json",
    FTSE100: "ftse100.json",
    NIKKEI50: "nikkei50.json",
    HSI30: "hsi30.json",
  };

  const allSymbols: Array<{ symbol: string; name: string; index: string }> = [];

  for (const [indexName, fileName] of Object.entries(indexFiles)) {
    const filePath = join(INDICES_DIR, fileName);
    if (!existsSync(filePath)) {
      console.log(`Skipping ${indexName}: file not found`);
      continue;
    }
    const constituents: IndexConstituent[] = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const c of constituents) {
      allSymbols.push({ symbol: c.symbol, name: c.name, index: indexName });
    }
  }

  console.log(`Total symbols to fetch: ${allSymbols.length}`);

  // Filter out already fetched
  const toFetch = allSymbols.filter((s) => !existing[s.symbol]);
  console.log(`Already fetched: ${allSymbols.length - toFetch.length}, remaining: ${toFetch.length}`);

  let fetched = 0;
  let failed = 0;
  const BATCH_SIZE = 55; // Stay under 60/min limit

  for (let i = 0; i < toFetch.length; i++) {
    const { symbol, name, index } = toFetch[i];

    // Convert European symbols for Finnhub
    // .PA → already works, .DE → already works, .L → already works for profile2
    const profile = await fetchProfile(symbol);

    if (profile && profile.name) {
      const industry = profile.finnhubIndustry || "";
      existing[symbol] = {
        symbol,
        name: profile.name || name,
        finnhubIndustry: industry,
        sector: industry, // Keep raw industry as sector
        correlation: findCorrelation(industry),
        index,
      };
      fetched++;
      console.log(`  [${fetched + failed}/${toFetch.length}] ✓ ${symbol}: ${profile.name} (${industry})`);
    } else {
      // Use the name from our index file
      existing[symbol] = {
        symbol,
        name,
        finnhubIndustry: "",
        sector: "",
        correlation: "",
        index,
      };
      failed++;
      console.log(`  [${fetched + failed}/${toFetch.length}] ✗ ${symbol}: no profile (using ${name})`);
    }

    // Rate limiting: pause every BATCH_SIZE requests
    if ((fetched + failed) % BATCH_SIZE === 0 && i < toFetch.length - 1) {
      console.log(`  ... pausing 62s for rate limit (${fetched + failed}/${toFetch.length})...`);
      await sleep(62000);
    } else {
      // Small delay between individual requests
      await sleep(200);
    }

    // Save progress every 50
    if ((fetched + failed) % 50 === 0) {
      const profiles = Object.values(existing).sort((a, b) => a.symbol.localeCompare(b.symbol));
      writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2));
      console.log(`  Saved progress: ${profiles.length} profiles`);
    }
  }

  // Final save
  const profiles = Object.values(existing).sort((a, b) => a.symbol.localeCompare(b.symbol));
  writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2));

  console.log(`\nDone!`);
  console.log(`  Total profiles: ${profiles.length}`);
  console.log(`  Fetched: ${fetched}`);
  console.log(`  Failed (no profile): ${failed}`);
  console.log(`  With correlations: ${profiles.filter((p) => p.correlation).length}`);
  console.log(`  Saved to: ${OUTPUT_FILE}`);

  // Show industry distribution
  const industries: Record<string, number> = {};
  for (const p of profiles) {
    const ind = p.finnhubIndustry || "(unknown)";
    industries[ind] = (industries[ind] || 0) + 1;
  }
  console.log(`\nIndustry distribution:`);
  Object.entries(industries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([ind, count]) => console.log(`  ${ind}: ${count}`));
}

main().catch(console.error);
