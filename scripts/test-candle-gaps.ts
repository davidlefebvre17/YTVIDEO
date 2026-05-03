/**
 * Quick probe — Yahoo Finance daily candles for Brent + USDJPY + WTI right now.
 * Goal : confirm whether the 04-30 candle is missing/null due to yesterday's
 * fetch timing, OR truly absent at Yahoo.
 *
 * Usage : npx tsx scripts/test-candle-gaps.ts
 */
import 'dotenv/config';
// @ts-ignore — transient install
import YahooFinance from 'yahoo-finance2';

const yf = new (YahooFinance as any)({
  suppressNotices: ['yahooSurvey'],
});

const SYMBOLS = ['BZ=F', 'CL=F', 'USDJPY=X', '^N225', '^GSPC'];

async function probe(symbol: string) {
  try {
    const res = await yf.chart(symbol, {
      period1: new Date('2026-04-25'),
      period2: new Date(),
      interval: '1d',
    });
    const quotes = res?.quotes ?? [];
    const last5 = quotes.slice(-7);
    console.log(`\n${symbol}  (${last5.length} recent candles):`);
    for (const q of last5) {
      const d = q.date instanceof Date ? q.date.toISOString().slice(0, 10) : String(q.date).slice(0, 10);
      const c = q.close;
      const o = q.open;
      const v = q.volume;
      const cStr = c == null ? 'NULL' : c.toFixed(2);
      const oStr = o == null ? 'NULL' : o.toFixed(2);
      const vStr = v == null ? 'NULL' : v.toString();
      console.log(`  ${d}   o=${oStr.padStart(8)}  c=${cStr.padStart(8)}  vol=${vStr}`);
    }
  } catch (err) {
    console.log(`${symbol}: ERROR ${(err as Error).message.slice(0, 120)}`);
  }
}

async function main() {
  console.log('=== Yahoo daily candle probe (live, ' + new Date().toISOString() + ') ===');
  for (const s of SYMBOLS) {
    await probe(s);
    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
