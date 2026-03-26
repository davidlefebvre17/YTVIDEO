/**
 * P1.5 — News digest: Haiku reads all titles and extracts
 * the 5-10 most structurally important events.
 * Runs between P1 (flagging) and P2 (editorial selection).
 */
import { generateStructuredJSON } from "../llm-client";
import type { NewsItem } from "@yt-maker/core";

export interface NewsDigestEvent {
  headline: string;
  category: 'regulation' | 'central_bank' | 'geopolitical' | 'macro_data' | 'corporate' | 'market_structure' | 'institutional' | 'political_context' | 'other';
  importance: 'game_changer' | 'significant' | 'notable';
  linkedAssets: string[];
  sourceTitle: string;
}

export interface NewsDigest {
  events: NewsDigestEvent[];
}

const SYSTEM_PROMPT = `Tu es un filtre éditorial pour une émission de marché quotidienne. On te donne les titres de news et le calendrier éco du jour. Tu dois identifier les 5 à 10 ÉVÉNEMENTS FACTUELS les plus importants pour les marchés.

Un événement = UN FAIT, pas un article. Si 10 articles parlent de la même guerre, c'est 1 événement. Si 3 articles couvrent le même earnings, c'est 1 événement.

CATÉGORIES :
- regulation : nouveau cadre juridique, décision de régulateur (SEC, ESMA, AMF, CFTC), loi votée, classification juridique
- central_bank : décision de taux, discours officiel de gouverneur, minutes, forward guidance, opération de marché (QE/QT)
- geopolitical : conflit armé, escalade/désescalade, sanctions, embargo, accord commercial, traité, élection avec impact marché
- macro_data : publication éco (CPI, PPI, NFP, PIB, PMI, ZEW, ISM) — surtout si écart vs consensus
- corporate : M&A, earnings surprise, faillite, IPO, changement de CEO, contrat majeur, guidance révisée
- market_structure : approbation/rejet d'ETF, rebalancing d'indice, circuit breaker, changement de marge, short squeeze
- institutional : adoption/rejet par grande institution (banque, fonds souverain, assureur), allocation stratégique, deal infra >$500M
- political_context : motivation politique derrière une décision (pourquoi un gouverneur reste/part, pression présidentielle, enquête judiciaire, visite diplomatique tendue). Ce n'est pas l'événement lui-même mais le CONTEXTE qui change son interprétation.
- other : autre événement structurel ne rentrant dans aucune catégorie

NIVEAUX D'IMPORTANCE :

game_changer — Les règles du jeu changent. RARE (0-2 par semaine max).
  TEST : les participants de marché doivent-ils RECALCULER leurs modèles ?
  Exemples génériques :
  • Nouveau cadre réglementaire pour une classe d'actifs entière
  • Décision de taux INATTENDUE (baisse quand hausse attendue, ou l'inverse)
  • Déclaration de guerre, cessez-le-feu, changement territorial majeur
  • Défaut souverain ou quasi-défaut
  • Donnée macro en outlier extrême (>3 écarts-types du consensus)
  • Approbation/rejet d'un ETF qui ouvre/ferme un marché (ex: ETF spot sur un actif majeur)

significant — Catalyseur DIRECT d'un mouvement de marché observable ou attendu.
  TEST : cet événement explique-t-il ou va-t-il expliquer un move de prix ?
  Exemples génériques :
  • Décision de taux conforme au consensus (le marché réagit quand même)
  • M&A > $1B ou deal stratégique transformant un secteur
  • Earnings surprise >10% sur une mega-cap ou leader sectoriel
  • Escalade/désescalade militaire affectant supply chains (énergie, semi-conducteurs, transport)
  • Sanctions ou embargo annoncé contre un pays/secteur
  • Donnée macro en surprise (1-3σ) — CPI au-dessus, NFP en dessous, etc.
  • Upgrade/downgrade majeur qui déclenche un mouvement visible
  • Adoption institutionnelle significative (grande banque entre dans un nouveau marché)

notable — Contexte utile pour comprendre le jour, pas de catalyseur immédiat.
  TEST : le spectateur a-t-il besoin de cette info pour comprendre le contexte ?
  Exemples génériques :
  • Visite diplomatique, nomination politique, contexte humain d'une décision
  • Partenariat stratégique ou deal < $500M
  • Donnée éco conforme au consensus (confirme la trajectoire)
  • Rapport d'analyste ou étude sectorielle sans impact prix
  • Événement à venir (earnings la semaine prochaine, sommet annoncé)
  • Motivation politique derrière une décision économique (enquête judiciaire, pression présidentielle)

CE QUI N'EST PAS UN ÉVÉNEMENT (IGNORER) :
- Articles d'opinion : "Why I wouldn't...", "Is X a buy?", "Best stocks to..."
- Listicles : "3 stocks that...", "5 things to know..."
- Conseils : "How retirees can...", "How to build..."
- Rétrospectives : "Where X was 10 years ago", "X's journey since..."
- Contenus promotionnels ou communiqués sans impact marché
- Analyses techniques pures ("chart shows...", "RSI indicates...")
- Prédictions de prix sans catalyseur factuel

RÈGLES DE SORTIE :
- headline : description factuelle courte de l'événement (PAS le titre de l'article)
- linkedAssets : symboles Yahoo Finance DIRECTEMENT concernés (max 4-5, pas tous les assets vaguement liés)
- sourceTitle : le titre de l'article le plus informatif parmi ceux qui couvrent cet événement
- Trier par importance décroissante

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

  prompt += `\nExtrais les 8 à 15 événements structurels les plus importants. Inclus le CONTEXTE POLITIQUE derrière les décisions (pas juste la décision). JSON strict.`;
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
