/**
 * Parcourt tous les snapshots disponibles, extrait les events qui pourraient
 * être des CB-related (decision/speech/minutes/press conf), et imprime la
 * répartition par classification actuelle. Sert à identifier les patterns
 * qu'on rate.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const ROOT = './episodes';

// On utilise directement le classifier du module pipeline (cohérent avec la prod).
// Pour rester non-couplé à un export internal, on passe par un test indirect :
// on construit un mini-snapshot pour chaque name et on lit la sortie du calendar.
// Plus simple : on ré-importe la fonction via un export temporaire — ou on
// duplique. Ici on duplique pour rester un audit autonome.
type CalendarEventType =
  | 'macro'
  | 'cb_speech'
  | 'cb_decision'
  | 'earnings_reported'
  | 'earnings_pending'
  | 'earnings_upcoming';

const MACRO_OVERRIDE_PATTERN =
  /\b(Dallas|Philly|Philadelphia|Chicago|Kansas|NY|Atlanta|San Francisco|St\.?\s?Louis|Cleveland|Richmond|Boston|Minneapolis|Empire State) Fed\b|\bFed Balance Sheet\b|\bFederal Budget Balance\b|\b(Consumer )?Inflation Expectations\b|\bWage Tracker\b|\bSurvey of (Consumer Expectations|Professional Forecasters|Monetary Analysts|Market Participants)\b|\bBusiness Outlook Survey\b|\bCredit Conditions Survey\b|\bBoJ Core CPI\b|\bBill Purchases\b/i;

const CB_DECISION_PATTERNS: RegExp[] = [
  /\bInterest Rate Decision\b/i,
  /\bRate (Decision|Statement)\b/i,
  /\b(Cash|Bank|Federal Funds|Policy|Official Bank|Official Cash) Rate\b(?!\s+(Statement|Decision))/i,
  /\bMonetary Policy (Statement|Assessment|Meeting)\b(?!\s+(Minutes|Accounts))/i,
  /\bSNB Monetary Policy Assessment\b/i,
  /\bRiksbank Rate Decision\b/i,
  /\bFOMC (Press Conference|Statement)\b/i,
  /\bMPC Official Bank Rate Votes\b/i,
  /\bBoE MPC Vote\b/i,
  /\bDeposit (Facility|Interest) Rate\b/i,
];

const CB_SPEECH_WITH_INST_PATTERN =
  /\b(Fed|FOMC|ECB|BCE|BoE|Bank of England|BoJ|Bank of Japan|BoC|Bank of Canada|SNB|Swiss National|RBA|Reserve Bank of Australia|RBNZ|Reserve Bank of New Zealand|Norges Bank|Norges|Banxico|Riksbank|PBoC|People's Bank of China|CBR)\b.*?\b(Speaks?|Speech|Press\s*Conf(erence)?|Testimony|Discours|Audition|Confirmation Hearing)\b/i;

const CB_COMMUNICATION_PATTERN =
  /\bMonetary Policy Meeting (Minutes|Accounts)\b|\bMeeting Minutes\b|\bSummary of (Deliberations|Opinions|Monetary Policy Discussions)\b|\b(Monetary Policy|Financial Stability|Quarterly Outlook|Annual) Report\b|\bFinancial Stability Review\b|\bEconomic Bulletin\b|\bQuarterly Bulletin\b|\bInflation Letter\b|\bConfirmation Hearing\b|\bFOMC Economic Projections\b/i;

const NOT_DECISION_PATTERN = /\bNon[-\s]?Monetary Policy\b/i;

const KNOWN_SPEAKERS_PATTERN =
  /\b(Powell|Lagarde|Schnabel|Lane|Cipollone|de Guindos|Elderson|Buch|Donnery|Ueda|Bailey|Macklem|Rogers|Jordan|Schlegel|Bowman|Goolsbee|Williams|Waller|Hammack|Barr|Miran|Jefferson|Cook|Daly|Musalem|Warsh|Norges|Banxico|Bullock|Hauser|Orr)\b.*?\b(Speaks?|Speech|Press\s*Conf(erence)?|Testimony|Discours|Audition|Confirmation Hearing)\b/i;

function classifyEventCurrent(name: string): { type: Exclude<CalendarEventType, 'earnings_reported'|'earnings_pending'|'earnings_upcoming'>; actor?: string } {
  if (typeof name !== 'string' || name.length === 0) return { type: 'macro' };
  if (MACRO_OVERRIDE_PATTERN.test(name)) return { type: 'macro' };
  if (!NOT_DECISION_PATTERN.test(name)) {
    for (const p of CB_DECISION_PATTERNS) {
      if (p.test(name)) return { type: 'cb_decision' };
    }
  }
  if (CB_SPEECH_WITH_INST_PATTERN.test(name)) {
    return { type: 'cb_speech' };
  }
  if (CB_COMMUNICATION_PATTERN.test(name)) {
    return { type: 'cb_speech' };
  }
  if (KNOWN_SPEAKERS_PATTERN.test(name)) {
    return { type: 'cb_speech' };
  }
  return { type: 'macro' };
}

interface Hit {
  date: string;
  name: string;
  currency?: string;
  impact?: string;
  classifiedAs: string;
  actor?: string;
}

const cbKeywordRegex = /(fed|fomc|ecb|bce|boe|bank of england|boj|bank of japan|boc|bank of canada|snb|swiss national|rba|reserve bank of australia|rbnz|reserve bank of new zealand|norges|banxico|riksbank|pboc|people's bank of china|monetary policy|interest rate|press conference|rate decision|policy meeting|policy statement|policy assessment|rate statement|cash rate|bank rate)/i;

const allHits: Hit[] = [];
const dirs = readdirSync(ROOT).filter(d => /^\d{4}$/.test(d));

for (const year of dirs) {
  const months = readdirSync(path.join(ROOT, year));
  for (const m of months) {
    const snapPath = path.join(ROOT, year, m, 'snapshot.json');
    let snap: any;
    try {
      snap = JSON.parse(readFileSync(snapPath, 'utf-8'));
    } catch {
      continue;
    }
    const eventsPools: any[][] = [
      snap.events ?? [],
      snap.yesterdayEvents ?? [],
      snap.upcomingEvents ?? [],
    ];
    for (const pool of eventsPools) {
      for (const e of pool) {
        if (!e?.name) continue;
        if (!cbKeywordRegex.test(e.name)) continue;
        const cls = classifyEventCurrent(e.name);
        allHits.push({
          date: e.date,
          name: e.name,
          currency: e.currency,
          impact: e.impact,
          classifiedAs: cls.type,
          actor: cls.actor,
        });
      }
    }
  }
}

console.log(`Total CB-related events found: ${allHits.length}`);

// ── Group by classification ──
const byClass: Record<string, Map<string, number>> = {
  cb_decision: new Map(),
  cb_speech: new Map(),
  macro: new Map(),
};

for (const h of allHits) {
  const map = byClass[h.classifiedAs];
  // Normaliser le name pour grouping (enlève les noms propres après extraction d'institution)
  const key = h.name.replace(/\s+/g, ' ').trim();
  map.set(key, (map.get(key) ?? 0) + 1);
}

console.log(`\n══ cb_decision (${[...byClass.cb_decision.values()].reduce((a,b)=>a+b,0)} hits) ══`);
const sortedDecisions = [...byClass.cb_decision.entries()].sort((a, b) => b[1] - a[1]);
for (const [name, count] of sortedDecisions.slice(0, 30)) {
  console.log(`  ${count.toString().padStart(3)} × ${name}`);
}

console.log(`\n══ cb_speech (${[...byClass.cb_speech.values()].reduce((a,b)=>a+b,0)} hits) ══`);
const sortedSpeech = [...byClass.cb_speech.entries()].sort((a, b) => b[1] - a[1]);
for (const [name, count] of sortedSpeech.slice(0, 30)) {
  console.log(`  ${count.toString().padStart(3)} × ${name}`);
}

console.log(`\n══ macro (${[...byClass.macro.values()].reduce((a,b)=>a+b,0)} hits — ces events contiennent un keyword CB mais sont classés macro) ══`);
console.log(`  ⚠️ ATTENTION : ces noms contiennent un mot-clé CB mais ne sont PAS classés cb_decision/cb_speech.`);
console.log(`  Ils sont actuellement marqués 📊 (macro) — vérifier s'il s'agit de vraies décisions/discours mal classés.`);
const sortedMacro = [...byClass.macro.entries()].sort((a, b) => b[1] - a[1]);
for (const [name, count] of sortedMacro.slice(0, 50)) {
  console.log(`  ${count.toString().padStart(3)} × ${name}`);
}
