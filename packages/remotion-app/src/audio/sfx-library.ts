/**
 * SFX Library — bruitages éditoriaux papier/encre.
 *
 * Fichiers WAV dans public/sfx/ (source: SoundJay, licence gratuite commercial OK).
 * Rotation déterministe via beatIndex pour éviter la répétition
 * tout en gardant un rendu reproductible.
 */

import { staticFile } from "remotion";

/** SFX par catégorie — chaque catégorie a plusieurs variantes */
const SFX_FILES = {
  /** Changement de section (segmentId change) */
  pageFlip: [
    "sfx/page-flip-01a.wav",
    "sfx/page-flip-02.wav",
    "sfx/page-flip-03.wav",
  ],
  /** soundEffect: 'swoosh' — transition douce entre beats */
  paperSlide: [
    "sfx/paper-rustle-1.wav",
    "sfx/paper-rustle-2.wav",
    "sfx/paper-rustle-3.wav",
  ],
  /** soundEffect: 'sting' — ponctuation éditoriale */
  sting: [
    "sfx/typewriter-key-1.wav",
    "sfx/typewriter-line-break-1.wav",
  ],
  /** Sting marqué (fin de section / révélation) */
  stingBell: [
    "sfx/typewriter-return-1.wav",
  ],
} as const;

export type SfxCategory = keyof typeof SFX_FILES;

/**
 * Sélectionne un fichier SFX avec rotation déterministe.
 * @param category - catégorie de son
 * @param index - index du beat (pour rotation)
 * @returns chemin staticFile prêt pour <Audio src={...} />
 */
export function getSfxPath(category: SfxCategory, index: number): string {
  const files = SFX_FILES[category];
  return staticFile(files[index % files.length]);
}

/**
 * Volume par catégorie (0-1).
 * Les page flips sont plus audibles, les paper slides très discrets.
 */
export const SFX_VOLUME: Record<SfxCategory, number> = {
  pageFlip: 0.35,
  paperSlide: 0.15,
  sting: 0.25,
  stingBell: 0.30,
};

export type SoundEffectTag = 'silence' | 'sting' | 'swoosh' | 'none';

/**
 * Mappe un tag soundEffect (du pipeline) vers une catégorie SFX.
 * Retourne null si pas de son à jouer.
 */
export function soundEffectToCategory(tag: SoundEffectTag | undefined): SfxCategory | null {
  switch (tag) {
    case 'sting': return 'sting';
    case 'swoosh': return 'paperSlide';
    case 'silence':
    case 'none':
    case undefined:
      return null;
  }
}
