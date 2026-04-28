/**
 * Vérification de cohérence finale : taille du markdown COT vs autres sections
 * du prompt C2/C3 sur l'épisode 04-28.
 */
import { readFileSync } from 'fs';
import { computeCotInsights, formatCotInsightsMarkdown } from '@yt-maker/data';

const snapshot = JSON.parse(readFileSync('episodes/2026/04-28/snapshot.json', 'utf-8'));
const props = JSON.parse(readFileSync('episodes/2026/04-28/props.json', 'utf-8'));

const cot = snapshot.cotPositioning;
const scriptSymbols = new Set<string>();
for (const sec of props.script?.sections ?? []) {
  for (const s of sec.assets ?? []) scriptSymbols.add(s);
}

const pricesBySymbol: Record<string, Array<{ date: string; close: number }>> = {};
for (const a of props.assets ?? []) {
  const candles = a.dailyCandles ?? a.candles;
  if (Array.isArray(candles) && candles.length >= 28) {
    pricesBySymbol[a.symbol] = candles.map((c: any) => ({ date: c.date, close: c.c }));
  }
}

const insights = computeCotInsights({
  currentCOT: cot,
  scriptAssets: [...scriptSymbols],
  pricesBySymbol,
  publishDate: '2026-04-28',
  maxInsights: 4,
});
const md = formatCotInsightsMarkdown(insights, cot.reportDate, '2026-04-28');

console.log('=== COHERENCE CHECK — épisode 2026-04-28 ===');
console.log();
console.log(`Insights produits : ${insights.length}`);
for (const ins of insights) {
  console.log(`  - ${ins.contractName} | ${ins.signal} | ${ins.severity}/${ins.confidence}`);
}
console.log();
console.log(`Taille markdown COT injecté : ${md.length} chars`);
console.log();

// Estimation taille des autres sections du prompt C2 (lecture des fichiers)
const knowledgePath = 'packages/ai/src/knowledge';
const fs = require('fs');
const totalKnowledge = fs.readdirSync(knowledgePath, { withFileTypes: true })
  .filter((d: any) => d.isFile() && d.name.endsWith('.md'))
  .reduce((sum: number, d: any) => sum + fs.statSync(`${knowledgePath}/${d.name}`).size, 0);
console.log(`Knowledge total (référence) : ~${(totalKnowledge / 1024).toFixed(0)} KB de markdown disponible (filtré ensuite par RAG)`);
console.log();

console.log('=== APERCU ===');
console.log(md.slice(0, 1200));
console.log();
console.log(`...truncated... (taille totale: ${md.length} chars)`);
