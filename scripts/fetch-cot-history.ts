/**
 * Fetch COT historique multi-années depuis les archives CFTC.
 * Stocke un fichier `data/cot-history.json` avec ~260 semaines par contrat.
 *
 * Usage : npx tsx scripts/fetch-cot-history.ts
 *         npx tsx scripts/fetch-cot-history.ts 2020 2021 2022 2023 2024 2025
 *
 * Cette base sert au calcul de percentile rank long lookback (3-5 ans)
 * pour des signaux COT plus robustes que les 9 semaines du snapshot courant.
 *
 * Idempotent : peut être relancé sans souci, écrase le fichier de sortie.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fetchCOTHistoryFromArchives } from '@yt-maker/data';

const args = process.argv.slice(2).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
const currentYear = new Date().getFullYear();
const years = args.length > 0 ? args : [currentYear - 5, currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

console.log(`Fetching COT history for years: ${years.join(', ')}`);
console.log('(chaque année = ~560 KB compressé, ~2.5 MB CSV par fichier × 2)\n');

async function main() {
  const start = Date.now();
  const history = await fetchCOTHistoryFromArchives(years);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const outPath = join('data', 'cot-history.json');
  writeFileSync(outPath, JSON.stringify(history, null, 0));

  // Résumé
  console.log(`\nWritten to ${outPath}`);
  const symbols = Object.keys(history).sort();
  console.log(`${symbols.length} contracts, ${elapsed}s\n`);
  for (const sym of symbols) {
    const h = history[sym];
    if (h.length === 0) {
      console.log(`  ${sym.padEnd(14)} : EMPTY`);
      continue;
    }
    const oldest = h[h.length - 1].reportDate;
    const newest = h[0].reportDate;
    console.log(`  ${sym.padEnd(14)} : ${h.length} weeks (${oldest} → ${newest})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
