/**
 * Re-tag all articles in NewsMemory DB with current tagger rules.
 * Does NOT re-fetch — just clears old tags and re-applies current rules.
 *
 * Usage: npx tsx scripts/retag-news.ts [--dry-run]
 */
import Database from "better-sqlite3";
import * as path from "path";
import { initTagger, tagArticleAuto } from "../packages/ai/src/memory/news-tagger";

const dryRun = process.argv.includes("--dry-run");
const dbPath = path.resolve("data", "news-memory.db");
const db = new Database(dbPath);

// Load all articles
const articles = db.prepare(`
  SELECT id, title, source, feed_url, summary
  FROM articles
  ORDER BY id
`).all() as Array<{ id: number; title: string; source: string; feed_url: string | null; summary: string | null }>;

console.log(`Articles in DB: ${articles.length}`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

// Count old tags
const oldAssetTags = db.prepare("SELECT COUNT(*) as c FROM article_assets").get() as { c: number };
const oldThemeTags = db.prepare("SELECT COUNT(*) as c FROM article_themes").get() as { c: number };
console.log(`Old tags: ${oldAssetTags.c} asset tags, ${oldThemeTags.c} theme tags`);

// Init tagger with current rules
initTagger();

// Re-tag all articles
let newAssetCount = 0;
let newThemeCount = 0;

const insertAsset = db.prepare(`
  INSERT OR IGNORE INTO article_assets (article_id, asset_symbol, sentiment, confidence, source_layer)
  VALUES (?, ?, ?, ?, ?)
`);
const insertTheme = db.prepare(`
  INSERT OR IGNORE INTO article_themes (article_id, theme)
  VALUES (?, ?)
`);

const retagAll = db.transaction(() => {
  // Clear old tags
  db.prepare("DELETE FROM article_assets").run();
  db.prepare("DELETE FROM article_themes").run();

  for (const article of articles) {
    const tags = tagArticleAuto({
      title: article.title,
      summary: article.summary ?? undefined,
      source: article.source,
      feed_url: article.feed_url ?? undefined,
    });

    for (const asset of tags.assets) {
      insertAsset.run(article.id, asset.symbol, asset.sentiment ?? null, asset.confidence, asset.source_layer);
      newAssetCount++;
    }
    for (const theme of tags.themes) {
      insertTheme.run(article.id, theme);
      newThemeCount++;
    }
  }
});

if (dryRun) {
  // Dry run: tag everything but don't commit
  for (const article of articles) {
    const tags = tagArticleAuto({
      title: article.title,
      summary: article.summary ?? undefined,
      source: article.source,
      feed_url: article.feed_url ?? undefined,
    });
    newAssetCount += tags.assets.length;
    newThemeCount += tags.themes.length;
  }
  console.log(`\nDry run result: would produce ${newAssetCount} asset tags, ${newThemeCount} theme tags`);
  console.log(`Delta: asset tags ${newAssetCount - oldAssetTags.c} (${oldAssetTags.c} → ${newAssetCount}), theme tags ${newThemeCount - oldThemeTags.c} (${oldThemeTags.c} → ${newThemeCount})`);

  // Show specific cleanup
  const oldDE = db.prepare("SELECT COUNT(*) as c FROM article_assets WHERE asset_symbol = 'DE'").get() as { c: number };
  const oldCE = db.prepare("SELECT COUNT(*) as c FROM article_assets WHERE asset_symbol = 'CE'").get() as { c: number };
  console.log(`\nWould remove: DE=${oldDE.c} tags, CE=${oldCE.c} tags`);
} else {
  retagAll();
  console.log(`\nDone! New tags: ${newAssetCount} asset tags, ${newThemeCount} theme tags`);
  console.log(`Delta: asset tags ${newAssetCount - oldAssetTags.c} (${oldAssetTags.c} → ${newAssetCount}), theme tags ${newThemeCount - oldThemeTags.c} (${oldThemeTags.c} → ${newThemeCount})`);

  // Verify
  const newDE = db.prepare("SELECT COUNT(*) as c FROM article_assets WHERE asset_symbol = 'DE'").get() as { c: number };
  const newCE = db.prepare("SELECT COUNT(*) as c FROM article_assets WHERE asset_symbol = 'CE'").get() as { c: number };
  console.log(`\nVerify: DE=${newDE.c} tags (was 879), CE=${newCE.c} tags (was 66)`);
}

db.close();
