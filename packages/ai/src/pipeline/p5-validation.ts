import { generateStructuredJSON } from "../llm-client";
import type {
  DraftScript, EditorialPlan, AnalysisBundle, WordBudget,
  SnapshotFlagged, ValidationResult, ValidationIssue,
} from "./types";

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
    draft.coldOpen?.narration ?? '',
    draft.thread?.narration ?? '',
    ...draft.segments.map(s => s.narration),
    draft.closing?.narration ?? '',
  ];
  return parts.join(' ');
}

export function validateMechanical(
  draft: DraftScript,
  plan: EditorialPlan,
  budget: WordBudget,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fullText = getAllNarration(draft);

  // 1. Duration range (390-520s = 6.5-8.7 min)
  const duration = draft.metadata?.totalDurationSec ?? 0;
  if (duration < 390 || duration > 520) {
    issues.push({
      type: 'length',
      description: `Durée estimée ${duration}s hors range 390-520s`,
      severity: duration < 300 || duration > 600 ? 'blocker' : 'warning',
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
  return `Tu es un validateur éditorial pour une émission de marché financier. Tu vérifies la qualité et la compliance d'un script.

RÔLE : Identifier les problèmes. Tu NE réécris PAS le script entier — tu corriges uniquement les problèmes mineurs (warnings).

VÉRIFICATIONS :
1. COMPLIANCE : Aucune recommandation directe, même déguisée ("le bon moment pour...", "on devrait...")
2. TON : Jamais retail ("t'as vu", "c'est dingue", "pépite", "to the moon")
3. COHÉRENCE TEMPORELLE : J vs J-1 clairement distingués, pas d'ambiguïté
4. CONTINUITÉS : Si le plan éditorial mentionne une continuité J-1, elle DOIT être dans la narration
5. CONFIANCE : Le ton doit correspondre au confidenceLevel (speculative → conditionnel, high → direct)

RÈGLES :
- severity = "blocker" : recommandation directe, ton retail persistant, continuité manquante
- severity = "warning" : transition maladroite, formulation améliorable
- Pour les warnings : propose un suggestedFix ET corrige directement dans validatedScript
- NE PAS inventer de problèmes — si le script est bon, retourne status: "pass"
- Tu peux modifier le texte pour corriger des warnings mais JAMAIS changer le sens ou la structure

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
): Promise<ValidationResult> {
  // Fix anglicisms first (always, no LLM needed)
  fixAnglicisms(draft);

  // Step 1: Mechanical validation
  const mechIssues = validateMechanical(draft, plan, budget);
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
