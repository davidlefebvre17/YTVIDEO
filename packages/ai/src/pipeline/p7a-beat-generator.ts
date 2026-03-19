import type {
  EpisodeScript, ScriptSection, DailySnapshot, AssetSnapshot, OverlayType, EpisodeDirection,
} from "@yt-maker/core";
import type { RawBeat } from "./types";

const WORDS_PER_SEC = 2.5;
const MIN_BEAT_SEC = 3;
const MAX_BEAT_SEC = 10;
const MIN_BEAT_WORDS = Math.floor(MIN_BEAT_SEC * WORDS_PER_SEC);

// ── Sentence boundaries for French narration ────────────────

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+|(?<=\s—\s)|(?<=[;])\s+/;

interface NarrationChunk {
  text: string;
  wordCount: number;
  durationSec: number;
}

export function chunkNarration(narration: string): NarrationChunk[] {
  const trimmed = narration.trim();
  if (!trimmed) return [];

  const rawSentences = trimmed.split(SENTENCE_SPLIT_RE).filter(s => s.trim().length > 0);
  if (rawSentences.length === 0) return [];

  const chunks: NarrationChunk[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const combined = buffer ? `${buffer} ${sentence}` : sentence;
    const wordCount = combined.split(/\s+/).length;
    const duration = wordCount / WORDS_PER_SEC;

    if (duration > MAX_BEAT_SEC && buffer) {
      const bufWords = buffer.split(/\s+/).length;
      chunks.push({ text: buffer.trim(), wordCount: bufWords, durationSec: round(bufWords / WORDS_PER_SEC) });
      buffer = sentence;
    } else if (duration > MAX_BEAT_SEC) {
      chunks.push({ text: sentence.trim(), wordCount, durationSec: round(duration) });
      buffer = '';
    } else if (duration >= MIN_BEAT_SEC) {
      chunks.push({ text: combined.trim(), wordCount, durationSec: round(duration) });
      buffer = '';
    } else {
      buffer = combined;
    }
  }

  if (buffer.trim()) {
    const wordCount = buffer.split(/\s+/).length;
    if (chunks.length > 0 && wordCount < MIN_BEAT_WORDS) {
      const last = chunks[chunks.length - 1];
      last.text = `${last.text} ${buffer.trim()}`;
      last.wordCount = last.text.split(/\s+/).length;
      last.durationSec = round(last.wordCount / WORDS_PER_SEC);
    } else {
      chunks.push({ text: buffer.trim(), wordCount, durationSec: round(wordCount / WORDS_PER_SEC) });
    }
  }

  return chunks;
}

// ── Overlay classifier ──────────────────────────────────────

const CAUSAL_RE = /parce que|à cause de|en raison de|entraîne.*(?:hausse|baisse|chute)|provoque.*(?:un|une|la|le)|déclenche/i;
const SCENARIO_RE = /scénario|si\s+(?:le|la|les)\s.*(?:alors|casse|franchit|passe)|haussier.*baissier|baissier.*haussier|en revanche.*si/i;
const STAT_STRONG_RE = /(?:moins|plus)\s+\w+\s+(?:virgule\s+\w+\s+)?pour\s+cent|[+-]?\d+[,.]?\d*\s*%/i;

export function classifyOverlay(chunk: string, assetNames: string[]): OverlayType | 'none' {
  const lower = chunk.toLowerCase();

  const matchedAssets = assetNames.filter(name => lower.includes(name.toLowerCase()));

  if (matchedAssets.length >= 2) return 'comparison';
  if (SCENARIO_RE.test(chunk)) return 'scenario_fork';
  if (CAUSAL_RE.test(chunk)) return 'causal_chain';
  if (STAT_STRONG_RE.test(chunk)) return 'stat';

  return 'none';
}

// ── Overlay data resolver ───────────────────────────────────

export function resolveOverlayData(
  chunk: string,
  overlayType: OverlayType,
  assets: AssetSnapshot[],
  segmentAssets: string[],
  snapshot: DailySnapshot,
): Record<string, unknown> {
  const findAsset = (sym: string) => assets.find(a => a.symbol === sym);
  const lower = chunk.toLowerCase();

  switch (overlayType) {
    case 'stat': {
      const numMatch = chunk.match(/([\d]+[,.]?[\d]*)\s*([%$€])/);
      const wordMatch = chunk.match(/(moins|plus)\s+(\w+)\s+(virgule\s+\w+\s+)?pour\s+cent/i);
      let value = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;
      const suffix = numMatch ? numMatch[2] : '%';
      if (wordMatch && value === undefined) {
        value = 0;
      }
      const negative = lower.includes('moins') || lower.includes('perd') || lower.includes('recule') || lower.includes('lâche') || lower.includes('baisse');
      if (value !== undefined && negative && value > 0) value = -value;

      const matchedSym = segmentAssets.find(s => {
        const a = findAsset(s);
        return a && lower.includes(a.name.toLowerCase());
      }) ?? segmentAssets[0];
      const asset = matchedSym ? findAsset(matchedSym) : undefined;

      return {
        value: value ?? asset?.changePct ?? 0,
        label: asset?.name ?? matchedSym ?? '',
        suffix,
        prefix: '',
      };
    }

    case 'chart':
    case 'chart_zone': {
      const sym = segmentAssets.find(s => {
        const a = findAsset(s);
        return a && lower.includes(a.name.toLowerCase());
      }) ?? segmentAssets[0];
      const asset = sym ? findAsset(sym) : undefined;
      if (!asset) return {};

      const levels: Array<{ value: number; label: string }> = [];
      const levelMatch = chunk.match(/(\d[\d\s]*\d|\d+)\s*(dollars?|\$)/gi);
      if (levelMatch) {
        for (const m of levelMatch) {
          const val = parseFloat(m.replace(/\s/g, '').replace(/dollars?/i, '').replace('$', ''));
          if (!isNaN(val)) levels.push({ value: val, label: `${val}` });
        }
      }

      return {
        symbol: asset.symbol,
        name: asset.name,
        price: asset.price,
        changePct: asset.changePct,
        candleCount: asset.candles?.length ?? 0,
        levels,
      };
    }

    case 'causal_chain': {
      const parts = chunk
        .split(/parce que|à cause de|en raison de|entraîne|provoque|déclenche|mécaniquement|du coup|ce qui/i)
        .map(s => s.trim())
        .filter(s => s.length > 3 && s.length < 80);
      return { steps: parts.length >= 2 ? parts.slice(0, 5) : [chunk.slice(0, 60)] };
    }

    case 'comparison': {
      const matched = segmentAssets
        .filter(s => { const a = findAsset(s); return a && lower.includes(a.name.toLowerCase()); })
        .slice(0, 4)
        .map(s => {
          const a = findAsset(s)!;
          return { symbol: a.symbol, label: a.name, value: a.price, changePct: a.changePct };
        });
      return { assets: matched.length >= 2 ? matched : [] };
    }

    case 'scenario_fork': {
      const bullMatch = chunk.match(/si\s+.*?(hausse|casse|franchit|dépasse).*?(?=[.]|$)/i);
      const bearMatch = chunk.match(/(?:en revanche|sinon|si\s+.*?(baisse|cède|perd|recule)).*?(?=[.]|$)/i);
      const mainAsset = segmentAssets[0] ? findAsset(segmentAssets[0]) : undefined;
      return {
        trunk: mainAsset?.name ?? segmentAssets[0] ?? '',
        bull: bullMatch?.[0]?.trim() ?? '',
        bear: bearMatch?.[0]?.trim() ?? '',
      };
    }

    case 'headline': {
      const relevantNews = snapshot.news.find(n =>
        segmentAssets.some(s => n.title.toLowerCase().includes(s.toLowerCase()) || lower.includes(n.title.toLowerCase().slice(0, 30)))
      );
      return relevantNews
        ? { title: relevantNews.title, source: relevantNews.source }
        : {};
    }

    case 'heatmap': {
      const sectors = snapshot.stockScreen
        ?.reduce((acc, s) => {
          const idx = s.index || 'Other';
          if (!acc[idx]) acc[idx] = { sector: idx, avgChange: 0, count: 0 };
          acc[idx].avgChange += s.changePct;
          acc[idx].count++;
          return acc;
        }, {} as Record<string, { sector: string; avgChange: number; count: number }>);
      const sectorList = sectors ? Object.values(sectors).map(s => ({
        sector: s.sector, changePct: round(s.avgChange / s.count),
      })) : [];
      return { sectors: sectorList };
    }

    case 'gauge': {
      if (lower.includes('vix') && snapshot.assets.find(a => a.symbol === '^VIX')) {
        const vix = snapshot.assets.find(a => a.symbol === '^VIX')!;
        return { label: 'VIX', value: vix.price, min: 10, max: 80 };
      }
      if (snapshot.sentiment?.cryptoFearGreed) {
        return { label: 'Fear & Greed', value: snapshot.sentiment.cryptoFearGreed.value, min: 0, max: 100 };
      }
      return {};
    }

    default:
      return {};
  }
}

// ── Overlay delay (sync with narration) ─────────────────────

export function computeOverlayDelay(
  chunk: string,
  overlayType: OverlayType,
  beatDurationMs: number,
): { delayMs: number; triggerWord?: string } {
  const words = chunk.split(/\s+/);
  const totalWords = words.length;
  if (totalWords === 0) return { delayMs: 0 };

  let targetIndex = 0;
  let triggerWord: string | undefined;

  switch (overlayType) {
    case 'stat': {
      const idx = words.findIndex(w => /[\d]+[,.]?[\d]*[%$€]/.test(w) || w === 'moins' || w === 'plus');
      if (idx >= 0) { targetIndex = idx; triggerWord = words[idx]; }
      break;
    }
    case 'chart':
    case 'chart_zone': {
      targetIndex = 0;
      triggerWord = words[0];
      break;
    }
    case 'causal_chain': {
      const idx = words.findIndex(w => /parce|cause|entraîne|provoque|déclenche|mécaniquement/i.test(w));
      if (idx >= 0) { targetIndex = idx; triggerWord = words[idx]; }
      break;
    }
    case 'comparison': {
      targetIndex = Math.floor(totalWords * 0.3);
      triggerWord = words[targetIndex];
      break;
    }
    case 'scenario_fork': {
      const idx = words.findIndex(w => /^si$/i.test(w));
      if (idx >= 0) { targetIndex = idx; triggerWord = words[idx]; }
      break;
    }
    case 'headline':
    case 'text_card':
    case 'heatmap':
    case 'gauge':
    case 'ticker_strip':
      return { delayMs: 0, triggerWord: words[0] };
  }

  const ratio = totalWords > 1 ? targetIndex / totalWords : 0;
  return { delayMs: Math.round(ratio * beatDurationMs), triggerWord };
}

// ── Map P6 chartTimings to beats ────────────────────────────

export function mapChartTimingsToBeats(
  beats: RawBeat[],
  chartTimings: EpisodeDirection['chartTimings'],
): void {
  if (!chartTimings?.length) return;

  for (const ct of chartTimings) {
    const showSec = ct.showAtSec;
    const hideSec = ct.hideAtSec;

    for (const beat of beats) {
      const beatEnd = beat.startSec + beat.durationSec;
      if (beat.startSec <= showSec && showSec < beatEnd) {
        if (beat.overlayHint === 'none' || beat.overlayHint === 'stat') {
          beat.overlayHint = ct.chartInstruction.type.includes('zone') ? 'chart_zone' : 'chart';
          beat.overlayData = {
            symbol: ct.chartInstruction.asset,
            label: ct.chartInstruction.label,
            value: ct.chartInstruction.value,
          };
        }
      }
      if (beat.startSec > showSec && beat.startSec < hideSec) {
        if (beat.overlayHint === 'none') {
          beat.overlayHint = 'chart';
          beat.overlayData = { symbol: ct.chartInstruction.asset, continued: true };
        }
      }
    }
  }
}

// ── Main orchestrator ───────────────────────────────────────

export function generateBeats(
  script: EpisodeScript,
  snapshot: DailySnapshot,
): RawBeat[] {
  const assetNames = snapshot.assets.map(a => a.name);
  const beats: RawBeat[] = [];
  let cumSec = 0;
  let beatIndex = 0;

  for (const section of script.sections) {
    const chunks = chunkNarration(section.narration);
    if (chunks.length === 0 && section.durationSec > 0) {
      chunks.push({ text: '', wordCount: 0, durationSec: section.durationSec });
    }

    const segmentAssets = section.assets ?? [];
    const segmentDepth = (section.depth ?? 'focus') as 'flash' | 'focus' | 'deep';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const overlayHint = chunk.text ? classifyOverlay(chunk.text, assetNames) : 'none';

      const overlayData = overlayHint !== 'none'
        ? resolveOverlayData(chunk.text, overlayHint, snapshot.assets, segmentAssets, snapshot)
        : undefined;

      const id = `beat_${String(++beatIndex).padStart(3, '0')}`;

      beats.push({
        id,
        segmentId: section.id,
        startSec: round(cumSec),
        durationSec: chunk.durationSec,
        narrationChunk: chunk.text,
        overlayHint,
        overlayData,
        segmentDepth,
        segmentTopic: section.topic,
        assets: segmentAssets,
        isSegmentStart: i === 0,
        isSegmentEnd: i === chunks.length - 1,
      });

      cumSec += chunk.durationSec;
    }
  }

  if (script.direction?.chartTimings) {
    mapChartTimingsToBeats(beats, script.direction.chartTimings);
  }

  capOverlayRatio(beats, 0.40);

  return beats;
}

const OVERLAY_PRIORITY: Record<string, number> = {
  chart: 5, chart_zone: 5, scenario_fork: 4, causal_chain: 3,
  comparison: 3, stat: 2, gauge: 2, heatmap: 2, headline: 1, text_card: 1, ticker_strip: 1,
};

function capOverlayRatio(beats: RawBeat[], maxRatio: number): void {
  const overlayBeats = beats.filter(b => b.overlayHint !== 'none');
  const target = Math.floor(beats.length * maxRatio);
  if (overlayBeats.length <= target) return;

  const sorted = [...overlayBeats].sort((a, b) =>
    (OVERLAY_PRIORITY[a.overlayHint] ?? 0) - (OVERLAY_PRIORITY[b.overlayHint] ?? 0)
  );
  const toRemove = sorted.slice(0, overlayBeats.length - target);
  for (const beat of toRemove) {
    beat.overlayHint = 'none';
    beat.overlayData = undefined;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
