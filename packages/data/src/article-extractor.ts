/**
 * Article content extraction — enrichit les NewsItem qui n'ont pas de summary.
 *
 * Utilise @extractus/article-extractor pour extraire le contenu
 * depuis l'URL de l'article. Rate-limited à 1 req/sec.
 *
 * Usage:
 *   const enriched = await enrichNewsSummaries(news);
 */

import type { NewsItem } from "@yt-maker/core";

// Lazy import pour ne pas alourdir le bundle si non utilisé
let extractModule: any = null;
async function loadExtractor() {
  if (!extractModule) {
    extractModule = await import("@extractus/article-extractor");
  }
  return extractModule;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Truncate to first N chars on sentence boundary */
function truncateToSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastDot = cut.lastIndexOf(".");
  const lastExcl = cut.lastIndexOf("!");
  const lastQ = cut.lastIndexOf("?");
  const lastSentence = Math.max(lastDot, lastExcl, lastQ);
  if (lastSentence > maxLen * 0.4) return cut.slice(0, lastSentence + 1);
  return cut + "…";
}

/**
 * Enrichit les NewsItem sans summary en extrayant le contenu de l'URL.
 *
 * @param news - Articles à enrichir
 * @param options - Configuration
 * @returns Les mêmes articles avec summary enrichi quand possible
 */
export async function enrichNewsSummaries(
  news: NewsItem[],
  options?: {
    /** Max articles à extraire (default 30) */
    maxExtract?: number;
    /** Longueur max du summary extrait (default 400 chars) */
    maxSummaryLen?: number;
    /** Délai entre requêtes en ms (default 1000) */
    delayMs?: number;
    /** Min chars pour considérer un summary comme valide (default 50) */
    minSummaryLen?: number;
  },
): Promise<NewsItem[]> {
  const maxExtract = options?.maxExtract ?? 30;
  const maxLen = options?.maxSummaryLen ?? 400;
  const delay = options?.delayMs ?? 1000;
  const minLen = options?.minSummaryLen ?? 50;

  // Filtrer les articles qui ont besoin d'enrichissement
  const needsEnrich = news.filter(
    (n) => !n.summary || n.summary.length < minLen,
  );

  if (needsEnrich.length === 0) {
    console.log("  Article extractor: all news already have summaries");
    return news;
  }

  const toProcess = needsEnrich.slice(0, maxExtract);
  console.log(
    `  Article extractor: enriching ${toProcess.length}/${needsEnrich.length} articles without summary...`,
  );

  const { extract } = await loadExtractor();
  let enriched = 0;
  let failed = 0;

  for (const item of toProcess) {
    try {
      // Timeout: 8s max par article (évite les URLs qui pendent)
      const article = await Promise.race([
        extract(item.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }),
        sleep(8000).then(() => null),
      ]);

      if (article?.content) {
        // Strip HTML from extracted content
        const text = article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > minLen) {
          item.summary = truncateToSentence(text, maxLen);
          enriched++;
        }
      } else if (article?.description && article.description.length > minLen) {
        item.summary = truncateToSentence(article.description, maxLen);
        enriched++;
      }
    } catch (err) {
      failed++;
      console.warn(`    ✗ ${item.source}: ${(err as Error).message?.slice(0, 60) ?? 'unknown error'}`);
    }

    // Rate limit
    await sleep(delay);
  }

  console.log(
    `  Article extractor: ${enriched} enriched, ${failed} failed, ${toProcess.length - enriched - failed} no content`,
  );

  return news;
}
