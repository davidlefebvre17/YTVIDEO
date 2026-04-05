/**
 * Regenerate ONLY owl audio (intro, transitions, closing) for an existing episode.
 * Does NOT regenerate beat/segment audio.
 * Usage: npx tsx scripts/regen-owl-audio.ts --date 2026-04-01
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { generateBeatAudio } from '../packages/ai/src/p7-audio/generate-beat-audio';
import type { Language } from '@yt-maker/core';

async function main() {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf('--date');
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined;
  if (!date) { console.error('Usage: --date YYYY-MM-DD'); process.exit(1); }
  const lang: Language = 'fr';

  const epDir = path.resolve(__dirname, '..', 'episodes', date.slice(0, 4), date.slice(5));
  const propsPath = path.join(epDir, 'props.json');
  if (!fs.existsSync(propsPath)) { console.error('No props.json at', epDir); process.exit(1); }

  const props = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
  const script = props.script;

  // 1. Extract owl texts from script
  const owlTexts: Array<{ id: string; text: string }> = [];
  if (script.owlIntro) owlTexts.push({ id: 'owl_intro', text: script.owlIntro });
  for (const sec of script.sections ?? []) {
    if (sec.owlTransition) owlTexts.push({ id: `owl_tr_${sec.id}`, text: sec.owlTransition });
  }
  if (script.owlClosing) owlTexts.push({ id: 'owl_closing', text: script.owlClosing });

  console.log(`Regenerating ${owlTexts.length} owl audio clips for ${date}...`);

  // 2. Generate owl audio (legacy mode = 1 file per owl)
  const owlAudioDir = path.join(epDir, 'audio', 'owl');
  if (!fs.existsSync(owlAudioDir)) fs.mkdirSync(owlAudioDir, { recursive: true });

  const owlPublicDir = path.resolve(__dirname, '..', 'packages', 'remotion-app', 'public', 'audio', 'owl');
  if (!fs.existsSync(owlPublicDir)) fs.mkdirSync(owlPublicDir, { recursive: true });

  // Clean old owl files
  for (const f of fs.readdirSync(owlAudioDir).filter(f => f.endsWith('.mp3'))) {
    fs.unlinkSync(path.join(owlAudioDir, f));
  }
  for (const f of fs.readdirSync(owlPublicDir).filter(f => f.endsWith('.mp3'))) {
    fs.unlinkSync(path.join(owlPublicDir, f));
  }

  const owlBeats = owlTexts.map(t => ({
    id: t.id, segmentId: 'owl', narrationChunk: t.text,
    durationSec: t.text.split(/\s+/).length / 2.5,
    timing: { estimatedDurationSec: t.text.split(/\s+/).length / 2.5 },
    audioPath: '', imagePath: '', imagePrompt: '', imageEffect: 'static' as any,
    transitionOut: 'fade' as any, emotion: 'contexte' as any, overlay: null,
  }));

  await generateBeatAudio(owlBeats as any, lang, owlAudioDir, 'audio/owl', {
    skipExisting: false,
    legacyMode: true,
  });

  // 3. Copy to public + build paths
  const generatedOwlPaths: Record<string, string> = {};
  for (const ob of owlBeats) {
    if (!ob.audioPath) continue;
    const filename = path.basename(ob.audioPath);
    const src = fs.existsSync(ob.audioPath) ? ob.audioPath : path.join(owlAudioDir, filename);
    const dst = path.join(owlPublicDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      generatedOwlPaths[ob.id] = `audio/owl/${filename}`;
      console.log(`  ${ob.id} → ${filename}`);
    }
  }

  // 4. Read real durations
  const owlAudioDurations: Record<string, number> = {};
  try {
    const { parseFile } = await import('music-metadata');
    for (const [key, relPath] of Object.entries(generatedOwlPaths)) {
      const mp3 = path.join(owlAudioDir, path.basename(relPath));
      if (fs.existsSync(mp3)) {
        const meta = await parseFile(mp3);
        if (meta.format.duration) owlAudioDurations[key] = meta.format.duration;
      }
    }
  } catch (e) {
    console.warn('  Duration read failed:', (e as Error).message);
  }
  console.log('  Durations:', owlAudioDurations);

  // 5. Update props
  const owlTransitionAudios: Record<string, string> = {};
  for (const sec of script.sections ?? []) {
    const key = `owl_tr_${sec.id}`;
    if (generatedOwlPaths[key]) owlTransitionAudios[sec.id] = generatedOwlPaths[key];
  }

  props.owlIntroAudio = generatedOwlPaths['owl_intro'] || undefined;
  props.owlClosingAudio = generatedOwlPaths['owl_closing'] || undefined;
  props.owlTransitionAudios = owlTransitionAudios;
  props.owlAudioDurations = owlAudioDurations;

  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  fs.writeFileSync(path.join(epDir, 'owl-audio-paths.json'), JSON.stringify(generatedOwlPaths, null, 2));

  // 6. Rebuild fixtures
  const stripAssets = (assets: any[]) => assets?.map((a: any) => ({
    symbol: a.symbol, name: a.name, price: a.price,
    change: a.change, changePct: a.changePct,
    high24h: a.high24h, low24h: a.low24h,
    technicals: a.technicals ? { rsi14: a.technicals.rsi14, sma200: a.technicals.sma200 } : undefined,
    candles: a.candles?.slice(-5),
    dailyCandles: a.dailyCandles?.slice(-450),
  }));
  const studioProps = { ...props, assets: stripAssets(props.assets) };
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'packages', 'remotion-app', 'src', 'fixtures', 'real-beats.json'),
    JSON.stringify(studioProps, null, 2),
  );
  const indexPath = path.resolve(__dirname, '..', 'packages', 'remotion-app', 'src', 'fixtures', 'episode-index.json');
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  idx.props[date] = studioProps;
  fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));

  console.log('Done — owl audio regenerated, props + fixtures updated');
}

main().catch(e => { console.error(e); process.exit(1); });
