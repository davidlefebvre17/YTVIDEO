/**
 * Open Remotion Studio for visual preview.
 *
 * Usage:
 *   npm run preview
 */

import { execSync } from "child_process";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");
const remotionEntry = path.resolve(projectRoot, "packages", "remotion-app", "src", "index.ts");

console.log("Opening Remotion Studio...");
console.log(`Entry: ${remotionEntry}`);

execSync(`npx remotion studio "${remotionEntry}"`, {
  stdio: "inherit",
  cwd: projectRoot,
});
