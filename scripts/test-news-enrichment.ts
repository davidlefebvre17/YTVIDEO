import 'dotenv/config';
import { fetchNews } from '@yt-maker/data';
import { enrichNewsSummaries } from '../packages/data/src/article-extractor';

async function main() {
  console.log('=== Test enrichissement news ===\n');

  // 1. Fetch les news
  const news = await fetchNews('2026-03-25');

  const withSummary = news.filter(n => n.summary && n.summary.length > 50);
  const withoutSummary = news.filter(n => !n.summary || n.summary.length <= 50);
  const fr = news.filter(n => n.lang === 'fr');
  const frNoSummary = fr.filter(n => !n.summary || n.summary.length <= 50);

  console.log('\n--- AVANT enrichissement ---');
  console.log(`Total: ${news.length}`);
  console.log(`Avec summary (>50 chars): ${withSummary.length}`);
  console.log(`Sans summary: ${withoutSummary.length}`);
  console.log(`FR: ${fr.length} | FR sans summary: ${frNoSummary.length}`);

  // Montrer quelques exemples
  console.log('\n--- 5 articles SANS summary ---');
  withoutSummary.slice(0, 5).forEach(n => {
    console.log(`  [${n.source}] ${n.title.slice(0, 80)}`);
    console.log(`    summary: "${(n.summary || '').slice(0, 60)}" (${n.summary?.length ?? 0} chars)`);
  });

  // 2. Enrichir (max 5 pour le test)
  console.log('\n--- Enrichissement (5 articles max) ---');
  const toEnrich = withoutSummary.slice(0, 5);
  const enriched = await enrichNewsSummaries(toEnrich, {
    maxExtract: 5,
    delayMs: 500,
  });

  console.log('\n--- APRÈS enrichissement ---');
  enriched.forEach(n => {
    const has = n.summary && n.summary.length > 50;
    console.log(`  ${has ? '✓' : '✗'} [${n.source}] ${n.title.slice(0, 70)}`);
    if (has) console.log(`    → "${n.summary!.slice(0, 150)}..."`);
  });

  const afterCount = enriched.filter(n => n.summary && n.summary.length > 50).length;
  console.log(`\nRésultat: ${afterCount}/${toEnrich.length} enrichis`);
}

main().catch(console.error);
