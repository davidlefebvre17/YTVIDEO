import { generateStructuredJSON } from "../llm-client";
import type {
  SnapshotFlagged, EditorialPlan, EpisodeSummary, PlannedSegment,
} from "./types";
import type { Language } from "@yt-maker/core";
import type { BriefingPack } from "./helpers/briefing-pack";
import { formatBriefingPack } from "./helpers/briefing-pack";
import type { NewsDigest } from "./p1b-news-digest";
import { formatNewsDigest } from "./p1b-news-digest";
import { detectCalendarPatterns, formatCalendarPatterns } from "./helpers/calendar-patterns";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

/**
 * Format flagged assets as compact lines for C1 prompt.
 * ~1500 tokens for 38 assets.
 */
function formatAssetsCompact(flagged: SnapshotFlagged): string {
  return flagged.assets
    .map(a => {
      const drama = a.snapshot.technicals?.dramaScore?.toFixed(0) ?? '?';
      const hi = a.snapshot.high24h;
      const lo = a.snapshot.low24h;
      const range = (hi && lo && Math.abs(hi - lo) > 0) ? ` | séance:[${lo.toFixed(2)}–${hi.toFixed(2)}]` : '';
      const tag = a.promoted ? ' [PROMU — FOCUS/FLASH max]' : '';
      return `${a.symbol} | ${a.name} | ${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}%${range} | score:${a.materialityScore} | flags:${a.flags.join(',') || 'none'} | drama:${drama}${tag}`;
    })
    .join('\n');
}

function formatEventsCompact(flagged: SnapshotFlagged, snapDayName?: string): string {
  if (!flagged.events.length) return `Aucun événement économique ce ${snapDayName ?? 'jour'}.`;
  return flagged.events
    .map(e => `${e.time} ${e.name} (${e.currency}, ${e.impact})${e.forecast ? ` consensus:${e.forecast}` : ''}${e.actual ? ` résultat:${e.actual}` : ''}`)
    .join('\n');
}

function formatEpisodeSummariesCompact(summaries: EpisodeSummary[]): string {
  if (!summaries.length) return 'Pas d\'historique disponible.';
  return summaries.map(s => {
    let line = `${s.label} (${s.date})`;
    if (s.moodMarche) line += ` [${s.moodMarche}]`;
    if (s.dominantTheme) line += ` — "${s.dominantTheme}"`;
    if (s.segmentTopics.length) line += `\n  Sujets: ${s.segmentTopics.join(' | ')}`;
    if (s.predictions.length) {
      const preds = s.predictions.map(p => `${p.asset}:${p.claim}${p.resolved ? '(résolu)' : ''}`).join(', ');
      line += `\n  Prédictions: ${preds}`;
    }
    if (s.angles.length) line += `\n  Angles: ${s.angles.filter(Boolean).join(', ')}`;
    if (s.mechanismsExplained?.length) line += `\n  Mécanismes enseignés: ${s.mechanismsExplained.join(' | ')}`;
    if (s.forwardLooking?.length) line += `\n  À venir: ${s.forwardLooking.join(' | ')}`;
    if (s.assetMoves?.length) {
      const moves = s.assetMoves
        .filter(m => m.covered || Math.abs(m.changePct) > 3)
        .map(m => `${m.symbol} ${m.changePct > 0 ? '+' : ''}${m.changePct.toFixed(1)}% @${m.price.toFixed(0)}${m.covered ? '★' : ''}`)
        .join(', ');
      if (moves) line += `\n  Moves: ${moves}`;
    }
    return line;
  }).join('\n\n');
}

/**
 * Build multi-day trajectory summary for key assets across recent episodes.
 * Shows cumulative direction so C1 can detect trends, reversals, and continuations.
 */
function buildAssetTrajectories(summaries: EpisodeSummary[]): string {
  if (summaries.length < 2) return '';

  // Collect all asset moves across episodes
  const assetHistory = new Map<string, Array<{ date: string; label: string; changePct: number; price: number; covered: boolean }>>();

  for (const s of summaries) {
    for (const m of s.assetMoves ?? []) {
      if (!assetHistory.has(m.symbol)) assetHistory.set(m.symbol, []);
      assetHistory.get(m.symbol)!.push({
        date: s.date, label: s.label,
        changePct: m.changePct, price: m.price, covered: m.covered,
      });
    }
  }

  // Only show assets that appear 2+ times or were covered
  const lines: string[] = [];
  for (const [symbol, history] of assetHistory) {
    if (history.length < 2 && !history.some(h => h.covered)) continue;

    const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
    const cumulative = sorted.reduce((sum, h) => sum + h.changePct, 0);
    const direction = sorted.every(h => h.changePct > 0) ? '↑ hausse continue'
      : sorted.every(h => h.changePct < 0) ? '↓ baisse continue'
      : (sorted[sorted.length - 1].changePct > 0) !== (sorted[sorted.length - 2]?.changePct > 0) ? '↕ retournement'
      : '~ volatile';

    const trajectory = sorted.map(h =>
      `${h.label}:${h.changePct > 0 ? '+' : ''}${h.changePct.toFixed(1)}%@${h.price.toFixed(0)}${h.covered ? '★' : ''}`
    ).join(' → ');

    lines.push(`${symbol} [${direction}, cumul ${cumulative > 0 ? '+' : ''}${cumulative.toFixed(1)}%] ${trajectory}`);
  }

  if (lines.length === 0) return '';
  return `\n## TRAJECTOIRES MULTI-JOURS (contexte narratif)\nChaque ligne = historique récent d'un asset. ★ = couvert dans un segment. Utilise pour contextualiser : "ça continue", "retournement", "accélération".\n${lines.join('\n')}\n`;
}

function formatThemesCompact(flagged: SnapshotFlagged): string {
  if (!flagged.themesDuJour) return 'Pas de thèmes pré-digérés.';
  const tdj = flagged.themesDuJour;
  let text = `Régime: ${tdj.marketRegime}\n\n`;
  for (const theme of tdj.themes.slice(0, 8)) {
    text += `${theme.label.fr} [editorial:${theme.editorialScore.toFixed(0)}] — assets: ${theme.assets.join(', ')}\n`;
    if (theme.causalChain?.length) text += `  Causal: ${theme.causalChain.join(' → ')}\n`;
  }
  if (tdj.eventSurprises.length) {
    text += `\nSurprises: ${tdj.eventSurprises.map(e => `${e.eventName} ${e.direction} ${e.magnitude}`).join(', ')}`;
  }
  return text;
}

function buildC1SystemPrompt(): string {
  return `Tu es l'éditeur en chef d'une émission quotidienne d'analyse de marché (vidéo YouTube, ~8 min).
Tu sélectionnes les sujets, leur profondeur, et l'ordre narratif.

RÔLE : Décider QUOI couvrir et dans QUEL ORDRE. Tu ne rédiges pas, tu ne fais pas d'analyse technique détaillée.

MÉTHODE ÉDITORIALE (dans cet ordre) :
1. ÉVÉNEMENTS STRUCTURELS D'ABORD : avant de regarder les scores et les prix, parcours les ÉVÉNEMENTS STRUCTURELS pré-filtrés et le calendrier éco. Ces événements méritent un segment même si l'asset n'a pas bougé. Si un événement game_changer ou significant est lié à un asset, l'ANGLE du segment DOIT adresser cet événement — le prix est la conséquence, l'événement est la cause. Ne réduis jamais un game_changer à une ligne dans un segment sur le prix.
2. MOUVEMENTS DE PRIX ENSUITE : parmi les assets à fort materialityScore, identifie ceux dont le mouvement a un CATALYSEUR clair. Un +3% sans explication est moins intéressant qu'un +1% causé par un événement identifiable.
3. SUIVI DES FILS : parcours les épisodes récents. Si un sujet couvert J-1 ou J-2 (asset, thème, stock promu) réapparaît dans les données d'aujourd'hui — retournement, continuation, résolution — c'est un angle narratif fort. Le spectateur veut savoir "et alors, qu'est-ce qui s'est passé depuis ?". Un retournement (hier +7%, aujourd'hui -6%) vaut souvent un segment à lui seul.
4. CONTEXTE PRIX (section "Moves" des épisodes récents) : utilise les prix et variations des épisodes précédents pour contextualiser les moves d'aujourd'hui. RÈGLES :
   - Si un asset était à X$ J-1 et à Y$ aujourd'hui → CALCULE le move cumulé et nomme-le (retournement, continuation, accélération)
   - JAMAIS dire "s'effondre de -5%" si hier c'était déjà -10% → dire "continue de reculer" ou "la chute ralentit"
   - JAMAIS dire "explose de +12%" si hier c'était déjà +8% → dire "la hausse s'accélère" ou "le rally continue"
   - Un RETOURNEMENT (direction opposée à J-1) mérite un angle dédié : "hier -14%, aujourd'hui +12%" est UNE HISTOIRE
   - Le symbole ★ dans les Moves indique que l'asset était couvert dans un segment — le spectateur s'en souvient, il faut y faire référence
5. LIENS NARRATIFS : un bon épisode raconte UNE histoire avec plusieurs facettes, pas une liste de sujets indépendants. Cherche le fil conducteur qui relie au moins 3 segments.

CONTRAINTES STRUCTURELLES (STRICTES) :
- Sélectionner 4 à 7 segments
- Maximum 2 DEEP (analyse approfondie 70-90s)
- Minimum 2 FLASH (brève 20-30s)
- Le premier segment = le sujet le plus important / impactant
- Le dernier segment = TOUJOURS un FLASH (sortie légère)
- Ne pas re-couvrir un sujet traité les 2 derniers jours avec le MÊME angle
- Identifier au moins 1 continuité J-1 si une prédiction passée est résolue ou invalidée
- Le fil conducteur (threadSummary) doit relier au moins 3 segments entre eux

### MÉCANISMES DÉJÀ ENSEIGNÉS (anti-répétition)

Les épisodes récents listent les MÉCANISMES FONDAMENTAUX déjà expliqués au spectateur. Ces mécanismes sont ACQUIS — le spectateur les comprend.

Règles :
1. **Ne JAMAIS ré-expliquer un mécanisme déjà enseigné.** Si J-1 a expliqué "Iran → pétrole → inflation → Fed contrainte", le spectateur le sait. Aujourd'hui, référencez-le en une phrase ("on a vu hier pourquoi le pétrole monte quand Trump parle") et ALLEZ PLUS LOIN.
2. **Aller plus profond** : si le même asset revient, l'angle DOIT explorer un mécanisme DIFFÉRENT. Exemples :
   - J-1 a expliqué la chaîne pétrole→inflation → aujourd'hui explore le spread Brent-WTI, ou le positionnement COT, ou l'impact sur les compagnies aériennes
   - J-1 a expliqué la correction Nasdaq → aujourd'hui explore le ratio put/call, ou la rotation Growth→Value, ou les rachats d'actions
   - J-1 a expliqué le paradoxe or/refuge → aujourd'hui explore les achats banques centrales, ou la saisonnalité T1 de l'or
3. Dans le champ "angle" : préciser QUEL nouveau mécanisme sera exploré (pas juste le topic)
4. **Exception** : si l'événement est un retournement COMPLET (hier -6%, aujourd'hui +8%), le retournement lui-même EST le nouveau mécanisme
- DÉCLENCHEURS POLITIQUES : si un mouvement >3% est lié à une déclaration politique identifiable, le champ trigger est OBLIGATOIRE (actor + action + source)
- COHÉRENCE THÉMATIQUE INVERSE : si le thème du jour est géopolitique, cherche les actifs en direction OPPOSÉE (défense si désescalade, refuges si escalade) — ces actifs ont valeur de "revers de médaille" même avec un drama score modéré
- STOCKS PROMUS [PROMU] : ces actions hors-watchlist ont été promues par le scoring (earnings, buzz, mouvement extrême). Elles peuvent être FOCUS ou FLASH (jamais DEEP — données allégées). Intègre-les si leur histoire est narrativement forte.
- RÔLE NARRATIF : le dernier FLASH doit idéalement BOUCLER l'histoire du jour (narrativeRole = "closer")
- ACTIFS PONT : si un actif relie deux segments thématiquement, il peut être mentionné dans les deux segments ou avoir un rôle "bridge"
- DÉDUPLICATION ASSETS : chaque symbole ne peut apparaître qu'en PROPRIÉTAIRE dans un seul segment. S'il est asset principal dans un DEEP, il ne peut pas être asset principal dans un autre segment — référencer seulement via le contexte narratif, pas dans la liste assets[]
- COT (CFTC) : les données de positionnement sont toujours décalées de 7-11 jours. Tu peux t'en servir comme contexte de fond ("les spéculateurs étaient déjà positionés long avant le move") mais JAMAIS comme cause directe du move du jour. Ne pas écrire "la COT flip explique/confirme le +X% d'aujourd'hui".
- DÉCISIONS À VENIR (banque centrale, politique, résultats) : tu CONSTATES qu'une décision approche et que le marché réagit, tu ne SPÉCULES PAS sur le résultat. "La Fed se réunit demain" = fait. "Le marché anticipe une baisse de taux" = spéculation INTERDITE sauf si des données chiffrées (futures, OIS, swaps) quantifient cette anticipation. Les angles et le threadSummary doivent rester factuels — l'interprétation éditoriale appartient aux étapes suivantes.

PROFONDEURS :
- DEEP : chaîne causale complète, 2 scénarios, technique + fondamental (70-90s, 175-225 mots)
- FOCUS : move + catalyst + conséquences + 1 niveau + 1 scénario (40-60s, 100-150 mots)
- FLASH : fait + cause + conséquence, 3 phrases max (20-30s, 50-75 mots)

SORTIE : JSON strict, schéma EditorialPlan.`;
}

function buildC1UserPrompt(
  flagged: SnapshotFlagged,
  episodeSummaries: EpisodeSummary[],
  researchContext: string,
  weeklyBrief: string,
  briefingPack?: BriefingPack,
  newsDigest?: NewsDigest,
): string {
  let prompt = '';

  const anchors = buildTemporalAnchors(flagged.date);
  prompt += `${anchors.block}\n\n`;

  // News digest FIRST — structural events before raw data
  if (newsDigest?.events.length) {
    prompt += formatNewsDigest(newsDigest);
  }

  // Calendar patterns (CB clusters, macro clusters)
  const calendarPatterns = detectCalendarPatterns(
    flagged.events ?? [],
    flagged.upcomingEvents ?? [],
    flagged.yesterdayEvents ?? [],
    flagged.date,
  );
  if (calendarPatterns.length) {
    prompt += formatCalendarPatterns(calendarPatterns);
  }

  prompt += `## THÈMES DU JOUR\n${formatThemesCompact(flagged)}\n\n`;
  prompt += `## ASSETS SCORÉS (${flagged.assets.length} total)\n${formatAssetsCompact(flagged)}\n\n`;
  prompt += `## CALENDRIER ÉCO\n${formatEventsCompact(flagged, anchors.snapDayName)}\n\n`;

  // Briefing Pack (raw editorial facts)
  if (briefingPack) {
    prompt += formatBriefingPack(briefingPack);
  }

  // Earnings
  const earningsToday = flagged.earnings.filter(e => e.earningsDetail?.publishingToday);
  if (earningsToday.length) {
    prompt += `## EARNINGS DU JOUR\n`;
    for (const e of earningsToday) {
      prompt += `${e.symbol} (${e.name}) — ${e.reason.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // News clusters — stocks with high news volume but not in watchlist
  if (flagged.newsClusters?.length) {
    prompt += `## ACTUALITÉS HORS WATCHLIST (stocks avec forte couverture médiatique)\n`;
    prompt += `Ces actions ne sont pas dans la watchlist des 38 assets mais font l'objet d'un volume d'articles inhabuel. Elles peuvent être mentionnées en FLASH si narrativement pertinentes.\n`;
    for (const cluster of flagged.newsClusters) {
      prompt += `${cluster.symbol} (${cluster.name}) — ${cluster.articleCount} articles${cluster.changePct !== undefined ? `, var: ${cluster.changePct > 0 ? '+' : ''}${cluster.changePct.toFixed(1)}%` : ''}\n`;
      for (const title of cluster.titles.slice(0, 3)) {
        prompt += `  • ${title.slice(0, 120)}\n`;
      }
    }
    prompt += '\n';
  }

  prompt += `## ÉPISODES RÉCENTS (${episodeSummaries.length} jours)\n`;

  // Extract all mechanisms from last 3 days for emphasis
  const recentMechanisms = episodeSummaries
    .filter(s => ['J-1', 'J-2', 'J-3'].includes(s.label))
    .flatMap(s => s.mechanismsExplained || []);

  if (recentMechanisms.length > 0) {
    prompt += `\n⚠️ MÉCANISMES ACQUIS PAR LE SPECTATEUR (J-1 à J-3) — NE PAS ré-expliquer :\n`;
    prompt += recentMechanisms.map(m => `  - ${m}`).join('\n');
    prompt += `\n\nPour chaque segment sur un asset déjà couvert, l'ANGLE doit explorer un mécanisme DIFFÉRENT de ceux ci-dessus.\n\n`;
  }

  prompt += `${formatEpisodeSummariesCompact(episodeSummaries)}\n\n`;

  if (researchContext) {
    prompt += `## CONTEXTE HISTORIQUE (NewsMemory — articles ANTÉRIEURS au ${flagged.date})\n`;
    prompt += `Ces articles sont des ARCHIVES, pas des news du jour. Utilise-les pour :\n`;
    prompt += `- Identifier les CONTINUITÉS : un sujet couvert depuis plusieurs jours mérite un angle "suivi"\n`;
    prompt += `- Éviter de présenter comme NOUVEAU un fait déjà couvert\n`;
    prompt += `- Repérer l'arc narratif d'une histoire (montée, pic, retombée)\n`;
    prompt += `Les dates [J-N] indiquent l'ancienneté de chaque article.\n\n`;
    prompt += researchContext + '\n\n';
  }

  if (weeklyBrief) {
    prompt += `## BRIEF HEBDO (MarketMemory)\n${weeklyBrief}\n\n`;
  }

  prompt += `## FORMAT DE SORTIE\nRetourne un JSON avec cette structure exacte :
{
  "date": "YYYY-MM-DD",
  "dominantTheme": "slug-du-theme",
  "threadSummary": "Le fil conducteur en 1-2 phrases",
  "moodMarche": "risk-on" | "risk-off" | "incertain" | "rotation",
  "coldOpenFact": "Le fait le plus frappant pour le hook",
  "closingTeaser": "Question d'engagement pour le closing",
  "segments": [
    {
      "id": "seg_1",
      "topic": "slug-du-sujet",
      "depth": "DEEP" | "FOCUS" | "FLASH",
      "assets": ["SYMBOL1", "SYMBOL2"],
      "angle": "L'angle éditorial spécifique",
      "justification": "Pourquoi ce sujet à cette profondeur",
      "continuityFromJ1": "optionnel — ref à un épisode précédent",
      "trigger": { "actor": "nom", "action": "type d'action", "source": "titre de l'article source" },
      "narrativeRole": "opener | bridge | inverse | closer | standard"
    }
  ],
  "skippedAssets": [
    { "symbol": "SYM", "reason": "couvert hier avec même angle" }
  ],
  "deepCount": 2,
  "flashCount": 2,
  "totalSegments": 5
}`;

  return prompt;
}

/**
 * Validate C1 output structurally.
 */
export function validateEditorialPlan(plan: EditorialPlan): string[] {
  const errors: string[] = [];

  if (!plan.segments || !Array.isArray(plan.segments))
    return ['segments manquants ou invalides'];

  if (plan.segments.length < 4 || plan.segments.length > 7)
    errors.push(`${plan.segments.length} segments (attendu 4-7)`);

  const deepCount = plan.segments.filter(s => s.depth === 'DEEP').length;
  const flashCount = plan.segments.filter(s => s.depth === 'FLASH').length;

  if (deepCount > 2)
    errors.push(`${deepCount} DEEP (max 2)`);
  if (flashCount < 2)
    errors.push(`${flashCount} FLASH (min 2)`);

  const lastSeg = plan.segments[plan.segments.length - 1];
  if (lastSeg && lastSeg.depth !== 'FLASH')
    errors.push(`Dernier segment est ${lastSeg.depth}, doit être FLASH`);

  if (!plan.threadSummary || plan.threadSummary.length < 10)
    errors.push('threadSummary trop court ou manquant');

  if (!plan.coldOpenFact || plan.coldOpenFact.length < 5)
    errors.push('coldOpenFact manquant');

  if (!plan.dominantTheme)
    errors.push('dominantTheme manquant');

  // Check segment IDs are unique
  const ids = plan.segments.map(s => s.id);
  if (new Set(ids).size !== ids.length)
    errors.push('IDs de segments non uniques');

  // Check each segment has required fields
  for (const seg of plan.segments) {
    if (!seg.id || !seg.topic || !seg.depth || !seg.assets?.length || !seg.angle)
      errors.push(`Segment ${seg.id}: champs requis manquants`);
  }

  return errors;
}

/**
 * Fallback: mechanical selection when C1 fails twice.
 */
function fallbackEditorialPlan(flagged: SnapshotFlagged): EditorialPlan {
  const top = flagged.assets.filter(a => a.materialityScore > 0).slice(0, 5);
  // If not enough flagged, take top by changePct
  while (top.length < 4) {
    const next = flagged.assets.find(a => !top.includes(a));
    if (!next) break;
    top.push(next);
  }

  const segments: PlannedSegment[] = top.map((a, i) => ({
    id: `seg_${i + 1}`,
    topic: a.symbol.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    depth: i === 0 ? 'DEEP' as const : i < 3 ? 'FOCUS' as const : 'FLASH' as const,
    assets: [a.symbol],
    angle: `Variation ${a.changePct.toFixed(1)}%`,
    justification: `Score matérialité ${a.materialityScore}, flags: ${a.flags.join(', ')}`,
  }));

  return {
    date: flagged.date,
    dominantTheme: 'marche-general',
    threadSummary: 'Les marchés du jour',
    moodMarche: 'incertain',
    coldOpenFact: `${top[0]?.name ?? 'Marchés'} en mouvement`,
    closingTeaser: 'Quel actif surveillez-vous demain ?',
    segments,
    skippedAssets: [],
    deepCount: segments.filter(s => s.depth === 'DEEP').length,
    flashCount: segments.filter(s => s.depth === 'FLASH').length,
    totalSegments: segments.length,
  };
}

/**
 * Run C1 Sonnet — editorial selection.
 */
export async function runC1Editorial(input: {
  flagged: SnapshotFlagged;
  episodeSummaries: EpisodeSummary[];
  researchContext: string;
  weeklyBrief: string;
  briefingPack?: BriefingPack;
  newsDigest?: NewsDigest;
  lang: Language;
  feedback?: string[];
}): Promise<EditorialPlan> {
  const systemPrompt = buildC1SystemPrompt();
  let userPrompt = buildC1UserPrompt(
    input.flagged,
    input.episodeSummaries,
    input.researchContext,
    input.weeklyBrief,
    input.briefingPack,
    input.newsDigest,
  );

  if (input.feedback?.length) {
    userPrompt += `\n\n## FEEDBACK (corrige ces erreurs)\n${input.feedback.join('\n')}`;
  }

  console.log('  P2 C1 Sonnet — sélection éditoriale...');

  try {
    const plan = await generateStructuredJSON<EditorialPlan>(
      systemPrompt,
      userPrompt,
      { role: 'balanced' },
    );

    // Ensure counts are correct
    plan.deepCount = plan.segments.filter(s => s.depth === 'DEEP').length;
    plan.flashCount = plan.segments.filter(s => s.depth === 'FLASH').length;
    plan.totalSegments = plan.segments.length;
    plan.date = input.flagged.date;

    const errors = validateEditorialPlan(plan);
    if (errors.length > 0 && !input.feedback) {
      // First failure — retry with feedback
      console.log(`  C1 validation errors: ${errors.join('; ')}`);
      return runC1Editorial({ ...input, feedback: errors });
    }

    if (errors.length > 0) {
      // Second failure — fallback
      console.warn(`  C1 failed twice, using mechanical fallback`);
      return fallbackEditorialPlan(input.flagged);
    }

    return plan;
  } catch (err) {
    console.error(`  C1 error: ${(err as Error).message.slice(0, 100)}`);
    return fallbackEditorialPlan(input.flagged);
  }
}
