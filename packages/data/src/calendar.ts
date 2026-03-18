import type { EconomicEvent } from "@yt-maker/core";
import { fetchSupabaseCalendar } from "./supabase-calendar";
import { fetchEconomicCalendar as fetchFinnhubCalendar } from "./finnhub";

/**
 * Fetch economic calendar. Strategy:
 * 1. Supabase (primary — 19K+ events from ForexFactory)
 * 2. Finnhub (fallback — if Supabase unavailable)
 * 3. Empty array (graceful degradation)
 */
export async function fetchEconomicCalendar(date?: string): Promise<{
  today: EconomicEvent[];
  yesterday: EconomicEvent[];
  upcoming: EconomicEvent[];
}> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  console.log(`Fetching economic calendar for ${targetDate}...`);

  // Try Supabase first (primary source)
  const supabase = await fetchSupabaseCalendar(targetDate);
  if (supabase.today.length > 0 || supabase.upcoming.length > 0) {
    return supabase;
  }

  // Fallback to Finnhub
  try {
    const finnhubEvents = await fetchFinnhubCalendar(targetDate);
    return { today: finnhubEvents, yesterday: [], upcoming: [] };
  } catch {
    return { today: [], yesterday: [], upcoming: [] };
  }
}
