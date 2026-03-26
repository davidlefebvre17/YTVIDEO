/**
 * Sync asset-names.ts from company-profiles.json.
 * Generates the ASSET_NAMES map + assetName() + assetAliases() functions.
 *
 * Usage: npx tsx scripts/sync-asset-names.ts
 * Run after modifying data/company-profiles.json.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Profile {
  symbol: string;
  name: string;
  sector?: string;
  description?: string;
  aliases?: string[];
}

const ROOT = process.cwd();
const PROFILES_PATH = join(ROOT, 'data/company-profiles.json');
const OUTPUT_PATH = join(ROOT, 'packages/core/src/asset-names.ts');

const profiles: Profile[] = JSON.parse(readFileSync(PROFILES_PATH, 'utf-8'));

// Build ASSET_NAMES map
const nameEntries = profiles
  .sort((a, b) => a.symbol.localeCompare(b.symbol))
  .map(p => `  ${JSON.stringify(p.symbol)}: ${JSON.stringify(p.name)}`)
  .join(',\n');

// Build ASSET_ALIASES map (only for entries that have aliases)
const aliasEntries = profiles
  .filter(p => p.aliases && p.aliases.length > 0)
  .sort((a, b) => a.symbol.localeCompare(b.symbol))
  .map(p => `  ${JSON.stringify(p.symbol)}: ${JSON.stringify(p.aliases)}`)
  .join(',\n');

// Build ASSET_DESCRIPTIONS map (only for entries that have descriptions)
const descEntries = profiles
  .filter(p => p.description)
  .sort((a, b) => a.symbol.localeCompare(b.symbol))
  .map(p => `  ${JSON.stringify(p.symbol)}: ${JSON.stringify(p.description)}`)
  .join(',\n');

const output = `/**
 * Human-readable names, aliases, and descriptions for financial symbols.
 *
 * AUTO-GENERATED from data/company-profiles.json
 * Do NOT edit manually — run: npx tsx scripts/sync-asset-names.ts
 *
 * ${profiles.length} symbols (watchlist + ${profiles.filter(p => p.sector !== 'Index' && p.sector !== 'Forex' && p.sector !== 'Commodity' && p.sector !== 'Crypto' && p.sector !== 'ETF' && p.sector !== 'Bond').length} stocks + watchlist assets)
 */

/** Symbol → display name */
export const ASSET_NAMES: Record<string, string> = {
${nameEntries},
};

/** Symbol → editorial aliases (nicknames for narration variety) */
export const ASSET_ALIASES: Record<string, string[]> = {
${aliasEntries},
};

/** Symbol → one-line description (for LLM context) */
export const ASSET_DESCRIPTIONS: Record<string, string> = {
${descEntries},
};

/** Resolve a Yahoo symbol to a human-readable name. */
export function assetName(symbol: string): string {
  return ASSET_NAMES[symbol] ?? symbol.replace(/^[^]/, '').replace(/[=].*$/, '');
}

/** Get editorial aliases for a symbol (empty array if none). */
export function assetAliases(symbol: string): string[] {
  return ASSET_ALIASES[symbol] ?? [];
}

/** Get one-line description for a symbol (undefined if none). */
export function assetDescription(symbol: string): string | undefined {
  return ASSET_DESCRIPTIONS[symbol];
}
`;

writeFileSync(OUTPUT_PATH, output);
console.log(`Generated ${OUTPUT_PATH}`);
console.log(`  ${profiles.length} names`);
console.log(`  ${profiles.filter(p => p.aliases?.length).length} with aliases`);
console.log(`  ${profiles.filter(p => p.description).length} with descriptions`);
