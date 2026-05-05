import type { EpisodeSummary, PrevContext } from "../types";
import type { DailySnapshot } from "@yt-maker/core";
import { labelEventDate } from "./temporal-anchors";

/**
 * Locate an asset by symbol across both the curated watchlist (`snapshot.assets`)
 * and the broad stock screen (`snapshot.stockScreen`). The screen is stored as
 * a numeric-keyed dict-array of ~200 movers ; iterating values yields the same
 * shape (symbol/changePct/price/name) as watchlist assets.
 *
 * Without this fallback, only the 38 watchlist symbols benefit from multi-day
 * trajectory context — single-name screen movers like DHL.DE / UPS / FDX are
 * invisible to the trend logic even when narratively covered the day before.
 */
function findAssetInSnapshot(
  snapshot: DailySnapshot | undefined,
  symbol: string,
): { symbol: string; price?: number; changePct?: number; name?: string } | undefined {
  if (!snapshot) return undefined;
  const fromAssets = snapshot.assets?.find((x) => x.symbol === symbol);
  if (fromAssets) return fromAssets;
  const screen = (snapshot as unknown as { stockScreen?: Record<string, unknown> }).stockScreen;
  if (!screen) return undefined;
  for (const v of Object.values(screen)) {
    const item = v as { symbol?: string; price?: number; changePct?: number; name?: string };
    if (item?.symbol === symbol) return { symbol, price: item.price, changePct: item.changePct, name: item.name };
  }
  return undefined;
}

/**
 * Extract forward-looking items from a snapshot:
 * upcoming earnings (next 21 days) + upcoming high-impact economic events.
 */
function buildForwardLooking(snapshot: DailySnapshot | undefined): string[] {
  if (!snapshot) return [];
  const items: string[] = [];
  const snapDate = snapshot.date;

  for (const e of snapshot.earningsUpcoming ?? []) {
    const label = e.name ? `${e.name} (${e.symbol})` : e.symbol;
    const dateLabel = labelEventDate(e.date, snapDate);
    items.push(`Résultats ${label} attendus ${dateLabel}`);
  }

  for (const ev of snapshot.upcomingEvents ?? []) {
    if (ev.impact === 'high') {
      const dateLabel = labelEventDate(ev.date, snapDate);
      items.push(`${ev.name} (${ev.currency}) prévu ${dateLabel}`);
    }
  }

  return items;
}

/**
 * Build compact episode summaries for C1 (editorial selection).
 * Returns max `count` summaries, most recent last.
 */
export function buildEpisodeSummaries(
  prevContext: PrevContext | undefined,
  count: number,
  currentDate?: string,
): EpisodeSummary[] {
  if (!prevContext?.entries?.length) return [];

  const entries = prevContext.entries.slice(-count);

  // Use currentDate if provided, otherwise infer from latest entry + 1 day
  const refDate = currentDate
    ? new Date(currentDate + "T12:00:00Z")
    : (() => {
        const last = entries[entries.length - 1]?.snapshot?.date;
        if (!last) return new Date();
        const d = new Date(last + "T12:00:00Z");
        d.setDate(d.getDate() + 1);
        return d;
      })();

  return entries.map((entry) => {
    const script = entry.script;
    const entryDate = entry.snapshot?.date;
    // Compute real calendar day difference
    const daysAgo = entryDate
      ? Math.round((refDate.getTime() - new Date(entryDate + "T12:00:00Z").getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    // Extract covered asset symbols from script segments
    const coveredSymbols = new Set(
      script?.sections
        ?.filter(s => s.type === 'segment')
        .flatMap(s => s.assets ?? []) ?? []
    );

    // Build assetMoves from snapshot — top movers + covered assets.
    // Includes both curated watchlist (snapshot.assets) AND covered screen
    // movers (snapshot.stockScreen) so single-name stocks featured in a
    // segment carry their trajectory forward into next-day context.
    const snapshot = entry.snapshot;
    const movesByKey = new Map<string, { symbol: string; name: string; price: number; changePct: number; covered: boolean }>();
    for (const a of snapshot?.assets ?? []) {
      if (!a.symbol) continue;
      if (Math.abs(a.changePct ?? 0) > 1.5 || coveredSymbols.has(a.symbol)) {
        movesByKey.set(a.symbol, {
          symbol: a.symbol,
          name: a.name ?? a.symbol,
          price: a.price ?? 0,
          changePct: a.changePct ?? 0,
          covered: coveredSymbols.has(a.symbol),
        });
      }
    }
    // Add covered screen movers that aren't already in watchlist.
    for (const sym of coveredSymbols) {
      if (movesByKey.has(sym)) continue;
      const screen = (snapshot as unknown as { stockScreen?: Record<string, unknown> } | undefined)?.stockScreen;
      if (!screen) continue;
      for (const v of Object.values(screen)) {
        const item = v as { symbol?: string; name?: string; price?: number; changePct?: number };
        if (item?.symbol === sym) {
          movesByKey.set(sym, {
            symbol: sym,
            name: item.name ?? sym,
            price: item.price ?? 0,
            changePct: item.changePct ?? 0,
            covered: true,
          });
          break;
        }
      }
    }
    const assetMoves = Array.from(movesByKey.values()).slice(0, 30);

    return {
      date: entryDate ?? `?`,
      label: `J-${daysAgo}`,
      segmentTopics: script?.sections
        ?.filter(s => s.type === 'segment')
        .map(s => {
          const assetsStr = s.assets?.join('/') ?? '?';
          return `${assetsStr}: ${s.title}`;
        }) ?? [],
      predictions: script?.sections
        ?.flatMap(s => {
          const preds = s.data?.predictions as Array<{
            asset: string; direction: string; targetLevel?: number; reasoning?: string
          }> | undefined;
          return preds ?? [];
        })
        .map(p => ({
          asset: p.asset,
          claim: `${p.direction}${p.targetLevel ? ` → ${p.targetLevel}` : ''}`,
          resolved: false,
          outcome: undefined as 'correct' | 'incorrect' | 'pending' | undefined,
        })) ?? [],
      forwardLooking: buildForwardLooking(entry.snapshot),
      angles: script?.sections
        ?.filter(s => s.type === 'segment')
        .map(s => (s.data?.topic as string) ?? s.topic ?? '') ?? [],
      mechanismsExplained: script?.mechanismsExplained ?? [],
      dominantTheme: script?.threadSummary ?? '',
      moodMarche: ((script as unknown as Record<string, unknown>)?.moodMarche as string) ?? '',
      assetMoves,
    };
  });
}

/**
 * Build a single inline trajectory line for one asset across recent sessions.
 * Returns "" if no usable history (the caller can append unconditionally).
 *
 * Format: "5j: J-5 +1,2% → J-4 +2,1% → J-3 +5,2% → J-2 +3,1% → J-1 +10,2%
 *          [↑ 4 hausses sur 5, cumul +21,8% — couvert J-1]"
 *
 * The pattern label (↑ hausse continue / ↓ baisse continue / ↕ retournement /
 * ~ volatile) is computed deterministically so C2/C3 can lean on it without
 * re-deriving the trend.
 */
export function buildAssetTrajectoryLine(
  symbol: string,
  prevContext: PrevContext | undefined,
  windowDays = 5,
): string {
  if (!prevContext?.entries?.length) return "";

  const entries = prevContext.entries.slice(-windowDays);
  const points: Array<{ label: string; pct: number; covered: boolean }> = [];
  const total = entries.length;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const a = findAssetInSnapshot(entry.snapshot, symbol);
    if (!a) continue;
    const coveredSymbols = new Set(
      entry.script?.sections
        ?.filter((s) => s.type === "segment")
        .flatMap((s) => s.assets ?? []) ?? [],
    );
    points.push({
      label: `J-${total - i}`,
      pct: a.changePct ?? 0,
      covered: coveredSymbols.has(symbol),
    });
  }

  if (points.length < 2) return "";

  const cumul = points.reduce((s, p) => s + p.pct, 0);
  const allUp = points.every((p) => p.pct > 0);
  const allDown = points.every((p) => p.pct < 0);
  const lastTwoFlip =
    points.length >= 2 &&
    Math.sign(points[points.length - 1].pct) !==
      Math.sign(points[points.length - 2].pct);

  const upCount = points.filter((p) => p.pct > 0).length;
  const downCount = points.filter((p) => p.pct < 0).length;

  const pattern = allUp
    ? `↑ ${points.length} hausses consécutives`
    : allDown
      ? `↓ ${points.length} baisses consécutives`
      : lastTwoFlip
        ? `↕ retournement vs J-2`
        : upCount > downCount
          ? `↑ majoritairement haussier (${upCount}/${points.length})`
          : downCount > upCount
            ? `↓ majoritairement baissier (${downCount}/${points.length})`
            : `~ volatile, alternance`;

  const fmtPct = (p: number) => `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
  const trail = points
    .map((p) => `${p.label} ${fmtPct(p.pct)}${p.covered ? "★" : ""}`)
    .join(" → ");

  return `${windowDays}j: ${trail} [${pattern}, cumul ${fmtPct(cumul)}]`;
}

/**
 * Format recent scripts for C3 (writing style reference).
 * Returns full narration of last `count` episodes.
 */
export function formatRecentScriptsForC3(
  prevContext: PrevContext | undefined,
  count: number,
): string {
  if (!prevContext?.entries?.length) return '';

  const recent = prevContext.entries.slice(-count);
  const total = recent.length;

  return recent
    .map((entry, i) => {
      const script = entry.script;
      if (!script) return '';
      const label = `J-${total - i}`;
      const segments = script.sections
        ?.filter(s => s.type === 'segment')
        .map(s => {
          const depth = (s.depth ?? s.data?.depth ?? '?') as string;
          return `[${depth.toUpperCase()}] ${s.title}\n${s.narration}`;
        })
        .join('\n\n');
      return `=== ${label} (${entry.snapshot?.date ?? ''}) ===\n${segments}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}
