import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fetchNews } from "@yt-maker/data";

async function main() {
  const path = join(process.cwd(), "data", "snapshot-2026-03-10.json");
  const snap = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`Current news: ${snap.news.length}`);

  const date = "2026-03-10";
  console.log("Re-fetching RSS news...");
  const rssNews = await fetchNews(date);
  console.log(`RSS: ${rssNews.length} articles`);

  if (rssNews.length > snap.news.length) {
    // Merge: keep existing (may have Finnhub/Marketaux), add new RSS
    const seenTitles = new Set(snap.news.map((n: any) => n.title.toLowerCase().trim()));
    let added = 0;
    for (const n of rssNews) {
      const key = n.title.toLowerCase().trim();
      if (!seenTitles.has(key)) {
        snap.news.push(n);
        seenTitles.add(key);
        added++;
      }
    }
    // Re-sort by date
    snap.news.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    console.log(`Added ${added} new articles → total: ${snap.news.length}`);
    writeFileSync(path, JSON.stringify(snap, null, 2));
    console.log("Saved.");
  } else {
    console.log("No improvement, keeping current.");
  }
}
main().catch(console.error);
