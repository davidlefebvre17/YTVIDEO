/**
 * Test automatisé du classifier sur N snapshots :
 * - Construit le calendrier pour chaque snapshot disponible
 * - Vérifie qu'il s'exécute sans crash
 * - Vérifie que la sentinelle CB majeure n'a aucun faux positif (pas d'event
 *   classé cb_decision sans currency dans MAJOR_CB)
 * - Vérifie qu'aucun event n'est dupliqué dans une journée donnée
 * - Vérifie qu'aucun event 🏛 (cb_decision) ne contient un keyword speech
 * - Vérifie qu'aucun event 🗣 (cb_speech) ne contient explicitement "Rate Decision"
 *   sans qu'il soit dans le pattern decision (sanity check d'inversion)
 * - Vérifie que la fenêtre [pub-3, pub+14] est respectée
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import {
  buildTemporalCalendar,
  type CalendarEvent,
} from '../packages/ai/src/pipeline/helpers/temporal-calendar';

const ROOT = './episodes';
const MAJOR_CB = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'AUD', 'NZD']);

function loadPrevContext(date: string) {
  try {
    const manifest = JSON.parse(readFileSync('./episodes/manifest.json', 'utf-8'));
    const before = manifest
      .filter((e: any) => e.date < date)
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
    return { entries };
  } catch {
    return { entries: [] };
  }
}

interface Issue {
  date: string;
  category: string;
  detail: string;
}

const issues: Issue[] = [];

const dirs = readdirSync(ROOT).filter(d => /^\d{4}$/.test(d));
const allSnapshots: string[] = [];
for (const year of dirs) {
  for (const m of readdirSync(path.join(ROOT, year))) {
    const snapPath = path.join(ROOT, year, m, 'snapshot.json');
    try {
      const snap = JSON.parse(readFileSync(snapPath, 'utf-8'));
      if (snap?.date) allSnapshots.push(snap.date);
    } catch {}
  }
}
allSnapshots.sort();
console.log(`Found ${allSnapshots.length} snapshots: ${allSnapshots[0]} → ${allSnapshots[allSnapshots.length-1]}`);

let totalCalendars = 0;
let totalDays = 0;
let totalEvents = 0;
let totalDecisions = 0;
let totalSentinels = 0;

for (const date of allSnapshots) {
  // Try to find the snapshot file
  const candidates = [
    `./data/snapshot-${date}.json`,
    `./episodes/${date.slice(0,4)}/${date.slice(5)}/snapshot.json`,
  ];
  let snapshot: any = null;
  for (const c of candidates) {
    try {
      snapshot = JSON.parse(readFileSync(c, 'utf-8'));
      break;
    } catch {}
  }
  if (!snapshot) continue;

  const prevContext = loadPrevContext(date);
  const pubMs = new Date(snapshot.date + 'T12:00:00Z').getTime();
  const pubDate = new Date(pubMs + 86400000).toISOString().slice(0, 10);

  let cal;
  try {
    cal = buildTemporalCalendar(snapshot, prevContext as any, pubDate);
  } catch (e: any) {
    issues.push({ date, category: 'CRASH', detail: e.message });
    continue;
  }
  totalCalendars++;
  totalDays += cal.days.length;
  totalSentinels += cal.majorCBDecisions.length;

  const calPubMs = new Date(cal.pubDate + 'T12:00:00Z').getTime();
  const minMs = calPubMs - 3 * 86_400_000;
  const maxMs = calPubMs + 14 * 86_400_000;

  for (const day of cal.days) {
    totalEvents += day.events.length;
    const dayMs = new Date(day.date + 'T12:00:00Z').getTime();

    // Check 1 : window respected
    if (dayMs < minMs || dayMs > maxMs) {
      issues.push({ date, category: 'WINDOW', detail: `day ${day.date} outside [${cal.pubDate}-3, +14]` });
    }

    // Check 2 : dedup intra-jour (event name+currency unique)
    const seen = new Map<string, CalendarEvent>();
    for (const ev of day.events) {
      const key = `${ev.type}|${ev.name.toLowerCase().trim()}|${ev.currency ?? ''}`;
      if (seen.has(key)) {
        issues.push({ date, category: 'DUP', detail: `${day.date} ${ev.type} duplicate "${ev.name}" (${ev.currency})` });
      }
      seen.set(key, ev);
    }

    // Check 3 : cb_decision events
    for (const ev of day.events) {
      if (ev.type !== 'cb_decision') continue;
      totalDecisions++;
      // Inversion sanity : un cb_decision ne devrait pas contenir explicitement
      // "Speech/Speaks/Press Conference/Testimony" en seul keyword (sinon c'est un speech mal classé)
      if (/\b(Speech|Speaks|Testimony|Press\s*Conference)\b/i.test(ev.name)
          && !/\b(Rate Decision|Rate Statement|Monetary Policy (Statement|Assessment|Meeting)|FOMC (Press Conference|Statement))\b/i.test(ev.name)) {
        issues.push({ date, category: 'INVERTED_DECISION', detail: `cb_decision "${ev.name}" looks like a speech` });
      }
    }

    // Check 4 : cb_speech events ne devraient pas avoir "Rate Decision" ou "Rate Statement"
    for (const ev of day.events) {
      if (ev.type !== 'cb_speech') continue;
      if (/\bRate (Decision|Statement)\b/i.test(ev.name)) {
        issues.push({ date, category: 'INVERTED_SPEECH', detail: `cb_speech "${ev.name}" contains Rate Decision` });
      }
    }
  }

  // Check 5 : sentinel — only major CB currencies
  for (const s of cal.majorCBDecisions) {
    if (!MAJOR_CB.has(s.currency)) {
      issues.push({ date, category: 'SENTINEL_NON_MAJOR', detail: `${s.centralBank} ${s.currency} dans sentinel` });
    }
  }
}

console.log(`\nProcessed: ${totalCalendars} calendars, ${totalDays} days, ${totalEvents} events`);
console.log(`Total cb_decisions detected: ${totalDecisions}`);
console.log(`Total sentinel entries (forward only): ${totalSentinels}`);
console.log();

if (issues.length === 0) {
  console.log('✅ ZÉRO anomalie détectée');
} else {
  console.log(`❌ ${issues.length} anomalie(s) détectée(s) :\n`);
  // Grouper par catégorie
  const byCat = new Map<string, Issue[]>();
  for (const i of issues) {
    const arr = byCat.get(i.category) ?? [];
    arr.push(i);
    byCat.set(i.category, arr);
  }
  for (const [cat, list] of byCat) {
    console.log(`\n── ${cat} (${list.length}) ──`);
    for (const i of list.slice(0, 10)) {
      console.log(`  [${i.date}] ${i.detail}`);
    }
    if (list.length > 10) console.log(`  ... +${list.length - 10}`);
  }
}

process.exit(issues.length > 0 ? 1 : 0);
