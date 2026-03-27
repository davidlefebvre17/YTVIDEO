// ── Knowledge Briefing Assembly ───────────────────────────
// Main entry point: loads chunk index, matches, ranks via Haiku,
// and assembles a token-budgeted markdown briefing for injection
// into the writing prompt (P4).

import * as fs from "fs";
import * as path from "path";
import type { ChunkIndex, ChunkMeta } from "./chunk-types";
import { matchChunks } from "./knowledge-matcher";
import { rankChunksWithLLM } from "./knowledge-ranker";
import type { SnapshotFlagged, EditorialPlan } from "../pipeline/types";
import type { PoliticalTrigger } from "../pipeline/helpers/briefing-pack";
import type { DailySnapshot } from "@yt-maker/core";

const CHUNKS_DIR = path.resolve(__dirname, "chunks");

// ── Cache ────────────────────────────────────────────────

let _index: ChunkIndex | null = null;
let _chunkContents: Map<string, string> | null = null;

function loadChunkIndex(): ChunkIndex {
  if (_index) return _index;
  const raw = fs.readFileSync(path.join(CHUNKS_DIR, "index.json"), "utf-8");
  _index = JSON.parse(raw) as ChunkIndex;
  return _index;
}

/**
 * Strip YAML frontmatter from a chunk .md file.
 * Frontmatter is enclosed between the first `---` (line 1) and the next `---`.
 * Returns the content after the second `---` marker, trimmed.
 */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw.trim();

  const secondMarker = raw.indexOf("---", 3);
  if (secondMarker === -1) return raw.trim();

  return raw.slice(secondMarker + 3).trim();
}

function loadChunkContent(id: string): string {
  const index = loadChunkIndex();
  const meta = index.chunks.find((c) => c.id === id);
  const filename = meta?.file ?? `${id}.md`;
  const filePath = path.join(CHUNKS_DIR, filename);

  if (!fs.existsSync(filePath)) return "";

  const raw = fs.readFileSync(filePath, "utf-8");
  return stripFrontmatter(raw);
}

function loadAllChunkContents(): Map<string, string> {
  if (_chunkContents) return _chunkContents;

  const index = loadChunkIndex();
  const contents = new Map<string, string>();

  for (const chunk of index.chunks) {
    const filePath = path.join(CHUNKS_DIR, chunk.file);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const content = stripFrontmatter(raw);
    if (content) {
      contents.set(chunk.id, content);
    }
  }

  _chunkContents = contents;
  return contents;
}

/** Reset caches (useful for tests) */
export function resetKnowledgeCache(): void {
  _index = null;
  _chunkContents = null;
}

// ── Snapshot summary builder ─────────────────────────────

function buildSnapshotSummary(
  flagged: SnapshotFlagged,
  editorial: EditorialPlan,
): string {
  const lines: string[] = [];

  // Date
  lines.push(`Date: ${flagged.date}`);

  // Top 5 movers by materiality score
  const topMovers = [...flagged.assets]
    .sort((a, b) => b.materialityScore - a.materialityScore)
    .slice(0, 5);

  lines.push(
    "Top movers: " +
      topMovers
        .map(
          (a) =>
            `${a.symbol} ${a.changePct >= 0 ? "+" : ""}${a.changePct.toFixed(1)}% [${a.flags.join(",")}]`,
        )
        .join(" | "),
  );

  // Editorial mood + dominant theme
  lines.push(`Mood: ${editorial.moodMarche} | Thème: ${editorial.dominantTheme}`);

  // Segments planned
  const segmentSummary = editorial.segments
    .map((s) => `${s.id}(${s.depth},${s.assets.join("+")})`)
    .join(", ");
  lines.push(`Segments: ${segmentSummary}`);

  // Key events from calendar
  const highImpactEvents = flagged.events.filter(
    (e) => e.impact === "high" || e.impact === "medium",
  );
  if (highImpactEvents.length > 0) {
    lines.push(
      "Events: " +
        highImpactEvents
          .slice(0, 5)
          .map((e) => `${e.name} (${e.impact})`)
          .join(", "),
    );
  }

  // Active political triggers from segments
  const triggers = editorial.segments
    .filter((s) => s.trigger)
    .map((s) => `${s.trigger!.actor}: ${s.trigger!.action}`)
    .slice(0, 3);
  if (triggers.length > 0) {
    lines.push("Triggers: " + triggers.join(" | "));
  }

  // Cold open fact
  if (editorial.coldOpenFact) {
    lines.push(`Cold open: ${editorial.coldOpenFact}`);
  }

  return lines.join("\n");
}

// ── Token estimation ─────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// ── Main entry point ─────────────────────────────────────

/**
 * Load knowledge briefing for the episode.
 * 1. Match chunks deterministically (code-only scoring)
 * 2. Rank top candidates with Haiku (LLM)
 * 3. Assemble token-budgeted markdown briefing
 *
 * @param flagged - P1 output: assets with materiality flags
 * @param editorial - P2 output: editorial plan with segments
 * @param snapshot - Raw daily snapshot for additional context
 * @param actors - Detected political triggers (from briefing pack)
 * @returns Markdown string ready for injection into P4 writing prompt
 */
export async function loadKnowledgeBriefing(
  flagged: SnapshotFlagged,
  editorial: EditorialPlan,
  snapshot: DailySnapshot,
  actors?: PoliticalTrigger[],
): Promise<string> {
  // 1. Load index
  const index = loadChunkIndex();

  // 2. Match chunks (deterministic, code-only)
  const candidates = matchChunks(flagged, editorial, snapshot, actors);
  console.log(
    `  Knowledge: ${candidates.length} candidates (top score: ${candidates[0]?.score ?? 0})`,
  );

  if (candidates.length === 0) return "";

  // 3. Rank with Haiku
  const summary = buildSnapshotSummary(flagged, editorial);
  const rankedIds = await rankChunksWithLLM(candidates, index.chunks, summary);
  console.log(`  Knowledge: ${rankedIds.length} selected by Haiku`);

  // 4. Assemble briefing (token budget: ~3500 tokens ≈ ~2700 words)
  const contents = loadAllChunkContents();
  const metaMap = new Map(index.chunks.map((c) => [c.id, c]));
  let briefing = "";
  let tokenBudget = 3500;
  let included = 0;

  for (const id of rankedIds) {
    const content = contents.get(id);
    if (!content) continue;

    const tokens = estimateTokens(content);

    // Stop if over budget, but guarantee at least 8 chunks
    if (tokenBudget - tokens < 0 && included >= 8) break;

    const meta = metaMap.get(id);
    briefing += `### ${meta?.title ?? id}\n${content}\n\n`;
    tokenBudget -= tokens;
    included++;
  }

  return briefing
    ? `## Contexte fondamental du jour\n\n${briefing}`
    : "";
}
