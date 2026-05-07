# Plan de restructuration du repo TradingRecap

Rédigé le 2026-05-06 après audit 4 agents en parallèle (scripts / packages / data / racine).

## Contexte

Projet de 8+ mois, monorepo turbo, ~80 scripts, 4 packages, ~445 MB dans `data/`, 20+ specs `.md` à plat à la racine. Beaucoup de résidus de phases passées (test ad-hoc, migrations one-shot, anciens providers TTS) qui rendent la navigation difficile et exposent à du code mort.

Effort total estimé pour passer en B+ globalement : **4-5h** étalées sur 5 chantiers indépendants.

---

## Constat — Note de propreté par zone

| Zone | Note | Diagnostic principal |
|---|---|---|
| `packages/core` | A | 2 exports orphelins mineurs (`computeLayout`, partie de `format.ts`) |
| `packages/data` | B | 3 exports inutilisés (`fetchMarketauxNews`, `fetchPolymarketData`, `fetchSupabaseCalendar`), 2 APIs calendar redondantes |
| `packages/remotion-app` | B | 6 scènes compilées non montées, 10 variants peu utilisés |
| `packages/ai` | **C** | 2 providers TTS orphelins (ElevenLabs, OpenAI), 3 `sanitizeForTTS()` dupliquées |
| `scripts/` | **C** | 35+ one-off à archiver (test-*, debug-*, audit-*, check-*) |
| `data/` | **D** | 120 MB de stale + résidus scripts (chunk-*, phonetic-chunk-*, tophon-*) |
| Racine | B | 20 .md à plat, mix vivants/specs/legacy |

---

## Plan d'exécution — 5 chantiers ordonnés

Chaque chantier = 1 commit indépendant. Ordre choisi pour minimiser les risques de casser le pipeline en cours.

### Chantier 1 — Quick wins (zéro risque) — **30 min**

Supprimer fichiers résiduels racine + étendre `.gitignore`. Aucune dépendance code.

**À supprimer racine :**
- `c7-storyboard-view-2026-03-12.html` (39 KB, debug HTML)
- `p7-production-parallele-2026-03-12.html` (30 KB, debug HTML)
- `extract-chunk.js` (3.6 KB, scratch utilitaire)

**À ajouter à `.gitignore` :**
```
data/prompt-test-*.json
data/props-*.json
data/chunk-*.json
data/phonetic-chunk-*.json
data/tophon-*.json
data/**/*.log
data/scratch/
data/archive/
```

---

### Chantier 2 — Réorganisation `docs/` — **45 min**

Créer arborescence `docs/` et déplacer 12 fichiers `.md`. Vérifier que CLAUDE.md ne référence pas les fichiers déplacés.

**Garder à la racine (5 vivants) :**
- `BLUEPRINT.md`, `CLAUDE.md`, `CLAUDECODE_P6_P7_NYT.md`, `LLM-COST-OPTIMIZATION-PLAN.md`, `TRADING-HF-SYSTEM-SPEC.md`

**Créer arborescence cible :**
```
docs/
├── specs/        — C-PROMPT-PIPELINE-SPEC, D2-NEWS-MEMORY-SPEC, D2-STOCK-ALIASES, E2-VISUAL-PIPELINE-SPEC, E2-ROADMAP
├── remotion/     — REMOTION-COMPREHENSIVE-GUIDE, REMOTION-ADVANCED-PATTERNS, REMOTION-QUICK-REFERENCE
├── compliance/   — youtube-monetisation-ia
└── archive/      — BACKFILL_NOTES, E3-NEWSPAPER-VIDEO-PLAN, REPO-CLEANUP-PLAN (ce fichier, après exécution)
```

**À supprimer :**
- `REMOTION-DOCUMENTATION-INDEX.md` — métaindex pointe vers fichier inexistant `REMOTION-TRADING-VIDEO-PATTERNS.md`

---

### Chantier 3 — Réorganisation `scripts/oneoff/` — **1h**

35+ scripts ad-hoc à isoler. Vérifier qu'aucun n'est appelé depuis `package.json` ou un autre script.

**Garder à `scripts/` (PROD — appelés par `npm run X`) :**
`render.ts`, `fetch-data.ts`, `write-script.ts`, `prompt-test.ts`, `prompt-studio.ts`, `market-studio.ts`, `backfill-news.ts`, `init-market-memory.ts`, `dashboard.ts`, `upload-youtube.ts`, `gen-thumbnail.ts`, `gen-vtt.ts`, `generate.ts`

**Garder à `scripts/dev-utils/` (utilitaires raisonnables) :**
- migrations : `migrate-episodes.ts`, `backfill-episodes.ts`, `retag-news.ts`
- patches data : `patch-snapshot.ts`, `patch-news.ts`, `sync-asset-names.ts`, `sync-studio-episodes.ts`
- regen : `regen-audio.ts`, `regen-owl-audio.ts`
- comparaisons : `compare-pipelines.ts`, `compare-materiality.ts`, `compare-voices.ts`
- production owl : `animate-owl-*.ts` (4), `gen-owl-*.ts` (5), `generate-owl-*.ts`
- corrections : `fix-audio-durations.ts`, `fix-owl-*.ts`
- divers : `load-episode.ts`, `realign-episode.ts`, `snapshot-to-html.ts`, `fix-chapters-on-youtube.ts`, `check-channel-stats.ts`, `test-phonetics.ts`

**À déplacer dans `scripts/oneoff/` :**
- 31 `test-*.ts` (sauf `test-phonetics.ts` qui est la suite de tests prod) — notamment 9 `test-comfyui*.ts` à consolider
- 3 `debug-*.ts` : `debug-earnings-filter`, `debug-estimate`, `debug-week2`
- 3 `audit-*.ts` : `audit-snapshot-data`, `audit-tickers`, `audit-anglicisms`
- 6 `check-*.ts` (sauf `check-channel-stats.ts`) : `check-episodes`, `check-episodes2`, `check-nvda-tags`, `check-drama-delta`, `check-blockers`...
- Anomalies : `test-pricé-debug.ts` (caractère accentué), `test-bis.ts`, `test-no-c6.ts`

---

### Chantier 4 — Réorganisation `data/` — **1h**

Le plus volumineux : 445 MB → cible ~325 MB après archivage stale.

**Structure cible :**
```
data/
├── (TRACKED — sources de vérité)
│   ├── company-profiles.json
│   ├── phonetics-registry.json
│   ├── PHONETICS.md
│   ├── indices/
│   ├── taxonomies.json
│   └── cot-history.json
├── live/                    — Généré quotidien, garder 7j
│   ├── market-memory/
│   ├── snapshot-{today}.json
│   ├── news-memory.db (+ -shm + -wal)
│   ├── pipeline/
│   └── images/
├── cache/                   — Régénérable
│   ├── beat-test-props.json
│   ├── owl-prompts.json
│   ├── owl-seg*.mp4
│   └── owl-pushups.mp4
├── archive/                 — > 7j, gitignored
│   ├── snapshots/           (40+ snapshot-2026-04-*.json)
│   ├── scripts/             (14 script-*.json Feb/Mar)
│   ├── logs/                (generate-log-*, regen-audio-*)
│   ├── comparisons/         (compare/)
│   ├── owl-renders/         (owl-office-*.png + tests animation)
│   └── snapshot-2026-04-22.html
├── scratch/                 — Résidus migrations, gitignored
│   ├── chunk-[1-8]-names.json
│   ├── phonetic-chunk-[1-8].json
│   ├── phonetic-missing.json
│   ├── phonetic-reference-style.json
│   ├── tophon-chunk-[1-8].json
│   ├── tophon-result-[1-8].json
│   ├── comfyui-*-test/      (7 dossiers)
│   ├── tts-arpabet-test/
│   ├── tts-c6-compare/
│   ├── owl-script-0327.txt
│   └── beat-test-*.png
└── sources/                 — Données externes, tracked si <5MB
    ├── eliothewit-*.txt/.vtt
    └── grandangle-*.txt/.vtt
```

**À supprimer définitivement :**
- `prompt-test-*.json` (11 fichiers Feb 19-20)
- `props-*.json` (3 fichiers Feb-Mar, supersédés par `beat-test-props.json`)
- `test-fish-audio.mp3`
- `screenshot.png`
- `comfyui-test.png`, `comfyui-real-beat_005.png`
- `wan21-i2v.json` (14 octets, vide)
- `yahoo-session-test-2026-04-22.csv`
- `sp500-chart.html` (Mar 11, ancien chart)
- `bondain-missed-patterns.md`

---

### Chantier 5 — Refacto `packages/ai` TTS dead code — **2-3h**

Le plus risqué (touche au code de prod). À faire en dernier, avec test du pipeline après chaque suppression.

**À supprimer (vérification d'absence d'imports avant) :**
- `packages/ai/src/p7-audio/edge-tts.ts` — Edge TTS provider (orphelin)
- `packages/ai/src/p7-audio/elevenlabs.ts` — ElevenLabs provider (orphelin)
- `packages/ai/src/p7-audio/openai-tts.ts` — OpenAI TTS provider (orphelin)
- `packages/ai/src/prompts/chart-analysis.ts` — Prompt jamais importé
- Exports orphelins de `news-db` (`NewsMemoryDB`, `initTagger`, `tagArticleAuto`) si confirmés inutilisés
- Exports orphelins de `script-generator.ts` (`formatSnapshotForPrompt`, `PrevContext`, `PrevEntry`)

**À dédupliquer :**
- 3 implémentations différentes de `sanitizeForTTS()` dans `edge-tts.ts` + `generate-beat-audio.ts` → une seule source dans `phonetic-registry.ts` ou utility commune

**Optionnel — bonus refacto `remotion-app` :**
- 6 scènes compilées mais non montées (`CandlestickChart`, `SpreadChart`, `InkChart`, `ScenarioFork`, `ColdOpenPunch`, `CountdownEvent`) : décider scène par scène
- 10 variants utilisés une seule fois chacun : envisager fusion avec leur composant parent

---

## Anomalies notées (à traiter au passage)

- `test-pricé-debug.ts` — caractère accentué dans nom de fichier (à renommer ou supprimer)
- `REMOTION-DOCUMENTATION-INDEX.md` — référence un fichier `REMOTION-TRADING-VIDEO-PATTERNS.md` inexistant
- `data/wan21-i2v.json` — 14 octets (vide ou cassé)
- 9 variants `test-comfyui*.ts` quasi-identiques — consolidation en 1 seul script paramétrable
- `test-bis.ts`, `test-no-c6.ts` — noms énigmatiques

---

## Cible finale racine

```
trading-youtube-maker/
├── BLUEPRINT.md
├── CLAUDE.md
├── CLAUDECODE_P6_P7_NYT.md
├── LLM-COST-OPTIMIZATION-PLAN.md
├── TRADING-HF-SYSTEM-SPEC.md
├── README.md (à créer si pas déjà là)
├── .env.example
├── package.json, tsconfig*.json, turbo.json, .gitignore
├── docs/
│   ├── specs/
│   ├── remotion/
│   ├── compliance/
│   └── archive/
├── packages/
│   ├── core/, data/, ai/, remotion-app/
├── scripts/
│   ├── (12 PROD)
│   ├── dev-utils/
│   └── oneoff/
├── data/
│   ├── (sources tracked)
│   ├── live/, cache/, archive/, scratch/, sources/
├── episodes/    (gitignored)
└── out/         (gitignored)
```

---

## Procédure recommandée

1. Attendre la fin du render 2026-05-06 actuel (~1h)
2. Commit le travail en cours (anti-template prompt + mention IA + bubble fix + concurrency=4)
3. Exécuter Chantier 1 → commit
4. Exécuter Chantier 2 → commit
5. Exécuter Chantier 3 → commit, vérifier `npm run typecheck`
6. Exécuter Chantier 4 → commit
7. Exécuter Chantier 5 → commit, **lancer un pipeline test complet** pour vérifier que rien n'est cassé

À chaque étape : `git status` pour vérifier ce qui change, et `npm run typecheck` au minimum avant de commit.
