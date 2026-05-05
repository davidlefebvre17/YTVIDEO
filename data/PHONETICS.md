# Phonetics — système TTS Owl Street Journal

Ce document explique le système de phonétisation pour Fish Audio TTS. **Si tu veux ajouter une phonétique, lis "Workflow d'ajout" en bas.**

## Architecture

Le pipeline de transformation du texte (Opus → Fish) passe par `preProcessForTTS()` (`packages/ai/src/pipeline/p7-c6-tts-adaptation.ts`) qui applique 10 sous-étapes déterministes, dont 3 utilisent le système de phonétisation :

```
1. Anti-redondances (CL=F, le brut → le brut)
2. Tickers entre guillemets ("CL=F" → phonetic)             ← phoneticRegistry.getTickerMap()
3. Markdown / symboles
4. Chiffres → lettres FR
5. Noms en clair (Bitcoin, Tesla → phonetic)                ← phoneticRegistry.getNameRules()
6. Règles regex génériques (anglicismes, sigles, etc.)      ← phoneticRegistry.getRegexRules()
7. Élision automatique (le → l')
8. Cleanup
```

## Source unique : `phoneticRegistry`

`packages/ai/src/p7-audio/phonetic-registry.ts` agrège **2 fichiers de données** :

### 1. `data/company-profiles.json` — phonétiques par ticker/asset
Champ `phonetic` sur chaque profile. Source naturelle pour :
- Crypto : `BTC-USD` → `"bitconne"`, `ETH-USD` → `"étériom"`
- Indices : `^GSPC` (name "S&P 500") → `"essenne pi cinq cents"`
- Tickers exchange : `DHL.DE` → `"dé ache èl groupe"`, `BNP.PA` → `"béénépé"`
- Brand : `__BRAND_OSJ__` (name "Owl Street Journal") → `"aul street journale"`

Loader produit 2 maps :
- `tickerMap` : `symbol` → `phonetic` (pour `"TICKER"` entre guillemets)
- `nameRules` : `[regex(name), phonetic]` triés par longueur DESC (pour noms en clair)

### 2. `data/phonetics-registry.json` — règles regex catégorisées
Pour les cas qui ne sont PAS liés à un ticker spécifique :

| Catégorie | Exemples |
|---|---|
| `fish_bugs` | grimpe → grimp, vingt-onze → vingt onze, stablecoin → stébeul-conne |
| `geography` | Hormuz → Ormuz |
| `companies_named` | Tesla → Tessla, JPMorgan → Djéï-Pi Morganne (sociétés instables phonétiquement) |
| `anglicisms` | bullish → boulliche, pricing → praille-cingue |
| `suffixes` | Technologies → Tèknolodji |
| `indices` | S&P → essenne pi (variantes courtes), CAC → caque |
| `acronyms` | RSI → R.S.I., ETF → eutéèf, WTI → doublevé té i |
| `central_banks` | Fed → Fède, BoJ → Boge |
| `linguistic` | yens → yen (invariable), quarante → karante |

L'ordre des catégories dans le JSON = ordre d'application.

## Doublons volontaires (filet de sécurité)

Certaines règles existent dans **les 2 sources** (ex: `S&P 500` dans `company-profiles.json` ET dans `indices` de registry). C'est **intentionnel** : si le profile manque ou que son `name` est légèrement différent du texte d'Opus, le registry rattrape. La 2e application est idempotente (donne le même résultat).

Cela concerne ~5 entrées (S&P 500, CAC 40, DAX, Dow Jones, VIX). Pas de risque, juste une redondance assumée.

## Désactivation `Fish normalize`

`packages/ai/src/p7-audio/fish-tts.ts` envoie **`normalize: false`** par défaut à l'API Fish. Sinon Fish "normalise" le texte côté serveur et peut **surcharger** nos phonétiques custom (lit "DHL.DE" littéralement, "Owl" en anglais, etc.).

→ Conserver `normalize: false`. Ne pas réactiver sans tester l'impact sur les phonétiques.

## Tests automatiques

`scripts/test-phonetics.ts` : 31 tests couvrant tous les cas critiques. Run avant tout commit qui touche aux phonétiques :

```bash
npx tsx scripts/test-phonetics.ts
```

Doit afficher `31/31 tests passed`.

## Workflow d'ajout d'une phonétique

### Cas 1 — Asset / ticker / brand (avec un identifiant unique)
**→ Ajouter dans `data/company-profiles.json`**

```json
{
  "symbol": "DOGE-USD",
  "name": "Dogecoin",
  "phonetic": "dodjcoïne",
  ...
}
```

Bénéfice : couvre **3 patterns d'usage** automatiquement :
1. `"DOGE-USD"` entre guillemets → phonétique
2. `Dogecoin` en clair → phonétique
3. Apparait dans tickerMap pour `replaceTickersInQuotes` (TTS OpenAI fallback)

### Cas 2 — Mot/expression sans ticker (anglicisme, sigle, terme métier)
**→ Ajouter dans `data/phonetics-registry.json`** dans la catégorie pertinente :

```json
{
  "id": "anglicisms",
  "rules": [
    { "pattern": "\\bnouveau-mot\\b", "flags": "gi", "replacement": "no-vo-mo", "comment": "Si pertinent" }
  ]
}
```

### Étape commune : tester
1. Ajouter un test dans `scripts/test-phonetics.ts` :
   ```ts
   expectContains('Le Dogecoin monte', 'dodjcoïne', 'Dogecoin → phonétique');
   ```
2. Run : `npx tsx scripts/test-phonetics.ts`
3. Si vert → commit. Si rouge → debug.

## Règle d'or

**JAMAIS ajouter une règle phonétique dans le code TypeScript directement.** Toujours dans `data/phonetics-registry.json` ou `data/company-profiles.json`. Ces fichiers sont les seules sources de vérité.

## Pour aller plus loin

- L'overlap detection (anti-redondance "ticker phonétique" + "même nom déjà dans la phrase") est dans `phonetic-tickers.ts:replaceTickersInQuotes()`.
- Le `_nameRules` array est trié par longueur DESC pour matcher "Goldman Sachs" avant "Goldman" seul.
- L'élision auto (l'or, d'Apple) est dans `preProcessForTTS()` après les phonétiques, donc gère "le Bitcoin" → "le bitconne" correctement (pas d'élision sur 'b').
