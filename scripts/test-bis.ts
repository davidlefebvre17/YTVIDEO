import 'dotenv/config';
import { fetchCBSpeechContent } from '../packages/data/src/cb-speeches';

async function main() {
  console.log('=== Test CB Speech Fetch (Fed + BIS) ===\n');

  const tests = [
    { speaker: 'powell', date: '2026-03-21', label: 'Powell Acceptance Remarks (21 mars)' },
    { speaker: 'powell', date: '2026-03-30', label: 'Powell hier (30 mars)' },
    { speaker: 'barr', date: '2026-03-26', label: 'Barr Economic Outlook (26 mars)' },
    { speaker: 'jefferson', date: '2026-03-26', label: 'Jefferson Energy Effects (26 mars)' },
    { speaker: 'lagarde', date: '2026-03-25', label: 'Lagarde Speaks (25 mars)' },
    { speaker: 'cook', date: '2026-03-26', label: 'Cook Financial Stability (26 mars)' },
  ];

  for (const t of tests) {
    console.log(`${t.label}:`);
    const result = await fetchCBSpeechContent(t.speaker, t.date);
    if (result) {
      console.log(`  ✓ ${result.speaker || t.speaker} — ${result.title.slice(0, 70)}`);
      console.log(`  Summary: ${result.summary.slice(0, 150)}...`);
      console.log(`  URL: ${result.url}`);
    } else {
      console.log(`  ✗ Not found`);
    }
    console.log();
  }
}

main().catch(console.error);
