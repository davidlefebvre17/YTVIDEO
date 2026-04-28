import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';
import { readFileSync } from 'fs';

const s = JSON.parse(readFileSync('episodes/2026/04-16/pipeline/episode_draft.json', 'utf-8'));

// Extract all text
const allText = [
  s.owlIntro, s.coldOpen?.narration, s.thread?.narration,
  ...(s.segments || []).map((seg: any) => seg.narration),
  ...(s.segments || []).map((seg: any) => seg.owlTransition || ''),
  s.owlClosing, s.closing?.narration
].join('\n');

// Find all tickers in quotes
const tickers = allText.match(/"[A-Z0-9^=.\-]{1,15}"/g) || [];
const unique = [...new Set(tickers)];

console.log(`=== ${unique.length} tickers uniques trouvés ===\n`);

for (const t of unique) {
  const ticker = t.replace(/"/g, '');
  const input = `Le ${t} a bougé.`;
  const output = preProcessForTTS(input);
  const replaced = output !== `Le ${t} a bougé.`;
  const phonetic = output.replace('Le ', '').replace(' a bougé.', '');

  if (replaced) {
    console.log(`  ✓ ${ticker.padEnd(12)} → ${phonetic}`);
  } else {
    console.log(`  ✗ ${ticker.padEnd(12)} → PAS TROUVÉ dans company-profiles.json`);
  }
}

// Also check if any tickers remain after preProcess of the full text
const processed = preProcessForTTS(allText);
const remaining = processed.match(/"[A-Z0-9^=.\-]{1,15}"/g) || [];
console.log(`\n=== Tickers NON résolus après preProcess: ${remaining.length} ===`);
for (const r of [...new Set(remaining)]) {
  console.log(`  ✗ ${r}`);
}
