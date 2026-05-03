/* Owl Street Journal — design tokens (mirror of packages/core/src/brand.ts) */
const BRAND = {
  colors: {
    cream:      '#f5f0e8',
    creamDark:  '#ede7d9',
    creamDeep:  '#e2d9c8',
    ink:        '#1a1612',
    inkMid:     '#3d342a',
    inkLight:   '#7a6e62',
    inkFaint:   '#b8afa4',
    rule:       '#c8bfb0',
    accentDefault: '#c0392b',
    accentBull:    '#1a6b3a',
    accentBear:    '#8b1a1a',
    accentWarning: '#8b6914',
    accentNeutral: '#4a4a4a',
    accentBlue:    '#1a3d6b',
  },
  fonts: {
    display:   "'Playfair Display', Georgia, 'Times New Roman', serif",
    body:      "'Source Serif 4', Georgia, 'Times New Roman', serif",
    mono:      "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    condensed: "'Bebas Neue', 'Impact', sans-serif",
  },
};

/* Easing helpers — written so we don't need Remotion */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  t = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const interp = (frame, [a, b], [from, to], ease = smooth) => {
  if (frame <= a) return from;
  if (frame >= b) return to;
  const t = ease((frame - a) / (b - a));
  return from + (to - from) * t;
};

/* Stage: 1920×1080 surface that scales to its parent */
function Stage({ children, frame, label }) {
  return (
    <div className="stage" data-screen-label={label}>
      <div className="stage-grain" />
      <div className="stage-inner">{children}</div>
      <div className="stage-chrome">
        <span className="chrome-left">OWL STREET JOURNAL · OVERLAY EXPLORATION</span>
        <span className="chrome-right">{label} · F{String(frame).padStart(3, '0')}</span>
      </div>
    </div>
  );
}

/* Animation loop — drives `frame` (0..240) for every overlay */
function useFrame(loopLength = 240) {
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    let raf, t0 = performance.now();
    const tick = (t) => {
      const f = ((t - t0) / (1000 / 30)) % loopLength; // 30 fps
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loopLength]);
  return frame;
}

/* Grain SVG inline data-uri (paper texture) */
const GRAIN_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>`
  );

window.BRAND = BRAND;
window.clamp = clamp;
window.lerp = lerp;
window.smooth = smooth;
window.easeOut = easeOut;
window.easeOutBack = easeOutBack;
window.interp = interp;
window.Stage = Stage;
window.useFrame = useFrame;
window.GRAIN_URL = GRAIN_URL;
