import type { EpisodeSummary, PrevContext } from "../types";
import type { DailySnapshot } from "@yt-maker/core";
import { labelEventDate } from "./temporal-anchors";

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
      dominantTheme: script?.threadSummary ?? '',
      moodMarche: ((script as unknown as Record<string, unknown>)?.moodMarche as string) ?? '',
    };
  });
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
