/**
 * Compare basic news matching vs tagger-based for dramaScore impact.
 */
import * as fs from "fs";
import * as path from "path";
import type { DailySnapshot } from "@yt-maker/core";
import { initTagger, tagArticleAuto } from "../packages/ai/src/memory/news-tagger";

const date = process.argv[2] || "2026-03-16";
const snapshot: DailySnapshot = JSON.parse(
  fs.readFileSync(path.resolve("data", `snapshot-${date}.json`), "utf-8"),
);

initTagger();

// Tagger counts (Layer 1 only, title-only since we changed the tagger)
const taggerCounts = new Map<string, number>();
for (const n of snapshot.news ?? []) {
  const tags = tagArticleAuto({ title: n.title, source: n.source ?? "" });
  for (const t of tags.assets) {
    taggerCounts.set(t.symbol, (taggerCounts.get(t.symbol) ?? 0) + 1);
  }
}

console.log("Symbol         Name                 Basic  Tagger  DramaDelta  CurrentDrama");
console.log("─".repeat(78));

let changed = 0;
for (const a of snapshot.assets) {
  const basic = (snapshot.news ?? []).filter(
    (n) =>
      n.title.toLowerCase().includes(a.name.toLowerCase()) ||
      n.title.toLowerCase().includes(a.symbol.toLowerCase()),
  ).length;
  const tagger = taggerCounts.get(a.symbol) ?? 0;
  const delta = (Math.min(tagger, 5) - Math.min(basic, 5)) * 3;

  if (basic !== tagger) {
    changed++;
    console.log(
      `${a.symbol.padEnd(15)}${a.name.slice(0, 20).padEnd(22)}` +
        `${String(basic).padStart(5)}  ${String(tagger).padStart(6)}  ` +
        `${(delta >= 0 ? "+" : "") + delta}`.padStart(10) +
        `  ${a.technicals?.dramaScore?.toFixed(1) ?? "?"}`,
    );
  }
}
console.log(`\n${changed} assets with different counts out of ${snapshot.assets.length}`);
