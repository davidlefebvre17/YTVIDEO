/* ===================================================================
   ANIMATION-FORWARD VARIATIONS — chaque overlay poussé sur le motion
   Techniques : SVG masking, particules, morphing, choreographies, 
   physique simple, transitions de scène, ink splatter, glitch éditorial.
   =================================================================== */

const { BRAND, interp, clamp, smooth, easeOut, easeOutBack } = window;

const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeBounce = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/* =================== 1. STAT — Ink Splatter Reveal ===================
   Le chiffre est révélé par une éclaboussure d'encre qui se propage,
   les chiffres défilent en compteur "slot machine", puis se figent.
   ===================================================================== */
function StatInkSplatter({ frame }) {
  // Compteur slot machine
  const target = 2.84;
  const counter = interp(frame, [0, 30], [0, target * 1.4], easeOut);
  const settled = interp(frame, [30, 50], [0, 1], easeOutBack);
  const final = counter * (1 - settled) + target * settled;

  // Splatter — 12 gouttes
  const splatterRadius = interp(frame, [0, 50], [0, 1], easeOut);
  const drops = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2 + Math.sin(i * 7) * 0.3;
    const dist = 280 + Math.sin(i * 13) * 180;
    const size = 8 + Math.abs(Math.sin(i * 17)) * 32;
    return {
      cx: 960 + Math.cos(angle) * dist * splatterRadius,
      cy: 400 + Math.sin(angle) * dist * splatterRadius,
      r: size * splatterRadius,
    };
  });

  return (
    <div style={{ position: 'relative', width: 1700, height: 800 }}>
      {/* SVG splatter background */}
      <svg width="100%" height="100%" viewBox="0 0 1700 800"
        style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="inkBlot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BRAND.colors.accentBear} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={BRAND.colors.accentBear} stopOpacity="0"/>
          </radialGradient>
        </defs>
        {/* Main blot */}
        <circle cx="850" cy="400"
          r={interp(frame, [0, 30], [0, 320], easeOutBack)}
          fill={BRAND.colors.accentBear} opacity={0.92} />
        {/* Splatter drops */}
        {drops.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
            fill={BRAND.colors.accentBear}
            opacity={interp(frame, [10 + i, 30 + i], [0, 0.85])} />
        ))}
        {/* Ink trails (lines) */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const len = interp(frame, [10, 40], [0, 460], easeOut);
          return (
            <line key={i}
              x1={850} y1={400}
              x2={850 + Math.cos(a) * len}
              y2={400 + Math.sin(a) * len}
              stroke={BRAND.colors.accentBear}
              strokeWidth={3 + Math.sin(i * 3) * 2}
              opacity={0.5} strokeLinecap="round" />
          );
        })}
      </svg>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: '0.3em',
          color: BRAND.colors.cream, opacity: interp(frame, [20, 36], [0, 1]),
          background: BRAND.colors.ink, padding: '8px 24px',
          transform: `translateY(${interp(frame, [20, 36], [-30, 0], easeOut)}px)`,
        }}>WTI  ·  CLÔTURE  ·  ALERTE ROUGE</div>

        <div style={{
          fontFamily: BRAND.fonts.condensed,
          fontSize: 380, lineHeight: 0.85,
          color: BRAND.colors.cream,
          letterSpacing: '-0.04em',
          textShadow: `4px 4px 0 ${BRAND.colors.ink}`,
          opacity: interp(frame, [15, 30], [0, 1]),
        }}>−{final.toFixed(2)}%</div>

        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic',
          fontSize: 36, color: BRAND.colors.cream,
          opacity: interp(frame, [55, 75], [0, 1]),
          transform: `translateY(${interp(frame, [55, 75], [20, 0], easeOut)}px)`,
        }}>la chute la plus brutale depuis octobre.</div>
      </div>
    </div>
  );
}

/* =================== 2. CAUSAL — Domino Physics Drop ===================
   Les blocs tombent les uns après les autres comme de vrais dominos
   avec une rotation physique réaliste, un rebond final, et un impact.
   ===================================================================== */
function CausalPhysics({ frame }) {
  const STEPS = [
    { t: 'FED',  l: 'maintient',     s: '18:00' },
    { t: 'DXY',  l: '+0,8%',         s: 'dollar' },
    { t: 'XAU',  l: '−1,4%',         s: 'l\'or recule' },
    { t: 'BTC',  l: '−2,1%',         s: 'sous pression' },
    { t: 'SPX',  l: '−0,6%',         s: 'la séance' },
  ];

  return (
    <div style={{ width: 1700, height: 800, position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 30, left: 40,
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 12], [0, 1]),
      }}>L'EFFET DOMINO  ·  EN TEMPS RÉEL</div>

      <div style={{
        position: 'absolute', top: 80, left: 40,
        fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
        fontSize: 80, color: BRAND.colors.ink,
        opacity: interp(frame, [4, 22], [0, 1]),
        transform: `translateX(${interp(frame, [4, 22], [-30, 0], easeOut)}px)`,
      }}>Et tout s'enchaîne.</div>

      {/* "ground" line */}
      <div style={{
        position: 'absolute', left: 60, right: 60, bottom: 180,
        height: 3, background: BRAND.colors.ink,
        transform: `scaleX(${interp(frame, [10, 30], [0, 1], easeOut)})`,
        transformOrigin: 'left',
      }} />

      {/* dominos */}
      {STEPS.map((s, i) => {
        const start = 30 + i * 14;
        // tilt: 0deg at start, falls to 90 at end of fall
        let rot = 0;
        const fallStart = start;
        const fallEnd = start + 16;
        const restEnd = fallEnd + 200; // stays down after
        if (frame >= fallStart) {
          const fp = clamp((frame - fallStart) / (fallEnd - fallStart), 0, 1);
          // ease with bounce at impact
          rot = fp < 0.85
            ? 90 * easeOut(fp / 0.85)
            : 90 - Math.sin((fp - 0.85) / 0.15 * Math.PI) * 8;
        }
        const op = interp(frame, [fallStart - 6, fallStart], [0, 1]);
        const x = 100 + i * 300;
        const isLast = i === STEPS.length - 1;
        const finalGlow = isLast
          ? interp(frame, [fallEnd, fallEnd + 12], [0, 1])
          : 0;

        return (
          <div key={i} style={{
            position: 'absolute', left: x, bottom: 180,
            width: 200, height: 360,
            transformOrigin: 'bottom right',
            transform: `rotate(${rot}deg)`,
            opacity: op,
          }}>
            <div style={{
              width: '100%', height: '100%',
              background: BRAND.colors.cream,
              border: `3px solid ${BRAND.colors.ink}`,
              boxShadow: `8px 8px 0 ${BRAND.colors.ink}, 0 0 ${finalGlow * 60}px ${BRAND.colors.accentBear}`,
              padding: '24px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
              alignItems: 'center', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: '0.2em',
                color: BRAND.colors.inkLight,
              }}>0{i + 1}</div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 64,
                color: isLast ? BRAND.colors.accentBear : BRAND.colors.ink,
                lineHeight: 0.95,
              }}>{s.t}</div>
              <div style={{
                width: 60, height: 1, background: BRAND.colors.rule, margin: '4px 0',
              }} />
              <div style={{
                fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
                fontSize: 28, color: BRAND.colors.ink, lineHeight: 1.1,
              }}>{s.l}</div>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.18em',
                color: BRAND.colors.inkLight, marginTop: 'auto',
              }}>{s.s}</div>
            </div>
          </div>
        );
      })}

      {/* Impact dust on last */}
      {frame > 30 + (STEPS.length - 1) * 14 + 14 && (
        <div style={{
          position: 'absolute', right: 100, bottom: 180,
          opacity: interp(frame, [
            30 + (STEPS.length - 1) * 14 + 14,
            30 + (STEPS.length - 1) * 14 + 30,
          ], [1, 0]),
          fontFamily: BRAND.fonts.condensed, fontSize: 80,
          color: BRAND.colors.accentBear,
          transform: 'translate(50%, -100%)',
        }}>BOUM</div>
      )}
    </div>
  );
}

/* =================== 3. GAUGE — Liquid Fill Manometer ===================
   Le chiffre se "remplit" comme un tube de mercure / encre liquide,
   avec une vague animée à la surface, puis verdict tampone.
   ===================================================================== */
function GaugeLiquid({ frame }) {
  const target = 78;
  const fill = interp(frame, [10, 70], [0, target / 100], easeOut);
  const counter = interp(frame, [10, 70], [0, target], easeOut);
  // wave amplitude
  const wavePhase = frame * 0.18;

  const tubeW = 240, tubeH = 700;
  const liquidH = tubeH * fill;
  const waveAmp = 12;

  // build wave path
  const wavePoints = [];
  for (let x = 0; x <= tubeW; x += 8) {
    const y = tubeH - liquidH + Math.sin(wavePhase + x * 0.04) * waveAmp;
    wavePoints.push(`${x},${y}`);
  }
  const wavePath = `M 0,${tubeH} L 0,${tubeH - liquidH} L ${wavePoints.join(' L ')} L ${tubeW},${tubeH} Z`;

  return (
    <div style={{
      width: 1500, height: 800, display: 'flex',
      alignItems: 'center', gap: 80,
    }}>
      {/* Tube */}
      <div style={{ position: 'relative' }}>
        <svg width={tubeW + 80} height={tubeH + 60} viewBox={`0 0 ${tubeW + 80} ${tubeH + 60}`}>
          {/* Tick marks on right */}
          {[0, 25, 50, 75, 100].map((v, i) => {
            const y = tubeH - (v / 100) * tubeH;
            return (
              <g key={i} opacity={interp(frame, [i * 2, 12 + i * 2], [0, 1])}>
                <line x1={tubeW + 4} y1={y} x2={tubeW + 24} y2={y}
                  stroke={BRAND.colors.ink} strokeWidth={2} />
                <text x={tubeW + 30} y={y + 5}
                  fontFamily={BRAND.fonts.mono} fontSize={16}
                  letterSpacing="0.1em" fill={BRAND.colors.ink}>{v}</text>
              </g>
            );
          })}
          {/* Tube outline */}
          <rect x={0} y={0} width={tubeW} height={tubeH}
            fill={BRAND.colors.creamDark}
            stroke={BRAND.colors.ink} strokeWidth={3} />
          {/* Liquid */}
          <path d={wavePath} fill={BRAND.colors.accentBull} />
          {/* Bubbles */}
          {Array.from({ length: 8 }, (_, i) => {
            const phase = ((frame - i * 12) % 90) / 90;
            if (phase < 0 || phase > 1) return null;
            const y = tubeH - phase * liquidH;
            if (y > tubeH) return null;
            return (
              <circle key={i}
                cx={30 + (i * 31) % (tubeW - 60)}
                cy={y}
                r={3 + Math.sin(i) * 2}
                fill={BRAND.colors.cream}
                opacity={1 - phase} />
            );
          })}
          {/* Bottom band */}
          <rect x={0} y={tubeH} width={tubeW} height={20}
            fill={BRAND.colors.ink} />
        </svg>
      </div>

      {/* Right side info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
          color: BRAND.colors.inkLight,
          opacity: interp(frame, [0, 12], [0, 1]),
        }}>FEAR &amp; GREED  ·  S&amp;P 500</div>

        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 100, color: BRAND.colors.ink, lineHeight: 1,
          opacity: interp(frame, [4, 22], [0, 1]),
          transform: `translateY(${interp(frame, [4, 22], [-20, 0], easeOut)}px)`,
        }}>Le mercure<br/>monte.</div>

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 16,
          opacity: interp(frame, [50, 70], [0, 1]),
        }}>
          <div style={{
            fontFamily: BRAND.fonts.condensed, fontSize: 280,
            color: BRAND.colors.accentBull, lineHeight: 0.9,
            transform: `scale(${interp(frame, [60, 76], [1.3, 1], easeOutBack)})`,
            transformOrigin: 'left bottom',
          }}>{Math.round(counter)}</div>
          <div style={{
            fontFamily: BRAND.fonts.condensed, fontSize: 80,
            color: BRAND.colors.inkLight, lineHeight: 1,
          }}>/ 100</div>
        </div>

        <div style={{
          fontFamily: BRAND.fonts.body, fontStyle: 'italic', fontSize: 28,
          color: BRAND.colors.inkMid, lineHeight: 1.5, maxWidth: 700,
          borderLeft: `3px solid ${BRAND.colors.accentBull}`, paddingLeft: 16,
          opacity: interp(frame, [80, 100], [0, 1]),
        }}>Avidité — territoire qu'on n'avait pas vu depuis février. Attention au seuil des 80.</div>
      </div>
    </div>
  );
}

/* =================== 4. HEATMAP — Treemap Morph ===================
   Cellules qui apparaissent + croissent à leur taille (proportionnelle 
   au volume), puis pulsent, puis se réorganisent par tri.
   ===================================================================== */
function HeatmapTreemap({ frame }) {
  const sectors = [
    { name: 'Tech',     w: 32, h: 60, change: 2.4 },
    { name: 'Finance',  w: 22, h: 60, change: 1.8 },
    { name: 'Conso.',   w: 18, h: 30, change: 0.9 },
    { name: 'Indust.',  w: 12, h: 30, change: 0.4 },
    { name: 'Énergie',  w: 16, h: 40, change: -1.6 },
    { name: 'Santé',    w: 14, h: 30, change: -0.3 },
    { name: 'Util.',    w: 8,  h: 20, change: -0.7 },
    { name: 'Mat.',     w: 8,  h: 20, change: -2.8 },
  ];
  const colorFor = (c) =>
    c >= 1.5 ? BRAND.colors.accentBull
    : c >= 0 ? '#3d7a4f'
    : c >= -1 ? '#8b4a1a'
    : BRAND.colors.accentBear;

  return (
    <div style={{ width: 1600, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        opacity: interp(frame, [0, 12], [0, 1]),
        borderBottom: `2px solid ${BRAND.colors.ink}`, paddingBottom: 12,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 64, color: BRAND.colors.ink,
        }}>Le marché en surface.</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.22em',
          color: BRAND.colors.inkLight,
        }}>S&amp;P 500  ·  TAILLE = POIDS  ·  COULEUR = VAR.</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '32fr 22fr 18fr 12fr',
        gridTemplateRows: '60fr 30fr 30fr',
        gap: 6, height: 600,
        gridTemplateAreas: `
          "tech   fin    cons   indu"
          "tech   fin    enrg   sante"
          "enrg2  enrg2  util   mat"
        `,
      }}>
        {[
          { area: 'tech',  s: sectors[0] },
          { area: 'fin',   s: sectors[1] },
          { area: 'cons',  s: sectors[2] },
          { area: 'indu',  s: sectors[3] },
          { area: 'enrg',  s: sectors[4] },
          { area: 'sante', s: sectors[5] },
          { area: 'util',  s: sectors[6] },
          { area: 'mat',   s: sectors[7] },
        ].map((c, i) => {
          const start = 14 + i * 5;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const scale = interp(frame, [start, start + 18], [0.4, 1], easeOutBack);
          const fillProg = interp(frame, [start + 8, start + 26], [0, 1], easeOut);
          const pulse = 1 + Math.sin((frame - start) * 0.15) * 0.02 * interp(frame, [start + 30, start + 60], [0, 1]);
          const counter = interp(frame, [start + 6, start + 26], [0, c.s.change], easeOut);
          const color = colorFor(c.s.change);
          return (
            <div key={i} style={{
              gridArea: c.area,
              opacity: op,
              transform: `scale(${scale * pulse})`,
              transformOrigin: 'center',
              background: BRAND.colors.cream,
              border: `2px solid ${BRAND.colors.ink}`,
              position: 'relative', overflow: 'hidden',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: color,
                opacity: fillProg * Math.min(1, Math.abs(c.s.change) / 3) * 0.85,
                clipPath: `inset(${100 - fillProg * 100}% 0 0 0)`,
                transition: 'clip-path 0.05s linear',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
                  fontSize: c.s.w >= 22 ? 36 : 24,
                  color: fillProg > 0.4 ? BRAND.colors.cream : BRAND.colors.ink,
                  lineHeight: 1,
                }}>{c.s.name}</div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  fontFamily: BRAND.fonts.condensed,
                  fontSize: c.s.w >= 22 ? 88 : c.s.w >= 14 ? 56 : 36,
                  color: fillProg > 0.4 ? BRAND.colors.cream : color,
                  lineHeight: 0.9,
                }}>
                  {counter >= 0 ? '+' : ''}{counter.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =================== 5. MULTI-ASSET — Lane Race ===================
   Course de chevaux : 6 actifs partent du même point, 
   trace de cendre laissée derrière, podium final.
   ===================================================================== */
function MultiLaneRace({ frame }) {
  const assets = [
    { sym: 'NDX', name: 'Nasdaq',    pct:  1.82 },
    { sym: 'SPX', name: 'S&P 500',   pct:  1.14 },
    { sym: 'CAC', name: 'CAC 40',    pct:  0.62 },
    { sym: 'GLD', name: 'Or',        pct: -0.74 },
    { sym: 'BTC', name: 'Bitcoin',   pct: -2.10 },
    { sym: 'WTI', name: 'Pétrole',   pct: -2.84 },
  ];
  const maxAbs = 3;

  return (
    <div style={{ width: 1700, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        opacity: interp(frame, [0, 12], [0, 1]),
        borderBottom: `2px solid ${BRAND.colors.ink}`, paddingBottom: 14,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 60, color: BRAND.colors.ink,
        }}>La course du jour.</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.2em',
          color: BRAND.colors.inkLight,
        }}>09:00 → 17:30  ·  6 LIGNES  ·  AXE 0%</span>
      </div>

      {/* center axis */}
      <div style={{ position: 'relative', height: 540 }}>
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2,
          background: BRAND.colors.ink,
          opacity: interp(frame, [10, 22], [0, 1]),
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: -18,
          fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: '0.2em',
          color: BRAND.colors.inkLight, transform: 'translateX(-50%)',
          opacity: interp(frame, [10, 22], [0, 1]),
        }}>0%</div>

        {/* lanes */}
        {assets.map((a, i) => {
          const start = 16 + i * 6;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const targetX = (a.pct / maxAbs) * 50; // % from center
          const moveProg = interp(frame, [start, start + 60], [0, 1], easeOut);
          const x = targetX * moveProg;
          const counter = a.pct * moveProg;

          // Trail dots — leave breadcrumbs
          const trailCount = Math.floor(moveProg * 12);

          const isWinner = i === 0;
          const isLast = i === assets.length - 1;
          const color = a.pct >= 0 ? BRAND.colors.accentBull : BRAND.colors.accentBear;
          const lineY = i * 90 + 30;

          return (
            <React.Fragment key={i}>
              {/* lane */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: lineY + 38,
                height: 1, borderTop: `1px dashed ${BRAND.colors.rule}`,
                opacity: interp(frame, [12 + i * 2, 24 + i * 2], [0, 1]),
              }} />
              {/* name on the right side */}
              <div style={{
                position: 'absolute', right: 20, top: lineY + 12,
                fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.18em',
                color: BRAND.colors.inkLight,
                opacity: op,
              }}>{a.sym}</div>
              {/* trail */}
              {Array.from({ length: trailCount }, (_, t) => {
                const tx = (t / 12) * targetX;
                return (
                  <div key={t} style={{
                    position: 'absolute',
                    left: `calc(50% + ${tx}%)`, top: lineY + 36,
                    width: 6, height: 6, borderRadius: '50%',
                    background: color, opacity: 0.2 + 0.05 * t,
                    transform: 'translate(-50%, -50%)',
                  }} />
                );
              })}
              {/* runner */}
              <div style={{
                position: 'absolute',
                left: `calc(50% + ${x}%)`, top: lineY,
                transform: `translate(-50%, 0)`,
                opacity: op,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 30,
                  color, lineHeight: 1,
                }}>{counter >= 0 ? '+' : ''}{counter.toFixed(2)}%</div>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: color,
                  border: isWinner || isLast ? `3px solid ${BRAND.colors.ink}` : 'none',
                  boxShadow: isWinner ? `0 0 ${interp(frame, [70, 100], [0, 30])}px ${color}` : 'none',
                }} />
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontSize: 22,
                  fontWeight: 700, color: BRAND.colors.ink,
                }}>{a.name}</div>
              </div>
            </React.Fragment>
          );
        })}

        {/* finish flag for winner */}
        <div style={{
          position: 'absolute', right: 60, top: 12,
          opacity: interp(frame, [80, 100], [0, 1]),
          transform: `scale(${interp(frame, [80, 100], [0.7, 1], easeOutBack)})`,
        }}>
          <div style={{
            fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
            color: BRAND.colors.accentBull,
            background: BRAND.colors.cream, padding: '4px 10px',
            border: `1.5px solid ${BRAND.colors.accentBull}`,
          }}>VAINQUEUR</div>
        </div>
      </div>
    </div>
  );
}

/* =================== 6. HEADLINE — Newsroom Type ===================
   Triple-pass : kicker glitche, titre se compose lettre par lettre 
   avec curseur clignotant, puis encadré + correction rouge style "édition".
   ===================================================================== */
function HeadlineNewsroom({ frame }) {
  const fullTitle = "La BCE baisse ses taux de 25 points";
  const charsRevealed = Math.floor(interp(frame, [10, 70], [0, fullTitle.length]));
  const revealed = fullTitle.slice(0, charsRevealed);
  const cursorBlink = Math.floor(frame / 5) % 2;

  // Glitch chars in kicker
  const glitchChars = ['█', '▓', '░', '▒', '#'];
  const glitchKicker = (s, f) => {
    if (f > 30) return s;
    return s.split('').map((c, i) => {
      if (Math.random() < 0.3 && f < 26) {
        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return c;
    }).join('');
  };

  return (
    <div style={{
      width: 1600, padding: '60px 0',
      display: 'flex', flexDirection: 'column', gap: 28,
    }}>
      {/* Newsroom header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '14px 20px',
        background: BRAND.colors.ink, color: BRAND.colors.cream,
        opacity: interp(frame, [0, 14], [0, 1]),
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: BRAND.colors.accentBear,
          animation: 'pulse 1.4s infinite',
        }} />
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
        }}>NEWSROOM  ·  COMPOSITION EN COURS</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.2em',
          marginLeft: 'auto', color: BRAND.colors.creamDark,
        }}>17:42  ·  EDITION 1</span>
      </div>

      {/* Kicker — glitches then settles */}
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 22, letterSpacing: '0.28em',
        color: BRAND.colors.accentBear,
        opacity: interp(frame, [4, 16], [0, 1]),
      }}>{glitchKicker('BLOOMBERG  ·  EXCLUSIF  ·  17:42', frame)}</div>

      {/* Composing title — chars appear with cursor */}
      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
        fontSize: 110, color: BRAND.colors.ink, lineHeight: 1.05,
        minHeight: 240,
      }}>
        {revealed}
        {charsRevealed < fullTitle.length && (
          <span style={{
            display: 'inline-block', width: 8, height: 80,
            background: BRAND.colors.accentBear,
            verticalAlign: 'baseline',
            marginLeft: 4,
            opacity: cursorBlink,
          }} />
        )}
      </div>

      {/* Editorial markup — appears after typing */}
      <div style={{
        opacity: interp(frame, [80, 100], [0, 1]),
        position: 'relative',
        padding: '20px 28px',
        background: BRAND.colors.creamDark,
        borderLeft: `5px solid ${BRAND.colors.accentBear}`,
      }}>
        <div style={{
          position: 'absolute', top: -14, left: 16,
          fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
          background: BRAND.colors.accentBear, color: BRAND.colors.cream,
          padding: '2px 10px',
        }}>NOTE DE L'ÉDITEUR</div>
        <div style={{
          fontFamily: BRAND.fonts.body, fontStyle: 'italic', fontSize: 26,
          color: BRAND.colors.inkMid, lineHeight: 1.5,
        }}>Première baisse depuis 2019. Le taux directeur passe de 4,25% à 4,00%. Les marchés actions saluent.</div>
      </div>

      {/* metadata strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.18em',
        color: BRAND.colors.inkLight,
        borderTop: `1px solid ${BRAND.colors.rule}`, paddingTop: 14,
        opacity: interp(frame, [100, 120], [0, 1]),
      }}>
        <span>EUR/USD  1,0852 ↓</span>
        <span>OAT 10A  −12 PB</span>
        <span>STOXX 600  +1,1%</span>
        <span>OR  +0,3%</span>
      </div>
    </div>
  );
}

/* =================== 7. SCENARIO — Path Animation ===================
   Une vraie courbe qui part du présent et bifurque, deux trajectoires 
   se dessinent simultanément avec des points d'événement.
   ===================================================================== */
function ScenarioPath({ frame }) {
  // SVG paths: present → fork → bull / bear futures
  const W = 1700, H = 700;
  const trunkProg = interp(frame, [10, 40], [0, 1], easeOut);
  const bullProg = interp(frame, [40, 80], [0, 1], easeOut);
  const bearProg = interp(frame, [40, 80], [0, 1], easeOut);

  // Trunk: starts from past with sample data, ends at fork point
  const trunkPath = `M 80 ${H * 0.55} 
    L 200 ${H * 0.52} L 300 ${H * 0.50} L 400 ${H * 0.58} 
    L 500 ${H * 0.54} L 600 ${H * 0.50} L 700 ${H * 0.48}
    L 800 ${H * 0.50}`;

  const bullPath = `M 800 ${H * 0.50} 
    Q 1000 ${H * 0.45}, 1200 ${H * 0.32} 
    T 1620 ${H * 0.18}`;

  const bearPath = `M 800 ${H * 0.50} 
    Q 1000 ${H * 0.55}, 1200 ${H * 0.68} 
    T 1620 ${H * 0.85}`;

  // Path lengths approx
  const trunkLen = 800;
  const bullLen = 900;
  const bearLen = 900;

  // Today marker pulse
  const pulseR = 14 + Math.sin(frame * 0.2) * 4;

  return (
    <div style={{ width: W, position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        opacity: interp(frame, [0, 12], [0, 1]),
        borderBottom: `1px solid ${BRAND.colors.rule}`, paddingBottom: 12,
        marginBottom: 20,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 56, color: BRAND.colors.ink,
        }}>Deux chemins, vendredi.</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.2em',
          color: BRAND.colors.inkLight,
        }}>S&amp;P 500  ·  FORWARD CURVE  ·  IPC ATTENDU</span>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* grid */}
        {[0.2, 0.4, 0.6, 0.8].map((y, i) => (
          <line key={i} x1={80} y1={H * y} x2={W - 60} y2={H * y}
            stroke={BRAND.colors.inkFaint} strokeWidth={1} strokeDasharray="3 4"
            opacity={interp(frame, [i, 8 + i], [0, 1])} />
        ))}
        {/* time axis */}
        <line x1={80} y1={H * 0.92} x2={W - 60} y2={H * 0.92}
          stroke={BRAND.colors.ink} strokeWidth={2}
          opacity={interp(frame, [0, 16], [0, 1])} />
        {[
          { x: 80,   l: '−5J' },
          { x: 800,  l: 'AUJ.' },
          { x: 1620, l: 'VEND.' },
        ].map((t, i) => (
          <text key={i}
            x={t.x} y={H * 0.92 + 26}
            textAnchor="middle"
            fontFamily={BRAND.fonts.mono} fontSize={16}
            letterSpacing="0.18em" fill={BRAND.colors.ink}
            opacity={interp(frame, [4 + i * 2, 14 + i * 2], [0, 1])}>{t.l}</text>
        ))}

        {/* Trunk (past) */}
        <path d={trunkPath} fill="none" stroke={BRAND.colors.ink} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={trunkLen}
          strokeDashoffset={trunkLen * (1 - trunkProg)} />

        {/* Bull */}
        <path d={bullPath} fill="none"
          stroke={BRAND.colors.accentBull} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={bullLen}
          strokeDashoffset={bullLen * (1 - bullProg)} />
        {/* Bull shadow zone */}
        <path d={`${bullPath} L 1620 ${H * 0.50} L 800 ${H * 0.50} Z`}
          fill={BRAND.colors.accentBull}
          opacity={0.08 * bullProg} />

        {/* Bear */}
        <path d={bearPath} fill="none"
          stroke={BRAND.colors.accentBear} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={bearLen}
          strokeDashoffset={bearLen * (1 - bearProg)} />
        <path d={`${bearPath} L 1620 ${H * 0.50} L 800 ${H * 0.50} Z`}
          fill={BRAND.colors.accentBear}
          opacity={0.08 * bearProg} />

        {/* Today marker */}
        <circle cx={800} cy={H * 0.50} r={pulseR}
          fill={BRAND.colors.ink}
          opacity={interp(frame, [38, 50], [0, 1])} />
        <circle cx={800} cy={H * 0.50} r={6}
          fill={BRAND.colors.cream}
          opacity={interp(frame, [38, 50], [0, 1])} />

        {/* Bull endpoint */}
        <g opacity={interp(frame, [78, 92], [0, 1])}
          transform={`translate(1620, ${H * 0.18})`}>
          <circle r={14} fill={BRAND.colors.accentBull} />
          <text x={20} y={6}
            fontFamily={BRAND.fonts.condensed} fontSize={48}
            fill={BRAND.colors.accentBull}>5 850 (+6,9%)</text>
          <text x={20} y={36}
            fontFamily={BRAND.fonts.mono} fontSize={14}
            letterSpacing="0.18em" fill={BRAND.colors.accentBull}>BULL  ·  62%</text>
        </g>

        {/* Bear endpoint */}
        <g opacity={interp(frame, [80, 94], [0, 1])}
          transform={`translate(1620, ${H * 0.85})`}>
          <circle r={14} fill={BRAND.colors.accentBear} />
          <text x={20} y={-12}
            fontFamily={BRAND.fonts.condensed} fontSize={48}
            fill={BRAND.colors.accentBear}>5 180 (−5,4%)</text>
          <text x={20} y={14}
            fontFamily={BRAND.fonts.mono} fontSize={14}
            letterSpacing="0.18em" fill={BRAND.colors.accentBear}>BEAR  ·  38%</text>
        </g>

        {/* Vertical "today" line */}
        <line x1={800} y1={40} x2={800} y2={H * 0.92}
          stroke={BRAND.colors.ink} strokeWidth={1} strokeDasharray="6 6"
          opacity={interp(frame, [38, 50], [0, 0.5])} />
      </svg>

      <div style={{
        fontFamily: BRAND.fonts.body, fontStyle: 'italic', fontSize: 24,
        color: BRAND.colors.inkMid, lineHeight: 1.5, maxWidth: 1300,
        opacity: interp(frame, [100, 120], [0, 1]),
        borderLeft: `3px solid ${BRAND.colors.ink}`, paddingLeft: 16,
        marginTop: -20,
      }}>Le marché tient son souffle jusqu'à mercredi 14h30, heure du verdict de l'IPC américain.</div>
    </div>
  );
}

/* =================== 8. BONUS — Camera Pan Mosaic ===================
   Mosaïque qui se compose tuile par tuile puis caméra qui pan/zoom 
   pour focus sur la stat clé. Multi-élément choreography.
   ===================================================================== */
function BonusMosaicPan({ frame }) {
  // 4x3 mosaic of mini-cards, then zoom on cell [1,2]
  const tiles = [
    { kind: 'stat', big: '+1,82%', sub: 'Nasdaq', color: BRAND.colors.accentBull },
    { kind: 'tag',  big: 'TECH', sub: 'leadership', color: BRAND.colors.ink },
    { kind: 'stat', big: '5471', sub: 'S&P 500', color: BRAND.colors.ink },
    { kind: 'stat', big: '+0,62%', sub: 'CAC 40', color: BRAND.colors.accentBull },
    { kind: 'stat', big: '−2,84%', sub: 'WTI', color: BRAND.colors.accentBear, focus: true },
    { kind: 'tag',  big: 'OPEC', sub: 'demain', color: BRAND.colors.ink },
    { kind: 'stat', big: '17,2', sub: 'VIX', color: BRAND.colors.ink },
    { kind: 'stat', big: '−0,74%', sub: 'Or', color: BRAND.colors.accentBear },
    { kind: 'tag',  big: '04/26', sub: 'édition', color: BRAND.colors.ink },
    { kind: 'stat', big: '67 840', sub: 'BTC', color: BRAND.colors.accentBear },
    { kind: 'stat', big: '+0,8%', sub: 'DXY', color: BRAND.colors.accentBull },
    { kind: 'tag',  big: 'BCE', sub: '−25 pb', color: BRAND.colors.accentBear },
  ];

  const focusIdx = 4; // WTI cell
  const focusCol = focusIdx % 4;
  const focusRow = Math.floor(focusIdx / 4);

  // Pan / zoom phase
  const zoomProg = interp(frame, [70, 110], [0, 1], easeInOut);
  const scale = 1 + zoomProg * 1.4; // up to 2.4x
  // Center on focused tile
  const tileW = 380, tileH = 260, gap = 10;
  const cx = focusCol * (tileW + gap) + tileW / 2;
  const cy = focusRow * (tileH + gap) + tileH / 2;
  // Translate so cx,cy → center of viewport
  const vpW = 1600, vpH = 800;
  const tx = (vpW / 2 - cx) * zoomProg;
  const ty = (vpH / 2 - cy) * zoomProg;

  return (
    <div style={{
      width: vpW, height: vpH, position: 'relative', overflow: 'hidden',
      border: `2px solid ${BRAND.colors.ink}`,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        transformOrigin: '0 0',
        display: 'grid', gridTemplateColumns: `repeat(4, ${tileW}px)`,
        gap, padding: 0,
      }}>
        {tiles.map((t, i) => {
          const start = 6 + i * 4;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const sIn = interp(frame, [start, start + 18], [0.6, 1], easeOutBack);
          const isFocus = i === focusIdx;
          const focusGlow = isFocus
            ? interp(frame, [60, 90], [0, 1])
            : 0;
          return (
            <div key={i} style={{
              width: tileW, height: tileH,
              opacity: op, transform: `scale(${sIn})`,
              transformOrigin: 'center',
              background: isFocus ? BRAND.colors.ink : BRAND.colors.cream,
              border: `2px solid ${BRAND.colors.ink}`,
              padding: '24px 28px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxShadow: isFocus ? `0 0 ${focusGlow * 60}px ${t.color}` : 'none',
              position: 'relative',
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.22em',
                color: isFocus ? BRAND.colors.creamDark : BRAND.colors.inkLight,
              }}>{t.kind === 'stat' ? 'STAT' : 'NOTE'}</div>
              <div>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 96,
                  color: isFocus ? BRAND.colors.cream : t.color,
                  lineHeight: 0.9,
                }}>{t.big}</div>
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: 'italic',
                  fontSize: 24, fontWeight: 700,
                  color: isFocus ? BRAND.colors.creamDark : BRAND.colors.ink,
                  marginTop: 6,
                }}>{t.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Headline overlay (appears after zoom) */}
      <div style={{
        position: 'absolute', left: 60, bottom: 60,
        opacity: interp(frame, [110, 130], [0, 1]),
        transform: `translateY(${interp(frame, [110, 130], [20, 0], easeOut)}px)`,
        background: BRAND.colors.cream,
        padding: '20px 28px',
        borderLeft: `5px solid ${BRAND.colors.accentBear}`,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
          color: BRAND.colors.accentBear, marginBottom: 6,
        }}>FOCUS</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 38, color: BRAND.colors.ink, lineHeight: 1.15, maxWidth: 700,
        }}>Le pétrole décroche — l'OPEP+ est attendue demain à 14h.</div>
      </div>

      {/* film leader / chrome marks */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        fontFamily: BRAND.fonts.mono, fontSize: 11, letterSpacing: '0.2em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 14], [0, 1]),
      }}>MOSAÏQUE  ·  CAM 02  ·  ZOOM IN</div>
    </div>
  );
}

/* =================== 9. BONUS — Number Avalanche ===================
   Une cascade de chiffres qui tombent du haut, le bon se fige et 
   les autres continuent comme des feuilles, puis label.
   ===================================================================== */
function BonusAvalanche({ frame }) {
  const target = "+1,82%";
  const W = 1600, H = 800;
  const numbersCount = 60;

  const numbers = Array.from({ length: numbersCount }, (_, i) => {
    const seed = i * 2.7 + 1;
    const x = (Math.sin(seed * 13) * 0.5 + 0.5) * W;
    const fallStart = i * 1.5;
    const fallSpeed = 6 + Math.sin(seed * 7) * 2;
    const y = ((frame - fallStart) * fallSpeed) % (H + 200) - 100;
    const txt = ['+0,4%', '+1,1%', '+0,8%', '−0,3%', '−2,1%', '+1,82%', '+5471', '−25pb', '+62'][i % 9];
    const isTarget = txt === target && i % 9 === 5; // mark some as target
    const op = isTarget ? 0.3 : 0.14 + Math.abs(Math.sin(seed)) * 0.18;
    const size = 24 + Math.abs(Math.sin(seed * 3)) * 36;
    return { x, y, txt, op, size, isTarget };
  });

  // The "frozen" target appears center after rain
  const heroOp = interp(frame, [60, 90], [0, 1]);
  const heroScale = interp(frame, [60, 80], [0.6, 1], easeOutBack);

  return (
    <div style={{
      width: W, height: H, position: 'relative',
      overflow: 'hidden',
      background: BRAND.colors.cream,
    }}>
      <div style={{
        position: 'absolute', top: 30, left: 40,
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 14], [0, 1]),
        zIndex: 5,
      }}>LE CHIFFRE QUI COMPTE  ·  AUJOURD'HUI</div>

      {/* Falling numbers */}
      {numbers.map((n, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: n.x, top: n.y,
          fontFamily: BRAND.fonts.condensed,
          fontSize: n.size, color: BRAND.colors.ink,
          opacity: n.op,
          transform: `rotate(${Math.sin(i) * 14}deg)`,
        }}>{n.txt}</div>
      ))}

      {/* Hero number */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        opacity: heroOp,
        transform: `scale(${heroScale})`,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: '0.32em',
          color: BRAND.colors.accentBull,
          background: BRAND.colors.cream,
          padding: '8px 20px',
          border: `2px solid ${BRAND.colors.accentBull}`,
        }}>NASDAQ 100</div>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 380,
          color: BRAND.colors.accentBull, lineHeight: 0.85,
          textShadow: `4px 4px 0 ${BRAND.colors.ink}`,
        }}>+1,82%</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
          fontSize: 42, color: BRAND.colors.ink, textAlign: 'center', maxWidth: 1100,
          opacity: interp(frame, [90, 110], [0, 1]),
        }}>… celui que vous deviez retenir.</div>
      </div>
    </div>
  );
}

window.StatInkSplatter = StatInkSplatter;
window.CausalPhysics = CausalPhysics;
window.GaugeLiquid = GaugeLiquid;
window.HeatmapTreemap = HeatmapTreemap;
window.MultiLaneRace = MultiLaneRace;
window.HeadlineNewsroom = HeadlineNewsroom;
window.ScenarioPath = ScenarioPath;
window.BonusMosaicPan = BonusMosaicPan;
window.BonusAvalanche = BonusAvalanche;
