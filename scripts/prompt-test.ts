/**
 * Test CLI for iterating on LLM prompts and seeing results instantly.
 *
 * Usage:
 *   npm run prompt-test -- --data ./data/snapshot-2026-02-19.json --lang fr
 *   npm run prompt-test -- --data ./data/snapshot-2026-02-19.json --lang en --save
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import {
  generateStructuredJSON,
  formatSnapshotForPrompt,
  getDailyRecapSystemPrompt,
  loadKnowledge,
} from "@yt-maker/ai";
import type { DailySnapshot, EpisodeScript, Language } from "@yt-maker/core";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace("--", "");
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const dataPath = opts.data as string;
  const lang = (opts.lang as Language) || "fr";
  const shouldSave = !!opts.save;

  if (!dataPath) {
    console.error("Usage: npm run prompt-test -- --data ./data/snapshot-*.json --lang fr|en [--save]");
    process.exit(1);
  }

  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  console.log(`Loading snapshot: ${dataPath}`);
  const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Date: ${snapshot.date}`);
  console.log(`Assets: ${snapshot.assets.length} | News: ${snapshot.news.length} | Events: ${snapshot.events.length}`);

  // Get system prompt with knowledge context and format snapshot
  const knowledgeContext = loadKnowledge(snapshot);
  console.log(`Knowledge context: ${knowledgeContext.length} chars`);
  const systemPrompt = getDailyRecapSystemPrompt(lang, knowledgeContext);
  const userMessage = formatSnapshotForPrompt(snapshot);

  // Show inputs
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║        SYSTEM PROMPT (instructions)  ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(systemPrompt);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║        USER MESSAGE (market data)    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(userMessage);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║        CALLING LLM...                ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`System prompt: ${systemPrompt.length} chars | User message: ${userMessage.length} chars`);

  let script: EpisodeScript;
  try {
    const scriptBody = await generateStructuredJSON<
      Omit<EpisodeScript, "episodeNumber" | "date" | "type" | "lang">
    >(systemPrompt, userMessage);

    script = {
      episodeNumber: 0,
      date: snapshot.date,
      type: "daily_recap",
      lang,
      ...scriptBody,
    };

    console.log("\n--- Results ---");
    console.log(JSON.stringify(script, null, 2));

    // Calculate stats
    console.log("\n--- Stats ---");
    console.log(`Title: "${script.title}"`);
    console.log(`Sections: ${script.sections.length}`);
    console.log(`Total duration: ${script.totalDurationSec}s (${(script.totalDurationSec / 60).toFixed(1)}m)`);

    for (const section of script.sections) {
      const wordCount = section.narration.split(/\s+/).length;
      const expectedWords = Math.round((section.durationSec / 60) * 150);
      const ratio = (wordCount / expectedWords).toFixed(1);
      console.log(
        `  [${section.type}] ${section.title}: ${section.durationSec}s, ${wordCount} words (expected ~${expectedWords}, ratio ${ratio}x)`
      );
    }

    // Save if requested
    if (shouldSave) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const outPath = path.resolve(__dirname, "..", "data", `prompt-test-${timestamp}.json`);
      fs.writeFileSync(outPath, JSON.stringify(script, null, 2));
      console.log(`\nSaved to: ${outPath}`);
    }
  } catch (err) {
    console.error("\n--- LLM Error ---");
    console.error((err as Error).message);
    if ((err as any).response) {
      console.error("Response:", (err as any).response);
    }
    process.exit(1);
  }
}

main();
