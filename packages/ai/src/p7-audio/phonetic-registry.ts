/**
 * PhoneticRegistry — source unique de vérité pour la phonétisation TTS.
 *
 * Agrège deux fichiers de données :
 *
 * 1. `data/company-profiles.json` (champ `phonetic`) — phonétiques par
 *    ticker/nom d'asset. Source naturelle pour Bitcoin, S&P 500, DHL.DE, etc.
 *    Charge ticker → phonetic ET name → phonetic.
 *
 * 2. `data/phonetics-registry.json` (regex_rules catégorisées) — règles
 *    génériques (anglicismes, sigles épelés, banques centrales, fish bugs,
 *    géographie). Toutes les regex non liées à un ticker spécifique.
 *
 * Usage :
 *   import { phoneticRegistry } from './phonetic-registry';
 *   phoneticRegistry.getTickerMap();   // Map<symbol, phonetic>
 *   phoneticRegistry.getNameRules();   // Array<[RegExp, replacement]> tri par longueur DESC
 *   phoneticRegistry.getRegexRules();  // Array<[RegExp, replacement]> ordre des catégories
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CompanyProfile {
  symbol: string;
  name: string;
  phonetic?: string;
  aliases?: string[];
}

interface RegistryRule {
  pattern: string;
  flags?: string;
  replacement: string;
  comment?: string;
}

interface RegistryCategory {
  id: string;
  description?: string;
  rules: RegistryRule[];
}

interface Registry {
  version: string;
  categories: RegistryCategory[];
}

class PhoneticRegistry {
  private tickerMap: Map<string, string> | null = null;
  private nameRules: Array<[RegExp, string]> | null = null;
  private regexRules: Array<[RegExp, string]> | null = null;
  private loaded = false;

  /** Idempotent — ne charge qu'une fois. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.tickerMap = new Map();
    this.nameRules = [];
    this.regexRules = [];

    this.loadCompanyProfiles();
    this.loadRegistryRules();

    console.log(
      `  [PhoneticRegistry] ${this.tickerMap.size} tickers, ${this.nameRules.length} names, ${this.regexRules.length} regex rules`,
    );
  }

  private loadCompanyProfiles(): void {
    const filePath = join(process.cwd(), 'data', 'company-profiles.json');
    if (!existsSync(filePath)) return;
    try {
      const profiles: CompanyProfile[] = JSON.parse(readFileSync(filePath, 'utf-8'));
      const namePairs: Array<[string, string]> = [];
      for (const p of profiles) {
        if (!p.phonetic) continue;
        this.tickerMap!.set(p.symbol, p.phonetic);
        // Skip names < 3 chars (matches too aggressively, false positives like "GE", "GM")
        if (p.name && p.name.length >= 3) {
          namePairs.push([p.name, p.phonetic]);
        }
      }
      // Sort by length DESC : "Goldman Sachs" before "Goldman" before "Sachs"
      namePairs.sort((a, b) => b[0].length - a[0].length);
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const [name, phonetic] of namePairs) {
        this.nameRules!.push([new RegExp(`\\b${escape(name)}\\b`, 'g'), phonetic]);
      }
    } catch (err) {
      console.warn(`  [PhoneticRegistry] failed to load company-profiles.json: ${(err as Error).message}`);
    }
  }

  private loadRegistryRules(): void {
    const filePath = join(process.cwd(), 'data', 'phonetics-registry.json');
    if (!existsSync(filePath)) {
      console.warn(`  [PhoneticRegistry] phonetics-registry.json not found at ${filePath}`);
      return;
    }
    try {
      const registry: Registry = JSON.parse(readFileSync(filePath, 'utf-8'));
      // Categories are applied in array order — the JSON defines the precedence.
      for (const cat of registry.categories) {
        for (const r of cat.rules) {
          try {
            this.regexRules!.push([new RegExp(r.pattern, r.flags ?? 'g'), r.replacement]);
          } catch (regexErr) {
            console.warn(
              `  [PhoneticRegistry] invalid regex in ${cat.id}: "${r.pattern}" — ${(regexErr as Error).message}`,
            );
          }
        }
      }
    } catch (err) {
      console.warn(`  [PhoneticRegistry] failed to load phonetics-registry.json: ${(err as Error).message}`);
    }
  }

  /** Map ticker symbol → phonetic (e.g. "BTC-USD" → "bitconne"). */
  getTickerMap(): Map<string, string> {
    this.load();
    return this.tickerMap!;
  }

  /** Array of [regex, replacement] for plain-text name matches, sorted longest-first. */
  getNameRules(): Array<[RegExp, string]> {
    this.load();
    return this.nameRules!;
  }

  /** Array of [regex, replacement] for the categorized registry rules, in registry order. */
  getRegexRules(): Array<[RegExp, string]> {
    this.load();
    return this.regexRules!;
  }
}

export const phoneticRegistry = new PhoneticRegistry();
