/**
 * Prompt Studio — Web UI for testing and iterating on LLM prompts.
 *
 * Usage: npm run studio
 * Opens at http://localhost:3030
 */

import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import {
  generateStructuredJSON,
  formatSnapshotForPrompt,
  getDailyRecapSystemPrompt,
  loadKnowledge,
} from "@yt-maker/ai";
import type { DailySnapshot, EpisodeScript, Language } from "@yt-maker/core";

const PORT = 3030;
const ROOT = path.resolve(__dirname, "..");

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
  });
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers for dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Serve UI
  if (pathname === "/" && req.method === "GET") {
    const htmlPath = path.join(__dirname, "prompt-studio-ui.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // List available snapshots
  if (pathname === "/api/snapshots" && req.method === "GET") {
    const dataDir = path.join(ROOT, "data");
    if (!fs.existsSync(dataDir)) return json(res, []);
    const files = fs.readdirSync(dataDir)
      .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort()
      .reverse();
    return json(res, files);
  }

  // Get system prompt (with knowledge context if snapshot is loaded)
  if (pathname === "/api/prompt" && req.method === "GET") {
    const lang = (url.searchParams.get("lang") || "fr") as Language;
    const snapshotFile = url.searchParams.get("snapshot");
    let knowledgeContext: string | undefined;
    if (snapshotFile) {
      const filePath = path.join(ROOT, "data", snapshotFile);
      if (fs.existsSync(filePath)) {
        const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        knowledgeContext = loadKnowledge(snapshot);
      }
    }
    const prompt = getDailyRecapSystemPrompt(lang, knowledgeContext);
    return json(res, { prompt, lang, knowledgeChars: knowledgeContext?.length ?? 0 });
  }

  // Load & format a snapshot
  if (pathname === "/api/snapshot" && req.method === "GET") {
    const file = url.searchParams.get("file");
    if (!file) return json(res, { error: "Missing ?file=" }, 400);
    const filePath = path.join(ROOT, "data", file);
    if (!fs.existsSync(filePath)) return json(res, { error: "File not found" }, 404);
    const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const formatted = formatSnapshotForPrompt(snapshot);
    return json(res, { snapshot, formatted });
  }

  // Generate script via LLM
  if (pathname === "/api/generate" && req.method === "POST") {
    const body = JSON.parse(await parseBody(req));
    const systemPrompt: string = body.systemPrompt;
    const userMessage: string = body.userMessage;

    if (!systemPrompt || !userMessage) {
      return json(res, { error: "Missing systemPrompt or userMessage" }, 400);
    }

    try {
      const start = Date.now();
      const result = await generateStructuredJSON<
        Omit<EpisodeScript, "episodeNumber" | "date" | "type" | "lang">
      >(systemPrompt, userMessage);
      const elapsed = Date.now() - start;

      return json(res, { result, elapsedMs: elapsed });
    } catch (err) {
      return json(res, { error: (err as Error).message }, 500);
    }
  }

  // Save a script
  if (pathname === "/api/save" && req.method === "POST") {
    const body = JSON.parse(await parseBody(req));
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const outPath = path.join(ROOT, "data", `prompt-test-${timestamp}.json`);
    fs.writeFileSync(outPath, JSON.stringify(body.script, null, 2));
    return json(res, { saved: outPath });
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n  Prompt Studio running at http://localhost:${PORT}\n`);
});
