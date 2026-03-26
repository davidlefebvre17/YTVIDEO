import type { AssetSnapshot, EpisodeDirection } from "@yt-maker/core";
import type { RawBeat, ArcBeat, MoodTag } from "../pipeline/types";

interface CompactBeat {
  id: string;
  seg: string;
  depth: string;
  hint: string;
  text: string;
  dur: number;
  segStart: boolean;
  segEnd: boolean;
  assets: string[];
}

function compactBeats(beats: RawBeat[], truncate: boolean): CompactBeat[] {
  return beats.map(b => ({
    id: b.id,
    seg: b.segmentId,
    depth: b.segmentDepth,
    hint: b.overlayHint,
    text: truncate
      ? b.narrationChunk.split(/\s+/).slice(0, 15).join(' ') + (b.narrationChunk.split(/\s+/).length > 15 ? '...' : '')
      : b.narrationChunk,
    dur: b.durationSec,
    segStart: b.isSegmentStart,
    segEnd: b.isSegmentEnd,
    assets: b.assets,
  }));
}

export function buildC7Prompt(
  beats: RawBeat[],
  mood: MoodTag,
  arc: ArcBeat[],
  assets: AssetSnapshot[],
  editorialVisuals?: Record<string, string>,
): { system: string; user: string } {

  const system = `Tu es un directeur artistique qui pense comme un illustrateur éditorial du Wall Street Journal, du New York Times ou de The Economist.

MISSION : Diriger l'identité visuelle d'un récapitulatif marché quotidien (80-120 beats de 5-8 secondes) en illustrations éditoriales narratives. Chaque beat doit avoir un RÔLE dans l'histoire du jour.

## PHASE 1 : ANALYSER L'HISTOIRE AVANT LES BEATS

AVANT de diriger beat-par-beat, tu DOIS identifier les ÉLÉMENTS DE RÉCIT :

1. **PERSONNAGES du jour** — Utilise leurs NOMS RÉELS (Trump, Powell, Lagarde, Fink, etc.) + traits physiques distinctifs. Les noms réels permettent au générateur d'images de produire des visages reconnaissables. Ils doivent RÉAPPARAÎTRE across beats pour la continuité narrative.

2. **PARADOXES/IRONIES clés** (3-5) — Ce sont les tensions visuelles de l'épisode. Chaque paradoxe doit se traduire en une image percutante.

3. **MÉTAPHORES VISUELLES** — Pense en termes PHYSIQUES et TANGIBLES. Les meilleures illustrations éditoriales racontent une histoire en une image via un contraste, une fracture, une juxtaposition.

4. **ARC NARRATIF** — La progression émotionnelle globale de l'épisode.

## PHASE 2 : STYLE — WSJ HEDCUT ÉDITORIAL

Style : **Illustration à l'encre noire sur papier crème, hachures croisées (crosshatching), accents couleur sélectifs UNIQUEMENT sur éléments narratifs clés.**

Principes :
- Format 16:9 large
- Noir et blanc dominant (encre, hachures, stipple)
- Accents couleur SÉLECTIFS par sujet : or/doré sur métaux, orange sur pétrole/énergie, bleu sur tech/crypto — le reste en encre noire
- PERSONNAGES PUBLICS par leur NOM RÉEL — visages visibles (face, profil 3/4), composition éditoriale portrait
- LIEUX EMBLÉMATIQUES par leur NOM RÉEL : NYSE, Eccles Building, ECB Frankfurt, White House, Wall Street Bull, etc. — Flux les connaît
- SYMBOLES FINANCIERS autorisés comme éléments graphiques : ₿ $ € ¥
- IMPACT ÉDITORIAL : les images RACONTENT l'histoire — ironie, contraste, métaphore visible, composition à impact
- Style ÉDITORIAL SÉRIEUX (The Economist, NYT, WSJ) — pas cartoon, pas caricature exagérée
- Détails physiques tangibles : objets, architecture, paysage, figures humaines, lumière
- PAS de texte lisible ni de phrases dans l'image

## PHASE 3 : ALTERNER LES ÉCHELLES

Trois niveaux, cycle de 3-4 beats :
1. **MACRO** : vue aérienne, skyline, paysage, horizon — respiration
2. **MOYEN** : salle de marché, bureau, bâtiment, intérieur — contexte
3. **MICRO** : gros plan objet, texture, détail matière, portrait serré — impact

Règles :
- JAMAIS 3 consécutifs à la même échelle
- Changement de segment = changement d'échelle OBLIGATOIRE
- Beats "impact" = MICRO ou MOYEN
- Beats "respiration" = MACRO + lumineux
- Après 2 intérieurs sombres → forcer extérieur lumineux

## PHASE 4 : CONTINUITÉ DES PERSONNAGES

Si un personnage apparaît en beat 5, le réutiliser aux moments clés suivants — TOUJOURS par son NOM. Varier angle et cadrage mais maintenir les traits distinctifs. Cela crée la continuité narrative.

## PHASE 5 : VOCABULAIRE VISUEL PAR SUJET

Pour chaque classe d'actifs, utilise les VRAIS noms de lieux, entreprises et personnalités du secteur. Le générateur d'images connaît ces références et produira des résultats plus précis et reconnaissables qu'avec des descriptions génériques.

Quelques familles (non exhaustif — adapte selon l'actualité du jour) :
- **Pétrole/Énergie** : raffineries, plateformes offshore, tankers, Strait of Hormuz, OPEC headquarters
- **Or/Métaux** : lingots, coffres-forts, mines, Federal Reserve gold vault
- **Indices/Marchés** : NYSE trading floor, Wall Street Bull, salles de marché, tickers
- **Banques centrales** : Federal Reserve Eccles Building, ECB Frankfurt, Bank of England, Bank of Japan
- **Géopolitique** : White House, Capitol, Kremlin, Élysée, UN General Assembly, tables de négociation
- **Tech** : cleanrooms semi-conducteurs, data centers, campus Silicon Valley
- **Crypto** : data centers, serveurs, symbole ₿

Règle : si un photographe documentaire ne peut pas le capturer dans le monde réel → NE LE PROPOSE PAS.

## PHASE 6 : OVERLAYS & RYTHME DATA

- Cible : ~35% beats avec overlay, ~65% image seule
- Le champ \`hint\` est une suggestion du code — valide, modifie ou supprime ("none")
- JAMAIS 2 overlays "chart" consécutifs
- Beats avec overlay stat = image de fond SIMPLE
- Types : stat, chart, chart_zone, causal_chain, comparison, headline, text_card, heatmap, scenario_fork, gauge, ticker_strip

## PHASE 7 : TRANSITIONS & EFFETS

Transitions :
- Entre segments (segEnd→segStart) : cross_dissolve ou fade (cassure forte)
- Intra-segment : cut ou fade court (léger)

Effets image :
- ken_burns_in (zoom lent) : par défaut
- ken_burns_out (dézoom) : révélations, ouverture perspective
- slow_pan_left / slow_pan_right : panoramas, ~20% beats
- static : UNIQUEMENT pauses/title cards

## RÈGLE CRITIQUE : CHAQUE BEAT A UNE IMAGE

CHAQUE beat = \`imageDirection\` (nouveau) OU \`imageReuse: "same_as:beat_XXX"\` (angle/zoom différent).
Aucun beat vide. En pratique : ~50-60 images uniques, ~40-50% réutilisées.

## OUTPUT

Retourne un JSON strict :
\`\`\`json
{
  "storyElements": {
    "characters": [
      { "name": "Nom réel", "physicalTraits": "traits distinctifs", "appearsIn": ["beat_005", "beat_042"] }
    ],
    "paradoxes": ["ironie 1", "ironie 2"],
    "visualMetaphors": ["métaphore 1", "métaphore 2"],
    "narrativeArc": "description courte de l'arc"
  },
  "visualIdentity": {
    "colorTemperature": "warm" | "cool" | "neutral",
    "lightingRegister": "soft_natural" | "golden_hour" | "overcast" | "studio_warm",
    "photographicStyle": "WSJ hedcut editorial illustration",
    "forbiddenElements": ["cartoon_exaggeration", "neon", "abstract_concepts", "modern_flat_design"]
  },
  "directions": [
    {
      "beatId": "beat_001",
      "imageDirection": "Scène narrative concrète en français",
      "imageReuse": null,
      "overlay": "stat" | "none" | "chart" | etc.,
      "overlayNotes": "optionnel",
      "imageEffect": "ken_burns_in",
      "transitionOut": "cut",
      "narrativeRole": "rôle dans l'arc narratif"
    }
  ]
}
\`\`\``;

  const assetSummary = assets.slice(0, 15).map(a =>
    `${a.symbol} (${a.name}): ${a.price} ${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(1)}%`
  ).join('\n');

  const truncate = beats.length > 80;
  const compacted = compactBeats(beats, truncate);

  const user = `## Épisode du jour — Données narratives

**Mood marché** : ${mood}
**Arc de tension** : ${arc.map(a => `${a.segmentId}(${a.role},T${a.tensionLevel})`).join(' → ')}

## Actifs clés
${assetSummary}

## Concepts visuels éditoriaux (Opus — point de départ OBLIGATOIRE)
${editorialVisuals && Object.keys(editorialVisuals).length > 0
  ? Object.entries(editorialVisuals).map(([seg, concept]) => `- **${seg}**: ${concept}`).join('\n')
  : '(Aucun concept fourni — invente des scènes narratives percutantes)'}

RÈGLE : ces concepts viennent du rédacteur en chef (Opus). Tu DOIS les utiliser comme BASE pour tes directions image. Tu peux adapter la composition mais PAS remplacer par des scènes décoratives.

## Beats à diriger (${beats.length} beats)

${JSON.stringify(compacted, null, 0)}

---

**Tu dois produire un JSON complet avec :**
1. **storyElements** — analyse narrative AVANT les directions beat-par-beat
2. **visualIdentity** — style hedcut WSJ + accents couleur sélectifs
3. **directions[]** — chaque beat avec imageDirection OU imageReuse, overlay, effet, rôle narratif

RAPPEL : Noms réels pour personnages et lieux. Faces visibles. Symboles ₿ $ € ¥ autorisés. Échelles alternées. Continuité des personnages. Métaphores tangibles.`;

  return { system, user };
}
