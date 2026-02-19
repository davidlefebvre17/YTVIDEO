import type { EconomicEvent } from "@yt-maker/core";

const SUPABASE_TABLE = ".new_economic_calendar";

function getConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

interface SupabaseEcoEvent {
  name: string;
  currency: string;
  event_date: string;
  actual: number;
  forecast: number;
  previous: number;
  outcome: string;
  strength: string;
}

function mapStrength(strength: string): "high" | "medium" | "low" {
  if (strength === "Strong Data") return "high";
  if (strength === "Moderate Data") return "medium";
  return "low";
}

function mapEvent(e: SupabaseEcoEvent): EconomicEvent {
  const dt = new Date(e.event_date);
  return {
    name: e.name,
    date: dt.toISOString().split("T")[0],
    time: dt.toISOString().slice(11, 16),
    currency: e.currency,
    impact: mapStrength(e.strength),
    forecast: e.forecast ? String(e.forecast) : undefined,
    previous: e.previous ? String(e.previous) : undefined,
    actual: e.actual ? String(e.actual) : undefined,
  };
}

async function querySupabase(
  config: { url: string; key: string },
  dateFrom: string,
  dateTo: string,
): Promise<EconomicEvent[]> {
  const params = new URLSearchParams({
    select: "*",
    event_date: `gte.${dateFrom}T00:00:00`,
    order: "event_date.asc",
  });
  // Supabase REST API doesn't support two params with the same key in URLSearchParams,
  // so we append the second filter manually
  const url = `${config.url}/rest/v1/${SUPABASE_TABLE}?${params}&event_date=lt.${dateTo}T00:00:00`;

  const res = await fetch(url, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase calendar: ${res.status} ${res.statusText}`);
  }

  const data: SupabaseEcoEvent[] = await res.json();
  return data.map(mapEvent);
}

/**
 * Fetch economic calendar from Supabase:
 * - yesterday's events (with actuals)
 * - today's events
 * - upcoming events (J+1 to J+7)
 */
export async function fetchSupabaseCalendar(date: string): Promise<{
  yesterday: EconomicEvent[];
  today: EconomicEvent[];
  upcoming: EconomicEvent[];
}> {
  const config = getConfig();
  if (!config) {
    console.log("  Supabase calendar: skipped (no SUPABASE_URL/SUPABASE_ANON_KEY)");
    return { yesterday: [], today: [], upcoming: [] };
  }

  console.log("  Fetching economic calendar from Supabase...");

  try {
    const d = new Date(date);
    const yesterday = new Date(d);
    yesterday.setDate(d.getDate() - 1);
    const tomorrow = new Date(d);
    tomorrow.setDate(d.getDate() + 1);
    const nextWeek = new Date(d);
    nextWeek.setDate(d.getDate() + 8);

    const fmt = (dt: Date) => dt.toISOString().split("T")[0];

    const [yesterdayEvents, todayEvents, upcomingEvents] = await Promise.all([
      querySupabase(config, fmt(yesterday), date),
      querySupabase(config, date, fmt(tomorrow)),
      querySupabase(config, fmt(tomorrow), fmt(nextWeek)),
    ]);

    console.log(
      `  Supabase: ${yesterdayEvents.length} yesterday, ${todayEvents.length} today, ${upcomingEvents.length} upcoming (7d)`,
    );

    return {
      yesterday: yesterdayEvents,
      today: todayEvents,
      upcoming: upcomingEvents,
    };
  } catch (err) {
    console.warn(`  Supabase calendar error: ${err}`);
    return { yesterday: [], today: [], upcoming: [] };
  }
}
