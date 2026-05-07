/**
 * Robustness suite : confirme que le classifier ne crash pas et classe
 * correctement face à des inputs irréguliers (sources alternatives, données
 * partielles, formats inattendus).
 */
import { buildTemporalCalendar, type TemporalCalendar } from '../packages/ai/src/pipeline/helpers/temporal-calendar';
import type { DailySnapshot, EconomicEvent } from '@yt-maker/core';

interface Case {
  name: string;
  snapshot: Partial<DailySnapshot>;
  expect: (cal: TemporalCalendar) => string | true;
}

function findEvent(cal: TemporalCalendar, namePart: string) {
  for (const day of cal.days) {
    const ev = day.events.find(e => e.name && e.name.toLowerCase().includes(namePart.toLowerCase()));
    if (ev) return { day, ev };
  }
  return null;
}

const baseSnap: Partial<DailySnapshot> = {
  date: '2026-05-04',
  assets: [],
  news: [],
  earnings: [],
  earningsUpcoming: [],
};

const ev = (overrides: Partial<EconomicEvent>): EconomicEvent => ({
  name: 'Default Event',
  date: '2026-05-05',
  time: '12:00',
  currency: 'USD',
  impact: 'high',
  ...overrides,
});

const cases: Case[] = [
  {
    name: 'Speakers sans préfixe institution (fallback KNOWN_SPEAKERS) — Powell Speech',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'Powell Speech', date: '2026-05-05' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Powell Speech');
      if (!found) return 'event Powell Speech absent';
      if (found.ev.type !== 'cb_speech') return `type=${found.ev.type} attendu cb_speech`;
      return true;
    },
  },
  {
    name: 'Event sans name (input malformé) — pas de crash',
    snapshot: {
      ...baseSnap,
      events: [{ ...ev({}), name: undefined as any }],
    },
    expect: (cal) => cal.days.length >= 0 ? true : 'crashed',
  },
  {
    name: 'Date format invalide (May 4 2026 au lieu de YYYY-MM-DD) — event filtré',
    snapshot: {
      ...baseSnap,
      events: [ev({ name: 'Test Event', date: 'May 4 2026' as any })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Test Event');
      return found ? `event accepté avec date invalide` : true;
    },
  },
  {
    name: 'snapshot.date manquant — calendrier vide retourné',
    snapshot: {
      ...baseSnap,
      date: 'INVALID' as any,
    },
    expect: (cal) => cal.days.length === 0 ? true : `${cal.days.length} jours malgré date invalide`,
  },
  {
    name: 'Currency manquante sur cb_decision — pas dans sentinelle',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'Interest Rate Decision', date: '2026-05-08', currency: undefined as any })],
    },
    expect: (cal) => {
      if (cal.majorCBDecisions.length > 0) return `sentinel non vide alors que currency manque`;
      return true;
    },
  },
  {
    name: 'Doublons inter-sources Fed même jour — 1 seule entrée 🏛',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [
        ev({ name: 'Fed Interest Rate Decision', date: '2026-05-08', currency: 'USD' }),
        ev({ name: 'FOMC Statement', date: '2026-05-08', currency: 'USD' }),
        ev({ name: 'FOMC Press Conference', date: '2026-05-08', currency: 'USD' }),
      ],
    },
    expect: (cal) => {
      const day = cal.days.find(d => d.date === '2026-05-08');
      if (!day) return 'day not found';
      const decisions = day.events.filter(e => e.type === 'cb_decision');
      if (decisions.length !== 1) return `${decisions.length} cb_decision USD attendu 1`;
      return true;
    },
  },
  {
    name: 'BoJ Monetary Policy Meeting → cb_decision (l\'edge case originel)',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'BoJ Monetary Policy Meeting', date: '2026-05-08', currency: 'JPY' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Monetary Policy Meeting');
      if (!found) return 'event absent';
      if (found.ev.type !== 'cb_decision') return `type=${found.ev.type} attendu cb_decision`;
      const sentinel = cal.majorCBDecisions.find(s => s.currency === 'JPY');
      if (!sentinel) return 'sentinelle BoJ absente';
      return true;
    },
  },
  {
    name: 'Riksbank Rate Decision (SEK) → cb_decision mais HORS sentinelle (devise non-majeure)',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'Riksbank Rate Decision', date: '2026-05-08', currency: 'SEK' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Riksbank');
      if (!found) return 'event absent';
      if (found.ev.type !== 'cb_decision') return `type=${found.ev.type} attendu cb_decision`;
      if (cal.majorCBDecisions.length !== 0) return `sentinelle inclut SEK alors que devise non-major`;
      return true;
    },
  },
  {
    name: '"FOMC Member Goolsbee Speaks" → cb_speech avec actor extrait',
    snapshot: {
      ...baseSnap,
      events: [ev({ name: 'FOMC Member Goolsbee Speaks', date: '2026-05-04' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Goolsbee');
      if (!found) return 'event absent';
      if (found.ev.type !== 'cb_speech') return `type=${found.ev.type} attendu cb_speech`;
      if (!found.ev.actor || !/Goolsbee/i.test(found.ev.actor)) return `actor manquant ou faux: "${found.ev.actor}"`;
      return true;
    },
  },
  {
    name: '"ECB Non-Monetary Policy Meeting" → reste macro (réunion administrative)',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'ECB Non-Monetary Policy Meeting', date: '2026-05-08', currency: 'EUR' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'Non-Monetary Policy');
      if (!found) return 'event absent';
      if (found.ev.type !== 'macro') return `type=${found.ev.type} attendu macro`;
      return true;
    },
  },
  {
    name: 'Earnings sans name + non-watchlist + sans surprise → filtré',
    snapshot: {
      ...baseSnap,
      earningsUpcoming: [{ symbol: 'XYZ', date: '2026-05-08', hour: 'amc', name: undefined }],
    },
    expect: (cal) => {
      const day = cal.days.find(d => d.date === '2026-05-08');
      const earnings = day?.events.filter(e => e.type === 'earnings_upcoming') ?? [];
      if (earnings.length !== 0) return `${earnings.length} earnings non filtrés`;
      return true;
    },
  },
  {
    name: 'BoE MPC Vote Cut → cb_decision (vote MPC = partie de la décision)',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [ev({ name: 'BoE MPC Vote Cut', date: '2026-05-08', currency: 'GBP' })],
    },
    expect: (cal) => {
      const found = findEvent(cal, 'MPC Vote');
      if (!found) return 'event absent';
      if (found.ev.type !== 'cb_decision') return `type=${found.ev.type} attendu cb_decision`;
      return true;
    },
  },
  {
    name: 'Cas pré-existant : currency vide + sentinel correct',
    snapshot: {
      ...baseSnap,
      upcomingEvents: [
        ev({ name: 'Interest Rate Decision', date: '2026-05-08', currency: 'USD' }),
        ev({ name: 'Interest Rate Decision', date: '2026-05-09', currency: 'EUR' }),
      ],
    },
    expect: (cal) => {
      if (cal.majorCBDecisions.length !== 2) return `sentinel size=${cal.majorCBDecisions.length} attendu 2`;
      const cbs = cal.majorCBDecisions.map(s => s.centralBank).sort();
      if (cbs[0] !== 'BCE' || cbs[1] !== 'Fed') return `sentinel CBs=${cbs.join(',')} attendu Fed,BCE`;
      return true;
    },
  },
];

let pass = 0, fail = 0;
console.log('═══ Robustness suite — temporal-calendar ═══\n');

for (const c of cases) {
  let cal: TemporalCalendar;
  try {
    cal = buildTemporalCalendar(c.snapshot as DailySnapshot, undefined, '2026-05-05');
  } catch (e: any) {
    console.log(`❌ ${c.name}\n   CRASH: ${e.message}`);
    fail++;
    continue;
  }
  const r = c.expect(cal);
  if (r === true) {
    console.log(`✅ ${c.name}`);
    pass++;
  } else {
    console.log(`❌ ${c.name}\n   ${r}`);
    fail++;
  }
}

console.log(`\n═══ Total : ${pass} pass, ${fail} fail ═══`);
process.exit(fail > 0 ? 1 : 0);
