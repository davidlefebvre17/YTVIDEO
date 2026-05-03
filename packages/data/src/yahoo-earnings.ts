/**
 * Yahoo Finance — earnings calendar complementing Finnhub.
 *
 * Finnhub /calendar/earnings only covers US tickers. For European tickers
 * (.PA, .DE, .L, .MI, .AS, .SW…), we hit Yahoo's quoteSummary endpoint
 * (modules: calendarEvents, earnings, earningsHistory) per symbol and
 * adapt the response into the same `EarningsEvent` shape as Finnhub —
 * so the rest of the pipeline (P1 flagging, market-snapshot merge) reads
 * one unified `snapshot.earnings` array.
 *
 * Two situations we capture:
 *   (a) Future earnings (date in next ±2 days, no actuals yet) → results pending
 *   (b) Recently published earnings (last quarterly entry has revenue/EPS,
 *       quarter end date ≤ 7 days ago) → published, actuals available
 *
 * Throttle: 250ms between calls to avoid Yahoo rate-limiting.
 */

import type { EarningsEvent } from '@yt-maker/core';
// @ts-ignore — yahoo-finance2 has types but they don't expose default export cleanly
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)({
  suppressNotices: ['yahooSurvey'],
});

const THROTTLE_MS = 250;

/** Symbols we route through Yahoo (European exchanges Finnhub misses). */
const EU_SUFFIXES = ['.PA', '.DE', '.L', '.MI', '.AS', '.SW', '.MC', '.BR', '.LS', '.VI', '.HE', '.ST', '.OL', '.CO'];

export function isEuropeanTicker(symbol: string): boolean {
  return EU_SUFFIXES.some((s) => symbol.toUpperCase().endsWith(s));
}

interface YahooQuarterlyEarning {
  date: string;
  fiscalQuarter?: string;
  revenue?: number;
  earnings?: number;
  estimate?: number;
}

interface YahooQuoteSummary {
  earnings?: {
    earningsChart?: {
      quarterly?: Array<{ date: string; estimate?: number; periodEndDate?: number }>;
      earningsDate?: Date[] | Date;
      isEarningsDateEstimate?: boolean;
    };
    financialsChart?: {
      quarterly?: YahooQuarterlyEarning[];
    };
  };
  calendarEvents?: {
    earnings?: {
      earningsDate?: Date[] | Date;
      revenueAverage?: number;
      revenueLow?: number;
      revenueHigh?: number;
      earningsAverage?: number;
      earningsLow?: number;
      earningsHigh?: number;
    };
  };
  earningsHistory?: {
    history?: Array<{
      epsEstimate?: number;
      epsActual?: number;
      surprisePercent?: number;
      quarter?: Date;
      period?: string;
    }>;
  };
}

/** Convert YYYY-MM-DD to Date assuming midday UTC (timezone-safe). */
function toDate(d: string): Date {
  return new Date(d + 'T12:00:00Z');
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Parse Yahoo's quarter label "1Q2026" into an ISO date approximating quarter-end. */
function quarterLabelToDate(label: string | undefined): string | undefined {
  if (!label) return undefined;
  const m = label.match(/(\d)Q(\d{4})/);
  if (!m) return undefined;
  const q = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  // Quarter-end dates: 1Q→Mar31, 2Q→Jun30, 3Q→Sep30, 4Q→Dec31
  const endMonth = q * 3;
  const endDay = endMonth === 6 || endMonth === 9 ? 30 : 31;
  return `${y}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
}

/**
 * Probe Yahoo for one symbol. Returns one or two EarningsEvent entries:
 *   - One for the next earnings date (no actuals)
 *   - One for the last published quarter (with actuals) if quarter-end ≤ 14 days ago
 */
async function probeOne(symbol: string, snapshotDate: string): Promise<EarningsEvent[]> {
  const results: EarningsEvent[] = [];
  const today = toDate(snapshotDate);

  let raw: YahooQuoteSummary;
  try {
    raw = await yahooFinance.quoteSummary(
      symbol,
      { modules: ['calendarEvents', 'earnings', 'earningsHistory'] },
      { validateResult: false },
    );
  } catch {
    return results;
  }

  // ── (a) Next earnings (results pending) ──
  const nextEarningsRaw = raw.calendarEvents?.earnings?.earningsDate
    ?? raw.earnings?.earningsChart?.earningsDate;
  const nextDate: Date | undefined = Array.isArray(nextEarningsRaw)
    ? nextEarningsRaw[0]
    : (nextEarningsRaw as Date | undefined);

  if (nextDate) {
    const dStr = new Date(nextDate).toISOString().slice(0, 10);
    const daysUntil = diffDays(toDate(dStr), today);
    // Keep only future events within 7 days. Past pending dates (Yahoo lag) are
    // handled by the published-quarter branch below — don't double-count.
    if (daysUntil >= 0 && daysUntil <= 7) {
      results.push({
        symbol,
        date: dStr,
        epsEstimate: raw.calendarEvents?.earnings?.earningsAverage,
        revenueEstimate: raw.calendarEvents?.earnings?.revenueAverage,
        epsActual: undefined,
        revenueActual: undefined,
        hour: 'dmh',
        reported: false,
      });
    }
  }

  // ── (b) Recently published (actuals available) ──
  const quarterly = raw.earnings?.financialsChart?.quarterly ?? [];
  const lastQ = quarterly[quarterly.length - 1];
  if (lastQ) {
    const qEndDate = quarterLabelToDate(lastQ.date);
    // Look at the most recent earnings history entry for EPS actual
    const lastHistory = raw.earningsHistory?.history?.[raw.earningsHistory.history.length - 1];
    const epsActual = lastHistory?.epsActual;
    const epsEstimate = lastHistory?.epsEstimate;
    const revenueActual = lastQ.revenue && lastQ.revenue > 0 ? lastQ.revenue : undefined;
    // calendarEvents.revenueAverage is NEXT quarter forecast, but for already-published ones
    // we approximate revenueEstimate from the quarterly chart's `estimate` if present
    const earningsChartEntry = raw.earnings?.earningsChart?.quarterly?.find(
      (q) => q.date === lastQ.date,
    );
    const revenueEstimate = earningsChartEntry?.estimate;

    // Only treat as "recently published" if the quarter ended ≤ 14 days ago
    // AND we have at least one actual (epsActual OR revenueActual).
    if (qEndDate && (epsActual != null || revenueActual != null)) {
      const daysSinceQuarterEnd = diffDays(today, toDate(qEndDate));
      // Quarter ended within last ~45 days = plausible "just published" window
      // (T1 ends Mar 31, gets published end of April → 30 days later)
      if (daysSinceQuarterEnd >= 0 && daysSinceQuarterEnd <= 45) {
        // We don't know the exact publication date — use today as best approximation
        // (the publication was recent, hence still an editorial signal).
        // If a future earningsDate already exists in results for this symbol, we keep both:
        // P1 will see actuals on the published one, pending on the future one.
        results.push({
          symbol,
          date: snapshotDate,  // approximate publication = today
          epsEstimate,
          epsActual,
          revenueEstimate,
          revenueActual,
          hour: 'dmh',
          reported: true,
        });
      }
    }
  }

  return results;
}

/**
 * Fetch earnings via Yahoo for a list of (typically European) symbols.
 * Returns events compatible with the Finnhub-shaped `EarningsEvent[]`.
 *
 * Failures on individual symbols are logged but do not fail the whole batch.
 */
export async function fetchYahooEarnings(
  symbols: string[],
  snapshotDate: string,
): Promise<EarningsEvent[]> {
  if (symbols.length === 0) return [];

  const unique = Array.from(new Set(symbols));
  console.log(`  Fetching Yahoo earnings for ${unique.length} symbols (EU complement)...`);

  const all: EarningsEvent[] = [];
  let okCount = 0;
  let withActuals = 0;

  for (let i = 0; i < unique.length; i++) {
    const sym = unique[i];
    try {
      const events = await probeOne(sym, snapshotDate);
      if (events.length > 0) {
        okCount++;
        if (events.some((e) => e.epsActual != null || e.revenueActual != null)) {
          withActuals++;
        }
        all.push(...events);
      }
    } catch (err) {
      console.warn(`    Yahoo earnings ${sym}: ${(err as Error).message.slice(0, 80)}`);
    }
    if (i < unique.length - 1) {
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
  }

  console.log(`  Yahoo earnings: ${all.length} events (${okCount}/${unique.length} symbols, ${withActuals} with actuals)`);
  return all;
}
