/**
 * Company profile loader — provides sector & correlation context for 763 screening stocks.
 * Loads data/company-profiles.json once and exposes lookup functions.
 *
 * Key use cases:
 * - Enrich earnings data with company name + sector + watchlist correlation
 * - Connect stock movers to themes (NEM earnings → gold theme)
 * - Improve sector cluster detection
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface CompanyProfile {
  symbol: string;
  name: string;
  finnhubIndustry: string;
  sector: string;
  correlation: string;
  index: string;
}

// ── Lazy-loaded singleton ────────────────────────────────────────────────────

let profileMap: Map<string, CompanyProfile> | null = null;
let reverseIndex: Map<string, string[]> | null = null;

/** Watchlist asset symbols we want to detect in correlation strings */
const WATCHLIST_SYMBOLS = [
  "GC=F", "SI=F", "CL=F", "BZ=F", "NG=F",
  "^VIX", "^GSPC", "^IXIC", "^DJI", "^FCHI", "^GDAXI", "^FTSE", "^N225", "^STOXX", "^KS11",
  "BTC-USD", "ETH-USD",
  "EURUSD=X", "GBPUSD=X", "USDJPY=X",
  "DX-Y.NYB",
  "XLK", "XLF", "XLE",
];

/**
 * Extract watchlist asset symbols from a correlation string.
 * e.g. "GC=F, SI=F — corrélé aux métaux précieux" → ["GC=F", "SI=F"]
 * e.g. "^IXIC ↑, taux ↓↓" → ["^IXIC"]
 */
function extractCorrelatedAssets(correlation: string): string[] {
  if (!correlation) return [];
  const found: string[] = [];
  for (const sym of WATCHLIST_SYMBOLS) {
    if (correlation.includes(sym)) {
      found.push(sym);
    }
  }
  return found;
}

function ensureLoaded(): void {
  if (profileMap) return;

  profileMap = new Map();
  reverseIndex = new Map();

  const filePath = join(process.cwd(), "data", "company-profiles.json");
  if (!existsSync(filePath)) {
    console.warn("[company-profiles] data/company-profiles.json not found — skipping");
    return;
  }

  try {
    const data: CompanyProfile[] = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const p of data) {
      profileMap.set(p.symbol, p);

      // Build reverse index: watchlist symbol → [company symbols]
      const correlated = extractCorrelatedAssets(p.correlation);
      for (const wsym of correlated) {
        const list = reverseIndex!.get(wsym) ?? [];
        list.push(p.symbol);
        reverseIndex!.set(wsym, list);
      }
    }
    console.log(`[company-profiles] Loaded ${profileMap.size} profiles, ${reverseIndex.size} watchlist links`);
  } catch (err) {
    console.warn(`[company-profiles] Failed to load: ${err}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Get profile for a stock symbol (e.g. "NEM", "AI.PA", "7203.T") */
export function getCompanyProfile(symbol: string): CompanyProfile | undefined {
  ensureLoaded();
  return profileMap!.get(symbol);
}

/**
 * Get all company symbols correlated to a watchlist asset.
 * e.g. getCompaniesForAsset("GC=F") → ["NEM", "GOLD", "AEM", ...]
 */
export function getCompaniesForAsset(watchlistSymbol: string): string[] {
  ensureLoaded();
  return reverseIndex!.get(watchlistSymbol) ?? [];
}

/**
 * Get a compact context string for a stock symbol.
 * e.g. "Newmont Corporation | Metals & Mining | corrélé: GC=F, SI=F"
 * Returns undefined if no profile found.
 */
export function getProfileContext(symbol: string): string | undefined {
  const p = getCompanyProfile(symbol);
  if (!p) return undefined;

  let ctx = p.name;
  if (p.sector) ctx += ` | ${p.sector}`;
  if (p.correlation) ctx += ` | ${p.correlation}`;
  return ctx;
}

/**
 * Check if a stock has a correlation to a specific watchlist asset.
 * e.g. isCorrelatedTo("NEM", "GC=F") → true
 */
export function isCorrelatedTo(stockSymbol: string, watchlistSymbol: string): boolean {
  const p = getCompanyProfile(stockSymbol);
  if (!p || !p.correlation) return false;
  return p.correlation.includes(watchlistSymbol);
}

/** Get all profiles (for bulk operations) */
export function getAllProfiles(): CompanyProfile[] {
  ensureLoaded();
  return Array.from(profileMap!.values());
}
