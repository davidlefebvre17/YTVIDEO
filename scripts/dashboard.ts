/**
 * Pipeline Dashboard — single-file web UI for the trading video pipeline.
 * Run: npx tsx scripts/dashboard.ts
 * Open: http://localhost:3040
 */
import "dotenv/config";
import * as http from "http";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "episodes");
const DATA_DIR = path.join(ROOT, "data");
const PORT = 3040;

let currentProcess: ChildProcess | null = null;
let logBuffer: string[] = [];
let sseClients: http.ServerResponse[] = [];
let processStartTime: number | null = null;

// ─── SSE helper ───

function broadcast(data: { type: string; message: string; timestamp?: string }) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter((res) => {
    try {
      res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

// ─── Helpers ───

function readJsonFile(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendHtml(res: http.ServerResponse, html: string) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

// ─── API handlers ───

function handleGetEpisodes(res: http.ServerResponse) {
  const episodes: { date: string; hasSnapshot: boolean; intermediates: string[] }[] = [];
  if (!fs.existsSync(EPISODES_DIR)) return sendJson(res, []);
  for (const year of fs.readdirSync(EPISODES_DIR).filter((f) => /^\d{4}$/.test(f))) {
    const yearDir = path.join(EPISODES_DIR, year);
    for (const md of fs.readdirSync(yearDir).filter((f) => /^\d{2}-\d{2}$/.test(f))) {
      const date = `${year}-${md}`;
      const epDir = path.join(yearDir, md);
      const pipelineDir = path.join(epDir, "pipeline");
      const intermediates = fs.existsSync(pipelineDir)
        ? fs.readdirSync(pipelineDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""))
        : [];
      const hasSnapshot =
        fs.existsSync(path.join(epDir, "snapshot.json")) ||
        fs.existsSync(path.join(DATA_DIR, `snapshot-${date}.json`));
      episodes.push({ date, hasSnapshot, intermediates });
    }
  }
  episodes.sort((a, b) => b.date.localeCompare(a.date));
  sendJson(res, episodes);
}

function handleGetIntermediates(res: http.ServerResponse, date: string) {
  const year = date.slice(0, 4);
  const md = date.slice(5);
  const pipelineDir = path.join(EPISODES_DIR, year, md, "pipeline");
  if (!fs.existsSync(pipelineDir)) return sendJson(res, []);
  const files = fs
    .readdirSync(pipelineDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const name = f.replace(".json", "");
      const stat = fs.statSync(path.join(pipelineDir, f));
      return { name, size: stat.size, modified: stat.mtime.toISOString() };
    });
  sendJson(res, files);
}

function handleGetIntermediate(res: http.ServerResponse, date: string, name: string) {
  const year = date.slice(0, 4);
  const md = date.slice(5);
  const filePath = path.join(EPISODES_DIR, year, md, "pipeline", `${name}.json`);
  if (!fs.existsSync(filePath)) return sendJson(res, { error: "Not found" }, 404);
  try {
    sendJson(res, readJsonFile(filePath));
  } catch (e) {
    sendJson(res, { error: (e as Error).message }, 500);
  }
}

function handleGetSnapshot(res: http.ServerResponse, date: string) {
  const year = date.slice(0, 4);
  const md = date.slice(5);
  let filePath = path.join(EPISODES_DIR, year, md, "snapshot.json");
  if (!fs.existsSync(filePath)) filePath = path.join(DATA_DIR, `snapshot-${date}.json`);
  if (!fs.existsSync(filePath)) return sendJson(res, { error: "Snapshot not found" }, 404);
  try {
    sendJson(res, readJsonFile(filePath));
  } catch (e) {
    sendJson(res, { error: (e as Error).message }, 500);
  }
}

function handleGetScript(res: http.ServerResponse, date: string) {
  const year = date.slice(0, 4);
  const md = date.slice(5);
  let filePath = path.join(EPISODES_DIR, year, md, "script.json");
  if (!fs.existsSync(filePath)) {
    // try the flat file
    filePath = path.join(EPISODES_DIR, year, `${md}.json`);
  }
  if (!fs.existsSync(filePath)) return sendJson(res, { error: "Script not found" }, 404);
  try {
    sendJson(res, readJsonFile(filePath));
  } catch (e) {
    sendJson(res, { error: (e as Error).message }, 500);
  }
}

async function handleGenerate(req: http.IncomingMessage, res: http.ServerResponse) {
  if (currentProcess) return sendJson(res, { error: "Already running" }, 409);

  const body = await parseBody(req);
  const { date, lang = "fr", flags = {} } = body;
  if (!date) return sendJson(res, { error: "date required" }, 400);

  const args = ["run", "generate", "--", "--date", date, "--lang", lang];
  if (flags.skipFetch) args.push("--skip-fetch");
  if (flags.skipScript) args.push("--skip-script");
  if (flags.skipImages) args.push("--skip-images");
  if (flags.skipTts) args.push("--skip-tts");
  if (flags.noRender) args.push("--no-render");
  if (flags.startFrom) args.push("--start-from", flags.startFrom);

  logBuffer = [];
  processStartTime = Date.now();
  broadcast({ type: "status", message: "started", timestamp: new Date().toISOString() });

  currentProcess = spawn("npm", args, { cwd: ROOT, shell: true });

  currentProcess.stdout?.on("data", (chunk) => {
    const lines = chunk
      .toString()
      .split("\n")
      .filter((l: string) => l.trim());
    for (const line of lines) {
      logBuffer.push(line);
      broadcast({ type: "log", message: line, timestamp: new Date().toISOString() });
    }
  });

  currentProcess.stderr?.on("data", (chunk) => {
    const lines = chunk
      .toString()
      .split("\n")
      .filter((l: string) => l.trim());
    for (const line of lines) {
      logBuffer.push(`[ERR] ${line}`);
      broadcast({ type: "error", message: line, timestamp: new Date().toISOString() });
    }
  });

  currentProcess.on("close", (code) => {
    broadcast({
      type: "status",
      message: code === 0 ? "completed" : `failed (exit ${code})`,
      timestamp: new Date().toISOString(),
    });
    currentProcess = null;
    processStartTime = null;
  });

  sendJson(res, { ok: true, args });
}

function handleSSE(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send buffered logs
  for (const line of logBuffer) {
    res.write(`data: ${JSON.stringify({ type: "log", message: line })}\n\n`);
  }

  // Send current status
  res.write(
    `data: ${JSON.stringify({
      type: "status",
      message: currentProcess ? "running" : "idle",
      startTime: processStartTime,
    })}\n\n`
  );

  sseClients.push(res);
  req.on("close", () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
}

function handleStop(res: http.ServerResponse) {
  if (!currentProcess) return sendJson(res, { error: "Not running" }, 409);
  currentProcess.kill();
  currentProcess = null;
  processStartTime = null;
  broadcast({ type: "status", message: "stopped", timestamp: new Date().toISOString() });
  sendJson(res, { ok: true });
}

function handleGetLogs(res: http.ServerResponse) {
  sendJson(res, { running: !!currentProcess, logs: logBuffer, startTime: processStartTime });
}

// ─── Router ───

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "/", true);
  const pathname = parsed.pathname || "/";
  const method = req.method || "GET";

  // CORS for dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    // Static routes
    if (method === "GET" && pathname === "/") return sendHtml(res, getDashboardHtml());
    if (method === "GET" && pathname === "/api/episodes") return handleGetEpisodes(res);
    if (method === "GET" && pathname === "/api/generate/stream") return handleSSE(req, res);
    if (method === "GET" && pathname === "/api/generate/logs") return handleGetLogs(res);
    if (method === "POST" && pathname === "/api/generate") return await handleGenerate(req, res);
    if (method === "POST" && pathname === "/api/generate/stop") return handleStop(res);

    // Parameterized routes
    const intermediatesMatch = pathname.match(/^\/api\/episode\/([^/]+)\/intermediates$/);
    if (method === "GET" && intermediatesMatch) return handleGetIntermediates(res, intermediatesMatch[1]);

    const intermediateMatch = pathname.match(/^\/api\/episode\/([^/]+)\/intermediate\/([^/]+)$/);
    if (method === "GET" && intermediateMatch)
      return handleGetIntermediate(res, intermediateMatch[1], intermediateMatch[2]);

    const snapshotMatch = pathname.match(/^\/api\/episode\/([^/]+)\/snapshot$/);
    if (method === "GET" && snapshotMatch) return handleGetSnapshot(res, snapshotMatch[1]);

    const scriptMatch = pathname.match(/^\/api\/episode\/([^/]+)\/script$/);
    if (method === "GET" && scriptMatch) return handleGetScript(res, scriptMatch[1]);

    sendJson(res, { error: "Not found" }, 404);
  } catch (e) {
    console.error("Server error:", e);
    sendJson(res, { error: (e as Error).message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Pipeline Dashboard running at http://localhost:${PORT}\n`);
});

// ─── HTML Dashboard ───

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OSJ Pipeline Dashboard</title>
<style>
  :root {
    --bg: #0b0f1a;
    --bg-card: #111827;
    --bg-hover: #1e293b;
    --cyan: #00b4d8;
    --gold: #ffd60a;
    --green: #4ade80;
    --red: #f87171;
    --orange: #fb923c;
    --text: #e2e8f0;
    --text-dim: #94a3b8;
    --border: #1e293b;
    --font: 'Segoe UI', system-ui, sans-serif;
    --mono: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    overflow: hidden;
    height: 100vh;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }
  .header h1 {
    font-size: 18px;
    font-weight: 600;
    color: var(--cyan);
    letter-spacing: 0.5px;
  }
  .header h1 span { color: var(--gold); }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .header-right select {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family: var(--mono);
    cursor: pointer;
  }

  /* ── Controls ── */
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .control-group label {
    font-size: 12px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  input[type="date"], select, input[type="text"] {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 5px 8px;
    border-radius: 4px;
    font-size: 13px;
    font-family: var(--mono);
  }
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .checkbox-group input[type="checkbox"] {
    accent-color: var(--cyan);
  }
  .btn {
    padding: 6px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
    font-family: var(--font);
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-generate {
    background: var(--green);
    color: #0b0f1a;
  }
  .btn-stop {
    background: var(--red);
    color: #fff;
  }
  .spacer { flex: 1; }
  .status-badge {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-idle { background: var(--border); color: var(--text-dim); }
  .status-running { background: rgba(0,180,216,0.2); color: var(--cyan); }
  .status-completed { background: rgba(74,222,128,0.2); color: var(--green); }
  .status-failed { background: rgba(248,113,113,0.2); color: var(--red); }
  .status-stopped { background: rgba(251,146,60,0.2); color: var(--orange); }

  /* ── Progress bar ── */
  .progress-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 8px 20px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }
  .stage {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .stage-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    border: 2px solid var(--border);
    background: var(--bg);
    color: var(--text-dim);
    transition: all 0.3s;
    font-family: var(--mono);
  }
  .stage-dot.pending { border-color: var(--border); color: var(--text-dim); }
  .stage-dot.active { border-color: var(--cyan); color: var(--cyan); background: rgba(0,180,216,0.1); animation: pulse 1.5s infinite; }
  .stage-dot.done { border-color: var(--green); color: var(--green); background: rgba(74,222,128,0.1); }
  .stage-dot.failed { border-color: var(--red); color: var(--red); background: rgba(248,113,113,0.1); }
  .stage-dot.loaded { border-color: var(--cyan); color: var(--cyan); background: rgba(0,180,216,0.15); }
  .stage-line {
    width: 32px;
    height: 2px;
    background: var(--border);
    transition: background 0.3s;
  }
  .stage-line.done { background: var(--green); }
  .stage-line.active { background: var(--cyan); }
  .stage-label {
    font-size: 9px;
    color: var(--text-dim);
    margin-top: 2px;
    text-align: center;
  }
  .stage-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stage-connector {
    display: flex;
    align-items: center;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,180,216,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(0,180,216,0); }
  }
  .elapsed {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-dim);
    font-family: var(--mono);
  }

  /* ── Main layout ── */
  .main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    height: calc(100vh - 148px);
  }

  /* ── Log panel ── */
  .log-panel {
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .panel-header {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-card);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .log-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    background: var(--bg);
  }
  .log-line {
    padding: 1px 16px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .log-line.success { color: var(--green); }
  .log-line.error { color: var(--red); }
  .log-line.warning { color: var(--orange); }
  .log-line.info { color: var(--cyan); }
  .log-line.dim { color: var(--text-dim); }
  .log-timestamp {
    color: var(--text-dim);
    font-size: 10px;
    margin-right: 8px;
    opacity: 0.6;
  }

  /* ── Data panel ── */
  .data-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Tabs ── */
  .tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .tab {
    padding: 8px 14px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font);
  }
  .tab:hover { color: var(--text); background: var(--bg-hover); }
  .tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
  .tab.disabled { color: #374151; cursor: not-allowed; }
  .tab .badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 8px;
    background: var(--border);
    color: var(--text-dim);
    font-family: var(--mono);
  }
  .tab.active .badge { background: rgba(0,180,216,0.2); color: var(--cyan); }

  /* ── JSON viewer ── */
  .data-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .json-panel {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .json-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
    background: var(--bg);
  }
  .json-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .json-search {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: var(--mono);
  }
  .json-search:focus { border-color: var(--cyan); outline: none; }
  .json-breadcrumb {
    font-size: 11px;
    color: var(--text-dim);
    padding: 4px 12px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    font-family: var(--mono);
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .json-breadcrumb span {
    cursor: pointer;
    color: var(--cyan);
  }
  .json-breadcrumb span:hover { text-decoration: underline; }
  .json-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.65;
    background: var(--bg);
  }
  .json-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-dim);
    font-size: 14px;
  }

  /* ── JSON nodes ── */
  .jn { padding-left: 20px; }
  .jn-row {
    display: flex;
    align-items: flex-start;
    padding: 1px 12px;
    cursor: default;
    border-radius: 2px;
  }
  .jn-row:hover { background: var(--bg-hover); }
  .jn-toggle {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-dim);
    font-size: 10px;
    flex-shrink: 0;
    user-select: none;
    margin-right: 4px;
    margin-top: 2px;
    border-radius: 3px;
    transition: background 0.1s;
  }
  .jn-toggle:hover { background: var(--border); color: var(--text); }
  .jn-spacer { width: 20px; flex-shrink: 0; }
  .jn-key { color: #93c5fd; }
  .jn-colon { color: var(--text-dim); margin: 0 4px; }
  .jn-string { color: var(--green); }
  .jn-number { color: var(--cyan); }
  .jn-boolean { color: var(--gold); }
  .jn-null { color: #6b7280; font-style: italic; }
  .jn-preview { color: var(--text-dim); font-size: 11px; }
  .jn-children { overflow: hidden; }
  .jn-children.collapsed { display: none; }
  .jn-copy {
    opacity: 0;
    margin-left: 6px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-dim);
    transition: opacity 0.1s;
  }
  .jn-row:hover .jn-copy { opacity: 1; }
  .jn-copy:hover { color: var(--cyan); }
  .jn-highlight { background: rgba(255,214,10,0.15); border-radius: 2px; }
  .jn-match { background: rgba(255,214,10,0.3); padding: 0 2px; border-radius: 2px; }
  .match-count {
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .btn-sm {
    background: var(--bg-hover);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-family: var(--font);
  }
  .btn-sm:hover { color: var(--text); border-color: var(--text-dim); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #374151; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <h1>OSJ <span>Pipeline</span> Dashboard</h1>
  <div class="header-right">
    <select id="episodeSelector">
      <option value="">-- select episode --</option>
    </select>
    <span id="statusBadge" class="status-badge status-idle">IDLE</span>
  </div>
</div>

<!-- Controls -->
<div class="controls">
  <div class="control-group">
    <label>Date</label>
    <input type="date" id="dateInput">
  </div>
  <div class="control-group">
    <label>Lang</label>
    <select id="langSelect">
      <option value="fr">FR</option>
      <option value="en">EN</option>
    </select>
  </div>
  <div class="checkbox-group">
    <label><input type="checkbox" id="flagSkipFetch"> skip-fetch</label>
    <label><input type="checkbox" id="flagSkipScript"> skip-script</label>
    <label><input type="checkbox" id="flagSkipImages" checked> skip-images</label>
    <label><input type="checkbox" id="flagSkipTts" checked> skip-tts</label>
    <label><input type="checkbox" id="flagNoRender" checked> no-render</label>
  </div>
  <div class="control-group">
    <label>Start from</label>
    <select id="startFromSelect">
      <option value="">--</option>
      <option value="p1">P1</option>
      <option value="p2">P2</option>
      <option value="p3">P3</option>
      <option value="p4">P4</option>
      <option value="p5">P5</option>
      <option value="p6">P6</option>
    </select>
  </div>
  <div class="spacer"></div>
  <button class="btn btn-generate" id="btnGenerate">Generate</button>
  <button class="btn btn-stop" id="btnStop" disabled>Stop</button>
</div>

<!-- Progress bar -->
<div class="progress-bar">
  <div class="stage-wrapper" data-stage="fetch"><div class="stage-dot pending" id="dot-fetch">F</div><div class="stage-label">Fetch</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-fetch"></div></div>
  <div class="stage-wrapper" data-stage="p1"><div class="stage-dot pending" id="dot-p1">P1</div><div class="stage-label">Flag</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p1"></div></div>
  <div class="stage-wrapper" data-stage="rag"><div class="stage-dot pending" id="dot-rag">R</div><div class="stage-label">RAG</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-rag"></div></div>
  <div class="stage-wrapper" data-stage="p2"><div class="stage-dot pending" id="dot-p2">P2</div><div class="stage-label">Edit</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p2"></div></div>
  <div class="stage-wrapper" data-stage="p3"><div class="stage-dot pending" id="dot-p3">P3</div><div class="stage-label">Anal</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p3"></div></div>
  <div class="stage-wrapper" data-stage="p4"><div class="stage-dot pending" id="dot-p4">P4</div><div class="stage-label">Write</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p4"></div></div>
  <div class="stage-wrapper" data-stage="p5"><div class="stage-dot pending" id="dot-p5">P5</div><div class="stage-label">Valid</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p5"></div></div>
  <div class="stage-wrapper" data-stage="p6"><div class="stage-dot pending" id="dot-p6">P6</div><div class="stage-label">Dir</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-p6"></div></div>
  <div class="stage-wrapper" data-stage="tts"><div class="stage-dot pending" id="dot-tts">T</div><div class="stage-label">TTS</div></div>
  <div class="stage-connector"><div class="stage-line" id="line-tts"></div></div>
  <div class="stage-wrapper" data-stage="render"><div class="stage-dot pending" id="dot-render">R</div><div class="stage-label">Rend</div></div>
  <span class="elapsed" id="elapsedTime"></span>
</div>

<!-- Main -->
<div class="main">
  <!-- Log panel -->
  <div class="log-panel">
    <div class="panel-header">
      <span>Pipeline Log</span>
      <button class="btn-sm" id="btnClearLog">Clear</button>
    </div>
    <div class="log-scroll" id="logScroll"></div>
  </div>

  <!-- Data panel -->
  <div class="data-panel">
    <div class="tabs" id="tabsContainer"></div>
    <div class="json-panel">
      <div class="json-toolbar">
        <input class="json-search" id="jsonSearch" placeholder="Search keys & values... ( / )" autocomplete="off">
        <span class="match-count" id="matchCount"></span>
        <button class="btn-sm" id="btnExpandAll">Expand all</button>
        <button class="btn-sm" id="btnCollapseAll">Collapse</button>
      </div>
      <div class="json-breadcrumb" id="jsonBreadcrumb">root</div>
      <div class="json-scroll" id="jsonScroll">
        <div class="json-placeholder">Select an episode and tab to view data</div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  // ─── State ───
  let episodes = [];
  let selectedDate = '';
  let currentTab = '';
  let currentJson = null;
  let eventSource = null;
  let isRunning = false;
  let startTime = null;
  let elapsedInterval = null;
  let userScrolled = false;
  let searchMatches = [];
  let searchIndex = 0;

  const TABS = [
    { id: 'snapshot', label: 'Snapshot', source: 'snapshot' },
    { id: 'snapshot_flagged', label: 'Flagged', source: 'intermediate' },
    { id: 'editorial', label: 'Editorial', source: 'intermediate' },
    { id: 'analysis', label: 'Analysis', source: 'intermediate' },
    { id: 'episode_draft', label: 'Draft', source: 'intermediate' },
    { id: 'episode_validated', label: 'Validation', source: 'intermediate' },
    { id: 'episode_directed', label: 'Direction', source: 'intermediate' },
    { id: 'script', label: 'Script', source: 'script' },
  ];

  const STAGES = ['fetch','p1','rag','p2','p3','p4','p5','p6','tts','render'];

  // ─── DOM ───
  const $ = (id) => document.getElementById(id);
  const episodeSelector = $('episodeSelector');
  const dateInput = $('dateInput');
  const langSelect = $('langSelect');
  const startFromSelect = $('startFromSelect');
  const btnGenerate = $('btnGenerate');
  const btnStop = $('btnStop');
  const statusBadge = $('statusBadge');
  const logScroll = $('logScroll');
  const tabsContainer = $('tabsContainer');
  const jsonScroll = $('jsonScroll');
  const jsonSearch = $('jsonSearch');
  const jsonBreadcrumb = $('jsonBreadcrumb');
  const matchCount = $('matchCount');
  const elapsedEl = $('elapsedTime');

  // ─── Init ───
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  dateInput.value = yesterday.toISOString().split('T')[0];

  buildTabs();
  loadEpisodes();
  connectSSE();

  // ─── Tabs ───
  function buildTabs() {
    tabsContainer.innerHTML = '';
    TABS.forEach((tab, i) => {
      const el = document.createElement('div');
      el.className = 'tab disabled';
      el.dataset.id = tab.id;
      el.innerHTML = '<span>' + tab.label + '</span><span class="badge"></span>';
      el.addEventListener('click', () => selectTab(tab.id));
      tabsContainer.appendChild(el);
    });
  }

  function updateTabStates() {
    const ep = episodes.find(e => e.date === selectedDate);
    TABS.forEach((tab, i) => {
      const el = tabsContainer.children[i];
      let available = false;
      let size = '';
      if (!ep) {
        available = false;
      } else if (tab.source === 'snapshot') {
        available = ep.hasSnapshot;
      } else if (tab.source === 'script') {
        available = true; // try loading, will show error if missing
      } else {
        available = ep.intermediates.includes(tab.id);
      }
      el.className = 'tab' + (available ? '' : ' disabled') + (currentTab === tab.id ? ' active' : '');
      // Find size from intermediates list if available
      const badge = el.querySelector('.badge');
      if (ep && tab.source === 'intermediate') {
        const inter = ep._details && ep._details.find(d => d.name === tab.id);
        if (inter) {
          badge.textContent = formatBytes(inter.size);
        } else {
          badge.textContent = '';
        }
      } else {
        badge.textContent = '';
      }
    });
  }

  async function selectTab(id) {
    if (!selectedDate) return;
    const ep = episodes.find(e => e.date === selectedDate);
    const tab = TABS.find(t => t.id === id);
    if (!tab) return;
    currentTab = id;
    updateTabStates();

    jsonScroll.innerHTML = '<div class="json-placeholder">Loading...</div>';
    jsonBreadcrumb.textContent = 'root';
    jsonSearch.value = '';
    matchCount.textContent = '';

    try {
      let url;
      if (tab.source === 'snapshot') {
        url = '/api/episode/' + selectedDate + '/snapshot';
      } else if (tab.source === 'script') {
        url = '/api/episode/' + selectedDate + '/script';
      } else {
        url = '/api/episode/' + selectedDate + '/intermediate/' + id;
      }
      const resp = await fetch(url);
      if (!resp.ok) {
        jsonScroll.innerHTML = '<div class="json-placeholder">Not available (HTTP ' + resp.status + ')</div>';
        currentJson = null;
        return;
      }
      currentJson = await resp.json();
      renderJson(currentJson);
    } catch (e) {
      jsonScroll.innerHTML = '<div class="json-placeholder">Error: ' + e.message + '</div>';
      currentJson = null;
    }
  }

  // ─── Episodes ───
  async function loadEpisodes() {
    try {
      const resp = await fetch('/api/episodes');
      episodes = await resp.json();

      episodeSelector.innerHTML = '<option value="">-- select episode --</option>';
      episodes.forEach(ep => {
        const opt = document.createElement('option');
        opt.value = ep.date;
        opt.textContent = ep.date + (ep.intermediates.length ? ' (' + ep.intermediates.length + ' steps)' : '');
        episodeSelector.appendChild(opt);
      });

      // Load details for intermediates size info
      for (const ep of episodes) {
        loadIntermediateDetails(ep);
      }
    } catch(e) {
      console.error('Failed to load episodes', e);
    }
  }

  async function loadIntermediateDetails(ep) {
    try {
      const resp = await fetch('/api/episode/' + ep.date + '/intermediates');
      ep._details = await resp.json();
      updateTabStates();
    } catch(e) {}
  }

  episodeSelector.addEventListener('change', () => {
    selectedDate = episodeSelector.value;
    if (selectedDate) {
      dateInput.value = selectedDate;
    }
    currentTab = '';
    currentJson = null;
    jsonScroll.innerHTML = '<div class="json-placeholder">Select a tab to view data</div>';
    jsonBreadcrumb.textContent = 'root';
    updateTabStates();

    // Auto-select first available tab
    if (selectedDate) {
      const ep = episodes.find(e => e.date === selectedDate);
      if (ep) {
        for (const tab of TABS) {
          if (tab.source === 'snapshot' && ep.hasSnapshot) { selectTab(tab.id); break; }
          if (tab.source === 'intermediate' && ep.intermediates.includes(tab.id)) { selectTab(tab.id); break; }
        }
      }
    }
  });

  // ─── Generate ───
  btnGenerate.addEventListener('click', startGenerate);
  btnStop.addEventListener('click', stopGenerate);

  async function startGenerate() {
    const date = dateInput.value;
    if (!date) return alert('Please select a date');

    const flags = {
      skipFetch: $('flagSkipFetch').checked,
      skipScript: $('flagSkipScript').checked,
      skipImages: $('flagSkipImages').checked,
      skipTts: $('flagSkipTts').checked,
      noRender: $('flagNoRender').checked,
      startFrom: startFromSelect.value || undefined,
    };

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, lang: langSelect.value, flags }),
      });
      const data = await resp.json();
      if (data.error) alert(data.error);
    } catch(e) {
      alert('Failed: ' + e.message);
    }
  }

  async function stopGenerate() {
    try {
      await fetch('/api/generate/stop', { method: 'POST' });
    } catch(e) {
      alert('Failed: ' + e.message);
    }
  }

  // ─── SSE ───
  function connectSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/generate/stream');

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'status') {
        handleStatus(data.message, data.startTime);
      } else if (data.type === 'log') {
        appendLog(data.message, data.timestamp);
        detectStage(data.message);
      } else if (data.type === 'error') {
        appendLog('[ERR] ' + data.message, data.timestamp, 'error');
        detectStage('[ERR] ' + data.message);
      }
    };

    eventSource.onerror = () => {
      setTimeout(connectSSE, 3000);
    };
  }

  function handleStatus(status, st) {
    isRunning = status === 'running' || status === 'started';
    btnGenerate.disabled = isRunning;
    btnStop.disabled = !isRunning;

    // Status badge
    statusBadge.textContent = status.toUpperCase();
    statusBadge.className = 'status-badge status-' +
      (status === 'started' || status === 'running' ? 'running' :
       status === 'completed' ? 'completed' :
       status === 'stopped' ? 'stopped' :
       status.startsWith('failed') ? 'failed' : 'idle');

    if (status === 'started') {
      startTime = Date.now();
      resetStages();
      startElapsedTimer();
    } else if (status === 'completed' || status.startsWith('failed') || status === 'stopped') {
      stopElapsedTimer();
      // Reload episodes to pick up new intermediates
      setTimeout(loadEpisodes, 1000);
    }

    if (st && status === 'running') {
      startTime = st;
      startElapsedTimer();
    }
  }

  function startElapsedTimer() {
    stopElapsedTimer();
    elapsedInterval = setInterval(() => {
      if (!startTime) return;
      const secs = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      elapsedEl.textContent = m + ':' + String(s).padStart(2, '0');
    }, 500);
  }

  function stopElapsedTimer() {
    if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; }
  }

  // ─── Log ───
  logScroll.addEventListener('scroll', () => {
    const atBottom = logScroll.scrollHeight - logScroll.scrollTop - logScroll.clientHeight < 40;
    userScrolled = !atBottom;
  });

  function appendLog(message, timestamp, forceClass) {
    const div = document.createElement('div');
    div.className = 'log-line ' + (forceClass || classifyLog(message));
    const ts = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    div.innerHTML = (ts ? '<span class="log-timestamp">' + ts + '</span>' : '') + escapeHtml(message);
    logScroll.appendChild(div);
    if (!userScrolled) {
      logScroll.scrollTop = logScroll.scrollHeight;
    }
  }

  function classifyLog(msg) {
    if (/\\[ERR\\]|error|Error|ERREUR|failed|Failed/i.test(msg)) return 'error';
    if (/warn|WARN|attention/i.test(msg)) return 'warning';
    if (/\\u2705|done|DONE|OK|saved|complete|successfully/i.test(msg)) return 'success';
    if (/LLM|openrouter|anthropic|haiku|sonnet|opus|model/i.test(msg)) return 'info';
    if (/^\\s*[=-]+\\s*$/.test(msg)) return 'dim';
    return '';
  }

  $('btnClearLog').addEventListener('click', () => {
    logScroll.innerHTML = '';
  });

  // ─── Stage detection ───
  const stageStates = {};

  function resetStages() {
    STAGES.forEach(s => {
      stageStates[s] = 'pending';
      const dot = $('dot-' + s);
      if (dot) { dot.className = 'stage-dot pending'; }
      const line = $('line-' + s);
      if (line) { line.className = 'stage-line'; }
    });
  }

  function setStage(stage, state) {
    stageStates[stage] = state;
    const dot = $('dot-' + stage);
    if (dot) dot.className = 'stage-dot ' + state;

    // Update lines: previous connector gets done
    const idx = STAGES.indexOf(stage);
    if (idx > 0) {
      const prevLine = $('line-' + STAGES[idx - 1]);
      if (prevLine && (state === 'active' || state === 'done')) {
        prevLine.className = 'stage-line done';
      }
    }
  }

  function detectStage(msg) {
    // Fetch
    if (/Step 1.*Fetch|Fetching market/i.test(msg)) setStage('fetch', 'active');
    if (/snapshot saved|Loading existing snapshot/i.test(msg)) {
      setStage('fetch', 'done');
    }
    // P1 flagging
    if (/P1 .*[Ff]lag/i.test(msg) || /pipelineStep.*p1/i.test(msg)) setStage('p1', 'active');
    if (/P1.*done|snapshot_flagged.*saved|flagged/i.test(msg) && stageStates.p1 === 'active') setStage('p1', 'done');
    // RAG
    if (/RAG|knowledge|knowledge_rag|chargement.*fiches/i.test(msg)) setStage('rag', 'active');
    if (/RAG.*done|fiches.*loaded|knowledge.*OK/i.test(msg) && stageStates.rag === 'active') setStage('rag', 'done');
    // P2 editorial
    if (/P2 .*[Ee]ditorial|C1.*Haiku/i.test(msg)) setStage('p2', 'active');
    if (/P2.*done|editorial.*saved|segments/i.test(msg) && stageStates.p2 === 'active') setStage('p2', 'done');
    // P3 analysis
    if (/P3 .*[Aa]naly|C2.*Sonnet/i.test(msg)) setStage('p3', 'active');
    if (/P3.*done|analysis.*saved/i.test(msg) && stageStates.p3 === 'active') setStage('p3', 'done');
    // P4 writing
    if (/P4 .*[Ww]rit|C3.*Opus/i.test(msg)) setStage('p4', 'active');
    if (/P4.*done|draft.*saved/i.test(msg) && stageStates.p4 === 'active') setStage('p4', 'done');
    // P5 validation
    if (/P5 .*[Vv]alid|C4/i.test(msg)) setStage('p5', 'active');
    if (/P5.*done|validated.*saved/i.test(msg) && stageStates.p5 === 'active') setStage('p5', 'done');
    // P6 direction
    if (/P6 .*[Dd]irect|C5/i.test(msg)) setStage('p6', 'active');
    if (/P6.*done|directed.*saved|direction/i.test(msg) && stageStates.p6 === 'active') setStage('p6', 'done');
    // TTS
    if (/TTS|ElevenLabs|audio/i.test(msg) && !/SKIP/i.test(msg)) setStage('tts', 'active');
    if (/TTS.*done|audio.*saved/i.test(msg) && stageStates.tts === 'active') setStage('tts', 'done');
    if (/TTS SKIPPED/i.test(msg)) setStage('tts', 'done');
    // Render
    if (/[Rr]ender.*start|Remotion/i.test(msg) && !/SKIP/i.test(msg)) setStage('render', 'active');
    if (/render.*done|mp4.*saved|render.*complete/i.test(msg) && stageStates.render === 'active') setStage('render', 'done');
    if (/[Rr]ender.*SKIP/i.test(msg)) setStage('render', 'done');
    // Loaded from disk
    if (/Chargement depuis disque|loaded from disk/i.test(msg)) {
      // try to figure out which stage
      if (/flagg/i.test(msg)) setStage('p1', 'loaded');
      if (/editorial/i.test(msg)) setStage('p2', 'loaded');
      if (/analy/i.test(msg)) setStage('p3', 'loaded');
      if (/draft/i.test(msg)) setStage('p4', 'loaded');
      if (/valid/i.test(msg)) setStage('p5', 'loaded');
      if (/direct/i.test(msg)) setStage('p6', 'loaded');
    }
    // Errors
    if (/error|Error|ERREUR|failed|Failed/i.test(msg)) {
      // Mark current active stage as failed
      for (const s of STAGES) {
        if (stageStates[s] === 'active') {
          setStage(s, 'failed');
          break;
        }
      }
    }
  }

  // ─── JSON Viewer ───
  let expandedPaths = new Set();
  let allNodeEls = [];

  function renderJson(data) {
    jsonScroll.innerHTML = '';
    allNodeEls = [];
    expandedPaths.clear();
    // Auto-expand first level
    expandedPaths.add('$');
    if (data && typeof data === 'object') {
      const keys = Array.isArray(data) ? data.map((_, i) => i) : Object.keys(data);
      keys.forEach(k => expandedPaths.add('$.' + k));
    }
    const tree = buildNode('root', data, '$', 0);
    jsonScroll.appendChild(tree);
  }

  function buildNode(key, value, pathStr, depth) {
    const frag = document.createDocumentFragment();

    if (value === null || value === undefined) {
      const row = makeRow(depth);
      row.innerHTML += keySpan(key) + colonSpan() + '<span class="jn-null">null</span>' + copyBtn(value);
      registerNode(row, pathStr, key, value);
      frag.appendChild(row);
    } else if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(pathStr);
      const row = makeRow(depth);
      const toggle = makeToggle(isExpanded);
      row.appendChild(toggle);
      const label = document.createElement('span');
      label.innerHTML = keySpan(key) + colonSpan() + '<span class="jn-preview">[' + value.length + ' items]</span>' + copyBtn(value);
      row.appendChild(label);
      registerNode(row, pathStr, key, value);
      frag.appendChild(row);

      const children = document.createElement('div');
      children.className = 'jn-children' + (isExpanded ? '' : ' collapsed');

      if (isExpanded) {
        // Render only visible items for perf (lazy render on expand)
        const limit = Math.min(value.length, 500);
        for (let i = 0; i < limit; i++) {
          children.appendChild(buildNode(i, value[i], pathStr + '[' + i + ']', depth + 1));
        }
        if (value.length > 500) {
          const more = document.createElement('div');
          more.className = 'jn-row';
          more.style.paddingLeft = ((depth + 1) * 20) + 'px';
          more.innerHTML = '<span class="jn-preview">... ' + (value.length - 500) + ' more items</span>';
          children.appendChild(more);
        }
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasExpanded = !children.classList.contains('collapsed');
        if (wasExpanded) {
          children.classList.add('collapsed');
          expandedPaths.delete(pathStr);
          toggle.textContent = '\\u25B6';
        } else {
          children.classList.remove('collapsed');
          expandedPaths.add(pathStr);
          toggle.textContent = '\\u25BC';
          // Lazy render children if empty
          if (children.children.length === 0) {
            const limit = Math.min(value.length, 500);
            for (let i = 0; i < limit; i++) {
              children.appendChild(buildNode(i, value[i], pathStr + '[' + i + ']', depth + 1));
            }
          }
        }
      });

      frag.appendChild(children);
    } else if (typeof value === 'object') {
      const keys = Object.keys(value);
      const isExpanded = expandedPaths.has(pathStr);
      const row = makeRow(depth);
      const toggle = makeToggle(isExpanded);
      row.appendChild(toggle);
      const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', ...' : '');
      const label = document.createElement('span');
      label.innerHTML = keySpan(key) + colonSpan() + '<span class="jn-preview">{' + keys.length + ': ' + escapeHtml(preview) + '}</span>' + copyBtn(value);
      row.appendChild(label);
      registerNode(row, pathStr, key, value);
      frag.appendChild(row);

      const children = document.createElement('div');
      children.className = 'jn-children' + (isExpanded ? '' : ' collapsed');

      if (isExpanded) {
        keys.forEach(k => {
          children.appendChild(buildNode(k, value[k], pathStr + '.' + k, depth + 1));
        });
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasExpanded = !children.classList.contains('collapsed');
        if (wasExpanded) {
          children.classList.add('collapsed');
          expandedPaths.delete(pathStr);
          toggle.textContent = '\\u25B6';
        } else {
          children.classList.remove('collapsed');
          expandedPaths.add(pathStr);
          toggle.textContent = '\\u25BC';
          if (children.children.length === 0) {
            keys.forEach(k => {
              children.appendChild(buildNode(k, value[k], pathStr + '.' + k, depth + 1));
            });
          }
        }
      });

      frag.appendChild(children);
    } else {
      // Primitive
      const row = makeRow(depth);
      const spacer = document.createElement('span');
      spacer.className = 'jn-spacer';
      row.appendChild(spacer);
      const typeClass = typeof value === 'string' ? 'jn-string'
        : typeof value === 'number' ? 'jn-number'
        : typeof value === 'boolean' ? 'jn-boolean' : 'jn-null';
      const valStr = typeof value === 'string'
        ? '"' + escapeHtml(truncate(value, 300)) + '"'
        : String(value);
      const label = document.createElement('span');
      label.innerHTML = keySpan(key) + colonSpan() + '<span class="' + typeClass + '">' + valStr + '</span>' + copyBtn(value);
      row.appendChild(label);
      registerNode(row, pathStr, key, value);
      frag.appendChild(row);
    }

    return frag;
  }

  function makeRow(depth) {
    const div = document.createElement('div');
    div.className = 'jn-row';
    div.style.paddingLeft = (depth * 20 + 12) + 'px';
    return div;
  }

  function makeToggle(expanded) {
    const span = document.createElement('span');
    span.className = 'jn-toggle';
    span.textContent = expanded ? '\\u25BC' : '\\u25B6';
    return span;
  }

  function keySpan(key) {
    return '<span class="jn-key">' + escapeHtml(String(key)) + '</span>';
  }
  function colonSpan() {
    return '<span class="jn-colon">:</span> ';
  }
  function copyBtn(value) {
    return ' <span class="jn-copy" title="Copy value" onclick="navigator.clipboard.writeText(JSON.stringify(' +
      escapeAttr(JSON.stringify(value)) + ', null, 2)); this.textContent=\\'copied!\\'; setTimeout(()=>this.textContent=\\'[cp]\\', 800);">[cp]</span>';
  }

  function registerNode(el, pathStr, key, value) {
    el.dataset.path = pathStr;
    el.dataset.key = String(key);
    allNodeEls.push(el);
    // Breadcrumb on click
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('jn-toggle') || e.target.classList.contains('jn-copy')) return;
      updateBreadcrumb(pathStr);
    });
  }

  function updateBreadcrumb(pathStr) {
    const parts = pathStr.replace(/\\[/g, '.').replace(/\\]/g, '').split('.').filter(Boolean);
    let html = '';
    let accum = '';
    parts.forEach((p, i) => {
      accum += (i === 0 ? '' : '.') + p;
      const sep = i > 0 ? ' > ' : '';
      html += sep + '<span data-path="' + escapeAttr(accum) + '">' + escapeHtml(p) + '</span>';
    });
    jsonBreadcrumb.innerHTML = html;
    // Click breadcrumb to navigate
    jsonBreadcrumb.querySelectorAll('span').forEach(span => {
      span.addEventListener('click', () => {
        const target = jsonScroll.querySelector('[data-path="' + span.dataset.path + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // ─── Search ───
  let searchTimeout;
  jsonSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 200);
  });

  function performSearch() {
    const query = jsonSearch.value.trim().toLowerCase();
    // Clear previous highlights
    jsonScroll.querySelectorAll('.jn-highlight').forEach(el => el.classList.remove('jn-highlight'));
    searchMatches = [];
    searchIndex = 0;

    if (!query || !currentJson) {
      matchCount.textContent = '';
      return;
    }

    // Search through rendered nodes
    allNodeEls.forEach(el => {
      const key = (el.dataset.key || '').toLowerCase();
      const text = el.textContent.toLowerCase();
      if (key.includes(query) || text.includes(query)) {
        searchMatches.push(el);
      }
    });

    // Also search in non-rendered (collapsed) parts — expand path to them
    const paths = findInJson(currentJson, query, '$');
    paths.forEach(p => {
      expandToPath(p);
    });

    // Re-scan after expansion
    setTimeout(() => {
      searchMatches = [];
      allNodeEls.forEach(el => {
        const key = (el.dataset.key || '').toLowerCase();
        const text = el.textContent.toLowerCase();
        if (key.includes(query) || text.includes(query)) {
          el.classList.add('jn-highlight');
          searchMatches.push(el);
        }
      });
      matchCount.textContent = searchMatches.length + ' matches';
      if (searchMatches.length > 0) {
        searchMatches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function findInJson(obj, query, pathStr, results, maxResults) {
    results = results || [];
    maxResults = maxResults || 50;
    if (results.length >= maxResults) return results;
    if (obj === null || obj === undefined) return results;
    if (typeof obj === 'string' && obj.toLowerCase().includes(query)) {
      results.push(pathStr);
    } else if (typeof obj === 'number' && String(obj).includes(query)) {
      results.push(pathStr);
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length && results.length < maxResults; i++) {
        findInJson(obj[i], query, pathStr + '[' + i + ']', results, maxResults);
      }
    } else if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (results.length >= maxResults) break;
        if (k.toLowerCase().includes(query)) results.push(pathStr + '.' + k);
        findInJson(obj[k], query, pathStr + '.' + k, results, maxResults);
      }
    }
    return results;
  }

  function expandToPath(pathStr) {
    // Expand each parent path
    const parts = [];
    let current = '$';
    const segments = pathStr.slice(2).split(/\\.|(?=\\[)/);
    for (const seg of segments) {
      if (seg.startsWith('[')) {
        current += seg;
      } else if (seg) {
        current += '.' + seg;
      }
      parts.push(current);
    }
    let needsRerender = false;
    for (const p of parts) {
      if (!expandedPaths.has(p)) {
        expandedPaths.add(p);
        needsRerender = true;
      }
    }
    if (needsRerender && currentJson) {
      renderJson(currentJson);
    }
  }

  // Expand/Collapse all
  $('btnExpandAll').addEventListener('click', () => {
    if (!currentJson) return;
    expandAll(currentJson, '$');
    renderJson(currentJson);
  });

  $('btnCollapseAll').addEventListener('click', () => {
    if (!currentJson) return;
    expandedPaths.clear();
    expandedPaths.add('$');
    renderJson(currentJson);
  });

  function expandAll(obj, pathStr, depth) {
    depth = depth || 0;
    if (depth > 4) return; // limit depth to avoid huge trees
    expandedPaths.add(pathStr);
    if (Array.isArray(obj)) {
      const limit = Math.min(obj.length, 100);
      for (let i = 0; i < limit; i++) {
        const p = pathStr + '[' + i + ']';
        if (obj[i] && typeof obj[i] === 'object') expandAll(obj[i], p, depth + 1);
      }
    } else if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const p = pathStr + '.' + k;
        if (obj[k] && typeof obj[k] === 'object') expandAll(obj[k], p, depth + 1);
      }
    }
  }

  // ─── Keyboard shortcuts ───
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter: generate
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (!btnGenerate.disabled) btnGenerate.click();
    }
    // Escape: stop
    if (e.key === 'Escape') {
      if (!btnStop.disabled) btnStop.click();
    }
    // / : focus search (when not in input)
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
      e.preventDefault();
      jsonSearch.focus();
    }
    // 1-9: switch tabs
    if (e.key >= '1' && e.key <= '9' && document.activeElement.tagName !== 'INPUT') {
      const idx = parseInt(e.key) - 1;
      if (TABS[idx]) selectTab(TABS[idx].id);
    }
  });

  // ─── Helpers ───
  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(s) {
    return String(s).replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + '...' : s;
  }
  function formatBytes(b) {
    if (b < 1024) return b + 'B';
    if (b < 1048576) return (b / 1024).toFixed(1) + 'K';
    return (b / 1048576).toFixed(1) + 'M';
  }
})();
</script>
</body>
</html>`;
}
