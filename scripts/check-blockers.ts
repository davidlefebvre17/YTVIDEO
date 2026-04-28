import { readFileSync } from "fs";
import { validateMechanical } from "@yt-maker/ai/src/pipeline/p5-validation";

const script = JSON.parse(readFileSync("episodes/2026/04-17/pipeline/episode_draft.json", "utf-8"));
const editorial = JSON.parse(readFileSync("episodes/2026/04-17/pipeline/editorial.json", "utf-8"));
const snapshot = JSON.parse(readFileSync("episodes/2026/04-17/pipeline/snapshot_flagged.json", "utf-8"));

// Fake budget (duration check will warn but ok)
const budget: any = {
  hook: 20,
  titleCard: 0,
  thread: 60,
  segments: script.segments.map((s: any) => ({
    segmentId: s.segmentId,
    depth: s.depth,
    targetWords: s.depth === 'deep' ? 320 : s.depth === 'focus' ? 180 : s.depth === 'panorama' ? 250 : 60,
    maxWords: s.depth === 'deep' ? 380 : s.depth === 'focus' ? 200 : s.depth === 'panorama' ? 320 : 75,
  })),
  closing: 100,
  totalTarget: 1700,
};

const issues = validateMechanical(script, editorial, budget, snapshot);
const blockers = issues.filter((i: any) => i.severity === "blocker");
const warnings = issues.filter((i: any) => i.severity === "warning");

console.log(`\nBlockers: ${blockers.length}`);
for (const b of blockers) {
  console.log(`  [${b.type}] ${b.segmentId ?? '-'}: ${b.description}`);
}
console.log(`\nWarnings: ${warnings.length}`);
for (const w of warnings.slice(0, 5)) {
  console.log(`  [${w.type}] ${w.segmentId ?? '-'}: ${w.description}`);
}
