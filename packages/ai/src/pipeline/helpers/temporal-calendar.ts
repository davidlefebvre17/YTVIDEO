/**
 * Unified chronological calendar — single source of truth for events,
 * earnings, CB speeches and CB decisions across C1/C2/C3 prompts.
 *
 * Replaces three separate sections that used to inject the same data in
 * different formats : `formatEcoCalendar` (C1), `upcomingHighImpact` +
 * `cbSpeechesYesterday` + `earningsBuckets` (C2/C3 via briefing-pack), and
 * `## RENDEZ-VOUS À VENIR` + `## DISCOURS BC` (C3 direct).
 *
 * Output is organized chronologically by day (J-N → J0 → J+N) so the LLM
 * sees past + present + future in one coherent block, not 3-4 disparate
 * sections to reconcile.
 *
 * Design choices :
 * - No precise hours surfaced (sources mix EST/GMT/CET — covered by an
 *   earlier session's fix, this helper carries forward that policy).
 * - "Major CB decision sentinel" — if the 14-day window has zero
 *   Fed/BCE/BoE/BoJ/BoC/SNB/RBA/RBNZ decision, we say so explicitly. This
 *   is the structural fix for the "Fed décide mercredi" hallucination
 *   pattern that recurred across episodes.
 * - Past sessions sourced from prevContext entries (already loaded by the
 *   pipeline) — no extra fetch.
 *
 * ── HYPOTHÈSES IMPLICITES (limites du matching) ──
 * Le classifier (`classifyEvent`) repose sur 4 hypothèses :
 *   1. `name` est en anglais. Sources non-EN (locale fr / es) tomberaient
 *      en macro silencieusement. Vérifier la source si on change de feed.
 *   2. `date` est au format `YYYY-MM-DD` (ISO). Tout autre format → NaN
 *      filtré par `isValidISODate` plus bas.
 *   3. Trading Economics préfixe les discours BC par l'institution. Si on
 *      change de feed et que les noms perdent ce préfixe ("Powell Speech"
 *      au lieu de "Fed Powell Speech"), un fallback speaker-based prend
 *      le relais (`KNOWN_SPEAKERS`).
 *   4. Un même event peut être listé par PLUSIEURS sources avec des
 *      formulations différentes ("Fed Interest Rate Decision" / "FOMC
 *      Statement" même jour USD). La dedup intra-jour intra-devise pour
 *      les `cb_decision` garde 1 seule entrée 🏛 par devise par jour.
 *
 * Vérifié sur 41 snapshots historiques (script `audit-cb-patterns.ts`,
 * 796 events CB-related, 0 anomalie sur le test exhaustif
 * `test-classifier-snapshots.ts`).
 */
import type { DailySnapshot } from "@yt-maker/core";
import type { PrevContext } from "../types";

export type CalendarEventType =
  | "macro"
  | "cb_speech"
  | "cb_decision"
  | "earnings_reported"
  | "earnings_pending"
  | "earnings_upcoming";

export interface CalendarEvent {
  type: CalendarEventType;
  icon: string;
  name: string;
  actor?: string;
  currency?: string;
  impact?: string;
  actual?: string;
  forecast?: string;
  symbol?: string;
  hour?: string;
  surprise?: string;
}

export interface CalendarDay {
  date: string;
  weekday: string;
  dayLabel: string; // "J-3" | "J0" | "J+2"
  daysFromPub: number;
  isSessionDay: boolean;
  isPubDay: boolean;
  events: CalendarEvent[];
}

export interface TemporalCalendar {
  snapDate: string;
  pubDate: string;
  days: CalendarDay[];
  /** Major CB decisions (Fed/BCE/BoE/BoJ/BoC/SNB/RBA/RBNZ) in next 14 days. */
  majorCBDecisions: Array<{
    date: string;
    weekday: string;
    centralBank: string;
    currency: string;
  }>;
}

const MAJOR_CB_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"]);

const FRENCH_WEEKDAYS = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
];
const FRENCH_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Strict ISO date validation: YYYY-MM-DD only. Rejects "May 4 2026", "5/4/2026", etc. */
function isValidISODate(s: string | undefined | null): s is string {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !isNaN(d.getTime());
}

function getWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return FRENCH_WEEKDAYS[d.getUTCDay()];
}

function formatDayMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return `${d.getUTCDate()} ${FRENCH_MONTHS[d.getUTCMonth()]}`;
}

function daysBetween(from: string, to: string): number {
  const fromMs = new Date(from + "T12:00:00Z").getTime();
  const toMs = new Date(to + "T12:00:00Z").getTime();
  return Math.round((toMs - fromMs) / 86_400_000);
}

function detectCentralBank(currency?: string): string | undefined {
  if (!currency) return undefined;
  switch (currency) {
    case "USD": return "Fed";
    case "EUR": return "BCE";
    case "GBP": return "BoE";
    case "JPY": return "BoJ";
    case "CAD": return "BoC";
    case "CHF": return "SNB";
    case "AUD": return "RBA";
    case "NZD": return "RBNZ";
    default: return undefined;
  }
}

// ── Classification patterns (ordered: macro override → decision → speech) ──
// Audit ground-truth : `scripts/audit-cb-patterns.ts` (~800 events parcourus
// sur l'historique réel). Toute modification doit relancer l'audit.

/**
 * Stats régionales Fed, surveys, balance sheet, ops marché ouvert : ces noms
 * contiennent un keyword CB mais ne sont PAS des décisions ou discours. Doivent
 * rester en `macro` (📊).
 */
const MACRO_OVERRIDE_PATTERN =
  /\b(Dallas|Philly|Philadelphia|Chicago|Kansas|NY|Atlanta|San Francisco|St\.?\s?Louis|Cleveland|Richmond|Boston|Minneapolis|Empire State) Fed\b|\bFed Balance Sheet\b|\bFederal Budget Balance\b|\b(Consumer )?Inflation Expectations\b|\bWage Tracker\b|\bSurvey of (Consumer Expectations|Professional Forecasters|Monetary Analysts|Market Participants)\b|\bBusiness Outlook Survey\b|\bCredit Conditions Survey\b|\bBoJ Core CPI\b|\bBill Purchases\b/i;

/**
 * Décisions de taux et communiqués officiels équivalents (annonce du taux directeur,
 * vote MPC, statement de politique monétaire formel).
 *
 * Ce qu'on capture intentionnellement :
 * - "Interest Rate Decision" / "Rate Decision" / "Rate Statement"
 * - "Cash Rate" (RBA), "Federal Funds Rate" (Fed), "Bank Rate" (BoE), "Official
 *   Bank/Cash Rate" (BoE/RBNZ), "Policy Rate" (BoJ)
 * - "Monetary Policy Statement/Assessment/Meeting" — sauf si suivi de
 *   "Minutes/Accounts" (qui sont des compte-rendus = speech)
 * - "FOMC Press Conference" / "FOMC Statement"
 * - "MPC Official Bank Rate Votes" / "BoE MPC Vote (Cut|Hike|Unchanged)"
 */
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

/**
 * Discours, témoignages, conférences de presse — la base avec institution préfixée.
 * Capture l'orateur (ex: "ECB Lagarde Speech" → actor="Lagarde").
 */
const CB_SPEECH_WITH_INST_PATTERN =
  /\b(Fed|FOMC|ECB|BCE|BoE|Bank of England|BoJ|Bank of Japan|BoC|Bank of Canada|SNB|Swiss National|RBA|Reserve Bank of Australia|RBNZ|Reserve Bank of New Zealand|Norges Bank|Norges|Banxico|Riksbank|PBoC|People's Bank of China|CBR)\b.*?\b(Speaks?|Speech|Press\s*Conf(erence)?|Testimony|Discours|Audition|Confirmation Hearing)\b/i;

/**
 * Communications officielles : minutes, summary of deliberations, monetary
 * policy report, economic bulletin, financial stability review, etc. Ces
 * documents accompagnent ou suivent les décisions et constituent une matière
 * narrative au même titre qu'un discours.
 */
const CB_COMMUNICATION_PATTERN =
  /\bMonetary Policy Meeting (Minutes|Accounts)\b|\bMeeting Minutes\b|\bSummary of (Deliberations|Opinions|Monetary Policy Discussions)\b|\b(Monetary Policy|Financial Stability|Quarterly Outlook|Annual) Report\b|\bFinancial Stability Review\b|\bEconomic Bulletin\b|\bQuarterly Bulletin\b|\bInflation Letter\b|\bConfirmation Hearing\b|\bFOMC Economic Projections\b/i;

/**
 * Pour le strip de l'institution dans l'extraction d'actor.
 */
const INST_STRIP_PATTERN =
  /\b(Fed|FOMC|ECB|BCE|BoE|Bank of England|BoJ|Bank of Japan|BoC|Bank of Canada|SNB|Swiss National|RBA|Reserve Bank of Australia|RBNZ|Reserve Bank of New Zealand|Norges Bank|Norges|Banxico|Riksbank|PBoC|People's Bank of China|CBR)\s*/i;

const SPEECH_KEYWORDS_STRIP_PATTERN =
  /\b(Speech|Speaks|Press\s*Conference|Press\s*Conf|Testimony|Conference|Discours|Audition|Confirmation Hearing)\b.*$/i;

/**
 * Exception : "Non-Monetary Policy Meeting" (ECB) — réunion administrative,
 * pas de décision de taux. Garder en macro.
 */
const NOT_DECISION_PATTERN = /\bNon[-\s]?Monetary Policy\b/i;

/**
 * Filet de sécurité : si une source omet le préfixe institution ("Powell
 * Speech" au lieu de "Fed Powell Speech"), reconnaître l'orateur permet
 * quand même de classer l'event en `cb_speech`. Liste prudente — ces noms
 * sont quasi-univoquement des banquiers centraux (faux positifs très peu
 * probables sur un feed financier).
 */
const KNOWN_SPEAKERS_PATTERN =
  /\b(Powell|Lagarde|Schnabel|Lane|Cipollone|de Guindos|Elderson|Buch|Donnery|Ueda|Bailey|Macklem|Rogers|Jordan|Schlegel|Bowman|Goolsbee|Williams|Waller|Hammack|Barr|Miran|Jefferson|Cook|Daly|Musalem|Warsh|Norges|Banxico|Bullock|Hauser|Orr)\b.*?\b(Speaks?|Speech|Press\s*Conf(erence)?|Testimony|Discours|Audition|Confirmation Hearing)\b/i;

/**
 * Classify an EconomicEvent by name → cb_decision / cb_speech / macro.
 *
 * Ordre des règles (cascade) :
 *  1. Override macro : indices régionaux Fed, surveys, balance sheet → macro
 *  2. cb_decision : décisions de taux et statements officiels équivalents
 *  3. cb_speech (institution-préfixé) : "ECB Lagarde Speech", "Fed Goolsbee Speaks"
 *  4. cb_speech (communication) : minutes, monetary policy report, economic bulletin
 *  5. fallback → macro
 */
function classifyEvent(name: string | undefined | null): {
  type: Exclude<CalendarEventType, "earnings_reported" | "earnings_pending" | "earnings_upcoming">;
  icon: string;
  actor?: string;
} {
  // 0. Guard : nom manquant → macro par défaut (silencieux mais inoffensif)
  if (typeof name !== "string" || name.length === 0) {
    return { type: "macro", icon: "📊" };
  }

  // 1. Macro override
  if (MACRO_OVERRIDE_PATTERN.test(name)) {
    return { type: "macro", icon: "📊" };
  }

  // 2. cb_decision
  if (!NOT_DECISION_PATTERN.test(name)) {
    for (const p of CB_DECISION_PATTERNS) {
      if (p.test(name)) return { type: "cb_decision", icon: "🏛" };
    }
  }

  // 3. cb_speech (institution-préfixé) — extraire l'orateur
  if (CB_SPEECH_WITH_INST_PATTERN.test(name)) {
    const stripped = name
      .replace(SPEECH_KEYWORDS_STRIP_PATTERN, "")
      .replace(INST_STRIP_PATTERN, "")
      // FOMC events tagués "FOMC Member X Speaks" → on retire aussi "Member"
      .replace(/^Member\s+/i, "")
      .trim();
    const actor = stripped.length > 1 ? stripped : undefined;
    return { type: "cb_speech", icon: "🗣", actor };
  }

  // 4. cb_speech (communication officielle sans préfixe institution)
  if (CB_COMMUNICATION_PATTERN.test(name)) {
    return { type: "cb_speech", icon: "🗣" };
  }

  // 5. Fallback : speaker connu sans institution préfixée ("Powell Speech")
  if (KNOWN_SPEAKERS_PATTERN.test(name)) {
    const stripped = name
      .replace(SPEECH_KEYWORDS_STRIP_PATTERN, "")
      .trim();
    const actor = stripped.length > 1 ? stripped : undefined;
    return { type: "cb_speech", icon: "🗣", actor };
  }

  return { type: "macro", icon: "📊" };
}

/** Best-effort dedup key — same name (lowercased) + date + currency = same event. */
function eventKey(date: string, name: string, currency?: string): string {
  return `${date}|${name.toLowerCase().replace(/\s+/g, " ").trim()}|${currency ?? ""}`;
}

/**
 * Build the unified calendar for a snapshot + prevContext + publication date.
 * pubDate defaults to snapDate + 1 day (the typical "publish day after data").
 */
export function buildTemporalCalendar(
  snapshot: DailySnapshot,
  prevContext: PrevContext | undefined,
  pubDate?: string,
): TemporalCalendar {
  // Guard contre snapshot.date malformé. En cas de date invalide on retourne
  // un calendrier vide plutôt que de propager des NaN.
  if (!isValidISODate(snapshot.date)) {
    return { snapDate: snapshot.date ?? "", pubDate: pubDate ?? "", days: [], majorCBDecisions: [] };
  }
  const snapDate = snapshot.date;
  const effectivePubDate = (pubDate && isValidISODate(pubDate)) ? pubDate : (() => {
    const d = new Date(snapDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const eventsByDate = new Map<string, CalendarEvent[]>();
  const seenKeys = new Set<string>();
  // Dedup spéciale : 1 seule cb_decision par devise par jour (sources qui
  // dupliquent "Fed Interest Rate Decision" + "FOMC Statement" + "FOMC Press
  // Conference" même jour USD ne génèrent qu'une entrée 🏛). On garde la
  // PREMIÈRE entrée — l'ordre de scan est : prevContext → snapshot.events →
  // upcoming, donc la "vraie" décision (snapshot.events avec actual) prime
  // sur les variantes de press conf si elles sont scannées plus tard.
  const decisionByDayCurrency = new Set<string>();

  const addEvent = (date: string, ev: CalendarEvent): void => {
    if (!isValidISODate(date)) return;
    if (typeof ev.name !== "string" || ev.name.length === 0) return;

    // Dedup spéciale cb_decision : 1 par jour par devise
    if (ev.type === "cb_decision" && ev.currency) {
      const decKey = `${date}|${ev.currency}`;
      if (decisionByDayCurrency.has(decKey)) {
        // Une décision est déjà dans la journée pour cette devise — on
        // upgrade éventuellement si la nouvelle a un `actual` et l'existante non
        if (ev.actual) {
          const arr = eventsByDate.get(date) ?? [];
          const idx = arr.findIndex(
            (x) => x.type === "cb_decision" && x.currency === ev.currency && !x.actual,
          );
          if (idx >= 0) arr[idx] = ev;
        }
        return;
      }
      decisionByDayCurrency.add(decKey);
    }

    const key = eventKey(date, ev.name, ev.currency);
    if (seenKeys.has(key)) {
      // Dedup : same event already in. If we now have a non-empty `actual`
      // and the existing one didn't, replace (to prefer the post-release
      // version over the pre-release forecast-only).
      if (ev.actual) {
        const arr = eventsByDate.get(date) ?? [];
        const idx = arr.findIndex((x) => eventKey(date, x.name, x.currency) === key);
        if (idx >= 0 && !arr[idx].actual) arr[idx] = ev;
      }
      return;
    }
    seenKeys.add(key);
    const arr = eventsByDate.get(date) ?? [];
    arr.push(ev);
    eventsByDate.set(date, arr);
  };

  // ── 1. PAST events from prevContext entries — high-impact only ──
  // Past macro detail is already covered by `episodeSummaries` in the prompt,
  // so we keep ONLY past CB decisions, CB speeches, and high-impact macro
  // releases. Macro of medium impact is dropped to avoid noise.
  for (const entry of prevContext?.entries ?? []) {
    const sn = entry.snapshot;
    if (!sn) continue;
    const pastEvents = [...(sn.events ?? []), ...(sn.yesterdayEvents ?? [])];
    for (const e of pastEvents) {
      if (!e?.date) continue;
      const cls = classifyEvent(e.name);
      // Past noise filter : keep CB decisions and CB speeches always, but
      // require high impact for past macro.
      if (cls.type === "macro" && e.impact !== "high") continue;
      addEvent(e.date, {
        type: cls.type, icon: cls.icon, name: e.name, actor: cls.actor,
        currency: e.currency, impact: e.impact,
        actual: e.actual, forecast: e.forecast,
      });
    }
    // Past earnings — keep only those reported with EPS surprise > 5% (real signal)
    for (const er of sn.earnings ?? []) {
      if (er.epsActual == null) continue;
      const sigSurprise = er.epsEstimate != null && er.epsEstimate !== 0
        ? Math.abs((er.epsActual - er.epsEstimate) / Math.abs(er.epsEstimate)) * 100
        : 0;
      if (sigSurprise < 5) continue;
      const surprise = `${er.epsActual - er.epsEstimate! >= 0 ? "+" : ""}${Math.round(sigSurprise * Math.sign(er.epsActual - er.epsEstimate!))}%`;
      addEvent(er.date, {
        type: "earnings_reported", icon: "💼",
        name: er.name ?? er.symbol, symbol: er.symbol, hour: er.hour, surprise,
      });
    }
  }

  // ── 2. CURRENT snapshot events ──
  // Convention :
  //   snapshot.yesterdayEvents = J-1 from publication (= snapDate)
  //   snapshot.events          = J0 = publication day
  //   snapshot.upcomingEvents  = J+1 .. J+14
  const currentEvents = [
    ...(snapshot.yesterdayEvents ?? []),
    ...(snapshot.events ?? []),
    ...(snapshot.upcomingEvents ?? []),
  ];
  for (const e of currentEvents) {
    if (!e?.date) continue;
    if (e.impact === "low") continue;
    const cls = classifyEvent(e.name);
    addEvent(e.date, {
      type: cls.type, icon: cls.icon, name: e.name, actor: cls.actor,
      currency: e.currency, impact: e.impact,
      actual: e.actual, forecast: e.forecast,
    });
  }

  // ── 3. CURRENT earnings — keep only signal-worthy ──
  // Watchlist symbols always pass. Non-watchlist passes only if (a) it's a
  // named company (large-cap proxy) AND (b) EPS surprise ≥ 10% (real signal,
  // not noise). The mass of small/mid-cap earnings is intentionally dropped —
  // they're available in stockScreen for other purposes.
  const watchlist = new Set((snapshot.assets ?? []).map((a) => a.symbol));
  const isSignal = (er: { symbol: string; name?: string; epsActual?: number; epsEstimate?: number }): boolean => {
    if (watchlist.has(er.symbol)) return true;
    if (!er.name) return false; // unnamed = micro-cap, drop
    if (er.epsActual == null || er.epsEstimate == null || er.epsEstimate === 0) return false;
    const surprisePct = Math.abs((er.epsActual - er.epsEstimate) / Math.abs(er.epsEstimate)) * 100;
    return surprisePct >= 10;
  };

  for (const er of snapshot.earnings ?? []) {
    if (!er?.date) continue;
    if (er.epsActual != null) {
      if (!isSignal(er)) continue;
      const surprise = er.epsEstimate != null && er.epsEstimate !== 0
        ? `${(er.epsActual - er.epsEstimate) >= 0 ? "+" : ""}${Math.round(((er.epsActual - er.epsEstimate) / Math.abs(er.epsEstimate)) * 100)}%`
        : undefined;
      addEvent(er.date, {
        type: "earnings_reported", icon: "💼",
        name: er.name ?? er.symbol, symbol: er.symbol, hour: er.hour, surprise,
      });
    } else {
      // Pending : keep only watchlist + named companies (no surprise yet to filter on)
      if (!watchlist.has(er.symbol) && !er.name) continue;
      addEvent(er.date, {
        type: "earnings_pending", icon: "💼",
        name: er.name ?? er.symbol, symbol: er.symbol, hour: er.hour,
      });
    }
  }
  for (const er of snapshot.earningsUpcoming ?? []) {
    if (!er?.date) continue;
    if (!watchlist.has(er.symbol) && !er.name) continue;
    addEvent(er.date, {
      type: "earnings_upcoming", icon: "💼",
      name: er.name ?? er.symbol, symbol: er.symbol, hour: er.hour,
    });
  }

  // ── 4. Window — keep only [pubDate-3, pubDate+14] ──
  // Past beyond J-3 is delegated to episodeSummaries in the prompt.
  const pubMs = new Date(effectivePubDate + "T12:00:00Z").getTime();
  const minMs = pubMs - 3 * 86_400_000;
  const maxMs = pubMs + 14 * 86_400_000;

  const days: CalendarDay[] = [];
  const sortedDates = Array.from(eventsByDate.keys()).sort();
  for (const date of sortedDates) {
    const ms = new Date(date + "T12:00:00Z").getTime();
    if (ms < minMs || ms > maxMs) continue;
    const daysFromPub = daysBetween(effectivePubDate, date);
    const dayLabel =
      daysFromPub === 0 ? "J0" :
      daysFromPub > 0 ? `J+${daysFromPub}` :
      `J${daysFromPub}`;
    days.push({
      date,
      weekday: getWeekday(date),
      dayLabel,
      daysFromPub,
      isSessionDay: date === snapDate,
      isPubDay: date === effectivePubDate,
      events: eventsByDate.get(date) ?? [],
    });
  }

  // ── 5. Major CB decisions sentinel (future window only) ──
  const majorCBDecisions: TemporalCalendar["majorCBDecisions"] = [];
  for (const day of days) {
    if (day.daysFromPub < 0) continue;
    for (const ev of day.events) {
      if (ev.type !== "cb_decision") continue;
      if (!ev.currency || !MAJOR_CB_CURRENCIES.has(ev.currency)) continue;
      const cb = detectCentralBank(ev.currency);
      if (!cb) continue;
      majorCBDecisions.push({
        date: day.date,
        weekday: day.weekday,
        centralBank: cb,
        currency: ev.currency,
      });
    }
  }

  return { snapDate, pubDate: effectivePubDate, days, majorCBDecisions };
}

// ─────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────

/** How many earnings entries to surface per day, per type. Past = signal only. */
const EARNINGS_DAILY_CAP_FUTURE = 8;
const EARNINGS_DAILY_CAP_PAST = 3;

function formatDay(day: CalendarDay): string {
  const tag = day.isPubDay
    ? " (publication)"
    : day.isSessionDay
      ? " (séance couverte)"
      : "";
  let out = `${day.dayLabel} ${day.weekday} ${formatDayMonth(day.date)}${tag}\n`;

  // Order : decisions > macro > speeches > earnings_reported > earnings_pending > earnings_upcoming
  const order: CalendarEventType[] = [
    "cb_decision", "macro", "cb_speech",
    "earnings_reported", "earnings_pending", "earnings_upcoming",
  ];

  for (const type of order) {
    const list = day.events.filter((e) => e.type === type);
    if (list.length === 0) continue;

    // CB speeches : group all on one line by currency, with actors joined.
    if (type === "cb_speech") {
      // Group by currency
      const byCurrency = new Map<string, CalendarEvent[]>();
      for (const e of list) {
        const k = e.currency ?? "?";
        const arr = byCurrency.get(k) ?? [];
        arr.push(e);
        byCurrency.set(k, arr);
      }
      for (const [cur, group] of byCurrency) {
        const actors = Array.from(new Set(
          group.map((e) => e.actor).filter((a): a is string => Boolean(a)),
        ));
        const inst = detectCentralBank(cur) ?? cur;
        if (actors.length > 0) {
          out += `  🗣 ${inst} : ${actors.slice(0, 6).join(" · ")}${actors.length > 6 ? ` (+${actors.length - 6})` : ""} — discours\n`;
        } else {
          // No actor extracted — fall back to raw names
          const names = group.slice(0, 4).map((e) => e.name).join(" · ");
          out += `  🗣 ${names}${group.length > 4 ? ` (+${group.length - 4})` : ""}\n`;
        }
      }
      continue;
    }

    // Macro : if 4+ same-day, group on a single line ; otherwise one per line
    // with actual/forecast preserved.
    if (type === "macro" && list.length >= 4) {
      // Bucket by impact (high first)
      const high = list.filter((e) => e.impact === "high");
      const med = list.filter((e) => e.impact !== "high");
      if (high.length > 0) {
        out += `  📊 ${high.slice(0, 6).map((e) => `${e.name}${e.currency ? ` (${e.currency})` : ""}${e.actual ? ` actuel:${e.actual}` : e.forecast ? ` forecast:${e.forecast}` : ""}`).join(", ")}\n`;
      }
      if (med.length > 0) {
        out += `  📊 ${med.slice(0, 6).map((e) => e.name).join(", ")}${med.length > 6 ? ` (+${med.length - 6})` : ""}\n`;
      }
      continue;
    }

    // earnings : daily cap — different for past vs future
    const isPast = day.daysFromPub < 0;
    if (type === "earnings_reported" || type === "earnings_pending" || type === "earnings_upcoming") {
      const cap = isPast ? EARNINGS_DAILY_CAP_PAST : EARNINGS_DAILY_CAP_FUTURE;
      if (list.length > cap + 2) {
        const symbols = list.slice(0, cap).map((e) => {
          const sym = e.symbol ?? e.name;
          return e.surprise ? `${sym} (${e.surprise})` : sym;
        });
        const verb = type === "earnings_reported" ? "ont publié"
                   : type === "earnings_pending" ? "publient ce soir"
                   : "publient ce jour";
        out += `  💼 ${symbols.join(" · ")}${list.length > cap ? ` (+${list.length - cap} autres)` : ""} — ${verb}\n`;
        continue;
      }
    }

    // Default : one line per event
    for (const ev of list) {
      let line = `  ${ev.icon} `;
      if (ev.type === "cb_decision") {
        const cb = detectCentralBank(ev.currency) ?? "";
        line += cb ? `${cb} — décision taux` : ev.name;
        if (ev.currency) line += ` (${ev.currency})`;
        if (ev.actual) line += ` actuel:${ev.actual}`;
        if (ev.forecast) line += ` forecast:${ev.forecast}`;
      } else if (ev.type === "macro") {
        line += ev.name;
        if (ev.currency) line += ` (${ev.currency}, ${ev.impact ?? "medium"})`;
        if (ev.actual) line += ` actuel:${ev.actual}`;
        else if (ev.forecast) line += ` forecast:${ev.forecast}`;
      } else {
        // earnings
        const hourLabel =
          ev.hour === "bmo" ? "avant ouverture" :
          ev.hour === "amc" ? "après clôture" :
          ev.hour === "dmh" ? "intra-séance" : "";
        line += ev.symbol ?? ev.name;
        if (hourLabel) line += ` ${hourLabel}`;
        if (ev.surprise) line += ` EPS ${ev.surprise} vs attentes`;
        if (ev.type === "earnings_pending") line += ` — résultats ce soir`;
      }
      out += line + "\n";
    }
  }

  return out;
}

export function formatTemporalCalendar(cal: TemporalCalendar): string {
  let out = "## CALENDRIER — SOURCE UNIQUE DE VÉRITÉ\n\n";
  out += `Séance couverte : ${cal.snapDate} · Publication : ${cal.pubDate}\n\n`;

  if (cal.days.length === 0) {
    out += "_Aucun événement sur la fenêtre [J-7, J+14]._\n\n";
  } else {
    for (const day of cal.days) {
      out += formatDay(day);
    }
    out += "\n";
  }

  if (cal.majorCBDecisions.length === 0) {
    out += "🏛 DÉCISIONS BANQUES CENTRALES MAJEURES (Fed/BCE/BoE/BoJ/BoC/SNB/RBA/RBNZ) — fenêtre 14j :\n";
    out += "   ⚠ AUCUNE dans cette fenêtre. NE PAS écrire \"Fed décide\", \"BCE annonce\", \"BoJ se réunit\", etc.\n\n";
  } else {
    out += "🏛 DÉCISIONS BANQUES CENTRALES MAJEURES — fenêtre 14j :\n";
    for (const d of cal.majorCBDecisions) {
      out += `   → ${d.weekday} ${formatDayMonth(d.date)} : ${d.centralBank} (${d.currency})\n`;
    }
    out += "\n";
  }

  out += "📌 RÈGLE : toute référence temporelle dans ta narration (\"ce mercredi\", \"demain\", \"vendredi\", \"jeudi prochain\") doit matcher un événement listé ci-dessus. Si tu mentionnes un événement, il DOIT figurer dans ce calendrier. En cas de doute, ne le mentionne pas.\n";

  return out;
}
