export const BRAND = {
  name: "TradingRecap",
  tagline: "Your daily market intelligence",
  colors: {
    primary: "#00b4d8",        // Cyan blue
    accent: "#ffd60a",         // Gold accent
    gradient: "linear-gradient(135deg, #00b4d8, #0077b6)",
    background: "#0b0f1a",     // Deep dark blue
    backgroundLight: "#151b2e",
    surface: "#1a2138",
    surfaceLight: "#222b45",
    profit: "#00cc70",         // Green
    loss: "#ff4757",           // Red
    neutral: "#a0aec0",        // Gray
    text: "#ffffff",
    textMuted: "#ffffff80",
    textDim: "#ffffff40",
    border: "#ffffff15",
    // Section accent colors
    intro: "#00b4d8",
    overview: "#0077b6",
    deepDive: "#ffd60a",
    news: "#ff6b35",
    predictions: "#7b2ff7",
    outro: "#00cc70",
  },
  fonts: {
    primary: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    display: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    card: "0 10px 30px rgba(0, 0, 0, 0.35)",
    glow: "0 0 20px rgba(0, 180, 216, 0.3)",
    goldGlow: "0 0 20px rgba(255, 214, 10, 0.3)",
  },
} as const;

export type BrandColors = typeof BRAND.colors;
