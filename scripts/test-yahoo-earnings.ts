/**
 * Quick probe — what does Yahoo Finance return for European tickers
 * earnings calendar via `quoteSummary`?
 *
 * Test sample: 6 CAC40 + 2 DAX + 2 FTSE tickers covering different sectors.
 *
 * Usage:
 *   npx tsx scripts/test-yahoo-earnings.ts
 */

import 'dotenv/config';
// @ts-ignore — transient install, no types in workspace
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)({
  suppressNotices: ['yahooSurvey'],
});

const TICKERS = [
  // CAC40
  'AI.PA',    // Air Liquide (publi T1 le 28/04)
  'MC.PA',    // LVMH
  'BNP.PA',   // BNP Paribas
  'TTE.PA',   // TotalEnergies
  'AIR.PA',   // Airbus
  'STMPA.PA', // STMicroelectronics
  // DAX
  'SAP.DE',   // SAP
  'SIE.DE',   // Siemens
  // FTSE
  'BP.L',     // BP
  'SHEL.L',   // Shell
];

interface EarningsCheck {
  symbol: string;
  ok: boolean;
  nextEarningsDate?: string;
  lastEarnings?: { date: string; epsActual?: number; epsEstimate?: number };
  history?: Array<{ date: string; actual: number; estimate: number; surprise: number }>;
  error?: string;
}

async function probe(symbol: string): Promise<EarningsCheck> {
  try {
    const result: any = await yahooFinance.quoteSummary(
      symbol,
      { modules: ['calendarEvents', 'earnings', 'earningsHistory'] },
      { validateResult: false },
    );

    const cal = result.calendarEvents?.earnings;
    const earnings = result.earnings;
    const history = result.earningsHistory?.history ?? [];

    const nextDate: Date | undefined = Array.isArray(cal?.earningsDate)
      ? cal.earningsDate[0]
      : cal?.earningsDate;

    const earningsHistoryQuarterly = earnings?.earningsChart?.quarterly ?? [];
    const lastQ = earningsHistoryQuarterly[earningsHistoryQuarterly.length - 1];

    return {
      symbol,
      ok: true,
      nextEarningsDate: nextDate ? new Date(nextDate).toISOString().slice(0, 10) : undefined,
      lastEarnings: lastQ
        ? {
            date: lastQ.date,
            epsActual: lastQ.actual?.raw,
            epsEstimate: lastQ.estimate?.raw,
          }
        : undefined,
      history: history.slice(-4).map((h: any) => ({
        date: h.quarter?.fmt ?? '?',
        actual: h.epsActual?.raw,
        estimate: h.epsEstimate?.raw,
        surprise: h.surprisePercent?.raw,
      })),
    };
  } catch (err) {
    return { symbol, ok: false, error: (err as Error).message.slice(0, 120) };
  }
}

async function main() {
  console.log('=== Probe Yahoo Finance earnings for European tickers ===\n');
  const results: EarningsCheck[] = [];
  for (const t of TICKERS) {
    process.stdout.write(`  ${t.padEnd(10)} ... `);
    const r = await probe(t);
    if (r.ok) {
      console.log(
        `next=${r.nextEarningsDate ?? '?'}  last=${r.lastEarnings?.date ?? '?'} (EPS ${r.lastEarnings?.epsActual ?? '?'} vs est ${r.lastEarnings?.epsEstimate ?? '?'})  history=${r.history?.length ?? 0} quarters`,
      );
    } else {
      console.log(`✗ ${r.error}`);
    }
    results.push(r);
  }

  console.log('\n--- Summary ---');
  const ok = results.filter((r) => r.ok).length;
  const withNext = results.filter((r) => r.nextEarningsDate).length;
  const withHistory = results.filter((r) => (r.history?.length ?? 0) > 0).length;
  console.log(`OK responses:           ${ok}/${results.length}`);
  console.log(`With next earnings:     ${withNext}/${results.length}`);
  console.log(`With EPS history:       ${withHistory}/${results.length}`);

  // Detail dump for AI.PA specifically (today's case study) — raw structure
  console.log('\n--- AI.PA RAW structure (skip validation) ---');
  try {
    const raw: any = await yahooFinance.quoteSummary(
      'AI.PA',
      { modules: ['calendarEvents', 'earnings', 'earningsHistory'] },
      { validateResult: false },
    );
    console.log(JSON.stringify(raw, null, 2));
  } catch (e) {
    console.log(`raw fetch failed: ${(e as Error).message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
