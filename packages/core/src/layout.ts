import type { AspectMode } from "./types";

export interface DashboardLayout {
  mode: AspectMode;
  padding: { top: number; right: number; bottom: number; left: number };
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
    tiny: number;
    price: number;
    change: number;
    sectionTitle: number;
    narration: number;
    cta: number;
  };
  grid: {
    columns: number;
    gap: number;
    cardWidth: number;
    cardHeight: number;
  };
  chart: {
    width: number;
    height: number;
    candleWidth: number;
    candleGap: number;
  };
  header: {
    height: number;
    logoSize: number;
  };
  footer: {
    height: number;
  };
}

export function computeLayout(width: number, height: number): DashboardLayout {
  const isPortrait = height > width;
  const mode: AspectMode = isPortrait ? "portrait" : "landscape";

  if (isPortrait) {
    const scale = width / 1080;
    return {
      mode,
      padding: {
        top: Math.round(80 * scale),
        right: Math.round(40 * scale),
        bottom: Math.round(80 * scale),
        left: Math.round(40 * scale),
      },
      fontSize: {
        title: Math.round(48 * scale),
        subtitle: Math.round(28 * scale),
        body: Math.round(22 * scale),
        small: Math.round(16 * scale),
        tiny: Math.round(12 * scale),
        price: Math.round(32 * scale),
        change: Math.round(20 * scale),
        sectionTitle: Math.round(36 * scale),
        narration: Math.round(24 * scale),
        cta: Math.round(28 * scale),
      },
      grid: {
        columns: 2,
        gap: Math.round(12 * scale),
        cardWidth: Math.round(480 * scale),
        cardHeight: Math.round(160 * scale),
      },
      chart: {
        width: Math.round(1000 * scale),
        height: Math.round(800 * scale),
        candleWidth: Math.round(6 * scale),
        candleGap: Math.round(2 * scale),
      },
      header: {
        height: Math.round(70 * scale),
        logoSize: Math.round(40 * scale),
      },
      footer: {
        height: Math.round(60 * scale),
      },
    };
  }

  // Landscape (16:9 — 1920x1080) — primary YouTube format
  const scale = width / 1920;
  return {
    mode,
    padding: {
      top: Math.round(60 * scale),
      right: Math.round(60 * scale),
      bottom: Math.round(60 * scale),
      left: Math.round(60 * scale),
    },
    fontSize: {
      title: Math.round(64 * scale),
      subtitle: Math.round(32 * scale),
      body: Math.round(24 * scale),
      small: Math.round(18 * scale),
      tiny: Math.round(14 * scale),
      price: Math.round(36 * scale),
      change: Math.round(22 * scale),
      sectionTitle: Math.round(42 * scale),
      narration: Math.round(28 * scale),
      cta: Math.round(36 * scale),
    },
    grid: {
      columns: 4,
      gap: Math.round(16 * scale),
      cardWidth: Math.round(420 * scale),
      cardHeight: Math.round(180 * scale),
    },
    chart: {
      width: Math.round(1600 * scale),
      height: Math.round(700 * scale),
      candleWidth: Math.round(8 * scale),
      candleGap: Math.round(3 * scale),
    },
    header: {
      height: Math.round(80 * scale),
      logoSize: Math.round(48 * scale),
    },
    footer: {
      height: Math.round(60 * scale),
    },
  };
}
