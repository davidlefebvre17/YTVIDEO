# LLM Cost Optimization Plan

Audit réalisé le 2026-04-23 (3 agents parallèles : Sonnet auditor, Haiku auditor, Opus auditor).

## Baseline observée (1 run complet, 2026-04-23)

| LLM | Coût actuel | Appels/run | Remarques |
|---|---|---|---|
| Sonnet 4.6 | **2.00€** | 4-5 (C1, C2, C5, C7 ×2 chunks) | C2 = 67k chars, C5 = 22k chars |
| Opus 4.7 | **1.00€** | 1-2 (C3 + retry) | 160-171k chars prompt |
| Haiku 4.5 | **0.30€** | 27+ (P1.5, knowledge, MarketMemory ×2, P5 C4, P7a.5 ×10, C8 ×2, C6 TTS ×10, etc.) | Gros volume, coût unit bas |
| **Total** | **3.30€/ép** | | |

Objectif projeté : **~0.90€/ép (-73%)** sans perte qualité.

## Audit détaillé (résumé)

### Audit Sonnet — leviers

- **Prompt caching non activé** → levier #1 : -0.80€
- **briefingPack dupliqué C1+C2** : C2 ne lit que triggers/CB/COT → -0.12€
- **Knowledge briefing 17k chars** → top chunks score>80 seulement → -0.18€
- **Asset data perf** : dédupliquer rolling/calendaire (week~7j vs wtd, year~252j vs ytd en avril) + retirer ATR_ratio inutilisé → -0.40€
- **C5 chartInstructions** : résumé compact au lieu de JSON.stringify → -0.08€
- **C5 downgrade Sonnet → Haiku** : tâches déterministes (arc numérique + transitions + audioBreakpoints) → -0.18€

### Audit Haiku — leviers

- **P7a.5 Beat Annotator** : 10 appels, system prompt 11.8k répété × 10 + snapshot.assets en entier à chaque appel → batch 10→3 + filtrer primaryAsset → -0.07€
- **C6 TTS** : 10 appels, system prompt **19k chars** (le plus gros) × 10, pour placer des `[pause]` → shrink à 8k + batch → -0.05€
- **Prompt caching** (en plus de Sonnet) → -0.06€
- **Skip C4 Haiku** si 0 blocker mécanique → -0.03€

### Audit Opus — leviers

- **recentScripts** 5 épisodes verbatim = **70-85k chars (45-55% du prompt !)** → 2 épisodes DEEP-only tronqués 500c/seg → -0.29€
- **TIER 2 réserve** du user prompt (keyFacts/tech/risk/conf par segment) : littéralement "matière à ignorer" selon le system prompt lui-même → -0.07€
- **previousDraft sur retry** : injecte tous les segments même si 1 seul blocker → filtrer → -0.11€
- **AssetContext** : 38-50 assets → filtrer au plan éditorial (~15) → -0.03€
- **Prompt caching** system prompt Opus → -0.10€

## Plan d'implémentation en 3 phases

### Phase 1 — Quick wins (zéro risque, ~2h, gain ~-1.20€/ép)

- [x] 1.1 **Prompt caching** sur les system prompts statiques (llm-client.ts : système array avec `cache_control: {type: "ephemeral"}`). Tous les LLMs.
- [ ] 1.2 **Skip C4 Haiku** si validation mécanique trouve 0 blocker tone/compliance
- [ ] 1.3 **AssetContext C3** filtré aux assets du plan éditorial uniquement
- [ ] 1.4 **P7a.5 assets filtrés** au primaryAsset du segment + 2-3 corrélés
- [ ] 1.5 **C2** : retirer briefingPack formaté (garder triggers + CB speeches + COT divergences dans un bloc minimal)
- [ ] 1.6 **C5 downgrade Sonnet → Haiku 4.5**

### Phase 2 — Structurel (risque faible, ~4h, gain ~-0.60€/ép)

- [ ] 2.1 Supprimer **TIER 2 réserve** du user prompt C3 (garder causalChain en TIER 1)
- [ ] 2.2 **C3 previousDraft retry** : seulement segments avec blocker
- [ ] 2.3 **Knowledge briefing** réduit de 17k→8k chars (filtrer score>80)
- [ ] 2.4 **C5 chartInstructions** : résumé compact, pas JSON.stringify verbeux
- [ ] 2.5 **C3 asset data** : dédupliquer perf (1S/1M/YTD uniquement), retirer ATR_ratio

### Phase 3 — À A/B tester (~1 jour, gain ~-0.30€/ép, tests required)

- [ ] 3.1 **recentScripts C3** : 5→2 épisodes, filtrer `depth==='deep'`, tronquer 500c/seg — **tester contre régression anti-répétition** sur 3-5 épisodes
- [ ] 3.2 **P7a.5 batching** 10 segments → 3 groupes — tester token overflow sur output
- [ ] 3.3 **C6 TTS shrink** prompt 19k→8k + batching — tester rythme des `[pause]`

## Sécurité

- **Compliance AMF** : intacte (pas touché aux règles disclaimer/éducatif)
- **Règle RÉEL PHYSIQUE** : intacte (core identité éditoriale)
- **Anti-répétition** (fix 2026-04-23) : intact
- **Ancres temporelles** session J-1 : intact
- **TTS phonétiques** : intact

## Références

- Agents audit : rapports dans l'historique de conversation du 2026-04-23
- Fichiers principaux :
  - `packages/ai/src/llm-client.ts` (caching)
  - `packages/ai/src/pipeline/p2-editorial.ts` (C1)
  - `packages/ai/src/pipeline/p3-analysis.ts` (C2)
  - `packages/ai/src/pipeline/p4-writing.ts` (C3)
  - `packages/ai/src/pipeline/p5-validation.ts` (C4 skip)
  - `packages/ai/src/pipeline/p6-direction.ts` (C5 downgrade)
  - `packages/ai/src/pipeline/p7a5-beat-annotator.ts` (P7a.5 batching)
  - `packages/ai/src/pipeline/p7-c6-tts-adaptation.ts` (C6 TTS shrink)
  - `packages/ai/src/pipeline/helpers/episode-summary.ts` (recentScripts)
