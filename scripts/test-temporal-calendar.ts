import { buildTemporalCalendar, formatTemporalCalendar } from '../packages/ai/src/pipeline/helpers/temporal-calendar';
import { readFileSync } from 'fs';
import path from 'path';

const snapshot = JSON.parse(readFileSync('./episodes/2026/05-05/snapshot.json', 'utf-8'));

// Build prevContext from manifest
const manifest = JSON.parse(readFileSync('./episodes/manifest.json', 'utf-8'));
const before = manifest
  .filter((e: any) => e.date < '2026-05-05')
  .sort((a: any, b: any) => a.date.localeCompare(b.date))
  .slice(-7);

const entries: Array<{ snapshot: any; script: any }> = [];
for (const m of before) {
  try {
    entries.push({
      snapshot: JSON.parse(readFileSync(path.join(m.filePath, 'snapshot.json'), 'utf-8')),
      script: JSON.parse(readFileSync(path.join(m.filePath, 'script.json'), 'utf-8')),
    });
  } catch {}
}
const prevContext = { entries };

const cal = buildTemporalCalendar(snapshot, prevContext as any, '2026-05-06');

console.log('=== CalendarSummary ===');
console.log(`snapDate=${cal.snapDate} pubDate=${cal.pubDate}`);
console.log(`Days with events: ${cal.days.length}`);
console.log(`Major CB decisions in 14d: ${cal.majorCBDecisions.length}`);
for (const d of cal.majorCBDecisions) {
  console.log(`  → ${d.date} ${d.weekday} : ${d.centralBank} (${d.currency})`);
}
console.log();
console.log('=== Day distribution ===');
for (const day of cal.days) {
  console.log(`${day.dayLabel.padEnd(5)} ${day.weekday.padEnd(10)} ${day.date} : ${day.events.length} event${day.events.length > 1 ? 's' : ''}`);
}
console.log();

console.log('=== Full formatted output (what LLM sees) ===');
console.log(formatTemporalCalendar(cal));
