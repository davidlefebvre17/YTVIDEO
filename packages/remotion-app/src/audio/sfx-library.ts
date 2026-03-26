/**
 * SFX Library — bruitages éditoriaux papier/encre/typewriter.
 *
 * Style WSJ hedcut : chaque son renforce l'univers physique
 * du journal imprimé (papier, encre, machine à écrire, presse).
 *
 * Fichiers dans public/sfx/.
 * Rotation déterministe via beatIndex pour éviter la répétition
 * tout en gardant un rendu reproductible.
 */

import { staticFile } from "remotion";

/** SFX par catégorie — chaque catégorie a plusieurs variantes */
const SFX_FILES = {
  // ─── Transitions entre segments ──────────────────────────

  /** Changement de section (auto: segmentId change) */
  pageFlip: [
    "sfx/page-flip-01a.wav",
    "sfx/page-flip-02.wav",
    "sfx/page-flip-03.wav",
  ],
  /** soundEffect: 'swoosh' — transition douce, continuité thématique */
  paperSlide: [
    "sfx/paper-rustle-1.wav",
    "sfx/paper-rustle-2.wav",
    "sfx/paper-rustle-3.wav",
    "sfx/paper-slide.mp3",
    "sfx/paper-throw.mp3",
  ],
  /** soundEffect: 'typing' — séquence de frappe (cold_open, thread) */
  typing: [
    "sfx/typewriter-typing-short.wav",
    "sfx/typewriter-typing-medium.wav",
    "sfx/typewriter-typing-long.wav",
  ],

  // ─── Ponctuations éditoriales ────────────────────────────

  /** soundEffect: 'sting' — touche de typewriter, rupture thématique */
  sting: [
    "sfx/typewriter-key-1.wav",
    "sfx/typewriter-line-break-1.wav",
    "sfx/letterpress-stamp.mp3",
  ],
  /** soundEffect: 'bell' — retour chariot / cloche, fin de segment DEEP */
  stingBell: [
    "sfx/typewriter-return-1.wav",
    "sfx/bell-ding.mp3",
  ],
  /** soundEffect: 'stamp' — tampon/letterpress, chiffre clé qui apparaît */
  stamp: [
    "sfx/rubber-stamp.mp3",
    "sfx/rubber-stamp-2.mp3",
    "sfx/wooden-thump.mp3",
    "sfx/large-thump.mp3",
  ],

  // ─── Sons contextuels ────────────────────────────────────

  /** soundEffect: 'pen' — plume qui écrit, chart qui se dessine */
  pen: [
    "sfx/pen-writing.mp3",
  ],
  /** soundEffect: 'ticker' — ticker tape mécanique */
  ticker: [
    "sfx/newspaper-ticker.mp3",
    "sfx/typewriter.mp3",
  ],
  /** soundEffect: 'clock' — tic d'horloge, suspense */
  clock: [
    "sfx/clock-tick.mp3",
  ],

  // ─── Ouverture / Fermeture ───────────────────────────────

  /** soundEffect: 'unfold' — ouverture journal, début d'épisode */
  unfold: [
    "sfx/paper-flip.mp3",
    "sfx/paper-rip.mp3",
    "sfx/page-turn.mp3",
  ],
  /** soundEffect: 'close' — fermeture portfolio, fin d'épisode */
  close: [
    "sfx/book-close.mp3",
    "sfx/book-close-2.mp3",
  ],
  /** soundEffect: 'cabinet' — tiroir classeur, callback historique */
  cabinet: [
    "sfx/drawer-close.mp3",
    "sfx/close-door.mp3",
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
 * Calibré pour être subtil sous la narration (12-18dB en dessous).
 */
export const SFX_VOLUME: Record<SfxCategory, number> = {
  // Transitions
  pageFlip: 0.35,
  paperSlide: 0.15,
  typing: 0.20,
  // Ponctuations
  sting: 0.25,
  stingBell: 0.30,
  stamp: 0.30,
  // Contextuels
  pen: 0.12,
  ticker: 0.10,
  clock: 0.25,
  // Ouverture/Fermeture
  unfold: 0.35,
  close: 0.35,
  cabinet: 0.20,
};

/**
 * Tags soundEffect utilisables dans le pipeline (C5 direction).
 */
export type SoundEffectTag =
  | 'silence' | 'none'
  // Transitions
  | 'swoosh' | 'typing'
  // Ponctuations
  | 'sting' | 'bell' | 'stamp'
  // Contextuels
  | 'pen' | 'ticker' | 'clock'
  // Ouverture/Fermeture
  | 'unfold' | 'close' | 'cabinet';

/**
 * Mappe un tag soundEffect (du pipeline) vers une catégorie SFX.
 * Retourne null si pas de son à jouer.
 */
export function soundEffectToCategory(tag: SoundEffectTag | undefined): SfxCategory | null {
  switch (tag) {
    // Transitions
    case 'swoosh': return 'paperSlide';
    case 'typing': return 'typing';
    // Ponctuations
    case 'sting': return 'sting';
    case 'bell': return 'stingBell';
    case 'stamp': return 'stamp';
    // Contextuels
    case 'pen': return 'pen';
    case 'ticker': return 'ticker';
    case 'clock': return 'clock';
    // Ouverture/Fermeture
    case 'unfold': return 'unfold';
    case 'close': return 'close';
    case 'cabinet': return 'cabinet';
    // Silence
    case 'silence':
    case 'none':
    case undefined:
      return null;
  }
}
