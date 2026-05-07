/**
 * Generate a YouTube thumbnail for an episode.
 *
 * Usage :
 *   npm run thumbnail -- --date 2026-05-04
 *   npm run thumbnail -- --date 2026-05-04 --no-llm   # use mechanical fallback only
 *
 * Pipeline :
 *   1. Read episodes/YYYY/MM-DD/script.json (uses script.direction.thumbnailMoment)
 *   2. Pick a beat image PNG from episodes/YYYY/MM-DD/images/ matching that segmentId
 *   3. Ask Haiku for ultra-short props (2-3 word headline, accent color)
 *   4. Render with `npx remotion still Thumbnail thumbnail.png --props=...`
 *   5. Save to episodes/YYYY/MM-DD/thumbnail.png (1280x720 PNG)
 *
 * Cost : ~$0.001 (Haiku) + ~3s render time.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { generateStructuredJSON } from '../packages/ai/src/llm-client';
import type { EpisodeScript, AssetSnapshot } from '@yt-maker/core';
import type { ThumbnailProps } from '../packages/remotion-app/src/scenes/ThumbnailScene';

type Variant = 'A' | 'B' | 'C' | 'D';
const ALL_VARIANTS: Variant[] = ['A', 'B', 'C', 'D'];
const VARIANT_COMPOSITION: Record<Variant, string> = {
  A: 'Thumbnail',
  B: 'ThumbnailTabloid',
  C: 'ThumbnailStat',
  D: 'ThumbnailNewspaper',
};

interface CLIArgs {
  dates: string[];
  noLlm: boolean;
  variants: Variant[];
}

function parseArgs(argv: string[]): CLIArgs {
  const out: CLIArgs = { dates: [], noLlm: false, variants: ['A'] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) { out.dates = [argv[i + 1]!]; i++; }
    else if (argv[i] === '--dates' && argv[i + 1]) { out.dates = argv[i + 1]!.split(',').map(s => s.trim()).filter(Boolean); i++; }
    else if (argv[i] === '--variant' && argv[i + 1]) {
      const v = argv[i + 1]!.toUpperCase() as Variant;
      if (!ALL_VARIANTS.includes(v)) throw new Error(`Invalid variant "${v}". Must be A/B/C/D.`);
      out.variants = [v];
      i++;
    }
    else if (argv[i] === '--variants' && argv[i + 1]) {
      out.variants = argv[i + 1]!.toUpperCase().split(',').map(s => s.trim()).filter(Boolean) as Variant[];
      for (const v of out.variants) {
        if (!ALL_VARIANTS.includes(v)) throw new Error(`Invalid variant "${v}". Must be A/B/C/D.`);
      }
      i++;
    }
    else if (argv[i] === '--all-variants') out.variants = [...ALL_VARIANTS];
    else if (argv[i] === '--no-llm') out.noLlm = true;
  }
  return out;
}

function projectRoot(): string {
  return path.resolve(__dirname, '..');
}

const FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function formatDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const day = FR_DAYS[date.getUTCDay()];
  const month = FR_MONTHS[(m ?? 1) - 1];
  return `${day} ${d} ${month}`.toUpperCase();
}

/**
 * Pick a beat image and copy it into a TEMP public dir (avoids copying the
 * full multi-GB public/ at render time). Returns the path relative to that temp dir.
 */
function pickBgImage(date: string, thumbnailSegmentId: string, tempPublicDir: string): string | undefined {
  const root = projectRoot();
  const [y, m, d] = date.split('-');
  const epDir = path.join(root, 'episodes', y!, `${m}-${d}`);
  const beatsPath = path.join(epDir, 'beats.json');
  const imagesDir = path.join(epDir, 'images');

  if (!fs.existsSync(beatsPath) || !fs.existsSync(imagesDir)) return undefined;

  const beats: Array<{ id: string; segmentId: string }> = JSON.parse(
    fs.readFileSync(beatsPath, 'utf-8'),
  );

  // Prefer beats from the chosen segment, fallback to all beats
  const segmentBeats = beats.filter(b => b.segmentId === thumbnailSegmentId);
  const candidates = segmentBeats.length > 0 ? segmentBeats : beats;

  // Pick the middle beat with an existing image
  const ordered = [
    candidates[Math.floor(candidates.length / 2)],
    ...candidates,
  ].filter(Boolean);

  for (const beat of ordered) {
    const src = path.join(imagesDir, `${beat!.id}.png`);
    if (fs.existsSync(src)) {
      // Copy into temp public dir
      const dst = path.join(tempPublicDir, 'bg.png');
      fs.copyFileSync(src, dst);
      return 'bg.png';
    }
  }
  return undefined;
}

/** Same logic as pickFeaturedAsset but returns the raw symbol (not pretty ticker). */
function pickFeaturedSymbol(script: EpisodeScript, snapshot: { assets?: AssetSnapshot[] }): string | undefined {
  const moment = script.direction?.thumbnailMoment;
  const segId = moment?.segmentId;
  const segment = script.sections.find(s => s.id === segId);
  const segAssets = segment?.assets ?? [];
  const assets = snapshot.assets ?? [];
  if (assets.length === 0) return undefined;
  const candidates = segAssets.length
    ? assets.filter(a => segAssets.includes(a.symbol))
    : assets;
  const sorted = [...candidates].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return sorted[0]?.symbol;
}

/** Pick the asset most relevant to thumbnail (highest abs %, in dominant theme). */
function pickFeaturedAsset(script: EpisodeScript, snapshot: { assets?: AssetSnapshot[] }): { ticker: string; changePct: number } | undefined {
  const moment = script.direction?.thumbnailMoment;
  const segId = moment?.segmentId;
  const segment = script.sections.find(s => s.id === segId);
  const segAssets = segment?.assets ?? [];

  const assets = snapshot.assets ?? [];
  if (assets.length === 0) return undefined;

  // Prefer assets explicitly mentioned in the segment, sorted by abs(changePct)
  const candidates = segAssets.length
    ? assets.filter(a => segAssets.includes(a.symbol))
    : assets;
  const sorted = [...candidates].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const best = sorted[0];
  if (!best) return undefined;

  return {
    ticker: prettyTicker(best.symbol, best.name),
    changePct: best.changePct,
  };
}

function prettyTicker(symbol: string, name: string): string {
  // Short visual labels — Brent for CL=F is meh, "BRENT" cleaner
  const map: Record<string, string> = {
    'CL=F': 'WTI',
    'BZ=F': 'BRENT',
    'GC=F': 'GOLD',
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ',
    '^DJI': 'DOW',
    '^FCHI': 'CAC 40',
    '^GDAXI': 'DAX',
    '^N225': 'NIKKEI',
    '^VIX': 'VIX',
    'BTC-USD': 'BITCOIN',
    'ETH-USD': 'ETHEREUM',
    'EURUSD=X': 'EUR/USD',
    'USDJPY=X': 'USD/JPY',
    'GBPUSD=X': 'GBP/USD',
    'DX-Y.NYB': 'DXY',
  };
  return map[symbol] ?? name?.toUpperCase().slice(0, 12) ?? symbol.toUpperCase().slice(0, 12);
}

function emotionToAccent(emotion?: string): ThumbnailProps['accent'] {
  if (!emotion) return 'neutral';
  const e = emotion.toLowerCase();
  if (e.includes('choc') || e.includes('peur') || e.includes('tension') || e.includes('panique')) return 'bear';
  if (e.includes('euphor') || e.includes('hausse') || e.includes('bull') || e.includes('rallye')) return 'bull';
  if (e.includes('incert') || e.includes('attente') || e.includes('mitig')) return 'warning';
  if (e.includes('calme') || e.includes('risk-off')) return 'blue';
  return 'neutral';
}

// ─── LLM call (Haiku) ────────────────────────────────────────────

const HAIKU_SYSTEM_PROMPT = `Tu rédiges les titres de thumbnails YouTube pour Owl Street Journal — chaîne de récap quotidien des marchés financiers en français.

# OBJECTIF : MAX CTR sans mensonge

Le titre doit faire S'ARRÊTER LE SCROLL. C'est une thumbnail dans un feed mobile saturé d'autres vidéos finance. Donc :
- Acteur NOMMÉ (Trump, Powell, Iran, Pékin, Fed, Lagarde, Tokyo)
- Verbe d'ACTION concret au présent ("attaque", "frappe", "lâche", "tranche", "riposte", "balaie", "menace", "pivote", "explose", "s'effondre")
- Objet PRÉCIS (un tanker, Hormuz, les taux, le yen, la tech)
- 100% FACTUEL — si Trump n'a pas attaqué le tanker, on dit pas qu'il l'a fait. Mais on peut dire "Trump escorte les tankers à Hormuz" si c'est arrivé.

# Format de sortie JSON

{
  "headlineLines": string[],     // 1 OU 2 lignes, ensemble = 4-7 mots, MAX 14 lettres par ligne
  "subtitle": string              // 5-9 mots qui DÉTAILLENT l'enjeu factuel
}

# Règles d'écriture du titre

## Structures qui marchent (cibler ces patterns)

A) **Acteur + verbe + objet** (le plus efficace)
   - "Trump escorte les tankers à Hormuz"
   - "Powell lâche du lest, Wall Street s'envole"
   - "Pékin riposte aux tarifs autos"
   - "Iran frappe, l'or s'envole"

B) **Asset + chute violente / record**
   - "Le yen s'effondre face au dollar"
   - "Brent à 110 $, l'OPEP perd la main"
   - "Sumitomo +17 % en une séance"

C) **Question polarisante** (à utiliser parfois pour casser la routine)
   - "Stagflation : qui paye la facture ?"
   - "Bulle tech ou correction saine ?"

D) **Paradoxe / contradiction qui interroge**
   - "Alphabet +10 %, Meta -8 %, même secteur"
   - "Or à 2500 $, S&P à un record"

## Le punch visuel

Le composant Remotion va afficher tes mots en énorme. Donc :
- Si tu mets "Hormuz / sous tension" → pâle, ça raconte rien
- Si tu mets "Trump escorte / les tankers" → on comprend l'enjeu en 0,5 sec

Choisis le punch le plus tangible disponible dans le contexte fourni.

## Règles strictes

- Sentence case (le composant gère la casse). NE PAS écrire en MAJUSCULES.
- Pas de virgule dans les headlineLines (sauf si vraiment nécessaire entre 2 entités, type "Trump, Pékin")
- Pas d'année (interdit "2026")
- Pas d'émoji
- Pas de "Sub à la chaîne" / "Like" / "Notification"
- Le subtitle complète SANS RÉPÉTER le headline. Il apporte un chiffre, un contexte, un mécanisme.

## INTERDITS ABSOLUS (démonétisation YouTube)

krach, crash, effondrement total, panique, imminent, catastrophe, "ne ratez pas",
"prochain X", "vous n'allez pas le croire", "secret", "arnaque", "sans risque"

→ Note : "s'effondre" est OK (c'est un verbe), "krach" non (c'est sensationnaliste).

# EXEMPLES — épisodes réels du contexte

Sujet "Hormuz tanker attack + Project Freedom" :
✅ {"headlineLines": ["Trump escorte", "les tankers"], "subtitle": "Hormuz : la prime pétrolière revient pour 12 mois"}
✅ {"headlineLines": ["Iran frappe,", "Hormuz brûle"], "subtitle": "Brent à 108 $, le marché se remilitarise"}
❌ {"headlineLines": ["Hormuz", "sous tension"], "subtitle": "..."} ← trop pâle

Sujet "Inversion Brent/WTI rare" :
✅ {"headlineLines": ["Le Brent passe", "sous le WTI"], "subtitle": "Aberration historique : le marché bascule"}
❌ {"headlineLines": ["Brent", "WTI"]} ← incompréhensible

Sujet "Sumitomo +17%" :
✅ {"headlineLines": ["Sumitomo", "explose +17 %"], "subtitle": "Un endormi de 10 ans réveille le Nikkei"}
✅ {"headlineLines": ["Le titre dormant", "qui réveille Tokyo"], "subtitle": "Sumitomo +17 % en une séance, RSI 71"}

Sujet "Stagflation + Alphabet vs Meta" :
✅ {"headlineLines": ["Alphabet +10 %,", "Meta -8 %"], "subtitle": "La tech se déchire sur les taux réels"}
✅ {"headlineLines": ["Stagflation", "frappe la tech"], "subtitle": "Alphabet domine, Meta décroche"}

# Réponds UNIQUEMENT en JSON valide. Pas de markdown wrapper. Pas de commentaire.`;

async function generateLLMProps(input: {
  dominantTheme: string;
  thumbnailReason: string;
  keyFigure?: string;
  emotionalTone?: string;
  featuredTicker?: string;
  featuredChange?: number;
}): Promise<{ headlineLines: string[]; subtitle: string }> {
  const userPrompt = `Theme dominant : ${input.dominantTheme}
Pourquoi ce moment a été choisi : ${input.thumbnailReason}
${input.keyFigure ? `Chiffre clé : ${input.keyFigure}` : ''}
${input.emotionalTone ? `Ton émotionnel : ${input.emotionalTone}` : ''}
${input.featuredTicker ? `Asset star : ${input.featuredTicker} (${input.featuredChange! >= 0 ? '+' : ''}${input.featuredChange!.toFixed(1)}%)` : ''}

Produis le titre + subtitle de la thumbnail.`;

  return await generateStructuredJSON(HAIKU_SYSTEM_PROMPT, userPrompt, { role: 'fast' });
}

// ─── Main ────────────────────────────────────────────────────────

async function buildPropsForEpisode(date: string, useLlm: boolean, tempPublicDir: string): Promise<ThumbnailProps> {
  const root = projectRoot();
  const [y, m, d] = date.split('-');
  const epDir = path.join(root, 'episodes', y!, `${m}-${d}`);
  const scriptPath = path.join(epDir, 'script.json');
  const snapshotPath = path.join(epDir, 'snapshot.json');

  if (!fs.existsSync(scriptPath)) throw new Error(`script.json not found at ${scriptPath}`);

  const script: EpisodeScript = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const snapshot = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, 'utf-8')) : { assets: [] };

  const moment = script.direction?.thumbnailMoment;
  if (!moment) throw new Error(`No thumbnailMoment in ${date}/script.json — pipeline P6 must have produced one.`);

  const featured = pickFeaturedAsset(script, snapshot);
  // Cohérence titre/image : préfère le segment qui contient le featured asset
  // (= asset central du titre SEO), sinon fallback sur thumbnailMoment de C5.
  const featuredSymbol = pickFeaturedSymbol(script, snapshot);
  const featuredSegmentId = featuredSymbol
    ? script.sections.find(s => s.assets?.includes(featuredSymbol))?.id
    : undefined;
  const bgSegmentId = featuredSegmentId ?? moment.segmentId;
  if (featuredSegmentId && featuredSegmentId !== moment.segmentId) {
    console.log(`  [${date}] image segment: ${featuredSegmentId} (featured asset ${featuredSymbol}) vs C5 moment ${moment.segmentId}`);
  }
  const bgImagePath = pickBgImage(date, bgSegmentId, tempPublicDir);
  const accent = emotionToAccent(moment.emotionalTone);

  let headlineLines: string[];
  let subtitle: string;

  if (useLlm) {
    try {
      console.log(`  [${date}] calling Haiku...`);
      const llmProps = await generateLLMProps({
        dominantTheme: script.title,
        thumbnailReason: moment.reason,
        keyFigure: moment.keyFigure,
        emotionalTone: moment.emotionalTone,
        featuredTicker: featured?.ticker,
        featuredChange: featured?.changePct,
      });
      headlineLines = llmProps.headlineLines;
      subtitle = llmProps.subtitle;
    } catch (err) {
      console.warn(`  ⚠ Haiku failed for ${date}: ${(err as Error).message.slice(0, 100)} — using fallback`);
      const seed = script.seo?.title?.split(/[—\|:,]/)[0]?.trim() ?? script.title;
      const words = seed.split(/\s+/).filter(w => w.length > 1);
      headlineLines = words.length >= 4 ? [words.slice(0, 2).join(' '), words.slice(2, 4).join(' ')] : [words.join(' ')];
      subtitle = moment.keyFigure ?? '';
    }
  } else {
    const seed = script.seo?.title?.split(/[—\|:,]/)[0]?.trim() ?? script.title;
    const words = seed.split(/\s+/).filter(w => w.length > 1);
    headlineLines = words.length >= 4 ? [words.slice(0, 2).join(' '), words.slice(2, 4).join(' ')] : [words.join(' ')];
    subtitle = moment.keyFigure ?? '';
  }

  return {
    headlineLines,
    dateLabel: formatDateLabel(date),
    subtitle,
    ticker: featured,
    bgImagePath,
    accent,
  };
}

function renderVariant(date: string, variant: Variant, props: ThumbnailProps, tempPublicDir: string, propsPath: string): void {
  const root = projectRoot();
  const [y, m, d] = date.split('-');
  const epDir = path.join(root, 'episodes', y!, `${m}-${d}`);
  const draftsDir = path.join(epDir, 'thumbnail-drafts');
  if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });

  const compositionId = VARIANT_COMPOSITION[variant];
  const outPath = path.join(draftsDir, `${date}-${variant}.png`);
  const remotionEntry = path.join(root, 'packages', 'remotion-app', 'src', 'index.ts');
  const cmd = `npx remotion still "${remotionEntry}" ${compositionId} "${outPath}" --props="${propsPath}" --public-dir="${tempPublicDir}" --browser-launch-timeout=120000 --timeout=300000`;

  console.log(`  [${date}] variant ${variant} → ${path.relative(root, outPath)}`);
  execSync(cmd, { stdio: 'pipe', cwd: root });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dates.length === 0) {
    console.error(`Usage:
  npm run thumbnail -- --date 2026-05-04                            # 1 date, variant A
  npm run thumbnail -- --date 2026-05-04 --variant B                # 1 date, 1 variant
  npm run thumbnail -- --date 2026-05-04 --all-variants             # 1 date, all 4 variants
  npm run thumbnail -- --dates 2026-05-04,2026-05-02 --all-variants # 2 dates × 4 variants
  npm run thumbnail -- ... --no-llm                                 # mechanical fallback`);
    process.exit(1);
  }

  console.log(`\n═══ Thumbnail generation — ${args.dates.length} date(s) × ${args.variants.length} variant(s) ═══\n`);

  const root = projectRoot();
  let totalRendered = 0;
  const startTime = Date.now();

  for (const date of args.dates) {
    const [y, m, d] = date.split('-');
    const epDir = path.join(root, 'episodes', y!, `${m}-${d}`);

    if (!fs.existsSync(epDir)) {
      console.warn(`  ⚠ Skip ${date} — episode dir missing`);
      continue;
    }

    // Setup temp public dir per date
    const tempPublicDir = path.join(epDir, '.thumbnail-public');
    if (fs.existsSync(tempPublicDir)) fs.rmSync(tempPublicDir, { recursive: true, force: true });
    fs.mkdirSync(tempPublicDir, { recursive: true });

    try {
      // 1. Build props ONCE per date (LLM call shared across variants)
      const props = await buildPropsForEpisode(date, !args.noLlm, tempPublicDir);
      console.log(`  [${date}] headline=${JSON.stringify(props.headlineLines)} subtitle="${props.subtitle?.slice(0, 60)}..."`);

      const propsPath = path.join(epDir, 'thumbnail-props.json');
      fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

      // 2. Render each variant
      for (const variant of args.variants) {
        try {
          renderVariant(date, variant, props, tempPublicDir, propsPath);
          totalRendered++;
        } catch (err) {
          console.error(`  ✗ ${date}/variant ${variant} failed: ${(err as Error).message.slice(0, 200)}`);
        }
      }
    } catch (err) {
      console.error(`  ✗ ${date} failed: ${(err as Error).message}`);
    } finally {
      try { fs.rmSync(tempPublicDir, { recursive: true, force: true }); } catch {}
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n═══ Done : ${totalRendered} thumbnails in ${elapsed}s ═══`);

  // If exactly 1 date × 1 variant, promote it to the official thumbnail.png
  // (used by upload-youtube.ts). For multi-render planches, no auto-promotion.
  if (args.dates.length === 1 && args.variants.length === 1 && totalRendered === 1) {
    const [y, m, d] = args.dates[0]!.split('-');
    const epDir = path.join(projectRoot(), 'episodes', y!, `${m}-${d}`);
    const draftPath = path.join(epDir, 'thumbnail-drafts', `${args.dates[0]}-${args.variants[0]}.png`);
    const officialPath = path.join(epDir, 'thumbnail.png');
    if (fs.existsSync(draftPath)) {
      fs.copyFileSync(draftPath, officialPath);
      console.log(`Promoted variant ${args.variants[0]} → ${officialPath}`);
    }
  } else {
    console.log(`Output : episodes/YYYY/MM-DD/thumbnail-drafts/`);
    console.log(`To promote a variant : copy thumbnail-drafts/DATE-X.png → thumbnail.png`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
