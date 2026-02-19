/**
 * Render a Remotion composition from episode data.
 *
 * Usage:
 *   npm run render -- --episode ./episodes/2026/02-19.json
 *   npm run render -- --props ./data/props-2026-02-19.json
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

async function main() {
  const args = process.argv.slice(2);
  let episodePath = "";
  let propsPath = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--episode" && args[i + 1]) {
      episodePath = args[i + 1];
      i++;
    } else if (args[i] === "--props" && args[i + 1]) {
      propsPath = args[i + 1];
      i++;
    }
  }

  const projectRoot = path.resolve(__dirname, "..");

  // If episode path given, extract props from it
  if (episodePath && !propsPath) {
    console.log(`Loading episode: ${episodePath}`);
    const episode = JSON.parse(fs.readFileSync(episodePath, "utf-8"));

    const dataDir = path.resolve(projectRoot, "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    propsPath = path.join(dataDir, "render-props.json");
    const props = {
      script: episode.script,
      assets: episode.snapshot?.assets || [],
      news: episode.snapshot?.news || [],
    };
    fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
  }

  if (!propsPath) {
    console.error("Provide --episode or --props");
    process.exit(1);
  }

  const outDir = path.resolve(projectRoot, "out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const date = new Date().toISOString().split("T")[0];
  const outPath = path.join(outDir, `episode-${date}.mp4`);

  const remotionEntry = path.resolve(projectRoot, "packages", "remotion-app", "src", "index.ts");
  const cmd = `npx remotion render "${remotionEntry}" DailyRecap "${outPath}" --codec=h264 --crf=18 --props="${propsPath}"`;

  console.log(`Rendering...`);
  console.log(`Entry: ${remotionEntry}`);
  console.log(`Output: ${outPath}`);

  execSync(cmd, { stdio: "inherit", cwd: projectRoot });
  console.log(`\nDone! Video: ${outPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
