# Handoff — Owl Street Journal Overlays

**Pour Claude Code dans le repo Owl Street.** Intégrer 10 nouveaux overlays comme variants des composants existants dans `packages/remotion-app/src/scenes/shared/`.

---

## TL;DR pour Claude Code

1. Lis chaque fichier `.jsx` dans `overlays/` de ce handoff. Ce sont des **prototypes JSX-vanilla** (utilisent `React.createElement` via Babel + globals `window.BRAND`, `window.interp`, etc.) qui doivent être convertis en composants Remotion TypeScript.
2. Pour chacun, crée un fichier `.tsx` dans `packages/remotion-app/src/scenes/shared/variants/<Name>.tsx`.
3. Ajoute un champ `variant` aux types existants pour permettre de switcher.
4. Ajoute un dispatcher dans `DataOverlay.tsx` qui choisit le variant.

---

## Conversion par composant — règles

| JSX-vanilla (prototype)                   | Remotion TS (cible)                                                  |
|-------------------------------------------|----------------------------------------------------------------------|
| `function X({ frame }) { ... }`           | `const X: React.FC<TheProps> = (props) => { const frame = useCurrentFrame(); ... }` |
| `interp(frame, [a,b], [from,to], easeOut)` | `interpolate(frame, [a,b], [from,to], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })` |
| `interp(...)` avec `easeOutBack`          | `easing: Easing.out(Easing.back(1.7))`                               |
| `interp(...)` avec `smooth` (default)     | `easing: Easing.bezier(0.42, 0, 0.58, 1)` — ou laisser par défaut    |
| `BRAND.colors.*` (depuis window)          | `import { BRAND } from '@yt-maker/core'`                             |
| Valeurs hardcodées (`const value = -2.84`)| **REMPLACER par les props** — le prototype hardcode des exemples, mais en prod on lit `props.value`, `props.label`, etc. |

---

## Mapping prototype → composant existant

Tous les overlays consomment **uniquement** des props qui existent déjà dans `packages/remotion-app/src/scenes/shared/<Component>.tsx`.

| Prototype JSX             | Composant cible        | Variant à ajouter au type        | Fichier source           |
|---------------------------|------------------------|----------------------------------|--------------------------|
| `StatStampPress`          | `AnimatedStat`         | `variant: 'stamp-press'`         | `overlays/stat.jsx`      |
| `BonusAvalanche`          | `AnimatedStat`         | `variant: 'avalanche'`           | `overlays/animation-forward.jsx` |
| `CausalDomino`            | `CausalChain`          | `variant: 'domino'`              | `overlays/causal.jsx`    |
| `GaugeStrip`              | `GaugeOverlay`         | `variant: 'strip'`               | `overlays/gauge-heatmap-multi.jsx` |
| `GaugeLiquid`             | `GaugeOverlay`         | `variant: 'liquid'`              | `overlays/animation-forward.jsx` |
| `HeatmapTreemap`          | `HeatmapGrid`          | `variant: 'treemap'`             | `overlays/animation-forward.jsx` |
| `MultiSparklines`         | `MultiAssetBadge`      | `variant: 'sparklines'`          | `overlays/gauge-heatmap-multi.jsx` |
| `MultiLaneRace`           | `MultiAssetBadge`      | `variant: 'lane-race'`           | `overlays/animation-forward.jsx` |
| `HeadlineTabloid`         | `HeadlineCard`         | `variant: 'tabloid'`             | `overlays/headline-scenario.jsx` |
| `ScenarioBattle`          | `ScenarioFork`         | `variant: 'battle'`              | `overlays/headline-scenario.jsx` |

---

## Étapes concrètes

### 1. Patch des types — `packages/core/src/types.ts`

Ajoute un champ optionnel `variant` à chaque type d'overlay :

```ts
export interface AnimatedStatProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accentColor?: string;
  variant?: 'default' | 'stamp-press' | 'avalanche'; // ← ADD
}

export interface CausalChainProps {
  steps: { label: string; sublabel?: string }[];
  accentColor?: string;
  variant?: 'default' | 'domino'; // ← ADD
}

export interface GaugeOverlayProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  accentColor?: string;
  variant?: 'default' | 'strip' | 'liquid'; // ← ADD
}

export interface HeatmapGridProps {
  sectors: { name: string; ticker?: string; change: number }[];
  title?: string;
  variant?: 'default' | 'treemap'; // ← ADD
}

export interface MultiAssetBadgeProps {
  assets: { symbol: string; name?: string; changePct: number; price?: number }[];
  title?: string;
  variant?: 'default' | 'sparklines' | 'lane-race'; // ← ADD
}

export interface HeadlineCardProps {
  title: string;
  source?: string;
  accentColor?: string;
  variant?: 'default' | 'tabloid'; // ← ADD
}

export interface ScenarioForkProps {
  trunk: string;
  bullish: { condition: string; target: string; prob?: number };
  bearish: { condition: string; target: string; prob?: number };
  variant?: 'default' | 'battle'; // ← ADD
}
```

### 2. Crée les variants — `packages/remotion-app/src/scenes/shared/variants/`

Pour chaque entrée du mapping :
- Crée `variants/<Name>.tsx`
- Lis le prototype JSX correspondant dans `overlays/`
- Convertis en suivant les règles du tableau du haut
- **Remplace les valeurs hardcodées par les props** (le prototype montre `value = -2.84` à titre d'exemple, le composant prod doit lire `props.value`)

### 3. Dispatcher — `packages/remotion-app/src/scenes/beat/DataOverlay.tsx`

Branche le `variant` :

```tsx
import { AnimatedStat } from '../shared/AnimatedStat';
import { StatStampPress } from '../shared/variants/StatStampPress';
import { NumberAvalanche } from '../shared/variants/NumberAvalanche';
// ... etc

function renderOverlay(overlay: OverlayDef) {
  switch (overlay.type) {
    case 'stat': {
      const v = overlay.props.variant ?? 'default';
      if (v === 'stamp-press')  return <StatStampPress {...overlay.props} />;
      if (v === 'avalanche')    return <NumberAvalanche {...overlay.props} />;
      return <AnimatedStat {...overlay.props} />;
    }
    case 'causal': {
      const v = overlay.props.variant ?? 'default';
      if (v === 'domino') return <CausalDomino {...overlay.props} />;
      return <CausalChain {...overlay.props} />;
    }
    // ... idem pour gauge, heatmap, multi, headline, scenario
  }
}
```

### 4. Usage dans un script d'épisode

```ts
{
  type: 'stat',
  props: {
    value: -2.84,
    label: 'Pétrole WTI sur la séance',
    suffix: '%',
    decimals: 2,
    variant: 'stamp-press', // ← sélectionne le nouveau visuel
  }
}
```

---

## Checklist Claude Code

- [ ] Patch des 7 interfaces dans `packages/core/src/types.ts` (ajout du champ `variant`)
- [ ] Re-export depuis `packages/core/src/index.ts` si nécessaire
- [ ] Crée 10 fichiers dans `packages/remotion-app/src/scenes/shared/variants/`
- [ ] Pour chaque variant : props strictement = `<ComponentName>Props`, **rien d'autre**
- [ ] Aucune valeur hardcodée dans les variants finaux (les hardcodes du prototype = exemples uniquement)
- [ ] Convertit `interp` → `interpolate` avec `extrapolateLeft/Right: 'clamp'`
- [ ] Convertit easings selon le tableau (smooth/easeOut/easeOutBack)
- [ ] Branche les variants dans `DataOverlay.tsx`
- [ ] Lance `tsc --noEmit` pour vérifier les types
- [ ] Test : un épisode existant avec `variant: 'default'` doit rendre exactement comme avant
- [ ] Test : remplace `variant: 'stamp-press'` sur une scène stat existante, vérifier le rendu Remotion

---

## Notes importantes

- **Les fichiers `overlays/*.jsx` sont des références visuelles**, pas du code prod. Ils utilisent Babel-in-browser, des globals `window.*`, et des valeurs hardcodées pour les démos. Il faut les **réécrire proprement** en TS Remotion, pas les copier.
- **Le fichier `Owl Street - Final Overlays.html`** montre le rendu attendu avec un fond crème à 30% d'opacité par-dessus l'image d'épisode. Cette carte papier crème **n'est PAS partie de l'overlay** — c'est juste un layer de présentation du prototype. Dans le pipeline Remotion réel, l'overlay est posé directement sur l'image d'épisode (pas de carte). Si tu veux conserver l'effet papier, c'est dans `BackgroundImage.tsx` ou dans une nouvelle couche qu'il faut le mettre, pas dans les variants.
- **Système de couleurs** : tout vient de `BRAND` (déjà importé depuis `@yt-maker/core`).
- **Fonts** : `Playfair Display`, `Source Serif 4`, `JetBrains Mono`, `Bebas Neue`. Si pas déjà chargées dans Remotion, vérifier `Root.tsx` ou `loadFont`.

---

## Fichiers de ce handoff

- `README.md` — ce fichier
- `Owl Street - Final Overlays.html` — la maquette finale (ouverture dans le navigateur)
- `deck-stage.js` — runtime du deck (pas à intégrer dans le repo)
- `overlays/brand.jsx` — tokens BRAND + helpers (`interp`, easings) à reproduire avec Remotion équivalents
- `overlays/stat.jsx` — `StatStampPress`
- `overlays/causal.jsx` — `CausalDomino`
- `overlays/gauge-heatmap-multi.jsx` — `GaugeStrip`, `MultiSparklines`
- `overlays/headline-scenario.jsx` — `HeadlineTabloid`, `ScenarioBattle`
- `overlays/animation-forward.jsx` — `GaugeLiquid`, `HeatmapTreemap`, `MultiLaneRace`, `BonusAvalanche`
- `overlays/backgrounds.jsx` — placeholders SVG pour démo (à ignorer, le pipeline a déjà ses vraies images)
