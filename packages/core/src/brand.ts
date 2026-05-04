/**
 * TradingRecap Design System — NYT Editorial / Ink on Paper
 *
 * Identité visuelle : encre sur papier journal de qualité.
 * Fond crème #f5f0e8 partout. Jamais de fond sombre dans les scènes.
 * Palette ultra-restreinte : 4 couleurs max par frame.
 */

export const BRAND = {
  name: "Owl Street Journal",
  tagline: "Les marchés décortiqués, chaque matin.",

  colors: {
    // ── Backgrounds ─────────────────────────────────
    cream:      '#f5f0e8',   // fond principal — JAMAIS changer
    creamDark:  '#ede7d9',   // fond légèrement plus sombre (cartes, hover)
    creamDeep:  '#e2d9c8',   // zones encadrées

    // ── Inks ────────────────────────────────────────
    ink:        '#1a1612',   // encre principale (titres, prix)
    inkMid:     '#3d342a',   // corps de texte
    inkLight:   '#7a6e62',   // annotations, labels secondaires
    inkFaint:   '#b8afa4',   // très légère (grid, règles)
    rule:       '#c8bfb0',   // lignes de séparation, borders

    // ── Accents (mood-driven, 1 par épisode) ────────
    accentDefault:  '#c0392b',  // rouge sang encre (tension géopolitique)
    accentBull:     '#1a6b3a',  // vert encre foncé (bullish)
    accentBear:     '#8b1a1a',  // rouge bordeaux (bearish)
    accentWarning:  '#8b6914',  // amber encre (incertitude)
    accentNeutral:  '#4a4a4a',  // encre grise (neutre)
    accentBlue:     '#1a3d6b',  // encre bleue marine (risk-off)

    // ── Chart-specific ───────────────────────────────
    chartLine:      '#1a1612',  // courbe de prix (encre noire)
    chartResist:    '#8b1a1a',  // résistances (rouge bordeaux tiretée)
    chartSupport:   '#1a4d2e',  // supports (vert encre foncé tiretée)
    chartAnnot:     '#8b6914',  // annotations (amber encre)
    chartVolume:    '#c8bfb0',  // volume (très légère)
    chartGrid:      '#e8e0d4',  // grille (quasi invisible)
    chartMA:        '#4a4a4a',  // moyennes mobiles (gris encre)

    // ── Compat aliases (pour migration progressive) ──
    background:     '#f5f0e8',
    backgroundLight:'#ede7d9',
    surface:        '#e2d9c8',
    surfaceLight:   '#ede7d9',
    primary:        '#c0392b',
    accent:         '#8b6914',
    profit:         '#1a6b3a',
    loss:           '#8b1a1a',
    neutral:        '#7a6e62',
    text:           '#1a1612',
    textMuted:      '#3d342a',
    textDim:        '#7a6e62',
    border:         '#c8bfb0',
  },

  fonts: {
    display:    "'Playfair Display', Georgia, 'Times New Roman', serif",
    body:       "'Source Serif 4', Georgia, 'Times New Roman', serif",
    mono:       "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    condensed:  "'Bebas Neue', 'Impact', sans-serif",  // chiffres forts
    // compat
    primary:    "'Playfair Display', Georgia, serif",
  },

  // ── Chart rendering constants ──────────────────────
  chart: {
    lineWidth:      2.5,    // épaisseur courbe de prix
    levelWidth:     1.5,    // épaisseur lignes S/R
    volumeRatio:    0.15,   // panel volume = 15% de la hauteur chart
    gridLines:      4,      // nombre de lignes de grille horizontales
    padH:           40,     // padding horizontal SVG
    padV:           20,     // padding vertical SVG
    candleBodyRatio: 0.6,   // largeur corps bougie / candleStep
    candleMinWidth: 2,      // largeur min corps bougie (px)
    rsiPanelRatio:  0.20,   // panel RSI = 20% de la hauteur chart
    rsiOverbought:  70,
    rsiOversold:    30,
    smaColors: { fast: '#8b6914', medium: '#4a4a4a', slow: '#1a3d6b' },
  },

  // ── Animation timings ─────────────────────────────
  anim: {
    inkDrawFrames:  45,   // frames pour tracer la courbe (1.5s @ 30fps)
    levelDrawFrames:18,   // frames pour tracer une ligne S/R (0.6s)
    labelDelayFrames: 8,  // frames de délai après la ligne
    fadeInFrames:   15,   // fade standard
    springStiffness: 220,
    springDamping:   14,
  },

  // ── Layout constants ──────────────────────────────
  layout: {
    safeH:         96,    // safe zone horizontale (sous-titres)
    safeV:         54,    // safe zone verticale
    disclaimerH:   36,    // hauteur bandeau compliance en bas
    tickerH:       44,    // hauteur ticker asset au-dessus du disclaimer
    grainOpacity:  0.055, // texture grain papier (toutes les scènes)
    headerH:       110,   // hauteur header scène
  },

  // ── Mood → accent color mapping ──────────────────
  moodAccent: {
    tension_geopolitique: '#c0392b',
    risk_off_calme:       '#1a3d6b',
    bullish_momentum:     '#1a6b3a',
    neutre_analytique:    '#4a4a4a',
    incertitude:          '#8b6914',
  } as Record<string, string>,

  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },

  borderRadius: {
    sm: 6, md: 10, lg: 16, xl: 24,
  },

  // legacy shadows (keep for compat)
  shadows: {
    card:     '0 2px 8px rgba(26,22,18,0.12)',
    glow:     '0 0 20px rgba(192,57,43,0.2)',
    goldGlow: '0 0 20px rgba(139,105,20,0.25)',
  },
} as const;

export type BrandColors = typeof BRAND.colors;
export type MoodAccent = keyof typeof BRAND.moodAccent;
