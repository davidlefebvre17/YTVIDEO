/**
 * Test du module cot-insights sur l'épisode 04-28.
 * Affiche le markdown qui serait injecté dans le prompt C2.
 */
import { readFileSync } from 'fs';
import { computeCotInsights, formatCotInsightsMarkdown } from '@yt-maker/data';

const snapshot = JSON.parse(readFileSync('episodes/2026/04-28/snapshot.json', 'utf-8'));
const cot = snapshot.cotPositioning;
if (!cot) {
  console.error('No COT data in snapshot');
  process.exit(1);
}

// Symbols cités dans le script
const props = JSON.parse(readFileSync('episodes/2026/04-28/props.json', 'utf-8'));
const scriptSymbols = new Set<string>();
for (const sec of props.script?.sections ?? []) {
  for (const s of sec.assets ?? []) scriptSymbols.add(s);
}
console.log(`Script symbols (${scriptSymbols.size}):`, [...scriptSymbols].join(', '));

// Prices par symbol
const pricesBySymbol: Record<string, Array<{ date: string; close: number }>> = {};
for (const a of props.assets ?? []) {
  const candles = a.dailyCandles ?? a.candles;
  if (Array.isArray(candles) && candles.length >= 28) {
    pricesBySymbol[a.symbol] = candles.map((c: any) => ({ date: c.date, close: c.c }));
  }
}

// Calcul sans filtre (tous les contrats) pour voir tout
console.log('\n=== TOUS LES INSIGHTS DETECTES (max 8) ===');
const all = computeCotInsights({
  currentCOT: cot,
  pricesBySymbol,
  publishDate: '2026-04-28',
  maxInsights: 8,
});
console.log(formatCotInsightsMarkdown(all, cot.reportDate, '2026-04-28'));

// Calcul avec filtre script (ce qui sera réellement injecté)
console.log('\n=== AVEC FILTRE SCRIPT (max 4) ===');
const filtered = computeCotInsights({
  currentCOT: cot,
  scriptAssets: [...scriptSymbols],
  pricesBySymbol,
  publishDate: '2026-04-28',
  maxInsights: 4,
});
console.log(formatCotInsightsMarkdown(filtered, cot.reportDate, '2026-04-28'));
