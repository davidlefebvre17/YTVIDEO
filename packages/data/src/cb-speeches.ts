/**
 * Central Bank Speeches — fetch conditionnel depuis BIS RSS.
 *
 * Ne fetche QUE quand le calendrier a détecté un discours CB majeur.
 * Retourne le résumé (300 chars) du discours pour injection dans le briefing pack.
 *
 * Sources : BIS speeches RSS (agrège ~50 banques centrales, gratuit, pas de clé API)
 * Fallback : Fed speeches RSS, ECB monetary RSS
 */

/** Mapping speaker name → patterns to match in BIS RSS dc:creator field */
const SPEAKER_PATTERNS: Record<string, RegExp> = {
  powell: /powell/i,
  warsh: /warsh/i,
  lagarde: /lagarde/i,
  schnabel: /schnabel/i,
  lane: /\blane\b/i,
  ueda: /ueda/i,
  bailey: /bailey/i,
  jordan: /jordan/i,
  macklem: /macklem/i,
  barr: /\bbarr\b/i,
  waller: /waller/i,
  bowman: /bowman/i,
  jefferson: /jefferson/i,
  cook: /\bcook\b/i,
  panetta: /panetta/i,
  nakamura: /nakamura/i,
};

const BIS_RSS = 'https://www.bis.org/doclist/cbspeeches.rss';
const FED_SPEECHES_RSS = 'https://www.federalreserve.gov/feeds/speeches.xml';

interface BISSpeech {
  title: string;
  speaker: string;
  date: string;
  url: string;
  description: string;
}

/**
 * Parse un RSS de discours et retourne les items.
 * Supporte BIS (RDF/RSS 1.0 avec dc:creator, dc:date) et Fed (RSS 2.0 avec CDATA).
 */
const speechCache = new Map<string, { speeches: BISSpeech[]; fetchedAt: number }>();

async function fetchSpeechRSS(feedUrl: string, sourceName: string): Promise<BISSpeech[]> {
  const cached = speechCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) return cached.speeches;

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 TradingRecap/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`${sourceName} RSS ${res.status}`);
    const xml = await res.text();

    const speeches: BISSpeech[] = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRe.exec(xml)) !== null) {
      const block = match[1];

      // Title: try CDATA first (Fed), then plain (BIS)
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]>/) ?? block.match(/<title>(.*?)<\/title>/) ?? [])[1]?.trim() ?? '';
      const link = (block.match(/<link><!\[CDATA\[(.*?)\]\]>/) ?? block.match(/<link>(.*?)<\/link>/) ?? [])[1]?.trim() ?? '';
      const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]>/) ?? block.match(/<description>(.*?)<\/description>/) ?? [])[1]?.trim() ?? '';
      const creator = (block.match(/<dc:creator>(.*?)<\/dc:creator>/) ?? [])[1]?.trim() ?? '';

      // Date: dc:date (BIS) or pubDate (Fed)
      const dcDate = (block.match(/<dc:date>(.*?)<\/dc:date>/) ?? [])[1]?.slice(0, 10) ?? '';
      const pubDate = (block.match(/<pubDate><!\[CDATA\[(.*?)\]\]>/) ?? block.match(/<pubDate>(.*?)<\/pubDate>/) ?? [])[1] ?? '';
      const date = dcDate || (pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '');

      // Speaker: dc:creator (BIS) or extract from title "LastName, Title" (Fed)
      const speaker = creator || title.split(',')[0]?.trim() || '';

      if (title && link) {
        speeches.push({ title, speaker, date, url: link, description: desc });
      }
    }

    speechCache.set(feedUrl, { speeches, fetchedAt: Date.now() });
    return speeches;
  } catch (err) {
    console.warn(`  ${sourceName} RSS fetch failed: ${(err as Error).message.slice(0, 60)}`);
    return [];
  }
}

/** Fetch from both Fed (faster) and BIS (broader), merge and dedupe */
async function fetchAllSpeeches(): Promise<BISSpeech[]> {
  const [fed, bis] = await Promise.all([
    fetchSpeechRSS(FED_SPEECHES_RSS, 'Fed'),
    fetchSpeechRSS(BIS_RSS, 'BIS'),
  ]);

  // Merge: Fed first (more recent), then BIS, dedup by URL or title similarity
  const seen = new Set<string>();
  const merged: BISSpeech[] = [];
  for (const s of [...fed, ...bis]) {
    const key = s.url || s.title.slice(0, 50).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  return merged;
}

/**
 * Extrait le contenu texte d'une page de discours BIS.
 * Retourne les N premiers caractères du texte nettoyé.
 */
async function extractSpeechContent(url: string, maxChars: number = 500): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 TradingRecap/1.0' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return '';
    const html = await res.text();

    // BIS: <div id="cmsContent">, Fed: <div class="col-xs-12 col-sm-8 col-md-8">
    const contentMatch = html.match(/<div[^>]*id=["']cmsContent["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
      ?? html.match(/<div[^>]*class=["'][^"']*col-xs-12 col-sm-8[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      ?? html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    if (!contentMatch?.[1]) return '';

    const text = contentMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= maxChars) return text;

    // Truncate on sentence boundary
    const cut = text.slice(0, maxChars);
    const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    return lastDot > maxChars * 0.4 ? cut.slice(0, lastDot + 1) : cut + '…';
  } catch {
    return '';
  }
}

/**
 * Cherche un discours CB sur le BIS pour un speaker et une date donnés.
 *
 * @param speakerName - Nom du speaker tel que détecté dans le calendrier (ex: "lagarde", "powell")
 * @param targetDate - Date du discours (YYYY-MM-DD)
 * @returns Résumé du discours ou null si non trouvé
 */
export async function fetchCBSpeechContent(
  speakerName: string,
  targetDate: string,
): Promise<{ title: string; speaker: string; summary: string; url: string } | null> {
  const speakerKey = speakerName.toLowerCase();
  const pattern = SPEAKER_PATTERNS[speakerKey];
  if (!pattern) return null;

  const speeches = await fetchAllSpeeches();

  // Match by speaker + date (±1 day pour les décalages de publication)
  const targetD = new Date(targetDate + 'T12:00:00Z');
  const match = speeches.find(s => {
    if (!pattern.test(s.speaker) && !pattern.test(s.title)) return false;
    const speechD = new Date(s.date + 'T12:00:00Z');
    const diffDays = Math.abs((targetD.getTime() - speechD.getTime()) / (86400 * 1000));
    return diffDays <= 1;
  });

  if (!match) return null;

  // Extract content from BIS page
  const summary = await extractSpeechContent(match.url);

  return {
    title: match.title,
    speaker: match.speaker,
    summary: summary || match.description,
    url: match.url,
  };
}

/**
 * Enrichit les cbSpeechesYesterday du briefing pack avec le contenu réel des discours BIS.
 *
 * Appelé par buildBriefingPack quand des discours CB sont détectés dans yesterdayEvents.
 * Ne fait AUCUN fetch si pas de discours détecté.
 */
export async function enrichCBSpeeches(
  detectedSpeeches: Array<{ speaker: string; eventName: string; currency: string }>,
  snapshotDate: string,
): Promise<string[]> {
  if (detectedSpeeches.length === 0) return [];

  // Yesterday = snapshotDate - 1
  const d = new Date(snapshotDate + 'T12:00:00Z');
  d.setDate(d.getDate() - 1);
  const yesterdayDate = d.toISOString().slice(0, 10);

  const results: string[] = [];

  for (const speech of detectedSpeeches) {
    const content = await fetchCBSpeechContent(speech.speaker, yesterdayDate);

    if (content) {
      let line = `HIER: ${speech.eventName} (${speech.currency})`;
      line += ` — "${content.title}"`;
      if (content.summary) {
        line += ` — Contenu: ${content.summary.slice(0, 300)}`;
      }
      results.push(line);
      console.log(`    BIS: ${speech.speaker} → ${content.title.slice(0, 60)}`);
    } else {
      // Pas trouvé sur BIS — garder juste le titre du calendrier
      results.push(`HIER: ${speech.eventName} (${speech.currency}) — contenu non disponible`);
    }
  }

  return results;
}
