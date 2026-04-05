/**
 * Re-run Echogarden alignment on existing segment MP3s without regenerating audio.
 * Usage: npx tsx scripts/realign-episode.ts --date 2026-04-01
 */
import fs from 'fs';
import path from 'path';
import { alignSegmentAudio } from '../packages/ai/src/p7-audio/align-segment-audio';

async function main() {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf('--date');
  const date = dateIdx >= 0 ? args[dateIdx + 1] : '2026-04-01';

  const epDir = path.resolve(__dirname, '..', 'episodes', date.slice(0, 4), date.slice(5));
  const propsPath = path.join(epDir, 'props.json');

  if (!fs.existsSync(propsPath)) { console.error('No props.json at', propsPath); process.exit(1); }

  const props = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
  console.log(`Re-aligning episode ${date} (${props.beats.length} beats)...`);

  // Group beats by segment
  const groups = new Map<string, any[]>();
  for (const b of props.beats) {
    if (!groups.has(b.segmentId)) groups.set(b.segmentId, []);
    groups.get(b.segmentId)!.push(b);
  }

  for (const [segId, segBeats] of groups) {
    const segPath = path.join(epDir, 'audio', 'segments', segId + '.mp3');
    if (!fs.existsSync(segPath)) { console.log(`  Skip ${segId} (no mp3)`); continue; }

    const narrativeBeats = segBeats.filter((b: any) => b.narrationChunk?.trim().length >= 3);
    if (narrativeBeats.length === 0) continue;

    console.log(`  ${segId}: ${narrativeBeats.length} beats...`);
    const timings = await alignSegmentAudio(segPath, narrativeBeats.map((b: any) => ({
      id: b.id, narrationTTS: b.narrationTTS, narrationChunk: b.narrationChunk,
    })));

    for (const bt of timings) {
      const beat = segBeats.find((b: any) => b.id === bt.beatId);
      if (!beat) continue;
      beat.audioOffsetSec = bt.startSec;
      beat.audioEndSec = bt.endSec;
      beat.durationSec = bt.durationSec;
      beat.timing = { ...beat.timing, audioDurationSec: bt.durationSec };
    }
  }

  // Recalculate cumulative startSec
  let cumSec = 0;
  for (const b of props.beats) {
    b.startSec = cumSec;
    cumSec += b.durationSec;
  }

  // Save props
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  console.log(`  Props saved (${cumSec.toFixed(1)}s total)`);

  // Rebuild fixtures
  const stripAssets = (assets: any[]) => assets?.map((a: any) => ({
    symbol: a.symbol, name: a.name, price: a.price,
    change: a.change, changePct: a.changePct,
    high24h: a.high24h, low24h: a.low24h,
    technicals: a.technicals ? { rsi14: a.technicals.rsi14, sma200: a.technicals.sma200 } : undefined,
    candles: a.candles?.slice(-5),
    dailyCandles: a.dailyCandles?.slice(-450),
  }));
  const studioProps = { ...props, assets: stripAssets(props.assets) };

  const fixturePath = path.resolve(__dirname, '..', 'packages', 'remotion-app', 'src', 'fixtures', 'real-beats.json');
  fs.writeFileSync(fixturePath, JSON.stringify(studioProps, null, 2));

  const indexPath = path.resolve(__dirname, '..', 'packages', 'remotion-app', 'src', 'fixtures', 'episode-index.json');
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  idx.props[date] = studioProps;
  fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));

  console.log('Done — fixtures rebuilt with gap-free alignment');
}

main().catch(e => { console.error(e); process.exit(1); });
