/**
 * Validate the yahoo-earnings module — ensure it returns correctly-shaped
 * EarningsEvent for European tickers and that AI.PA (today's case study)
 * generates a "recently published" entry usable by P1.
 *
 * Usage: npx tsx scripts/test-yahoo-earnings-module.ts
 */
import 'dotenv/config';
import { fetchYahooEarnings, isEuropeanTicker } from '../packages/data/src/yahoo-earnings';

async function main() {
  console.log('=== yahoo-earnings module integration test ===\n');

  const probe = ['AI.PA', 'AIR.PA', 'BNP.PA', 'TTE.PA', 'BP.L', 'SHEL.L', 'SAP.DE', 'AAPL'];
  const eu = probe.filter(isEuropeanTicker);
  const us = probe.filter((s) => !isEuropeanTicker(s));
  console.log(`EU symbols: ${eu.join(', ')}`);
  console.log(`Skipped (non-EU): ${us.join(', ')}\n`);

  const today = new Date().toISOString().slice(0, 10);
  const events = await fetchYahooEarnings(eu, today);

  console.log('\nAll events returned:');
  for (const e of events) {
    const tag = e.epsActual != null || e.revenueActual != null ? 'PUBLISHED' : 'PENDING';
    const eps = e.epsActual != null ? `EPS=${e.epsActual}` : `EPSest=${e.epsEstimate ?? '?'}`;
    const rev = e.revenueActual != null
      ? `rev=${(e.revenueActual / 1e9).toFixed(2)}B`
      : `revEst=${e.revenueEstimate != null ? (e.revenueEstimate / 1e9).toFixed(2) + 'B' : '?'}`;
    console.log(`  [${tag}] ${e.symbol.padEnd(8)} date=${e.date}  ${eps}  ${rev}`);
  }

  // ── Validate AI.PA case ──
  const aipa = events.filter((e) => e.symbol === 'AI.PA');
  console.log(`\n--- AI.PA (today's case study) ---`);
  if (aipa.length === 0) {
    console.log('❌ No AI.PA event — fix needed');
    process.exit(1);
  }
  for (const e of aipa) {
    const status = e.reported ? 'PUBLISHED' : 'PENDING';
    console.log(`  ${status}  date=${e.date}  revActual=${e.revenueActual ? (e.revenueActual / 1e9).toFixed(3) + 'B' : 'none'}  revEst=${e.revenueEstimate ? (e.revenueEstimate / 1e9).toFixed(3) + 'B' : 'none'}`);
    if (e.revenueActual && e.revenueEstimate) {
      const surprise = ((e.revenueActual - e.revenueEstimate) / e.revenueEstimate) * 100;
      console.log(`  → revenue surprise: ${surprise.toFixed(2)}% ${Math.abs(surprise) > 3 ? '✅ would trigger EARNINGS_SURPRISE (3% threshold)' : '(below 3% threshold)'}`);
    }
  }
  // Recently published should have e.reported=true and date within ±2 days of today
  const todayD = new Date(today + 'T12:00:00Z');
  const recent = aipa.filter((e) => {
    if (!e.reported) return false;
    const d = new Date(e.date + 'T12:00:00Z');
    const diffDays = Math.abs((todayD.getTime() - d.getTime()) / 86400000);
    return diffDays <= 2;
  });
  console.log(`  ${recent.length > 0 ? '✅' : '❌'} EARNINGS_RECENT eligible: ${recent.length > 0 ? 'YES' : 'NO'}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
