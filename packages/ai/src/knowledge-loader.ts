import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot } from "@yt-maker/core";

const KNOWLEDGE_DIR = path.resolve(__dirname, "knowledge");

function readKnowledgeFile(filename: string): string {
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Load relevant knowledge context based on the day's market snapshot.
 * Returns formatted text for injection into the LLM system prompt.
 * Target: 500-1500 tokens of highly relevant context.
 */
export function loadKnowledge(snapshot: DailySnapshot): string {
  const sections: string[] = [];

  // Always inject: intermarket relationships + narrative patterns
  const intermarket = readKnowledgeFile("intermarket.md");
  if (intermarket) sections.push(intermarket);

  const narrative = readKnowledgeFile("narrative-patterns.md");
  if (narrative) sections.push(narrative);

  // Always inject technical analysis guide (needed for deep dives)
  const technical = readKnowledgeFile("technical-analysis.md");
  if (technical) sections.push(technical);

  // Always inject macro indicators (VIX, yields, F&G context)
  const macro = readKnowledgeFile("macro-indicators.md");
  if (macro) sections.push(macro);

  // Conditional: central banks (if we have the file and there's a rate event)
  const hasCentralBankEvent = snapshot.events.some(
    (e) =>
      e.name.toLowerCase().includes("fomc") ||
      e.name.toLowerCase().includes("ecb") ||
      e.name.toLowerCase().includes("boj") ||
      e.name.toLowerCase().includes("interest rate"),
  );
  if (hasCentralBankEvent) {
    const centralBanks = readKnowledgeFile("central-banks.md");
    if (centralBanks) sections.push(centralBanks);
  }

  // Conditional: asset profiles (if we have the file)
  const assetProfiles = readKnowledgeFile("asset-profiles.md");
  if (assetProfiles) sections.push(assetProfiles);

  return sections.join("\n\n---\n\n");
}
