/* Editorial backgrounds — placeholder photo-like SVGs that mimic the
   visual character of an Owl Street Journal episode background.
   These are 1920×1080, dark + cinematic, so cream overlays sit cleanly. */

const BG_TRADING_FLOOR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="g1" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#3a2a1a"/>
      <stop offset="50%" stop-color="#1a1410"/>
      <stop offset="100%" stop-color="#0a0806"/>
    </radialGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(192,57,43,0.3)"/>
      <stop offset="100%" stop-color="rgba(192,57,43,0)"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g1)"/>
  <!-- Light bokeh -->
  <g opacity="0.6">
    <circle cx="320" cy="260" r="80" fill="rgba(255,200,120,0.18)" filter="blur(40px)"/>
    <circle cx="1620" cy="180" r="120" fill="rgba(255,180,100,0.15)" filter="blur(50px)"/>
    <circle cx="1400" cy="820" r="100" fill="rgba(192,57,43,0.18)" filter="blur(45px)"/>
    <circle cx="600" cy="900" r="140" fill="rgba(180,140,80,0.12)" filter="blur(60px)"/>
  </g>
  <!-- Faint screen lines -->
  <g opacity="0.18" stroke="rgba(245,240,232,0.4)" stroke-width="1">
    <line x1="0" y1="280" x2="1920" y2="320"/>
    <line x1="0" y1="540" x2="1920" y2="560"/>
    <line x1="0" y1="780" x2="1920" y2="760"/>
  </g>
  <!-- Vignette -->
  <rect width="1920" height="1080" fill="url(#g2)" opacity="0.4"/>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.35)"/>
</svg>`)}`;

const BG_OIL_FIELD = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1810"/>
      <stop offset="60%" stop-color="#5a3220"/>
      <stop offset="100%" stop-color="#8b4a1a"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <!-- Sun -->
  <circle cx="1450" cy="520" r="120" fill="rgba(255,160,80,0.6)" filter="blur(20px)"/>
  <circle cx="1450" cy="520" r="60" fill="rgba(255,200,140,0.9)"/>
  <!-- Horizon land -->
  <rect x="0" y="700" width="1920" height="380" fill="#1a0e08"/>
  <!-- Oil derricks -->
  <g fill="#0a0604" stroke="#0a0604">
    <polygon points="200,700 240,540 280,700"/>
    <polygon points="180,700 200,540 220,700" opacity="0.7"/>
    <polygon points="500,700 520,580 540,700" opacity="0.5"/>
    <polygon points="1100,700 1140,510 1180,700"/>
    <polygon points="1700,700 1720,560 1740,700" opacity="0.6"/>
  </g>
  <!-- Ground haze -->
  <rect x="0" y="700" width="1920" height="100" fill="rgba(139,74,26,0.5)" filter="blur(30px)"/>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.4)"/>
</svg>`)}`;

const BG_FED = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0806"/>
      <stop offset="100%" stop-color="#1a1410"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <!-- Building columns silhouette -->
  <g fill="#2a2018">
    <rect x="200" y="200" width="1520" height="780"/>
  </g>
  <g fill="#1a1410">
    <rect x="280" y="280" width="60" height="700"/>
    <rect x="420" y="280" width="60" height="700"/>
    <rect x="560" y="280" width="60" height="700"/>
    <rect x="700" y="280" width="60" height="700"/>
    <rect x="840" y="280" width="60" height="700"/>
    <rect x="980" y="280" width="60" height="700"/>
    <rect x="1120" y="280" width="60" height="700"/>
    <rect x="1260" y="280" width="60" height="700"/>
    <rect x="1400" y="280" width="60" height="700"/>
    <rect x="1540" y="280" width="60" height="700"/>
  </g>
  <!-- Pediment -->
  <polygon points="200,200 960,80 1720,200" fill="#2a2018"/>
  <!-- Soft light from top -->
  <ellipse cx="960" cy="100" rx="700" ry="200" fill="rgba(255,220,180,0.12)" filter="blur(60px)"/>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.35)"/>
</svg>`)}`;

const BG_BULL_BEAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="split" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a2218"/>
      <stop offset="50%" stop-color="#0a0806"/>
      <stop offset="100%" stop-color="#220808"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#split)"/>
  <!-- Left chart line going up -->
  <g stroke="rgba(26,107,58,0.4)" stroke-width="3" fill="none">
    <path d="M 100 800 L 250 720 L 400 760 L 550 580 L 700 620 L 850 420"/>
    <path d="M 100 850 L 250 800 L 400 760 L 550 720 L 700 660 L 850 580" opacity="0.5"/>
  </g>
  <!-- Right chart line going down -->
  <g stroke="rgba(139,26,26,0.4)" stroke-width="3" fill="none">
    <path d="M 1070 420 L 1220 480 L 1370 460 L 1520 600 L 1670 640 L 1820 780"/>
    <path d="M 1070 500 L 1220 540 L 1370 580 L 1520 640 L 1670 720 L 1820 800" opacity="0.5"/>
  </g>
  <!-- Center divider light -->
  <rect x="955" y="0" width="10" height="1080" fill="rgba(245,240,232,0.06)" filter="blur(20px)"/>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.45)"/>
</svg>`)}`;

const BG_NEWSROOM = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="lamp" cx="30%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#5a3a1a"/>
      <stop offset="100%" stop-color="#0a0604"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#lamp)"/>
  <!-- Desk silhouette -->
  <rect x="0" y="780" width="1920" height="300" fill="#1a0e08"/>
  <!-- Newspaper stack -->
  <rect x="120" y="700" width="380" height="80" fill="#d4c8b0" transform="rotate(-2 310 740)"/>
  <rect x="140" y="690" width="380" height="80" fill="#c0b49a" transform="rotate(-1 330 730)"/>
  <!-- Lamp glow -->
  <ellipse cx="600" cy="400" rx="500" ry="250" fill="rgba(255,200,120,0.18)" filter="blur(80px)"/>
  <!-- Side window light -->
  <rect x="1500" y="100" width="320" height="500" fill="rgba(180,160,120,0.1)"/>
  <!-- Vertical blinds -->
  <g stroke="rgba(0,0,0,0.4)" stroke-width="3">
    <line x1="1530" y1="100" x2="1530" y2="600"/>
    <line x1="1580" y1="100" x2="1580" y2="600"/>
    <line x1="1630" y1="100" x2="1630" y2="600"/>
    <line x1="1680" y1="100" x2="1680" y2="600"/>
    <line x1="1730" y1="100" x2="1730" y2="600"/>
    <line x1="1780" y1="100" x2="1780" y2="600"/>
  </g>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.4)"/>
</svg>`)}`;

const BG_ABSTRACT_RED = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="r1" cx="70%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#8b1a1a"/>
      <stop offset="50%" stop-color="#3a0a0a"/>
      <stop offset="100%" stop-color="#0a0404"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#r1)"/>
  <!-- Blurry shapes -->
  <circle cx="500" cy="800" r="300" fill="rgba(192,57,43,0.3)" filter="blur(80px)"/>
  <circle cx="1500" cy="200" r="200" fill="rgba(255,180,140,0.15)" filter="blur(60px)"/>
  <!-- Diagonal beams -->
  <g opacity="0.15" stroke="rgba(245,240,232,0.6)" stroke-width="2">
    <line x1="0" y1="0" x2="1920" y2="1080"/>
    <line x1="200" y1="0" x2="2120" y2="1080"/>
    <line x1="-200" y1="0" x2="1720" y2="1080"/>
  </g>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.35)"/>
</svg>`)}`;

const BG_MARKET_CHART = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1a14"/>
      <stop offset="100%" stop-color="#050a08"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#cg)"/>
  <!-- Grid -->
  <g stroke="rgba(245,240,232,0.06)" stroke-width="1">
    <line x1="0" y1="200" x2="1920" y2="200"/>
    <line x1="0" y1="400" x2="1920" y2="400"/>
    <line x1="0" y1="600" x2="1920" y2="600"/>
    <line x1="0" y1="800" x2="1920" y2="800"/>
    <line x1="320" y1="0" x2="320" y2="1080"/>
    <line x1="640" y1="0" x2="640" y2="1080"/>
    <line x1="960" y1="0" x2="960" y2="1080"/>
    <line x1="1280" y1="0" x2="1280" y2="1080"/>
    <line x1="1600" y1="0" x2="1600" y2="1080"/>
  </g>
  <!-- Candlesticks -->
  <g>
    <rect x="200" y="500" width="20" height="120" fill="#1a6b3a"/>
    <line x1="210" y1="460" x2="210" y2="660" stroke="#1a6b3a" stroke-width="2"/>
    <rect x="280" y="460" width="20" height="100" fill="#1a6b3a"/>
    <line x1="290" y1="430" x2="290" y2="580" stroke="#1a6b3a" stroke-width="2"/>
    <rect x="360" y="480" width="20" height="80" fill="#8b1a1a"/>
    <line x1="370" y1="450" x2="370" y2="600" stroke="#8b1a1a" stroke-width="2"/>
    <rect x="440" y="420" width="20" height="140" fill="#1a6b3a"/>
    <line x1="450" y1="390" x2="450" y2="600" stroke="#1a6b3a" stroke-width="2"/>
    <rect x="520" y="500" width="20" height="60" fill="#8b1a1a"/>
    <line x1="530" y1="470" x2="530" y2="580" stroke="#8b1a1a" stroke-width="2"/>
    <rect x="600" y="540" width="20" height="120" fill="#8b1a1a"/>
    <line x1="610" y1="500" x2="610" y2="700" stroke="#8b1a1a" stroke-width="2"/>
    <rect x="680" y="600" width="20" height="100" fill="#8b1a1a"/>
    <line x1="690" y1="570" x2="690" y2="730" stroke="#8b1a1a" stroke-width="2"/>
    <rect x="760" y="580" width="20" height="80" fill="#1a6b3a"/>
    <line x1="770" y1="550" x2="770" y2="700" stroke="#1a6b3a" stroke-width="2"/>
  </g>
  <!-- Trend line -->
  <path d="M 0 600 Q 400 400, 800 580 T 1920 700" stroke="rgba(192,57,43,0.4)" stroke-width="3" fill="none"/>
  <rect width="1920" height="1080" fill="rgba(0,0,0,0.55)"/>
</svg>`)}`;

window.OSJ_BACKGROUNDS = {
  trading: BG_TRADING_FLOOR,
  oil: BG_OIL_FIELD,
  fed: BG_FED,
  bullbear: BG_BULL_BEAR,
  newsroom: BG_NEWSROOM,
  red: BG_ABSTRACT_RED,
  chart: BG_MARKET_CHART,
};
