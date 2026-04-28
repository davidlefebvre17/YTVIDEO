import { readFileSync } from 'fs';

const s = JSON.parse(readFileSync('episodes/2026/04-16/pipeline/episode_draft.json', 'utf-8'));
const allText = [
  s.owlIntro, s.coldOpen?.narration, s.thread?.narration,
  ...(s.segments || []).map((seg: any) => seg.narration),
  ...(s.segments || []).map((seg: any) => seg.owlTransition || ''),
  s.owlClosing, s.closing?.narration
].join(' ');

// Anglicisms
const anglicisms = [
  'spread', 'pricing', 'pricé', 'pricer', 'price', 'pricait', 'repric',
  'risk-on', 'risk-off', 'hedging', 'hedge', 'trading', 'trader',
  'bull run', 'bullish', 'bearish', 'short squeeze', 'dead cat bounce',
  'move', 'spot', 'spike', 'carry trade', 'guidance', 'earnings',
  'benchmark', 'short', 'beta'
];
console.log('=== ANGLICISMES ===');
let found = 0;
for (const w of anglicisms) {
  const re = new RegExp(`\\b${w}\\b`, 'gi');
  const matches = allText.match(re);
  if (matches) {
    found += matches.length;
    // Show context
    const idx = allText.toLowerCase().indexOf(w.toLowerCase());
    const ctx = allText.slice(Math.max(0, idx - 30), idx + w.length + 30);
    console.log(`  ${w}: ${matches.length}x — "...${ctx}..."`);
  }
}
if (!found) console.log('  Aucun trouvé !');

// Sigles
const sigles = ['RSI', 'VIX', 'WTI', 'DXY', 'COT', 'PPI', 'CPI', 'SMA', 'ETF', 'ATH', 'NIM', 'EMA'];
console.log('\n=== SIGLES TECHNIQUES ===');
found = 0;
for (const sig of sigles) {
  const re = new RegExp(`\\b${sig}\\b`, 'g');
  const matches = allText.match(re);
  if (matches) {
    found += matches.length;
    const idx = allText.indexOf(sig);
    const ctx = allText.slice(Math.max(0, idx - 30), idx + sig.length + 30);
    console.log(`  ${sig}: ${matches.length}x — "...${ctx}..."`);
  }
}
if (!found) console.log('  Aucun trouvé !');

// Tickers
const tickers = allText.match(/"[A-Z0-9^=.\-]{1,15}"/g) || [];
console.log(`\n=== TICKERS === ${tickers.length} trouvés`);
const unique = [...new Set(tickers)];
console.log(`  Uniques: ${unique.join(', ')}`);
