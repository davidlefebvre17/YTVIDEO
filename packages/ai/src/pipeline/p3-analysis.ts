import * as fs from "fs";
import * as path from "path";
import { generateStructuredJSON } from "../llm-client";
import { loadMemory } from "@yt-maker/data";
import type {
  SnapshotFlagged, EditorialPlan, AnalysisBundle, CausalBrief,
  FlaggedAsset, EpisodeSummary,
} from "./types";
import type { DailySnapshot, Language } from "@yt-maker/core";
import type { BriefingPack } from "./helpers/briefing-pack";
import { formatBriefingPackMinimal } from "./helpers/briefing-pack";
import { buildTemporalAnchors, labelEventDate } from "./helpers/temporal-anchors";

const KNOWLEDGE_DIR = path.resolve(__dirname, "..", "knowledge");

/**
 * Load only Tier 2/3 knowledge for C2 (no Tier 1 tone/narration/TA).
 * C2 is an analyst, not a writer — it needs fundamentals, not writing style.
 * Caps total knowledge at ~8000 chars to keep prompt manageable.
 */
function loadKnowledgeForC2(snapshot: DailySnapshot, selectedSymbols: string[]): string {
  const sections: string[] = [];
  const readFile = (name: string): string => {
    const p = path.join(KNOWLEDGE_DIR, name);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
  };

  // Tier 2 conditional (fundamentals only, ~1500-3000 chars each)
  const hasGeoNews = snapshot.news.slice(0, 50).filter(n => {
    const t = n.title.toLowerCase();
    return ["war", "guerre", "sanction", "tariff", "iran", "russia", "ukraine", "china", "taiwan", "tension"].some(k => t.includes(k));
  }).length >= 3;

  if (hasGeoNews) {
    const geo = readFile("geopolitics.md");
    if (geo) sections.push(geo.slice(0, 3000));
  }

  const hasMacroEvent = snapshot.events.some(e => e.impact === "high");
  if (hasMacroEvent) {
    const macro = readFile("macro-indicators.md");
    if (macro) sections.push(macro.slice(0, 3000));
  }

  const bigMovers = snapshot.assets.filter(a => Math.abs(a.changePct) > 1.5).length;
  if (bigMovers >= 5) {
    const inter = readFile("intermarket.md");
    if (inter) sections.push(inter.slice(0, 2000));
  }

  // Tier 3: only profiles for selected DEEP/FOCUS assets (not all 763)
  const profiles = readFile("asset-profiles.md");
  if (profiles) {
    const profileSections = profiles.split(/(?=^## )/m);
    const symbolPatterns: Record<string, string[]> = {
      "GC=F": ["## Or ("], "SI=F": ["## Argent"], "CL=F": ["## Pétrole"],
      "BZ=F": ["## Pétrole"], "BTC-USD": ["## Bitcoin"], "ETH-USD": ["## Ethereum"],
      "^GSPC": ["## S&P 500"], "^FCHI": ["## CAC 40"], "DX-Y.NYB": ["## Dollar Index"],
      "EURUSD=X": ["## EUR/USD"], "^VIX": ["## VIX"], "HG=F": ["## Cuivre"],
      "NG=F": ["## Gaz naturel"],
    };
    const matched: string[] = [];
    for (const sym of selectedSymbols) {
      const patterns = symbolPatterns[sym];
      if (!patterns) continue;
      for (const sec of profileSections) {
        const firstLine = sec.split("\n")[0];
        if (patterns.some(p => firstLine.includes(p))) {
          matched.push(sec.trim().slice(0, 1500));
          break;
        }
      }
    }
    if (matched.length) sections.push(matched.join("\n\n"));
  }

  const result = sections.join("\n\n---\n\n");
  // Hard cap at 8000 chars
  return result.length > 8000 ? result.slice(0, 8000) + "\n...(tronqué)" : result;
}

/**
 * Format asset data for C2 prompt.
 * DEEP/FOCUS get full data, FLASH gets minimal.
 */
function formatAssetForC2(asset: FlaggedAsset, depth: 'DEEP' | 'FOCUS' | 'FLASH' | 'PANORAMA', snapshotDate?: string): string {
  const fmt = (n: number) => n.toFixed(asset.price > 100 ? 2 : 4);
  const hi = asset.snapshot.high24h;
  const lo = asset.snapshot.low24h;
  const groupTag = asset.snapshot.group ? ` [${asset.snapshot.group}]` : '';
  let text = `### ${asset.name} (${asset.symbol})${groupTag} — ${depth}\n`;
  text += `Prix (clôture): ${fmt(asset.price)} | Var jour: ${asset.changePct >= 0 ? '+' : ''}${asset.changePct.toFixed(2)}%`;
  const perf = asset.snapshot.perf;
  if (perf) {
    const p = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    // Rolling (sur la semaine/le mois/le trimestre/l'année écoulée)
    const rolling: string[] = [];
    if (perf.week !== undefined) rolling.push(`1S:${p(perf.week)}`);
    if (perf.month !== undefined) rolling.push(`1M:${p(perf.month)}`);
    if (perf.quarter !== undefined) rolling.push(`3M:${p(perf.quarter)}`);
    if (perf.year !== undefined) rolling.push(`1A:${p(perf.year)}`);
    if (rolling.length) text += ` | Rolling: ${rolling.join(' ')}`;
    // Calendaire (to-date)
    const cal: string[] = [];
    if (perf.wtd !== undefined) cal.push(`WTD:${p(perf.wtd)}`);
    if (perf.mtd !== undefined) cal.push(`MTD:${p(perf.mtd)}`);
    if (perf.qtd !== undefined) cal.push(`QTD:${p(perf.qtd)}`);
    if (perf.ytd !== undefined) cal.push(`YTD:${p(perf.ytd)}`);
    if (cal.length) text += ` | Calendaire: ${cal.join(' ')}`;
    if (perf.fromATH !== undefined) text += ` | depuis ATH: ${p(perf.fromATH)}`;
    if (perf.from52wLow !== undefined) text += ` | depuis plus bas 52s: ${p(perf.from52wLow)}`;
  }
  if (hi && lo) text += ` | Séance: low ${fmt(lo)} → high ${fmt(hi)}`;
  text += '\n';

  if (depth === 'FLASH' || depth === 'PANORAMA') return text + '\n';

  // Full data for DEEP/FOCUS
  const t = asset.snapshot.technicals;
  if (t) {
    text += `SMA20: ${fmt(t.sma20)} | SMA50: ${fmt(t.sma50)} | RSI: ${t.rsi14.toFixed(0)} | Trend: ${t.trend}\n`;
    text += `Supports: ${t.supports.map(fmt).join(', ') || '—'} | Résistances: ${t.resistances.map(fmt).join(', ') || '—'}\n`;
    text += `Volume: ${t.volumeAnomaly > 1.2 ? `+${((t.volumeAnomaly - 1) * 100).toFixed(0)}% vs moy` : 'normal'}\n`;
  }

  const m = asset.snapshot.multiTF;
  if (m) {
    text += `MultiTF: tendance séculaire=${m.weekly10y.trend} | moyen terme=${m.daily3y.trend}\n`;
    text += `  SMA200=${fmt(m.daily3y.sma200)} (${m.daily3y.aboveSma200 ? 'AU-DESSUS' : 'EN-DESSOUS'}) | ${m.daily3y.goldenCross ? 'GOLDEN' : 'DEATH'} CROSS\n`;
    text += `  ATH: ${m.weekly10y.distanceFromATH.toFixed(1)}% | High52w(calibration): ${fmt(m.daily1y.high52w)} | Low52w(calibration): ${fmt(m.daily1y.low52w)}\n`;
  }

  text += `Flags: ${asset.flags.join(', ') || 'none'}\n`;

  // MarketMemory D3
  try {
    const memory = loadMemory(asset.symbol);
    if (memory) {
      text += `MarketMemory: régime=${memory.context.regime}`;
      if (memory.context.impression) text += ` | "${memory.context.impression}"`;
      text += '\n';
      if (memory.zones.length) {
        text += `Zones: ${memory.zones.map(z => `${z.type} ${z.level} (${z.touches} touches, dernier: ${z.last_event_type ?? '?'})`).join(' | ')}\n`;
      }
      if (memory.last_events.length) {
        const snapD = snapshotDate ?? new Date().toISOString().slice(0, 10);
        text += `Events récents: ${memory.last_events.map(e => `${labelEventDate(e.date, snapD)} ${e.event_type}: ${e.detail}`).join(' | ')}\n`;
      }
      if (memory.indicators_daily) {
        const ind = memory.indicators_daily;
        // Only ATR for volatility context. No BB, no slope — not used in narration.
        text += `Volatilité historique: ATR_ratio=${ind.atr_ratio.toFixed(2)}\n`;
      }
    }
  } catch {
    // No memory for this asset
  }

  return text + '\n';
}

function formatCausalBrief(brief: CausalBrief): string {
  let text = '';
  if (brief.chains.length) {
    text += 'Chaînes causales détectées (CODE) :\n';
    for (const chain of brief.chains) {
      text += `- ${chain.name} (confiance: ${(chain.confidence * 100).toFixed(0)}%): ${chain.steps.join(' ')}\n`;
    }
  }
  if (brief.intermarketSignals.length) {
    text += 'Signaux intermarché :\n';
    for (const sig of brief.intermarketSignals) {
      text += `- ${sig.signal}: ${sig.implication}\n`;
    }
  }
  return text || 'Aucun signal intermarché notable.';
}

function buildC2SystemPrompt(): string {
  return `Tu es un analyste de marché senior. Tu produis des analyses structurées avec chaînes causales, scénarios chiffrés et niveaux techniques.

RÔLE : Analyser en profondeur les assets sélectionnés. Produire des données analytiques structurées. Tu ne rédiges PAS de narration.

RÈGLES :
- Pour chaque segment, produire EXACTEMENT les champs du schema SegmentAnalysis
- Les chartInstructions sont SÉMANTIQUES : quoi afficher (type, asset, value, label), PAS quand (le timing vient en P6)
- TYPES VISUELS DISPONIBLES pour chartInstructions:
  • Overlays prix (single asset): price_line, support_line, resistance_line, trend_line, zone_highlight, annotation, gauge_rsi
  • Multi-assets (mettre dans assets[]): chart_comparaison (J-1 vs J0), chart_split (2 assets simultanés), chart_correlation (overlay corrélation)
  • Data: yield_curve (courbe taux), gauge_fear_greed, multi_badge (max 4 assets), heatmap_sectorielle, countdown_event
  • Infographies: causal_chain (chaîne causale), scenario_fork (fork bull/bear), stat_callout (chiffre géant)
- Pour les types multi-assets: remplir le champ "assets": ["sym1", "sym2"] en plus de "asset" (premier asset)
- Utilise causal_chain pour montrer un MÉCANISME FONDAMENTAL (corrélation, transmission, principe économique), PAS un récit factuel de la journée. Les steps doivent être des principes réutilisables, pas des événements datés.
- Utilise scenario_fork pour les segments avec 2 scénarios chiffrés bullish/bearish
- Utilise gauge_rsi quand le RSI est un élément clé (surachat/survente)
- Utilise chart_comparaison pour les retournements marquants (J-1 vs J0)
- Les scénarios DOIVENT être CHIFFRÉS avec niveaux précis
- confidenceLevel reflète la qualité des données :
  • high : données techniques claires + catalyst identifié + pattern confirmé
  • medium : données partielles ou signal ambigu
  • speculative : extrapolation, pas de catalyst clair
- Le globalContext identifie les liens ENTRE segments, pas un résumé de chaque segment
- ZÉRO narration. Analyse brute uniquement.
- La causalChain décrit le MÉCANISME sous-jacent, pas la chronologie. Chaque step est un principe général que le spectateur peut réutiliser pour comprendre d'autres situations similaires. Pas de dates, pas de noms propres dans les steps.
- Pour chaque segment, renseigne sourcesUsed : liste des données utilisées (type + detail)
  Types valides : snapshot_price, news_article, knowledge_base, market_memory, causal_brief, inference
- Maximum 2 niveaux techniques clés par asset dans technicalReading — les plus pertinents pour la narration, pas tous les indicateurs disponibles
- Les niveaux supplémentaires vont dans chartInstructions (affichage visuel, pas narration)
- MÉCANISME FONDAMENTAL : pour chaque segment DEEP, identifier dans le champ coreMechanism le concept fondamental que le spectateur doit comprendre pour suivre l'analyse (ex: "relation taux directeurs / inflation", "carry trade", "divergence COT / prix"). Ce champ guide le rédacteur C3 pour intégrer un rappel pédagogique. Ne pas remplir si le segment ne repose sur aucun concept non-évident.
- RIGUEUR FACTUELLE : High52w/Low52w sont des NIVEAUX DE RÉFÉRENCE pour calibrer les scénarios (résistance/support lointain), PAS des faits à narrer. Ne JAMAIS écrire "plus haut/bas de 52 semaines" dans narrativeHook ou keyFacts sauf si le prix actuel est à ±2% de ce niveau
- DISTINCTION ACTIFS : ne jamais utiliser un terme générique ("le pétrole", "les cryptos", "les indices") quand un prix ou pourcentage est cité. Toujours nommer le contrat exact (WTI vs Brent, BTC vs ETH, S&P vs Nasdaq). Si un seuil est franchi par un seul des deux, nommer celui-ci.
- TRAÇABILITÉ DES NIVEAUX : pour chaque niveau technique (support, résistance, SMA, pivot) cité dans technicalReading ou scenarios, indiquer la source entre crochets :
  [MM] = MarketMemory zone, [SNAP] = prix/high/low du snapshot, [COT] = positionnement CFTC,
  [YIELD] = taux obligataires, [SCREEN] = stockScreen mover, [KB] = knowledge base.
  INTERDIT de citer un niveau sans tag source. Si aucune source ne fournit un niveau, NE PAS l'inventer.

RÈGLES COT (positionnement CFTC — lag structurel de 9-11 jours) :
Le COT reflète les positions AVANT le move du jour, jamais pendant. Trois règles absolues :
1. JAMAIS utiliser le COT comme confirmation d'un move du jour ("le COT confirme la hausse d'aujourd'hui" → INTERDIT)
2. JAMAIS citer le netChange comme explication d'un move récent si daysOld ≥ 7
3. SEULS usages valides :
   a. Signal prospectif de risque : "les spéculateurs étaient extreme_long avant le spike → risque de capitulation si le move se retourne"
   b. Divergence structurelle : "COT bearish sur DXY malgré la hausse → divergence spéculateurs/prix, à surveiller"
   c. Signal de fond neutre : "pas de capitulation structurelle visible dans le COT" (sans relier au move du jour)
Si le COT est cité dans un segment, le sourcesUsed DOIT noter "market_memory" avec le daysOld exact.
- **Anti-répétition** : si un mécanisme est listé dans "MÉCANISMES DÉJÀ ENSEIGNÉS", ne le réexpliquez pas dans fondamentalContext ou causalChain. Trouvez un angle plus profond via le KNOWLEDGE : positionnement COT, saisonnalité, yield spreads, divergences de corrélation, impact sectoriel, etc.
- **Lien data→banque centrale** : si une donnée macro (NFP, CPI, PCE, PMI) est sortie hier ET qu'une réunion CB est dans les 7 prochains jours (visible dans upcomingHighImpact), analyse explicitement : cette data confirme-t-elle ou remet-elle en cause le pricing de la prochaine décision ? Le marché bouge en AMONT des réunions grâce aux données — la donnée d'hier est peut-être plus importante que la décision à venir. Mentionner dans coreMechanism si pertinent.
- Pour les segments PANORAMA : analyse MINIMALE. Un keyFact par asset (mouvement + raison probable). Pas de causalChain, pas de scenarios, pas de chartInstructions.`;
}

function buildC2UserPrompt(
  editorial: EditorialPlan,
  flagged: SnapshotFlagged,
  causalBrief: CausalBrief,
  researchContext: string,
  knowledge: string,
  briefingPack?: BriefingPack,
  episodeSummaries?: EpisodeSummary[],
): string {
  let prompt = '';

  // Temporal anchors — so C2 knows what "today/tomorrow/yesterday" mean
  const anchors = buildTemporalAnchors(editorial.date, editorial.publishDate);
  prompt += `${anchors.block}\n\n`;

  // Monday recap: C2 doit savoir que les segments ont une sémantique différente
  if (anchors.isMondayRecap) {
    prompt += `## RECALIBRAGE ANALYSE EN MODE LUNDI\n`;
    prompt += `Les depth levels ont un sens différent aujourd'hui :\n`;
    prompt += `- DEEP = chaîne causale d'un MÉCANISME de la semaine passée (pas un événement du jour). Ton analyse doit raconter comment la semaine a construit ce mécanisme, pas décortiquer un mouvement isolé.\n`;
    prompt += `- FOCUS = actualité du WEEKEND (samedi/dimanche) OU mouvement crypto du weekend (fallback si rien d'autre de notable).\n`;
    prompt += `- FLASH = rendez-vous spécifique de la semaine à venir (earnings, macro, décision). Analyse légère, contextuelle.\n`;
    prompt += `- PANORAMA = lecture SECTORIELLE HEBDO (pas inventaire de movers du jour). Regroupe par thème, performances 5 jours.\n\n`;
    prompt += `Calibre la profondeur de ton analyse en conséquence :\n`;
    prompt += `- Les scenarios bullish/bearish doivent raisonner sur la semaine à venir, pas sur J+1.\n`;
    prompt += `- technicalReading : parle de "clôture hebdo", "niveaux testés cette semaine", pas "aujourd'hui".\n`;
    prompt += `- causalChain : maille hebdo (cause → effet sur 5 jours), pas 24h.\n\n`;
  }

  // Plan éditorial
  prompt += `## PLAN ÉDITORIAL\n`;
  prompt += `Thème dominant: ${editorial.dominantTheme}\nFil conducteur: ${editorial.threadSummary}\nMood: ${editorial.moodMarche}\n\n`;
  prompt += `Segments à analyser:\n`;
  for (const seg of editorial.segments) {
    prompt += `- ${seg.id} [${seg.depth}] ${seg.topic} — assets: ${seg.assets.join(', ')} — angle: ${seg.angle}\n`;
    if (seg.continuityFromJ1) prompt += `  Continuité J-1: ${seg.continuityFromJ1}\n`;
  }
  prompt += '\n';

  // Mechanisms already explained to audience
  const recentMechanisms = (episodeSummaries || [])
    .filter(s => ['J-1', 'J-2', 'J-3'].includes(s.label))
    .flatMap(s => s.mechanismsExplained || []);

  if (recentMechanisms.length > 0) {
    prompt += `## MÉCANISMES DÉJÀ ENSEIGNÉS (J-1 à J-3)\n`;
    prompt += `Le spectateur comprend déjà ces mécanismes. Ne les réexpliquez pas — référencez-les brièvement et allez PLUS PROFOND.\n`;
    prompt += recentMechanisms.map(m => `- ${m}`).join('\n');
    prompt += `\n\nPour chaque segment, votre analyse DOIT explorer un angle ou mécanisme DIFFÉRENT de ceux ci-dessus. Utilisez le KNOWLEDGE pour trouver des angles fondamentaux plus profonds (saisonnalité, COT, yield spreads, carry trade, etc.).\n\n`;
  }

  // Briefing Pack minimal (triggers + CB speeches + COT divergences seulement).
  // Version complète réservée à C1 — C2 a déjà l'editorial plan + asset data + analysis hint.
  if (briefingPack) {
    prompt += formatBriefingPackMinimal(briefingPack);
  }

  // Asset data (only selected assets)
  prompt += `## DONNÉES ASSETS\n`;
  const allSelectedSymbols = new Set(editorial.segments.flatMap(s => s.assets));
  for (const seg of editorial.segments) {
    for (const symbol of seg.assets) {
      const asset = flagged.assets.find(a => a.symbol === symbol);
      if (asset) {
        prompt += formatAssetForC2(asset, seg.depth as 'DEEP' | 'FOCUS' | 'FLASH' | 'PANORAMA', editorial.date);
      }
    }
  }

  // Causal brief
  prompt += `## CAUSAL BRIEF (généré par code)\n${formatCausalBrief(causalBrief)}\n\n`;

  // Research context
  if (researchContext) {
    prompt += `## CONTEXTE HISTORIQUE (NewsMemory — articles ANTÉRIEURS au ${anchors.snapLabel})\n`;
    prompt += `Ces articles sont des ARCHIVES. Les dates [J-N] indiquent l'ancienneté.\n`;
    prompt += `Utilise-les pour calibrer ta confiance : un move confirmé par 2 semaines d'articles = high, un événement sans précédent récent = medium/speculative.\n`;
    prompt += `Si un article ancien décrit un catalyst qui se matérialise aujourd'hui, cite-le dans sourcesUsed.\n\n`;
    prompt += researchContext + '\n\n';
  }

  // Knowledge (conditional Tier 2/3)
  if (knowledge) {
    prompt += `## KNOWLEDGE (fiches conditionnelles)\n${knowledge}\n\n`;
  }

  // Yields & sentiment
  if (flagged.yields) {
    prompt += `## TAUX\n10Y: ${flagged.yields.us10y}% | 2Y: ${flagged.yields.us2y}% | Spread: ${flagged.yields.spread10y2y}%\n\n`;
  }
  if (flagged.sentiment) {
    prompt += `## SENTIMENT\nFear&Greed: ${flagged.sentiment.cryptoFearGreed.value}/100 | BTC dom: ${flagged.sentiment.btcDominance}%\n\n`;
  }

  // Output format
  prompt += `## FORMAT DE SORTIE
Retourne un JSON avec cette structure exacte :
{
  "segments": [
    {
      "segmentId": "seg_1",
      "keyFacts": ["fait 1", "fait 2", "fait 3"],
      "technicalReading": "Synthèse technique",
      "fundamentalContext": "Contexte macro/fondamental",
      "causalChain": "Optionnel — MÉCANISME fondamental (principe économique, corrélation, transmission), PAS un récit factuel",
      "scenarios": {
        "bullish": { "target": "niveau cible", "condition": "condition de déclenchement", "probability": 0.6 },
        "bearish": { "target": "niveau invalidation", "condition": "condition de déclenchement", "probability": 0.4 }
      },
      "narrativeHook": "L'accroche suggérée pour le rédacteur",
      "chartInstructions": [
        { "type": "price_line", "asset": "{SYMBOL}", "value": "{SNAP_PRICE}", "label": "{NOM} spot" },
        { "type": "resistance_line", "asset": "{SYMBOL}", "value": "{MM_LEVEL}", "label": "Résistance [MM]" },
        { "type": "chart_comparaison", "asset": "{SYMBOL}", "assets": ["{SYMBOL}"], "label": "J-1 vs J0", "label2": "{CHANGE_J1}% vs {CHANGE_J0}%" },
        { "type": "causal_chain", "asset": "{SYMBOL}", "detail": "{CAUSE} → {TRANSMISSION} → {EFFET}" },
        { "type": "scenario_fork", "asset": "{SYMBOL}", "value": "{BULLISH_TARGET}", "value2": "{BEARISH_TARGET}", "label": "Haussier", "label2": "Baissier" }
      ],
      "visualSuggestions": ["idée visuel 1"],
      "risk": "Ce qui pourrait invalider l'analyse",
      "confidenceLevel": "high",
      "sourcesUsed": [
        { "type": "snapshot_price", "detail": "{SYMBOL} {CHANGE}%, RSI={RSI_VALUE}" },
        { "type": "news_article", "detail": "{TITRE_ARTICLE_EXACT}" },
        { "type": "market_memory", "detail": "zone {MM_LEVEL} [MM], daysOld={JOURS}" }
      ]
    }
  ],
  "globalContext": {
    "marketMood": "description du mood global",
    "dominantTheme": "thème confirmé ou ajusté",
    "crossSegmentLinks": ["lien 1 entre segments", "lien 2"],
    "keyRisks": ["risque 1", "risque 2"]
  }
}`;

  return prompt;
}

/**
 * Run C2 Sonnet — analytical layer.
 */
export async function runC2Analysis(input: {
  editorial: EditorialPlan;
  flagged: SnapshotFlagged;
  causalBrief: CausalBrief;
  researchContext: string;
  snapshot: DailySnapshot;
  briefingPack?: BriefingPack;
  knowledgeBriefing?: string;
  episodeSummaries?: EpisodeSummary[];
  lang: Language;
}): Promise<AnalysisBundle> {
  // Load only Tier 2/3 knowledge for selected assets (NOT full 119K)
  const deepFocusSymbols = input.editorial.segments
    .filter(s => s.depth !== 'FLASH' && s.depth !== 'PANORAMA')
    .flatMap(s => s.assets);
  const knowledge = input.knowledgeBriefing || loadKnowledgeForC2(input.snapshot, deepFocusSymbols);

  const systemPrompt = buildC2SystemPrompt();
  const userPrompt = buildC2UserPrompt(
    input.editorial,
    input.flagged,
    input.causalBrief,
    input.researchContext,
    knowledge,
    input.briefingPack,
    input.episodeSummaries,
  );

  console.log('  P3 C2 Sonnet — analyse approfondie...');
  console.log(`  C2 prompt: ${systemPrompt.length + userPrompt.length} chars (knowledge: ${knowledge.length} chars)`);

  const analysis = await generateStructuredJSON<AnalysisBundle>(
    systemPrompt,
    userPrompt,
    { role: 'balanced', maxTokens: 16384 },
  );

  // Ensure all segments from editorial are present
  for (const seg of input.editorial.segments) {
    if (!analysis.segments.find(s => s.segmentId === seg.id)) {
      console.warn(`  C2: segment ${seg.id} missing from analysis, adding stub`);
      analysis.segments.push({
        segmentId: seg.id,
        keyFacts: [`${seg.assets.join('/')} en mouvement`],
        technicalReading: 'Données insuffisantes pour analyse technique détaillée.',
        fundamentalContext: 'Contexte à déterminer.',
        scenarios: {
          bullish: { target: 'N/A', condition: 'N/A' },
          bearish: { target: 'N/A', condition: 'N/A' },
        },
        narrativeHook: seg.angle,
        chartInstructions: [],
        visualSuggestions: [],
        risk: 'Données limitées.',
        confidenceLevel: 'speculative',
      });
    }
  }

  // Sort analysis segments to match editorial order
  const segOrder = input.editorial.segments.map(s => s.id);
  analysis.segments.sort((a, b) => segOrder.indexOf(a.segmentId) - segOrder.indexOf(b.segmentId));

  return analysis;
}
