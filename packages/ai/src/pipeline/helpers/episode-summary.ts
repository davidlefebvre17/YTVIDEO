import type { EpisodeSummary, PrevContext } from "../types";

/**
 * Build compact episode summaries for C1 (editorial selection).
 * Returns max `count` summaries, most recent last.
 */
export function buildEpisodeSummaries(
  prevContext: PrevContext | undefined,
  count: number,
): EpisodeSummary[] {
  if (!prevContext?.entries?.length) return [];

  const entries = prevContext.entries.slice(-count);
  const total = entries.length;

  return entries.map((entry, i) => {
    const script = entry.script;
    const daysAgo = total - i;

    return {
      date: entry.snapshot?.date ?? `?`,
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
