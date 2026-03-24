import { generateBeats } from "../packages/ai/src/pipeline/p7a-beat-generator";
import * as fs from "fs";

const ep = JSON.parse(fs.readFileSync("episodes/2026/03-20.json", "utf-8"));
const beats = generateBeats(ep.script, ep.snapshot);

console.log(`Beats: ${beats.length}`);
console.log(`Avg duration: ${(beats.reduce((s, b) => s + b.durationSec, 0) / beats.length).toFixed(1)}s`);
console.log(`Total duration: ${beats.reduce((s, b) => s + b.durationSec, 0).toFixed(0)}s`);
console.log(`Overlays: ${beats.filter(b => b.overlayHint !== 'none').length}`);

// Show distribution
const ranges = { '3-5s': 0, '6-8s': 0, '9-11s': 0, '12s+': 0 };
beats.forEach(b => {
  if (b.durationSec < 6) ranges['3-5s']++;
  else if (b.durationSec < 9) ranges['6-8s']++;
  else if (b.durationSec < 12) ranges['9-11s']++;
  else ranges['12s+']++;
});
console.log('Distribution:', ranges);
