/**
 * P1.5 — News digest: Haiku reads all titles and extracts
 * the 5-10 most structurally important events.
 * Runs between P1 (flagging) and P2 (editorial selection).
 */
import { generateStructuredJSON } from "../llm-client";
import type { NewsItem } from "@yt-maker/core";

export interface NewsDigestEvent {
  headline: string;
  category: 'regulation' | 'central_bank' | 'geopolitical' | 'macro_data' | 'ma_deal' | 'earnings' | 'institutional' | 'other';
  importance: 'game_changer' | 'significant' | 'notable';
  linkedAssets: string[];
  sourceTitle: string;
}

export interface NewsDigest {
  events: NewsDigestEvent[];
}

const SYSTEM_PROMPT = `Tu es un filtre éditorial. On te donne les titres de news du jour. Tu dois identifier les 5 à 10 ÉVÉNEMENTS les plus structurellement importants — ceux qui changent les règles du jeu ou créent un catalyseur de marché.

CATÉGORIES (par ordre d'importance structurelle) :
- regulation : nouvelle loi, décision de régulateur (SEC, ESMA, etc.), cadre juridique
- central_bank : décision de taux, discours officiel, minutes, forward guidance
- geopolitical : conflit, sanctions, accord commercial, diplomatie majeure
- macro_data : publication éco surprenante (CPI, NFP, PIB) avec écart vs consensus
- ma_deal : acquisition, fusion, deal >500M$
- earnings : résultat trimestriel d'une mega-cap avec surprise significative
- institutional : adoption par une grande institution (banque, fonds, gouvernement)
- other : autre événement structurel

NIVEAUX D'IMPORTANCE :
- game_changer : redéfinit un cadre entier (ex: "SEC déclare que la plupart des cryptos ne sont pas des securities")
- significant : catalyseur direct de mouvement de marché (ex: "Mastercard rachète BVNK pour $1.8B")
- notable : contexte important mais pas de catalyseur immédiat (ex: "Tim Cook visite la Chine")

RÈGLES :
- IGNORE les articles d'opinion ("Why I wouldn't...", "Where will X be in 10 years", "best stocks to buy")
- IGNORE les listicles, conseils d'investissement, analyses rétrospectives
- Chaque événement = UN fait, pas un article. Si 5 articles parlent du même fait, c'est 1 événement.
- linkedAssets : les symboles Yahoo Finance directement concernés (pas tous les assets vaguement liés)
- sourceTitle : le titre de l'article SOURCE le plus informatif

Retourne un JSON : { "events": [...] }`;

function buildUserPrompt(news: NewsItem[], calendarHighlights: string[]): string {
  let prompt = `## TITRES DU JOUR (${news.length} articles)\n`;
  for (const n of news) {
    prompt += `- ${n.title.slice(0, 150)}\n`;
  }

  if (calendarHighlights.length) {
    prompt += `\n## CALENDRIER ÉCO (high impact)\n`;
    for (const h of calendarHighlights) {
      prompt += `- ${h}\n`;
    }
  }

  prompt += `\nExtrais les 5 à 10 événements structurels les plus importants. JSON strict.`;
  return prompt;
}

export async function runNewsDigest(
  news: NewsItem[],
  calendarHighlights: string[] = [],
): Promise<NewsDigest> {
  if (!news.length) return { events: [] };

  console.log('  P1.5 News Digest — extraction événements structurels...');

  try {
    const digest = await generateStructuredJSON<NewsDigest>(
      SYSTEM_PROMPT,
      buildUserPrompt(news, calendarHighlights),
      { role: 'fast' },
    );

    // Validate
    if (!digest.events || !Array.isArray(digest.events)) {
      console.warn('  P1.5 invalid response, returning empty');
      return { events: [] };
    }

    // Normalize field names — LLMs may use title/headline, level/importance
    for (const e of digest.events) {
      const raw = e as any;
      if (!e.headline && raw.title) e.headline = raw.title;
      if (!e.headline && raw.description) e.headline = raw.description;
      if (!e.headline && raw.event) e.headline = raw.event;
      if (!e.importance && raw.level) e.importance = raw.level;
      if (!e.linkedAssets) e.linkedAssets = raw.assets ?? [];
    }

    // Sort by importance
    const order = { game_changer: 0, significant: 1, notable: 2 };
    digest.events.sort((a, b) => (order[a.importance] ?? 3) - (order[b.importance] ?? 3));

    console.log(`  P1.5 found ${digest.events.length} events: ${digest.events.filter(e => e.importance === 'game_changer').length} game-changers, ${digest.events.filter(e => e.importance === 'significant').length} significant`);

    return digest;
  } catch (err) {
    console.error(`  P1.5 error: ${(err as Error).message.slice(0, 100)}`);
    return { events: [] };
  }
}

/**
 * Format digest for injection into C1 prompt.
 */
export function formatNewsDigest(digest: NewsDigest): string {
  if (!digest.events.length) return '';

  let text = `## ÉVÉNEMENTS STRUCTURELS DU JOUR (pré-filtrés par importance)\n`;
  text += `Ces événements méritent un segment MÊME si l'asset n'a pas bougé.\n\n`;

  for (const event of digest.events) {
    const icon = event.importance === 'game_changer' ? '🔴' : event.importance === 'significant' ? '🟠' : '🟡';
    // LLM may use 'headline', 'title', 'event', 'description' — handle flexibly
    const headline = event.headline || (event as any).title || (event as any).event || (event as any).description || event.sourceTitle || '?';
    const source = event.sourceTitle || (event as any).source || '';
    text += `${icon} [${event.category}] ${headline}\n`;
    text += `  Assets: ${(event.linkedAssets || []).join(', ') || '—'}${source ? ` | Source: "${source.slice(0, 100)}"` : ''}\n`;
  }

  return text + '\n';
}
