import { classifyEventTemporal, type EventWhen } from "@yt-maker/ai/src/pipeline/helpers/briefing-pack";
import type { EconomicEvent } from "@yt-maker/core";

// Scénario réel : snapshot.date = Lundi 2026-04-20 (session), pub = Mardi 2026-04-21 (morning)
const sessionDate = "2026-04-20";
const pubDate = "2026-04-21";

interface TestCase {
  name: string;
  event: Partial<EconomicEvent>;
  expected: EventWhen;
  note: string;
}

const cases: TestCase[] = [
  // CAS ZEW — ce qui nous intéresse
  {
    name: "ZEW (2026-04-21 09:00 UTC) — pub day, AFTER 07:00 cutoff",
    event: { date: "2026-04-21", time: "09:00", name: "ZEW", currency: "EUR", impact: "high" },
    expected: "pub_morning_after",
    note: "Sorti ce matin à 11h CET — futur pour spectateur à 7h",
  },
  // Event publication morning AVANT cutoff
  {
    name: "JP Trade Balance (2026-04-21 06:00 UTC) — pub day, BEFORE 07:00 cutoff",
    event: { date: "2026-04-21", time: "06:00", name: "JP Trade Balance", currency: "JPY", impact: "high" },
    expected: "pub_morning_before",
    note: "Déjà sorti à 8h CET — public au visionnage",
  },
  // Session day event
  {
    name: "US Retail Sales (2026-04-20 12:30 UTC) — session day",
    event: { date: "2026-04-20", time: "12:30", name: "Retail Sales", currency: "USD", impact: "high" },
    expected: "session_day",
    note: "Pendant la séance lundi — peut expliquer le move",
  },
  // Pre session
  {
    name: "Fed Speech (2026-04-17 16:00 UTC) — before session",
    event: { date: "2026-04-17", time: "16:00", name: "Fed Waller Speech", currency: "USD", impact: "medium" },
    expected: "pre_session",
    note: "Vendredi précédent — contexte historique",
  },
  // Upcoming
  {
    name: "ECB Meeting (2026-04-22 14:00 UTC) — pub+1",
    event: { date: "2026-04-22", time: "14:00", name: "ECB Lagarde", currency: "EUR", impact: "high" },
    expected: "upcoming",
    note: "Mercredi — à surveiller",
  },
  // Edge : event exactly at 07:00
  {
    name: "Event at exactly 07:00 UTC pub day",
    event: { date: "2026-04-21", time: "07:00", name: "Edge case", currency: "EUR", impact: "low" },
    expected: "pub_morning_after",
    note: "Pile au cutoff — considéré comme après (>= 7)",
  },
  // Edge : event at 06:59
  {
    name: "Event at 06:59 UTC pub day",
    event: { date: "2026-04-21", time: "06:59", name: "Edge case -1min", currency: "EUR", impact: "low" },
    expected: "pub_morning_before",
    note: "Pile juste avant cutoff",
  },
  // No time
  {
    name: "Event without time",
    event: { date: "2026-04-21", name: "Unknown time", currency: "USD", impact: "low" },
    expected: "pub_morning_before",
    note: "time omis → hour=0 → avant cutoff",
  },
];

console.log("═══ Test classifyEventTemporal ═══");
console.log(`sessionDate=${sessionDate} pubDate=${pubDate} pub_cutoff=07:00 UTC\n`);

let pass = 0;
let fail = 0;

for (const tc of cases) {
  const result = classifyEventTemporal(tc.event as EconomicEvent, sessionDate, pubDate);
  const ok = result === tc.expected;
  const symbol = ok ? "✅" : "❌";
  if (ok) pass++;
  else fail++;
  console.log(`${symbol} ${tc.name}`);
  console.log(`   expected=${tc.expected} got=${result}`);
  console.log(`   note: ${tc.note}\n`);
}

// Test sur snapshot réel (si présent)
console.log("═══ Test sur snapshot réel 2026-04-21 ═══");
try {
  const snap = JSON.parse(require("fs").readFileSync("data/snapshot-2026-04-21.json", "utf-8"));
  const zew = (snap.events || []).find((e: any) => /ZEW Economic/i.test(e.name));
  if (zew) {
    const when = classifyEventTemporal(zew, "2026-04-20", "2026-04-21");
    console.log(`ZEW trouvé : ${zew.date} ${zew.time} ${zew.name}`);
    console.log(`Classifié : ${when}`);
    const ok = when === "pub_morning_after";
    console.log(ok ? "✅ correctement flagué comme pub_morning_after" : "❌ mauvais tag : " + when);
    if (ok) pass++;
    else fail++;
  } else {
    console.log("ZEW non trouvé dans le snapshot (peut-être pas fetchable aujourd'hui)");
  }
} catch (err) {
  console.log("Snapshot 2026-04-21 non disponible — skip");
}

console.log(`\n═══ Total : ${pass} pass, ${fail} fail ═══`);
process.exit(fail > 0 ? 1 : 0);
