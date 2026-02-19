import type { EconomicEvent, EarningsEvent } from "@yt-maker/core";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string | undefined {
  return process.env.FINNHUB_API_KEY;
}

export async function fetchEconomicCalendar(
  from: string,
  to?: string,
): Promise<EconomicEvent[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Finnhub calendar: skipped (no FINNHUB_API_KEY)");
    return [];
  }

  const toDate = to || from;
  const url = `${FINNHUB_BASE}/calendar/economic?from=${from}&to=${toDate}&token=${apiKey}`;
  console.log("  Fetching economic calendar from Finnhub...");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub economic: ${res.status}`);
    const data = await res.json();

    const events: EconomicEvent[] = (data.economicCalendar || []).map(
      (e: {
        event: string;
        time: string;
        country: string;
        impact: string;
        estimate: string;
        prev: string;
        actual: string;
      }) => ({
        name: e.event,
        date: from,
        time: e.time || "00:00",
        currency: e.country || "USD",
        impact: mapImpact(e.impact),
        forecast: e.estimate ?? undefined,
        previous: e.prev ?? undefined,
        actual: e.actual ?? undefined,
      }),
    );

    console.log(`  Finnhub: ${events.length} economic events`);
    return events;
  } catch (err) {
    console.warn(`  Finnhub economic calendar error: ${err}`);
    return [];
  }
}

export async function fetchEarningsCalendar(
  from: string,
  to?: string,
): Promise<EarningsEvent[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("  Finnhub earnings: skipped (no FINNHUB_API_KEY)");
    return [];
  }

  const toDate = to || from;
  const url = `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${toDate}&token=${apiKey}`;
  console.log("  Fetching earnings calendar from Finnhub...");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub earnings: ${res.status}`);
    const data = await res.json();

    const earnings: EarningsEvent[] = (data.earningsCalendar || []).map(
      (e: {
        symbol: string;
        date: string;
        epsEstimate: number;
        epsActual: number;
        revenueEstimate: number;
        revenueActual: number;
        hour: string;
      }) => ({
        symbol: e.symbol,
        date: e.date,
        epsEstimate: e.epsEstimate ?? undefined,
        epsActual: e.epsActual ?? undefined,
        revenueEstimate: e.revenueEstimate ?? undefined,
        revenueActual: e.revenueActual ?? undefined,
        hour: mapHour(e.hour),
      }),
    );

    console.log(`  Finnhub: ${earnings.length} earnings events`);
    return earnings;
  } catch (err) {
    console.warn(`  Finnhub earnings calendar error: ${err}`);
    return [];
  }
}

function mapImpact(impact: string): "high" | "medium" | "low" {
  const n = parseInt(impact, 10);
  if (n >= 3) return "high";
  if (n === 2) return "medium";
  return "low";
}

function mapHour(hour: string): "bmo" | "amc" | "dmh" {
  if (hour === "bmo") return "bmo";
  if (hour === "amc") return "amc";
  return "dmh";
}
