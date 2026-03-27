// ── Knowledge Chunk Ranker ────────────────────────────────
// Uses Haiku (role: 'fast') to rank the top 12-15 most relevant
// knowledge chunks for today's episode. Falls back to score-based
// ordering if LLM fails.

import { generateStructuredJSON } from "../llm-client";
import type { ScoredChunk, ChunkMeta } from "./chunk-types";

interface RankingResult {
  selected: string[]; // chunk IDs in order of relevance
}

/**
 * Use Haiku to rank the top 12-15 most relevant chunks for today's episode.
 * Falls back to score-based ordering if LLM fails.
 *
 * @param candidates - Pre-scored chunk candidates from knowledge-matcher (sorted by score desc)
 * @param chunkIndex - Full chunk metadata list for title lookups
 * @param snapshotSummary - ~200 word summary of today's market context
 * @returns Ordered array of chunk IDs (12-15 items)
 */
export async function rankChunksWithLLM(
  candidates: ScoredChunk[],
  chunkIndex: ChunkMeta[],
  snapshotSummary: string,
): Promise<string[]> {
  // 1. Take top 35 candidates (already sorted by score)
  const top = candidates.slice(0, 35);

  if (top.length === 0) return [];

  // If 15 or fewer, no need to rank — return as-is
  if (top.length <= 15) {
    return top.map((c) => c.id);
  }

  // 2. Build compact list: id | title | score
  const metaMap = new Map(chunkIndex.map((m) => [m.id, m]));
  const listLines = top.map((c) => {
    const meta = metaMap.get(c.id);
    const title = meta?.title ?? c.id;
    return `${c.id} | ${title} | ${c.score}`;
  });

  // 3. Call Haiku
  const systemPrompt = [
    "Tu es un éditeur financier.",
    "Sélectionne les 12-15 fiches de connaissance les PLUS pertinentes pour enrichir l'analyse du jour.",
    "Critères : causalité (pourquoi ça bouge), contexte historique, patterns institutionnels, profils d'assets concernés.",
    "Exclus les fiches redondantes.",
    "Retourne un JSON.",
  ].join(" ");

  const userMessage = [
    "## Résumé du jour",
    snapshotSummary,
    "",
    "## Fiches disponibles (id | titre | score pertinence)",
    ...listLines,
    "",
    'Retourne: { "selected": ["id1", "id2", ...] } — 12 à 15 fiches, par ordre d\'importance.',
  ].join("\n");

  try {
    const result = await generateStructuredJSON<RankingResult>(
      systemPrompt,
      userMessage,
      { role: "fast", maxTokens: 1024 },
    );

    // Validate: only keep IDs that exist in candidates
    const candidateIds = new Set(top.map((c) => c.id));
    const validated = (result.selected ?? []).filter((id) =>
      candidateIds.has(id),
    );

    if (validated.length >= 8) {
      return validated;
    }

    // Too few valid IDs — fall through to fallback
    console.warn(
      `  Knowledge ranker: Haiku returned only ${validated.length} valid IDs, falling back to score`,
    );
  } catch (err) {
    console.warn(
      `  Knowledge ranker: LLM failed, falling back to score-based ordering`,
      err instanceof Error ? err.message : err,
    );
  }

  // 4. Fallback: return top 15 by score
  return top.slice(0, 15).map((c) => c.id);
}
