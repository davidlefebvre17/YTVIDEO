import { generateStructuredJSON } from "../llm-client";
import type {
  SnapshotFlagged, EditorialPlan, EpisodeSummary, PlannedSegment,
} from "./types";
import type { Language } from "@yt-maker/core";
import type { BriefingPack } from "./helpers/briefing-pack";
import { formatBriefingPack } from "./helpers/briefing-pack";

/**
 * Format flagged assets as compact lines for C1 prompt.
 * ~1500 tokens for 38 assets.
 */
function formatAssetsCompact(flagged: SnapshotFlagged): string {
  return flagged.assets
    .map(a => {
      const drama = a.snapshot.technicals?.dramaScore?.toFixed(0) ?? '?';
      return `${a.symbol} | ${a.name} | ${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}% | score:${a.materialityScore} | flags:${a.flags.join(',') || 'none'} | drama:${drama}`;
    })
    .join('\n');
}

function formatEventsCompact(flagged: SnapshotFlagged): string {
  if (!flagged.events.length) return 'Aucun événement économique aujourd\'hui.';
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
    return line;
  }).join('\n\n');
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

CONTRAINTES STRUCTURELLES (STRICTES) :
- Sélectionner 4 à 7 segments
- Maximum 2 DEEP (analyse approfondie 70-90s)
- Minimum 2 FLASH (brève 20-30s)
- Le premier segment = le sujet le plus important / impactant
- Le dernier segment = TOUJOURS un FLASH (sortie légère)
- Ne pas re-couvrir un sujet traité les 2 derniers jours avec le MÊME angle
- Identifier au moins 1 continuité J-1 si une prédiction passée est résolue ou invalidée
- Le fil conducteur (threadSummary) doit relier au moins 3 segments entre eux
- DÉCLENCHEURS POLITIQUES : si un mouvement >3% est lié à une déclaration politique identifiable, le champ trigger est OBLIGATOIRE (actor + action + source)
- COHÉRENCE THÉMATIQUE INVERSE : si le thème du jour est géopolitique, cherche les actifs en direction OPPOSÉE (défense si désescalade, refuges si escalade) — ces actifs ont valeur de "revers de médaille" même avec un drama score modéré
- MOVERS HORS WATCHLIST : les top movers du stock screening peuvent être inclus comme FLASH si leur mouvement est narrativement lié au thème dominant
- RÔLE NARRATIF : le dernier FLASH doit idéalement BOUCLER l'histoire du jour (narrativeRole = "closer")
- ACTIFS PONT : si un actif relie deux segments (ex: DXY relie pétrole et or), il peut être mentionné dans les deux segments ou avoir un rôle "bridge"

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
): string {
  let prompt = '';

  prompt += `## THÈMES DU JOUR\n${formatThemesCompact(flagged)}\n\n`;
  prompt += `## ASSETS SCORÉS (${flagged.assets.length} total)\n${formatAssetsCompact(flagged)}\n\n`;
  prompt += `## CALENDRIER ÉCO\n${formatEventsCompact(flagged)}\n\n`;

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

  prompt += `## ÉPISODES RÉCENTS (${episodeSummaries.length} jours)\n${formatEpisodeSummariesCompact(episodeSummaries)}\n\n`;

  if (researchContext) {
    prompt += `## CONTEXTE RECHERCHE (NewsMemory)\n${researchContext}\n\n`;
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
 * Run C1 Haiku — editorial selection.
 */
export async function runC1Editorial(input: {
  flagged: SnapshotFlagged;
  episodeSummaries: EpisodeSummary[];
  researchContext: string;
  weeklyBrief: string;
  briefingPack?: BriefingPack;
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
  );

  if (input.feedback?.length) {
    userPrompt += `\n\n## FEEDBACK (corrige ces erreurs)\n${input.feedback.join('\n')}`;
  }

  console.log('  P2 C1 Haiku — sélection éditoriale...');

  try {
    const plan = await generateStructuredJSON<EditorialPlan>(
      systemPrompt,
      userPrompt,
      { role: 'fast' },
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
