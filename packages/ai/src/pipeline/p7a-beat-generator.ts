import type {
  EpisodeScript, ScriptSection, DailySnapshot, AssetSnapshot, OverlayType, EpisodeDirection,
} from "@yt-maker/core";
import type { RawBeat, AnalysisBundle, SegmentAnalysis } from "./types";

const WORDS_PER_SEC = 2.5;
const MIN_BEAT_SEC = 6;
const MAX_BEAT_SEC = 12;
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

// Match asset mentioned in narration chunk — uses DIRECT_MATCH_RULES from tagging-rules (700+ patterns)
import { DIRECT_MATCH_RULES, STOCK_ALIAS_RULES } from "../memory/tagging-rules";

// Build a flat lookup: pattern → symbol (built once, reused)
let _patternCache: Array<{ pattern: string; symbol: string; wordBoundary: boolean }> | null = null;

function getPatternCache() {
  if (_patternCache) return _patternCache;
  _patternCache = [];
  for (const rule of [...DIRECT_MATCH_RULES, ...STOCK_ALIAS_RULES]) {
    for (const p of rule.patterns) {
      _patternCache.push({ pattern: p.toLowerCase(), symbol: rule.asset, wordBoundary: rule.word_boundary ?? false });
    }
  }
  // Sort longer patterns first (avoid "or" matching before "l'or s'effondre")
  _patternCache.sort((a, b) => b.pattern.length - a.pattern.length);
  return _patternCache;
}

function findMentionedAsset(
  chunk: string,
  segmentAssets: string[],
  allAssets: AssetSnapshot[],
  lastMentioned?: string,
): AssetSnapshot | undefined {
  const lower = chunk.toLowerCase();
  const findAsset = (sym: string) => allAssets.find(a => a.symbol === sym);
  const patterns = getPatternCache();

  // 1. Try pattern match on SEGMENT assets first (highest priority)
  const segSet = new Set(segmentAssets);
  for (const entry of patterns) {
    if (!segSet.has(entry.symbol)) continue;
    if (entry.wordBoundary) {
      const re = new RegExp(`\\b${entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    } else {
      if (lower.includes(entry.pattern)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    }
  }

  // 2. Try pattern match on ALL assets (broader search)
  for (const entry of patterns) {
    if (entry.wordBoundary) {
      const re = new RegExp(`\\b${entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    } else {
      if (lower.includes(entry.pattern)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    }
  }

  // 3. Try asset name match (for assets not in tagging rules)
  for (const sym of segmentAssets) {
    const asset = findAsset(sym);
    if (asset && lower.includes(asset.name.toLowerCase())) return asset;
  }

  // 4. Fallback to last mentioned asset in this segment (pronoun resolution: "le prix", "il")
  if (lastMentioned) {
    const asset = findAsset(lastMentioned);
    if (asset) return asset;
  }

  // 5. Fallback to first segment asset
  return segmentAssets[0] ? findAsset(segmentAssets[0]) : undefined;
}

/**
 * Like findMentionedAsset but returns undefined if no EXPLICIT mention found.
 * Used for context tracking — we don't want fallbacks to overwrite the last known asset.
 */
function findExplicitAsset(
  chunk: string,
  segmentAssets: string[],
  allAssets: AssetSnapshot[],
): AssetSnapshot | undefined {
  const lower = chunk.toLowerCase();
  const findAsset = (sym: string) => allAssets.find(a => a.symbol === sym);
  const patterns = getPatternCache();

  // Only pattern match — no fallback
  for (const entry of patterns) {
    if (entry.wordBoundary) {
      const re = new RegExp(`\\b${entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    } else {
      if (lower.includes(entry.pattern)) {
        const asset = findAsset(entry.symbol);
        if (asset) return asset;
      }
    }
  }

  // Also try asset name match
  for (const a of allAssets) {
    if (lower.includes(a.name.toLowerCase())) return a;
  }

  return undefined; // Nothing explicitly mentioned
}


export function resolveOverlayData(
  chunk: string,
  overlayType: OverlayType,
  assets: AssetSnapshot[],
  segmentAssets: string[],
  snapshot: DailySnapshot,
  lastMentioned?: string,
): Record<string, unknown> {
  const findAsset = (sym: string) => assets.find(a => a.symbol === sym);
  const lower = chunk.toLowerCase();

  switch (overlayType) {
    case 'stat': {
      // Try to extract number from chunk (digit format: "6506", "98,23", "2.17%")
      const numMatch = chunk.match(/([\d]+[,.]?[\d]*)\s*([%$€])/);
      // French spoken format: "un virgule cinquante et un pour cent"
      const frenchPctMatch = chunk.match(/(moins|plus)\s+([\w\s]+?)pour\s+cent/i);
      let value = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;
      let suffix = numMatch ? numMatch[2] : '%';

      // Try to extract price (e.g., "à 6506", "à 98 dollars 23")
      // Price is NEVER negated — it's an absolute level
      let isPrice = false;
      if (value === undefined) {
        const priceMatch = chunk.match(/à\s+([\d\s]+(?:dollars?\s*\d*)?)/i);
        if (priceMatch) {
          const raw = priceMatch[1].replace(/dollars?\s*/i, '.').replace(/\s/g, '');
          const parsed = parseFloat(raw);
          if (!isNaN(parsed) && parsed > 1) { value = parsed; suffix = ''; isPrice = true; }
        }
      }

      if (frenchPctMatch && value === undefined) {
        // Can't parse French words to numbers easily, use asset changePct
        value = undefined; // Will fallback to asset data below
      }

      // Only negate percentages, never prices
      if (!isPrice) {
        const negative = lower.includes('moins') || lower.includes('perd') || lower.includes('recule') || lower.includes('lâche') || lower.includes('baisse') || lower.includes('cède');
        if (value !== undefined && negative && value > 0) value = -value;
      }

      const asset = findMentionedAsset(chunk, segmentAssets, assets, lastMentioned);

      // If no number extracted, use asset's changePct
      if (value === undefined && asset) {
        value = asset.changePct;
        suffix = '%';
      }

      return {
        value: value ?? 0,
        label: asset?.name ?? '',
        suffix,
        prefix: '',
      };
    }

    case 'chart':
    case 'chart_zone': {
      const asset = findMentionedAsset(chunk, segmentAssets, assets, lastMentioned);
      if (!asset) {
        // Fallback: use last mentioned or first segment asset as stat instead
        const fb = lastMentioned ? findAsset(lastMentioned) : (segmentAssets[0] ? findAsset(segmentAssets[0]) : undefined);
        return fb ? { symbol: fb.symbol, name: fb.name, price: fb.price, changePct: fb.changePct, candleCount: 0, levels: [] } : {};
      }

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
      const sentences = chunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
      if (sentences.length >= 3) {
        return { steps: sentences.slice(0, 5).map(s => s.length > 50 ? s.slice(0, 47) + '...' : s) };
      }
      const segAssets = segmentAssets.slice(0, 3).map(s => findAsset(s)?.name ?? s);
      if (segAssets.length >= 2) {
        return { steps: segAssets.map((name, i) => i === 0 ? `${name} ↓` : `→ ${name}`) };
      }
      return { steps: [chunk.slice(0, 50)] };
    }

    case 'comparison': {
      const all = segmentAssets.slice(0, 4).map(s => {
        const a = findAsset(s);
        return a ? { symbol: a.symbol, label: a.name, value: a.price, changePct: a.changePct } : null;
      }).filter(Boolean);
      return { assets: all.length >= 2 ? all : [] };
    }

    case 'scenario_fork': {
      const mainAsset = findMentionedAsset(chunk, segmentAssets, assets);
      const sentences = chunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
      const bullSentence = sentences.find(s => /hausse|casse|franchit|dépasse|haussier|monte|rebond/i.test(s));
      const bearSentence = sentences.find(s => /baisse|cède|perd|recule|baissier|descend|chute/i.test(s));
      return {
        trunk: mainAsset?.name ?? segmentAssets[0] ?? '',
        bull: bullSentence?.slice(0, 80) ?? `Scénario haussier ${mainAsset?.name ?? ''}`,
        bear: bearSentence?.slice(0, 80) ?? `Scénario baissier ${mainAsset?.name ?? ''}`,
      };
    }

    case 'headline': {
      // Search by asset name (not symbol) and by narration keywords
      const assetNames = segmentAssets.map(s => findAsset(s)?.name?.toLowerCase()).filter(Boolean) as string[];
      const chunkWords = lower.split(/\s+/).filter(w => w.length > 4).slice(0, 5);

      const relevantNews = snapshot.news.find(n => {
        const titleLower = n.title.toLowerCase();
        // Match by asset name in title
        if (assetNames.some(name => titleLower.includes(name.split(' ')[0].toLowerCase()))) return true;
        // Match by narration keyword overlap (at least 2 words in common)
        const matches = chunkWords.filter(w => titleLower.includes(w));
        return matches.length >= 2;
      });
      if (relevantNews) {
        return { title: relevantNews.title, source: relevantNews.source };
      }
      // Fallback: use first high-relevance news of the day
      const fallbackNews = snapshot.news.find(n => n.lang === 'fr') ?? snapshot.news[0];
      return fallbackNews
        ? { title: fallbackNews.title, source: fallbackNews.source }
        : { title: 'Actualité du jour', source: '' };
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
  analysis?: AnalysisBundle,
): RawBeat[] {
  // Build segment → analysis lookup
  const segAnalysis = new Map<string, SegmentAnalysis>();
  if (analysis?.segments) {
    for (const seg of analysis.segments) segAnalysis.set(seg.segmentId, seg);
  }
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
    let lastMentioned: string | undefined; // track last resolved asset per segment

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const overlayHint = chunk.text ? classifyOverlay(chunk.text, assetNames) : 'none';

      const overlayData = overlayHint !== 'none'
        ? resolveOverlayData(chunk.text, overlayHint, snapshot.assets, segmentAssets, snapshot, lastMentioned)
        : undefined;

      // Track which asset was EXPLICITLY mentioned for pronoun resolution in next beats
      // Only update context if we found a real match (not a fallback to first segment asset)
      const explicitMatch = chunk.text ? findExplicitAsset(chunk.text, segmentAssets, snapshot.assets) : undefined;
      if (explicitMatch) {
        lastMentioned = explicitMatch.symbol;
      } else if (overlayData) {
        // If overlay resolved an asset and it's not the segment default, track it
        const resolved = (overlayData as any).symbol ?? (overlayData as any).label;
        if (resolved) {
          const match = snapshot.assets.find(a => a.symbol === resolved || a.name === resolved);
          if (match && match.symbol !== segmentAssets[0]) lastMentioned = match.symbol;
        }
      }

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

  // ── Enrich overlays with C2 analysis data ──
  if (analysis) {
    enrichOverlaysFromAnalysis(beats, segAnalysis, snapshot.assets);
  }

  // ── Deduplicate consecutive charts on same asset ──
  dedupeConsecutiveCharts(beats);

  capOverlayRatio(beats, 0.50); // raised from 0.40 — more overlays when C2 data available

  return beats;
}

// ── Enrich overlays from C2 AnalysisBundle ──────────────────

function enrichOverlaysFromAnalysis(
  beats: RawBeat[],
  segAnalysis: Map<string, SegmentAnalysis>,
  allAssets: AssetSnapshot[],
): void {
  // Track which C2 data has been used per segment to avoid duplicates
  const usedCausalChain = new Set<string>();
  const usedScenario = new Set<string>();

  for (const beat of beats) {
    const seg = segAnalysis.get(beat.segmentId);
    if (!seg) continue;
    const lower = beat.narrationChunk.toLowerCase();

    // 1. CAUSAL CHAIN: Replace regex-based chains with C2's structured chain
    if (seg.causalChain && !usedCausalChain.has(beat.segmentId)) {
      const hasCausalKeyword = /parce que|à cause|entraîne|provoque|déclenche|car |donc |résultat|conséquence|mécanisme|pourquoi|signal|impact|pression|logique|chaîne/i.test(lower);
      // Also trigger on 3rd beat of segment (if no keyword matched earlier, force it)
      const beatIndexInSeg = beats.filter(b => b.segmentId === beat.segmentId).indexOf(beat);
      const forceOnThirdBeat = beatIndexInSeg === 2 && !hasCausalKeyword;

      if (hasCausalKeyword || beat.overlayHint === 'causal_chain' || forceOnThirdBeat) {
        beat.overlayHint = 'causal_chain';
        const steps = seg.causalChain.split(/→|➜|⟶/).map(s => s.trim()).filter(s => s.length > 0);
        beat.overlayData = { steps: steps.slice(0, 5) };
        usedCausalChain.add(beat.segmentId);
        continue;
      }
    }

    // 2. SCENARIO FORK: Use C2's structured scenarios instead of regex
    if (seg.scenarios && !usedScenario.has(beat.segmentId)) {
      const hasScenarioKeyword = /si |scénario|haussier|baissier|pourrait|revisiter|cible|objectif/i.test(lower);
      if (hasScenarioKeyword || beat.overlayHint === 'scenario_fork') {
        beat.overlayHint = 'scenario_fork';
        beat.overlayData = {
          trunk: seg.segmentId,
          bull: `${seg.scenarios.bullish.target} — ${seg.scenarios.bullish.condition}`.slice(0, 100),
          bear: `${seg.scenarios.bearish.target} — ${seg.scenarios.bearish.condition}`.slice(0, 100),
          probBull: (seg.scenarios.bullish as any).probability,
          probBear: (seg.scenarios.bearish as any).probability,
        };
        usedScenario.add(beat.segmentId);
        continue;
      }
    }

    // 3. CHART ENRICHMENT: Add S/R levels, RSI, and price from C2 chartInstructions
    if (beat.overlayHint === 'chart' || beat.overlayHint === 'chart_zone') {
      const data = beat.overlayData as Record<string, unknown> | undefined;
      if (!data) continue;

      const symbol = data.symbol as string;
      if (!symbol) continue;

      // Find relevant chartInstructions from C2 for this asset
      const instructions = seg.chartInstructions?.filter(ci => ci.asset === symbol) ?? [];

      // Enrich with levels from chartInstructions
      const levels: Array<{ value: number; label: string; type: string }> = [];
      let rsiValue: number | undefined;

      for (const ci of instructions) {
        if (ci.type === 'support_line' && ci.value) {
          levels.push({ value: ci.value, label: ci.label ?? `Support ${ci.value}`, type: 'support' });
        }
        if (ci.type === 'resistance_line' && ci.value) {
          levels.push({ value: ci.value, label: ci.label ?? `Résistance ${ci.value}`, type: 'resistance' });
        }
        if (ci.type === 'gauge_rsi' && ci.value) {
          rsiValue = ci.value;
        }
      }

      // Also extract SMA200 from technicalReading if mentioned in narration
      if (seg.technicalReading && /sma.?200|moyenne.?200/i.test(lower)) {
        const sma200Match = seg.technicalReading.match(/SMA200[:\s=]*(\d[\d.,]*)/i);
        if (sma200Match) {
          const val = parseFloat(sma200Match[1].replace(',', '.'));
          if (!isNaN(val) && !levels.some(l => Math.abs(l.value - val) < 1)) {
            levels.push({ value: val, label: 'SMA 200', type: 'sma' });
          }
        }
      }

      // Get asset price for display
      const asset = allAssets.find(a => a.symbol === symbol);

      // Merge enriched data
      beat.overlayData = {
        ...data,
        price: asset?.price,
        changePct: asset?.changePct,
        levels: levels.length > 0 ? levels : (data.levels ?? []),
        rsi: rsiValue,
        candleCount: asset?.candles?.length ?? (data as any).candleCount ?? 0,
      };
    }

    // 4. UPGRADE stat to chart: if narration discusses a price level and C2 has chart data
    if (beat.overlayHint === 'stat' && seg.chartInstructions?.length) {
      const hasPriceLevel = /à\s+\d|niveau|résistance|support|sma|moyenne mobile/i.test(lower);
      if (hasPriceLevel) {
        const data = beat.overlayData as Record<string, unknown> | undefined;
        const symbol = findMentionedAsset(beat.narrationChunk, beat.assets ?? [], allAssets, undefined)?.symbol;
        if (symbol) {
          const instructions = seg.chartInstructions.filter(ci => ci.asset === symbol);
          if (instructions.length > 0) {
            const asset = allAssets.find(a => a.symbol === symbol);
            const levels = instructions
              .filter(ci => ci.type.includes('line') && ci.value)
              .map(ci => ({ value: ci.value!, label: ci.label ?? '', type: ci.type.replace('_line', '') }));

            const rsiInstr = instructions.find(ci => ci.type === 'gauge_rsi');

            beat.overlayHint = 'chart';
            beat.overlayData = {
              symbol,
              name: asset?.name,
              price: asset?.price,
              changePct: asset?.changePct,
              levels,
              rsi: rsiInstr?.value,
              candleCount: asset?.candles?.length ?? 0,
            };
          }
        }
      }
    }

    // 5. STAT ENRICHMENT: add coreMechanism as context when available
    if (beat.overlayHint === 'stat' && seg.coreMechanism) {
      const data = beat.overlayData as Record<string, unknown> | undefined;
      if (data && !data.context) {
        (data as any).context = seg.coreMechanism;
      }
    }
  }
}

// ── Deduplicate consecutive charts on same asset ─────────────
// Max 2 consecutive chart overlays on the same asset — remove extras
function dedupeConsecutiveCharts(beats: RawBeat[]): void {
  let consecutiveCount = 0;
  let lastChartSymbol: string | null = null;

  for (const beat of beats) {
    const isChart = beat.overlayHint === 'chart' || beat.overlayHint === 'chart_zone';
    const symbol = isChart ? (beat.overlayData as any)?.symbol : null;

    if (isChart && symbol === lastChartSymbol) {
      consecutiveCount++;
      if (consecutiveCount > 2) {
        // Convert excess chart to stat (show just the number, not full chart)
        beat.overlayHint = 'none';
        beat.overlayData = undefined;
      }
    } else if (isChart) {
      consecutiveCount = 1;
      lastChartSymbol = symbol;
    } else {
      consecutiveCount = 0;
      lastChartSymbol = null;
    }
  }
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
