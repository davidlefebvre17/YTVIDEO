/**
 * Market Studio — UI for fetching market data and generating scripts.
 *
 * Usage: npm run market-studio
 * Opens at http://localhost:3032
 */

import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { fetchMarketSnapshot } from "@yt-maker/data";
import { generateScript, getNextEpisodeNumber } from "@yt-maker/ai";
import type { DailySnapshot, Language } from "@yt-maker/core";
import type { PrevEntry, PrevContext } from "@yt-maker/ai";

const PORT = 3032;
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

// ── SSE broadcast ──────────────────────────────────────────────────────────
const sseClients = new Set<http.ServerResponse>();

function broadcast(type: "log" | "warn" | "error" | "done" | "start", message: string) {
  const data = JSON.stringify({ type, message, ts: Date.now() });
  for (const client of sseClients) {
    try { client.write(`data: ${data}\n\n`); } catch { /* ignore */ }
  }
}

// Intercept console to stream logs to UI
const _log = console.log.bind(console);
const _warn = console.warn.bind(console);
const _error = console.error.bind(console);
console.log = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(" ");
  _log(msg);
  broadcast("log", msg);
};
console.warn = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(" ");
  _warn(msg);
  broadcast("warn", msg);
};
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(" ");
  _error(msg);
  broadcast("error", msg);
};

// ── Helpers ────────────────────────────────────────────────────────────────
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

function prevDay(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function buildPrevContext(snapshotDate: string): PrevContext | undefined {
  const entries: PrevEntry[] = [];
  let searchDate = snapshotDate;
  for (let i = 0; i < 10 && entries.length < 5; i++) {
    searchDate = prevDay(searchDate);
    const snapPath = path.join(DATA_DIR, `snapshot-${searchDate}.json`);
    if (!fs.existsSync(snapPath)) continue;
    const scriptPath = path.join(DATA_DIR, `script-${searchDate}.json`);
    entries.unshift({
      snapshot: JSON.parse(fs.readFileSync(snapPath, "utf-8")),
      script: fs.existsSync(scriptPath) ? JSON.parse(fs.readFileSync(scriptPath, "utf-8")) : undefined,
    });
  }
  return entries.length > 0 ? { entries } : undefined;
}

function listDataFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const snapshots = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
    .map((f) => f.replace("snapshot-", "").replace(".json", ""))
    .sort()
    .reverse();
  return snapshots;
}

// ── Request handler ────────────────────────────────────────────────────────
let isBusy = false;

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Serve UI
  if (pathname === "/" && req.method === "GET") {
    const htmlPath = path.join(__dirname, "market-studio-ui.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // SSE log stream
  if (pathname === "/api/logs" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // List available dates
  if (pathname === "/api/dates" && req.method === "GET") {
    return json(res, listDataFiles());
  }

  // Load snapshot + script for a date
  if (pathname === "/api/data" && req.method === "GET") {
    const date = url.searchParams.get("date");
    if (!date) return json(res, { error: "Missing ?date=" }, 400);
    const snapPath = path.join(DATA_DIR, `snapshot-${date}.json`);
    const scriptPath = path.join(DATA_DIR, `script-${date}.json`);
    const snapshot = fs.existsSync(snapPath) ? JSON.parse(fs.readFileSync(snapPath, "utf-8")) : null;
    const script = fs.existsSync(scriptPath) ? JSON.parse(fs.readFileSync(scriptPath, "utf-8")) : null;
    return json(res, { snapshot, script });
  }

  // Fetch market data
  if (pathname === "/api/fetch" && req.method === "POST") {
    if (isBusy) return json(res, { error: "Already running" }, 409);
    const body = JSON.parse(await parseBody(req));
    const date: string = body.date;
    if (!date) return json(res, { error: "Missing date" }, 400);

    isBusy = true;
    broadcast("start", `Fetching market snapshot for ${date}...`);
    res.writeHead(200, { "Content-Type": "application/json" });

    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const snapshot = await fetchMarketSnapshot(date);
      const outPath = path.join(DATA_DIR, `snapshot-${date}.json`);
      fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
      broadcast("done", `Snapshot saved: snapshot-${date}.json`);
      res.end(JSON.stringify({ ok: true, date }));
    } catch (err) {
      broadcast("error", `Fetch failed: ${err}`);
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    } finally {
      isBusy = false;
    }
    return;
  }

  // Generate script
  if (pathname === "/api/generate" && req.method === "POST") {
    if (isBusy) return json(res, { error: "Already running" }, 409);
    const body = JSON.parse(await parseBody(req));
    const date: string = body.date;
    const lang: Language = body.lang || "fr";
    if (!date) return json(res, { error: "Missing date" }, 400);

    const snapPath = path.join(DATA_DIR, `snapshot-${date}.json`);
    if (!fs.existsSync(snapPath)) return json(res, { error: `No snapshot for ${date}` }, 404);

    isBusy = true;
    broadcast("start", `Generating script for ${date} (${lang})...`);
    res.writeHead(200, { "Content-Type": "application/json" });

    try {
      const snapshot: DailySnapshot = JSON.parse(fs.readFileSync(snapPath, "utf-8"));
      const prevContext = buildPrevContext(date);
      if (prevContext) {
        const dates = prevContext.entries.map((e) => e.snapshot.date);
        const withScript = prevContext.entries.filter((e) => e.script).length;
        broadcast("log", `History: [${dates.join(", ")}] (${withScript}/${dates.length} with predictions)`);
      }
      const episodeNumber = getNextEpisodeNumber();
      const script = await generateScript(snapshot, { type: "daily_recap", lang, episodeNumber, prevContext });
      const outPath = path.join(DATA_DIR, `script-${date}.json`);
      fs.writeFileSync(outPath, JSON.stringify(script, null, 2));
      broadcast("done", `Script saved: script-${date}.json`);
      res.end(JSON.stringify({ ok: true, date, script }));
    } catch (err) {
      broadcast("error", `Generate failed: ${err}`);
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    } finally {
      isBusy = false;
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n  Market Studio running at http://localhost:${PORT}\n`);
});
