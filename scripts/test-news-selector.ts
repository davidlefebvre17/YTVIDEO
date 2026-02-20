import "dotenv/config";
import { readFileSync } from "fs";
import { selectRelevantNews } from "../packages/ai/src/news-selector";
import type { DailySnapshot } from "@yt-maker/core";

const snap: DailySnapshot = JSON.parse(
  readFileSync("./data/snapshot-2026-02-18.json", "utf8"),
);

const selected = selectRelevantNews(snap.news, snap, "fr", 40);

console.log(`Total pool: ${snap.news.length} → selected: ${selected.length}`);
console.log("");

selected.forEach((n, i) => {
  const date = n.publishedAt.slice(0, 10);
  const mark = date === snap.date ? "✓" : date < snap.date ? "←" : "→";
  console.log(
    `${String(i + 1).padStart(2)}. ${mark} [${date}] [${n.lang ?? "?"}] [${n.source}]`,
  );
  console.log(`    ${n.title.slice(0, 90)}`);
  if (n.summary) console.log(`    → ${n.summary.slice(0, 100)}`);
});

// Distribution by date
const byDate: Record<string, number> = {};
selected.forEach((n) => {
  const d = n.publishedAt.slice(0, 10);
  byDate[d] = (byDate[d] ?? 0) + 1;
});
console.log("\nDistribution par date dans le top 40:");
Object.entries(byDate)
  .sort()
  .forEach(([d, c]) =>
    console.log(`  ${d}: ${c} articles ${d === snap.date ? "← TRADING DAY" : ""}`),
  );

// Distribution by lang
const byLang = { fr: selected.filter((n) => n.lang === "fr").length, en: selected.filter((n) => n.lang === "en").length };
console.log(`\nFR: ${byLang.fr} | EN: ${byLang.en}`);
