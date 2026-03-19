import Database from "better-sqlite3";

const db = new Database("data/news-memory.db");

// Direct SQL to check NVDA tags
const nvdaTags = db.prepare("SELECT COUNT(*) as n FROM article_assets WHERE asset_symbol = 'NVDA'").get() as any;
console.log("NVDA tags total:", nvdaTags.n);

// Check articles with nvidia in title
const nvdaArticles = db.prepare(
  "SELECT a.id, a.published_at, a.title, a.source FROM articles a WHERE LOWER(a.title) LIKE '%nvidia%' OR LOWER(a.title) LIKE '%nvda%' OR LOWER(a.title) LIKE '%jensen huang%' ORDER BY a.published_at DESC LIMIT 15"
).all() as any[];
console.log(`\nArticles mentionnant nvidia/NVDA/Jensen Huang: ${nvdaArticles.length}`);
for (const a of nvdaArticles) {
  console.log(`  ${a.published_at.split("T")[0]} ${a.title.slice(0, 120)} (${a.source})`);
}

// Check if those articles are tagged NVDA
if (nvdaArticles.length > 0) {
  console.log("\nTags for these articles:");
  for (const article of nvdaArticles.slice(0, 8)) {
    const tags = db.prepare(
      "SELECT asset_symbol, source_layer, confidence FROM article_assets WHERE article_id = ?"
    ).all(article.id) as any[];
    const themes = db.prepare(
      "SELECT theme FROM article_themes WHERE article_id = ?"
    ).all(article.id) as any[];
    console.log(
      `  [${article.published_at.split("T")[0]}] "${article.title.slice(0, 80)}"`
    );
    console.log(
      `    Assets: ${tags.map((t: any) => `${t.asset_symbol}(L${t.source_layer})`).join(", ") || "AUCUN"}`
    );
    console.log(
      `    Themes: ${themes.map((t: any) => t.theme).join(", ") || "AUCUN"}`
    );
  }
}

db.close();
