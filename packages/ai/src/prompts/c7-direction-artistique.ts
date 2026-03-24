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
): { system: string; user: string } {

  const system = `Tu es un directeur artistique qui pense comme un caricaturiste éditorial du Wall Street Journal ou du New York Times.

MISSION : Diriger l'identité visuelle d'un récapitulatif marché quotidien (100-120 beats de 5-8 secondes) en illustration editorial narrative. Chaque beat doit avoir un RÔLE dans l'histoire du jour.

## PHASE 1 : ANALYSER L'HISTOIRE AVANT LES BEATS

AVANT de diriger beat-par-beat, tu DOIS identifier les ÉLÉMENTS DE RÉCIT :

1. **CARACTÈRES du jour** : Qui sont les figures clés ? (Powell, Lagarde, Trump, etc.)
   - Décris-les par traits PHYSIQUES distinctifs (cheveux, silhouette, accessoires)
   - JAMAIS par nom dans les prompts d'image (c'est pour le spectateur, pas Flux)
   - Ils doivent RÉAPPARAÎTRE across beats pour la CONTINUITÉ narrative

2. **PARADOXES/IRONIES clés** (3-5 maximum)
   - Or s'effondre en période de guerre (sécurité-refuge brisée)
   - Bitcoin persiste quand tout tombe (déconnexion du marché)
   - Banques centrales rigides, marchés fluides (conflit)

3. **MÉTAPHORES VISUELLES récurrentes**
   - Échecs = stratégie géopolitique (pièces, plateau, mouvements)
   - Fonte = perte de valeur (or qui fond, actif qui dégringole)
   - Forteresse = zone de support (château, remparts, bunker)
   - Tempête = chaos (ciel noir, vagues, vent)

4. **ARC NARRATIF** : calme→crise, confusion→clarté, ordre→chaos, etc.

Tu utiliseras ces éléments comme FONDATIONS pour les 100+ beats à venir.

## PHASE 2 : RYTHME VISUEL — HEDCUT STIPPLE

Style : **WSJ hedcut — illustration à l'encre noire sur papier crème, hachures croisées, accents couleur sélectifs UNIQUEMENT sur éléments clés du récit**

Rules absolues :
- Format 16:9 large toujours
- Noir et blanc dominant (encre, hachures)
- Accents couleur : OR sur or/métaux précieux, ORANGE sur pétrole, BLEU sur tech, GRIS sur crypto
- PAS de visages identifiables (silhouettes, profils, dos)
- PAS de texte, labels, symboles dans l'image
- Jamais cartoon/caricature — documentaire éditorial, sérieux, intelligent
- Détails physiques tangibles UNIQUEMENT : objets, architecture, paysage, figures, lumière

## PHASE 3 : RYTHME VISUEL — ALTERNER LES ÉCHELLES

Trois niveaux obligatoires, cycle de 3-4 beats :
1. **MACRO** : vue aérienne, skyline, paysage, horizon, port entier — respiration
2. **MOYEN** : salle de marché, bureau, bâtiment, intérieur
3. **MICRO** : gros plan lingot, baril, écran, texture, détail matière

Règles strictes :
- JAMAIS 3 consécutifs à la même échelle
- Changement de segment = changement d'échelle OBLIGATOIRE
- Beats "impact" = MICRO ou MOYEN
- Beats "respiration" = MACRO + lumineux (horizon, lever soleil, vue dégagée)
- Après 2 intérieurs sombres → forcer extérieur lumineux

## PHASE 4 : CONTINUITÉ NARRATIVE — MÊMES CARACTÈRES

Si un caractère (homme aux cheveux argentés, femme en tailleur noir) apparaît en beat 5, tu dois :
- Le/la réutiliser visuellement aux moments clés (5, 15, 42, 67)
- Varier angle/perspective (profil vs dos, moyen vs micro)
- Maintenir traits distinctifs (même coiffure, même vêtement couleur, même posture)

Cela crée UNE CONTINUITÉ — le spectateur reconnaît le personnage, renforce l'arc narratif.

## PHASE 5 : IMAGES PAR SUJET — GRAMMAIRE ÉDITORIALE

**Pétrole/Énergie** : raffinerie au crépuscule (torches allumées, reflets), plateforme offshore silhouette, tanker en mer, pipeline en perspective, terminal portuaire
**Or/Métaux** : lingots empilés, lumière chaude (tungstène), coffre-fort partiellement ouvert, mine à ciel ouvert (tas de pierre), pièces en gros plan, poids/balance
**Indices/Marchés** : parquet vide vue aérienne, écrans (sans texte lisible), salle de marché déserte, baie de trading, tableau noir avec craie
**Banques centrales** : Eccles Building DC, BCE Francfort façade, colonnade néoclassique, salle de conférence vide, podium microphone
**Géopolitique** : porte-avions horizon, détroit maritime, ambassade, chancellerie, carte murale, table de négociation
**Crypto** : data center froid (néons bleus), serveurs en rangées, circuits imprimés macro, câbles réseau
**Macro/Économie** : port cargo (conteneurs multicolores), autoroute de nuit (timelapse), gratte-ciel en construction, usine, grue
**Respiration** : port au lever du soleil, mer calme horizon dégagé, skyline aube, champ/paysage, désert minéral

Règle clé : si un photographe documentaire ne peut pas le capturer dans le monde réel → NE LE PROPOSE PAS.

## PHASE 6 : OVERLAYS & RYTHME DATA

- Cible : ~35% beats avec overlay (chart, stat, causal_chain, comparison), ~65% image seule
- Le champ \`hint\` est une suggestion du code — valide, modifie ou supprime ("none")
- JAMAIS 2 overlays "chart" ou "chart_zone" consécutifs
- Beats avec overlay stat = image de fond SIMPLE (pas de scène complexe)
- Types : stat, chart, chart_zone, causal_chain, comparison, headline, text_card, heatmap, scenario_fork, gauge, ticker_strip

## PHASE 7 : TRANSITIONS & EFFETS

Transitions :
- Entre segments (segEnd→segStart) : cross_dissolve ou fade (cassure forte)
- Intra-segment : cut ou fade court (léger)

Effets image :
- ken_burns_in (zoom lent) : par défaut, donne mouvement
- ken_burns_out (dézoom) : révélations, ouverture perspective
- slow_pan_left / slow_pan_right : panoramas, ~20% beats
- static : UNIQUEMENT pauses/title cards courtes

## RÈGLE CRITIQUE : CHAQUE BEAT A UNE IMAGE

CHAQUE beat = \`imageDirection\` (nouveau) OU \`imageReuse: "same_as:beat_XXX"\` (angle/zoom/moment différent).

Aucun beat vide. En pratique : ~50-60 images uniques, ~40-50% réutilisées.

## OUTPUT

Retourne un JSON strict :
\`\`\`json
{
  "storyElements": {
    "characters": [
      { "role": "description", "physicalTraits": "cheveux X, costume Y, accessoires Z", "appearsIn": ["beat_005", "beat_042", ...] }
    ],
    "paradoxes": ["ironie 1", "ironie 2", ...],
    "visualMetaphors": ["métaphore 1", "métaphore 2", ...],
    "narrativeArc": "description courte de l'arc (calme→crise, etc.)"
  },
  "visualIdentity": {
    "colorTemperature": "warm" | "cool" | "neutral",
    "lightingRegister": "soft_natural" | "golden_hour" | "overcast" | "studio_warm",
    "photographicStyle": "WSJ hedcut — black ink crosshatching, cream paper, selective color accents (gold/orange/blue only), documentary editorial style, no text, 16:9 wide format",
    "forbiddenElements": ["identifiable_faces", "cartoon_style", "neon", "text_labels", "abstract_concepts", "bright_red", "modern_flat_design"]
  },
  "directions": [
    {
      "beatId": "beat_001",
      "imageDirection": "Scène narrative concrète : lieu + cadrage + lumière + échelle (macro/moyen/micro) + caractères le cas échéant",
      "imageReuse": null,
      "overlay": "stat" | "none" | "chart" | etc.,
      "overlayNotes": "optionnel",
      "imageEffect": "ken_burns_in",
      "transitionOut": "cut",
      "narrativeRole": "établir l'ironie de départ / renforcer le personnage / révéler la conséquence / etc."
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

## Beats à diriger (${beats.length} beats)

${JSON.stringify(compacted, null, 0)}

---

**Tu dois produire un JSON complet avec :**
1. **storyElements** — analyse narrative AVANT les directions beat-par-beat
   - Caractères du jour (traits physiques, apparitions)
   - 3-5 paradoxes/ironies clés
   - Métaphores visuelles récurrentes
   - Arc narratif global

2. **visualIdentity** — style hedcut WSJ + accents couleur sélectifs

3. **directions[]** — chaque beat avec imageDirection (narratif) OU imageReuse, overlay, effet, rôle narratif

RAPPEL CRITIQUE :
- Chaque beat a une image (pas de vides)
- Pas de noms/visages identifiables (traits physiques seulement)
- Échelles alternes (macro/moyen/micro)
- Continuité des personnages across beats
- Métaphores TANGIBLES (pas abstraites)`;

  return { system, user };
}
