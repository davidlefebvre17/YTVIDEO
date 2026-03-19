/**
 * Detect patterns in economic calendar that deserve editorial attention.
 * Code-only, no LLM. Injected into C1 prompt.
 */
import type { EconomicEvent } from "@yt-maker/core";

export interface CalendarPattern {
  type: 'central_bank_cluster' | 'macro_data_cluster' | 'earnings_mega_week' | 'triple_witching';
  label: string;
  events: string[];
  editorial_hint: string;
}

// Central bank name patterns by currency
const CB_EVENTS: Record<string, string> = {
  'USD': 'Fed',
  'EUR': 'BCE',
  'GBP': 'BoE',
  'JPY': 'BOJ',
  'CHF': 'BNS',
  'AUD': 'RBA',
  'CAD': 'BoC',
  'NZD': 'RBNZ',
  'SEK': 'Riksbank',
  'NOK': 'Norges Bank',
};

const RATE_KEYWORDS = /rate|taux|monetary|monétaire|policy.*assessment|refinancing/i;

/**
 * Detect calendar patterns from today's events + upcoming events.
 * Returns patterns that C1 should consider as editorial subjects.
 */
export function detectCalendarPatterns(
  todayEvents: EconomicEvent[],
  upcomingEvents: EconomicEvent[],
  yesterdayEvents: EconomicEvent[],
): CalendarPattern[] {
  const patterns: CalendarPattern[] = [];

  // ── Central bank cluster: 2+ CB rate decisions within 48h ──
  const allEvents = [
    ...yesterdayEvents.map(e => ({ ...e, when: 'hier' })),
    ...todayEvents.map(e => ({ ...e, when: 'aujourd\'hui' })),
    ...upcomingEvents.filter(e => {
      // Only next 2 days
      const today = new Date();
      const evDate = new Date(e.date);
      const diffDays = (evDate.getTime() - today.getTime()) / 86400000;
      return diffDays <= 2;
    }).map(e => ({ ...e, when: e.date })),
  ];

  const cbDecisions: Array<{ cb: string; currency: string; when: string; actual?: string }> = [];
  for (const e of allEvents) {
    if (RATE_KEYWORDS.test(e.name) && e.impact === 'high') {
      const cb = CB_EVENTS[e.currency];
      if (cb && !cbDecisions.some(d => d.cb === cb)) {
        cbDecisions.push({ cb, currency: e.currency, when: (e as any).when, actual: e.actual });
      }
    }
  }

  if (cbDecisions.length >= 2) {
    patterns.push({
      type: 'central_bank_cluster',
      label: `${cbDecisions.length} banques centrales en 48h`,
      events: cbDecisions.map(d => `${d.cb} (${d.currency}) ${d.when}${d.actual ? ' → ' + d.actual : ''}`),
      editorial_hint: `${cbDecisions.length} banques centrales décident en 48h — c'est un PATTERN qui mérite d'être traité comme un sujet en soi ("le défilé des banques centrales"), pas comme des événements isolés. Les divergences entre CBs sont narrativement fortes.`,
    });
  }

  // ── Macro data cluster: 3+ high-impact macro releases same day ──
  const macroToday = todayEvents.filter(e =>
    e.impact === 'high' && !RATE_KEYWORDS.test(e.name)
  );
  if (macroToday.length >= 3) {
    patterns.push({
      type: 'macro_data_cluster',
      label: `${macroToday.length} données macro high-impact aujourd'hui`,
      events: macroToday.map(e => `${e.time ?? '?'} ${e.name} (${e.currency})`),
      editorial_hint: `Journée chargée en données macro — les résultats se renforcent ou se contredisent ? Cherche le signal dans le bruit.`,
    });
  }

  return patterns;
}

/**
 * Format patterns for injection into C1 prompt.
 */
export function formatCalendarPatterns(patterns: CalendarPattern[]): string {
  if (!patterns.length) return '';

  let text = `## PATTERNS CALENDRIER DÉTECTÉS\n`;
  for (const p of patterns) {
    text += `\n**${p.label}**\n`;
    for (const e of p.events) {
      text += `  - ${e}\n`;
    }
    text += `  → ${p.editorial_hint}\n`;
  }
  return text + '\n';
}
