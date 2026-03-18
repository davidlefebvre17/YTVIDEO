import { buildEpisodeSummaries } from "@yt-maker/ai";

const prevContext = {
  entries: [
    { snapshot: { date: "2026-02-19" } as any, script: { sections: [] } as any },
    { snapshot: { date: "2026-03-10" } as any, script: { sections: [] } as any },
    { snapshot: { date: "2026-03-12" } as any, script: { sections: [] } as any },
  ]
};

console.log("=== Pour snapshot 2026-03-16 ===");
const summaries = buildEpisodeSummaries(prevContext, 15, "2026-03-16");
for (const s of summaries) {
  console.log(`  ${s.label} → ${s.date}`);
}

console.log("\n=== Avant (sans currentDate) ===");
const old = buildEpisodeSummaries(prevContext, 15);
for (const s of old) {
  console.log(`  ${s.label} → ${s.date}`);
}
