/**
 * Full pipeline: fetch → script (C1→C5) → beats (P7) → images → TTS → render
 *
 * Usage:
 *   npm run generate -- --date 2026-03-25 --lang fr
 *   npm run generate -- --skip-fetch --no-render
 *   npm run generate -- --skip-images --skip-tts   # Script + beats only
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fetchMarketSnapshot, updateAllMarketMemory, isWeeklyJobDay, applyHaikuEnrichment, loadMemory, enrichNewsSummaries } from "@yt-maker/data";
import type { ZoneEvent, HaikuEnrichmentResult } from "@yt-maker/data";
import {
  generateScript, getNextEpisodeNumber, appendToManifest,
  getMarketMemoryHaikuPrompt, generateStructuredJSON,
  NewsMemoryDB, initTagger, tagArticleAuto, loadEpisodeData,
  runWeeklyJob, generateBeatAudio,
} from "@yt-maker/ai";
import {
  runPipeline, toEpisodeScript,
  generateBeats, runC7Direction, runC8ImagePrompts, runImageGeneration,
  adaptForTTS,
  createEpisodeDir, saveToEpisode, syncImagesToPublic, syncAudioToPublic, saveRemotionProps, cleanPublicForNewEpisode,
} from "@yt-maker/ai";
import type { PrevContext, RawBeat, AnalysisBundle } from "@yt-maker/ai";
import type { EpisodeType, Language, EpisodeManifestEntry, DailySnapshot, Beat } from "@yt-maker/core";

// ── PrevContext loader (supports flat JSON + folder episodes) ──

function loadPrevContextFromEpisodes(currentDate: string, maxEntries = 15): PrevContext {
  const manifestPath = path.resolve(__dirname, "..", "episodes", "manifest.json");
  if (!fs.existsSync(manifestPath)) return { entries: [] };

  const manifest: Array<{ date: string; filePath: string }> = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const relevant = manifest
    .filter(e => e.date < currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxEntries);

  const entries: PrevContext["entries"] = [];
  for (const entry of relevant) {
    const episodeData = loadEpisodeData(entry.filePath);
    if (episodeData) {
      entries.push({ snapshot: episodeData.snapshot, script: episodeData.script });
    }
  }
  return { entries };
}

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace("--", "");
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    }
  }
  return opts;
}

// ── Main pipeline ──

async function main() {
  const opts = parseArgs();
  const type = (opts.type as EpisodeType) || "daily_recap";
  const lang = (opts.lang as Language) || "fr";
  const skipTts = !!opts["skip-tts"];
  const skipImages = !!opts["skip-images"];
  const skipRender = !!opts["no-render"];
  const skipFetch = !!opts["skip-fetch"];
  const skipScript = !!opts["skip-script"];
  const startFrom = opts["start-from"] as string | undefined;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = (opts.date as string) || yesterday.toISOString().split("T")[0];

  console.log("=== Trading YouTube Maker ===");
  console.log(`Date: ${date} | Lang: ${lang} | Script: ${skipScript ? "SKIP" : "ON"} | Images: ${skipImages ? "SKIP" : "ON"} | TTS: ${skipTts ? "SKIP" : "ON"} | Render: ${skipRender ? "SKIP" : "ON"}`);

  // Create episode folder + clean stale public files
  const epDir = createEpisodeDir(date);
  cleanPublicForNewEpisode();
  console.log(`Episode folder: ${epDir}`);

  let snapshot: DailySnapshot;
  let script: any;
  let beats: Beat[];

  // ════════════════════════════════════════════════════════════
  // SKIP-SCRIPT: Load existing episode data, jump to Step 4
  // ════════════════════════════════════════════════════════════
  if (skipScript) {
    console.log("\n═══ Loading existing episode (--skip-script) ═══");
    const scriptPath = path.join(epDir, "script.json");
    const snapshotPath = path.join(epDir, "snapshot.json");
    const beatsPath = path.join(epDir, "beats.json");
    const beatsRawPath = path.join(epDir, "beats-raw.json");

    if (!fs.existsSync(scriptPath)) { console.error("No script.json in " + epDir); process.exit(1); }
    if (!fs.existsSync(snapshotPath)) { console.error("No snapshot.json in " + epDir); process.exit(1); }

    script = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

    // Load beats (prefer beats.json, fallback to beats-raw.json)
    const bPath = fs.existsSync(beatsPath) ? beatsPath : fs.existsSync(beatsRawPath) ? beatsRawPath : null;
    if (!bPath) { console.error("No beats.json in " + epDir); process.exit(1); }
    beats = JSON.parse(fs.readFileSync(bPath, "utf-8"));

    console.log(`  Script: "${script.title}"`);
    console.log(`  Snapshot: ${snapshot.assets?.length ?? 0} assets`);
    console.log(`  Beats: ${beats.length}`);
  } else {

  // Init News Memory tagger
  try { initTagger(); } catch (err) {
    console.warn(`  Tagger init warning: ${(err as Error).message}`);
  }

  // ════════════════════════════════════════════════════════════
  // STEP 1: FETCH & ENRICH
  // ════════════════════════════════════════════════════════════
  const dataDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const snapshotFilePath = path.join(dataDir, `snapshot-${date}.json`);

  if (skipFetch && fs.existsSync(snapshotFilePath)) {
    console.log("\n═══ Step 1: Loading existing snapshot (--skip-fetch) ═══");
    snapshot = JSON.parse(fs.readFileSync(snapshotFilePath, "utf-8"));
    console.log(`  ${snapshot.assets?.length ?? 0} assets loaded`);
  } else {
    console.log("\n═══ Step 1: Fetching market data ═══");
    snapshot = await fetchMarketSnapshot(date);

    // Enrich news summaries via article extraction (articles sans summary)
    console.log("\n── Step 1.0: Enriching news summaries ──");
    snapshot.news = await enrichNewsSummaries(snapshot.news);

    fs.writeFileSync(snapshotFilePath, JSON.stringify(snapshot, null, 2));
    console.log(`  Snapshot saved: ${snapshotFilePath}`);
  }

  // Save snapshot to episode folder
  saveToEpisode(date, "snapshot.json", snapshot);

  // 1a. News Memory (D2)
  console.log("\n── Step 1a: News Memory (D2) ──");
  const newsDb = new NewsMemoryDB(path.join(dataDir, "news-memory.db"));
  try {
    const articles = snapshot.news.map((n) => ({
      article: {
        title: n.title, source: n.source, url: n.url,
        published_at: n.publishedAt, summary: n.summary,
        category: n.category, lang: n.lang, snapshot_date: date,
      },
      tags: tagArticleAuto({ title: n.title, summary: n.summary || "", source: n.source }),
    }));
    const stored = newsDb.storeArticles(articles);
    console.log(`  ${stored} articles tagged`);

    // Patch dramaScore
    const taggerCounts = new Map<string, number>();
    for (const { tags } of articles) {
      for (const tag of tags.assets) {
        taggerCounts.set(tag.symbol, (taggerCounts.get(tag.symbol) ?? 0) + 1);
      }
    }
    let dramaPatched = 0;
    for (const asset of snapshot.assets) {
      if (!asset.technicals) continue;
      const basicCount = snapshot.news.filter(
        (n) => n.title.toLowerCase().includes(asset.name.toLowerCase()) ||
               n.title.toLowerCase().includes(asset.symbol.toLowerCase()),
      ).length;
      const taggerCount = taggerCounts.get(asset.symbol) ?? 0;
      if (basicCount !== taggerCount) {
        const delta = (Math.min(taggerCount, 5) - Math.min(basicCount, 5)) * 3;
        asset.technicals.dramaScore += delta;
        dramaPatched++;
      }
    }
    if (dramaPatched > 0) {
      console.log(`  DramaScore patched: ${dramaPatched} assets`);
      fs.writeFileSync(snapshotFilePath, JSON.stringify(snapshot, null, 2));
    }

    if (snapshot.events?.length) {
      const ecoEvents = snapshot.events.map((e) => ({
        id: `${date}-${e.name}`, name: e.name, currency: e.currency,
        event_date: date,
        strength: (e.impact === "high" ? "Strong" : e.impact === "medium" ? "Moderate" : "Weak") as "Strong" | "Moderate" | "Weak",
        forecast: e.forecast ? Number(e.forecast) : undefined,
        previous: e.previous ? Number(e.previous) : undefined,
        actual: e.actual ? Number(e.actual) : undefined,
        outcome: "pending" as const, source: "forexfactory",
      }));
      newsDb.syncEconomicEvents(ecoEvents);
      console.log(`  ${ecoEvents.length} economic events synced`);
    }
  } catch (err) {
    console.warn(`  NewsMemory error: ${(err as Error).message.slice(0, 100)}`);
  }

  // 1b. Market Memory (D3)
  console.log("\n── Step 1b: Market Memory (D3) ──");
  const memoryUpdates = await updateAllMarketMemory(date);
  const triggeredAssets = memoryUpdates.filter((u) => u.events.length > 0);
  if (triggeredAssets.length > 0) {
    console.log(`  Zone events: ${triggeredAssets.map((u) => u.symbol).join(", ")}`);
  }

  if (isWeeklyJobDay(date)) {
    console.log("  Monday → weekly Sonnet job...");
    const weeklyResult = await runWeeklyJob();
    console.log(`  Weekly: ${weeklyResult.success ? "OK" : "FAILED"} (${weeklyResult.assets_processed} assets)`);
  }

  if (triggeredAssets.length > 0) {
    console.log(`  Haiku enrichment for ${triggeredAssets.length} assets...`);
    const enrichments: HaikuEnrichmentResult[] = [];
    for (const update of triggeredAssets) {
      const memory = loadMemory(update.symbol);
      if (!memory) continue;
      try {
        const { system, user } = getMarketMemoryHaikuPrompt(memory, update.events);
        const result = await generateStructuredJSON<HaikuEnrichmentResult>(system, user, { role: "fast" });
        if (!result.symbol) result.symbol = update.symbol;
        enrichments.push(result);
      } catch (err) {
        console.warn(`    ${update.symbol}: Haiku failed`);
      }
    }
    if (enrichments.length > 0) {
      applyHaikuEnrichment(enrichments);
      console.log(`  ${enrichments.length} assets enriched`);
    }
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2: SCRIPT GENERATION (C1→C5)
  // ════════════════════════════════════════════════════════════
  console.log("\n═══ Step 2: Script Generation (C1→C5) ═══");
  const episodeNumber = getNextEpisodeNumber();
  const useLegacy = !!opts["legacy"];

  const prevContext = loadPrevContextFromEpisodes(date);
  console.log(`  PrevContext: ${prevContext.entries.length} épisodes`);

  let pipelineResult: any = null;
  if (useLegacy) {
    console.log("  Mode: LEGACY");
    script = await generateScript(snapshot, { type, lang, episodeNumber, newsDb, prevContext });
  } else {
    console.log("  Mode: PIPELINE C1→C5");
    pipelineResult = await runPipeline({ snapshot, lang, episodeNumber, newsDb, prevContext, startFrom: startFrom as any });
    script = toEpisodeScript(pipelineResult.directedEpisode, episodeNumber, lang);
    console.log(`  Stats: ${pipelineResult.stats.llmCalls} LLM, ${pipelineResult.stats.retries} retries, ${(pipelineResult.stats.totalDurationMs / 1000).toFixed(1)}s`);
  }

  saveToEpisode(date, "script.json", script);

  // ════════════════════════════════════════════════════════════
  // STEP 3: BEAT PIPELINE (P7a → P7c)
  // ════════════════════════════════════════════════════════════
  console.log("\n═══ Step 3: Beat Pipeline (P7) ═══");

  // P7a: Generate beats (chunks narration + P7a.5 Haiku annotation)
  console.log("  P7a: Generating beats...");
  const analysis: AnalysisBundle | undefined = pipelineResult?.intermediates?.analysis;
  const rawBeats = await generateBeats(script, snapshot, analysis);
  console.log(`  ${rawBeats.length} beats generated`);

  // P7b: C7 Direction Artistique (Sonnet)
  console.log("  P7b: C7 Direction Artistique...");
  const editorialVisuals: Record<string, string> = {};
  for (const sec of script.sections) {
    if ((sec as any).editorialVisual) {
      editorialVisuals[sec.id] = (sec as any).editorialVisual;
    }
  }
  const direction = script.direction ?? {
    arc: [], transitions: [], chartTimings: [], moodMusic: "neutre_analytique",
    thumbnailMoment: { segmentId: "seg_1", reason: "", emotionalTone: "" },
  };
  const c7Result = await runC7Direction(rawBeats as any, direction, snapshot.assets, { lang, editorialVisuals });
  console.log(`  ${c7Result.directions.length} directions, ${c7Result.directions.filter(d => d.imageReuse).length} reuse`);

  // P7c: C8 Image Prompts (Haiku)
  console.log("  P7c: C8 Image Prompts...");
  const imagePrompts = await runC8ImagePrompts(c7Result, direction.moodMusic ?? "neutre_analytique", { lang });
  const uniquePrompts = imagePrompts.filter(p => !p.skip).length;
  console.log(`  ${imagePrompts.length} prompts (${uniquePrompts} unique)`);

  // Merge directions + prompts into beats
  beats = (rawBeats as any[]).map((raw: any, i: number) => {
    const dir = c7Result.directions.find((d: any) => d.beatId === raw.id);
    const prompt = imagePrompts.find((p: any) => p.beatId === raw.id);
    return {
      ...raw,
      imageEffect: dir?.imageEffect ?? "ken_burns_in",
      transitionOut: dir?.transitionOut ?? "fade",
      emotion: dir?.emotion ?? raw.emotion ?? "contexte",
      imagePrompt: prompt?.imagePrompt ?? "",
      imagePath: "",
      audioPath: "",
      overlay: raw.overlayHint && raw.overlayHint !== 'none' && raw.overlayData ? {
        type: raw.overlayHint,
        data: raw.overlayData,
        position: 'center',
        enterAnimation: raw.overlayAnimation ?? 'fade',
        enterDelayMs: 0,
      } : null,
      timing: { estimatedDurationSec: raw.durationSec },
    };
  });

  saveToEpisode(date, "beats-raw.json", beats);
  console.log(`  Beats assembled: ${beats.length}`);

  try { newsDb.close(); } catch {}
  } // end if (!skipScript)

  // ════════════════════════════════════════════════════════════
  // STEP 4: IMAGE GENERATION (P7d)
  // ════════════════════════════════════════════════════════════
  console.log("\n═══ Step 4: Image Generation (P7d) ═══");

  // Build imagePrompts from beats (works for both fresh and loaded beats)
  const imgPrompts = beats
    .filter((b: any) => b.imagePrompt && b.imagePrompt.length > 20)
    .map((b: any) => ({ beatId: b.id, imagePrompt: b.imagePrompt, skip: false }));
  // Mark reuse beats as skip
  const allPrompts = beats.map((b: any) => {
    const hasPrompt = b.imagePrompt && b.imagePrompt.length > 20;
    return { beatId: b.id, imagePrompt: b.imagePrompt ?? "", skip: !hasPrompt };
  });
  // Minimal c7-like directions for reuse handling
  const directions = beats.map((b: any) => ({
    beatId: b.id, imageReuse: (b as any).imageReuse ?? undefined,
  }));
  const c7Compat = { directions, visualIdentity: {} } as any;

  const imageMap = await runImageGeneration(allPrompts, c7Compat, date, { skipImages });

  // Sync images to episode folder + Remotion public/
  const publicImagePaths = syncImagesToPublic(date, imageMap);

  // Update beat imagePaths
  for (const beat of beats) {
    const imgPath = publicImagePaths.get(beat.id);
    if (imgPath) beat.imagePath = imgPath;
    // Handle reuse
    if (!imgPath && (beat as any).imageReuse) {
      const sourceId = ((beat as any).imageReuse as string).replace("same_as:", "");
      const sourcePath = publicImagePaths.get(sourceId);
      if (sourcePath) beat.imagePath = sourcePath;
    }
  }
  console.log(`  ${publicImagePaths.size} images synced`);

  // ════════════════════════════════════════════════════════════
  // STEP 5: TTS AUDIO GENERATION
  // ════════════════════════════════════════════════════════════
  if (!skipTts) {
    console.log("\n═══ Step 5: TTS Audio Generation ═══");

    // C6: Adapt narration for TTS (Fish Audio tags)
    try {
      console.log("  C6: TTS Adaptation...");
      const ttsBeats = beats.map(b => ({
        id: b.id, segmentId: b.segmentId,
        narrationChunk: b.narrationChunk,
        segmentDepth: (b as any).segmentDepth ?? "focus",
        isSegmentStart: (b as any).isSegmentStart ?? false,
        isSegmentEnd: (b as any).isSegmentEnd ?? false,
      }));
      const annotations = beats.map(b => ({
        beatId: b.id,
        primaryAsset: (b as any).primaryAsset ?? null,
        overlayType: b.overlay?.type ?? "none" as any,
        overlaySpec: b.overlay?.data ?? null,
        triggerWord: (b as any).triggerWord ?? null,
        emotion: (b as any).emotion ?? "contexte" as any,
        visualScale: (b as any).visualScale ?? "moyen" as any,
        beatPacing: (b as any).beatPacing ?? "posé" as any,
        overlayAnimation: (b as any).overlayAnimation ?? "fade" as any,
        isKeyMoment: (b as any).isKeyMoment ?? false,
      }));
      const adapted = await adaptForTTS(ttsBeats, annotations);
      for (const ttsBeat of adapted) {
        const beat = beats.find(b => b.id === ttsBeat.beatId);
        if (beat && ttsBeat.adapted) {
          (beat as any).narrationTTS = ttsBeat.adapted;
        }
      }
      console.log(`  ${adapted.length} beats adapted`);
    } catch (err) {
      console.warn(`  C6 adaptation failed (using raw narration): ${(err as Error).message.slice(0, 80)}`);
    }

    // Generate audio
    console.log("  Generating audio...");
    const audioDir = path.join(epDir, "audio");
    const { manifest: audioManifest } = await generateBeatAudio(
      beats as any, lang, audioDir, "audio/beats",
      { skipExisting: false },
    );

    // Sync audio to Remotion public/
    syncAudioToPublic(date, beats.map(b => ({ id: b.id, audioPath: b.audioPath })));

    // Read real MP3 durations
    console.log("  Syncing audio durations...");
    try {
      const { parseFile } = await import("music-metadata");
      const remotionAudioDir = path.join(epDir, "audio");
      let synced = 0;
      for (const beat of beats) {
        if (!beat.audioPath) continue;
        const mp3Path = path.join(remotionAudioDir, path.basename(beat.audioPath));
        if (!fs.existsSync(mp3Path)) continue;
        try {
          const metadata = await parseFile(mp3Path);
          const realDuration = metadata.format.duration;
          if (realDuration && realDuration > 0) {
            beat.timing = { ...beat.timing, audioDurationSec: realDuration };
            beat.durationSec = realDuration;
            synced++;
          }
        } catch {}
      }
      // Recalculate startSec
      let cumSec = 0;
      for (const beat of beats) {
        (beat as any).startSec = cumSec;
        cumSec += beat.durationSec;
      }
      console.log(`  ${synced}/${beats.length} beats synced with real MP3 durations`);
    } catch (err) {
      console.warn(`  Duration sync failed: ${(err as Error).message.slice(0, 80)}`);
    }

    saveToEpisode(date, "audio-manifest.json", audioManifest);

    // ── Step 5b: Generate owl audio (intro, transitions, closing) ──
    console.log("  Generating owl audio...");
    const owlAudioDir = path.join(epDir, "audio", "owl");
    if (!fs.existsSync(owlAudioDir)) fs.mkdirSync(owlAudioDir, { recursive: true });
    const owlPublicDir = path.resolve(__dirname, "..", "packages", "remotion-app", "public", "audio", "owl");
    if (!fs.existsSync(owlPublicDir)) fs.mkdirSync(owlPublicDir, { recursive: true });

    const owlTexts: Array<{ id: string; text: string }> = [];

    // owlIntro
    if (script.owlIntro) owlTexts.push({ id: "owl_intro", text: script.owlIntro });

    // owlTransitions per segment
    for (const sec of script.sections) {
      if (sec.owlTransition) owlTexts.push({ id: `owl_tr_${sec.id}`, text: sec.owlTransition });
    }

    // owlClosing
    if (script.owlClosing) owlTexts.push({ id: "owl_closing", text: script.owlClosing });

    const generatedOwlPaths: Record<string, string> = {};
    if (owlTexts.length > 0) {
      // Generate each owl audio as a separate beat
      const owlBeats = owlTexts.map(t => ({
        id: t.id, segmentId: "owl", narrationChunk: t.text,
        durationSec: t.text.split(/\s+/).length / 2.5,
        timing: { estimatedDurationSec: t.text.split(/\s+/).length / 2.5 },
        audioPath: "", imagePath: "", imagePrompt: "", imageEffect: "static" as any,
        transitionOut: "fade" as any, emotion: "contexte" as any, overlay: null,
      }));
      const { manifest: owlManifest } = await generateBeatAudio(
        owlBeats as any, lang, owlAudioDir, "audio/owl",
        { skipExisting: false },
      );
      // Copy to public + track paths
      for (const ob of owlBeats) {
        if (!ob.audioPath) continue;
        const filename = path.basename(ob.audioPath);
        const src = path.join(owlAudioDir, filename);
        const dst = path.join(owlPublicDir, filename);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
        generatedOwlPaths[ob.id] = `audio/owl/${filename}`;
      }
      console.log(`  ${owlTexts.length} owl audio clips generated`);
    }

    // Store owl audio paths for props
    saveToEpisode(date, "owl-audio-paths.json", generatedOwlPaths);

  } else {
    console.log("\n═══ Step 5: TTS SKIPPED (--skip-tts) ═══");
  }

  // Load owl audio paths (from current or previous run)
  let owlAudioPaths: Record<string, string> = {};
  try {
    const owlPathsFile = path.join(epDir, "owl-audio-paths.json");
    if (fs.existsSync(owlPathsFile)) {
      owlAudioPaths = JSON.parse(fs.readFileSync(owlPathsFile, "utf-8"));
    }
  } catch {}

  // ════════════════════════════════════════════════════════════
  // STEP 6: SAVE EPISODE + RENDER
  // ════════════════════════════════════════════════════════════
  console.log("\n═══ Step 6: Save episode ═══");

  // Save final beats
  saveToEpisode(date, "beats.json", beats);

  // Build and save Remotion props
  const owlTransitionAudios: Record<string, string> = {};
  for (const sec of script.sections) {
    const key = `owl_tr_${sec.id}`;
    if (owlAudioPaths[key]) owlTransitionAudios[sec.id] = owlAudioPaths[key];
  }
  const remotionProps = {
    script,
    beats,
    assets: snapshot.assets,
    news: snapshot.news,
    owlIntroAudio: owlAudioPaths["owl_intro"] || undefined,
    owlClosingAudio: owlAudioPaths["owl_closing"] || undefined,
    owlTransitionAudios,
  };
  const propsPath = saveRemotionProps(date, remotionProps);
  console.log(`  Props saved: ${propsPath}`);

  // Also save to Remotion fixture for studio preview (stripped — no heavy candle data)
  try {
    const fixturePath = path.resolve(__dirname, "..", "packages", "remotion-app", "src", "fixtures", "real-beats.json");
    const stripAssets = (assets: any[]) => assets?.map((a: any) => ({
      symbol: a.symbol, name: a.name, price: a.price,
      change: a.change, changePct: a.changePct,
      high24h: a.high24h, low24h: a.low24h,
      technicals: a.technicals ? { rsi14: a.technicals.rsi14, sma200: a.technicals.sma200 } : undefined,
      candles: a.candles?.slice(-5),          // Last 5 intraday candles (for mini charts)
      dailyCandles: a.dailyCandles?.slice(-30), // Last 30 daily candles (for overlays)
    }));
    const studioProps = {
      ...remotionProps,
      assets: stripAssets(remotionProps.assets as any[]),
    };
    fs.writeFileSync(fixturePath, JSON.stringify(studioProps, null, 2));

    // Add to episode-index.json for studio episode list
    const indexPath = path.resolve(__dirname, "..", "packages", "remotion-app", "src", "fixtures", "episode-index.json");
    const idx = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    if (!idx.entries.find((e: any) => e.date === date)) {
      idx.entries.push({
        date,
        title: script.title,
        episodeNumber: script.episodeNumber,
      });
    }
    idx.props[date] = studioProps;
    fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));
    console.log(`  Episode added to studio index`);
  } catch {}

  // Update manifest (only if script was freshly generated)
  if (!skipScript) {
    const episodeNumber = script.episodeNumber ?? getNextEpisodeNumber();
    const manifestEntry: EpisodeManifestEntry = {
      episodeNumber, date, type, lang,
      title: script.title,
      filePath: epDir,
    };
    appendToManifest(manifestEntry);
    console.log("  Manifest updated");
  }

  // Render
  if (skipRender) {
    console.log("\n═══ Rendering SKIPPED (--no-render) ═══");
  } else {
    console.log("\n═══ Step 7: Rendering BeatEpisode ═══");
    const outPath = path.join(epDir, `episode-${date}.mp4`);

    const remotionEntry = path.resolve(__dirname, "..", "packages", "remotion-app", "src", "index.ts");
    const cmd = `npx remotion render "${remotionEntry}" BeatDaily "${outPath}" --codec=h264 --crf=18 --props="${propsPath}"`;

    console.log(`  Rendering: ${cmd.slice(0, 100)}...`);
    try {
      execSync(cmd, { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
      console.log(`\n  Video: ${outPath}`);
    } catch (err) {
      console.error("  Render failed:", err);
    }
  }

  console.log("\n═══ Done! ═══");
  console.log(`Episode: "${script.title}"`);
  console.log(`Beats: ${beats.length} | Duration: ~${Math.round(beats.reduce((s, b) => s + b.durationSec, 0))}s`);
  console.log(`Folder: ${epDir}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
