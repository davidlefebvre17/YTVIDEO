import * as fs from "fs";
import * as path from "path";
import { generateStructuredJSON } from "../llm-client";
import { loadMemory } from "@yt-maker/data";
import type {
  SnapshotFlagged, EditorialPlan, AnalysisBundle, CausalBrief,
  FlaggedAsset,
} from "./types";
import type { DailySnapshot, Language } from "@yt-maker/core";
import type { BriefingPack } from "./helpers/briefing-pack";
import { formatBriefingPack } from "./helpers/briefing-pack";

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
function formatAssetForC2(asset: FlaggedAsset, depth: 'DEEP' | 'FOCUS' | 'FLASH'): string {
  const fmt = (n: number) => n.toFixed(asset.price > 100 ? 2 : 4);
  let text = `### ${asset.name} (${asset.symbol}) — ${depth}\n`;
  text += `Prix: ${fmt(asset.price)} | Var: ${asset.changePct >= 0 ? '+' : ''}${asset.changePct.toFixed(2)}%\n`;

  if (depth === 'FLASH') return text + '\n';

  // Full data for DEEP/FOCUS
  const t = asset.snapshot.technicals;
  if (t) {
    text += `SMA20: ${fmt(t.ema9)} | SMA50: ${fmt(t.ema21)} | RSI: ${t.rsi14.toFixed(0)} | Trend: ${t.trend}\n`;
    text += `Supports: ${t.supports.map(fmt).join(', ') || '—'} | Résistances: ${t.resistances.map(fmt).join(', ') || '—'}\n`;
    text += `Volume: ${t.volumeAnomaly > 1.2 ? `+${((t.volumeAnomaly - 1) * 100).toFixed(0)}% vs moy` : 'normal'}\n`;
  }

  const m = asset.snapshot.multiTF;
  if (m) {
    text += `MultiTF: tendance séculaire=${m.weekly10y.trend} | moyen terme=${m.daily3y.trend}\n`;
    text += `  SMA200=${fmt(m.daily3y.sma200)} (${m.daily3y.aboveSma200 ? 'AU-DESSUS' : 'EN-DESSOUS'}) | ${m.daily3y.goldenCross ? 'GOLDEN' : 'DEATH'} CROSS\n`;
    text += `  ATH: ${m.weekly10y.distanceFromATH.toFixed(1)}% | High52w: ${fmt(m.daily1y.high52w)} | Low52w: ${fmt(m.daily1y.low52w)}\n`;
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
        text += `Events récents: ${memory.last_events.map(e => `${e.date} ${e.event_type}: ${e.detail}`).join(' | ')}\n`;
      }
      if (memory.indicators_daily) {
        const ind = memory.indicators_daily;
        // Vol_ratio from MarketMemory is historical (last weekly update) — NOT today's volume.
        // Only BB/slope/ATR are structurally useful. Vol_ratio omitted to prevent hallucination.
        text += `Indicateurs structurels (historique, PAS données du jour): BB_width_rank=${ind.bb_width_pct_rank.toFixed(0)} | SMA20_slope=${ind.mm20_slope_deg.toFixed(1)}° | ATR_ratio=${ind.atr_ratio.toFixed(2)}\n`;
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
- Les scénarios DOIVENT être CHIFFRÉS avec niveaux précis
- confidenceLevel reflète la qualité des données :
  • high : données techniques claires + catalyst identifié + pattern confirmé
  • medium : données partielles ou signal ambigu
  • speculative : extrapolation, pas de catalyst clair
- Le globalContext identifie les liens ENTRE segments, pas un résumé de chaque segment
- ZÉRO narration. Analyse brute uniquement.
- Si l'editorial plan contient un trigger (acteur politique, événement), la chaîne causale DOIT commencer par ce trigger
- Pour chaque segment, renseigne sourcesUsed : liste des données utilisées (type + detail)
  Types valides : snapshot_price, news_article, knowledge_base, market_memory, causal_brief, inference
- Maximum 2 niveaux techniques clés par asset dans technicalReading — les plus pertinents pour la narration, pas tous les indicateurs disponibles
- Les niveaux supplémentaires vont dans chartInstructions (affichage visuel, pas narration)`;
}

function buildC2UserPrompt(
  editorial: EditorialPlan,
  flagged: SnapshotFlagged,
  causalBrief: CausalBrief,
  researchContext: string,
  knowledge: string,
  briefingPack?: BriefingPack,
): string {
  let prompt = '';

  // Plan éditorial
  prompt += `## PLAN ÉDITORIAL\n`;
  prompt += `Thème dominant: ${editorial.dominantTheme}\nFil conducteur: ${editorial.threadSummary}\nMood: ${editorial.moodMarche}\n\n`;
  prompt += `Segments à analyser:\n`;
  for (const seg of editorial.segments) {
    prompt += `- ${seg.id} [${seg.depth}] ${seg.topic} — assets: ${seg.assets.join(', ')} — angle: ${seg.angle}\n`;
    if (seg.continuityFromJ1) prompt += `  Continuité J-1: ${seg.continuityFromJ1}\n`;
  }
  prompt += '\n';

  // Briefing Pack (raw editorial context for trigger/news citation)
  if (briefingPack) {
    prompt += formatBriefingPack(briefingPack);
  }

  // Asset data (only selected assets)
  prompt += `## DONNÉES ASSETS\n`;
  const allSelectedSymbols = new Set(editorial.segments.flatMap(s => s.assets));
  for (const seg of editorial.segments) {
    for (const symbol of seg.assets) {
      const asset = flagged.assets.find(a => a.symbol === symbol);
      if (asset) {
        prompt += formatAssetForC2(asset, seg.depth);
      }
    }
  }

  // Causal brief
  prompt += `## CAUSAL BRIEF (généré par code)\n${formatCausalBrief(causalBrief)}\n\n`;

  // Research context
  if (researchContext) {
    prompt += `## CONTEXTE RECHERCHE (NewsMemory 7j)\n${researchContext}\n\n`;
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
      "causalChain": "Optionnel — chaîne causale si applicable",
      "scenarios": {
        "bullish": { "target": "niveau cible", "condition": "condition de déclenchement" },
        "bearish": { "target": "niveau invalidation", "condition": "condition de déclenchement" }
      },
      "narrativeHook": "L'accroche suggérée pour le rédacteur",
      "chartInstructions": [
        { "type": "support_line", "asset": "GC=F", "value": 2900, "label": "Support historique" }
      ],
      "visualSuggestions": ["idée visuel 1"],
      "risk": "Ce qui pourrait invalider l'analyse",
      "confidenceLevel": "high",
      "sourcesUsed": [
        { "type": "snapshot_price", "detail": "WTI -11.9%, RSI=70" },
        { "type": "news_article", "detail": "Trump declares end of Iran conflict" },
        { "type": "inference", "detail": "Positions leveragées inférées du RSI surachat" }
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
  lang: Language;
}): Promise<AnalysisBundle> {
  // Load only Tier 2/3 knowledge for selected assets (NOT full 119K)
  const deepFocusSymbols = input.editorial.segments
    .filter(s => s.depth !== 'FLASH')
    .flatMap(s => s.assets);
  const knowledge = loadKnowledgeForC2(input.snapshot, deepFocusSymbols);

  const systemPrompt = buildC2SystemPrompt();
  const userPrompt = buildC2UserPrompt(
    input.editorial,
    input.flagged,
    input.causalBrief,
    input.researchContext,
    knowledge,
    input.briefingPack,
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
