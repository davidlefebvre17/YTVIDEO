/**
 * Remplace les tickers entre guillemets ("CL=F", "SHEL.L", "GS"…) par leur
 * équivalent phonétique français lu par le TTS. Source : `data/company-profiles.json`
 * via phoneticRegistry. Si pas de phonétique, laisse le ticker tel quel.
 *
 * Les guillemets sont retirés autour du remplacement.
 *
 * Logique d'overlap detection : si le contexte immédiat contient déjà des
 * mots significatifs de la phonétique, on supprime la mention pour éviter
 * la redondance (ex: "le brut américain pétrole américain" → "le brut américain").
 */

import { phoneticRegistry } from './phonetic-registry';

const TICKER_QUOTED_RE = /"([A-Z0-9^=.\-]{1,15})"/g;

// Stopwords généraux + mots-nombres FR. Ces derniers apparaissent dans des
// phonétiques d'indices ("Nikkei deux cent vingt-cinq", "S&P cinq cents") ET
// dans le texte courant ("pour cent", "vingt heures"). Sans cette exclusion,
// "Le ^N225 cède un pour cent" voyait "cent" matcher dans les deux côtés et
// droppait silencieusement le nom de l'indice. Faux positif corrigé.
const TICKER_STOPWORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux',
  'un', 'une', 'sur', 'en', 'dans', 'pour', 'par',
  // Mots-nombres FR
  'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
  'cent', 'cents', 'mille', 'million', 'milliard', 'milliards',
]);

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-zàâäçéèêëîïôöùûüÿ]+/g) ?? [];
}

/**
 * Remplace `"TICKER"` par sa phonétique. Si le contexte immédiat (60 chars
 * avant ou après) contient déjà des mots significatifs de la phonétique,
 * on supprime la mention pour éviter la redondance ("le brut américain
 * pétrole américain a clôturé" → "le brut américain a clôturé").
 */
export function replaceTickersInQuotes(text: string): { output: string; replaced: string[] } {
  const map = phoneticRegistry.getTickerMap();
  const replaced: string[] = [];

  let output = text.replace(TICKER_QUOTED_RE, (match, ticker: string, offset: number, full: string) => {
    const phonetic = map.get(ticker);
    if (!phonetic) return match;

    const before = full.slice(Math.max(0, offset - 60), offset).toLowerCase();
    const after = full.slice(offset + match.length, offset + match.length + 60).toLowerCase();

    const precedingWords = tokenize(before).slice(-4);
    const followingWords = tokenize(after).slice(0, 5);
    const phoneticWords = tokenize(phonetic);
    const significant = phoneticWords.filter((w) => w.length >= 3 && !TICKER_STOPWORDS.has(w));

    const overlap = significant.some(
      (pw) => precedingWords.includes(pw) || followingWords.includes(pw),
    );

    if (overlap) {
      replaced.push(`${ticker} → (omitted, contextual overlap)`);
      return '';
    }

    replaced.push(`${ticker} → ${phonetic}`);
    return phonetic;
  });

  // Nettoyer doubles espaces et ponctuation orpheline laissée par les omissions
  output = output.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();

  return { output, replaced };
}
