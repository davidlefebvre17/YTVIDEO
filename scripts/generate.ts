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
import { fetchMarketSnapshot, updateAllMarketMemory, isWeeklyJobDay, applyHaikuEnrichment, loadMemory, enrichNewsSummaries, fetchAssetSnapshot, fetchDaily3yCandles } from "@yt-maker/data";
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
  const reuseImages = !!opts["reuse-images"];
  const skipRender = !!opts["no-render"];
  const skipFetch = !!opts["skip-fetch"];
  const skipScript = !!opts["skip-script"];
  const startFrom = opts["start-from"] as string | undefined;
  // Default snap date = last trading day (skip weekend: Sat→Fri, Sun→Fri, Mon→Fri)
  const defaultSnap = new Date();
  defaultSnap.setDate(defaultSnap.getDate() - 1);
  while (defaultSnap.getUTCDay() === 0 || defaultSnap.getUTCDay() === 6) {
    defaultSnap.setDate(defaultSnap.getDate() - 1);
  }
  const date = (opts.date as string) || defaultSnap.toISOString().split("T")[0];

  // ── Publication date (ALWAYS defined = clé unique par épisode publié) ──
  // Règle : publishDate = today si today > snap (publication après la séance).
  //          sinon snap+1 (simulation "le lendemain matin" pour runs historiques).
  // CLI override : --publish-date YYYY-MM-DD
  // Flag --monday : force today comme publishDate (pratique pour catchup lundi)
  const cliPubDate = opts["publish-date"] as string | undefined;
  const forceMonday = !!opts["monday"];
  const todayStr = new Date().toISOString().split("T")[0];
  const snapPlus1 = (() => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  let publishDate: string;
  if (cliPubDate) {
    publishDate = cliPubDate;
  } else if (forceMonday) {
    publishDate = todayStr;
  } else if (todayStr > date) {
    // Publication réelle = aujourd'hui (cas normal : daily recap matinal)
    publishDate = todayStr;
  } else {
    // Run historique ou en avance : simuler "le lendemain matin"
    publishDate = snapPlus1;
  }

  // Monday recap = pub est lundi ET gap snap→pub >= 2 jours (weekend)
  const pubD = new Date(publishDate + "T12:00:00Z");
  const snapD = new Date(date + "T12:00:00Z");
  const gapDays = Math.round((pubD.getTime() - snapD.getTime()) / 86400000);
  const isMondayRecap = pubD.getUTCDay() === 1 && gapDays >= 2;
  if (isMondayRecap) {
    console.log(`🔶 Mode LUNDI (pub=${publishDate}, snap=${date}, gap=${gapDays}j)`);
  }

  // ── Episode date key = publishDate ──
  // Chaque publication a son dossier unique. Samedi (pub=samedi) et Lundi (pub=lundi)
  // couvrent la même séance vendredi mais vivent dans des dossiers distincts.
  const episodeKey = publishDate;

  console.log("=== Trading YouTube Maker ===");
  console.log(`Date: ${date}${publishDate ? ` | Pub: ${publishDate}` : ""} | Episode key: ${episodeKey} | Lang: ${lang} | Script: ${skipScript ? "SKIP" : "ON"} | Images: ${skipImages ? "SKIP" : "ON"} | TTS: ${skipTts ? "SKIP" : "ON"} | Render: ${skipRender ? "SKIP" : "ON"}`);

  // Create episode folder + clean stale public files
  const epDir = createEpisodeDir(episodeKey);
  cleanPublicForNewEpisode(episodeKey, { skipImages: skipImages || reuseImages });
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
  const snapshotFilePath = path.join(dataDir, `snapshot-${episodeKey}.json`);

  if (skipFetch && fs.existsSync(snapshotFilePath)) {
    console.log("\n═══ Step 1: Loading existing snapshot (--skip-fetch) ═══");
    snapshot = JSON.parse(fs.readFileSync(snapshotFilePath, "utf-8"));
    console.log(`  ${snapshot.assets?.length ?? 0} assets loaded`);
  } else {
    console.log("\n═══ Step 1: Fetching market data ═══");
    // Monday mode : fetch avec today pour récupérer crypto weekend moves + news live.
    // Sinon (daily) : fetch avec la date d'épisode (comportement historique).
    // snapshot.date est ensuite aligné sur la narrative (vendredi pour Monday, date pour daily).
    const fetchDate = publishDate ? publishDate : date;
    if (fetchDate !== date) {
      const modeLabel = isMondayRecap ? 'Mode LUNDI' : 'Publication post-séance';
      console.log(`  ${modeLabel}: fetch avec ${fetchDate} (today), narrative snap = ${date}`);
    }
    snapshot = await fetchMarketSnapshot(fetchDate);
    // Override narrative date: pipeline utilise snapshot.date pour temporal anchors
    snapshot.date = date;

    // Enrich news summaries via article extraction (articles sans summary)
    console.log("\n── Step 1.0: Enriching news summaries ──");
    snapshot.news = await enrichNewsSummaries(snapshot.news);

    fs.writeFileSync(snapshotFilePath, JSON.stringify(snapshot, null, 2));
    console.log(`  Snapshot saved: ${snapshotFilePath}`);
  }

  // Save snapshot to episode folder
  saveToEpisode(episodeKey, "snapshot.json", snapshot);

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

  // Weekly Sonnet job: trigger if publication day is Monday (not the snap date)
  // In Monday recap mode, snap=Friday but publication=Monday, so isWeeklyJobDay(date) would miss it.
  const weeklyJobTriggerDate = publishDate ?? date;
  if (isWeeklyJobDay(weeklyJobTriggerDate)) {
    console.log(`  Monday (${weeklyJobTriggerDate}) → weekly Sonnet job...`);
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

  const prevContext = loadPrevContextFromEpisodes(episodeKey);
  console.log(`  PrevContext: ${prevContext.entries.length} épisodes`);

  let pipelineResult: any = null;
  if (useLegacy) {
    console.log("  Mode: LEGACY");
    script = await generateScript(snapshot, { type, lang, episodeNumber, newsDb, prevContext });
  } else {
    console.log("  Mode: PIPELINE C1→C5");
    pipelineResult = await runPipeline({ snapshot, lang, episodeNumber, newsDb, prevContext, startFrom: startFrom as any, publishDate });
    script = toEpisodeScript(pipelineResult.directedEpisode, episodeNumber, lang, pipelineResult.intermediates.seo);
    console.log(`  Stats: ${pipelineResult.stats.llmCalls} LLM, ${pipelineResult.stats.retries} retries, ${(pipelineResult.stats.totalDurationMs / 1000).toFixed(1)}s`);
  }

  saveToEpisode(episodeKey, "script.json", script);

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

  // P7c: C8 Image Prompts (Haiku) — narrative 2-pass (multi-subject + staging)
  console.log("  P7c: C8 Image Prompts (narrative 2-pass)...");
  const narrativeContext = {
    beats: (rawBeats as any[]).map((b) => ({
      id: b.id,
      segmentId: b.segmentId,
      narrationChunk: b.narrationChunk ?? '',
      emotion: b.emotion,
    })),
    sections: script.sections.map((s: any) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      narration: s.narration ?? '',
      topic: s.topic,
      assets: s.assets,
    })),
  };
  const imagePrompts = await runC8ImagePrompts(
    c7Result,
    direction.moodMusic ?? "neutre_analytique",
    { lang },
    narrativeContext,
  );
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

  saveToEpisode(episodeKey, "beats-raw.json", beats);
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

  // ── REUSE-IMAGES MODE ────────────────────────────────────────
  // Reuse existing real images from episodes/{date}/images/ instead of regenerating
  // or assigning placeholders. Bypass runImageGeneration AND syncImagesToPublic
  // (which would self-copy). Just copy the existing PNGs to public/editorial/
  // and build the relative-path map directly.
  let publicImagePaths: Map<string, string>;
  if (reuseImages) {
    const epImagesDir = path.join(epDir, "images");
    const editorialPubDir = path.resolve(__dirname, "..", "packages", "remotion-app", "public", "editorial", `ep-${episodeKey}`);
    if (!fs.existsSync(epImagesDir)) {
      console.error(`  --reuse-images: directory not found: ${epImagesDir}`);
      process.exit(1);
    }
    if (!fs.existsSync(editorialPubDir)) fs.mkdirSync(editorialPubDir, { recursive: true });
    publicImagePaths = new Map<string, string>();
    let reused = 0;
    for (const beat of beats) {
      const candidate = path.join(epImagesDir, `${beat.id}.png`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1024) {
        const destPath = path.join(editorialPubDir, `${beat.id}.png`);
        try {
          fs.copyFileSync(candidate, destPath);
          publicImagePaths.set(beat.id, `editorial/ep-${episodeKey}/${beat.id}.png`);
          reused++;
        } catch (err) {
          console.warn(`  reuse-images copy failed for ${beat.id}: ${(err as Error).message.slice(0, 80)}`);
        }
      }
    }
    console.log(`  P7d: reuse-images mode → ${reused}/${beats.length} existing PNGs reused from ${epImagesDir}`);
  } else {
    const imageMap = await runImageGeneration(allPrompts, c7Compat, episodeKey, { skipImages });
    publicImagePaths = syncImagesToPublic(episodeKey, imageMap);
  }

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
  // Fallback: beats with a prompt but no image (generation failed) inherit previous beat's image
  let lastImage = "";
  for (const beat of beats) {
    if (beat.imagePath) {
      lastImage = beat.imagePath;
    } else if ((beat as any).imagePrompt && lastImage) {
      beat.imagePath = lastImage;
    }
  }
  console.log(`  ${publicImagePaths.size} images synced`);

  // ════════════════════════════════════════════════════════════
  // STEP 5: TTS AUDIO GENERATION
  // ════════════════════════════════════════════════════════════
  let segmentDurations: Record<string, number> | undefined;
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
    // Per-episode public path so old episodes don't get overwritten on regen.
    const audioPublicPrefix = `audio/ep-${episodeKey}/beats`;
    const { manifest: audioManifest, segmentDurations: segDur } = await generateBeatAudio(
      beats as any, lang, audioDir, audioPublicPrefix,
      { skipExisting: false },
    );
    segmentDurations = segDur;

    // Sync audio to Remotion public/
    const isSegmentMode = beats.some((b: any) => b.audioSegmentPath);

    if (isSegmentMode) {
      // Segment mode: copy segment MP3s to public/audio/ep-{date}/beats/segments
      const segSrcDir = path.join(audioDir, "segments");
      const segPubDir = path.resolve(__dirname, "..", "packages", "remotion-app", "public", "audio", `ep-${episodeKey}`, "beats", "segments");
      if (!fs.existsSync(segPubDir)) fs.mkdirSync(segPubDir, { recursive: true });
      if (fs.existsSync(segSrcDir)) {
        for (const f of fs.readdirSync(segSrcDir).filter(f => f.endsWith('.mp3'))) {
          fs.copyFileSync(path.join(segSrcDir, f), path.join(segPubDir, f));
        }
        console.log(`  Segment audio synced to public/`);
      }
      // Durations already set by alignment — no need to re-read MP3s
    } else {
      // Legacy mode: copy per-beat MP3s
      syncAudioToPublic(episodeKey, beats.map(b => ({ id: b.id, audioPath: b.audioPath })));

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
    }

    saveToEpisode(episodeKey, "audio-manifest.json", audioManifest);

    // ── Step 5b: Generate owl audio (intro, transitions, closing) ──
    console.log("  Generating owl audio...");
    const owlAudioDir = path.join(epDir, "audio", "owl");
    if (!fs.existsSync(owlAudioDir)) fs.mkdirSync(owlAudioDir, { recursive: true });
    const owlPublicDir = path.resolve(__dirname, "..", "packages", "remotion-app", "public", "audio", `ep-${episodeKey}`, "owl");
    if (!fs.existsSync(owlPublicDir)) fs.mkdirSync(owlPublicDir, { recursive: true });
    const owlPublicPrefix = `audio/ep-${episodeKey}/owl`;

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
        owlBeats as any, lang, owlAudioDir, owlPublicPrefix,
        { skipExisting: false, legacyMode: true },
      );
      // Copy to public + track paths
      for (const ob of owlBeats) {
        if (!ob.audioPath) continue;
        const filename = path.basename(ob.audioPath);
        // audioPath may be relative — resolve from owlAudioDir
        const src = fs.existsSync(ob.audioPath) ? ob.audioPath : path.join(owlAudioDir, filename);
        const dst = path.join(owlPublicDir, filename);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
        generatedOwlPaths[ob.id] = `${owlPublicPrefix}/${filename}`;
      }
      console.log(`  ${owlTexts.length} owl audio clips generated`);
    }

    // Store owl audio paths for props
    saveToEpisode(episodeKey, "owl-audio-paths.json", generatedOwlPaths);

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
  saveToEpisode(episodeKey, "beats.json", beats);

  // Build and save Remotion props
  const owlTransitionAudios: Record<string, string> = {};
  for (const sec of script.sections) {
    const key = `owl_tr_${sec.id}`;
    if (owlAudioPaths[key]) owlTransitionAudios[sec.id] = owlAudioPaths[key];
  }
  // Compute real durations for owl audio (transitions, intro, closing)
  const owlAudioDurations: Record<string, number> = {};
  try {
    const { parseFile } = await import("music-metadata");
    const owlDir = path.join(epDir, "audio", "owl");
    for (const [key, relPath] of Object.entries(owlAudioPaths)) {
      const mp3 = path.join(owlDir, path.basename(relPath));
      if (fs.existsSync(mp3)) {
        const meta = await parseFile(mp3);
        if (meta.format.duration) owlAudioDurations[key] = meta.format.duration;
      }
    }
  } catch {}

  // Enrichir les assets avec les stockScreen movers cités dans le script
  // (ex: URI, TXN, STMPA, WST — absents de la watchlist mais nommés en narration).
  // On fetche AUSSI les bougies (intraday + dailyCandles 3y) pour que les charts
  // Remotion s'affichent réellement, pas juste un fallback ticker card.
  const scriptSymbols = new Set<string>();
  for (const sec of script.sections) {
    for (const sym of (sec as any).assets ?? []) scriptSymbols.add(sym);
  }
  const watchlistSymbols = new Set(snapshot.assets.map(a => a.symbol));
  const stockScreen = Array.isArray((snapshot as any).stockScreen)
    ? ((snapshot as any).stockScreen as Array<{ symbol: string; name: string; price: number; changePct: number; volume?: number; high52w?: number; low52w?: number; sector?: string }>)
    : [];

  const moversToFetch = stockScreen.filter(m => scriptSymbols.has(m.symbol) && !watchlistSymbols.has(m.symbol));
  const extraAssets: any[] = [];
  if (moversToFetch.length > 0) {
    console.log(`  Fetching candles for ${moversToFetch.length} stockScreen movers cited in script: ${moversToFetch.map(m => m.symbol).join(', ')}`);
    // Sequential pour respecter le rate-limit Yahoo (comme la watchlist en Phase 2)
    for (const m of moversToFetch) {
      try {
        const [snap, dailyCandles] = await Promise.all([
          fetchAssetSnapshot(m.symbol, m.name),
          fetchDaily3yCandles(m.symbol),
        ]);
        // Override changePct/price avec ceux du stockScreen (J-1 session, plus fiable que intraday)
        snap.changePct = m.changePct;
        snap.price = m.price;
        if (dailyCandles.length > 10) {
          (snap as any).dailyCandles = dailyCandles;
        }
        extraAssets.push(snap);
        watchlistSymbols.add(m.symbol);
      } catch (e) {
        // Fallback : push entry sans candles, comme avant
        console.log(`    [warn] candles fetch failed for ${m.symbol}: ${(e as Error).message.slice(0, 80)}`);
        extraAssets.push({
          symbol: m.symbol,
          name: m.name,
          price: m.price,
          change: 0,
          changePct: m.changePct,
          candles: [],
          high24h: m.high52w ?? m.price,
          low24h: m.low52w ?? m.price,
        });
        watchlistSymbols.add(m.symbol);
      }
    }
    const withCandles = extraAssets.filter(a => (a.dailyCandles?.length ?? 0) > 10).length;
    console.log(`  Enrichment done: ${withCandles}/${extraAssets.length} with full candles`);
  }
  const enrichedAssets = [...snapshot.assets, ...extraAssets];

  const remotionProps = {
    script,
    beats,
    assets: enrichedAssets,
    news: snapshot.news,
    owlIntroAudio: owlAudioPaths["owl_intro"] || undefined,
    owlClosingAudio: owlAudioPaths["owl_closing"] || undefined,
    owlTransitionAudios,
    owlAudioDurations,
    segmentAudioDurations: segmentDurations ?? undefined,
    yieldsHistory: snapshot.yieldsHistory ?? undefined,
  };
  const propsPath = saveRemotionProps(episodeKey, remotionProps);
  console.log(`  Props saved: ${propsPath}`);

  // Also save to Remotion fixture for studio preview (stripped — no heavy candle data)
  try {
    const fixturePath = path.resolve(__dirname, "..", "packages", "remotion-app", "src", "fixtures", "real-beats.json");
    const stripAssets = (assets: any[]) => assets?.map((a: any) => ({
      symbol: a.symbol, name: a.name, price: a.price,
      change: a.change, changePct: a.changePct,
      high24h: a.high24h, low24h: a.low24h,
      technicals: a.technicals ? { rsi14: a.technicals.rsi14, sma200: a.technicals.sma200 } : undefined,
      candles: a.candles?.slice(-5),           // Last 5 intraday candles (for mini charts)
      dailyCandles: a.dailyCandles?.slice(-450), // 450 daily candles (SMA 200 lookback + 250 display)
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
      episodeNumber, date: episodeKey, type, lang,
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
