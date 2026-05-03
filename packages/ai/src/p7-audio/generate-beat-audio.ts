/**
 * Génère l'audio TTS — deux modes :
 *
 * 1. SEGMENT MODE (default with Fish): 1 MP3 par segment, puis alignment Echogarden
 *    pour trouver les frontières de beats. Prosodie naturelle.
 * 2. LEGACY MODE (edge-tts ou fallback): 1 MP3 par beat individuel.
 *
 * Providers : edge-tts (gratuit) | fish (Fish Audio S2-Pro, ~$0.15/épisode)
 * Switch via TTS_PROVIDER env var (default: edge).
 *
 * Après génération, chaque beat reçoit :
 *   - Segment mode: audioSegmentPath, audioOffsetSec, audioEndSec, durationSec
 *   - Legacy mode: audioPath, timing.audioDurationSec
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Beat, Language } from '@yt-maker/core';
import { fishTTS, FISH_PRESETS } from './fish-tts';
import { elevenLabsTTS } from './elevenlabs-tts';
import { openaiTTS, type OpenAIVoice } from './openai-tts';
import { replaceTickersInQuotes } from './phonetic-tickers';
import { alignSegmentAudio } from './align-segment-audio';

// ─── TTS Provider ───────────────────────────────────────────────

type TTSProvider = 'edge' | 'fish' | 'elevenlabs' | 'openai';

function getTTSProvider(): TTSProvider {
  const provider = process.env.TTS_PROVIDER || 'edge';
  if (provider === 'fish' || provider === 'fish-audio') return 'fish';
  if (provider === 'elevenlabs' || provider === '11labs') return 'elevenlabs';
  if (provider === 'openai' || provider === 'gpt') return 'openai';
  return 'edge';
}

// ─── OpenAI TTS — preset (vitesse + instructions) pour gpt-4o-mini-tts ─────
/** Vitesse par défaut OpenAI verse — calée sur les tests A/B (1.15). */
const OPENAI_DEFAULT_SPEED = 1.15;

const OPENAI_INSTRUCTIONS_FR = `
Voice: A young French male voice, late twenties, sharp and visibly engaged. Think of an energetic French YouTuber explaining markets to other young people — Hugo Décrypte or Heu?reka style, applied to finance. Smart, fast, alive.

Audience: Young viewers, 20 to 35 years old. They are intelligent but they will mentally check out the second the voice goes flat. Energy is non-negotiable.

Tone: Direct, conversational, modern. Like you are explaining something genuinely fascinating to a friend at a bar. There are real stakes in what you are saying — let that show in your voice. Never lecture, never preach.

Pacing: BRISK. Around 180 to 200 words per minute. Snap forward through setup sentences. Slow down briefly only to land a punch line, an irony, or a key revelation. Then accelerate again. Never drag.

Energy and dynamics: WIDE pitch and volume range. Hit key words — proper nouns, numbers, surprising verbs — with clear emphasis. Make the listener feel the contrast between calm fact-stating and dramatic reveals. No flat stretch longer than one sentence is allowed.

Accent: Modern neutral metropolitan French (Paris). Urban, contemporary, no regional marker. Absolutely no English or anglo-saxon accent on French words. Nasal vowels (an, on, in, un) must sound native.

Forbidden: News-anchor monotone, formal radio gravitas, robotic delivery, sing-song rhythm, droning, any flat passage. The single worst sin here is being boring.
`.trim();

/** Pour OpenAI : retire les tags [pause] (lus littéralement par le modèle)
 *  et substitue les tickers entre guillemets par leur phonétique FR. */
function prepareForOpenAI(text: string): string {
  const stripped = text.replace(/\[long(?:ue)? pause\]/gi, '').replace(/\[pause\]/gi, '');
  const { output } = replaceTickersInQuotes(stripped);
  return output.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

// ─── Edge TTS (lazy import) ─────────────────────────────────────

let MsEdgeTTS: any;
let OUTPUT_FORMAT: any;

async function loadEdgeTTS() {
  if (!MsEdgeTTS) {
    const mod = await import('edge-tts-node');
    MsEdgeTTS = mod.MsEdgeTTS;
    OUTPUT_FORMAT = mod.OUTPUT_FORMAT;
  }
}

/** Voix Edge par langue */
const EDGE_VOICES: Record<string, string> = {
  fr: 'fr-FR-DeniseNeural',
  en: 'en-US-AriaNeural',
};

// ─── Shared utils ───────────────────────────────────────────────

export interface BeatAudioManifest {
  date: string;
  provider: TTSProvider;
  totalDurationSec: number;
  beats: Array<{
    beatId: string;
    mp3Path: string;
    /** Chemin relatif depuis public/ pour staticFile() */
    relativePath: string;
    startSec: number;
    durationSec: number;
    voice: string;
  }>;
}

/** Convert integer string to French words (0-999999999) */
function numberToFrench(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num) || num < 0) return n;
  if (num === 0) return 'zéro';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  if (num < 20) return units[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u];
    if (u === 0) return tens[t] + (t === 8 ? 's' : '');
    if (u === 1 && t !== 8) return tens[t] + ' et un';
    return tens[t] + '-' + units[u];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const hPart = h === 1 ? 'cent' : units[h] + ' cent';
    if (rest === 0) return hPart + (h > 1 ? 's' : '');
    return hPart + ' ' + numberToFrench(String(rest));
  }
  if (num < 1000000) {
    const th = Math.floor(num / 1000);
    const rest = num % 1000;
    const thPart = th === 1 ? 'mille' : numberToFrench(String(th)) + ' mille';
    if (rest === 0) return thPart;
    return thPart + ' ' + numberToFrench(String(rest));
  }
  if (num < 1000000000) {
    const mil = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const milPart = mil === 1 ? 'un million' : numberToFrench(String(mil)) + ' millions';
    if (rest === 0) return milPart;
    return milPart + ' ' + numberToFrench(String(rest));
  }
  return n;
}

/**
 * Sanitize TTS — preProcessForTTS gère déjà la prononciation.
 * Format des pauses : `texte [pause].` (tag AVANT la ponctuation finale).
 * Empiriquement Fish lit mieux le tag avant le point qu'après.
 */
function sanitizeForTTS(text: string): string {
  let t = text
    .replace(/\[long(?:ue)? pause\]/gi, '[pause]')
    // Strip [pause] adjacent à .!? (sera réinjecté en position canonique avant le point)
    .replace(/\[pause\]\s*([.!?])/g, '$1')
    .replace(/([.!?])\s*\[pause\]/g, '$1')
    // Insérer [pause] AVANT la ponctuation finale (sauf en bout de chaîne)
    .replace(/(\S)([.!?])(\s)/g, '$1 [pause]$2$3')
    // Phonétisation des mots anglais du nom de marque — Fish/OpenAI les lirait
    // mal sinon ("Owl" → "o-vle"). "Aul" commence par voyelle, donc l'élision
    // "l'Aul" se prononce naturellement "l-aul".
    .replace(/\bowl\b/gi, 'Aul')
    .replace(/\bstreet\b/gi, 'Street')
    // Espaces multiples
    .replace(/[ \t]+/g, ' ')
    // Tirets cadratins orphelins en fin de phrase
    .replace(/\s+—\s*$/g, '.')
    .trim();
  return t;
}

/** Estimation de durée par mots (~150 mots/min en FR) */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60;
}

// ─── Per-beat TTS generation ────────────────────────────────────

async function generateBeatWithEdge(
  tts: any,
  sanitized: string,
  mp3Path: string,
): Promise<void> {
  await tts.toFile(mp3Path, sanitized);
}

async function generateBeatWithFish(
  sanitized: string,
  mp3Path: string,
  preset?: keyof typeof FISH_PRESETS,
  speed?: number,
): Promise<void> {
  const p = preset ? FISH_PRESETS[preset] : FISH_PRESETS.FOCUS;
  await fishTTS({
    text: sanitized,
    outputPath: mp3Path,
    format: 'mp3',
    speed: speed ?? p.speed,
    temperature: p.temperature,
    // top_p + repetition_penalty laissés aux defaults Fish (non envoyés)
  });
}

async function generateBeatWithElevenLabs(
  sanitized: string,
  mp3Path: string,
  speed?: number,
): Promise<void> {
  await elevenLabsTTS({
    text: sanitized,
    outputPath: mp3Path,
    speed: speed ?? 1.0,
  });
}

async function generateBeatWithOpenAI(
  sanitized: string,
  mp3Path: string,
  speed?: number,
): Promise<void> {
  const text = prepareForOpenAI(sanitized);
  const voice = (process.env.OPENAI_TTS_VOICE as OpenAIVoice) || 'verse';
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  await openaiTTS({
    text,
    outputPath: mp3Path,
    voice,
    model,
    instructions: OPENAI_INSTRUCTIONS_FR,
    format: 'mp3',
    speed: speed ?? OPENAI_DEFAULT_SPEED,
  });
}

// ─── Segment-level TTS generation ───────────────────────────────

/** Group beats by segmentId, preserving order */
function groupBeatsBySegment(beats: Beat[]): Map<string, Beat[]> {
  const map = new Map<string, Beat[]>();
  for (const b of beats) {
    if (!map.has(b.segmentId)) map.set(b.segmentId, []);
    map.get(b.segmentId)!.push(b);
  }
  return map;
}

/**
 * Generate 1 MP3 per segment via Fish Audio, then align with Echogarden.
 * Sets audioSegmentPath, audioOffsetSec, audioEndSec on each beat.
 */
async function generateSegmentAudio(
  beats: Beat[],
  outputDir: string,
  publicRelativePrefix: string,
  speed?: number,
  provider: 'fish' | 'elevenlabs' | 'openai' = 'fish',
): Promise<{ successSegments: number; segmentDurations: Record<string, number> }> {
  const segmentsDir = join(outputDir, 'segments');
  if (!existsSync(segmentsDir)) mkdirSync(segmentsDir, { recursive: true });

  const groups = groupBeatsBySegment(beats);
  let successSegments = 0;
  const segmentDurations: Record<string, number> = {};

  for (const [segId, segBeats] of groups) {
    // Skip segments with no narration (title_card)
    const narrativeBeats = segBeats.filter(b => b.narrationChunk && b.narrationChunk.trim().length >= 3);
    if (narrativeBeats.length === 0) {
      for (const b of segBeats) { (b as any).audioSegmentPath = ''; }
      continue;
    }

    const segMp3 = join(segmentsDir, `${segId}.mp3`);
    const segRelative = `${publicRelativePrefix}/segments/${segId}.mp3`;

    console.log(`    Segment ${segId}: ${narrativeBeats.length} beats, generating...`);

    // 1. Resolve TTS text for each beat (with hallucination fixes)
    const ttsTexts: string[] = narrativeBeats.map(b => {
      let tts = (b as any).narrationTTS || b.narrationChunk;
      if (b.narrationChunk?.match(/\bBoJ\b/i) && /B\.C\.E\./.test(tts)) {
        tts = tts.replace(/B\.C\.E\./g, 'BoJ');
      }
      if (b.narrationChunk?.includes('Terafab') && /Téradaïne/i.test(tts)) {
        tts = tts.replace(/Téradaïne/gi, 'Térafab');
      }
      return String(tts ?? '').trim();
    });

    // 1b. Deduplicate inter-beat overlaps. P7a sometimes splits a sentence
    //     into 2 beats: the sentence is included in beat[N]'s tail AND is the
    //     entire beat[N+1] (typically when a stat-overlay beat is carved out).
    //     Without dedup, Fish concatenates and reads the sentence twice.
    //     Strategy: for each consecutive pair, if beat[N] ends with the full
    //     text of beat[N+1] (modulo punctuation/pauses), trim that tail off N.
    const stripForCompare = (s: string) => s
      .replace(/\[(?:long(?:ue)? )?pause\]/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?…—\-"«»'']/g, '')
      .toLowerCase()
      .trim();
    for (let i = 0; i < ttsTexts.length - 1; i++) {
      const cur = ttsTexts[i];
      const next = ttsTexts[i + 1];
      if (!cur || !next) continue;
      const curNorm = stripForCompare(cur);
      const nextNorm = stripForCompare(next);
      // Only consider non-trivial overlaps (≥ 20 chars on the smaller side)
      if (nextNorm.length < 20) continue;
      if (curNorm.endsWith(nextNorm)) {
        // Trim cur by (roughly) the length of next from the right.
        // Use word-by-word reverse pop to keep punctuation and pause tags intact
        // wherever possible.
        const nextWordCount = next.trim().split(/\s+/).length;
        const curWords = cur.trim().split(/\s+/);
        if (curWords.length > nextWordCount) {
          ttsTexts[i] = curWords.slice(0, curWords.length - nextWordCount).join(' ').replace(/[\s,;:—\-]+$/, '').trim();
          if (ttsTexts[i] && !/[.!?…]$/.test(ttsTexts[i])) ttsTexts[i] += '.';
          console.log(`    Segment ${segId}: dedup overlap between ${narrativeBeats[i].id} → ${narrativeBeats[i+1].id} (-${nextWordCount} words)`);
        }
      }
    }

    // 2. Concatenate
    const fullTTS = ttsTexts.join(' ');
    const sanitized = sanitizeForTTS(fullTTS);

    // 2. Generate 1 MP3 for the whole segment
    const segSpeed = speed ?? FISH_PRESETS.FOCUS.speed;
    try {
      if (provider === 'elevenlabs') {
        await elevenLabsTTS({
          text: sanitized,
          outputPath: segMp3,
          speed: segSpeed,
        });
      } else if (provider === 'openai') {
        const openaiText = prepareForOpenAI(sanitized);
        const openaiVoice = (process.env.OPENAI_TTS_VOICE as OpenAIVoice) || 'verse';
        const openaiModel = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
        // OpenAI a sa propre vitesse cible (1.15) — ne pas hériter du Fish preset (1.1).
        // L'override CLI `speed` reste prioritaire si fourni explicitement.
        const openaiSpeed = speed ?? OPENAI_DEFAULT_SPEED;
        await openaiTTS({
          text: openaiText,
          outputPath: segMp3,
          voice: openaiVoice,
          model: openaiModel,
          instructions: OPENAI_INSTRUCTIONS_FR,
          format: 'mp3',
          speed: openaiSpeed,
        });
      } else {
        await fishTTS({
          text: sanitized,
          outputPath: segMp3,
          format: 'mp3',
          speed: segSpeed,
          temperature: FISH_PRESETS.FOCUS.temperature,
          // top_p + repetition_penalty : defaults Fish (non envoyés)
        });
      }
    } catch (err) {
      console.warn(`    ${provider} failed for segment ${segId}: ${(err as Error).message.slice(0, 100)}`);
      // Mark all beats as no audio
      for (const b of segBeats) { (b as any).audioSegmentPath = ''; }
      continue;
    }

    // Get real MP3 duration
    let segDuration = estimateDuration(sanitized);
    try {
      const { parseFile } = await import('music-metadata');
      const meta = await parseFile(segMp3);
      if (meta.format.duration) segDuration = meta.format.duration;
    } catch {}

    segmentDurations[segId] = segDuration;
    console.log(`    Segment ${segId}: ${segDuration.toFixed(1)}s`);

    // 3. Alignment — find beat boundaries within the segment audio
    try {
      const timings = await alignSegmentAudio(segMp3, narrativeBeats.map(b => ({
        id: b.id,
        narrationTTS: (b as any).narrationTTS,
        narrationChunk: b.narrationChunk,
      })));

      // 4. Set timing on each beat
      for (const bt of timings) {
        const beat = segBeats.find(b => b.id === bt.beatId);
        if (!beat) continue;
        (beat as any).audioSegmentPath = segRelative;
        (beat as any).audioOffsetSec = bt.startSec;
        (beat as any).audioEndSec = bt.endSec;
        beat.durationSec = bt.durationSec;
        beat.timing = { ...beat.timing, audioDurationSec: bt.durationSec };
      }

      // Mark non-narrative beats (title_card, etc.)
      for (const b of segBeats) {
        if (!(b as any).audioSegmentPath) (b as any).audioSegmentPath = '';
      }

      successSegments++;
    } catch (err) {
      console.warn(`    Alignment failed for ${segId}, using proportional: ${(err as Error).message.slice(0, 100)}`);
      // Fallback: proportional timing
      const wordsPerBeat = narrativeBeats.map(b => ((b as any).narrationTTS || b.narrationChunk).split(/\s+/).length);
      const totalWords = wordsPerBeat.reduce((a, b) => a + b, 0);
      let cumSec = 0;
      for (let i = 0; i < narrativeBeats.length; i++) {
        const beatDur = (wordsPerBeat[i] / totalWords) * segDuration;
        const beat = narrativeBeats[i];
        (beat as any).audioSegmentPath = segRelative;
        (beat as any).audioOffsetSec = cumSec;
        (beat as any).audioEndSec = cumSec + beatDur;
        beat.durationSec = beatDur;
        beat.timing = { ...beat.timing, audioDurationSec: beatDur };
        cumSec += beatDur;
      }
      successSegments++;
    }
  }

  return { successSegments, segmentDurations };
}

// ─── Main entry point ───────────────────────────────────────────

/**
 * Génère un fichier MP3 par beat.
 * Provider sélectionné via TTS_PROVIDER env (edge | fish).
 *
 * @param beats - Beats à traiter
 * @param lang - Langue ('fr' | 'en')
 * @param outputDir - Dossier de sortie (ex: packages/remotion-app/public/audio/beats)
 * @param publicRelativePrefix - Préfixe relatif depuis public/ (ex: 'audio/beats')
 */
export async function generateBeatAudio(
  beats: Beat[],
  lang: Language = 'fr',
  outputDir: string,
  publicRelativePrefix: string = 'audio/beats',
  options?: {
    voice?: string;
    /** Sauter les beats qui ont déjà un audioPath existant */
    skipExisting?: boolean;
    /** Speed multiplier (Fish Audio only, default 1.0) */
    speed?: number;
    /** Force legacy per-beat mode even with Fish */
    legacyMode?: boolean;
  }
): Promise<{ beats: Beat[]; manifest: BeatAudioManifest; segmentDurations?: Record<string, number> }> {
  const provider = getTTSProvider();

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // ── Segment mode: Fish/ElevenLabs/OpenAI + Echogarden alignment ──
  if ((provider === 'fish' || provider === 'elevenlabs' || provider === 'openai') && !options?.legacyMode) {
    console.log(`\n  Generating TTS per SEGMENT (${provider}, segment mode)...`);
    const { successSegments, segmentDurations } = await generateSegmentAudio(
      beats, outputDir, publicRelativePrefix, options?.speed, provider,
    );

    // Recalculate cumulative startSec
    let cumSec = 0;
    for (const beat of beats) {
      (beat as any).startSec = cumSec;
      cumSec += beat.durationSec;
    }

    // Build manifest
    const manifest: BeatAudioManifest = {
      date: new Date().toISOString().slice(0, 10),
      provider,
      totalDurationSec: cumSec,
      beats: beats.filter(b => b.narrationChunk?.trim().length >= 3).map(b => ({
        beatId: b.id,
        mp3Path: (b as any).audioSegmentPath || '',
        relativePath: (b as any).audioSegmentPath || '',
        startSec: (b as any).startSec ?? 0,
        durationSec: b.durationSec,
        voice: provider === 'elevenlabs'
          ? (process.env.ELEVENLABS_VOICE_ID ?? 'elevenlabs')
          : provider === 'openai'
            ? (process.env.OPENAI_TTS_VOICE ?? 'verse')
            : (process.env.FISH_VOICE_ID ?? 'fish-s2-pro'),
      })),
    };
    const manifestPath = join(outputDir, 'beat-audio-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`  ${successSegments} segments generated (${cumSec.toFixed(1)}s total) [${provider} segment mode]`);
    console.log(`  Manifest: ${manifestPath}`);

    return { beats, manifest, segmentDurations };
  }

  // ── Legacy mode: 1 MP3 per beat ──
  console.log(`\n  Generating TTS per BEAT (${provider}, legacy mode)...`);

  // Init provider
  let edgeTts: any = null;
  let voice: string;

  if (provider === 'edge') {
    await loadEdgeTTS();
    voice = options?.voice ?? EDGE_VOICES[lang] ?? EDGE_VOICES.fr;
    edgeTts = new MsEdgeTTS({});
    await edgeTts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  } else if (provider === 'elevenlabs') {
    voice = process.env.ELEVENLABS_VOICE_ID ?? 'elevenlabs';
  } else if (provider === 'openai') {
    voice = process.env.OPENAI_TTS_VOICE ?? 'verse';
  } else {
    voice = process.env.FISH_VOICE_ID ?? 'fish-s2-pro';
  }

  const OWL_VOICE_ID = process.env.FISH_OWL_VOICE_ID;

  const results: Array<{ beatId: string; mp3Path: string; relativePath: string; durationSec: number }> = [];
  let successCount = 0;
  let skipCount = 0;

  console.log(`\n  Generating TTS for ${beats.length} beats (${provider}: ${voice})...`);

  for (const beat of beats) {
    // Skip beats sans narration
    if (!beat.narrationChunk || beat.narrationChunk.trim().length < 3) {
      skipCount++;
      continue;
    }

    const mp3Path = join(outputDir, `${beat.id}.mp3`);
    const relativePath = `${publicRelativePrefix}/${beat.id}.mp3`;

    // Skip si déjà généré
    if (options?.skipExisting && existsSync(mp3Path) && statSync(mp3Path).size > 100) {
      const dur = estimateDuration(beat.narrationChunk);
      beat.audioPath = relativePath;
      beat.timing = { ...beat.timing, audioDurationSec: dur };
      results.push({ beatId: beat.id, mp3Path, relativePath, durationSec: dur });
      skipCount++;
      successCount++;
      continue;
    }

    try {
      let ttsText = (beat as any).narrationTTS || beat.narrationChunk;
      // Fix Haiku hallucinations by cross-checking with narrationChunk
      if (beat.narrationChunk?.match(/\bBoJ\b/i) && /B\.C\.E\./.test(ttsText)) {
        ttsText = ttsText.replace(/B\.C\.E\./g, 'BoJ');
      }
      if (beat.narrationChunk?.includes('Terafab') && /Téradaïne/i.test(ttsText)) {
        ttsText = ttsText.replace(/Téradaïne/gi, 'Térafab');
      }
      const sanitized = sanitizeForTTS(ttsText);

      if (provider === 'fish') {
        await generateBeatWithFish(sanitized, mp3Path, undefined, options?.speed);
      } else if (provider === 'elevenlabs') {
        await generateBeatWithElevenLabs(sanitized, mp3Path, options?.speed);
      } else if (provider === 'openai') {
        await generateBeatWithOpenAI(sanitized, mp3Path, options?.speed);
      } else {
        await generateBeatWithEdge(edgeTts, sanitized, mp3Path);
      }

      const durationSec = estimateDuration(sanitized);

      // Muter le beat en place
      beat.audioPath = relativePath;
      beat.timing = {
        ...beat.timing,
        audioDurationSec: durationSec,
      };

      results.push({ beatId: beat.id, mp3Path, relativePath, durationSec });
      successCount++;

      if (successCount % 10 === 0) {
        console.log(`    ${successCount} beats done...`);
      }
    } catch (err) {
      console.warn(`    TTS failed for ${beat.id}: ${(err as Error).message.slice(0, 80)}`);
      // Le beat garde son timing estimé, pas d'audioPath
    }
  }

  // Construire le manifest avec offsets absolus
  let currentSec = 0;
  const manifest: BeatAudioManifest = {
    date: new Date().toISOString().slice(0, 10),
    provider,
    totalDurationSec: 0,
    beats: results.map(({ beatId, mp3Path, relativePath, durationSec }) => {
      const entry = {
        beatId,
        mp3Path,
        relativePath,
        startSec: currentSec,
        durationSec,
        voice,
      };
      currentSec += durationSec;
      return entry;
    }),
  };
  manifest.totalDurationSec = currentSec;

  // Sauvegarder le manifest
  const manifestPath = join(outputDir, 'beat-audio-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `  ${successCount} beats audio generated, ${skipCount} skipped` +
    ` (${manifest.totalDurationSec.toFixed(1)}s total) [${provider}]`
  );
  console.log(`  Manifest: ${manifestPath}`);

  return { beats, manifest };
}
