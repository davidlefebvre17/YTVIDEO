import * as Echogarden from 'echogarden';

/** Echogarden word timeline entry (from align result) */
interface WordEntry {
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf16?: number;
  endOffsetUtf16?: number;
  timeline?: WordEntry[];
}

export interface BeatTimingResult {
  beatId: string;
  startSec: number;
  endSec: number;
  durationSec: number;
}

interface BeatInput {
  id: string;
  narrationTTS?: string;
  narrationChunk: string;
}

interface BeatOffset {
  beatId: string;
  charStart: number;
  charEnd: number;
  cleanText: string;
}

const FISH_AUDIO_TAG_REGEX =
  /\[(emphasis|pause|long pause|excited|soft|breathy|whispering|sighing|clear throat|angry|sad|embarrassed)\]/gi;

function stripFishAudioTags(text: string): string {
  return text.replace(FISH_AUDIO_TAG_REGEX, '').trim();
}

function buildOffsetMap(beats: BeatInput[]): {
  fullText: string;
  beatOffsets: BeatOffset[];
} {
  const beatOffsets: BeatOffset[] = [];
  let charPos = 0;

  const textParts = beats.map((beat) => {
    const cleanText = stripFishAudioTags(beat.narrationTTS ?? beat.narrationChunk);
    const charStart = charPos;
    const charEnd = charPos + cleanText.length;

    beatOffsets.push({
      beatId: beat.id,
      charStart,
      charEnd,
      cleanText,
    });

    charPos = charEnd + 1; // +1 for space separator

    return cleanText;
  });

  const fullText = textParts.join(' ');

  return { fullText, beatOffsets };
}

async function alignWithEchogarden(
  audioPath: string,
  fullText: string,
): Promise<WordEntry[] | null> {
  try {
    console.log(`[align] Calling Echogarden with ${fullText.length} chars of text`);

    const result = await Echogarden.align(audioPath, fullText, {
      engine: 'dtw',
      language: 'fr',
      crop: false,
      dtw: { granularity: 'high' },
    } as any);

    if (!result.wordTimeline || result.wordTimeline.length === 0) {
      console.warn('[align] Echogarden returned empty wordTimeline');
      return null;
    }

    console.log(
      `[align] Echogarden returned ${result.wordTimeline.length} word timings`,
    );

    return result.wordTimeline;
  } catch (error) {
    console.error('[align] Echogarden alignment failed:', error);
    return null;
  }
}

function mapWordsToBeats(
  beatOffsets: BeatOffset[],
  wordTimeline: WordEntry[],
): Map<string, { startSec: number; endSec: number }> {
  const beatTimings = new Map<string, { startSec: number; endSec: number }>();

  for (const beat of beatOffsets) {
    // Find words that fall within this beat's character range
    const wordsInBeat = wordTimeline.filter(
      (word) =>
        (word.startOffsetUtf16 ?? 0) >= beat.charStart &&
        (word.startOffsetUtf16 ?? 0) < beat.charEnd,
    );

    if (wordsInBeat.length === 0) {
      console.warn(
        `[align] No words found for beat ${beat.beatId} (chars ${beat.charStart}-${beat.charEnd})`,
      );
      continue;
    }

    const firstWord = wordsInBeat[0];
    const lastWord = wordsInBeat[wordsInBeat.length - 1];

    beatTimings.set(beat.beatId, {
      startSec: firstWord.startTime,
      endSec: lastWord.endTime,
    });
  }

  return beatTimings;
}

function estimateByProportion(
  beats: BeatInput[],
  totalDurationSec: number,
): Map<string, { startSec: number; endSec: number }> {
  const beatTimings = new Map<string, { startSec: number; endSec: number }>();

  // Count total characters
  const totalChars = beats.reduce((sum, beat) => {
    const cleanText = stripFishAudioTags(beat.narrationTTS ?? beat.narrationChunk);
    return sum + cleanText.length;
  }, 0);

  let currentTimeSec = 0;

  for (const beat of beats) {
    const cleanText = stripFishAudioTags(beat.narrationTTS ?? beat.narrationChunk);
    const charRatio = cleanText.length / totalChars;
    const beatDurationSec = totalDurationSec * charRatio;

    beatTimings.set(beat.id, {
      startSec: currentTimeSec,
      endSec: currentTimeSec + beatDurationSec,
    });

    currentTimeSec += beatDurationSec;
  }

  return beatTimings;
}

export async function alignSegmentAudio(
  audioPath: string,
  beats: BeatInput[],
): Promise<BeatTimingResult[]> {
  if (beats.length === 0) {
    console.warn('[align] No beats provided');
    return [];
  }

  console.log(
    `[align] Starting alignment for ${beats.length} beats from ${audioPath}`,
  );

  // Build offset map
  const { fullText, beatOffsets } = buildOffsetMap(beats);

  // Get audio duration for fallback
  let totalDurationSec: number | null = null;
  try {
    const { parseFile } = await import('music-metadata');
    const meta = await parseFile(audioPath);
    totalDurationSec = meta.format.duration ?? null;
    if (totalDurationSec) console.log(`[align] Audio duration: ${totalDurationSec.toFixed(2)}s`);
  } catch (error) {
    console.error('[align] Could not get audio metadata:', error);
  }

  // Try Echogarden alignment
  const wordTimeline = await alignWithEchogarden(audioPath, fullText);

  let beatTimings: Map<string, { startSec: number; endSec: number }>;

  if (wordTimeline && wordTimeline.length > 0) {
    console.log('[align] Using Echogarden word timings');
    beatTimings = mapWordsToBeats(beatOffsets, wordTimeline);

    // Fall back to proportional if mapping failed for some beats
    if (beatTimings.size < beats.length && totalDurationSec !== null) {
      console.warn(
        `[align] Only mapped ${beatTimings.size}/${beats.length} beats, falling back to proportional for missing`,
      );
      const fallbackTimings = estimateByProportion(beats, totalDurationSec);
      for (const beat of beats) {
        if (!beatTimings.has(beat.id)) {
          beatTimings.set(beat.id, fallbackTimings.get(beat.id)!);
        }
      }
    }
  } else if (totalDurationSec !== null) {
    console.log('[align] Using proportional duration estimation');
    beatTimings = estimateByProportion(beats, totalDurationSec);
  } else {
    console.error('[align] No alignment and no audio duration available');
    throw new Error(
      'Cannot align audio: Echogarden failed and no duration available',
    );
  }

  // Build results
  const results: BeatTimingResult[] = beats
    .map((beat) => {
      const timing = beatTimings.get(beat.id);
      if (!timing) {
        console.warn(`[align] No timing found for beat ${beat.id}`);
        return null;
      }

      return {
        beatId: beat.id,
        startSec: timing.startSec,
        endSec: timing.endSec,
        durationSec: timing.endSec - timing.startSec,
      };
    })
    .filter((r): r is BeatTimingResult => r !== null);

  // Extend last beat to cover the full audio duration (silences at end)
  if (totalDurationSec !== null && results.length > 0) {
    const last = results[results.length - 1];
    if (last.endSec < totalDurationSec) {
      last.endSec = totalDurationSec;
      last.durationSec = last.endSec - last.startSec;
    }
    // Also ensure first beat starts at 0 (silence at start)
    if (results[0].startSec > 0.5) {
      results[0].startSec = 0;
      results[0].durationSec = results[0].endSec - results[0].startSec;
    }
  }

  // Validation
  if (totalDurationSec !== null) {
    const sumDurationSec = results.reduce((sum, r) => sum + r.durationSec, 0);
    const diff = Math.abs(sumDurationSec - totalDurationSec);
    if (diff > 1.0) {
      console.warn(
        `[align] Duration mismatch: beats sum=${sumDurationSec.toFixed(2)}s, audio=${totalDurationSec.toFixed(2)}s (diff=${diff.toFixed(2)}s)`,
      );
    }
  }

  console.log(
    `[align] Alignment complete: ${results.length} beats mapped, durations: [${results.map((r) => r.durationSec.toFixed(2)).join(', ')}]s`,
  );

  return results;
}
