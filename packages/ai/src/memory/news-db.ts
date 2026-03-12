import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import {
  StoredArticle,
  NewsTags,
  EconomicEvent,
  MacroTheme,
  AssetTag,
} from "./types";

// ============================================================
// URL Normalization (section 11.4)
// ============================================================

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Supprimer les tracking params courants
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_content");
    u.searchParams.delete("ref");
    u.searchParams.delete("mod");
    return u.toString();
  } catch {
    return url;
  }
}

// ============================================================
// NewsMemoryDB — SQLite Wrapper
// ============================================================

export class NewsMemoryDB {
  private db: Database.Database;
  private insertArticleStmt: Database.Statement;
  private insertAssetTagStmt: Database.Statement;
  private insertThemeTagStmt: Database.Statement;
  private insertAuditStmt: Database.Statement;
  private searchByAssetStmt: Database.Statement;
  private searchByThemeStmt: Database.Statement;
  private searchFtsStmt: Database.Statement;
  private highImpactStmt: Database.Statement;
  private countByThemeStmt: Database.Statement;
  private countByAssetStmt: Database.Statement;
  private upsertEcoEventStmt: Database.Statement;
  private getEcoEventsStmt: Database.Statement;
  private purgeOldStmt: Database.Statement;
  private statsArticlesStmt: Database.Statement;
  private statsAssetTagsStmt: Database.Statement;
  private statsThemeTagsStmt: Database.Statement;
  private statsEcoEventsStmt: Database.Statement;

  constructor(dbPath: string = "data/news-memory.db") {
    // Créer le répertoire si nécessaire
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.initSchema();

    // Préparer les statements fréquents
    this.insertArticleStmt = this.db.prepare(`
      INSERT OR IGNORE INTO articles
        (title, source, feed_url, url, published_at, summary, lang, category, impact, snapshot_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.insertAssetTagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO article_assets
        (article_id, asset_symbol, sentiment, confidence, source_layer)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.insertThemeTagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO article_themes (article_id, theme)
      VALUES (?, ?)
    `);

    this.insertAuditStmt = this.db.prepare(`
      INSERT OR REPLACE INTO tagging_audit (article_id, rules_matched)
      VALUES (?, ?)
    `);

    this.searchByAssetStmt = this.db.prepare(`
      SELECT DISTINCT
        a.id, a.title, a.source, a.feed_url, a.url, a.published_at,
        a.summary, a.lang, a.category, a.impact, a.snapshot_date,
        aa.sentiment, aa.confidence
      FROM articles a
      JOIN article_assets aa ON a.id = aa.article_id
      WHERE aa.asset_symbol = ?
        AND a.published_at > datetime('now', '-' || ? || ' days')
      ORDER BY a.published_at DESC
      LIMIT ?
    `);

    this.searchByThemeStmt = this.db.prepare(`
      SELECT DISTINCT
        a.id, a.title, a.source, a.feed_url, a.url, a.published_at,
        a.summary, a.lang, a.category, a.impact, a.snapshot_date
      FROM articles a
      JOIN article_themes at ON a.id = at.article_id
      WHERE at.theme = ?
        AND a.published_at > datetime('now', '-' || ? || ' days')
      ORDER BY a.published_at DESC
      LIMIT ?
    `);

    this.searchFtsStmt = this.db.prepare(`
      SELECT
        a.id, a.title, a.source, a.feed_url, a.url, a.published_at,
        a.summary, a.lang, a.category, a.impact, a.snapshot_date
      FROM articles a
      WHERE a.id IN (
        SELECT af.rowid FROM articles_fts af
        WHERE articles_fts MATCH ?
      )
      AND a.published_at > datetime('now', '-' || ? || ' days')
      ORDER BY a.published_at DESC
      LIMIT ?
    `);

    this.highImpactStmt = this.db.prepare(`
      SELECT
        id, title, source, feed_url, url, published_at,
        summary, lang, category, impact, snapshot_date
      FROM articles
      WHERE impact = 'high'
        AND published_at > datetime('now', '-' || ? || ' days')
      ORDER BY published_at DESC
      LIMIT ?
    `);

    this.countByThemeStmt = this.db.prepare(`
      SELECT at.theme, COUNT(*) as count
      FROM article_themes at
      JOIN articles a ON at.article_id = a.id
      WHERE a.published_at > datetime('now', '-' || ? || ' days')
      GROUP BY at.theme
      ORDER BY count DESC
    `);

    this.countByAssetStmt = this.db.prepare(`
      SELECT aa.asset_symbol as symbol, COUNT(*) as count
      FROM article_assets aa
      JOIN articles a ON aa.article_id = a.id
      WHERE a.published_at > datetime('now', '-' || ? || ' days')
      GROUP BY aa.asset_symbol
      ORDER BY count DESC
      LIMIT ?
    `);

    this.upsertEcoEventStmt = this.db.prepare(`
      INSERT OR REPLACE INTO economic_events
        (id, name, currency, event_date, strength, forecast, previous, actual, outcome, source, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    this.getEcoEventsStmt = this.db.prepare(`
      SELECT
        id, name, currency, event_date, strength, forecast, previous,
        actual, outcome, source, synced_at
      FROM economic_events
      WHERE event_date BETWEEN ? AND ?
    `);

    this.purgeOldStmt = this.db.prepare(`
      DELETE FROM articles
      WHERE published_at < datetime('now', '-' || ? || ' days')
    `);

    this.statsArticlesStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM articles"
    );
    this.statsAssetTagsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM article_assets"
    );
    this.statsThemeTagsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM article_themes"
    );
    this.statsEcoEventsStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM economic_events"
    );
  }

  // ============================================================
  // SCHEMA INITIALIZATION
  // ============================================================

  private initSchema(): void {
    this.db.exec(`
      -- ============================================================
      -- NEWS ARTICLES
      -- ============================================================
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        feed_url TEXT,
        url TEXT UNIQUE NOT NULL,
        published_at TEXT NOT NULL,
        summary TEXT,
        lang TEXT,
        category TEXT,
        impact TEXT,
        snapshot_date TEXT,
        ingested_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_articles_impact ON articles(impact);
      CREATE INDEX IF NOT EXISTS idx_articles_snapshot ON articles(snapshot_date);

      -- FTS5 pour recherche full-text
      CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
        title, summary,
        content=articles,
        content_rowid=id,
        tokenize='porter unicode61'
      );

      -- Triggers pour sync FTS5 ↔ articles
      CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
        INSERT INTO articles_fts(rowid, title, summary)
        VALUES (new.id, new.title, new.summary);
      END;

      CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
        INSERT INTO articles_fts(articles_fts, rowid, title, summary)
        VALUES ('delete', old.id, old.title, old.summary);
      END;

      -- ============================================================
      -- TAGS : ASSETS
      -- ============================================================
      CREATE TABLE IF NOT EXISTS article_assets (
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        asset_symbol TEXT NOT NULL,
        sentiment TEXT,
        confidence TEXT NOT NULL,
        source_layer INTEGER NOT NULL,
        PRIMARY KEY (article_id, asset_symbol)
      );

      CREATE INDEX IF NOT EXISTS idx_article_assets_symbol ON article_assets(asset_symbol);
      CREATE INDEX IF NOT EXISTS idx_article_assets_sentiment ON article_assets(sentiment);

      -- ============================================================
      -- TAGS : THEMES
      -- ============================================================
      CREATE TABLE IF NOT EXISTS article_themes (
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        theme TEXT NOT NULL,
        PRIMARY KEY (article_id, theme)
      );

      CREATE INDEX IF NOT EXISTS idx_article_themes_theme ON article_themes(theme);

      -- ============================================================
      -- ECONOMIC EVENTS (sync Supabase → SQLite)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS economic_events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT,
        event_date TEXT NOT NULL,
        strength TEXT,
        forecast REAL,
        previous REAL,
        actual REAL,
        outcome TEXT,
        source TEXT DEFAULT 'forexfactory',
        synced_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_eco_events_date ON economic_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_eco_events_currency ON economic_events(currency);
      CREATE INDEX IF NOT EXISTS idx_eco_events_strength ON economic_events(strength);

      -- ============================================================
      -- DEBUG / AUDIT
      -- ============================================================
      CREATE TABLE IF NOT EXISTS tagging_audit (
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        rules_matched TEXT NOT NULL,
        tagged_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (article_id)
      );
    `);
  }

  // ============================================================
  // INGEST
  // ============================================================

  /**
   * Stocke un article + ses tags. Ignore les doublons (url UNIQUE).
   * Retourne l'id ou null si doublon.
   */
  storeArticle(article: StoredArticle, tags: NewsTags): number | null {
    const normalizedUrl = normalizeUrl(article.url);

    // INSERT article
    const insertResult = this.insertArticleStmt.run(
      article.title,
      article.source,
      article.feed_url || null,
      normalizedUrl,
      article.published_at,
      article.summary || null,
      article.lang || null,
      article.category || null,
      tags.impact,
      article.snapshot_date || null
    );

    // Si l'insertion a échoué (doublon), retourner null
    if (insertResult.changes === 0) {
      return null;
    }

    const articleId = insertResult.lastInsertRowid as number;

    // INSERT asset tags
    for (const assetTag of tags.assets) {
      this.insertAssetTagStmt.run(
        articleId,
        assetTag.symbol,
        assetTag.sentiment || null,
        assetTag.confidence,
        assetTag.source_layer
      );
    }

    // INSERT theme tags
    for (const theme of tags.themes) {
      this.insertThemeTagStmt.run(articleId, theme);
    }

    // INSERT audit
    this.insertAuditStmt.run(articleId, JSON.stringify(tags.rules_matched));

    return articleId;
  }

  /**
   * Stocke plusieurs articles en transaction.
   * Retourne le nombre d'articles réellement insérés.
   */
  storeArticles(
    articles: Array<{ article: StoredArticle; tags: NewsTags }>
  ): number {
    let inserted = 0;

    const insertTx = this.db.transaction(() => {
      for (const { article, tags } of articles) {
        const id = this.storeArticle(article, tags);
        if (id !== null) {
          inserted++;
        }
      }
    });

    insertTx();
    return inserted;
  }

  // ============================================================
  // SEARCH
  // ============================================================

  /**
   * Articles taggés sur un asset, fenêtre temporelle variable.
   * Trié par published_at DESC.
   */
  searchByAsset(
    symbol: string,
    options: {
      days: number;
      limit?: number;
      minImpact?: "high" | "medium" | "low";
      sentiment?: "bullish" | "bearish";
    }
  ): Array<StoredArticle & { sentiment?: string; confidence: string }> {
    const limit = options.limit || 10;
    const results = this.searchByAssetStmt.all(
      symbol,
      options.days,
      limit
    ) as Array<any>;

    // Filtrer par minImpact et sentiment si spécifiés
    return results.filter((r) => {
      if (options.minImpact) {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        if (impactOrder[r.impact as keyof typeof impactOrder] < impactOrder[options.minImpact]) {
          return false;
        }
      }
      if (options.sentiment && r.sentiment !== options.sentiment) {
        return false;
      }
      return true;
    });
  }

  /**
   * Articles par thème macro.
   */
  searchByTheme(
    theme: MacroTheme,
    options: { days: number; limit?: number; minImpact?: "high" | "medium" | "low" }
  ): StoredArticle[] {
    const limit = options.limit || 10;
    const results = this.searchByThemeStmt.all(
      theme,
      options.days,
      limit
    ) as StoredArticle[];

    // Filtrer par minImpact si spécifié
    if (options.minImpact) {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return results.filter(
        (r) => impactOrder[(r.impact ?? "low") as keyof typeof impactOrder] >= impactOrder[options.minImpact!]
      );
    }

    return results;
  }

  /**
   * Recherche full-text BM25 dans title + summary.
   */
  searchFullText(
    query: string,
    options?: { days?: number; limit?: number }
  ): StoredArticle[] {
    const days = options?.days || 90;
    const limit = options?.limit || 20;

    return this.searchFtsStmt.all(query, days, limit) as StoredArticle[];
  }

  /**
   * Articles high impact récents.
   */
  getHighImpactRecent(days: number, limit?: number): StoredArticle[] {
    const lim = limit || 10;
    return this.highImpactStmt.all(days, lim) as StoredArticle[];
  }

  /**
   * Comptage d'articles par thème sur une période.
   */
  countByTheme(days: number): Array<{ theme: MacroTheme; count: number }> {
    return this.countByThemeStmt.all(days) as Array<{
      theme: MacroTheme;
      count: number;
    }>;
  }

  /**
   * Comptage d'articles par asset sur une période.
   */
  countByAsset(days: number, limit?: number): Array<{ symbol: string; count: number }> {
    const lim = limit || 20;
    return this.countByAssetStmt.all(days, lim) as Array<{
      symbol: string;
      count: number;
    }>;
  }

  // ============================================================
  // ECONOMIC EVENTS
  // ============================================================

  /**
   * Upsert economic events (sync Supabase).
   * Retourne le nombre d'événements mis à jour/insérés.
   */
  syncEconomicEvents(events: EconomicEvent[]): number {
    let count = 0;

    const syncTx = this.db.transaction(() => {
      for (const event of events) {
        const result = this.upsertEcoEventStmt.run(
          event.id,
          event.name,
          event.currency || null,
          event.event_date,
          event.strength || null,
          event.forecast ?? null,
          event.previous ?? null,
          event.actual ?? null,
          event.outcome || "pending",
          event.source || "forexfactory"
        );
        count += result.changes;
      }
    });

    syncTx();
    return count;
  }

  /**
   * Events par date range.
   */
  getEconomicEvents(options: {
    from: string;
    to: string;
    currency?: string;
    strength?: "Strong" | "Moderate";
  }): EconomicEvent[] {
    let query = `
      SELECT
        id, name, currency, event_date, strength, forecast, previous,
        actual, outcome, source, synced_at
      FROM economic_events
      WHERE event_date BETWEEN ? AND ?
    `;

    const params: any[] = [options.from, options.to];

    if (options.currency) {
      query += " AND currency = ?";
      params.push(options.currency);
    }

    if (options.strength) {
      query += " AND strength = ?";
      params.push(options.strength);
    }

    query += " ORDER BY event_date ASC";

    return this.db.prepare(query).all(...params) as EconomicEvent[];
  }

  // ============================================================
  // MAINTENANCE
  // ============================================================

  /**
   * Purge articles > retentionDays.
   * Retourne le nombre supprimé.
   */
  purgeOldArticles(retentionDays: number = 180): number {
    const result = this.purgeOldStmt.run(retentionDays);
    return result.changes;
  }

  /**
   * Stats DB pour monitoring.
   */
  getStats(): {
    totalArticles: number;
    oldestArticle: string | null;
    newestArticle: string | null;
    totalAssetTags: number;
    totalThemeTags: number;
    totalEcoEvents: number;
    dbSizeMB: number;
  } {
    const totalArticles = (
      this.statsArticlesStmt.get() as { count: number }
    ).count;
    const totalAssetTags = (
      this.statsAssetTagsStmt.get() as { count: number }
    ).count;
    const totalThemeTags = (
      this.statsThemeTagsStmt.get() as { count: number }
    ).count;
    const totalEcoEvents = (
      this.statsEcoEventsStmt.get() as { count: number }
    ).count;

    const dateStats = this.db
      .prepare(
        `SELECT MIN(published_at) as oldest, MAX(published_at) as newest FROM articles`
      )
      .get() as { oldest: string | null; newest: string | null };

    // Get DB file size
    let dbSizeMB = 0;
    try {
      const dbPath = this.db.name;
      if (dbPath && fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSizeMB = stats.size / (1024 * 1024);
      }
    } catch {
      // Ignore errors
    }

    return {
      totalArticles,
      oldestArticle: dateStats.oldest || null,
      newestArticle: dateStats.newest || null,
      totalAssetTags,
      totalThemeTags,
      totalEcoEvents,
      dbSizeMB: Math.round(dbSizeMB * 100) / 100,
    };
  }

  /**
   * Fermer la DB proprement.
   */
  close(): void {
    this.db.close();
  }
}
