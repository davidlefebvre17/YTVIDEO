import type { EconomicEvent } from "@yt-maker/core";
import { fetchSupabaseCalendar } from "./supabase-calendar";
import { fetchEconomicCalendar as fetchFinnhubCalendar } from "./finnhub";

/**
 * Fetch economic calendar. Strategy:
 * 1. Finnhub (primary — complete coverage including CB speeches + upcoming week + actuals)
 * 2. Supabase fallback (if Finnhub unavailable/empty)
 * 3. Empty array (graceful degradation)
 *
 * Returns events bucketed into yesterday / today / upcoming (J+1 to J+7).
 */
export async function fetchEconomicCalendar(date?: string): Promise<{
  today: EconomicEvent[];
  yesterday: EconomicEvent[];
  upcoming: EconomicEvent[];
}> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  console.log(`Fetching economic calendar for ${targetDate}...`);

  // Compute date range: yesterday to today+7
  const d = new Date(targetDate + "T12:00:00Z");
  const yday = new Date(d); yday.setUTCDate(d.getUTCDate() - 1);
  const nextWeek = new Date(d); nextWeek.setUTCDate(d.getUTCDate() + 7);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const yesterdayIso = iso(yday);
  const nextWeekIso = iso(nextWeek);

  // Try Finnhub first (primary)
  try {
    const finnhub = await fetchFinnhubCalendar(yesterdayIso, nextWeekIso);
    if (finnhub.length > 0) {
      // Bucket by date vs targetDate. Keep only high+medium for upcoming to limit noise.
      const buckets = bucketEvents(finnhub, targetDate, yesterdayIso);
      console.log(
        `  Finnhub bucketed: ${buckets.yesterday.length} yesterday, ${buckets.today.length} today, ${buckets.upcoming.length} upcoming (7d)`,
      );
      return buckets;
    }
  } catch (err) {
    console.warn(`  Finnhub calendar error, falling back to Supabase: ${(err as Error).message}`);
  }

  // Fallback: Supabase (last-resort if Finnhub missing/down)
  const supabase = await fetchSupabaseCalendar(targetDate);
  if (supabase.today.length > 0 || supabase.upcoming.length > 0 || supabase.yesterday.length > 0) {
    return supabase;
  }

  return { today: [], yesterday: [], upcoming: [] };
}

/**
 * Bucket flat event list into yesterday / today / upcoming by `event.date`.
 * Upcoming keeps only high+medium impact (filter low-impact noise, same behavior as before).
 */
function bucketEvents(
  events: EconomicEvent[],
  todayIso: string,
  yesterdayIso: string,
): { today: EconomicEvent[]; yesterday: EconomicEvent[]; upcoming: EconomicEvent[] } {
  const today: EconomicEvent[] = [];
  const yesterday: EconomicEvent[] = [];
  const upcoming: EconomicEvent[] = [];
  for (const e of events) {
    if (e.date === todayIso) today.push(e);
    else if (e.date === yesterdayIso) yesterday.push(e);
    else if (e.date > todayIso) {
      if (e.impact === "high" || e.impact === "medium") upcoming.push(e);
    }
    // events before yesterday: ignored
  }
  // Keep them sorted by time for readable output
  const byTime = (a: EconomicEvent, b: EconomicEvent) => (a.date + a.time).localeCompare(b.date + b.time);
  today.sort(byTime);
  yesterday.sort(byTime);
  upcoming.sort(byTime);
  return { today, yesterday, upcoming };
}
