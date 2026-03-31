import { generateStructuredJSON } from "../llm-client";
import type {
  DraftScript, EditorialPlan, AnalysisBundle, WordBudget,
  SnapshotFlagged, ValidationResult, ValidationIssue,
  FlaggedAsset,
} from "./types";
import { loadMemory } from "@yt-maker/data";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";

// ── Known bad patterns ──────────────────────────────────

const DISCLAIMER_PATTERNS = [
  /ceci ne constitue pas un conseil/i,
  /ne constitue en aucun cas/i,
  /à titre informatif uniquement/i,
  /faites vos propres recherches/i,
  /DYOR/i,
  /pas un conseil (?:en investissement|financier)/i,
  /rappel[,\s]+ce contenu est purement éducatif[^.]*/i,
  /ce contenu est purement éducatif et ne constitue pas[^.]*/i,
];

const ANGLICISM_FIXES: [RegExp, string][] = [
  [/\bdeath cat bounce\b/gi, "dead cat bounce"],
  [/\bsafe heaven\b/gi, "safe haven"],
  [/\bbull market run\b/gi, "bull run"],
  [/\bshort-squeeze\b/gi, "short squeeze"],
];

// ── Mechanical validation (code) ────────────────────────

function getAllNarration(draft: DraftScript): string {
  const parts = [
    draft.owlIntro ?? '',
    draft.coldOpen?.narration ?? '',
    draft.thread?.narration ?? '',
    ...draft.segments.map(s => s.narration),
    ...draft.segments.map(s => s.owlTransition ?? ''),
    draft.owlClosing ?? '',
    draft.closing?.narration ?? '',
  ];
  return parts.join(' ');
}

/**
 * Build a whitelist of known numeric values from all data sources.
 * Any number > 10 in the narration not in this set is potentially hallucinated.
 */
function buildKnownNumbers(flagged?: SnapshotFlagged): Set<number> {
  const known = new Set<number>();
  if (!flagged) return known;

  for (const a of flagged.assets) {
    // Snapshot prices
    known.add(Math.round(a.price * 100) / 100);
    if (a.snapshot.high24h) known.add(Math.round(a.snapshot.high24h * 100) / 100);
    if (a.snapshot.low24h) known.add(Math.round(a.snapshot.low24h * 100) / 100);
    // changePct (rounded to 1 or 2 decimals)
    known.add(Math.round(Math.abs(a.changePct) * 10) / 10);
    known.add(Math.round(Math.abs(a.changePct) * 100) / 100);
    // Technicals
    const t = a.snapshot.technicals;
    if (t) {
      if (t.rsi14) known.add(Math.round(t.rsi14));
      for (const s of t.supports ?? []) known.add(Math.round(s * 100) / 100);
      for (const r of t.resistances ?? []) known.add(Math.round(r * 100) / 100);
    }
    // MultiTF
    const m = a.snapshot.multiTF;
    if (m) {
      if (m.daily3y?.sma200) known.add(Math.round(m.daily3y.sma200));
      if (m.daily1y?.high52w) known.add(Math.round(m.daily1y.high52w * 100) / 100);
      if (m.daily1y?.low52w) known.add(Math.round(m.daily1y.low52w * 100) / 100);
    }
    // MarketMemory zones
    try {
      const mem = loadMemory(a.symbol);
      if (mem) {
        for (const z of mem.zones) known.add(Math.round(z.level * 100) / 100);
        if (mem.indicators_daily) {
          known.add(Math.round(mem.indicators_daily.rsi14));
          known.add(Math.round(Math.abs(mem.indicators_daily.mm20_slope_deg)));
        }
      }
    } catch {}
  }
  // Yields
  if (flagged.yields) {
    known.add(flagged.yields.us10y);
    known.add(flagged.yields.us2y);
    known.add(Math.round(flagged.yields.spread10y2y * 100)); // as bps
    known.add(Math.round(Math.abs(flagged.yields.spread10y2y) * 100) / 100);
  }
  // Sentiment
  if (flagged.sentiment?.cryptoFearGreed) {
    known.add(flagged.sentiment.cryptoFearGreed.value);
  }
  // StockScreen top movers
  for (const s of flagged.screenResults ?? []) {
    if (s.changePct) {
      known.add(Math.round(Math.abs(s.changePct) * 10) / 10);
      known.add(Math.round(Math.abs(s.changePct) * 100) / 100);
    }
    // Earnings detail (EPS values)
    const ed = s.earningsDetail;
    if (ed) {
      for (const q of ed.lastFourQuarters ?? []) {
        if (q.epsActual != null) known.add(Math.round(q.epsActual * 100) / 100);
        if (q.epsEstimate != null) known.add(Math.round(q.epsEstimate * 100) / 100);
        if (q.surprisePct != null) known.add(Math.round(Math.abs(q.surprisePct) * 10) / 10);
      }
    }
  }
  // Economic events (actual/forecast parsed as numbers)
  for (const e of flagged.events ?? []) {
    for (const val of [e.actual, e.forecast, e.previous]) {
      if (!val) continue;
      const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
      if (!isNaN(n) && n > 0) known.add(Math.round(n * 100) / 100);
    }
  }
  return known;
}

/**
 * Extract all "significant" numbers from text (> 10, likely price levels or indicators).
 * Ignores percentages, durations, and small numbers.
 */
function extractSignificantNumbers(text: string): number[] {
  const nums: number[] = [];
  // Match numbers like 6744, 99.85, 4994, but skip percentages and small
  const matches = text.matchAll(/(?<!\w)(\d[\d\s]*[\d,.]*\d)(?!\s*(?:pour cent|%|s\b|min\b|sec))/g);
  for (const m of matches) {
    const raw = m[1].replace(/[\s,]/g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 10) nums.push(n);
  }
  return nums;
}

export function validateMechanical(
  draft: DraftScript,
  plan: EditorialPlan,
  budget: WordBudget,
  flagged?: SnapshotFlagged,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fullText = getAllNarration(draft);

  // 1. Duration range (300-420s = 5-7 min)
  const duration = draft.metadata?.totalDurationSec ?? 0;
  if (duration < 300 || duration > 420) {
    issues.push({
      type: 'length',
      description: `Durée estimée ${duration}s hors range 300-420s (5-7 min)`,
      severity: duration < 240 || duration > 500 ? 'blocker' : 'warning',
      source: 'code',
    });
  }

  // 2. Word budget per segment (±15% tolerance for warning, ±30% for blocker)
  for (const seg of draft.segments) {
    const budgetSeg = budget.segments.find(b => b.segmentId === seg.segmentId);
    if (budgetSeg) {
      if (seg.wordCount > budgetSeg.maxWords * 1.3) {
        issues.push({
          type: 'length',
          segmentId: seg.segmentId,
          description: `${seg.wordCount} mots >> max ${budgetSeg.maxWords} (+30%)`,
          severity: 'blocker',
          suggestedFix: `Réduire à ~${budgetSeg.targetWords} mots`,
          source: 'code',
        });
      } else if (seg.wordCount > budgetSeg.maxWords * 1.15) {
        issues.push({
          type: 'length',
          segmentId: seg.segmentId,
          description: `${seg.wordCount} mots > max ${budgetSeg.maxWords} (+15%)`,
          severity: 'warning',
          suggestedFix: `Réduire à ~${budgetSeg.targetWords} mots`,
          source: 'code',
        });
      }
    }
  }

  // 3. "drama score" never in narration
  if (/drama\s*score/i.test(fullText)) {
    issues.push({
      type: 'compliance',
      description: '"drama score" mentionné dans la narration (donnée interne)',
      severity: 'blocker',
      source: 'code',
    });
  }

  // 4. Disclaimer in narration
  for (const pattern of DISCLAIMER_PATTERNS) {
    if (pattern.test(fullText)) {
      issues.push({
        type: 'compliance',
        description: `Disclaimer détecté dans narration : ${pattern.source.slice(0, 50)}`,
        severity: 'blocker',
        suggestedFix: 'Supprimer — le disclaimer est un bandeau visuel, pas oral',
        source: 'code',
      });
    }
  }

  // 5. Segment order matches editorial plan
  const planOrder = plan.segments.map(s => s.id);
  const draftOrder = draft.segments.map(s => s.segmentId);
  if (JSON.stringify(planOrder) !== JSON.stringify(draftOrder)) {
    issues.push({
      type: 'structure',
      description: `Ordre segments incorrect. Attendu: [${planOrder.join(',')}] Got: [${draftOrder.join(',')}]`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 6. Segment count
  if (draft.segments.length !== plan.segments.length) {
    issues.push({
      type: 'structure',
      description: `${draft.segments.length} segments vs ${plan.segments.length} planifiés`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 7. Cold open too long
  if (draft.coldOpen && draft.coldOpen.wordCount > 20) {
    issues.push({
      type: 'length',
      segmentId: 'coldOpen',
      description: `Cold open: ${draft.coldOpen.wordCount} mots (max 20)`,
      severity: 'warning',
      suggestedFix: 'Raccourcir à max 15 mots, télégraphique',
      source: 'code',
    });
  }

  // 8. Empty narrations
  for (const seg of draft.segments) {
    if (!seg.narration || seg.narration.trim().length < 10) {
      issues.push({
        type: 'structure',
        segmentId: seg.segmentId,
        description: `Narration vide ou trop courte dans ${seg.segmentId}`,
        severity: 'blocker',
        source: 'code',
      });
    }
  }

  // 9. Hallucination check: numbers in narration vs known data sources
  if (flagged) {
    const known = buildKnownNumbers(flagged);
    for (const seg of draft.segments) {
      const nums = extractSignificantNumbers(seg.narration);
      for (const n of nums) {
        // Check if this number (or close approximation ±1%) exists in known data
        const isKnown = [...known].some(k => Math.abs(k - n) / Math.max(k, 1) < 0.015);
        if (!isKnown) {
          issues.push({
            type: 'compliance',
            segmentId: seg.segmentId,
            description: `Niveau ${n} non trouvé dans les données sources — potentielle hallucination`,
            severity: 'warning',
            suggestedFix: `Vérifier si ${n} provient des données. Si non, remplacer par un niveau réel ou supprimer.`,
            source: 'code',
          });
        }
      }
    }
  }

  // 10. Temporal consistency: "cette semaine" on Monday = only today's events
  if (flagged) {
    const dayOfWeek = new Date(flagged.date + 'T12:00:00Z').getDay();
    if (dayOfWeek === 1) { // Monday
      const weekClaims = fullText.match(/cette semaine|cette sem\.|de la semaine/gi);
      if (weekClaims && weekClaims.length > 0) {
        issues.push({
          type: 'compliance',
          description: `"cette semaine" utilisé un lundi — impossible d'avoir des événements répétés "cette semaine" le premier jour`,
          severity: 'warning',
          suggestedFix: 'Remplacer par "aujourd\'hui" ou "en début de semaine" ou retirer la référence temporelle',
          source: 'code',
        });
      }
    }
  }

  // 11. "seul" comparative claims: check if truly unique
  if (flagged) {
    const seulMatches = fullText.matchAll(/seul[e]?\s+(indice|actif|devise|crypto|marché)\s+(?:en\s+)?(baisse|hausse)/gi);
    for (const m of seulMatches) {
      issues.push({
        type: 'compliance',
        description: `Claim "${m[0]}" — vérifier que c'est factuel sur TOUS les actifs du groupe`,
        severity: 'warning',
        suggestedFix: 'Si non vérifié, utiliser "parmi les rares" au lieu de "seul"',
        source: 'code',
      });
    }
  }

  // 12. Number density per segment — too many numbers = indigestible
  const NUMBER_LIMITS: Record<string, number> = {
    deep: 6,
    focus: 4,
    flash: 2,
    panorama: 8,
  };
  for (const seg of draft.segments) {
    const nums = extractSignificantNumbers(seg.narration);
    // Also count written-out percentages ("trois virgule seize pour cent")
    const pctMatches = seg.narration.match(/\b\w+\s+virgule\s+\w+\s+pour\s+cent/gi) ?? [];
    const totalNumbers = nums.length + pctMatches.length;
    const limit = NUMBER_LIMITS[(seg.depth ?? 'FOCUS').toLowerCase()] ?? 4;
    if (totalNumbers > limit) {
      issues.push({
        type: 'structure',
        segmentId: seg.segmentId,
        description: `${totalNumbers} chiffres dans ${seg.segmentId} [${seg.depth}] (max ${limit}) — trop dense, le spectateur décroche`,
        severity: totalNumbers > limit * 1.5 ? 'blocker' : 'warning',
        suggestedFix: `Garder les ${limit} chiffres les plus importants, reformuler le reste en mots ("en forte hausse" au lieu du % exact)`,
        source: 'code',
      });
    }
  }

  // 13. [BEAT] markers — breathing room check
  for (const seg of draft.segments) {
    const beatCount = (seg.narration.match(/\[BEAT\]/gi) ?? []).length;
    const minBeats = (seg.depth === 'DEEP') ? 2 : (seg.depth === 'FOCUS') ? 1 : 0;
    if (beatCount < minBeats) {
      issues.push({
        type: 'structure',
        segmentId: seg.segmentId,
        description: `${beatCount} [BEAT] dans ${seg.segmentId} [${seg.depth}] (min ${minBeats}) — pas assez de respiration`,
        severity: 'warning',
        suggestedFix: `Ajouter ${minBeats - beatCount} marqueur(s) [BEAT] entre les actes du segment`,
        source: 'code',
      });
    }
  }

  // 14. Day-of-week consistency: verify day names match actual dates
  if (flagged) {
    const anchors = buildTemporalAnchors(flagged.date);
    const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    // Match patterns like "dimanche soir", "ce lundi", "mardi prochain", "demain dimanche"
    const dayMentions = fullText.matchAll(
      /(?:demain|après-demain|ce|prochain|hier)\s+(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)/gi
    );
    for (const m of dayMentions) {
      const mentionedDay = m[1].toLowerCase();
      const prefix = m[0].toLowerCase().replace(/\s+\S+$/, '').trim(); // "demain", "ce", etc.

      let expectedDay: string | undefined;
      if (prefix === 'demain') {
        // "demain" = pubDate + 1 = snapDate + 2
        const d = new Date(Date.UTC(
          parseInt(anchors.snapDate.slice(0, 4)),
          parseInt(anchors.snapDate.slice(5, 7)) - 1,
          parseInt(anchors.snapDate.slice(8, 10)) + 2,
        ));
        expectedDay = JOURS[d.getUTCDay()];
      } else if (prefix === 'hier') {
        // "hier" = snapDate (from viewer's perspective)
        const d = new Date(anchors.snapDate + 'T12:00:00Z');
        expectedDay = JOURS[d.getUTCDay()];
      } else if (prefix === 'ce' || prefix === 'aujourd\'hui') {
        // "ce vendredi" = pubDate
        const d = new Date(anchors.pubDate + 'T12:00:00Z');
        expectedDay = JOURS[d.getUTCDay()];
      }

      if (expectedDay && mentionedDay !== expectedDay) {
        issues.push({
          type: 'compliance',
          description: `"${m[0]}" incorrect — ${prefix} = ${expectedDay}, pas ${mentionedDay} (snap: ${anchors.snapDate}, pub: ${anchors.pubDate})`,
          severity: 'blocker',
          suggestedFix: `Remplacer "${mentionedDay}" par "${expectedDay}"`,
          source: 'code',
        });
      }
    }

    // Also check standalone "Powell parle dimanche" pattern — day name after a verb + temporal context
    const standaloneDayRefs = fullText.matchAll(
      /(?:parle|intervient|publie|décide|annonce|vote|réunit)\s+(?:ce\s+)?(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)/gi
    );
    for (const m of standaloneDayRefs) {
      const mentionedDay = m[1].toLowerCase();
      // Cross-reference with upcomingEvents and events to verify the day name
      const allEvents = [
        ...(flagged.events ?? []),
        ...(flagged.upcomingEvents ?? []),
        ...(flagged.yesterdayEvents ?? []),
      ];
      // Find if there's a matching event and check its actual day
      for (const ev of allEvents) {
        const evDate = new Date(ev.date + 'T12:00:00Z');
        const actualDay = JOURS[evDate.getUTCDay()];
        // Check if the narration sentence likely refers to this event
        const evWords = ev.name.toLowerCase().split(/\s+/);
        const context = m.input?.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + m[0].length + 50).toLowerCase() ?? '';
        const mentionsEvent = evWords.some(w => w.length > 3 && context.includes(w));
        if (mentionsEvent && mentionedDay !== actualDay) {
          issues.push({
            type: 'compliance',
            description: `"${m[0]}" — l'événement "${ev.name}" est le ${ev.date} (${actualDay}), pas ${mentionedDay}`,
            severity: 'blocker',
            suggestedFix: `Remplacer "${mentionedDay}" par "${actualDay}"`,
            source: 'code',
          });
          break;
        }
      }
    }
  }

  return issues;
}

/**
 * Fix anglicisms in the draft (modifies in place).
 */
function fixAnglicisms(draft: DraftScript): void {
  const fixText = (text: string): string => {
    let result = text;
    for (const [pattern, replacement] of ANGLICISM_FIXES) {
      result = result.replace(pattern, replacement);
    }
    return result;
  };

  if (draft.coldOpen) draft.coldOpen.narration = fixText(draft.coldOpen.narration);
  if (draft.thread) draft.thread.narration = fixText(draft.thread.narration);
  for (const seg of draft.segments) {
    seg.narration = fixText(seg.narration);
  }
  if (draft.closing) draft.closing.narration = fixText(draft.closing.narration);
}

// ── Semantic validation (Haiku C4) ──────────────────────

function buildC4SystemPrompt(): string {
  return `Tu es un validateur éditorial pour Owl Street Journal — une vidéo quotidienne d'analyse financière. Le narrateur est un hibou anthropomorphe qui TUTOIE le spectateur. Tout le texte est parlé à voix haute.

RÔLE : Identifier les problèmes. Tu NE réécris PAS le script entier — tu corriges uniquement les problèmes mineurs (warnings).

STRUCTURE DU SCRIPT :
- owlIntro : accueil du hibou (salutation + date + disclaimer + abonne-toi)
- coldOpen : fait choc (télégraphique)
- thread : fil conducteur
- segments[] : chacun avec narration + owlTransition (phrase courte du hibou entre segments)
- owlClosing : mot de la fin du hibou
- closing : conclusion factuelle
Tous ces champs sont PARLÉS. Ne supprime aucun de ces champs.

VÉRIFICATIONS :
1. COMPLIANCE : Aucune recommandation directe, même déguisée ("le bon moment pour...", "on devrait..."). Le disclaimer est dans owlIntro — pas besoin de le répéter.
2. TUTOIEMENT : Le hibou TUTOIE toujours. Jamais "vous". Corrige en blocker si vouvoiement détecté.
3. TON : Sobre, humble, enseignant. Jamais retail ("t'as vu", "c'est dingue", "pépite", "to the moon"). Jamais racoleur.
4. COHÉRENCE TEMPORELLE : J vs J-1 clairement distingués, pas d'ambiguïté
5. CONTINUITÉS : Si le plan éditorial mentionne une continuité J-1, elle DOIT être dans la narration
6. CONFIANCE : Le ton doit correspondre au confidenceLevel (speculative → conditionnel, high → direct)
7. VOIX : Pas de sigles imprononçables (SMA200 → "moyenne mobile deux cents jours"). Chiffres écrits pour être lus.

RÈGLES :
- severity = "blocker" : recommandation directe, vouvoiement, ton retail persistant, continuité manquante
- severity = "warning" : transition maladroite, formulation améliorable, sigle imprononçable
- Pour les warnings : propose un suggestedFix ET corrige directement dans validatedScript
- NE PAS inventer de problèmes — si le script est bon, retourne status: "pass"
- Tu peux modifier le texte pour corriger des warnings mais JAMAIS changer le sens, la structure, ou supprimer owlIntro/owlClosing/owlTransition

SORTIE : JSON strict avec status, issues[], et validatedScript (le script éventuellement modifié).`;
}

function buildC4UserPrompt(draft: DraftScript, plan: EditorialPlan, analysis: AnalysisBundle): string {
  let prompt = '';

  prompt += `## SCRIPT À VALIDER\n`;
  prompt += `Cold open: "${draft.coldOpen?.narration ?? ''}"\n`;
  prompt += `Thread: "${draft.thread?.narration ?? ''}"\n\n`;
  for (const seg of draft.segments) {
    const analysisForSeg = analysis.segments.find(s => s.segmentId === seg.segmentId);
    prompt += `### ${seg.segmentId} [${seg.depth}] — ${seg.title}\n`;
    prompt += `Narration: "${seg.narration}"\n`;
    prompt += `Confiance C2: ${analysisForSeg?.confidenceLevel ?? '?'}\n\n`;
  }
  prompt += `Closing: "${draft.closing?.narration ?? ''}"\n\n`;

  prompt += `## PLAN ÉDITORIAL (référence)\n`;
  for (const seg of plan.segments) {
    prompt += `- ${seg.id} [${seg.depth}] ${seg.topic}`;
    if (seg.continuityFromJ1) prompt += ` — continuité J-1: ${seg.continuityFromJ1}`;
    prompt += '\n';
  }
  prompt += '\n';

  prompt += `## FORMAT DE SORTIE
{
  "status": "pass" | "needs_revision",
  "issues": [
    {
      "type": "compliance" | "tone" | "structure",
      "segmentId": "seg_1",
      "description": "Description du problème",
      "severity": "blocker" | "warning",
      "suggestedFix": "Texte de correction proposé",
      "source": "haiku"
    }
  ],
  "validatedScript": { ... le DraftScript complet, avec corrections des warnings appliquées ... }
}`;

  return prompt;
}

/**
 * Merge C4 Haiku's validatedScript with the original draft.
 * C4 only sees narration text — it doesn't return metadata, timing, or structural fields.
 * We keep the original draft as base and only overlay narration corrections from C4.
 */
function mergeValidatedScript(original: DraftScript, validated: DraftScript | undefined): DraftScript {
  if (!validated) return original;

  const merged: DraftScript = {
    ...original,
    // Preserve metadata from original (C4 never sees this)
    metadata: original.metadata,
    // Preserve owl fields (C4 doesn't touch these)
    owlIntro: original.owlIntro,
    owlClosing: original.owlClosing,
    // Merge cold open narration if C4 provided one
    coldOpen: original.coldOpen ? {
      ...original.coldOpen,
      narration: validated.coldOpen?.narration || original.coldOpen.narration,
    } : original.coldOpen,
    // Merge thread narration
    thread: original.thread ? {
      ...original.thread,
      narration: validated.thread?.narration || original.thread.narration,
    } : original.thread,
    // Merge closing narration
    closing: original.closing ? {
      ...original.closing,
      narration: validated.closing?.narration || original.closing.narration,
    } : original.closing,
    // Merge segment narrations while preserving all other fields
    segments: original.segments.map(origSeg => {
      const validSeg = validated.segments?.find(s => s.segmentId === origSeg.segmentId);
      if (!validSeg) return origSeg;
      return {
        ...origSeg,
        narration: validSeg.narration || origSeg.narration,
        // Recalculate word count if narration changed
        wordCount: (validSeg.narration || origSeg.narration).split(/\s+/).filter(Boolean).length,
      };
    }),
  };

  // Recalculate total duration if word counts changed
  const totalWords = [
    merged.coldOpen?.wordCount ?? 0,
    merged.thread?.wordCount ?? 0,
    ...merged.segments.map(s => s.wordCount),
    merged.closing?.wordCount ?? 0,
  ].reduce((a, b) => a + b, 0);
  merged.metadata = {
    ...merged.metadata,
    totalDurationSec: Math.round(totalWords / 2.5),
    totalWordCount: totalWords,
  };

  return merged;
}

/**
 * Run full P5 validation: mechanical (code) + semantic (Haiku).
 */
export async function runValidation(
  draft: DraftScript,
  plan: EditorialPlan,
  analysis: AnalysisBundle,
  budget: WordBudget,
  flagged?: SnapshotFlagged,
): Promise<ValidationResult> {
  // Fix anglicisms first (always, no LLM needed)
  fixAnglicisms(draft);

  // Step 1: Mechanical validation (with hallucination checks if flagged data available)
  const mechIssues = validateMechanical(draft, plan, budget, flagged);
  const mechBlockers = mechIssues.filter(i => i.severity === 'blocker');

  if (mechBlockers.length > 0) {
    console.log(`  P5 Code: ${mechBlockers.length} blockers mécaniques`);
    return {
      status: 'needs_revision',
      issues: mechIssues,
      validatedScript: draft,
    };
  }

  // Step 2: Semantic validation (Haiku C4)
  console.log('  P5 C4 Haiku — validation sémantique...');

  try {
    const systemPrompt = buildC4SystemPrompt();
    const userPrompt = buildC4UserPrompt(draft, plan, analysis);

    const result = await generateStructuredJSON<ValidationResult>(
      systemPrompt,
      userPrompt,
      { role: 'fast' },
    );

    // Merge mechanical warnings with Haiku issues
    const allIssues = [
      ...mechIssues,
      ...(result.issues ?? []).map(i => ({ ...i, source: 'haiku' as const })),
    ];

    const hasBlockers = allIssues.some(i => i.severity === 'blocker');

    // Merge C4's validatedScript with original draft to preserve metadata/structure
    const mergedScript = mergeValidatedScript(draft, result.validatedScript);

    return {
      status: hasBlockers ? 'needs_revision' : 'pass',
      issues: allIssues,
      validatedScript: mergedScript,
    };
  } catch (err) {
    console.warn(`  C4 Haiku error: ${(err as Error).message.slice(0, 80)}`);
    // If Haiku fails, pass with mechanical checks only
    return {
      status: mechIssues.some(i => i.severity === 'blocker') ? 'needs_revision' : 'pass',
      issues: mechIssues,
      validatedScript: draft,
    };
  }
}
