/**
 * Re-enrichit episodes/YYYY/MM-DD/props.json en ajoutant les assets issus du
 * stockScreen (ex: URI, TXN, STMPA) qui sont cités dans le script mais absents
 * de la watchlist par défaut.
 *
 * Évite de relancer un full npm run generate juste pour récupérer ces movers.
 *
 * Usage: npx tsx scripts/reenrich-props-assets.ts <episode-key>
 *        ex: npx tsx scripts/reenrich-props-assets.ts 2026-04-24
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchAssetSnapshot, fetchDaily3yCandles } from '@yt-maker/data';

const key = process.argv[2];
if (!key) {
  console.error('Usage: reenrich-props-assets.ts <episode-key>');
  process.exit(1);
}

async function main() {
  const [y, md] = key.split('-', 2).length === 3
    ? [key.slice(0, 4), key.slice(5).replace('-', '-')]
    : [key.slice(0, 4), key.slice(5)];
  const epDir = join('episodes', y, md);

  const propsPath = join(epDir, 'props.json');
  const snapshotPath = join(epDir, 'snapshot.json');

  const props = JSON.parse(readFileSync(propsPath, 'utf-8'));
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

  const scriptSymbols = new Set<string>();
  for (const sec of props.script.sections as Array<{ assets?: string[] }>) {
    for (const s of sec.assets ?? []) scriptSymbols.add(s);
  }

  // Symbols cités dans script mais sans candles dans props.assets (à fetcher / refetcher)
  const symbolsNeedingCandles = new Set<string>();
  for (const sym of scriptSymbols) {
    const a = (props.assets as any[]).find(x => x.symbol === sym);
    if (!a || (a.dailyCandles?.length ?? 0) < 10) symbolsNeedingCandles.add(sym);
  }

  const stockScreen: Array<{ symbol: string; name: string; price: number; changePct: number; high52w?: number; low52w?: number }> =
    Array.isArray(snapshot.stockScreen) ? snapshot.stockScreen : [];

  // Pour chaque symbol manquant qui est dans stockScreen → fetcher candles
  let updated = 0;
  let added = 0;
  for (const sym of symbolsNeedingCandles) {
    const m = stockScreen.find(x => x.symbol === sym);
    if (!m) continue;
    process.stdout.write(`  Fetching ${sym} ${m.name}... `);
    try {
      const [snap, dailyCandles] = await Promise.all([
        fetchAssetSnapshot(sym, m.name),
        fetchDaily3yCandles(sym),
      ]);
      snap.changePct = m.changePct;
      snap.price = m.price;
      if (dailyCandles.length > 10) {
        (snap as any).dailyCandles = dailyCandles;
      }
      const existingIdx = (props.assets as any[]).findIndex(x => x.symbol === sym);
      if (existingIdx >= 0) {
        props.assets[existingIdx] = snap;
        updated++;
      } else {
        props.assets.push(snap);
        added++;
      }
      console.log(`✓ ${snap.candles?.length ?? 0} intraday + ${dailyCandles.length} daily`);
    } catch (e) {
      console.log(`✗ ${(e as Error).message.slice(0, 60)}`);
    }
  }

  writeFileSync(propsPath, JSON.stringify(props, null, 2));
  console.log(`props.json: ${added} ajouté(s), ${updated} mis à jour(s) — total ${props.assets.length} assets`);

  // Synchroniser la fixture Remotion Studio (real-beats.json) + episode-index.json
  const stripAssets = (as: any[]) => as.map((a: any) => ({
    symbol: a.symbol, name: a.name, price: a.price,
    change: a.change, changePct: a.changePct,
    high24h: a.high24h, low24h: a.low24h,
    technicals: a.technicals ? { rsi14: a.technicals.rsi14, sma200: a.technicals.sma200 } : undefined,
    candles: a.candles?.slice(-5),
    dailyCandles: a.dailyCandles?.slice(-450),
  }));

  const studioProps = { ...props, assets: stripAssets(props.assets) };
  const fixturePath = 'packages/remotion-app/src/fixtures/real-beats.json';
  writeFileSync(fixturePath, JSON.stringify(studioProps, null, 2));
  console.log(`Fixture Studio synchronisée : ${fixturePath}`);

  try {
    const indexPath = 'packages/remotion-app/src/fixtures/episode-index.json';
    const idx = JSON.parse(readFileSync(indexPath, 'utf-8'));
    const date = props.script?.date || key;
    if (idx.props) {
      idx.props[date] = studioProps;
      writeFileSync(indexPath, JSON.stringify(idx, null, 2));
      console.log(`Episode index mis à jour pour ${date}`);
    }
  } catch (e) {
    console.log(`(episode-index.json pas mis à jour: ${(e as Error).message})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
