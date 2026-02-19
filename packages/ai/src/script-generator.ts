import type { DailySnapshot, EpisodeScript, EpisodeType, Language } from "@yt-maker/core";
import { generateStructuredJSON } from "./llm-client";
import { getDailyRecapSystemPrompt } from "./prompts/daily-recap";
import { getChartAnalysisSystemPrompt } from "./prompts/chart-analysis";
import { loadKnowledge } from "./knowledge-loader";

/**
 * Format a snapshot into a rich prompt for the LLM.
 * Includes technical indicators when available.
 */
export function formatSnapshotForPrompt(snapshot: DailySnapshot): string {
  let text = `# Market Data — ${snapshot.date}\n\n`;

  // Sort assets by drama score (highest first) if available
  const sorted = [...snapshot.assets].sort((a, b) => {
    const da = a.technicals?.dramaScore ?? 0;
    const db = b.technicals?.dramaScore ?? 0;
    return db - da;
  });

  text += "## Assets (sorted by importance)\n\n";
  for (const asset of sorted) {
    const dir = asset.changePct >= 0 ? "+" : "";
    text += `### ${asset.name} (${asset.symbol})\n`;
    text += `Prix: ${asset.price.toFixed(asset.price > 100 ? 2 : 4)} | Variation: ${dir}${asset.changePct.toFixed(2)}% | Range 24h: ${asset.low24h.toFixed(asset.price > 100 ? 2 : 4)} — ${asset.high24h.toFixed(asset.price > 100 ? 2 : 4)}\n`;

    if (asset.technicals) {
      const t = asset.technicals;
      const p = asset.price;
      const fmt = (n: number) => n.toFixed(p > 100 ? 2 : 4);

      text += `Technique:\n`;
      text += `  EMA9: ${fmt(t.ema9)} | EMA21: ${fmt(t.ema21)} | Prix ${p > t.ema9 ? "AU-DESSUS" : "EN-DESSOUS"} des deux EMAs\n`;
      text += `  RSI14: ${t.rsi14.toFixed(0)}${t.rsi14 < 30 ? " (SURVENTE)" : t.rsi14 > 70 ? " (SURACHAT)" : ""}\n`;
      text += `  Trend: ${t.trend.toUpperCase()}\n`;
      text += `  Volume: ${t.volumeAnomaly > 1.2 ? `${(t.volumeAnomaly * 100 - 100).toFixed(0)}% AU-DESSUS de la moyenne 20j` : t.volumeAnomaly < 0.8 ? `${(100 - t.volumeAnomaly * 100).toFixed(0)}% EN-DESSOUS de la moyenne 20j` : "normal"}\n`;
      text += `  Supports: ${t.supports.map(fmt).join(", ") || "aucun detecte"}\n`;
      text += `  Resistances: ${t.resistances.map(fmt).join(", ") || "aucune detectee"}\n`;
      text += `  Range 20j: ${fmt(t.low20d)} — ${fmt(t.high20d)}`;
      if (t.isNear52wHigh) text += " *** PROCHE DU PLUS HAUT ***";
      if (t.isNear52wLow) text += " *** PROCHE DU PLUS BAS ***";
      text += `\n`;
      text += `  Drama Score: ${t.dramaScore.toFixed(1)}\n`;
    }
    text += `\n`;
  }

  if (snapshot.news.length > 0) {
    text += "## News recentes\n\n";
    for (const news of snapshot.news.slice(0, 8)) {
      text += `- [${news.source}] ${news.title}\n`;
      if (news.summary) text += `  ${news.summary.slice(0, 200)}\n`;
    }
    text += "\n";
  }

  if (snapshot.events.length > 0) {
    text += "## Calendrier economique\n\n";
    for (const event of snapshot.events) {
      text += `- ${event.name} (${event.currency}) — Impact: ${event.impact}`;
      if (event.forecast) text += ` | Consensus: ${event.forecast}`;
      if (event.previous) text += ` | Precedent: ${event.previous}`;
      if (event.actual) text += ` | Actuel: ${event.actual}`;
      text += "\n";
    }
  }

  return text;
}

export async function generateScript(
  snapshot: DailySnapshot,
  options: {
    type: EpisodeType;
    lang: Language;
    episodeNumber: number;
  },
): Promise<EpisodeScript> {
  console.log(`\nGenerating ${options.type} script in ${options.lang}...`);

  // Load knowledge context
  const knowledgeContext = loadKnowledge(snapshot);
  console.log(`Knowledge context: ${knowledgeContext.length} chars loaded`);

  const systemPrompt =
    options.type === "chart_analysis"
      ? getChartAnalysisSystemPrompt(options.lang)
      : getDailyRecapSystemPrompt(options.lang, knowledgeContext);

  const userMessage = formatSnapshotForPrompt(snapshot);

  console.log(`System prompt: ${systemPrompt.length} chars`);
  console.log(`User message: ${userMessage.length} chars`);

  const scriptBody = await generateStructuredJSON<
    Omit<EpisodeScript, "episodeNumber" | "date" | "type" | "lang">
  >(systemPrompt, userMessage);

  const script: EpisodeScript = {
    episodeNumber: options.episodeNumber,
    date: snapshot.date,
    type: options.type,
    lang: options.lang,
    ...scriptBody,
  };

  // Validate total duration
  const actualTotal = script.sections.reduce((sum, s) => sum + s.durationSec, 0);
  script.totalDurationSec = actualTotal;

  console.log(
    `Script generated: "${script.title}" (${actualTotal}s, ${script.sections.length} sections)`,
  );
  return script;
}
